'use client';

import { ArrowUp, ArrowDown } from 'lucide-react';
import { useTransition } from 'react';
import { useRouter } from '@/i18n/routing';

type Props = {
  /** Server action that takes (id, direction) and reorders. */
  action: (id: string, direction: 'up' | 'down') => Promise<unknown>;
  id: string;
  isFirst: boolean;
  isLast: boolean;
};

export function ReorderControls({ action, id, isFirst, isLast }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const go = (direction: 'up' | 'down') => {
    startTransition(async () => {
      await action(id, direction);
      router.refresh();
    });
  };

  return (
    <div className="inline-flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => go('up')}
        disabled={isFirst || isPending}
        className="size-7 grid place-items-center rounded text-linen-400 hover:text-paper hover:bg-linen-400/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Move up"
      >
        <ArrowUp className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => go('down')}
        disabled={isLast || isPending}
        className="size-7 grid place-items-center rounded text-linen-400 hover:text-paper hover:bg-linen-400/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Move down"
      >
        <ArrowDown className="size-3.5" />
      </button>
    </div>
  );
}
