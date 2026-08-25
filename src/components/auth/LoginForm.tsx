'use client';

import { useActionState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { LogIn, AlertCircle, Loader2 } from 'lucide-react';
import { login, type LoginState } from '@/app/[locale]/login/actions';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const initial: LoginState = { status: 'idle' };

export function LoginForm() {
  const t = useTranslations('auth.login');
  const tErr = useTranslations('auth.errors');
  const locale = useLocale();
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    login,
    initial
  );

  const err = (k: string) => state.fieldErrors?.[k];

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="locale" value={locale} />

      <Field
        name="email"
        type="email"
        label={t('email')}
        placeholder="you@company.sa"
        required
        error={err('email')}
      />
      <Field
        name="password"
        type="password"
        label={t('password')}
        placeholder="••••••••"
        required
        error={err('password')}
      />

      {state.status === 'error' && state.error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3.5 text-sm text-red-800">
          <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden />
          <p>{tErr(state.error)}</p>
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        variant="primary"
        disabled={isPending}
        className="w-full"
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
        {isPending ? t('submitting') : t('submit')}
      </Button>
    </form>
  );
}

function Field({
  name,
  label,
  type = 'text',
  placeholder,
  required,
  error,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-ink-800 mb-1.5">
        {label}
        {required && <span className="text-red-600 ms-1">*</span>}
      </span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        autoComplete={type === 'password' ? 'current-password' : 'email'}
        className={cn(
          'w-full rounded-lg border bg-paper px-4 py-3 text-base text-ink-900 placeholder:text-ink-400',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-sage-600/30 focus:border-sage-600',
          error ? 'border-red-300' : 'border-ink-900/15 hover:border-ink-900/25'
        )}
      />
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}
