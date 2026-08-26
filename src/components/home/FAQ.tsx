'use client';

import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

type Item = { q: string; a: string };

type Props = {
  items: Item[];
  /** Optional first item to be expanded by default. */
  defaultOpen?: number;
};

export function FAQ({ items, defaultOpen = 0 }: Props) {
  const [open, setOpen] = useState<number | null>(defaultOpen);

  return (
    <ul className="divide-y divide-ink-900/10 border-y border-ink-900/10">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <li key={i}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              aria-controls={`faq-panel-${i}`}
              id={`faq-trigger-${i}`}
              className={cn(
                'w-full flex items-start justify-between gap-4 md:gap-6',
                'py-5 md:py-6 text-start cursor-pointer',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-600 rounded-sm'
              )}
            >
              <span
                className={cn(
                  'text-base md:text-lg font-semibold leading-snug',
                  'text-ink-900',
                  isOpen && 'text-sage-800'
                )}
              >
                {item.q}
              </span>
              <span
                className={cn(
                  'shrink-0 inline-flex items-center justify-center',
                  'size-8 md:size-9 rounded-full border',
                  isOpen
                    ? 'bg-ink-900 text-paper border-ink-900'
                    : 'bg-paper text-ink-700 border-ink-900/15'
                )}
                aria-hidden
              >
                {isOpen ? <Minus className="size-4" /> : <Plus className="size-4" />}
              </span>
            </button>
            <div
              id={`faq-panel-${i}`}
              role="region"
              aria-labelledby={`faq-trigger-${i}`}
              hidden={!isOpen}
              className={cn(
                'grid transition-all duration-300 ease-out',
                isOpen ? 'grid-rows-[1fr] opacity-100 pb-6 md:pb-7' : 'grid-rows-[0fr] opacity-0'
              )}
            >
              <div className="overflow-hidden">
                <p className="text-sm md:text-base text-ink-700 leading-relaxed max-w-3xl text-pretty pe-12 md:pe-16">
                  {item.a}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
