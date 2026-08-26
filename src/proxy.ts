import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';

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

export default function middleware(req: NextRequest) {
  const adminRedirect = adminLocaleRedirect(req);
  if (adminRedirect) return adminRedirect;
  return intl(req);
}

export const config = {
  // Match all paths except: api, _next, _vercel, files with extensions
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
