// src/app/[locale]/admin/quotes/page.tsx
// Quotes list — uses the same invoice table with data.kind='quote'.

import { Plus, ScrollText } from 'lucide-react';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/admin/PageHeader';
import { ButtonLink } from '@/components/ui/Button';

export default function QuotesPage() {
  return (
    <div>
      <PageHeader
        title="عروض الأسعار"
        description="عروض الأسعار المُولّدة — استخدم مولّد المستندات لإنشاء عرض جديد."
        actions={
          <ButtonLink href="/admin/invoices/new?kind=quote" size="sm" variant="primary">
            <Plus className="size-4" /> عرض سعر جديد
          </ButtonLink>
        }
      />
      <div className="rounded-2xl border border-ink-900/10 bg-paper p-10 text-center max-w-2xl">
        <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-sage-50 text-sage-700 mb-5">
          <ScrollText className="size-7" aria-hidden />
        </div>
        <h2 className="text-xl font-semibold text-ink-900 mb-2">مولّد المستندات الموحد</h2>
        <p className="text-base text-ink-600 max-w-md mx-auto">
          عروض الأسعار والفواتير الآن في نفس المولّد — اختر نوع المستند في أعلى النموذج، املأ البنود، واحصل على PDF.
          العروض تُحفظ كمسودة في جدول الفواتير بحالة <code className="text-xs bg-linen-100 px-1.5 py-0.5 rounded">draft</code> وبنوع <code className="text-xs bg-linen-100 px-1.5 py-0.5 rounded">quote</code>.
        </p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <ButtonLink href="/admin/invoices/new?kind=quote" size="sm" variant="primary">
            <Plus className="size-4" /> إنشاء عرض سعر الآن
          </ButtonLink>
          <Link href="/admin/invoices" className="text-sm text-ink-600 hover:underline">
            كل المستندات
          </Link>
        </div>
      </div>
    </div>
  );
}
