import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';

export async function Footer() {
  const t = await getTranslations('footer');
  const tNav = await getTranslations('nav');
  const tSite = await getTranslations('site');
  const tLang = await getTranslations('lang');

  return (
    <footer className="bg-ink-900 text-linen-100 mt-20">
      <div className="container-page py-16 md:py-20">
        <div className="grid gap-10 md:grid-cols-3 md:gap-16">
          <div>
            <Image
              src="/brand/soulvd-logo-white.png"
              alt={tSite('name')}
              width={240}
              height={64}
              // CSS sets height only; explicit `width: auto` keeps
              // the intrinsic aspect ratio and silences next/image.
              style={{ width: 'auto', height: 'auto' }}
              className="h-14 mb-4"
            />
            <p className="text-sm leading-relaxed text-linen-300 max-w-sm">
              {t('description')}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-linen-400 mb-4">
              {tNav('home')} · {tNav('services')} · {tNav('sectors')}
            </h3>
            <ul className="space-y-1 text-sm">
              <li>
                <Link href="/" className="block py-2.5 text-linen-200 hover:text-paper transition-colors">
                  {tNav('home')}
                </Link>
              </li>
              <li>
                <Link href="/services" className="block py-2.5 text-linen-200 hover:text-paper transition-colors">
                  {tNav('services')}
                </Link>
              </li>
              <li>
                <Link href="/sectors" className="block py-2.5 text-linen-200 hover:text-paper transition-colors">
                  {tNav('sectors')}
                </Link>
              </li>
              <li>
                <Link href="/about" className="block py-2.5 text-linen-200 hover:text-paper transition-colors">
                  {tNav('about')}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="block py-2.5 text-linen-200 hover:text-paper transition-colors">
                  {tNav('contact')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-linen-400 mb-4">
              {tNav('contact')}
            </h3>
            <p className="text-sm text-linen-200 leading-relaxed">
              <a
                href="https://wa.me/966500000000"
                className="block py-2.5 hover:text-paper transition-colors"
              >
                +966 50 000 0000
              </a>
              <a
                href="mailto:hello@soulvd.sa"
                className="block py-2.5 hover:text-paper transition-colors break-all"
              >
                hello@soulvd.sa
              </a>
            </p>
            <p className="mt-4 text-xs text-linen-400">
              {t('built_in_sa')}
            </p>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-linen-400/15 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-linen-400">
          <p>{t('rights')}</p>
          <p className="opacity-70">
            {tLang('ar')} / {tLang('en')}
          </p>
        </div>
      </div>
    </footer>
  );
}
