import { getTranslations } from 'next-intl/server';
import { Section } from '@/components/ui/Section';
import { ScrollReveal } from '@/components/motion/Motion';

type StatItem = { value: string; label: string };

export async function Stats() {
  const t = await getTranslations('home');
  const stats = t.raw('statList') as StatItem[];

  return (
    <Section tone="ink" size="md" centered>
      <p className="text-sm uppercase tracking-[0.2em] text-sage-300 mb-3">
        {t('stats.title')}
      </p>
      <h2 className="text-3xl md:text-4xl font-semibold text-paper max-w-2xl mx-auto text-balance">
        {t('stats.subtitle')}
      </h2>
      <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-6">
        {stats.map((stat, i) => (
          <ScrollReveal key={i} delay={i * 0.08}>
            <div className="text-center">
              <p className="text-4xl md:text-5xl lg:text-6xl font-semibold text-paper tabular-nums tracking-tight">
                {stat.value}
              </p>
              <p className="mt-3 text-sm md:text-base text-linen-300 leading-snug">
                {stat.label}
              </p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </Section>
  );
}
