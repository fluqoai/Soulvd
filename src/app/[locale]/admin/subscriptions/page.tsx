import { redirect } from 'next/navigation';
import { currentMerchant } from '@/lib/tenancy/context';
import { createAdminClient } from '@/lib/supabase/admin';
import TransferForm from './TransferForm';
import IntegrationPaymentForm from './IntegrationPaymentForm';

export default async function SubscriptionAdmin() {
  const { db, user } = await currentMerchant();
  const { data: profile } = await db.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'owner') redirect('/admin');
  const admin = createAdminClient();
  const [tenants, subscriptions] = await Promise.all([admin.from('tenants').select('id,name').eq('is_test', false).order('created_at', { ascending: false }), admin.from('subscriptions').select('tenant_id,plan_id,status,period_end')]);
  if (tenants.error || subscriptions.error) throw new Error('تعذر تحميل الاشتراكات.');
  const integrations = tenants.data.length ? await admin.from('crm_integrations').select('id,tenant_id,name,endpoint_url,status').in('tenant_id',tenants.data.map(t=>t.id)).order('created_at',{ascending:false}) : {data:[],error:null};
  if (integrations.error) throw new Error('تعذر تحميل طلبات التكامل.');
  return <div className="mx-auto max-w-4xl space-y-6">
    <h1 className="text-3xl font-bold">الاشتراكات والتحويل البنكي</h1>
    <p>يسجل العميل حسابًا ومساحة عمل من الموقع، وتبقى الخدمة بانتظار تأكيد التحويل. لا تظهر مساحات الاختبار هنا.</p>
    <div className="space-y-3">{tenants.data.map(t => { const s = subscriptions.data.find(row => row.tenant_id === t.id); return <article key={t.id} className="rounded border bg-white p-4"><h2 className="font-bold">{t.name}</h2><p>{s?.plan_id === 'pro_growth_v1' ? 'النمو · 399 ريال' : 'الانطلاق · 299 ريال'} · {s?.status === 'active' ? 'نشط' : 'بانتظار التأكيد أو التجديد'}</p></article>; })}{!tenants.data.length && <p>لا توجد مساحات عملاء فعلية بعد. اطلب من أول عميل التسجيل واختيار باقته.</p>}</div>
    <TransferForm tenants={tenants.data} />
    <IntegrationPaymentForm items={(integrations.data??[]).map(i=>({...i,tenantName:tenants.data.find(t=>t.id===i.tenant_id)?.name??''}))}/>
  </div>;
}
