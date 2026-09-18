import { redirect } from "next/navigation";
import { currentMerchant, tenantContext } from "@/lib/tenancy/context";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage() {
  if (await tenantContext()) redirect("/app");
  const { user } = await currentMerchant();
  return (
    <div className="space-y-8">
      <OnboardingForm
        initialName={String(user.user_metadata?.business_name ?? "")}
        initialMonths={Number(user.user_metadata?.preferred_months)}
        initialPlan={String(user.user_metadata?.preferred_plan ?? "")}
      />
    </div>
  );
}
