import { getTranslations } from 'next-intl/server';
import { Mail, Phone, MessageCircle, MapPin, Clock } from 'lucide-react';
import { Section } from '@/components/ui/Section';
import { Container } from '@/components/ui/Container';

export async function ContactInfo() {
  const t = await getTranslations('contact.info');

  const channels = [
    { icon: Mail, label: t('email_label'), value: 'mohammad@soulvd.net', href: 'mailto:mohammad@soulvd.net' },
    { icon: Phone, label: t('phone_label'), value: '05 696 688 73', href: 'tel:+966569668873' },
    { icon: MessageCircle, label: t('whatsapp_label'), value: '05 696 688 73', href: 'https://wa.me/966569668873' },
  ];

  return (
    <div className="rounded-2xl bg-linen-100 border border-ink-900/5 p-7 md:p-8">
      <h2 className="text-xl md:text-2xl font-semibold text-ink-900 mb-6 leading-tight">
        {t('title')}
      </h2>
      <div className="space-y-5">
        {channels.map((c, i) => {
          const Icon = c.icon;
          return (
            <a
              key={i}
              href={c.href}
              className="group flex items-start gap-3 text-ink-800 hover:text-ink-900"
              target={c.href.startsWith('http') ? '_blank' : undefined}
              rel={c.href.startsWith('http') ? 'noreferrer' : undefined}
            >
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-paper text-sage-700 group-hover:bg-sage-100 transition-colors">
                <Icon className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-ink-500">{c.label}</p>
                <p className="text-base font-medium truncate" dir="ltr">{c.value}</p>
              </div>
            </a>
          );
        })}

        <div className="flex items-start gap-3 text-ink-800">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-paper text-sage-700">
            <MapPin className="size-4" aria-hidden />
          </span>
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-500">{t('address_label')}</p>
            <p className="text-base font-medium">{t('address')}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 text-ink-800">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-paper text-sage-700">
            <Clock className="size-4" aria-hidden />
          </span>
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-500">{t('hours_label')}</p>
            <p className="text-base font-medium">{t('hours')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
