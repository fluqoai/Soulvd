"use client";
import { useActionState } from "react";
import { createWorkspace } from "./actions";
export default function OnboardingForm({
  initialMonths,
  initialPlan,
  initialName,
}: {
  initialMonths?: number;
  initialPlan?: string;
  initialName?: string;
}) {
  const [state, action, pending] = useActionState(createWorkspace, {});
  return (
    <form action={action} className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold">بقي اسم مساحتك فقط</h1>
      <p className="text-sm leading-7 text-ink-500">
        بريدك مؤكد. احفظ اسم المنشأة لتفتح لوحتك؛ تختار الباقة وتربط رقمك من
        داخلها.
      </p>
      <label className="block">
        اسم المنشأة
        <input
          name="name"
          defaultValue={initialName}
          required
          maxLength={120}
          className="mt-2 w-full rounded-xl border p-3"
        />
      </label>
      <input
        type="hidden"
        name="plan"
        value={initialPlan === "starter_v1" ? "starter_v1" : "pro_growth_v1"}
      />
      <input
        type="hidden"
        name="months"
        value={[3, 6, 12].includes(initialMonths ?? 0) ? initialMonths : 3}
      />
      <p className="text-sm">
        إنشاء المساحة مجاني. لا يبدأ الاشتراك المدفوع حتى تأكيد التحويل.
      </p>
      {state.error && (
        <p role="alert" className="text-red-700">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="rounded-xl bg-sage-900 px-6 py-3 text-white disabled:opacity-50"
      >
        {pending ? "جارٍ التجهيز…" : "افتح مساحتي"}
      </button>
    </form>
  );
}
