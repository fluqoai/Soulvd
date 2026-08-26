import { Activity } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';

type Log = { id: string; user_id: string | null; action: string; entity_type: string | null; entity_id: string | null; details: any; created_at: string };

// Light-theme status pills for activity log actions
const ACTION_STYLES: Record<string, string> = {
  created: 'bg-sage-100 text-sage-800 ring-1 ring-sage-200',
  updated: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
  deleted: 'bg-red-100 text-red-800 ring-1 ring-red-200',
  login: 'bg-linen-200 text-ink-700 ring-1 ring-linen-300',
  role_changed: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
  status_changed: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
  note_added: 'bg-ink-100 text-ink-700 ring-1 ring-ink-900/10',
  converted_to_client: 'bg-sage-200 text-sage-900 ring-1 ring-sage-300',
};

const ACTION_LABELS: Record<string, string> = {
  created: 'إنشاء',
  updated: 'تعديل',
  deleted: 'حذف',
  login: 'دخول',
  role_changed: 'تغيير دور',
  status_changed: 'تغيير حالة',
  note_added: 'إضافة ملاحظة',
  converted_to_client: 'تحويل لعميل',
};

export default async function ActivityLogPage() {
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  const { data: users } = await supabase.from('users').select('id, email');
  const userMap = new Map((users ?? []).map((u: any) => [u.id, u.email]));

  const items = (logs ?? []) as unknown as Log[];

  return (
    <div>
      <PageHeader
        title="سجل النشاط"
        description="آخر الإجراءات في النظام. الأحدث أولاً، حتى 200 سجل."
      />
      <DataTable
        rows={items}
        rowKey={(r) => r.id}
        editHref={() => '#'}
        emptyMessage="لا يوجد نشاط بعد."
        columns={[
          {
            key: 'when',
            header: 'الوقت',
            width: '180px',
            cell: (r) => (
              <span className="text-xs text-ink-700 tabular-nums">
                {new Date(r.created_at).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            ),
          },
          {
            key: 'who',
            header: 'بواسطة',
            width: '220px',
            cell: (r) => (
              <span className="text-xs text-ink-700 truncate">
                {r.user_id ? (userMap.get(r.user_id) ?? r.user_id.slice(0, 8)) : <span className="text-ink-400">النظام</span>}
              </span>
            ),
          },
          {
            key: 'action',
            header: 'الفعل',
            width: '180px',
            cell: (r) => (
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${ACTION_STYLES[r.action] ?? ACTION_STYLES.updated}`}>
                {ACTION_LABELS[r.action] ?? r.action}
              </span>
            ),
          },
          {
            key: 'target',
            header: 'الهدف',
            cell: (r) => (
              <span className="text-xs text-ink-700">
                {r.entity_type ?? <span className="text-ink-400">—</span>}
                {r.entity_id && <span className="text-ink-500"> · {r.entity_id.slice(0, 8)}</span>}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
