'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { FileType, Loader2, AlertCircle, Download } from 'lucide-react';
import { generateInvoiceDocx } from '@/lib/invoices/actions';

export function GenerateDocxButton({
  invoiceId,
  hasExisting,
}: {
  invoiceId: string;
  hasExisting: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [successPath, setSuccessPath] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    setWarning(null);
    setSuccessPath(null);
    startTransition(async () => {
      const r = await generateInvoiceDocx(invoiceId);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      if (r.warning) setWarning(r.warning);
      setSuccessPath(r.path);
      router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-ink-900 text-paper text-sm font-medium px-3 py-2 hover:bg-ink-800 disabled:opacity-60 transition-colors"
      >
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <FileType className="size-3.5" />}
        {isPending ? 'جاري التوليد…' : hasExisting ? 'إعادة توليد .docx' : 'توليد ملف .docx'}
      </button>

      {error && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1.5 flex items-start gap-1.5">
          <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
          <span>
            {error === 'no_template_assigned' ? 'لا يوجد قالب مرتبط بهذه الفاتورة'
              : error === 'template_not_found' ? 'القالب غير موجود'
              : error === 'template_download_failed' ? 'فشل تحميل القالب من التخزين'
              : error}
          </span>
        </p>
      )}

      {warning && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 flex items-start gap-1.5">
          <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
          <span>{warning}</span>
        </p>
      )}

      {successPath && !warning && (
        <p className="text-xs text-sage-800 bg-sage-50 border border-sage-200 rounded-md px-2 py-1.5 flex items-center gap-1.5">
          <Download className="size-3.5" /> تم التوليد — رابط التنزيل متاح أسفل الزر
        </p>
      )}
    </div>
  );
}
