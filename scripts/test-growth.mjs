import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import ts from "typescript";
const source = await readFile("src/lib/growth/contacts.ts", "utf8");
const contacts = await import(
  "data:text/javascript;base64," +
    Buffer.from(
      ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
        },
      }).outputText,
    ).toString("base64")
);
for (const value of [
  "0577856389",
  "٥٧٧٨٥٦٣٨٩",
  "+966 57 785 6389",
  "00966577856389",
])
  assert.equal(contacts.contactPhone(value), "966577856389");
for (const value of [
  "=HYPERLINK(1)",
  "1234",
  "966+55555555",
  "5e8",
  "++966577856389",
])
  assert.equal(contacts.contactPhone(value), null);
const preview = contacts.previewContacts(
  contacts.parseContactsFile(
    '\uFEFFname,phone\r\n"Noura, A",0500000001\r\nOther,+966500000001\r\nBad,=SUM(1)\r\n"multi\nline",0500000002',
  ),
  1,
  0,
  true,
);
assert.equal(preview.contacts.length, 2);
assert.equal(preview.duplicates, 1);
assert.deepEqual(preview.invalid, [4]);
assert.equal(preview.contacts[0].name, "Noura, A");
assert.throws(() => contacts.parseContactsFile('name,phone\n"unfinished,05'));
assert.equal(
  contacts.parseContactsFile("name\tphone\nNoura\t0500000001").length,
  2,
);
const db = new PGlite(),
  actor = randomUUID(),
  outsider = randomUUID(),
  owner = randomUUID();
const q = async (sql, args = []) => (await db.query(sql, args)).rows[0]?.result;
const rpc = (name, args = []) =>
  q(
    `select public.${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) result`,
    args,
  );
try {
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,service_role;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');create table public.users(id uuid primary key,email text,full_name text,role text default 'editor' constraint users_role_check check(role in ('owner','editor')));create function public.tg_handle_new_user() returns trigger language plpgsql as $$begin return new;end$$;`,
  );
  for (const name of (await readdir("supabase/migrations"))
    .filter((f) => f.startsWith("2026"))
    .sort())
    await db.exec(await readFile("supabase/migrations/" + name, "utf8"));
  await db.exec(
    `insert into public.users values('${actor}','a@test.invalid','A','merchant'),('${outsider}','b@test.invalid','B','merchant'),('${owner}','p@test.invalid','P','owner');grant select,update on public.users to service_role;set role service_role;`,
  );
  const tenant = await rpc("soulvd_create_contract", [
      actor,
      "Growth QA",
      "starter_v1",
      3,
    ]),
    other = await rpc("soulvd_create_contract", [
      outsider,
      "Other",
      "starter_v1",
      3,
    ]);
  const add = (rows, source = "Checkout opt-in", who = actor) =>
    rpc("soulvd_import_audience", [
      tenant,
      who,
      JSON.stringify(rows),
      "Riyadh",
      source,
    ]);
  assert.deepEqual(
    await add([
      { phone: "966500000001", name: "First" },
      { phone: "966500000002", name: "Second" },
      { phone: "966500000003", name: "Stop" },
    ]),
    { added: 3, existing: 0 },
  );
  assert.deepEqual(
    await add([{ phone: "966500000001", name: "Replacement" }], "replacement"),
    { added: 0, existing: 1 },
  );
  await add([{ phone: "966500000004", name: "No consent" }], "");
  await assert.rejects(
    add([{ phone: "966500000005", name: "bad actor" }], "test", outsider),
    /FORBIDDEN/,
  );
  await assert.rejects(
    add([
      { phone: "966500000006", name: "rollback" },
      { phone: "INVALID", name: "bad" },
    ]),
    /INVALID_IMPORT/,
  );
  assert.equal(
    await q(
      "select count(*)::int result from public.audience_contacts where phone='966500000006'",
    ),
    0,
  );
  await db.exec(
    `insert into public.whatsapp_contacts(tenant_id,wa_id,marketing_opted_out) values('${tenant}','966500000003',true)`,
  );
  const summary = await rpc("soulvd_growth_summary", [tenant, actor]);
  assert.equal(summary.segments[0].eligible, 2);
  const guide = {
    goal: "automation",
    business: "QA",
    recipe: "welcome",
    reply: "Hello",
    knowledge: "Prices",
    need: "",
    system: "",
  };
  await rpc("soulvd_save_guide", [tenant, actor, JSON.stringify(guide)]);
  const campaign = await rpc("soulvd_campaign_save", [
    tenant,
    actor,
    null,
    "Launch",
    "Riyadh",
    null,
    "[]",
  ]);
  await assert.rejects(
    rpc("soulvd_campaign_control", [tenant, actor, campaign, "start"]),
    /SUBSCRIPTION_INACTIVE/,
  );
  await assert.rejects(
    rpc("soulvd_campaign_control", [tenant, outsider, campaign, "start"]),
    /FORBIDDEN/,
  );
  await db.exec(
    `update public.subscriptions set status='active' where tenant_id='${tenant}';`,
  );
  await assert.rejects(
    rpc("soulvd_campaign_control", [tenant, actor, campaign, "start"]),
    /NOT_CONNECTED/,
  );
  const number = randomUUID(),
    template = randomUUID(),
    foreignTemplate = randomUUID();
  await db.exec(
    `insert into public.whatsapp_numbers(id,tenant_id,phone,status) values('${number}','${tenant}','+966500000099','connected');insert into soulvd_private.meta_connections(number_id,waba_id,phone_number_id,encrypted_token,mode,provider) values('${number}','123','456','not-a-real-token','coexistence','ycloud');insert into public.whatsapp_templates(id,tenant_id,name,status,body,category)values('${template}','${tenant}','qa','approved','Hello','MARKETING'),('${foreignTemplate}','${other}','other','approved','Other','MARKETING');`,
  );
  await assert.rejects(
    rpc("soulvd_campaign_save", [
      tenant,
      actor,
      campaign,
      "Launch",
      "Riyadh",
      foreignTemplate,
      "[]",
    ]),
    /NOT_FOUND/,
  );
  await rpc("soulvd_campaign_save", [
    tenant,
    actor,
    campaign,
    "Launch",
    "Riyadh",
    template,
    "[]",
  ]);
  await rpc("soulvd_campaign_control", [tenant, actor, campaign, "start"]);
  assert.equal(
    await q(
      "select count(*)::int result from public.campaign_recipients where campaign_id=$1",
      [campaign],
    ),
    2,
  );
  await assert.rejects(
    rpc("soulvd_campaign_control", [tenant, actor, campaign, "start"]),
    /INVALID_STATE/,
  );
  await db.exec(
    "delete from soulvd_private.messaging_rate_limits;insert into soulvd_private.messaging_rate_limits values('^9665[0-9]{8}$',now()-interval '1 day',now()+interval '1 day',0.0598,'https://example.invalid/rates');",
  );
  const emptyWallet = await rpc("soulvd_campaign_tick");
  assert.equal(emptyWallet.code, "WALLET_INSUFFICIENT");
  assert.equal(
    await q("select state result from public.campaigns where id=$1", [
      campaign,
    ]),
    "paused",
  );
  assert.equal(
    await q("select count(*)::int result from public.whatsapp_messages"),
    0,
  );
  assert.equal(
    await q("select count(*)::int result from soulvd_private.meta_jobs"),
    0,
  );
  await db.exec(
    `insert into public.messaging_wallets(tenant_id,balance_micro) values('${tenant}',100000000) on conflict(tenant_id)do update set balance_micro=excluded.balance_micro;`,
  );
  await rpc("soulvd_campaign_control", [tenant, actor, campaign, "start"]);
  const first = await rpc("soulvd_campaign_tick");
  assert.equal(first.allowed, true);
  assert.ok(first.message_id);
  // Pause preserves remaining recipients. No API transport is called by this test.
  await rpc("soulvd_campaign_control", [tenant, actor, campaign, "pause"]);
  assert.equal(await rpc("soulvd_campaign_tick"), null);
  await rpc("soulvd_campaign_control", [tenant, actor, campaign, "start"]);
  await db.exec(
    `update public.audience_contacts set suppressed=true where id in(select contact_id from public.campaign_recipients where campaign_id='${campaign}' and state='pending')`,
  );
  assert.equal((await rpc("soulvd_campaign_tick")).skipped, true);
  await rpc("soulvd_campaign_tick");
  assert.equal(
    await q("select state result from public.campaigns where id=$1", [
      campaign,
    ]),
    "completed",
  );
  assert.equal(
    await q("select count(*)::int result from soulvd_private.meta_jobs"),
    1,
  );
  const final = await rpc("soulvd_growth_summary", [tenant, actor]);
  assert.equal(final.campaigns[0].queued, 1);
  assert.equal(final.campaigns[0].delivered, 0);
  assert.equal(final.campaigns[0].skipped, 1);
  const roundRobin=[];
  for (const name of ['Rotation A','Rotation B']) {
    const id=await rpc('soulvd_campaign_save',[tenant,actor,null,name,'Riyadh',template,'[]']);
    await rpc('soulvd_campaign_control',[tenant,actor,id,'start']);roundRobin.push(id);
  }
  await rpc('soulvd_campaign_tick');await rpc('soulvd_campaign_tick');
  for(const id of roundRobin) assert.equal(await q("select count(*)::int result from public.campaign_recipients where campaign_id=$1 and state='queued'",[id]),1);
  await assert.rejects(rpc('soulvd_submit_guide',[tenant,actor]),/INVALID_GUIDE/);
  await rpc('soulvd_save_guide',[tenant,actor,JSON.stringify({...guide,goal:'integration',system:'Test CRM',need:'Look up verified order status'})]);
  await rpc('soulvd_submit_guide',[tenant,actor]);
  assert.equal(await q('select submitted_at is not null result from public.workspace_guides where tenant_id=$1',[tenant]),true);
  await rpc('soulvd_save_guide',[tenant,actor,JSON.stringify(guide)]);
  assert.equal(await q('select submitted_at is null result from public.workspace_guides where tenant_id=$1',[tenant]),true);
  const flow = JSON.stringify({
    name: "Welcome",
    status: "draft",
    priority: 100,
    definition: {
      trigger: "all",
      keywords: [],
      action: "text",
      mode: "draft",
      reply: "Hello",
    },
  });
  const fid = await rpc("soulvd_apply_guide", [
    tenant,
    actor,
    flow,
    "Price list",
  ]);
  assert.equal(
    await rpc("soulvd_apply_guide", [tenant, actor, flow, "Updated list"]),
    fid,
  );
  assert.equal(
    await q("select count(*)::int result from public.automation_flows"),
    1,
  );
  assert.equal(
    await q("select count(*)::int result from public.bot_knowledge"),
    1,
  );
  await db.exec(
    `reset role;set role authenticated;select set_config('request.jwt.claim.sub','${outsider}',false);`,
  );
  for (const table of [
    "audience_contacts",
    "campaigns",
    "campaign_recipients",
    "workspace_guides",
  ])
    assert.equal(
      await q(`select count(*)::int result from public.${table}`),
      0,
      table,
    );
  await assert.rejects(
    rpc("soulvd_growth_summary", [tenant, actor]),
    /permission denied/,
  );
  await assert.rejects(
    db.exec(`update public.audience_contacts set suppressed=false`),
    /permission denied/,
  );
  await db.exec("reset role;set role anon;");
  await assert.rejects(
    db.exec("select * from public.audience_contacts"),
    /permission denied/,
  );
  console.log(
    "PASS: CSV normalization/quoting/dedup, transactional import, consent and opt-out preservation, unpaid drafts, cross-tenant permissions, campaign gates/snapshot/pause/resume, wallet rollback, idempotent draft conversion, queued vs delivered, RLS. No provider calls.",
  );
} finally {
  await db.close();
}
