import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import ts from 'typescript';
const load = source => import('data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64'));
const media = await load(await readFile('src/lib/inbox/media.ts','utf8'));
assert.equal(media.uploadMediaKind('image/png', new Uint8Array([137,80,78,71,13,10,26,10])), 'image');
assert.equal(media.uploadMediaKind('image/png', Buffer.from('<html>')), null);
assert.equal(media.uploadMediaKind('image/svg+xml', Buffer.from('<svg/>')), null);
assert.equal(media.uploadMediaKind('application/pdf', Buffer.from('%PDF-1.7')), 'document');
assert.equal(media.uploadMediaKind('video/mp4', Buffer.from('\0\0\0\0ftypisom')), 'video');
assert.equal(media.uploadMediaKind('image/jpeg', new Uint8Array(3_800_001)), null);
assert.equal(media.providerMediaUrl('https://api.ycloud.com/v2/whatsapp/media/download/123?sig=private','ycloud').hostname, 'api.ycloud.com');
for (const url of ['http://api.ycloud.com/v2/whatsapp/media/download/123','https://api.ycloud.com.evil.test/v2/whatsapp/media/download/123','https://user:password@api.ycloud.com/v2/whatsapp/media/download/123','https://api.ycloud.com/v2/other/123','https://127.0.0.1/file']) assert.throws(() => media.providerMediaUrl(url,'ycloud'));

const db = new PGlite(), actor = randomUUID(), outsider = randomUUID(), tenant = randomUUID(), number = randomUUID();
const q = async (sql,args=[]) => (await db.query(sql,args)).rows[0]?.result;
const rpc = (name,args=[]) => q(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) result`,args);
const hash = 'a'.repeat(64);
try {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,service_role;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');create table public.users(id uuid primary key,email text,full_name text,role text default 'editor' constraint users_role_check check(role in ('owner','editor')));create function public.tg_handle_new_user() returns trigger language plpgsql as $$begin return new;end$$;`);
  for (const name of (await readdir('supabase/migrations')).filter(f=>f.startsWith('2026')).sort()) await db.exec(await readFile('supabase/migrations/'+name,'utf8'));
  await db.exec('delete from soulvd_private.messaging_rate_limits where valid_from<>(select min(valid_from) from soulvd_private.messaging_rate_limits);');
  await db.exec(`insert into public.users values('${actor}','actor@test.invalid','Actor','merchant'),('${outsider}','outside@test.invalid','Outside','merchant');insert into public.tenants(id,name) values('${tenant}','Media QA');insert into public.tenant_members values('${tenant}','${actor}','owner');insert into public.subscriptions(tenant_id,plan_id,status,period_start,period_end) values('${tenant}','starter_v1','active',now()-interval '1 day',now()+interval '2 months');insert into public.whatsapp_numbers(id,tenant_id,phone,status) values('${number}','${tenant}','+966500000000','connected');insert into soulvd_private.meta_connections(number_id,waba_id,phone_number_id,encrypted_token,mode,provider) values('${number}','123456','654321','encrypted-fixture','coexistence','ycloud');insert into public.messaging_wallets(tenant_id,balance_micro) values('${tenant}',100000000) on conflict(tenant_id) do update set balance_micro=100000000;update soulvd_private.messaging_rate_limits set valid_from=now()-interval '1 day',valid_until=now()+interval '1 day';set role service_role;`);
  const event = { id: 'media-event', type: 'whatsapp.inbound_message.received', whatsappInboundMessage: { id:'image-fixture',wabaId:'123456',from:'+966511111111',to:'+966500000000',sendTime:new Date().toISOString(),type:'image',image:{id:'987654',link:'https://api.ycloud.com/v2/whatsapp/media/download/987654?sig=private',mime_type:'image/png',caption:'Customer caption'} } };
  assert.equal(await rpc('soulvd_ycloud_ingest',[event.id,event]),true);
  assert.equal(await rpc('soulvd_ycloud_ingest',[event.id,event]),false);
  const incoming = (await db.query("select id,media,body from public.whatsapp_messages where meta_message_id='ycloud:image-fixture'")).rows[0];
  assert.equal(incoming.body,'Customer caption');
  assert.deepEqual(incoming.media,{mime:'image/png',filename:null});
  assert.equal(JSON.stringify(incoming).includes('sig='),false);
  const stored = await rpc('soulvd_message_media',[tenant,actor,incoming.id]);
  assert.equal(stored.media_id,'987654');
  await assert.rejects(rpc('soulvd_message_media',[tenant,outsider,incoming.id]),/FORBIDDEN/);
  const send = (request=randomUUID(), to='966511111111', sha=hash, who=actor) => rpc('soulvd_enqueue_media',[tenant,who,request,to,'image','image/png','photo.png',sha,'Our caption']);
  const request = randomUUID();
  assert.equal(await rpc('soulvd_reserve_media_upload',[tenant,actor,request,hash]),true);
  assert.equal(await rpc('soulvd_reserve_media_upload',[tenant,actor,request,hash]),true);
  await assert.rejects(rpc('soulvd_reserve_media_upload',[tenant,actor,request,'b'.repeat(64)]),/REQUEST_CONFLICT/);
  const result = await send(request);
  assert.equal(result.allowed,true);
  assert.deepEqual(await send(request),result);
  await assert.rejects(send(request,'966511111111','b'.repeat(64)),/REQUEST_CONFLICT/);
  await assert.rejects(send(randomUUID(),'966511111111',hash,outsider),/FORBIDDEN/);
  assert.equal((await send(randomUUID(),'966522222222')).code,'WINDOW_CLOSED');
  const claim = await rpc('soulvd_meta_claim',[result.id]);
  assert.equal(claim.payload.type,'image');
  assert.equal((await rpc('soulvd_job_media',[result.id])).storage_path,`${tenant}/${request}`);
  await rpc('soulvd_meta_finish',[result.id,'failed',null,'TEST_FAILURE']);
  assert.equal(await q('select held_micro::text result from public.messaging_wallets where tenant_id=$1',[tenant]),'0');
  const delayed = await send();
  await db.query("update soulvd_private.meta_jobs set claimed_at=now()-interval '2 seconds' where id=$1",[result.id]);
  await db.query("update public.whatsapp_contacts set last_inbound_at=now()-interval '25 hours' where tenant_id=$1",[tenant]);
  assert.equal(await rpc('soulvd_meta_claim',[delayed.id]),null);
  assert.equal(await q('select status result from public.whatsapp_messages where id=$1',[delayed.message_id]),'failed');
  assert.equal(await q('select held_micro::text result from public.messaging_wallets where tenant_id=$1',[tenant]),'0');
  await db.query("update public.whatsapp_contacts set last_inbound_at=now() where tenant_id=$1",[tenant]);
  await db.query('update public.messaging_wallets set balance_micro=0 where tenant_id=$1',[tenant]);
  await db.query("update soulvd_private.free_reply_policy set valid_from=now()-interval '1 day',valid_until=now()+interval '1 day'");
  assert.equal((await send()).allowed,true, 'Verified free media can send with an empty wallet');
  await db.query("update soulvd_private.free_reply_policy set valid_until=now()-interval '1 second'");
  assert.equal((await send()).code,'WALLET_INSUFFICIENT');
  await db.exec(`reset role;set role authenticated;set request.jwt.claim.sub='${actor}';`);
  await assert.rejects(rpc('soulvd_message_media',[tenant,actor,incoming.id]),/permission denied/);
  await assert.rejects(db.query('select * from soulvd_private.message_media'),/permission denied/);
  console.log('PASS: media MIME/magic/size, SSRF allowlist, real provider ingestion and duplicate handling, private identifiers, tenant isolation, immutable upload reservations, idempotent media enqueue, quota/window/wallet pipeline, delayed window expiration and hold release. No real provider sends.');
} finally { await db.close(); }

// Exercise the actual internal mail handler: normal JWTs cannot send invitations.
const oldFetch = globalThis.fetch;
let handler, sends=0;
globalThis.Deno = { env:{get:k=>({SUPABASE_SERVICE_ROLE_KEY:'service-fixture',SUPABASE_URL:'https://project.test',TEAM_EMAIL_KEY:'mail-fixture',TEAM_EMAIL_FROM:'Soulvd <noreply@test.invalid>'})[k]},serve:fn=>{handler=fn;} };
await load(await readFile('supabase/functions/team-invitation-mail/index.ts','utf8'));
globalThis.fetch = async (url, options) => {
  if (url.includes('/rpc/')) return Response.json({email:'agent@test.invalid',name:'Fixture',deliveryKey:'key'});
  if (url==='https://api.resend.com/emails') { sends++;assert.equal(options.headers.Authorization,'Bearer mail-fixture');assert.ok(options.headers['Idempotency-Key']);return Response.json({id:'mail'}); }
  return new Response(null,{status:204});
};
try {
  assert.equal((await handler(new Request('https://function.test',{method:'POST',headers:{authorization:'Bearer user-fixture'}}))).status,403);
  assert.equal(sends,0);
  const response = await handler(new Request('https://function.test',{method:'POST',headers:{authorization:'Bearer service-fixture'},body:JSON.stringify({tenant:randomUUID(),actor:randomUUID(),invitation:randomUUID()})}));
  assert.equal((await response.json()).allowed,true);assert.equal(sends,1);
  console.log('PASS: internal invite email service authorization and idempotency. No real emails sent.');
} finally { globalThis.fetch=oldFetch;delete globalThis.Deno; }

// Verify the real worker transforms a private file into the provider payload.
const workerFixture = { job: { id: randomUUID(), kind: 'message', provider: 'ycloud', phone: '+966500000000', payload: { type: 'image', to: '966511111111', media_file: randomUUID(), caption: 'Caption' } }, available: true, sent: [], finished: [] };
globalThis.mediaWorkerFixture = workerFixture;
const workerSource = (await readFile('src/lib/meta/worker.ts', 'utf8'))
  .replace(/import 'server-only';/, '')
  .replace(/import \{ createAdminClient \} from '@\/lib\/supabase\/admin';/, `const createAdminClient=()=>({rpc:async(name,args)=>name==='soulvd_meta_claim'?{data:structuredClone(globalThis.mediaWorkerFixture.job)}:name==='soulvd_job_media'?{data:globalThis.mediaWorkerFixture.available?{storage_path:'tenant/file',filename:'photo.png'}:null}:(globalThis.mediaWorkerFixture.finished.push(args),{data:true}),storage:{from:()=>({createSignedUrl:async(path,seconds)=>{if(seconds!==7200)throw new Error('TTL');return {data:{signedUrl:'https://storage.test/private-signed-file'}};}})}});`)
  .replace(/import \{ decryptToken \} from '.\/security';/, `const decryptToken=()=>'';`)
  .replace(/import \{ graph, MetaError \} from '.\/client';/, `class MetaError extends Error{};const graph=async()=>{throw new Error('Unexpected Meta request')};`)
  .replace(/import \{ ycloud, YCloudError \} from '@\/lib\/ycloud\/client';/, `class YCloudError extends Error{};const ycloud=async(path,payload)=>{globalThis.mediaWorkerFixture.sent.push({path,payload});return {id:'provider-id'};};`);
try {
  const { dispatchOne } = await load(workerSource);
  assert.equal((await dispatchOne()).status, 'accepted');
  assert.deepEqual(workerFixture.sent[0], { path: '/whatsapp/messages/sendDirectly', payload: { type: 'image', image: { link: 'https://storage.test/private-signed-file', caption: 'Caption' }, from: '+966500000000', to: '+966511111111', externalId: workerFixture.job.id } });
  assert.equal(workerFixture.finished[0].p_meta_id, 'ycloud:provider-id');
  workerFixture.available = false;
  assert.equal((await dispatchOne()).status, 'failed');
  assert.equal(workerFixture.sent.length, 1, 'A missing/private file must never reach the provider');
  console.log('PASS: actual media worker signed-file payload, provider acceptance and fail-closed missing-file handling. No provider calls.');
} finally { delete globalThis.mediaWorkerFixture; }
