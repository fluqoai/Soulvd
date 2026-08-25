import { setRequestLocale } from 'next-intl/server';
import { SectorsList } from '@/components/public/SectorsList';
import { CTA } from '@/components/home/CTA';

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
      <CTA />
    </>
  );
}
