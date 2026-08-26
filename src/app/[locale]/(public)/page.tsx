import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Hero } from '@/components/home/Hero';
import { CaseStudies } from '@/components/home/CaseStudies';
import { FAQSection } from '@/components/home/FAQSection';
import { CTAWithForm } from '@/components/home/CTAWithForm';
import { JsonLd } from '@/components/seo/JsonLd';

/**
 * Home page — 4 sections. Sikkah parity.
 *
 *  1. Hero            — what is it? (chat preview + trust bar)
 *  2. Case studies    — is it real? (3 named clients + metrics)
 *  3. FAQ             — handle the 4 most common objections
 *  4. CTA + form      — how do I start?
 *
 * NOTE: do NOT add `export const dynamic = 'force-static'` here.
 * With the `[locale]` dynamic segment, `force-static` causes
 * Next.js to prerender a single Arabic version and serve it for
 * every locale, breaking the EN page. The default behavior
 * (with `generateStaticParams` in the layout) already produces
 * one static page per locale.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home.hero' });
  return {
    title: locale === 'ar' ? 'سولڤد' : 'Soulvd — Turn WhatsApp into revenue',
    description: t('subtitle'),
    alternates: {
      canonical: locale === 'ar' ? '/' : '/en',
    },
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // FAQ JSON-LD for Google rich results. The 4 questions are also
  // rendered visibly on the page, so the schema mirrors them.
  const tFaq = await getTranslations({ locale, namespace: 'home.faq' });
  const faqList = (tFaq.raw('list') as { q: string; a: string }[]) ?? [];

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'Soulvd',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          description:
            'WhatsApp AI automation platform for Saudi businesses. Speaks Saudi Arabic, qualifies leads, closes deals.',
          offers: {
            '@type': 'Offer',
            category: 'Subscription',
            priceCurrency: 'SAR',
            availability: 'https://schema.org/InStock',
          },
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqList.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.a,
            },
          })),
        }}
      />
      <Hero />
      <CaseStudies />
      <FAQSection />
      <CTAWithForm />
    </>
  );
}
