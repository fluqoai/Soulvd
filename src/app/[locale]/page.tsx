import { setRequestLocale } from 'next-intl/server';
import { Hero } from '@/components/home/Hero';
import { CaseStudies } from '@/components/home/CaseStudies';
import { FAQSection } from '@/components/home/FAQSection';
import { CTAWithForm } from '@/components/home/CTAWithForm';

/**
 * Home page — 4 sections only. Sikkah parity.
 *
 *  1. Hero            — what is it? (chat preview + trust bar)
 *  2. Case studies    — is it real? (3 named clients + metrics)
 *  3. FAQ             — handle the 4 most common objections
 *  4. CTA + form      — how do I start?
 *
 * Service and integration details live on the /services page.
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
      <CaseStudies />
      <FAQSection />
      <CTAWithForm />
    </>
  );
}
