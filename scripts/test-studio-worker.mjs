import assert from 'node:assert/strict';
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
let run, updates, requests, sendCount, aiCount, dispatchCount, generated, aiAllowed;
globalThis.studioMocks = {
  db: {
    rpc: async (name, args) => {
      requests.push({ name, args });
      if (name === 'soulvd_automation_claim')
        return { data: structuredClone(run), error: null };
      if (name === 'soulvd_ai_reserve') return { data: aiAllowed, error: null };
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
        then(resolve) {
          return Promise.resolve({
            error: null,
            data:
              table === 'bot_knowledge'
                ? [{ title: 'Shipping', content: 'Within 2 days.' }]
                : [],
          }).then(resolve);
        },
      };
      return query;
    },
  },
  generate: async (options) => {
    aiCount++;
    assert.ok(options.instructions.includes('لا تخترع'));
    assert.ok(options.prompt.includes('Within 2 days'));
    assert.equal(options.maxOutputTokens, 500);
    assert.equal(options.model.modelId, 'test/provider');
    assert.ok(options.model.provider.startsWith('openrouter'));
    return { text: generated, usage: { inputTokens: 10, outputTokens: 5 } };
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
    'const sendSignedWebhook=async()=>204;',
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
reset('ai', 'auto');
generated = '[HANDOFF]';
await worker.automationOne();
assert.equal(state().state, 'handoff');
assert.equal(sendCount, 0);
reset('ai', 'auto');
run.contact.bot_paused = true;
await worker.automationOne();
assert.equal(aiCount, 0);
assert.equal(sendCount, 0);
delete globalThis.studioMocks;
console.log(
  'PASS: actual worker dispatch/draft paths, keyword matching, stale messages, customer handoff, missing AI configuration, bounded AI generation and no send on handoff/pause.',
);
