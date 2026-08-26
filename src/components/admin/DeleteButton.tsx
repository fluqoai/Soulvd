'use client';

import { useTransition, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useRouter } from '@/i18n/routing';

type Props = {
  /** Server action that takes the row id and deletes. */
  action: (id: string) => Promise<{ ok: boolean; error?: string }>;
  id: string;
  /** Confirmation prompt shown in the confirm() dialog. */
  confirm?: string;
  /** Optional label, e.g. "حذف" or empty to render icon-only. */
  label?: string;
};

export function DeleteButton({ action, id, confirm = 'هل تريد حذف هذا العنصر؟', label }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const onClick = () => {
    if (typeof window !== 'undefined' && !window.confirm(confirm)) return;
    startTransition(async () => {
      const result = await action(id);
      if (!result.ok) {
        setError(result.error ?? 'فشل الحذف');
        return;
      }
      setError(null);
      router.refresh();
    });
  };

  return (
    <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="inline-flex">
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-ink-700 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 disabled:opacity-50 transition-colors"
        title={error ?? undefined}
      >
        <Trash2 className="size-3.5" aria-hidden />
        {label && <span>{label}</span>}
      </button>
    </form>
  );
}
