/**
 * Route-level loading skeleton for the [locale] segment.
 * Shown while server components are resolving (Supabase calls,
 * translations, etc.). Branded — same colors as the rest of the
 * site so the transition feels intentional.
 */
export default function Loading() {
  return (
    <div className="min-h-[60vh] grid place-items-center" aria-busy="true">
      <div className="flex flex-col items-center gap-4">
        {/* Pulsing brand mark */}
        <svg
          className="size-12 text-sage-600 animate-pulse"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          aria-hidden
        >
          <path d="M12 2 L21 7 L21 17 L12 22 L3 17 L3 7 Z" />
        </svg>
        <p className="text-sm text-ink-500">جاري التحميل…</p>
      </div>
    </div>
  );
}
