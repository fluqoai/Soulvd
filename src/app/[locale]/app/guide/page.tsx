import {
  currentMerchant,
  requireTenant,
  tenantUsage,
} from "@/lib/tenancy/context";
import Guide from "./Guide";
import type { GuideData } from "@/lib/growth/guide";
export default async function GuidePage({
  searchParams,
}: {
  searchParams: Promise<{ goal?: string }>;
}) {
  const c = await requireTenant(),
    { db } = await currentMerchant(),
    { isActive } = await tenantUsage();
  const { goal } = await searchParams;
  const { data, error } = await db
    .from("workspace_guides")
    .select("data,updated_at,flow_id")
    .eq("tenant_id", c.tenantId)
    .maybeSingle();
  if (error) throw new Error("تعذر تحميل تجهيز النشاط.");
  return (
    <Guide
      key={goal ?? "saved"}
      initial={data?.data as GuideData | undefined}
      requestedGoal={goal}
      business={c.name}
      active={isActive}
      canManage={["owner", "admin"].includes(c.role)}
      savedAt={data?.updated_at}
      applied={Boolean(data?.flow_id)}
    />
  );
}
