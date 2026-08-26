'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { Save, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, Textarea, Select } from '@/components/admin/Field';
import {
  updateLeadStatus,
  addLeadNote,
  convertLeadToClient,
} from '../actions';

const STATUSES = [
  { value: 'new',        label: 'جديد' },
  { value: 'contacted',  label: 'تم التواصل' },
  { value: 'qualified',  label: 'مؤهل' },
  { value: 'closed',     label: 'مغلق' },
  { value: 'lost',       label: 'خاسر' },
] as const;

export function LeadStatusForm({ id, initialStatus }: { id: string; initialStatus: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-end gap-3">
      <Field label="الحالة" className="flex-1">
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          name="_status"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </Select>
      </Field>
      <Button
        type="button"
        disabled={isPending || status === initialStatus}
        onClick={() => {
          startTransition(async () => {
            setError(null);
            const r = await updateLeadStatus(id, status);
            if (!r.ok) setError(r.error);
            else router.refresh();
          });
        }}
      >
        <Save className="size-4" />
        حفظ
      </Button>
      {error && <span className="text-xs text-red-700 self-center bg-red-50 px-2 py-1 rounded">{error}</span>}
    </div>
  );
}

export function LeadNoteForm({ id }: { id: string }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!note.trim()) return;
        startTransition(async () => {
          setError(null);
          const r = await addLeadNote(id, note);
          if (!r.ok) setError(r.error);
          else {
            setNote('');
            router.refresh();
          }
        });
      }}
      className="space-y-2"
    >
      <Field label="إضافة ملاحظة" hint="تضاف إلى السجل مع توقيت تلقائي">
        <Textarea
          name="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="تم الاتصال بالعميل، يطلب عرض تجريبي يوم الثلاثاء القادم…"
        />
      </Field>
      {error && <p className="text-xs text-red-700 bg-red-50 px-2 py-1 rounded">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending || !note.trim()}>
          <Save className="size-4" />
          {isPending ? 'جاري الحفظ…' : 'إضافة'}
        </Button>
      </div>
    </form>
  );
}

export function ConvertButton({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (typeof window !== 'undefined' && !window.confirm('إنشاء عميل من هذا الاستفسار؟ سيتم وسم الاستفسار كمغلق.')) return;
          startTransition(async () => {
            setError(null);
            const r = await convertLeadToClient(id);
            if (!r.ok) {
              setError(r.error);
            } else {
              router.push(`/admin/clients/${r.clientId}`);
            }
          });
        }}
      >
        <UserPlus className="size-4" />
        تحويل إلى عميل
      </Button>
      {error && <p className="text-xs text-red-700 mt-2 bg-red-50 px-2 py-1 rounded">{error}</p>}
    </div>
  );
}
