import Link from "next/link";
import { currentMerchant, tenantUsage } from "@/lib/tenancy/context";
import { ConnectionForm, ConnectionReady } from "./Forms";
export default async function ConnectPage() {
  const { context, isActive, observedAt } = await tenantUsage();
  const { db } = await currentMerchant();
  const [numbers, request] = await Promise.all([
    db
      .from("whatsapp_numbers")
      .select("phone,status")
      .eq("tenant_id", context.tenantId),
    db
      .from("whatsapp_onboarding_requests")
      .select("id,phone,status,onboarding_url,link_expires_at,note")
      .eq("tenant_id", context.tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (numbers.error || request.error) throw new Error("تعذر تحميل طلب الربط.");
  const connected = numbers.data.find((n) => n.status === "connected"),
    r = request.data;
  const canOpen =
    r?.status === "awaiting_customer" &&
    r.onboarding_url &&
    r.link_expires_at &&
    Date.parse(r.link_expires_at) > observedAt;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">اربط رقم واتساب للأعمال</h1>
      <p className="leading-7 text-wood-600">
        استمر في استخدام تطبيق واتساب للأعمال على جوالك، وأدر المحادثات من
        Soulvd بعد إكمال التفويض والتحقق.
      </p>
      <ol className="grid gap-3 sm:grid-cols-3">
        {[
          "1. اطلب رابط الربط",
          "2. فوّض الرقم وحساب الأعمال",
          "3. نتحقق ونربطه بمساحتك",
        ].map((label) => (
          <li key={label} className="rounded-xl border bg-white p-4 text-sm">
            {label}
          </li>
        ))}
      </ol>
      {connected ? (
        <section className="space-y-3 rounded-xl border border-sage-300 bg-sage-50 p-5">
          <h2 className="font-bold">الرقم متصل</h2>
          <bdi>{connected.phone}</bdi>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href="/app/whatsapp" className="underline">
              فتح المحادثات
            </Link>
            <Link href="/app/wallet" className="underline">
              رصيد واتساب
            </Link>
            <Link href="/app/readiness" className="underline">
              اختبار الربط
            </Link>
          </div>
        </section>
      ) : context.role !== "owner" ? (
        <p>يتولى مالك مساحة العمل طلب الربط.</p>
      ) : !isActive ? (
        <p>
          فعّل الاشتراك من{" "}
          <Link href="/app/billing" className="underline">
            صفحة الباقة
          </Link>{" "}
          أولًا.
        </p>
      ) : !r || r.status === "rejected" ? (
        <>
          {r?.note && <p role="status">ملاحظة المراجعة: {r.note}</p>}
          <ConnectionForm />
        </>
      ) : (
        <section className="space-y-4 rounded-xl border bg-white p-5">
          <p>
            الرقم المطلوب: <bdi>{r.phone}</bdi>
          </p>
          <h2 className="font-bold">
            {r.status === "awaiting_link"
              ? "نجهز رابط التفويض"
              : r.status === "review"
                ? "نتحقق من الرقم والربط"
                : "أكمل التفويض"}
          </h2>
          {canOpen ? (
            <>
              <p className="text-sm leading-7">
                يفتح الرابط صفحة مزود الربط ثم تفويض Meta. قد يظهر اسم المزود في
                هذه الخطوة. استخدم الرقم المذكور أعلاه، واختر الربط مع تطبيق
                واتساب للأعمال؛ لا تحذف حساب واتساب من جوالك.
              </p>
              <a
                href={r.onboarding_url!}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
                className="inline-block rounded-xl border border-sage-400 px-5 py-3"
              >
                فتح رابط التفويض
              </a>
              <ConnectionReady id={r.id} />
            </>
          ) : r.status === "awaiting_customer" ? (
            <p>انتهت صلاحية الرابط. تواصل مع الدعم لإعادة تجهيزه.</p>
          ) : (
            <p className="text-sm">
              سيظهر التحديث هنا بعد مراجعة الإدارة. لا تحتاج حسابًا منفصلًا
              لإدارة المحادثات.
            </p>
          )}
        </section>
      )}
      <p className="text-sm leading-7 text-wood-600">
        المسار الحالي للأرقام المستخدمة في تطبيق WhatsApp Business والمؤهلة
        للربط المتزامن. للأرقام الجديدة أو لتعديل طلبك{" "}
        <Link href="/contact" className="underline">
          تواصل معنا
        </Link>
        .
      </p>
    </div>
  );
}
