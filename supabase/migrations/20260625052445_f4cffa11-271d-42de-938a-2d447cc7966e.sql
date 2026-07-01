
-- ENUMS
create type public.app_role as enum ('admin', 'moderator', 'user');
create type public.post_tag as enum ('need_advice', 'just_venting', 'general');
create type public.reaction_type as enum ('heart', 'hug', 'support', 'relate', 'pray');
create type public.report_status as enum ('pending', 'reviewed', 'dismissed', 'actioned');
create type public.notification_type as enum ('reply', 'mention', 'reaction', 'circle_invite', 'circle_activity', 'system');

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  bio text,
  avatar_url text,
  default_anonymous boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant select on public.profiles to anon;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable by everyone" on public.profiles for select using (true);
create policy "users update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- USER ROLES
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "users read own roles" on public.user_roles for select using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "admins read all roles" on public.user_roles for select using (public.has_role(auth.uid(), 'admin'));

-- CATEGORIES
create table public.categories (
  slug text primary key,
  name text not null,
  description text,
  emoji text,
  ord int not null default 0
);
grant select on public.categories to anon, authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "categories public" on public.categories for select using (true);

insert into public.categories (slug, name, description, emoji, ord) values
  ('relationships','Relationships','Love, dating, partnership, the messy in-between.','🤍',1),
  ('career','Career & Work','Ambitions, bosses, burnout, the next chapter.','💼',2),
  ('marriage','Marriage','Vows, partnership, the long quiet work of staying.','💍',3),
  ('motherhood','Motherhood','The wonder and the weight of raising a person.','🌿',4),
  ('mental-wellness','Mental Wellness','Anxiety, healing, therapy, the inner weather.','🌙',5),
  ('personal-growth','Personal Growth','Becoming. Unlearning. Returning to yourself.','✨',6),
  ('finance','Finance','Money honestly — earning, saving, asking for more.','📓',7),
  ('friendship','Friendship','The chosen sisters, the drifting apart, the staying.','🫶',8),
  ('faith','Faith & Spirituality','Prayer, doubt, devotion, the search for meaning.','🕊️',9),
  ('lifestyle','Lifestyle','Home, beauty, food, small ordinary joys.','🌸',10),
  ('general','General Discussions','Anything else on your heart.','💬',11);

-- CIRCLES
create table public.circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid not null references auth.users(id) on delete cascade,
  is_private boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.circles to authenticated;
grant all on public.circles to service_role;
alter table public.circles enable row level security;

create table public.circle_members (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  unique (circle_id, user_id)
);
grant select, insert, update, delete on public.circle_members to authenticated;
grant all on public.circle_members to service_role;
alter table public.circle_members enable row level security;

create or replace function public.is_circle_member(_user_id uuid, _circle_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.circle_members where user_id = _user_id and circle_id = _circle_id)
$$;

create policy "circles visible to members or if public" on public.circles for select
  using (not is_private or public.is_circle_member(auth.uid(), id) or auth.uid() = created_by);
create policy "users create circles" on public.circles for insert with check (auth.uid() = created_by);
create policy "creator updates circle" on public.circles for update using (auth.uid() = created_by);
create policy "creator deletes circle" on public.circles for delete using (auth.uid() = created_by);

create policy "members read membership" on public.circle_members for select
  using (public.is_circle_member(auth.uid(), circle_id));
create policy "creator manages membership" on public.circle_members for all
  using (exists (select 1 from public.circles c where c.id = circle_id and c.created_by = auth.uid()))
  with check (exists (select 1 from public.circles c where c.id = circle_id and c.created_by = auth.uid()));
create policy "users join self" on public.circle_members for insert with check (auth.uid() = user_id);

-- POSTS
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  category_slug text not null references public.categories(slug),
  circle_id uuid references public.circles(id) on delete cascade,
  title text not null,
  body text not null,
  tag public.post_tag not null default 'general',
  is_anonymous boolean not null default false,
  is_sensitive boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_category_idx on public.posts(category_slug, created_at desc);
create index posts_circle_idx on public.posts(circle_id, created_at desc);
create index posts_author_idx on public.posts(author_id, created_at desc);
grant select, insert, update, delete on public.posts to authenticated;
grant all on public.posts to service_role;
alter table public.posts enable row level security;

create policy "posts readable to signed in (non-circle or member)" on public.posts for select
  using (
    circle_id is null
    or public.is_circle_member(auth.uid(), circle_id)
    or public.has_role(auth.uid(), 'moderator')
    or public.has_role(auth.uid(), 'admin')
  );
create policy "users create own posts" on public.posts for insert with check (auth.uid() = author_id);
create policy "authors update own posts" on public.posts for update using (auth.uid() = author_id);
create policy "authors or mods delete posts" on public.posts for delete
  using (auth.uid() = author_id or public.has_role(auth.uid(),'moderator') or public.has_role(auth.uid(),'admin'));

-- COMMENTS
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null,
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments(post_id, created_at);
grant select, insert, update, delete on public.comments to authenticated;
grant all on public.comments to service_role;
alter table public.comments enable row level security;
create policy "comments visible if post visible" on public.comments for select
  using (exists (select 1 from public.posts p where p.id = post_id and (
    p.circle_id is null or public.is_circle_member(auth.uid(), p.circle_id)
    or public.has_role(auth.uid(),'moderator') or public.has_role(auth.uid(),'admin')
  )));
create policy "users create comments" on public.comments for insert with check (auth.uid() = author_id);
create policy "authors update comments" on public.comments for update using (auth.uid() = author_id);
create policy "authors or mods delete comments" on public.comments for delete
  using (auth.uid() = author_id or public.has_role(auth.uid(),'moderator') or public.has_role(auth.uid(),'admin'));

-- REACTIONS
create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.reaction_type not null,
  created_at timestamptz not null default now(),
  unique (post_id, user_id, type)
);
create index reactions_post_idx on public.reactions(post_id);
grant select, insert, delete on public.reactions to authenticated;
grant all on public.reactions to service_role;
alter table public.reactions enable row level security;
create policy "reactions visible" on public.reactions for select using (true);
create policy "users add own reactions" on public.reactions for insert with check (auth.uid() = user_id);
create policy "users remove own reactions" on public.reactions for delete using (auth.uid() = user_id);

-- REPORTS
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('post','comment','user')),
  target_id uuid not null,
  reason text not null,
  status public.report_status not null default 'pending',
  created_at timestamptz not null default now()
);
grant select, insert on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;
create policy "reporter reads own reports" on public.reports for select using (auth.uid() = reporter_id);
create policy "mods read all reports" on public.reports for select using (public.has_role(auth.uid(),'moderator') or public.has_role(auth.uid(),'admin'));
create policy "mods update reports" on public.reports for update using (public.has_role(auth.uid(),'moderator') or public.has_role(auth.uid(),'admin'));
create policy "users file reports" on public.reports for insert with check (auth.uid() = reporter_id);

-- BLOCKS
create table public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
grant select, insert, delete on public.user_blocks to authenticated;
grant all on public.user_blocks to service_role;
alter table public.user_blocks enable row level security;
create policy "users manage own blocks" on public.user_blocks for all
  using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);

-- NOTIFICATIONS
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);
grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "users read own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "users update own notifications" on public.notifications for update using (auth.uid() = user_id);
create policy "users delete own notifications" on public.notifications for delete using (auth.uid() = user_id);
create policy "system inserts notifications" on public.notifications for insert with check (true);

-- TRIGGERS
create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.update_updated_at_column();
create trigger posts_updated_at before update on public.posts for each row execute function public.update_updated_at_column();

-- handle_new_user: create profile + default role
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_username text;
  candidate text;
  i int := 0;
begin
  base_username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(coalesce(new.email,'sister'),'@',1)
  );
  base_username := regexp_replace(lower(base_username),'[^a-z0-9_]','','g');
  if base_username = '' then base_username := 'sister'; end if;
  candidate := base_username;
  while exists (select 1 from public.profiles where username = candidate) loop
    i := i + 1;
    candidate := base_username || i::text;
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    candidate,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', candidate),
    new.raw_user_meta_data->>'avatar_url'
  );
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end; $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
