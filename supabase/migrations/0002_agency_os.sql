-- ============================================================
--  Soulvd — Agency OS phase 1
--  Project: lyvoiipsmcbffvpkrxhy
--  Apply via Supabase dashboard SQL editor (one block at a time)
--
--  Changes:
--    1. clients: add status enum (active / inactive / archived)
--    2. leads:  expand status pipeline (add proposal, negotiation, won)
--              and add expected_value, expected_close_date, owner_id
--    3. notes:  new polymorphic notes table (client/lead/project)
--    4. tasks:  new tasks table with optional link to client/lead/project
--    5. RLS + triggers for the new tables
-- ============================================================

-- ============================================================
-- 1. clients: add status column
-- ============================================================
alter table public.clients
  add column if not exists status text not null default 'active'
    check (status in ('active', 'inactive', 'archived'));

create index if not exists clients_status_idx on public.clients (status);

-- ============================================================
-- 2. leads: enrich the pipeline
-- ============================================================

-- 2a. expand the status check constraint to a proper 7-stage pipeline.
--     Existing 'closed' values stay (semantic = won); we add the missing
--     stages so the enum is symmetric. New rows can use any of the 7.
do $$
declare
  cname text;
begin
  -- Find the auto-generated check constraint name on public.leads.status
  select con.conname into cname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'leads'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%status%'
  limit 1;

  if cname is not null then
    execute format('alter table public.leads drop constraint %I', cname);
  end if;
end$$;

alter table public.leads
  add constraint leads_status_check
    check (status in ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed', 'lost'));
-- 'closed' here means "won" (the existing semantic). We keep the word
-- 'closed' to avoid a data migration, but the UI label will say "مغلق / Won".

-- 2b. pipeline fields
alter table public.leads
  add column if not exists expected_value    numeric(12,2),
  add column if not exists expected_close_date date,
  add column if not exists owner_id          uuid references public.users(id) on delete set null;

create index if not exists leads_owner_idx on public.leads (owner_id);
create index if not exists leads_expected_close_idx on public.leads (expected_close_date);

-- ============================================================
-- 3. notes — polymorphic activity notes (replaces the lead.notes
--    text-timeline hack; client/lead/project all share this).
-- ============================================================
create table if not exists public.notes (
  id          uuid primary key default uuid_generate_v4(),
  parent_type text not null check (parent_type in ('client', 'lead', 'project')),
  parent_id   uuid not null,
  body        text not null,
  author_id   uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists notes_parent_idx       on public.notes (parent_type, parent_id);
create index if not exists notes_parent_created_idx on public.notes (parent_type, parent_id, created_at desc);
create index if not exists notes_author_idx       on public.notes (author_id);

drop trigger if exists notes_set_updated_at on public.notes;

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.tg_set_updated_at();

-- ============================================================
-- 4. tasks — internal todos
-- ============================================================
create table if not exists public.tasks (
  id           uuid primary key default uuid_generate_v4(),
  title        text not null,
  description  text,
  due_date     date,
  priority     text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status       text not null default 'pending' check (status in ('pending', 'in_progress', 'done', 'cancelled')),
  assigned_to  uuid references public.users(id) on delete set null,
  created_by   uuid references public.users(id) on delete set null,
  -- polymorphic link: optional reference to a client, lead, or future project
  link_type    text check (link_type in ('client', 'lead', 'project')),
  link_id      uuid,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- link_type and link_id must be set together (or both null)
  constraint tasks_link_consistency check (
    (link_type is null and link_id is null)
    or (link_type is not null and link_id is not null)
  )
);

create index if not exists tasks_status_idx      on public.tasks (status);
create index if not exists tasks_assigned_idx    on public.tasks (assigned_to);
create index if not exists tasks_due_idx         on public.tasks (due_date);
create index if not exists tasks_priority_idx    on public.tasks (priority);
create index if not exists tasks_link_idx        on public.tasks (link_type, link_id);
create index if not exists tasks_created_idx     on public.tasks (created_at desc);

drop trigger if exists tasks_set_updated_at on public.tasks;

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.tg_set_updated_at();

-- Auto-fill completed_at when a task transitions to 'done'
create or replace function public.tg_set_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'done' and (old.status is null or old.status <> 'done') then
    new.completed_at := now();
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tasks_set_completed_at on public.tasks;

create trigger tasks_set_completed_at
  before insert or update on public.tasks
  for each row execute function public.tg_set_completed_at();

-- ============================================================
-- 5. RLS
-- ============================================================

-- 5a. enable RLS on new tables
alter table public.notes enable row level security;
alter table public.tasks enable row level security;

-- 5b. notes policies
drop policy if exists "owner read notes"   on public.notes;
drop policy if exists "owner write notes"  on public.notes;
drop policy if exists "owner delete notes" on public.notes;

create policy "owner read notes"   on public.notes for select using (is_owner());
create policy "owner write notes"  on public.notes for all    using (is_owner()) with check (is_owner());
create policy "owner delete notes" on public.notes for delete using (is_owner());

-- 5c. tasks policies
drop policy if exists "owner read tasks"   on public.tasks;
drop policy if exists "owner write tasks"  on public.tasks;
drop policy if exists "owner delete tasks" on public.tasks;

create policy "owner read tasks"   on public.tasks for select using (is_owner());
create policy "owner write tasks"  on public.tasks for all    using (is_owner()) with check (is_owner());
create policy "owner delete tasks" on public.tasks for delete using (is_owner());
