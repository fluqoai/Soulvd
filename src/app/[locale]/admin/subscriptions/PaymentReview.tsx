"use client";
import { useActionState } from "react";
import { confirmPaymentRequest } from "./actions";
export default function PaymentReview({ id }: { id: string }) {
  const [state, action, busy] = useActionState(confirmPaymentRequest, {
    message: "",
  });
  return (
    <form action={action} className="mt-4 space-y-4">
      <input type="hidden" name="id" value={id} />
      <label className="block text-sm">
        مرجع العملية من كشف البنك
        <input
          name="reference"
          required
          minLength={3}
          maxLength={120}
          className="mt-2 w-full rounded border p-3"
        />
      </label>
      <label className="block text-sm">
        المبلغ المستلم بالريال
        <input
          name="amount"
          type="number"
          min="0.01"
          max="10000"
          step="0.01"
          required
          className="mt-2 w-full rounded border p-3"
        />
      </label>
      <label className="flex gap-2 text-sm">
        <input name="verified" type="checkbox" required />
        تحققت من وصول المبلغ في حساب البنك، وليس من صورة الإيصال فقط.
      </label>
      <button
        disabled={busy}
        className="rounded bg-sage-900 px-5 py-3 text-white disabled:opacity-50"
      >
        {busy ? "جارٍ التأكيد…" : "تأكيد وصول المبلغ والتفعيل"}
      </button>
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}
