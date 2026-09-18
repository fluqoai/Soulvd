begin;
-- Existing requests keep their original totals and do not acquire a retrospective gift.
alter table public.payment_requests add column wallet_amount_halalas integer not null default 0,
 add column welcome_amount_halalas integer not null default 0,
 add constraint payment_wallet_breakdown check(wallet_amount_halalas=0 or (purpose='subscription' and wallet_amount_halalas between 5000 and 1000000 and wallet_amount_halalas<amount_halalas)),
 add constraint payment_welcome_amount check(welcome_amount_halalas=0 or (purpose='subscription' and welcome_amount_halalas=500));
alter table public.wallet_ledger drop constraint wallet_ledger_kind_check;
alter table public.wallet_ledger add constraint wallet_ledger_kind_check check(kind in('topup','message','test_credit','welcome_credit'));
create or replace function public.soulvd_request_payment(p_actor uuid,p_tenant uuid,p_purpose text,p_amount integer default null) returns uuid
language plpgsql security invoker set search_path='' as $$
declare s public.subscriptions; r public.payment_requests; amount integer; result uuid; wallet_amount integer:=0; welcome integer:=0;
begin
 if not exists(select 1 from public.tenant_members where tenant_id=p_tenant and user_id=p_actor and role='owner') then raise exception 'FORBIDDEN'; end if;
 if exists(select 1 from public.tenants where id=p_tenant and is_test) then raise exception 'TEST_WORKSPACE'; end if;
 if p_purpose='subscription' then
  wallet_amount:=coalesce(p_amount,0);
  if wallet_amount<>0 and wallet_amount not between 5000 and 1000000 then raise exception 'INVALID_AMOUNT'; end if;
 end if;
 select * into s from public.subscriptions where tenant_id=p_tenant for update;
 if not found then raise exception 'SUBSCRIPTION_NOT_FOUND'; end if;
 select * into r from public.payment_requests where tenant_id=p_tenant and purpose=p_purpose and status in('pending','submitted') for update;
 if found then
  if r.status='submitted' then return r.id; end if;
  if r.expires_at>now() and r.plan_id=s.plan_id and r.billing_months=s.billing_months and r.contract_start=s.period_start and r.contract_end=s.period_end and (p_purpose<>'wallet' or r.amount_halalas=p_amount) and (p_purpose<>'subscription' or r.wallet_amount_halalas=wallet_amount) then return r.id; end if;
  update public.payment_requests set status='cancelled' where id=r.id;
 end if;
 if p_purpose='subscription' then
  if s.status='active' and now()<s.period_end then raise exception 'CYCLE_STILL_ACTIVE'; end if;
  if s.billing_months=1 then raise exception 'SELECT_NEW_TERM'; end if;
  amount:=s.term_price_halalas+wallet_amount;
  if not exists(select 1 from soulvd_private.bank_transfers where tenant_id=p_tenant and purpose='subscription')
   and not exists(select 1 from public.wallet_ledger where reference='welcome:'||p_tenant) then welcome:=500; end if;
 elsif p_purpose='upgrade' then
  amount:=public.soulvd_upgrade_price(p_tenant);
  if amount is null then raise exception 'UPGRADE_NOT_AVAILABLE'; end if;
 elsif p_purpose='wallet' then
  if p_amount is null or p_amount<5000 or p_amount>1000000 then raise exception 'INVALID_AMOUNT'; end if;
  amount:=p_amount;
 else raise exception 'INVALID_PURPOSE'; end if;
 insert into public.payment_requests(tenant_id,purpose,amount_halalas,plan_id,billing_months,contract_start,contract_end,expires_at,wallet_amount_halalas,welcome_amount_halalas)
 values(p_tenant,p_purpose,amount,s.plan_id,s.billing_months,s.period_start,s.period_end,case when p_purpose='upgrade' then least(now()+interval '7 days',s.period_end) else now()+interval '7 days' end,wallet_amount,welcome) returning id into result;
 return result;
end $$;
create or replace function public.soulvd_confirm_payment(p_actor uuid,p_id uuid,p_reference text,p_amount integer) returns void
language plpgsql security invoker set search_path='' as $$
declare r public.payment_requests; s public.subscriptions; prior soulvd_private.bank_transfers;
begin
 if not exists(select 1 from public.users where id=p_actor and role='owner') then raise exception 'FORBIDDEN'; end if;
 -- Same bank reference lock used by subscription, wallet and CRM confirmations.
 if p_reference is null or length(trim(p_reference)) not between 3 and 120 or p_reference<>trim(p_reference) then raise exception 'INVALID_REFERENCE'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_reference,0));
 -- Match request creation's subscription -> request order. Keep the global
 -- bank-reference lock first, as in subscription/CRM transfer confirmation.
 select * into r from public.payment_requests where id=p_id;
 if not found then raise exception 'NOT_FOUND'; end if;
 perform 1 from public.subscriptions where tenant_id=r.tenant_id for update;
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
  if r.wallet_amount_halalas>0 then
   insert into public.messaging_wallets(tenant_id,balance_micro) values(r.tenant_id,r.wallet_amount_halalas::bigint*10000)
    on conflict(tenant_id) do update set balance_micro=public.messaging_wallets.balance_micro+excluded.balance_micro;
   insert into public.wallet_ledger(tenant_id,amount_micro,kind,reference)
    values(r.tenant_id,r.wallet_amount_halalas::bigint*10000,'topup','bank:'||p_reference||':wallet');
  end if;
  -- The bank transfer inserted above is the first actual paid subscription.
  -- Subscription row lock serializes confirmations, and ledger reference is unique.
  if r.welcome_amount_halalas>0 and not exists(select 1 from soulvd_private.bank_transfers where tenant_id=r.tenant_id and purpose='subscription' and reference<>p_reference)
   and not exists(select 1 from public.wallet_ledger where reference='welcome:'||r.tenant_id) then
   insert into public.wallet_ledger(tenant_id,amount_micro,kind,reference)
    values(r.tenant_id,r.welcome_amount_halalas::bigint*10000,'welcome_credit','welcome:'||r.tenant_id);
   insert into public.messaging_wallets(tenant_id,balance_micro) values(r.tenant_id,r.welcome_amount_halalas::bigint*10000)
    on conflict(tenant_id) do update set balance_micro=public.messaging_wallets.balance_micro+excluded.balance_micro;
  end if;
  update public.subscriptions set status='active',period_start=now(),period_end=now()+make_interval(months=>billing_months) where tenant_id=r.tenant_id;
 end if;
 update public.payment_requests set status='confirmed',confirmed_at=now(),confirmed_by=p_actor where id=r.id;
end $$;


-- Fail closed when published pricing changes. Stop exemptions before October 1
-- reaches any WABA timezone (UTC+14), rather than guessing each WABA timezone.
-- https://docs.ycloud.com/reference/whatsapp-message-pricing-integration-guide
create table soulvd_private.free_reply_policy (
 id boolean primary key default true check(id), valid_from timestamptz not null,
 valid_until timestamptz not null, check(valid_until>valid_from)
);
insert into soulvd_private.free_reply_policy values(true,'2026-09-18Z','2026-09-30 10:00:00Z');
alter table soulvd_private.free_reply_policy enable row level security;
revoke all on soulvd_private.free_reply_policy from public,anon,authenticated;
grant all on soulvd_private.free_reply_policy to service_role;
create index whatsapp_messages_inbound_window on public.whatsapp_messages(tenant_id,number_id,contact_id,created_at desc) where direction='inbound';
create function soulvd_private.is_free_service_reply(p_job uuid) returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(
  select 1 from soulvd_private.meta_jobs j
  join soulvd_private.meta_connections cn on cn.number_id=j.number_id and cn.provider='ycloud'
  join public.whatsapp_contacts c on c.tenant_id=j.tenant_id and c.wa_id=j.payload->>'to'
  where j.id=p_job and j.kind='message' and j.payload->>'type' in('text','image','audio','video','document')
   and exists(select 1 from soulvd_private.free_reply_policy where now()>=valid_from and now()+interval '5 minutes'<valid_until)
   and c.last_inbound_at>now()-interval '23 hours 55 minutes' and c.last_inbound_at<=now()
   and exists(select 1 from public.whatsapp_messages m where m.tenant_id=j.tenant_id and m.number_id=j.number_id
    and m.contact_id=c.id and m.direction='inbound' and m.meta_message_id is not null
    and m.created_at>now()-interval '23 hours 55 minutes' and m.created_at<=now())
 );
$$;
revoke all on function soulvd_private.is_free_service_reply(uuid) from public,anon,authenticated;
grant execute on function soulvd_private.is_free_service_reply(uuid) to service_role;
create or replace function soulvd_private.reserve_message(p_job uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare j soulvd_private.meta_jobs; rate numeric; amount bigint; w public.messaging_wallets;
begin
 select * into j from soulvd_private.meta_jobs where id=p_job;
 if j.kind<>'message' or not exists(select 1 from soulvd_private.meta_connections where number_id=j.number_id and provider='ycloud') then return; end if;
 if exists(select 1 from soulvd_private.message_holds where job_id=p_job) then return; end if;
 select reserve_usd into rate from soulvd_private.messaging_rate_limits where (j.payload->>'to')~destination_pattern and now()>=valid_from and now()<valid_until order by valid_from desc limit 1;
 if rate is null then raise exception 'WALLET_RATE_UNAVAILABLE'; end if;
 amount:=case when soulvd_private.is_free_service_reply(j.id) then 0 else ceil(rate*3.75*1.15*1000000)::bigint end;
 insert into public.messaging_wallets(tenant_id) values(j.tenant_id) on conflict do nothing;
 select * into w from public.messaging_wallets where tenant_id=j.tenant_id for update;
 if w.balance_micro-w.held_micro<amount then raise exception 'WALLET_INSUFFICIENT'; end if;
 insert into soulvd_private.message_holds(job_id,tenant_id,held_micro) values(j.id,j.tenant_id,amount);
 update public.messaging_wallets set held_micro=held_micro+amount where tenant_id=j.tenant_id;
end $$;
create or replace function public.soulvd_meta_claim_before_media(p_id uuid default null) returns jsonb
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
   needed:=case when soulvd_private.is_free_service_reply(job) then 0 else ceil(rate*h.fx*(1+h.markup_bps::numeric/10000)*1000000)::bigint end;
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

commit;
