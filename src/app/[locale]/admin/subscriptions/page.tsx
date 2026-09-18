import Link from "next/link";
import { redirect } from "next/navigation";
import { currentMerchant } from "@/lib/tenancy/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { sar, termLabel } from "@/lib/billing/terms";
import IntegrationPaymentForm from "./IntegrationPaymentForm";
import PaymentReview from "./PaymentReview";
export default async function SubscriptionAdmin() {
  const { db, user } = await currentMerchant();
  const { data: profile } = await db
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "owner") redirect("/admin");
  const admin = createAdminClient();
  const [tenants, subscriptions, requests] = await Promise.all([
    admin
      .from("tenants")
      .select("id,name")
      .eq("is_test", false)
      .order("created_at", { ascending: false }),
    admin
      .from("subscriptions")
      .select(
        "tenant_id,plan_id,status,period_end,billing_months,term_price_halalas",
      ),
    admin
      .from("payment_requests")
      .select(
        "id,tenant_id,purpose,status,amount_halalas,wallet_amount_halalas,welcome_amount_halalas,bank_reference,created_at",
      )
      .eq("status", "submitted")
      .order("created_at")
      .limit(100),
  ]);
  if (tenants.error || subscriptions.error || requests.error)
    throw new Error("تعذر تحميل الدفعات.");
  const integrations = tenants.data.length
    ? await admin
        .from("crm_integrations")
        .select("id,tenant_id,name,endpoint_url,status")
        .in(
          "tenant_id",
          tenants.data.map((t) => t.id),
        )
        .order("created_at", { ascending: false })
    : { data: [], error: null };
  if (integrations.error) throw new Error("تعذر تحميل التكاملات.");
  const names = new Map(tenants.data.map((t) => [t.id, t.name]));
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold">الاشتراكات والتحويل البنكي</h1>
      <p className="text-sm leading-7">
        راجع كشف البنك ثم طابق المبلغ والمرجع مع طلب العميل. التفعيل وشحن الرصيد
        لا يعتمدان على الإيصال وحده. مساحات الاختبار لا تُحصّل عليها دفعات.
      </p>
      <Link href="/admin/onboarding" className="block underline">
        طلبات ربط أرقام العملاء
      </Link>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">تحويلات بانتظار المراجعة</h2>
        {!requests.data.length && <p>لا توجد تحويلات مرسلة للمراجعة.</p>}
        {requests.data
          .filter((r) => names.has(r.tenant_id))
          .map((r) => (
            <article key={r.id} className="rounded-xl border bg-white p-5">
              <h3 className="font-bold">
                {names.get(r.tenant_id)} ·{" "}
                {r.purpose === "wallet"
                  ? "شحن رصيد واتساب"
                  : r.purpose === "upgrade"
                    ? "ترقية الباقة"
                    : "اشتراك المنصة"}
              </h3>
              <p className="mt-3">
                المبلغ المطلوب: {sar(r.amount_halalas / 100)} ريال
              </p>
              <p className="mt-2">
                مرجع العميل: <bdi>{r.bank_reference}</bdi>
              </p>
              {r.purpose === "subscription" && <p className="mt-2 text-sm leading-7">الاشتراك: {sar((r.amount_halalas - r.wallet_amount_halalas) / 100)} ريال · شحن المحفظة: {sar(r.wallet_amount_halalas / 100)} ريال · هدية الترحيب: {sar(r.welcome_amount_halalas / 100)} ريال (لا تدخل في مبلغ التحويل).</p>}
              <PaymentReview id={r.id} />
            </article>
          ))}
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">اشتراكات العملاء</h2>
        {tenants.data.map((t) => {
          const s = subscriptions.data.find((row) => row.tenant_id === t.id);
          return (
            <article key={t.id} className="rounded-xl border bg-white p-4">
              <h3 className="font-bold">{t.name}</h3>
              <p className="mt-2 text-sm">
                {s?.plan_id === "pro_growth_v1" ? "النمو" : "الانطلاق"} ·{" "}
                {termLabel(s?.billing_months ?? 1)} ·{" "}
                {sar((s?.term_price_halalas ?? 0) / 100)} ريال ·{" "}
                {s?.status === "active" ? "نشط" : "بانتظار التفعيل أو التجديد"}
              </p>
            </article>
          );
        })}
        {!tenants.data.length && <p>لا توجد مساحات عملاء فعلية بعد.</p>}
      </section>
      <IntegrationPaymentForm
        items={(integrations.data ?? []).map((i) => ({
          ...i,
          tenantName: names.get(i.tenant_id) ?? "",
        }))}
      />
    </div>
  );
}
