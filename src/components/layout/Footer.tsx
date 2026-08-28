import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Phone, Mail, MapPin, Clock, ShieldCheck } from 'lucide-react';

// === Single source of truth for Soulvd's contact data ===
// If you ever want to override at deploy time, mirror these into
// env vars (NEXT_PUBLIC_WHATSAPP_NUMBER, NEXT_PUBLIC_CONTACT_EMAIL, ...).
const PHONE_DISPLAY = '05 696 688 73';
const PHONE_INTL = '+966569668873';      // E.164 — tel: links
const PHONE_WA = '966569668873';          // digits-only — wa.me links
const CONTACT_EMAIL = 'info@soulvd.sa';
const CR_NUMBER = '7054075218';           // السجل التجاري
const TAX_NUMBER = '314295103800003';     // الرقم الضريبي
const WA_GREEN = '#25D366';

// Real WhatsApp glyph (Lucide doesn't ship one).
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

// Small section heading with a sage dot — subtle, intentional, RTL-safe.
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <span className="size-1.5 rounded-full bg-sage-500" aria-hidden />
      <h3 className="text-sm font-semibold text-linen-50">{children}</h3>
    </div>
  );
}

// Icon-based contact row. `accent="whatsapp"` paints the icon tile in
// WhatsApp green so the row is self-identifying without a text label.
function ContactRow({
  icon: Icon,
  href,
  external = false,
  isLtr = false,
  accent = 'sage',
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  external?: boolean;
  isLtr?: boolean;
  accent?: 'sage' | 'whatsapp';
  children: React.ReactNode;
}) {
  const tile =
    accent === 'whatsapp'
      ? 'bg-[#25D366]/10 text-[#25D366] group-hover:bg-[#25D366]/20'
      : 'bg-linen-50/[0.04] text-sage-300 group-hover:bg-linen-50/[0.08] group-hover:text-sage-200';

  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer noopener' : undefined}
      dir={isLtr ? 'ltr' : undefined}
      className="group flex items-center gap-3 py-1 text-linen-200 hover:text-paper transition-colors"
    >
      <span
        className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors ${tile}`}
        aria-hidden
      >
        <Icon className="size-[1.05rem]" />
      </span>
      <span className="text-sm font-medium leading-tight">{children}</span>
    </a>
  );
}

// Non-clickable variant for address / hours — same shape, no underline on hover.
function ContactStatic({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="group flex items-center gap-3 py-1 text-linen-300">
      <span
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-linen-50/[0.04] text-sage-300"
        aria-hidden
      >
        <Icon className="size-[1.05rem]" />
      </span>
      <span className="text-sm leading-tight">{children}</span>
    </div>
  );
}

export async function Footer() {
  const t = await getTranslations('footer');
  const tNav = await getTranslations('nav');
  const tSite = await getTranslations('site');
  const tInfo = await getTranslations('contact.info');

  const navItems: { href: '/' | '/services' | '/sectors' | '/about' | '/contact'; label: string }[] = [
    { href: '/', label: tNav('home') },
    { href: '/services', label: tNav('services') },
    { href: '/sectors', label: tNav('sectors') },
    { href: '/about', label: tNav('about') },
    { href: '/contact', label: tNav('contact') },
  ];

  return (
    <footer className="bg-ink-900 text-linen-100">
      {/* pb-32 / md:pb-28 — clear the floating WhatsApp button (56px + 24px gap). */}
      <div className="container-page pt-16 md:pt-20 pb-32 md:pb-28">
        {/* ==== Top: 3-column grid (brand · quick links · contact) ==== */}
        <div className="grid gap-12 md:grid-cols-12 md:gap-10">
          {/* Brand — 5/12 on desktop, full on mobile */}
          <div className="md:col-span-5">
            <Link href="/" className="inline-block mb-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sage-400 rounded-md" aria-label={tSite('name')}>
              <Image
                src="/brand/soulvd-logo-white.png"
                alt={tSite('name')}
                width={240}
                height={64}
                style={{ width: 'auto', height: 'auto' }}
                className="h-10 md:h-12"
              />
            </Link>
            <p className="text-sm leading-relaxed text-linen-300 max-w-md text-pretty">
              {t('description')}
            </p>
          </div>

          {/* Quick links — 3/12 on desktop */}
          <div className="md:col-span-3">
            <SectionHeading>{t('quick_links')}</SectionHeading>
            <ul className="space-y-2.5 text-sm">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block py-1 text-linen-200 hover:text-paper transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact — 4/12 on desktop, icon-based rows */}
          <div className="md:col-span-4">
            <SectionHeading>{t('contact_heading')}</SectionHeading>
            <div className="space-y-1.5">
              <ContactRow icon={Phone} href={`tel:${PHONE_INTL}`} isLtr>
                {PHONE_DISPLAY}
              </ContactRow>
              <ContactRow
                icon={WhatsAppIcon}
                href={`https://wa.me/${PHONE_WA}`}
                external
                isLtr
                accent="whatsapp"
              >
                {PHONE_DISPLAY}
              </ContactRow>
              <ContactRow icon={Mail} href={`mailto:${CONTACT_EMAIL}`} isLtr>
                {CONTACT_EMAIL}
              </ContactRow>
              <ContactStatic icon={MapPin}>{tInfo('address')}</ContactStatic>
              <ContactStatic icon={Clock}>{tInfo('hours')}</ContactStatic>
            </div>
          </div>
        </div>

        {/* ==== Trust block: CR + VAT + Ministry of Commerce emblem ==== */}
        <div className="mt-14 md:mt-16 pt-10 border-t border-linen-400/15">
          <div className="rounded-2xl bg-gradient-to-br from-ink-800/70 to-ink-900 border border-linen-400/10 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.5)] p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
              {/* Numbers (RTL start → on the right of the logo on desktop) */}
              <div className="order-2 md:order-1 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 w-full text-center md:text-start">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-linen-400">
                    {t('cr_label')}
                  </p>
                  <p
                    dir="ltr"
                    className="mt-2 text-2xl md:text-[1.7rem] leading-none font-display tabular-nums tracking-wide text-paper"
                  >
                    {CR_NUMBER}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-linen-400">
                    {t('tax_label')}
                  </p>
                  <p
                    dir="ltr"
                    className="mt-2 text-2xl md:text-[1.7rem] leading-none font-display tabular-nums tracking-wide text-paper"
                  >
                    {TAX_NUMBER}
                  </p>
                </div>
              </div>

              {/* MoC emblem (RTL end → on the left on desktop, top on mobile) */}
              <div className="order-1 md:order-2 shrink-0">
                <div
                  className="bg-linen-50 rounded-2xl p-3.5 ring-1 ring-linen-400/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]"
                  title="وزارة التجارة"
                >
                  <Image
                    src="/brand/moc-logo.png"
                    alt="وزارة التجارة"
                    width={80}
                    height={80}
                    style={{ width: 'auto', height: 'auto' }}
                    className="h-16 md:h-20 w-auto"
                  />
                </div>
              </div>
            </div>

            {/* Verified caption */}
            <div className="mt-6 pt-5 border-t border-linen-400/10 flex items-center justify-center gap-2 text-xs text-linen-400">
              <ShieldCheck className="size-3.5 text-sage-400" aria-hidden />
              <span>{t('trust_caption')}</span>
            </div>
          </div>
        </div>

        {/* ==== Copyright ==== */}
        <div className="mt-10 text-center text-xs text-linen-400">
          <p>{t('rights')}</p>
        </div>
      </div>
    </footer>
  );
}
