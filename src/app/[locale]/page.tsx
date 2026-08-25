import { setRequestLocale } from 'next-intl/server';
import { Hero } from '@/components/home/Hero';
import { StatsSection } from '@/components/home/StatsSection';
import { ServicesBento } from '@/components/home/ServicesBento';
import { SectorsGrid } from '@/components/home/SectorsGrid';
import { ProcessTimeline } from '@/components/home/ProcessTimeline';
import { Partners } from '@/components/home/Partners';
import { CTA } from '@/components/home/CTA';
import { HomeContact } from '@/components/home/HomeContact';

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
      <StatsSection />
      <ServicesBento />
      <SectorsGrid />
      <ProcessTimeline />
      <Partners />
      <CTA />
      <HomeContact />
    </>
  );
}
