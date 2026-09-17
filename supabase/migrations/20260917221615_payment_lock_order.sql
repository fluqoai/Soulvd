begin;
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
  update public.subscriptions set status='active',period_start=now(),period_end=now()+make_interval(months=>billing_months) where tenant_id=r.tenant_id;
 end if;
 update public.payment_requests set status='confirmed',confirmed_at=now(),confirmed_by=p_actor where id=r.id;
end $$;
commit;
