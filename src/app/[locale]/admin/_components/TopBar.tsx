// src/app/[locale]/admin/_components/TopBar.tsx
// Server component. Static top bar — each page renders its own H1.

import { getTranslations } from 'next-intl/server';
import { ExternalLink } from 'lucide-react';
import { Link } from '@/i18n/routing';

export async function TopBar({ locale }: { locale: string }) {
  const t = await getTranslations('admin.common');

  return (
    <div className="sticky top-0 z-30 h-16 bg-paper/90 backdrop-blur-md border-b border-ink-900/5">
      <div className="h-full px-6 md:px-10 flex items-center justify-end gap-4">
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-600 hover:text-ink-900"
          target="_blank"
        >
          {t('view_site')}
          <ExternalLink className="size-3.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
