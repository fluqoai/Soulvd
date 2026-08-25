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

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  editHref,
  emptyMessage = 'No items yet.',
  rowAction,
}: Props<T>) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-linen-400/10 bg-ink-800/40 p-8 text-center text-sm text-linen-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-linen-400/10">
      <table className="w-full text-sm">
        <thead className="bg-ink-800/60 text-linen-400">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-start',
                  c.align === 'end' && 'text-end',
                  c.align === 'center' && 'text-center',
                  c.className
                )}
                style={c.width ? { width: c.width } : undefined}
              >
                {c.header}
              </th>
            ))}
            <th className="px-4 py-3 text-end text-xs font-semibold uppercase tracking-wider w-24">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-linen-400/5">
          {rows.map((row) => {
            const key = rowKey(row);
            const href = editHref(row);
            return (
              <tr key={key} className="bg-ink-900/40 hover:bg-ink-800/60 transition-colors group">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      'px-4 py-3 text-linen-100 align-middle',
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
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-linen-300 hover:text-paper hover:bg-linen-400/10"
                    >
                      <span>Edit</span>
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
