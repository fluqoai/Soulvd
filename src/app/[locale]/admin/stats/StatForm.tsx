'use client';

import { useActionState } from 'react';
import { useLocale } from 'next-intl';
import { Save } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { BilingualInput } from '@/components/admin/BilingualInput';
import { Field, TextInput } from '@/components/admin/Field';
import { Toggle } from '@/components/admin/Toggle';
import { Button } from '@/components/ui/Button';
import { createStatAction, updateStatAction } from './actions';
import type { CrudResult } from '@/lib/admin/actions';

type Initial = { id?: string; value?: string; label?: { ar?: string; en?: string }; order_index?: number; published?: boolean };
const init: CrudResult = { ok: false, error: '' };

export function StatForm({ initial: row }: { initial: Initial }) {
  const locale = 'ar' as 'ar' | 'en';
  const router = useRouter();
  const isEdit = !!row.id;
  const action = isEdit ? updateStatAction.bind(null, row.id!) : createStatAction;
  const [state, formAction, isPending] = useActionState<CrudResult, FormData>(action, init);
  if (state?.ok && typeof window !== 'undefined') router.push(`/admin/stats`);

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      <Field label="Value" hint="The number, e.g. +8, 98%, 2" required>
        <TextInput name="value" defaultValue={row.value} placeholder="+8" required />
      </Field>
      <BilingualInput name="label" label="Label" value={row.label} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Order"><TextInput name="order_index" type="number" defaultValue={row.order_index ?? 0} /></Field>
        <Field label="Visibility" className="self-end">
          <Toggle name="published" defaultChecked={row.published !== false} label="Published" />
        </Field>
      </div>
      <Button type="submit" disabled={isPending}><Save className="size-4" />{isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create stat'}</Button>
    </form>
  );
}
