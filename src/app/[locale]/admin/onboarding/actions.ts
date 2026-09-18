"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { currentMerchant } from "@/lib/tenancy/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { ycloud } from "@/lib/ycloud/client";
type State = { message?: string };
async function owner() {
  const { db, user } = await currentMerchant();
  const { data } = await db
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  return data?.role === "owner" ? user : null;
}
const messages: Record<string, string> = {
  ONBOARDING_NOT_READY:
    "فعّل جاهزية الربط في إعداد مرحلة الإطلاق بعد التأكد من باقة المزود.",
  COEXISTENCE_REQUEST_REQUIRED:
    "رابط Pro مخصص لرقم واتساب الأعمال. يحتاج هذا الطلب إلى مسار آخر.",
  NUMBER_ALREADY_BOUND:
    "الرقم مربوط بمساحة أخرى. لا تنقله دون التحقق من الملكية.",
  PROVIDER_NUMBER_NOT_READY:
    "المزود لا يؤكد اتصال هذا الرقم بخاصية Coexistence.",
  CUSTOMER_CONFIRMATION_REQUIRED: "ينبغي أن يؤكد العميل إكمال التفويض أولًا.",
  SUBSCRIPTION_INACTIVE: "اشتراك العميل غير نشط.",
  NUMBER_LIMIT: "وصلت المساحة إلى حد الأرقام.",
};
function finish(error: { message: string } | null, success: string) {
  if (error)
    return {
      message:
        messages[error.message] ??
        "تعذر تنفيذ العملية؛ راجع الطلب وبيانات المزود.",
    };
  revalidatePath("/[locale]/admin/onboarding", "page");
  revalidatePath("/[locale]/app", "layout");
  return { message: success };
}
export async function updateLaunchPhase(
  _state: State,
  form: FormData,
): Promise<State> {
  const user = await owner();
  if (!user || form.get("verified") !== "on")
    return { message: "متاح لمالك المنصة بعد مراجعة جاهزية المرحلة." };
  const { error } = await createAdminClient().rpc("soulvd_set_launch_phase", {
    p_actor: user.id,
    p_signup: form.get("signup") === "on",
    p_payments: form.get("payments") === "on",
    p_onboarding: form.get("onboarding") === "on",
  });
  if (error)
    return {
      message:
        error.message === "ONBOARDING_REQUIRED_BEFORE_PAYMENTS"
          ? "فعّل جاهزية الربط قبل فتح الدفع."
          : "تعذر حفظ مرحلة الإطلاق.",
    };
  revalidatePath("/[locale]/(auth)/signup", "page");
  return finish(null, "تم تحديث مرحلة الإطلاق.");
}
export async function saveOnboardingLink(
  _state: State,
  form: FormData,
): Promise<State> {
  const user = await owner();
  if (!user) return { message: "متاح لمالك المنصة فقط." };
  const parsed = z
    .object({ id: z.uuid(), url: z.url().max(2000) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: "أدخل رابط الربط وطلبًا صحيحًا." };
  const url = new URL(parsed.data.url);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !(url.hostname === "ycloud.com" || url.hostname.endsWith(".ycloud.com"))
  )
    return { message: "استخدم رابط HTTPS مباشرًا من YCloud." };
  const { error } = await createAdminClient().rpc("soulvd_onboarding_link", {
    p_actor: user.id,
    p_id: parsed.data.id,
    p_url: url.href,
  });
  return finish(error, "أصبح رابط التفويض ظاهرًا لمالك مساحة العميل.");
}
export async function prepareAssistedSession(
  _state: State,
  form: FormData,
): Promise<State> {
  const user = await owner();
  const id = z.uuid().safeParse(form.get("id"));
  if (!user || !id.success || form.get("arranged") !== "on")
    return { message: "نسّق الجلسة مع مالك الرقم وأكّد أهلية واتساب الأعمال أولًا." };
  const { error } = await createAdminClient().rpc("soulvd_onboarding_assisted", {
    p_actor: user.id,
    p_id: id.data,
  });
  return finish(error, "أصبحت تعليمات جلسة الربط ظاهرة للعميل. لا يتم الربط حتى يؤكد التفويض ونتحقق من المزود.");
}
export async function verifyAndBind(
  _state: State,
  form: FormData,
): Promise<State> {
  const user = await owner();
  if (!user) return { message: "متاح لمالك المنصة فقط." };
  const parsed = z
    .object({
      id: z.uuid(),
      waba: z.string().regex(/^[0-9]{5,30}$/),
      verified: z.literal("on"),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { message: "أدخل WABA وتحقق من أن التفويض يخص منشأة العميل ورقمه." };
  const db = createAdminClient();
  const { data: r, error: readError } = await db
    .from("whatsapp_onboarding_requests")
    .select("phone")
    .eq("id", parsed.data.id)
    .single();
  if (readError) return { message: "تعذر تحميل الطلب." };
  try {
    const asset = await ycloud<Record<string, unknown>>(
      "/whatsapp/phoneNumbers/" +
        parsed.data.waba +
        "/" +
        encodeURIComponent(r.phone),
    );
    const verified = z
      .object({
        id: z.string().regex(/^[0-9]+$/),
        wabaId: z.literal(parsed.data.waba),
        phoneNumber: z.literal(r.phone),
        status: z.literal("CONNECTED"),
        isOnBizApp: z.literal(true),
      })
      .safeParse(asset);
    if (!verified.success)
      return {
        message:
          "الرقم أو WABA أو حالة Coexistence لا تطابق الطلب؛ لم يتم الربط.",
      };
    const { error } = await db.rpc("soulvd_onboarding_bind", {
      p_actor: user.id,
      p_id: parsed.data.id,
      p_verified: verified.data,
    });
    return finish(error, "تم التحقق من المزود وربط الرقم بمساحة العميل.");
  } catch {
    return {
      message:
        "تعذر التحقق من YCloud. لم نغيّر الربط؛ راجع WABA وحالة الرقم ثم حاول مجددًا.",
    };
  }
}
export async function rejectOnboarding(
  _state: State,
  form: FormData,
): Promise<State> {
  const user = await owner();
  if (!user) return { message: "متاح لمالك المنصة فقط." };
  const parsed = z
    .object({ id: z.uuid(), note: z.string().trim().min(1).max(500) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: "اكتب سببًا واضحًا يظهر للعميل." };
  const { error } = await createAdminClient().rpc("soulvd_onboarding_reject", {
    p_actor: user.id,
    p_id: parsed.data.id,
    p_note: parsed.data.note,
  });
  return finish(
    error,
    "أُعيد الطلب مع الملاحظة؛ يستطيع العميل إنشاء طلب مصحح.",
  );
}
