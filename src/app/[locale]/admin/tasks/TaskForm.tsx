'use client';

import { useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { Save } from 'lucide-react';
import { Field, TextInput, Textarea, Select } from '@/components/admin/Field';
import { Button } from '@/components/ui/Button';
import { createTask, updateTask, type Task, type TaskStatus, type TaskPriority, type TaskLinkType } from '@/lib/tasks/actions';

type Owner = { id: string; full_name: string | null; email: string };
export type LinkOption = { value: string; label: string; link_type: TaskLinkType };

const STATUSES: Array<{ value: TaskStatus; label: string }> = [
  { value: 'pending',     label: 'معلّق' },
  { value: 'in_progress', label: 'جارٍ' },
  { value: 'done',        label: 'منجز' },
  { value: 'cancelled',   label: 'ملغى' },
];

const PRIORITIES: Array<{ value: TaskPriority; label: string }> = [
  { value: 'low',    label: 'منخفض' },
  { value: 'medium', label: 'متوسط' },
  { value: 'high',   label: 'عاجل' },
];

export function TaskForm({
  mode,
  task,
  owners,
  linkOptions,
}: {
  mode: 'create' | 'edit';
  task?: Task;
  owners: Owner[];
  linkOptions: LinkOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = task;

  // The link select uses composite values "link_type:link_id"
  // (or "" for unlinked). The action splits them.
  const composite = t?.link_type && t?.link_id ? `${t.link_type}:${t.link_id}` : '';

  const action = (fd: FormData) => {
    const rawLink = String(fd.get('link_composite') ?? '').trim();
    let link_type: string = '';
    let link_id: string = '';
    if (rawLink) {
      const [lt, li] = rawLink.split(':');
      link_type = lt ?? '';
      link_id = li ?? '';
    }
    const payload = {
      title: String(fd.get('title') ?? '').trim(),
      description: String(fd.get('description') ?? '').trim(),
      due_date: String(fd.get('due_date') ?? '').trim(),
      priority: String(fd.get('priority') ?? 'medium') as TaskPriority,
      status: String(fd.get('status') ?? 'pending') as TaskStatus,
      assigned_to: String(fd.get('assigned_to') ?? '').trim(),
      link_type: link_type as TaskLinkType | '',
      link_id,
    };
    startTransition(async () => {
      const r = mode === 'create' ? await createTask(payload) : await updateTask(t!.id, payload);
      if (!r.ok) {
        alert(r.error);
        return;
      }
      router.push('/admin/tasks');
    });
  };

  return (
    <form action={action} className="space-y-5 max-w-2xl">
      <Field label="العنوان" required>
        <TextInput name="title" defaultValue={t?.title ?? ''} required maxLength={200} placeholder="متابعة عرض تجريبي مع عميل" />
      </Field>

      <Field label="الوصف" hint="خطوات، روابط، سياق إضافي">
        <Textarea name="description" defaultValue={t?.description ?? ''} rows={4} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="تاريخ الاستحقاق">
          <TextInput type="date" name="due_date" defaultValue={t?.due_date ?? ''} />
        </Field>
        <Field label="الأولوية">
          <Select name="priority" defaultValue={t?.priority ?? 'medium'}>
            {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </Select>
        </Field>
        <Field label="الحالة">
          <Select name="status" defaultValue={t?.status ?? 'pending'}>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="المسؤول" hint="اتركه فارغاً إذا لم تُسند بعد">
          <Select name="assigned_to" defaultValue={t?.assigned_to ?? ''}>
            <option value="">— غير مُسنَد —</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.full_name || o.email}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="مرتبط بـ" hint="اختياري — اربط المهمة بعميل أو استفسار">
          <Select name="link_composite" defaultValue={composite}>
            <option value="">— لا شيء —</option>
            {linkOptions.map((l) => (
              <option key={`${l.link_type}:${l.value}`} value={`${l.link_type}:${l.value}`}>
                {l.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          <Save className="size-4" /> {isPending ? 'جاري الحفظ…' : mode === 'create' ? 'إنشاء مهمة' : 'حفظ التغييرات'}
        </Button>
        <button
          type="button"
          onClick={() => router.push('/admin/tasks')}
          className="text-sm text-ink-600 hover:text-ink-800"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}
