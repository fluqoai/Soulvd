import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';

/**
 * Layout for the (auth) route group: login + future auth pages.
 * Intentionally no site Header / Footer / WhatsApp float — the
 * admin section is internal and should feel separate from the
 * public marketing site.
 *
 * The login page is force-Arabic (see page.tsx) so we don't need
 * to use a locale toggle here either.
 */
export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      {children}
    </NextIntlClientProvider>
  );
}
