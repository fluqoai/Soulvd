import { setRequestLocale } from 'next-intl/server';
import { Hero } from '@/components/home/Hero';
import { Values } from '@/components/home/Values';
import { Services } from '@/components/home/Services';
import { Sectors } from '@/components/home/Sectors';
import { CTA } from '@/components/home/CTA';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <Hero />
      <Values />
      <Services />
      <Sectors />
      <CTA />
    </>
  );
}
