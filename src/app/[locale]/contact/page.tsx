import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Section } from '@/components/ui/Section';
import { ContactForm } from '@/components/public/ContactForm';
import { ContactInfo } from '@/components/public/ContactInfo';

// See [locale]/page.tsx for the `force-static` warning.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contact' });
  return {
    title: t('title'),
    description: t('subtitle'),
    alternates: { canonical: locale === 'ar' ? '/contact' : '/en/contact' },
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('contact');

  return (
    <Section tone="paper" size="lg">
      <div className="grid gap-10 lg:gap-14 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold leading-[1.1] tracking-tight text-ink-900 text-balance">
            {t('title')}
          </h1>
          <p className="mt-4 text-base md:text-lg text-ink-600 leading-relaxed max-w-2xl text-pretty">
            {t('subtitle')}
          </p>
          <div className="mt-8">
            <ContactForm />
          </div>
        </div>
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            <ContactInfo />
          </div>
        </div>
      </div>
    </Section>
  );
}
