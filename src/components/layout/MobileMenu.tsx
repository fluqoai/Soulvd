'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { LocaleToggle } from './LocaleToggle';

type Item = { href: string; label: string };

export function MobileMenu({ items }: { items: Item[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center size-9 rounded-md text-ink-700 hover:bg-sage-50"
        aria-label="Menu"
        aria-expanded={open}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {open && (
        <div
          className="fixed inset-x-0 top-16 z-30 bg-paper border-b border-ink-900/5 shadow-sm"
          onClick={() => setOpen(false)}
        >
          <nav className="container-page py-4 flex flex-col gap-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-3 text-base font-medium text-ink-800 hover:bg-sage-50 rounded-md"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-2 mt-2 border-t border-ink-900/5">
              <LocaleToggle />
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
