import { getTranslations, getLocale } from 'next-intl/server';
import { ArrowRight, ArrowLeft, MessageCircle, Play, ShieldCheck, Cpu, Globe, Clock } from 'lucide-react';
import { TrackedLink } from '@/components/analytics/TrackedLink';
import { FadeIn } from '@/components/motion/Motion';
import { HeroChat } from './HeroChat';

export async function Hero() {
  const t = await getTranslations('home.hero');
  const tSite = await getTranslations('site');
  const locale = await getLocale();
  const isRtl = locale === 'ar';

  return (
    <section id="hero" className="relative overflow-hidden bg-paper border-b border-ink-900/5 isolate">
      {/* Subtle gradient wash — linen to paper, creates a soft top-to-bottom rhythm */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        aria-hidden
        style={{
          background:
            'linear-gradient(180deg, var(--color-linen-50) 0%, var(--color-paper) 70%)',
        }}
      />

      {/* Decorative grain */}
      <div
        className="absolute inset-0 z-[1] opacity-[0.03] mix-blend-multiply pointer-events-none"
        aria-hidden
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.7'/></svg>\")",
        }}
      />

      <div className="relative z-10 container-page pt-14 pb-16 md:pt-20 md:pb-24">
        <div className="grid gap-10 md:gap-12 lg:gap-16 md:grid-cols-12 md:items-center">
          {/* Copy — 7 cols on desktop */}
          <FadeIn className="md:col-span-7">
            {/* Meta partner pill — this is the primary trust signal */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sage-50 border border-sage-200/80 text-sage-800 text-xs font-medium">
              <ShieldCheck className="size-3.5" aria-hidden />
              <span>{t('eyebrow')}</span>
            </div>

            <h1
              className={`mt-6 md:mt-7 font-semibold leading-[1.02] tracking-tight text-ink-900 text-balance ${
                isRtl
                  ? 'text-[2.5rem] sm:text-5xl md:text-6xl lg:text-[5.25rem]'
                  : 'text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-display'
              }`}
            >
              {t('title')}
            </h1>

            <p
              className={`mt-6 md:mt-7 text-lg md:text-xl text-ink-700 leading-relaxed max-w-xl text-pretty ${
                isRtl ? 'md:text-xl' : ''
              }`}
            >
              {t('subtitle')}
            </p>

            <div className="mt-8 md:mt-9 flex flex-wrap items-center gap-3">
              <TrackedLink
                href="/contact"
                event="hero_cta_clicked"
                eventProps={{ location: 'hero_primary' }}
                size="lg"
                variant="primary"
              >
                <MessageCircle className="size-4" />
                {t('cta_primary')}
                {isRtl ? (
                  <ArrowLeft className="size-4" aria-hidden />
                ) : (
                  <ArrowRight className="size-4" aria-hidden />
                )}
              </TrackedLink>
              <TrackedLink
                href="#case-studies"
                event="hero_secondary_cta_clicked"
                eventProps={{ location: 'hero_secondary' }}
                size="lg"
                variant="secondary"
              >
                <Play className="size-3.5" aria-hidden />
                {t('cta_secondary')}
              </TrackedLink>
            </div>

            {/* Inline trust line under the buttons */}
            <p className="mt-6 text-xs md:text-sm text-ink-500 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1 rounded-full bg-emerald-500" />
                {t('trust_line_1')}
              </span>
              <span className="text-ink-300">·</span>
              <span>{t('trust_line_2')}</span>
            </p>
          </FadeIn>

          {/* Chat preview — 5 cols on desktop */}
          <FadeIn delay={0.15} className="md:col-span-5">
            <HeroChat locale={isRtl ? 'ar' : 'en'} />
          </FadeIn>
        </div>
      </div>

      {/* Trust bar — slim band of proof points just below the hero */}
      <FadeIn delay={0.3} className="relative z-10 border-t border-ink-900/5 bg-paper/80 backdrop-blur-sm">
        <div className="container-page py-5 md:py-6">
          <ul className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <TrustItem
              icon={ShieldCheck}
              title={t('trust_meta')}
              detail={t('trust_meta_sub')}
            />
            <TrustItem
              icon={Cpu}
              title={t('trust_ai')}
              detail={t('trust_ai_sub')}
            />
            <TrustItem
              icon={Globe}
              title={t('trust_local')}
              detail={t('trust_local_sub')}
            />
            <TrustItem
              icon={Clock}
              title={t('trust_247')}
              detail={t('trust_247_sub')}
            />
          </ul>
        </div>
      </FadeIn>
    </section>
  );
}

function TrustItem({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof ShieldCheck;
  title: string;
  detail: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="inline-flex items-center justify-center size-9 rounded-lg bg-sage-50 text-sage-700 shrink-0">
        <Icon className="size-4" strokeWidth={1.8} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink-900 leading-tight">{title}</p>
        <p className="text-xs text-ink-500 leading-snug mt-0.5">{detail}</p>
      </div>
    </li>
  );
}
