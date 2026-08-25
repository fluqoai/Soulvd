'use client';

// Client component for nav links (to detect active route).
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  href: string;
  label: string; // already-translated label
  icon: LucideIcon;
};

export function SidebarNavLink({ href, label, icon: Icon }: Props) {
  const pathname = usePathname();
  const tNav = useTranslations('admin.nav');
  // We receive the key (not the label) — translate here.
  // Resolve by stripping the locale prefix from href and looking up the key
  const key = href.split('/').pop() === 'admin' ? 'dashboard' : (href.split('/').pop() ?? 'dashboard');
  const translated = tNav.has(key) ? tNav(key as never) : label;
  const isActive = pathname === href || (href.endsWith('/admin') && pathname === href.replace(/\/$/, ''));

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
