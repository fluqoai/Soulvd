import { setRequestLocale, getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { LoginForm } from '@/components/auth/LoginForm';
import { Link } from '@/i18n/routing';

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth.login');

  return (
    <div className="min-h-[calc(100vh-4rem)] flex">
      {/* Left: form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link href={`/${locale}`} className="inline-flex items-center mb-10 p-1 -m-1">
            <Image
              src="/brand/soulvd-logo.png"
              alt="Soulvd"
              width={140}
              height={32}
              // CSS `h-8` overrides one intrinsic dimension; explicit
              // `width: auto` keeps the aspect ratio. Avoids the
              // next/image "width or height modified" warning.
              style={{ width: 'auto', height: 'auto' }}
              className="h-8"
            />
          </Link>
          <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 leading-tight mb-2">
            {t('title')}
          </h1>
          <p className="text-base text-ink-600 mb-8">{t('subtitle')}</p>
          <LoginForm />
        </div>
      </div>

      {/* Right: brand panel (visible on md+) */}
      <div className="hidden md:flex flex-1 bg-ink-900 text-paper items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <Image
            src="/brand/soulvd-mark-white.png"
            alt=""
            fill
            // The brand mark on the login screen is the Largest
            // Contentful Paint on desktop, so load it eagerly.
            // On screens >= 768px the right panel is exactly half
            // the viewport width.
            sizes="(min-width: 768px) 50vw, 100vw"
            priority
            className="object-contain p-32"
          />
        </div>
        <div className="relative max-w-md text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-sage-300 mb-4">
            {t('brand_eyebrow')}
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold leading-tight text-balance">
            {t('brand_title')}
          </h2>
          <p className="mt-5 text-base text-linen-300 leading-relaxed text-pretty">
            {t('brand_subtitle')}
          </p>
        </div>
      </div>
    </div>
  );
}
