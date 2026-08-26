import { Plus, Mail, Phone, Building2 } from 'lucide-react';
import Link from 'next/link';
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

// Light-theme status pills. Background is a soft tint of the color,
// text is the deeper shade — easy to read on the white table.
const STATUS_STYLES: Record<string, string> = {
  new:        'bg-sage-100 text-sage-800 ring-1 ring-sage-200',
  contacted:  'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
  qualified:  'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
  closed:     'bg-ink-100 text-ink-700 ring-1 ring-ink-900/10',
  lost:       'bg-red-100 text-red-800 ring-1 ring-red-200',
};

const STATUS_LABELS: Record<string, string> = {
  new:        'جديد',
  contacted:  'تم التواصل',
  qualified:  'مؤهل',
  closed:     'مغلق',
  lost:       'خاسر',
};

export default async function LeadsAdminPage({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
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

  // Counts per status (so the filter tabs can show the breakdown)
  const { data: allRows } = await supabase
    .from('leads')
    .select('status', { count: 'exact' });
  const counts: Record<string, number> = { all: items.length };
  for (const r of (allRows ?? []) as Array<{ status: string }>) {
    counts[r.status] = (counts[r.status] ?? 0) + 1;
  }

  const filterTabs = [
    { value: 'all',        label: 'الكل' },
    { value: 'new',        label: 'جديد' },
    { value: 'contacted',  label: 'تم التواصل' },
    { value: 'qualified',  label: 'مؤهل' },
    { value: 'closed',     label: 'مغلق' },
    { value: 'lost',       label: 'خاسر' },
  ];

  return (
    <div>
      <PageHeader
        title="العملاء المحتملون"
        description="الاستفسارات الواردة من الصفحة الرئيسية وصفحة /contact."
        actions={
          <span className="text-xs text-ink-600 font-medium">{items.length} عنصر</span>
        }
      />

      {/* Filter tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        {filterTabs.map((tab) => {
          const active = (statusFilter ?? 'all') === tab.value;
          const count = counts[tab.value] ?? 0;
          return (
            <Link
              key={tab.value}
              href={`/admin/leads?status=${tab.value}`}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
                active
                  ? 'bg-sage-600 text-paper shadow-sm'
                  : 'bg-paper text-ink-700 border border-ink-900/10 hover:border-sage-300 hover:text-sage-800'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[11px] tabular-nums px-1.5 py-0.5 rounded-full ${
                  active
                    ? 'bg-paper/20 text-paper'
                    : 'bg-ink-900/5 text-ink-600'
                }`}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      <DataTable
        rows={items}
        rowKey={(r) => r.id}
        editHref={(r) => `/admin/leads/${r.id}`}
        emptyMessage="لا توجد استفسارات بهذه الحالة بعد."
        columns={[
          {
            key: 'name',
            header: 'العميل المحتمل',
            cell: (r) => (
              <div className="min-w-0">
                <div className="font-semibold text-ink-900 truncate">{r.name}</div>
                {r.company && (
                  <div className="text-xs text-ink-600 flex items-center gap-1 mt-0.5">
                    <Building2 className="size-3" /> {r.company}
                  </div>
                )}
              </div>
            ),
          },
          {
            key: 'contact',
            header: 'التواصل',
            cell: (r) => (
              <div className="space-y-0.5 text-xs">
                {r.email && (
                  <a href={`mailto:${r.email}`} className="flex items-center gap-1.5 text-ink-700 hover:text-sage-700">
                    <Mail className="size-3" /> {r.email}
                  </a>
                )}
                {r.phone && (
                  <a href={`tel:${r.phone}`} className="flex items-center gap-1.5 text-ink-700 hover:text-sage-700">
                    <Phone className="size-3" /> {r.phone}
                  </a>
                )}
              </div>
            ),
          },
          {
            key: 'source',
            header: 'المصدر',
            width: '160px',
            cell: (r) => (
              <code className="text-xs px-2 py-1 rounded bg-linen-100 text-ink-700 border border-ink-900/10">
                {r.source}
              </code>
            ),
          },
          {
            key: 'status',
            header: 'الحالة',
            width: '140px',
            cell: (r) => (
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  STATUS_STYLES[r.status] ?? STATUS_STYLES.new
                }`}
              >
                {STATUS_LABELS[r.status] ?? r.status}
              </span>
            ),
          },
          {
            key: 'created',
            header: 'التاريخ',
            width: '160px',
            cell: (r) => (
              <span className="text-xs text-ink-700 tabular-nums">
                {new Date(r.created_at).toLocaleString('ar-SA', {
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
          <DeleteButton id={r.id} action={deleteLead} confirm={`حذف استفسار "${r.name}"؟`} />
        )}
      />
    </div>
  );
}
