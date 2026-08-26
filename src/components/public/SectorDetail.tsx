import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Check, ArrowLeft, ArrowRight } from 'lucide-react';
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
import { ButtonLink } from '@/components/ui/Button';
import { FadeIn } from '@/components/motion/Motion';
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

export async function SectorDetail({ slug }: { slug: string }) {
  const t = await getTranslations('sectors');
  const sectors = t.raw('detailedList') as SectorItem[];
  const sector = sectors.find((s) => s.key === slug);

  if (!sector) {
    notFound();
  }

  const Icon = ICON_MAP[sector.icon] ?? Building2;

  return (
    <>
      <Section tone="paper" size="md">
        <FadeIn>
          <Link
            href="/sectors"
            className="inline-flex items-center gap-2 px-3 py-2 -mx-3 text-sm font-medium text-ink-700 hover:text-ink-900 hover:bg-sage-50 rounded-md mb-6 transition-colors"
          >
            <ArrowRight className="size-4 rtl:hidden" aria-hidden />
            <ArrowLeft className="size-4 ltr:hidden" aria-hidden />
            {t('backToList')}
          </Link>
          <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-sage-50 text-sage-700 mb-6">
            <Icon className="size-7" aria-hidden />
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold leading-[1.2] tracking-tight text-ink-900 text-balance">
            {sector.title}
          </h1>
          <p className="mt-4 text-lg md:text-xl text-ink-600 leading-relaxed max-w-3xl text-pretty">
            {sector.subtitle}
          </p>
        </FadeIn>
      </Section>

      <Section tone="linen" size="md">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-7">
            <h2 className="text-2xl font-semibold text-ink-900 leading-snug mb-4">
              How it works
            </h2>
            <p className="text-base md:text-lg text-ink-700 leading-relaxed text-pretty">
              {sector.description}
            </p>
          </div>
          <div className="md:col-span-5">
            <div className="rounded-2xl bg-paper border border-ink-900/5 p-6 md:p-7">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-sage-700 mb-4">
                Use cases
              </h3>
              <ul className="space-y-3">
                {sector.useCases.map((uc, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-ink-700">
                    <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-700 mt-0.5">
                      <Check className="size-3" aria-hidden />
                    </span>
                    <span>{uc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Section>

      <Section tone="ink" size="md" centered>
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-paper max-w-2xl mx-auto text-balance">
          {t('contactForSector')}
        </h2>
        <div className="mt-6">
          <ButtonLink href="/contact" size="lg" variant="accent">
            {t('backToList').startsWith('Back') ? 'Contact us' : 'تواصل معنا'}
          </ButtonLink>
        </div>
      </Section>
    </>
  );
}
