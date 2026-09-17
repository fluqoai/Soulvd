import "server-only";
import { createClient } from "@/lib/supabase/server";
export async function signupsReady() {
  const db = await createClient();
  const { data, error } = await db
    .from("platform_launch_settings")
    .select("signup_ready")
    .eq("id", true)
    .single();
  return !error && data?.signup_ready === true;
}
