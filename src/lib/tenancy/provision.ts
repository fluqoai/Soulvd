import "server-only";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

// Metadata supplies preferences only. The RPC verifies the trusted profile role
// and returns an existing membership under a row lock; it grants no paid access.
export async function provisionWorkspace(user: User) {
  if (!user.email_confirmed_at) return false;
  const name =
    typeof user.user_metadata?.business_name === "string"
      ? user.user_metadata.business_name.trim()
      : "";
  if (!name || name.length > 120) return false;
  const { error } = await createAdminClient().rpc("soulvd_create_contract", {
    p_actor: user.id,
    p_name: name,
    p_plan:
      user.user_metadata?.preferred_plan === "starter_v1"
        ? "starter_v1"
        : "pro_growth_v1",
    p_months: [3, 6, 12].includes(Number(user.user_metadata?.preferred_months))
      ? Number(user.user_metadata.preferred_months)
      : 3,
  });
  return !error;
}
