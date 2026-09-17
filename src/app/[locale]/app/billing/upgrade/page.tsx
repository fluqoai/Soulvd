import Link from "next/link";
import { tenantUsage } from "@/lib/tenancy/context";
import {
  RequestPayment,
  PaymentRequestCard,
} from "@/components/billing/PaymentForms";
import BankDetails from "@/components/billing/BankDetails";
import { paymentRequests } from "../actions";
export default async function UpgradePage() {
  const { context, plan, isActive } = await tenantUsage();
  const open = (await paymentRequests()).filter(
    (r) =>
      r.purpose === "upgrade" && ["pending", "submitted"].includes(r.status),
  );
  const canUpgrade =
    context.role === "owner" &&
    !context.isTest &&
    plan.code === "starter" &&
    isActive;
  return (
    <div className="space-y-6">
      <section className="space-y-5 rounded-2xl border border-sage-200 bg-white p-6">
        <span className="rounded-full bg-sage-100 px-3 py-1 text-sm">
          موصى بها
        </span>
        <h1 className="text-3xl font-bold">النمو الاحترافية</h1>
        <p>
          10,000 عميل مختلف كل شهر، ومقاعد وقوالب ومسارات أتمتة غير محدودة،
          ومكتبة 20 نموذجًا، وصلاحية API وWebhooks.
        </p>
        <p className="text-sm leading-7">
          يُحسب فرق الباقتين للوقت المتبقي من اشتراكك مع مراعاة الخصم السنوي.
          أنشئ طلب الترقية لعرض المبلغ النهائي؛ تُحفظ الحصة المستهلكة وموعد
          النهاية وتُفتح المزايا بعد تأكيد التحويل. إعداد تكامل CRM برسوم
          مستقلة.
        </p>
        {canUpgrade && !open.length ? (
          <RequestPayment purpose="upgrade" />
        ) : (
          !canUpgrade && <p>الترقية متاحة لمالك مساحة باشتراك انطلاق نشط.</p>
        )}
        <Link href="/app/billing" className="block text-sm underline">
          العودة إلى الاشتراك
        </Link>
      </section>
      {canUpgrade && open.some((r) => r.status === "pending") && (
        <BankDetails />
      )}
      {open.map((r) => (
        <PaymentRequestCard key={r.id} item={r} canManage={canUpgrade} />
      ))}
    </div>
  );
}
