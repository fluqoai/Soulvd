-- ============================================================
--  Soulvd — partners table for the home page partner strip
--  Project: lyvoiipsmcbffvpkrxhy
--  Apply via: Supabase dashboard SQL editor
-- ============================================================

create table if not exists public.partners (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,                  -- shown on hover / screen readers
  logo_url    text,                           -- path in 'media' bucket or external URL
  url         text,                           -- partner website
  order_index int not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists partners_order_idx     on public.partners (order_index);
create index if not exists partners_published_idx on public.partners (published);

-- Drop + recreate trigger to keep the migration idempotent
drop trigger if exists partners_set_updated_at on public.partners;
create trigger partners_set_updated_at
  before update on public.partners
  for each row execute function public.tg_set_updated_at();

-- RLS ----------------------------------------------------------------
alter table public.partners enable row level security;

-- Public can read published partners
drop policy if exists "public read partners" on public.partners;
create policy "public read partners"
  on public.partners for select
  using (published = true);

-- Editor / owner can write
drop policy if exists "editors write partners" on public.partners;
create policy "editors write partners"
  on public.partners for all
  using (is_editor_or_owner()) with check (is_editor_or_owner());

-- ============================================================
--  Seed: placeholder partners (replace logos later via admin)
-- ============================================================
insert into public.partners (name, url, order_index) values
  ('Meta',         'https://www.meta.com',        10),
  ('WhatsApp',     'https://www.whatsapp.com',    20),
  ('Shopify',      'https://www.shopify.com',     30),
  ('HubSpot',      'https://www.hubspot.com',     40),
  ('Salesforce',   'https://www.salesforce.com',  50),
  ('Stripe',       'https://www.stripe.com',      60),
  ('Zapier',       'https://www.zapier.com',      70),
  ('Google',       'https://www.google.com',      80)
on conflict do nothing;
