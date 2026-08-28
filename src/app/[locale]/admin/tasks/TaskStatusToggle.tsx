'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { Check, Loader2 } from 'lucide-react';
import { setTaskStatus, type TaskStatus } from '@/lib/tasks/actions';

/** Round checkbox that toggles between 'pending' and 'done' for a task. */
export function TaskStatusToggle({ id, status }: { id: string; status: TaskStatus }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<TaskStatus>(status);

  const isDone = optimistic === 'done';

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        const next: TaskStatus = isDone ? 'pending' : 'done';
        setOptimistic(next);
        startTransition(async () => {
          const r = await setTaskStatus(id, next);
          if (!r.ok) setOptimistic(status);
          else router.refresh();
        });
      }}
      className={`shrink-0 mt-0.5 size-6 rounded-full border-2 grid place-items-center transition-colors ${
        isDone
          ? 'bg-sage-600 border-sage-600 text-paper'
          : 'border-ink-900/25 hover:border-sage-500 text-transparent hover:text-sage-300'
      }`}
      title={isDone ? 'إلغاء الإنجاز' : 'وضع كمنجز'}
      aria-label="toggle done"
    >
      {isPending ? <Loader2 className="size-3 animate-spin" /> : isDone && <Check className="size-3.5" />}
    </button>
  );
}
