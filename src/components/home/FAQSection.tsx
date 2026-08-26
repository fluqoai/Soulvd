import { getTranslations } from 'next-intl/server';
import { Section } from '@/components/ui/Section';
import { ScrollReveal } from '@/components/motion/Motion';
import { SectionLabel } from './SectionLabel';
import { FAQ } from './FAQ';

type QA = { q: string; a: string };

export async function FAQSection() {
  const t = await getTranslations('home.faq');
  const list = (t.raw('list') as QA[]) ?? [];

  return (
    <Section id="faq" tone="linen" size="lg">
      <div className="grid gap-10 md:gap-16 md:grid-cols-12">
        <div className="md:col-span-4">
          <SectionLabel text={{ ar: t('label'), en: t('label') }}>
            {t('label')}
          </SectionLabel>
          <ScrollReveal>
            <h2 className="mt-6 md:mt-8 text-3xl md:text-4xl lg:text-5xl font-semibold leading-[1.1] tracking-tight text-ink-900 text-balance">
              {t('title')}
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={0.05}>
            <p className="mt-4 md:mt-5 text-base md:text-lg text-ink-700 leading-relaxed text-pretty">
              {t('subtitle')}
            </p>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={0.1} className="md:col-span-8">
          <FAQ items={list} defaultOpen={0} />
        </ScrollReveal>
      </div>
    </Section>
  );
}
