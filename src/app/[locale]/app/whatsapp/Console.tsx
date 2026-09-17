'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { createTemplate, finishSignup, refreshTemplates, sendMessage, type ActionResult } from './actions';

type Facebook = { init(options: object): void; login(callback: (response: { authResponse?: { code?: string } }) => void, options: object): void };
declare global { interface Window { FB?: Facebook } }
type Template = { id: string; name: string; status: string; language: string };
const field = 'w-full rounded-lg border border-sage-200 bg-white p-3';
const button = 'rounded-lg bg-sage-900 px-5 py-3 text-white hover:bg-sage-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-700 disabled:cursor-not-allowed disabled:opacity-50';

export default function WhatsAppConsole({ templates, canManage, canConnect, connected, appId, configId, version }: { templates: Template[]; canManage: boolean; canConnect: boolean; connected: boolean; appId?: string; configId?: string; version?: string }) {
  const router = useRouter();
  const [result, setResult] = useState<ActionResult>();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'api' | 'coexistence'>('coexistence');
  const code = useRef<string | null>(null);
  const assets = useRef<{ wabaId: string; phoneNumberId: string } | null>(null);
  const connecting = useRef(false);
  const finalized = useRef(false);
  const selectedMode = useRef(mode);
  // Preserve the same key after uncertain responses; a deliberate new submission
  // after an accepted result receives a new key.
  const messageKey = useRef(''); const templateKey = useRef('');
  useEffect(() => {
    let mounted = true;
    async function complete() {
      if (!code.current || !assets.current || finalized.current) return;
      finalized.current = true;
      try {
        const response = await finishSignup({ code: code.current, ...assets.current, mode: selectedMode.current });
        if (mounted) { setResult(response); router.refresh(); }
      } catch { if (mounted) setResult({ ok: false, message: 'تعذر حفظ نتيجة الربط. راجع حالة المساحة قبل إعادة المحاولة.' }); }
      finally { code.current = null; assets.current = null; connecting.current = false; if (mounted) setBusy(false); }
    }
    function receive(event: MessageEvent) {
      if (!connecting.current || !['https://www.facebook.com','https://web.facebook.com'].includes(event.origin)) return;
      let data;
      try { data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; } catch { return; }
      if (data?.type !== 'WA_EMBEDDED_SIGNUP') return;
      if (data.event === 'FINISH' || data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
        if (!data.data?.waba_id || !data.data?.phone_number_id) return;
        assets.current = { wabaId: String(data.data.waba_id), phoneNumberId: String(data.data.phone_number_id) };
        void complete();
      } else if (data.event === 'CANCEL' || data.event === 'ERROR') {
        code.current = null; assets.current = null; connecting.current = false; setBusy(false);
        setResult({ ok: false, message: 'لم يكتمل التسجيل لدى Meta.' });
      }
    }
    window.addEventListener('message', receive);
    const timer = window.setInterval(() => { if (!document.hidden) { void complete(); router.refresh(); } }, 10_000);
    return () => { mounted = false; window.removeEventListener('message', receive); window.clearInterval(timer); };
  }, [router]);

  async function submit(event: React.FormEvent<HTMLFormElement>, kind: 'message' | 'template') {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    setBusy(true);
    const key = kind === 'message' ? messageKey : templateKey;
    key.current ||= crypto.randomUUID();
    try {
      const response = kind === 'message'
        ? await sendMessage({ requestId: key.current, to: String(data.get('to')), body: String(data.get('body')), templateId: String(data.get('templateId') || '') || undefined, consent: data.get('consent') === 'on' })
        : await createTemplate({ requestId: key.current, name: String(data.get('name')), language: String(data.get('language')), category: String(data.get('category')), body: String(data.get('body')) });
      setResult(response);
      if (response.ok) { key.current = ''; form.reset(); }
      router.refresh();
    } catch { setResult({ ok: false, message: 'تعذر تأكيد الطلب. أعد المحاولة بالبيانات نفسها؛ سيُستخدم معرّف الطلب نفسه لمنع التكرار.' }); }
    finally { setBusy(false); }
  }
  function start() {
    if (!window.FB || !appId || !configId || !version) { setResult({ ok: false, message: 'لم تكتمل إعدادات Meta بعد.' }); return; }
    selectedMode.current = mode; code.current = null; assets.current = null; finalized.current = false; connecting.current = true; setBusy(true);
    window.FB.init({ appId, version, cookie: false, xfbml: false });
    window.FB.login(response => {
      if (!response.authResponse?.code) { connecting.current = false; setBusy(false); setResult({ ok: false, message: 'لم يصل رمز تفويض من Meta.' }); return; }
      code.current = response.authResponse.code;
    }, { config_id: configId, response_type: 'code', override_default_response_type: true,
      extras: { setup: {}, sessionInfoVersion: '3', ...(mode === 'coexistence' ? { featureType: 'whatsapp_business_app_onboarding' } : {}) } });
  }
  return <div className="space-y-6">
    {canConnect && appId && configId && version && <Script src="https://connect.facebook.net/en_US/sdk.js" strategy="afterInteractive" />}
    {result && <p role="status" className="rounded-lg border border-sage-200 bg-white p-4">{result.message}</p>}
    {canManage && <section className="rounded-xl border border-sage-200 bg-white p-5 space-y-4">
      <h2 className="text-xl font-bold">ربط الرقم</h2>
      <select aria-label="طريقة الربط" className={field} value={mode} onChange={event => setMode(event.target.value as typeof mode)}>
        <option value="coexistence">رقمي موجود في تطبيق واتساب الأعمال</option><option value="api">رقم مخصص لمنصة واتساب API</option>
      </select>
      <p className="text-sm">لا تحذف حساب تطبيق واتساب الأعمال. التسجيل والتفويض يتمان داخل نافذة Meta.</p>
      {!connected && <button className={button} disabled={busy || !canConnect || !appId || !configId || !version} onClick={start}>الربط عبر Meta</button>}
      <button className={`${button} ms-3`} disabled={busy || !connected} onClick={async () => { setBusy(true); try { setResult(await refreshTemplates()); router.refresh(); } catch { setResult({ ok: false, message: 'تعذر تحديث القوالب.' }); } finally { setBusy(false); } }}>تحديث القوالب</button>
      {connected ? <p className="text-sm">الرقم مربوط بهذه المساحة. يمكنك إرسال الرسائل وإدارة القوالب هنا.</p> : (!canConnect || !appId || !configId || !version) && <p className="text-sm">تواصل مع إدارة المنصة لإكمال تفعيل الرقم.</p>}
    </section>}
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={event => void submit(event, 'message')} className="space-y-4 rounded-xl border border-sage-200 bg-white p-5">
        <h2 className="text-xl font-bold">إرسال رسالة</h2>
        <label className="block">رقم العميل الدولي<input className={field} name="to" type="tel" placeholder="+9665xxxxxxxx" required maxLength={30} dir="ltr" /></label>
        <label className="block">نوع الرسالة<select className={field} name="templateId"><option value="">رد نصي خلال نافذة 24 ساعة</option>{templates.filter(template => template.status === 'approved').map(template => <option key={template.id} value={template.id}>{template.name} ({template.language})</option>)}</select></label>
        <label className="block">نص الرد<textarea className={field} name="body" maxLength={4096} /></label>
        <label className="flex gap-2"><input type="checkbox" name="consent" />أؤكد وجود موافقة العميل على استقبال رسائل القوالب.</label>
        <p className="text-sm">رسوم Meta منفصلة عن الاشتراك. اعتماد القالب لا يعني أن الرسالة مجانية.</p>
        <button className={button} disabled={busy || !connected}>إرسال</button>
      </form>
      {canManage && <form onSubmit={event => void submit(event, 'template')} className="space-y-4 rounded-xl border border-sage-200 bg-white p-5">
        <h2 className="text-xl font-bold">إنشاء قالب</h2>
        <label className="block">اسم القالب<input className={field} name="name" dir="ltr" placeholder="order_update" pattern="[a-z][a-z0-9_]*" maxLength={120} required /></label>
        <label className="block">اللغة<select className={field} name="language"><option value="ar">العربية</option><option value="en_US">English</option></select></label>
        <label className="block">الفئة<select className={field} name="category"><option value="UTILITY">خدمي</option><option value="MARKETING">تسويقي</option></select></label>
        <label className="block">نص القالب<textarea className={field} name="body" required maxLength={1024} /></label>
        <p className="text-sm">تدعم هذه النسخة قوالب نصية بلا متغيرات. القرار النهائي للفئة والاعتماد لدى Meta.</p>
        <button className={button} disabled={busy || !connected}>إرسال للمراجعة</button>
      </form>}
    </div>
  </div>;
}
