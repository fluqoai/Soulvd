import type { Metadata, Viewport } from 'next';
import { getLocale } from 'next-intl/server';
import { Inter, IBM_Plex_Sans_Arabic, Fraunces } from 'next/font/google';
import { routing, type Locale } from '@/i18n/routing';
import { JsonLd } from '@/components/seo/JsonLd';
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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://soulvd.net';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F5F0E4',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Soulvd · سولڤد — WhatsApp AI for Saudi businesses',
    template: '%s · Soulvd',
  },
  description:
    'Soulvd is the official Meta WhatsApp Business Partner for Saudi Arabia. Turn WhatsApp conversations into revenue with an AI bot that speaks Saudi Arabic, qualifies leads, and closes deals — live in 2 weeks.',
  applicationName: 'Soulvd',
  authors: [{ name: 'Soulvd', url: SITE_URL }],
  generator: 'Next.js',
  keywords: [
    'WhatsApp Business Saudi Arabia',
    'واتساب بزنس السعودية',
    'AI chatbot Saudi',
    'Meta Business Partner',
    'WhatsApp automation',
    'بوت واتساب',
    'ذكاء اصطناعي',
  ],
  referrer: 'origin-when-cross-origin',
  formatDetection: { email: false, address: false, telephone: false },
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  // Web app manifest is provided by the favicon icons above;
  // declare a real one when PWA install is on the roadmap.
  alternates: {
    canonical: '/',
    languages: {
      ar: '/',
      en: '/en',
      'x-default': '/',
    },
  },
  openGraph: {
    type: 'website',
    siteName: 'Soulvd · سولڤد',
    title: 'Soulvd — Turn WhatsApp conversations into revenue',
    description:
      'The official Meta WhatsApp Business Partner for Saudi Arabia. AI bot that speaks Saudi Arabic, 24/7, live in 2 weeks.',
    url: SITE_URL,
    locale: 'ar_SA',
    alternateLocale: ['en_US'],
    images: [
      {
        url: '/og',
        width: 1200,
        height: 630,
        alt: 'Soulvd — WhatsApp AI for Saudi businesses',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Soulvd — Turn WhatsApp conversations into revenue',
    description:
      'The official Meta WhatsApp Business Partner for Saudi Arabia.',
    images: ['/og'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'technology',
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
      <body>
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Soulvd',
            alternateName: 'سولڤد',
            url: SITE_URL,
            logo: `${SITE_URL}/brand/soulvd-logo.png`,
            description:
              'Official Meta WhatsApp Business Partner for Saudi Arabia. AI WhatsApp automation for businesses.',
            sameAs: [
              // User to fill in once real socials exist
            ],
            contactPoint: {
              '@type': 'ContactPoint',
              contactType: 'sales',
              areaServed: ['SA', 'AE', 'KW', 'BH', 'QA', 'OM'],
              availableLanguage: ['Arabic', 'English'],
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
