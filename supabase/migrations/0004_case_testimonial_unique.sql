-- ============================================================
-- 0004_case_testimonial_unique.sql
-- Adds unique constraint on (client_name) for case_studies and
-- testimonials so the seed script is safely re-runnable.
-- Idempotent: skips the index if it already exists.
-- ============================================================

-- 1. Dedupe any pre-existing duplicates (keep the lowest id)
delete from public.case_studies a
using public.case_studies b
where a.id > b.id
  and a.client_name = b.client_name;

delete from public.testimonials a
using public.testimonials b
where a.id > b.id
  and a.client_name = b.client_name;

-- 2. Create unique indexes (skip if they already exist)
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'case_studies_client_name_unique_idx'
  ) then
    create unique index case_studies_client_name_unique_idx
      on public.case_studies (client_name);
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'testimonials_client_name_unique_idx'
  ) then
    create unique index testimonials_client_name_unique_idx
      on public.testimonials (client_name);
  end if;
end $$;
