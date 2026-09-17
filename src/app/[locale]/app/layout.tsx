import Link from 'next/link';
import { currentMerchant, tenantContext } from '@/lib/tenancy/context';
import { logout } from '@/app/[locale]/(auth)/login/actions';
import { selectWorkspace } from '@/lib/tenancy/actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Soulvd | مساحة العمل', robots: { index: false, follow: false } };

export default async function MerchantLayout({ children }: { children: React.ReactNode }) {
  const { db, user } = await currentMerchant();
  const context = await tenantContext();
  const { data: memberships } = await db.from('tenant_members').select('tenant_id').eq('user_id', user.id);
  const { data: profile } = await db.from('users').select('role').eq('id', user.id).maybeSingle();
  const { data: workspaces } = memberships?.length ? await db.from('tenants').select('*').in('id', memberships.map(member => member.tenant_id)) : { data: [] };
  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-linen-50 text-wood-900">
      <header className="border-b border-sage-200 bg-white px-6 py-5">
        <nav aria-label="مساحة العمل" className="mx-auto flex max-w-6xl flex-wrap items-center gap-6">
          <Link href="/app" className="text-xl font-bold">Soulvd</Link>
          <Link href="/app">نظرة عامة</Link><Link href="/app/team">الفريق</Link>
          <Link href="/app/whatsapp">واتساب</Link>
          <Link href="/app/automations">الأتمتة والبوتات</Link>
          <Link href="/app/templates">مكتبة القوالب</Link>
          <Link href="/app/integrations">التكاملات</Link>
          <Link href="/app/billing">الباقة والاستهلاك</Link>
          {profile && ['owner', 'editor'].includes(profile.role) && <Link href="/admin">لوحة الإدارة</Link>}
          {(workspaces?.length ?? 0) > 1 && <form action={selectWorkspace} className="flex items-center gap-2"><select name="tenant" aria-label="مساحة العمل" defaultValue={context?.tenantId} className="rounded border border-sage-200 p-2">{workspaces?.map(workspace => <option key={workspace.id} value={workspace.id}>{workspace.name}{workspace.is_test ? ' (اختبار)' : ''}</option>)}</select><button className="text-sm underline">فتح</button></form>}
          <form action={logout} className="ms-auto"><button className="text-sm underline">تسجيل الخروج</button></form>
        </nav>
        <div className="mx-auto mt-3 flex max-w-6xl flex-wrap gap-x-6 gap-y-2 text-sm text-wood-700">
          <p>الحساب الحالي: <bdi>{user.email}</bdi></p>
          <p>مساحة العمل الحالية: {context?.name ?? 'لم يتم اختيار مساحة'}</p>
        </div>
      </header>
      {context?.isTest && <p role="status" className="bg-amber-50 px-6 py-3 text-center">مساحة اختبار — ليست اشتراكًا مدفوعًا. قد تترتب رسوم واتساب عند استخدام رقم حقيقي.</p>}
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
