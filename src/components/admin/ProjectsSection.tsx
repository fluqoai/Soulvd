'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from '@/i18n/routing';
import { Plus, Briefcase, Calendar, ExternalLink, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, TextInput, Textarea, Select } from '@/components/admin/Field';
import { createProject, setProjectStatus, type ProjectStatus } from '@/lib/projects/actions';

type Project = {
  id: string;
  name: string;
  status: ProjectStatus;
  start_date: string | null;
  due_date: string | null;
  total_hours?: number | null;
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  planning:    'تخطيط',
  in_progress: 'جارٍ',
  on_hold:     'متوقف',
  delivered:   'مُسلَّم',
  cancelled:   'ملغى',
};

const STATUS_STYLES: Record<ProjectStatus, string> = {
  planning:    'bg-ink-100 text-ink-700 ring-1 ring-ink-900/10',
  in_progress: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
  on_hold:     'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
  delivered:   'bg-sage-100 text-sage-800 ring-1 ring-sage-200',
  cancelled:   'bg-red-100 text-red-800 ring-1 ring-red-200',
};

const STATUS_DOT: Record<ProjectStatus, string> = {
  planning:    'bg-ink-400',
  in_progress: 'bg-blue-500',
  on_hold:     'bg-amber-500',
  delivered:   'bg-sage-500',
  cancelled:   'bg-red-500',
};

const formatDate = (iso: string | null) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
  } catch { return iso; }
};

/**
 * Projects list for a client. Shows existing projects with a status
 * quick-toggle and an inline "new project" form.
 */
export function ProjectsSection({
  clientId,
  clientName,
  projects,
}: {
  clientId: string;
  clientName: string;
  projects: Project[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  const reset = () => { setName(''); setDescription(''); setDueDate(''); setError(null); };

  return (
    <section className="rounded-xl border border-ink-900/10 bg-paper p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-700 flex items-center gap-2">
          <Briefcase className="size-4" /> المشاريع
        </h2>
        <span className="text-xs text-ink-500">
          {projects.filter((p) => p.status !== 'delivered' && p.status !== 'cancelled').length} نشطة
        </span>
      </div>

      {projects.length > 0 ? (
        <ul className="space-y-2">
          {projects.map((p) => {
            const isOverdue = p.due_date && p.status !== 'delivered' && p.status !== 'cancelled' && p.due_date < new Date().toISOString().slice(0, 10);
            return (
              <li key={p.id} className="flex items-start gap-2.5 group">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    const next: ProjectStatus = p.status === 'delivered' ? 'in_progress' : 'delivered';
                    startTransition(async () => {
                      const r = await setProjectStatus(p.id, next);
                      if (!r.ok) setError(r.error);
                      else router.refresh();
                    });
                  }}
                  className={`shrink-0 mt-1 size-4 rounded-full border-2 grid place-items-center transition-colors ${
                    p.status === 'delivered'
                      ? 'bg-sage-600 border-sage-600 text-paper'
                      : 'border-ink-900/20 hover:border-sage-500'
                  }`}
                  title={p.status === 'delivered' ? 'إلغاء الإنجاز' : 'وضع كمسلم'}
                >
                  {p.status === 'delivered' && <Check className="size-2.5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/admin/projects/${p.id}`}
                    className="text-sm font-medium text-ink-900 hover:text-sage-700 truncate block"
                  >
                    {p.name}
                  </Link>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px]">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-medium ${STATUS_STYLES[p.status]}`}>
                      <span className={`inline-block size-1.5 rounded-full ${STATUS_DOT[p.status]}`} />
                      {STATUS_LABELS[p.status]}
                    </span>
                    {p.due_date && (
                      <span className={`inline-flex items-center gap-0.5 ${isOverdue ? 'text-red-700 font-medium' : 'text-ink-500'}`}>
                        <Calendar className="size-3" /> {formatDate(p.due_date)}
                        {isOverdue && <span>· متأخر</span>}
                      </span>
                    )}
                    {p.total_hours != null && p.total_hours > 0 && (
                      <span className="text-ink-500">{p.total_hours.toFixed(1)} ساعة</span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/admin/projects/${p.id}`}
                  className="opacity-0 group-hover:opacity-100 text-ink-400 hover:text-sage-700 transition-opacity"
                  title="فتح"
                >
                  <ExternalLink className="size-3.5" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        !showForm && <p className="text-sm text-ink-500 italic">لا توجد مشاريع بعد.</p>
      )}

      {showForm ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            startTransition(async () => {
              setError(null);
              const r = await createProject({
                client_id: clientId,
                name,
                description,
                status: 'planning',
                start_date: '',
                due_date: dueDate,
                budget_hours: '',
                budget_amount: '',
                currency: 'SAR',
                owner_id: '',
                is_recurring: '',
                recurrence_pattern: '',
                next_occurrence_at: '',
                auto_invoice: '',
              });
              if (!r.ok) {
                setError(r.error);
              } else {
                reset();
                setShowForm(false);
                router.push(`/admin/projects/${'id' in r ? (r as { id: string }).id : ''}`);
              }
            });
          }}
          className="space-y-3 pt-2 border-t border-ink-900/5"
        >
          <Field label="مشروع جديد" required>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder={`بخصوص ${clientName}…`} />
          </Field>
          <Field label="الوصف">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </Field>
          <Field label="تاريخ التسليم المتوقع">
            <TextInput type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          {error && <p className="text-xs text-red-700 bg-red-50 px-2 py-1 rounded">{error}</p>}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => { reset(); setShowForm(false); }}
              className="text-xs text-ink-600 hover:text-ink-800 px-2 py-1"
            >
              إلغاء
            </button>
            <Button type="submit" size="sm" disabled={isPending || !name.trim()}>
              {isPending ? 'جاري الإنشاء…' : 'إنشاء'}
            </Button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full mt-2 flex items-center justify-center gap-1.5 text-sm text-sage-700 hover:text-sage-800 hover:bg-sage-50 rounded-lg py-2 transition-colors"
        >
          <Plus className="size-4" /> إضافة مشروع
        </button>
      )}
    </section>
  );
}
