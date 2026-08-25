import { getTranslations, getLocale } from 'next-intl/server';
import { ArrowRight, ArrowLeft, MessageCircle, ArrowDown } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { FadeIn } from '@/components/motion/Motion';
import { HeroMark3D } from './HeroMark3D';

export async function Hero() {
  const t = await getTranslations('home.hero');
  const tSite = await getTranslations('site');
  const locale = await getLocale();
  const isRtl = locale === 'ar';

  return (
    <section className="relative overflow-hidden bg-linen-100 isolate">
      {/* Soft animated grain — pure CSS, no perf cost */}
      <div
        className="absolute inset-0 z-[1] opacity-[0.04] mix-blend-multiply pointer-events-none"
        aria-hidden
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.7'/></svg>\")",
        }}
      />

      {/* Subtle circuit grid — fixed-position lines that suggest the brand's identity */}
      <svg
        className="absolute inset-0 z-[1] w-full h-full opacity-[0.07] pointer-events-none"
        aria-hidden
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="hex-grid" x="0" y="0" width="80" height="92" patternUnits="userSpaceOnUse">
            <path
              d="M40 0 L80 23 L80 69 L40 92 L0 69 L0 23 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.6"
              className="text-ink-900"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hex-grid)" />
      </svg>

      {/* 3D mark as full-bleed visual anchor */}
      <div className="absolute inset-0 z-0" aria-hidden>
        <HeroMark3D markUrl="/brand/soulvd-mark.png" />
      </div>

      {/* Soft linen wash that fades top → bottom for text readability */}
      <div
        className="absolute inset-0 z-[1] bg-gradient-to-b from-linen-100/30 via-linen-100/45 to-linen-100/80 pointer-events-none"
        aria-hidden
      />
      {/* Extra soft glow behind the text for legibility */}
      <div
        className="absolute inset-y-0 start-0 z-[1] w-full md:w-2/3 bg-gradient-to-e from-linen-100/90 via-linen-100/60 to-transparent pointer-events-none"
        aria-hidden
      />

      {/* Foreground content */}
      <div className="relative z-10 container-page pt-28 pb-24 md:pt-40 md:pb-32 min-h-[92vh] flex flex-col justify-between">
        <FadeIn className="max-w-3xl pt-4">
          <p className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-paper/80 backdrop-blur-sm border border-ink-900/10 text-sage-800 text-xs font-medium mb-6">
            <span className="size-1.5 rounded-full bg-sage-500 animate-pulse" />
            {t('eyebrow')}
          </p>
          <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-semibold leading-[1.02] tracking-tight text-ink-900 text-balance">
            {t('title')}
          </h1>
          <p className="mt-6 text-lg md:text-xl text-ink-700 leading-relaxed max-w-2xl text-pretty">
            {t('subtitle')}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink href="#contact" size="lg" variant="primary">
              <MessageCircle className="size-4" />
              {t('cta_primary')}
              {isRtl ? (
                <ArrowLeft className="size-4 rtl:rotate-0" aria-hidden />
              ) : (
                <ArrowRight className="size-4" aria-hidden />
              )}
            </ButtonLink>
            <ButtonLink href="/services" size="lg" variant="secondary">
              {t('cta_secondary')}
            </ButtonLink>
          </div>
        </FadeIn>

        <FadeIn delay={0.4} className="flex items-end justify-between gap-4 pb-2">
          <p className="text-sm text-ink-500">
            {tSite('name')} · {tSite('tagline')}
          </p>
          <a
            href="#partners"
            className="hidden md:inline-flex flex-col items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-ink-500 hover:text-ink-900 transition-colors"
          >
            <span>Scroll</span>
            <ArrowDown className="size-3.5 animate-bounce" />
          </a>
        </FadeIn>
      </div>
    </section>
  );
}
