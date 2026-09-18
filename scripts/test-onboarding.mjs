import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const compile = async (path, rewrite = (s) => s) => {
  const output = ts.transpileModule(rewrite(await readFile(path, "utf8")), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(
    "data:text/javascript;base64," + Buffer.from(output).toString("base64")
  );
};
const { connectionStage, onboardingPhone, setupProgress } = await compile(
  "src/lib/onboarding/journey.ts",
);
for (const phone of [
  "0500000000",
  "٥٠٠٠٠٠٠٠٠",
  "+966 50 000 0000",
  "00966500000000",
])
  assert.equal(onboardingPhone(phone), "+966500000000");
for (const phone of ["", "12", "+00000000", "abc", "+966;DROP"])
  assert.equal(onboardingPhone(phone), null);
assert.equal(onboardingPhone("+442012345678"), "+442012345678");
const now = Date.parse("2026-09-18T12:00:00Z");
const request = {
  id: "test",
  phone: "+966500000000",
  status: "awaiting_link",
  number_kind: "business_app",
  onboarding_url: null,
  link_expires_at: null,
};
assert.equal(connectionStage(null, false, false, now), "choose");
assert.equal(connectionStage(request, false, false, now), "preparing");
assert.equal(connectionStage(request, false, true, now), "waiting");
assert.equal(
  connectionStage({ ...request, number_kind: "new_number" }, false, true, now),
  "assisted",
);
assert.equal(
  connectionStage({ ...request, status: "review" }, false, true, now),
  "review",
);
assert.equal(
  connectionStage({ ...request, status: "connected" }, false, true, now),
  "disconnected",
  "A stale request cannot claim a live connection",
);
assert.equal(
  connectionStage(request, true, false, now),
  "connected",
  "Existing connected customers remain supported",
);
const authorized = {
  ...request,
  status: "awaiting_customer",
  onboarding_url: "https://www.ycloud.com/onboard/test",
  link_expires_at: new Date(now + 1000).toISOString(),
};
assert.equal(connectionStage(authorized, false, true, now), "authorize");
assert.equal(connectionStage(authorized, false, false, now), "preparing");
assert.equal(connectionStage(authorized, false, true, now + 1000), "expired");
const session = { ...request, status: "awaiting_customer", authorization_method: "assisted" };
assert.equal(connectionStage(session, false, true, now), "session");
assert.equal(connectionStage(session, false, false, now), "preparing");
assert.equal(connectionStage({ ...session, status: "review" }, false, true, now), "review");
assert.equal(setupProgress(false, false, false).count, 1);
assert.deepEqual(setupProgress(true, false, false).completed, [
  true,
  true,
  false,
  false,
]);
assert.equal(setupProgress(true, true, true).count, 4);

let calls = [];
globalThis.__provision = {
  rpc: async (name, args) => {
    calls.push([name, args]);
    return { error: null };
  },
};
const { provisionWorkspace } = await compile(
  "src/lib/tenancy/provision.ts",
  (source) =>
    source
      .replace('import "server-only";', "")
      .replace(
        /import \{ createAdminClient \} from [^;]+;/,
        "const createAdminClient = () => globalThis.__provision;",
      ),
);
const user = {
  id: "server-verified-user",
  user_metadata: {
    business_name: "My business",
    preferred_plan: "starter_v1",
    preferred_months: 12,
  },
};
assert.equal(await provisionWorkspace(user), false);
assert.equal(calls.length, 0, "Unverified email cannot provision");
assert.equal(
  await provisionWorkspace({ ...user, email_confirmed_at: "2026-09-18" }),
  true,
);
assert.equal(calls[0][1].p_actor, user.id);
assert.equal(calls[0][1].p_months, 12);
assert.equal(calls[0][1].p_plan, "starter_v1");
await provisionWorkspace({
  ...user,
  email_confirmed_at: "yes",
  user_metadata: {
    ...user.user_metadata,
    preferred_plan: "admin",
    preferred_months: -1,
    role: "owner",
  },
});
assert.equal(calls[1][1].p_plan, "pro_growth_v1");
assert.equal(calls[1][1].p_months, 3);
assert.equal("role" in calls[1][1], false, "Metadata cannot grant a role");
globalThis.__provision.rpc = async () => ({
  error: { message: "temporary outage" },
});
assert.equal(
  await provisionWorkspace({ ...user, email_confirmed_at: "yes" }),
  false,
);
delete globalThis.__provision;
console.log(
  "PASS: onboarding phone formats, truthful state transitions, stale/expired links, preparation checklist and confirmed-email provisioning boundaries",
);
