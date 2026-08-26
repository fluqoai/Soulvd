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
  createSectorAction,
  updateSectorAction,
} from './actions';
import type { CrudResult } from '@/lib/admin/actions';

type Initial = {
  id?: string;
  key?: string;
  icon?: string;
  title?: { ar?: string; en?: string };
  description?: { ar?: string; en?: string };
  long_description?: { ar?: string; en?: string } | null;
  use_cases?: Array<{ ar?: string; en?: string }>;
  order_index?: number;
  published?: boolean;
};

const initial: CrudResult = { ok: false, error: '' };

export function SectorForm({ initial: row }: { initial: Initial }) {
  const locale = 'ar' as 'ar' | 'en';
  const router = useRouter();
  const isEdit = !!row.id;

  const action = isEdit ? updateSectorAction.bind(null, row.id!) : createSectorAction;
  const [state, formAction, isPending] = useActionState<CrudResult, FormData>(action, initial);

  if (state?.ok && typeof window !== 'undefined') {
    router.push(`/admin/sectors`);
  }

  const useCasesAr = (row.use_cases ?? [])
    .map((u) => u.ar)
    .filter(Boolean)
    .join('\n');
  const useCasesEn = (row.use_cases ?? [])
    .map((u) => u.en)
    .filter(Boolean)
    .join('\n');

  return (
    <form action={formAction} className="space-y-6 max-w-3xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="المعرّف" hint="يستخدم في الرابط (مثل: restaurants)" required>
          <TextInput name="key" defaultValue={row.key} required />
        </Field>
        <Field label="الأيقونة" hint="اسم أيقونة Lucide (مثل: Building2، UtensilsCrossed)" required>
          <TextInput name="icon" defaultValue={row.icon} required />
        </Field>
      </div>

      <BilingualInput name="title" label="العنوان" value={row.title} required />
      <BilingualInput name="description" label="وصف مختصر" value={row.description} multiline rows={3} required />

      <fieldset className="space-y-2">
        <legend className="block text-sm font-medium text-ink-800">Long description (optional)</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Textarea name="long_description_ar" defaultValue={row.long_description?.ar ?? ''} rows={6} dir="rtl" />
          <Textarea name="long_description_en" defaultValue={row.long_description?.en ?? ''} rows={6} dir="ltr" />
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="block text-sm font-medium text-ink-800">Use cases (one per line)</legend>
        <p className="text-xs text-ink-500 -mt-1">Shown as a bullet list on the /sectors/[slug] page.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Textarea name="use_cases_ar" defaultValue={useCasesAr} rows={5} dir="rtl" placeholder="استقبال طلبات المستفيدين" />
          <Textarea name="use_cases_en" defaultValue={useCasesEn} rows={5} dir="ltr" placeholder="Receive beneficiary requests 24/7" />
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الترتيب">
          <TextInput name="order_index" type="number" defaultValue={row.order_index ?? 0} />
        </Field>
        <Field label="الظهور" className="self-end">
          <Toggle name="published" defaultChecked={row.published !== false} label="منشور" />
        </Field>
      </div>

      <Button type="submit" disabled={isPending}>
        <Save className="size-4" />
        {isPending ? 'جاري الحفظ…' : isEdit ? 'حفظ التغييرات' : 'إنشاء قطاع'}
      </Button>
    </form>
  );
}
