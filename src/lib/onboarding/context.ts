import "server-only";
import { cache } from "react";
import { currentMerchant, tenantUsage } from "@/lib/tenancy/context";
import { launchSettings } from "@/lib/billing/launch";
import type { ConnectionRequest } from "./journey";
export const setupContext = cache(async function setupContext() {
  const [{ context, isActive, subscription, observedAt }, { db }, launch] =
    await Promise.all([tenantUsage(), currentMerchant(), launchSettings()]);
  const [numbers, request, payment, messages] = await Promise.all([
    db
      .from("whatsapp_numbers")
      .select("phone,status")
      .eq("tenant_id", context.tenantId),
    db
      .from("whatsapp_onboarding_requests")
      .select("id,phone,status,number_kind,onboarding_url,link_expires_at,note,authorization_method")
      .eq("tenant_id", context.tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("payment_requests")
      .select("status")
      .eq("tenant_id", context.tenantId)
      .eq("purpose", "subscription")
      .in("status", ["pending", "submitted"])
      .limit(1)
      .maybeSingle(),
    db
      .from("whatsapp_messages")
      .select("id")
      .eq("tenant_id", context.tenantId)
      .eq("direction", "outbound")
      .in("status", ["delivered", "read"])
      .limit(1),
  ]);
  if ([numbers, request, payment, messages].some((r) => r.error))
    throw new Error("تعذر تحميل خطوات التجهيز. حاول مجددًا.");
  return {
    observedAt,
    context,
    isActive,
    subscription,
    launch,
    connected: numbers.data?.find((n) => n.status === "connected"),
    request: request.data as ConnectionRequest | null,
    submitted: payment.data?.status === "submitted",
    firstReply: Boolean(messages.data?.length),
  };
});
