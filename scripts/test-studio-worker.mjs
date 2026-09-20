import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const url = (s) =>
  `data:text/javascript;base64,${Buffer.from(ts.transpileModule(s, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64')}`;
const schemaUrl = url(
  (await readFile('src/lib/studio/schema.ts', 'utf8')).replace(
    "'zod'",
    JSON.stringify(import.meta.resolve('zod')),
  ),
);
const knowledgeUrl = url(await readFile('src/lib/studio/knowledge.ts', 'utf8'));
const { knowledgeContext } = await import(knowledgeUrl);
const retrieved = knowledgeContext(
  [
    { title: 'Intro', content: 'Unrelated '.repeat(2000) },
    { title: 'Returns', content: 'Refunds within fourteen days.' },
  ],
  'refunds',
);
assert.ok(retrieved.startsWith('Returns'));
assert.ok(retrieved.length <= 16000);
let run, updates, requests, sendCount, aiCount, dispatchCount, generated, aiAllowed, knowledgeRows, generationFails, delivery, webhookCode, webhookCalls, testTenant;
globalThis.studioMocks = {
  db: {
    rpc: async (name, args) => {
      requests.push({ name, args });
      if (name === 'soulvd_crm_claim') return {data:delivery,error:null};
      if (name === 'soulvd_automation_claim')
        return { data: structuredClone(run), error: null };
      if (name === 'soulvd_ai_reserve') return { data: aiAllowed, error: null };
      if (name === 'soulvd_ai_finalize') return { data: null, error: null };
      if (name === 'soulvd_automation_send') {
        sendCount++;
        return { data: { allowed: true, id: 'job' }, error: null };
      }
      throw new Error(name);
    },
    from: (table) => {
      const query = {
        select() {
          return query;
        },
        update(value) {
          updates.push({ table, value });
          return query;
        },
        eq() {
          return query;
        },
        gt() {
          return query;
        },
        lte() {
          return query;
        },
        order() {
          return query;
        },
        limit() {
          return query;
        },
        single() {
          return Promise.resolve({error:null,data:{is_test:testTenant}});
        },
        then(resolve) {
          return Promise.resolve({
            error: null,
            data:
              table === 'bot_knowledge'
                ? knowledgeRows
                : [],
          }).then(resolve);
        },
      };
      return query;
    },
  },
  webhook: async (target,body,headers) => { webhookCalls.push({target,body,headers}); if(webhookCode===0) throw new Error('Network timeout'); return webhookCode; },
  generate: async (options) => {
    aiCount++;
    if (generationFails) throw new Error('Provider unavailable');
    assert.ok(options.instructions.includes('لا تخترع'));
    assert.ok(options.prompt.includes('Within 2 days'));
    assert.equal(options.maxOutputTokens, 500);
    assert.equal(options.model.modelId, testTenant ? 'nex-agi/nex-n2.5-mini:free' : 'test/provider');
    assert.ok(options.model.provider.startsWith('openrouter'));
    assert.equal(options.providerOptions.openrouter.provider.max_price.prompt,testTenant ? 0 : 0.1);
    return { text: generated, usage: { inputTokens: 10, outputTokens: 5 }, providerMetadata:{openrouter:{usage:{cost:testTenant ? 0 : 0.000003}}} };
  },
  dispatch: async () => {
    dispatchCount++;
  },
};
const source = (await readFile('src/lib/studio/worker.ts', 'utf8'))
  .replace("import 'server-only';", '')
  .replace("'@openrouter/ai-sdk-provider'", JSON.stringify(import.meta.resolve('@openrouter/ai-sdk-provider')))
  .replace(
    "import { generateText } from 'ai';",
    'const generateText=globalThis.studioMocks.generate;',
  )
  .replace(
    "import { createAdminClient } from '@/lib/supabase/admin';",
    'const createAdminClient=()=>globalThis.studioMocks.db;',
  )
  .replace(
    "import { decryptToken } from '@/lib/meta/security';",
    'const decryptToken=x=>x;',
  )
  .replace(
    "import { dispatchOne } from '@/lib/meta/worker';",
    'const dispatchOne=globalThis.studioMocks.dispatch;',
  )
  .replace("'./schema'", JSON.stringify(schemaUrl))
  .replace("'./knowledge'", JSON.stringify(knowledgeUrl))
  .replace(
    "import { sendSignedWebhook } from './network';",
    'const sendSignedWebhook=globalThis.studioMocks.webhook;',
  );
const worker = await import(url(source));
function reset(action = 'text', mode = 'draft') {
  updates = [];
  requests = [];
  sendCount = 0;
  aiCount = 0;
  dispatchCount = 0;
  generated = 'Within 2 days.';
  aiAllowed = true;
  generationFails = false;
  testTenant = false;
  knowledgeRows = [{ title: 'Shipping', content: 'Within 2 days.' }];
  run = {
    id: 'run',
    tenant_id: 'tenant',
    message: {
      id: 'message',
      contact_id: 'contact',
      body: 'order',
      created_at: new Date().toISOString(),
    },
    contact: { bot_paused: false },
    settings: { enabled: true, instructions: 'Polite', cooldown_seconds: 60 },
    subscription: {
      status: 'active',
      plan_id: 'starter_v1',
      period_start: new Date(Date.now() - 86400000).toISOString(),
      period_end: new Date(Date.now() + 86400000).toISOString(),
    },
    flows: [
      {
        id: 'flow',
        created_by: 'actor',
        name: 'Flow',
        status: 'active',
        priority: 10,
        definition: {
          trigger: 'keywords',
          keywords: ['order'],
          action,
          mode,
          reply: 'Confirmed',
        },
      },
    ],
  };
}
const state = () =>
  updates.filter((u) => u.table === 'automation_runs' && u.value.state).at(-1)
    ?.value;
reset();
await worker.automationOne();
assert.equal(state().state, 'draft');
assert.equal(state().output, 'Confirmed');
assert.equal(sendCount, 0);
reset('text', 'auto');
await worker.automationOne();
assert.equal(sendCount, 1);
assert.equal(dispatchCount, 1);
reset();
run.message.body = 'unknown';
await worker.automationOne();
assert.equal(state().error_code, 'NO_MATCH');
assert.equal(sendCount, 0);
reset();
run.message.created_at = new Date(Date.now() - 600000).toISOString();
await worker.automationOne();
assert.equal(state().error_code, 'STALE_MESSAGE');
reset();
run.message.body = 'موظف';
await worker.automationOne();
assert.equal(state().state, 'handoff');
assert.ok(
  updates.some((u) => u.table === 'whatsapp_contacts' && u.value.bot_paused),
);
reset('ai');
delete process.env.SOULVD_AI_ENABLED;
await worker.automationOne();
assert.equal(state().error_code, 'AI_NOT_CONFIGURED');
assert.equal(aiCount, 0);
process.env.SOULVD_AI_ENABLED = 'true';
process.env.SOULVD_AI_MODEL = 'test/provider';
process.env.OPENROUTER_API_KEY = 'test-only';
reset('ai');
aiAllowed = false;
await worker.automationOne();
assert.equal(state().error_code, 'AI_ACCESS_OR_LIMIT');
assert.equal(aiCount, 0, 'no provider call without a platform allowance');
reset('ai');
await worker.automationOne();
assert.equal(aiCount, 1);
assert.equal(state().state, 'draft');
assert.equal(sendCount, 0);
assert.ok(updates.some((u) => u.value.input_tokens === 10));
assert.deepEqual(requests.find(r=>r.name==='soulvd_ai_finalize').args,{p_run:'run',p_charge:true,p_cost_micro:3});
reset('ai');
testTenant = true;
await worker.automationOne();
assert.equal(state().state, 'draft');
assert.equal(sendCount, 0);
assert.equal(requests.find(r=>r.name==='soulvd_ai_finalize').args.p_cost_micro,0);
reset('ai', 'auto');
generated = '[HANDOFF]';
await worker.automationOne();
assert.equal(state().state, 'handoff');
assert.equal(sendCount, 0);
assert.equal(requests.find(r=>r.name==='soulvd_ai_finalize').args.p_charge,false);
reset('ai', 'auto');
run.contact.bot_paused = true;
await worker.automationOne();
assert.equal(aiCount, 0);
assert.equal(sendCount, 0);
reset('ai');
knowledgeRows = [];
await worker.automationOne();
assert.equal(state().error_code, 'KNOWLEDGE_REQUIRED');
assert.equal(aiCount, 0);
assert.equal(requests.some(r=>r.name==='soulvd_ai_reserve'), false, 'missing knowledge does not consume allowance');
reset('ai');
generationFails = true;
await worker.automationOne();
assert.equal(state().state, 'handoff');
assert.equal(state().error_code, 'AI_PROVIDER_UNAVAILABLE');
assert.equal(aiCount,1);
assert.equal(sendCount,0);
assert.equal(requests.find(r=>r.name==='soulvd_ai_finalize').args.p_charge,false);
assert.ok(updates.some(u=>u.table==='whatsapp_contacts' && u.value.bot_paused));
for (const [code,attempt,expected] of [[204,1,'delivered'],[500,1,'queued'],[429,5,'failed'],[400,1,'failed'],[0,1,'queued']]) {
  updates=[];webhookCalls=[];webhookCode=code;
  delivery={id:'test-event',payload:{type:'integration.test',test:true},url:'https://clinic.example.com/hook',secret:'fixture-secret',attempt};
  assert.equal(await worker.deliveryOne(),true);
  const sent=webhookCalls[0];
  assert.deepEqual(JSON.parse(sent.body),{id:'test-event',type:'integration.test',test:true});
  assert.equal(sent.headers['X-Soulvd-Signature'],'sha256='+createHmac('sha256','fixture-secret').update(sent.headers['X-Soulvd-Timestamp']+'.'+sent.body).digest('hex'));
  assert.equal(updates.at(-1).value.status,expected);
  if(expected==='queued') assert.ok(Date.parse(updates.at(-1).value.next_attempt_at)>Date.now());
}
console.log('PASS: signed synthetic webhook, successful delivery, bounded retries for 429/5xx/timeouts and terminal 4xx. No network requests.');
delete globalThis.studioMocks;
console.log(
  'PASS: actual worker dispatch/draft paths, keyword matching, stale messages, customer handoff, missing AI configuration, bounded AI generation and no send on handoff/pause.',
);
