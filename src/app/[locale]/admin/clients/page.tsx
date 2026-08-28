import { Plus, Mail, Phone, Building2 } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { ButtonLink } from '@/components/ui/Button';
import { ClientStatusPill } from './ClientStatusPill';
import { deleteClientAction } from './actions';

type C = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  vat_number: string | null;
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
};

export default async function Page({
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
    .from('clients')
    .select('id, name, company, email, phone, vat_number, status, created_at')
    .order('created_at', { ascending: false });

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data } = await query;
  const items = (data ?? []) as unknown as C[];

  // counts per status (for the filter tabs)
  const { data: allRows } = await supabase.from('clients').select('status', { count: 'exact' });
  const counts: Record<string, number> = { all: items.length };
  for (const r of (allRows ?? []) as Array<{ status: string }>) {
    counts[r.status] = (counts[r.status] ?? 0) + 1;
  }

  const filterTabs = [
    { value: 'all',      label: 'الكل' },
    { value: 'active',   label: 'نشط' },
    { value: 'inactive', label: 'متوقف' },
    { value: 'archived', label: 'مؤرشف' },
  ];

  return (
    <div>
      <PageHeader
        title="العملاء"
        description="بيانات العملاء المسجّلين — تُستخدم لإنشاء الفواتير وعروض الأسعار."
        actions={
          <ButtonLink href="/admin/clients/new" size="sm" variant="primary">
            <Plus className="size-4" /> عميل جديد
          </ButtonLink>
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
              href={`/admin/clients?status=${tab.value}`}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
                active
                  ? 'bg-sage-600 text-paper shadow-sm'
                  : 'bg-paper text-ink-700 border border-ink-900/10 hover:border-sage-300 hover:text-sage-800'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[11px] tabular-nums px-1.5 py-0.5 rounded-full ${
                  active ? 'bg-paper/20 text-paper' : 'bg-ink-900/5 text-ink-600'
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
        editHref={(r) => `/admin/clients/${r.id}`}
        emptyMessage="لا يوجد عملاء بهذه الحالة بعد."
        columns={[
          {
            key: 'name',
            header: 'الاسم',
            cell: (r) => (
              <div>
                <div className="font-semibold text-ink-900">{r.name}</div>
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
            key: 'vat',
            header: 'الرقم الضريبي',
            width: '180px',
            cell: (r) => r.vat_number
              ? <code className="text-xs px-2 py-1 rounded bg-linen-100 text-ink-700 border border-ink-900/10">{r.vat_number}</code>
              : <span className="text-ink-400">—</span>,
          },
          {
            key: 'status',
            header: 'الحالة',
            width: '140px',
            cell: (r) => <ClientStatusPill id={r.id} status={r.status} />,
          },
          {
            key: 'created',
            header: 'تاريخ الإضافة',
            width: '140px',
            cell: (r) => (
              <span className="text-xs text-ink-700 tabular-nums">
                {new Date(r.created_at).toLocaleDateString('ar-SA')}
              </span>
            ),
          },
        ]}
        rowAction={(r) => (
          <DeleteButton id={r.id} action={deleteClientAction} confirm={`حذف العميل "${r.name}"؟`} />
        )}
      />
    </div>
  );
}
