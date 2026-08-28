'use client';

import { useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { Save } from 'lucide-react';
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
