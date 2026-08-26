/**
 * Tiny client-side event tracker.
 *
 * Currently logs to console + fires a `sendBeacon` to /api/track if
 * available. When you're ready, swap the body of `track()` to call
 * `posthog.capture()` or `window.va.track()` or whatever your
 * analytics provider of choice is. The function signature is the
 * public contract.
 *
 * All callers should be SSR-safe (the function is a no-op on the
 * server).
 */
type EventName =
  | 'hero_cta_clicked'
  | 'hero_secondary_cta_clicked'
  | 'case_studies_viewed'
  | 'form_submitted'
  | 'whatsapp_clicked'
  | 'sector_card_clicked';

type EventProps = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    va?: (event: string, props?: EventProps) => void;
    posthog?: { capture: (event: string, props?: EventProps) => void };
  }
}

export function track(event: EventName, props?: EventProps) {
  if (typeof window === 'undefined') return;

  // 1. Console log so dev can verify events fire
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log(`[track] ${event}`, props ?? {});
  }

  // 2. Fire to /api/track via sendBeacon (best-effort, no-await)
  try {
    const body = JSON.stringify({ event, props, ts: Date.now() });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', body);
    }
  } catch {
    // swallow — analytics must never break the page
  }

  // 3. Forward to whichever provider is on the window
  try {
    if (window.posthog) window.posthog.capture(event, props);
    if (window.va) window.va(event, props);
  } catch {
    // ignore
  }
}
