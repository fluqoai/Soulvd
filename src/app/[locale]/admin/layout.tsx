// src/app/[locale]/admin/layout.tsx
// Server component. Auth gate + admin shell.

import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Sidebar } from './_components/Sidebar';
import { TopBar } from './_components/TopBar';
import {
  AdminMobileNav,
  type NavItem,
} from './_components/AdminMobileNav';
import {
  LayoutDashboard,
  Home,
  Sparkles,
  Building2,
  BarChart3,
  Wand2,
  PlugZap,
  Quote,
  Star,
  Handshake,
  Inbox,
  UserSquare2,
  FileText,
  Receipt,
  ScrollText,
  Users,
  Activity,
  Settings,
} from 'lucide-react';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard as never,
  home: Home as never,
  services: Sparkles as never,
  sectors: Building2 as never,
  stats: BarChart3 as never,
  value_props: Wand2 as never,
  integrations: PlugZap as never,
  case_studies: Quote as never,
  testimonials: Star as never,
  team: Users as never,
  partners: Handshake as never,
  leads: Inbox as never,
  clients: UserSquare2 as never,
  templates: FileText as never,
  invoices: Receipt as never,
  quotes: ScrollText as never,
  users: Users as never,
  activity_log: Activity as never,
  settings: Settings as never,
};

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

  const role = profile.role as 'owner' | 'editor';
  const userEmail = profile.email ?? user.email ?? '';
  const userName = profile.full_name ?? '';

  // 3. Build the nav groups (also used by the mobile drawer)
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
      href: `/${locale}${href}`,
      label: t(labelKey as never),
      icon: ICONS[iconKey] as never,
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

  const groups = [
    { title: tGroups('content'), items: content },
    ...(role === 'owner'
      ? [
          { title: tGroups('admin'), items: adminItems },
          { title: tGroups('system'), items: systemItems },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-linen-50">
      {/* Desktop sidebar (md+) */}
      <Sidebar
        locale={locale}
        role={role}
        userEmail={userEmail}
        userName={userName}
      />
      {/* Mobile drawer (md-). The trigger is inside TopBar. */}
      <AdminMobileNav
        locale={locale}
        role={role}
        userEmail={userEmail}
        userName={userName}
        groups={groups}
      />
      <div className="md:ms-64 flex flex-col min-h-screen">
        <TopBar locale={locale} />
        <main className="flex-1 p-4 sm:p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
}
