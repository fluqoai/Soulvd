'use client';

import { useEffect, useRef } from 'react';
import { track } from '@/lib/analytics';

type Props = {
  /** Analytics event name to fire when the parent scrolls into view. */
  event: Parameters<typeof track>[0];
  /** Extra props attached to the event. */
  eventProps?: Parameters<typeof track>[1];
  /**
   * Fraction of element visible before firing. Defaults to 0.4 —
   * "at least 40% on screen" is the conventional threshold.
   */
  threshold?: number;
  /** If true, fire every time the element re-enters view. */
  repeat?: boolean;
};

/**
 * Invisible analytics sentinel. Drop it inside a section to fire
 * an event when the user actually sees that section.
 *
 * Respects `prefers-reduced-motion` (the IntersectionObserver still
 * fires, the page just doesn't animate).
 */
export function ViewTracker({
  event,
  eventProps,
  threshold = 0.4,
  repeat = false,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!fired.current || repeat) {
              fired.current = true;
              track(event, eventProps);
            }
          } else if (repeat) {
            fired.current = false;
          }
        }
      },
      { threshold }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [event, eventProps, threshold, repeat]);

  return <div ref={ref} aria-hidden style={{ height: 1, width: 1 }} />;
}
