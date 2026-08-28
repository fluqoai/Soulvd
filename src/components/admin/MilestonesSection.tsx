'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { Plus, Save, Trash2, Calendar, Check, Flag, GripVertical } from 'lucide-react';
import { Field, TextInput, Textarea } from '@/components/admin/Field';
import { Button } from '@/components/ui/Button';
import { createMilestone, setMilestoneStatus, deleteMilestone, type Milestone, type MilestoneStatus } from '@/lib/milestones/actions';

const STATUS_LABELS: Record<MilestoneStatus, string> = {
  pending:   'معلّق',
  done:      'منجز',
  cancelled: 'ملغى',
};

const STATUS_STYLES: Record<MilestoneStatus, string> = {
  pending:   'bg-ink-100 text-ink-700 ring-1 ring-ink-900/10',
  done:      'bg-sage-100 text-sage-800 ring-1 ring-sage-200',
  cancelled: 'bg-red-100 text-red-800 ring-1 ring-red-200',
};

const formatDate = (iso: string | null) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
  } catch { return iso; }
};

/**
 * Milestones list for a project. Shows ordered milestones with a check
 * to mark done, an add form, and a delete button per row.
 */
export function MilestonesSection({
  projectId,
  milestones,
}: {
  projectId: string;
  milestones: Milestone[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  const reset = () => { setName(''); setDescription(''); setDueDate(''); setError(null); };

  const sorted = [...milestones].sort((a, b) => {
    // done last
    if (a.status === 'done' && b.status !== 'done') return 1;
    if (b.status === 'done' && a.status !== 'done') return -1;
    // then by order_index
    if (a.order_index !== b.order_index) return a.order_index - b.order_index;
    // then by due_date
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return 0;
  });

  const doneCount = milestones.filter((m) => m.status === 'done').length;
  const totalActive = milestones.filter((m) => m.status !== 'cancelled').length;
  const pct = totalActive > 0 ? Math.round((doneCount / totalActive) * 100) : 0;

  return (
    <section className="rounded-2xl bg-paper border border-ink-900/5 p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink-900 flex items-center gap-2">
            <Flag className="size-5 text-sage-700" /> المراحل الرئيسية
          </h2>
          {milestones.length > 0 && (
            <p className="text-xs text-ink-500 mt-1">
              {doneCount} من {totalActive} منجزة
              {pct > 0 && <span className="text-sage-700 font-medium"> · {pct}%</span>}
            </p>
          )}
        </div>
        <Button size="sm" variant="primary" onClick={() => setShowForm((v) => !v)}>
          <Plus className="size-4" /> {showForm ? 'إخفاء' : 'إضافة مرحلة'}
        </Button>
      </div>

      {/* Progress bar */}
      {milestones.length > 0 && (
        <div className="w-full h-1.5 bg-ink-900/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-sage-500 transition-all"
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      )}

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            const nextOrder = milestones.length > 0
              ? Math.max(...milestones.map((m) => m.order_index)) + 1
              : 0;
            startTransition(async () => {
              setError(null);
              const r = await createMilestone({
                project_id: projectId,
                name,
                description,
                due_date: dueDate,
                status: 'pending',
                order_index: String(nextOrder),
              });
              if (!r.ok) {
                setError(r.error);
              } else {
                reset();
                setShowForm(false);
                router.refresh();
              }
            });
          }}
          className="rounded-xl border border-ink-900/10 bg-linen-50/40 p-4 space-y-3"
        >
          <Field label="اسم المرحلة" required>
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="موافقة التصميم / الإطلاق / التسليم…"
              required
            />
          </Field>
          <Field label="الوصف" hint="اختياري">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </Field>
          <Field label="تاريخ الاستحقاق">
            <TextInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          {error && <p className="text-xs text-red-700 bg-red-50 px-2 py-1 rounded">{error}</p>}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => { reset(); setShowForm(false); }}
              className="text-xs text-ink-600 hover:text-ink-800 px-3 py-1.5"
            >
              إلغاء
            </button>
            <Button type="submit" size="sm" disabled={isPending || !name.trim()}>
              <Save className="size-4" /> {isPending ? 'جاري الحفظ…' : 'إضافة'}
            </Button>
          </div>
        </form>
      )}

      {sorted.length > 0 ? (
        <ul className="space-y-1.5">
          {sorted.map((m) => {
            const isOverdue = m.due_date && m.status === 'pending' && m.due_date < new Date().toISOString().slice(0, 10);
            return (
              <li
                key={m.id}
                className="flex items-start gap-2.5 group rounded-lg p-2 -mx-2 hover:bg-sage-50/40 transition-colors"
              >
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    const next: MilestoneStatus = m.status === 'done' ? 'pending' : 'done';
                    startTransition(async () => {
                      const r = await setMilestoneStatus(m.id, next);
                      if (!r.ok) setError(r.error);
                      else router.refresh();
                    });
                  }}
                  className={`shrink-0 mt-0.5 size-5 rounded border-2 grid place-items-center transition-colors ${
                    m.status === 'done'
                      ? 'bg-sage-600 border-sage-600 text-paper'
                      : 'border-ink-900/25 hover:border-sage-500'
                  }`}
                  title={m.status === 'done' ? 'إلغاء الإنجاز' : 'وضع كمنجز'}
                >
                  {m.status === 'done' && <Check className="size-3" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${m.status === 'done' ? 'line-through text-ink-500' : 'text-ink-900'}`}>
                    {m.name}
                  </p>
                  {m.description && (
                    <p className="text-xs text-ink-600 mt-0.5 line-clamp-1">{m.description}</p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-[11px]">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full font-medium ${STATUS_STYLES[m.status]}`}>
                      {STATUS_LABELS[m.status]}
                    </span>
                    {m.due_date && (
                      <span className={`inline-flex items-center gap-0.5 ${isOverdue ? 'text-red-700 font-medium' : 'text-ink-500'}`}>
                        <Calendar className="size-3" /> {formatDate(m.due_date)}
                        {isOverdue && <span>· متأخر</span>}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    if (typeof window !== 'undefined' && !window.confirm(`حذف المرحلة "${m.name}"؟`)) return;
                    startTransition(async () => {
                      const r = await deleteMilestone(m.id);
                      if (!r.ok) setError(r.error);
                      else router.refresh();
                    });
                  }}
                  className="opacity-0 group-hover:opacity-100 text-ink-400 hover:text-red-600 p-1 -m-1 rounded transition-all"
                  title="حذف"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        !showForm && <p className="text-sm text-ink-500 italic text-center py-6">لا توجد مراحل بعد.</p>
      )}
    </section>
  );
}
