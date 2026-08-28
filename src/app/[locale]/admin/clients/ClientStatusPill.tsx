'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { setClientStatus } from './actions';

const STATUS_STYLES: Record<string, string> = {
  active:   'bg-sage-100 text-sage-800 ring-1 ring-sage-200 hover:bg-sage-200',
  inactive: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200 hover:bg-amber-200',
  archived: 'bg-ink-100 text-ink-600 ring-1 ring-ink-900/10 hover:bg-ink-200',
};

const STATUS_LABELS: Record<string, string> = {
  active:   'نشط',
  inactive: 'متوقف',
  archived: 'مؤرشف',
};

const CYCLE: Array<'active' | 'inactive' | 'archived'> = ['active', 'inactive', 'archived'];

/**
 * Inline status pill on the clients list.
 * Click cycles: active -> inactive -> archived -> active.
 * The edit page is the canonical place to change status; this is a shortcut.
 */
export function ClientStatusPill({ id, status }: { id: string; status: 'active' | 'inactive' | 'archived' }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState(status);

  const style = STATUS_STYLES[optimistic] ?? STATUS_STYLES.active;
  const label = STATUS_LABELS[optimistic] ?? optimistic;

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        const next = CYCLE[(CYCLE.indexOf(optimistic) + 1) % CYCLE.length];
        setOptimistic(next);
        startTransition(async () => {
          const r = await setClientStatus(id, next);
          if (!r.ok) setOptimistic(status); // rollback
          else router.refresh();
        });
      }}
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${style} ${isPending ? 'opacity-60' : ''}`}
      title="اضغط لتغيير الحالة"
    >
      {label}
    </button>
  );
}
