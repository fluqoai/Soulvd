import Link from 'next/link';
import { tenantUsage } from '@/lib/tenancy/context';
import { PLANS } from '@/lib/billing/plans';
import { UsageWidget } from '@/components/billing/UsageWidget';

export default async function MerchantOverview() {
  const { context, subscription, plan, usage, dismissedResources } = await tenantUsage();
  return <div className="space-y-8">
    <div><p className="text-sm text-sage-700">مساحة العمل</p><h1 className="mt-2 text-3xl font-bold">{context.name}</h1><p className="mt-3">{PLANS[plan.code].name} · {plan.price_halalas / 100} ريال شهريًا</p></div>
    {subscription.status !== 'active' && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4">اشتراكك غير نشط. <Link href="/app/billing" className="underline">راجع حالة الاشتراك</Link></p>}
    <UsageWidget key={`${context.tenantId}:${context.userId}:${subscription.period_start}`} dismissedResources={dismissedResources} planCode={plan.code} rows={[
      { resource: 'conversations', used: usage.conversations, limit: plan.conversations_limit },
      { resource: 'seats', used: usage.seats, limit: plan.seats_limit },
      { resource: 'templates', used: usage.templates, limit: plan.templates_limit },
      { resource: 'flows', used: usage.flows, limit: plan.flows_limit },
      { resource: 'numbers', used: usage.numbers, limit: plan.numbers_limit },
    ]} />
  </div>;
}
