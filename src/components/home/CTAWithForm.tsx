import { getTranslations, getLocale } from 'next-intl/server';
import { ArrowRight, ArrowLeft, Sparkles, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';
import { Section } from '@/components/ui/Section';
import { ScrollReveal } from '@/components/motion/Motion';
import { HomeContactForm } from './HomeContactForm';
import { cn } from '@/lib/utils';

/**
 * Final closer: copy + contact form, side by side on desktop,
 * stacked on mobile. Sits on ink-900 with the form in a paper card
 * so it pops. The form is the concrete "how do I start?" — the
 * supporting copy is the "why" wrapped in 3 quick trust points.
 */
export async function CTAWithForm() {
  const t = await getTranslations('home.cta');
  const tContact = await getTranslations('home.contact');
  const locale = await getLocale();
  const isRtl = locale === 'ar';
  const ArrowEnd = isRtl ? ArrowLeft : ArrowRight;

  return (
    <Section
      id="contact"
      tone="ink"
      size="xl"
      // pb-24 / md:pb-28 leaves room for the floating WhatsApp
      // button (56px circle + 24px offset) so it never covers
      // the form's submit button.
      className="relative overflow-hidden scroll-mt-20 pb-24 md:pb-28"
    >
      {/* Faded hex motif — top right */}
      <svg
        className="absolute -top-20 -end-20 w-[420px] h-[420px] opacity-[0.05] pointer-events-none hidden md:block"
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
      </svg>
      {/* Faded hex — bottom left, smaller */}
      <svg
        className="absolute -bottom-12 -start-12 w-[260px] h-[260px] opacity-[0.04] pointer-events-none hidden md:block"
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

      <div className="relative grid gap-10 md:gap-14 lg:gap-20 md:grid-cols-12 md:items-center">
        {/* Copy — 5 cols on desktop */}
        <div className="md:col-span-5">
          <ScrollReveal>
            <p className="inline-flex items-center gap-2 text-sage-300 text-xs md:text-sm font-medium uppercase tracking-[0.25em]">
              <Sparkles className="size-3.5" aria-hidden />
              {t('eyebrow')}
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.05}>
            <h2 className="mt-5 md:mt-6 text-3xl md:text-4xl lg:text-5xl xl:text-[3.5rem] font-semibold leading-[1.15] tracking-tight text-paper text-balance">
              {t('title')}
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <p className="mt-5 md:mt-6 text-base md:text-lg text-linen-200/80 leading-relaxed text-pretty">
              {t('subtitle')}
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <ul className="mt-7 md:mt-9 space-y-3 text-sm md:text-[15px] text-linen-200/85">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="size-5 text-sage-400 shrink-0 mt-0.5" aria-hidden />
                <span>{tContact('success_title')}</span>
              </li>
              <li className="flex items-start gap-3">
                <ShieldCheck className="size-5 text-sage-400 shrink-0 mt-0.5" aria-hidden />
                <span>{t('point_meta')}</span>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="size-5 text-sage-400 shrink-0 mt-0.5" aria-hidden />
                <span>{t('point_reply')}</span>
              </li>
            </ul>
          </ScrollReveal>
        </div>

        {/* Form card — 7 cols on desktop */}
        <ScrollReveal delay={0.1} className="md:col-span-7">
          <div
            className={cn(
              'relative rounded-3xl bg-paper p-7 md:p-10',
              'shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)]'
            )}
          >
            <h3 className="sr-only">{tContact('eyebrow')}</h3>
            <HomeContactForm />
          </div>
        </ScrollReveal>
      </div>
    </Section>
  );
}
