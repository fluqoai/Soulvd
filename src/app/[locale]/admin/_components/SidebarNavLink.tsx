'use client';

// Client component for nav links (to detect active route).
//
// Receives `iconName` (a string) instead of a Lucide component, because
// server components cannot serialize functions across the boundary.
// The icon is resolved locally via the shared map.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { getAdminIcon } from './adminIcons';

type Props = {
  href: string;
  label: string; // already-translated label
  iconName: string;
};

export function SidebarNavLink({ href, label, iconName }: Props) {
  const pathname = usePathname();
  const tNav = useTranslations('admin.nav');

  // We receive the key (not the label) — translate here.
  // Resolve by stripping the locale prefix from href and looking up the key
  const key =
    href.split('/').pop() === 'admin'
      ? 'dashboard'
      : href.split('/').pop() ?? 'dashboard';
  const translated = tNav.has(key as never) ? tNav(key as never) : label;

  const isActive =
    pathname === href || (href.endsWith('/admin') && pathname === href.replace(/\/$/, ''));

  const Icon = getAdminIcon(iconName);

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
        isActive
          ? 'bg-sage-600 text-paper'
          : 'text-linen-200 hover:text-paper hover:bg-linen-400/10'
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="truncate">{translated}</span>
    </Link>
  );
}
