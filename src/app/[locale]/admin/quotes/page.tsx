// src/app/[locale]/admin/quotes/page.tsx
// Quotes — waiting on the templates engine. Shows clear next steps.

import { Construction } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { Link } from '@/i18n/routing';

export default function QuotesPage() {
  return (
    <div>
      <PageHeader
        title="عروض الأسعار"
        description="عروض الأسعار المُولّدة — تعمل مع محرك القوالب. ارفع قالباً أولاً ثم ابدأ الإنشاء."
      />
      <div className="rounded-2xl border-2 border-dashed border-ink-900/10 bg-paper p-10 text-center max-w-2xl">
        <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-sage-50 text-sage-700 mb-5">
          <Construction className="size-7" aria-hidden />
        </div>
        <h2 className="text-xl font-semibold text-ink-900 mb-2">بانتظار القوالب</h2>
        <p className="text-base text-ink-600 max-w-md mx-auto">
          بمجرد أن ترفع قالباً
          {' '}<code className="text-xs bg-linen-100 px-1.5 py-0.5 rounded">.docx</code>
          {' '}لعروض الأسعار، ستتمكن من إنشاء عروض هنا: اختر العميل أو الاستفسار
          → عبئ البنود → ولّد
          {' '}<code className="text-xs">.docx</code> + PDF → أرسل للعميل.
        </p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <Link href="/admin/templates" className="text-sm text-sage-700 hover:underline font-medium">
            الذهاب إلى القوالب ←
          </Link>
          <Link href="/admin/clients" className="text-sm text-ink-600 hover:underline">
            إدارة العملاء
          </Link>
        </div>
      </div>
    </div>
  );
}
