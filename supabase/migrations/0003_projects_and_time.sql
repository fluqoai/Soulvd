-- ============================================================
--  Soulvd — Agency OS phase 2
--  Project: lyvoiipsmcbffvpkrxhy
--  Apply via Supabase dashboard SQL editor (one block at a time)
--
--  Changes:
--    1. projects:        new table — projects belong to a client
--    2. time_entries:    new table — hours logged against a project
--    3. invoices.project_id: optional link so a future invoice
--       generator can pull line items from a project's time entries
--    4. RLS + indexes for the new tables
-- ============================================================

-- ============================================================
-- 1. projects
-- ============================================================
create table if not exists public.projects (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  name            text not null,
  description     text,
  status          text not null default 'planning'
                    check (status in ('planning', 'in_progress', 'on_hold', 'delivered', 'cancelled')),
  start_date      date,
  due_date        date,
  budget_hours    numeric(8,2),
  budget_amount   numeric(12,2),
  currency        text not null default 'SAR',
  owner_id        uuid references public.users(id) on delete set null,
  created_by      uuid references public.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists projects_client_idx     on public.projects (client_id);
create index if not exists projects_status_idx     on public.projects (status);
create index if not exists projects_owner_idx      on public.projects (owner_id);
create index if not exists projects_due_idx        on public.projects (due_date);
create index if not exists projects_created_idx    on public.projects (created_at desc);

drop trigger if exists projects_set_updated_at on public.projects;

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.tg_set_updated_at();

-- ============================================================
-- 2. time_entries
-- ============================================================
create table if not exists public.time_entries (
  id           uuid primary key default uuid_generate_v4(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  user_id      uuid not null references public.users(id) on delete cascade,
  entry_date   date not null default current_date,
  hours        numeric(5,2) not null check (hours > 0 and hours <= 24),
  description  text,
  billable     boolean not null default true,
  hourly_rate  numeric(8,2),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists time_entries_project_idx  on public.time_entries (project_id);
create index if not exists time_entries_user_idx     on public.time_entries (user_id);
create index if not exists time_entries_date_idx     on public.time_entries (entry_date desc);
create index if not exists time_entries_billable_idx on public.time_entries (billable);

drop trigger if exists time_entries_set_updated_at on public.time_entries;

create trigger time_entries_set_updated_at
  before update on public.time_entries
  for each row execute function public.tg_set_updated_at();

-- ============================================================
-- 3. invoices.project_id — optional link
-- ============================================================
alter table public.invoices
  add column if not exists project_id uuid references public.projects(id) on delete set null;

create index if not exists invoices_project_idx on public.invoices (project_id);

-- ============================================================
-- 4. RLS
-- ============================================================
alter table public.projects    enable row level security;
alter table public.time_entries enable row level security;

-- projects: owner-only (mirrors clients/invoices/quotes)
drop policy if exists "owner manage projects" on public.projects;
create policy "owner manage projects" on public.projects
  for all using (is_owner()) with check (is_owner());

-- time_entries: owner-only
drop policy if exists "owner manage time_entries" on public.time_entries;
create policy "owner manage time_entries" on public.time_entries
  for all using (is_owner()) with check (is_owner());
