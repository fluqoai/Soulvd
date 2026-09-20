'use server';
import { createHash, randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { tenantUsage } from '@/lib/tenancy/context';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  flowSchema,
  settingsSchema,
  templateSchema,
} from '@/lib/studio/schema';
import { webhookUrl } from '@/lib/studio/network';
import { encryptToken } from '@/lib/meta/security';
import { dispatchOne } from '@/lib/meta/worker';
import { aiReady } from '@/lib/studio/worker';
import { aiStatus } from '@/lib/studio/ai-status';

export type StudioResult = {
  ok: boolean;
  message: string;
  id?: string;
  apiKey?: string;
  signingSecret?: string;
};
const errors: Record<string, string> = {
  FORBIDDEN: 'ليست لديك صلاحية إدارة هذه المساحة.',
  PRO_REQUIRED: 'هذه الميزة متاحة لباقة النمو الاحترافية.',
  SUBSCRIPTION_INACTIVE: 'يلزم اشتراك نشط.',
  LIMIT_EXCEEDED: 'بلغت الحد المتاح في باقتك.',
  PAYMENT_REQUIRED: 'يجب تأكيد رسوم التكامل أولًا.',
  NOT_FOUND: 'العنصر غير موجود في هذه المساحة.',
  CONVERSATION_CHANGED: 'وصلت رسالة أحدث أو رد موظف. راجع المحادثة بدل إرسال مسودة قديمة.',
  INTEGRATION_INACTIVE: 'فعّل التكامل وجدّد مفاتيحه قبل اختبار الاتصال.',
  WALLET_INSUFFICIENT: 'رصيد واتساب غير كافٍ للرسالة المدفوعة. اشحن المحفظة ثم حاول.',
  WALLET_RATE_UNAVAILABLE: 'تعرفة هذه الوجهة غير متاحة حاليًا. تواصل مع الدعم.',
};
function fail(code: string): StudioResult {
  return {
    ok: false,
    message:
      errors[code] ?? 'تعذر حفظ التغيير. تحقق من البيانات وحالة الاشتراك.',
  };
}
function refresh() {
  revalidatePath('/[locale]/app', 'layout');
}
export async function saveStudio(
  kind: string,
  id: string | null,
  data: unknown,
): Promise<StudioResult> {
  const { context } = await tenantUsage();
  const schemas: Record<string, z.ZodType> = {
    flow: flowSchema,
    settings: settingsSchema,
    knowledge: z.object({
      title: z.string().trim().min(1).max(120),
      content: z.string().trim().min(1).max(8000),
    }),
    draft: templateSchema,
    integration: z.object({
      name: z.string().trim().min(1).max(120),
      endpoint_url: z
        .string()
        .max(2048)
        .transform((value) => webhookUrl(value).toString()),
    }),
  };
  try {
    if (!schemas[kind] || (id && !z.uuid().safeParse(id).success))
      return fail('INVALID');
    const parsed = schemas[kind].safeParse(data);
    if (!parsed.success)
      return { ok: false, message: parsed.error.issues[0].message };
    if (kind === 'flow') {
      const flow = parsed.data as z.infer<typeof flowSchema>;
      if (
        flow.status === 'active' &&
        flow.definition.action === 'ai' &&
        !aiReady()
      )
        return {
          ok: false,
          message:
            'ربط الذكاء الاصطناعي لم يُفعّل على المنصة بعد. يمكنك حفظ المسار كمسودة.',
        };
      if (flow.status === 'active' && flow.definition.action === 'ai') {
        const allowance = await aiStatus(context.tenantId, context.userId);
        if (!allowance.enabled || allowance.dailyRemaining < 1)
          return { ok: false, message: 'لا توجد حصة ذكاء اصطناعي متاحة الآن. احفظ المسار كمسودة حتى تفعيل الحصة؛ الاشتراك لا يمنحها تلقائيًا.' };
        const knowledge = await createAdminClient().from('bot_knowledge').select('id').eq('tenant_id', context.tenantId).limit(1);
        if (knowledge.error || !knowledge.data?.length)
          return { ok: false, message: 'أضف معلومات النشاط إلى قاعدة المعرفة قبل تفعيل المساعد.' };
      }
    }
    const { error, data: savedId } = await createAdminClient().rpc(
      'soulvd_studio_save',
      {
        p_tenant: context.tenantId,
        p_actor: context.userId,
        p_kind: kind,
        p_id: id,
        p_data: parsed.data,
      },
    );
    if (error) return fail(error.message);
    refresh();
    return {
      ok: true,
      id: savedId,
      message:
        kind === 'integration'
          ? 'سُجل طلب التكامل. ينتظر مراجعة الإدارة وتأكيد تحويل 100 ريال.'
          : 'تم الحفظ.',
    };
  } catch {
    return {
      ok: false,
      message:
        'تحقق من المدخلات؛ رابط التكامل يجب أن يكون HTTPS عامًا دون بيانات دخول.',
    };
  }
}
export async function contactAutomation(
  id: string,
  paused: boolean,
): Promise<StudioResult> {
  const { context } = await tenantUsage();
  if (
    !['owner', 'admin'].includes(context.role) ||
    !z.uuid().safeParse(id).success
  )
    return fail('FORBIDDEN');
  const db = createAdminClient();
  const { data: settings, error: settingsError } = paused
    ? await db.from('bot_settings').select('handoff_email').eq('tenant_id', context.tenantId).maybeSingle()
    : { data: null, error: null };
  if (settingsError) return fail('HANDOFF_SETTINGS_UNAVAILABLE');
  const { error } = await db
    .from('whatsapp_contacts')
    .update(paused
      ? { bot_paused: true, handoff_at: new Date().toISOString(), handoff_reason: 'MANUAL', handoff_assignee_email: settings?.handoff_email ?? null, handoff_notified_at: null }
      : { bot_paused: false, handoff_at: null, handoff_reason: null, handoff_assignee_email: null, handoff_notified_at: null })
    .eq('id', id)
    .eq('tenant_id', context.tenantId);
  if (error) return fail(error.message);
  refresh();
  return {
    ok: true,
    message: paused
      ? 'تم تحويل المحادثة إلى موظف.'
      : 'تم استئناف البوت لهذه المحادثة. موافقة التسويق تُدار بشكل مستقل.',
  };
}
export async function approveDraft(
  id: string,
  body: string,
): Promise<StudioResult> {
  const { context } = await tenantUsage();
  if (
    !['owner', 'admin'].includes(context.role) ||
    !z.uuid().safeParse(id).success ||
    !body.trim() ||
    body.length > 4096
  )
    return fail('FORBIDDEN');
  const db = createAdminClient();
  const own = await db
    .from('automation_runs')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', context.tenantId)
    .eq('state', 'draft')
    .maybeSingle();
  if (own.error || !own.data) return fail('NOT_FOUND');
  const result = await db.rpc('soulvd_automation_send', {
    p_run: id,
    p_actor: context.userId,
    p_body: body,
    p_manual: true,
  });
  if (result.error) return fail(result.error.message);
  if (!result.data.allowed)
    return {
      ok: false,
      message: errors[result.data.code] ?? 'تعذر الإرسال: تحقق من نافذة 24 ساعة وحصة الاشتراك.',
    };
  try { await dispatchOne(result.data.id); } catch { /* The admitted job remains recoverable by the scheduler. */ }
  refresh();
  return { ok: true, message: 'سُجل الرد. تابع حالة التسليم في صفحة واتساب.' };
}
export async function testIntegration(id: string): Promise<StudioResult> {
  const { context } = await tenantUsage();
  if (!z.uuid().safeParse(id).success) return fail('NOT_FOUND');
  const result = await createAdminClient().rpc('soulvd_crm_test', {
    p_tenant: context.tenantId, p_actor: context.userId, p_id: id,
  });
  if (result.error) return fail(result.error.message);
  refresh();
  return { ok: true, id: result.data, message: 'سُجل اختبار الاتصال بلا بيانات عملاء. تابع نتيجة integration.test في سجل التسليم؛ التسجيل وحده لا يعني نجاح الاتصال.' };
}
export async function integrationKeys(
  id: string,
  disable = false,
): Promise<StudioResult> {
  const { context } = await tenantUsage();
  if (!z.uuid().safeParse(id).success) return fail('NOT_FOUND');
  const apiKey = `slv_${randomBytes(32).toString('hex')}`,
    signingSecret = randomBytes(32).toString('hex');
  const result = await createAdminClient().rpc('soulvd_crm_credentials', {
    p_tenant: context.tenantId,
    p_actor: context.userId,
    p_id: id,
    p_hash: createHash('sha256').update(apiKey).digest('hex'),
    p_secret: encryptToken(signingSecret),
    p_disable: disable,
  });
  if (result.error) return fail(result.error.message);
  refresh();
  return disable
    ? { ok: true, message: 'تم تعطيل التكامل ومفتاحه.' }
    : {
        ok: true,
        message:
          'فُعّل التكامل. انسخ المفتاح وسر التوقيع الآن؛ يُعرضان مرة واحدة. ينتهي المفتاح بعد 90 يومًا. التوليد مجددًا يلغي المفتاح السابق.',
        apiKey,
        signingSecret,
      };
}
