import { Construction } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';

export default function CaseStudiesPage() {
  return (
    <div>
      <PageHeader title="Case studies" description="Client stories, optionally tied to a sector." />
      <div className="rounded-2xl border-2 border-dashed border-ink-900/10 bg-paper p-10 text-center max-w-2xl">
        <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-sage-50 text-sage-700 mb-5">
          <Construction className="size-7" aria-hidden />
        </div>
        <h2 className="text-xl font-semibold text-ink-900 mb-2">Coming next</h2>
        <p className="text-base text-ink-600 max-w-md mx-auto">
          Case studies have more shape than the other content tables (sector link, cover image, results block).
          We deferred this so the simpler tables could ship first.
        </p>
        <p className="mt-4 text-xs text-ink-500">
          Fields: title, summary, content, results (label + value pairs), cover image, linked sector, published.
        </p>
      </div>
    </div>
  );
}
