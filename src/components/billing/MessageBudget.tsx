"use client";
import {useState} from 'react';
import MessageEstimator from './MessageEstimator';
export default function MessageBudget({date}:{date:string}) {
  const [amount,setAmount]=useState('');
  return <section className="sv-surface space-y-4 p-5 sm:p-8">
    <h2 className="text-2xl font-bold">خطط لميزانية رسائلك قبل الاشتراك</h2>
    <label className="block text-sm">رصيد واتساب بالريال · اختياري دون حد أدنى<input type="number" step="0.01" max="10000" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="أدخل المبلغ الذي يناسبك" className="mt-2 block w-full rounded-xl border p-3" /></label>
    <p className="text-xs leading-6">يمكنك إضافة الرصيد مع دفعة الباقة في تحويل واحد بعد التسجيل، أو شحنه لاحقًا. هذه حاسبة للتخطيط؛ يُثبت المبلغ في طلب التحويل داخل مساحتك.</p>
    <MessageEstimator amount={Math.max(0,Number(amount)||0)} date={date} />
  </section>;
}
