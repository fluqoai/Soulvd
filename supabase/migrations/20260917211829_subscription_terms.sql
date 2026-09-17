begin;

-- Preserve existing paid/test contracts. New contracts are 3, 6 or 12 months.
alter table public.subscriptions add column billing_months smallint not null default 1 check(billing_months in (1,3,6,12));
alter table public.subscriptions add column term_price_halalas integer;
update public.subscriptions s set term_price_halalas=p.price_halalas from public.subscription_plans p where p.id=s.plan_id;
alter table public.subscriptions alter column term_price_halalas set not null;
alter table public.subscriptions add constraint subscription_positive_price check(term_price_halalas>0);

create function public.soulvd_term_price(p_plan text,p_months integer) returns integer
language plpgsql stable security invoker set search_path='' as $$
declare monthly integer;
begin
 if p_months is null or p_months not in (1,3,6,12) then raise exception 'INVALID_TERM'; end if;
 select price_halalas into monthly from public.subscription_plans where id=p_plan;
 if monthly is null then raise exception 'INVALID_PLAN'; end if;
 return monthly*case when p_months=12 then 10 else p_months end;
end $$;
revoke all on function public.soulvd_term_price(text,integer) from public,anon,authenticated;
grant execute on function public.soulvd_term_price(text,integer) to service_role;

create function soulvd_private.subscription_default_term_price() returns trigger
language plpgsql security invoker set search_path='' as $$ begin
 if new.term_price_halalas is null then new.term_price_halalas:=public.soulvd_term_price(new.plan_id,new.billing_months); end if;
 return new;
end $$;
revoke all on function soulvd_private.subscription_default_term_price() from public,anon,authenticated;
grant execute on function soulvd_private.subscription_default_term_price() to service_role;
create trigger subscription_default_term_price before insert on public.subscriptions for each row execute function soulvd_private.subscription_default_term_price();

create function public.soulvd_usage_month(p_start timestamptz,p_end timestamptz,p_now timestamptz default now()) returns timestamptz
language plpgsql immutable security invoker set search_path='' set timezone='UTC' as $$
declare months integer; at_time timestamptz;
begin
 if p_start is null or p_end<=p_start then return null; end if;
 at_time:=greatest(p_start,least(p_now,p_end-interval '1 microsecond'));
 months:=(extract(year from at_time)::integer-extract(year from p_start)::integer)*12+extract(month from at_time)::integer-extract(month from p_start)::integer;
 if p_start+make_interval(months=>months)>at_time then months:=months-1; end if;
 return p_start+make_interval(months=>greatest(0,months));
end $$;
revoke all on function public.soulvd_usage_month(timestamptz,timestamptz,timestamptz) from public,anon;
grant execute on function public.soulvd_usage_month(timestamptz,timestamptz,timestamptz) to authenticated,service_role;
create view public.subscription_usage_periods with(security_invoker=true) as
 select tenant_id,public.soulvd_usage_month(period_start,period_end,now()) as usage_period_start from public.subscriptions;
revoke all on public.subscription_usage_periods from public,anon;
grant select on public.subscription_usage_periods to authenticated,service_role;

create or replace function public.soulvd_consume_conversation(p_tenant uuid,p_customer_key text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare s public.subscriptions; lim integer; used integer; monthly_start timestamptz;
begin
 if p_customer_key is null or length(trim(p_customer_key)) not between 1 and 200 then raise exception 'INVALID_CUSTOMER'; end if;
 select * into s from public.subscriptions where tenant_id=p_tenant for update;
 if not found or s.status<>'active' or now()<s.period_start or now()>=s.period_end then return jsonb_build_object('allowed',false,'code','SUBSCRIPTION_INACTIVE'); end if;
 monthly_start:=public.soulvd_usage_month(s.period_start,s.period_end,now());
 select conversations_limit into lim from public.subscription_plans where id=s.plan_id;
 insert into public.usage_counters(tenant_id,period_start) values(p_tenant,monthly_start) on conflict do nothing;
 select conversations_used into used from public.usage_counters where tenant_id=p_tenant and period_start=monthly_start;
 if exists(select 1 from soulvd_private.conversation_usage where tenant_id=p_tenant and period_start=monthly_start and customer_key=p_customer_key) then
  return jsonb_build_object('allowed',true,'newConversation',false,'used',used,'limit',lim);
 end if;
 if used>=lim then return jsonb_build_object('allowed',false,'code','LIMIT_EXCEEDED','resource','conversations','used',used,'limit',lim); end if;
 insert into soulvd_private.conversation_usage(tenant_id,period_start,customer_key) values(p_tenant,monthly_start,p_customer_key);
 update public.usage_counters set conversations_used=conversations_used+1 where tenant_id=p_tenant and period_start=monthly_start returning conversations_used into used;
 return jsonb_build_object('allowed',true,'newConversation',true,'used',used,'limit',lim);
end $$;

create function public.soulvd_create_contract(p_actor uuid,p_name text,p_plan text,p_months integer) returns uuid
language plpgsql security invoker set search_path='' as $$
declare tenant uuid; price integer;
begin
 if p_months is null or p_months not in (3,6,12) then raise exception 'INVALID_TERM'; end if;
 if not exists(select 1 from public.users where id=p_actor and role='merchant') then raise exception 'FORBIDDEN'; end if;
 perform 1 from public.users where id=p_actor for update;
 select tenant_id into tenant from public.tenant_members where user_id=p_actor order by tenant_id limit 1;
 if found then return tenant; end if;
 price:=public.soulvd_term_price(p_plan,p_months);
 insert into public.tenants(name) values(trim(p_name)) returning id into tenant;
 insert into public.tenant_members values(tenant,p_actor,'owner');
 insert into public.subscriptions(tenant_id,plan_id,period_start,period_end,billing_months,term_price_halalas)
 values(tenant,p_plan,now(),now()+make_interval(months=>p_months),p_months,price);
 return tenant;
end $$;
create or replace function public.soulvd_create_tenant(p_actor uuid,p_name text,p_plan text) returns uuid
language sql security invoker set search_path='' as $$ select public.soulvd_create_contract(p_actor,p_name,p_plan,3); $$;

create function public.soulvd_select_contract(p_actor uuid,p_tenant uuid,p_plan text,p_months integer) returns void
language plpgsql security invoker set search_path='' as $$
declare s public.subscriptions;
begin
 if p_months is null or p_months not in(3,6,12) then raise exception 'INVALID_TERM'; end if;
 if not exists(select 1 from public.tenant_members where tenant_id=p_tenant and user_id=p_actor and role='owner') then raise exception 'FORBIDDEN'; end if;
 select * into s from public.subscriptions where tenant_id=p_tenant for update;
 if not found or (s.status='active' and now()<s.period_end) then raise exception 'CYCLE_STILL_ACTIVE'; end if;
 update public.subscriptions set plan_id=p_plan,billing_months=p_months,term_price_halalas=public.soulvd_term_price(p_plan,p_months),status='pending' where tenant_id=p_tenant;
end $$;

-- The quote is fixed until the end of the UTC day, avoiding sub-second price
-- changes between displaying an upgrade and confirming its bank transfer.
create function public.soulvd_upgrade_price(p_tenant uuid) returns integer
language plpgsql stable security invoker set search_path='' set timezone='UTC' as $$
declare s public.subscriptions; difference integer; remaining numeric; total numeric;
begin
 select * into s from public.subscriptions where tenant_id=p_tenant;
 if not found or s.status<>'active' or s.plan_id<>'starter_v1' or now()<s.period_start or now()>=s.period_end then return null; end if;
 difference:=public.soulvd_term_price('pro_growth_v1',s.billing_months)-public.soulvd_term_price('starter_v1',s.billing_months);
 total:=extract(epoch from s.period_end-s.period_start);
 remaining:=least(total,extract(epoch from s.period_end-greatest(s.period_start,date_trunc('day',now()))));
 return greatest(1,ceil(difference*remaining/total)::integer);
end $$;

create or replace function public.soulvd_confirm_bank_transfer(p_actor uuid,p_tenant uuid,p_reference text,p_amount integer,p_purpose text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare s public.subscriptions; previous soulvd_private.bank_transfers; expected integer;
begin
 if not exists(select 1 from public.users where id=p_actor and role='owner') then raise exception 'FORBIDDEN'; end if;
 if exists(select 1 from public.tenants where id=p_tenant and is_test) then raise exception 'TEST_WORKSPACE'; end if;
 if p_reference is null or p_reference<>trim(p_reference) or length(p_reference) not between 3 and 120 or p_purpose is null or p_purpose not in('subscription','upgrade') then raise exception 'INVALID_TRANSFER'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_reference,0));
 select * into previous from soulvd_private.bank_transfers where reference=p_reference;
 if found then
  if previous.tenant_id=p_tenant and previous.amount_halalas=p_amount and previous.purpose=p_purpose then return true; end if;
  raise exception 'REFERENCE_ALREADY_USED';
 end if;
 select * into s from public.subscriptions where tenant_id=p_tenant for update;
 if not found then raise exception 'SUBSCRIPTION_NOT_FOUND'; end if;
 if p_purpose='upgrade' then
  expected:=public.soulvd_upgrade_price(p_tenant);
  if expected is null then raise exception 'UPGRADE_NOT_AVAILABLE'; end if;
 else
  if s.status='active' and now()>=s.period_start and now()<s.period_end then raise exception 'CYCLE_STILL_ACTIVE'; end if;
  expected:=s.term_price_halalas;
 end if;
 if p_amount is null or p_amount<>expected then raise exception 'AMOUNT_MISMATCH'; end if;
 insert into soulvd_private.bank_transfers(reference,tenant_id,actor_id,purpose,amount_halalas) values(p_reference,p_tenant,p_actor,p_purpose,p_amount);
 if p_purpose='upgrade' then
  perform public.soulvd_apply_paid_upgrade(p_tenant,'bank:'||p_reference);
  update public.subscriptions set term_price_halalas=public.soulvd_term_price('pro_growth_v1',billing_months) where tenant_id=p_tenant;
 else
  update public.subscriptions set status='active',period_start=now(),period_end=now()+make_interval(months=>billing_months) where tenant_id=p_tenant;
 end if;
 return true;
end $$;

do $$ declare f record; begin
 for f in select oid::regprocedure as signature from pg_proc where pronamespace='public'::regnamespace and proname in('soulvd_create_contract','soulvd_select_contract','soulvd_upgrade_price') loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;
commit;
