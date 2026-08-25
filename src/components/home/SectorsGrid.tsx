import { getTranslations, getLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import {
  Heart,
  Building2,
  UtensilsCrossed,
  Home,
  GraduationCap,
  HeartPulse,
  ArrowLeft,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { Section } from '@/components/ui/Section';
import { ScrollReveal } from '@/components/motion/Motion';
import { SectionLabel } from './SectionLabel';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, LucideIcon> = {
  Heart,
  Building2,
  UtensilsCrossed,
  Home,
  GraduationCap,
  HeartPulse,
};

type Sector = {
  key: string;
  icon: string;
  title: string;
  description: string;
};

export async function SectorsGrid() {
  const t = await getTranslations('home.sectors');
  const locale = await getLocale();
  const isRtl = locale === 'ar';
  const list = (t.raw('list') as Sector[]) ?? [];
  const ArrowEnd = isRtl ? ArrowLeft : ArrowRight;

  return (
    <Section id="sectors" tone="paper" size="lg" className="relative">
      <div className="grid gap-10 md:gap-14 md:grid-cols-12 md:items-end">
        <div className="md:col-span-7">
          <SectionLabel text={{ ar: t('label'), en: t('label') }}>
            {t('label')}
          </SectionLabel>
          <ScrollReveal>
            <h2 className="mt-6 md:mt-8 text-3xl md:text-4xl lg:text-5xl font-semibold leading-[1.1] tracking-tight text-ink-900 text-balance">
              {t('title')}
            </h2>
          </ScrollReveal>
        </div>
        <ScrollReveal delay={0.1} className="md:col-span-5">
          <p className="text-base md:text-lg text-ink-700 leading-relaxed text-pretty">
            {t('subtitle')}
          </p>
        </ScrollReveal>
      </div>

      <ul
        className={cn(
          'mt-12 md:mt-16 grid gap-4 md:gap-5',
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        )}
      >
        {list.map((s, i) => {
          const Icon = ICON_MAP[s.icon] ?? Heart;
          return (
            <ScrollReveal
              key={s.key}
              delay={i * 0.04}
              className="group h-full"
            >
              <Link
                href={`/sectors/${s.key}`}
                className={cn(
                  'relative flex h-full flex-col justify-between overflow-hidden rounded-2xl',
                  'bg-linen-100 border border-ink-900/10',
                  'p-6 md:p-8 transition-colors duration-200',
                  'hover:border-sage-300 hover:bg-sage-50'
                )}
              >
                {/* Hex pattern background — subtle brand mark texture */}
                <svg
                  className="absolute inset-0 w-full h-full opacity-[0.05] pointer-events-none"
                  aria-hidden
                  preserveAspectRatio="xMidYMid slice"
                >
                  <defs>
                    <pattern
                      id={`sector-hex-${s.key}`}
                      x="0"
                      y="0"
                      width="44"
                      height="50"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M22 0 L44 12 L44 38 L22 50 L0 38 L0 12 Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="0.6"
                        className="text-ink-900"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill={`url(#sector-hex-${s.key})`} />
                </svg>

                <div className="relative">
                  <span className="inline-flex items-center justify-center size-12 md:size-14 rounded-xl bg-paper border border-ink-900/10 text-sage-700 transition-colors group-hover:border-sage-300">
                    <Icon className="size-6 md:size-7" strokeWidth={1.6} aria-hidden />
                  </span>
                </div>

                <div className="relative mt-12 md:mt-16">
                  <h3 className="text-xl md:text-2xl font-semibold leading-snug tracking-tight text-ink-900">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm md:text-base text-ink-700 leading-relaxed">
                    {s.description}
                  </p>

                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-sage-700">
                    <span>
                      {isRtl ? 'استكشف القطاع' : 'Explore sector'}
                    </span>
                    <ArrowEnd className="size-4 rtl:rotate-0" aria-hidden />
                  </div>
                </div>
              </Link>
            </ScrollReveal>
          );
        })}
      </ul>
    </Section>
  );
}
