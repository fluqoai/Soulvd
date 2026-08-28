'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { Save, Repeat } from 'lucide-react';
import { Field, TextInput, Textarea, Select } from '@/components/admin/Field';
import { Button } from '@/components/ui/Button';
import { createProject, updateProject, type Project, type ProjectStatus } from '@/lib/projects/actions';

type Client = { id: string; name: string; company: string | null; status: string };
type Owner = { id: string; full_name: string | null; email: string };

const STATUSES: Array<{ value: ProjectStatus; label: string }> = [
  { value: 'planning',    label: 'تخطيط' },
  { value: 'in_progress', label: 'جارٍ' },
  { value: 'on_hold',     label: 'متوقف' },
  { value: 'delivered',   label: 'مُسلَّم' },
  { value: 'cancelled',   label: 'ملغى' },
];

export function ProjectForm({
  mode,
  project,
  clients,
  owners,
  defaultClientId,
}: {
  mode: 'create' | 'edit';
  project?: Project;
  clients: Client[];
  owners: Owner[];
  defaultClientId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const p = project;

  // Local state for the recurring section so we can show/hide pattern fields
  const [isRecurring, setIsRecurring] = useState<boolean>(p?.is_recurring ?? false);
  // Compute default next_occurrence_at (1st of next month) if creating a new recurring
  const defaultNextOcc = (() => {
    if (p?.next_occurrence_at) return p.next_occurrence_at.slice(0, 16); // yyyy-mm-ddThh:mm
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
    d.setHours(9, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  })();

  const action = (fd: FormData) => {
    const payload = {
      client_id: String(fd.get('client_id') ?? '').trim(),
      name: String(fd.get('name') ?? '').trim(),
      description: String(fd.get('description') ?? '').trim(),
      status: String(fd.get('status') ?? 'planning') as ProjectStatus,
      start_date: String(fd.get('start_date') ?? '').trim(),
      due_date: String(fd.get('due_date') ?? '').trim(),
      budget_hours: String(fd.get('budget_hours') ?? '').trim(),
      budget_amount: String(fd.get('budget_amount') ?? '').trim(),
      currency: String(fd.get('currency') ?? 'SAR').trim() || 'SAR',
      owner_id: String(fd.get('owner_id') ?? '').trim(),
      is_recurring: isRecurring ? (fd.get('is_recurring') === 'on' ? 'on' : '') : '',
      recurrence_pattern: isRecurring ? String(fd.get('recurrence_pattern') ?? '') : '',
      next_occurrence_at: isRecurring ? String(fd.get('next_occurrence_at') ?? '') : '',
      auto_invoice: fd.get('auto_invoice') === 'on' ? 'on' : '',
    };
    startTransition(async () => {
      const r = mode === 'create' ? await createProject(payload) : await updateProject(p!.id, payload);
      if (!r.ok) {
        alert(r.error);
        return;
      }
      router.push(`/admin/projects${mode === 'create' && 'id' in r ? `/${(r as { id: string }).id}` : ''}`);
    });
  };

  return (
    <form action={action} className="space-y-5 max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="اسم المشروع" required>
          <TextInput name="name" defaultValue={p?.name ?? ''} required maxLength={200} placeholder="بوت واتساب لمطعم X" />
        </Field>
        <Field label="العميل" required>
          <Select name="client_id" defaultValue={p?.client_id ?? defaultClientId ?? ''} required>
            <option value="">— اختر عميلاً —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.company ? ` (${c.company})` : ''}{c.status === 'archived' ? ' · مؤرشف' : ''}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="الوصف">
        <Textarea name="description" defaultValue={p?.description ?? ''} rows={3} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="الحالة">
          <Select name="status" defaultValue={p?.status ?? 'planning'}>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </Field>
        <Field label="تاريخ البداية">
          <TextInput type="date" name="start_date" defaultValue={p?.start_date ?? ''} />
        </Field>
        <Field label="تاريخ التسليم">
          <TextInput type="date" name="due_date" defaultValue={p?.due_date ?? ''} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="ميزانية الساعات" hint="اختياري">
          <TextInput
            type="number"
            inputMode="decimal"
            step="0.5"
            min="0"
            name="budget_hours"
            defaultValue={p?.budget_hours?.toString() ?? ''}
            placeholder="40"
          />
        </Field>
        <Field label="ميزانية المبلغ" hint="اختياري">
          <TextInput
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            name="budget_amount"
            defaultValue={p?.budget_amount?.toString() ?? ''}
            placeholder="0.00"
          />
        </Field>
        <Field label="العملة">
          <TextInput name="currency" defaultValue={p?.currency ?? 'SAR'} maxLength={8} />
        </Field>
      </div>

      <Field label="المسؤول" hint="اتركه فارغاً إذا لم يُسند بعد">
        <Select name="owner_id" defaultValue={p?.owner_id ?? ''}>
          <option value="">— غير مُسنَد —</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.full_name || o.email}
            </option>
          ))}
        </Select>
      </Field>

      {/* Recurring section */}
      <section className="rounded-xl border border-ink-900/10 bg-linen-50/30 p-4 space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="size-4 rounded border-ink-900/20 text-sage-600 focus:ring-sage-600/30"
          />
          <span className="text-sm font-semibold text-ink-900 inline-flex items-center gap-1.5">
            <Repeat className="size-4 text-sage-700" /> مشروع دوري (MRR)
          </span>
          <input type="hidden" name="is_recurring" value={isRecurring ? 'on' : ''} />
        </label>

        {isRecurring && (
          <div className="space-y-3 pt-2 border-t border-ink-900/10">
            <p className="text-xs text-ink-600">
              مشروع دوري يُجدّد نفسه تلقائياً (مثال: صيانة شهرية). يمكنك تجديده يدوياً من صفحة المشروع، أو ربط API endpoint بخدمة cron خارجية.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="التكرار" required>
                <Select name="recurrence_pattern" defaultValue={p?.recurrence_pattern ?? 'monthly'}>
                  <option value="monthly">شهري</option>
                  <option value="quarterly">ربع سنوي</option>
                </Select>
              </Field>
              <Field label="تاريخ التجديد القادم" hint="يُنشأ المشروع الجديد في هذا الموعد">
                <TextInput
                  type="datetime-local"
                  name="next_occurrence_at"
                  defaultValue={defaultNextOcc}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                name="auto_invoice"
                defaultChecked={p?.auto_invoice ?? true}
                className="size-4 rounded border-ink-900/20 text-sage-600 focus:ring-sage-600/30"
              />
              إنشاء فاتورة مسودة تلقائياً مع كل تجديد (تستخدم مبلغ الميزانية كبند واحد)
            </label>
          </div>
        )}
      </section>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          <Save className="size-4" /> {isPending ? 'جاري الحفظ…' : mode === 'create' ? 'إنشاء مشروع' : 'حفظ التغييرات'}
        </Button>
        <button
          type="button"
          onClick={() => router.push('/admin/projects')}
          className="text-sm text-ink-600 hover:text-ink-800"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}
