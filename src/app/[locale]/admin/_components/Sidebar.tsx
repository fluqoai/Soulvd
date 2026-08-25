// src/app/[locale]/admin/_components/Sidebar.tsx
// Server component. Renders the dark sidebar with nav groups and the user footer.

import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
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
  Users,
  Inbox,
  UserSquare2,
  FileText,
  Receipt,
  ScrollText,
  Activity,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { LogoutButton } from './LogoutButton';
import { SidebarNavLink } from './SidebarNavLink';

type NavItem = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  ownerOnly?: boolean;
};

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  home: Home,
  services: Sparkles,
  sectors: Building2,
  stats: BarChart3,
  value_props: Wand2,
  integrations: PlugZap,
  case_studies: Quote,
  testimonials: Star,
  team: Users,
  leads: Inbox,
  clients: UserSquare2,
  templates: FileText,
  invoices: Receipt,
  quotes: ScrollText,
  users: Users,
  activity_log: Activity,
  settings: Settings,
};

export async function Sidebar({
  locale,
  role,
  userEmail,
  userName,
}: {
  locale: string;
  role: 'owner' | 'editor';
  userEmail: string;
  userName: string;
}) {
  const t = await getTranslations('admin.nav');
  const tCommon = await getTranslations('admin.common');
  const tRole = await getTranslations('admin.role');

  const contentItems: NavItem[] = [
    { href: `/${locale}/admin`, labelKey: 'dashboard', icon: ICONS.dashboard },
    { href: `/${locale}/admin/home`, labelKey: 'home', icon: ICONS.home },
    { href: `/${locale}/admin/services`, labelKey: 'services', icon: ICONS.services },
    { href: `/${locale}/admin/sectors`, labelKey: 'sectors', icon: ICONS.sectors },
    { href: `/${locale}/admin/stats`, labelKey: 'stats', icon: ICONS.stats },
    { href: `/${locale}/admin/value-props`, labelKey: 'value_props', icon: ICONS.value_props },
    { href: `/${locale}/admin/integrations`, labelKey: 'integrations', icon: ICONS.integrations },
    { href: `/${locale}/admin/case-studies`, labelKey: 'case_studies', icon: ICONS.case_studies },
    { href: `/${locale}/admin/testimonials`, labelKey: 'testimonials', icon: ICONS.testimonials },
    { href: `/${locale}/admin/team`, labelKey: 'team', icon: ICONS.team },
  ];

  const adminItems: NavItem[] = [
    { href: `/${locale}/admin/leads`, labelKey: 'leads', icon: ICONS.leads, ownerOnly: true },
    { href: `/${locale}/admin/clients`, labelKey: 'clients', icon: ICONS.clients, ownerOnly: true },
    { href: `/${locale}/admin/templates`, labelKey: 'templates', icon: ICONS.templates, ownerOnly: true },
    { href: `/${locale}/admin/invoices`, labelKey: 'invoices', icon: ICONS.invoices, ownerOnly: true },
    { href: `/${locale}/admin/quotes`, labelKey: 'quotes', icon: ICONS.quotes, ownerOnly: true },
  ];

  const systemItems: NavItem[] = [
    { href: `/${locale}/admin/users`, labelKey: 'users', icon: ICONS.users, ownerOnly: true },
    { href: `/${locale}/admin/activity-log`, labelKey: 'activity_log', icon: ICONS.activity_log, ownerOnly: true },
    { href: `/${locale}/admin/settings`, labelKey: 'settings', icon: ICONS.settings, ownerOnly: true },
  ];

  const visible = (items: NavItem[]) => items.filter((i) => role === 'owner' || !i.ownerOnly);

  return (
    <aside className="fixed inset-y-0 start-0 z-40 hidden md:flex md:w-64 flex-col bg-ink-900 text-paper">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-linen-400/10">
        <Link href={`/${locale}`} aria-label={tCommon('view_site')}>
          <Image
            src="/brand/soulvd-logo-white.png"
            alt="Soulvd"
            width={140}
            height={32}
            className="h-7 w-auto"
          />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <NavGroup title={t('groups.content')} items={visible(contentItems)} />
        {role === 'owner' && <NavGroup title={t('groups.admin')} items={visible(adminItems)} />}
        {role === 'owner' && <NavGroup title={t('groups.system')} items={visible(systemItems)} />}
      </nav>

      {/* User footer */}
      <div className="border-t border-linen-400/10 p-3">
        <Link
          href={`/${locale}/admin/users`}
          className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-linen-400/5"
        >
          <div className="size-8 rounded-full bg-sage-600 grid place-items-center text-sm font-semibold text-paper">
            {(userName || userEmail).slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-paper truncate">{userName || userEmail}</p>
            <p className="text-xs text-linen-400">{tRole(role)}</p>
          </div>
        </Link>
        <LogoutButton locale={locale} />
      </div>
    </aside>
  );
}

function NavGroup({ title, items }: { title: string; items: NavItem[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-linen-400/70">
        {title}
      </p>
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.href}>
            <SidebarNavLink href={item.href} label={getLabel(item.labelKey)} icon={item.icon} />
          </li>
        ))}
      </ul>
    </div>
  );
}

// Helper to translate the label — called inside NavGroup which is a client subtree
function getLabel(key: string) {
  return key; // resolved by the client via t(labelKey) — see SidebarNavLink
}
