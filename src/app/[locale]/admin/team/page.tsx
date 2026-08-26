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
      <PageHeader title="Team" description="Team members shown on the /about page." actions={
        <ButtonLink href={`/admin/team/new`} size="sm" variant="primary"><Plus className="size-4" />New</ButtonLink>
      } />
      <DataTable rows={items} rowKey={(r) => r.id} editHref={(r) => `/admin/team/${r.id}`} emptyMessage="No team members yet."
        columns={[
          { key: 'order', header: 'Order', width: '80px', cell: (r) => <ReorderControls id={r.id} isFirst={items[0]?.id === r.id} isLast={items[items.length - 1]?.id === r.id} action={reorderMember} /> },
          { key: 'name', header: 'Name', cell: (r) => <span className="font-medium">{r.full_name}</span> },
          { key: 'role', header: 'Role', cell: (r) => <span className="text-linen-300">{r.role}</span> },
          { key: 'published', header: 'Status', width: '100px', cell: (r) => r.published ? '🟢 Live' : '⚪ Draft' },
        ]}
        rowAction={(r) => <DeleteButton id={r.id} action={deleteMember} confirm={`Delete "${r.full_name}"?`} />}
      />
    </div>
  );
}
