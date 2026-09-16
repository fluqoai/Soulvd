'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function SetPasswordPage() {
  const started = useRef(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] = useState('جارٍ التحقق من رابط الدعوة…');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const verify = async () => {
      try {
        const params = new URLSearchParams(window.location.hash.slice(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');
        // Never fall back to another account already signed in in this browser.
        if (!accessToken || !refreshToken || !['invite', 'recovery'].includes(type ?? '')) {
          throw new Error('Invalid invitation');
        }
        window.history.replaceState(null, '', window.location.pathname);
        const client = createClient();
        const { data, error } = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error || !data.user) throw new Error('Invalid invitation');
        const verified = await client.auth.getUser();
        if (verified.error || verified.data.user?.id !== data.user.id) throw new Error('Invalid user');
        setUserId(data.user.id);
        setMessage(`عيّن كلمة مرور للحساب ${verified.data.user.email ?? ''}`);
      } catch {
        setMessage('تعذر التحقق من الرابط. اطلب دعوة جديدة ثم افتح الرابط من بريدك.');
      }
    };
    void verify();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId || busy) return;
    if (password.length < 12 || password !== confirmation) {
      setMessage('استخدم 12 حرفًا على الأقل، وتأكد من تطابق كلمتي المرور.');
      return;
    }
    setBusy(true);
    try {
      const client = createClient();
      const current = await client.auth.getUser();
      if (current.error || current.data.user?.id !== userId) throw new Error('Session changed');
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      await client.auth.signOut();
      window.location.replace('/login');
    } catch {
      setMessage('تعذر حفظ كلمة المرور. تحقق من صلاحية الرابط ومتطلبات كلمة المرور وحاول مجددًا.');
      setBusy(false);
    }
  }

  return <main dir="rtl" lang="ar" className="min-h-screen flex items-center justify-center bg-paper px-6 py-12">
    <div className="w-full max-w-sm rounded-2xl border border-sage-200 bg-white p-7">
      <h1 className="text-2xl font-semibold text-ink-900 mb-4">تعيين كلمة المرور</h1>
      <p role="status" className="text-sm text-ink-600 mb-6">{message}</p>
      {userId && <form onSubmit={submit} className="space-y-4">
        <label className="block">كلمة المرور الجديدة<input type="password" autoComplete="new-password" minLength={12} required disabled={busy} value={password} onChange={event => setPassword(event.target.value)} className="mt-2 w-full rounded border border-sage-200 p-3" /></label>
        <label className="block">تأكيد كلمة المرور<input type="password" autoComplete="new-password" minLength={12} required disabled={busy} value={confirmation} onChange={event => setConfirmation(event.target.value)} className="mt-2 w-full rounded border border-sage-200 p-3" /></label>
        <button disabled={busy} className="w-full rounded bg-sage-900 text-white p-3 disabled:opacity-50">{busy ? 'جارٍ الحفظ…' : 'حفظ كلمة المرور'}</button>
      </form>}
      <Link href="/login" className="mt-5 block text-sm underline">العودة إلى تسجيل الدخول</Link>
    </div>
  </main>;
}
