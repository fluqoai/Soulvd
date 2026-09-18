"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { currentMerchant, requireTenant } from "@/lib/tenancy/context";
import { createAdminClient } from "@/lib/supabase/admin";
export type PaymentState = { message?: string };
const errors: Record<string, string> = {
  PAYMENTS_NOT_READY:
    "مساحتك في مرحلة التجهيز. سنتيح طلب التحويل بعد فتح التفعيل؛ لا تحوّل أي مبلغ الآن.",
  TEST_WORKSPACE: "هذه مساحة اختبار؛ لا تُسجل عليها دفعات العملاء.",
  QUOTE_EXPIRED:
    "انتهت صلاحية الطلب. ألغِ الطلب غير المدفوع وأنشئ طلبًا جديدًا.",
  CYCLE_STILL_ACTIVE: "اشتراكك نشط؛ يتاح التجديد بعد انتهائه.",
  SELECT_NEW_TERM: "اختر مدة 3 أو 6 أو 12 شهرًا للتجديد.",
  OPEN_PAYMENT_REQUEST: "أكمل طلب الدفع المفتوح أو ألغِه قبل تغيير الباقة.",
  UPGRADE_NOT_AVAILABLE: "الترقية متاحة لاشتراك انطلاق نشط.",
  CANNOT_CANCEL_SUBMITTED_PAYMENT:
    "التحويل المرسل قيد المراجعة. تواصل مع الدعم لتعديله.",
};
function result(error: { message: string } | null, success: string) {
  if (error)
    return {
      message:
        errors[error.message] ??
        "تعذر إكمال الطلب. راجع البيانات أو تواصل مع الدعم.",
    };
  revalidatePath("/[locale]/app", "layout");
  revalidatePath("/[locale]/admin/subscriptions", "page");
  return { message: success };
}
export async function requestPayment(
  _state: PaymentState,
  form: FormData,
): Promise<PaymentState> {
  const context = await requireTenant();
  const purpose = z
    .enum(["subscription", "upgrade", "wallet"])
    .safeParse(form.get("purpose"));
  if (context.role !== "owner" || !purpose.success)
    return { message: "متاح لمالك مساحة العمل فقط." };
  let amount: number | null = null;
  if (purpose.data === "wallet") {
    const value = z.coerce
      .number()
      .min(50)
      .max(10000)
      .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001)
      .safeParse(form.get("amount"));
    if (!value.success)
      return {
        message:
          "اختر مبلغًا من 50 إلى 10,000 ريال، بمنزلتين عشريتين كحد أقصى.",
      };
    amount = Math.round(value.data * 100);
  }
  const { error } = await createAdminClient().rpc("soulvd_request_payment", {
    p_actor: context.userId,
    p_tenant: context.tenantId,
    p_purpose: purpose.data,
    p_amount: amount,
  });
  return result(
    error,
    "الطلب جاهز. راجع المبلغ وبيانات البنك ثم أرسل مرجع التحويل.",
  );
}
export async function submitPayment(
  _state: PaymentState,
  form: FormData,
): Promise<PaymentState> {
  const context = await requireTenant();
  const parsed = z
    .object({ id: z.uuid(), reference: z.string().trim().min(3).max(120) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success || context.role !== "owner")
    return { message: "أدخل مرجع التحويل الصحيح." };
  const { error } = await createAdminClient().rpc("soulvd_submit_payment", {
    p_actor: context.userId,
    p_tenant: context.tenantId,
    p_id: parsed.data.id,
    p_reference: parsed.data.reference,
  });
  return result(
    error,
    "وصل مرجع التحويل للمراجعة. يتغير الاشتراك أو الرصيد بعد تأكيد وصول المبلغ فعليًا.",
  );
}
export async function cancelPayment(
  _state: PaymentState,
  form: FormData,
): Promise<PaymentState> {
  const context = await requireTenant();
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return { message: "طلب غير صالح." };
  const { error } = await createAdminClient().rpc("soulvd_cancel_payment", {
    p_actor: context.userId,
    p_tenant: context.tenantId,
    p_id: id.data,
  });
  return result(error, "أُلغي الطلب غير المدفوع.");
}
export async function selectContract(
  _state: PaymentState,
  form: FormData,
): Promise<PaymentState> {
  const context = await requireTenant();
  const parsed = z
    .object({
      plan: z.enum(["starter_v1", "pro_growth_v1"]),
      months: z.coerce.number().refine((n) => [3, 6, 12].includes(n)),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success || context.role !== "owner")
    return { message: "اختر الباقة والمدة." };
  const { error } = await createAdminClient().rpc(
    "soulvd_select_unpaid_contract",
    {
      p_actor: context.userId,
      p_tenant: context.tenantId,
      p_plan: parsed.data.plan,
      p_months: parsed.data.months,
    },
  );
  return result(error, "حُفظت الباقة والمدة. لم يبدأ الاشتراك المدفوع بعد.");
}
export async function paymentRequests() {
  const context = await requireTenant();
  const { db } = await currentMerchant();
  const { data, error } = await db
    .from("payment_requests")
    .select(
      "id,purpose,amount_halalas,status,bank_reference,created_at,expires_at",
    )
    .eq("tenant_id", context.tenantId)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) throw new Error("تعذر تحميل طلبات الدفع.");
  return data;
}
