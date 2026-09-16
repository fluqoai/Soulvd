'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usageState, type Resource, type PlanCode } from '@/lib/billing/plans';
import { dismissUsageWarning } from '@/lib/billing/actions';

const labels: Record<Resource, string> = { conversations: 'المحادثات', seats: 'المقاعد والدعوات المحجوزة', templates: 'القوالب المعتمدة وقيد الموافقة', flows: 'مسارات الأتمتة', numbers: 'أرقام واتساب' };

export function UsageWidget({ dismissedResources, planCode, rows }: {
  dismissedResources: string[]; planCode: PlanCode;
  rows: { resource: Resource; used: number; limit: number | null }[];
}) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState<Record<string, boolean>>(() => Object.fromEntries(dismissedResources.map(resource => [resource, true])));
  // Cross-session actions and eventual webhook jobs also change usage.
  useEffect(() => {
    const timer = setInterval(() => { if (document.visibilityState === 'visible') router.refresh(); }, 30_000);
    return () => clearInterval(timer);
  }, [router]);
  return (
    <section aria-label="استهلاك الباقة" className="rounded-2xl border border-sage-200 bg-white p-6">
      <div className="mb-6 flex justify-between gap-4"><h2 className="text-xl font-semibold">استهلاك الباقة</h2><Link href="/app/billing" className="text-sage-700 underline">تفاصيل الاشتراك</Link></div>
      <div className="space-y-6">
        {rows.map(({ resource, used, limit }) => {
          const state = usageState(used, limit);
          return <div key={resource}>
            <div className="mb-2 flex justify-between gap-4 text-sm"><span>{labels[resource]}</span><span>{used.toLocaleString('ar-SA')} / {limit === null ? 'غير محدود' : limit.toLocaleString('ar-SA')}</span></div>
            {limit !== null && <progress aria-label={labels[resource]} value={Math.min(used, limit)} max={limit} className={`h-2 w-full ${state.level === 'blocked' ? 'accent-red-600' : state.level === 'warning' ? 'accent-amber-500' : 'accent-sage-600'}`} />}
            {state.level === 'warning' && !dismissed[resource] && <div role="status" className="mt-2 flex items-start gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><p className="flex-1">اقتربت من حد {labels[resource]}. المتبقي {state.remaining?.toLocaleString('ar-SA')}.</p><button aria-label={`إغلاق تنبيه ${labels[resource]}`} onClick={async () => {
              setDismissed(previous => ({ ...previous, [resource]: true }));
              if (!await dismissUsageWarning(resource)) setDismissed(previous => ({ ...previous, [resource]: false }));
            }}>إغلاق</button></div>}
            {state.level === 'blocked' && <p role="status" className="mt-2 text-sm text-red-700">{resource === 'conversations' ? 'وصلت إلى حد العملاء الجدد. يمكنك متابعة العملاء المحتسبين في هذه الدورة.' : 'وصلت إلى الحد المتاح لهذا المورد.'} {planCode === 'starter' ? <Link href="/app/billing/upgrade" className="underline">الترقية إلى النمو الاحترافية</Link> : <Link href="/contact" className="underline">تواصل معنا</Link>}</p>}
          </div>;
        })}
      </div>
      <p className="mt-6 text-sm text-wood-500">المحادثة هي عميل مختلف يُحسب مرة واحدة خلال دورة الاشتراك. رصيد رسائل واتساب منفصل.</p>
    </section>
  );
}
