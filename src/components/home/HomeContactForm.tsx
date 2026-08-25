'use client';

import { useActionState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  submitHomeLead,
  type SubmitHomeLeadState,
} from '@/app/[locale]/home-contact/actions';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const initialState: SubmitHomeLeadState = { status: 'idle' };

export function HomeContactForm() {
  const t = useTranslations('home.contact');
  const locale = useLocale();
  const [state, formAction, isPending] = useActionState<SubmitHomeLeadState, FormData>(
    submitHomeLead,
    initialState
  );

  if (state.status === 'success') {
    return (
      <div className="rounded-3xl bg-sage-50 border border-sage-200 p-8 md:p-12 text-center">
        <div className="inline-flex size-14 items-center justify-center rounded-full bg-sage-100 text-sage-700 mb-5">
          <CheckCircle2 className="size-7" aria-hidden />
        </div>
        <h3 className="text-2xl md:text-3xl font-semibold text-ink-900 mb-3">
          {t('success_title')}
        </h3>
        <p className="text-base md:text-lg text-ink-700 max-w-md mx-auto">
          {t('success_description')}
        </p>
      </div>
    );
  }

  const err = (k: string) => state.errors?.[k];

  return (
    <form
      action={formAction}
      className="grid gap-4 md:gap-5 md:grid-cols-2"
      noValidate
    >
      <input type="hidden" name="locale" value={locale} />

      <Field
        name="name"
        label={t('name')}
        placeholder={t('name_placeholder')}
        required
        error={err('name')}
        className="md:col-span-1"
      />
      <Field
        name="email"
        label={t('email')}
        type="email"
        placeholder={t('email_placeholder')}
        required
        error={err('email')}
        className="md:col-span-1"
      />
      <Field
        name="message"
        label={t('message')}
        placeholder={t('message_placeholder')}
        required
        multiline
        error={err('message')}
        className="md:col-span-2"
      />

      {state.status === 'error' && state.message === 'insert_failed' && (
        <div className="md:col-span-2 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden />
          <p>{t('error_description')}</p>
        </div>
      )}

      <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <p className="text-xs text-ink-500">{t('required_note')}</p>
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
      </div>
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
  className?: string;
};

function Field({
  name,
  label,
  type = 'text',
  placeholder,
  required,
  multiline,
  error,
  className,
}: FieldProps) {
  const baseClasses = cn(
    'w-full rounded-lg border bg-paper px-4 py-3 text-base text-ink-900 placeholder:text-ink-400',
    'transition-colors focus:outline-none focus:ring-2 focus:ring-sage-600/30 focus:border-sage-600',
    error ? 'border-red-300' : 'border-ink-900/15 hover:border-ink-900/25'
  );
  return (
    <label className={cn('block', className)}>
      <span className="block text-sm font-medium text-ink-800 mb-1.5">
        {label}
        {required && <span className="text-red-600 ms-1">*</span>}
      </span>
      {multiline ? (
        <textarea
          name={name}
          placeholder={placeholder}
          required={required}
          rows={4}
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
