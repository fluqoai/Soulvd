'use client';
import { useActionState } from 'react';
import { useLocale } from 'next-intl';
import { Save } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { Field, TextInput } from '@/components/admin/Field';
import { Toggle } from '@/components/admin/Toggle';
import { Button } from '@/components/ui/Button';
import { createPartner, updatePartner } from './actions';
import type { CrudResult } from '@/lib/admin/actions';

type Initial = { id?: string; name?: string; logo_url?: string | null; url?: string | null; order_index?: number; published?: boolean };
const init: CrudResult = { ok: false, error: '' };

export function PartnerForm({ initial: row }: { initial: Initial }) {
  const locale = 'ar' as 'ar' | 'en';
  const router = useRouter();
  const isEdit = !!row.id;
  const action = isEdit ? updatePartner.bind(null, row.id!) : createPartner;
  const [state, formAction, isPending] = useActionState<CrudResult, FormData>(action, init);
  if (state?.ok && typeof window !== 'undefined') router.push(`/admin/partners`);

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      <Field label="Name" required><TextInput name="name" defaultValue={row.name ?? ''} required /></Field>
      <Field label="Logo URL" hint="Path in the media bucket, or full external URL">
        <TextInput name="logo_url" defaultValue={row.logo_url ?? ''} placeholder="partners/shopify.png" />
      </Field>
      <Field label="Website URL"><TextInput name="url" defaultValue={row.url ?? ''} placeholder="https://example.com" /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Order"><TextInput name="order_index" type="number" defaultValue={row.order_index ?? 0} /></Field>
        <Field label="Visibility" className="self-end"><Toggle name="published" defaultChecked={row.published !== false} label="Published" /></Field>
      </div>
      <Button type="submit" disabled={isPending}><Save className="size-4" />{isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create partner'}</Button>
    </form>
  );
}
