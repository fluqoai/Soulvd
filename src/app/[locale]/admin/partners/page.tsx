import { Plus } from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { ReorderControls } from '@/components/admin/ReorderControls';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { ButtonLink } from '@/components/ui/Button';
import { deletePartner, reorderPartner } from './actions';

type P = { id: string; name: string; logo_url: string | null; url: string | null; order_index: number; published: boolean };

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('partners').select('id, name, logo_url, url, order_index, published').order('order_index');
  const items = (data ?? []) as unknown as P[];

  return (
    <div>
      <PageHeader title="الشركاء" description="The home page scrolling logo strip." actions={
        <ButtonLink href={`/admin/partners/new`} size="sm" variant="primary"><Plus className="size-4" />New partner</ButtonLink>
      } />
      <DataTable rows={items} rowKey={(r) => r.id} editHref={(r) => `/admin/partners/${r.id}`} emptyMessage="لا يوجد شركاء بعد."
        columns={[
          { key: 'order', header: 'الترتيب', width: '80px', cell: (r) => <ReorderControls id={r.id} isFirst={items[0]?.id === r.id} isLast={items[items.length - 1]?.id === r.id} action={reorderPartner} /> },
          { key: 'logo', header: 'Logo', width: '80px', cell: (r) => r.logo_url ? <div className="relative h-8 w-16"><Image src={r.logo_url} alt={r.name} fill sizes="64px" className="object-contain" /></div> : <div className="size-8 rounded bg-sage-50 grid place-items-center text-xs text-ink-600">{r.name.slice(0, 2)}</div> },
          { key: 'name', header: 'الاسم', cell: (r) => <span className="font-medium">{r.name}</span> },
          { key: 'url', header: 'Website', cell: (r) => r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="text-xs text-sage-300 hover:تحتline truncate max-w-[240px] inline-block align-middle">{r.url}</a> : <span className="text-ink-500">—</span> },
          { key: 'published', header: 'الحالة', width: '100px', cell: (r) => r.published ? '🟢 منشور' : '⚪ مسودة' },
        ]}
        rowAction={(r) => <DeleteButton id={r.id} action={deletePartner} confirm={`حذف "${r.name}"؟`} />}
      />
    </div>
  );
}
