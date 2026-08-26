import type { ReactNode } from 'react';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';

type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  align?: 'start' | 'end' | 'center';
  width?: string;
};

type Props<T> = {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  editHref: (row: T) => string;
  emptyMessage?: string;
  /** Optional action slot per row, e.g. delete button. */
  rowAction?: (row: T) => ReactNode;
};

/**
 * Admin data table.
 *
 * Light theme: the admin pages have a `bg-linen-50` background, so the
 * table uses a paper surface with strong ink text for legibility. The
 * header row is a subtle sage tint, body rows alternate a paper/sage-50
 * zebra, and a deeper sage on hover — visible at a glance without
 * needing to squint.
 */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  editHref,
  emptyMessage = 'لا توجد عناصر بعد.',
  rowAction,
}: Props<T>) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-ink-900/10 bg-paper p-10 text-center text-sm text-ink-600">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-ink-900/10 bg-paper shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-sage-50 border-b border-ink-900/10">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-700 text-start',
                  c.align === 'end' && 'text-end',
                  c.align === 'center' && 'text-center',
                  c.className
                )}
                style={c.width ? { width: c.width } : undefined}
              >
                {c.header}
              </th>
            ))}
            <th className="px-4 py-3 text-end text-xs font-semibold uppercase tracking-wider text-ink-700 w-24">
              إجراءات
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-900/5">
          {rows.map((row, idx) => {
            const key = rowKey(row);
            const href = editHref(row);
            return (
              <tr
                key={key}
                className={cn(
                  'transition-colors group',
                  idx % 2 === 0 ? 'bg-paper' : 'bg-sage-50/40',
                  'hover:bg-sage-100/80'
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      'px-4 py-3 text-ink-900 align-middle',
                      c.align === 'end' && 'text-end',
                      c.align === 'center' && 'text-center',
                      c.className
                    )}
                  >
                    {c.cell(row)}
                  </td>
                ))}
                <td className="px-4 py-3 text-end align-middle">
                  <div className="flex items-center justify-end gap-1">
                    {rowAction?.(row)}
                    <Link
                      href={href}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-sage-800 hover:text-paper hover:bg-sage-600 transition-colors"
                    >
                      <span>تعديل</span>
                      <span aria-hidden className="rtl:hidden">→</span>
                      <span aria-hidden className="ltr:hidden">←</span>
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
