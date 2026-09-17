'use client';
import { useTransition, useState } from 'react';
import {
  saveStudio,
  integrationKeys,
  type StudioResult,
} from '../studio/actions';
import { buttonClass, cardClass, inputClass } from '../studio/ui';
type Integration = {
  id: string;
  name: string;
  endpoint_url: string;
  status: string;
};
export default function Connections({
  items,
  canManage,
}: {
  items: Integration[];
  canManage: boolean;
}) {
  const [result, setResult] = useState<StudioResult>();
  const [pending, start] = useTransition();
  function act(fn: () => Promise<StudioResult>) {
    start(async () => {
      try {
        setResult(await fn());
      } catch {
        setResult({
          ok: false,
          message: 'تعذر تنفيذ الطلب. حاول بعد تحديث الصفحة.',
        });
      }
    });
  }
  return (
    <div className="space-y-5">
      {result && (
        <div role="status" className={cardClass + ' space-y-3'}>
          <p>{result.message}</p>
          {result.apiKey && (
            <>
              <label className="block">
                API Key
                <input
                  readOnly
                  dir="ltr"
                  value={result.apiKey}
                  className={inputClass}
                />
              </label>
              <label className="block">
                سر توقيع Webhook
                <input
                  readOnly
                  dir="ltr"
                  value={result.signingSecret}
                  className={inputClass}
                />
              </label>
            </>
          )}
        </div>
      )}
      {canManage && (
        <form
          className={cardClass + ' space-y-4'}
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            act(() =>
              saveStudio('integration', null, {
                name: f.get('name'),
                endpoint_url: f.get('endpoint_url'),
              }),
            );
          }}
        >
          <h2 className="text-xl font-bold">
            طلب تكامل جديد · 100 ريال مرة واحدة
          </h2>
          <p className="text-sm leading-7">
            يناسب نظامًا يدعم API أو Webhooks. الربط الخاص والحقول المطلوبة
            تُراجع مع الإدارة قبل الدفع. يبدأ إصدار المفاتيح بعد تأكيد التحويل.
            كل وجهة مستقلة لها طلب ورسوم تفعيل؛ تغيير الوجهة بعد التفعيل يحتاج
            طلبًا جديدًا.
          </p>
          <label className="block">
            اسم النظام
            <input
              name="name"
              maxLength={120}
              required
              className={inputClass}
              placeholder="نظام إدارة العملاء الخاص بنا"
            />
          </label>
          <label className="block">
            رابط استقبال أحداث النظام
            <input
              name="endpoint_url"
              type="url"
              required
              maxLength={2048}
              dir="ltr"
              className={inputClass}
              placeholder="https://crm.example.com/webhooks/soulvd"
            />
          </label>
          <button disabled={pending} className={buttonClass}>
            تسجيل طلب التكامل
          </button>
        </form>
      )}
      {items.map((i) => (
        <article key={i.id} className={cardClass + ' space-y-3'}>
          <h2 className="text-xl font-bold">{i.name}</h2>
          <p className="break-all" dir="ltr">
            {i.endpoint_url}
          </p>
          <p>
            {
              (
                {
                  pending_payment: 'بانتظار المراجعة وتأكيد التحويل',
                  paid: 'الرسوم مؤكدة · جاهز للتفعيل',
                  active: 'نشط',
                  disabled: 'متوقف',
                } as Record<string, string>
              )[i.status]
            }
          </p>
          {canManage && i.status !== 'pending_payment' && (
            <div className="flex flex-wrap gap-3">
              <button
                disabled={pending}
                className={buttonClass}
                onClick={() => act(() => integrationKeys(i.id))}
              >
                {i.status === 'active'
                  ? 'تدوير المفاتيح وإلغاء القديمة'
                  : 'تفعيل وإصدار المفاتيح'}
              </button>
              {i.status === 'active' && (
                <button
                  disabled={pending}
                  className="underline"
                  onClick={() => act(() => integrationKeys(i.id, true))}
                >
                  تعطيل التكامل
                </button>
              )}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
