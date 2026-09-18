begin;
alter table public.payment_requests drop constraint payment_wallet_breakdown;
alter table public.payment_requests add constraint payment_wallet_breakdown check(wallet_amount_halalas=0 or (purpose='subscription' and wallet_amount_halalas between 1 and 1000000 and wallet_amount_halalas<amount_halalas));
create or replace function public.soulvd_request_payment_before_ai(p_actor uuid,p_tenant uuid,p_purpose text,p_amount integer default null) returns uuid
language plpgsql security invoker set search_path='' as $$
declare s public.subscriptions; r public.payment_requests; amount integer; result uuid; wallet_amount integer:=0; welcome integer:=0;
begin
 if not exists(select 1 from public.tenant_members where tenant_id=p_tenant and user_id=p_actor and role='owner') then raise exception 'FORBIDDEN'; end if;
 if exists(select 1 from public.tenants where id=p_tenant and is_test) then raise exception 'TEST_WORKSPACE'; end if;
 if p_purpose='subscription' then
  wallet_amount:=coalesce(p_amount,0);
  if wallet_amount<>0 and wallet_amount not between 1 and 1000000 then raise exception 'INVALID_AMOUNT'; end if;
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
  if p_amount is null or p_amount<1 or p_amount>1000000 then raise exception 'INVALID_AMOUNT'; end if;
  amount:=p_amount;
 else raise exception 'INVALID_PURPOSE'; end if;
 insert into public.payment_requests(tenant_id,purpose,amount_halalas,plan_id,billing_months,contract_start,contract_end,expires_at,wallet_amount_halalas,welcome_amount_halalas)
 values(p_tenant,p_purpose,amount,s.plan_id,s.billing_months,s.period_start,s.period_end,case when p_purpose='upgrade' then least(now()+interval '7 days',s.period_end) else now()+interval '7 days' end,wallet_amount,welcome) returning id into result;
 return result;
end $$;
create function public.soulvd_provider_funding_summary(p_actor uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare paid bigint; gifts bigint;
begin
 if not exists(select 1 from public.users where id=p_actor and role='owner') then raise exception 'FORBIDDEN'; end if;
 select coalesce(sum(case when purpose='wallet' then amount_halalas else wallet_amount_halalas end),0),coalesce(sum(welcome_amount_halalas),0)
 into paid,gifts from public.payment_requests where status='confirmed' and purpose in('subscription','wallet');
 return jsonb_build_object('collected_halalas',paid,'provider_halalas',round(paid::numeric*100/115),'platform_halalas',paid-round(paid::numeric*100/115),'gift_halalas',gifts);
end $$;
revoke all on function public.soulvd_provider_funding_summary(uuid) from public,anon,authenticated;
grant execute on function public.soulvd_provider_funding_summary(uuid) to service_role;
commit;
