"use client";
import { useActionState, useState } from "react";
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
  subscriptionHalalas = 0,
}: {
  purpose: "subscription" | "upgrade" | "wallet" | "ai";
  disabled?: boolean;
  subscriptionHalalas?: number;
}) {
  const [state, action, busy] = useActionState(requestPayment, {});
  const [initialCredit, setInitialCredit] = useState(0);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="purpose" value={purpose} />
      {purpose === 'ai' && <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-3 font-semibold">شحن ردود إضافية · دفعة واحدة</legend>
        <label className="cursor-pointer rounded-2xl border border-sage-200 p-4 has-checked:border-sage-700 has-checked:bg-sage-50"><input type="radio" name="pack" value="1000" defaultChecked /> <strong>1,000 رد · 29 ريالًا</strong><span className="mt-2 block text-sm">لزيادة بسيطة عند الحاجة</span></label>
        <label className="cursor-pointer rounded-2xl border-2 border-sage-400 p-4 has-checked:bg-sage-50"><input type="radio" name="pack" value="5000" /> <strong>5,000 رد · 99 ريالًا</strong><span className="mt-2 block text-sm">أفضل قيمة · توفير 46 ريالًا مقارنة بخمس حزم صغيرة</span></label>
        <p className="text-xs leading-6 sm:col-span-2">صالحة 12 شهرًا من تأكيد الدفع، وتحتاج اشتراك منصة نشطًا للاستخدام. لا تجديد تلقائي. رصيد واتساب وتطوير التكاملات منفصلان. الرد يشمل مسودة ذكية صالحة أو ردًا آليًا مقبولًا للإرسال، ولا تُحسب أعطال التوليد أو التحويل للموظف.</p>
      </fieldset>}
      {purpose === "subscription" && (
        <section className="sv-surface space-y-4 p-5">
          <h2 className="font-bold">اشتراكك ورصيد البداية · تحويل واحد</h2>
          <label className="block text-sm">
            رصيد واتساب اختياري، يُضاف إلى محفظتك بعد تأكيد التحويل
            <select name="amount" value={initialCredit} onChange={(event) => setInitialCredit(Number(event.target.value))} className="mt-2 block w-full rounded-xl border bg-white p-3">
              <option value={0}>الاشتراك فقط · أشحن لاحقًا</option>
              <option value={50}>50 ريال رصيد بداية</option>
              <option value={100}>100 ريال رصيد بداية</option>
              <option value={200}>200 ريال رصيد بداية</option>
            </select>
          </label>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3"><dt>اشتراك المدة المختارة</dt><dd>{sar(subscriptionHalalas / 100)} ريال</dd></div>
            <div className="flex justify-between gap-3"><dt>رصيد واتساب</dt><dd>{sar(initialCredit)} ريال</dd></div>
            <div className="flex justify-between gap-3 border-t pt-3 text-lg font-bold"><dt>إجمالي التحويل</dt><dd>{sar(subscriptionHalalas / 100 + initialCredit)} ريال</dd></div>
          </dl>
          <p className="text-xs leading-6 text-wood-600">هدية بداية: 5 ريالات رصيد واتساب مرة واحدة للمساحة بعد تأكيد أول اشتراك مدفوع. لا تُضاف إلى مبلغ التحويل، ولا تُمنح للتسجيل المجاني أو للتجديد.</p>
        </section>
      )}
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
          : purpose === "ai" ? "إنشاء طلب شحن الردود الذكية" : purpose === "wallet"
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
  wallet_amount_halalas: number;
  welcome_amount_halalas: number;
  ai_reply_count?: number;
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
          {item.purpose === "ai" ? `شحن ${item.ai_reply_count?.toLocaleString('ar-SA')} رد ذكي` : item.purpose === "wallet"
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
      {item.purpose === "subscription" && (
        <div className="rounded-xl bg-sage-50 p-3 text-sm leading-7">
          <p>الاشتراك: {sar((item.amount_halalas - item.wallet_amount_halalas) / 100)} ريال · رصيد واتساب: {sar(item.wallet_amount_halalas / 100)} ريال</p>
          {item.welcome_amount_halalas > 0 && <p>رصيد الترحيب: {sar(item.welcome_amount_halalas / 100)} ريال هدية بعد التأكيد، خارج إجمالي التحويل.</p>}
        </div>
      )}
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
