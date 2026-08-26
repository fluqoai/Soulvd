import { setRequestLocale, getTranslations } from 'next-intl/server';
import { ServicesList } from '@/components/public/ServicesList';
import { CTAWithForm } from '@/components/home/CTAWithForm';

// See [locale]/page.tsx for the `force-static` warning.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'services' });
  return {
    title: t('title'),
    description: t('subtitle'),
    alternates: { canonical: locale === 'ar' ? '/services' : '/en/services' },
  };
}

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <ServicesList />
      <CTAWithForm />
    </>
  );
}
