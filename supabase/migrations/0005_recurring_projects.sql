-- ============================================================
--  Soulvd — Agency OS phase 2.5: recurring projects (MRR engine)
--  Project: lyvoiipsmcbffvpkrxhy
--  Apply via Supabase dashboard SQL editor
--
--  Adds to projects:
--    is_recurring       — is this a recurring project?
--    recurrence_pattern — 'monthly' | 'quarterly'
--    next_occurrence_at — when the next instance should be created
--    parent_project_id  — points to the previous instance in the chain
--    auto_invoice       — auto-create a draft invoice with the new instance?
-- ============================================================

alter table public.projects
  add column if not exists is_recurring        boolean     not null default false,
  add column if not exists recurrence_pattern  text
                    check (recurrence_pattern in ('monthly', 'quarterly')),
  add column if not exists next_occurrence_at timestamptz,
  add column if not exists parent_project_id   uuid references public.projects(id) on delete set null,
  add column if not exists auto_invoice        boolean     not null default true;

create index if not exists projects_recurring_idx
  on public.projects (is_recurring, next_occurrence_at)
  where is_recurring = true;

create index if not exists projects_parent_idx
  on public.projects (parent_project_id);

-- constraint: if is_recurring is true, recurrence_pattern must be set
-- (next_occurrence_at is allowed to be null; that means "not yet due" or "paused")
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'projects_recurring_consistency'
  ) then
    alter table public.projects
      add constraint projects_recurring_consistency
      check (
        (is_recurring = false)
        or (is_recurring = true and recurrence_pattern is not null)
      );
  end if;
end$$;
