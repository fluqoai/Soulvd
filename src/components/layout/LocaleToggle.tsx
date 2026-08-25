'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Languages } from 'lucide-react';
import { usePathname, useRouter } from '@/i18n/routing';
import { cn } from '@/lib/utils';

export function LocaleToggle({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('lang');
  const next = locale === 'ar' ? 'en' : 'ar';

  return (
    <button
      type="button"
      onClick={() => router.replace(pathname, { locale: next })}
      className={cn(
        'inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm font-medium',
        'text-ink-700 hover:text-ink-900 hover:bg-sage-50 transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-600',
        className
      )}
      aria-label={t('switch')}
    >
      <Languages className="size-4" aria-hidden />
      <span className="tabular-nums">{t(next)}</span>
    </button>
  );
}
