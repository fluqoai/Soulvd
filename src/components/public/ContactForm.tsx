'use client';

import { useActionState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { submitLead, type SubmitLeadState } from '@/app/[locale]/contact/actions';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const initialState: SubmitLeadState = { status: 'idle' };

export function ContactForm() {
  const t = useTranslations('contact.form');
  const locale = useLocale();
  const [state, formAction, isPending] = useActionState<SubmitLeadState, FormData>(
    submitLead,
    initialState
  );

  if (state.status === 'success') {
    return (
      <div className="rounded-2xl bg-sage-50 border border-sage-200 p-8 md:p-10 text-center">
        <div className="inline-flex size-14 items-center justify-center rounded-full bg-sage-100 text-sage-700 mb-5">
          <CheckCircle2 className="size-7" aria-hidden />
        </div>
        <h3 className="text-xl md:text-2xl font-semibold text-ink-900 mb-2">
          {t('success_title')}
        </h3>
        <p className="text-base text-ink-700 max-w-md mx-auto">
          {t('success_description')}
        </p>
      </div>
    );
  }

  const err = (k: string) => state.errors?.[k];

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="locale" value={locale} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          name="name"
          label={t('name')}
          placeholder={t('name_placeholder')}
          required
          error={err('name')}
        />
        <Field
          name="email"
          label={t('email')}
          type="email"
          placeholder={t('email_placeholder')}
          error={err('email')}
        />
        <Field
          name="phone"
          label={t('phone')}
          type="tel"
          placeholder={t('phone_placeholder')}
          error={err('phone')}
        />
        <Field
          name="company"
          label={t('company')}
          placeholder={t('company_placeholder')}
          error={err('company')}
        />
      </div>

      <Field
        name="message"
        label={t('message')}
        placeholder={t('message_placeholder')}
        required
        multiline
        error={err('message')}
      />

      <p className="text-xs text-ink-500">{t('required_note')}</p>

      {state.status === 'error' && state.message === 'insert_failed' && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden />
          <p>{t('error_description')}</p>
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        variant="primary"
        disabled={isPending}
        className="w-full sm:w-auto"
      >
        <Send className="size-4" aria-hidden />
        {isPending ? t('submitting') : t('submit')}
      </Button>
    </form>
  );
}

type FieldProps = {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  error?: string;
};

function Field({ name, label, type = 'text', placeholder, required, multiline, error }: FieldProps) {
  const baseClasses = cn(
    'w-full rounded-lg border bg-paper px-4 py-3 text-base text-ink-900 placeholder:text-ink-400',
    'transition-colors focus:outline-none focus:ring-2 focus:ring-sage-600/30 focus:border-sage-600',
    error ? 'border-red-300' : 'border-ink-900/15 hover:border-ink-900/25'
  );
  return (
    <label className="block">
      <span className="block text-sm font-medium text-ink-800 mb-1.5">
        {label}
        {required && <span className="text-red-600 ms-1">*</span>}
      </span>
      {multiline ? (
        <textarea
          name={name}
          placeholder={placeholder}
          required={required}
          rows={5}
          className={baseClasses}
        />
      ) : (
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          required={required}
          className={baseClasses}
        />
      )}
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}
