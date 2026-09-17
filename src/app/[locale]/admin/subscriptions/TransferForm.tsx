'use client';
import { useActionState } from 'react';
import { confirmTransfer } from './actions';

export default function TransferForm({ tenants }: { tenants: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(confirmTransfer, { message: '' });
  return <form action={action} className="space-y-4 rounded-xl border bg-white p-6">
    <h2 className="text-xl font-bold">تأكيد تحويل وصل إلى البنك</h2>
    <label className="block">مساحة العميل<select name="tenant" required className="mt-2 w-full rounded border p-3"><option value="">اختر العميل</option>{tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
    <label className="block">الغرض<select name="purpose" className="mt-2 w-full rounded border p-3"><option value="subscription">تفعيل أو تجديد شهر · قيمة الباقة كاملة</option><option value="upgrade">ترقية الانطلاق إلى النمو · فرق 100 ريال للدورة الحالية</option></select></label>
    <label className="block">رقم مرجع التحويل البنكي<input name="reference" required minLength={3} maxLength={120} className="mt-2 w-full rounded border p-3" /></label>
    <label className="block">المبلغ بالريال<input name="amount" type="number" min="0.01" step="0.01" required className="mt-2 w-full rounded border p-3" /></label>
    <label className="flex gap-2"><input type="checkbox" name="verified" required />تحققت من وصول المبلغ فعليًا في حساب البنك، وليس من صورة الإيصال فقط.</label>
    <p className="text-sm">التفعيل والتجديد بعد انتهاء الدورة يبدآن شهرًا جديدًا. لا تسجل تجديدًا مبكرًا لدورة نشطة. الترقية تحفظ موعد النهاية والاستهلاك. رسوم واتساب منفصلة.</p>
    {state.message && <p role="status">{state.message}</p>}
    <button disabled={pending || !tenants.length} className="rounded bg-sage-900 px-5 py-3 text-white disabled:opacity-50">{pending ? 'جارٍ التأكيد…' : 'تأكيد التحويل وتحديث الاشتراك'}</button>
  </form>;
}
