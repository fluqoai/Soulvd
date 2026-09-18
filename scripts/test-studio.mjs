import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import ts from 'typescript';
const moduleUrl = (source) =>
  `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64')}`;
const network = await import(
  moduleUrl(
    (await readFile('src/lib/studio/network.ts', 'utf8')).replace(
      "import 'server-only';",
      '',
    ),
  )
);
for (const ip of [
  '127.0.0.1',
  '10.0.0.1',
  '169.254.169.254',
  '192.168.1.1',
  '172.31.0.1',
  '100.64.0.1',
  '::1',
  '0.0.0.0',
  '224.0.0.1',
])
  assert.equal(network.publicIPv4(ip), false, ip);
assert.equal(network.publicIPv4('8.8.8.8'), true);
for (const url of [
  'http://example.com',
  'https://127.0.0.1',
  'https://2130706433',
  'https://[::1]',
  'https://user:pass@example.com',
  'https://example.com:8080',
  'https://example.com?secret=a',
  'https://server.local',
  'https://example.com.',
])
  assert.throws(() => network.webhookUrl(url), undefined, url);
const schema = await import(
  moduleUrl(
    (await readFile('src/lib/studio/schema.ts', 'utf8')).replace(
      "'zod'",
      JSON.stringify(import.meta.resolve('zod')),
    ),
  )
);
assert.equal(schema.parameterCount('Ø£Ù‡Ù„Ù‹Ø§ {{1}}ØŒ Ø§Ù„Ø·Ù„Ø¨ {{2}} Ø¨Ø§Ø³Ù… {{1}}'), 2);
for (const bad of ['{{0}}', '{{2}}', '{{1}} {{3}}', '{name}', '{{11}}'])
  assert.throws(() => schema.parameterCount(bad));
const keywordFlow = {id:'keyword',created_by:'actor',name:'Prices',status:'active',priority:1,definition:{trigger:'keywords',keywords:['ÇÓÚÇÑ'],action:'text',mode:'draft',reply:'Prices'}};
const catchAll = {...keywordFlow,id:'all',priority:99,definition:{...keywordFlow.definition,trigger:'all'}};
assert.equal(schema.matchFlow([catchAll,keywordFlow],'ÃóÓúÚóÇÑ ÇáÚíÇÏÉ').id,'keyword');
assert.equal(schema.matchFlow([{...keywordFlow,status:'draft'}],'ÇÓÚÇÑ'),undefined);
assert.equal(schema.matchFlow([{...keywordFlow,definition:{...keywordFlow.definition,keywords:['ó']}}],'anything'),undefined);
const lib = await import(
  moduleUrl(await readFile('src/lib/studio/library.ts', 'utf8'))
);
const templates = Object.values(lib).find(Array.isArray);
assert.equal(templates.length, 20);
for (const t of templates)
  assert.equal(
    schema.templateSchema.safeParse({ ...t, name: t.key, language: 'ar' })
      .success,
    true,
    t.key,
  );

const db = new PGlite();
const owner = randomUUID(),
  actor = randomUUID(),
  outsider = randomUUID(),
  tenant = randomUUID(),
  other = randomUUID();
const q = async (sql, args = []) => (await db.query(sql, args)).rows[0]?.result;
try {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated,service_role;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
 create table public.users(id uuid primary key,email text,full_name text,role text default 'editor' constraint users_role_check check(role in ('owner','editor')));
 create function public.tg_handle_new_user() returns trigger language plpgsql as $$begin return new;end$$;`);
  for (const name of [
    '20260916084850_merchant_subscriptions.sql',
    '20260916123743_meta_cloud_api.sql',
    '20260917163851_ycloud_provider.sql',
    '20260917180128_manual_bank_transfers.sql',
    '20260917181416_automation_integrations_templates.sql',
    '20260917181430_automation_integrations_templates.sql',
    '20260917201633_openrouter_ai_entitlements.sql',
    '20260918183220_studio_launch_hardening.sql',
  ])
    await db.exec(await readFile(`supabase/migrations/${name}`, 'utf8'));
  await db.exec(`insert into public.users values('${owner}','platform@test.invalid','Platform','owner'),('${actor}','merchant@test.invalid','Merchant','merchant'),('${outsider}','other@test.invalid','Other','merchant');
 insert into public.tenants(id,name)values('${tenant}','First'),('${other}','Other');
 insert into public.tenant_members values('${tenant}','${actor}','owner'),('${other}','${outsider}','owner');
 insert into public.subscriptions values('${tenant}','starter_v1','active',now()-interval '1 day',now()+interval '29 days'),('${other}','pro_growth_v1','active',now()-interval '1 day',now()+interval '29 days');
 grant select on public.users to service_role;set role service_role;`);
  const save = (kind, data, id = null, who = actor, space = tenant) =>
    q('select public.soulvd_studio_save($1,$2,$3,$4,$5) as result', [
      space,
      who,
      kind,
      id,
      data,
    ]);
  const flow = {
    name: 'Order',
    status: 'active',
    priority: 10,
    definition: {
      trigger: 'keywords',
      keywords: ['order'],
      action: 'text',
      mode: 'draft',
      reply: 'Ready',
    },
  };
  const flowId = await save('flow', flow);
  await assert.rejects(save('flow', flow), /LIMIT_EXCEEDED/);
  await assert.rejects(save('flow', flow, flowId, outsider), /FORBIDDEN/);
  await assert.rejects(
    save('integration', {
      name: 'CRM',
      endpoint_url: 'https://example.com/webhook',
    }),
    /PRO_REQUIRED/,
  );
  await assert.rejects(
    save('draft', {
      ...templates[0],
      name: 'draft',
      language: 'ar',
      library_key: templates[0].key,
    }),
    /PRO_REQUIRED/,
  );
  await save('settings', {
    enabled: true,
    instructions: '',
    daily_limit: 1,
    cooldown_seconds: 60,
  });
  await save('knowledge', { title: 'Terms', content: 'Delivery next day.' });
  await q(
    'select public.soulvd_meta_bind($1,$2,$3,$4,$5,$6,$7) as result',
    [
      tenant,
      actor,
      '+966500000000',
      '123',
      '456',
      'encrypted-placeholder',
      'api',
    ],
  );
  const event = (id, body = 'order', from = '966511111111') => ({
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '123',
        changes: [
          {
            field: 'messages',
            value: {
              metadata: { phone_number_id: '456' },
              messages: [
                {
                  id,
                  from,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: 'text',
                  text: { body },
                },
              ],
            },
          },
        ],
      },
    ],
  });
  const inbound = (id, body, from) =>
    q('select public.soulvd_meta_ingest($1,$2) as result', [
      id,
      event(id, body, from),
    ]);
  await inbound('incoming1');
  await inbound('incoming1');
  assert.equal(
    await q('select count(*)::int as result from public.automation_runs'),
    1,
  );
  const run = await q('select public.soulvd_automation_claim() as result');
  assert.equal(run.flows[0].id, flowId);
  const reserve = (id = run.id) => q('select public.soulvd_ai_reserve($1,$2) as result', [tenant, id]);
  assert.equal(await reserve(), false, 'a platform subscription does not grant AI');
  await assert.rejects(db.exec(`insert into soulvd_private.ai_entitlements(tenant_id,enabled,period_start,period_end,request_limit,grant_reference) values('${tenant}',true,now(),now()+interval '1 day',10,'TEST')`), /permission denied/);
  await db.exec(`reset role;
    insert into soulvd_private.ai_entitlements(tenant_id,period_start,period_end,request_limit,grant_reference)
    values('${tenant}',now()-interval '1 day',now()+interval '1 day',1,'TEST-ONLY');set role service_role;`);
  assert.equal(await reserve(), false, 'disabled allowance blocks generation');
  await db.exec(`update soulvd_private.ai_entitlements set enabled=true where tenant_id='${tenant}';`);
  assert.equal(
    await q('select public.soulvd_ai_reserve($1,$2) as result', [
      tenant,
      run.id,
    ]),
    true,
  );
  assert.equal(
    await q('select public.soulvd_ai_reserve($1,$2) as result', [
      tenant,
      run.id,
    ]),
    false,
  );
  assert.equal(await q(`select requests_used as result from soulvd_private.ai_entitlements where tenant_id='${tenant}'`), 1, 'a run reserves allowance only once');
  await inbound('incoming2');
  // A delayed provider message is older than the triggering message.
  await db.query("update public.whatsapp_messages set created_at=(select created_at-interval '1 second' from public.whatsapp_messages where id=$1) where meta_message_id='incoming2'", [run.message.id]);
  assert.equal(
    await q('select public.soulvd_automation_claim() as result'),
    null,
    'same contact serializes in-flight work',
  );
  await db.query(
    "update public.automation_runs set state='draft',flow_id=$1 where id=$2",
    [flowId, run.id],
  );
  await assert.rejects(
    q('select public.soulvd_automation_send($1,$2,$3,true) as result', [
      run.id,
      outsider,
      'Reply',
    ]),
    /FORBIDDEN/,
  );
  const approved = await q(
    'select public.soulvd_automation_send($1,$2,$3,true) as result',
    [run.id, actor, 'Reply'],
  );
  assert.equal(approved.allowed, true);
  await assert.rejects(
    q('select public.soulvd_automation_send($1,$2,$3,true) as result', [
      run.id,
      actor,
      'Reply',
    ]),
    /RUN_ALREADY_FINISHED/,
  );
  const run2 = await q('select public.soulvd_automation_claim() as result');
  await db.exec(`update public.bot_settings set daily_limit=2 where tenant_id='${tenant}';`);
  assert.equal(await reserve(run2.id), false, 'raising the daily setting cannot bypass the platform allowance');
  await db.exec(`update soulvd_private.ai_entitlements set request_limit=2 where tenant_id='${tenant}';update public.bot_settings set daily_limit=1 where tenant_id='${tenant}';`);
  assert.equal(await reserve(run2.id), false, 'daily cap is enforced in addition to the period allowance');
  await db.exec(`update public.bot_settings set daily_limit=2 where tenant_id='${tenant}';update soulvd_private.ai_entitlements set period_end=now()-interval '1 hour' where tenant_id='${tenant}';`);
  assert.equal(await reserve(run2.id), false, 'expired allowance blocks generation');
  await db.exec(`update soulvd_private.ai_entitlements set period_end=now()+interval '1 day' where tenant_id='${tenant}';`);
  assert.equal(await reserve(run2.id), true);
  await db.query('update public.automation_runs set flow_id=$1 where id=$2', [
    flowId,
    run2.id,
  ]);
  const blocked = await q(
    'select public.soulvd_automation_send($1,$2,$3,false) as result',
    [run2.id, actor, 'Should not send'],
  );
  assert.equal(blocked.code, 'HUMAN_TAKEOVER');
  await inbound('stale-draft', 'appointment', '966533333333');
  const staleRun = await q('select public.soulvd_automation_claim() result');
  await db.query("update public.automation_runs set state='draft',flow_id=$1 where id=$2",[flowId,staleRun.id]);
  await inbound('changed-mind', 'cancel appointment', '966533333333');
  await db.query("update public.whatsapp_messages set created_at=now()+interval '1 second' where meta_message_id='changed-mind'");
  assert.equal((await q('select public.soulvd_automation_send($1,$2,$3,true) result',[staleRun.id,actor,'Old booking reply'])).code,'CONVERSATION_CHANGED');
  assert.equal(await q("select count(*)::int result from public.whatsapp_messages where body='Old booking reply'"),0);
  await inbound('stop', 'stop');
  assert.equal(
    await q(
      "select marketing_opted_out as result from public.whatsapp_contacts where wa_id='966511111111'",
    ),
    true,
  );
  const enqueue = (
    kind,
    body,
    template = null,
    parameters = [],
    id = randomUUID(),
  ) =>
    q(
      'select public.soulvd_enqueue_message($1,$2,$3,$4,$5,$6,$7,$8,$9) as result',
      [
        tenant,
        actor,
        id,
        kind,
        '966511111111',
        body,
        template,
        true,
        parameters,
      ],
    );
  const spec = {
    name: 'order_update',
    language: 'ar',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'Ø£Ù‡Ù„Ù‹Ø§ {{1}}ØŒ Ø·Ù„Ø¨Ùƒ {{2}}',
        example: { body_text: [['Ali', '102']] },
      },
    ],
  };
  await enqueue('template', JSON.stringify(spec));
  const wt = await q(
    "select to_jsonb(t) as result from public.whatsapp_templates t where name='order_update'",
  );
  assert.equal(wt.parameter_count, 2);
  await db.query(
    "update public.whatsapp_templates set status='approved' where id=$1",
    [wt.id],
  );
  await assert.rejects(enqueue('message', '', wt.id, []), /INVALID_PARAMETERS/);
  const rid = randomUUID(),
    out = await enqueue('message', '', wt.id, ['Ali', '102'], rid);
  assert.equal(
    (await enqueue('message', '', wt.id, ['Ali', '102'], rid)).id,
    out.id,
  );
  const job = await q(
    'select payload as result from soulvd_private.meta_jobs where id=$1',
    [out.id],
  );
  assert.deepEqual(job.template.components[0].parameters, [
    { type: 'text', text: 'Ali' },
    { type: 'text', text: '102' },
  ]);
  assert.equal(
    await q(
      'select body as result from public.whatsapp_messages where id=(select resource_id from soulvd_private.meta_jobs where id=$1)',
      [out.id],
    ),
    'Ø£Ù‡Ù„Ù‹Ø§ AliØŒ Ø·Ù„Ø¨Ùƒ 102',
  );
  await db.query(
    "update public.whatsapp_templates set category='MARKETING' where id=$1",
    [wt.id],
  );
  assert.equal(
    (await enqueue('message', '', wt.id, ['Ali', '102'])).code,
    'MARKETING_OPTED_OUT',
  );
  await db.exec(
    `update public.subscriptions set plan_id='pro_growth_v1' where tenant_id='${tenant}'`,
  );
  const integration = await save('integration', {
    name: 'CRM',
    endpoint_url: 'https://example.com/webhook',
  });
  assert.equal(await save('integration', {name:'Retry',endpoint_url:'https://example.com/webhook'}),integration,'duplicate request cannot charge the same endpoint twice');
  const keys = (disable = false) =>
    q('select public.soulvd_crm_credentials($1,$2,$3,$4,$5,$6) as result', [
      tenant,
      actor,
      integration,
      'a'.repeat(64),
      'encrypted-placeholder-secret',
      disable,
    ]);
  await assert.rejects(keys(), /PAYMENT_REQUIRED/);
  const pay = (reference = 'crm-bank', amount = 10000, who = owner) =>
    q('select public.soulvd_crm_confirm($1,$2,$3,$4) as result', [
      who,
      integration,
      reference,
      amount,
    ]);
  await assert.rejects(pay('bad', 10000, actor), /FORBIDDEN/);
  await assert.rejects(pay('bad', 9999), /AMOUNT_MISMATCH/);
  await pay();
  await pay();
  await assert.rejects(pay('another'), /ALREADY_PAID/);
  await assert.rejects(
    q('select public.soulvd_confirm_bank_transfer($1,$2,$3,$4,$5)', [
      owner,
      tenant,
      'crm-bank',
      39900,
      'subscription',
    ]),
    /REFERENCE_ALREADY_USED/,
  );
  await keys();
  const authenticate = () =>
    q('select public.soulvd_crm_auth($1) as result', ['a'.repeat(64)]);
  assert.equal((await authenticate()).tenant, tenant);
  for (let n = 1; n < 60; n++) await authenticate();
  assert.equal((await authenticate()).limited, true);
  await inbound('crm-event', 'test', '966522222222');
  await inbound('crm-event', 'test', '966522222222');
  assert.equal(
    await q('select count(*)::int as result from public.crm_deliveries'),
    1,
  );
  const delivery = await q('select public.soulvd_crm_claim() as result');
  assert.equal(delivery.attempt, 1);
  assert.equal(delivery.url, 'https://example.com/webhook');
  assert.equal(await q('select public.soulvd_crm_claim() as result'), null);
  await db.exec(
    "update public.crm_deliveries set claimed_at=now()-interval '3 minutes'",
  );
  assert.equal(
    (await q('select public.soulvd_crm_claim() as result')).attempt,
    2,
  );
  const ping = () => q('select public.soulvd_crm_test($1,$2,$3) result',[tenant,actor,integration]);
  const pingId = await ping();
  assert.equal(await ping(),pingId,'repeat test clicks must reuse the pending event');
  const pingPayload = await q('select payload result from public.crm_deliveries where id=$1',[pingId]);
  assert.equal(pingPayload.type,'integration.test');
  assert.equal(pingPayload.test,true);
  assert.equal('message' in pingPayload,false,'test event contains no customer data');
  await assert.rejects(q('select public.soulvd_crm_test($1,$2,$3) result',[other,outsider,integration]),/NOT_FOUND/);
  await assert.rejects(q('select public.soulvd_ai_status($1,$2) result',[tenant,outsider]),/FORBIDDEN/);
  const aiStatus = await q('select public.soulvd_ai_status($1,$2) result',[tenant,actor]);
  assert.equal(aiStatus.remaining,0);
  assert.equal(aiStatus.enabled,false);
  assert.equal('grant_reference' in aiStatus,false);
  await keys(true);
  await assert.rejects(ping(),/INTEGRATION_INACTIVE/);
  assert.equal(await authenticate(), null);
  await keys();
  await db.exec(
    `update public.subscriptions set status='cancelled' where tenant_id='${tenant}'`,
  );
  assert.equal(await authenticate(), null);
  await db.exec(
    `reset role;set role authenticated;select set_config('request.jwt.claim.sub','${outsider}',false);`,
  );
  for (const table of [
    'bot_settings',
    'bot_knowledge',
    'automation_runs',
    'ai_daily_usage',
    'crm_integrations',
    'crm_deliveries',
    'template_drafts',
  ]) {
    assert.equal(
      await q(`select count(*)::int as result from public.${table}`),
      0,
      `RLS: ${table}`,
    );
    await assert.rejects(
      db.exec(`delete from public.${table}`),
      /permission denied/,
    );
  }
  await db.exec('reset role');
  const funcs = (
    await db.query(
      "select oid::regprocedure::text as signature from pg_proc where proname ~ '^soulvd_(studio|automation|ai_|crm_|enqueue_message)' and pronamespace='public'::regnamespace",
    )
  ).rows;
  for (const f of funcs)
    for (const role of ['anon', 'authenticated'])
      assert.equal(
        await q("select has_function_privilege($1,$2,'execute') as result", [
          role,
          f.signature,
        ]),
        false,
        f.signature,
      );
  console.log(
    'PASS: 20 template validations, SSRF filters, tenant isolation, flow quotas, durable automation deduplication, handoff, manual approval, AI budget, template variables/opt-out, paid CRM activation, reference reuse, key revocation, rate limits and webhook recovery.',
  );
} finally {
  await db.close();
}
