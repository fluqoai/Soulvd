'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { processAllDueRecurring } from '@/lib/projects/actions';

export function ProcessAllDueRecurring({ count }: { count: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ processed: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (typeof window !== 'undefined' && !window.confirm(`تجديد ${count} مشروع${count === 1 ? '' : 'ات'} دوري${count === 1 ? '' : 'ة'} الآن؟\nكل مشروع ينشئ مثيلاً جديداً + فاتورة مسودة إذا كانت auto_invoice مفعّلة.`)) return;
          startTransition(async () => {
            setError(null);
            setResult(null);
            const r = await processAllDueRecurring();
            if (!r.ok) {
              setError(r.error);
              return;
            }
            const failed = r.results.filter((x) => !x.ok).length;
            setResult({ processed: r.processed, failed });
            router.refresh();
          });
        }}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 text-paper text-sm font-medium hover:bg-purple-700 disabled:opacity-60 transition-colors"
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        {isPending ? 'جاري التجديد…' : `تجديد ${count} مشروع دوري`}
      </button>

      {result && (
        <div className="absolute end-0 top-full mt-2 z-30 w-80 rounded-lg border border-sage-200 bg-sage-50 p-3 text-xs text-sage-900 shadow-lg">
          <p className="font-semibold mb-1">
            تم تجديد {result.processed} مشروع
            {result.failed > 0 && ` · فشل ${result.failed}`}
          </p>
          <p className="text-sage-800">ستجد المشاريع الجديدة في قائمة المشاريع (الأحدث أولاً).</p>
          <button
            type="button"
            onClick={() => setResult(null)}
            className="mt-1.5 text-sage-700 hover:text-sage-800 underline"
          >
            إغلاق
          </button>
        </div>
      )}

      {error && (
        <div className="absolute end-0 top-full mt-2 z-30 w-72 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900 shadow-lg flex items-start gap-1.5">
          <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
