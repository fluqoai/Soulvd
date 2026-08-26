'use client';
import { useActionState } from 'react';
import { useLocale } from 'next-intl';
import { Save } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { BilingualInput } from '@/components/admin/BilingualInput';
import { Field, TextInput } from '@/components/admin/Field';
import { Toggle } from '@/components/admin/Toggle';
import { Button } from '@/components/ui/Button';
import { createVP, updateVP } from './actions';
import type { CrudResult } from '@/lib/admin/actions';

type Initial = { id?: string; key?: string; icon?: string; title?: { ar?: string; en?: string }; description?: { ar?: string; en?: string }; order_index?: number; published?: boolean };
const init: CrudResult = { ok: false, error: '' };

export function ValuePropForm({ initial: row }: { initial: Initial }) {
  const locale = 'ar' as 'ar' | 'en';
  const router = useRouter();
  const isEdit = !!row.id;
  const action = isEdit ? updateVP.bind(null, row.id!) : createVP;
  const [state, formAction, isPending] = useActionState<CrudResult, FormData>(action, init);
  if (state?.ok && typeof window !== 'undefined') router.push(`/admin/value-props`);

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Key" required><TextInput name="key" defaultValue={row.key} required /></Field>
        <Field label="Icon" required><TextInput name="icon" defaultValue={row.icon} required /></Field>
      </div>
      <BilingualInput name="title" label="العنوان" value={row.title} required />
      <BilingualInput name="description" label="الوصف" value={row.description} multiline rows={3} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الترتيب"><TextInput name="order_index" type="number" defaultValue={row.order_index ?? 0} /></Field>
        <Field label="الظهور" className="self-end"><Toggle name="published" defaultChecked={row.published !== false} label="منشور" /></Field>
      </div>
      <Button type="submit" disabled={isPending}><Save className="size-4" />{isPending ? 'جاري الحفظ…' : isEdit ? 'حفظ التغييرات' : 'إضافة قيمة'}</Button>
    </form>
  );
}
