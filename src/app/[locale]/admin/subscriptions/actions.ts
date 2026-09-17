'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { currentMerchant } from '@/lib/tenancy/context';
import { createAdminClient } from '@/lib/supabase/admin';

export async function confirmTransfer(_previous: { message?: string }, form: FormData) {
  const { db, user } = await currentMerchant();
  const { data: profile, error } = await db.from('users').select('role').eq('id', user.id).single();
  if (error || profile?.role !== 'owner') return { message: 'التأكيد متاح لمالك المنصة فقط.' };
  const parsed = z.object({ tenant: z.string().uuid(), reference: z.string().trim().min(3).max(120), amount: z.coerce.number().positive().refine(n => Number.isSafeInteger(Math.round(n * 100)) && Math.abs(n * 100 - Math.round(n * 100)) < 0.00001), purpose: z.enum(['subscription', 'upgrade']), verified: z.literal('on') }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: 'أدخل المبلغ ورقم التحويل وأكد وصوله إلى حساب البنك.' };
  const input = parsed.data;
  const result = await createAdminClient().rpc('soulvd_confirm_bank_transfer', { p_actor: user.id, p_tenant: input.tenant, p_reference: input.reference, p_amount: Math.round(input.amount * 100), p_purpose: input.purpose });
  if (result.error) {
    const messages: Record<string, string> = { AMOUNT_MISMATCH: 'المبلغ لا يطابق قيمة الباقة أو فرق الترقية.', REFERENCE_ALREADY_USED: 'رقم التحويل مسجل لاشتراك أو مبلغ آخر.', TEST_WORKSPACE: 'لا تسجل دفعات على مساحات الاختبار.', UPGRADE_NOT_AVAILABLE: 'الترقية متاحة فقط لاشتراك انطلاق نشط.' };
    messages.CYCLE_STILL_ACTIVE = 'الدورة الحالية نشطة. سجل التجديد بعد انتهائها؛ لا تدمج حصتي شهرين في دورة واحدة.';
    return { message: messages[result.error.message] ?? 'تعذر تأكيد التحويل. راجع حالة الاشتراك؛ لا تكرر التأكيد برقم مختلف.' };
  }
  revalidatePath('/[locale]/admin/subscriptions', 'page');
  revalidatePath('/[locale]/app', 'layout');
  return { message: 'تم توثيق التحويل وتحديث الاشتراك بنجاح.' };
}
