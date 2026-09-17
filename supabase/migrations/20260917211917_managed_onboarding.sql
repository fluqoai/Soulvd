begin;
-- Keep the public form closed until institutional SMTP has been verified.
create table public.platform_launch_settings (
 id boolean primary key default true check(id), signup_ready boolean not null default false
);
insert into public.platform_launch_settings default values;
alter table public.platform_launch_settings enable row level security;
revoke all on public.platform_launch_settings from public,anon,authenticated;
grant select on public.platform_launch_settings to anon,authenticated;
grant all on public.platform_launch_settings to service_role;
create policy launch_read on public.platform_launch_settings for select to anon,authenticated using(true);
create table public.whatsapp_onboarding_requests (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants,
 requested_by uuid not null references public.users, phone text not null check(phone~'^[+][0-9]{7,15}$'),
 status text not null default 'awaiting_link' check(status in('awaiting_link','awaiting_customer','review','connected','rejected')),
 onboarding_url text, link_expires_at timestamptz,
 created_at timestamptz not null default now(), connected_at timestamptz, connected_by uuid references public.users,
 note text check(length(note)<=500),
 check(onboarding_url is null or onboarding_url~'^https://([a-zA-Z0-9-]+[.])*ycloud[.]com/')
);
create unique index whatsapp_onboarding_open on public.whatsapp_onboarding_requests(tenant_id) where status<>'rejected';
create index whatsapp_onboarding_status_date on public.whatsapp_onboarding_requests(status,created_at);
alter table public.whatsapp_onboarding_requests enable row level security;
revoke all on public.whatsapp_onboarding_requests from public,anon,authenticated;
grant select on public.whatsapp_onboarding_requests to authenticated;
grant all on public.whatsapp_onboarding_requests to service_role;
-- Onboarding links authorize account access: show only to the workspace owner.
create policy owner_read on public.whatsapp_onboarding_requests for select to authenticated using(exists(select 1 from public.tenant_members m where m.tenant_id=whatsapp_onboarding_requests.tenant_id and m.user_id=(select auth.uid()) and m.role='owner'));

create function public.soulvd_onboarding_request(p_actor uuid,p_tenant uuid,p_phone text) returns uuid
language plpgsql security invoker set search_path='' as $$
declare s public.subscriptions; result uuid;
begin
 if not exists(select 1 from public.tenant_members where tenant_id=p_tenant and user_id=p_actor and role='owner') then raise exception 'FORBIDDEN'; end if;
 select * into s from public.subscriptions where tenant_id=p_tenant for update;
 if not found or s.status<>'active' or now()<s.period_start or now()>=s.period_end then raise exception 'SUBSCRIPTION_INACTIVE'; end if;
 if p_phone is null or p_phone!~'^[+][0-9]{7,15}$' then raise exception 'INVALID_PHONE'; end if;
 if exists(select 1 from public.whatsapp_numbers where tenant_id=p_tenant and status='connected') then raise exception 'ALREADY_CONNECTED'; end if;
 select id into result from public.whatsapp_onboarding_requests where tenant_id=p_tenant and status<>'rejected';
 if found then return result; end if;
 insert into public.whatsapp_onboarding_requests(tenant_id,requested_by,phone) values(p_tenant,p_actor,p_phone) returning id into result;
 return result;
end $$;
create function public.soulvd_onboarding_ready(p_actor uuid,p_tenant uuid,p_id uuid) returns void
language plpgsql security invoker set search_path='' as $$ begin
 if not exists(select 1 from public.tenant_members where tenant_id=p_tenant and user_id=p_actor and role='owner') then raise exception 'FORBIDDEN'; end if;
 update public.whatsapp_onboarding_requests set status='review' where id=p_id and tenant_id=p_tenant and status='awaiting_customer' and link_expires_at>now();
 if not found then raise exception 'LINK_EXPIRED_OR_NOT_READY'; end if;
end $$;
create function public.soulvd_onboarding_link(p_actor uuid,p_id uuid,p_url text) returns void
language plpgsql security invoker set search_path='' as $$ begin
 if not exists(select 1 from public.users where id=p_actor and role='owner') then raise exception 'FORBIDDEN'; end if;
 if p_url is null or length(p_url)>2000 or p_url!~'^https://([a-zA-Z0-9-]+[.])*ycloud[.]com/' then raise exception 'INVALID_ONBOARDING_URL'; end if;
 update public.whatsapp_onboarding_requests set onboarding_url=p_url,link_expires_at=now()+interval '7 days',status='awaiting_customer' where id=p_id and status in('awaiting_link','awaiting_customer','review');
 if not found then raise exception 'NOT_FOUND'; end if;
end $$;
create function public.soulvd_onboarding_reject(p_actor uuid,p_id uuid,p_note text) returns void
language plpgsql security invoker set search_path='' as $$ begin
 if not exists(select 1 from public.users where id=p_actor and role='owner') then raise exception 'FORBIDDEN'; end if;
 if p_note is null or length(trim(p_note)) not between 1 and 500 then raise exception 'INVALID_NOTE'; end if;
 update public.whatsapp_onboarding_requests set status='rejected',note=trim(p_note),onboarding_url=null where id=p_id and status<>'connected';
 if not found then raise exception 'NOT_FOUND'; end if;
end $$;
create function public.soulvd_onboarding_bind(p_actor uuid,p_id uuid,p_verified jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
declare r public.whatsapp_onboarding_requests; s public.subscriptions; n uuid; waba text; provider_number text;
begin
 if not exists(select 1 from public.users where id=p_actor and role='owner') then raise exception 'FORBIDDEN'; end if;
 select * into r from public.whatsapp_onboarding_requests where id=p_id for update;
 if not found or r.status not in('review','connected') then raise exception 'CUSTOMER_CONFIRMATION_REQUIRED'; end if;
 if p_verified->>'phoneNumber' is distinct from r.phone or p_verified->>'status' is distinct from 'CONNECTED' or p_verified->'isOnBizApp' is distinct from 'true'::jsonb then raise exception 'PROVIDER_NUMBER_NOT_READY'; end if;
 waba:=p_verified->>'wabaId'; provider_number:=p_verified->>'id';
 if waba is null or provider_number is null or waba!~'^[0-9]+$' or provider_number!~'^[0-9]+$' then raise exception 'INVALID_PROVIDER_ASSET'; end if;
 select * into s from public.subscriptions where tenant_id=r.tenant_id for update;
 if s.status<>'active' or now()<s.period_start or now()>=s.period_end then raise exception 'SUBSCRIPTION_INACTIVE'; end if;
 perform pg_advisory_xact_lock(hashtextextended(r.phone,0));
 if exists(select 1 from public.whatsapp_numbers where phone=r.phone and tenant_id<>r.tenant_id) or exists(select 1 from soulvd_private.meta_connections c join public.whatsapp_numbers wn on wn.id=c.number_id where c.phone_number_id=provider_number and wn.tenant_id<>r.tenant_id) then raise exception 'NUMBER_ALREADY_BOUND'; end if;
 select id into n from public.whatsapp_numbers where tenant_id=r.tenant_id and phone=r.phone;
 if n is null then
  if (select count(*) from public.whatsapp_numbers where tenant_id=r.tenant_id)>=(select numbers_limit from public.subscription_plans where id=s.plan_id) then raise exception 'NUMBER_LIMIT'; end if;
  insert into public.whatsapp_numbers(tenant_id,phone,status) values(r.tenant_id,r.phone,'connected') returning id into n;
 end if;
 if exists(select 1 from soulvd_private.meta_connections where number_id=n and (provider<>'ycloud' or waba_id<>waba or phone_number_id<>provider_number)) then raise exception 'NUMBER_MISMATCH'; end if;
 insert into soulvd_private.meta_connections(number_id,waba_id,phone_number_id,encrypted_token,mode,provider)
 values(n,waba,provider_number,'server-provider-credential','coexistence','ycloud') on conflict(number_id) do nothing;
 update public.whatsapp_numbers set status='connected' where id=n;
 update public.whatsapp_onboarding_requests set status='connected',connected_at=coalesce(connected_at,now()),connected_by=p_actor,onboarding_url=null where id=r.id;
 return n;
end $$;
do $$ declare f record; begin
 for f in select oid::regprocedure as signature from pg_proc where pronamespace='public'::regnamespace and proname like 'soulvd_onboarding_%' loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;
commit;
