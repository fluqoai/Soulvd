import Link from 'next/link';
import { tenantUsage } from '@/lib/tenancy/context';
import { PLANS } from '@/lib/billing/plans';

export default async function UpgradePage() {
  const { context, subscription, plan } = await tenantUsage();
  const canUpgrade = context.role === 'owner' && plan.code === 'starter' && subscription.status === 'active';
  return <section className="rounded-2xl border border-sage-200 bg-white p-8">
    <span className="rounded-full bg-sage-100 px-3 py-1 text-sm text-sage-800">موصى بها</span>
    <h1 className="mt-5 text-3xl font-bold">{PLANS.pro_growth.name}</h1>
    <p className="mt-5 text-2xl">399 ريال شهريًا</p>
    <ul className="mt-6 list-inside list-disc space-y-3"><li>10,000 عميل مختلف لكل دورة اشتراك</li><li>فريق وقوالب ومسارات أتمتة غير محدودة</li><li>مكتبة 20 قالبًا قابلًا للنسخ والتخصيص، مع إنشاء قوالبك الخاصة</li><li>صلاحية API وWebhooks؛ تفعيل تكامل CRM اختياري بـ100 ريال مرة واحدة لكل وجهة بعد مراجعة الطلب</li></ul>
    <p className="mt-6">الترقية ترفع الحصة وتحتفظ باستهلاكك الحالي وموعد التجديد. تُفتح المزايا بعد تأكيد الدفع.</p>
    <p className="mt-4">الترقية للدورة الحالية بتحويل فرق الباقتين: 100 ريال. التجديد التالي 399 ريال شهريًا. تواصل معنا للحصول على بيانات التحويل؛ لا تُفعّل الترقية قبل تأكيد وصول المبلغ.</p>
    {canUpgrade ? <Link href="/contact" className="mt-6 inline-block rounded-xl bg-sage-700 px-6 py-3 text-white">تواصل لإكمال الترقية</Link> : <p role="status" className="mt-6">الترقية متاحة لصاحب مساحة العمل باشتراك انطلاق نشط.</p>}
  </section>;
}
