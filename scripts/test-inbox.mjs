import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import ts from "typescript";
const historySource = ts.transpileModule(
  await readFile("src/lib/inbox/history.ts", "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const { mergeRecentMessages } = await import(
  "data:text/javascript;base64," + Buffer.from(historySource).toString("base64")
);
const msg = (id, time, status = "received") => ({
  id,
  created_at: new Date(time).toISOString(),
  status,
});
const initial = [msg("a", 1000), msg("b", 2000)];
assert.deepEqual(
  mergeRecentMessages(initial, [
    msg("b", 2000, "read"),
    msg("c", 3000),
  ]).messages.map((m) => [m.id, m.status]),
  [
    ["a", "received"],
    ["b", "read"],
    ["c", "received"],
  ],
);
assert.equal(
  mergeRecentMessages(initial, [msg("c", 3000), msg("d", 4000)], 2).reset,
  true,
  "A missed full page must restart the window to keep older cursors contiguous",
);
assert.equal(mergeRecentMessages(initial, [msg("c", 3000)]).reset, false);
const db = new PGlite();
const actor = randomUUID(),
  peer = randomUUID(),
  outsider = randomUUID(),
  tenant = randomUUID(),
  other = randomUUID(),
  number = randomUUID(),
  contact = randomUUID(),
  old = randomUUID(),
  out = randomUUID();
const q = async (sql, args = []) => (await db.query(sql, args)).rows[0]?.result;
const role = async (user) =>
  db.exec(
    `reset role;set request.jwt.claim.sub='${user}';set role authenticated;`,
  );
const counts = () =>
  q("select public.soulvd_inbox_counts($1) result", [tenant]);
const mark = (id) =>
  q("select public.soulvd_read_inbox($1,$2) result", [tenant, id]);
const add = async (
  id,
  direction = "inbound",
  created = new Date().toISOString(),
  c = contact,
) =>
  db.query(
    "insert into public.whatsapp_messages(id,tenant_id,contact_id,number_id,direction,kind,body,status,created_at,meta_message_id) values($1,$2,$3,$4,$5,'text','Fixture message',$6,$7,$8)",
    [
      id,
      tenant,
      c,
      number,
      direction,
      direction === "inbound" ? "received" : "sent",
      created,
      id,
    ],
  );
try {
  await db.exec(
    `set timezone='UTC';create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,service_role;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');create table public.users(id uuid primary key,email text,full_name text,role text default 'editor' constraint users_role_check check(role in ('owner','editor')));create function public.tg_handle_new_user() returns trigger language plpgsql as $$begin return new;end$$;`,
  );
  const migration = "20260918005715_inbox_experience.sql";
  for (const name of (await readdir("supabase/migrations"))
    .filter((n) => n.startsWith("2026") && n !== migration)
    .sort())
    await db.exec(await readFile("supabase/migrations/" + name, "utf8"));
  await db.exec(
    `insert into public.users(id,email,role) values('${actor}','one@test.invalid','merchant'),('${peer}','two@test.invalid','merchant'),('${outsider}','other@test.invalid','merchant');insert into public.tenants(id,name) values('${tenant}','Fixture'),('${other}','Other');insert into public.tenant_members values('${tenant}','${actor}','owner'),('${tenant}','${peer}','agent'),('${other}','${outsider}','owner');insert into public.whatsapp_numbers(id,tenant_id,phone) values('${number}','${tenant}','+966500000000');insert into public.whatsapp_contacts(id,tenant_id,wa_id) values('${contact}','${tenant}','966511111111');`,
  );
  await add(old, "inbound", "2026-09-01T00:00:00Z");
  await add(out, "outbound", "2026-09-02T00:00:00Z");
  await db.exec(await readFile("supabase/migrations/" + migration, "utf8"));
  await role(actor);
  assert.deepEqual(await counts(), { unread: 1, incoming: 1 });
  assert.equal(
    await q(
      "select last_message_id result from public.inbox_overview where contact_id=$1",
      [contact],
    ),
    out,
  );
  await mark(old);
  assert.deepEqual(await counts(), { unread: 0, incoming: 1 });
  await role(peer);
  assert.equal((await counts()).unread, 1, "Read state must be per employee");
  await role(outsider);
  assert.deepEqual(await counts(), { unread: 0, incoming: 0 });
  assert.equal(
    await q("select count(*)::int result from public.inbox_overview"),
    0,
  );
  await assert.rejects(mark(old), /NOT_FOUND/);
  await db.exec("reset role");
  const next = randomUUID(),
    newest = randomUUID();
  await add(next);
  await add(newest);
  await role(actor);
  await mark(next);
  assert.equal(
    (await counts()).unread,
    1,
    "Arrivals after displayed cursor must stay unread",
  );
  await mark(old);
  assert.equal(
    (await counts()).unread,
    1,
    "An old device must never regress the cursor",
  );
  await assert.rejects(
    db.query("update public.inbox_reads set user_id=$1", [peer]),
    /row-level security/,
  );
  await assert.rejects(
    db.query(
      "insert into public.inbox_reads(tenant_id,contact_id,user_id,read_seq) values($1,$2,$3,99)",
      [tenant, contact, peer],
    ),
    /row-level security/,
  );
  await assert.rejects(
    db.query("update public.inbox_threads set inbound_count=0"),
    /permission denied/,
  );
  await db.exec("reset role");
  await db.query(
    "update public.whatsapp_messages set status='read' where id=$1",
    [out],
  );
  await role(actor);
  assert.equal(
    (await counts()).incoming,
    3,
    "Receipts cannot increase incoming counters",
  );
  await db.exec("reset role");
  await db.query(
    "insert into public.whatsapp_messages(id,tenant_id,contact_id,number_id,direction,kind,body,status,meta_message_id) values($1,$2,$3,$4,'inbound','text','Duplicate','received',$5) on conflict(meta_message_id) do nothing",
    [randomUUID(), tenant, contact, number, newest],
  );
  await role(actor);
  assert.equal(
    (await counts()).incoming,
    3,
    "Provider replay cannot double-count",
  );
  await db.exec("reset role");
  const backdated = randomUUID();
  await add(backdated, "inbound", "2026-08-01T00:00:00Z");
  await role(actor);
  assert.notEqual(
    await q(
      "select last_message_id result from public.inbox_overview where contact_id=$1",
      [contact],
    ),
    backdated,
    "Late old messages cannot reorder latest summary",
  );
  await mark(backdated);
  assert.equal((await counts()).unread, 0);
  await db.exec("reset role");
  // More than the old global 100-message limit; ties exercise UUID cursor ordering.
  const timestamp = "2026-09-18T00:00:00Z";
  for (let i = 0; i < 115; i++) await add(randomUUID(), "inbound", timestamp);
  await role(actor);
  let cursor = null,
    seen = new Set();
  do {
    const rows = (
      await db.query(
        `select id,created_at from public.whatsapp_messages where tenant_id=$1 and contact_id=$2 ${cursor ? "and (created_at,id)<($3::timestamptz,$4::uuid)" : ""} order by created_at desc,id desc limit 50`,
        cursor
          ? [tenant, contact, cursor.created_at, cursor.id]
          : [tenant, contact],
      )
    ).rows;
    if (!rows.length) break;
    for (const row of rows) {
      assert.ok(!seen.has(row.id));
      seen.add(row.id);
    }
    cursor = rows.at(-1);
  } while (true);
  assert.equal(seen.size, 120);
  assert.equal((await counts()).incoming, 119);
  await db.exec("reset role");
  await db.query(
    "delete from public.tenant_members where tenant_id=$1 and user_id=$2",
    [tenant, actor],
  );
  await role(actor);
  assert.equal((await counts()).unread, 0);
  await assert.rejects(mark(newest), /NOT_FOUND/);
  await db.exec("reset role;set role anon");
  await assert.rejects(
    db.query("select * from public.inbox_overview"),
    /permission denied/,
  );
  await assert.rejects(counts(), /permission denied/);
  // Exercise actual route auth and input boundaries without making network requests.
  globalThis.inboxFixture = { user: null, context: null };
  const source = (await readFile("src/app/api/inbox/route.ts", "utf8"))
    .replace(
      /import \{ NextResponse \} from "next\/server";/,
      `import {NextResponse} from ${JSON.stringify(import.meta.resolve("next/server.js"))};`,
    )
    .replace(/from "zod"/, `from ${JSON.stringify(import.meta.resolve("zod"))}`)
    .replace(
      /import \{ createClient \} from "@\/lib\/supabase\/server";/,
      "const createClient=async()=>({auth:{getUser:async()=>({data:{user:globalThis.inboxFixture.user}})}});",
    )
    .replace(
      /import \{ tenantContext \} from "@\/lib\/tenancy\/context";/,
      "const tenantContext=async()=>globalThis.inboxFixture.context;",
    );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const route = await import(
    "data:text/javascript;base64," + Buffer.from(compiled).toString("base64")
  );
  const get = (query) =>
    route.GET(new Request("https://soulvd.test/api/inbox?" + query));
  assert.equal((await get("tenant=bad")).status, 400);
  assert.equal((await get("tenant=" + tenant)).status, 401);
  globalThis.inboxFixture.user = { id: actor };
  globalThis.inboxFixture.context = { tenantId: other };
  assert.equal((await get("tenant=" + tenant)).status, 403);
  assert.equal(
    (await get("tenant=" + tenant + "&phone=1,tenant_id.eq.other")).status,
    400,
  );
  assert.equal(
    (await get("tenant=" + tenant + "&threadCursor=invalid")).status,
    400,
  );
  delete globalThis.inboxFixture;
  console.log(
    "PASS: inbox backfill, per-employee cursors, RLS and removed membership, receipt/replay stability, delayed events, 120-message pagination, HTTP authentication/tenant/input boundaries.",
  );
} finally {
  await db.close();
}
