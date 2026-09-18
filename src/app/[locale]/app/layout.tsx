import { currentMerchant, tenantContext, tenantUsage } from "@/lib/tenancy/context";
import WorkspaceShell from "./WorkspaceShell";
import WalletNotice from "@/components/billing/WalletNotice";
import "./workspace.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Soulvd | مساحة العمل",
  robots: { index: false, follow: false },
};
export default async function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { db, user } = await currentMerchant();
  const [context, memberships, profile] = await Promise.all([
    tenantContext(),
    db.from("tenant_members").select("tenant_id").eq("user_id", user.id),
    db.from("users").select("role").eq("id", user.id).maybeSingle(),
  ]);
  if (memberships.error || profile.error)
    throw new Error("تعذر تحميل حساب مساحة العمل.");
  const workspaces = memberships.data?.length
    ? await db
        .from("tenants")
        .select("id,name,is_test")
        .in(
          "id",
          memberships.data.map((m) => m.tenant_id),
        )
    : { data: [], error: null };
  if (workspaces.error) throw new Error("تعذر تحميل المساحات.");
  const usage = context && !context.isTest && context.role !== "agent"
    ? await tenantUsage()
    : null;
  const active = usage?.isActive;
  return (
    <WorkspaceShell
      userId={user.id}
      email={user.email ?? ""}
      currentId={context?.tenantId}
      currentName={context?.name}
      isTest={context?.isTest}
      canAdmin={Boolean(
        profile.data && ["owner", "editor"].includes(profile.data.role),
      )}
      workspaces={workspaces.data ?? []}
    >
      {active && context && <WalletNotice key={context.tenantId} tenantId={context.tenantId} />}
      {children}
    </WorkspaceShell>
  );
}
