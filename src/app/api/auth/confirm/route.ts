import { createClient } from "@/lib/supabase/server";

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
