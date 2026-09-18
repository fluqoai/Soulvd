import { getLocale } from "next-intl/server";
import {
  ArrowLeft,
  MessageCircle,
  Workflow,
  PanelsTopLeft,
  Check,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import PlanPicker from "@/components/billing/PlanPicker";

export async function CustomerJourney() {
  const ar = (await getLocale()) === "ar";
  const steps = ar
    ? [
        "أنشئ حسابك وأكّد بريدك",
        "استكشف مساحتك",
        "جهّز رقم واتساب",
        "اختر باقتك وفعّلها",
        "ابدأ المحادثات",
      ]
    : [
        "Create and verify your account",
        "Explore your workspace",
        "Prepare your WhatsApp number",
        "Choose and activate your plan",
        "Start conversations",
      ];
  const features = ar
    ? [
        {
          icon: MessageCircle,
          title: "صندوق واحد، فريق أقرب",
          text: "تابع الرسائل من واجهة مألوفة، اعرف ما لم يُقرأ بعد، وشاهد حالة تسليم كل رد.",
          label: "من الاستفسار إلى المتابعة",
        },
        {
          icon: Workflow,
          title: "رتّب الردود المتكررة",
          text: "جهّز رسائل الترحيب والأسئلة المتكررة بمسارات أتمتة قابلة للتعديل حسب نشاطك.",
          label: "مسارات تتحكم بها",
        },
        {
          icon: PanelsTopLeft,
          title: "ابدأ من قالب جاهز",
          text: "20 نموذجًا عربيًا في باقة النمو. خصّص التأكيدات والمواعيد ومتابعة الطلبات، ثم أرسلها للاعتماد.",
          label: "مكتبة قابلة للتخصيص",
        },
      ]
    : [
        {
          icon: MessageCircle,
          title: "One inbox for your team",
          text: "Follow conversations in a familiar workspace, find unread messages and track delivery.",
          label: "From enquiry to follow-up",
        },
        {
          icon: Workflow,
          title: "Organize repeat replies",
          text: "Build editable welcome messages and frequently asked question flows for your business.",
          label: "Automation you control",
        },
        {
          icon: PanelsTopLeft,
          title: "Start with a template",
          text: "20 Arabic examples in Pro Growth. Customize confirmations, appointments and order updates, then submit for approval.",
          label: "Make it your own",
        },
      ];
  return (
    <>
      <section
        id="how-it-works"
        className="container-page scroll-mt-24 py-20 md:py-24"
      >
        <div className="max-w-2xl">
          <p className="text-xs font-bold tracking-wide text-sage-700">
            {ar ? "مساحة عمل مصممة ليومك" : "A WORKSPACE FOR YOUR DAY"}
          </p>
          <h2 className="mt-4 text-3xl font-bold leading-snug md:text-4xl">
            {ar
              ? "عميلك يكتب في واتساب.\nوفريقك يعمل في سولفد."
              : "Your customer uses WhatsApp. Your team works in Soulvd."}
          </h2>
          <p className="mt-4 text-sm leading-7 text-ink-500">
            {ar
              ? "المحادثات والأتمتة والقوالب في مكان واحد، مع باقات واضحة ورصيد مراسلة مستقل."
              : "Conversations, automations and templates in one place, with clear plans and a separate messaging balance."}
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {features.map(({ icon: Icon, title, text, label }) => (
            <article
              key={title}
              className="rounded-2xl border border-sage-100 bg-white p-7"
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sage-50 text-sage-700">
                <Icon size={23} />
              </span>
              <p className="mt-7 text-[11px] font-semibold text-sage-700">
                {label}
              </p>
              <h3 className="mt-2 text-xl font-bold">{title}</h3>
              <p className="mt-4 text-sm leading-7 text-ink-500">{text}</p>
            </article>
          ))}
        </div>
        <div className="mt-12 rounded-2xl bg-sage-900 p-7 text-white md:p-9">
          <h3 className="text-lg font-semibold">
            {ar
              ? "رحلة واضحة من الاختيار إلى أول رسالة"
              : "A clear path to your first message"}
          </h3>
          <ol className="mt-7 grid gap-5 sm:grid-cols-5">
            {steps.map((step, i) => (
              <li key={step} className="flex items-center gap-3 sm:block">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/25 text-xs text-white/80">
                  {i + 1}
                </span>
                <p className="text-sm sm:mt-3">{step}</p>
              </li>
            ))}
          </ol>
          <p className="mt-7 border-t border-white/15 pt-5 text-xs leading-6 text-white/70">
            {ar
              ? "يبدأ الاشتراك بعد تأكيد وصول التحويل. ربط الرقم يخضع لأهليته وتفويض مالكه، وسنساعدك في خطواته."
              : "Your subscription starts after transfer verification. Number connection depends on eligibility and owner authorization; we help with the steps."}
          </p>
        </div>
      </section>
      <section
        id="plans"
        className="border-y border-sage-100 bg-[#f3f5f0] py-20"
      >
        <div className="container-page max-w-5xl">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold text-sage-700">
              {ar ? "باقتان. اختيار واضح." : "TWO PLANS. A CLEAR CHOICE."}
            </p>
            <h2 className="mt-4 text-3xl font-bold md:text-4xl">
              {ar ? "ابدأ من 299 ريال شهريًا" : "Starting at SAR 299 per month"}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-ink-500">
              {ar
                ? "اختر الانطلاق لفريقك الصغير، أو النمو بمساحة أوسع للفريق والعملاء والأتمتة. الدفع مقدمًا عن المدة المختارة."
                : "Choose Starter for a small team or Pro Growth for more customers, seats and automations. Pay upfront for your chosen term."}
            </p>
          </div>
          <div dir="rtl" lang="ar">
            <PlanPicker />
          </div>
          <p className="mt-6 flex items-center justify-center gap-2 text-xs text-sage-700">
            <Check size={15} />
            {ar
              ? "لا خصم تلقائي للتجديد · حساب مستقل لكل منشأة"
              : "No automatic renewal charge · A separate workspace for every business"}
          </p>
          <Link
            href="/plans"
            className="mx-auto mt-5 flex w-fit items-center gap-2 text-sm font-semibold text-sage-800"
          >
            {ar ? "تفاصيل الباقات" : "Plan details"}
            <ArrowLeft size={16} />
          </Link>
        </div>
      </section>
    </>
  );
}
