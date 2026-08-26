import { setRequestLocale } from 'next-intl/server';
import { ServicesList } from '@/components/public/ServicesList';
import { CTAWithForm } from '@/components/home/CTAWithForm';

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
