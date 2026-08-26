'use client';
import { useActionState } from 'react';
import { Save, CheckCircle2 } from 'lucide-react';
import { Field, TextInput } from '@/components/admin/Field';
import { Button } from '@/components/ui/Button';
import { saveSettings, type SettingsState } from './actions';

type Initial = {
  site_name?: string;
  tagline?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  hours?: string | null;
  social?: { twitter?: string | null; linkedin?: string | null; instagram?: string | null } | null;
  default_og_image?: string | null;
};

const init: SettingsState = { ok: false };

export function SettingsForm({ initial: row }: { initial: Initial }) {
  const [state, formAction, isPending] = useActionState<SettingsState, FormData>(saveSettings, init);

  if (state.ok) {
    return (
      <div className="rounded-xl border border-sage-500/30 bg-sage-500/10 p-6 text-center">
        <CheckCircle2 className="size-8 text-sage-300 mx-auto mb-2" />
        <p className="text-sage-100 font-medium">Settings saved.</p>
      </div>
    );
  }

  const fe = state.fieldErrors ?? {};
  const social = row.social ?? {};

  return (
    <form action={formAction} className="space-y-8 max-w-2xl">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-600">الهوية</h2>
        <Field label="اسم الموقع" required error={fe.site_name}>
          <TextInput name="site_name" defaultValue={row.site_name ?? ''} required />
        </Field>
        <Field label="الشعار" hint="One-line description used in headers/footers">
          <TextInput name="tagline" defaultValue={row.tagline ?? ''} />
        </Field>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-600">Contact</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="البريد"><TextInput name="email" type="email" defaultValue={row.email ?? ''} /></Field>
          <Field label="الهاتف"><TextInput name="phone" defaultValue={row.phone ?? ''} /></Field>
        </div>
        <Field label="رقم واتساب" hint="Used in wa.me link, e.g. +966500000000">
          <TextInput name="whatsapp" defaultValue={row.whatsapp ?? ''} />
        </Field>
        <Field label="العنوان"><TextInput name="address" defaultValue={row.address ?? ''} /></Field>
        <Field label="ساعات العمل" hint='e.g. "Sunday - Thursday: 9 AM - 6 PM"'>
          <TextInput name="hours" defaultValue={row.hours ?? ''} />
        </Field>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-600">Social</h2>
        <Field label="Twitter / X"><TextInput name="twitter" type="url" defaultValue={social.twitter ?? ''} placeholder="https://x.com/..." /></Field>
        <Field label="لينكدإن"><TextInput name="linkedin" type="url" defaultValue={social.linkedin ?? ''} placeholder="https://linkedin.com/company/..." /></Field>
        <Field label="إنستغرام"><TextInput name="instagram" type="url" defaultValue={social.instagram ?? ''} placeholder="https://instagram.com/..." /></Field>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-600">SEO</h2>
        <Field label="رابط صورة OG الافتراضية" hint="تظهر عند مشاركة الموقع على السوشال">
          <TextInput name="default_og_image" defaultValue={row.default_og_image ?? ''} placeholder="/og.png" />
        </Field>
      </section>

      <Button type="submit" size="lg" disabled={isPending}>
        <Save className="size-4" />
        {isPending ? 'جاري الحفظ…' : 'حفظ الإعدادات'}
      </Button>
    </form>
  );
}
