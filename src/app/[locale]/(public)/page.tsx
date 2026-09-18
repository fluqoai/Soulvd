import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Hero } from '@/components/home/Hero';
import {CustomerJourney} from '@/components/home/CustomerJourney';
import { FAQSection } from '@/components/home/FAQSection';
import { CTAWithForm } from '@/components/home/CTAWithForm';
import { JsonLd } from '@/components/seo/JsonLd';

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
          description: 'WhatsApp Business inbox, templates and automation for Saudi businesses.',
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
      <CustomerJourney />
      <FAQSection />
      <CTAWithForm />
    </>
  );
}
