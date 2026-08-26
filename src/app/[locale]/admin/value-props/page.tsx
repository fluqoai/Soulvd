import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { ReorderControls } from '@/components/admin/ReorderControls';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { ButtonLink } from '@/components/ui/Button';
import { deleteVP, reorderVP } from './actions';

type VP = { id: string; key: string; icon: string; title: { ar?: string; en?: string } | null; description: { ar?: string; en?: string } | null; order_index: number; published: boolean };

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('value_props').select('id, key, icon, title, description, order_index, published').order('order_index');
  const items = (data ?? []) as unknown as VP[];

  return (
    <div>
      <PageHeader title="Value props" description="The 'why Soulvd' product feature items." actions={
        <ButtonLink href={`/admin/value-props/new`} size="sm" variant="primary"><Plus className="size-4" />جديد</ButtonLink>
      } />
      <DataTable rows={items} rowKey={(r) => r.id} editHref={(r) => `/admin/value-props/${r.id}`} emptyMessage="لا توجد قيم بعد."
        columns={[
          { key: 'order', header: 'الترتيب', width: '80px', cell: (r) => <ReorderControls id={r.id} isFirst={items[0]?.id === r.id} isLast={items[items.length - 1]?.id === r.id} action={reorderVP} /> },
          { key: 'title', header: 'العنوان', cell: (r) => <div className="min-w-0"><div className="font-medium truncate">{r.title?.en}</div>{r.title?.ar && <div className="text-xs text-ink-600 truncate" dir="rtl">{r.title.ar}</div>}</div> },
          { key: 'icon', header: 'الأيقونة', width: '100px', cell: (r) => <code className="text-xs text-ink-700">{r.icon}</code> },
          { key: 'published', header: 'الحالة', width: '100px', cell: (r) => r.published ? '🟢 منشور' : '⚪ مسودة' },
        ]}
        rowAction={(r) => <DeleteButton id={r.id} action={deleteVP} confirm={`حذف "${r.title?.ar ?? r.title?.en ?? r.key}"؟`} />}
      />
    </div>
  );
}
