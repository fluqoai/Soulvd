import { tenantUsage, currentMerchant } from '@/lib/tenancy/context';
import { InviteForm } from '@/components/billing/InviteForm';

export default async function TeamPage() {
  const { context, plan } = await tenantUsage();
  const { db } = await currentMerchant();
  const { data: members, error } = await db.from('tenant_members').select('user_id, role').eq('tenant_id', context.tenantId);
  if (error) throw new Error('تعذر تحميل الفريق.');
  return <div className="space-y-6"><h1 className="text-3xl font-bold">الفريق</h1><p>عدد أعضاء الفريق: {members?.length ?? 0}. يُحسب صاحب مساحة العمل ضمن المقاعد، وتُحجز الدعوات غير المنتهية ضمن الحد.</p>
    <ul className="space-y-2">{members?.map(member => <li key={member.user_id} className="rounded-lg border bg-white p-4">{member.user_id === context.userId ? 'حسابك' : 'عضو فريق'} · {member.role === 'owner' ? 'صاحب المنشأة' : member.role === 'admin' ? 'مدير' : 'موظف'}</li>)}</ul>
    {context.role !== 'agent' && <InviteForm pro={plan.code === 'pro_growth'} />}
  </div>;
}
