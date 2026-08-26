// src/app/[locale]/admin/layout.tsx
// Server component. Auth gate + admin shell.
//
// The admin section is always Arabic — no language toggle, no public
// site header. We force `setRequestLocale('ar')` so any getTranslations
// call returns Arabic regardless of which locale segment the user
// landed on. Internal links use plain `/admin/...` paths so the proxy
// routes them back to the same Arabic page.

import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Sidebar } from './_components/Sidebar';
import {
  AdminMobileNav,
  AdminMobileMenuFab,
  type NavItem,
} from './_components/AdminMobileNav';

export default async function AdminLayout({
  children,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Force Arabic for the entire admin section
  setRequestLocale('ar');

  // 1. Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
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
    redirect('/login');
  }

  const role = profile.role as 'owner' | 'editor';
  const userEmail = profile.email ?? user.email ?? '';
  const userName = profile.full_name ?? '';

  // 3. Build the nav groups. Plain /admin/... paths — the proxy
  //    middleware will route them to the Arabic admin.
  const t = await getTranslations('admin.nav');
  const tGroups = await getTranslations('admin.nav.groups');

  const build = (
    href: string,
    labelKey: string,
    iconKey: string,
    ownerOnly = false
  ): NavItem | null => {
    if (ownerOnly && role !== 'owner') return null;
    return {
      href,
      label: t(labelKey as never),
      iconName: iconKey,
    };
  };

  const content = [
    build('/admin', 'dashboard', 'dashboard'),
    build('/admin/home', 'home', 'home'),
    build('/admin/services', 'services', 'services'),
    build('/admin/sectors', 'sectors', 'sectors'),
    build('/admin/stats', 'stats', 'stats'),
    build('/admin/value-props', 'value_props', 'value_props'),
    build('/admin/integrations', 'integrations', 'integrations'),
    build('/admin/case-studies', 'case_studies', 'case_studies'),
    build('/admin/testimonials', 'testimonials', 'testimonials'),
    build('/admin/team', 'team', 'team'),
    build('/admin/partners', 'partners', 'partners'),
  ].filter(Boolean) as NavItem[];

  const adminItems = [
    build('/admin/leads', 'leads', 'leads', true),
    build('/admin/clients', 'clients', 'clients', true),
    build('/admin/templates', 'templates', 'templates', true),
    build('/admin/invoices', 'invoices', 'invoices', true),
    build('/admin/quotes', 'quotes', 'quotes', true),
  ].filter(Boolean) as NavItem[];

  const systemItems = [
    build('/admin/users', 'users', 'users', true),
    build('/admin/activity-log', 'activity_log', 'activity_log', true),
    build('/admin/settings', 'settings', 'settings', true),
  ].filter(Boolean) as NavItem[];

  // Help is accessible to BOTH roles (editor and owner).
  const helpItems = [
    { href: '/admin/help', label: t('help'), iconName: 'help' },
  ];

  const groups = [
    { title: tGroups('content'), items: content },
    ...(role === 'owner'
      ? [
          { title: tGroups('admin'), items: adminItems },
          { title: tGroups('system'), items: systemItems },
        ]
      : []),
    { title: tGroups('help'), items: helpItems },
  ];

  return (
    <div className="min-h-screen bg-linen-50" dir="rtl" lang="ar">
      {/* Desktop sidebar (md+) */}
      <Sidebar role={role} userEmail={userEmail} userName={userName} />
      {/* Mobile drawer (md-). Trigger is a floating FAB below. */}
      <AdminMobileNav
        role={role}
        userEmail={userEmail}
        userName={userName}
        groups={groups}
      />
      <div className="md:ms-64 flex flex-col min-h-screen">
        <main className="flex-1 p-4 sm:p-6 md:p-10 pb-24 md:pb-10">{children}</main>
      </div>
      {/* Floating mobile menu FAB (md-). Replaces the old TopBar
          hamburger — sits in the bottom-start corner on mobile. */}
      <AdminMobileMenuFab />
    </div>
  );
}
