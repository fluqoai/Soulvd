'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getAdminIcon } from './adminIcons';
import { LogoutButton } from './LogoutButton';

// Re-export the shared icon map for backwards-compat with any code
// that imported it from here before the extraction.
export { ADMIN_ICON_MAP } from './adminIcons';

export type NavItem = {
  href: string;
  label: string;
  iconName: string;
};

type Props = {
  role: 'owner' | 'editor';
  userEmail: string;
  userName: string;
  groups: { title: string; items: NavItem[] }[];
};

const QUERY = 'm';

/**
 * Mobile-only admin drawer. State is held in the URL search
 * param `?m=1` so the trigger button (rendered separately as
 * `<AdminMobileMenuFab />`) and the drawer can stay in sync
 * without a context.
 */
export function AdminMobileNav({ role, userEmail, userName, groups }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const open = searchParams.get(QUERY) === '1';

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

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        onClick={close}
        aria-label="Close admin menu"
        className="fixed inset-0 z-40 bg-ink-900/60 backdrop-blur-sm md:hidden"
      />

      <aside
        className="fixed inset-y-0 end-0 z-50 w-72 max-w-[85vw] flex flex-col bg-ink-900 text-paper md:hidden"
        role="dialog"
        aria-label="Admin navigation"
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-linen-400/10">
          <Link href="/admin" aria-label="لوحة التحكم" className="flex items-center gap-2">
            <span className="text-base font-semibold tracking-tight">Soulvd</span>
            <span className="text-[10px] uppercase tracking-widest text-sage-300">Admin</span>
          </Link>
          <button
            type="button"
            onClick={close}
            className="size-11 -ms-2 grid place-items-center rounded-md text-linen-200 hover:bg-linen-400/10"
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
                    const Icon = getAdminIcon(item.iconName);
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
            href="/admin/users"
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
            <span>عرض الموقع</span>
          </Link>
          <LogoutButton />
        </div>
      </aside>
    </>
  );
}

/**
 * Floating action button (FAB) that opens the mobile admin drawer.
 * Only visible on mobile (`md:hidden`). Lives in the bottom-start
 * corner so it doesn't conflict with anything on the right side.
 */
export function AdminMobileMenuFab() {
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
      className="md:hidden fixed bottom-5 start-5 z-30 inline-flex items-center justify-center size-12 rounded-full bg-ink-900 text-paper shadow-lg shadow-ink-900/20 hover:bg-ink-800 active:scale-95 transition-all"
      aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
      aria-expanded={open}
    >
      {open ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M18 6L6 18" />
          <path d="M6 6l12 12" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
        </svg>
      )}
    </button>
  );
}
