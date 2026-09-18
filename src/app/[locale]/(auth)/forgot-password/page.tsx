'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim();
    setBusy(true);
    setMessage('');
    try {
      const { error } = await createClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/set-password`,
      });
      if (error?.status === 429) {
        setMessage('طلبات كثيرة خلال فترة قصيرة. انتظر بضع دقائق ثم حاول مجددًا.');
      } else if (error && error.status && error.status >= 500) {
        setMessage('تعذر إرسال الرابط الآن. حاول مجددًا بعد قليل.');
      } else {
        // Never disclose whether this address belongs to a Soulvd account.
        setSent(true);
      }
    } catch {
      setMessage('تحقق من اتصال الإنترنت وحاول مجددًا.');
    } finally { setBusy(false); }
  }
  return <main dir="rtl" lang="ar" className="min-h-screen flex items-center justify-center bg-paper px-6 py-12">
    <div className="w-full max-w-sm rounded-2xl border border-sage-200 bg-white p-7">
      <h1 className="text-2xl font-semibold mb-3">استعادة كلمة المرور</h1>
      <p className="mb-6 text-sm text-ink-600">أدخل بريد حسابك، وسنرسل رابطًا آمنًا لتعيين كلمة مرور جديدة.</p>
      {sent ? <p role="status" className="rounded-xl bg-sage-50 p-4 text-sm">إذا كان البريد مرتبطًا بحساب، سيصلك رابط الاستعادة. تحقق من البريد الوارد والرسائل غير المرغوب فيها، وافتح الرابط في هذا المتصفح.</p> :
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm">البريد الإلكتروني<input name="email" type="email" dir="ltr" autoComplete="email" maxLength={254} required disabled={busy} className="mt-2 w-full rounded-xl border p-3" /></label>
          {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-sage-900 p-3 text-white disabled:opacity-50">{busy ? 'جارٍ الإرسال…' : 'إرسال رابط الاستعادة'}</button>
        </form>}
      <Link href="/login" className="mt-6 block text-sm underline">العودة إلى تسجيل الدخول</Link>
    </div>
  </main>;
}
