"use client";
import { useActionState } from "react";
import { updateLaunchPhase } from "./actions";
export default function LaunchForm({
  signup,
  payments,
  onboarding,
}: {
  signup: boolean;
  payments: boolean;
  onboarding: boolean;
}) {
  const [state, action, busy] = useActionState(updateLaunchPhase, {});
  return (
    <details className="rounded-2xl border border-sage-200 bg-white p-6">
      <summary className="cursor-pointer font-bold">
        مرحلة الإطلاق:{" "}
        {payments
          ? "استقبال اشتراكات"
          : signup
            ? "إنشاء حسابات وتجهيز فقط"
            : "التسجيل مغلق"}
      </summary>
      <form action={action} className="mt-5 space-y-4 text-sm leading-7">
        <p>
          تسمح مرحلة التجهيز بإنشاء المساحة وحفظ رقم العميل واختياره للباقة دون
          إرسال رسائل أو طلب دفع. افتح التفعيل بعد التحقق من باقة المزود وسعة
          الأرقام والربط الفعلي.
        </p>
        <label className="flex gap-2">
          <input type="checkbox" name="signup" defaultChecked={signup} />
          السماح بإنشاء حسابات ومساحات جديدة
        </label>
        <label className="flex gap-2">
          <input
            type="checkbox"
            name="onboarding"
            defaultChecked={onboarding}
          />
          الربط بمساعدة الفريق أو روابط التفويض جاهز للعملاء
        </label>
        <label className="flex gap-2">
          <input type="checkbox" name="payments" defaultChecked={payments} />
          السماح بطلب التحويل لتفعيل الاشتراكات الجديدة
        </label>
        <label className="flex items-start gap-2 rounded-xl bg-amber-50 p-3">
          <input type="checkbox" name="verified" required className="mt-2" />
          راجعت جاهزية المرحلة المختارة. فتح الدفع يتطلب جاهزية الربط، ولا يشتري
          هذا الإعداد باقة المزود تلقائيًا.
        </label>
        <button
          disabled={busy}
          className="rounded-xl bg-sage-900 px-5 py-3 text-white disabled:opacity-50"
        >
          {busy ? "جارٍ الحفظ…" : "حفظ مرحلة الإطلاق"}
        </button>
        {state.message && <p role="status">{state.message}</p>}
      </form>
    </details>
  );
}
