import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@supabase/supabase-js';
import { Link } from '@/i18n/routing';
import { Section } from '@/components/ui/Section';
import { ScrollReveal } from '@/components/motion/Motion';
import { SectionLabel } from './SectionLabel';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type Integration = {
  id: string;
  name: string;
  category: string | null;
  logo_url: string | null;
  url: string | null;
};

async function fetchIntegrations(): Promise<Integration[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return [];
  const supabase = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from('integrations')
    .select('id, name, category, logo_url, url, order_index')
    .eq('published', true)
    .order('order_index', { ascending: true })
    .limit(12);
  if (error) {
    console.error('Integrations fetch failed:', error.message);
    return [];
  }
  return (data ?? []) as unknown as Integration[];
}

export async function IntegrationsGrid() {
  const t = await getTranslations('home.integrations');
  const items = await fetchIntegrations();

  if (items.length === 0) return null;

  return (
    <Section id="integrations" tone="paper" size="lg" className="relative">
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
          'mt-12 md:mt-16 grid gap-3 md:gap-4',
          'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
        )}
      >
        {items.map((it, i) => {
          const inner = (
            <div
              className={cn(
                'h-full flex flex-col items-center justify-center gap-3',
                'p-5 md:p-6 rounded-xl',
                'bg-linen-100 border border-ink-900/10',
                'transition-colors duration-200',
                'group-hover:border-sage-300 group-hover:bg-paper'
              )}
            >
              {it.logo_url ? (
                <span className="relative h-8 md:h-10 w-24 md:w-28">
                  <Image
                    src={it.logo_url}
                    alt={it.name}
                    fill
                    sizes="120px"
                    className="object-contain"
                  />
                </span>
              ) : (
                <span className="size-9 md:size-10 rounded-lg bg-paper border border-ink-900/10 grid place-items-center text-xs font-semibold text-ink-700">
                  {it.name.charAt(0)}
                </span>
              )}
              <p className="text-xs md:text-sm text-ink-700 text-center font-medium">
                {it.name}
              </p>
            </div>
          );

          const className = 'group block h-full';
          return (
            <ScrollReveal key={it.id} delay={i * 0.03} className="h-full">
              {it.url ? (
                <Link
                  href={it.url.startsWith('http') ? it.url : `https://${it.url}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={className}
                  aria-label={it.name}
                >
                  {inner}
                </Link>
              ) : (
                <div className={className}>{inner}</div>
              )}
            </ScrollReveal>
          );
        })}
      </ul>

      <div className="mt-10 md:mt-12 text-center">
        <Link
          href="/services"
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-700 hover:text-sage-700 transition-colors"
        >
          {t('view_all')}
          <ArrowUpRight className="size-3.5 rtl:rotate-90" aria-hidden />
        </Link>
      </div>
    </Section>
  );
}
