import Link from "next/link";
import { redirect } from "next/navigation";
import { currentMerchant } from "@/lib/tenancy/context";
import { createAdminClient } from "@/lib/supabase/admin";
import Forms from "./Forms";
import LaunchForm from "./LaunchForm";
import { launchSettings } from "@/lib/billing/launch";
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
  const [requests, tenants] = await Promise.all([
    admin
      .from("whatsapp_onboarding_requests")
      .select("id,tenant_id,phone,status,note,created_at,number_kind")
      .order("created_at", { ascending: false })
      .limit(100),
    admin.from("tenants").select("id,name"),
  ]);
  if (requests.error || tenants.error)
    throw new Error("تعذر تحميل طلبات الربط.");
  const names = new Map(tenants.data.map((t) => [t.id, t.name]));
  const statuses: Record<string, string> = {
    awaiting_link: "بانتظار الرابط",
    awaiting_customer: "بانتظار العميل",
    review: "جاهز للتحقق",
    connected: "متصل",
    rejected: "أعيد للعميل",
  };
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold">طلبات ربط واتساب</h1>
      <LaunchForm {...launch} />
      <p className="text-sm leading-7">
        أنشئ Onboard Link للعميل من حساب YCloud ثم احفظه هنا. بعد تفويض العميل،
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
          />
        </article>
      ))}
    </div>
  );
}
