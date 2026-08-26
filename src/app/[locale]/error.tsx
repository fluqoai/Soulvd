'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/routing';

/**
 * Route-level error boundary. Catches unhandled errors from
 * server components in the [locale] tree (Supabase outages, etc.)
 * and renders a friendly message + a retry button.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production, ship to Sentry/PostHog here. For now, log.
    console.error('[LocaleError]', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] grid place-items-center px-6">
      <div className="max-w-md text-center">
        <div className="inline-flex size-14 items-center justify-center rounded-full bg-red-50 text-red-700 mb-5">
          <svg
            className="size-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>
        <h2 className="text-2xl md:text-3xl font-semibold text-ink-900 mb-3">
          حدث خطأ غير متوقع
        </h2>
        <p className="text-base text-ink-700 leading-relaxed mb-6">
          الصفحة لم تكتمل تحميلها. حاول مرة أخرى، أو ارجع للصفحة الرئيسية.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center h-11 px-6 rounded-lg bg-ink-900 text-paper hover:bg-ink-800 transition-colors"
          >
            إعادة المحاولة
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center h-11 px-6 rounded-lg border border-ink-900/15 text-ink-900 hover:bg-sage-50 transition-colors"
          >
            الصفحة الرئيسية
          </a>
        </div>
        {error.digest && (
          <p className="mt-6 text-xs text-ink-400 font-mono">
            code: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
