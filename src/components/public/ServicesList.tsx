import { getTranslations } from 'next-intl/server';
import { Check } from 'lucide-react';
import {
  Bot,
  Megaphone,
  Inbox,
  Workflow,
  LineChart,
  PlugZap,
  type LucideIcon,
} from 'lucide-react';
import { Section } from '@/components/ui/Section';
import { ScrollReveal } from '@/components/motion/Motion';

type ServiceItem = {
  key: string;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
};

const ICON_MAP: Record<string, LucideIcon> = {
  Bot,
  Megaphone,
  Inbox,
  Workflow,
  LineChart,
  PlugZap,
};

export async function ServicesList() {
  const t = await getTranslations('services');
  const services = t.raw('detailedList') as ServiceItem[];

  return (
    <Section
      tone="paper"
      size="lg"
      title={t('title')}
      description={t('subtitle')}
    >
      <div className="space-y-12 md:space-y-16">
        {services.map((service, i) => {
          const Icon = ICON_MAP[service.icon] ?? Bot;
          const isEven = i % 2 === 0;
          return (
            <ScrollReveal
              key={service.key}
              delay={i * 0.04}
              className="grid gap-8 md:grid-cols-12 md:items-start"
            >
              <div className={`md:col-span-5 ${isEven ? 'md:order-1' : 'md:order-2'}`}>
                <div className="inline-flex size-12 items-center justify-center rounded-xl bg-sage-50 text-sage-700 mb-5">
                  <Icon className="size-6" aria-hidden />
                </div>
                <h2 className="text-2xl md:text-3xl font-semibold text-ink-900 leading-tight text-balance">
                  {service.title}
                </h2>
                <p className="mt-3 text-base md:text-lg text-ink-600 leading-relaxed text-pretty">
                  {service.subtitle}
                </p>
              </div>
              <div className={`md:col-span-7 ${isEven ? 'md:order-2' : 'md:order-1'}`}>
                <div className="rounded-2xl bg-linen-100 border border-ink-900/5 p-7 md:p-8">
                  <p className="text-base text-ink-700 leading-relaxed mb-6 text-pretty">
                    {service.description}
                  </p>
                  <ul className="space-y-3">
                    {service.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-3 text-sm text-ink-700">
                        <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-700 mt-0.5">
                          <Check className="size-3" aria-hidden />
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </ScrollReveal>
          );
        })}
      </div>
    </Section>
  );
}
