"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Megaphone, Send, Users } from "lucide-react";
import { saveCampaign, controlCampaign } from "../growth/actions";
import { buttonClass, cardClass, inputClass } from "../studio/ui";
type Template = {
  id: string;
  name: string;
  body: string;
  parameter_count: number;
};
type Campaign = {
  id: string;
  name: string;
  segment: string;
  template_id: string | null;
  parameters: string[];
  state: string;
  error_code: string | null;
  total: number;
  pending: number;
  queued: number;
  delivered: number;
  read: number;
  failed: number;
  uncertain: number;
  skipped: number;
};
const states: Record<string, string> = {
  draft: "مسودة",
  running: "قيد المعالجة",
  paused: "متوقفة مؤقتًا",
  completed: "اكتملت معالجة الجمهور",
  cancelled: "ملغاة",
};
const reasons: Record<string, string> = {
  WALLET_INSUFFICIENT: "رصيد واتساب غير كافٍ",
  WALLET_RATE_UNAVAILABLE: "تعرفة الوجهة غير متاحة",
  SUBSCRIPTION_INACTIVE: "الاشتراك غير نشط",
  NOT_CONNECTED: "رقم واتساب غير متصل",
  LIMIT_EXCEEDED: "بلغت حصة الباقة",
  TEMPLATE_NOT_APPROVED: "القالب غير معتمد",
  FORBIDDEN: "لم يعد منشئ الحملة مديرًا للمساحة",
  CONSENT_REQUIRED: "الموافقة غير متاحة",
  MARKETING_OPTED_OUT: "العميل مستبعد",
};
export default function Campaigns({
  templates,
  campaigns,
  segments,
  active,
  connected,
  canManage,
}: {
  templates: Template[];
  campaigns: Campaign[];
  segments: { segment: string; total: number; eligible: number }[];
  active: boolean;
  connected: boolean;
  canManage: boolean;
}) {
  const [id, setId] = useState<string | null>(null),
    [name, setName] = useState(""),
    [segment, setSegment] = useState(""),
    [templateId, setTemplateId] = useState(""),
    [parameters, setParameters] = useState<string[]>([]),
    [review, setReview] = useState<Campaign | null>(null),
    [ack, setAck] = useState(false),
    [message, setMessage] = useState(""),
    [pending, start] = useTransition();
  const router = useRouter();
  const template = templates.find((t) => t.id === templateId);
  const running = campaigns.some((c) => c.state === "running");
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, 15000);
    return () => clearInterval(t);
  }, [running, router]);
  const eligible = (seg: string) =>
    segments
      .filter((s) => !seg || s.segment === seg)
      .reduce((n, s) => n + Number(s.eligible), 0);
  function act(
    fn: () => Promise<{ ok: boolean; message: string; id?: string }>,
  ) {
    start(async () => {
      try {
        const r = await fn();
        setMessage(r.message);
        if (r.ok) {
          if (r.id) setId(r.id);
          setReview(null);
          router.refresh();
        }
      } catch {
        setMessage(
          "انقطع الاتصال. حدّث الصفحة لتتحقق من الحالة قبل تكرار الطلب.",
        );
      }
    });
  }
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm text-sage-700">
            <Megaphone size={18} />
            من قائمة العملاء إلى نتائج واضحة
          </p>
          <h1 className="mt-2 text-3xl font-bold">الحملات</h1>
          <p className="mt-3 text-sm leading-7 text-ink-500">
            جهّز الجمهور والقالب، راجع المتغيرات، ثم ابدأ الإرسال عند اكتمال
            المتطلبات.
          </p>
        </div>
        <Link
          href="/app/contacts"
          className="rounded-xl border bg-white px-4 py-3 text-sm"
        >
          إدارة واستيراد العملاء ←
        </Link>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          [active, active ? "الاشتراك نشط" : "فعّل الاشتراك", "/app/billing"],
          [
            connected,
            connected ? "رقم واتساب متصل" : "اربط رقم واتساب",
            "/app/connect",
          ],
          [
            templates.length > 0,
            templates.length ? "قالب معتمد جاهز" : "جهّز قالبًا معتمدًا",
            "/app/templates",
          ],
        ].map(([ok, label, href]) => (
          <Link
            key={String(label)}
            href={String(href)}
            className={`flex items-center gap-2 rounded-xl border p-4 text-sm ${ok ? "border-sage-200 bg-sage-50" : "bg-white text-ink-500"}`}
          >
            {ok ? <CheckCircle2 size={18} /> : <Circle size={18} />}
            {String(label)}
          </Link>
        ))}
      </div>
      {canManage && (
        <form
          className="grid gap-5 lg:grid-cols-[1.2fr_1fr]"
          onSubmit={(e) => {
            e.preventDefault();
            act(() =>
              saveCampaign({
                id,
                name,
                segment,
                templateId: templateId || null,
                parameters,
              }),
            );
          }}
        >
          <fieldset
            disabled={pending}
            className={cardClass + " min-w-0 space-y-4"}
          >
            <h2 className="text-lg font-bold">
              {id ? "تعديل المسودة" : "حملة جديدة"}
            </h2>
            <label className="block">
              اسم الحملة
              <input
                required
                className={inputClass}
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثل: عرض نهاية الأسبوع"
              />
            </label>
            <label className="block">
              الجمهور
              <select
                className={inputClass}
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
              >
                <option value="">كل الجهات المؤهلة</option>
                {segments
                  .filter((s) => s.segment)
                  .map((s) => (
                    <option key={s.segment} value={s.segment}>
                      {s.segment} · {s.eligible} مؤهل
                    </option>
                  ))}
              </select>
            </label>
            <p className="flex gap-2 text-xs text-ink-500">
              <Users size={16} />
              {eligible(segment)} جهة مؤهلة حاليًا. نستبعد من لم يوافق أو طلب
              إيقاف التواصل.
            </p>
            <label className="block">
              قالب الرسالة
              <select
                className={inputClass}
                value={templateId}
                onChange={(e) => {
                  setTemplateId(e.target.value);
                  setParameters(
                    Array(
                      templates.find((t) => t.id === e.target.value)
                        ?.parameter_count ?? 0,
                    ).fill(""),
                  );
                }}
              >
                <option value="">أختار القالب لاحقًا</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            {template &&
              Array.from({ length: template.parameter_count }, (_, i) => (
                <label key={i} className="block text-sm">
                  قيمة المتغير {i + 1} (واحدة لكل الجمهور)
                  <input
                    className={inputClass}
                    maxLength={1000}
                    value={parameters[i] ?? ""}
                    onChange={(e) =>
                      setParameters((p) =>
                        Array.from(
                          { length: template.parameter_count },
                          (_, j) => (j === i ? e.target.value : (p[j] ?? "")),
                        ),
                      )
                    }
                  />
                </label>
              ))}
            <div className="flex flex-wrap gap-3">
              <button className={buttonClass}>حفظ المسودة</button>
              {id && (
                <button
                  type="button"
                  className="text-sm underline"
                  onClick={() => {
                    setId(null);
                    setName("");
                    setParameters([]);
                    setTemplateId("");
                  }}
                >
                  إنشاء حملة أخرى
                </button>
              )}
            </div>
            <p className="text-xs leading-6 text-ink-500">
              يمكن الحفظ قبل الربط والدفع. الرسائل لا تبدأ إلا بعد مراجعة الحملة
              وتأكيد الإرسال.
            </p>
          </fieldset>
          <section className="rounded-3xl bg-[#e9eee5] p-5 sm:p-7">
            <h2 className="mb-5 text-sm font-semibold text-sage-900">
              معاينة الرسالة
            </h2>
            <div className="rounded-2xl rounded-tr-sm bg-white p-5 shadow-sm">
              <p className="whitespace-pre-wrap break-words text-sm leading-8">
                {template
                  ? template.body.replace(
                      /\{\{(\d+)\}\}/g,
                      (_, n) => parameters[Number(n) - 1] || `[متغير ${n}]`,
                    )
                  : "اختر قالبًا معتمدًا لعرض الرسالة التي ستصل إلى عملائك."}
              </p>
              <p className="mt-4 text-end text-[10px] text-ink-400">
                معاينة · لم تُرسل
              </p>
            </div>
            <Link
              href="/app/templates"
              className="mt-6 inline-block text-sm underline"
            >
              احتاج قالبًا جديدًا ←
            </Link>
            <p className="mt-4 text-xs leading-7 text-ink-500">
              رسوم الرسائل مستقلة عن الاشتراك وتُخصم من رصيد واتساب وفق الوجهة
              والتصنيف. راجع الرصيد والتعرفة قبل الإطلاق.
            </p>
            <Link href="/app/wallet" className="text-sm underline">
              مراجعة رصيد واتساب ←
            </Link>
          </section>
        </form>
      )}
      {message && (
        <p role="status" className={cardClass}>
          {message}
        </p>
      )}
      {review && (
        <section
          role="region"
          aria-label="مراجعة إرسال الحملة"
          className="space-y-4 rounded-2xl border-2 border-sage-700 bg-white p-6"
        >
          <h2 className="text-xl font-bold">مراجعة: {review.name}</h2>
          <p className="text-sm leading-7">
            {review.state === "paused"
              ? `${review.pending} جهة متبقية`
              : `${eligible(review.segment)} جهة مؤهلة حاليًا`}{" "}
            · {review.segment || "كل الشرائح"}. سنثبت الجمهور عند البداية، ثم
            نراجع الاستبعاد والرصيد لكل رسالة.
          </p>
          <p className="whitespace-pre-wrap rounded-xl bg-sage-50 p-4 text-sm leading-7">
            {templates
              .find((t) => t.id === review.template_id)
              ?.body.replace(
                /\{\{(\d+)\}\}/g,
                (_, n) => review.parameters[Number(n) - 1] || `[متغير ${n}]`,
              )}
          </p>
          <label className="flex items-start gap-2 text-sm leading-7">
            <input
              type="checkbox"
              className="mt-2"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
            />
            راجعت الجمهور والقالب والمتغيرات، وأوافق على بدء الإرسال وخصم رسوم
            الرسائل من الرصيد.
          </label>
          <div className="flex gap-3">
            <button
              disabled={pending || !ack || !active || !connected}
              className={buttonClass}
              onClick={() => act(() => controlCampaign(review.id, "start"))}
            >
              <Send size={16} className="me-2 inline" />
              تأكيد وبدء الإرسال
            </button>
            <button
              type="button"
              className="text-sm underline"
              onClick={() => setReview(null)}
            >
              العودة
            </button>
          </div>
        </section>
      )}
      <section className="space-y-4">
        <div className="flex justify-between">
          <h2 className="text-xl font-bold">حملاتك</h2>
          <button
            type="button"
            className="text-sm underline"
            onClick={() => router.refresh()}
          >
            تحديث النتائج
          </button>
        </div>
        {!campaigns.length && (
          <p className={cardClass + " py-10 text-center text-sm text-ink-500"}>
            ابدأ بمسودة حملة. لن تحتاج إلى ربط رقم لحفظ فكرتك.
          </p>
        )}
        {campaigns.map((c) => (
          <article key={c.id} className={cardClass + " space-y-4"}>
            <div className="flex flex-wrap justify-between gap-2">
              <h3 className="font-bold">{c.name}</h3>
              <span className="rounded-full bg-sage-50 px-3 py-1 text-xs">
                {states[c.state]}
              </span>
            </div>
            {c.error_code && (
              <p className="text-sm text-amber-800">
                توقفت المعالجة:{" "}
                {reasons[c.error_code] ??
                  "تحتاج الحملة مراجعة الإعدادات والرصيد"}
                .
              </p>
            )}
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {[
                ["الجمهور", c.total],
                ["بانتظار المعالجة", c.pending],
                ["دخلت قائمة الإرسال", c.queued],
                ["تم التسليم", c.delivered],
                ["تمت القراءة", c.read],
                ["فشلت", c.failed],
                ["نتيجة غير مؤكدة", c.uncertain],
                ["مستبعدة", c.skipped],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <dt className="text-xs text-ink-500">{label}</dt>
                  <dd className="mt-1 font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs leading-6 text-ink-500">
              اكتمال المعالجة يعني انتهاء تجهيز الجمهور؛ حالات التسليم والقراءة
              تأتي من واتساب لاحقًا. الإيقاف لا يسحب الرسائل التي دخلت قائمة
              الإرسال.
            </p>
            {canManage && (
              <div className="flex flex-wrap gap-4 text-sm">
                {c.state === "draft" && (
                  <button
                    disabled={pending}
                    className="underline"
                    onClick={() => {
                      setId(c.id);
                      setName(c.name);
                      setSegment(c.segment);
                      setTemplateId(c.template_id ?? "");
                      setParameters(c.parameters);
                      setMessage("تم تحميل المسودة في نموذج الحملة أعلاه.");
                    }}
                  >
                    تعديل
                  </button>
                )}
                {["draft", "paused"].includes(c.state) && (
                  <button
                    className="font-semibold text-sage-800 underline"
                    disabled={pending || !active || !connected}
                    onClick={() => {
                      setReview(c);
                      setAck(false);
                    }}
                  >
                    {c.state === "paused" ? "مراجعة واستئناف" : "مراجعة وإرسال"}
                  </button>
                )}
                {c.state === "running" && (
                  <button
                    disabled={pending}
                    className="underline"
                    onClick={() => act(() => controlCampaign(c.id, "pause"))}
                  >
                    إيقاف مؤقت
                  </button>
                )}
                {["draft", "paused"].includes(c.state) && (
                  <button
                    disabled={pending}
                    className="underline"
                    onClick={() => act(() => controlCampaign(c.id, "cancel"))}
                  >
                    إلغاء الحملة
                  </button>
                )}
              </div>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
