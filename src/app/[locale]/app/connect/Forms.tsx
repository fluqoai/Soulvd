"use client";
import { useActionState, useState } from "react";
import { Smartphone, Plus, ArrowLeftRight } from "lucide-react";
import {
  requestConnection,
  connectionReady,
  recoverConnection,
} from "./actions";
const kinds = [
  {
    value: "business_app",
    title: "أستخدم واتساب الأعمال",
    description: "على جوالي وأريد استخدامه مع سولفد",
    icon: Smartphone,
  },
  {
    value: "new_number",
    title: "لدي رقم جديد",
    description: "غير مستخدم في واتساب الأعمال حاليًا",
    icon: Plus,
  },
  {
    value: "other_provider",
    title: "رقمي مرتبط بمزود آخر",
    description: "أحتاج مراجعة مسار النقل إلى سولفد",
    icon: ArrowLeftRight,
  },
];
export function ConnectionForm() {
  const [state, action, busy] = useActionState(requestConnection, {});
  const [kind, setKind] = useState("business_app");
  return (
    <form
      action={action}
      className="space-y-6 rounded-3xl border border-sage-200 bg-white p-5 sm:p-8"
    >
      <fieldset>
        <legend className="mb-4 text-lg font-bold">
          كيف تستخدم رقمك الآن؟
        </legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {kinds.map(({ value, title, description, icon: Icon }) => (
            <label
              key={value}
              className={`relative cursor-pointer rounded-2xl border p-4 transition ${kind === value ? "border-sage-600 bg-sage-50 ring-1 ring-sage-600" : "border-sage-100 hover:border-sage-300"}`}
            >
              <input
                type="radio"
                name="number_kind"
                value={value}
                checked={kind === value}
                onChange={() => setKind(value)}
                className="absolute end-3 top-4 accent-sage-800"
              />
              <Icon size={23} className="mb-4 text-sage-700" />
              <span className="block text-sm font-bold">{title}</span>
              <span className="mt-2 block text-xs leading-6 text-ink-500">
                {description}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="rounded-xl bg-sage-50/70 p-4 text-sm leading-7 text-ink-600">
        {kind === "business_app"
          ? "للأرقام المؤهلة، يتيح الربط المتزامن استخدام تطبيق واتساب الأعمال وسولفد معًا. يظهر تفويض Meta في خطوة مستقلة."
          : "سنحفظ طلبك لمراجعة مسار الربط المناسب؛ مسار الربط المتزامن مخصص للأرقام الموجودة في تطبيق واتساب الأعمال."}
      </p>
      <label className="block text-sm font-semibold">
        رقم نشاطك
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          dir="ltr"
          autoComplete="tel"
          placeholder="05xxxxxxxx"
          required
          maxLength={30}
          aria-describedby="phone-help"
          className="mt-2 w-full rounded-xl border border-sage-200 p-3.5 text-lg"
        />
      </label>
      <p id="phone-help" className="text-xs text-ink-500">
        نضيف رمز السعودية +966 تلقائيًا للرقم المحلي. لبلد آخر اكتب الرمز
        الدولي.
      </p>
      <label className="flex items-start gap-2 text-sm leading-7">
        <input
          name="permission"
          type="checkbox"
          required
          className="mt-2 accent-sage-800"
        />
        أنا مخوّل بإدارة هذا الرقم وربطه بمساحة منشأتي في سولفد.
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <button
          disabled={busy}
          className="rounded-xl bg-sage-900 px-6 py-3 font-semibold text-white disabled:opacity-50"
        >
          {busy ? "جارٍ الحفظ…" : "حفظ الرقم والمتابعة"}
        </button>
        <span className="text-xs text-ink-500">
          الحفظ لا ينقل الرقم ولا يفرض رسومًا.
        </span>
      </div>
      {state.message && (
        <p
          role="status"
          className="rounded-xl bg-sage-50 p-4 text-sm leading-7"
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
export function ConnectionReady({ id }: { id: string }) {
  const [state, action, busy] = useActionState(connectionReady, {});
  return (
    <form action={action} className="space-y-3 border-t border-sage-100 pt-5">
      <input type="hidden" name="id" value={id} />
      <label className="flex items-start gap-2 text-sm leading-7">
        <input type="checkbox" name="authorized" required className="mt-2" />
        أكملت بنفسي تفويض رقم منشأتي داخل Meta وظهرت لي خطوة الانتهاء.
      </label>
      <button
        disabled={busy}
        className="rounded-xl border border-sage-300 px-5 py-3 text-sm font-semibold disabled:opacity-50"
      >
        {busy ? "جارٍ تحديث الطلب…" : "أكملت التفويض · أرسل للتحقق"}
      </button>
      {state.message && (
        <p role="status" className="text-sm">
          {state.message}
        </p>
      )}
    </form>
  );
}
export function ConnectionRecovery({
  id,
  expired,
}: {
  id: string;
  expired: boolean;
}) {
  const [state, action, busy] = useActionState(recoverConnection, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="mode" value={expired ? "renew" : "restart"} />
      <button
        disabled={busy}
        className="rounded-xl border border-sage-300 px-4 py-3 text-sm disabled:opacity-50"
      >
        {busy
          ? "جارٍ الحفظ…"
          : expired
            ? "طلب رابط جديد"
            : "تعديل الرقم أو نوع الربط"}
      </button>
      {state.message && (
        <p role="status" className="text-sm">
          {state.message}
        </p>
      )}
    </form>
  );
}
