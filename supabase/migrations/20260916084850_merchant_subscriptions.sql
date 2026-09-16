begin;

-- Existing staff keep their roles. New signups must never become CMS editors.
alter table public.users drop constraint users_role_check;
alter table public.users add constraint users_role_check check (role in ('owner', 'editor', 'merchant'));
alter table public.users alter column role set default 'merchant';
create or replace function public.tg_handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.users (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 'merchant')
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.tg_handle_new_user() from public, anon, authenticated;

create schema if not exists soulvd_private;
revoke all on schema soulvd_private from public, anon, authenticated;
grant usage on schema soulvd_private to authenticated, service_role;

create table public.subscription_plans (
  id text primary key,
  code text not null check (code in ('starter', 'pro_growth')),
  version integer not null check (version > 0),
  price_halalas integer not null check (price_halalas > 0),
  conversations_limit integer not null check (conversations_limit > 0),
  numbers_limit integer not null check (numbers_limit > 0),
  seats_limit integer check (seats_limit > 0),
  templates_limit integer check (templates_limit > 0),
  flows_limit integer check (flows_limit > 0),
  api_enabled boolean not null,
  unique (code, version)
);
insert into public.subscription_plans values
  ('starter_v1', 'starter', 1, 29900, 2000, 1, 2, 10, 1, false),
  ('pro_growth_v1', 'pro_growth', 1, 39900, 10000, 1, null, null, null, true);

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now()
);
create table public.tenant_members (
  tenant_id uuid not null references public.tenants on delete cascade,
  user_id uuid not null references public.users on delete cascade,
  role text not null check (role in ('owner', 'admin', 'agent')),
  primary key (tenant_id, user_id)
);
create index tenant_members_user_idx on public.tenant_members(user_id, tenant_id);
create table public.subscriptions (
  tenant_id uuid primary key references public.tenants on delete cascade,
  plan_id text not null references public.subscription_plans,
  status text not null default 'pending' check (status in ('pending', 'active', 'past_due', 'cancelled')),
  period_start timestamptz not null,
  period_end timestamptz not null,
  check (period_end > period_start)
);
create table public.subscription_changes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  from_plan_id text references public.subscription_plans,
  to_plan_id text not null references public.subscription_plans,
  payment_reference text not null unique,
  created_at timestamptz not null default now()
);
create table public.tenant_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  email text not null check (email = lower(trim(email))),
  role text not null check (role in ('admin', 'agent')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  expires_at timestamptz not null default now() + interval '7 days'
);
create unique index tenant_invitations_pending_idx on public.tenant_invitations(tenant_id, email) where status = 'pending';

-- No provider identifiers or credentials in merchant-readable tables.
create table public.whatsapp_numbers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  phone text not null,
  status text not null default 'pending' check (status in ('pending', 'connected', 'disconnected')),
  unique (tenant_id, phone)
);
create table soulvd_private.provider_number_bindings (
  number_id uuid primary key references public.whatsapp_numbers on delete cascade,
  waba_id text not null,
  provider_number_id text not null unique
);
create table public.whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  name text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'archived')),
  unique (tenant_id, name)
);
create table public.automation_flows (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants on delete cascade,
  name text not null,
  definition jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived'))
);
create table public.usage_counters (
  tenant_id uuid not null references public.tenants on delete cascade,
  period_start timestamptz not null,
  conversations_used integer not null default 0 check (conversations_used >= 0),
  primary key (tenant_id, period_start)
);
-- A subject is a canonical WhatsApp customer identity, not an arbitrary message.
-- Each customer is counted once per billing period; repeat messages are free
-- from the platform quota, independently of provider message costs.
create table soulvd_private.conversation_usage (
  tenant_id uuid not null references public.tenants on delete cascade,
  period_start timestamptz not null,
  customer_key text not null check (length(customer_key) between 1 and 200),
  first_contact_at timestamptz not null default now(),
  primary key (tenant_id, period_start, customer_key),
  foreign key (tenant_id, period_start) references public.usage_counters on delete cascade
);
create table public.usage_warning_dismissals (
  tenant_id uuid not null references public.tenants on delete cascade,
  user_id uuid not null references public.users on delete cascade,
  period_start timestamptz not null,
  resource text not null check (resource in ('conversations', 'numbers', 'seats', 'templates', 'flows')),
  primary key (tenant_id, user_id, period_start, resource)
);

-- Narrow definer helper avoids recursive membership RLS. Returns only whether
-- the caller belongs to this tenant; no user-supplied identity is accepted.
create function soulvd_private.is_member(p_tenant uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tenant_members where tenant_id = p_tenant and user_id = (select auth.uid()));
$$;
revoke all on function soulvd_private.is_member(uuid) from public, anon, authenticated;
grant execute on function soulvd_private.is_member(uuid) to authenticated;

alter table public.subscription_plans enable row level security;
revoke all on public.subscription_plans from anon, authenticated;
grant select on public.subscription_plans to anon, authenticated;
create policy plans_read on public.subscription_plans for select to anon, authenticated using (true);
do $$
declare t text;
begin
  foreach t in array array['tenants', 'tenant_members', 'subscriptions', 'subscription_changes', 'tenant_invitations', 'whatsapp_numbers', 'whatsapp_templates', 'automation_flows', 'usage_counters', 'usage_warning_dismissals'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('create policy tenant_read on public.%I for select to authenticated using (soulvd_private.is_member(%I))', t, case when t = 'tenants' then 'id' else 'tenant_id' end);
  end loop;
end;
$$;
alter table soulvd_private.provider_number_bindings enable row level security;
alter table soulvd_private.conversation_usage enable row level security;
grant all on public.subscription_plans to service_role;
grant all on soulvd_private.provider_number_bindings, soulvd_private.conversation_usage to service_role;

-- Service-role only RPCs: entry points must authenticate users separately.
-- These are invoker functions, not public RLS-bypassing definer endpoints.
create function public.soulvd_consume_conversation(p_tenant uuid, p_customer_key text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare s public.subscriptions; lim integer; used integer; is_new boolean;
begin
  if p_customer_key is null or length(trim(p_customer_key)) not between 1 and 200 then
    raise exception 'INVALID_CUSTOMER';
  end if;
  -- One short lock per tenant, also serializes plan changes and seat/resource
  -- admissions. No network operations occur in this transaction.
  select * into s from public.subscriptions where tenant_id = p_tenant for update;
  if not found or s.status <> 'active' or now() < s.period_start or now() >= s.period_end then
    return jsonb_build_object('allowed', false, 'code', 'SUBSCRIPTION_INACTIVE');
  end if;
  select conversations_limit into lim from public.subscription_plans where id = s.plan_id;
  insert into public.usage_counters(tenant_id, period_start) values(p_tenant, s.period_start) on conflict do nothing;
  select conversations_used into used from public.usage_counters where tenant_id = p_tenant and period_start = s.period_start;
  if exists (select 1 from soulvd_private.conversation_usage where tenant_id = p_tenant and period_start = s.period_start and customer_key = p_customer_key) then
    return jsonb_build_object('allowed', true, 'newConversation', false, 'used', used, 'limit', lim);
  end if;
  if used >= lim then
    return jsonb_build_object('allowed', false, 'code', 'LIMIT_EXCEEDED', 'resource', 'conversations', 'used', used, 'limit', lim);
  end if;
  insert into soulvd_private.conversation_usage(tenant_id, period_start, customer_key) values(p_tenant, s.period_start, p_customer_key);
  update public.usage_counters set conversations_used = conversations_used + 1 where tenant_id = p_tenant and period_start = s.period_start returning conversations_used into used;
  return jsonb_build_object('allowed', true, 'newConversation', true, 'used', used, 'limit', lim);
end;
$$;

create function public.soulvd_invite_member(p_tenant uuid, p_actor uuid, p_email text, p_role text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare s public.subscriptions; lim integer; used integer; invite uuid;
begin
  if not exists (select 1 from public.tenant_members where tenant_id = p_tenant and user_id = p_actor and role in ('owner', 'admin')) then
    raise exception 'FORBIDDEN';
  end if;
  if p_role is null or p_role not in ('admin', 'agent') or p_email is null or p_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'INVALID_INVITATION';
  end if;
  select * into s from public.subscriptions where tenant_id = p_tenant for update;
  if not found or s.status <> 'active' or now() < s.period_start or now() >= s.period_end then
    return jsonb_build_object('allowed', false, 'code', 'SUBSCRIPTION_INACTIVE');
  end if;
  if exists (select 1 from public.tenant_members m join public.users u on u.id = m.user_id where m.tenant_id = p_tenant and lower(u.email) = lower(trim(p_email))) then
    return jsonb_build_object('allowed', false, 'code', 'ALREADY_MEMBER');
  end if;
  update public.tenant_invitations set status = 'revoked' where tenant_id = p_tenant and status = 'pending' and expires_at <= now();
  select id into invite from public.tenant_invitations where tenant_id = p_tenant and email = lower(trim(p_email)) and status = 'pending';
  if found then return jsonb_build_object('allowed', true, 'invitationId', invite); end if;
  select seats_limit into lim from public.subscription_plans where id = s.plan_id;
  select (select count(*) from public.tenant_members where tenant_id = p_tenant) + (select count(*) from public.tenant_invitations where tenant_id = p_tenant and status = 'pending') into used;
  if lim is not null and used >= lim then return jsonb_build_object('allowed', false, 'code', 'LIMIT_EXCEEDED', 'resource', 'seats', 'used', used, 'limit', lim); end if;
  insert into public.tenant_invitations(tenant_id, email, role) values(p_tenant, lower(trim(p_email)), p_role) returning id into invite;
  return jsonb_build_object('allowed', true, 'invitationId', invite);
end;
$$;

create function public.soulvd_apply_paid_upgrade(p_tenant uuid, p_payment_reference text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare s public.subscriptions;
begin
  if p_payment_reference is null or length(trim(p_payment_reference)) < 1 then raise exception 'PAYMENT_REFERENCE_REQUIRED'; end if;
  select * into s from public.subscriptions where tenant_id = p_tenant for update;
  if not found then raise exception 'SUBSCRIPTION_NOT_FOUND'; end if;
  if exists (select 1 from public.subscription_changes where payment_reference = p_payment_reference and tenant_id = p_tenant and to_plan_id = 'pro_growth_v1') then return true; end if;
  if s.status <> 'active' or s.plan_id <> 'starter_v1' or now() < s.period_start or now() >= s.period_end then raise exception 'UPGRADE_NOT_AVAILABLE'; end if;
  insert into public.subscription_changes(tenant_id, from_plan_id, to_plan_id, payment_reference) values(p_tenant, s.plan_id, 'pro_growth_v1', p_payment_reference);
  update public.subscriptions set plan_id = 'pro_growth_v1' where tenant_id = p_tenant;
  -- Keep the cycle and usage. Only a verified payment handler may call this.
  return true;
end;
$$;
revoke all on function public.soulvd_consume_conversation(uuid, text), public.soulvd_invite_member(uuid, uuid, text, text), public.soulvd_apply_paid_upgrade(uuid, text) from public, anon, authenticated;
grant execute on function public.soulvd_consume_conversation(uuid, text), public.soulvd_invite_member(uuid, uuid, text, text), public.soulvd_apply_paid_upgrade(uuid, text) to service_role;

create function public.soulvd_create_tenant(p_actor uuid, p_name text, p_plan text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare tenant uuid;
begin
  if not exists (select 1 from public.users where id = p_actor and role = 'merchant') then raise exception 'FORBIDDEN'; end if;
  -- Serialize duplicate onboarding requests from the same account.
  perform 1 from public.users where id = p_actor for update;
  select tenant_id into tenant from public.tenant_members where user_id = p_actor order by tenant_id limit 1;
  if found then return tenant; end if;
  if p_plan is null or p_plan not in ('starter_v1', 'pro_growth_v1') then raise exception 'INVALID_PLAN'; end if;
  insert into public.tenants(name) values(trim(p_name)) returning id into tenant;
  insert into public.tenant_members values(tenant, p_actor, 'owner');
  insert into public.subscriptions(tenant_id, plan_id, period_start, period_end) values(tenant, p_plan, now(), now() + interval '1 month');
  return tenant;
end;
$$;
create function public.soulvd_accept_invitation(p_actor uuid, p_invite uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare i public.tenant_invitations; s public.subscriptions; lim integer; used integer;
begin
  select * into i from public.tenant_invitations where id = p_invite;
  if not found or not exists (select 1 from public.users where id = p_actor and lower(email) = i.email) then raise exception 'FORBIDDEN'; end if;
  select * into s from public.subscriptions where tenant_id = i.tenant_id for update;
  select * into i from public.tenant_invitations where id = p_invite;
  if i.status = 'accepted' then return true; end if;
  if i.status <> 'pending' or i.expires_at <= now() then raise exception 'INVITATION_EXPIRED'; end if;
  if s.status <> 'active' or now() < s.period_start or now() >= s.period_end then raise exception 'SUBSCRIPTION_INACTIVE'; end if;
  select seats_limit into lim from public.subscription_plans where id = s.plan_id;
  select (select count(*) from public.tenant_members where tenant_id = i.tenant_id) + (select count(*) from public.tenant_invitations where tenant_id = i.tenant_id and status = 'pending' and expires_at > now()) into used;
  if lim is not null and used > lim then raise exception 'LIMIT_EXCEEDED'; end if;
  insert into public.tenant_members values(i.tenant_id, p_actor, i.role) on conflict do nothing;
  update public.tenant_invitations set status = 'accepted' where id = p_invite;
  return true;
end;
$$;
create function public.soulvd_create_resource(p_tenant uuid, p_actor uuid, p_resource text, p_name text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare s public.subscriptions; lim integer; used integer; resource_id uuid;
begin
  if not exists (select 1 from public.tenant_members where tenant_id = p_tenant and user_id = p_actor and role in ('owner', 'admin')) then raise exception 'FORBIDDEN'; end if;
  select * into s from public.subscriptions where tenant_id = p_tenant for update;
  if not found or s.status <> 'active' or now() < s.period_start or now() >= s.period_end then return jsonb_build_object('allowed', false, 'code', 'SUBSCRIPTION_INACTIVE'); end if;
  case p_resource
    when 'templates' then
      select templates_limit into lim from public.subscription_plans where id = s.plan_id;
      -- Reserve pending approvals too, to prevent submitting beyond the cap.
      select count(*) into used from public.whatsapp_templates where tenant_id = p_tenant and status in ('pending', 'approved');
    when 'flows' then
      select flows_limit into lim from public.subscription_plans where id = s.plan_id;
      select count(*) into used from public.automation_flows where tenant_id = p_tenant and status <> 'archived';
    when 'numbers' then
      select numbers_limit into lim from public.subscription_plans where id = s.plan_id;
      select count(*) into used from public.whatsapp_numbers where tenant_id = p_tenant;
    else raise exception 'INVALID_RESOURCE';
  end case;
  if lim is not null and used >= lim then return jsonb_build_object('allowed', false, 'code', 'LIMIT_EXCEEDED', 'resource', p_resource, 'used', used, 'limit', lim); end if;
  if p_name is null or length(trim(p_name)) not between 1 and 120 then raise exception 'INVALID_NAME'; end if;
  case p_resource
    when 'templates' then insert into public.whatsapp_templates(tenant_id, name) values(p_tenant, trim(p_name)) returning id into resource_id;
    when 'flows' then insert into public.automation_flows(tenant_id, name) values(p_tenant, trim(p_name)) returning id into resource_id;
    when 'numbers' then insert into public.whatsapp_numbers(tenant_id, phone) values(p_tenant, trim(p_name)) returning id into resource_id;
  end case;
  return jsonb_build_object('allowed', true, 'id', resource_id);
end;
$$;
revoke all on function public.soulvd_create_tenant(uuid, text, text), public.soulvd_accept_invitation(uuid, uuid), public.soulvd_create_resource(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.soulvd_create_tenant(uuid, text, text), public.soulvd_accept_invitation(uuid, uuid), public.soulvd_create_resource(uuid, uuid, text, text) to service_role;

commit;
