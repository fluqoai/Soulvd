'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';

/**
 * Animates a number from 0 to `value` when the element scrolls into view.
 * Supports a `+` prefix and `%` suffix.
 */
type Props = {
  value: number;
  duration?: number;       // seconds
  prefix?: string;
  suffix?: string;
  className?: string;
};

export function CountUp({ value, duration = 1.6, prefix = '', suffix = '', className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(eased * value));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  return (
    <span ref={ref} className={className} dir="ltr">
      {prefix}
      {n.toLocaleString('en-US')}
      {suffix}
    </span>
  );
}
