import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ycloud } from "@/lib/ycloud/client";
export async function reconcileWallet() {
  const db = createAdminClient();
  const { data, error } = await db.rpc("soulvd_wallet_reconcile_claim");
  if (error) throw new Error("WALLET_QUEUE_UNAVAILABLE");
  if (!data) return;
  if (
    typeof data.provider_id !== "string" ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(data.provider_id)
  )
    throw new Error("INVALID_PROVIDER_ID");
  const message = await ycloud<Record<string, unknown>>(
    "/whatsapp/messages/" + data.provider_id,
  );
  if (message.id !== data.provider_id)
    throw new Error("PROVIDER_MESSAGE_MISMATCH");
  const settled = await db.rpc("soulvd_settle_message", { p_message: message });
  if (settled.error) throw new Error("WALLET_SETTLEMENT_FAILED");
}
