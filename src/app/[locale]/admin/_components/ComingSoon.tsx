// src/app/[locale]/admin/_components/ComingSoon.tsx
// Shared placeholder for admin pages whose CRUD hasn't been built yet.

import { getTranslations } from 'next-intl/server';
import { Construction } from 'lucide-react';

export async function ComingSoon({ nameKey }: { nameKey: string }) {
  const tCommon = await getTranslations('admin.common');
  const tNav = await getTranslations('admin.nav');
  const title = tNav(nameKey as never);

  return (
    <div className="rounded-2xl border-2 border-dashed border-ink-900/10 bg-paper p-10 md:p-16 text-center">
      <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-sage-50 text-sage-700 mb-5">
        <Construction className="size-7" aria-hidden />
      </div>
      <h2 className="text-xl md:text-2xl font-semibold text-ink-900 mb-2">{title}</h2>
      <p className="text-base text-ink-600 max-w-md mx-auto">
        {tCommon('coming_soon_description')}
      </p>
      <p className="mt-4 text-xs uppercase tracking-wider text-ink-500">
        {tCommon('coming_soon')}
      </p>
    </div>
  );
}
