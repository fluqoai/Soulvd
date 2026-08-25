import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { Inter, IBM_Plex_Sans_Arabic, Fraunces } from 'next/font/google';
import { routing, type Locale } from '@/i18n/routing';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-plex-arabic',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-fraunces',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Soulvd — سولڤد',
    template: '%s · Soulvd',
  },
  description:
    'سولڤد — منصة ذكاء اصطناعي متكاملة للشركات السعودية، شريك ميتا الرسمي لأتمتة واتساب.',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Soulvd — سولڤد',
    description:
      'نحوّل محادثات واتساب إلى مبيعات — منصة ذكاء اصطناعي للسوق السعودي.',
    locale: 'ar_SA',
    type: 'website',
  },
};

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = (await getLocale()) as Locale;
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  return (
    <html
      lang={locale}
      dir={dir}
      className={`${inter.variable} ${plexArabic.variable} ${fraunces.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
