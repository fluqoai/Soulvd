"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentMerchant } from "@/lib/tenancy/context";

export type OnboardingState = { error?: string };
export async function createWorkspace(
  _previous: OnboardingState,
  form: FormData,
): Promise<OnboardingState> {
  const parsed = z
    .object({
      name: z.string().trim().min(1).max(120),
      plan: z.enum(["starter_v1", "pro_growth_v1"]),
      months: z.coerce.number().refine((n) => [3, 6, 12].includes(n)),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "أدخل اسم مساحة العمل واختر الباقة." };
  const { user } = await currentMerchant();
  if (!user.email_confirmed_at)
    return { error: "أكد بريدك الإلكتروني أولًا من رسالة التسجيل." };
  const { error } = await createAdminClient().rpc("soulvd_create_contract", {
    p_actor: user.id,
    p_name: parsed.data.name,
    p_plan: parsed.data.plan,
    p_months: parsed.data.months,
  });
  if (error) return { error: "تعذر إنشاء مساحة العمل. تواصل مع الدعم." };
  redirect("/app/billing");
}
