import { setRequestLocale } from 'next-intl/server';
import { Hero } from '@/components/home/Hero';
import { StatsSection } from '@/components/home/StatsSection';
import { ServicesShowcase } from '@/components/home/ServicesShowcase';
import { CaseStudies } from '@/components/home/CaseStudies';
import { ProcessTimeline } from '@/components/home/ProcessTimeline';
import { SectorsGrid } from '@/components/home/SectorsGrid';
import { IntegrationsGrid } from '@/components/home/IntegrationsGrid';
import { Testimonials } from '@/components/home/Testimonials';
import { FAQSection } from '@/components/home/FAQSection';
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
      <ServicesShowcase />
      <CaseStudies />
      <ProcessTimeline />
      <SectorsGrid />
      <IntegrationsGrid />
      <Testimonials />
      <FAQSection />
      <CTA />
      <HomeContact />
    </>
  );
}
