'use client';

import { useTransition } from 'react';
import { LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { logout } from '@/app/[locale]/(auth)/login/actions';
import { cn } from '@/lib/utils';

export function LogoutButton() {
  const t = useTranslations('admin.common');
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      onClick={() => start(() => logout())}
      disabled={pending}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium',
        'text-linen-300 hover:text-paper hover:bg-linen-400/10 transition-colors',
        'disabled:opacity-50'
      )}
    >
      <LogOut className="size-4" aria-hidden />
      {t('logout')}
    </button>
  );
}
