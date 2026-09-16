'use client';

import Link from 'next/link';
import { useEffect, useId, useRef } from 'react';
import type { GateResult } from '@/lib/billing/gate';
import { PLANS } from '@/lib/billing/plans';

export function UpgradeModal({ result }: { result: GateResult }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    if (result.code === 'LIMIT_EXCEEDED' && dialog.current && !dialog.current.open) {
      dialog.current.showModal();
    }
  }, [result]);

  return <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={descriptionId}
    className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-sage-200 bg-white p-8 text-wood-900 shadow-xl backdrop:bg-black/40" dir="rtl">
    <div className="flex items-center justify-between gap-4">
      <span className="rounded-full bg-sage-100 px-3 py-1 text-sm text-sage-800">موصى بها</span>
      <button type="button" onClick={() => dialog.current?.close()} className="rounded-lg px-3 py-2 text-sm underline">إغلاق</button>
    </div>
    <h2 id={titleId} className="mt-5 text-2xl font-bold">مساحة أكبر لفريقك</h2>
    <p id={descriptionId} className="mt-4 leading-7">وصلت إلى حد المقاعد في باقة الانطلاق. باقة النمو الاحترافية تتيح فريقًا غير محدود و{PLANS.pro_growth.conversations.toLocaleString('ar-SA')} عميل مختلف في دورة الاشتراك.</p>
    <p className="mt-5 text-xl font-semibold">{PLANS.pro_growth.priceSar} ريال شهريًا</p>
    <p className="mt-2 text-sm text-wood-600">تحتفظ باستهلاكك الحالي، وتُفتح المزايا بعد تأكيد الدفع.</p>
    <Link href="/app/billing/upgrade" className="mt-6 inline-block rounded-xl bg-sage-700 px-6 py-3 text-white">عرض تفاصيل الترقية</Link>
  </dialog>;
}
