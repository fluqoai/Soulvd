import Link from "next/link";
import {
  ArrowUpLeft,
  Check,
  ChevronDown,
  Play,
  ShieldCheck,
} from "lucide-react";
import { setupContext } from "@/lib/onboarding/context";
import { setupProgress } from "@/lib/onboarding/journey";

export default async function SetupChecklist({
  compact = false,
}: {
  compact?: boolean;
}) {
  const {
    context,
    connected,
    isActive,
    firstReply,
    launch,
    request,
    submitted,
  } = await setupContext();
  if (context.isTest) return null;
  const { completed, count } = setupProgress(
    Boolean(connected),
    isActive,
    firstReply,
  );
  if (count === 4) return null;
  const steps = [
    { title: "مساحتك جاهزة", detail: context.name, href: "/app" },
    {
      title: "اربط واتساب",
      detail: connected
        ? connected.phone
        : request && request.status !== "rejected"
          ? "بيانات رقمك محفوظة · تابع الربط"
          : "اختر رقم نشاطك وطريقة ربطه",
      href: "/app/connect",
    },
    {
      title: "فعّل باقتك",
      detail: isActive
        ? "الاشتراك نشط"
        : submitted
          ? "تحويلك قيد المراجعة"
          : launch.payments
            ? "اختر المدة وأكمل التحويل"
            : "اختيار الباقة متاح · الدفع لاحقًا",
      href: "/app/billing",
    },
    {
      title: "أول محادثة",
      detail: firstReply ? "وصل ردك إلى العميل" : "استقبل رسالة وأرسل أول رد",
      href: "/app/whatsapp",
    },
  ];
  const nextHref = !connected
    ? "/app/connect"
    : !isActive
      ? "/app/billing"
      : "/app/whatsapp";
  const nextTitle = !connected
    ? "متابعة ربط واتساب"
    : !isActive
      ? "متابعة الاشتراك"
      : "فتح المحادثات";
  return (
    <section
      aria-label="تجهيز مساحة العمل"
      className="overflow-hidden rounded-3xl border border-sage-200 bg-white"
    >
      <details open={!compact} className="group">
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-7 [&::-webkit-details-marker]:hidden">
          <div>
            <p className="text-xs font-semibold text-sage-600">
              بداية مرتبة، خطوة بخطوة
            </p>
            <h2 className="mt-2 text-xl font-bold">
              {compact ? "أكمل تجهيز مساحتك" : "أهلًا بك في مساحتك الجديدة"}
            </h2>
          </div>
          <span className="rounded-full bg-sage-50 px-4 py-2 text-xs font-semibold text-sage-800">
            {count} من 4 مكتملة{" "}
            <ChevronDown
              size={13}
              className="ms-1 inline transition group-open:rotate-180"
            />
          </span>
        </summary>
        {!compact && (
          <p className="px-5 pt-5 text-sm leading-7 text-ink-500 sm:px-7">
            مساحتك محفوظة. أكمل الخطوات بالترتيب المناسب لك، ويمكنك العودة إليها
            في أي وقت.
            {!launch.payments && !isActive
              ? " أنت الآن في مرحلة التجهيز؛ لا يُطلب منك تحويل أي مبلغ."
              : ""}
          </p>
        )}
        <ol className="grid gap-2 border-t border-sage-100 p-4 sm:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, i) => (
            <li key={step.title}>
              <Link
                href={step.href}
                aria-label={`${step.title}: ${completed[i] ? "مكتملة" : step.detail}`}
                className="flex h-full gap-3 rounded-2xl p-3 transition hover:bg-sage-50 focus-visible:outline-2 focus-visible:outline-sage-600"
              >
                <span
                  className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs ${completed[i] ? "bg-sage-800 text-white" : "border border-sage-200 text-sage-700"}`}
                >
                  {completed[i] ? <Check size={15} /> : i + 1}
                </span>
                <span>
                  <span className="block text-sm font-bold">{step.title}</span>
                  <span
                    dir="auto"
                    className="mt-1 block text-xs leading-6 text-ink-500"
                  >
                    {step.detail}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
        {!compact && (
          <div className="flex flex-wrap items-center gap-3 bg-sage-50/70 px-5 py-4 sm:px-7">
            <Link
              href={nextHref}
              className="inline-flex items-center gap-2 rounded-xl bg-sage-900 px-4 py-3 text-sm font-semibold text-white"
            >
              {nextTitle}
              <ArrowUpLeft size={16} />
            </Link>
            <Link
              href="/app/explore"
              className="inline-flex items-center gap-2 rounded-xl border border-sage-200 bg-white px-4 py-3 text-sm"
            >
              <Play size={15} />
              جرّب صندوق المحادثات
            </Link>
            <span className="flex items-center gap-1 text-xs text-ink-500">
              <ShieldCheck size={14} />
              تجربة توضيحية دون إرسال أو رسوم
            </span>
          </div>
        )}
      </details>
    </section>
  );
}
