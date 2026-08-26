'use client';

import { useTransition } from 'react';
import { track } from '@/lib/analytics';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'accent';
type Size = 'sm' | 'md' | 'lg';

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-ink-900 text-paper hover:bg-ink-800 dark:bg-paper dark:text-ink-900 dark:hover:bg-linen-100',
  secondary:
    'border border-ink-900/15 bg-transparent text-ink-900 hover:bg-sage-50',
  ghost: 'text-ink-700 hover:bg-sage-50',
  accent: 'bg-sage-600 text-paper hover:bg-sage-700',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm rounded-md',
  md: 'h-11 px-6 text-base rounded-lg',
  lg: 'h-13 px-8 text-base rounded-lg',
};

type Props = {
  href: string;
  event: Parameters<typeof track>[0];
  eventProps?: Parameters<typeof track>[1];
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  /** If true, opens in new tab. */
  external?: boolean;
};

/**
 * Locale-aware <Link> that fires a tracking event on click.
 * Server-renderable (no client boundary needed for the link itself,
 * but the onClick handler makes it a client component).
 */
export function TrackedLink({
  href,
  event,
  eventProps,
  children,
  variant = 'primary',
  size = 'md',
  className,
  external,
}: Props) {
  // useTransition so the navigation isn't blocked by the tracker.
  const [, startTransition] = useTransition();

  const onClick = () => {
    track(event, eventProps);
  };

  const classes = cn(
    'inline-flex items-center justify-center gap-2 font-medium transition-colors',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-600',
    variantClasses[variant],
    sizeClasses[size],
    className
  );

  if (external || href.startsWith('http') || href.startsWith('wa.me')) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        onClick={onClick}
        className={classes}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href as never}
      onClick={() => startTransition(onClick)}
      className={classes}
    >
      {children}
    </Link>
  );
}
