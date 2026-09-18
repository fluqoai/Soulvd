begin;
alter table public.bot_settings drop constraint bot_settings_daily_limit_check;
alter table public.bot_settings add constraint bot_settings_daily_limit_check check(daily_limit between 1 and 1000);
-- Reply credits are separate from money in the WhatsApp wallet. No free-signup grants.
create table soulvd_private.ai_credits (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants,
 source text not null unique, kind text not null check(kind in('trial','monthly','topup')),
 starts_at timestamptz not null, expires_at timestamptz not null,
 quantity integer not null check(quantity>0), used integer not null default 0 check(used>=0 and used<=quantity),
 check(expires_at>starts_at)
);
create index ai_credits_available on soulvd_private.ai_credits(tenant_id,expires_at);
create table soulvd_private.ai_budget (
 id boolean primary key default true check(id), total_micro bigint not null default 0,
 total_limit_micro bigint not null default 20000000, daily_limit_micro bigint not null default 2000000
);
insert into soulvd_private.ai_budget(id) values(true);
create table soulvd_private.ai_spend_days(day date primary key, spent_micro bigint not null default 0);
create table soulvd_private.ai_reservations (
 run_id uuid primary key references public.automation_runs, tenant_id uuid not null references public.tenants,
 credit_id uuid not null references soulvd_private.ai_credits, day date not null,
 state text not null default 'held' check(state in('held','charged','released')),
 cost_micro bigint not null default 20000, created_at timestamptz not null default now()
);
do $$ declare t text; begin
 foreach t in array array['ai_credits','ai_budget','ai_spend_days','ai_reservations'] loop
  execute format('alter table soulvd_private.%I enable row level security',t);
  execute format('revoke all on soulvd_private.%I from public,anon,authenticated',t);
  execute format('grant select,insert,update on soulvd_private.%I to service_role',t);
 end loop;
end $$;

create function soulvd_private.ai_sync(p_tenant uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare s public.subscriptions; anchor timestamptz; ending timestamptz; first_paid timestamptz; stale record;
begin
 select * into s from public.subscriptions where tenant_id=p_tenant for update;
 for stale in select r.run_id,a.state from soulvd_private.ai_reservations r join public.automation_runs a on a.id=r.run_id
  where r.tenant_id=p_tenant and r.state='held' and r.created_at<now()-interval '5 minutes' loop
  perform public.soulvd_ai_finalize(stale.run_id,stale.state in('draft','sent'),null);
 end loop;
 if s.tenant_id is null or s.status<>'active' or now()<s.period_start or now()>=s.period_end
  or exists(select 1 from public.tenants where id=p_tenant and is_test) then return; end if;
 -- A manually active subscription is not proof of payment for AI.
 select min(confirmed_at) into first_paid from public.payment_requests where tenant_id=p_tenant and purpose='subscription' and status='confirmed';
 if first_paid is null then return; end if;
 if s.plan_id='starter_v1' then
  insert into soulvd_private.ai_credits(tenant_id,source,kind,starts_at,expires_at,quantity)
   values(p_tenant,'trial:'||p_tenant,'trial',first_paid,first_paid+interval '12 months',100) on conflict(source) do nothing;
 elsif s.plan_id='pro_growth_v1' then
  -- Anchor each month to the original contract date (including January 31).
  select max(s.period_start+make_interval(months=>n)) into anchor from generate_series(0,11) n
   where s.period_start+make_interval(months=>n)<=now();
  select least(s.period_end,min(s.period_start+make_interval(months=>n))) into ending from generate_series(1,12) n
   where s.period_start+make_interval(months=>n)>now();
  insert into soulvd_private.ai_credits(tenant_id,source,kind,starts_at,expires_at,quantity)
   values(p_tenant,'monthly:'||p_tenant||':'||extract(epoch from anchor)::text,'monthly',anchor,ending,1000) on conflict(source) do nothing;
 end if;
end $$;

create or replace function public.soulvd_ai_reserve(p_tenant uuid,p_run uuid) returns boolean
language plpgsql security invoker set search_path='' as $$
declare credit uuid; lim integer; d date:=(now() at time zone 'Asia/Riyadh')::date;
begin
 perform soulvd_private.ai_sync(p_tenant);
 if not exists(select 1 from public.subscriptions where tenant_id=p_tenant and status='active' and now()>=period_start and now()<period_end) then return false; end if;
 select daily_limit into lim from public.bot_settings where tenant_id=p_tenant and enabled for update;
 if not found then return false; end if;
 perform 1 from public.automation_runs where id=p_run and tenant_id=p_tenant and state='processing' and ai_reserved_at is null for update;
 if not found or exists(select 1 from soulvd_private.ai_reservations where run_id=p_run) then return false; end if;
 select id into credit from soulvd_private.ai_credits where tenant_id=p_tenant and starts_at<=now() and expires_at>now() and used<quantity order by expires_at,id limit 1 for update;
 if not found then return false; end if;
 insert into public.ai_daily_usage(tenant_id,day,requests) values(p_tenant,d,0) on conflict do nothing;
 if exists(select 1 from public.ai_daily_usage where tenant_id=p_tenant and day=d and requests>=lim) then return false; end if;
 perform 1 from soulvd_private.ai_budget where id for update;
 insert into soulvd_private.ai_spend_days(day) values(d) on conflict do nothing;
 if exists(select 1 from soulvd_private.ai_budget b cross join soulvd_private.ai_spend_days x where b.id and x.day=d
  and (b.total_micro+20000>b.total_limit_micro or x.spent_micro+20000>b.daily_limit_micro)) then return false; end if;
 update soulvd_private.ai_budget set total_micro=total_micro+20000 where id;
 update soulvd_private.ai_spend_days set spent_micro=spent_micro+20000 where day=d;
 update soulvd_private.ai_credits set used=used+1 where id=credit;
 update public.ai_daily_usage set requests=requests+1 where tenant_id=p_tenant and day=d;
 insert into soulvd_private.ai_reservations(run_id,tenant_id,credit_id,day) values(p_run,p_tenant,credit,d);
 update public.automation_runs set ai_reserved_at=now() where id=p_run;
 return true;
end $$;

create function public.soulvd_ai_finalize(p_run uuid,p_charge boolean,p_cost_micro bigint default null) returns void
language plpgsql security invoker set search_path='' as $$
declare r soulvd_private.ai_reservations; t uuid; cost bigint;
begin
 select tenant_id into t from soulvd_private.ai_reservations where run_id=p_run;
 if t is null then return; end if;
 perform 1 from public.subscriptions where tenant_id=t for update;
 select * into r from soulvd_private.ai_reservations where run_id=p_run for update;
 if r.state<>'held' then return; end if;
 if not p_charge then
  update soulvd_private.ai_credits set used=used-1 where id=r.credit_id;
  update public.ai_daily_usage set requests=greatest(0,requests-1) where tenant_id=t and day=r.day;
 end if;
 -- Unknown provider outcomes retain the conservative cost hold, but never a customer's reply credit.
 cost:=case when p_cost_micro is null then r.cost_micro else greatest(0,p_cost_micro) end;
 update soulvd_private.ai_budget set total_micro=greatest(0,total_micro+cost-r.cost_micro) where id;
 update soulvd_private.ai_spend_days set spent_micro=greatest(0,spent_micro+cost-r.cost_micro) where day=r.day;
 update soulvd_private.ai_reservations set state=case when p_charge then 'charged' else 'released' end,cost_micro=cost where run_id=p_run;
end $$;

create or replace function public.soulvd_ai_status(p_tenant uuid,p_actor uuid) returns jsonb
language plpgsql volatile security invoker set search_path='' as $$
declare remaining integer; total integer; included integer; extra integer; expiry timestamptz; daily integer; lim integer; buckets jsonb;
begin
 if not exists(select 1 from public.tenant_members where tenant_id=p_tenant and user_id=p_actor and role in('owner','admin')) then raise exception 'FORBIDDEN'; end if;
 perform soulvd_private.ai_sync(p_tenant);
 select coalesce(sum(quantity-used),0),coalesce(sum(quantity),0),coalesce(sum(quantity-used) filter(where kind<>'topup'),0),coalesce(sum(quantity-used) filter(where kind='topup'),0),min(expires_at) filter(where used<quantity),
  coalesce(jsonb_agg(jsonb_build_object('kind',kind,'quantity',quantity,'remaining',quantity-used,'expiresAt',expires_at) order by expires_at),'[]')
  into remaining,total,included,extra,expiry,buckets from soulvd_private.ai_credits where tenant_id=p_tenant and starts_at<=now() and expires_at>now();
 select daily_limit into lim from public.bot_settings where tenant_id=p_tenant;
 select requests into daily from public.ai_daily_usage where tenant_id=p_tenant and day=(now() at time zone 'Asia/Riyadh')::date;
 return jsonb_build_object('enabled',remaining>0 and exists(select 1 from public.subscriptions where tenant_id=p_tenant and status='active' and now()>=period_start and now()<period_end),
  'remaining',remaining,'total',total,'included',included,'extra',extra,'buckets',buckets,
  'dailyRemaining',greatest(0,coalesce(lim,20)-coalesce(daily,0)),'expiresAt',expiry);
end $$;

alter table public.payment_requests drop constraint payment_requests_purpose_check;
alter table public.payment_requests add constraint payment_requests_purpose_check check(purpose in('subscription','upgrade','wallet','ai'));
alter table public.payment_requests add column ai_reply_count integer not null default 0,
 add constraint ai_payment_pack check((purpose='ai' and ((amount_halalas=2900 and ai_reply_count=1000) or (amount_halalas=9900 and ai_reply_count=5000))) or (purpose<>'ai' and ai_reply_count=0));
alter table soulvd_private.bank_transfers drop constraint bank_transfers_purpose_check;
alter table soulvd_private.bank_transfers add constraint bank_transfers_purpose_check check(purpose in('subscription','upgrade','integration','wallet','ai'));

alter function public.soulvd_request_payment(uuid,uuid,text,integer) rename to soulvd_request_payment_before_ai;
create function public.soulvd_request_payment(p_actor uuid,p_tenant uuid,p_purpose text,p_amount integer default null) returns uuid
language plpgsql security invoker set search_path='' as $$
declare s public.subscriptions; r public.payment_requests; result uuid;
begin
 if p_purpose is distinct from 'ai' then return public.soulvd_request_payment_before_ai(p_actor,p_tenant,p_purpose,p_amount); end if;
 if not exists(select 1 from public.tenant_members where tenant_id=p_tenant and user_id=p_actor and role='owner') then raise exception 'FORBIDDEN'; end if;
 if exists(select 1 from public.tenants where id=p_tenant and is_test) then raise exception 'TEST_WORKSPACE'; end if;
 if p_amount is null or p_amount not in(2900,9900) then raise exception 'INVALID_AMOUNT'; end if;
 select * into s from public.subscriptions where tenant_id=p_tenant for update;
 if not found or s.status<>'active' or now()<s.period_start or now()>=s.period_end then raise exception 'ACTIVE_SUBSCRIPTION_REQUIRED'; end if;
 if not exists(select 1 from public.payment_requests where tenant_id=p_tenant and purpose='subscription' and status='confirmed') then raise exception 'PAID_SUBSCRIPTION_REQUIRED'; end if;
 select * into r from public.payment_requests where tenant_id=p_tenant and purpose='ai' and status in('pending','submitted') for update;
 if found then
  if r.status='submitted' or (r.expires_at>now() and r.amount_halalas=p_amount) then return r.id; end if;
  update public.payment_requests set status='cancelled' where id=r.id;
 end if;
 insert into public.payment_requests(tenant_id,purpose,amount_halalas,ai_reply_count,plan_id,billing_months,contract_start,contract_end)
 values(p_tenant,'ai',p_amount,case when p_amount=2900 then 1000 else 5000 end,s.plan_id,s.billing_months,s.period_start,s.period_end) returning id into result;
 return result;
end $$;

alter function public.soulvd_confirm_payment(uuid,uuid,text,integer) rename to soulvd_confirm_payment_before_ai;
create function public.soulvd_confirm_payment(p_actor uuid,p_id uuid,p_reference text,p_amount integer) returns void
language plpgsql security invoker set search_path='' as $$
declare r public.payment_requests;
begin
 if not exists(select 1 from public.users where id=p_actor and role='owner') then raise exception 'FORBIDDEN'; end if;
 select * into r from public.payment_requests where id=p_id;
 if not found then raise exception 'NOT_FOUND'; end if;
 if r.purpose<>'ai' then
  perform public.soulvd_confirm_payment_before_ai(p_actor,p_id,p_reference,p_amount);
  perform soulvd_private.ai_sync(r.tenant_id); return;
 end if;
 if p_reference is null or p_reference<>trim(p_reference) or length(p_reference) not between 3 and 120 then raise exception 'INVALID_REFERENCE'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_reference,0));
 perform 1 from public.subscriptions where tenant_id=r.tenant_id for update;
 select * into r from public.payment_requests where id=p_id for update;
 if r.status='confirmed' and r.bank_reference=p_reference and r.amount_halalas=p_amount then return; end if;
 if r.status<>'submitted' or r.amount_halalas is distinct from p_amount or r.bank_reference is distinct from p_reference then raise exception 'AMOUNT_OR_REFERENCE_MISMATCH'; end if;
 if exists(select 1 from public.tenants where id=r.tenant_id and is_test) then raise exception 'TEST_WORKSPACE'; end if;
 if exists(select 1 from soulvd_private.bank_transfers where reference=p_reference) then raise exception 'REFERENCE_ALREADY_USED'; end if;
 insert into soulvd_private.bank_transfers(reference,tenant_id,actor_id,purpose,amount_halalas) values(p_reference,r.tenant_id,p_actor,'ai',p_amount);
 insert into soulvd_private.ai_credits(tenant_id,source,kind,starts_at,expires_at,quantity)
  values(r.tenant_id,'payment:'||r.id,'topup',now(),now()+interval '12 months',r.ai_reply_count);
 update public.payment_requests set status='confirmed',confirmed_at=now(),confirmed_by=p_actor where id=r.id;
end $$;
create function public.soulvd_ai_budget_status(p_actor uuid) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.users where id=p_actor and role='owner') then raise exception 'FORBIDDEN'; end if;
 return (select jsonb_build_object('spentUsd',total_micro::numeric/1000000,'limitUsd',total_limit_micro::numeric/1000000,
 'dailyLimitUsd',daily_limit_micro::numeric/1000000,'dailySpentUsd',coalesce((select spent_micro from soulvd_private.ai_spend_days where day=(now() at time zone 'Asia/Riyadh')::date),0)::numeric/1000000) from soulvd_private.ai_budget where id);
end $$;
revoke all on function public.soulvd_ai_budget_status(uuid) from public,anon,authenticated;
grant execute on function public.soulvd_ai_budget_status(uuid) to service_role;
revoke all on function soulvd_private.ai_sync(uuid),public.soulvd_ai_finalize(uuid,boolean,bigint),public.soulvd_request_payment(uuid,uuid,text,integer),public.soulvd_confirm_payment(uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function soulvd_private.ai_sync(uuid),public.soulvd_ai_finalize(uuid,boolean,bigint),public.soulvd_request_payment(uuid,uuid,text,integer),public.soulvd_confirm_payment(uuid,uuid,text,integer) to service_role;
commit;
