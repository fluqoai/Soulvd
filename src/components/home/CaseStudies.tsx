import Image from 'next/image';
import { getTranslations, getLocale } from 'next-intl/server';
import { createClient } from '@supabase/supabase-js';
import { ArrowUpRight, TrendingUp } from 'lucide-react';
import { Section } from '@/components/ui/Section';
import { ScrollReveal } from '@/components/motion/Motion';
import { SectionLabel } from './SectionLabel';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';

type Result = { label: string; value: string };
type CaseStudy = {
  id: string;
  client_name: string;
  title: { ar?: string; en?: string };
  summary: { ar?: string; en?: string };
  results: Result[];
  cover_image: string | null;
};

async function fetchCaseStudies(): Promise<CaseStudy[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return [];
  const supabase = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from('case_studies')
    .select('id, client_name, title, summary, results, cover_image, order_index')
    .eq('published', true)
    .order('order_index', { ascending: true })
    .limit(3);
  if (error) {
    console.error('Case studies fetch failed:', error.message);
    return [];
  }
  return (data ?? []) as unknown as CaseStudy[];
}

function pickL<T>(obj: { ar?: T; en?: T } | null | undefined, locale: 'ar' | 'en', fallback: T): T {
  if (!obj) return fallback;
  return (obj[locale] ?? obj.en ?? obj.ar ?? fallback) as T;
}

export async function CaseStudies() {
  const t = await getTranslations('home.case_studies');
  const locale = (await getLocale()) as 'ar' | 'en';
  const items = await fetchCaseStudies();

  if (items.length === 0) return null;

  const [featured, ...rest] = items;

  return (
    <Section id="case-studies" tone="linen" size="lg" className="relative overflow-hidden">
      {/* Decorative number in the background */}
      <span
        className="absolute -top-6 end-4 md:end-12 text-[8rem] md:text-[14rem] leading-none font-display font-semibold text-ink-900/[0.04] select-none pointer-events-none"
        aria-hidden
      >
        {items.length.toString().padStart(2, '0')}
      </span>

      <div className="relative">
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

        {/* Featured + secondary layout */}
        <div className="mt-12 md:mt-16 grid gap-4 md:gap-5 md:grid-cols-12">
          {/* Featured — 7 cols */}
          {featured && (
            <ScrollReveal className="md:col-span-7">
              <CaseCard study={featured} locale={locale} variant="featured" />
            </ScrollReveal>
          )}

          {/* Secondary cards — 5 cols, stacked */}
          <div className="md:col-span-5 flex flex-col gap-4 md:gap-5">
            {rest.map((study, i) => (
              <ScrollReveal key={study.id} delay={(i + 1) * 0.08}>
                <CaseCard study={study} locale={locale} variant="compact" />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

function CaseCard({
  study,
  locale,
  variant,
}: {
  study: CaseStudy;
  locale: 'ar' | 'en';
  variant: 'featured' | 'compact';
}) {
  const title = pickL(study.title, locale, study.client_name);
  const summary = pickL(study.summary, locale, '');
  const isFeatured = variant === 'featured';
  const heroResult = study.results?.[0];
  const otherResults = (study.results ?? []).slice(1, 3);

  return (
    <article
      className={cn(
        'group relative h-full rounded-2xl overflow-hidden',
        'bg-paper border border-ink-900/10',
        'transition-colors duration-200 hover:border-sage-300',
        isFeatured ? 'p-7 md:p-10' : 'p-6 md:p-8'
      )}
    >
      {/* Top row: client + arrow */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0 flex items-center gap-3">
          {study.cover_image ? (
            <span className="relative size-10 md:size-12 rounded-lg overflow-hidden bg-sage-50 shrink-0">
              <Image src={study.cover_image} alt={study.client_name} fill sizes="48px" className="object-cover" />
            </span>
          ) : (
            <span className="inline-flex items-center justify-center size-10 md:size-12 rounded-lg bg-ink-900 text-paper font-display font-semibold text-base shrink-0">
              {study.client_name.charAt(0)}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-ink-500 font-medium">
              {locale === 'ar' ? 'عميل' : 'Client'}
            </p>
            <p className="text-sm md:text-base font-semibold text-ink-900 leading-tight truncate">
              {study.client_name}
            </p>
          </div>
        </div>
        <ArrowUpRight className="size-5 text-ink-500 opacity-60 shrink-0" aria-hidden />
      </div>

      <h3
        className={cn(
          'font-semibold leading-snug tracking-tight text-ink-900',
          isFeatured ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl'
        )}
      >
        {title}
      </h3>
      {summary && (
        <p
          className={cn(
            'mt-3 text-ink-700 leading-relaxed text-pretty',
            isFeatured ? 'text-base md:text-lg' : 'text-sm md:text-[15px]'
          )}
        >
          {summary}
        </p>
      )}

      {/* Hero result — the most eye-catching number */}
      {heroResult && (
        <div className="mt-6 md:mt-7 flex items-baseline gap-3">
          <span className="text-4xl md:text-5xl lg:text-6xl font-display font-semibold text-sage-700 leading-none tabular-nums">
            {heroResult.value}
          </span>
          <span className="text-sm md:text-base text-ink-600 max-w-[12rem] leading-snug">
            {heroResult.label}
          </span>
        </div>
      )}

      {/* Other results as small chips */}
      {otherResults.length > 0 && (
        <ul
          className={cn(
            'mt-5 md:mt-6 flex flex-wrap gap-2',
            isFeatured && 'md:gap-3'
          )}
        >
          {otherResults.map((r, i) => (
            <li
              key={i}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-linen-100 border border-ink-900/10 text-xs md:text-sm text-ink-700"
            >
              <TrendingUp className="size-3 text-sage-600" aria-hidden />
              <span className="font-semibold text-ink-900">{r.value}</span>
              <span className="text-ink-600">{r.label}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
