"use client";
import { useActionState } from "react";
import { createWorkspace } from "./actions";
import PlanPicker from "@/components/billing/PlanPicker";
export default function OnboardingForm({
  initialMonths,
  initialPlan,
}: {
  initialMonths?: number;
  initialPlan?: string;
}) {
  const [state, action, pending] = useActionState(createWorkspace, {});
  return (
    <form action={action} className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold">ابدأ مساحة عملك</h1>
      <label className="block">
        اسم المنشأة
        <input
          name="name"
          required
          maxLength={120}
          className="mt-2 w-full rounded-xl border p-3"
        />
      </label>
      <PlanPicker
        selectable
        initialMonths={initialMonths}
        initialPlan={initialPlan}
      />
      <p className="text-sm">
        تبقى المساحة بانتظار التفعيل حتى تأكيد وصول التحويل البنكي.
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
        {pending ? "جارٍ الإنشاء…" : "إنشاء المساحة والانتقال للدفع"}
      </button>
    </form>
  );
}
