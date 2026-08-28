// src/app/[locale]/admin/_components/Sidebar.tsx
// Server component. Renders the dark sidebar with nav groups and the user footer.
//
// IMPORTANT: This is a server component, so it cannot pass Lucide icon
// functions to client children. We pass icon NAMES (strings) instead, and
// `SidebarNavLink` (client) resolves them via `adminIcons.tsx`.

import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { LogoutButton } from './LogoutButton';
import { SidebarNavLink } from './SidebarNavLink';

type NavItem = {
  href: string;
  labelKey: string;
  iconName: string;
  ownerOnly?: boolean;
};

const ICON: Record<string, string> = {
  dashboard: 'dashboard',
  home: 'home',
  services: 'services',
  sectors: 'sectors',
  stats: 'stats',
  value_props: 'value_props',
  integrations: 'integrations',
  case_studies: 'case_studies',
  testimonials: 'testimonials',
  team: 'team',
  partners: 'partners',
  leads: 'leads',
  clients: 'clients',
  templates: 'templates',
  invoices: 'invoices',
  quotes: 'quotes',
  users: 'users',
  activity_log: 'activity_log',
  settings: 'settings',
  tasks: 'tasks',
};

export async function Sidebar({
  role,
  userEmail,
  userName,
}: {
  role: 'owner' | 'editor';
  userEmail: string;
  userName: string;
}) {
  const t = await getTranslations('admin.nav');
  const tCommon = await getTranslations('admin.common');
  const tRole = await getTranslations('admin.role');

  const contentItems: NavItem[] = [
    { href: '/admin', labelKey: 'dashboard', iconName: ICON.dashboard },
    { href: '/admin/home', labelKey: 'home', iconName: ICON.home },
    { href: '/admin/services', labelKey: 'services', iconName: ICON.services },
    { href: '/admin/sectors', labelKey: 'sectors', iconName: ICON.sectors },
    { href: '/admin/stats', labelKey: 'stats', iconName: ICON.stats },
    { href: '/admin/value-props', labelKey: 'value_props', iconName: ICON.value_props },
    { href: '/admin/integrations', labelKey: 'integrations', iconName: ICON.integrations },
    { href: '/admin/case-studies', labelKey: 'case_studies', iconName: ICON.case_studies },
    { href: '/admin/testimonials', labelKey: 'testimonials', iconName: ICON.testimonials },
    { href: '/admin/team', labelKey: 'team', iconName: ICON.team },
    { href: '/admin/partners', labelKey: 'partners', iconName: ICON.partners },
  ];

  const adminItems: NavItem[] = [
    { href: '/admin/leads', labelKey: 'leads', iconName: ICON.leads, ownerOnly: true },
    { href: '/admin/clients', labelKey: 'clients', iconName: ICON.clients, ownerOnly: true },
    { href: '/admin/tasks', labelKey: 'tasks', iconName: ICON.tasks, ownerOnly: true },
    { href: '/admin/templates', labelKey: 'templates', iconName: ICON.templates, ownerOnly: true },
    { href: '/admin/invoices', labelKey: 'invoices', iconName: ICON.invoices, ownerOnly: true },
    { href: '/admin/quotes', labelKey: 'quotes', iconName: ICON.quotes, ownerOnly: true },
  ];

  const systemItems: NavItem[] = [
    { href: '/admin/users', labelKey: 'users', iconName: ICON.users, ownerOnly: true },
    { href: '/admin/activity-log', labelKey: 'activity_log', iconName: ICON.activity_log, ownerOnly: true },
    { href: '/admin/settings', labelKey: 'settings', iconName: ICON.settings, ownerOnly: true },
  ];

  const visible = (items: NavItem[]) => items.filter((i) => role === 'owner' || !i.ownerOnly);

  return (
    <aside className="fixed inset-y-0 start-0 z-40 hidden md:flex md:w-64 flex-col bg-ink-900 text-paper shadow-[1px_0_0_rgba(0,0,0,0.04)]">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-linen-400/10 shrink-0">
        <Link href="/admin" aria-label={tCommon('view_site')}>
          <Image
            src="/brand/soulvd-logo-white.png"
            alt="Soulvd"
            width={240}
            height={64}
            style={{ width: 'auto', height: 'auto' }}
            className="h-7"
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
      <div className="border-t border-linen-400/10 p-3 space-y-2">
        <Link
          href="/admin/users"
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
        <Link
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded-md text-xs text-linen-300 hover:text-paper hover:bg-linen-400/10 transition-colors"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          <span>{tCommon('view_site')}</span>
        </Link>
        <LogoutButton />
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
            <SidebarNavLink
              href={item.href}
              label={item.labelKey}
              iconName={item.iconName}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
