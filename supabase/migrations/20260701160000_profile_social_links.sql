-- Add social_links column to profiles for storing website, twitter, instagram, linkedin URLs
alter table public.profiles
add column if not exists social_links jsonb default '{}'::jsonb;

comment on column public.profiles.social_links is 'JSON object with optional keys: website, twitter, instagram, linkedin';
