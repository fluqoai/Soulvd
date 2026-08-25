import { getTranslations, getLocale } from 'next-intl/server';
import { ArrowRight, ArrowLeft, MessageCircle } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { FadeIn } from '@/components/motion/Motion';
import { HeroMark3D } from './HeroMark3D';

export async function Hero() {
  const t = await getTranslations('home.hero');
  const tSite = await getTranslations('site');
  const locale = await getLocale();
  const isRtl = locale === 'ar';

  return (
    <section className="relative overflow-hidden bg-linen-100">
      {/* 3D mark as full-bleed visual anchor */}
      <div className="absolute inset-0 z-0" aria-hidden>
        <HeroMark3D markUrl="/brand/soulvd-mark.png" />
      </div>

      {/* Soft linen wash on top so text reads */}
      <div
        className="absolute inset-0 z-[1] bg-gradient-to-b from-linen-100/40 via-linen-100/55 to-linen-100/85"
        aria-hidden
      />

      {/* Foreground content */}
      <div className="relative z-10 container-page pt-32 pb-20 md:pt-40 md:pb-32 min-h-[88vh] flex flex-col justify-end">
        <FadeIn className="max-w-3xl">
          <p className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-paper/70 backdrop-blur-sm border border-ink-900/10 text-sage-800 text-xs font-medium mb-6">
            <span className="size-1.5 rounded-full bg-sage-500" />
            {t('eyebrow')}
          </p>
          <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-semibold leading-[1.05] tracking-tight text-ink-900 text-balance">
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
                <ArrowLeft className="size-4" aria-hidden />
              ) : (
                <ArrowRight className="size-4" aria-hidden />
              )}
            </ButtonLink>
            <ButtonLink href="/services" size="lg" variant="secondary">
              {t('cta_secondary')}
            </ButtonLink>
          </div>
          <p className="mt-6 text-sm text-ink-500">
            {tSite('name')} · {tSite('tagline')}
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
