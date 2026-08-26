import { Plus } from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { ReorderControls } from '@/components/admin/ReorderControls';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { ButtonLink } from '@/components/ui/Button';
import { deleteIntegration, reorderIntegration } from './actions';

type I = { id: string; name: string; category: string | null; logo_url: string | null; url: string | null; order_index: number; published: boolean };

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('integrations').select('id, name, category, logo_url, url, order_index, published').order('order_index');
  const items = (data ?? []) as unknown as I[];

  return (
    <div>
      <PageHeader title="Integrations" description="The integrations grid on the home page و the /services page." actions={
        <ButtonLink href={`/admin/integrations/new`} size="sm" variant="primary"><Plus className="size-4" />جديد</ButtonLink>
      } />
      <DataTable rows={items} rowKey={(r) => r.id} editHref={(r) => `/admin/integrations/${r.id}`} emptyMessage="لا توجد تكاملات بعد."
        columns={[
          { key: 'order', header: 'الترتيب', width: '80px', cell: (r) => <ReorderControls id={r.id} isFirst={items[0]?.id === r.id} isLast={items[items.length - 1]?.id === r.id} action={reorderIntegration} /> },
          { key: 'logo', header: 'Logo', width: '80px', cell: (r) => r.logo_url ? <div className="relative h-8 w-16"><Image src={r.logo_url} alt={r.name} fill sizes="64px" className="object-contain" /></div> : <div className="size-8 rounded bg-sage-50 grid place-items-center text-xs text-ink-600">{r.name.slice(0, 2)}</div> },
          { key: 'name', header: 'الاسم', cell: (r) => <span className="font-medium">{r.name}</span> },
          { key: 'category', header: 'Category', width: '120px', cell: (r) => r.category ? <span className="px-2 py-0.5 rounded bg-sage-50 text-xs">{r.category}</span> : '—' },
          { key: 'published', header: 'الحالة', width: '100px', cell: (r) => r.published ? '🟢 منشور' : '⚪ مسودة' },
        ]}
        rowAction={(r) => <DeleteButton id={r.id} action={deleteIntegration} confirm={`حذف "${r.name}"؟`} />}
      />
    </div>
  );
}
