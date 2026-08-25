'use client';

import { cn } from '@/lib/utils';

type Locale = 'ar' | 'en';

type Props = {
  name: string;                       // form field name (we'll write {ar,en} JSON)
  label: string;
  value?: { ar?: string; en?: string };
  placeholder?: { ar?: string; en?: string };
  multiline?: boolean;
  rows?: number;
  required?: boolean;
  error?: string;                     // single error message shown beneath both
  dir?: 'rtl' | 'ltr';                // visual order of the two fields
};

const PLACEHOLDER_AR = 'اكتب هنا...';
const PLACEHOLDER_EN = 'Write here...';

/**
 * Two stacked inputs (Arabic + English) that submit as a single
 * hidden JSON `{ar, en}` field. Keeps the bilingual editor compact
 * while staying server-action friendly.
 */
export function BilingualInput({
  name,
  label,
  value,
  placeholder,
  multiline = false,
  rows = 3,
  required = false,
  error,
  dir = 'rtl',
}: Props) {
  const fields: Array<{ locale: Locale; dir: 'rtl' | 'ltr' }> =
    dir === 'rtl'
      ? [
          { locale: 'ar', dir: 'rtl' },
          { locale: 'en', dir: 'ltr' },
        ]
      : [
          { locale: 'en', dir: 'ltr' },
          { locale: 'ar', dir: 'rtl' },
        ];

  const baseInput =
    'w-full rounded-lg border bg-paper px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 ' +
    'transition-colors focus:outline-none focus:ring-2 focus:ring-sage-600/30 focus:border-sage-600 ' +
    'border-ink-900/15 hover:border-ink-900/25';

  return (
    <fieldset className="space-y-2">
      <legend className="block text-sm font-medium text-ink-800">
        {label}
        {required && <span className="text-red-600 ms-1">*</span>}
      </legend>

      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map(({ locale, dir: fieldDir }) => {
          const v = value?.[locale] ?? '';
          const ph = placeholder?.[locale] ?? (locale === 'ar' ? PLACEHOLDER_AR : PLACEHOLDER_EN);
          const common = {
            name: `${name}.${locale}`,
            defaultValue: v,
            placeholder: ph,
            dir: fieldDir,
            className: cn(baseInput, 'resize-y'),
          };
          return (
            <div key={locale} className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                {locale === 'ar' ? 'العربية' : 'English'}
              </span>
              {multiline ? (
                <textarea rows={rows} {...common} />
              ) : (
                <input type="text" {...common} />
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </fieldset>
  );
}

/**
 * Renders a hidden input that contains the bilingual object as JSON.
 * Pair this with <BilingualInput>'s `name` so the server action can
 * re-join the two locale inputs.
 */
export function BilingualHidden({ name, value }: { name: string; value?: { ar?: string; en?: string } }) {
  return <input type="hidden" name={name} defaultValue={JSON.stringify(value ?? { ar: '', en: '' })} />;
}
