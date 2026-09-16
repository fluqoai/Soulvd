import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const intl = createMiddleware(routing);

/**
 * The admin section is always Arabic. If anyone hits /en/admin or
 * /en/login, redirect them to the default-locale Arabic version.
 * The site-wide next-intl middleware would otherwise happily serve
 * the English page for /en/admin.
 */
function adminLocaleRedirect(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Only act on /en prefix; /ar, /, or anything else is left alone
  if (pathname === '/en/admin' || pathname.startsWith('/en/admin/') ||
      pathname === '/en/login' || pathname.startsWith('/en/login/')) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.replace(/^\/en/, '') || '/';
    return NextResponse.redirect(url);
  }
  return null;
}

export default async function middleware(req: NextRequest) {
  const adminRedirect = adminLocaleRedirect(req);
  if (adminRedirect) return adminRedirect;
  // Refresh only authenticated surfaces; public marketing remains independent.
  const authenticatedSurface = /^\/(?:ar\/|en\/)?(?:app|admin|login)(?:\/|$)/.test(req.nextUrl.pathname);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!authenticatedSurface || !url || !key) return intl(req);

  const refreshedCookies: { name: string; value: string; options: CookieOptions }[] = [];
  const refreshHeaders = new Headers();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll(cookies, headers) {
        for (const cookie of cookies) {
          req.cookies.set(cookie.name, cookie.value);
          refreshedCookies.push(cookie);
        }
        for (const [name, value] of Object.entries(headers ?? {})) refreshHeaders.set(name, value);
      },
    },
  });
  await supabase.auth.getClaims();
  const response = intl(req);
  if (refreshedCookies.length) {
    // Preserve next-intl's locale rewrite and request headers while forwarding
    // the refreshed cookie header to the current Server Component request.
    const forwarded = NextResponse.next({ request: { headers: req.headers } });
    const overrides = new Set((response.headers.get('x-middleware-override-headers') ?? '').split(',').filter(Boolean));
    for (const [name, value] of forwarded.headers) {
      if (name.startsWith('x-middleware-request-')) {
        response.headers.set(name, value);
        overrides.add(name.slice('x-middleware-request-'.length));
      }
    }
    response.headers.set('x-middleware-override-headers', [...overrides].join(','));
    for (const cookie of refreshedCookies) response.cookies.set(cookie.name, cookie.value, cookie.options);
    for (const [name, value] of refreshHeaders) response.headers.set(name, value);
  }
  return response;
}

export const config = {
  // Match all paths except: api, _next, _vercel, files with extensions
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
