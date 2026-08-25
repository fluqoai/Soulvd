import { getTranslations } from 'next-intl/server';
import { ArrowRight, ArrowLeft, MessageCircle, Sparkles } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Section } from '@/components/ui/Section';
import { ScrollReveal } from '@/components/motion/Motion';
import { Link } from '@/i18n/routing';
import { getLocale } from 'next-intl/server';

export async function CTA() {
  const t = await getTranslations('home.cta');
  const locale = await getLocale();
  const isRtl = locale === 'ar';
  const ArrowEnd = isRtl ? ArrowLeft : ArrowRight;

  return (
    <Section tone="ink" size="xl" className="relative overflow-hidden">
      {/* Background decoration: faded hex motif (brand mark echo) */}
      <svg
        className="absolute -bottom-20 -end-20 w-[420px] h-[420px] opacity-[0.06] pointer-events-none hidden md:block"
        aria-hidden
        viewBox="0 0 200 200"
      >
        <path
          d="M100 5 L186 53 L186 147 L100 195 L14 147 L14 53 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.8"
          className="text-paper"
        />
        <path
          d="M100 35 L160 67 L160 133 L100 165 L40 133 L40 67 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.6"
          className="text-paper"
        />
        <path
          d="M100 65 L134 86 L134 124 L100 145 L66 124 L66 86 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.6"
          className="text-paper"
        />
      </svg>

      {/* Subtle grain */}
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none"
        aria-hidden
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.7'/></svg>\")",
        }}
      />

      <div className="relative max-w-4xl mx-auto text-center">
        <ScrollReveal>
          <p className="inline-flex items-center gap-2 text-sage-300 text-xs md:text-sm font-medium uppercase tracking-[0.25em]">
            <Sparkles className="size-3.5" aria-hidden />
            {t('eyebrow')}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.05}>
          <h2 className="mt-5 md:mt-6 text-3xl md:text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-tight text-paper text-balance">
            {t('title')}
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <p className="mt-5 md:mt-6 text-base md:text-lg text-linen-200/80 leading-relaxed max-w-2xl mx-auto text-pretty">
            {t('subtitle')}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <div className="mt-9 md:mt-10 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/contact" size="lg" variant="primary" className="bg-paper text-ink-900 hover:bg-linen-100">
              <MessageCircle className="size-4" />
              {t('primary')}
              <ArrowEnd className="size-4 rtl:rotate-0" aria-hidden />
            </ButtonLink>
            <Link
              href="/services"
              className="inline-flex items-center gap-2 h-13 px-8 rounded-lg text-base font-medium text-paper border border-paper/25 hover:bg-paper/10 transition-colors"
            >
              {t('secondary')}
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </Section>
  );
}
