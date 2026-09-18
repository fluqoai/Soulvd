import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite(),
  owner = randomUUID(),
  merchant = randomUUID(),
  outsider = randomUUID();
const q = async (sql, args = []) => (await db.query(sql, args)).rows[0]?.result;
const rpc = async (name, args = []) =>
  q(
    `select public.${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) as result`,
    args,
  );
try {
  await db.exec(`set timezone='UTC';create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated,service_role;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
 create table public.users(id uuid primary key,email text,full_name text,role text default 'editor' constraint users_role_check check(role in ('owner','editor')));
 create function public.tg_handle_new_user() returns trigger language plpgsql as $$begin return new;end$$;`);
  for (const name of (await readdir("supabase/migrations"))
    .filter((f) => f.startsWith("2026"))
    .sort()) {
    try {
      await db.exec(await readFile("supabase/migrations/" + name, "utf8"));
    } catch (error) {
      throw new Error(name + ": " + error.message);
    }
  }
  await db.exec(
    `insert into public.users values('${owner}','platform@test.invalid','Platform','owner'),('${merchant}','merchant@test.invalid','Merchant','merchant'),('${outsider}','other@test.invalid','Other','merchant'); grant select,update on public.users to service_role;set role service_role;`,
  );
  assert.equal(await rpc("soulvd_term_price", ["starter_v1", 3]), 89700);
  assert.equal(await rpc("soulvd_term_price", ["pro_growth_v1", 6]), 239400);
  assert.equal(await rpc("soulvd_term_price", ["starter_v1", 12]), 299000);
  assert.equal(await rpc("soulvd_term_price", ["pro_growth_v1", 12]), 399000);
  const reviewSpace = await rpc("soulvd_meta_review_workspace", [owner]);
  const testCredit = randomUUID();
  await assert.rejects(
    rpc("soulvd_test_wallet_credit", [merchant, reviewSpace, testCredit, 100]),
    /TEST_STAFF_ONLY/,
  );
  await rpc("soulvd_test_wallet_credit", [owner, reviewSpace, testCredit, 100]);
  await rpc("soulvd_test_wallet_credit", [owner, reviewSpace, testCredit, 100]);
  assert.equal(
    await q(
      "select balance_micro::text result from public.messaging_wallets where tenant_id=$1",
      [reviewSpace],
    ),
    "1000000",
  );
  await assert.rejects(
    rpc("soulvd_test_wallet_credit", [owner, reviewSpace, testCredit, 200]),
    /REFERENCE_ALREADY_USED/,
  );
  await assert.rejects(
    rpc("soulvd_test_wallet_credit", [owner, reviewSpace, randomUUID(), 500]),
    /TEST_BUDGET_LIMIT/,
  );
  await assert.rejects(
    rpc("soulvd_create_contract", [merchant, "Test", "starter_v1", 1]),
    /INVALID_TERM/,
  );
  await assert.rejects(
    rpc("soulvd_create_contract", [owner, "Test", "starter_v1", 3]),
    /FORBIDDEN/,
  );
  const tenant = await rpc("soulvd_create_contract", [
    merchant,
    "Commerce test",
    "starter_v1",
    12,
  ]);
  assert.equal(
    await rpc("soulvd_create_contract", [
      merchant,
      "Duplicate",
      "starter_v1",
      3,
    ]),
    tenant,
  );
  const other = await rpc("soulvd_create_contract", [
    outsider,
    "Other",
    "starter_v1",
    3,
  ]);
  // New customers can prepare their workspace before commercial launch,
  // but neither a pending contract nor a saved phone grants paid access.
  assert.equal(
    await q(
      "select status result from public.subscriptions where tenant_id=$1",
      [tenant],
    ),
    "pending",
  );
  await assert.rejects(
    rpc("soulvd_request_payment", [merchant, tenant, "subscription", null]),
    /PAYMENTS_NOT_READY/,
  );
  await assert.rejects(
    rpc("soulvd_request_payment", [merchant, tenant, "wallet", 5000]),
    /PAYMENTS_NOT_READY/,
  );
  await assert.rejects(
    rpc("soulvd_set_launch_phase", [merchant, true, true, true]),
    /FORBIDDEN/,
  );
  await assert.rejects(
    rpc("soulvd_set_launch_phase", [owner, true, true, false]),
    /ONBOARDING_REQUIRED_BEFORE_PAYMENTS/,
  );
  const prepared = await rpc("soulvd_prepare_connection", [
    merchant,
    tenant,
    "+966500000009",
    "business_app",
  ]);
  assert.equal(
    await rpc("soulvd_prepare_connection", [
      merchant,
      tenant,
      "+966500000009",
      "business_app",
    ]),
    prepared,
  );
  await assert.rejects(
    rpc("soulvd_prepare_connection", [
      outsider,
      tenant,
      "+966500000009",
      "business_app",
    ]),
    /FORBIDDEN/,
  );
  await assert.rejects(
    rpc("soulvd_prepare_connection", [
      merchant,
      tenant,
      "+966500000008",
      "business_app",
    ]),
    /OPEN_CONNECTION_REQUEST/,
  );
  await assert.rejects(
    rpc("soulvd_onboarding_link", [
      owner,
      prepared,
      "https://www.ycloud.com/onboard/test",
    ]),
    /ONBOARDING_NOT_READY/,
  );
  await rpc("soulvd_restart_connection", [merchant, tenant, prepared]);
  const newNumber = await rpc("soulvd_prepare_connection", [
    merchant,
    tenant,
    "+966500000009",
    "new_number",
  ]);
  await rpc("soulvd_set_launch_phase", [owner, true, false, true]);
  await assert.rejects(
    rpc("soulvd_onboarding_link", [
      owner,
      newNumber,
      "https://www.ycloud.com/onboard/test",
    ]),
    /COEXISTENCE_REQUEST_REQUIRED/,
  );
  await rpc("soulvd_restart_connection", [merchant, tenant, newNumber]);
  const retry = await rpc("soulvd_prepare_connection", [
    merchant,
    tenant,
    "+966500000009",
    "business_app",
  ]);
  await rpc("soulvd_onboarding_link", [
    owner,
    retry,
    "https://www.ycloud.com/onboard/test",
  ]);
  await assert.rejects(
    rpc("soulvd_restart_connection", [merchant, tenant, retry]),
    /CONNECTION_ALREADY_STARTED/,
  );
  await assert.rejects(
    rpc("soulvd_renew_connection_link", [merchant, tenant, retry]),
    /LINK_NOT_EXPIRED/,
  );
  await db.query(
    "update public.whatsapp_onboarding_requests set link_expires_at=now()-interval '1 minute' where id=$1",
    [retry],
  );
  await assert.rejects(
    rpc("soulvd_onboarding_ready", [merchant, tenant, retry]),
    /LINK_EXPIRED_OR_NOT_READY/,
  );
  await assert.rejects(
    rpc("soulvd_renew_connection_link", [outsider, tenant, retry]),
    /FORBIDDEN/,
  );
  await rpc("soulvd_renew_connection_link", [merchant, tenant, retry]);
  assert.equal(
    await q(
      "select onboarding_url result from public.whatsapp_onboarding_requests where id=$1",
      [retry],
    ),
    null,
  );
  await rpc("soulvd_restart_connection", [merchant, tenant, retry]);
  // The following original launch tests run against the enabled commercial phase.
  await rpc("soulvd_set_launch_phase", [owner, true, true, true]);
  await assert.rejects(
    rpc("soulvd_request_payment", [outsider, tenant, "subscription", null]),
    /FORBIDDEN/,
  );
  const payment = await rpc("soulvd_request_payment", [
    merchant,
    tenant,
    "subscription",
    null,
  ]);
  assert.equal(
    payment,
    await rpc("soulvd_request_payment", [
      merchant,
      tenant,
      "subscription",
      null,
    ]),
  );
  await assert.rejects(
    rpc("soulvd_select_unpaid_contract", [
      merchant,
      tenant,
      "pro_growth_v1",
      3,
    ]),
    /OPEN_PAYMENT_REQUEST/,
  );
  await rpc("soulvd_submit_payment", [
    merchant,
    tenant,
    payment,
    "bank-subscription",
  ]);
  await assert.rejects(
    rpc("soulvd_confirm_payment", [
      merchant,
      payment,
      "bank-subscription",
      299000,
    ]),
    /FORBIDDEN/,
  );
  await assert.rejects(
    rpc("soulvd_confirm_payment", [owner, payment, "bank-subscription", 29900]),
    /AMOUNT_OR_REFERENCE_MISMATCH/,
  );
  await rpc("soulvd_confirm_payment", [
    owner,
    payment,
    "bank-subscription",
    299000,
  ]);
  const before = await q(
    "select to_jsonb(s) result from public.subscriptions s where tenant_id=$1",
    [tenant],
  );
  assert.equal(before.status, "active");
  assert.equal(before.billing_months, 12);
  await rpc("soulvd_confirm_payment", [
    owner,
    payment,
    "bank-subscription",
    299000,
  ]);
  assert.deepEqual(
    await q(
      "select to_jsonb(s) result from public.subscriptions s where tenant_id=$1",
      [tenant],
    ),
    before,
  );
  await assert.rejects(
    rpc("soulvd_request_payment", [merchant, tenant, "subscription", null]),
    /CYCLE_STILL_ACTIVE/,
  );
  assert.equal(
    await q(
      "select public.soulvd_usage_month('2024-01-31 13:00Z','2025-01-31 13:00Z','2024-02-29 13:00Z')::text result",
    ),
    "2024-02-29 13:00:00+00",
  );
  assert.equal(
    await q(
      "select public.soulvd_usage_month('2024-01-31 13:00Z','2025-01-31 13:00Z','2024-03-30 13:00Z')::text result",
    ),
    "2024-02-29 13:00:00+00",
  );
  await db.query(
    "update public.subscriptions set period_start=now()-interval '2 months',period_end=now()+interval '10 months' where tenant_id=$1",
    [tenant],
  );
  const allowance = await rpc("soulvd_consume_conversation", [
    tenant,
    "wa:966511111111",
  ]);
  assert.equal(allowance.newConversation, true);
  assert.equal(
    (await rpc("soulvd_consume_conversation", [tenant, "wa:966511111111"]))
      .newConversation,
    false,
  );
  assert.ok(
    await q(
      "select (period_start>(select period_start from public.subscriptions where tenant_id=$1)) result from public.usage_counters where tenant_id=$1",
      [tenant],
    ),
  );
  const upgrade = await rpc("soulvd_request_payment", [
    merchant,
    tenant,
    "upgrade",
    null,
  ]);
  const price = await q(
    "select amount_halalas result from public.payment_requests where id=$1",
    [upgrade],
  );
  assert.ok(price > 0 && price < 100000);
  await rpc("soulvd_submit_payment", [
    merchant,
    tenant,
    upgrade,
    "bank-upgrade",
  ]);
  await rpc("soulvd_confirm_payment", [owner, upgrade, "bank-upgrade", price]);
  assert.equal(
    await q(
      "select plan_id result from public.subscriptions where tenant_id=$1",
      [tenant],
    ),
    "pro_growth_v1",
  );
  assert.equal(
    (await rpc("soulvd_consume_conversation", [tenant, "wa:966511111111"]))
      .used,
    1,
  );
  const topup = await rpc("soulvd_request_payment", [
    merchant,
    tenant,
    "wallet",
    10000,
  ]);
  await rpc("soulvd_submit_payment", [merchant, tenant, topup, "bank-wallet"]);
  await rpc("soulvd_confirm_payment", [owner, topup, "bank-wallet", 10000]);
  await rpc("soulvd_confirm_payment", [owner, topup, "bank-wallet", 10000]);
  assert.equal(
    await q(
      "select balance_micro::text result from public.messaging_wallets where tenant_id=$1",
      [tenant],
    ),
    "105000000",
  );
  const otherTopup = await rpc("soulvd_request_payment", [
    outsider,
    other,
    "wallet",
    10000,
  ]);
  await rpc("soulvd_submit_payment", [
    outsider,
    other,
    otherTopup,
    "bank-wallet",
  ]);
  await assert.rejects(
    rpc("soulvd_confirm_payment", [owner, otherTopup, "bank-wallet", 10000]),
    /REFERENCE_ALREADY_USED/,
  );
  // One transfer, separate accounting; no credit before verified receipt.
  await assert.rejects(rpc("soulvd_request_payment", [outsider, other, "subscription", 4999]), /INVALID_AMOUNT/);
  const oldBundle = await rpc("soulvd_request_payment", [outsider, other, "subscription", 10000]);
  const bundle = await rpc("soulvd_request_payment", [outsider, other, "subscription", 5000]);
  assert.notEqual(oldBundle, bundle);
  assert.equal(await q("select status result from public.payment_requests where id=$1", [oldBundle]), "cancelled");
  assert.equal(await q("select amount_halalas result from public.payment_requests where id=$1", [bundle]), 94700);
  assert.equal(await q("select wallet_amount_halalas result from public.payment_requests where id=$1", [bundle]), 5000);
  assert.equal(await q("select welcome_amount_halalas result from public.payment_requests where id=$1", [bundle]), 500);
  assert.equal(await q("select count(*)::int result from public.wallet_ledger where tenant_id=$1", [other]), 0);
  await rpc("soulvd_submit_payment", [outsider, other, bundle, "bank-bundle"]);
  await assert.rejects(rpc("soulvd_confirm_payment", [owner, bundle, "bank-bundle", 89700]), /AMOUNT_OR_REFERENCE_MISMATCH/);
  await rpc("soulvd_confirm_payment", [owner, bundle, "bank-bundle", 94700]);
  await rpc("soulvd_confirm_payment", [owner, bundle, "bank-bundle", 94700]);
  assert.equal(await q("select balance_micro::text result from public.messaging_wallets where tenant_id=$1", [other]), "55000000");
  assert.equal(await q("select count(*)::int result from public.wallet_ledger where tenant_id=$1", [other]), 2);
  // Renewal never repeats the welcome credit.
  await db.query("update public.subscriptions set period_start=now()-interval '4 months',period_end=now()-interval '1 month' where tenant_id=$1", [other]);
  const renewal = await rpc("soulvd_request_payment", [outsider, other, "subscription", null]);
  assert.equal(await q("select welcome_amount_halalas result from public.payment_requests where id=$1", [renewal]), 0);
  await rpc("soulvd_submit_payment", [outsider, other, renewal, "bank-renewal"]);
  await rpc("soulvd_confirm_payment", [owner, renewal, "bank-renewal", 89700]);
  assert.equal(await q("select balance_micro::text result from public.messaging_wallets where tenant_id=$1", [other]), "55000000");
  const request = await rpc("soulvd_onboarding_request", [
    merchant,
    tenant,
    "+966500000000",
  ]);
  await assert.rejects(
    rpc("soulvd_onboarding_link", [
      outsider,
      request,
      "https://www.ycloud.com/onboard/example",
    ]),
    /FORBIDDEN/,
  );
  await assert.rejects(
    rpc("soulvd_onboarding_link", [
      owner,
      request,
      "https://ycloud.com.evil.invalid/link",
    ]),
    /INVALID_ONBOARDING_URL/,
  );
  await rpc("soulvd_onboarding_link", [
    owner,
    request,
    "https://www.ycloud.com/onboard/example",
  ]);
  await assert.rejects(
    rpc("soulvd_onboarding_ready", [outsider, tenant, request]),
    /FORBIDDEN/,
  );
  await rpc("soulvd_onboarding_ready", [merchant, tenant, request]);
  const asset = {
    id: "1234567890",
    wabaId: "999999999",
    phoneNumber: "+966500000000",
    status: "CONNECTED",
    isOnBizApp: true,
  };
  await assert.rejects(
    rpc("soulvd_onboarding_bind", [
      owner,
      request,
      { ...asset, isOnBizApp: false },
    ]),
    /PROVIDER_NUMBER_NOT_READY/,
  );
  const number = await rpc("soulvd_onboarding_bind", [owner, request, asset]);
  assert.equal(
    number,
    await rpc("soulvd_onboarding_bind", [owner, request, asset]),
  );
  assert.equal(
    await q(
      "select count(*)::int result from public.tenant_members where tenant_id=$1",
      [tenant],
    ),
    1,
  );
  await db.exec("reset role");
  await db.query(
    "delete from soulvd_private.messaging_rate_limits where valid_from<>(select min(valid_from) from soulvd_private.messaging_rate_limits)",
  );
  await db.query(
    "update soulvd_private.messaging_rate_limits set valid_from=now()-interval '1 day',valid_until=now()+interval '1 day'",
  );
  await db.query(
    "insert into public.whatsapp_contacts(tenant_id,wa_id,last_inbound_at) values($1,'966511111111',now())",
    [tenant],
  );
  await db.exec("set role service_role");
  const send = async (requestId = randomUUID(), to = "966511111111") =>
    rpc("soulvd_enqueue_message", [
      tenant,
      merchant,
      requestId,
      "message",
      to,
      "Test message",
      null,
      false,
      [],
    ]);
  const first = await send();
  assert.equal(first.allowed, true);
  assert.equal(
    await q(
      "select held_micro::text result from public.messaging_wallets where tenant_id=$1",
      [tenant],
    ),
    "257888",
  );
  await rpc("soulvd_meta_claim", [first.id]);
  const event = {
    id: "provider-first",
    wabaId: asset.wabaId,
    from: asset.phoneNumber,
    to: "+966511111111",
    externalId: first.id,
    status: "delivered",
    totalPrice: 0.05,
    currency: "USD",
  };
  await rpc("soulvd_settle_message", [{ ...event, from: "+966500000999" }]);
  assert.equal(
    await q(
      "select count(*)::int result from public.wallet_ledger where kind='message'",
    ),
    0,
  );
  await rpc("soulvd_settle_message", [{ ...event, currency: "SAR" }]);
  assert.equal(
    await q(
      "select count(*)::int result from public.wallet_ledger where kind='message'",
    ),
    0,
  );
  await rpc("soulvd_settle_message", [event]);
  await rpc("soulvd_meta_finish", [
    first.id,
    "accepted",
    "ycloud:provider-first",
    null,
  ]);
  await rpc("soulvd_settle_message", [event]);
  await rpc("soulvd_settle_message", [{ ...event, status: "read" }]);
  await rpc("soulvd_settle_message", [{ ...event, status: "failed" }]);
  assert.equal(
    await q(
      "select count(*)::int result from public.wallet_ledger where kind='message'",
    ),
    1,
  );
  assert.equal(
    await q(
      "select balance_micro::text result from public.messaging_wallets where tenant_id=$1",
      [tenant],
    ),
    "104784375",
  );
  assert.equal(
    await q(
      "select held_micro::text result from public.messaging_wallets where tenant_id=$1",
      [tenant],
    ),
    "0",
  );
  const next = await send();
  await db.exec("reset role");
  await db.query(
    "update soulvd_private.meta_jobs set claimed_at=now()-interval '5 seconds' where id=$1",
    [first.id],
  );
  await db.exec("set role service_role");
  await rpc("soulvd_meta_claim", [next.id]);
  await rpc("soulvd_meta_finish", [next.id, "unknown", null, "TIMEOUT"]);
  assert.equal(
    await q(
      "select held_micro::text result from public.messaging_wallets where tenant_id=$1",
      [tenant],
    ),
    "257888",
  );
  await rpc("soulvd_settle_message", [
    { ...event, id: "provider-next", externalId: next.id, totalPrice: 0 },
  ]);
  assert.equal(
    await q(
      "select held_micro::text result from public.messaging_wallets where tenant_id=$1",
      [tenant],
    ),
    "0",
  );
  const snapshot = await q(
    "select count(*)::int result from public.whatsapp_messages where direction='outbound'",
  );
  await db.exec("reset role");
  await db.query(
    "update public.messaging_wallets set balance_micro=0 where tenant_id=$1",
    [tenant],
  );
  await db.exec("set role service_role");
  await assert.rejects(send(), /WALLET_INSUFFICIENT/);
  assert.equal(
    await q(
      "select count(*)::int result from public.whatsapp_messages where direction='outbound'",
    ),
    snapshot,
  );
  // A contact timestamp alone is insufficient: require a received message on this number.
  await db.exec("reset role");
  await db.query("update soulvd_private.free_reply_policy set valid_from=now()-interval '1 day',valid_until=now()+interval '1 day'");
  await db.query(`insert into public.whatsapp_messages(tenant_id,contact_id,number_id,direction,kind,body,status,meta_message_id)
    select $1,id,$2,'inbound','text','Test inbound','received','ycloud:verified-inbound' from public.whatsapp_contacts where tenant_id=$1 and wa_id='966511111111'`, [tenant, number]);
  await db.query("update soulvd_private.meta_jobs set claimed_at=now()-interval '10 seconds' where number_id=$1 and claimed_at is not null", [number]);
  await db.exec("set role service_role");
  const free = await send();
  assert.equal(await q("select held_micro::text result from soulvd_private.message_holds where job_id=$1", [free.id]), "0");
  assert.ok(await rpc("soulvd_meta_claim", [free.id]));
  await rpc("soulvd_meta_finish", [free.id, "accepted", "ycloud:free", null]);
  await rpc("soulvd_settle_message", [{...event, id:"free", externalId:free.id, totalPrice:0}]);
  assert.equal(await q("select charged_micro::text result from soulvd_private.message_holds where job_id=$1", [free.id]), "0");
  assert.equal(await q("select balance_micro::text result from public.messaging_wallets where tenant_id=$1", [tenant]), "0");
  const delayed = await send();
  await db.query("update soulvd_private.meta_jobs set claimed_at=now()-interval '10 seconds' where number_id=$1 and claimed_at is not null", [number]);
  await db.query("update soulvd_private.free_reply_policy set valid_until=now()-interval '1 second'");
  assert.equal(await rpc("soulvd_meta_claim", [delayed.id]), null);
  assert.equal(await q("select error_code result from soulvd_private.meta_jobs where id=$1", [delayed.id]), "WALLET_INSUFFICIENT");
  assert.equal(await q("select state result from soulvd_private.message_holds where job_id=$1", [delayed.id]), "released");
  await assert.rejects(send(), /WALLET_INSUFFICIENT/);
  await db.exec("reset role");
  await db.query(
    "update soulvd_private.messaging_rate_limits set valid_until=now()-interval '1 second'",
  );
  await db.exec("set role service_role");
  await assert.rejects(send(), /WALLET_RATE_UNAVAILABLE/);
  await db.exec(
    `reset role;set request.jwt.claim.sub='${outsider}';set role authenticated;`,
  );
  assert.equal(
    await q(
      "select count(*)::int result from public.wallet_ledger where tenant_id=$1",
      [tenant],
    ),
    0,
  );
  assert.equal(
    await q(
      "select count(*)::int result from public.whatsapp_onboarding_requests where tenant_id=$1",
      [tenant],
    ),
    0,
  );
  await assert.rejects(
    db.query("update public.messaging_wallets set balance_micro=999999"),
    /permission denied/,
  );
  await db.exec("reset role");
  for (const name of [
    "soulvd_confirm_payment(uuid,uuid,text,integer)",
    "soulvd_settle_message(jsonb)",
    "soulvd_onboarding_bind(uuid,uuid,jsonb)",
    "soulvd_request_payment(uuid,uuid,text,integer)",
  ]) {
    for (const role of ["anon", "authenticated"])
      assert.equal(
        await q("select has_function_privilege($1,$2,'execute') result", [
          role,
          "public." + name,
        ]),
        false,
      );
  }
  console.log(
    "PASS: launch migrations, term prices, monthly allowances, upgrade preservation, payment verification/replays, wallet reservations/settlement/reordering/fail-closed, onboarding ownership and RLS",
  );
} catch (error) {
  console.error(
    error.message,
    error.where ?? "",
    error.stack?.split("\n").find((line) => line.includes("test-launch.mjs")) ??
      "",
  );
  process.exitCode = 1;
} finally {
  await db.close();
}
