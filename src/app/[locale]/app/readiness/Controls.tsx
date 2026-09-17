"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Play, RefreshCw } from "lucide-react";

export default function Controls({
  phone,
  since,
}: {
  phone: string;
  since: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <section className="rounded-2xl border border-sage-100 bg-white p-5 sm:p-6">
      <h2 className="font-semibold">اختبار واحد لرحلة العميل</h2>
      <p className="mt-2 text-sm leading-7 text-ink-500">
        استخدم رقمًا ثانيًا تملكه كعميل تجريبي. بدء الجولة يحدد وقت المتابعة
        فقط؛ لا يرسل رسائل ولا يفعّل أي خدمة.
      </p>
      <form
        className="mt-5 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.elements.namedItem(
            "phone",
          ) as HTMLInputElement;
          const value = input.value.replace(/[\s()+-]/g, "");
          if (!/^[1-9]\d{7,14}$/.test(value)) {
            input.setCustomValidity("أدخل رقمًا دوليًا صحيحًا مع رمز البلد.");
            input.reportValidity();
            return;
          }
          start(() =>
            router.push(
              `/app/readiness?${new URLSearchParams({ phone: value, since: new Date().toISOString() })}`,
            ),
          );
        }}
      >
        <label className="min-w-0 flex-1 text-sm">
          رقم العميل التجريبي
          <input
            name="phone"
            type="tel"
            dir="ltr"
            defaultValue={phone}
            onInput={(e) => e.currentTarget.setCustomValidity("")}
            placeholder="+9665xxxxxxxx"
            required
            maxLength={24}
            className="mt-2 w-full rounded-xl border border-sage-200 bg-white px-4 py-3"
          />
        </label>
        <button
          disabled={pending}
          className="flex items-center gap-2 rounded-xl bg-sage-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Play size={16} aria-hidden="true" />
          بدء جولة جديدة
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(() => router.refresh())}
          className="flex items-center gap-2 rounded-xl border border-sage-200 px-4 py-3 text-sm disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={pending ? "animate-spin" : ""}
            aria-hidden="true"
          />
          تحديث النتائج
        </button>
      </form>
      <p role="status" className="mt-3 text-xs text-ink-500">
        {pending
          ? "جارٍ تحديث النتائج…"
          : `تبدأ نافذة الفحص: ${new Date(since).toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" })}`}
      </p>
    </section>
  );
}
