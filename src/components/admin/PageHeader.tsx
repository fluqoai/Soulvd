import type { ReactNode } from 'react';
import { Link } from '@/i18n/routing';

type Props = {
  title: string;
  description?: string;
  /** Locale-prefixed "back" link, e.g. /admin/services. */
  backHref?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, description, backHref, actions }: Props) {
  return (
    <div className="mb-6 md:mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-ink-500 hover:text-ink-900 mb-2"
          >
            <span aria-hidden>←</span>
            <span>Back</span>
          </Link>
        )}
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-paper">{title}</h1>
        {description && <p className="mt-1 text-sm text-linen-400 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
