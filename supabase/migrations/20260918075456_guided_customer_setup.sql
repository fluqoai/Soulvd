begin;
-- Account preparation is independent from paid provider activation.
alter table public.platform_launch_settings
 add column payments_ready boolean not null default false,
 add column onboarding_ready boolean not null default false;
alter table public.whatsapp_onboarding_requests
 add column number_kind text not null default 'business_app'
 check(number_kind in ('business_app','new_number','other_provider'));

create or replace function public.soulvd_onboarding_request(p_actor uuid,p_tenant uuid,p_phone text) returns uuid
language plpgsql security invoker set search_path='' as $$
declare result uuid; saved_phone text;
begin
 if not exists(select 1 from public.tenant_members where tenant_id=p_tenant and user_id=p_actor and role='owner') then raise exception 'FORBIDDEN'; end if;
 -- Serialize retry/change/cancel for this tenant, including unpaid preparation.
 perform 1 from public.subscriptions where tenant_id=p_tenant for update;
 if not found then raise exception 'SUBSCRIPTION_NOT_FOUND'; end if;
 if p_phone is null or p_phone!~'^[+][0-9]{7,15}$' then raise exception 'INVALID_PHONE'; end if;
 if exists(select 1 from public.whatsapp_numbers where tenant_id=p_tenant and status='connected') then raise exception 'ALREADY_CONNECTED'; end if;
 select id,phone into result,saved_phone from public.whatsapp_onboarding_requests where tenant_id=p_tenant and status<>'rejected';
 if found then
  if saved_phone<>p_phone then raise exception 'OPEN_CONNECTION_REQUEST'; end if;
  return result;
 end if;
 insert into public.whatsapp_onboarding_requests(tenant_id,requested_by,phone) values(p_tenant,p_actor,p_phone) returning id into result;
 return result;
end $$;

create function public.soulvd_prepare_connection(p_actor uuid,p_tenant uuid,p_phone text,p_kind text) returns uuid
language plpgsql security invoker set search_path='' as $$
declare result uuid;
begin
 if p_kind is null or p_kind not in('business_app','new_number','other_provider') then raise exception 'INVALID_NUMBER_KIND'; end if;
 result:=public.soulvd_onboarding_request(p_actor,p_tenant,p_phone);
 if exists(select 1 from public.whatsapp_onboarding_requests where id=result and status<>'awaiting_link' and number_kind<>p_kind) then raise exception 'OPEN_CONNECTION_REQUEST'; end if;
 update public.whatsapp_onboarding_requests set number_kind=p_kind where id=result and status='awaiting_link';
 return result;
end $$;
create function public.soulvd_restart_connection(p_actor uuid,p_tenant uuid,p_id uuid) returns void
language plpgsql security invoker set search_path='' as $$ begin
 if not exists(select 1 from public.tenant_members where tenant_id=p_tenant and user_id=p_actor and role='owner') then raise exception 'FORBIDDEN'; end if;
 perform 1 from public.subscriptions where tenant_id=p_tenant for update;
 update public.whatsapp_onboarding_requests set status='rejected',onboarding_url=null,note='ألغى مالك المساحة الطلب لتعديل بيانات الرقم.'
 where id=p_id and tenant_id=p_tenant and status='awaiting_link';
 if not found then raise exception 'CONNECTION_ALREADY_STARTED'; end if;
end $$;
create function public.soulvd_renew_connection_link(p_actor uuid,p_tenant uuid,p_id uuid) returns void
language plpgsql security invoker set search_path='' as $$ begin
 if not exists(select 1 from public.tenant_members where tenant_id=p_tenant and user_id=p_actor and role='owner') then raise exception 'FORBIDDEN'; end if;
 perform 1 from public.subscriptions where tenant_id=p_tenant for update;
 update public.whatsapp_onboarding_requests set status='awaiting_link',onboarding_url=null,link_expires_at=null
 where id=p_id and tenant_id=p_tenant and status='awaiting_customer' and link_expires_at<=now();
 if not found then raise exception 'LINK_NOT_EXPIRED'; end if;
end $$;

create or replace function public.soulvd_onboarding_link(p_actor uuid,p_id uuid,p_url text) returns void
language plpgsql security invoker set search_path='' as $$ begin
 if not exists(select 1 from public.users where id=p_actor and role='owner') then raise exception 'FORBIDDEN'; end if;
 if not exists(select 1 from public.platform_launch_settings where id and onboarding_ready) then raise exception 'ONBOARDING_NOT_READY'; end if;
 if p_url is null or length(p_url)>2000 or p_url!~'^https://([a-zA-Z0-9-]+[.])*ycloud[.]com/' then raise exception 'INVALID_ONBOARDING_URL'; end if;
 -- Pro's Onboard Link is only for Coexistence, never route a new number into it.
 update public.whatsapp_onboarding_requests set onboarding_url=p_url,link_expires_at=now()+interval '7 days',status='awaiting_customer'
 where id=p_id and number_kind='business_app' and status in('awaiting_link','awaiting_customer','review');
 if not found then raise exception 'COEXISTENCE_REQUEST_REQUIRED'; end if;
end $$;

-- Block payment creation server-side during preparation, not just in the UI.
create function soulvd_private.preparation_payment_gate() returns trigger
language plpgsql security invoker set search_path='' as $$ begin
 if not exists(select 1 from public.platform_launch_settings where id and payments_ready)
 and not exists(select 1 from public.subscriptions where tenant_id=new.tenant_id and status='active' and now()>=period_start and now()<period_end)
 then raise exception 'PAYMENTS_NOT_READY'; end if;
 return new;
end $$;
revoke all on function soulvd_private.preparation_payment_gate() from public,anon,authenticated;
grant execute on function soulvd_private.preparation_payment_gate() to service_role;
create trigger preparation_payment_gate before insert on public.payment_requests for each row execute function soulvd_private.preparation_payment_gate();

create function public.soulvd_set_launch_phase(p_actor uuid,p_signup boolean,p_payments boolean,p_onboarding boolean) returns void
language plpgsql security invoker set search_path='' as $$ begin
 if not exists(select 1 from public.users where id=p_actor and role='owner') then raise exception 'FORBIDDEN'; end if;
 if p_signup is null or p_payments is null or p_onboarding is null then raise exception 'INVALID_PHASE'; end if;
 if p_payments and not p_onboarding then raise exception 'ONBOARDING_REQUIRED_BEFORE_PAYMENTS'; end if;
 update public.platform_launch_settings set signup_ready=p_signup,payments_ready=p_payments,onboarding_ready=p_onboarding where id;
end $$;
revoke all on function public.soulvd_prepare_connection(uuid,uuid,text,text),public.soulvd_restart_connection(uuid,uuid,uuid),public.soulvd_renew_connection_link(uuid,uuid,uuid),public.soulvd_set_launch_phase(uuid,boolean,boolean,boolean) from public,anon,authenticated;
grant execute on function public.soulvd_prepare_connection(uuid,uuid,text,text),public.soulvd_restart_connection(uuid,uuid,uuid),public.soulvd_renew_connection_link(uuid,uuid,uuid),public.soulvd_set_launch_phase(uuid,boolean,boolean,boolean) to service_role;
-- Signup activation is a separate operator action after the app is deployed.
commit;
