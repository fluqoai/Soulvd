"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { onboardingPhone } from "@/lib/onboarding/journey";
type State = { message?: string };
export async function requestConnection(
  _state: State,
  form: FormData,
): Promise<State> {
  const context = await requireTenant();
  if (context.role !== "owner" || form.get("permission") !== "on")
    return { message: "أكد أنك مخوّل بإدارة الرقم." };
  const phone = onboardingPhone(String(form.get("phone") ?? ""));
  const kind = z
    .enum(["business_app", "new_number", "other_provider"])
    .safeParse(form.get("number_kind"));
  if (!phone || !kind.success)
    return { message: "راجع رقم النشاط واختر طريقة استخدامه." };
  const { error } = await createAdminClient().rpc("soulvd_prepare_connection", {
    p_actor: context.userId,
    p_tenant: context.tenantId,
    p_phone: phone,
    p_kind: kind.data,
  });
  if (error)
    return {
      message:
        error.message === "OPEN_CONNECTION_REQUEST"
          ? "لديك طلب محفوظ برقم مختلف. عدّل الطلب الحالي أولًا."
          : "تعذر إنشاء طلب الربط. راجع الرقم أو تواصل مع الدعم.",
    };
  revalidatePath("/[locale]/app", "layout");
  revalidatePath("/[locale]/admin/onboarding", "page");
  return { message: "حفظنا رقمك. يمكنك متابعة الربط من هذه الصفحة في أي وقت." };
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
export async function recoverConnection(
  _state: State,
  form: FormData,
): Promise<State> {
  const context = await requireTenant();
  const id = z.uuid().safeParse(form.get("id"));
  const mode = z.enum(["renew", "restart"]).safeParse(form.get("mode"));
  if (!id.success || !mode.success || context.role !== "owner")
    return { message: "طلب غير صالح." };
  const { error } = await createAdminClient().rpc(
    mode.data === "renew"
      ? "soulvd_renew_connection_link"
      : "soulvd_restart_connection",
    { p_actor: context.userId, p_tenant: context.tenantId, p_id: id.data },
  );
  if (error)
    return {
      message:
        "تغيرت حالة الطلب. حدّث الصفحة؛ تواصل مع الدعم إذا بدأ تفويض الرقم بالفعل.",
    };
  revalidatePath("/[locale]/app", "layout");
  revalidatePath("/[locale]/admin/onboarding", "page");
  return {
    message:
      mode.data === "renew"
        ? "طلبنا رابطًا جديدًا. سيظهر هنا بعد تجهيزه."
        : "يمكنك حفظ بيانات الرقم الصحيحة الآن.",
  };
}
