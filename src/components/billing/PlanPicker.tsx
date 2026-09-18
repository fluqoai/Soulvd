"use client";
import { useState } from "react";
import Link from "next/link";
import { PLANS } from "@/lib/billing/plans";
import { BILLING_TERMS, termTotal, termLabel, sar } from "@/lib/billing/terms";

export default function PlanPicker({
  selectable = false,
  initialMonths = 3,
  initialPlan = "pro_growth_v1",
}: {
  selectable?: boolean;
  initialMonths?: number;
  initialPlan?: string;
}) {
  const [months, setMonths] = useState(
    BILLING_TERMS.find((m) => m === initialMonths) ?? 3,
  );
  const [selected, setSelected] = useState(
    initialPlan === "starter_v1" ? "starter_v1" : "pro_growth_v1",
  );
  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-3 font-semibold">اختر مدة الاشتراك</legend>
        <div className="grid grid-cols-3 gap-2">
          {BILLING_TERMS.map((m) => (
            <label
              key={m}
              className={`cursor-pointer rounded-xl border p-3 text-center focus-within:ring-2 focus-within:ring-sage-700 ${months === m ? "border-sage-700 bg-sage-50" : "border-sage-200 bg-white"}`}
            >
              <input
                className="sr-only"
                type="radio"
                name="months"
                value={m}
                checked={months === m}
                onChange={() => setMonths(m)}
              />
              <span className="block font-bold">{termLabel(m)}</span>
              <span className="text-xs text-wood-600">
                {m === 12
                  ? "أفضل قيمة · شهران مجانًا"
                  : m === 6
                    ? "استقرار أطول"
                    : "ابدأ هنا"}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="rounded-xl border border-sage-200 bg-sage-50 px-4 py-3 text-sm leading-7 text-sage-900">
        النمو تضيف 8,000 عميل شهريًا ومقاعد فريق غير محدودة مقابل 100 ريال
        إضافية بالسعر الشهري المرجعي.
      </p>
      <div className="grid gap-5 md:grid-cols-2">
        {Object.entries(PLANS).map(([code, plan]) => {
          const id = `${code}_v1`,
            total = termTotal(plan.priceSar, months);
          return (
            <article
              key={code}
              className={`relative flex flex-col rounded-2xl border bg-white p-6 ${plan.recommended ? "border-sage-700 shadow-sm" : "border-sage-200"}`}
            >
              {plan.recommended && (
                <span className="absolute -top-3 right-6 rounded-full bg-sage-900 px-3 py-1 text-xs text-white">
                  موصى بها
                </span>
              )}
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p className="mt-2 text-sm text-wood-600">
                {plan.recommended
                  ? "لفريق يريد أتمتة العمل وربط أنظمته"
                  : "لبداية منظمة وفريق صغير"}
              </p>
              <p className="mt-5">
                <strong className="text-4xl">{sar(total / months)}</strong>{" "}
                <span>ريال / شهر</span>
              </p>
              <p className="mt-2 font-semibold">
                {sar(total)} ريال تُدفع مقدمًا عن {termLabel(months)}
              </p>
              {months === 12 && (
                <p className="mt-2 text-sm text-sage-700">
                  وفّر {sar(plan.priceSar * 2)} ريال مقارنة بسعر{" "}
                  {sar(plan.priceSar)} ريال الشهري.
                </p>
              )}
              <ul className="my-6 flex-1 space-y-3 text-sm">
                <li>رقم واتساب واحد</li>
                <li>{sar(plan.conversations)} عميل مختلف كل شهر</li>
                <li>
                  {plan.seats === null
                    ? "مقاعد فريق غير محدودة"
                    : "مقعدان للفريق"}
                </li>
                <li>
                  {plan.templates === null
                    ? "قوالب غير محدودة ومكتبة من 20 نموذجًا"
                    : "حتى 10 قوالب"}
                </li>
                <li>
                  {plan.flows === null
                    ? "مسارات أتمتة غير محدودة"
                    : "مسار أتمتة واحد"}
                </li>
                <li className="font-semibold text-sage-900">{plan.recommended ? 'مساعد سولفد الذكي · 1,000 رد كل شهر' : 'مساعد سولفد الذكي · 100 رد للتجربة مرة واحدة بعد الدفع'}</li>
                <li>
                  {plan.apiEnabled
                    ? "API وWebhooks · إعداد CRM برسوم مستقلة"
                    : "بدون API أو Webhooks"}
                </li>
              </ul>
              {selectable ? (
                <label
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border p-3 focus-within:ring-2 focus-within:ring-sage-700 ${selected === id ? "bg-sage-900 text-white" : ""}`}
                >
                  <input
                    type="radio"
                    name="plan"
                    value={id}
                    checked={selected === id}
                    onChange={() => setSelected(id)}
                    required
                  />
                  {selected === id ? "الباقة المختارة" : "اختيار الباقة"}
                </label>
              ) : (
                <Link
                  href={`/signup?plan=${id}&months=${months}`}
                  className={`rounded-xl p-3 text-center font-semibold ${plan.recommended ? "bg-sage-900 text-white" : "border border-sage-300"}`}
                >
                  اختر {plan.name}
                </Link>
              )}
            </article>
          );
        })}
      </div>
      <p className="text-sm leading-7 text-wood-600">
        الحد الأدنى 3 أشهر. تتجدد حصة العملاء كل شهر، ولا يُخصم تجديد تلقائي.
        حصة الردود الذكية المشمولة في النمو تتجدد شهريًا ولا تتراكم. حصة تجربة الانطلاق صالحة 12 شهرًا بعد أول دفع.
        رصيد واتساب والردود الذكية الإضافية وإعداد التكاملات برسوم مستقلة. اعتماد القوالب يخضع لواتساب.
      </p>
    </div>
  );
}
