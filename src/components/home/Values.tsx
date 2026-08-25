import { getTranslations } from 'next-intl/server';
import {
  Clock,
  TrendingUp,
  MessageCircle,
  BarChart3,
  Wand2,
  ShieldCheck,
  PlugZap,
  type LucideIcon,
} from 'lucide-react';
import { Section } from '@/components/ui/Section';
import { ScrollReveal } from '@/components/motion/Motion';
import { cn } from '@/lib/utils';

type ValueItem = { key: string; title: string; description: string };

const ICON_MAP: Record<string, LucideIcon> = {
  instant: Clock,
  convert: TrendingUp,
  dialect: MessageCircle,
  analytics: BarChart3,
  'no-code': Wand2,
  licensed: ShieldCheck,
  integrations: PlugZap,
};

export async function Values() {
  const t = await getTranslations('home');
  const tSite = await getTranslations('site');
  const values = t.raw('values') as ValueItem[];

  return (
    <Section
      tone="linen"
      size="lg"
      eyebrow={tSite('name')}
      title={t('why.title')}
      description={t('why.subtitle')}
      centered
    >
      <div className="grid gap-px bg-ink-900/8 rounded-2xl overflow-hidden border border-ink-900/5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {values.map((value, i) => {
          const Icon = ICON_MAP[value.key] ?? MessageCircle;
          return (
            <ScrollReveal
              key={value.key}
              delay={i * 0.05}
              className="bg-paper p-7 md:p-8 h-full"
            >
              <div
                className={cn(
                  'inline-flex size-10 items-center justify-center rounded-lg mb-4',
                  'bg-sage-50 text-sage-700'
                )}
              >
                <Icon className="size-5" aria-hidden />
              </div>
              <h3 className="text-base md:text-lg font-semibold text-ink-900 mb-2 leading-snug">
                {value.title}
              </h3>
              <p className="text-sm text-ink-600 leading-relaxed">
                {value.description}
              </p>
            </ScrollReveal>
          );
        })}
      </div>
    </Section>
  );
}
