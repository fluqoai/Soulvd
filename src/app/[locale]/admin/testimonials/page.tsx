import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { ReorderControls } from '@/components/admin/ReorderControls';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { ButtonLink } from '@/components/ui/Button';
import { deleteTestimonial, reorderTestimonial } from './actions';

type T = { id: string; client_name: string; client_company: string | null; quote: { ar?: string; en?: string } | null; order_index: number; published: boolean };

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('testimonials').select('id, client_name, client_company, quote, order_index, published').order('order_index');
  const items = (data ?? []) as unknown as T[];

  return (
    <div>
      <PageHeader title="Testimonials" description="Client quotes shown on the site." actions={
        <ButtonLink href={`/${locale}/admin/testimonials/new`} size="sm" variant="primary"><Plus className="size-4" />New</ButtonLink>
      } />
      <DataTable rows={items} rowKey={(r) => r.id} editHref={(r) => `/${locale}/admin/testimonials/${r.id}`} emptyMessage="No testimonials yet."
        columns={[
          { key: 'order', header: 'Order', width: '80px', cell: (r) => <ReorderControls id={r.id} isFirst={items[0]?.id === r.id} isLast={items[items.length - 1]?.id === r.id} action={reorderTestimonial} /> },
          { key: 'name', header: 'Client', cell: (r) => <div><div className="font-medium">{r.client_name}</div>{r.client_company && <div className="text-xs text-linen-400">{r.client_company}</div>}</div> },
          { key: 'quote', header: 'Quote', cell: (r) => <div className="max-w-md text-linen-300 line-clamp-2">{r.quote?.en || r.quote?.ar}</div> },
          { key: 'published', header: 'Status', width: '100px', cell: (r) => r.published ? '🟢 Live' : '⚪ Draft' },
        ]}
        rowAction={(r) => <DeleteButton id={r.id} action={deleteTestimonial} confirm={`Delete "${r.client_name}"?`} />}
      />
    </div>
  );
}
