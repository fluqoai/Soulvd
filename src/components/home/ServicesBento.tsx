import { getTranslations } from 'next-intl/server';
import {
  Bot,
  Inbox,
  Megaphone,
  Workflow,
  LineChart,
  PlugZap,
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react';
import { Section } from '@/components/ui/Section';
import { ScrollReveal } from '@/components/motion/Motion';
import { SectionLabel } from './SectionLabel';
import { cn } from '@/lib/utils';

/* Map icon names from translation data → actual lucide components. */
const ICON_MAP: Record<string, LucideIcon> = {
  Bot,
  Inbox,
  Megaphone,
  Workflow,
  LineChart,
  PlugZap,
};

/* Bento cell sizing — `primary` is the hero card, `secondary` is
   half-width, `tertiary` is third-width. Mobile always stacks. */
const SPAN_MAP: Record<string, string> = {
  primary: 'md:col-span-7 md:row-span-2',
  secondary: 'md:col-span-5',
  tertiary: 'md:col-span-4',
};

const TONE_MAP: Record<string, string> = {
  primary: 'bg-ink-900 text-paper',
  secondary: 'bg-paper border border-ink-900/10 text-ink-900',
  tertiary: 'bg-sage-50 text-ink-900',
};

type Service = {
  key: string;
  icon: string;
  title: string;
  description: string;
  accent: 'primary' | 'secondary' | 'tertiary';
};

export async function ServicesBento() {
  const t = await getTranslations('home.services');
  const list = (t.raw('list') as Service[]) ?? [];

  return (
    <Section id="services" tone="linen" size="lg" className="relative overflow-hidden">
      {/* Decorative dot pattern in the corner */}
      <svg
        className="absolute -top-10 -end-10 w-72 h-72 opacity-[0.05] pointer-events-none hidden md:block"
        aria-hidden
        viewBox="0 0 200 200"
      >
        <defs>
          <pattern id="services-dots" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.4" fill="currentColor" className="text-ink-900" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#services-dots)" />
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

        {/* 12-col bento grid: 1 primary (2-row) + 2 secondary + 3 tertiary */}
        <div
          className={cn(
            'mt-12 md:mt-16 grid gap-4 md:gap-5',
            'grid-cols-1 sm:grid-cols-2',
            'md:[grid-template-columns:repeat(12,minmax(0,1fr))] md:auto-rows-[minmax(190px,auto)]'
          )}
        >
          {list.map((s, i) => {
            const Icon = ICON_MAP[s.icon] ?? Bot;
            const isPrimary = s.accent === 'primary';
            return (
              <ScrollReveal
                key={s.key}
                delay={i * 0.05}
                className={cn(
                  'group relative rounded-2xl overflow-hidden p-6 md:p-8 flex flex-col',
                  'transition-colors duration-200',
                  SPAN_MAP[s.accent] ?? 'md:col-span-4',
                  TONE_MAP[s.accent] ?? 'bg-paper border border-ink-900/10'
                )}
              >
                {/* Top row: icon + arrow */}
                <div className="flex items-start justify-between mb-5 md:mb-8">
                  <span
                    className={cn(
                      'inline-flex items-center justify-center rounded-xl',
                      isPrimary
                        ? 'size-14 md:size-16 bg-sage-600/20 text-sage-300'
                        : 'size-12 md:size-14 bg-sage-100 text-sage-700'
                    )}
                  >
                    <Icon
                      className={cn(isPrimary ? 'size-7 md:size-8' : 'size-6 md:size-7')}
                      strokeWidth={1.6}
                      aria-hidden
                    />
                  </span>
                  <ArrowUpRight
                    className={cn(
                      'size-5 opacity-50',
                      isPrimary ? 'text-paper' : 'text-ink-700'
                    )}
                    aria-hidden
                  />
                </div>

                <h3
                  className={cn(
                    'font-semibold leading-snug tracking-tight',
                    isPrimary ? 'text-2xl md:text-3xl lg:text-4xl' : 'text-xl md:text-2xl',
                    isPrimary ? 'text-paper' : 'text-ink-900'
                  )}
                >
                  {s.title}
                </h3>
                <p
                  className={cn(
                    'mt-3 text-sm md:text-base leading-relaxed',
                    isPrimary ? 'text-linen-200/85 max-w-md' : 'text-ink-700'
                  )}
                >
                  {s.description}
                </p>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
