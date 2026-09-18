import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Live PostgreSQL acceptance check. Every fixture and state change rolls back;
// uncommitted jobs cannot be seen or dispatched by production workers.
const token = process.env.SUPABASE_ACCESS_TOKEN;
assert.ok(token, 'SUPABASE_ACCESS_TOKEN required');
const fixture = randomUUID();
const providerFixture = '999' + Date.now().toString();
const query = `begin;
set local statement_timeout='20s';
set local lock_timeout='3s';
do $$ declare
 t uuid := '${fixture}'; actor uuid; staff uuid; p uuid; r uuid; n uuid;
 result jsonb; first_send jsonb; receipt jsonb; ref text := 'launch-${providerFixture}';
begin
 select id into actor from public.users where email='khayratum+launchtest@gmail.com' and role='merchant';
 select id into staff from public.users where role='owner' limit 1;
 if actor is null or staff is null then raise exception 'ACTORS_MISSING'; end if;
 insert into public.tenants(id,name,is_test) values(t,'ROLLBACK launch verification',false);
 insert into public.tenant_members(tenant_id,user_id,role) values(t,actor,'owner');
 insert into public.subscriptions(tenant_id,plan_id,status,period_start,period_end,billing_months)
 values(t,'starter_v1','pending',now(),now()+interval '3 months',3);
 update public.platform_launch_settings set payments_ready=true,onboarding_ready=true where id;
 p:=public.soulvd_request_payment(actor,t,'subscription',null);
 if (select amount_halalas from public.payment_requests where id=p)<>89700 then raise exception 'PRICE'; end if;
 perform public.soulvd_submit_payment(actor,t,p,ref);
 begin
   perform public.soulvd_confirm_payment(actor,p,ref,89700);
   raise exception 'MERCHANT_CONFIRMED_PAYMENT';
 exception when others then if sqlerrm<>'FORBIDDEN' then raise; end if; end;
 begin
   perform public.soulvd_confirm_payment(staff,p,ref,29900);
   raise exception 'WRONG_AMOUNT_ACCEPTED';
 exception when others then if sqlerrm<>'AMOUNT_OR_REFERENCE_MISMATCH' then raise; end if; end;
 perform public.soulvd_confirm_payment(staff,p,ref,89700);
 perform public.soulvd_confirm_payment(staff,p,ref,89700);
 if (select status from public.subscriptions where tenant_id=t)<>'active' then raise exception 'NOT_ACTIVE'; end if;
 result:=public.soulvd_consume_conversation(t,'audit-customer');
 if not (result->>'newConversation')::boolean then raise exception 'COUNTER_NEW'; end if;
 result:=public.soulvd_consume_conversation(t,'audit-customer');
 if (result->>'newConversation')::boolean or (result->>'used')::int<>1 then raise exception 'COUNTER_DUPLICATE'; end if;
 update public.usage_counters set conversations_used=2000 where tenant_id=t;
 result:=public.soulvd_consume_conversation(t,'audit-over-limit');
 if result->>'code'<>'LIMIT_EXCEEDED' then raise exception 'QUOTA_NOT_BLOCKED'; end if;
 result:=public.soulvd_consume_conversation(t,'audit-customer');
 if not (result->>'allowed')::boolean then raise exception 'EXISTING_CUSTOMER_BLOCKED'; end if;
 update public.usage_counters set conversations_used=1 where tenant_id=t;
 p:=public.soulvd_request_payment(actor,t,'wallet',10000);
 perform public.soulvd_submit_payment(actor,t,p,ref||'-wallet');
 perform public.soulvd_confirm_payment(staff,p,ref||'-wallet',10000);
 perform public.soulvd_confirm_payment(staff,p,ref||'-wallet',10000);
 if (select balance_micro from public.messaging_wallets where tenant_id=t)<>100000000 then raise exception 'TOPUP_DUPLICATE'; end if;
 r:=public.soulvd_onboarding_request(actor,t,'+966500000000');
 perform public.soulvd_onboarding_link(staff,r,'https://www.ycloud.com/onboard/rollback-fixture');
 perform public.soulvd_onboarding_ready(actor,t,r);
 n:=public.soulvd_onboarding_bind(staff,r,'{"id":"${providerFixture}","wabaId":"${providerFixture}","phoneNumber":"+966500000000","status":"CONNECTED","isOnBizApp":true}'::jsonb);
 insert into public.whatsapp_contacts(tenant_id,wa_id,last_inbound_at) values(t,'966500000001',now());
 first_send:=public.soulvd_enqueue_message(t,actor,gen_random_uuid(),'message','966500000001','ROLLBACK ONLY',null,false,'[]'::jsonb);
 if not (first_send->>'allowed')::boolean then raise exception 'ENQUEUE_BLOCKED'; end if;
 if (select held_micro from public.messaging_wallets where tenant_id=t)<>257888 then raise exception 'HOLD'; end if;
 perform public.soulvd_meta_claim((first_send->>'id')::uuid);
 receipt:=jsonb_build_object('id',ref,'wabaId','${providerFixture}','from','+966500000000','to','+966500000001','externalId',first_send->>'id','status','delivered','totalPrice',0.05,'currency','USD');
 perform public.soulvd_settle_message(receipt);
 perform public.soulvd_settle_message(receipt);
 if (select balance_micro from public.messaging_wallets where tenant_id=t)<>99784375 then raise exception 'SETTLEMENT_15_PERCENT'; end if;
 if (select held_micro from public.messaging_wallets where tenant_id=t)<>0 then raise exception 'HOLD_NOT_RELEASED'; end if;
 if (select count(*) from public.wallet_ledger where tenant_id=t and kind='message')<>1 then raise exception 'DUPLICATE_CHARGE'; end if;
 update public.messaging_wallets set balance_micro=0 where tenant_id=t;
 begin
   perform public.soulvd_enqueue_message(t,actor,gen_random_uuid(),'message','966500000001','ROLLBACK ONLY',null,false,'[]'::jsonb);
   raise exception 'EMPTY_WALLET_ALLOWED';
 exception when others then if sqlerrm<>'WALLET_INSUFFICIENT' then raise; end if; end;
end $$;
rollback;
select not exists(select 1 from public.tenants where id='${fixture}') as rolled_back;`;
const response = await fetch('https://api.supabase.com/v1/projects/lyvoiipsmcbffvpkrxhy/database/query', {
  method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query }), signal: AbortSignal.timeout(30_000),
});
const result = await response.json();
if (!response.ok) throw new Error(JSON.stringify(result));
assert.equal(result[0]?.rolled_back, true);
console.log('PASS: live PostgreSQL payment amount/authorization/replay, activation, distinct-customer quota, wallet topup/replay, simulated provider binding, reservation, 15% settlement/replay and insufficient balance. All changes rolled back. No real provider sends or bank transfers.');
