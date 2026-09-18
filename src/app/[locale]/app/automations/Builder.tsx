'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  saveStudio,
  contactAutomation,
  approveDraft,
  type StudioResult,
} from '../studio/actions';
import { buttonClass, cardClass, inputClass } from '../studio/ui';
import type { Flow } from '@/lib/studio/schema';
import type { AIStatus } from '@/lib/studio/ai-status';
type Settings = {
  enabled: boolean;
  instructions: string;
  daily_limit: number;
  cooldown_seconds: number;
};
type Run = {
  id: string;
  state: string;
  output: string | null;
  error_code: string | null;
  created_at: string;
  input_tokens: number | null;
  output_tokens: number | null;
  incoming: string;
  phone: string;
};
const reasons: Record<string, string> = {
  NO_MATCH: 'لا يوجد مسار مطابق',
  COOLDOWN: 'فترة انتظار بين الردود',
  AI_NOT_CONFIGURED: 'مزود الذكاء الاصطناعي غير مفعّل',
  AI_DAILY_LIMIT: 'بلغ الحد اليومي للذكاء الاصطناعي',
  AI_ACCESS_OR_LIMIT: 'حصة الذكاء الاصطناعي غير مفعّلة أو انتهت',
  STALE_MESSAGE: 'رسالة قديمة',
  HUMAN_TAKEOVER: 'تدخل موظف',
  INACTIVE_OR_PAUSED: 'البوت متوقف أو الاشتراك غير نشط',
  CUSTOMER_REQUEST: 'طلب العميل موظفًا أو إيقافًا',
  FLOW_HANDOFF: 'تحويل إلى موظف',
  AI_HANDOFF: 'تحتاج متابعة موظف',
  AI_PROVIDER_UNAVAILABLE: 'تعذر الرد الذكي؛ حُوّلت المحادثة لموظف',
  CONVERSATION_CHANGED: 'تغيّرت المحادثة؛ راجع آخر رسائل العميل',
  KNOWLEDGE_REQUIRED: 'أضف معلومات النشاط',
  AUTOMATION_FAILED: 'تعذر التنفيذ؛ راجع الإعدادات',
  WORKER_INTERRUPTED: 'انقطع التنفيذ؛ لم نكرر الرد تلقائيًا',
};
export default function Builder({
  flows,
  settings,
  knowledge,
  runs,
  contacts,
  canManage,
  aiAvailable,
  allowance,
  flowLimit,
}: {
  flows: Flow[];
  settings: Settings | null;
  knowledge: { id: string; title: string; content: string }[];
  runs: Run[];
  contacts: { id: string; wa_id: string; bot_paused: boolean }[];
  canManage: boolean;
  aiAvailable: boolean;
  allowance: AIStatus | null;
  flowLimit: number | null;
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<StudioResult>();
  const [edit, setEdit] = useState<Flow | null>(null);
  const [knowledgeEdit, setKnowledgeEdit] = useState<string | null>(null);
  const router = useRouter();
  async function saveFlow(data: unknown) {
    const result = await saveStudio('flow', edit?.id ?? null, data);
    if (result.ok && result.id) setEdit({ ...(data as Flow), id: result.id });
    return result;
  }
  async function saveKnowledge(data: unknown) {
    const result = await saveStudio('knowledge', knowledgeEdit, data);
    if (result.ok && result.id) setKnowledgeEdit(result.id);
    return result;
  }
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) router.refresh();
    }, 10000);
    return () => window.clearInterval(timer);
  }, [router]);
  function act(fn: () => Promise<StudioResult>) {
    start(async () => {
      try {
        setResult(await fn());
        router.refresh();
      } catch {
        setResult({
          ok: false,
          message: 'تعذر إكمال الطلب. حاول بعد تحديث الصفحة.',
        });
      }
    });
  }
  const settingsValue = settings ?? {
    enabled: false,
    instructions: '',
    daily_limit: 20,
    cooldown_seconds: 60,
  };
  return (
    <div className="space-y-6">
      {result && (
        <p
          role="status"
          className={`${cardClass} ${result.ok ? 'text-sage-900' : 'text-red-700'}`}
        >
          {result.message}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ['البوت', settings?.enabled ? 'مفعّل' : 'متوقف'],
          [
            'الذكاء الاصطناعي',
            !aiAvailable ? 'غير مفعّل حاليًا' : allowance?.enabled ? `${allowance.remaining} رد متبقٍ` : 'الحصة غير متاحة أو انتهت',
          ],
          [
            'المسارات',
            `${flows.filter((f) => f.status !== 'archived').length} / ${flowLimit ?? 'غير محدود'}`,
          ],
        ].map(([label, value]) => (
          <div key={label} className={cardClass}>
            <p className="text-sm text-wood-600">{label}</p>
            <p className="mt-2 text-xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      {allowance && <div className="rounded-2xl border border-sage-300 bg-sage-50 p-5">
        <Link href="/app/ai" className="font-bold underline">مساعد سولفد الذكي · الحصة والشحن الإضافي ←</Link>
        {allowance.total>0 && allowance.remaining<=allowance.total*0.2 && <p role="status" className="mt-2 text-sm">{allowance.remaining===0?'انتهت حصة الردود الذكية. أضف رصيدًا لاستئناف المساعد.':'اقتربت من نهاية حصة الردود الذكية؛ استهلكت 80% أو أكثر.'}</p>}
      </div>}
      {canManage && (
        <>
          <form
            className={cardClass + ' space-y-4'}
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              act(() =>
                saveStudio('settings', null, {
                  enabled: f.has('enabled'),
                  instructions: f.get('instructions'),
                  daily_limit: Number(f.get('daily_limit')),
                  cooldown_seconds: Number(f.get('cooldown_seconds')),
                }),
              );
            }}
          >
            <h2 className="text-xl font-bold">إعدادات البوت ومعرفة النشاط</h2>
            <label className="flex gap-3">
              <input
                name="enabled"
                type="checkbox"
                defaultChecked={settingsValue.enabled}
              />
              تشغيل المسارات النشطة للرسائل الجديدة
            </label>
            <label className="block">
              هوية المساعد وتعليمات النشاط
              <textarea
                name="instructions"
                maxLength={4000}
                defaultValue={settingsValue.instructions}
                rows={4}
                className={inputClass}
                placeholder="عرّف النشاط، أسلوب الرد، ومتى يجب تحويل العميل إلى موظف."
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                حد طلبات الذكاء الاصطناعي يوميًا
                <input
                  className={inputClass}
                  name="daily_limit"
                  type="number"
                  min={1}
                  max={1000}
                  defaultValue={settingsValue.daily_limit}
                  required
                />
              </label>
              <label>
                أقل فترة بين ردود البوت للعميل (ثوانٍ)
                <input
                  className={inputClass}
                  name="cooldown_seconds"
                  type="number"
                  min={10}
                  max={86400}
                  defaultValue={settingsValue.cooldown_seconds}
                  required
                />
              </label>
            </div>
            <p className="text-sm leading-7">
              الحد اليومي يقلّل الاستخدام ولا يمنح رصيدًا. الردود الذكية تتطلب
              حصة مفعّلة من المنصة، وتتوقف عند انتهائها.
            </p>
            {allowance?.enabled && <p className="text-sm">المتبقي اليوم: {Math.min(allowance.remaining, allowance.dailyRemaining)} طلب. تنتهي الحصة في {allowance.expiresAt ? new Date(allowance.expiresAt).toLocaleDateString('ar-SA', { calendar: 'gregory', timeZone: 'Asia/Riyadh' }) : '—'}.</p>}
            <p className="rounded-xl bg-amber-50 p-3 text-sm leading-7">عند تعذر الذكاء الاصطناعي أو انتهاء حصته، تتوقف الردود الذكية لهذه المحادثة وتُحال لموظف. معرفة النشاط مرجع عام؛ لا تؤكد حجزًا أو تقرأ ملف عميل من نظام خارجي دون تكامل منفّذ ومختبر.</p>
            <p className="text-sm leading-7">
              يستخدم المساعد معلومات نشاطك مرجعًا للإجابة. ابدأ بوضع «مسودة لمراجعة موظف»
              وراجع الإجابات قبل تشغيل الإرسال التلقائي. الطلبات الذكية تخضع
              لحد يومي؛ كلمة «موظف» تحول المحادثة، وكلمة «إيقاف»
              توقف البوت والتسويق.
            </p>
            <button disabled={pending} className={buttonClass}>
              حفظ الإعدادات
            </button>
          </form>
          <div className="grid gap-6 lg:grid-cols-2">
            <section className={cardClass + ' space-y-4'}>
              <h2 className="text-xl font-bold">مسارات الأتمتة</h2>
              <p className="text-sm">
                ينفذ أول مسار مطابق حسب الأولوية، والأرقام الأصغر أولًا. الإنشاء
                والتعديل لا يغيران ردود الرسائل السابقة.
              </p>
              {flows
                .filter((f) => f.status !== 'archived')
                .map((f) => (
                  <article
                    key={f.id}
                    className="rounded-xl border border-sage-100 p-4"
                  >
                    <b>{f.name}</b>
                    <p className="my-2 text-sm">
                      أولوية {f.priority} ·{' '}
                      {f.status === 'active' ? 'نشط' : 'مسودة'} ·{' '}
                      {f.definition?.action === 'ai'
                        ? 'ذكاء اصطناعي'
                        : f.definition?.action === 'handoff'
                          ? 'تحويل لموظف'
                          : 'رد محدد'}
                    </p>
                    <button
                      type="button"
                      className="underline"
                      onClick={() => setEdit(f)}
                    >
                      تعديل
                    </button>
                  </article>
                ))}
              <button
                type="button"
                className="underline"
                onClick={() => setEdit(null)}
              >
                إنشاء مسار جديد
              </button>
            </section>
            <form
              key={edit?.id ?? 'new'}
              className={cardClass + ' space-y-4'}
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                act(() =>
                  saveFlow({
                    name: f.get('name'),
                    priority: Number(f.get('priority')),
                    status: f.get('status'),
                    definition: {
                      trigger: f.get('trigger'),
                      keywords: String(f.get('keywords'))
                        .split(/[,،\n]/)
                        .map((s) => s.trim())
                        .filter(Boolean),
                      action: f.get('action'),
                      mode: f.get('mode'),
                      reply: f.get('reply'),
                    },
                  }),
                );
              }}
            >
              <h2 className="text-xl font-bold">
                {edit ? 'تعديل المسار' : 'مسار جديد'}
              </h2>
              <label className="block">
                الاسم
                <input
                  required
                  name="name"
                  maxLength={120}
                  defaultValue={edit?.name}
                  className={inputClass}
                />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label>
                  المشغّل
                  <select
                    name="trigger"
                    className={inputClass}
                    defaultValue={edit?.definition?.trigger ?? 'keywords'}
                  >
                    <option value="keywords">كلمات مفتاحية</option>
                    <option value="all">أي رسالة نصية</option>
                  </select>
                </label>
                <label>
                  الأولوية
                  <input
                    required
                    name="priority"
                    type="number"
                    min={1}
                    max={999}
                    defaultValue={edit?.priority ?? 100}
                    className={inputClass}
                  />
                </label>
              </div>
              <label className="block">
                الكلمات (افصل بينها بفاصلة عربية أو إنجليزية)
                <input
                  name="keywords"
                  defaultValue={edit?.definition?.keywords?.join(', ')}
                  className={inputClass}
                  placeholder="أسعار, موعد, شحن"
                />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label>
                  الإجراء
                  <select
                    name="action"
                    className={inputClass}
                    defaultValue={edit?.definition?.action ?? 'text'}
                  >
                    <option value="text">رد محدد</option>
                    <option value="ai">رد بالذكاء الاصطناعي</option>
                    <option value="handoff">تحويل إلى موظف</option>
                  </select>
                </label>
                <label>
                  طريقة التنفيذ
                  <select
                    name="mode"
                    className={inputClass}
                    defaultValue={edit?.definition?.mode ?? 'draft'}
                  >
                    <option value="draft">مسودة لمراجعة موظف</option>
                    <option value="auto">إرسال تلقائي</option>
                  </select>
                </label>
              </div>
              <label className="block">
                نص الرد المحدد
                <textarea
                  name="reply"
                  rows={4}
                  maxLength={4096}
                  defaultValue={edit?.definition?.reply}
                  className={inputClass}
                />
              </label>
              <label className="block">
                الحالة
                <select
                  name="status"
                  className={inputClass}
                  defaultValue={edit?.status ?? 'draft'}
                >
                  <option value="draft">مسودة / متوقف</option>
                  <option value="active">نشط</option>
                  {edit && <option value="archived">أرشفة المسار</option>}
                </select>
              </label>
              <button disabled={pending} className={buttonClass}>
                حفظ المسار
              </button>
            </form>
          </div>
          <section className={cardClass + ' space-y-4'}>
            <h2 className="text-xl font-bold">قاعدة المعرفة</h2>
            <p>
              أضف معلومات الأسعار والخدمات والسياسات والأسئلة الشائعة. لا تُضف
              كلمات مرور أو بيانات شخصية لا يحتاجها المساعد.
            </p>
            <div className="flex flex-wrap gap-3">
              {knowledge.map((k) => (
                <button
                  type="button"
                  className="rounded-lg border p-2"
                  key={k.id}
                  onClick={() => setKnowledgeEdit(k.id)}
                >
                  {k.title}
                </button>
              ))}
              <button
                type="button"
                className="underline"
                onClick={() => setKnowledgeEdit(null)}
              >
                إضافة مصدر
              </button>
            </div>
            <form
              key={knowledgeEdit ?? 'new-knowledge'}
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                act(() =>
                  saveKnowledge({
                    title: f.get('title'),
                    content: f.get('content'),
                  }),
                );
              }}
            >
              <label className="block">
                العنوان
                <input
                  name="title"
                  maxLength={120}
                  required
                  className={inputClass}
                  defaultValue={
                    knowledge.find((k) => k.id === knowledgeEdit)?.title
                  }
                />
              </label>
              <label className="block">
                المحتوى
                <textarea
                  name="content"
                  rows={6}
                  maxLength={8000}
                  required
                  className={inputClass}
                  defaultValue={
                    knowledge.find((k) => k.id === knowledgeEdit)?.content
                  }
                />
              </label>
              <button disabled={pending} className={buttonClass}>
                حفظ المعرفة
              </button>
            </form>
          </section>
        </>
      )}
      <section className={cardClass + ' space-y-4'}>
        <h2 className="text-xl font-bold">سجل التنفيذ والردود المقترحة</h2>
        {!runs.length && (
          <p>ستظهر النتائج بعد وصول رسالة جديدة تطابق مسارًا نشطًا.</p>
        )}
        {runs.map((r) => (
          <article key={r.id} className="space-y-3 rounded-xl border p-4">
            <p className="text-sm">
              {new Date(r.created_at).toLocaleString('ar-SA', {
                timeZone: 'Asia/Riyadh',
              })}{' '}
              ·{' '}
              {
                (
                  {
                    queued: 'في الانتظار',
                    processing: 'قيد التنفيذ',
                    draft: 'مسودة جاهزة',
                    sent: 'في سجل الإرسال',
                    skipped: 'تم تجاوزها',
                    failed: 'تعذر التنفيذ',
                    handoff: 'متابعة موظف',
                  } as Record<string, string>
                )[r.state]
              }
              {r.error_code
                ? ` · ${reasons[r.error_code] ?? r.error_code}`
                : ''}
            </p>
            <p className="text-sm font-semibold">
              العميل: <bdi>{r.phone}</bdi>
            </p>
            <blockquote className="whitespace-pre-wrap rounded bg-sage-50 p-3">
              {r.incoming}
            </blockquote>
            {r.output && <p className="whitespace-pre-wrap">{r.output}</p>}
            {r.input_tokens !== null && (
              <p className="text-xs">
                استهلاك النموذج: {r.input_tokens} إدخال / {r.output_tokens ?? 0}{' '}
                إخراج
              </p>
            )}
            {r.state === 'draft' && canManage && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  act(() => approveDraft(r.id, String(f.get('body'))));
                }}
              >
                <textarea
                  aria-label="تعديل الرد المقترح"
                  name="body"
                  defaultValue={r.output ?? ''}
                  maxLength={4096}
                  required
                  className={inputClass}
                />
                <button disabled={pending} className={buttonClass + ' mt-3'}>
                  اعتماد الرد وإرساله
                </button>
              </form>
            )}
          </article>
        ))}
      </section>
      {canManage && (
        <section className={cardClass + ' space-y-4'}>
          <h2 className="text-xl font-bold">تدخل الموظف</h2>
          {contacts.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b py-3"
            >
              <bdi>{c.wa_id}</bdi>
              <span>{c.bot_paused ? 'البوت متوقف' : 'البوت متاح'}</span>
              <button
                className="underline"
                disabled={pending}
                onClick={() =>
                  act(() => contactAutomation(c.id, !c.bot_paused))
                }
              >
                {c.bot_paused ? 'استئناف البوت' : 'تحويل لموظف'}
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
