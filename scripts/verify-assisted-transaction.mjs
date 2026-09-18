import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {query} from './_supabase-access.mjs';

// Fixtures never commit. No provider calls, bank transfers or visible worker jobs.
const tenant = randomUUID();
const providerId = '999' + Date.now();
const result = await query(`begin;
set local statement_timeout='20s'; set local lock_timeout='3s';
do $$ declare actor uuid; staff uuid; r uuid; n uuid; t uuid := '${tenant}'; begin
 select id into actor from public.users where email='khayratum+launchtest@gmail.com' and role='merchant';
 select id into staff from public.users where role='owner' limit 1;
 if actor is null or staff is null then raise exception 'ACTORS_MISSING'; end if;
 insert into public.tenants(id,name,is_test) values(t,'ROLLBACK assisted onboarding',false);
 insert into public.tenant_members(tenant_id,user_id,role) values(t,actor,'owner');
 insert into public.subscriptions(tenant_id,plan_id,status,period_start,period_end,billing_months)
 values(t,'starter_v1','pending',now(),now()+interval '3 months',3);
 update public.platform_launch_settings set onboarding_ready=true where id;
 r:=public.soulvd_prepare_connection(actor,t,'+966500000000','business_app');
 begin
  perform public.soulvd_onboarding_assisted(staff,r);
  raise exception 'UNPAID_SESSION_ACCEPTED';
 exception when others then if sqlerrm<>'SUBSCRIPTION_INACTIVE' then raise; end if; end;
 update public.subscriptions set status='active' where tenant_id=t;
 perform public.soulvd_onboarding_assisted(staff,r);
 begin
  perform public.soulvd_onboarding_ready(staff,t,r);
  raise exception 'STAFF_CONFIRMED_AS_CUSTOMER';
 exception when others then if sqlerrm<>'FORBIDDEN' then raise; end if; end;
 begin
  perform public.soulvd_onboarding_bind(staff,r,'{}'::jsonb);
  raise exception 'BOUND_BEFORE_CUSTOMER_CONFIRMATION';
 exception when others then if sqlerrm<>'CUSTOMER_CONFIRMATION_REQUIRED' then raise; end if; end;
 perform public.soulvd_onboarding_ready(actor,t,r);
 n:=public.soulvd_onboarding_bind(staff,r,'{"id":"${providerId}","wabaId":"${providerId}","phoneNumber":"+966500000000","status":"CONNECTED","isOnBizApp":true}'::jsonb);
 if n is null then raise exception 'BIND_FAILED'; end if;
 if (select customer_confirmed_at is null from public.whatsapp_onboarding_requests where id=r) then raise exception 'NO_CUSTOMER_ACK'; end if;
 if (select count(*) from public.tenant_members where tenant_id=t)<>1 then raise exception 'STAFF_ADDED'; end if;
 if has_function_privilege('authenticated','public.soulvd_onboarding_assisted(uuid,uuid)','execute') then raise exception 'PUBLIC_SESSION_ACCESS'; end if;
end $$;
rollback;
select not exists(select 1 from public.tenants where id='${tenant}') as rolled_back;`);
assert.equal(result[0].rolled_back, true);
console.log('PASS: live PostgreSQL assisted paid-term gate, customer acknowledgement, simulated provider binding, no staff membership and service-only access. All fixtures rolled back; no actual onboarding.');
