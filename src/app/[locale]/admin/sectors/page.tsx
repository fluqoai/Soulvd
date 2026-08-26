import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { ReorderControls } from '@/components/admin/ReorderControls';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { ButtonLink } from '@/components/ui/Button';
import { Link } from '@/i18n/routing';
import {
  deleteSectorAction,
  reorderSectorAction,
} from './actions';

type Sector = {
  id: string;
  key: string;
  icon: string;
  title: { ar?: string; en?: string } | null;
  description: { ar?: string; en?: string } | null;
  order_index: number;
  published: boolean;
};

export default async function SectorsAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from('sectors')
    .select('id, key, icon, title, description, order_index, published')
    .order('order_index', { ascending: true });

  const items = (rows ?? []) as unknown as Sector[];

  return (
    <div>
      <PageHeader
        title="Sectors"
        description="Sector cards on the home page and the /sectors list."
        actions={
          <ButtonLink href={`/admin/sectors/new`} size="sm" variant="primary">
            <Plus className="size-4" />
            New sector
          </ButtonLink>
        }
      />
      <DataTable
        rows={items}
        rowKey={(r) => r.id}
        editHref={(r) => `/admin/sectors/${r.id}`}
        emptyMessage="No sectors yet."
        columns={[
          { key: 'order', header: 'Order', width: '80px', cell: (r) => (
            <ReorderControls id={r.id} isFirst={items[0]?.id === r.id} isLast={items[items.length - 1]?.id === r.id} action={reorderSectorAction} />
          )},
          { key: 'title', header: 'Title', cell: (r) => (
            <div className="min-w-0">
              <div className="font-medium truncate">{r.title?.en || r.title?.ar || '—'}</div>
              {r.title?.ar && r.title?.en && <div className="text-xs text-linen-400 truncate" dir="rtl">{r.title.ar}</div>}
            </div>
          )},
          { key: 'key', header: 'Key', width: '120px', cell: (r) => <code className="text-xs text-linen-300">{r.key}</code> },
          { key: 'published', header: 'Status', width: '100px', cell: (r) => r.published ? '🟢 Live' : '⚪ Draft' },
        ]}
        rowAction={(r) => (
          <DeleteButton id={r.id} action={deleteSectorAction} confirm={`Delete "${r.title?.en ?? r.key}"?`} />
        )}
      />
    </div>
  );
}
