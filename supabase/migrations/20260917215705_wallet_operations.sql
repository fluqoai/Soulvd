begin;
alter table public.wallet_ledger drop constraint wallet_ledger_kind_check;
alter table public.wallet_ledger add constraint wallet_ledger_kind_check check(kind in('topup','message','test_credit'));
create function public.soulvd_test_wallet_credit(p_actor uuid,p_tenant uuid,p_request uuid,p_amount integer) returns void
language plpgsql security invoker set search_path='' as $$
declare total bigint;
begin
 if not exists(select 1 from public.users where id=p_actor and role='owner') or not exists(select 1 from public.tenants where id=p_tenant and is_test) then raise exception 'TEST_STAFF_ONLY'; end if;
 if p_request is null or p_amount is null or p_amount not between 1 and 500 then raise exception 'INVALID_AMOUNT'; end if;
 perform pg_advisory_xact_lock(hashtextextended('test-credit:'||p_request::text,0));
 if exists(select 1 from public.wallet_ledger where reference='test:'||p_request) then
  if exists(select 1 from public.wallet_ledger where reference='test:'||p_request and tenant_id=p_tenant and amount_micro=p_amount::bigint*10000) then return; end if;
  raise exception 'REFERENCE_ALREADY_USED';
 end if;
 insert into public.messaging_wallets(tenant_id) values(p_tenant) on conflict do nothing;
 perform 1 from public.messaging_wallets where tenant_id=p_tenant for update;
 select coalesce(sum(amount_micro),0) into total from public.wallet_ledger where tenant_id=p_tenant and kind='test_credit';
 if total+p_amount::bigint*10000>5000000 then raise exception 'TEST_BUDGET_LIMIT'; end if;
 insert into public.wallet_ledger(tenant_id,amount_micro,kind,reference) values(p_tenant,p_amount::bigint*10000,'test_credit','test:'||p_request);
 update public.messaging_wallets set balance_micro=balance_micro+p_amount::bigint*10000 where tenant_id=p_tenant;
end $$;
create function public.soulvd_wallet_audit(p_actor uuid) returns jsonb
language plpgsql stable security invoker set search_path='' as $$ begin
 if not exists(select 1 from public.users where id=p_actor and role='owner') then raise exception 'FORBIDDEN'; end if;
 return jsonb_build_object(
 'wallets',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from(select w.*,t.name,t.is_test from public.messaging_wallets w join public.tenants t on t.id=w.tenant_id order by w.balance_micro-w.held_micro limit 100)x),
 'holds',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from(select h.job_id,h.tenant_id,t.name,h.held_micro,h.created_at,h.error_code,h.state,h.provider_id,h.attempts from soulvd_private.message_holds h join public.tenants t on t.id=h.tenant_id where h.state='held' or h.error_code is not null order by h.created_at limit 100)x),
 'rates',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from soulvd_private.messaging_rate_limits r),
 'test_spaces',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from(select id,name from public.tenants where is_test)t)
 );
end $$;
create function public.soulvd_wallet_retry(p_actor uuid,p_job uuid) returns void
language plpgsql security invoker set search_path='' as $$ begin
 if not exists(select 1 from public.users where id=p_actor and role='owner') then raise exception 'FORBIDDEN'; end if;
 update soulvd_private.message_holds set check_after=now(),attempts=0 where job_id=p_job and state='held' and provider_id is not null;
 if not found then raise exception 'PROVIDER_ID_REQUIRED'; end if;
end $$;
revoke all on function public.soulvd_test_wallet_credit(uuid,uuid,uuid,integer),public.soulvd_wallet_audit(uuid),public.soulvd_wallet_retry(uuid,uuid) from public,anon,authenticated;
grant execute on function public.soulvd_test_wallet_credit(uuid,uuid,uuid,integer),public.soulvd_wallet_audit(uuid),public.soulvd_wallet_retry(uuid,uuid) to service_role;

-- Keep the existing Vault-backed scheduler and add due wallet reconciliation.
-- References resolve when invoked, so local PGlite tests need no network/Vault.
create or replace function soulvd_private.studio_worker_tick() returns bigint
language plpgsql security invoker set search_path='' as $$
declare token text; request_id bigint; begin
 if not exists(select 1 from public.automation_runs where state in('queued','processing'))
 and not exists(select 1 from public.crm_deliveries where (status='queued' and next_attempt_at<=now()) or status='processing')
 and not exists(select 1 from soulvd_private.meta_jobs where status in('queued','processing'))
 and not exists(select 1 from soulvd_private.message_holds where state='held' and provider_id is not null and check_after<=now() and attempts<100) then return null; end if;
 select decrypted_secret into token from vault.decrypted_secrets where name='soulvd_worker_secret';
 if token is null then raise exception 'WORKER_SECRET_NOT_CONFIGURED'; end if;
 select net.http_post(url:='https://www.soulvd.sa/api/meta/whatsapp/worker',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||token),body:='{}'::jsonb,timeout_milliseconds:=60000) into request_id;
 return request_id;
end $$;
revoke all on function soulvd_private.studio_worker_tick() from public,anon,authenticated;
commit;
