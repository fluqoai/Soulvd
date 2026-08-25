// src/app/[locale]/admin/layout.tsx
// Server component. Auth gate + admin shell.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Sidebar } from './_components/Sidebar';
import { TopBar } from './_components/TopBar';

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // 1. Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  // 2. Role check
  const admin = createAdminClient();
  const { data: profileData } = await admin
    .from('users')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single();

  const profile = profileData as { role: 'owner' | 'editor'; full_name: string | null; email: string | null } | null;

  if (!profile || !['owner', 'editor'].includes(profile.role)) {
    redirect(`/${locale}/login`);
  }

  return (
    <div className="min-h-screen bg-linen-50">
      <Sidebar
        locale={locale}
        role={profile.role as 'owner' | 'editor'}
        userEmail={profile.email ?? user.email ?? ''}
        userName={profile.full_name ?? ''}
      />
      <div className="md:ms-64 flex flex-col min-h-screen">
        <TopBar locale={locale} />
        <main className="flex-1 p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
}
