import Link from "next/link";
import { tenantUsage } from "@/lib/tenancy/context";
import { PLANS } from "@/lib/billing/plans";
import { sar, termLabel } from "@/lib/billing/terms";
import SetupChecklist from "@/components/onboarding/SetupChecklist";
import { launchSettings } from "@/lib/billing/launch";
import BankDetails from "@/components/billing/BankDetails";
import {
  ContractForm,
  RequestPayment,
  PaymentRequestCard,
} from "@/components/billing/PaymentForms";
import { paymentRequests } from "./actions";
const statuses = {
  pending: "بانتظار التفعيل",
  active: "نشط",
  past_due: "متأخر السداد",
  cancelled: "ملغي",
};
export default async function BillingPage() {
  const { context, subscription: s, plan, isActive } = await tenantUsage();
  const launch = await launchSettings();
  const requests = (await paymentRequests()).filter(
    (r) => ['subscription','upgrade'].includes(r.purpose),
  );
  const open = requests.filter((r) =>
    ["pending", "submitted"].includes(r.status),
  );
  const manage = context.role === "owner" && !context.isTest;
  return (
    <div className="space-y-6">
      <SetupChecklist compact />
      {!isActive && launch.payments && <section className="rounded-2xl border border-sage-200 bg-sage-50 p-5 text-sm leading-8">
        ربط رقم واتساب الأعمال يتم حاليًا في جلسة بمساعدة فريق سولفد، بتفويضك داخل Meta. <Link href="/app/connect" className="font-semibold underline">احفظ رقم نشاطك</Link> قبل التحويل. إذا كان الرقم جديدًا أو مربوطًا بمزود آخر، <Link href="/contact" className="font-semibold underline">راجع أهلية الربط معنا</Link> قبل الدفع. رصيد الرسائل منفصل، ويمكن إضافته مع دفعة الاشتراك.
      </section>}
      <Link href="/app/ai" className="sv-surface block p-5 font-semibold">مساعد سولفد الذكي · الحصة والشحن الإضافي ←</Link>
      <section className="sv-surface space-y-4 p-6">
        <h1 className="text-3xl font-bold">الباقة والاشتراك</h1>
        <h2 className="text-xl">
          {PLANS[plan.code].name} · {termLabel(s.billing_months)}
        </h2>
        <p className="text-2xl font-bold">
          {sar(s.term_price_halalas / 100)} ريال عن المدة كاملة
        </p>
        <p>
          الحالة:{" "}
          {isActive
            ? "نشط"
            : s.status === "active"
              ? "انتهى الاشتراك"
              : statuses[s.status]}
        </p>
        {isActive && (
          <p>
            ينتهي في{" "}
            {new Date(s.period_end).toLocaleDateString("ar-SA", {
              calendar: "gregory",
              timeZone: "Asia/Riyadh",
            })}
          </p>
        )}
        <p className="text-sm leading-7 text-wood-600">
          تتجدد حصة العملاء شهريًا من تاريخ التفعيل، حتى عند الاشتراك السنوي. لا
          يوجد خصم تلقائي للتجديد.{" "}
          <Link href="/app/wallet" className="underline">
            رصيد رسائل واتساب
          </Link>{" "}
          منفصل عن اشتراك المنصة.
        </p>
        {isActive && plan.code === "starter" && (
          <Link
            href="/app/billing/upgrade"
            className="inline-block rounded-xl bg-sage-900 px-5 py-3 text-white"
          >
            الترقية إلى النمو الاحترافية
          </Link>
        )}
      </section>
      {!context.isTest && (
        <section className="sv-surface p-6">
          <div className="mt-6 rounded-xl bg-sage-50 p-4 text-sm leading-7">
            <h2 className="font-bold">
              {isActive
                ? "اشتراكك مفعّل"
                : !launch.payments
                  ? "اختر الآن، وفعّل لاحقًا"
                  : open.some((r) => r.status === "submitted")
                    ? "تحويلك قيد المراجعة"
                    : "الخطوة التالية: تأكيد الدفع"}
            </h2>
            <p className="mt-1 text-ink-500">
              {isActive
                ? "انتقل لربط رقم واتساب وتجهيز أول محادثة. يمكنك مراجعة حالة طلب الربط في أي وقت."
                : !launch.payments
                  ? "أنت في مرحلة تجهيز مساحتك. يمكنك تغيير الباقة والمدة أدناه وحفظ اختيارك. لا تحوّل أي مبلغ الآن؛ يظهر طلب الدفع عند فتح التفعيل."
                  : open.some((r) => r.status === "submitted")
                    ? "استلمنا مرجع التحويل. تتأكد الإدارة من وصول المبلغ قبل تفعيل الاشتراك؛ لا ترسل تحويلًا آخر لنفس الطلب."
                    : "أنشئ طلب الدفع بالباقة والمدة المختارتين، ثم حوّل المبلغ وأدخل مرجع العملية. سيظهر إجمالي الطلب وبيانات المستفيد قبل التحويل."}
            </p>
            {isActive && (
              <Link
                href="/app/connect"
                className="mt-3 inline-block font-semibold text-sage-700 underline"
              >
                متابعة ربط الرقم ←
              </Link>
            )}
          </div>
        </section>
      )}
      {context.isTest && (
        <p className="rounded-xl bg-amber-50 p-4 text-sm">
          هذه مساحة اختبار؛ لا يتم تحصيل اشتراك عليها.
        </p>
      )}
      {manage && !isActive && !open.length && (
        <>
          <details className="rounded-xl border bg-white p-5">
            <summary className="cursor-pointer font-bold">
              تغيير الباقة أو مدة الاشتراك
            </summary>
            <div className="mt-6">
              <ContractForm plan={s.plan_id} months={s.billing_months} />
            </div>
          </details>
          <RequestPayment purpose="subscription" subscriptionHalalas={s.term_price_halalas} disabled={!launch.payments} />
        </>
      )}
      {manage && open.some((r) => r.status === "pending") && <BankDetails />}
      {open.map((r) => (
        <PaymentRequestCard key={r.id} item={r} canManage={manage} />
      ))}
      {requests.some((r) => r.status === "confirmed") && (
        <details className="rounded-xl border bg-white p-5">
          <summary className="cursor-pointer">الدفعات المؤكدة</summary>
          <div className="mt-4 space-y-3">
            {requests
              .filter((r) => r.status === "confirmed")
              .map((r) => (
                <PaymentRequestCard key={r.id} item={r} canManage={false} />
              ))}
          </div>
        </details>
      )}
    </div>
  );
}
