'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { setClientStatus } from './actions';

// Sage / wood / linen brand. prospect = cool blue (not yet committed),
// active = sage (current), paused = warm wood (waiting).
const STATUS_STYLES: Record<string, string> = {
  prospect: 'bg-sky-100 text-sky-800 ring-1 ring-sky-200 hover:bg-sky-200',
  active:   'bg-sage-100 text-sage-800 ring-1 ring-sage-200 hover:bg-sage-200',
  paused:   'bg-wood-100 text-wood-700 ring-1 ring-wood-300 hover:bg-wood-200',
};

const STATUS_LABELS: Record<string, string> = {
  prospect: 'محتمل',
  active:   'نشط',
  paused:   'متوقف',
};

const CYCLE: Array<'prospect' | 'active' | 'paused'> = ['prospect', 'active', 'paused'];

/**
 * Inline status pill on the clients list.
 * Click cycles: prospect -> active -> paused -> prospect.
 * The edit page is the canonical place to change status; this is a shortcut.
 */
export function ClientStatusPill({ id, status }: { id: string; status: 'prospect' | 'active' | 'paused' }) {
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
