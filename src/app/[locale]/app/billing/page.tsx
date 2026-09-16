import Link from 'next/link';
import { tenantUsage } from '@/lib/tenancy/context';
import { PLANS } from '@/lib/billing/plans';

const statuses = { pending: 'بانتظار تفعيل الاشتراك', active: 'نشط', past_due: 'متأخر السداد', cancelled: 'ملغي' };
export default async function BillingPage() {
  const { subscription, plan } = await tenantUsage();
  return <section className="rounded-2xl border border-sage-200 bg-white p-8">
    <h1 className="text-3xl font-bold">الباقة والاشتراك</h1>
    <p className="mt-6 text-xl">{PLANS[plan.code].name} · {plan.price_halalas / 100} ريال / شهريًا</p>
    <p className="mt-3">الحالة: {statuses[subscription.status]}</p>
    <p className="mt-3">نهاية الدورة: {new Date(subscription.period_end).toLocaleDateString('ar-SA', { timeZone: 'Asia/Riyadh', calendar: 'gregory' })}</p>
    <p className="mt-6 text-wood-600">يُحسب العميل مرة واحدة خلال دورة الاشتراك مهما تعددت الرسائل. رسوم رسائل واتساب ورصيدها منفصلان عن اشتراك المنصة.</p>
    {plan.code === 'starter' && <Link href="/app/billing/upgrade" className="mt-6 inline-block rounded-xl bg-sage-700 px-6 py-3 text-white">الترقية إلى النمو الاحترافية</Link>}
    {subscription.status === 'pending' && <p className="mt-6">مساحة عملك جاهزة. <Link href="/contact" className="underline">تواصل معنا لإكمال تفعيل الاشتراك.</Link></p>}
  </section>;
}
