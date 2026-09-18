import { createClient } from "@/lib/supabase/server";
import { provisionWorkspace } from "@/lib/tenancy/provision";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const db = await createClient();
  const code = url.searchParams.get("code");
  const hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  let succeeded = false;
  if (code && code.length < 2048) {
    const result = await db.auth.exchangeCodeForSession(code);
    succeeded = !result.error;
  } else if (
    hash &&
    hash.length < 2048 &&
    (type === "email" || type === "signup")
  ) {
    const result = await db.auth.verifyOtp({ token_hash: hash, type });
    succeeded = !result.error;
  }
  if (succeeded) {
    const {
      data: { user },
    } = await db.auth.getUser();
    if (user) {
      // A provisioning outage must not discard a successful email confirmation.
      try {
        await provisionWorkspace(user);
      } catch {
        /* recover in onboarding */
      }
    }
  }
  return new Response(null, {
    status: 303,
    headers: {
      Location: succeeded
        ? "https://www.soulvd.sa/app"
        : "https://www.soulvd.sa/login?confirmation=failed",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
