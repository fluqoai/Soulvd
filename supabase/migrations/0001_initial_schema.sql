-- ============================================================
--  Soulvd — initial schema
--  Project: lyvoiipsmcbffvpkrxhy
--  Apply via: psql, Supabase dashboard SQL editor, or supabase db push
-- ============================================================

-- Extensions --------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. users (must exist BEFORE the helper functions reference it)
-- ============================================================
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  full_name   text,
  role        text not null default 'editor' check (role in ('owner', 'editor')),
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- 2. Generic updated_at trigger function (no table deps)
-- ============================================================
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Now safe to attach users' updated_at trigger
drop trigger if exists users_set_updated_at on public.users;

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.tg_set_updated_at();

-- ============================================================
-- 3. auth.users -> public.users mirror (depends on public.users)
-- ============================================================
create or replace function public.tg_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'editor'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.tg_handle_new_user();

-- ============================================================
-- 4. Role-checking helper functions (depend on public.users)
-- ============================================================
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'owner'
  );
$$;

create or replace function public.is_editor_or_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role in ('owner', 'editor')
  );
$$;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

-- ============================================================
-- 3. site_settings (single row)
-- ============================================================
create table if not exists public.site_settings (
  id                int primary key default 1 check (id = 1),
  site_name         text not null,
  site_name_en      text,
  site_tagline      text,
  site_tagline_en   text,
  contact_email     text,
  contact_phone     text,
  contact_whatsapp  text,
  address           text,
  address_en        text,
  social_links      jsonb not null default '{}'::jsonb,
  seo               jsonb not null default '{}'::jsonb,
  updated_at        timestamptz not null default now()
);

drop trigger if exists site_settings_set_updated_at on public.site_settings;

create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.tg_set_updated_at();

-- ============================================================
-- 4. pages (generic content pages — home, about, contact, ...)
-- ============================================================
create table if not exists public.pages (
  slug         text primary key,
  title        jsonb not null,           -- {ar, en}
  description  jsonb,                    -- {ar, en}
  content      jsonb not null default '[]'::jsonb,  -- array of content blocks
  seo          jsonb not null default '{}'::jsonb,
  published    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists pages_published_idx on public.pages (published);

drop trigger if exists pages_set_updated_at on public.pages;

create trigger pages_set_updated_at
  before update on public.pages
  for each row execute function public.tg_set_updated_at();

-- ============================================================
-- 5. services
-- ============================================================
create table if not exists public.services (
  id           uuid primary key default uuid_generate_v4(),
  key          text not null unique,
  icon         text not null,             -- lucide icon name
  title        jsonb not null,            -- {ar, en}
  description  jsonb not null,            -- {ar, en}
  long_description jsonb,                 -- {ar, en}  for /services/[slug] page
  order_index  int not null default 0,
  published    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists services_order_idx on public.services (order_index);
create index if not exists services_published_idx on public.services (published);

drop trigger if exists services_set_updated_at on public.services;

create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.tg_set_updated_at();

-- ============================================================
-- 6. sectors
-- ============================================================
create table if not exists public.sectors (
  id                uuid primary key default uuid_generate_v4(),
  key               text not null unique,
  icon              text not null,
  title             jsonb not null,
  description       jsonb not null,
  long_description  jsonb,
  use_cases         jsonb not null default '[]'::jsonb,
  order_index       int not null default 0,
  published         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists sectors_order_idx on public.sectors (order_index);
create index if not exists sectors_published_idx on public.sectors (published);

drop trigger if exists sectors_set_updated_at on public.sectors;

create trigger sectors_set_updated_at
  before update on public.sectors
  for each row execute function public.tg_set_updated_at();

-- ============================================================
-- 7. stats
-- ============================================================
create table if not exists public.stats (
  id          uuid primary key default uuid_generate_v4(),
  value       text not null,              -- "+8", "98%", "2", "+100"  — text for +/% support
  label       jsonb not null,             -- {ar, en}
  order_index int not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists stats_order_idx on public.stats (order_index);
create index if not exists stats_published_idx on public.stats (published);

drop trigger if exists stats_set_updated_at on public.stats;

create trigger stats_set_updated_at
  before update on public.stats
  for each row execute function public.tg_set_updated_at();

-- ============================================================
-- 8. value_props (the "why Soulvd" items)
-- ============================================================
create table if not exists public.value_props (
  id          uuid primary key default uuid_generate_v4(),
  key         text not null unique,
  icon        text not null,
  title       jsonb not null,
  description jsonb not null,
  order_index int not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists value_props_order_idx on public.value_props (order_index);
create index if not exists value_props_published_idx on public.value_props (published);

drop trigger if exists value_props_set_updated_at on public.value_props;

create trigger value_props_set_updated_at
  before update on public.value_props
  for each row execute function public.tg_set_updated_at();

-- ============================================================
-- 9. integrations (logos + names)
-- ============================================================
create table if not exists public.integrations (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  category    text,                       -- 'crm', 'ecommerce', 'payment', 'productivity', 'social', etc.
  logo_url    text,
  url         text,
  order_index int not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists integrations_order_idx on public.integrations (order_index);
create index if not exists integrations_category_idx on public.integrations (category);
create index if not exists integrations_published_idx on public.integrations (published);

drop trigger if exists integrations_set_updated_at on public.integrations;

create trigger integrations_set_updated_at
  before update on public.integrations
  for each row execute function public.tg_set_updated_at();

-- ============================================================
-- 10. case_studies
-- ============================================================
create table if not exists public.case_studies (
  id           uuid primary key default uuid_generate_v4(),
  sector_id    uuid references public.sectors(id) on delete set null,
  client_name  text,
  title        jsonb not null,
  summary      jsonb not null,
  content      jsonb,                     -- {ar, en} rich text
  results      jsonb not null default '[]'::jsonb,  -- [{label, value}, ...]
  cover_image  text,
  published    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists case_studies_sector_idx on public.case_studies (sector_id);
create index if not exists case_studies_published_idx on public.case_studies (published);

drop trigger if exists case_studies_set_updated_at on public.case_studies;

create trigger case_studies_set_updated_at
  before update on public.case_studies
  for each row execute function public.tg_set_updated_at();

-- ============================================================
-- 11. testimonials
-- ============================================================
create table if not exists public.testimonials (
  id             uuid primary key default uuid_generate_v4(),
  client_name    text not null,
  client_role    text,
  client_company text,
  quote          jsonb not null,            -- {ar, en}
  avatar_url     text,
  order_index    int not null default 0,
  published      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists testimonials_order_idx on public.testimonials (order_index);
create index if not exists testimonials_published_idx on public.testimonials (published);

drop trigger if exists testimonials_set_updated_at on public.testimonials;

create trigger testimonials_set_updated_at
  before update on public.testimonials
  for each row execute function public.tg_set_updated_at();

-- ============================================================
-- 12. team_members
-- ============================================================
create table if not exists public.team_members (
  id          uuid primary key default uuid_generate_v4(),
  full_name   text not null,
  role        text not null,
  bio         jsonb,                       -- {ar, en}
  photo_url   text,
  links       jsonb not null default '{}'::jsonb,  -- {twitter, linkedin, ...}
  order_index int not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists team_members_order_idx on public.team_members (order_index);
create index if not exists team_members_published_idx on public.team_members (published);

drop trigger if exists team_members_set_updated_at on public.team_members;

create trigger team_members_set_updated_at
  before update on public.team_members
  for each row execute function public.tg_set_updated_at();

-- ============================================================
-- 13. media (uploaded files reference)
-- ============================================================
create table if not exists public.media (
  id           uuid primary key default uuid_generate_v4(),
  filename     text not null,
  storage_path text not null,             -- path inside the storage bucket
  bucket       text not null default 'media',
  mime_type    text,
  size_bytes   bigint,
  width        int,
  height       int,
  alt_text     jsonb,                     -- {ar, en}
  uploaded_by  uuid references public.users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists media_bucket_path_idx on public.media (bucket, storage_path);

-- ============================================================
-- 14. leads (contact form submissions)
-- ============================================================
create table if not exists public.leads (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  email        text,
  phone        text,
  company      text,
  message      text,
  source       text not null default 'contact_form',
  status       text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'closed', 'lost')),
  metadata     jsonb not null default '{}'::jsonb,
  notes        text,
  assigned_to  uuid references public.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_created_idx on public.leads (created_at desc);

drop trigger if exists leads_set_updated_at on public.leads;

create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.tg_set_updated_at();

-- ============================================================
-- 15. clients (saved client info for reuse in invoices/quotes)
-- ============================================================
create table if not exists public.clients (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  email       text,
  phone       text,
  company     text,
  vat_number  text,
  address     text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists clients_name_idx on public.clients (name);

drop trigger if exists clients_set_updated_at on public.clients;

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.tg_set_updated_at();

-- ============================================================
-- 16. templates (the .docx templates for invoices and quotes)
-- ============================================================
create table if not exists public.templates (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  type         text not null check (type in ('invoice', 'quote', 'other')),
  language     text not null check (language in ('ar', 'en', 'both')),
  file_path    text not null,             -- path in the 'templates' storage bucket
  field_schema jsonb not null default '[]'::jsonb,
  --  field_schema: [
  --    {"name": "client_name",   "label": {"ar": "...", "en": "..."}, "type": "text",         "required": true,  "placeholder": "..."},
  --    {"name": "invoice_date", "label": {"ar": "...", "en": "..."}, "type": "date",         "required": true},
  --    {"name": "line_items",   "label": {"ar": "...", "en": "..."}, "type": "line_items",   "required": true},  -- repeatable rows
  --    {"name": "total",        "label": {"ar": "...", "en": "..."}, "type": "currency",     "required": true,  "currency": "SAR"},
  --    ...
  --  ]
  description  text,
  created_by   uuid references public.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists templates_type_idx on public.templates (type);

drop trigger if exists templates_set_updated_at on public.templates;

create trigger templates_set_updated_at
  before update on public.templates
  for each row execute function public.tg_set_updated_at();

-- ============================================================
-- 17. invoices
-- ============================================================
create table if not exists public.invoices (
  id                  uuid primary key default uuid_generate_v4(),
  number              text not null unique,            -- INV-2026-001
  template_id         uuid references public.templates(id) on delete set null,
  client_id           uuid references public.clients(id) on delete set null,
  client_snapshot     jsonb not null,                  -- snapshot of client info at generation
  data                jsonb not null,                  -- field values per template schema
  subtotal            numeric(12,2),
  vat_rate            numeric(5,2) default 15.00,      -- 15% in KSA
  vat_amount          numeric(12,2),
  total               numeric(12,2),
  currency            text not null default 'SAR',
  status              text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  issue_date          date not null default current_date,
  due_date            date,
  notes               text,
  generated_docx_path text,                            -- path in 'documents' bucket
  generated_pdf_path  text,                            -- path in 'documents' bucket
  share_token         text unique,
  share_expires_at    timestamptz,
  created_by          uuid references public.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists invoices_status_idx on public.invoices (status);
create index if not exists invoices_issue_date_idx on public.invoices (issue_date desc);
create index if not exists invoices_client_idx on public.invoices (client_id);

drop trigger if exists invoices_set_updated_at on public.invoices;

create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute function public.tg_set_updated_at();

-- ============================================================
-- 18. quotes
-- ============================================================
create table if not exists public.quotes (
  id                  uuid primary key default uuid_generate_v4(),
  number              text not null unique,            -- QT-2026-001
  template_id         uuid references public.templates(id) on delete set null,
  client_id           uuid references public.clients(id) on delete set null,
  client_snapshot     jsonb not null,
  data                jsonb not null,
  subtotal            numeric(12,2),
  vat_rate            numeric(5,2) default 15.00,
  vat_amount          numeric(12,2),
  total               numeric(12,2),
  currency            text not null default 'SAR',
  status              text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  issue_date          date not null default current_date,
  valid_until         date,
  notes               text,
  generated_docx_path text,
  generated_pdf_path  text,
  share_token         text unique,
  share_expires_at    timestamptz,
  created_by          uuid references public.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists quotes_status_idx on public.quotes (status);
create index if not exists quotes_issue_date_idx on public.quotes (issue_date desc);
create index if not exists quotes_client_idx on public.quotes (client_id);

drop trigger if exists quotes_set_updated_at on public.quotes;

create trigger quotes_set_updated_at
  before update on public.quotes
  for each row execute function public.tg_set_updated_at();

-- ============================================================
-- 19. activity_log
-- ============================================================
create table if not exists public.activity_log (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references public.users(id) on delete set null,
  action       text not null,             -- 'created', 'updated', 'deleted', 'login', etc.
  entity_type  text,                      -- 'invoice', 'template', etc.
  entity_id    uuid,
  details      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists activity_log_created_idx on public.activity_log (created_at desc);
create index if not exists activity_log_entity_idx on public.activity_log (entity_type, entity_id);
create index if not exists activity_log_user_idx on public.activity_log (user_id);

-- ============================================================
-- 20. RLS (Row Level Security)
-- ============================================================

-- Enable RLS on every table
alter table public.users                enable row level security;
alter table public.site_settings        enable row level security;
alter table public.pages                enable row level security;
alter table public.services             enable row level security;
alter table public.sectors              enable row level security;
alter table public.stats                enable row level security;
alter table public.value_props          enable row level security;
alter table public.integrations         enable row level security;
alter table public.case_studies         enable row level security;
alter table public.testimonials         enable row level security;
alter table public.team_members         enable row level security;
alter table public.media                enable row level security;
alter table public.leads                enable row level security;
alter table public.clients              enable row level security;
alter table public.templates            enable row level security;
alter table public.invoices             enable row level security;
alter table public.quotes               enable row level security;
alter table public.activity_log         enable row level security;

-- PUBLIC read on content tables (anon + authenticated)
drop policy if exists "public read site_settings" on public.site_settings;

drop policy if exists "public read site_settings" on public.site_settings;

create policy "public read site_settings" on public.site_settings  for select using (true);
drop policy if exists "public read pages" on public.pages;

drop policy if exists "public read pages" on public.pages;

create policy "public read pages" on public.pages          for select using (published = true);
drop policy if exists "public read services" on public.services;

drop policy if exists "public read services" on public.services;

create policy "public read services" on public.services       for select using (published = true);
drop policy if exists "public read sectors" on public.sectors;

drop policy if exists "public read sectors" on public.sectors;

create policy "public read sectors" on public.sectors        for select using (published = true);
drop policy if exists "public read stats" on public.stats;

drop policy if exists "public read stats" on public.stats;

create policy "public read stats" on public.stats          for select using (published = true);
drop policy if exists "public read value_props" on public.value_props;

drop policy if exists "public read value_props" on public.value_props;

create policy "public read value_props" on public.value_props    for select using (published = true);
drop policy if exists "public read integrations" on public.integrations;

drop policy if exists "public read integrations" on public.integrations;

create policy "public read integrations" on public.integrations   for select using (published = true);
drop policy if exists "public read case_studies" on public.case_studies;

drop policy if exists "public read case_studies" on public.case_studies;

create policy "public read case_studies" on public.case_studies   for select using (published = true);
drop policy if exists "public read testimonials" on public.testimonials;

drop policy if exists "public read testimonials" on public.testimonials;

create policy "public read testimonials" on public.testimonials   for select using (published = true);
drop policy if exists "public read team_members" on public.team_members;

drop policy if exists "public read team_members" on public.team_members;

create policy "public read team_members" on public.team_members   for select using (published = true);

-- EDITOR/OWNER write on content tables
drop policy if exists "editors write site_settings" on public.site_settings;

drop policy if exists "editors write site_settings" on public.site_settings;

create policy "editors write site_settings" on public.site_settings  for all using (is_editor_or_owner()) with check (is_editor_or_owner());
drop policy if exists "editors write pages" on public.pages;

drop policy if exists "editors write pages" on public.pages;

create policy "editors write pages" on public.pages          for all using (is_editor_or_owner()) with check (is_editor_or_owner());
drop policy if exists "editors write services" on public.services;

drop policy if exists "editors write services" on public.services;

create policy "editors write services" on public.services       for all using (is_editor_or_owner()) with check (is_editor_or_owner());
drop policy if exists "editors write sectors" on public.sectors;

drop policy if exists "editors write sectors" on public.sectors;

create policy "editors write sectors" on public.sectors        for all using (is_editor_or_owner()) with check (is_editor_or_owner());
drop policy if exists "editors write stats" on public.stats;

drop policy if exists "editors write stats" on public.stats;

create policy "editors write stats" on public.stats          for all using (is_editor_or_owner()) with check (is_editor_or_owner());
drop policy if exists "editors write value_props" on public.value_props;

drop policy if exists "editors write value_props" on public.value_props;

create policy "editors write value_props" on public.value_props    for all using (is_editor_or_owner()) with check (is_editor_or_owner());
drop policy if exists "editors write integrations" on public.integrations;

drop policy if exists "editors write integrations" on public.integrations;

create policy "editors write integrations" on public.integrations   for all using (is_editor_or_owner()) with check (is_editor_or_owner());
drop policy if exists "editors write case_studies" on public.case_studies;

drop policy if exists "editors write case_studies" on public.case_studies;

create policy "editors write case_studies" on public.case_studies   for all using (is_editor_or_owner()) with check (is_editor_or_owner());
drop policy if exists "editors write testimonials" on public.testimonials;

drop policy if exists "editors write testimonials" on public.testimonials;

create policy "editors write testimonials" on public.testimonials   for all using (is_editor_or_owner()) with check (is_editor_or_owner());
drop policy if exists "editors write team_members" on public.team_members;

drop policy if exists "editors write team_members" on public.team_members;

create policy "editors write team_members" on public.team_members   for all using (is_editor_or_owner()) with check (is_editor_or_owner());

-- USERS: read own, owner manages all
drop policy if exists "users read own" on public.users;

drop policy if exists "users read own" on public.users;

create policy "users read own" on public.users for select using (auth.uid() = id);
drop policy if exists "owner manage users" on public.users;

drop policy if exists "owner manage users" on public.users;

drop policy if exists "owner manage users" on public.users;

create policy "owner manage users" on public.users for all    using (is_owner()) with check (is_owner());

-- LEADS: anyone can insert (anon form), only owner can read/manage
drop policy if exists "anyone insert leads" on public.leads;

drop policy if exists "anyone insert leads" on public.leads;

create policy "anyone insert leads" on public.leads for insert with check (true);
drop policy if exists "owner read leads" on public.leads;

drop policy if exists "owner read leads" on public.leads;

create policy "owner read leads" on public.leads for select using (is_owner());
drop policy if exists "owner update leads" on public.leads;

drop policy if exists "owner update leads" on public.leads;

create policy "owner update leads" on public.leads for update using (is_owner());
drop policy if exists "owner delete leads" on public.leads;

drop policy if exists "owner delete leads" on public.leads;

create policy "owner delete leads" on public.leads for delete using (is_owner());

-- CLIENTS, TEMPLATES, INVOICES, QUOTES: owner only
drop policy if exists "owner manage clients" on public.clients;

drop policy if exists "owner manage clients" on public.clients;

create policy "owner manage clients" on public.clients   for all using (is_owner()) with check (is_owner());
drop policy if exists "owner manage templates" on public.templates;

drop policy if exists "owner manage templates" on public.templates;

drop policy if exists "owner manage templates" on public.templates;

create policy "owner manage templates" on public.templates for all using (is_owner()) with check (is_owner());
drop policy if exists "owner manage invoices" on public.invoices;

drop policy if exists "owner manage invoices" on public.invoices;

create policy "owner manage invoices" on public.invoices  for all using (is_owner()) with check (is_owner());
drop policy if exists "owner manage quotes" on public.quotes;

drop policy if exists "owner manage quotes" on public.quotes;

create policy "owner manage quotes" on public.quotes    for all using (is_owner()) with check (is_owner());

-- MEDIA: editors read + insert, owner delete
drop policy if exists "editors read media" on public.media;

drop policy if exists "editors read media" on public.media;

create policy "editors read media" on public.media for select using (is_editor_or_owner());
drop policy if exists "editors insert media" on public.media;

drop policy if exists "editors insert media" on public.media;

create policy "editors insert media" on public.media for insert with check (is_editor_or_owner());
drop policy if exists "owner delete media" on public.media;

drop policy if exists "owner delete media" on public.media;

create policy "owner delete media" on public.media for delete using (is_owner());

-- ACTIVITY LOG: owner only
drop policy if exists "owner read activity" on public.activity_log;

drop policy if exists "owner read activity" on public.activity_log;

drop policy if exists "owner read activity" on public.activity_log;

create policy "owner read activity" on public.activity_log for select using (is_owner());

-- ============================================================
-- 21. Storage buckets
-- ============================================================
-- templates:    .docx template files uploaded by owner
-- documents:    generated .docx and .pdf for invoices and quotes
-- media:        general media (logos, images, etc.)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('templates', 'templates', false, 26214400, array['application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword']),
  ('documents', 'documents', true,  26214400, array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('media',     'media',     true,  10485760, array['image/png','image/jpeg','image/webp','image/svg+xml'])
on conflict (id) do nothing;

-- Storage policies
-- templates bucket: owner only
drop policy if exists "owner read templates" on storage.objects;

create policy "owner read templates" on storage.objects for select using (bucket_id = 'templates' and is_owner());
drop policy if exists "owner write templates" on storage.objects;

create policy "owner write templates" on storage.objects for all    using (bucket_id = 'templates' and is_owner()) with check (bucket_id = 'templates' and is_owner());

-- documents bucket: public read, owner write
drop policy if exists "public read documents" on storage.objects;

create policy "public read documents" on storage.objects for select using (bucket_id = 'documents');
drop policy if exists "owner write documents" on storage.objects;

create policy "owner write documents" on storage.objects for all    using (bucket_id = 'documents' and is_owner()) with check (bucket_id = 'documents' and is_owner());

-- media bucket: public read, editors can upload, owner can delete
drop policy if exists "public read media" on storage.objects;

create policy "public read media" on storage.objects for select using (bucket_id = 'media');
drop policy if exists "editor write media" on storage.objects;

create policy "editor write media" on storage.objects for insert with check (bucket_id = 'media' and is_editor_or_owner());
drop policy if exists "owner update media" on storage.objects;

create policy "owner update media" on storage.objects for update using (bucket_id = 'media' and is_owner());
drop policy if exists "owner delete media" on storage.objects;

create policy "owner delete media" on storage.objects for delete using (bucket_id = 'media' and is_owner());

-- ============================================================
-- 22. Seed data
-- ============================================================
-- site_settings
insert into public.site_settings (id, site_name, site_name_en, site_tagline, site_tagline_en, contact_email, contact_phone, contact_whatsapp, social_links)
values (
  1,
  'سولڤد',
  'Soulvd',
  'نحوّل محادثات واتساب إلى مبيعات',
  'We turn WhatsApp conversations into sales',
  'hello@soulvd.sa',
  '+966500000000',
  '+966500000000',
  '{"twitter": "", "linkedin": "", "instagram": ""}'::jsonb
)
on conflict (id) do update set
  site_name = excluded.site_name,
  site_name_en = excluded.site_name_en,
  site_tagline = excluded.site_tagline,
  site_tagline_en = excluded.site_tagline_en,
  contact_email = excluded.contact_email,
  contact_phone = excluded.contact_phone,
  contact_whatsapp = excluded.contact_whatsapp;

-- services
insert into public.services (key, icon, title, description, order_index) values
('bot', 'Bot', '{"ar":"روبوت واتساب الذكي","en":"Smart WhatsApp bot"}', '{"ar":"روبوت مخصص يعمل على مدار الساعة بالعربية والإنجليزية، مدرب على بياناتك واللهجات المحلية.","en":"A 24/7 custom bot in Arabic and English, trained on your data and local dialects."}', 1),
('campaigns', 'Megaphone', '{"ar":"حملات واتساب التسويقية","en":"WhatsApp marketing campaigns"}', '{"ar":"إرسال رسائل مستهدفة مع تتبع فوري لأداء الحملات.","en":"Send targeted messages with real-time campaign tracking."}', 2),
('inbox', 'Inbox', '{"ar":"صندوق وارد موحد","en":"Unified inbox"}', '{"ar":"إدارة كافة المحادثات من منصة واحدة وتوجيهها تلقائياً.","en":"Manage all conversations from a single platform, auto-routed."}', 3),
('flows', 'Workflow', '{"ar":"منشئ تدفقات بدون كود","en":"No-code flow builder"}', '{"ar":"بناء مسارات المحادثة بسهولة (سحب وإفلات).","en":"Build conversation paths with drag-and-drop."}', 4),
('analytics', 'LineChart', '{"ar":"تحليلات آنية","en":"Real-time analytics"}', '{"ar":"لوحة بيانات تفصيلية لتتبع الأداء.","en":"Detailed dashboards for performance tracking."}', 5),
('integrations', 'PlugZap', '{"ar":"تكاملات متعددة","en":"100+ integrations"}', '{"ar":"الربط المباشر مع أكثر من 100 منصة.","en":"Direct integration with 100+ platforms."}', 6)
on conflict (key) do update set
  icon = excluded.icon, title = excluded.title, description = excluded.description, order_index = excluded.order_index;

-- sectors
insert into public.sectors (key, icon, title, description, long_description, use_cases, order_index) values
('nonprofit', 'Heart', '{"ar":"القطاع غير ربحي","en":"Non-profit"}', '{"ar":"استقبال طلبات المستفيدين، وتسويق الحملات.","en":"Beneficiary requests and campaign marketing."}', null, '[]'::jsonb, 1),
('public', 'Building2', '{"ar":"القطاع العام","en":"Public sector"}', '{"ar":"استفسارات الجمهور والخدمات الإلكترونية.","en":"Public inquiries and e-services."}', null, '[]'::jsonb, 2),
('restaurants', 'UtensilsCrossed', '{"ar":"المطاعم","en":"Restaurants"}', '{"ar":"الطلبات والحجوزات وإدارة الشكاوى.","en":"Orders, reservations, and complaint handling."}', null, '[]'::jsonb, 3),
('real-estate', 'Home', '{"ar":"العقارات","en":"Real estate"}', '{"ar":"استفسارات العقارات وجدولة المعاينات وتقديم العروض.","en":"Property inquiries, viewing scheduling, and offer delivery."}', null, '[]'::jsonb, 4),
('education', 'GraduationCap', '{"ar":"التعليم والجامعات","en":"Education & universities"}', '{"ar":"التسجيل الإلكتروني والجداول والإرشاد الأكاديمي.","en":"Online registration, schedules, and academic guidance."}', null, '[]'::jsonb, 5),
('healthcare', 'HeartPulse', '{"ar":"الخدمات الصحية","en":"Healthcare"}', '{"ar":"حجز المواعيد، التذكير بالمراجعات، والرد على الاستفسارات.","en":"Appointment booking, follow-up reminders, and inquiry replies."}', null, '[]'::jsonb, 6)
on conflict (key) do update set
  icon = excluded.icon, title = excluded.title, description = excluded.description, order_index = excluded.order_index;

-- stats
insert into public.stats (value, label, order_index) values
('+8',   '{"ar":"قطاعات نخدمها","en":"Sectors served"}',          1),
('+100', '{"ar":"منصة تكامل","en":"Integrations"}',              2),
('98%',  '{"ar":"رضا العملاء","en":"Customer satisfaction"}',    3),
('2',    '{"ar":"أسبوع للتجهيز","en":"Weeks to launch"}',         4)
on conflict do nothing;

-- value_props
insert into public.value_props (key, icon, title, description, order_index) values
('instant',     'Clock',         '{"ar":"رد فوري على مدار الساعة","en":"24/7 instant replies"}',           '{"ar":"يرد على استفسارات عملائك خلال ثوانٍ، على مدار الساعة.","en":"Replies to your customers within seconds, around the clock."}', 1),
('convert',     'TrendingUp',    '{"ar":"تحويل المحادثات إلى مبيعات","en":"Conversions, not just answers"}', '{"ar":"ليس مجرد روبوت ردود — يؤهّل العملاء المحتملين ويغلق الصفقات.","en":"More than a chatbot — it qualifies leads and closes deals on autopilot."}', 2),
('dialect',     'MessageCircle', '{"ar":"فهم اللهجة السعودية","en":"Speaks Saudi dialect"}',                '{"ar":"مدرب على اللهجات المحلية بدقة عالية.","en":"Trained on local Saudi dialects with high accuracy."}', 3),
('analytics',   'BarChart3',     '{"ar":"تحليلات آنية وتقارير","en":"Real-time analytics"}',              '{"ar":"لوحة تحكم شاملة تتابع كل تفاعل ومعدل تحويل.","en":"A full dashboard tracking every interaction and conversion rate."}', 4),
('no-code',     'Wand2',         '{"ar":"جاهز خلال أسبوعين","en":"Live in two weeks"}',                    '{"ar":"تحسين مستمر أسبوعي — لا تحتاج لمطوّر.","en":"Weekly improvements — no developer required."}', 5),
('licensed',    'ShieldCheck',   '{"ar":"مرخّص ومعتمد رسمياً","en":"Officially licensed"}',                '{"ar":"شريك واتساب بزنس رسمي — معتمد من Meta.","en":"Official WhatsApp Business partner — Meta certified."}', 6),
('integrations','PlugZap',       '{"ar":"أكثر من 100 تكامل","en":"100+ integrations"}',                    '{"ar":"تكامل مباشر مع Shopify وHubSpot وSalesforce وغيرها.","en":"Direct integrations with Shopify, HubSpot, Salesforce, and more."}', 7)
on conflict (key) do update set
  icon = excluded.icon, title = excluded.title, description = excluded.description, order_index = excluded.order_index;

-- integrations
insert into public.integrations (name, category, order_index) values
('Shopify',   'ecommerce',    1),
('HubSpot',   'crm',          2),
('Salesforce','crm',          3),
('Zapier',    'automation',   4),
('Stripe',    'payment',      5),
('Google',    'productivity', 6),
('Meta',      'social',       7)
on conflict do nothing;

-- pages: home, about (with vision + mission)
insert into public.pages (slug, title, description, content, seo) values
(
  'home',
  '{"ar":"سولڤد","en":"Soulvd"}',
  '{"ar":"نحوّل محادثات واتساب إلى مبيعات — منصة ذكاء اصطناعي للسوق السعودي.","en":"We turn WhatsApp conversations into sales — AI automation for Saudi businesses."}',
  '[]'::jsonb,
  '{"og_image": null}'::jsonb
),
(
  'about',
  '{"ar":"عن سولڤد","en":"About Soulvd"}',
  '{"ar":"شركة سعودية متخصصة في حلول الذكاء الاصطناعي للأعمال.","en":"A Saudi company specializing in AI solutions for businesses."}',
  '[
    {"type":"vision","data":{"title":{"ar":"رؤيتنا","en":"Our vision"},"text":{"ar":"أن نكون الشريك التقني الأول لكل شركة سعودية تسعى إلى أتمتة تجربة العملاء.","en":"To be the #1 technical partner for every Saudi company seeking customer experience automation."}}},
    {"type":"mission","data":{"title":{"ar":"مهمتنا","en":"Our mission"},"text":{"ar":"تقديم أدوات ذكاء اصطناعي تساعد الشركات بمختلف أحجامها.","en":"Deliver AI tools that help companies of all sizes improve service and reduce operating costs."}}}
  ]'::jsonb,
  '{}'::jsonb
)
on conflict (slug) do update set
  title = excluded.title, description = excluded.description, content = excluded.content, seo = excluded.seo;

-- Done
do $$
begin
  raise notice 'Soulvd initial schema applied successfully.';
  raise notice 'Tables: %, %, %, ...', 'users', 'site_settings', 'pages';
  raise notice 'Storage buckets: templates (private), documents (public), media (public)';
end $$;
