import { setRequestLocale } from 'next-intl/server';
import { ServicesList } from '@/components/public/ServicesList';
import { CTA } from '@/components/home/CTA';

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
      <CTA />
    </>
  );
}
