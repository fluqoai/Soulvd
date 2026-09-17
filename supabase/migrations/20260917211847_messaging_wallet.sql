begin;
-- Monetary precision: one SAR = 1,000,000 micros. Round only the final message
-- charge upwards to a micro, never round every message to a halala.
create table public.messaging_wallets (
 tenant_id uuid primary key references public.tenants on delete cascade,
 balance_micro bigint not null default 0,
 held_micro bigint not null default 0 check(held_micro>=0)
);
create table public.wallet_ledger (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants,
 amount_micro bigint not null, kind text not null check(kind in('topup','message')),
 reference text not null unique, created_at timestamptz not null default now()
);
create index wallet_ledger_tenant_date on public.wallet_ledger(tenant_id,created_at desc);
create table public.payment_requests (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants,
 purpose text not null check(purpose in('subscription','upgrade','wallet')),
 amount_halalas integer not null check(amount_halalas>0),
 plan_id text not null, billing_months integer not null, contract_start timestamptz not null, contract_end timestamptz not null,
 status text not null default 'pending' check(status in('pending','submitted','confirmed','cancelled')),
 bank_reference text check(length(bank_reference) between 3 and 120),
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '7 days',
 confirmed_at timestamptz, confirmed_by uuid references public.users
);
create index payment_requests_tenant_date on public.payment_requests(tenant_id,created_at desc);
create unique index payment_request_open on public.payment_requests(tenant_id,purpose) where status in('pending','submitted');
alter table soulvd_private.bank_transfers drop constraint bank_transfers_purpose_check;
alter table soulvd_private.bank_transfers add constraint bank_transfers_purpose_check check(purpose in('subscription','upgrade','integration','wallet'));

do $$ declare t text; begin
 foreach t in array array['messaging_wallets','wallet_ledger','payment_requests'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('grant all on public.%I to service_role',t);
  execute format('create policy tenant_read on public.%I for select to authenticated using(soulvd_private.is_member(tenant_id))',t);
 end loop;
end $$;

create function public.soulvd_request_payment(p_actor uuid,p_tenant uuid,p_purpose text,p_amount integer default null) returns uuid
language plpgsql security invoker set search_path='' as $$
declare s public.subscriptions; r public.payment_requests; amount integer; result uuid;
begin
 if not exists(select 1 from public.tenant_members where tenant_id=p_tenant and user_id=p_actor and role='owner') then raise exception 'FORBIDDEN'; end if;
 if exists(select 1 from public.tenants where id=p_tenant and is_test) then raise exception 'TEST_WORKSPACE'; end if;
 select * into s from public.subscriptions where tenant_id=p_tenant for update;
 if not found then raise exception 'SUBSCRIPTION_NOT_FOUND'; end if;
 select * into r from public.payment_requests where tenant_id=p_tenant and purpose=p_purpose and status in('pending','submitted') for update;
 if found then
  if r.status='submitted' then return r.id; end if;
  if r.expires_at>now() and r.plan_id=s.plan_id and r.billing_months=s.billing_months and r.contract_start=s.period_start and r.contract_end=s.period_end and (p_purpose<>'wallet' or r.amount_halalas=p_amount) then return r.id; end if;
  update public.payment_requests set status='cancelled' where id=r.id;
 end if;
 if p_purpose='subscription' then
  if s.status='active' and now()<s.period_end then raise exception 'CYCLE_STILL_ACTIVE'; end if;
  if s.billing_months=1 then raise exception 'SELECT_NEW_TERM'; end if;
  amount:=s.term_price_halalas;
 elsif p_purpose='upgrade' then
  amount:=public.soulvd_upgrade_price(p_tenant);
  if amount is null then raise exception 'UPGRADE_NOT_AVAILABLE'; end if;
 elsif p_purpose='wallet' then
  if p_amount is null or p_amount<5000 or p_amount>1000000 then raise exception 'INVALID_AMOUNT'; end if;
  amount:=p_amount;
 else raise exception 'INVALID_PURPOSE'; end if;
 insert into public.payment_requests(tenant_id,purpose,amount_halalas,plan_id,billing_months,contract_start,contract_end,expires_at)
 values(p_tenant,p_purpose,amount,s.plan_id,s.billing_months,s.period_start,s.period_end,case when p_purpose='upgrade' then least(now()+interval '7 days',s.period_end) else now()+interval '7 days' end) returning id into result;
 return result;
end $$;
create function public.soulvd_select_unpaid_contract(p_actor uuid,p_tenant uuid,p_plan text,p_months integer) returns void
language plpgsql security invoker set search_path='' as $$ begin
 perform 1 from public.subscriptions where tenant_id=p_tenant for update;
 if exists(select 1 from public.payment_requests where tenant_id=p_tenant and purpose in('subscription','upgrade') and status in('pending','submitted')) then raise exception 'OPEN_PAYMENT_REQUEST'; end if;
 perform public.soulvd_select_contract(p_actor,p_tenant,p_plan,p_months);
end $$;
create function public.soulvd_submit_payment(p_actor uuid,p_tenant uuid,p_id uuid,p_reference text) returns void
language plpgsql security invoker set search_path='' as $$
declare r public.payment_requests;
begin
 if not exists(select 1 from public.tenant_members where tenant_id=p_tenant and user_id=p_actor and role='owner') then raise exception 'FORBIDDEN'; end if;
 select * into r from public.payment_requests where id=p_id and tenant_id=p_tenant for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if r.status='submitted' and r.bank_reference=p_reference then return; end if;
 if r.status<>'pending' or r.expires_at<=now() then raise exception 'QUOTE_EXPIRED'; end if;
 if p_reference is null or p_reference<>trim(p_reference) or length(p_reference) not between 3 and 120 then raise exception 'INVALID_REFERENCE'; end if;
 update public.payment_requests set status='submitted',bank_reference=p_reference where id=r.id;
end $$;
create function public.soulvd_cancel_payment(p_actor uuid,p_tenant uuid,p_id uuid) returns void
language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.tenant_members where tenant_id=p_tenant and user_id=p_actor and role='owner') then raise exception 'FORBIDDEN'; end if;
 update public.payment_requests set status='cancelled' where id=p_id and tenant_id=p_tenant and status='pending';
 if not found then raise exception 'CANNOT_CANCEL_SUBMITTED_PAYMENT'; end if;
end $$;
create function public.soulvd_confirm_payment(p_actor uuid,p_id uuid,p_reference text,p_amount integer) returns void
language plpgsql security invoker set search_path='' as $$
declare r public.payment_requests; s public.subscriptions; prior soulvd_private.bank_transfers;
begin
 if not exists(select 1 from public.users where id=p_actor and role='owner') then raise exception 'FORBIDDEN'; end if;
 -- Same bank reference lock used by subscription, wallet and CRM confirmations.
 if p_reference is null or length(trim(p_reference)) not between 3 and 120 or p_reference<>trim(p_reference) then raise exception 'INVALID_REFERENCE'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_reference,0));
 select * into r from public.payment_requests where id=p_id for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if r.status='confirmed' and r.bank_reference=p_reference and r.amount_halalas=p_amount then return; end if;
 if r.status<>'submitted' or p_amount is distinct from r.amount_halalas or p_reference is distinct from r.bank_reference then raise exception 'AMOUNT_OR_REFERENCE_MISMATCH'; end if;
 if exists(select 1 from public.tenants where id=r.tenant_id and is_test) then raise exception 'TEST_WORKSPACE'; end if;
 if exists(select 1 from soulvd_private.bank_transfers where reference=p_reference) then raise exception 'REFERENCE_ALREADY_USED'; end if;
 select * into s from public.subscriptions where tenant_id=r.tenant_id for update;
 if r.purpose<>'wallet' and (s.plan_id<>r.plan_id or s.billing_months<>r.billing_months or s.period_start<>r.contract_start or s.period_end<>r.contract_end) then raise exception 'CONTRACT_CHANGED'; end if;
 insert into soulvd_private.bank_transfers(reference,tenant_id,actor_id,purpose,amount_halalas) values(p_reference,r.tenant_id,p_actor,r.purpose,p_amount);
 if r.purpose='wallet' then
  insert into public.messaging_wallets(tenant_id,balance_micro) values(r.tenant_id,p_amount::bigint*10000)
   on conflict(tenant_id) do update set balance_micro=public.messaging_wallets.balance_micro+excluded.balance_micro;
  insert into public.wallet_ledger(tenant_id,amount_micro,kind,reference) values(r.tenant_id,p_amount::bigint*10000,'topup','bank:'||p_reference);
 elsif r.purpose='upgrade' then
  if s.status<>'active' or s.plan_id<>'starter_v1' or now()>=s.period_end then raise exception 'UPGRADE_NOT_AVAILABLE'; end if;
  perform public.soulvd_apply_paid_upgrade(r.tenant_id,'bank:'||p_reference);
  update public.subscriptions set term_price_halalas=public.soulvd_term_price('pro_growth_v1',billing_months) where tenant_id=r.tenant_id;
 else
  if s.status='active' and now()<s.period_end then raise exception 'CYCLE_STILL_ACTIVE'; end if;
  update public.subscriptions set status='active',period_start=now(),period_end=now()+make_interval(months=>billing_months) where tenant_id=r.tenant_id;
 end if;
 update public.payment_requests set status='confirmed',confirmed_at=now(),confirmed_by=p_actor where id=r.id;
end $$;

-- A conservative authorization ceiling, NOT the billable message price. Saudi
-- ceiling covers authentication-international (0.0598 USD), marketing and service.
-- Exact charges always come from the signed provider receipt. New destinations
-- require an operator-reviewed rate card; never guess a free or default rate.
create table soulvd_private.messaging_rate_limits (
 destination_pattern text not null, valid_from timestamptz not null, valid_until timestamptz not null,
 reserve_usd numeric(12,6) not null check(reserve_usd>0), source_url text not null,
 primary key(destination_pattern,valid_from), check(valid_until>valid_from)
);
insert into soulvd_private.messaging_rate_limits values('^9665[0-9]{8}$','2026-09-17Z','2026-10-01Z',0.0598,'https://www.ycloud.com/pricing');
-- YCloud's published October 1 rate card, Saudi row: authentication-international
-- .0598 remains above marketing .0576 and service/utility/authentication .0107.
-- Quarterly review is intentional; an expired ceiling blocks dispatch safely.
insert into soulvd_private.messaging_rate_limits values('^9665[0-9]{8}$','2026-10-01Z','2027-01-01Z',0.0598,'https://docs.google.com/spreadsheets/d/1MULHp9AApGmRmCP6bHHKKoNOkPsY8WPWLrwh6Fs-BkA/edit?gid=1287089303');
create table soulvd_private.message_holds (
 job_id uuid primary key references soulvd_private.meta_jobs, tenant_id uuid not null references public.tenants,
 held_micro bigint not null check(held_micro>=0), state text not null default 'held' check(state in('held','released','settled')),
 fx numeric not null default 3.75, markup_bps integer not null default 1500,
 provider_id text, charged_micro bigint, error_code text, created_at timestamptz not null default now(),
 check_after timestamptz not null default now()+interval '5 minutes', attempts integer not null default 0
);
create index message_holds_due on soulvd_private.message_holds(check_after) where state='held';
create table soulvd_private.message_cost_receipts (
 number_id uuid not null, provider_id text not null, payload jsonb not null,
 primary key(number_id,provider_id)
);
grant all on soulvd_private.messaging_rate_limits,soulvd_private.message_holds,soulvd_private.message_cost_receipts to service_role;
revoke all on soulvd_private.messaging_rate_limits,soulvd_private.message_holds,soulvd_private.message_cost_receipts from public,anon,authenticated;
alter table soulvd_private.messaging_rate_limits enable row level security;
alter table soulvd_private.message_holds enable row level security;
alter table soulvd_private.message_cost_receipts enable row level security;

create function soulvd_private.reserve_message(p_job uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare j soulvd_private.meta_jobs; rate numeric; amount bigint; w public.messaging_wallets;
begin
 select * into j from soulvd_private.meta_jobs where id=p_job;
 if j.kind<>'message' or not exists(select 1 from soulvd_private.meta_connections where number_id=j.number_id and provider='ycloud') then return; end if;
 if exists(select 1 from soulvd_private.message_holds where job_id=p_job) then return; end if;
 select reserve_usd into rate from soulvd_private.messaging_rate_limits where (j.payload->>'to')~destination_pattern and now()>=valid_from and now()<valid_until order by valid_from desc limit 1;
 if rate is null then raise exception 'WALLET_RATE_UNAVAILABLE'; end if;
 amount:=ceil(rate*3.75*1.15*1000000)::bigint;
 insert into public.messaging_wallets(tenant_id) values(j.tenant_id) on conflict do nothing;
 select * into w from public.messaging_wallets where tenant_id=j.tenant_id for update;
 if w.balance_micro-w.held_micro<amount then raise exception 'WALLET_INSUFFICIENT'; end if;
 insert into soulvd_private.message_holds(job_id,tenant_id,held_micro) values(j.id,j.tenant_id,amount);
 update public.messaging_wallets set held_micro=held_micro+amount where tenant_id=j.tenant_id;
end $$;
create function soulvd_private.wallet_job_insert() returns trigger
language plpgsql security invoker set search_path='' as $$ begin perform soulvd_private.reserve_message(new.id); return new; end $$;
create trigger wallet_job_insert after insert on soulvd_private.meta_jobs for each row execute function soulvd_private.wallet_job_insert();
create function soulvd_private.release_message(p_job uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare h soulvd_private.message_holds;
begin
 select * into h from soulvd_private.message_holds where job_id=p_job for update;
 if not found or h.state<>'held' then return; end if;
 update public.messaging_wallets set held_micro=held_micro-h.held_micro where tenant_id=h.tenant_id;
 update soulvd_private.message_holds set state='released' where job_id=p_job;
end $$;
create function soulvd_private.wallet_job_failed() returns trigger
language plpgsql security invoker set search_path='' as $$ begin if new.status='failed' then perform soulvd_private.release_message(new.id); end if; return new; end $$;
create trigger wallet_job_failed after update of status on soulvd_private.meta_jobs for each row execute function soulvd_private.wallet_job_failed();

-- Only the verified webhook handler and server reconciliation worker call this.
create function public.soulvd_settle_message(p_message jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare j soulvd_private.meta_jobs; h soulvd_private.message_holds; n uuid; cost numeric; charge bigint; status text;
begin
 if p_message->>'id' is null or length(p_message->>'id')>256 then return; end if;
 select c.number_id into n from soulvd_private.meta_connections c join public.whatsapp_numbers w on w.id=c.number_id
  where c.provider='ycloud' and c.waba_id=p_message->>'wabaId' and w.phone=p_message->>'from';
 if n is null then return; end if;
 status:=p_message->>'status';
 if status not in('delivered','read','failed') or status is null then return; end if;
 insert into soulvd_private.message_cost_receipts values(n,p_message->>'id',p_message)
 on conflict(number_id,provider_id) do update set payload=excluded.payload
 where soulvd_private.message_cost_receipts.payload->>'status'='failed'
    or (excluded.payload->>'status' in('delivered','read') and soulvd_private.message_cost_receipts.payload->>'totalPrice' is null);
 select job.* into j from soulvd_private.meta_jobs job join public.whatsapp_messages m on m.id=job.resource_id
 where job.number_id=n and job.kind='message' and job.status in('processing','accepted','unknown','failed')
 and job.payload->>'to'=regexp_replace(p_message->>'to','^[+]','')
 and (m.meta_message_id='ycloud:'||(p_message->>'id') or job.id::text=p_message->>'externalId') for update of job;
 if not found then return; end if;
 select * into h from soulvd_private.message_holds where job_id=j.id for update;
 if not found then return; end if;
 if h.provider_id is not null and h.provider_id<>p_message->>'id' then
  update soulvd_private.message_holds set error_code='PROVIDER_ID_CONFLICT' where job_id=j.id; return;
 end if;
 update soulvd_private.message_holds set provider_id=p_message->>'id' where job_id=j.id;
 if status='failed' then
  if exists(select 1 from soulvd_private.message_cost_receipts where number_id=n and provider_id=p_message->>'id' and payload->>'status' in('delivered','read')) then return; end if;
  perform soulvd_private.release_message(j.id); return;
 end if;
 if p_message->>'currency' is distinct from 'USD' or jsonb_typeof(p_message->'totalPrice') is distinct from 'number' then
  update soulvd_private.message_holds set error_code='FINAL_PRICE_MISSING' where job_id=j.id; return;
 end if;
 cost:=(p_message->>'totalPrice')::numeric;
 if cost<0 or cost>100 then update soulvd_private.message_holds set error_code='PRICE_REVIEW_REQUIRED' where job_id=j.id; return; end if;
 charge:=ceil(cost*h.fx*(1+h.markup_bps::numeric/10000)*1000000)::bigint;
 if h.state='settled' then
  if h.charged_micro<>charge then update soulvd_private.message_holds set error_code='FINAL_PRICE_CHANGED' where job_id=j.id; end if;
  return;
 end if;
 update public.messaging_wallets set balance_micro=balance_micro-charge,held_micro=held_micro-case when h.state='held' then h.held_micro else 0 end where tenant_id=h.tenant_id;
 insert into public.wallet_ledger(tenant_id,amount_micro,kind,reference) values(h.tenant_id,-charge,'message','message:'||j.id);
 update soulvd_private.message_holds set state='settled',charged_micro=charge,error_code=case when charge>h.held_micro then 'RESERVE_EXCEEDED' else null end where job_id=j.id;
end $$;

alter function public.soulvd_meta_claim(uuid) rename to soulvd_meta_claim_before_wallet;
create function public.soulvd_meta_claim(p_id uuid default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb; job uuid; rate numeric; needed bigint; h soulvd_private.message_holds; w public.messaging_wallets;
begin
 result:=public.soulvd_meta_claim_before_wallet(p_id);
 if result is null then return null; end if;
 job:=(result->>'id')::uuid;
 if result->>'provider'='ycloud' and result->>'kind'='message' then
  begin
   perform soulvd_private.reserve_message(job);
   select * into h from soulvd_private.message_holds where job_id=job for update;
   select reserve_usd into rate from soulvd_private.messaging_rate_limits where (result->'payload'->>'to')~destination_pattern and now()>=valid_from and now()<valid_until order by valid_from desc limit 1;
   if rate is null then raise exception 'WALLET_RATE_UNAVAILABLE'; end if;
   needed:=ceil(rate*h.fx*(1+h.markup_bps::numeric/10000)*1000000)::bigint;
   select * into w from public.messaging_wallets where tenant_id=h.tenant_id for update;
   if h.state<>'held' or w.balance_micro-w.held_micro<greatest(0,needed-h.held_micro) then raise exception 'WALLET_INSUFFICIENT'; end if;
   if needed>h.held_micro then
    update public.messaging_wallets set held_micro=held_micro+needed-h.held_micro where tenant_id=h.tenant_id;
    update soulvd_private.message_holds set held_micro=needed where job_id=job;
   end if;
  exception when raise_exception then
   update soulvd_private.meta_jobs set status='failed',error_code=sqlerrm where id=job;
   update public.whatsapp_messages set status='failed' where id=(result->>'resource_id')::uuid;
   return null;
  end;
 end if;
 return result;
end $$;
alter function public.soulvd_meta_finish(uuid,text,text,text) rename to soulvd_meta_finish_before_wallet;
create function public.soulvd_meta_finish(p_id uuid,p_status text,p_meta_id text,p_error text) returns void
language plpgsql security invoker set search_path='' as $$
declare receipt jsonb; n uuid;
begin
 perform public.soulvd_meta_finish_before_wallet(p_id,p_status,p_meta_id,p_error);
 if p_meta_id like 'ycloud:%' then
  update soulvd_private.message_holds set provider_id=substring(p_meta_id from 8) where job_id=p_id and (provider_id is null or provider_id=substring(p_meta_id from 8));
  select number_id into n from soulvd_private.meta_jobs where id=p_id;
  select payload into receipt from soulvd_private.message_cost_receipts where number_id=n and provider_id=substring(p_meta_id from 8);
  if receipt is not null then perform public.soulvd_settle_message(receipt); end if;
 end if;
end $$;
alter function public.soulvd_ycloud_ingest(text,jsonb) rename to soulvd_ycloud_ingest_before_wallet;
create function public.soulvd_ycloud_ingest(p_id text,p_payload jsonb) returns boolean
language plpgsql security invoker set search_path='' as $$ declare result boolean; begin
 result:=public.soulvd_ycloud_ingest_before_wallet(p_id,p_payload);
 if p_payload->>'type'='whatsapp.message.updated' then perform public.soulvd_settle_message(p_payload->'whatsappMessage'); end if;
 return result;
end $$;
create function public.soulvd_wallet_reconcile_claim() returns jsonb
language plpgsql security invoker set search_path='' as $$
declare h soulvd_private.message_holds;
begin
 select * into h from soulvd_private.message_holds where state='held' and provider_id is not null and check_after<=now() and attempts<100 order by check_after for update skip locked limit 1;
 if not found then return null; end if;
 update soulvd_private.message_holds set attempts=attempts+1,check_after=now()+make_interval(secs=>least(3600,60*(h.attempts+1))) where job_id=h.job_id;
 return jsonb_build_object('job_id',h.job_id,'provider_id',h.provider_id);
end $$;

do $$ declare f record; begin
 for f in select oid::regprocedure as signature from pg_proc where
 (pronamespace='soulvd_private'::regnamespace and proname in('reserve_message','wallet_job_insert','release_message','wallet_job_failed')) or
 (pronamespace='public'::regnamespace and proname in('soulvd_select_unpaid_contract','soulvd_request_payment','soulvd_submit_payment','soulvd_cancel_payment','soulvd_confirm_payment','soulvd_settle_message','soulvd_meta_claim','soulvd_meta_finish','soulvd_ycloud_ingest','soulvd_wallet_reconcile_claim','soulvd_meta_claim_before_wallet','soulvd_meta_finish_before_wallet','soulvd_ycloud_ingest_before_wallet')) loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;
commit;
