-- ============================================================
--  Soulvd — activity_log INSERT policy
--  Project: lyvoiipsmcbffvpkrxhy
--  Apply via Supabase dashboard SQL editor
--
--  Background:
--    The activity_log table currently has only a SELECT policy for owner
--    (see 0001_initial_schema.sql lines ~740-747). Every other write path
--    (src/lib/invoices/actions.ts createInvoice activity insert, and
--    src/lib/pdf/actions.ts generateAndSaveDocument activity insert) hits
--    the implicit "deny all" rule and silently disappears. The fix adds
--    an owner-INSERT policy so audit events actually persist.
-- ============================================================

-- 1. Make sure RLS is enabled (it should be already from 0001).
alter table public.activity_log enable row level security;

-- 2. Owner-only INSERT.
--    Same guard as the rest of the schema (see "owner manage invoices" etc.).
drop policy if exists "owner insert activity" on public.activity_log;
create policy "owner insert activity" on public.activity_log
  for insert with check (is_owner());

-- 3. (Optional) add an index for the new audit-trail access pattern.
--    No-op if it already exists.
create index if not exists activity_log_action_idx
  on public.activity_log (action, created_at desc);
