// All fixture payments and grants are inside ROLLBACK. No external messages/calls.
import {readFile} from 'node:fs/promises';
const token=process.env.SUPABASE_ACCESS_TOKEN;
if(!token)throw new Error('SUPABASE_ACCESS_TOKEN_REQUIRED');
const ref='lyvoiipsmcbffvpkrxhy';
async function query(query){
 const r=await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({query})});
 const body=await r.json();if(!r.ok)throw new Error(JSON.stringify(body));return body;
}
const migration=await readFile('supabase/migrations/20260918185529_ai_commercial_credits.sql','utf8');
const applied=await query("select to_regclass('soulvd_private.ai_credits') is not null as applied");
const sql=`begin;
${applied[0].applied?'':migration.replace(/^begin;\s*/,'').replace(/commit;\s*$/,'')}
do $$ declare t uuid; actor uuid; owner_id uuid; pay uuid; pack uuid; result jsonb; begin
 select tm.tenant_id,u.id into strict t,actor from public.tenant_members tm join public.users u on u.id=tm.user_id
  where lower(u.email)='khayratum+launchtest@gmail.com' and tm.role='owner';
 select id into owner_id from public.users where role='owner' order by id limit 1;
 if owner_id is null then raise exception 'NO_PLATFORM_OWNER'; end if;
 if exists(select 1 from public.payment_requests where tenant_id=t and status='confirmed') then raise exception 'FIXTURE_ALREADY_PAID'; end if;
 update public.subscriptions set plan_id='starter_v1',status='pending',billing_months=3,term_price_halalas=89700 where tenant_id=t;
 update public.payment_requests set status='cancelled' where tenant_id=t and status in('pending','submitted');
 update public.platform_launch_settings set payments_ready=true where id;
 result:=public.soulvd_ai_status(t,actor);
 if (result->>'remaining')::integer<>0 then raise exception 'UNPAID_AI_CREDIT'; end if;
 pay:=public.soulvd_request_payment(actor,t,'subscription',0);
 perform public.soulvd_submit_payment(actor,t,pay,'ROLLBACK-AI-SUB-'||pay);
 perform public.soulvd_confirm_payment(owner_id,pay,'ROLLBACK-AI-SUB-'||pay,89700);
 perform public.soulvd_confirm_payment(owner_id,pay,'ROLLBACK-AI-SUB-'||pay,89700);
 result:=public.soulvd_ai_status(t,actor);
 if (result->>'remaining')::integer<>100 then raise exception 'TRIAL_FAILED'; end if;
 pack:=public.soulvd_request_payment(actor,t,'ai',2900);
 perform public.soulvd_submit_payment(actor,t,pack,'ROLLBACK-AI-PACK-'||pack);
 if (public.soulvd_ai_status(t,actor)->>'remaining')::integer<>100 then raise exception 'UNVERIFIED_TOPUP'; end if;
 perform public.soulvd_confirm_payment(owner_id,pack,'ROLLBACK-AI-PACK-'||pack,2900);
 perform public.soulvd_confirm_payment(owner_id,pack,'ROLLBACK-AI-PACK-'||pack,2900);
 result:=public.soulvd_ai_status(t,actor);
 if (result->>'remaining')::integer<>1100 then raise exception 'TOPUP_REPLAY_FAILED'; end if;
 if exists(select 1 from public.wallet_ledger where tenant_id=t and reference='bank:ROLLBACK-AI-PACK-'||pack) then raise exception 'WALLET_MIXUP'; end if;
 if has_function_privilege('authenticated','public.soulvd_ai_finalize(uuid,boolean,bigint)','execute') then raise exception 'PUBLIC_FINALIZE'; end if;
 if has_table_privilege('authenticated','soulvd_private.ai_credits','insert') then raise exception 'PUBLIC_GRANTS'; end if;
end $$;
rollback;`;
await query(sql);
console.log('PASS: real PostgreSQL paid-only trial, verified AI topup, replay safety, wallet separation and permission checks; all fixture changes rolled back.');
