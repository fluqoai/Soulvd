-- ============================================================
--  Soulvd — add project_id to the quotes table
--  Project: lyvoiipsmcbffvpkrxhy
--  Apply via Supabase dashboard SQL editor
--
--  Background:
--    The `invoices` table got a `project_id` column back in
--    0003_projects_and_time.sql. The `quotes` table never did, so the
--    quote flow (create / list / detail / edit) had to skip project
--    linkage. This migration mirrors 0003 for quotes, then the code
--    side (lib/quotes/actions.ts, components/admin/QuoteForm.tsx, and
--    the list + detail + edit pages) re-introduces the field.
-- ============================================================

-- 1. Add the column (no-op if it already exists).
alter table public.quotes
  add column if not exists project_id uuid
    references public.projects(id) on delete set null;

-- 2. Index for the same lookup pattern as invoices.
create index if not exists quotes_project_idx
  on public.quotes (project_id);
