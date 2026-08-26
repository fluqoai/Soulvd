import { Construction } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { Link } from '@/i18n/routing';

export default function InvoicesPage() {
  return (
    <div>
      <PageHeader title="الفواتير" description="Generated invoices — depends on the templates engine." />
      <div className="rounded-2xl border-2 border-dashed border-ink-900/10 bg-paper p-10 text-center max-w-2xl">
        <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-sage-50 text-sage-700 mb-5">
          <Construction className="size-7" aria-hidden />
        </div>
        <h2 className="text-xl font-semibold text-ink-900 mb-2">Waiting on templates</h2>
        <p className="text-base text-ink-600 max-w-md mx-auto">
          Once you upload a <code className="text-xs bg-linen-100 px-1.5 py-0.5 rounded">.docx</code> template with
          {' '}<code className="text-xs bg-linen-100 px-1.5 py-0.5 rounded">{'{{placeholders}}'}</code>, this is where you'll
          create invoices (pick client → fill values → generate <code className="text-xs">.docx</code> + PDF → share link).
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/admin/templates" className="text-sm text-sage-700 hover:تحتline font-medium">Go to Templates →</Link>
          <Link href="/admin/clients" className="text-sm text-ink-600 hover:تحتline">Manage clients</Link>
        </div>
      </div>
    </div>
  );
}
