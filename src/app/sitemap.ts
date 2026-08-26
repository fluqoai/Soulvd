import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';

/**
 * Dynamic sitemap. Generates entries for every public route in
 * every supported locale, with the right hreflang alternates.
 *
 * Excludes:
 *   - /admin (auth-gated, no SEO value)
 *   - /login (auth-gated)
 *   - /404 / /500 (Next.js conventions, not real routes)
 *   - /not-found (handled by Next.js)
 *
 * Static routes (about, services, sectors, contact) plus dynamic
 * sector slugs would be added here when those pages are wired up.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://soulvd.net';
  const now = new Date();

  const staticPaths = ['/', '/about', '/services', '/sectors', '/contact'];

  const entries: MetadataRoute.Sitemap = [];

  for (const path of staticPaths) {
    for (const locale of routing.locales) {
      // With `localePrefix: 'as-needed'`, '/' is Arabic (default),
      // '/en/...' is English.
      const url =
        locale === routing.defaultLocale
          ? `${base}${path === '/' ? '/' : path}`
          : `${base}/${locale}${path === '/' ? '' : path}`;

      entries.push({
        url,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: path === '/' ? 1.0 : 0.7,
        alternates: {
          languages: Object.fromEntries(
            routing.locales.map((l) => [
              l,
              l === routing.defaultLocale
                ? `${base}${path === '/' ? '/' : path}`
                : `${base}/${l}${path === '/' ? '' : path}`,
            ]),
          ),
        },
      });
    }
  }

  return entries;
}
