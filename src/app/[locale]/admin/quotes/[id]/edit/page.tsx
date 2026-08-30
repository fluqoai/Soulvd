// src/app/[locale]/admin/quotes/[id]/edit/page.tsx
// Edit a single quote. Server component loads the row + clients and hands
// them to <QuoteForm/>. On successful save the form redirects back to
// /admin/quotes/[id]. Quotes don't yet have a `project_id` column in the
// live DB (the `invoices` table got one in migration 0003, but quotes
// never did), so the form omits it for now.

import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/admin/PageHeader';
import { QuoteForm } from '@/components/admin/QuoteForm';
import type { LineItem } from '@/lib/quotes/actions';
import type { QuoteStatus } from '@/lib/quotes/constants';

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: quote } = await admin.from('quotes').select('*').eq('id', id).maybeSingle();
  if (!quote) notFound();

  // Lookups for the form's client <select>. Admin client bypasses RLS — safe
  // for server pages.
  const { data: clientsData } = await admin
    .from('clients')
    .select('id, name, company, status')
    .order('name', { ascending: true });

  const q = quote as unknown as {
    id: string;
    number: string;
    client_id: string | null;
    currency: string;
    vat_rate: number | null;
    status: QuoteStatus;
    issue_date: string;
    valid_until: string | null;
    notes: string | null;
    data: { line_items?: LineItem[] };
  };

  return (
    <div>
      <PageHeader
        title={`تعديل عرض السعر ${q.number}`}
        backHref={`/admin/quotes/${q.id}`}
        description="عدّل البنود أو التواريخ أو الحالة. اضغط حفظ للعودة إلى صفحة العرض."
      />
      <section className="rounded-2xl bg-paper border border-ink-900/5 p-6">
        <QuoteForm
          quote={q}
          clients={
            (clientsData ?? []) as Array<{
              id: string;
              name: string;
              company: string | null;
              status: string;
            }>
          }
        />
      </section>
    </div>
  );
}
