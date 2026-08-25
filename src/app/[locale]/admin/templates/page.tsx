import { FileText, Construction } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { Link } from '@/i18n/routing';

export default function TemplatesPage() {
  return (
    <div>
      <PageHeader title="Templates" description="Document templates used to generate invoices and quotes." />

      <div className="rounded-2xl border-2 border-dashed border-ink-900/10 bg-paper p-10 text-center max-w-2xl">
        <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-sage-50 text-sage-700 mb-5">
          <Construction className="size-7" aria-hidden />
        </div>
        <h2 className="text-xl font-semibold text-ink-900 mb-2">Coming next</h2>
        <p className="text-base text-ink-600 max-w-md mx-auto">
          The templates engine is a major feature that needs your <code className="text-xs bg-linen-100 px-1.5 py-0.5 rounded">.docx</code> files
          with <code className="text-xs bg-linen-100 px-1.5 py-0.5 rounded">{'{{placeholders}}'}</code> first. Once uploaded, the admin
          will let you record the field schema per template and generate <code className="text-xs bg-linen-100 px-1.5 py-0.5 rounded">.docx</code> + PDF
          on demand.
        </p>
        <ol className="text-start mt-6 space-y-2 text-sm text-ink-700 max-w-md mx-auto">
          <li className="flex gap-2"><span className="text-sage-600 font-semibold">1.</span> Design your invoice/quote <code className="text-xs">.docx</code> in Word with placeholders like <code className="text-xs">{'{{client_name}}'}</code>.</li>
          <li className="flex gap-2"><span className="text-sage-600 font-semibold">2.</span> Upload it here, name it, set the language (ar/en/both).</li>
          <li className="flex gap-2"><span className="text-sage-600 font-semibold">3.</span> Record the field schema (text/number/date/line_items/etc.).</li>
          <li className="flex gap-2"><span className="text-sage-600 font-semibold">4.</span> Generate from the Invoices or Quotes pages — server fills the placeholders, returns a <code className="text-xs">.docx</code> + PDF, and gives you a shareable link.</li>
        </ol>
        <p className="mt-6 text-xs text-ink-500">
          Until this is built, no templates are needed for the public site.
        </p>
      </div>
    </div>
  );
}
