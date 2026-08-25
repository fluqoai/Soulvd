import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type MarqueeProps = {
  children: ReactNode;
  /** Seconds for one full loop. Lower = faster. */
  speed?: number;
  className?: string;
};

/**
 * Continuous horizontal logo strip.
 * The children are rendered twice inside the track; CSS animates
 * the track by -50% (or +50% in RTL) so the loop is seamless.
 *
 * Respects `prefers-reduced-motion` via CSS (pauses the animation).
 */
export function Marquee({ children, speed = 36, className }: MarqueeProps) {
  const style = { '--marquee-duration': `${speed}s` } as CSSProperties;

  return (
    <div className={cn('marquee-mask', className)} style={style}>
      <div className="marquee-track" aria-hidden={false}>
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
