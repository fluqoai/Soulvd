'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { Repeat, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { processRecurring } from '@/lib/projects/actions';

/**
 * Button on a recurring project detail that creates the next instance.
 *  - If the project isn't due yet (next_occurrence_at > now), the button is disabled
 *    with an explanation.
 *  - On success, navigates to the new project.
 *  - If an invoice was auto-created, links to it in the success state.
 */
export function RenewNowButton({
  projectId,
}: {
  projectId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ newProjectId: string; invoiceId: string | null } | null>(null);
  const [showError, setShowError] = useState(false);

  const handleClick = (force = false) => {
    setError(null);
    setShowError(false);
    startTransition(async () => {
      const r = await processRecurring(projectId, { force });
      if (!r.ok) {
        setError(r.error);
        setShowError(true);
        return;
      }
      setSuccess({ newProjectId: r.projectId, invoiceId: r.invoiceId });
    });
  };

  if (success) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-lg border border-sage-300 bg-sage-50 px-3 py-1.5 text-sm">
        <Repeat className="size-3.5 text-sage-700" />
        <span className="text-sage-800 font-medium">تم التجديد</span>
        <button
          type="button"
          onClick={() => router.push(`/admin/projects/${success.newProjectId}`)}
          className="inline-flex items-center gap-1 text-sage-700 hover:text-sage-800 hover:underline font-medium"
        >
          فتح المشروع الجديد
          <ExternalLink className="size-3" />
        </button>
        {success.invoiceId && (
          <button
            type="button"
            onClick={() => router.push(`/admin/invoices/${success.invoiceId}`)}
            className="inline-flex items-center gap-1 text-sage-700 hover:text-sage-800 hover:underline"
          >
            · الفاتورة
            <ExternalLink className="size-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => handleClick(false)}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 text-paper text-sm font-medium hover:bg-purple-700 disabled:opacity-60 transition-colors"
        title="تجديد الآن (ينشئ المشروع التالي + فاتورة إذا كانت auto_invoice مفعّلة)"
      >
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Repeat className="size-3.5" />}
        {isPending ? 'جاري التجديد…' : 'تجديد الآن'}
      </button>

      {showError && error && (
        <div className="absolute end-0 top-full mt-2 z-30 w-72 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 shadow-lg">
          <p className="flex items-start gap-1.5 font-medium mb-1.5">
            <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
            <span>{error === 'not_due_yet' ? 'لم يحن موعد التجديد بعد' : error}</span>
          </p>
          {error === 'not_due_yet' && (
            <p className="text-amber-800 mb-2">التجديد التلقائي مفعّل في تاريخ محدد. إذا أردت التجديد الآن:</p>
          )}
          {error === 'not_due_yet' && (
            <button
              type="button"
              onClick={() => handleClick(true)}
              disabled={isPending}
              className="text-xs text-amber-900 hover:text-amber-950 underline underline-offset-2 font-medium"
            >
              تجديد قسري الآن
            </button>
          )}
        </div>
      )}
    </div>
  );
}
