-- ============================================================
-- 0008: client.status enum refresh
--
-- Old enum: ('active', 'inactive', 'archived')
-- New enum: ('prospect', 'active', 'paused')
--
-- Mapping:
--   archived -> prospect  (clients who left the system become "could come back")
--   inactive -> paused    (pure rename; same Arabic label "متوقف")
--   active   -> active    (unchanged)
--
-- Default stays 'active' to match existing UX; new clients default to
-- active unless the form is changed separately.
--
-- Order matters: drop the old constraint, migrate data, then add the
-- new constraint. Wrapped in a DO block so the drop is a no-op if
-- the constraint name is unknown (different PG versions name it
-- differently — `clients_status_check` is what the initial schema
-- produces, but 0002_agency_os.sql added it without a name so PG
-- auto-named it).
-- ============================================================

do $$
declare
  cname text;
begin
  -- Find the existing check constraint on clients.status by its definition
  -- (works regardless of the auto-generated name).
  select con.conname into cname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_attribute att on att.attrelid = rel.oid and att.attnum = con.conkey[1]
  where rel.relname = 'clients'
    and att.attname = 'status'
    and con.contype = 'c';
  if cname is not null then
    execute format('alter table public.clients drop constraint %I', cname);
  end if;
end $$;

-- Migrate existing data BEFORE the new constraint is added.
update public.clients set status = 'prospect' where status = 'archived';
update public.clients set status = 'paused'   where status = 'inactive';

-- Add the new check constraint with a stable name so future migrations can
-- reference it by name if needed.
alter table public.clients
  add constraint clients_status_check
    check (status in ('prospect', 'active', 'paused'));

-- The default is already 'active' from 0002_agency_os.sql; this statement
-- is a no-op safety net for fresh installs. Left in deliberately so the
-- migration is self-describing.
alter table public.clients
  alter column status set default 'active';
