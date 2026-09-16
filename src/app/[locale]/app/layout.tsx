import Link from 'next/link';
import { currentMerchant } from '@/lib/tenancy/context';
import { logout } from '@/app/[locale]/(auth)/login/actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Soulvd | مساحة العمل', robots: { index: false, follow: false } };

export default async function MerchantLayout({ children }: { children: React.ReactNode }) {
  await currentMerchant();
  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-linen-50 text-wood-900">
      <header className="border-b border-sage-200 bg-white px-6 py-5">
        <nav aria-label="مساحة العمل" className="mx-auto flex max-w-6xl flex-wrap items-center gap-6">
          <Link href="/app" className="text-xl font-bold">Soulvd</Link>
          <Link href="/app">نظرة عامة</Link><Link href="/app/team">الفريق</Link>
          <Link href="/app/billing">الباقة والاستهلاك</Link>
          <form action={logout} className="ms-auto"><button className="text-sm underline">تسجيل الخروج</button></form>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
