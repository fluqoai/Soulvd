'use client';

import { useActionState } from 'react';
import { useLocale } from 'next-intl';
import { Save } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { BilingualInput } from '@/components/admin/BilingualInput';
import { Field, TextInput, Textarea } from '@/components/admin/Field';
import { Toggle } from '@/components/admin/Toggle';
import { Button } from '@/components/ui/Button';
import {
  createServiceAction,
  updateServiceAction,
} from './actions';
import type { CrudResult } from '@/lib/admin/actions';

type Initial = {
  id?: string;
  key?: string;
  icon?: string;
  title?: { ar?: string; en?: string };
  description?: { ar?: string; en?: string };
  long_description?: { ar?: string; en?: string } | null;
  order_index?: number;
  published?: boolean;
};

const initial: CrudResult = { ok: false, error: '' };

export function ServiceForm({ initial: row }: { initial: Initial }) {
  const locale = 'ar' as 'ar' | 'en';
  const router = useRouter();
  const isEdit = !!row.id;

  const action = isEdit
    ? updateServiceAction.bind(null, row.id!)
    : createServiceAction;

  const [state, formAction, isPending] = useActionState<CrudResult, FormData>(action, initial);

  if (state?.ok) {
    // Success — push to list view.
    if (typeof window !== 'undefined') {
      router.push(`/admin/services`);
    }
  }

  return (
    <form action={formAction} className="space-y-6 max-w-3xl">
      {state && state.ok === false && 'error' in state && state.error === 'validation' && (
        <div className="rounded-lg border border-red-300/40 bg-red-500/10 p-3 text-sm text-red-200">
          Please fix the errors below and try again.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Key"
          hint="Lowercase, used in code (e.g. bot, campaigns)"
          required
          error={state && !state.ok && 'fieldErrors' in state ? state.fieldErrors?.key : undefined}
        >
          <TextInput
            name="key"
            defaultValue={row.key}
            placeholder="whatsapp-bot"
            required
          />
        </Field>
        <Field
          label="Icon"
          hint="Lucide icon name (Bot, Inbox, Workflow…)"
          required
          error={state && !state.ok && 'fieldErrors' in state ? state.fieldErrors?.icon : undefined}
        >
          <TextInput name="icon" defaultValue={row.icon} placeholder="Bot" required />
        </Field>
      </div>

      <BilingualInput
        name="title"
        label="Title"
        value={row.title}
        required
        error={state && !state.ok && 'fieldErrors' in state ? state.fieldErrors?.titleAr : undefined}
      />

      <BilingualInput
        name="description"
        label="Short description"
        value={row.description}
        multiline
        rows={3}
        required
      />

      <fieldset className="space-y-2">
        <legend className="block text-sm font-medium text-ink-800">Long description (optional)</legend>
        <p className="text-xs text-ink-500 -mt-1">
          Shown on the /services/[slug] detail page. Leave blank to fall back to the short description.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Textarea
            name="long_description_ar"
            defaultValue={row.long_description?.ar ?? ''}
            placeholder="العربية..."
            rows={6}
            dir="rtl"
          />
          <Textarea
            name="long_description_en"
            defaultValue={row.long_description?.en ?? ''}
            placeholder="English..."
            rows={6}
            dir="ltr"
          />
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Order">
          <TextInput
            name="order_index"
            type="number"
            defaultValue={row.order_index ?? 0}
            min={0}
          />
        </Field>
        <Field label="Visibility" className="self-end">
          <Toggle name="published" defaultChecked={row.published !== false} label="Published" hint="Visible on the public site" />
        </Field>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" size="md" variant="primary" disabled={isPending}>
          <Save className="size-4" />
          {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create service'}
        </Button>
      </div>
    </form>
  );
}
