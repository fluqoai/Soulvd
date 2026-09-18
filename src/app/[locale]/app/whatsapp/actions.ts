"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTenant, tenantUsage } from "@/lib/tenancy/context";
import {
  decryptToken,
  encryptToken,
  normalizePhone,
} from "@/lib/meta/security";
import { exchangeCode, graph } from "@/lib/meta/client";
import { dispatchOne } from "@/lib/meta/worker";
import { providerTemplates } from "@/lib/ycloud/client";
import { templateSchema, parameterCount } from "@/lib/studio/schema";

export type ActionResult = { ok: boolean; message: string; id?: string };
const messages: Record<string, string> = {
  WALLET_INSUFFICIENT:
    "رصيد واتساب غير كافٍ. افتح صفحة رصيد واتساب لشحن المحفظة.",
  WALLET_RATE_UNAVAILABLE:
    "تحتاج تعرفة هذه الوجهة إلى تحديث من الإدارة قبل الإرسال.",
  SUBSCRIPTION_INACTIVE: "يجب تفعيل الاشتراك قبل استخدام الخدمة.",
  NOT_CONNECTED: "اربط رقم واتساب أولًا.",
  WINDOW_CLOSED: "انتهت نافذة الرد؛ استخدم قالبًا معتمدًا.",
  CONSENT_REQUIRED: "يجب تأكيد موافقة العميل على استقبال رسائل القوالب.",
  TEMPLATE_NOT_APPROVED: "القالب غير معتمد.",
  LIMIT_EXCEEDED: "بلغت حصة الباقة. يمكنك الترقية من صفحة الباقات.",
  RATE_LIMITED: "طلبات كثيرة خلال دقيقة. انتظر قليلًا ثم أعد المحاولة.",
  MARKETING_OPTED_OUT: "طلب العميل إيقاف الرسائل التسويقية.",
};
async function enqueue(args: Record<string, unknown>): Promise<ActionResult> {
  const context = await requireTenant();
  const { data, error } = await createAdminClient().rpc(
    "soulvd_enqueue_message",
    { p_tenant: context.tenantId, p_actor: context.userId, ...args },
  );
  if (error)
    return {
      ok: false,
      message: messages[error.message] ?? "تعذر حفظ الطلب. لا تكرر الإرسال قبل مراجعة السجل.",
    };
  if (!data.allowed)
    return {
      ok: false,
      message: messages[data.code] ?? "لا يمكن تنفيذ الإجراء.",
    };
  let message = "حُفظ الطلب في قائمة الإرسال.";
  try {
    const result = await dispatchOne(data.id);
    if (result?.status === "accepted")
      message =
        "استلمت خدمة واتساب الطلب. تابع حالة التسليم أو اعتماد القالب في السجل.";
    if (result?.status === "failed")
      message = "رفض الطلب أو تعذر تنفيذه. راجع إعدادات الربط وسجل الحالة.";
    if (result?.status === "unknown")
      message = "نتيجة الطلب غير مؤكدة؛ لن نعيد إرساله تلقائيًا.";
  } catch {
    message = "حُفظ الطلب؛ يحتاج العامل إلى متابعة حالته.";
  }
  revalidatePath("/app/whatsapp");
  return { ok: true, message, id: data.id };
}
export async function sendMessage(input: {
  requestId: string;
  to: string;
  body: string;
  templateId?: string;
  consent: boolean;
  parameters?: string[];
}) {
  const parsed = z
    .object({
      requestId: z.string().uuid(),
      to: z.string().max(30),
      body: z.string().max(4096),
      templateId: z.string().uuid().optional(),
      consent: z.boolean(),
      parameters: z.array(z.string().min(1).max(1000)).max(10).default([]),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, message: "تحقق من بيانات الرسالة." };
  let phone: string;
  try {
    phone = normalizePhone(input.to);
  } catch {
    return { ok: false, message: "أدخل رقمًا دوليًا مثل +9665xxxxxxxx." };
  }
  return enqueue({
    p_request: input.requestId,
    p_kind: "message",
    p_to: phone,
    p_body: input.body,
    p_template: input.templateId ?? null,
    p_consent: input.consent,
    p_parameters: parsed.data.parameters,
  });
}
export async function createTemplate(input: {
  requestId: string;
  name: string;
  language: string;
  category: string;
  body: string;
  examples?: string[];
}) {
  const parsed = templateSchema.safeParse({
    ...input,
    examples: input.examples ?? [],
  });
  if (!z.uuid().safeParse(input.requestId).success || !parsed.success)
    return {
      ok: false,
      message:
        "تحقق من اسم القالب ونصه. استخدم متغيرات متسلسلة {{1}} و{{2}} وأدخل مثالًا لكل متغير.",
    };
  const data = parsed.data;
  return enqueue({
    p_request: input.requestId,
    p_kind: "template",
    p_to: "",
    p_body: JSON.stringify({
      name: data.name,
      language: data.language,
      category: data.category,
      components: [
        {
          type: "BODY",
          text: data.body,
          ...(data.examples.length
            ? { example: { body_text: [data.examples] } }
            : {}),
        },
      ],
    }),
    p_template: null,
    p_consent: false,
  });
}
export async function finishSignup(input: {
  code: string;
  wabaId: string;
  phoneNumberId: string;
  mode: "api" | "coexistence";
}): Promise<ActionResult> {
  const context = await requireTenant();
  if (context.role !== "owner")
    return { ok: false, message: "الربط متاح لمالك المساحة فقط." };
  if (
    !z
      .object({
        code: z.string().min(10).max(4096),
        wabaId: z.string().regex(/^\d+$/),
        phoneNumberId: z.string().regex(/^\d+$/),
        mode: z.enum(["api", "coexistence"]),
      })
      .safeParse(input).success
  )
    return { ok: false, message: "لم تصل بيانات تفويض صحيحة من Meta." };
  try {
    const { subscription } = await tenantUsage();
    if (
      subscription.status !== "active" ||
      Date.now() < Date.parse(subscription.period_start) ||
      Date.now() >= Date.parse(subscription.period_end)
    )
      return { ok: false, message: messages.SUBSCRIPTION_INACTIVE };
    encryptToken("configuration-check");
    const token = await exchangeCode(input.code);
    const numbers = await graph<{
      data: { id: string; display_phone_number: string }[];
    }>(`${input.wabaId}/phone_numbers`, token);
    const phone = numbers.data.find(
      (number) => number.id === input.phoneNumberId,
    );
    if (!phone)
      return { ok: false, message: "لم يثبت التفويض الوصول إلى الرقم المحدد." };
    await graph(`${input.wabaId}/subscribed_apps`, token, {});
    const { error } = await createAdminClient().rpc("soulvd_meta_bind", {
      p_tenant: context.tenantId,
      p_actor: context.userId,
      p_phone: `+${normalizePhone(phone.display_phone_number)}`,
      p_waba: input.wabaId,
      p_number: input.phoneNumberId,
      p_token: encryptToken(token),
      p_mode: input.mode,
    });
    if (error)
      return {
        ok: false,
        message:
          "تم التفويض لدى Meta، لكن لم يُحفظ الربط. راجع حالة الاشتراك وحد الرقم قبل المتابعة.",
      };
    revalidatePath("/app/whatsapp");
    return {
      ok: true,
      message:
        "حُفظ التفويض. نحتاج اختبار إرسال واستقبال للتأكد من جاهزية الرقم.",
    };
  } catch {
    return {
      ok: false,
      message: "تعذر إكمال التفويض؛ تحقق من إعدادات التطبيق وأهلية الرقم.",
    };
  }
}

export async function refreshTemplates(): Promise<ActionResult> {
  const context = await requireTenant();
  if (!["owner", "admin"].includes(context.role))
    return { ok: false, message: "غير مسموح." };
  const db = createAdminClient();
  try {
    const connection = await db.rpc("soulvd_meta_connection", {
      p_tenant: context.tenantId,
    });
    if (connection.error || !connection.data)
      return { ok: false, message: "اربط رقمًا أولًا." };
    const templates =
      connection.data.provider === "ycloud"
        ? await providerTemplates(connection.data.waba_id)
        : (
            await graph<{
              data: {
                name: string;
                language: string;
                category: string;
                status: string;
                components: { type: string; text?: string }[];
              }[];
            }>(
              `${connection.data.waba_id}/message_templates?limit=100`,
              decryptToken(connection.data.encrypted_token),
            )
          ).data;
    const supported = templates
      .filter((template) => {
        if (
          template.components.length !== 1 ||
          template.components[0].type !== "BODY" ||
          !template.components[0].text
        )
          return false;
        try {
          parameterCount(template.components[0].text);
          return true;
        } catch {
          return false;
        }
      })
      .map((template) => ({ ...template, body: template.components[0].text }));
    const synced = await db.rpc("soulvd_meta_sync_templates", {
      p_tenant: context.tenantId,
      p_actor: context.userId,
      p_templates: supported,
    });
    if (synced.error) throw new Error("SYNC_FAILED");
    revalidatePath("/app/whatsapp");
    return {
      ok: true,
      message: `تم تحديث ${synced.data} قالب ضمن حدود الباقة. تُعرض القوالب النصية المدعومة فقط.`,
    };
  } catch {
    return { ok: false, message: "تعذر تحديث القوالب من Meta." };
  }
}
