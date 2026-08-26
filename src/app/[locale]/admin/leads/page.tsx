import { Plus, Mail, Phone, Building2 } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { deleteLead } from './actions';

type Lead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  message: string | null;
  source: string;
  status: string;
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-ink-700/50 text-linen-300',
  contacted: 'bg-blue-500/15 text-blue-300',
  qualified: 'bg-amber-500/15 text-amber-300',
  closed: 'bg-sage-500/15 text-sage-300',
  lost: 'bg-red-500/15 text-red-300',
};

export default async function LeadsAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  const { status: statusFilter } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('leads')
    .select('id, name, email, phone, company, message, source, status, created_at')
    .order('created_at', { ascending: false });

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data: rows } = await query;
  const items = (rows ?? []) as unknown as Lead[];

  const filterTabs = [
    { value: 'all', label: 'All' },
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'closed', label: 'Closed' },
    { value: 'lost', label: 'Lost' },
  ];

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Inbound leads from the home page and /contact forms."
        actions={
          <span className="text-xs text-linen-400">{items.length} total</span>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1">
        {filterTabs.map((tab) => {
          const active = (statusFilter ?? 'all') === tab.value;
          return (
            <Link
              key={tab.value}
              href={`/admin/leads?status=${tab.value}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                active
                  ? 'bg-paper text-ink-900'
                  : 'bg-ink-800/40 text-linen-300 hover:bg-ink-800/70'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <DataTable
        rows={items}
        rowKey={(r) => r.id}
        editHref={(r) => `/admin/leads/${r.id}`}
        emptyMessage="No leads yet."
        columns={[
          {
            key: 'name',
            header: 'Lead',
            cell: (r) => (
              <div className="min-w-0">
                <div className="font-medium truncate">{r.name}</div>
                {r.company && (
                  <div className="text-xs text-linen-400 flex items-center gap-1">
                    <Building2 className="size-3" /> {r.company}
                  </div>
                )}
              </div>
            ),
          },
          {
            key: 'contact',
            header: 'Contact',
            cell: (r) => (
              <div className="space-y-0.5 text-xs">
                {r.email && (
                  <a href={`mailto:${r.email}`} className="flex items-center gap-1 text-linen-300 hover:text-paper">
                    <Mail className="size-3" /> {r.email}
                  </a>
                )}
                {r.phone && (
                  <a href={`tel:${r.phone}`} className="flex items-center gap-1 text-linen-300 hover:text-paper">
                    <Phone className="size-3" /> {r.phone}
                  </a>
                )}
              </div>
            ),
          },
          {
            key: 'source',
            header: 'Source',
            width: '140px',
            cell: (r) => <code className="text-xs text-linen-300">{r.source}</code>,
          },
          {
            key: 'status',
            header: 'Status',
            width: '120px',
            cell: (r) => (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  STATUS_STYLES[r.status] ?? 'bg-ink-700 text-linen-300'
                }`}
              >
                {r.status}
              </span>
            ),
          },
          {
            key: 'created',
            header: 'When',
            width: '140px',
            cell: (r) => (
              <span className="text-xs text-linen-400">
                {new Date(r.created_at).toLocaleString(locale, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            ),
          },
        ]}
        rowAction={(r) => (
          <DeleteButton id={r.id} action={deleteLead} confirm={`Delete lead from "${r.name}"?`} />
        )}
      />
    </div>
  );
}
