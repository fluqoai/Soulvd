"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowLeft, Check, ClipboardList, Sparkles } from "lucide-react";
import { recipes, type GuideData } from "@/lib/growth/guide";
import { saveGuide, applyGuide, submitGuide } from "../growth/actions";
import { buttonClass, inputClass, cardClass } from "../studio/ui";
export default function Guide({
  initial,
  requestedGoal,
  business,
  active,
  canManage,
  savedAt,
  applied,
}: {
  initial?: GuideData;
  requestedGoal?: string;
  business: string;
  active: boolean;
  canManage: boolean;
  savedAt?: string;
  applied: boolean;
}) {
  const [data, setData] = useState<GuideData>(() => ({
    ...initial,
    goal: ((["automation", "assistant", "integration"].includes(
      requestedGoal ?? "",
    )
      ? requestedGoal
      : initial?.goal) || "automation") as GuideData["goal"],
    business: initial?.business ?? business,
    recipe: initial?.recipe ?? "welcome",
    reply: initial?.reply ?? recipes.welcome.reply,
    knowledge: initial?.knowledge ?? "",
    system: initial?.system ?? "",
    need: initial?.need ?? "",
  }));
  const [step, setStep] = useState(0),
    [message, setMessage] = useState(""),
    [pending, start] = useTransition(),
    [dirty, setDirty] = useState(false),
    [saved, setSaved] = useState(Boolean(initial)),
    [test, setTest] = useState(""),
    [simulated, setSimulated] = useState("");
  function update<K extends keyof GuideData>(key: K, value: GuideData[K]) {
    setData((d) => ({ ...d, [key]: value }));
    setDirty(true);
  }
  const integration = data.goal === "integration",
    ai = data.goal === "assistant";
  async function save() {
    const r = await saveGuide(data);
    setMessage(r.message);
    if (r.ok) {
      setDirty(false);
      setSaved(true);
    }
    return r;
  }
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="mb-2 flex items-center gap-2 text-sm text-sage-700">
          <Sparkles size={18} />
          إعداد يناسب نشاطك
        </p>
        <h1 className="text-3xl font-bold">من فكرتك إلى خطة قابلة للتشغيل</h1>
        <p className="mt-3 text-sm leading-7 text-ink-500">
          أجب بلغتك. نحفظ تجهيزك ونساعدك على تحديد الخطوة التالية دون حاجة لخبرة
          تقنية.
        </p>
      </header>
      <div className="grid grid-cols-3 gap-2">
        {["الهدف", "المعلومات", "المراجعة"].map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(i)}
            aria-current={step === i ? "step" : undefined}
            className={`rounded-xl border p-3 text-sm ${step === i ? "border-sage-900 bg-sage-900 text-white" : "bg-white"}`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>
      <fieldset
        disabled={pending || !canManage}
        className={cardClass + " min-w-0 space-y-5"}
      >
        {step === 0 && (
          <>
            <h2 className="text-xl font-bold">
              ماذا تريد أن يساعدك فيه النظام؟
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                [
                  "automation",
                  "ردود جاهزة",
                  "للترحيب والأسعار وطلبات المواعيد.",
                ],
                [
                  "assistant",
                  "مساعد ذكي",
                  "يستند إلى معلومات نشاطك مع مراجعة الموظف.",
                ],
                [
                  "integration",
                  "ربط نظامي",
                  "لتحديثات الطلبات وبيانات العملاء.",
                ],
              ].map(([value, title, description]) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded-xl border p-4 ${data.goal === value ? "border-sage-700 bg-sage-50" : ""}`}
                >
                  <input
                    type="radio"
                    name="goal"
                    value={value}
                    checked={data.goal === value}
                    onChange={() => update("goal", value as GuideData["goal"])}
                  />
                  <strong className="ms-2 text-sm">{title}</strong>
                  <p className="mt-2 text-xs leading-6 text-ink-500">
                    {description}
                  </p>
                </label>
              ))}
            </div>
            <label className="block">
              اسم النشاط
              <input
                className={inputClass}
                maxLength={120}
                value={data.business}
                onChange={(e) => update("business", e.target.value)}
              />
            </label>
            <button
              type="button"
              className={buttonClass}
              onClick={() => setStep(1)}
            >
              التالي: جهّز المعلومات <ArrowLeft size={16} className="inline" />
            </button>
          </>
        )}
        {step === 1 && (
          <>
            <h2 className="text-xl font-bold">
              {integration
                ? "صف لنا النتيجة التي تريدها"
                : ai
                  ? "عرّف مساعدك بنشاطك"
                  : "اختر نقطة البداية"}
            </h2>
            {!integration && !ai && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(recipes).map(([key, r]) => (
                    <button
                      type="button"
                      key={key}
                      onClick={() => {
                        setData((d) => ({
                          ...d,
                          recipe: key as GuideData["recipe"],
                          reply: r.reply,
                        }));
                        setDirty(true);
                        setSimulated("");
                      }}
                      className={`rounded-xl border p-4 text-start text-sm ${data.recipe === key ? "border-sage-700 bg-sage-50" : ""}`}
                    >
                      {data.recipe === key && (
                        <Check size={14} className="me-2 inline" />
                      )}
                      {r.title}
                    </button>
                  ))}
                </div>
                {data.recipe !== "human" && (
                  <label className="block">
                    الرد الذي سيراه عميلك
                    <textarea
                      rows={4}
                      className={inputClass}
                      maxLength={4096}
                      value={data.reply}
                      onChange={(e) => update("reply", e.target.value)}
                    />
                  </label>
                )}
                <div className="rounded-xl bg-sage-50 p-4">
                  <label className="text-sm">
                    جرّب رسالة عميل
                    <input
                      className={inputClass}
                      value={test}
                      maxLength={500}
                      placeholder="مثل: بكم الخدمة؟"
                      onChange={(e) => setTest(e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="mt-3 text-sm underline"
                    onClick={() => {
                      const recipe = recipes[data.recipe];
                      const matches =
                        recipe.trigger === "all" ||
                        recipe.keywords.some((k) => test.includes(k));
                      setSimulated(
                        !matches
                          ? "لن يعمل هذا الرد: الرسالة لا تطابق الكلمات المختارة."
                          : data.recipe === "human"
                            ? "سيُحوّل الطلب إلى موظف."
                            : data.reply || "أدخل نص الرد أولًا.",
                      );
                    }}
                  >
                    اختبار محلي دون إرسال
                  </button>
                  {simulated && (
                    <p
                      role="status"
                      className="mt-3 whitespace-pre-wrap rounded-xl bg-white p-3 text-sm leading-7"
                    >
                      {simulated}
                    </p>
                  )}
                </div>
              </>
            )}
            {!integration && (
              <label className="block">
                {ai ? "ماذا يجب أن يعرف عن خدماتك؟" : "معلومات نشاطك (اختياري)"}
                <textarea
                  className={inputClass}
                  rows={8}
                  maxLength={8000}
                  value={data.knowledge}
                  onChange={(e) => update("knowledge", e.target.value)}
                  placeholder={
                    "الخدمات والأسعار:\nأوقات العمل:\nسياسة الإلغاء أو الاسترجاع:\nالأسئلة المتكررة وإجاباتها:"
                  }
                />
                <span className="mt-2 block text-xs leading-6 text-ink-500">
                  الصق المعلومات العامة هنا. بيانات الطلبات الخاصة تحتاج تكاملًا
                  موثقًا مع نظامك والتحقق من هوية العميل.
                </span>
              </label>
            )}
            {integration && (
              <>
                <label className="block">
                  اسم النظام أو مصدر البيانات
                  <input
                    className={inputClass}
                    maxLength={120}
                    value={data.system}
                    onChange={(e) => update("system", e.target.value)}
                    placeholder="سلة، زد، Excel، نظام خاص، أو لا أعرف"
                  />
                </label>
                <label className="block">
                  ماذا تريد أن يحدث؟
                  <textarea
                    rows={6}
                    className={inputClass}
                    maxLength={2000}
                    value={data.need}
                    onChange={(e) => update("need", e.target.value)}
                    placeholder="عندما يسأل العميل عن طلبه، أريد عرض حالته من نظام المتجر بعد التحقق من هويته."
                  />
                </label>
                <p className="rounded-xl bg-sage-50 p-4 text-sm leading-7">
                  نبدأ بفهم نظامك وإمكانية الربط. رسوم التكامل القياسي 100 ريال
                  بعد قبول النطاق الفني، ضمن باقة النمو. لا تُدخل كلمات مرور أو
                  مفاتيح قاعدة بيانات هنا.
                </p>
              </>
            )}
            {ai && (
              <p className="rounded-xl bg-amber-50 p-4 text-sm leading-7 text-amber-900">
                هذه خطوة تجهيز المعرفة، وليست محادثة مع نموذج ذكاء اصطناعي.
                التوليد الفعلي متوقف حتى تفعيل الخدمة وحصتك المدفوعة. عند
                التشغيل نبدأ بمسودات يراجعها موظف، مع تحويل ما لا يمكن الإجابة
                عنه للفريق.
              </p>
            )}
            <button
              type="button"
              className={buttonClass}
              onClick={() => setStep(2)}
            >
              راجع التجهيز ←
            </button>
          </>
        )}
        {step === 2 && (
          <>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <ClipboardList size={22} />
              خطة {data.business || "نشاطك"}
            </h2>
            <ol className="space-y-4 text-sm leading-7">
              <li className="rounded-xl bg-sage-50 p-4">
                ١.{" "}
                {integration
                  ? `النظام: ${data.system || "نحدده معك"}`
                  : ai
                    ? "مصدر الإجابات: المعلومات التي أضفتها عن نشاطك."
                    : `الوصفة: ${recipes[data.recipe].title}`}
              </li>
              <li className="rounded-xl bg-sage-50 p-4">
                ٢.{" "}
                {integration
                  ? data.need || "أضف النتيجة المطلوبة في الخطوة السابقة."
                  : "احفظ الإعداد، ثم انقله إلى الأتمتة كمسودة عند تفعيل الاشتراك."}
              </li>
              <li className="rounded-xl bg-sage-50 p-4">
                ٣.{" "}
                {integration
                  ? "شارك التجهيز مع فريق سولفد لتحديد واجهة الربط، الصلاحيات وطريقة الاختبار."
                  : "اربط الرقم، اختبر مع فريقك، ثم فعّل البوت من مركز الأتمتة بعد مراجعة حدوده."}
              </li>
            </ol>
            <p className="text-sm text-ink-500">
              الحفظ لا يشغّل بوتًا ولا يرسل رسائل ولا يبدأ اشتراكًا.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className={buttonClass}
                onClick={() =>
                  start(async () => {
                    try {
                      await save();
                    } catch {
                      setMessage("تعذر الحفظ. حاول مجددًا.");
                    }
                  })
                }
              >
                {pending ? "جارٍ الحفظ…" : "حفظ التجهيز"}
              </button>
              {!integration && active && (
                <button
                  type="button"
                  className="rounded-xl border border-sage-400 px-4 py-3 text-sm"
                  onClick={() =>
                    start(async () => {
                      try {
                        const r = await save();
                        if (r.ok)
                          setMessage(
                            (await applyGuide()).message +
                              " راجع المسار من مركز الأتمتة قبل تفعيله.",
                          );
                      } catch {
                        setMessage("تعذر إنشاء المسودة. حاول مجددًا.");
                      }
                    })
                  }
                >
                  {applied ? "تحديث مسودة الأتمتة" : "إنشاء مسودة الأتمتة"}
                </button>
              )}
            </div>
            {integration && saved && !dirty && (
              <button
                type="button"
                className="inline-block text-sm underline"
                onClick={() =>
                  start(async () => {
                    try {
                      setMessage((await submitGuide()).message);
                    } catch {
                      setMessage("تعذر تقديم الطلب. حاول مجددًا.");
                    }
                  })
                }
              >
                طلب مراجعة التكامل من فريق سولفد ←
              </button>
            )}
            {!integration && (
              <Link
                href="/app/automations"
                className="inline-block text-sm underline"
              >
                فتح مركز الأتمتة ←
              </Link>
            )}
          </>
        )}
      </fieldset>
      {!canManage && (
        <p className="text-sm text-ink-500">
          الإعداد متاح لمالك المساحة ومديرها.
        </p>
      )}
      {message && (
        <p role="status" className={cardClass}>
          {message}
        </p>
      )}
      <p className="text-xs text-ink-500">
        {dirty
          ? "لديك تغييرات لم تحفظ بعد."
          : saved
            ? "تجهيزك محفوظ في المساحة."
            : savedAt
              ? "يوجد تجهيز سابق محفوظ."
              : "يمكنك حفظ التجهيز في خطوة المراجعة والعودة لاحقًا."}
      </p>
    </div>
  );
}
