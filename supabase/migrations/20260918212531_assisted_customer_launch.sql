begin;
alter table public.whatsapp_onboarding_requests
 add column authorization_method text not null default 'link' check(authorization_method in('link','assisted')),
 add column customer_confirmed_at timestamptz,
 add column assisted_by uuid references public.users;

-- No provider assets are granted by scheduling a session. The customer must
-- separately acknowledge authorization and the existing bind RPC still checks
-- the live provider asset, paid term and exclusive tenant ownership.
create function public.soulvd_onboarding_assisted(p_actor uuid,p_id uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare r public.whatsapp_onboarding_requests; s public.subscriptions;
begin
 if not exists(select 1 from public.users where id=p_actor and role='owner') then raise exception 'FORBIDDEN'; end if;
 if not exists(select 1 from public.platform_launch_settings where id and onboarding_ready) then raise exception 'ONBOARDING_NOT_READY'; end if;
 select * into r from public.whatsapp_onboarding_requests where id=p_id for update;
 if not found or r.number_kind<>'business_app' or r.status not in('awaiting_link','awaiting_customer') then raise exception 'COEXISTENCE_REQUEST_REQUIRED'; end if;
 select * into s from public.subscriptions where tenant_id=r.tenant_id;
 if s.status is distinct from 'active' or now()<s.period_start or now()>=s.period_end then raise exception 'SUBSCRIPTION_INACTIVE'; end if;
 update public.whatsapp_onboarding_requests set authorization_method='assisted',assisted_by=p_actor,
 onboarding_url=null,link_expires_at=null,customer_confirmed_at=null,status='awaiting_customer' where id=r.id;
end $$;

create or replace function public.soulvd_onboarding_ready(p_actor uuid,p_tenant uuid,p_id uuid) returns void
language plpgsql security invoker set search_path='' as $$ begin
 if not exists(select 1 from public.tenant_members where tenant_id=p_tenant and user_id=p_actor and role='owner') then raise exception 'FORBIDDEN'; end if;
 update public.whatsapp_onboarding_requests set status='review',customer_confirmed_at=now()
 where id=p_id and tenant_id=p_tenant and status='awaiting_customer'
 and ((authorization_method='link' and onboarding_url is not null and link_expires_at>now())
 or (authorization_method='assisted' and assisted_by is not null and number_kind='business_app'));
 if not found then raise exception 'LINK_EXPIRED_OR_NOT_READY'; end if;
end $$;

create or replace function public.soulvd_onboarding_link(p_actor uuid,p_id uuid,p_url text) returns void
language plpgsql security invoker set search_path='' as $$ begin
 if not exists(select 1 from public.users where id=p_actor and role='owner') then raise exception 'FORBIDDEN'; end if;
 if not exists(select 1 from public.platform_launch_settings where id and onboarding_ready) then raise exception 'ONBOARDING_NOT_READY'; end if;
 if p_url is null or length(p_url)>2000 or p_url!~'^https://([a-zA-Z0-9-]+[.])*ycloud[.]com/'
 or p_url~*'^https://([a-zA-Z0-9-]+[.])*ycloud[.]com/(console|entry)(/|#|[?]|$)' then raise exception 'INVALID_ONBOARDING_URL'; end if;
 update public.whatsapp_onboarding_requests set onboarding_url=p_url,link_expires_at=now()+interval '7 days',
 authorization_method='link',assisted_by=null,customer_confirmed_at=null,status='awaiting_customer'
 where id=p_id and number_kind='business_app' and status in('awaiting_link','awaiting_customer','review');
 if not found then raise exception 'COEXISTENCE_REQUEST_REQUIRED'; end if;
end $$;
revoke all on function public.soulvd_onboarding_assisted(uuid,uuid) from public,anon,authenticated;
grant execute on function public.soulvd_onboarding_assisted(uuid,uuid) to service_role;
commit;
