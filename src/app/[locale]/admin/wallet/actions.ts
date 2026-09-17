"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { currentMerchant } from "@/lib/tenancy/context";
import { createAdminClient } from "@/lib/supabase/admin";
export async function walletOperation(
  _state: { message?: string },
  form: FormData,
): Promise<{ message?: string }> {
  const { db, user } = await currentMerchant();
  const { data: profile } = await db
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "owner") return { message: "متاح لمالك المنصة فقط." };
  const admin = createAdminClient();
  let error;
  if (form.get("operation") === "test_credit") {
    const p = z
      .object({
        tenant: z.uuid(),
        request: z.uuid(),
        amount: z.coerce
          .number()
          .min(0.01)
          .max(5)
          .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001),
        verified: z.literal("on"),
      })
      .safeParse(Object.fromEntries(form));
    if (!p.success)
      return {
        message: "حدد مساحة الاختبار والمبلغ وأكد أنه على حساب المنصة.",
      };
    ({ error } = await admin.rpc("soulvd_test_wallet_credit", {
      p_actor: user.id,
      p_tenant: p.data.tenant,
      p_request: p.data.request,
      p_amount: Math.round(p.data.amount * 100),
    }));
  } else {
    const id = z.uuid().safeParse(form.get("id"));
    if (!id.success) return { message: "عملية غير صالحة." };
    ({ error } = await admin.rpc("soulvd_wallet_retry", {
      p_actor: user.id,
      p_job: id.data,
    }));
  }
  if (error)
    return {
      message:
        error.message === "TEST_BUDGET_LIMIT"
          ? "استُنفدت منحة الاختبار القصوى لهذه المساحة (5 ريالات)."
          : "تعذر تنفيذ العملية؛ راجع حالة المحفظة.",
    };
  revalidatePath("/[locale]/admin/wallet", "page");
  revalidatePath("/[locale]/app/wallet", "page");
  return {
    message:
      "تم تسجيل العملية. إعادة التسوية تستعلم عن الحالة ولا تعيد إرسال الرسالة.",
  };
}
