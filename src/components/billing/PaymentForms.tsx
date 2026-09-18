"use client";
import { useActionState } from "react";
import {
  requestPayment,
  submitPayment,
  cancelPayment,
  selectContract,
} from "@/app/[locale]/app/billing/actions";
import PlanPicker from "./PlanPicker";
import { sar } from "@/lib/billing/terms";
export function RequestPayment({
  purpose,
  disabled = false,
}: {
  purpose: "subscription" | "upgrade" | "wallet";
  disabled?: boolean;
}) {
  const [state, action, busy] = useActionState(requestPayment, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="purpose" value={purpose} />
      {purpose === "wallet" && (
        <label className="block text-sm">
          مبلغ الشحن بالريال
          <input
            name="amount"
            type="number"
            min={50}
            max={10000}
            step="0.01"
            required
            defaultValue={100}
            className="mt-2 block w-full rounded-xl border p-3"
          />
        </label>
      )}
      <button
        disabled={busy || disabled}
        className="rounded-xl bg-sage-900 px-5 py-3 text-white disabled:opacity-50"
      >
        {busy
          ? "جارٍ إنشاء الطلب…"
          : purpose === "wallet"
            ? "إنشاء طلب شحن الرصيد"
            : purpose === "upgrade"
              ? "احصل على مبلغ الترقية"
              : "إنشاء طلب التحويل البنكي"}
      </button>
      {state.message && (
        <p role="status" className="text-sm leading-6">
          {state.message}
        </p>
      )}
    </form>
  );
}
export type PaymentRequest = {
  id: string;
  purpose: string;
  amount_halalas: number;
  status: string;
  bank_reference: string | null;
  expires_at: string;
};
export function PaymentRequestCard({
  item,
  canManage = true,
}: {
  item: PaymentRequest;
  canManage?: boolean;
}) {
  const [state, action, busy] = useActionState(submitPayment, {});
  const [cancel, cancelAction, cancelling] = useActionState(cancelPayment, {});
  const statuses: Record<string, string> = {
    pending: "بانتظار تحويلك",
    submitted: "التحويل قيد المراجعة",
    confirmed: "مؤكد",
    cancelled: "ملغي",
  };
  return (
    <article className="space-y-4 rounded-xl border border-sage-200 bg-white p-5">
      <div className="flex flex-wrap justify-between gap-2">
        <h3 className="font-bold">
          {item.purpose === "wallet"
            ? "شحن رصيد واتساب"
            : item.purpose === "upgrade"
              ? "ترقية الباقة"
              : "اشتراك المنصة"}
        </h3>
        <span className="text-sm">{statuses[item.status]}</span>
      </div>
      <p className="text-2xl font-bold">
        {sar(item.amount_halalas / 100)} ريال
      </p>
      <p className="text-xs text-wood-600">
        رقم الطلب: <bdi>{item.id}</bdi>
      </p>
      {item.status === "pending" && (
        <>
          <p className="text-sm">
            أرسل مرجع التحويل قبل{" "}
            {new Date(item.expires_at).toLocaleString("ar-SA", {
              calendar: "gregory",
              timeZone: "Asia/Riyadh",
            })}
            . إذا انتهت الصلاحية قبل الدفع، أنشئ طلبًا جديدًا.
          </p>
          {canManage && (
            <>
              <form action={action} className="space-y-3">
                <input type="hidden" name="id" value={item.id} />
                <label className="block text-sm">
                  مرجع العملية من البنك
                  <input
                    name="reference"
                    required
                    minLength={3}
                    maxLength={120}
                    className="mt-2 block w-full rounded-xl border p-3"
                  />
                </label>
                <button
                  disabled={busy}
                  className="rounded-xl bg-sage-900 px-5 py-3 text-white disabled:opacity-50"
                >
                  {busy
                    ? "جارٍ الإرسال…"
                    : "أرسلت التحويل · إرسال المرجع للمراجعة"}
                </button>
                {state.message && <p role="status">{state.message}</p>}
              </form>
              <form action={cancelAction}>
                <input type="hidden" name="id" value={item.id} />
                <button disabled={cancelling} className="text-sm underline">
                  إلغاء الطلب غير المدفوع
                </button>
                {cancel.message && <p role="status">{cancel.message}</p>}
              </form>
            </>
          )}
        </>
      )}
      {item.bank_reference && (
        <p className="text-sm">
          مرجع التحويل: <bdi>{item.bank_reference}</bdi>
        </p>
      )}
      {item.status === "submitted" && (
        <p className="text-sm text-wood-600">
          لا ترسل تحويلًا آخر لهذا الطلب. نتحقق من وصول المبلغ قبل التفعيل.
        </p>
      )}
    </article>
  );
}
export function ContractForm({
  plan,
  months,
}: {
  plan: string;
  months: number;
}) {
  const [state, action, busy] = useActionState(selectContract, {});
  return (
    <form
      action={action}
      onReset={(event) => event.preventDefault()}
      className="space-y-5"
    >
      <PlanPicker selectable initialMonths={months} initialPlan={plan} />
      <button
        disabled={busy}
        className="rounded-xl border border-sage-400 px-5 py-3"
      >
        {busy ? "جارٍ الحفظ…" : "حفظ الباقة والمدة"}
      </button>
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}
