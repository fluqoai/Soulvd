import { createClient } from "@/lib/supabase/server";
import { provisionWorkspace } from "@/lib/tenancy/provision";
import { invitationPath } from '@/lib/auth/return-path';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const db = await createClient();
  const code = url.searchParams.get("code");
  const hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  let returnTo = invitationPath(url.searchParams.get('next'));
  // The confirmation template passes the allowlisted signup destination.
  // Only an invitation path on our own origin can affect navigation.
  const destination = url.searchParams.get('redirect_to');
  if (!returnTo && destination) {
    try {
      const target = new URL(destination);
      if (target.origin === 'https://www.soulvd.sa' && target.pathname === '/api/auth/confirm')
        returnTo = invitationPath(target.searchParams.get('next'));
    } catch { /* Untrusted redirect destinations are ignored. */ }
  }
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
    if (user && !returnTo) {
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
        ? 'https://www.soulvd.sa' + (returnTo ?? '/app')
        : "https://www.soulvd.sa/login?confirmation=failed",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
