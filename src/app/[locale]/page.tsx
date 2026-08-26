import { setRequestLocale } from 'next-intl/server';
import { Hero } from '@/components/home/Hero';
import { ServicesShowcase } from '@/components/home/ServicesShowcase';
import { CaseStudies } from '@/components/home/CaseStudies';
import { IntegrationsGrid } from '@/components/home/IntegrationsGrid';
import { FAQSection } from '@/components/home/FAQSection';
import { CTAWithForm } from '@/components/home/CTAWithForm';

/**
 * Home page — 6 sections only.
 *
 *  1. Hero            — what is it? (chat preview + trust bar)
 *  2. Services        — does it work for me? (3-up with mini UIs)
 *  3. Case studies    — is it real? (3 named clients + metrics)
 *  4. Integrations    — will it fit my stack? (4-col logo grid)
 *  5. FAQ             — handle objections
 *  6. CTA + form      — how do I start?
 */
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
      <ServicesShowcase />
      <CaseStudies />
      <IntegrationsGrid />
      <FAQSection />
      <CTAWithForm />
    </>
  );
}
