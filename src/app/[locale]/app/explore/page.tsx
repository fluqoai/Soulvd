import Link from "next/link";
import { ArrowUpLeft, Check, CreditCard, Smartphone } from "lucide-react";
import InboxDemo from "@/components/onboarding/InboxDemo";
import SetupChecklist from "@/components/onboarding/SetupChecklist";
export default function ExplorePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <SetupChecklist compact />
      <header>
        <p className="mb-2 text-xs font-semibold text-sage-600">
          تعرّف على مساحتك
        </p>
        <h1 className="text-3xl font-bold">أول رد، قبل أول اشتراك</h1>
        <p className="mt-3 max-w-2xl text-sm leading-8 text-ink-500">
          جرّب شكل المحادثة بنفسك. هذه معاينة تفاعلية ببيانات توضيحية، وليست
          تجربة إرسال فعلية أو اشتراكًا مجانيًا في الخدمة.
        </p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        <InboxDemo />
        <aside className="space-y-4">
          <section className="rounded-3xl border border-sage-100 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold">
              كل ما يحتاجه فريقك، في مكانه
            </h2>
            {[
              "صندوق محادثات مشترك لفريق العمل",
              "حالات إرسال وتنبيهات للرسائل الجديدة",
              "قوالب وأتمتة بحسب باقتك",
              "متابعة استهلاكك ورصيد واتساب",
            ].map((t) => (
              <p
                key={t}
                className="my-3 flex items-start gap-2 text-sm leading-7 text-ink-600"
              >
                <Check size={16} className="mt-1.5 shrink-0 text-sage-600" />
                {t}
              </p>
            ))}
          </section>
          <Link
            href="/app/connect"
            className="flex items-center gap-3 rounded-2xl bg-sage-900 p-5 text-sm font-semibold text-white"
          >
            <Smartphone size={20} />
            جهّز رقم واتساب
            <ArrowUpLeft size={17} className="ms-auto" />
          </Link>
          <Link
            href="/app/billing"
            className="flex items-center gap-3 rounded-2xl border border-sage-200 bg-white p-5 text-sm"
          >
            <CreditCard size={20} />
            اختر الباقة المناسبة
            <ArrowUpLeft size={17} className="ms-auto" />
          </Link>
        </aside>
      </div>
    </div>
  );
}
