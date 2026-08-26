'use client';
import { useActionState } from 'react';
import { useLocale } from 'next-intl';
import { Save } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { BilingualInput } from '@/components/admin/BilingualInput';
import { Field, TextInput } from '@/components/admin/Field';
import { Toggle } from '@/components/admin/Toggle';
import { Button } from '@/components/ui/Button';
import { createTestimonial, updateTestimonial } from './actions';
import type { CrudResult } from '@/lib/admin/actions';

type Initial = { id?: string; client_name?: string; client_role?: string | null; client_company?: string | null; quote?: { ar?: string; en?: string }; avatar_url?: string | null; order_index?: number; published?: boolean };
const init: CrudResult = { ok: false, error: '' };

export function TestimonialForm({ initial: row }: { initial: Initial }) {
  const locale = 'ar' as 'ar' | 'en';
  const router = useRouter();
  const isEdit = !!row.id;
  const action = isEdit ? updateTestimonial.bind(null, row.id!) : createTestimonial;
  const [state, formAction, isPending] = useActionState<CrudResult, FormData>(action, init);
  if (state?.ok && typeof window !== 'undefined') router.push(`/admin/testimonials`);

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Client name" required><TextInput name="client_name" defaultValue={row.client_name ?? ''} required /></Field>
        <Field label="Role"><TextInput name="client_role" defaultValue={row.client_role ?? ''} placeholder="Marketing Director" /></Field>
      </div>
      <Field label="Company"><TextInput name="client_company" defaultValue={row.client_company ?? ''} placeholder="Acme Co." /></Field>
      <BilingualInput name="quote" label="Quote" value={row.quote} multiline rows={4} required />
      <Field label="Avatar URL"><TextInput name="avatar_url" defaultValue={row.avatar_url ?? ''} placeholder="testimonials/jane.png" /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Order"><TextInput name="order_index" type="number" defaultValue={row.order_index ?? 0} /></Field>
        <Field label="Visibility" className="self-end"><Toggle name="published" defaultChecked={row.published !== false} label="Published" /></Field>
      </div>
      <Button type="submit" disabled={isPending}><Save className="size-4" />{isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create testimonial'}</Button>
    </form>
  );
}
