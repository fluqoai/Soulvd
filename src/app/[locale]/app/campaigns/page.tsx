import { currentMerchant, tenantUsage } from "@/lib/tenancy/context";
import { createAdminClient } from "@/lib/supabase/admin";
import Campaigns from "./Campaigns";
export default async function CampaignsPage() {
  const { context, isActive } = await tenantUsage(),
    { db } = await currentMerchant();
  const [summary, templates, numbers] = await Promise.all([
    createAdminClient().rpc("soulvd_growth_summary", {
      p_tenant: context.tenantId,
      p_actor: context.userId,
    }),
    db
      .from("whatsapp_templates")
      .select("id,name,body,status,parameter_count")
      .eq("tenant_id", context.tenantId)
      .eq("status", "approved")
      .order("name"),
    db
      .from("whatsapp_numbers")
      .select("id")
      .eq("tenant_id", context.tenantId)
      .eq("status", "connected")
      .limit(1),
  ]);
  if (summary.error || templates.error || numbers.error)
    throw new Error("تعذر تحميل مركز الحملات.");
  return (
    <Campaigns
      templates={templates.data ?? []}
      campaigns={summary.data.campaigns}
      segments={summary.data.segments}
      active={isActive}
      connected={Boolean(numbers.data?.length)}
      canManage={["owner", "admin"].includes(context.role)}
    />
  );
}
