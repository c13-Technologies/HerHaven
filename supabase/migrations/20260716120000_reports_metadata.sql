-- Mod-only notes & arbitrary report metadata live in jsonb on the report row.
-- The admin Reports page writes here via a plain UPDATE; the trigger below is
-- the single source of truth for the "only mods may touch metadata" rule.
alter table public.reports
  add column if not exists metadata jsonb;

-- A reporter opening their own pending report is allowed to UPDATE non-metadata
-- columns (e.g. status flips back to 'pending' from some flow). Whenever the
-- metadata jsonb itself changes, ONLY a moderator is allowed. We enforce this
-- with a BEFORE UPDATE trigger instead of an RLS policy because RLS WITH CHECK
-- is AND'd across all permissive UPDATE policies on a table — adding
-- mod-only WITH CHECK next to any existing reporter-side UPDATE policy would
-- silently block those writes for all reporters. The trigger scopes the rule
-- to metadata-mutation only.
create or replace function public.reports_block_metadata_mutation()
returns trigger language plpgsql as $$
begin
  if new.metadata is distinct from old.metadata and not public.has_role('moderator') then
    raise exception 'only moderators can edit report metadata' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists reports_meta_guard on public.reports;
create trigger reports_meta_guard
  before update on public.reports
  for each row execute function public.reports_block_metadata_mutation();
