import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHmac } from 'node:crypto';
import ts from 'typescript';
const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64')}`;
const securityUrl = moduleUrl(await readFile('src/lib/ycloud/security.ts','utf8'));
const { verifyYCloudSignature } = await import(securityUrl);
const timestamp = Math.floor(Date.now()/1000);
const body = JSON.stringify({id:'evt-test',type:'whatsapp.inbound_message.received'});
const sign = raw => `t=${timestamp},s=${createHmac('sha256','test-secret').update(`${timestamp}.${raw}`).digest('hex')}`;
assert.equal(verifyYCloudSignature(body,sign(body),'test-secret'),true);
assert.equal(verifyYCloudSignature(body+' ',sign(body),'test-secret'),false);
assert.equal(verifyYCloudSignature(body,sign(body),'test-secret',(timestamp+301)*1000),false);
assert.equal(verifyYCloudSignature(body,sign(body)+`,t=${timestamp}`,'test-secret'),false);
assert.equal(verifyYCloudSignature(body,'t=bad,s=bad','test-secret'),false);
let persisted=0, fail=false;
globalThis.ycloudTestDb={rpc:async (name,args)=>{assert.equal(name,'soulvd_ycloud_ingest');assert.equal(args.p_id,'evt-test');persisted++;return {error:fail?{}:null};}};
const routeSource=(await readFile('src/app/api/ycloud/whatsapp/webhook/route.ts','utf8'))
 .replace("import { after } from 'next/server';",'const after = () => {};')
 .replace("import { runStudioWorker } from '@/lib/studio/worker';",'const runStudioWorker = async () => {};')
 .replace("import { createAdminClient } from '@/lib/supabase/admin';",'const createAdminClient=()=>globalThis.ycloudTestDb;')
 .replace("'@/lib/ycloud/security'",JSON.stringify(securityUrl));
const {POST}=await import(moduleUrl(routeSource));
process.env.YCLOUD_WEBHOOK_SECRET='test-secret';
const request=(raw,signature)=>new Request('https://example.test/',{method:'POST',body:raw,headers:{'ycloud-signature':signature}});
assert.equal((await POST(request(body,'invalid'))).status,403);assert.equal(persisted,0);
assert.equal((await POST(request(body,sign(body)))).status,200);
fail=true;assert.equal((await POST(request(body,sign(body)))).status,503);
assert.equal((await POST(request('x'.repeat(1048577),'invalid'))).status,413);
delete globalThis.ycloudTestDb;
const originalFetch=globalThis.fetch;
const client=await import(moduleUrl((await readFile('src/lib/ycloud/client.ts','utf8')).replace(/import ['"]server-only['"];/,'')));
process.env.YCLOUD_API_KEY='test-key';
let calls=0;
globalThis.fetch=async (url,options)=>{calls++;assert.equal(options.headers['X-API-Key'],'test-key'); assert.equal(url,'https://api.ycloud.com/v2/whatsapp/messages/sendDirectly');return Response.json({id:'out-test'});};
assert.deepEqual(await client.ycloud('/whatsapp/messages/sendDirectly',{type:'text'}),{id:'out-test'});
await assert.rejects(client.ycloud('/other/path'),/INVALID_PROVIDER_PATH/);assert.equal(calls,1);
globalThis.fetch=async()=>{throw new Error('network');};
await assert.rejects(client.ycloud('/whatsapp/messages/sendDirectly',{}),error=>error.uncertain===true);
globalThis.fetch=async()=>Response.json({error:{}},{status:400});
await assert.rejects(client.ycloud('/whatsapp/messages/sendDirectly',{}),error=>error.uncertain===false);
globalThis.fetch=originalFetch;
console.log('PASS: YCloud signature tampering/replay, bounded body, durable acknowledgement, API authentication and ambiguous-send handling.');
