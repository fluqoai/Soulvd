import { setRequestLocale, getTranslations } from 'next-intl/server';
import { SectorsList } from '@/components/public/SectorsList';
import { CTAWithForm } from '@/components/home/CTAWithForm';

// See [locale]/page.tsx for the `force-static` warning.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'sectors' });
  return {
    title: t('title'),
    description: t('subtitle'),
    alternates: { canonical: locale === 'ar' ? '/sectors' : '/en/sectors' },
  };
}

export default async function SectorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <SectorsList />
      <CTAWithForm />
    </>
  );
}
