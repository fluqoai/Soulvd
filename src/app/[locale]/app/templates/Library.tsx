'use client';
import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { saveStudio, type StudioResult } from '../studio/actions';
import { createTemplate } from '../whatsapp/actions';
import { buttonClass, cardClass, inputClass } from '../studio/ui';
import type { LibraryTemplate } from '@/lib/studio/library';
type Draft = {
  id?: string;
  name: string;
  body: string;
  category: 'UTILITY' | 'MARKETING';
  language: 'ar' | 'en_US';
  examples: string[];
  library_key?: string | null;
};
const empty: Draft = {
  name: '',
  body: '',
  category: 'UTILITY',
  language: 'ar',
  examples: [],
};
export default function Library({
  library,
  drafts,
  canManage,
  pro,
}: {
  library: LibraryTemplate[];
  drafts: Draft[];
  canManage: boolean;
  pro: boolean;
}) {
  const [value, setValue] = useState<Draft>(empty);
  const [samples, setSamples] = useState('');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<StudioResult>();
  const [pending, start] = useTransition();
  const reviewKey = useRef('');
  function choose(d: Draft) {
    setValue(d);
    setSamples(d.examples.join('\n'));
    reviewKey.current = '';
    document
      .getElementById('editor')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function submit(review: boolean) {
    start(async () => {
      try {
        const data = {
          ...value,
          examples: samples
            .split('\n')
            .map((x) => x.trim())
            .filter(Boolean),
        };
        const saved = await saveStudio('draft', value.id ?? null, data);
        if (!saved.ok) {
          setResult(saved);
          return;
        }
        setValue({ ...data, id: saved.id });
        if (review) {
          reviewKey.current ||= crypto.randomUUID();
          const r = await createTemplate({
            requestId: reviewKey.current,
            ...data,
          });
          setResult({ ok: r.ok, message: r.message });
          if (r.ok) reviewKey.current = '';
        } else setResult(saved);
      } catch {
        setResult({
          ok: false,
          message: 'تعذر تأكيد الطلب. راجع القوالب والسجل قبل إعادة الإرسال.',
        });
      }
    });
  }
  return (
    <div className="space-y-6">
      {result && (
        <p role="status" className={cardClass}>
          {result.message}
        </p>
      )}
      {!pro ? (
        <p className={cardClass}>
          مكتبة 20 قالبًا جاهزًا متاحة في{' '}
          <Link href="/app/billing/upgrade" className="underline">
            باقة النمو الاحترافية
          </Link>
          . يمكنك إنشاء قالبك الخاص أدناه ضمن حدود باقتك.
        </p>
      ) : (
        <section className="space-y-4">
          <label className="block">
            البحث في المكتبة
            <input
              className={inputClass}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="شحن، موعد، فاتورة…"
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {library
              .filter((t) => `${t.title} ${t.sector}`.includes(query))
              .map((t) => (
                <article
                  key={t.key}
                  className={cardClass + ' flex flex-col gap-3'}
                >
                  <div className="flex justify-between gap-3 text-xs">
                    <span className="rounded-full bg-sage-50 px-3 py-1">
                      {t.sector}
                    </span>
                    <span>
                      {t.category === 'MARKETING' ? 'تسويقي' : 'خدمي'}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold">{t.title}</h2>
                  <p className="flex-1 whitespace-pre-wrap text-sm leading-7">
                    {t.body}
                  </p>
                  <button
                    disabled={!canManage}
                    className="text-start font-semibold underline"
                    onClick={() =>
                      choose({
                        name: t.key,
                        body: t.body,
                        category: t.category,
                        language: 'ar',
                        examples: t.examples,
                        library_key: t.key,
                      })
                    }
                  >
                    تخصيص نسخة
                  </button>
                </article>
              ))}
          </div>
        </section>
      )}
      {canManage && (
        <section className={cardClass + ' space-y-5'} id="editor">
          <div className="flex justify-between gap-4">
            <h2 className="text-xl font-bold">
              {value.id ? 'تعديل مسودة' : 'إنشاء قالب أو لصق نص من مصدر آخر'}
            </h2>
            <button className="underline" onClick={() => choose(empty)}>
              مسودة جديدة
            </button>
          </div>
          <p className="text-sm leading-7">
            الصق نصًا تملك حق استخدامه، ثم عدّل المتغيرات بالصيغة {'{{1}}'} و
            {'{{2}}'}. كل قالب يحتاج اعتماد Meta؛ المكتبة لا تضمن الاعتماد ولا
            تلغي موافقة العميل على الرسائل التسويقية.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <label>
              اسم القالب بالإنجليزية
              <input
                dir="ltr"
                className={inputClass}
                value={value.name}
                onChange={(e) => setValue({ ...value, name: e.target.value })}
                maxLength={120}
              />
            </label>
            <label>
              الفئة
              <select
                className={inputClass}
                value={value.category}
                onChange={(e) =>
                  setValue({
                    ...value,
                    category: e.target.value as Draft['category'],
                  })
                }
              >
                <option value="UTILITY">خدمي</option>
                <option value="MARKETING">تسويقي</option>
              </select>
            </label>
            <label>
              اللغة
              <select
                className={inputClass}
                value={value.language}
                onChange={(e) =>
                  setValue({
                    ...value,
                    language: e.target.value as Draft['language'],
                  })
                }
              >
                <option value="ar">العربية</option>
                <option value="en_US">English</option>
              </select>
            </label>
          </div>
          <label className="block">
            نص القالب
            <textarea
              rows={7}
              maxLength={1024}
              className={inputClass}
              value={value.body}
              onChange={(e) => setValue({ ...value, body: e.target.value })}
            />
          </label>
          <p className="text-xs">{value.body.length} / 1024 حرف</p>
          <label className="block">
            أمثلة المتغيرات: مثال لكل سطر بالترتيب
            <textarea
              rows={4}
              className={inputClass}
              value={samples}
              onChange={(e) => setSamples(e.target.value)}
              placeholder={'أحمد\nORD-1024'}
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              disabled={pending}
              className={buttonClass}
              onClick={() => submit(false)}
            >
              حفظ مسودة
            </button>
            <button
              disabled={pending}
              className={buttonClass}
              onClick={() => submit(true)}
            >
              حفظ وإرسال إلى مراجعة Meta
            </button>
          </div>
        </section>
      )}
      <section className={cardClass + ' space-y-3'}>
        <h2 className="text-xl font-bold">مسوداتي</h2>
        {!drafts.length && <p>احفظ نسخة من المكتبة أو أنشئ أول قالب.</p>}
        {drafts.map((d) => (
          <div
            key={d.id}
            className="flex items-center justify-between gap-4 border-b py-3"
          >
            <bdi>{d.name}</bdi>
            <button
              disabled={!canManage}
              onClick={() => choose(d)}
              className="underline"
            >
              فتح وتعديل
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
