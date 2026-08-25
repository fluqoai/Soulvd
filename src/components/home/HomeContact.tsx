import { getTranslations } from 'next-intl/server';
import { Section } from '@/components/ui/Section';
import { ScrollReveal } from '@/components/motion/Motion';
import { HomeContactForm } from './HomeContactForm';

export async function HomeContact() {
  const t = await getTranslations('home.contact');

  return (
    <Section
      id="contact"
      tone="linen"
      size="lg"
      className="scroll-mt-20"
    >
      <div className="grid gap-10 md:gap-16 md:grid-cols-12 md:items-start">
        <ScrollReveal className="md:col-span-5">
          <p className="text-xs md:text-sm font-medium uppercase tracking-[0.2em] text-sage-700 mb-3">
            {t('eyebrow')}
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold leading-[1.1] tracking-tight text-ink-900 text-balance">
            {t('title')}
          </h2>
          <p className="mt-5 text-base md:text-lg text-ink-700 leading-relaxed text-pretty max-w-md">
            {t('subtitle')}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.1} className="md:col-span-7">
          <HomeContactForm />
        </ScrollReveal>
      </div>
    </Section>
  );
}
