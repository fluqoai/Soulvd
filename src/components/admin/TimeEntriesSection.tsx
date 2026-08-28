'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { Plus, Save, Trash2, Clock } from 'lucide-react';
import { Field, TextInput, Textarea } from '@/components/admin/Field';
import { Button } from '@/components/ui/Button';
import { createTimeEntry, deleteTimeEntry, type TimeEntry } from '@/lib/time/actions';

type Entry = {
  id: string;
  user_id: string;
  entry_date: string;
  hours: number;
  description: string | null;
  billable: boolean;
  hourly_rate: number | null;
  created_at: string;
};

type User = { id: string; full_name: string | null; email: string };

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return iso; }
};

/**
 * Time entries table + inline "log time" form for a project.
 * Renders on the project detail page. The user adds entries, the section
 * shows them in reverse-chronological order with running totals.
 */
export function TimeEntriesSection({
  projectId,
  projectCurrency,
  entries,
  users,
}: {
  projectId: string;
  projectCurrency: string;
  entries: Entry[];
  users: User[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  // form state
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [hours, setHours] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [billable, setBillable] = useState<boolean>(true);
  const [hourlyRate, setHourlyRate] = useState<string>('');

  const reset = () => {
    setEntryDate(new Date().toISOString().slice(0, 10));
    setHours(''); setDescription(''); setBillable(true); setHourlyRate('');
    setError(null);
  };

  const userById = new Map(users.map((u) => [u.id, u]));

  const totalHours = entries.reduce((s, e) => s + Number(e.hours || 0), 0);
  const billableHours = entries.filter((e) => e.billable).reduce((s, e) => s + Number(e.hours || 0), 0);
  const billableAmount = entries
    .filter((e) => e.billable)
    .reduce((s, e) => s + Number(e.hours || 0) * Number(e.hourly_rate || 0), 0);

  return (
    <section className="rounded-2xl bg-paper border border-ink-900/5 p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink-900 flex items-center gap-2">
            <Clock className="size-5 text-sage-700" /> سجل الوقت
          </h2>
          <p className="text-xs text-ink-500 mt-1">
            {totalHours.toFixed(2)} ساعة إجمالي
            {billableHours > 0 && ` · ${billableHours.toFixed(2)} قابلة للفوترة`}
            {billableAmount > 0 && ` · ${billableAmount.toFixed(0)} ${projectCurrency}`}
          </p>
        </div>
        <Button size="sm" variant="primary" onClick={() => setShowForm((v) => !v)}>
          <Plus className="size-4" /> {showForm ? 'إخفاء' : 'تسجيل وقت'}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!hours) return;
            startTransition(async () => {
              setError(null);
              const r = await createTimeEntry({
                project_id: projectId,
                entry_date: entryDate,
                hours,
                description,
                billable: billable ? 'on' : '',
                hourly_rate: hourlyRate,
              });
              if (!r.ok) {
                setError(r.error ?? 'unknown');
              } else {
                reset();
                setShowForm(false);
                router.refresh();
              }
            });
          }}
          className="rounded-xl border border-ink-900/10 bg-linen-50/40 p-4 space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="التاريخ">
              <TextInput type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </Field>
            <Field label="الساعات" required>
              <TextInput
                type="number"
                inputMode="decimal"
                step="0.25"
                min="0.25"
                max="24"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="2.5"
                required
              />
            </Field>
            <Field label={`سعر الساعة (${projectCurrency})`} hint="اختياري">
              <TextInput
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="150"
              />
            </Field>
          </div>
          <Field label="ماذا عملت؟" hint="اختياري">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="ضبط تدفقات البوت، اختبار ردود على رسائل WhatsApp…"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={billable}
              onChange={(e) => setBillable(e.target.checked)}
              className="size-4 rounded border-ink-900/20 text-sage-600 focus:ring-sage-600/30"
            />
            قابلة للفوترة (يحتسبها العميل)
          </label>
          {error && <p className="text-xs text-red-700 bg-red-50 px-2 py-1 rounded">{error}</p>}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => { reset(); setShowForm(false); }}
              className="text-xs text-ink-600 hover:text-ink-800 px-3 py-1.5"
            >
              إلغاء
            </button>
            <Button type="submit" size="sm" disabled={isPending || !hours}>
              <Save className="size-4" /> {isPending ? 'جاري الحفظ…' : 'تسجيل'}
            </Button>
          </div>
        </form>
      )}

      {entries.length > 0 ? (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-ink-600 uppercase tracking-wider">
                <th className="text-start font-medium px-2 py-2">التاريخ</th>
                <th className="text-start font-medium px-2 py-2">من</th>
                <th className="text-start font-medium px-2 py-2">الوصف</th>
                <th className="text-end font-medium px-2 py-2">ساعات</th>
                <th className="text-end font-medium px-2 py-2">سعر</th>
                <th className="text-end font-medium px-2 py-2">المبلغ</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-900/5">
              {entries.map((e) => {
                const u = userById.get(e.user_id);
                const amount = e.billable ? Number(e.hours) * Number(e.hourly_rate || 0) : 0;
                return (
                  <tr key={e.id} className="group hover:bg-sage-50/30">
                    <td className="px-2 py-2 text-ink-700 tabular-nums whitespace-nowrap">{formatDate(e.entry_date)}</td>
                    <td className="px-2 py-2 text-ink-700 whitespace-nowrap">{u?.full_name || u?.email || '—'}</td>
                    <td className="px-2 py-2 text-ink-900">
                      <span className="line-clamp-1">{e.description || <span className="text-ink-400 italic">—</span>}</span>
                    </td>
                    <td className="px-2 py-2 text-end font-semibold text-ink-900 tabular-nums" dir="ltr">
                      {Number(e.hours).toFixed(2)}
                      {e.billable ? <span className="ms-1 text-[10px] text-sage-600">●</span> : <span className="ms-1 text-[10px] text-ink-400">○</span>}
                    </td>
                    <td className="px-2 py-2 text-end text-ink-700 tabular-nums" dir="ltr">
                      {e.hourly_rate ? Number(e.hourly_rate).toFixed(0) : '—'}
                    </td>
                    <td className="px-2 py-2 text-end font-semibold text-sage-700 tabular-nums" dir="ltr">
                      {amount > 0 ? amount.toFixed(0) : '—'}
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        disabled={isPending && pendingDelete === e.id}
                        onClick={() => {
                          if (typeof window !== 'undefined' && !window.confirm('حذف هذا السجل؟')) return;
                          setPendingDelete(e.id);
                          startTransition(async () => {
                            const r = await deleteTimeEntry(e.id);
                            if (!r.ok) setError(r.error);
                            else router.refresh();
                            setPendingDelete(null);
                          });
                        }}
                        className="text-ink-400 hover:text-red-600 p-1 -m-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="حذف"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-ink-900/10 font-semibold">
                <td colSpan={3} className="px-2 py-2 text-ink-700">الإجمالي</td>
                <td className="px-2 py-2 text-end text-ink-900 tabular-nums" dir="ltr">{totalHours.toFixed(2)}</td>
                <td></td>
                <td className="px-2 py-2 text-end text-sage-700 tabular-nums" dir="ltr">
                  {billableAmount > 0 ? billableAmount.toFixed(0) : '—'}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <p className="text-sm text-ink-500 italic text-center py-6">لا توجد سجلات وقت بعد.</p>
      )}
    </section>
  );
}
