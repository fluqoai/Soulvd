'use client';
import { useActionState } from 'react';
import { manageInvitation } from '@/app/[locale]/app/team/actions';

export function PendingInvitations({ invitations }: { invitations: { id: string; email: string; role: string; expires_at: string; email_sent_at: string | null }[] }) {
  const [state, action, busy] = useActionState(manageInvitation, { allowed: false });
  return <section className="space-y-3"><h2 className="text-xl font-semibold">الدعوات المعلقة</h2>
    {!invitations.length && <p className="text-sm text-ink-500">لا توجد دعوات معلقة.</p>}
    {invitations.map(i => <form action={action} key={i.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4">
      <input type="hidden" name="id" value={i.id} />
      <div className="flex-1"><p dir="ltr" className="text-start">{i.email}</p><p className="mt-1 text-xs text-ink-500">{i.role === 'admin' ? 'مدير' : 'موظف'} · {i.email_sent_at ? 'أُرسل البريد' : 'لم يُرسل البريد'} · تنتهي {new Date(i.expires_at).toLocaleDateString('ar-SA', { calendar: 'gregory' })}</p></div>
      <button name="action" value="resend" disabled={busy} className="rounded-lg border px-3 py-2 disabled:opacity-50">إعادة الإرسال</button>
      <button name="action" value="revoke" disabled={busy} className="rounded-lg border px-3 py-2 text-red-700 disabled:opacity-50">إلغاء الدعوة</button>
    </form>)}
    {state.allowed && <p role="status" className="text-sm text-sage-800">تم تحديث الدعوة.</p>}
    {state.code && <p role="alert" className="text-sm text-red-700">{state.code === 'RETRY_LATER' ? 'انتظر دقيقة قبل إعادة الإرسال.' : 'تعذر تحديث الدعوة. تحقق من الصلاحية وحاول مجددًا.'}</p>}
  </section>;
}
