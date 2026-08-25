import { cn } from '@/lib/utils';

/**
 * Decorative section label like Sikkah's:
 *   • • • ──── TITLE ──── • • •
 * Title is bilingual via the prop.
 */
type Props = {
  /** Bilingual: {ar, en}. The label uses the locale-aware variant at render time. */
  text: { ar: string; en: string };
  /** Pre-resolved label text (already picked based on locale). Used when the caller has already chosen. */
  children?: React.ReactNode;
  className?: string;
};

export function SectionLabel({ text, children, className }: Props) {
  return (
    <div className={cn('flex items-center justify-center gap-2 text-ink-500 max-w-screen-sm mx-auto w-full', className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      <span className="flex-1 h-px bg-current opacity-50" />
      <h2 className="text-xs md:text-sm font-semibold uppercase tracking-[0.3em]">
        {children ?? text.en}
      </h2>
      <span className="flex-1 h-px bg-current opacity-50" />
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
    </div>
  );
}
