import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { ReorderControls } from '@/components/admin/ReorderControls';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { ButtonLink } from '@/components/ui/Button';
import { deleteStatAction, reorderStatAction } from './actions';

type Stat = { id: string; value: string; label: { ar?: string; en?: string } | null; order_index: number; published: boolean };

export default async function StatsAdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('stats').select('id, value, label, order_index, published').order('order_index');
  const items = (data ?? []) as unknown as Stat[];

  return (
    <div>
      <PageHeader title="الإحصائيات" description="Big numbers shown on the home page." actions={
        <ButtonLink href={`/admin/stats/new`} size="sm" variant="primary"><Plus className="size-4" />New stat</ButtonLink>
      } />
      <DataTable
        rows={items} rowKey={(r) => r.id} editHref={(r) => `/admin/stats/${r.id}`} emptyMessage="لا توجد أرقام بعد."
        columns={[
          { key: 'order', header: 'الترتيب', width: '80px', cell: (r) => <ReorderControls id={r.id} isFirst={items[0]?.id === r.id} isLast={items[items.length - 1]?.id === r.id} action={reorderStatAction} /> },
          { key: 'value', header: 'Value', width: '100px', cell: (r) => <span className="text-xl font-semibold tabular-nums">{r.value}</span> },
          { key: 'label', header: 'Label', cell: (r) => <div className="min-w-0"><div className="truncate">{r.label?.en}</div>{r.label?.ar && <div className="text-xs text-ink-600 truncate" dir="rtl">{r.label.ar}</div>}</div> },
          { key: 'published', header: 'الحالة', width: '100px', cell: (r) => r.published ? '🟢 منشور' : '⚪ مسودة' },
        ]}
        rowAction={(r) => <DeleteButton id={r.id} action={deleteStatAction} confirm={`حذف "${r.value}"؟`} />}
      />
    </div>
  );
}
