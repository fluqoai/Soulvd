import { getTranslations } from 'next-intl/server';
import {
  Heart,
  Building2,
  UtensilsCrossed,
  Home,
  GraduationCap,
  HeartPulse,
  type LucideIcon,
} from 'lucide-react';
import { Section } from '@/components/ui/Section';
import { ScrollReveal } from '@/components/motion/Motion';
import { Link } from '@/i18n/routing';

type SectorItem = { key: string; title: string; description: string };

const ICON_MAP: Record<string, LucideIcon> = {
  nonprofit: Heart,
  public: Building2,
  restaurants: UtensilsCrossed,
  'real-estate': Home,
  education: GraduationCap,
  healthcare: HeartPulse,
};

export async function Sectors() {
  const t = await getTranslations('home');
  const tNav = await getTranslations('nav');
  const sectors = t.raw('sectorList') as SectorItem[];

  return (
    <Section tone="sage" size="lg" title={t('sectors.title')} description={t('sectors.subtitle')}>
      <div className="grid gap-4 md:gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {sectors.map((sector, i) => {
          const Icon = ICON_MAP[sector.key] ?? Building2;
          return (
            <ScrollReveal key={sector.key} delay={i * 0.05}>
              <Link
                href={`/sectors/${sector.key}`}
                className="group block h-full rounded-2xl bg-paper border border-ink-900/5 p-7 transition-colors hover:border-sage-400"
              >
                <div className="inline-flex size-11 items-center justify-center rounded-lg bg-sage-50 text-sage-700 mb-5">
                  <Icon className="size-5" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold text-ink-900 mb-2 leading-snug">
                  {sector.title}
                </h3>
                <p className="text-sm text-ink-600 leading-relaxed">
                  {sector.description}
                </p>
              </Link>
            </ScrollReveal>
          );
        })}
      </div>
      <div className="mt-10 text-center">
        <Link
          href="/sectors"
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-800 underline-offset-4 hover:underline"
        >
          {tNav('sectors')} →
        </Link>
      </div>
    </Section>
  );
}
