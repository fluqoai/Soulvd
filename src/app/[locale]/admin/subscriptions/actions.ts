"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { currentMerchant } from "@/lib/tenancy/context";
import { createAdminClient } from "@/lib/supabase/admin";

export async function confirmPaymentRequest(
  _previous: { message?: string },
  form: FormData,
) {
  const { db, user } = await currentMerchant();
  const { data: profile } = await db
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "owner")
    return { message: "التأكيد متاح لمالك المنصة فقط." };
  const parsed = z
    .object({
      id: z.uuid(),
      reference: z.string().trim().min(3).max(120),
      amount: z.coerce
        .number()
        .positive()
        .max(10000)
        .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001),
      verified: z.literal("on"),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      message: "أدخل المبلغ والمرجع من كشف البنك وأكد وصول التحويل فعليًا.",
    };
  const { error } = await createAdminClient().rpc("soulvd_confirm_payment", {
    p_actor: user.id,
    p_id: parsed.data.id,
    p_reference: parsed.data.reference,
    p_amount: Math.round(parsed.data.amount * 100),
  });
  if (error)
    return {
      message:
        (
          {
            REFERENCE_ALREADY_USED: "مرجع التحويل مستخدم لدفعة أخرى.",
            AMOUNT_OR_REFERENCE_MISMATCH:
              "المبلغ أو المرجع لا يطابق الطلب. راجع العملية قبل التأكيد.",
            CONTRACT_CHANGED:
              "تغير الاشتراك منذ إنشاء الطلب؛ يلزم مراجعة الدفعة.",
            UPGRADE_NOT_AVAILABLE:
              "انتهى الاشتراك أو تغيرت الباقة؛ راجع تحويل الترقية مع العميل.",
          } as Record<string, string>
        )[error.message] ??
        "تعذر تأكيد الدفعة. راجع السجل ولا تكررها بمرجع مختلف.",
    };
  revalidatePath("/[locale]/admin/subscriptions", "page");
  revalidatePath("/[locale]/app", "layout");
  return { message: "تم توثيق التحويل وتحديث الاشتراك أو الرصيد مرة واحدة." };
}

export async function confirmIntegrationTransfer(
  _previous: { message?: string },
  form: FormData,
) {
  const { db, user } = await currentMerchant();
  const { data: profile } = await db
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "owner")
    return { message: "التأكيد متاح لمالك المنصة فقط." };
  const parsed = z
    .object({
      integration: z.uuid(),
      reference: z.string().trim().min(3).max(120),
      amount: z.coerce.number().refine((n) => n === 100),
      verified: z.literal("on"),
      reviewed: z.literal("on"),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      message: "راجع قابلية التكامل ثم أكد وصول 100 ريال ورقم مرجع التحويل.",
    };
  const result = await createAdminClient().rpc("soulvd_crm_confirm", {
    p_actor: user.id,
    p_id: parsed.data.integration,
    p_reference: parsed.data.reference,
    p_amount: 10000,
  });
  if (result.error)
    return {
      message:
        (
          {
            REFERENCE_ALREADY_USED: "مرجع التحويل مستخدم لدفعة أخرى.",
            TEST_WORKSPACE: "لا تُسجل دفعات على مساحات الاختبار.",
            ALREADY_PAID: "تم توثيق رسوم هذا التكامل مسبقًا.",
          } as Record<string, string>
        )[result.error.message] ??
        "تعذر توثيق الدفعة. راجع السجل قبل المحاولة مجددًا.",
    };
  revalidatePath("/[locale]/admin/subscriptions", "page");
  revalidatePath("/[locale]/app/integrations", "page");
  return {
    message:
      "تم توثيق رسوم التكامل. يستطيع مالك مساحة العميل إصدار مفاتيحه من صفحة التكاملات.",
  };
}
