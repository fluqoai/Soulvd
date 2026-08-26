import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Base locale layout. This file is intentionally minimal — it only
 * resolves the locale, sets the request locale for next-intl, and
 * provides the i18n context to children.
 *
 * Each route group under [locale] adds its own shell:
 *   - (public)  → Header + Footer + WhatsApp float
 *   - (auth)    → minimal (login)
 *   - admin/    → admin shell (Sidebar + floating mobile menu)
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      {children}
    </NextIntlClientProvider>
  );
}
