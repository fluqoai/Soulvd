import { Mail, ShieldCheck, Edit3 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { RoleSelect } from './RoleSelect';

type U = { id: string; email: string; full_name: string | null; role: string; created_at: string };

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: { user: acting } } = await supabase.auth.getUser();
  const { data } = await supabase.from('users').select('id, email, full_name, role, created_at').order('created_at');
  const items = (data ?? []) as unknown as U[];

  return (
    <div>
      <PageHeader title="المستخدمون" description="كل الحسابات التي تستطيع الدخول إلى /admin. المالك (owner) يرى كل شيء؛ المحرر (editor) محدود بالمحتوى." />
      <DataTable
        rows={items}
        rowKey={(r) => r.id}
        editHref={() => '#'}
        emptyMessage="No users yet."
        columns={[
          { key: 'user', header: 'User', cell: (r) => (
            <div>
              <div className="font-medium">{r.full_name || r.email}</div>
              {r.full_name && <div className="text-xs text-ink-600 flex items-center gap-1"><Mail className="size-3" />{r.email}</div>}
            </div>
          )},
          { key: 'role', header: 'الدور', width: '180px', cell: (r) => (
            <RoleSelect userId={r.id} currentRole={r.role} isSelf={acting?.id === r.id} />
          ) },
          { key: 'created', header: 'تاريخ الانضمام', width: '140px', cell: (r) => (
            <span className="text-xs text-ink-600">{new Date(r.created_at).toLocaleDateString()}</span>
          ) },
        ]}
      />
      <p className="mt-4 text-xs text-ink-500">
        <ShieldCheck className="size-3 inline me-1" />
        Owner changes are logged in the activity log. You cannot demote your own account.
      </p>
    </div>
  );
}
