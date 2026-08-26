import { setRequestLocale, getTranslations } from 'next-intl/server';
import { About } from '@/components/public/About';
import { CTAWithForm } from '@/components/home/CTAWithForm';

// See [locale]/page.tsx for the `force-static` warning.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'about' });
  return {
    title: t('title'),
    description: t('subtitle'),
    alternates: { canonical: locale === 'ar' ? '/about' : '/en/about' },
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <About />
      <CTAWithForm />
    </>
  );
}
