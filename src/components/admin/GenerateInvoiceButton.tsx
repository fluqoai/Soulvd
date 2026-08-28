'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { Receipt, Loader2, AlertCircle } from 'lucide-react';
import { generateInvoiceFromProject } from '@/lib/invoices/actions';

type Template = { id: string; name: string; type: string };

/**
 * Button on the project detail that opens a small popover to
 * generate a draft invoice from the project's billable time entries.
 *
 * - If no billable time entries exist, button is disabled.
 * - If no invoice template exists, button still works (just won't generate .docx later).
 */
export function GenerateInvoiceButton({
  projectId,
  projectName,
  templates,
  hasBillableTime,
}: {
  projectId: string;
  projectName: string;
  templates: Template[];
  hasBillableTime: boolean;
}) {
  const router = useRouter();
  const [showPopover, setShowPopover] = useState(false);
  const [templateId, setTemplateId] = useState<string>('');
  const [vatRate, setVatRate] = useState<string>('15');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const invoiceTemplates = templates.filter((t) => t.type === 'invoice');

  const handleGenerate = () => {
    setError(null);
    startTransition(async () => {
      const r = await generateInvoiceFromProject(projectId, {
        template_id: templateId || undefined,
        vat_rate: Number(vatRate) || 15,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setShowPopover(false);
      router.push(`/admin/invoices/${r.id}`);
    });
  };

  if (!hasBillableTime) {
    return (
      <button
        type="button"
        disabled
        title="لا توجد سجلات وقت قابلة للفوترة (تحتاج سعر ساعة)"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ink-900/10 text-sm font-medium text-ink-400 cursor-not-allowed"
      >
        <Receipt className="size-3.5" /> توليد فاتورة
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowPopover((v) => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sage-600 text-paper text-sm font-medium hover:bg-sage-700 transition-colors"
      >
        <Receipt className="size-3.5" /> توليد فاتورة من السجلات
      </button>

      {showPopover && (
        <>
          {/* backdrop */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setShowPopover(false)}
            aria-hidden
          />
          <div
            className="absolute end-0 top-full mt-2 z-40 w-80 rounded-xl border border-ink-900/10 bg-paper shadow-xl p-4 space-y-3"
            role="dialog"
            aria-label="توليد فاتورة"
          >
            <div>
              <h3 className="text-sm font-semibold text-ink-900">توليد فاتورة</h3>
              <p className="text-xs text-ink-600 mt-0.5">
                من السجلات القابلة للفوترة في مشروع &laquo;{projectName}&raquo;.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">القالب (اختياري)</label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full rounded-lg border border-ink-900/15 bg-paper px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-600/30 focus:border-sage-600"
              >
                <option value="">— لا قالب —</option>
                {invoiceTemplates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1">نسبة الضريبة (%)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                max="100"
                value={vatRate}
                onChange={(e) => setVatRate(e.target.value)}
                className="w-full rounded-lg border border-ink-900/15 bg-paper px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage-600/30 focus:border-sage-600"
              />
              <p className="text-[10px] text-ink-500 mt-1">15% هي النسبة المعتمدة في السعودية.</p>
            </div>

            {error && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1.5 flex items-start gap-1.5">
                <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                <span>{error === 'no_billable_time' ? 'لا توجد سجلات وقت قابلة للفوترة' : error}</span>
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowPopover(false)}
                className="text-xs text-ink-600 hover:text-ink-800 px-3 py-1.5"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-sage-600 text-paper text-sm font-medium px-3 py-1.5 hover:bg-sage-700 disabled:opacity-60"
              >
                {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Receipt className="size-3.5" />}
                {isPending ? 'جاري التوليد…' : 'توليد'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
