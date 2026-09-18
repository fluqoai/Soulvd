"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/tenancy/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { guideFlow, recipes } from "@/lib/growth/guide";
import { flowSchema } from "@/lib/studio/schema";

const guideSchema = z.object({
  goal: z.enum(["automation", "assistant", "integration"]),
  business: z.string().trim().min(1).max(120),
  recipe: z.enum(
    Object.keys(recipes) as [keyof typeof recipes, ...(keyof typeof recipes)[]],
  ),
  reply: z.string().max(4096),
  knowledge: z.string().max(8000),
  system: z.string().max(120),
  need: z.string().max(2000),
});
const errorMessages: Record<string, string> = {
  FORBIDDEN: "إدارة هذه الخطوة متاحة لمالك المساحة أو مديرها.",
  SUBSCRIPTION_INACTIVE: "احفظ تجهيزك الآن. التشغيل يحتاج اشتراكًا نشطًا.",
  NOT_CONNECTED: "اربط رقم واتساب قبل إطلاق الحملة.",
  TEMPLATE_NOT_APPROVED: "اختر قالبًا معتمدًا قبل الإرسال.",
  EMPTY_AUDIENCE: "لا توجد جهات اتصال مؤهلة. راجع الشريحة وموافقات التواصل.",
  INVALID_PARAMETERS: "أكمل قيم المتغيرات بحسب القالب.",
  CONTACT_LIMIT: "بلغت سعة دفتر العملاء: 20,000 جهة. تواصل معنا لتوسعتها.",
  AUDIENCE_TOO_LARGE: "قسّم الجمهور إلى شرائح لا تتجاوز 5,000 جهة للحملة.",
  IMMUTABLE_CAMPAIGN: "لا يمكن تعديل حملة بعد بدء تشغيلها.",
  CAMPAIGN_LIMIT: "بلغت سعة الحملات لهذه المساحة.",
};
export type GrowthResult = {
  ok: boolean;
  message: string;
  id?: string;
  added?: number;
  existing?: number;
};
async function call(
  name: string,
  args: Record<string, unknown>,
): Promise<GrowthResult> {
  const c = await requireTenant();
  if (!["owner", "admin"].includes(c.role))
    return { ok: false, message: errorMessages.FORBIDDEN };
  const { data, error } = await createAdminClient().rpc(name, {
    p_tenant: c.tenantId,
    p_actor: c.userId,
    ...args,
  });
  if (error)
    return {
      ok: false,
      message:
        errorMessages[error.message] ??
        "تعذر الحفظ. راجع البيانات وحدّث الصفحة للمحاولة مجددًا.",
    };
  revalidatePath("/[locale]/app", "layout");
  return {
    ok: true,
    message: "تم الحفظ في مساحتك.",
    ...(typeof data === "string"
      ? { id: data }
      : typeof data === "object" && data
        ? { added: data.added, existing: data.existing }
        : {}),
  };
}
export async function importAudience(input: unknown) {
  const p = z
    .object({
      rows: z
        .array(
          z.object({
            phone: z.string().regex(/^[1-9]\d{7,14}$/),
            name: z.string().max(120),
          }),
        )
        .min(1)
        .max(500),
      segment: z.string().trim().max(80),
      source: z.string().trim().max(300),
    })
    .safeParse(input);
  if (!p.success)
    return { ok: false, message: "تحقق من ملف الأرقام وبيانات الاستيراد." };
  return call("soulvd_import_audience", {
    p_rows: p.data.rows,
    p_segment: p.data.segment,
    p_source: p.data.source,
  });
}
export async function saveGuide(input: unknown) {
  const p = guideSchema.safeParse(input);
  if (!p.success)
    return { ok: false, message: "أدخل اسم النشاط وتحقق من طول المعلومات." };
  return call("soulvd_save_guide", { p_data: p.data });
}
export async function submitGuide() {
  const result = await call("soulvd_submit_guide", {});
  return {
    ...result,
    message: result.ok
      ? "وصل طلب مراجعة التكامل إلى إدارة سولفد. لم تُفرض أي رسوم بعد."
      : result.message,
  };
}
export async function applyGuide() {
  const c = await requireTenant();
  if (!["owner", "admin"].includes(c.role))
    return { ok: false, message: errorMessages.FORBIDDEN };
  const { data, error } = await createAdminClient()
    .from("workspace_guides")
    .select("data")
    .eq("tenant_id", c.tenantId)
    .maybeSingle();
  const p = guideSchema.safeParse(data?.data);
  if (error || !p.success || p.data.goal === "integration")
    return { ok: false, message: "احفظ إعداد الأتمتة أولًا." };
  const flow = flowSchema.safeParse(guideFlow(p.data));
  if (!flow.success) return { ok: false, message: "أكمل نص الرد أولًا." };
  return call("soulvd_apply_guide", {
    p_flow: flow.data,
    p_knowledge: p.data.knowledge,
  });
}
export async function saveCampaign(input: unknown) {
  const p = z
    .object({
      id: z.uuid().nullable(),
      name: z.string().trim().min(1).max(120),
      segment: z.string().max(80),
      templateId: z.uuid().nullable(),
      parameters: z.array(z.string().max(1000)).max(10),
    })
    .safeParse(input);
  if (!p.success)
    return { ok: false, message: "أدخل اسم الحملة وتحقق من المتغيرات." };
  return call("soulvd_campaign_save", {
    p_id: p.data.id,
    p_name: p.data.name,
    p_segment: p.data.segment,
    p_template: p.data.templateId,
    p_parameters: p.data.parameters,
  });
}
export async function controlCampaign(id: string, action: string) {
  if (
    !z.uuid().safeParse(id).success ||
    !["start", "pause", "cancel"].includes(action)
  )
    return { ok: false, message: "طلب غير صحيح." };
  const result = await call("soulvd_campaign_control", {
    p_id: id,
    p_action: action,
  });
  return {
    ...result,
    message: result.ok
      ? action === "start"
        ? "بدأت معالجة الحملة. تابع حالة التسليم أدناه."
        : "تم إيقاف الرسائل التي لم تدخل قائمة الإرسال بعد."
      : result.message,
  };
}
export async function suppressAudience(id: string) {
  const c = await requireTenant();
  if (!["owner", "admin"].includes(c.role) || !z.uuid().safeParse(id).success)
    return { ok: false, message: errorMessages.FORBIDDEN };
  const { error } = await createAdminClient()
    .from("audience_contacts")
    .update({ suppressed: true })
    .eq("tenant_id", c.tenantId)
    .eq("id", id);
  revalidatePath("/[locale]/app", "layout");
  return {
    ok: !error,
    message: error
      ? "تعذر تحديث الجهة."
      : "استُبعد الرقم من الحملات القادمة. الاستيراد لا يلغي الاستبعاد.",
  };
}
