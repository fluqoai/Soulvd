'use client';
import { useActionState } from 'react';
import { useLocale } from 'next-intl';
import { Save } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { BilingualInput } from '@/components/admin/BilingualInput';
import { Field, TextInput, Textarea } from '@/components/admin/Field';
import { Toggle } from '@/components/admin/Toggle';
import { Button } from '@/components/ui/Button';
import { createMember, updateMember } from './actions';
import type { CrudResult } from '@/lib/admin/actions';

type Initial = { id?: string; full_name?: string; role?: string; bio?: { ar?: string; en?: string } | null; photo_url?: string | null; links?: Record<string, string>; order_index?: number; published?: boolean };
const init: CrudResult = { ok: false, error: '' };

export function MemberForm({ initial: row }: { initial: Initial }) {
  const locale = 'ar' as 'ar' | 'en';
  const router = useRouter();
  const isEdit = !!row.id;
  const action = isEdit ? updateMember.bind(null, row.id!) : createMember;
  const [state, formAction, isPending] = useActionState<CrudResult, FormData>(action, init);
  if (state?.ok && typeof window !== 'undefined') router.push(`/admin/team`);

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الاسم الكامل" required><TextInput name="full_name" defaultValue={row.full_name ?? ''} required /></Field>
        <Field label="Role" required><TextInput name="role" defaultValue={row.role ?? ''} required /></Field>
      </div>
      <BilingualInput name="bio" label="Bio (optional)" value={row.bio ?? undefined} multiline rows={3} />
      <Field label="رابط الصورة" hint="المسار في bucket media أو رابط خارجي"><TextInput name="photo_url" defaultValue={row.photo_url ?? ''} /></Field>
      <Field label="Links (JSON)" hint='{"linkedin": "https://...", "twitter": "https://..."}'>
        <Textarea name="links_json" defaultValue={row.links ? JSON.stringify(row.links, null, 2) : ''} rows={4} dir="ltr" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الترتيب"><TextInput name="order_index" type="number" defaultValue={row.order_index ?? 0} /></Field>
        <Field label="الظهور" className="self-end"><Toggle name="published" defaultChecked={row.published !== false} label="منشور" /></Field>
      </div>
      <Button type="submit" disabled={isPending}><Save className="size-4" />{isPending ? 'جاري الحفظ…' : isEdit ? 'حفظ التغييرات' : 'إضافة عضو فريق'}</Button>
    </form>
  );
}
