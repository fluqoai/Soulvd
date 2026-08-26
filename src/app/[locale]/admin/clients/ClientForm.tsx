'use client';
import { useActionState } from 'react';
import { useLocale } from 'next-intl';
import { Save } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { Field, TextInput, Textarea } from '@/components/admin/Field';
import { Button } from '@/components/ui/Button';
import { createClientAction, updateClientAction } from './actions';
import type { CrudResult } from '@/lib/admin/actions';

type Initial = { id?: string; name?: string; email?: string | null; phone?: string | null; company?: string | null; vat_number?: string | null; address?: string | null; notes?: string | null };
const init: CrudResult = { ok: false, error: '' };

export function ClientForm({ initial: row }: { initial: Initial }) {
  const locale = 'ar' as 'ar' | 'en';
  const router = useRouter();
  const isEdit = !!row.id;
  const action = isEdit ? updateClientAction.bind(null, row.id!) : createClientAction;
  const [state, formAction, isPending] = useActionState<CrudResult, FormData>(action, init);
  if (state?.ok && typeof window !== 'undefined') router.push(`/admin/clients`);

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الاسم" required><TextInput name="name" defaultValue={row.name ?? ''} required /></Field>
        <Field label="Company"><TextInput name="company" defaultValue={row.company ?? ''} /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="البريد" hint="يستخدم لإرسال الفواتير وعروض الأسعار"><TextInput name="email" type="email" defaultValue={row.email ?? ''} /></Field>
        <Field label="الهاتف"><TextInput name="phone" defaultValue={row.phone ?? ''} /></Field>
      </div>
      <Field label="VAT number" hint="For Saudi clients: 15-digit VAT registration number">
        <TextInput name="vat_number" defaultValue={row.vat_number ?? ''} placeholder="300000000000003" />
      </Field>
      <Field label="Address"><Textarea name="address" defaultValue={row.address ?? ''} rows={2} /></Field>
      <Field label="ملاحظات"><Textarea name="notes" defaultValue={row.notes ?? ''} rows={4} /></Field>
      <Button type="submit" disabled={isPending}><Save className="size-4" />{isPending ? 'جاري الحفظ…' : isEdit ? 'حفظ التغييرات' : 'إنشاء عميل'}</Button>
    </form>
  );
}
