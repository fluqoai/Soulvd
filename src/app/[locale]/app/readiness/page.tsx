import Link from "next/link";
import { CheckCircle2, Circle, ArrowUpLeft, Info } from "lucide-react";
import { currentMerchant, tenantUsage } from "@/lib/tenancy/context";
import { StudioHeader } from "../studio/ui";
import Controls from "./Controls";

export default async function ReadinessPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string; since?: string }>;
}) {
  const params = await searchParams;
  const normalized =
    typeof params.phone === "string"
      ? params.phone.replace(/[\s()+-]/g, "")
      : "";
  const phone = /^[1-9]\d{7,14}$/.test(normalized) ? normalized : "";
  const parsed =
    typeof params.since === "string" ? Date.parse(params.since) : NaN;
  const { context, plan, isActive, observedAt: now } = await tenantUsage();
  const since = new Date(
    Number.isFinite(parsed) && parsed <= now && parsed >= now - 7 * 86400000
      ? parsed
      : now - 86400000,
  ).toISOString();
  const { db } = await currentMerchant();
  const [numbers, contact, templates, integrations] = await Promise.all([
    db
      .from("whatsapp_numbers")
      .select("phone,status")
      .eq("tenant_id", context.tenantId),
    phone
      ? db
          .from("whatsapp_contacts")
          .select("id")
          .eq("tenant_id", context.tenantId)
          .eq("wa_id", phone)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    db
      .from("whatsapp_templates")
      .select("id", { head: true, count: "exact" })
      .eq("tenant_id", context.tenantId)
      .eq("status", "approved"),
    db
      .from("crm_integrations")
      .select("id,status")
      .eq("tenant_id", context.tenantId),
  ]);
  if ([numbers, contact, templates, integrations].some((r) => r.error))
    throw new Error("تعذر قراءة جاهزية المساحة.");
  const messages = contact.data
    ? await db
        .from("whatsapp_messages")
        .select("id,direction,status,kind,created_at")
        .eq("tenant_id", context.tenantId)
        .eq("contact_id", contact.data.id)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [], error: null };
  if (messages.error) throw new Error("تعذر قراءة رسائل جولة الاختبار.");
  const ids = (messages.data ?? []).map((m) => m.id);
  const [runs, deliveries] = ids.length
    ? await Promise.all([
        db
          .from("automation_runs")
          .select("state")
          .eq("tenant_id", context.tenantId)
          .in("message_id", ids)
          .in("state", ["draft", "sent", "handoff"]),
        db
          .from("crm_deliveries")
          .select("status")
          .eq("tenant_id", context.tenantId)
          .in("message_id", ids)
          .eq("status", "delivered"),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];
  if (runs.error || deliveries.error)
    throw new Error("تعذر قراءة نتائج الأتمتة والتكاملات.");
  const connected = numbers.data?.find((n) => n.status === "connected");
  const inbound = messages.data?.some((m) => m.direction === "inbound");
  const delivered = messages.data?.some(
    (m) =>
      m.direction === "outbound" && ["delivered", "read"].includes(m.status),
  );
  const templateSent = messages.data?.some(
    (m) =>
      m.direction === "outbound" &&
      m.kind === "template" &&
      ["delivered", "read"].includes(m.status),
  );
  const rows = [
    {
      title: "الاشتراك والرقم",
      done: isActive && Boolean(connected),
      href: "/app/whatsapp",
      detail: connected
        ? `الرقم ${connected.phone} محفوظ. إثبات الاتصال الفعلي هو وصول الرسالة وتسليم الرد أدناه.`
        : "اربط رقم واتساب بهذه المساحة أولًا.",
    },
    {
      title: "وصول رسالة العميل",
      done: Boolean(inbound),
      href: "/app/whatsapp",
      detail: phone
        ? "أرسل رسالة من الرقم التجريبي إلى رقم النشاط، ثم حدّث النتائج."
        : "حدد رقم العميل التجريبي لبدء المتابعة.",
    },
    {
      title: "تسليم الرد من Soulvd",
      done: Boolean(delivered),
      href: "/app/whatsapp",
      detail:
        "افتح المحادثات وأرسل ردًا إلى الرقم نفسه. النجاح يتطلب تأكيد التسليم، وليس مجرد قبول طلب الإرسال.",
    },
    {
      title: "تشغيل مسار أتمتة",
      done: Boolean(runs.data?.length),
      href: "/app/automations",
      detail:
        "أنشئ مسارًا بكلمة «اختبار سولفد»، واجعله نشطًا وبوضع المسودة. فعّل المسارات ثم أرسل الكلمة من رقم الاختبار وراجع النتيجة.",
    },
    {
      title: "قالب معتمد لدى واتساب",
      done: (templates.count ?? 0) > 0,
      href: "/app/templates",
      detail:
        "أنشئ قالبًا أو خصّص نموذجًا ثم أرسله للمراجعة. اعتماد Meta خطوة خارجية قد لا تكتمل في الجلسة نفسها.",
    },
    {
      title: "تسليم رسالة قالب",
      done: Boolean(templateSent),
      href: "/app/whatsapp",
      detail:
        "بعد اعتماد القالب، أرسله إلى رقم الاختبار بموافقته، وتحقق من وصوله. قد تُحتسب رسوم واتساب.",
    },
    {
      title: "تسليم حدث إلى CRM",
      done: Boolean(deliveries.data?.length),
      href: "/app/integrations",
      detail: plan.api_enabled
        ? "يتطلب تكاملًا مفعّلًا ووجهة اختبار تخصك. تحقق أيضًا من توقيع الحدث في النظام المستقبل."
        : "يتطلب باقة النمو وتكاملًا مفعّلًا بعد التحقق من رسومه. لا نسجل تحويلًا وهميًا للاختبار.",
    },
  ];
  const complete = rows.filter((r) => r.done).length;
  return (
    <div className="space-y-6">
      <StudioHeader
        title="مركز الاختبار"
        description="تابع رحلة عميل تجريبي من واتساب إلى الرد والأتمتة والتكاملات، واجمع دليل كل خطوة في مكان واحد."
      />
      <Controls
        key={`${context.tenantId}:${phone}:${since}`}
        phone={phone}
        since={since}
      />
      <section className="overflow-hidden rounded-2xl border border-sage-100 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sage-100 bg-sage-50/60 p-5">
          <div>
            <h2 className="font-semibold">نتائج الفحص</h2>
            <p className="mt-1 text-xs text-ink-500">
              {phone
                ? `رقم الاختبار: +${phone} · آخر 100 رسالة ضمن النافذة`
                : "يظهر إعداد المساحة الآن؛ نتائج المراسلة تتطلب رقم اختبار."}
            </p>
          </div>
          <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-sage-700">
            {complete} / {rows.length} تحقق
          </span>
        </div>
        <ol className="divide-y divide-sage-100">
          {rows.map((r, i) => (
            <li
              key={r.title}
              className="flex items-start gap-3 p-5 sm:gap-4 sm:p-6"
            >
              {r.done ? (
                <CheckCircle2
                  size={23}
                  className="mt-1 shrink-0 text-emerald-700"
                  aria-hidden="true"
                />
              ) : (
                <Circle
                  size={23}
                  className="mt-1 shrink-0 text-sage-300"
                  aria-hidden="true"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">
                    {i + 1}. {r.title}
                  </h3>
                  <span
                    className={`text-xs ${r.done ? "text-emerald-700" : "text-ink-500"}`}
                  >
                    {r.done ? "دليل متوفر" : "بانتظار التحقق"}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-7 text-ink-500">
                  {r.detail}
                </p>
                <Link
                  href={r.href}
                  target="_blank"
                  rel="noopener"
                  className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-sage-700"
                >
                  افتح الخطوة في تبويب جديد
                  <ArrowUpLeft size={14} aria-hidden="true" />
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <aside className="flex items-start gap-3 rounded-2xl border border-sage-100 bg-white p-5">
        <Info
          size={20}
          className="mt-1 shrink-0 text-sage-600"
          aria-hidden="true"
        />
        <div className="space-y-2 text-sm leading-7 text-ink-600">
          <p>
            <strong>ما الذي لا يثبته هذا الفحص؟</strong> تسليم حدث إلى CRM لا
            يثبت صحة ربط حقوله أو أمان التوقيع؛ اختبرهما في النظام المستقبل. لا
            تُعدّل حالة الدفع لتجربة التكامل.
          </p>
          <p>
            الذكاء الاصطناعي مؤجل حتى تفعيل الحصة واعتماد تسعيره. اختبار
            الصلاحيات وحدود الباقات ومنع التكرار يجري في اختبارات المنصة؛ هذه
            الصفحة تتابع الدليل التشغيلي ولا تنفذ دفعات إرسال.
          </p>
        </div>
      </aside>
    </div>
  );
}
