import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import ts from 'typescript';
const url=s=>`data:text/javascript;base64,${Buffer.from(ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64')}`;
let authResult={tenant:randomUUID(),actor:randomUUID()},calls=[],rpcError=null;const filters=[];
const db={rpc:async(name,args)=>{calls.push({name,args});return name==='soulvd_crm_auth'?{data:authResult,error:null}:{data:{allowed:true,id:'job',message_id:'message'},error:rpcError};},from:table=>{
 const query={select(){return query;},eq(k,v){filters.push([table,k,v]);return query;},order(){return query;},limit(){return query;},or(){return query;},then(resolve){return Promise.resolve({data:[],error:null}).then(resolve);}};return query;
}};
globalThis.studioApiDb=db;
const replaceDb=source=>source.replace("import { createAdminClient } from '@/lib/supabase/admin';",'const createAdminClient=()=>globalThis.studioApiDb;');
const authUrl=url(replaceDb((await readFile('src/lib/studio/api.ts','utf8')).replace("import 'server-only';",'')));
const securityUrl=url(await readFile('src/lib/meta/security.ts','utf8'));
const route=await import(url(replaceDb(await readFile('src/app/api/v1/messages/route.ts','utf8'))
 .replace("'zod'",JSON.stringify(import.meta.resolve('zod')))
 .replace("'@/lib/studio/api'",JSON.stringify(authUrl))
 .replace("'@/lib/meta/security'",JSON.stringify(securityUrl))
 .replace("import { dispatchOne } from '@/lib/meta/worker';",'const dispatchOne=async()=>{throw new Error("simulated worker outage")};')));
const token='slv_'+'a'.repeat(64);
const request=(body,headers={})=>new Request('https://soulvd.test/api/v1/messages',{method:'POST',headers:{'Authorization':`Bearer ${token}`,'Idempotency-Key':randomUUID(),...headers},body:JSON.stringify(body)});
assert.equal((await route.POST(request({to:'+966500000000',body:'Hello'},{Authorization:'Bearer invalid'}))).status,401);assert.equal(calls.length,0);
let result=await route.POST(request({to:'+966500000000',body:'Hello',tenant:'attacker-controlled'}));assert.equal(result.status,202);assert.equal((await result.json()).id,'message');
assert.equal(calls[0].args.p_hash,createHash('sha256').update(token).digest('hex'));
assert.equal(calls.at(-1).args.p_tenant,authResult.tenant);assert.equal(calls.at(-1).args.p_actor,authResult.actor);
assert.equal((await route.POST(request({to:'0500000000',body:'Hello'}))).status,400);
assert.equal((await route.POST(request({to:'+966500000000',body:'Hello'},{'Idempotency-Key':'invalid'}))).status,400);
assert.equal((await route.POST(request({body:'x'.repeat(70000)}))).status,413);
authResult={limited:true};assert.equal((await route.POST(request({to:'+966500000000',body:'Hello'}))).status,429);
authResult={tenant:'tenant-only',actor:'owner'};
assert.equal((await route.GET(new Request('https://soulvd.test/api/v1/messages?cursor=invalid',{headers:{Authorization:`Bearer ${token}`}}))).status,400);
result=await route.GET(new Request('https://soulvd.test/api/v1/messages',{headers:{Authorization:`Bearer ${token}`}}));assert.equal(result.status,200);assert.ok(filters.some(f=>f[1]==='tenant_id'&&f[2]==='tenant-only'));
rpcError={message:'WALLET_INSUFFICIENT'};
result=await route.POST(request({to:'+966500000000',body:'Hello'}));
assert.equal(result.status,402);assert.equal((await result.json()).error,'WALLET_INSUFFICIENT');
rpcError={message:'database internal secret detail'};
result=await route.POST(request({to:'+966500000000',body:'Hello'}));
assert.equal(result.status,409);assert.equal((await result.json()).error,'REQUEST_REJECTED');
delete globalThis.studioApiDb;
console.log('PASS: API authentication, key hashing, server-derived tenant/actor, bounded input, rate limiting, invalid cursors, and durable acceptance during provider-worker outage.');
