import Link from "next/link";
import { redirect } from "next/navigation";
import { currentMerchant } from "@/lib/tenancy/context";
import { createAdminClient } from "@/lib/supabase/admin";
import Forms from "./Forms";
import LaunchForm from "./LaunchForm";
import { launchSettings } from "@/lib/billing/launch";
import { ycloud } from "@/lib/ycloud/client";
export default async function OnboardingAdmin() {
  const { db, user } = await currentMerchant();
  const { data: profile } = await db
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "owner") redirect("/admin");
  const admin = createAdminClient();
  const launch = await launchSettings();
  const [requests, tenants, guides, contacts, providerBalance] = await Promise.all([
    admin
      .from("whatsapp_onboarding_requests")
      .select("id,tenant_id,requested_by,phone,status,note,created_at,number_kind,authorization_method,customer_confirmed_at")
      .order("created_at", { ascending: false })
      .limit(100),
    admin.from("tenants").select("id,name"),
    admin
      .from("workspace_guides")
      .select("tenant_id,data,submitted_at")
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false })
      .limit(100),
    admin.from("users").select("id,email").eq("role", "merchant"),
    ycloud<{ amount: number; currency: string }>("/balance").catch(() => null),
  ]);
  if (requests.error || tenants.error || guides.error || contacts.error)
    throw new Error("تعذر تحميل طلبات الربط.");
  const names = new Map(tenants.data.map((t) => [t.id, t.name]));
  const emails = new Map(contacts.data.map((u) => [u.id, u.email]));
  const statuses: Record<string, string> = {
    awaiting_link: "بانتظار تجهيز الربط",
    awaiting_customer: "بانتظار العميل",
    review: "جاهز للتحقق",
    connected: "متصل",
    rejected: "أعيد للعميل",
  };
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold">طلبات ربط واتساب</h1>
      <LaunchForm {...launch} />
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-8">
        <h2 className="font-bold">محفظة المزود الرئيسية</h2>
        <p>{providerBalance ? `الرصيد الحالي: ${providerBalance.amount} ${providerBalance.currency}` : "تعذر تحميل رصيد المزود الآن؛ راجعه من حساب YCloud."}</p>
        <p>تأكيد شحن العميل يضيف إلى محفظته في سولفد فقط. موّل محفظة YCloud الرئيسية بصورة مستقلة قبل الرسائل المدفوعة والحملات، وراجع الرصيد أثناء التشغيل.</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-bold">طلبات تجهيز التكاملات</h2>
        <p className="text-sm leading-7">
          طلبات وصفية من العميل. راجع النطاق الفني والتواصل معه قبل طلب التحويل
          أو إنشاء التكامل.
        </p>
        {!guides.data.length && (
          <p className="text-sm text-ink-500">لا توجد طلبات مراجعة بعد.</p>
        )}
        {guides.data.map((g) => (
          <article
            key={g.tenant_id}
            className="space-y-2 rounded-xl border bg-white p-5"
          >
            <h3 className="font-bold">{names.get(g.tenant_id)}</h3>
            <p className="text-sm">
              النظام: {String(g.data.system ?? "غير محدد")}
            </p>
            <p className="whitespace-pre-wrap text-sm leading-7">
              {String(g.data.need ?? "")}
            </p>
            <p className="text-xs text-ink-500">
              {new Date(g.submitted_at).toLocaleDateString("ar-SA")}
            </p>
          </article>
        ))}
      </section>
      <p className="text-sm leading-7">
        نسّق جلسة Coexistence مع العميل، أو احفظ رابط التفويض الخارجي عند توفره. بعد تفويض العميل،
        طابق منشأته ورقمه وWABA قبل التحقق النهائي. لا تضف موظفي المنصة إلى فريق
        العميل لتتمكن من ربطه.
      </p>
      <Link href="/admin/subscriptions" className="block text-sm underline">
        الاشتراكات والتحويلات
      </Link>
      {!requests.data.length && <p>لا توجد طلبات ربط بعد.</p>}
      {requests.data.map((r) => (
        <article key={r.id} className="rounded-xl border bg-white p-5">
          <h2 className="text-xl font-bold">{names.get(r.tenant_id)}</h2>
          {emails.get(r.requested_by) && <p dir="ltr" className="mt-2 text-right text-sm text-ink-500">{emails.get(r.requested_by)}</p>}
          <p className="mt-3">
            <bdi>{r.phone}</bdi> · {statuses[r.status]}
            {" · "}
            {r.number_kind === "business_app"
              ? "واتساب أعمال"
              : r.number_kind === "new_number"
                ? "رقم جديد: مسار مستقل"
                : "نقل من مزود آخر: مسار مستقل"}
          </p>
          {r.note && <p>{r.note}</p>}
          {r.customer_confirmed_at && <p className="mt-2 text-xs text-sage-700">أكد العميل إكمال التفويض: {new Date(r.customer_confirmed_at).toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" })}</p>}
          {r.number_kind !== "business_app" && (
            <p className="mt-3 text-sm leading-7">
              لا تستخدم Onboard Link المخصص للـ Coexistence لهذا الطلب. راجع
              أهلية الرقم ومتطلبات النقل مع العميل أولًا.
            </p>
          )}
          <Forms
            id={r.id}
            status={r.status}
            coexistence={r.number_kind === "business_app"}
            method={r.authorization_method}
          />
        </article>
      ))}
    </div>
  );
}
