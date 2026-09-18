import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const token = process.env.SUPABASE_ACCESS_TOKEN;
assert.ok(token, 'SUPABASE_ACCESS_TOKEN required');
const fixture = randomUUID();
// No committed contacts, messages, credentials, entitlements or external calls.
const query = `begin;
set local statement_timeout='20s'; set local lock_timeout='3s';
do $$ declare t uuid:='${fixture}'; actor uuid; outsider uuid; n uuid; c uuid; m uuid; r uuid; newer uuid; integration uuid; ping uuid; result jsonb;
begin
 select id into actor from public.users where email='khayratum+launchtest@gmail.com' and role='merchant';
 select id into outsider from public.users where role='owner' limit 1;
 if actor is null or outsider is null then raise exception 'ACTORS_MISSING'; end if;
 insert into public.tenants(id,name,is_test) values(t,'ROLLBACK studio verification',true);
 insert into public.tenant_members(tenant_id,user_id,role) values(t,actor,'owner');
 insert into public.subscriptions(tenant_id,plan_id,status,period_start,period_end,billing_months)
 values(t,'pro_growth_v1','active',now()-interval '1 day',now()+interval '1 month',3);
 result:=public.soulvd_ai_status(t,actor);
 if (result->>'enabled')::boolean or (result->>'remaining')::int<>0 then raise exception 'UNPAID_AI_AVAILABLE'; end if;
 begin
  perform public.soulvd_ai_status(t,outsider); raise exception 'CROSS_TENANT_AI_STATUS';
 exception when others then if sqlerrm<>'FORBIDDEN' then raise; end if; end;
 insert into public.crm_integrations(tenant_id,name,endpoint_url,status) values(t,'Clinic fixture','https://clinic.example.com/hooks','active') returning id into integration;
 insert into soulvd_private.crm_credentials(integration_id,api_key_hash,signing_secret) values(integration,encode(sha256(t::text::bytea),'hex'),'UNCOMMITTED TEST SECRET');
 ping:=public.soulvd_crm_test(t,actor,integration);
 if public.soulvd_crm_test(t,actor,integration)<>ping then raise exception 'DUPLICATE_TEST_EVENT'; end if;
 if (select payload ? 'message' from public.crm_deliveries where id=ping) then raise exception 'TEST_EVENT_CUSTOMER_DATA'; end if;
 update public.crm_integrations set status='disabled' where id=integration;
 begin
  perform public.soulvd_crm_test(t,actor,integration); raise exception 'DISABLED_TEST_ACCEPTED';
 exception when others then if sqlerrm<>'INTEGRATION_INACTIVE' then raise; end if; end;
 insert into public.whatsapp_numbers(tenant_id,phone,status) values(t,'+966500000008','connected') returning id into n;
 insert into public.whatsapp_contacts(tenant_id,wa_id,last_inbound_at) values(t,'966500000009',now()) returning id into c;
 insert into public.whatsapp_messages(tenant_id,number_id,contact_id,direction,kind,body,status,created_at)
 values(t,n,c,'inbound','text','Request appointment','received',now()-interval '2 minutes') returning id into m;
 insert into public.automation_runs(tenant_id,message_id,state,output) values(t,m,'draft','Old draft') returning id into r;
 insert into public.whatsapp_messages(tenant_id,number_id,contact_id,direction,kind,body,status)
 values(t,n,c,'inbound','text','Cancel request','received') returning id into newer;
 result:=public.soulvd_automation_send(r,actor,'Old appointment confirmation',true);
 if result->>'code'<>'CONVERSATION_CHANGED' then raise exception 'STALE_DRAFT_ACCEPTED'; end if;
 if exists(select 1 from public.whatsapp_messages where tenant_id=t and direction='outbound') then raise exception 'UNEXPECTED_OUTBOUND'; end if;
 if has_function_privilege('authenticated','public.soulvd_crm_test(uuid,uuid,uuid)','execute') or has_function_privilege('anon','public.soulvd_ai_status(uuid,uuid)','execute') then raise exception 'PUBLIC_PRIVILEGE'; end if;
end $$;
rollback;
select not exists(select 1 from public.tenants where id='${fixture}') as rolled_back;`;
const response = await fetch('https://api.supabase.com/v1/projects/lyvoiipsmcbffvpkrxhy/database/query', {
  method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query }), signal: AbortSignal.timeout(30000),
});
const result = await response.json();
if (!response.ok) throw new Error(JSON.stringify(result));
assert.equal(result[0]?.rolled_back, true);
console.log('PASS: live PostgreSQL unpaid AI denial, cross-tenant isolation, deduplicated synthetic integration test, disabled integration denial, stale appointment draft rejection and service-only RPCs. All changes rolled back. No provider, AI or clinic calls.');
