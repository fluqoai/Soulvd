begin;
create table soulvd_private.bank_transfers (
 reference text primary key check(length(reference) between 3 and 120),
 tenant_id uuid not null references public.tenants,
 actor_id uuid not null references public.users,
 purpose text not null check(purpose in ('subscription','upgrade')),
 amount_halalas integer not null check(amount_halalas>0),
 confirmed_at timestamptz not null default now()
);
alter table soulvd_private.bank_transfers enable row level security;
revoke all on soulvd_private.bank_transfers from public,anon,authenticated;
grant select,insert on soulvd_private.bank_transfers to service_role;
create function public.soulvd_confirm_bank_transfer(p_actor uuid,p_tenant uuid,p_reference text,p_amount integer,p_purpose text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare s public.subscriptions; previous soulvd_private.bank_transfers; expected integer;
begin
 if not exists(select 1 from public.users where id=p_actor and role='owner') then raise exception 'FORBIDDEN'; end if;
 if exists(select 1 from public.tenants where id=p_tenant and is_test) then raise exception 'TEST_WORKSPACE'; end if;
 if p_reference is null or p_reference<>trim(p_reference) or length(p_reference) not between 3 and 120 or p_purpose not in ('subscription','upgrade') or p_purpose is null then raise exception 'INVALID_TRANSFER'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_reference,0));
 select * into previous from soulvd_private.bank_transfers where reference=p_reference;
 if found then
  if previous.tenant_id=p_tenant and previous.amount_halalas=p_amount and previous.purpose=p_purpose then return true; end if;
  raise exception 'REFERENCE_ALREADY_USED';
 end if;
 select * into s from public.subscriptions where tenant_id=p_tenant for update;
 if not found then raise exception 'SUBSCRIPTION_NOT_FOUND'; end if;
 if p_purpose='upgrade' then
  if s.status<>'active' or s.plan_id<>'starter_v1' or now()<s.period_start or now()>=s.period_end then raise exception 'UPGRADE_NOT_AVAILABLE'; end if;
  select pro.price_halalas-starter.price_halalas into expected from public.subscription_plans pro cross join public.subscription_plans starter where pro.id='pro_growth_v1' and starter.id=s.plan_id;
 else
  if s.status='active' and now()>=s.period_start and now()<s.period_end then raise exception 'CYCLE_STILL_ACTIVE'; end if;
  select price_halalas into expected from public.subscription_plans where id=s.plan_id;
 end if;
 if p_amount is null or p_amount<>expected then raise exception 'AMOUNT_MISMATCH'; end if;
 insert into soulvd_private.bank_transfers(reference,tenant_id,actor_id,purpose,amount_halalas) values(p_reference,p_tenant,p_actor,p_purpose,p_amount);
 if p_purpose='upgrade' then
  perform public.soulvd_apply_paid_upgrade(p_tenant,'bank:'||p_reference);
 else
  update public.subscriptions set status='active',period_start=now(),period_end=now()+interval '1 month' where tenant_id=p_tenant;
 end if;
 return true;
end $$;
revoke all on function public.soulvd_confirm_bank_transfer(uuid,uuid,text,integer,text) from public,anon,authenticated;
grant execute on function public.soulvd_confirm_bank_transfer(uuid,uuid,text,integer,text) to service_role;
commit;
