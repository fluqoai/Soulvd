'use client';

import { cn } from '@/lib/utils';

type Props = {
  name: string;
  defaultChecked?: boolean;
  label: string;
  hint?: string;
};

/**
 * Renders a hidden "0" + a checkbox that, when unchecked, submits "0";
 * when checked, submits "1". Lets a server action read a single boolean
 * without doing string-to-bool parsing tricks.
 */
export function Toggle({ name, defaultChecked = false, label, hint }: Props) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-ink-900/10 bg-paper px-4 py-3">
      <div>
        <span className="block text-sm font-medium text-ink-800">{label}</span>
        {hint && <span className="block text-xs text-ink-500 mt-0.5">{hint}</span>}
      </div>
      <span className="relative inline-flex items-center">
        <input type="hidden" name={name} value="0" />
        <input
          type="checkbox"
          name={name}
          value="1"
          defaultChecked={defaultChecked}
          className="peer sr-only"
        />
        <span
          className={cn(
            'h-6 w-11 rounded-full bg-ink-900/15 transition-colors',
            'peer-checked:bg-sage-600 peer-focus-visible:ring-2 peer-focus-visible:ring-sage-600/40'
          )}
        />
        <span
          className={cn(
            'absolute start-0.5 top-0.5 h-5 w-5 rounded-full bg-paper shadow-sm transition-transform',
            'peer-checked:translate-x-5'
          )}
        />
      </span>
    </label>
  );
}
