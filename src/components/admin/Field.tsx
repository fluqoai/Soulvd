'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type FieldProps = {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
};

export function Field({ label, htmlFor, hint, error, required, children, className }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-800">
        {label}
        {required && <span className="text-red-600 ms-1">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-ink-500">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

const baseInput =
  'w-full rounded-lg border bg-paper px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 ' +
  'transition-colors focus:outline-none focus:ring-2 focus:ring-sage-600/30 focus:border-sage-600 ' +
  'border-ink-900/15 hover:border-ink-900/25';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean };
export function TextInput({ className, error, ...rest }: InputProps) {
  return (
    <input
      className={cn(baseInput, error && 'border-red-300', className)}
      {...rest}
    />
  );
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean };
export function Textarea({ className, error, rows = 4, ...rest }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      className={cn(baseInput, 'resize-y', error && 'border-red-300', className)}
      {...rest}
    />
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean };
export function Select({ className, error, children, ...rest }: SelectProps) {
  return (
    <select
      className={cn(baseInput, 'appearance-none bg-[length:1rem] bg-no-repeat bg-[position:right_0.6rem_center] pr-8', error && 'border-red-300', className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;charset=utf-8,%3Csvg viewBox='0 0 16 16' xmlns='http://www.w3.org/2000/svg' fill='%234a463e'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E\")",
      }}
      {...rest}
    >
      {children}
    </select>
  );
}
