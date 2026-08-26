import { cn } from '@/lib/utils';
import type { HTMLAttributes, ReactNode } from 'react';

type SectionProps = HTMLAttributes<HTMLElement> & {
  as?: 'section' | 'header' | 'footer' | 'main' | 'article';
  tone?: 'paper' | 'linen' | 'sage' | 'ink';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  eyebrow?: string;
  title?: string;
  description?: string;
  centered?: boolean;
  children?: ReactNode;
};

const toneClasses: Record<NonNullable<SectionProps['tone']>, string> = {
  paper: 'bg-paper text-ink-900',
  linen: 'bg-linen-100 text-ink-900',
  sage: 'bg-sage-50 text-ink-900',
  ink: 'bg-ink-900 text-paper',
};

const sizeClasses: Record<NonNullable<SectionProps['size']>, string> = {
  sm: 'py-12 md:py-16',
  md: 'py-16 md:py-24',
  lg: 'py-20 md:py-32',
  xl: 'py-24 md:py-40',
};

export function Section({
  as: As = 'section',
  tone = 'paper',
  size = 'md',
  eyebrow,
  title,
  description,
  centered = false,
  className,
  children,
  ...rest
}: SectionProps) {
  return (
    <As className={cn(toneClasses[tone], sizeClasses[size], className)} {...rest}>
      <div className="container-page">
        {(eyebrow || title || description) && (
          <header
            className={cn(
              'mb-10 md:mb-14 max-w-3xl',
              centered && 'mx-auto text-center'
            )}
          >
            {eyebrow && (
              <p className="text-xs md:text-sm font-medium uppercase tracking-[0.2em] text-sage-700 mb-3">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight text-balance">
                {title}
              </h2>
            )}
            {description && (
              <p
                className={cn(
                  'mt-4 text-base md:text-lg text-ink-600 leading-relaxed text-pretty',
                  centered && 'mx-auto'
                )}
              >
                {description}
              </p>
            )}
          </header>
        )}
        {children}
      </div>
    </As>
  );
}
