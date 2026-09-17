'use client';
import { useActionState } from 'react';
import { confirmIntegrationTransfer } from './actions';
type Item = {
  id: string;
  name: string;
  tenantName: string;
  endpoint_url: string;
  status: string;
};
export default function IntegrationPaymentForm({ items }: { items: Item[] }) {
  const [state, action, pending] = useActionState(confirmIntegrationTransfer, {
    message: '',
  });
  return (
    <section className="space-y-5 rounded-xl border bg-white p-6">
      <h2 className="text-xl font-bold">طلبات تكامل CRM</h2>
      <p>
        100 ريال رسم تفعيل لمرة واحدة لكل تكامل. تحقق من واجهة نظام العميل
        واتفاق نطاق الربط قبل طلب التحويل. تطوير موصل خاص يحتاج تقييمًا مستقلًا.
      </p>
      {!items.length && <p>لا توجد طلبات تكامل لعملاء فعليين بعد.</p>}
      {items.map((i) => (
        <article className="rounded border p-4" key={i.id}>
          <h3 className="font-bold">
            {i.tenantName} · {i.name}
          </h3>
          <p dir="ltr" className="break-all">
            {i.endpoint_url}
          </p>
          <p>
            {
              (
                {
                  pending_payment: 'بانتظار المراجعة والتحويل',
                  paid: 'رسوم مؤكدة',
                  active: 'نشط',
                  disabled: 'معطل',
                } as Record<string, string>
              )[i.status]
            }
          </p>
        </article>
      ))}
      <form action={action} className="space-y-4">
        <label className="block">
          طلب التكامل
          <select
            name="integration"
            required
            className="w-full rounded border p-3"
          >
            <option value="">اختر الطلب</option>
            {items
              .filter((i) => i.status === 'pending_payment')
              .map((i) => (
                <option key={i.id} value={i.id}>
                  {i.tenantName} · {i.name}
                </option>
              ))}
          </select>
        </label>
        <label className="block">
          مرجع التحويل
          <input
            name="reference"
            required
            minLength={3}
            maxLength={120}
            className="w-full rounded border p-3"
          />
        </label>
        <label className="block">
          المبلغ بالريال
          <input
            name="amount"
            type="number"
            min={100}
            max={100}
            defaultValue={100}
            required
            className="w-full rounded border p-3"
          />
        </label>
        <label className="flex gap-2">
          <input type="checkbox" name="reviewed" required />
          راجعت إمكانية التكامل ونطاقه مع نظام العميل.
        </label>
        <label className="flex gap-2">
          <input type="checkbox" name="verified" required />
          تحققت من وصول المبلغ فعليًا إلى البنك.
        </label>
        {state.message && <p role="status">{state.message}</p>}
        <button
          disabled={
            pending || !items.some((i) => i.status === 'pending_payment')
          }
          className="rounded bg-sage-900 px-5 py-3 text-white disabled:opacity-50"
        >
          تأكيد رسوم التكامل
        </button>
      </form>
    </section>
  );
}
