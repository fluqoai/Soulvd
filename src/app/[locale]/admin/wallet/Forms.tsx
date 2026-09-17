"use client";
import { useActionState } from "react";
import { walletOperation } from "./actions";
export function TestCredit({
  spaces,
  request,
}: {
  spaces: { id: string; name: string }[];
  request: string;
}) {
  const [state, action, busy] = useActionState(walletOperation, {});
  return (
    <form action={action} className="space-y-4 rounded-xl border bg-white p-5">
      <h2 className="text-xl font-bold">ميزانية اختبار على حساب المنصة</h2>
      <p className="text-sm">
        رصيد داخلي للاختبار فقط؛ لا يمثل تحويلًا بنكيًا. الحد التراكمي 5 ريالات
        لكل مساحة اختبار.
      </p>
      <input type="hidden" name="operation" value="test_credit" />
      <input type="hidden" name="request" value={request} />
      <label className="block text-sm">
        مساحة الاختبار
        <select
          name="tenant"
          required
          className="mt-2 w-full rounded border p-3"
        >
          {spaces.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        الميزانية بالريال
        <input
          name="amount"
          type="number"
          min="0.01"
          max="5"
          step="0.01"
          defaultValue={1}
          required
          className="mt-2 w-full rounded border p-3"
        />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input name="verified" type="checkbox" required />
        أخصص هذا المبلغ للاختبار على حساب المنصة. لم يصل تحويل من عميل.
      </label>
      <button disabled={busy} className="rounded border px-4 py-2">
        تخصيص ميزانية الاختبار
      </button>
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}
export function RetrySettlement({ id }: { id: string }) {
  const [state, action, busy] = useActionState(walletOperation, {});
  return (
    <form action={action} className="mt-3 space-y-2">
      <input name="operation" type="hidden" value="retry" />
      <input name="id" type="hidden" value={id} />
      <button disabled={busy} className="rounded border px-3 py-2 text-sm">
        إعادة الاستعلام عن التكلفة
      </button>
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}
