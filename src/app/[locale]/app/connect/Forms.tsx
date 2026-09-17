"use client";
import { useActionState } from "react";
import { requestConnection, connectionReady } from "./actions";
export function ConnectionForm() {
  const [state, action, busy] = useActionState(requestConnection, {});
  return (
    <form action={action} className="space-y-4 rounded-xl border bg-white p-5">
      <label className="block">
        رقم واتساب للأعمال
        <input
          name="phone"
          type="tel"
          dir="ltr"
          placeholder="+9665xxxxxxxx"
          required
          maxLength={30}
          className="mt-2 w-full rounded-xl border p-3"
        />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input name="business_app" type="checkbox" required />
        الرقم مستخدم حاليًا في تطبيق WhatsApp Business.
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input name="permission" type="checkbox" required />
        أنا مخول بإدارة الرقم، وأطلب ربطه بمساحة مؤسستي في Soulvd.
      </label>
      <button
        disabled={busy}
        className="rounded-xl bg-sage-900 px-5 py-3 text-white disabled:opacity-50"
      >
        {busy ? "جارٍ الإرسال…" : "طلب رابط الربط"}
      </button>
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}
export function ConnectionReady({ id }: { id: string }) {
  const [state, action, busy] = useActionState(connectionReady, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <button
        disabled={busy}
        className="rounded-xl bg-sage-900 px-5 py-3 text-white"
      >
        {busy ? "جارٍ الإرسال…" : "أكملت التفويض · تحقق من رقمي"}
      </button>
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}
