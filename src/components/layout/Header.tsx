import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { ButtonLink } from '@/components/ui/Button';
import { LocaleToggle } from './LocaleToggle';
import { MobileMenu } from './MobileMenu';

export async function Header() {
  const t = await getTranslations('nav');
  const tSite = await getTranslations('site');

  const items = [
    { href: '/', label: t('home') },
    { href: '/services', label: t('services') },
    { href: '/sectors', label: t('sectors') },
    { href: '/about', label: t('about') },
    { href: '/contact', label: t('contact') },
  ];

  return (
    <header className="sticky top-0 z-40 bg-paper/80 backdrop-blur-md border-b border-ink-900/5">
      <div className="container-page h-20 md:h-24 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 shrink-0"
          aria-label={tSite('name')}
        >
          <Image
            src="/brand/soulvd-mark.png"
            alt={tSite('name')}
            width={64}
            height={64}
            priority
            // Tell next/image to keep the intrinsic aspect ratio
            // when CSS sets only one dimension (here: height).
            style={{ width: 'auto', height: 'auto' }}
            className="h-12 md:h-14"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-1" aria-label="primary">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 text-sm font-medium text-ink-700 hover:text-ink-900 hover:bg-sage-50 rounded-md transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LocaleToggle className="hidden sm:inline-flex" />
          <ButtonLink href="/contact" size="sm" className="hidden sm:inline-flex">
            {t('contact')}
          </ButtonLink>
          <MobileMenu items={items} />
        </div>
      </div>
    </header>
  );
}
