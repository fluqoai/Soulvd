"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/meta/security";
type State = { message?: string };
export async function requestConnection(
  _state: State,
  form: FormData,
): Promise<State> {
  const context = await requireTenant();
  if (
    context.role !== "owner" ||
    form.get("permission") !== "on" ||
    form.get("business_app") !== "on"
  )
    return { message: "أكد ملكيتك للرقم ووجوده في تطبيق واتساب للأعمال." };
  let phone: string;
  try {
    phone = "+" + normalizePhone(String(form.get("phone") ?? ""));
  } catch {
    return { message: "أدخل الرقم بالصيغة الدولية." };
  }
  const { error } = await createAdminClient().rpc("soulvd_onboarding_request", {
    p_actor: context.userId,
    p_tenant: context.tenantId,
    p_phone: phone,
  });
  if (error)
    return {
      message:
        error.message === "SUBSCRIPTION_INACTIVE"
          ? "أكمل تفعيل الاشتراك أولًا."
          : "تعذر إنشاء طلب الربط. راجع الرقم أو تواصل مع الدعم.",
    };
  revalidatePath("/[locale]/app/connect", "page");
  revalidatePath("/[locale]/admin/onboarding", "page");
  return { message: "وصل طلبك. سيظهر رابط التفويض هنا بعد تجهيزه." };
}
export async function connectionReady(
  _state: State,
  form: FormData,
): Promise<State> {
  const context = await requireTenant();
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return { message: "طلب غير صالح." };
  const { error } = await createAdminClient().rpc("soulvd_onboarding_ready", {
    p_actor: context.userId,
    p_tenant: context.tenantId,
    p_id: id.data,
  });
  if (error)
    return {
      message: "تعذر إرسال التأكيد؛ قد يكون الرابط منتهيًا. تواصل مع الدعم.",
    };
  revalidatePath("/[locale]/app/connect", "page");
  revalidatePath("/[locale]/admin/onboarding", "page");
  return { message: "أرسلنا الرقم للمراجعة والتحقق من الربط." };
}
