import { getTranslations } from 'next-intl/server';
import {
  Bot,
  Megaphone,
  Inbox,
  Workflow,
  LineChart,
  PlugZap,
  type LucideIcon,
  ArrowUpRight,
} from 'lucide-react';
import { Section } from '@/components/ui/Section';
import { ScrollReveal } from '@/components/motion/Motion';
import { Link } from '@/i18n/routing';

type ServiceItem = { key: string; title: string; description: string };

const ICON_MAP: Record<string, LucideIcon> = {
  bot: Bot,
  campaigns: Megaphone,
  inbox: Inbox,
  flows: Workflow,
  analytics: LineChart,
  integrations: PlugZap,
};

export async function Services() {
  const t = await getTranslations('home');
  const tNav = await getTranslations('nav');
  const services = t.raw('serviceList') as ServiceItem[];

  return (
    <Section tone="paper" size="lg" title={t('services.title')} description={t('services.subtitle')}>
      <div className="grid gap-4 md:gap-5 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service, i) => {
          const Icon = ICON_MAP[service.key] ?? Bot;
          return (
            <ScrollReveal key={service.key} delay={i * 0.05}>
              <article className="group relative h-full rounded-2xl border border-ink-900/8 bg-paper p-7 transition-colors hover:border-sage-300">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="inline-flex size-11 items-center justify-center rounded-lg bg-linen-100 text-ink-800">
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <ArrowUpRight
                    className="size-5 text-ink-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:group-hover:translate-x-0 rtl:group-hover:-translate-x-0.5"
                    aria-hidden
                  />
                </div>
                <h3 className="text-lg font-semibold text-ink-900 mb-2 leading-snug">
                  {service.title}
                </h3>
                <p className="text-sm text-ink-600 leading-relaxed">
                  {service.description}
                </p>
              </article>
            </ScrollReveal>
          );
        })}
      </div>
      <div className="mt-10 text-center">
        <Link
          href="/services"
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-800 underline-offset-4 hover:underline"
        >
          {tNav('services')} →
        </Link>
      </div>
    </Section>
  );
}
