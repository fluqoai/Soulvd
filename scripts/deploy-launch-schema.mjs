// One release only. Existing migrations were applied manually before this release.
// Default is a real PostgreSQL transaction that is rolled back. --apply commits.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const ref='lyvoiipsmcbffvpkrxhy';
const token=process.env.SUPABASE_ACCESS_TOKEN;
if(!token)throw new Error('Set SUPABASE_ACCESS_TOKEN for the authorized Soulvd account.');
const files=['20260917211829_subscription_terms.sql','20260917211847_messaging_wallet.sql','20260917211917_managed_onboarding.sql','20260917215705_wallet_operations.sql','20260917221615_payment_lock_order.sql','20260918005715_inbox_experience.sql','20260918075456_guided_customer_setup.sql','20260918084732_growth_workspace.sql','20260918090804_campaign_fair_scheduling.sql','20260918154723_team_invitation_delivery.sql','20260918155126_inbox_media.sql','20260918181151_unified_checkout_welcome_credit.sql','20260918183220_studio_launch_hardening.sql'];
async function request(path,body){
 const response=await fetch('https://api.supabase.com/v1/projects/'+ref+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
 if(!response.ok)throw new Error('Supabase Management API HTTP '+response.status);
 return response.json();
}
const project=await request('');if(project.id!==ref||project.name.toLowerCase()!=='soulvd')throw new Error('Wrong project; refusing mutation.');
const state=await request('/database/query',{query:"select to_regclass('soulvd_private.deployment_migrations')::text as tracking;"});
const applied=state[0].tracking?await request('/database/query',{query:'select version,checksum from soulvd_private.deployment_migrations;'}):[];
let sql="begin; select pg_advisory_xact_lock(hashtextextended('soulvd-launch-deployment',0)); create table if not exists soulvd_private.deployment_migrations(version text primary key,checksum text not null,applied_at timestamptz not null default now()); alter table soulvd_private.deployment_migrations enable row level security; revoke all on soulvd_private.deployment_migrations from public,anon,authenticated;\n";
let count=0;
for(const file of files){
 const source=readFileSync(new URL('../supabase/migrations/'+file,import.meta.url),'utf8');
 const version=file.slice(0,14),checksum=createHash('sha256').update(source.replace(/\r\n/g,'\n')).digest('hex');
 const prior=applied.find(m=>m.version===version);
 if(prior){if(prior.checksum!==checksum)throw new Error('Applied migration has changed: '+version);continue;}
 sql+=`do $guard$ begin if exists(select 1 from soulvd_private.deployment_migrations where version='${version}') then raise exception 'CONCURRENT_DEPLOYMENT'; end if; end $guard$;\n`;
 sql+=source.replace(/^begin;\s*/,'').replace(/commit;\s*$/,'')+`\ninsert into soulvd_private.deployment_migrations(version,checksum) values('${version}','${checksum}');\n`;
 count++;
}
if(!count){console.log('All launch migrations are already applied with matching checksums.');process.exit(0);}
sql+="select public.soulvd_term_price('starter_v1',12) as starter_annual,public.soulvd_term_price('pro_growth_v1',12) as pro_annual;\n";
const apply=process.argv.includes('--apply');sql+=apply?"notify pgrst,'reload schema'; commit;":"rollback;";
await request('/database/query',{query:sql});
console.log(`${apply?'APPLIED':'ROLLBACK VERIFIED'}: ${count} launch migrations on ${ref}.`);
