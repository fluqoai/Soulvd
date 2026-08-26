-- ============================================================
-- 0003_case_studies_order.sql
-- Adds `order_index` to case_studies so they can be sorted on
-- the public site (and in the admin list). Idempotent.
-- ============================================================

alter table public.case_studies
  add column if not exists order_index int not null default 0;

create index if not exists case_studies_order_idx
  on public.case_studies (order_index);
