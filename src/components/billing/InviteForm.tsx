'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { inviteTeamMember } from '@/app/[locale]/app/team/actions';
import { UpgradeModal } from './UpgradeModal';

export function InviteForm({ pro }: { pro: boolean }) {
  const [state, action, pending] = useActionState(inviteTeamMember, { allowed: false });
  return <><form action={action} className="space-y-4 rounded-xl border p-6">
    <h2 className="text-xl font-semibold">دعوة عضو للفريق</h2>
    <label className="block">البريد الإلكتروني<input type="email" name="email" required maxLength={254} className="mt-2 block w-full rounded-lg border p-3" /></label>
    <label className="block">الصلاحية<select name="role" className="ms-3 rounded-lg border p-2"><option value="agent">موظف</option><option value="admin">مدير</option></select></label>
    <button disabled={pending} className="rounded-lg bg-sage-700 px-5 py-3 text-white disabled:opacity-50">{pending ? 'جارٍ الإرسال…' : 'إرسال الدعوة'}</button>
    {state.allowed && <p role="status">تم إرسال الدعوة بالبريد وحجز المقعد حتى قبولها أو انتهاء صلاحيتها.</p>}
    {state.code && <div role="alert" className="rounded-lg bg-amber-50 p-4">{state.code === 'LIMIT_EXCEEDED' ? <>وصلت إلى حد المقاعد. {pro ? <Link href="/contact" className="underline">تواصل معنا</Link> : <Link href="/app/billing/upgrade" className="underline">الترقية إلى النمو الاحترافية</Link>}</> : state.code === 'SUBSCRIPTION_INACTIVE' ? 'فعّل الاشتراك لإضافة الفريق.' : state.code === 'EMAIL_FAILED' ? 'تم حجز المقعد، لكن تعذر إرسال البريد. أعد الإرسال من قائمة الدعوات أو ألغِ الدعوة لتحرير المقعد.' : state.code === 'RETRY_LATER' ? 'انتظر دقيقة قبل إعادة إرسال الدعوة.' : state.code === 'ALREADY_MEMBER' ? 'هذا الحساب عضو في الفريق بالفعل.' : 'تعذر إرسال الدعوة. تحقق من البيانات وصلاحيتك.'}</div>}
  </form>{!pro && <UpgradeModal result={state} />}</>;
}
