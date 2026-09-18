import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { setupContext } from "@/lib/onboarding/context";
import { connectionStage } from "@/lib/onboarding/journey";
import SetupChecklist from "@/components/onboarding/SetupChecklist";
import SetupRefresh from "@/components/onboarding/SetupRefresh";
import { ConnectionForm, ConnectionReady, ConnectionRecovery } from "./Forms";

export default async function ConnectPage() {
  const {
    context,
    connected,
    request: r,
    launch,
    isActive,
    observedAt,
  } = await setupContext();
  const stage = connectionStage(
    r,
    Boolean(connected),
    launch.onboarding,
    observedAt,
  );
  const waiting = [
    "review",
    "waiting",
    "preparing",
    "authorize",
    "assisted",
    "session",
  ].includes(stage);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <SetupChecklist compact />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold text-sage-600">
            واتساب نشاطك، داخل سولفد
          </p>
          <h1 className="text-3xl font-bold">اربط رقمك بخطوات واضحة</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-500">
            احفظ رقمك أولًا. نرشدك إلى مسار التفويض المناسب، وتظهر حالة الربط
            هنا حتى اكتماله.
          </p>
        </div>
        <SetupRefresh watch={waiting} />
      </header>
      {connected ? (
        <section className="rounded-3xl border border-sage-200 bg-white p-7">
          <CheckCircle2 size={36} className="mb-4 text-sage-600" />
          <h2 className="text-xl font-bold">واتساب متصل بمساحتك</h2>
          <p dir="ltr" className="my-4 text-right text-xl font-semibold">
            {connected.phone}
          </p>
          <p className="mb-5 text-sm leading-7 text-ink-500">
            {isActive
              ? "أرسل رسالة من رقم آخر إلى رقم نشاطك، ثم افتح المحادثات للرد. يتطلب الإرسال رصيدًا كافيًا عند وجود رسوم."
              : "اكتمل ربط الرقم. فعّل باقتك لبدء المراسلة."}
          </p>
          <Link
            href={isActive ? "/app/whatsapp" : "/app/billing"}
            className="inline-flex rounded-xl bg-sage-900 px-5 py-3 text-sm text-white"
          >
            {isActive ? "فتح صندوق المحادثات" : "متابعة الاشتراك"}
          </Link>
        </section>
      ) : context.role !== "owner" ? (
        <section className="rounded-2xl border bg-white p-6">
          يتولى مالك مساحة العمل ربط رقم المنشأة. يمكنك استكشاف الواجهة من
          القائمة.
        </section>
      ) : stage === "choose" ? (
        <>
          {r?.note && (
            <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm">
              ملاحظة على الطلب السابق: {r.note}
            </p>
          )}
          <ConnectionForm />
        </>
      ) : (
        <section className="overflow-hidden rounded-3xl border border-sage-200 bg-white">
          <div className="flex items-center gap-3 border-b border-sage-100 bg-sage-50/50 p-5">
            <Smartphone size={24} className="text-sage-700" />
            <div>
              <p className="text-xs text-ink-500">رقم نشاطك المحفوظ</p>
              <p dir="ltr" className="mt-1 font-semibold">
                {r?.phone}
              </p>
            </div>
            <span className="ms-auto rounded-full bg-white px-3 py-1 text-xs text-sage-700">
              {r?.number_kind === "business_app"
                ? "واتساب أعمال"
                : r?.number_kind === "new_number"
                  ? "رقم جديد"
                  : "مزود آخر"}
            </span>
          </div>
          <div className="space-y-5 p-6 sm:p-8">
            {stage === "session" && r ? (
              <>
                <h2 className="text-xl font-bold">جلسة ربط واتساب بمساعدتنا</h2>
                <p className="text-sm leading-8 text-ink-500">نسّق فريق سولفد جلسة الربط معك. جهّز الهاتف الذي عليه واتساب الأعمال، واسم منشأتك كما في السجل وموقعها الإلكتروني. تمسح رمز QR الذي يظهر أثناء الجلسة وتكمل التفويض بنفسك داخل Meta. قد يظهر اسم مزود الربط أثناء التفويض.</p>
                <ol className="space-y-3 rounded-2xl bg-sage-50 p-5 text-sm leading-7">
                  <li>1. افتح تطبيق واتساب الأعمال على هاتفك أثناء الجلسة.</li>
                  <li>2. امسح رمز الربط المعروض على الكمبيوتر واتبع خطوات الموافقة.</li>
                  <li>3. لا تحذف حساب واتساب الأعمال؛ يظل التطبيق يعمل مع سولفد.</li>
                  <li>4. بعد ظهور الانتهاء، أكّد أدناه لنراجع الاتصال ونفتح المحادثات.</li>
                </ol>
                <ConnectionReady id={r.id} />
              </>
            ) : stage === "authorize" && r ? (
              <>
                <h2 className="text-xl font-bold">خطوتك الآن: تفويض الرقم</h2>
                <p className="text-sm leading-7 text-ink-500">
                  جهّز جوالك الذي يستخدم واتساب الأعمال. يفتح الزر صفحة الربط
                  الآمن ثم خطوات Meta؛ قد يظهر اسم مزود الربط هناك. بعد
                  الانتهاء، عد إلى هذه الصفحة وأكّد إكمال التفويض.
                </p>
                <ol className="space-y-3 text-sm leading-7">
                  <li>1. استخدم الرقم المحفوظ أعلاه وحساب أعمال منشأتك.</li>
                  <li>
                    2. اختر ربط تطبيق WhatsApp Business واتبع التحقق الذي يظهر.
                  </li>
                  <li>
                    3. أبقِ حساب واتساب على جوالك؛ لا تحذفه لإتمام الربط
                    المتزامن.
                  </li>
                </ol>
                <a
                  href={r.onboarding_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-sage-900 px-5 py-3 text-sm font-semibold text-white"
                >
                  ابدأ الربط الآمن
                  <ExternalLink size={16} />
                </a>
                <p className="text-xs text-ink-500">
                  يفتح في نافذة جديدة. يمكنك متابعة هذه الخطوة لاحقًا ما دام
                  الرابط صالحًا.
                </p>
                <ConnectionReady id={r.id} />
              </>
            ) : (
              <>
                <Clock3 size={30} className="text-sage-600" />
                <h2 className="text-xl font-bold">
                  {
                    {
                      authorize: "أكمل التفويض",
                      session: "جلسة ربط واتساب",
                      connected: "راجع حالة الرقم",
                      preparing: "رقمك محفوظ، ومساحتك جاهزة للتجهيز",
                      waiting: "لنجهّز ربط واتساب معك",
                      assisted: "حفظنا رقمك للمسار المناسب",
                      review: "اكتمل طلبك، نتحقق من الربط",
                      expired: "لنجهّز لك رابطًا جديدًا",
                      disconnected: "الرقم يحتاج متابعة الاتصال",
                    }[stage]
                  }
                </h2>
                <p className="text-sm leading-8 text-ink-500">
                  {
                    {
                      authorize: "أكمل التفويض",
                      session: "أكمل جلسة التفويض مع الفريق.",
                      connected: "راجع حالة الرقم",
                      preparing:
                        "تفعيل الربط للمنشآت الجديدة متاح قريبًا. لا يلزمك الدفع الآن، ولا إعادة إدخال رقمك. استكشف صندوق المحادثات واختر الباقة أثناء تجهيز الخدمة.",
                      waiting:
                        "نربط رقم واتساب الأعمال في جلسة قصيرة بمساعدتنا. جهّز هاتفك وبيانات منشأتك، ثم تواصل معنا لتحديد الجلسة. إذا جهّزنا رابط تفويض مباشرًا فسيظهر هنا. بياناتك محفوظة ولا تحتاج إلى إعادة الطلب.",
                      assisted:
                        "هذا الرقم يحتاج مسارًا مختلفًا عن ربط تطبيق واتساب الأعمال. سيراجع الفريق متطلبات الرقم الجديد أو النقل من المزود الحالي؛ لا تحذف حسابك أو تفصل مزودك الآن.",
                      review:
                        "نتحقق من حالة الرقم وارتباطه بمنشأتك قبل فتح المحادثات. تأكيد إكمال التفويض وحده لا يعني اكتمال الاتصال. تتحدث هذه الصفحة تلقائيًا أثناء فتحها.",
                      expired:
                        "انتهت صلاحية رابط التفويض. اطلب تجديده من الزر أدناه؛ تظل بيانات رقمك محفوظة.",
                      disconnected:
                        "طلب الربط مسجل، لكن الرقم لا يظهر متصلًا حاليًا. حدّث الحالة أو تواصل مع الدعم لمراجعة الاتصال.",
                    }[stage]
                  }
                </p>
                {stage === "waiting" && <Link href={isActive ? "/contact" : "/app/billing"} className="inline-flex rounded-xl bg-sage-900 px-5 py-3 text-sm text-white">{isActive ? "تنسيق جلسة الربط" : "متابعة تفعيل الباقة"}</Link>}
                {r && (stage === "expired" || r.status === "awaiting_link") && (
                  <ConnectionRecovery id={r.id} expired={stage === "expired"} />
                )}
              </>
            )}
          </div>
        </section>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/app/explore"
          className="rounded-2xl border border-sage-100 bg-white p-5"
        >
          <h2 className="font-bold">استكشف قبل الربط ←</h2>
          <p className="mt-2 text-sm leading-7 text-ink-500">
            جرّب الردود في صندوق توضيحي دون إرسال أي رسالة حقيقية.
          </p>
        </Link>
        <div className="rounded-2xl border border-sage-100 bg-white p-5">
          <ShieldCheck size={20} className="mb-2 text-sage-600" />
          <h2 className="font-bold">بيانات منشأتك في مساحتها</h2>
          <p className="mt-2 text-sm leading-7 text-ink-500">
            المحادثات متاحة لأعضاء فريقك المصرّح لهم.{" "}
            <Link href="/contact" className="underline">
              تحتاج مساعدة؟
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
