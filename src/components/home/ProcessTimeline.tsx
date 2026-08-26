import { getTranslations } from 'next-intl/server';
import { Section } from '@/components/ui/Section';
import { ScrollReveal } from '@/components/motion/Motion';
import { SectionLabel } from './SectionLabel';
import { cn } from '@/lib/utils';

type Step = {
  num: string;
  title: string;
  description: string;
};

export async function ProcessTimeline() {
  const t = await getTranslations('home.process');
  const steps = (t.raw('steps') as Step[]) ?? [];

  return (
    <Section id="how-it-works" tone="sage" size="lg" className="relative overflow-hidden">
      {/* Subtle hex pattern overlay (echoes the brand mark) */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none"
        aria-hidden
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern
            id="process-hex"
            x="0"
            y="0"
            width="80"
            height="92"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M40 0 L80 23 L80 69 L40 92 L0 69 L0 23 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.6"
              className="text-ink-900"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#process-hex)" />
      </svg>

      <div className="relative">
        <SectionLabel text={{ ar: t('label'), en: t('label') }}>
          {t('label')}
        </SectionLabel>

        <ScrollReveal>
          <h2 className="mt-6 md:mt-8 text-3xl md:text-4xl lg:text-5xl font-semibold leading-[1.1] tracking-tight text-ink-900 text-balance max-w-3xl">
            {t('title')}
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.05}>
          <p className="mt-4 md:mt-5 text-base md:text-lg text-ink-700 leading-relaxed max-w-2xl text-pretty">
            {t('subtitle')}
          </p>
        </ScrollReveal>

        {/* Desktop timeline: numbered circles connected by a sage dashed line.
            Mobile: stacked list with a vertical line on the start side. */}
        <ol className="mt-12 md:mt-16 relative grid gap-10 md:gap-0 md:grid-cols-4">
          {/* Horizontal connector (desktop) */}
          <div
            className="hidden md:block absolute top-7 start-[3.5rem] end-[3.5rem] h-px border-t border-dashed border-ink-900/25"
            aria-hidden
          />

          {steps.map((step, i) => (
            <ScrollReveal
              key={step.num}
              delay={i * 0.08}
              className="relative md:pe-6"
            >
              {/* Numbered circle (sits above the line on desktop) */}
              <div
                className={cn(
                  'relative z-10 inline-flex items-center justify-center',
                  'size-14 md:size-16 rounded-full bg-paper border border-ink-900/10',
                  'text-ink-900 text-lg md:text-xl font-semibold',
                  'shadow-[0_2px_0_rgba(44,42,38,0.04)]'
                )}
                style={{ fontFeatureSettings: '"tnum"' }}
              >
                <span className="font-display text-xl md:text-2xl tracking-tight">
                  {step.num}
                </span>
              </div>

              <h3 className="mt-5 md:mt-7 text-lg md:text-xl font-semibold leading-snug text-ink-900">
                {step.title}
              </h3>
              <p className="mt-2 text-sm md:text-[15px] text-ink-700 leading-relaxed text-pretty max-w-xs">
                {step.description}
              </p>
            </ScrollReveal>
          ))}
        </ol>
      </div>
    </Section>
  );
}
