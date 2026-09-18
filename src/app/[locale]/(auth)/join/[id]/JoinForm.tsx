'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { joinTeam } from './actions';

export default function JoinForm({ id, signedIn, email }: { id: string; signedIn: boolean; email?: string }) {
  const [state, action, busy] = useActionState(joinTeam, {});
  return <form action={action} className="space-y-4">
    <input type="hidden" name="id" value={id} />
    {signedIn ? <p className="text-sm">أنت مسجل بالبريد <b dir="ltr">{email}</b>. قبول الدعوة يفتح مساحة الفريق التي دُعيت إليها.</p> : <>
      <Link href={`/login?next=${encodeURIComponent('/join/' + id)}`} className="block rounded-xl border p-3 text-center">لدي حساب · تسجيل الدخول</Link>
      <p className="text-sm text-ink-500">أو أنشئ حساب عضو فريق بالبريد الذي استلم الدعوة، دون إنشاء منشأة أو شراء اشتراك جديد.</p>
      <label className="block text-sm">الاسم<input name="name" autoComplete="name" minLength={2} maxLength={80} required disabled={busy || state.sent} className="mt-2 w-full rounded-xl border p-3" /></label>
      <label className="block text-sm">البريد المدعو<input name="email" type="email" dir="ltr" autoComplete="email" maxLength={254} required disabled={busy || state.sent} className="mt-2 w-full rounded-xl border p-3" /></label>
      <label className="block text-sm">كلمة المرور<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required disabled={busy || state.sent} className="mt-2 w-full rounded-xl border p-3" /></label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="terms" required disabled={busy || state.sent} /><span>أوافق على <Link href="/terms" className="underline">الشروط</Link> و<Link href="/privacy" className="underline">سياسة الخصوصية</Link>.</span></label>
    </>}
    {state.message && <p role="status" className="rounded-xl bg-sage-50 p-3 text-sm">{state.message}</p>}
    {!state.sent && <button disabled={busy} className="w-full rounded-xl bg-sage-900 p-3 text-white disabled:opacity-50">{busy ? 'جارٍ المتابعة…' : signedIn ? 'قبول الدعوة وفتح مساحة الفريق' : 'إنشاء حساب عضو فريق'}</button>}
  </form>;
}
