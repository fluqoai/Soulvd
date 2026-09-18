import "server-only";
import { createClient } from "@/lib/supabase/server";
import { cache } from "react";
export const launchSettings = cache(async function launchSettings() {
  const db = await createClient();
  const { data, error } = await db
    .from("platform_launch_settings")
    .select("signup_ready,payments_ready,onboarding_ready")
    .eq("id", true)
    .single();
  if (error) throw new Error("تعذر تحميل حالة التسجيل. حاول مجددًا بعد قليل.");
  return {
    signup: data?.signup_ready === true,
    payments: data?.payments_ready === true,
    onboarding: data?.onboarding_ready === true,
  };
});
export async function signupsReady() {
  return (await launchSettings()).signup;
}
