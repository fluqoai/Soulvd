"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PLANS,
  usageState,
  type Resource,
  type PlanCode,
} from "@/lib/billing/plans";
import { dismissUsageWarning } from "@/lib/billing/actions";

const labels: Record<Resource, string> = {
  conversations: "العملاء خلال الدورة",
  seats: "مقاعد الفريق والدعوات",
  templates: "القوالب المحجوزة",
  flows: "مسارات الأتمتة",
  numbers: "أرقام واتساب",
};
export function UsageWidget({
  dismissedResources,
  planCode,
  rows,
}: {
  dismissedResources: string[];
  planCode: PlanCode;
  rows: { resource: Resource; used: number; limit: number | null }[];
}) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(dismissedResources.map((resource) => [resource, true])),
  );
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30_000);
    return () => clearInterval(timer);
  }, [router]);
  return (
    <section
      aria-label="استهلاك الباقة"
      className="rounded-2xl border border-sage-100 bg-white p-5 sm:p-6"
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">استهلاك الباقة</h2>
        <Link
          href="/app/billing"
          className="text-xs font-medium text-sage-700 hover:underline"
        >
          تفاصيل الاشتراك ←
        </Link>
      </div>
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        {rows.map(({ resource, used, limit }) => {
          const state = usageState(used, limit);
          const numberAssigned =
            resource === "numbers" && used >= (limit ?? Infinity);
          const proLimit = PLANS.pro_growth[resource];
          const canUpgrade =
            planCode === "starter" &&
            (proLimit === null || (limit !== null && proLimit > limit));
          return (
            <div
              key={resource}
              className={resource === "conversations" ? "sm:col-span-2" : ""}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs text-ink-600">{labels[resource]}</span>
                <span className="text-xs tabular-nums">
                  <strong>{used.toLocaleString("ar-SA")}</strong>
                  <span className="text-ink-500">
                    {" "}
                    /{" "}
                    {limit === null
                      ? "غير محدود"
                      : limit.toLocaleString("ar-SA")}
                  </span>
                </span>
              </div>
              {limit !== null && (
                <progress
                  aria-label={labels[resource]}
                  value={Math.min(used, limit)}
                  max={limit}
                  className={`block h-1.5 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-sage-100 [&::-webkit-progress-value]:rounded-full ${numberAssigned || state.level === "normal" ? "accent-sage-600 [&::-webkit-progress-value]:bg-sage-600" : "accent-amber-500 [&::-webkit-progress-value]:bg-amber-500"}`}
                />
              )}
              {numberAssigned ? (
                <p className="mt-2 text-xs text-ink-500">
                  الرقم المتاح في الباقة مستخدم.
                </p>
              ) : state.level === "blocked" ? (
                <p
                  role="status"
                  className="mt-2 text-xs leading-6 text-amber-800"
                >
                  {resource === "conversations"
                    ? "وصلت لحصة العملاء الجدد؛ يمكنك متابعة العملاء المحتسبين."
                    : "اكتمل الحد المتاح."}{" "}
                  {canUpgrade ? (
                    <Link
                      href="/app/billing/upgrade"
                      className="font-medium underline"
                    >
                      زيادة الحصة
                    </Link>
                  ) : (
                    <Link href="/contact" className="underline">
                      تواصل معنا
                    </Link>
                  )}
                </p>
              ) : state.level === "warning" && !dismissed[resource] ? (
                <div
                  role="status"
                  className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900"
                >
                  <p className="flex-1">
                    المتبقي {state.remaining?.toLocaleString("ar-SA")} قبل بلوغ
                    الحد.
                  </p>
                  <button
                    aria-label={`إغلاق تنبيه ${labels[resource]}`}
                    onClick={async () => {
                      setDismissed((previous) => ({
                        ...previous,
                        [resource]: true,
                      }));
                      if (!(await dismissUsageWarning(resource)))
                        setDismissed((previous) => ({
                          ...previous,
                          [resource]: false,
                        }));
                    }}
                    className="underline"
                  >
                    إغلاق
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="mt-5 border-t border-sage-100 pt-4 text-xs leading-6 text-ink-500">
        يُحسب العميل مرة واحدة خلال دورة الاشتراك. عداد القوالب يشمل المعتمدة
        وقيد الموافقة، ورصيد واتساب منفصل.
      </p>
    </section>
  );
}
