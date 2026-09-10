import { NextResponse } from 'next/server';

/**
 * Browser return target for Meta-hosted WhatsApp Embedded Signup.
 *
 * Keep this endpoint free of analytics and logs: Meta may append sensitive
 * OAuth values to the URL. The full token exchange and tenant persistence
 * will be added once the Meta app credentials and onboarding data model are
 * configured.
 */
export function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const hasError =
    requestUrl.searchParams.has('error') ||
    requestUrl.searchParams.has('error_code') ||
    requestUrl.searchParams.get('status') === 'failed';

  const destination = new URL('/whatsapp/connected', requestUrl.origin);
  destination.searchParams.set('status', hasError ? 'error' : 'success');

  return NextResponse.redirect(destination, {
    status: 303,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
