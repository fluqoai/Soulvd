import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';

// Soulvd official contact — single source of truth.
// Mirror these into .env (NEXT_PUBLIC_WHATSAPP_NUMBER, NEXT_PUBLIC_CONTACT_EMAIL)
// if you ever want to override at deploy time.
const PHONE_DISPLAY = '05 696 688 73';
const PHONE_INTL = '+966569668873';          // E.164 — used in tel: and wa.me
const PHONE_WA = '966569668873';              // digits-only for wa.me
const CONTACT_EMAIL = 'mohammad@soulvd.net';
const CR_NUMBER = '7054075218';               // السجل التجاري
const TAX_NUMBER = '314295103800003';         // الرقم الضريبي

export async function Footer() {
  const t = await getTranslations('footer');
  const tNav = await getTranslations('nav');
  const tSite = await getTranslations('site');

  const navItems: { href: '/' | '/services' | '/sectors' | '/about' | '/contact'; label: string }[] = [
    { href: '/', label: tNav('home') },
    { href: '/services', label: tNav('services') },
    { href: '/sectors', label: tNav('sectors') },
    { href: '/about', label: tNav('about') },
    { href: '/contact', label: tNav('contact') },
  ];

  return (
    <footer className="bg-ink-900 text-linen-100 mt-20">
      <div className="container-page py-12 md:py-16">
        {/* Main grid: brand | nav | contact */}
        <div className="grid gap-10 md:grid-cols-12 md:gap-10">
          {/* Brand + description */}
          <div className="md:col-span-5">
            <Image
              src="/brand/soulvd-logo-white.png"
              alt={tSite('name')}
              width={240}
              height={64}
              // Keep intrinsic aspect ratio when CSS sets height only —
              // also silences next/image's missing-sizes warning.
              style={{ width: 'auto', height: 'auto' }}
              className="h-12 md:h-14 mb-4"
            />
            <p className="text-sm leading-relaxed text-linen-300 max-w-sm">
              {t('description')}
            </p>
          </div>

          {/* Quick links */}
          <div className="md:col-span-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-linen-400 mb-3">
              {tNav('home')} · {tNav('services')} · {tNav('sectors')}
            </h3>
            <ul className="space-y-0.5 text-sm">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block py-2 text-linen-200 hover:text-paper transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="md:col-span-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-linen-400 mb-3">
              {tNav('contact')}
            </h3>
            <ul className="space-y-1 text-sm">
              <li>
                <a
                  href={`tel:${PHONE_INTL}`}
                  dir="ltr"
                  className="block py-2 text-linen-200 hover:text-paper transition-colors font-mono"
                >
                  {PHONE_DISPLAY}
                </a>
              </li>
              <li>
                <a
                  href={`https://wa.me/${PHONE_WA}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  dir="ltr"
                  className="block py-2 text-linen-200 hover:text-paper transition-colors font-mono"
                >
                  WhatsApp · {PHONE_DISPLAY}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  dir="ltr"
                  className="block py-2 text-linen-200 hover:text-paper transition-colors break-all"
                >
                  {CONTACT_EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Trust row: CR + tax + وزارة التجارة logo */}
        <div className="mt-10 pt-8 border-t border-linen-400/15">
          <div className="flex flex-col sm:flex-row items-center sm:items-center justify-between gap-6 sm:gap-8">
            {/* Numbers — center on mobile, left on desktop */}
            <div className="text-center sm:text-start text-xs text-linen-300 space-y-1.5">
              <p>
                <span className="text-linen-400">{t('cr_label')}: </span>
                <span dir="ltr" className="font-mono tracking-wide text-linen-100">
                  {CR_NUMBER}
                </span>
              </p>
              <p>
                <span className="text-linen-400">{t('tax_label')}: </span>
                <span dir="ltr" className="font-mono tracking-wide text-linen-100">
                  {TAX_NUMBER}
                </span>
              </p>
            </div>

            {/* Ministry of Commerce emblem — light tile so the green pops on dark bg */}
            <div className="flex items-center gap-3 shrink-0">
              <div
                className="bg-linen-50 rounded-xl p-2.5 ring-1 ring-linen-400/20 shadow-sm"
                aria-label="وزارة التجارة"
                title="وزارة التجارة"
              >
                <Image
                  src="/brand/moc-logo.png"
                  alt="وزارة التجارة"
                  width={56}
                  height={56}
                  style={{ width: 'auto', height: 'auto' }}
                  className="h-12 md:h-14 w-auto"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Copyright — full width, no language toggle (per request) */}
        <div className="mt-8 pt-6 border-t border-linen-400/15">
          <p className="text-xs text-linen-400 text-center">
            {t('rights')}
          </p>
        </div>
      </div>
    </footer>
  );
}
