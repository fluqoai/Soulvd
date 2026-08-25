import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { ArrowRight, ArrowLeft, MessageCircle } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { FadeIn } from '@/components/motion/Motion';
import { Link } from '@/i18n/routing';

export async function Hero() {
  const t = await getTranslations('home.hero');
  const tSite = await getTranslations('site');

  // RTL: in Arabic the primary action points left, in English it points right.
  // We hard-pick by current locale via the layout, but use logical classes here.
  return (
    <section className="relative overflow-hidden bg-paper">
      <div className="container-page pt-12 pb-20 md:pt-20 md:pb-32">
        <div className="grid gap-10 md:gap-16 md:grid-cols-12 md:items-center">
          <FadeIn className="md:col-span-7">
            <p className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sage-50 border border-sage-200 text-sage-800 text-xs font-medium mb-6">
              <span className="size-1.5 rounded-full bg-sage-500" />
              {t('eyebrow')}
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.1] tracking-tight text-ink-900 text-balance">
              {t('title')}
            </h1>
            <p className="mt-6 text-lg md:text-xl text-ink-600 leading-relaxed max-w-2xl text-pretty">
              {t('subtitle')}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/contact" size="lg" variant="primary">
                <MessageCircle className="size-4" />
                {t('cta_primary')}
                <ArrowIcon />
              </ButtonLink>
              <ButtonLink href="/services" size="lg" variant="secondary">
                {t('cta_secondary')}
              </ButtonLink>
            </div>
            <p className="mt-6 text-sm text-ink-500">
              {tSite('name')} · {tSite('tagline')}
            </p>
          </FadeIn>

          <FadeIn delay={0.15} className="md:col-span-5">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-linen-100 border border-ink-900/5 p-6">
              <Image
                src="/brand/soulvd-mark.png"
                alt={tSite('name')}
                fill
                sizes="(min-width: 768px) 40vw, 90vw"
                className="object-contain p-2"
              />
              <div className="absolute inset-x-6 bottom-6 rounded-lg bg-paper/95 backdrop-blur-sm border border-ink-900/5 p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-full bg-sage-100 grid place-items-center">
                    <MessageCircle className="size-4 text-sage-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-900 truncate">
                      WhatsApp Business · Online
                    </p>
                    <p className="text-xs text-ink-500 truncate">
                      replying in &lt; 3s · Saudi dialect
                    </p>
                  </div>
                  <span className="size-2 rounded-full bg-sage-500" />
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

function ArrowIcon() {
  // In Arabic the arrow points left, in English right.
  // We use the logical `ms-` style margin and a static component that
  // relies on the document direction. The icon swap is handled via the
  // current locale — keeping it simple here.
  return <ArrowRight className="size-4 rtl:hidden" aria-hidden />;
}
