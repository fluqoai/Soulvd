import Link from "next/link";
import {
  ArrowUpLeft,
  Bot,
  CheckCheck,
  CircleDot,
  FlaskConical,
  MessageCircle,
  PanelsTopLeft,
  Sparkles,
} from "lucide-react";
import { tenantUsage, currentMerchant } from "@/lib/tenancy/context";
import { PLANS } from "@/lib/billing/plans";
import { UsageWidget } from "@/components/billing/UsageWidget";
import SetupChecklist from "@/components/onboarding/SetupChecklist";
import { sar, termLabel } from "@/lib/billing/terms";

export default async function MerchantOverview() {
  const {
    context,
    subscription,
    plan,
    usage,
    dismissedResources,
    isActive,
    observedAt,
    usagePeriodStart,
  } = await tenantUsage();
  const { db } = await currentMerchant();
  const dayAgo = new Date(observedAt - 86400000).toISOString();
  const [numbers, inbound, outbound, drafts, bot] = await Promise.all([
    db
      .from("whatsapp_numbers")
      .select("phone,status")
      .eq("tenant_id", context.tenantId),
    db
      .from("whatsapp_messages")
      .select("id", { head: true, count: "exact" })
      .eq("tenant_id", context.tenantId)
      .eq("direction", "inbound")
      .gte("created_at", dayAgo),
    db
      .from("whatsapp_messages")
      .select("id", { head: true, count: "exact" })
      .eq("tenant_id", context.tenantId)
      .eq("direction", "outbound")
      .in("status", ["delivered", "read"])
      .gte("created_at", dayAgo),
    db
      .from("automation_runs")
      .select("id", { head: true, count: "exact" })
      .eq("tenant_id", context.tenantId)
      .eq("state", "draft"),
    db
      .from("bot_settings")
      .select("enabled")
      .eq("tenant_id", context.tenantId)
      .maybeSingle(),
  ]);
  if ([numbers, inbound, outbound, drafts, bot].some((r) => r.error))
    throw new Error("تعذر تحميل ملخص النشاط.");
  const number = numbers.data?.find((n) => n.status === "connected");
  if (subscription.status === "pending" && !context.isTest)
    return (
      <div className="space-y-6">
        <header>
          <p className="mb-2 text-sm text-ink-500">{context.name}</p>
          <h1 className="text-3xl font-bold">لنجهّز يومك الأول في سولفد</h1>
          <p className="mt-3 text-sm leading-7 text-ink-500">
            ابدأ بخطوة واحدة. نحفظ تقدمك، وتجد كل ما تحتاجه هنا.
          </p>
        </header>
        <SetupChecklist />
        <div className="grid gap-5 md:grid-cols-2">
          <section className="rounded-3xl border border-sage-100 bg-white p-6">
            <PanelsTopLeft size={25} className="mb-4 text-sage-600" />
            <h2 className="text-xl font-bold">تعرّف على صندوقك</h2>
            <p className="my-3 text-sm leading-8 text-ink-500">
              جرّب محادثة توضيحية وردًا جاهزًا. لا تحتاج ربط رقم أو دفع مبلغ
              لتتعرف على التجربة.
            </p>
            <Link
              href="/app/explore"
              className="text-sm font-semibold text-sage-800 underline"
            >
              استكشف سولفد ←
            </Link>
          </section>
          <section className="rounded-3xl border border-sage-100 bg-white p-6">
            <p className="mb-3 text-xs text-ink-500">
              اختيارك المبدئي · يمكنك تغييره
            </p>
            <h2 className="text-xl font-bold">{PLANS[plan.code].name}</h2>
            <p className="my-3 text-sm leading-8 text-ink-500">
              {termLabel(subscription.billing_months)} ·{" "}
              {sar(subscription.term_price_halalas / 100)} ريال عن المدة كاملة.
              لم يبدأ اشتراكك المدفوع بعد.
            </p>
            <Link
              href="/app/billing"
              className="text-sm font-semibold text-sage-800 underline"
            >
              مراجعة الباقة والمدة ←
            </Link>
          </section>
        </div>
      </div>
    );
  const stats = [
    {
      label: "الرسائل الواردة",
      value: inbound.count ?? 0,
      hint: "خلال آخر 24 ساعة",
      icon: MessageCircle,
    },
    {
      label: "الرسائل المسلّمة",
      value: outbound.count ?? 0,
      hint: "رسائل صادرة خلال آخر 24 ساعة",
      icon: CheckCheck,
    },
    {
      label: "مسودات للمراجعة",
      value: drafts.count ?? 0,
      hint: "ردود تنتظر موافقتك",
      icon: Bot,
    },
  ];
  return (
    <div className="space-y-7">
      <SetupChecklist />
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="mb-2 text-sm text-ink-500">{context.name}</p>
          <h1 className="text-3xl font-bold tracking-tight">نظرة عامة</h1>
          <p className="mt-2 text-sm leading-7 text-ink-500">
            تابع محادثاتك، راجع الردود، واعرف ما يحتاج انتباهك.
          </p>
        </div>
        <Link
          href="/app/whatsapp"
          className="inline-flex items-center gap-3 rounded-xl bg-sage-900 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sage-800"
        >
          فتح المحادثات
          <ArrowUpLeft size={18} aria-hidden="true" />
        </Link>
      </div>
      {!isActive && subscription.status !== "pending" && (
        <p
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          اشتراكك غير نشط أو انتهت دورته.{" "}
          <Link href="/app/billing" className="font-semibold underline">
            راجع حالة الاشتراك
          </Link>
        </p>
      )}
      <section aria-label="ملخص النشاط" className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, hint, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-sage-100 bg-white p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-ink-600">{label}</p>
              <span className="rounded-xl bg-sage-50 p-2.5 text-sage-700">
                <Icon size={19} aria-hidden="true" />
              </span>
            </div>
            <p className="my-3 text-3xl font-semibold tabular-nums">
              {value.toLocaleString("ar-SA")}
            </p>
            <p className="text-xs text-ink-500">{hint}</p>
          </div>
        ))}
      </section>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(260px,1fr)]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl bg-sage-900 p-6 text-white sm:p-7">
            <div className="flex items-center gap-2 text-sm text-sage-200">
              <CircleDot size={16} aria-hidden="true" />
              {number ? "رقم واتساب مربوط" : "ابدأ بتوصيل رقمك"}
            </div>
            <h2 className="mt-4 text-2xl font-semibold">
              {number
                ? "مساحتك جاهزة لبدء المحادثة"
                : "اجمع محادثات عملائك في مكان واحد"}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-sage-200">
              {number ? (
                <>
                  الرقم <bdi className="text-white">{number.phone}</bdi> محفوظ
                  في هذه المساحة. استخدم مركز الاختبار للتحقق من الاستقبال
                  والتسليم والردود.
                </>
              ) : (
                "اربط رقم واتساب الأعمال، ثم اختبر الاستقبال والإرسال قبل بدء خدمة العملاء."
              )}
            </p>
            <Link
              href={number ? "/app/readiness" : "/app/whatsapp"}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-sage-900"
            >
              {number ? "افتح مركز الاختبار" : "ربط واتساب"}
              <ArrowUpLeft size={16} aria-hidden="true" />
            </Link>
          </section>
          <UsageWidget
            key={`${context.tenantId}:${context.userId}:${usagePeriodStart}`}
            dismissedResources={dismissedResources}
            planCode={plan.code}
            rows={[
              {
                resource: "conversations",
                used: usage.conversations,
                limit: plan.conversations_limit,
              },
              { resource: "seats", used: usage.seats, limit: plan.seats_limit },
              {
                resource: "templates",
                used: usage.templates,
                limit: plan.templates_limit,
              },
              { resource: "flows", used: usage.flows, limit: plan.flows_limit },
              {
                resource: "numbers",
                used: usage.numbers,
                limit: plan.numbers_limit,
              },
            ]}
          />
        </div>
        <div className="space-y-5">
          <section className="rounded-2xl border border-sage-100 bg-white p-5">
            <p className="text-xs text-ink-500">باقتك الحالية</p>
            <h2 className="mt-2 text-lg font-semibold">
              {PLANS[plan.code].name}
            </h2>
            <p className="mt-3">
              <strong className="text-2xl">{plan.price_halalas / 100}</strong>
              <span className="ms-2 text-sm text-ink-500">ريال / شهر</span>
            </p>
            <p className="mt-3 text-xs text-ink-500">
              {context.isTest
                ? "اشتراك تجريبي داخل مساحة اختبار"
                : `نهاية الدورة: ${new Date(subscription.period_end).toLocaleDateString("ar-SA", { calendar: "gregory", timeZone: "Asia/Riyadh" })}`}
            </p>
            <Link
              href="/app/billing"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-sage-700"
            >
              إدارة الاشتراك
              <ChevronArrow />
            </Link>
          </section>
          <section className="rounded-2xl border border-sage-100 bg-white p-5">
            <h2 className="mb-4 font-semibold">خطوتك التالية</h2>
            {[
              {
                href: "/app/automations",
                icon: Bot,
                title:
                  (drafts.count ?? 0) > 0
                    ? "راجع الردود المقترحة"
                    : "جهّز أول رد آلي",
                text: bot.data?.enabled
                  ? "المسارات مفعّلة للرسائل الجديدة"
                  : "ابدأ بمسودة تراجعها قبل الإرسال",
              },
              {
                href: "/app/templates",
                icon: PanelsTopLeft,
                title: "خصّص قالبًا لنشاطك",
                text:
                  plan.code === "pro_growth"
                    ? "20 نموذجًا جاهزًا للتخصيص"
                    : "أنشئ قالبك، والمكتبة ضمن باقة النمو",
              },
              {
                href: "/app/readiness",
                icon: FlaskConical,
                title: "اختبر التجربة كاملة",
                text: "دليل واحد للربط والردود والتكاملات",
              },
            ].map(({ href, icon: Icon, title, text }) => (
              <Link
                key={href}
                href={href}
                className="flex gap-3 rounded-xl py-3 hover:bg-sage-50"
              >
                <Icon
                  size={19}
                  className="mt-1 shrink-0 text-sage-600"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-xs leading-6 text-ink-500">{text}</p>
                </div>
              </Link>
            ))}
          </section>
          <div className="flex gap-3 rounded-2xl border border-dashed border-sage-200 p-5">
            <Sparkles
              size={19}
              className="mt-1 shrink-0 text-sage-600"
              aria-hidden="true"
            />
            <p className="text-xs leading-6 text-ink-500">
              الردود الذكية تتطلب حصة مستقلة مفعّلة من المنصة. رسوم واتساب أيضًا
              منفصلة عن الاشتراك.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
function ChevronArrow() {
  return <ArrowUpLeft size={14} aria-hidden="true" />;
}
