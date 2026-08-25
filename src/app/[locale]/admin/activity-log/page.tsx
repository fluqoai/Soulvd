import { Activity } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';

type Log = { id: string; user_id: string | null; action: string; entity_type: string | null; entity_id: string | null; details: any; created_at: string };

const ACTION_STYLES: Record<string, string> = {
  created: 'bg-sage-500/15 text-sage-300',
  updated: 'bg-blue-500/15 text-blue-300',
  deleted: 'bg-red-500/15 text-red-300',
  login: 'bg-linen-400/15 text-linen-300',
  role_changed: 'bg-amber-500/15 text-amber-300',
  status_changed: 'bg-amber-500/15 text-amber-300',
  note_added: 'bg-ink-700 text-linen-300',
  converted_to_client: 'bg-sage-500/20 text-sage-200',
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
      <PageHeader title="Activity log" description="Recent admin actions across the system. Newest first, max 200." />
      <DataTable
        rows={items}
        rowKey={(r) => r.id}
        editHref={() => '#'}
        emptyMessage="No activity yet."
        columns={[
          { key: 'when', header: 'When', width: '160px', cell: (r) => (
            <span className="text-xs text-linen-400 tabular-nums">{new Date(r.created_at).toLocaleString()}</span>
          )},
          { key: 'who', header: 'Who', width: '220px', cell: (r) => (
            <span className="text-xs text-linen-300 truncate">{r.user_id ? (userMap.get(r.user_id) ?? r.user_id.slice(0, 8)) : '—'}</span>
          )},
          { key: 'action', header: 'Action', width: '160px', cell: (r) => (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_STYLES[r.action] ?? 'bg-ink-700 text-linen-300'}`}>
              {r.action}
            </span>
          )},
          { key: 'target', header: 'Target', cell: (r) => (
            <span className="text-xs text-linen-300">
              {r.entity_type ? `${r.entity_type}` : '—'}
              {r.entity_id && <span className="text-linen-500"> · {r.entity_id.slice(0, 8)}</span>}
            </span>
          )},
        ]}
      />
    </div>
  );
}
