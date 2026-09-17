import { redirect } from "next/navigation";
import { currentMerchant, tenantContext } from "@/lib/tenancy/context";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage() {
  if (await tenantContext()) redirect("/app");
  const { user } = await currentMerchant();
  return (
    <OnboardingForm
      initialMonths={Number(user.user_metadata?.preferred_months)}
      initialPlan={String(user.user_metadata?.preferred_plan ?? "")}
    />
  );
}
