import Image from 'next/image';
import { getTranslations, getLocale } from 'next-intl/server';
import { createClient } from '@supabase/supabase-js';
import { Quote } from 'lucide-react';
import { Section } from '@/components/ui/Section';
import { ScrollReveal } from '@/components/motion/Motion';
import { SectionLabel } from './SectionLabel';
import { cn } from '@/lib/utils';

type Testimonial = {
  id: string;
  client_name: string;
  client_role: string | null;
  client_company: string | null;
  quote: { ar?: string; en?: string };
  avatar_url: string | null;
};

async function fetchTestimonials(): Promise<Testimonial[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return [];
  const supabase = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from('testimonials')
    .select('id, client_name, client_role, client_company, quote, avatar_url, order_index')
    .eq('published', true)
    .order('order_index', { ascending: true })
    .limit(3);
  if (error) {
    console.error('Testimonials fetch failed:', error.message);
    return [];
  }
  return (data ?? []) as unknown as Testimonial[];
}

function pickL<T>(obj: { ar?: T; en?: T } | null | undefined, locale: 'ar' | 'en', fallback: T): T {
  if (!obj) return fallback;
  return (obj[locale] ?? obj.en ?? obj.ar ?? fallback) as T;
}

export async function Testimonials() {
  const t = await getTranslations('home.testimonials');
  const locale = (await getLocale()) as 'ar' | 'en';
  const items = await fetchTestimonials();

  if (items.length === 0) return null;

  return (
    <Section id="testimonials" tone="paper" size="lg" className="relative">
      <div className="text-center max-w-2xl mx-auto">
        <SectionLabel text={{ ar: t('label'), en: t('label') }}>
          {t('label')}
        </SectionLabel>
        <ScrollReveal>
          <h2 className="mt-6 md:mt-8 text-3xl md:text-4xl lg:text-5xl font-semibold leading-[1.1] tracking-tight text-ink-900 text-balance">
            {t('title')}
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={0.05}>
          <p className="mt-4 md:mt-5 text-base md:text-lg text-ink-700 leading-relaxed text-pretty">
            {t('subtitle')}
          </p>
        </ScrollReveal>
      </div>

      <ul
        className={cn(
          'mt-12 md:mt-16 grid gap-4 md:gap-5',
          'grid-cols-1 md:grid-cols-3'
        )}
      >
        {items.map((tm, i) => {
          const quote = pickL(tm.quote, locale, '');
          return (
            <ScrollReveal key={tm.id} delay={i * 0.08}>
              <figure
                className={cn(
                  'group h-full rounded-2xl p-7 md:p-8',
                  'bg-linen-100 border border-ink-900/10',
                  'transition-colors duration-200 hover:border-sage-300',
                  'flex flex-col'
                )}
              >
                <Quote
                  className="size-7 md:size-8 text-sage-600 mb-4 md:mb-5"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <blockquote className="flex-1">
                  <p className="text-base md:text-[17px] leading-relaxed text-ink-800 text-pretty">
                    &ldquo;{quote}&rdquo;
                  </p>
                </blockquote>
                <figcaption className="mt-6 md:mt-7 pt-5 md:pt-6 border-t border-ink-900/10 flex items-center gap-3">
                  {tm.avatar_url ? (
                    <span className="relative size-11 md:size-12 rounded-full overflow-hidden bg-sage-100 shrink-0">
                      <Image
                        src={tm.avatar_url}
                        alt={tm.client_name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center size-11 md:size-12 rounded-full bg-ink-900 text-paper font-display font-semibold text-base shrink-0">
                      {tm.client_name.charAt(0)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-900 leading-tight truncate">
                      {tm.client_name}
                    </p>
                    {(tm.client_role || tm.client_company) && (
                      <p className="text-xs text-ink-500 leading-tight truncate mt-0.5">
                        {[tm.client_role, tm.client_company].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </figcaption>
              </figure>
            </ScrollReveal>
          );
        })}
      </ul>
    </Section>
  );
}
