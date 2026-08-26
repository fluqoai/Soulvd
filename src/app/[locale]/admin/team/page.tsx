import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { ReorderControls } from '@/components/admin/ReorderControls';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { ButtonLink } from '@/components/ui/Button';
import { deleteMember, reorderMember } from './actions';

type M = { id: string; full_name: string; role: string; order_index: number; published: boolean };

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('team_members').select('id, full_name, role, order_index, published').order('order_index');
  const items = (data ?? []) as unknown as M[];

  return (
    <div>
      <PageHeader title="الفريق" description="Team members shown on the /about page." actions={
        <ButtonLink href={`/admin/team/new`} size="sm" variant="primary"><Plus className="size-4" />جديد</ButtonLink>
      } />
      <DataTable rows={items} rowKey={(r) => r.id} editHref={(r) => `/admin/team/${r.id}`} emptyMessage="لا يوجد أعضاء فريق بعد."
        columns={[
          { key: 'order', header: 'الترتيب', width: '80px', cell: (r) => <ReorderControls id={r.id} isFirst={items[0]?.id === r.id} isLast={items[items.length - 1]?.id === r.id} action={reorderMember} /> },
          { key: 'name', header: 'الاسم', cell: (r) => <span className="font-medium">{r.full_name}</span> },
          { key: 'role', header: 'الدور', cell: (r) => <span className="text-ink-700">{r.role}</span> },
          { key: 'published', header: 'الحالة', width: '100px', cell: (r) => r.published ? '🟢 منشور' : '⚪ مسودة' },
        ]}
        rowAction={(r) => <DeleteButton id={r.id} action={deleteMember} confirm={`حذف "${r.full_name}"؟`} />}
      />
    </div>
  );
}
