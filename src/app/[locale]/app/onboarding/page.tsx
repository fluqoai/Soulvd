'use client';
import { useActionState } from 'react';
import { createWorkspace } from './actions';

export default function OnboardingPage() {
  const [state, action, pending] = useActionState(createWorkspace, {});
  return <form action={action} className="mx-auto max-w-xl space-y-6 rounded-2xl border border-sage-200 bg-white p-8">
    <h1 className="text-3xl font-bold">ابدأ مساحة عملك</h1>
    <label className="block">اسم المنشأة<input name="name" required maxLength={120} className="mt-2 w-full rounded-lg border p-3" /></label>
    <fieldset className="space-y-3"><legend className="mb-3">اختر الباقة الشهرية</legend>
      <label className="block rounded-lg border p-4"><input type="radio" name="plan" value="starter_v1" required /> الانطلاق · 299 ريال · 2,000 عميل</label>
      <label className="block rounded-lg border border-sage-500 p-4"><input type="radio" name="plan" value="pro_growth_v1" required /> النمو الاحترافية · 399 ريال · 10,000 عميل · موصى بها</label>
    </fieldset>
    <p className="text-sm">يُفعّل الاشتراك بعد إكمال الدفع. رسوم رسائل واتساب منفصلة.</p>
    {state.error && <p role="alert" className="text-red-700">{state.error}</p>}
    <button disabled={pending} className="rounded-xl bg-sage-700 px-6 py-3 text-white disabled:opacity-50">{pending ? 'جارٍ الإنشاء…' : 'إنشاء مساحة العمل'}</button>
  </form>;
}
