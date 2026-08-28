'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { Plus, Check, Calendar, Flag, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, TextInput, Textarea, Select } from '@/components/admin/Field';
import { createTask, setTaskStatus, type Task, type TaskStatus, type TaskPriority, type TaskLinkType } from '@/lib/tasks/actions';

const STATUS_STYLES: Record<TaskStatus, string> = {
  pending:     'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
  in_progress: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
  done:        'bg-sage-100 text-sage-800 ring-1 ring-sage-200',
  cancelled:   'bg-ink-100 text-ink-600 ring-1 ring-ink-900/10',
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending:     'معلّق',
  in_progress: 'جارٍ',
  done:        'منجز',
  cancelled:   'ملغى',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low:    'منخفض',
  medium: 'متوسط',
  high:   'عاجل',
};

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low:    'text-ink-500',
  medium: 'text-amber-700',
  high:   'text-red-700',
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
}

/**
 * Compact task list with an inline create form. Shown on detail pages
 * (client / lead) to keep work-in-progress visible next to the entity.
 */
export function TasksSection({
  linkType,
  linkId,
  linkLabel,
  tasks,
}: {
  linkType: TaskLinkType;
  linkId: string;
  linkLabel: string;
  tasks: Array<Pick<Task, 'id' | 'title' | 'due_date' | 'priority' | 'status' | 'completed_at' | 'created_at'>>;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');

  const reset = () => {
    setTitle(''); setDescription(''); setDueDate(''); setPriority('medium');
    setError(null);
  };

  return (
    <section className="rounded-xl border border-ink-900/10 bg-paper p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-700">المهام</h2>
        <span className="text-xs text-ink-500">{tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled').length} نشطة</span>
      </div>

      {tasks.length > 0 ? (
        <ul className="space-y-2">
          {tasks.slice(0, 8).map((t) => (
            <li key={t.id} className="flex items-start gap-2.5 group">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  const next: TaskStatus = t.status === 'done' ? 'pending' : 'done';
                  startTransition(async () => {
                    const r = await setTaskStatus(t.id, next);
                    if (!r.ok) setError(r.error);
                    else router.refresh();
                  });
                }}
                className={`shrink-0 mt-0.5 size-5 rounded border-2 grid place-items-center transition-colors ${
                  t.status === 'done'
                    ? 'bg-sage-600 border-sage-600 text-paper'
                    : 'border-ink-900/25 hover:border-sage-500'
                }`}
                title={t.status === 'done' ? 'إلغاء الإنجاز' : 'وضع كمنجز'}
                aria-label="toggle done"
              >
                {t.status === 'done' && <Check className="size-3" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${t.status === 'done' ? 'line-through text-ink-500' : 'text-ink-900'}`}>
                  {t.title}
                </p>
                <div className="mt-1 flex items-center gap-2 text-[11px]">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full font-medium ${STATUS_STYLES[t.status as TaskStatus] ?? STATUS_STYLES.pending}`}>
                    {STATUS_LABELS[t.status as TaskStatus] ?? t.status}
                  </span>
                  <span className={`inline-flex items-center gap-0.5 ${PRIORITY_STYLES[t.priority as TaskPriority]}`}>
                    <Flag className="size-3" /> {PRIORITY_LABELS[t.priority as TaskPriority]}
                  </span>
                  {t.due_date && (
                    <span className="inline-flex items-center gap-0.5 text-ink-500">
                      <Calendar className="size-3" /> {formatDate(t.due_date)}
                    </span>
                  )}
                </div>
              </div>
              <a
                href={`/admin/tasks/${t.id}`}
                className="opacity-0 group-hover:opacity-100 text-ink-400 hover:text-sage-700 transition-opacity"
                title="فتح"
              >
                <ExternalLink className="size-3.5" />
              </a>
            </li>
          ))}
          {tasks.length > 8 && (
            <li className="pt-1 text-center">
              <a href={`/admin/tasks?link_type=${linkType}&link_id=${linkId}`} className="text-xs text-ink-600 hover:text-sage-700">
                +{tasks.length - 8} مهمة أخرى
              </a>
            </li>
          )}
        </ul>
      ) : (
        !showForm && <p className="text-sm text-ink-500 italic">لا توجد مهام بعد.</p>
      )}

      {showForm ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            startTransition(async () => {
              setError(null);
              const r = await createTask({
                title,
                description,
                due_date: dueDate,
                priority,
                status: 'pending',
                assigned_to: '',
                link_type: linkType,
                link_id: linkId,
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
          className="space-y-3 pt-2 border-t border-ink-900/5"
        >
          <Field label="مهمة جديدة" required>
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`بخصوص ${linkLabel}…`} />
          </Field>
          <Field label="الوصف">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="تاريخ الاستحقاق">
              <TextInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
            <Field label="الأولوية">
              <Select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                <option value="low">منخفض</option>
                <option value="medium">متوسط</option>
                <option value="high">عاجل</option>
              </Select>
            </Field>
          </div>
          {error && <p className="text-xs text-red-700 bg-red-50 px-2 py-1 rounded">{error}</p>}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => { reset(); setShowForm(false); }}
              className="text-xs text-ink-600 hover:text-ink-800 px-2 py-1"
            >
              إلغاء
            </button>
            <Button type="submit" size="sm" disabled={isPending || !title.trim()}>
              {isPending ? 'جاري الحفظ…' : 'حفظ'}
            </Button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full mt-2 flex items-center justify-center gap-1.5 text-sm text-sage-700 hover:text-sage-800 hover:bg-sage-50 rounded-lg py-2 transition-colors"
        >
          <Plus className="size-4" /> إضافة مهمة
        </button>
      )}
    </section>
  );
}
