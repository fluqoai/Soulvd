import { getTranslations } from 'next-intl/server';
import {
  Heart,
  Building2,
  UtensilsCrossed,
  Home,
  GraduationCap,
  HeartPulse,
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react';
import { Section } from '@/components/ui/Section';
import { ScrollReveal } from '@/components/motion/Motion';
import { Link } from '@/i18n/routing';

type SectorItem = {
  key: string;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  useCases: string[];
};

const ICON_MAP: Record<string, LucideIcon> = {
  Heart,
  Building2,
  UtensilsCrossed,
  Home,
  GraduationCap,
  HeartPulse,
};

export async function SectorsList() {
  const t = await getTranslations('sectors');
  const sectors = t.raw('detailedList') as SectorItem[];

  return (
    <Section
      tone="sage"
      size="lg"
      title={t('title')}
      description={t('subtitle')}
    >
      <div className="grid gap-4 md:gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {sectors.map((sector, i) => {
          const Icon = ICON_MAP[sector.icon] ?? Building2;
          return (
            <ScrollReveal key={sector.key} delay={i * 0.05}>
              <Link
                href={`/sectors/${sector.key}`}
                className="group relative block h-full rounded-2xl bg-paper border border-ink-900/5 p-7 transition-colors hover:border-sage-400"
              >
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="inline-flex size-11 items-center justify-center rounded-lg bg-sage-50 text-sage-700">
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <ArrowUpRight
                    className="size-5 text-ink-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:group-hover:translate-x-0 rtl:group-hover:-translate-x-0.5"
                    aria-hidden
                  />
                </div>
                <h3 className="text-lg font-semibold text-ink-900 mb-2 leading-snug">
                  {sector.title}
                </h3>
                <p className="text-sm text-ink-600 leading-relaxed mb-4">
                  {sector.subtitle}
                </p>
                <p className="text-xs text-ink-500">
                  {sector.useCases.length} use cases
                </p>
              </Link>
            </ScrollReveal>
          );
        })}
      </div>
    </Section>
  );
}
