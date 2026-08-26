'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  X,
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
  Handshake,
  Inbox,
  UserSquare2,
  FileText,
  Receipt,
  ScrollText,
  Activity,
  Settings,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LogoutButton } from './LogoutButton';

/**
 * Server → client components cannot serialize functions. So the
 * layout passes icon NAMES (strings) and we resolve them here.
 */
export const ADMIN_ICON_MAP: Record<string, LucideIcon> = {
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
  partners: Handshake,
  leads: Inbox,
  clients: UserSquare2,
  templates: FileText,
  invoices: Receipt,
  quotes: ScrollText,
  users: Users,
  activity_log: Activity,
  settings: Settings,
};

export type NavItem = {
  href: string;
  label: string;
  iconName: string;
};

type Props = {
  locale: string;
  role: 'owner' | 'editor';
  userEmail: string;
  userName: string;
  groups: { title: string; items: NavItem[] }[];
};

const QUERY = 'm';

/**
 * Mobile-only admin drawer. State is held in the URL search
 * param `?m=1` so the trigger button (in the TopBar) and the
 * drawer (in the layout) can stay in sync without a context.
 *
 * On desktop the regular `Sidebar` is visible; this drawer is
 * `md:hidden`.
 */
export function AdminMobileNav({ locale, role, userEmail, userName, groups }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const open = searchParams.get(QUERY) === '1';
  const [, force] = useState(0);

  const close = useCallback(() => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete(QUERY);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  // Close on navigation
  useEffect(() => {
    if (open) close();
    // We only want to react to pathname changes, not open/close
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Keep state in sync after popstate (back/forward)
  useEffect(() => {
    const onPop = () => force((n) => n + 1);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        onClick={close}
        aria-label="Close admin menu"
        className="fixed inset-0 z-40 bg-ink-900/60 backdrop-blur-sm md:hidden"
      />

      {/* Drawer */}
      <aside
        className="fixed inset-y-0 start-0 z-50 w-72 max-w-[85vw] flex flex-col bg-ink-900 text-paper md:hidden"
        role="dialog"
        aria-label="Admin navigation"
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-linen-400/10">
          <Link href={`/${locale}`} aria-label="View site">
            <span className="text-base font-semibold tracking-tight">Soulvd</span>
            <span className="ms-2 text-[10px] uppercase tracking-widest text-sage-300">Admin</span>
          </Link>
          <button
            type="button"
            onClick={close}
            className="size-11 -me-2 grid place-items-center rounded-md text-linen-200 hover:bg-linen-400/10"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {groups.map((group) => {
            if (group.items.length === 0) return null;
            return (
              <div key={group.title}>
                <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-linen-400/70">
                  {group.title}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = ADMIN_ICON_MAP[item.iconName] ?? HelpCircle;
                    const isActive = pathname === item.href;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-sage-600 text-paper'
                              : 'text-linen-200 hover:text-paper hover:bg-linen-400/10'
                          )}
                        >
                          <Icon className="size-4 shrink-0" aria-hidden />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-linen-400/10 p-3 space-y-2">
          <Link
            href={`/${locale}/admin/users`}
            className="flex items-center gap-3 px-2 py-2.5 rounded-md hover:bg-linen-400/5"
          >
            <div className="size-8 rounded-full bg-sage-600 grid place-items-center text-sm font-semibold text-paper">
              {(userName || userEmail).slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-paper truncate">
                {userName || userEmail}
              </p>
              <p className="text-xs text-linen-400 capitalize">{role}</p>
            </div>
          </Link>
          <LogoutButton locale={locale} />
        </div>
      </aside>
    </>
  );
}

/**
 * The trigger button. Lives in the TopBar. Toggles the `?m=1`
 * search param to open or close the drawer.
 */
export function AdminMobileNavTrigger() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const open = searchParams.get(QUERY) === '1';

  const toggle = () => {
    const sp = new URLSearchParams(searchParams.toString());
    if (open) {
      sp.delete(QUERY);
    } else {
      sp.set(QUERY, '1');
    }
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="md:hidden inline-flex items-center justify-center size-11 -ms-2 rounded-md text-ink-700 hover:bg-sage-50 active:bg-sage-100 transition-colors"
      aria-label={open ? 'Close admin menu' : 'Open admin menu'}
      aria-expanded={open}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {open ? (
          <>
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </>
        ) : (
          <>
            <path d="M4 6h16" />
            <path d="M4 12h16" />
            <path d="M4 18h16" />
          </>
        )}
      </svg>
    </button>
  );
}
