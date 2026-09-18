"use client";
import { useState } from 'react';
import { messageRates, RATE_SOURCE } from '@/lib/billing/message-estimate';
import { sar } from '@/lib/billing/terms';
export default function MessageEstimator({ amount, date }: { amount: number; date: string }) {
  const [recipients, setRecipients] = useState('1000');
  const [perCustomer, setPerCustomer] = useState('1');
  const rates = messageRates(date);
  const marketing = rates?.find(r => r.key === 'marketing');
  const count = Math.max(0, Number(recipients) || 0) * Math.max(0, Number(perCustomer) || 0);
  const campaign = marketing ? count * marketing.sar : null;
  return <section className="rounded-2xl border border-sage-200 bg-sage-50/60 p-5 space-y-4">
    <h3 className="font-bold">ماذا يغطي رصيدك؟</h3>
    <p className="text-xs leading-6">تقدير للأرقام السعودية، يشمل زيادة الخدمة 15%. كل صف يفترض استخدام الرصيد كاملًا لهذا النوع وحده؛ الأعداد لا تُجمع. الرصيد مبلغ مالي، وليس حزمة رسائل ثابتة. تتحدد التكلفة النهائية من تصنيف القالب وبلد المستلم والتكلفة الفعلية عند التسليم.</p>
    {rates ? <div className="overflow-x-auto"><table className="w-full text-sm text-start"><caption className="sr-only">تقدير عدد الرسائل حسب نوعها</caption><thead><tr><th className="p-2 text-start">النوع</th><th className="p-2">ريال / رسالة</th><th className="p-2">تقريبًا برصيد {sar(amount)}</th></tr></thead><tbody>{rates.map(r => <tr key={r.key} className="border-t border-sage-200"><td className="p-2">{r.name}</td><td className="p-2 text-center tabular-nums">{r.sar.toFixed(4)}</td><td className="p-2 text-center tabular-nums">{r.sar ? Math.floor(amount / r.sar).toLocaleString('ar-SA') : 'لا تخصم رصيدًا وفق السياسة الحالية'}</td></tr>)}</tbody></table></div> : <p role="status">تحتاج التعرفة إلى تحديث؛ لا نعرض تقديرًا قديمًا. راجع الأسعار معنا قبل الشحن.</p>}
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">مستلمو الحملة<input type="number" min="0" step="1" value={recipients} onChange={e=>setRecipients(e.target.value)} className="block mt-2 w-full rounded-xl border p-3" /></label><label className="text-sm">رسائل تسويقية لكل مستلم<input type="number" min="0" step="1" value={perCustomer} onChange={e=>setPerCustomer(e.target.value)} className="block mt-2 w-full rounded-xl border p-3" /></label></div>
    {campaign !== null && <p aria-live="polite" className="font-semibold">الحملة: {count.toLocaleString('ar-SA')} رسالة · نحو {sar(campaign)} ريال {campaign > amount ? `· ينقص رصيدك نحو ${sar(campaign - amount)} ريال` : '· يغطيها الرصيد المختار'}</p>}
    <p className="text-xs leading-6">يبدأ العميل نافذة الخدمة برسالته وتستمر 24 ساعة من آخر رسالة منه. خارجها يلزم قالب معتمد؛ الرسائل التسويقية والتحقق مدفوعة حتى داخلها. القوالب الخدمية داخل النافذة مجانية حتى نهاية سبتمبر وفق السياسة الحالية. بدء المحادثة ليس رسمًا مستقلًا؛ المحاسبة لكل رسالة مدفوعة مُسلّمة. حصة العملاء الشهرية في الباقة مستقلة عن هذا الرصيد.</p>
    <p className="text-xs leading-6 text-amber-900">تتغير التعرفة في 1 أكتوبر 2026: التسويق 0.0576 دولار، والخدمة 0.0107 دولار قبل التحويل وزيادة الخدمة؛ لا تعتمد على استمرار مجانية الردود. لا تشمل التقديرات الضرائب أو خصومات الحجم أو الرسائل إلى بلدان أخرى.</p>
    <a href={RATE_SOURCE} target="_blank" rel="noopener noreferrer" className="text-xs underline">مرجع التعرفة · تم التحقق 19 سبتمبر 2026</a>
  </section>;
}
