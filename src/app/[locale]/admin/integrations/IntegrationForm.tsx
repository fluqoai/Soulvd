'use client';
import { useActionState } from 'react';
import { useLocale } from 'next-intl';
import { Save } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { Field, TextInput, Select } from '@/components/admin/Field';
import { Toggle } from '@/components/admin/Toggle';
import { Button } from '@/components/ui/Button';
import { createIntegration, updateIntegration } from './actions';
import type { CrudResult } from '@/lib/admin/actions';

type Initial = { id?: string; name?: string; category?: string | null; logo_url?: string | null; url?: string | null; order_index?: number; published?: boolean };
const init: CrudResult = { ok: false, error: '' };

const CATEGORIES = ['crm', 'ecommerce', 'payment', 'productivity', 'social', 'automation', 'other'];

export function IntegrationForm({ initial: row }: { initial: Initial }) {
  const locale = 'ar' as 'ar' | 'en';
  const router = useRouter();
  const isEdit = !!row.id;
  const action = isEdit ? updateIntegration.bind(null, row.id!) : createIntegration;
  const [state, formAction, isPending] = useActionState<CrudResult, FormData>(action, init);
  if (state?.ok && typeof window !== 'undefined') router.push(`/admin/integrations`);

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" required><TextInput name="name" defaultValue={row.name ?? ''} required /></Field>
        <Field label="Category">
          <Select name="category" defaultValue={row.category ?? ''}>
            <option value="">—</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Logo URL" hint="Path in media bucket or external URL"><TextInput name="logo_url" defaultValue={row.logo_url ?? ''} /></Field>
      <Field label="Website URL"><TextInput name="url" defaultValue={row.url ?? ''} placeholder="https://..." /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Order"><TextInput name="order_index" type="number" defaultValue={row.order_index ?? 0} /></Field>
        <Field label="Visibility" className="self-end"><Toggle name="published" defaultChecked={row.published !== false} label="Published" /></Field>
      </div>
      <Button type="submit" disabled={isPending}><Save className="size-4" />{isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create integration'}</Button>
    </form>
  );
}
