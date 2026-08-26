// src/app/[locale]/admin/_components/TopBar.tsx
// Server component. The mobile hamburger trigger is a small client
// child (`AdminMobileNavTrigger`) that shares URL state with the
// drawer in the layout.

import { getTranslations } from 'next-intl/server';
import { ExternalLink } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { AdminMobileNavTrigger } from './AdminMobileNav';

export async function TopBar({ locale }: { locale: string }) {
  const t = await getTranslations('admin.common');

  return (
    <div className="sticky top-0 z-30 h-16 bg-paper/90 backdrop-blur-md border-b border-ink-900/5">
      <div className="h-full px-4 sm:px-6 md:px-10 flex items-center justify-between gap-4">
        <AdminMobileNavTrigger />
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-600 hover:text-ink-900 ms-auto"
          target="_blank"
        >
          {t('view_site')}
          <ExternalLink className="size-3.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
