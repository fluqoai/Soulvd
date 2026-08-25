import { getTranslations } from 'next-intl/server';
import { ShieldCheck, Clock, PlugZap, MessageCircle, type LucideIcon } from 'lucide-react';
import { Section } from '@/components/ui/Section';
import { ScrollReveal } from '@/components/motion/Motion';

const LICENSE_ICONS: Record<string, LucideIcon> = {
  'partner': ShieldCheck,
  'time': Clock,
  'integrations': PlugZap,
  'support': MessageCircle,
};

const VALUE_ICONS: Record<string, LucideIcon> = {
  local: MessageCircle,
  trust: ShieldCheck,
  outcomes: PlugZap,
  partnership: Clock,
};

export async function About() {
  const t = await getTranslations('about');
  const licenses = t.raw('licenses.items') as Array<{ label: string; value: string }>;
  const values = t.raw('values.items') as Array<{ key: string; title: string; description: string }>;

  return (
    <>
      <Section tone="paper" size="lg">
        <div className="max-w-3xl">
          <p className="text-xs md:text-sm font-medium uppercase tracking-[0.2em] text-sage-700 mb-3">
            {t('subtitle')}
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.1] tracking-tight text-ink-900 text-balance">
            {t('title')}
          </h1>
          <p className="mt-6 text-lg md:text-xl text-ink-600 leading-relaxed text-pretty">
            {t('intro')}
          </p>
        </div>
      </Section>

      <Section tone="linen" size="md" title={t('licenses.title')}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {licenses.map((lic, i) => (
            <ScrollReveal
              key={i}
              delay={i * 0.05}
              className="rounded-2xl bg-paper border border-ink-900/5 p-6 md:p-7"
            >
              <p className="text-2xl md:text-3xl font-semibold text-ink-900 tabular-nums">
                {lic.value}
              </p>
              <p className="mt-2 text-sm text-ink-600 leading-snug">{lic.label}</p>
            </ScrollReveal>
          ))}
        </div>
      </Section>

      <Section tone="paper" size="lg">
        <div className="grid gap-6 md:grid-cols-2">
          <ScrollReveal className="rounded-2xl bg-linen-100 border border-ink-900/5 p-8 md:p-10">
            <p className="text-xs uppercase tracking-[0.2em] text-sage-700 mb-3">
              {t('vision.title')}
            </p>
            <p className="text-base md:text-lg text-ink-700 leading-relaxed text-pretty">
              {t('vision.text')}
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.1} className="rounded-2xl bg-sage-50 border border-sage-200 p-8 md:p-10">
            <p className="text-xs uppercase tracking-[0.2em] text-sage-700 mb-3">
              {t('mission.title')}
            </p>
            <p className="text-base md:text-lg text-ink-700 leading-relaxed text-pretty">
              {t('mission.text')}
            </p>
          </ScrollReveal>
        </div>
      </Section>

      <Section
        tone="linen"
        size="lg"
        title={t('values.title')}
        description={t('values.subtitle')}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {values.map((value, i) => {
            const Icon = VALUE_ICONS[value.key] ?? MessageCircle;
            return (
              <ScrollReveal key={value.key} delay={i * 0.05} className="rounded-2xl bg-paper border border-ink-900/5 p-7">
                <div className="inline-flex size-10 items-center justify-center rounded-lg bg-sage-50 text-sage-700 mb-4">
                  <Icon className="size-5" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold text-ink-900 mb-2 leading-snug">
                  {value.title}
                </h3>
                <p className="text-sm text-ink-600 leading-relaxed">{value.description}</p>
              </ScrollReveal>
            );
          })}
        </div>
      </Section>
    </>
  );
}
