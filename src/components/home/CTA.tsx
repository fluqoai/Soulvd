import { getTranslations } from 'next-intl/server';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Section } from '@/components/ui/Section';
import { ScrollReveal } from '@/components/motion/Motion';

export async function CTA() {
  const t = await getTranslations('home.cta');
  return (
    <Section tone="linen" size="lg">
      <ScrollReveal className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight text-ink-900 text-balance">
          {t('title')}
        </h2>
        <p className="mt-5 text-base md:text-lg text-ink-600 leading-relaxed max-w-2xl mx-auto text-pretty">
          {t('subtitle')}
        </p>
        <div className="mt-8">
          <ButtonLink href="/contact" size="lg" variant="primary">
            <MessageCircle className="size-4" />
            {t('button')}
            <ArrowRight className="size-4 rtl:hidden" aria-hidden />
          </ButtonLink>
        </div>
      </ScrollReveal>
    </Section>
  );
}
