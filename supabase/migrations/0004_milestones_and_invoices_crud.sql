-- ============================================================
--  Soulvd — Agency OS phase 2 follow-ups
--  Project: lyvoiipsmcbffvpkrxhy
--  Apply via Supabase dashboard SQL editor (one block at a time)
--
--  Changes:
--    1. milestones:  new table — key dates on a project
--    2. invoices:   align with editor (no schema change; just docs)
-- ============================================================

-- ============================================================
-- 1. milestones
-- ============================================================
create table if not exists public.milestones (
  id           uuid primary key default uuid_generate_v4(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  name         text not null,
  description  text,
  due_date     date,
  status       text not null default 'pending'
                 check (status in ('pending', 'done', 'cancelled')),
  order_index  int not null default 0,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists milestones_project_idx  on public.milestones (project_id);
create index if not exists milestones_status_idx   on public.milestones (status);
create index if not exists milestones_order_idx    on public.milestones (project_id, order_index);
create index if not exists milestones_due_idx      on public.milestones (due_date);

drop trigger if exists milestones_set_updated_at on public.milestones;

create trigger milestones_set_updated_at
  before update on public.milestones
  for each row execute function public.tg_set_updated_at();

-- Auto-fill completed_at when status transitions to 'done'
drop trigger if exists milestones_set_completed_at on public.milestones;

create trigger milestones_set_completed_at
  before insert or update on public.milestones
  for each row execute function public.tg_set_completed_at();

-- ============================================================
-- 2. RLS
-- ============================================================
alter table public.milestones enable row level security;

drop policy if exists "owner manage milestones" on public.milestones;
create policy "owner manage milestones" on public.milestones
  for all using (is_owner()) with check (is_owner());
