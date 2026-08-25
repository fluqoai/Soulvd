import { getTranslations } from 'next-intl/server';
import { Section } from '@/components/ui/Section';
import { CountUp } from './CountUp';
import { SectionLabel } from './SectionLabel';
import { ScrollReveal } from '@/components/motion/Motion';

type Stat = { value: number; prefix?: string; suffix?: string; labelKey: string };

export async function StatsSection() {
  const t = await getTranslations('home.stats');
  const stats: Stat[] = [
    { value: 8, suffix: '+', labelKey: 'sectors' },
    { value: 100, suffix: '+', labelKey: 'integrations' },
    { value: 24, suffix: '/7', labelKey: 'support' },
    { value: 98, suffix: '%', labelKey: 'satisfaction' },
  ];

  return (
    <Section id="numbers" tone="ink" size="lg" className="relative overflow-hidden">
      {/* Decorative grid overlay */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none"
        aria-hidden
      >
        <defs>
          <pattern id="stats-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="currentColor" strokeWidth="0.4" className="text-paper" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#stats-grid)" />
      </svg>

      <div className="relative">
        <SectionLabel text={{ ar: t('label'), en: t('label') }}>
          {t('label')}
        </SectionLabel>

        <ScrollReveal>
          <h2 className="mt-8 md:mt-10 text-3xl md:text-4xl lg:text-5xl font-semibold text-paper leading-tight text-center max-w-3xl mx-auto text-balance">
            {t('title')}
          </h2>
        </ScrollReveal>

        <ul className="mt-12 md:mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6">
          {stats.map((s, i) => (
            <ScrollReveal key={s.labelKey} delay={i * 0.08} className="text-center">
              <p className="text-5xl md:text-6xl lg:text-7xl font-semibold tabular-nums text-paper leading-none">
                <CountUp value={s.value} prefix={s.prefix} suffix={s.suffix} />
              </p>
              <p className="mt-3 text-sm md:text-base text-linen-300/80">{t(s.labelKey)}</p>
            </ScrollReveal>
          ))}
        </ul>
      </div>
    </Section>
  );
}
