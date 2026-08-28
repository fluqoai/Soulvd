import Link from 'next/link';
import { Plus, FileText, Calendar, ExternalLink, Receipt } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/admin/PageHeader';
import { ButtonLink } from '@/components/ui/Button';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { deleteInvoice, type InvoiceStatus } from '@/lib/invoices/actions';

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft:     'مسودة',
  sent:      'مُرسلة',
  paid:      'مدفوعة',
  overdue:   'متأخرة',
  cancelled: 'ملغاة',
};

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft:     'bg-ink-100 text-ink-700 ring-1 ring-ink-900/10',
  sent:      'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
  paid:      'bg-sage-100 text-sage-800 ring-1 ring-sage-200',
  overdue:   'bg-red-100 text-red-800 ring-1 ring-red-200',
  cancelled: 'bg-ink-100 text-ink-500 ring-1 ring-ink-900/10',
};

export default async function InvoicesPage({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; client_id?: string }>;
}) {
  const { status: statusFilter, client_id: clientFilter } = await searchParams;
  const admin = createAdminClient();

  let query = admin
    .from('invoices')
    .select('id, number, client_id, project_id, status, total, currency, issue_date, due_date, created_at')
    .order('created_at', { ascending: false });

  if (statusFilter && statusFilter !== 'all') query = query.eq('status', statusFilter as InvoiceStatus);
  if (clientFilter) query = query.eq('client_id', clientFilter);

  const { data: rows } = await query;
  const items = (rows ?? []) as Array<{
    id: string; number: string; client_id: string | null; project_id: string | null;
    status: InvoiceStatus; total: number | null; currency: string; issue_date: string; due_date: string | null; created_at: string;
  }>;

  // Join clients + projects
  const clientIds = Array.from(new Set(items.map((r) => r.client_id).filter((x): x is string => !!x)));
  const projectIds = Array.from(new Set(items.map((r) => r.project_id).filter((x): x is string => !!x)));
  const [{ data: clientsData }, { data: projectsData }] = await Promise.all([
    clientIds.length ? admin.from('clients').select('id, name, company').in('id', clientIds) : { data: [] },
    projectIds.length ? admin.from('projects').select('id, name').in('id', projectIds) : { data: [] },
  ]);
  const clientById = new Map<string, { name: string; company: string | null }>(
    ((clientsData ?? []) as Array<{ id: string; name: string; company: string | null }>).map((c) => [c.id, c]),
  );
  const projectById = new Map<string, { name: string }>(
    ((projectsData ?? []) as Array<{ id: string; name: string }>).map((p) => [p.id, p]),
  );

  const enriched = items.map((r) => ({
    ...r,
    client_name: r.client_id ? clientById.get(r.client_id)?.name ?? null : null,
    project_name: r.project_id ? projectById.get(r.project_id)?.name ?? null : null,
  }));

  // Counts
  const [{ count: allCount }, { count: draftCount }, { count: sentCount }, { count: paidCount }, { count: overdueCount }] = await Promise.all([
    admin.from('invoices').select('*', { count: 'exact', head: true }),
    admin.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    admin.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
    admin.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
    admin.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'overdue'),
  ]);

  const tabs = [
    { value: 'all',      label: 'الكل',     count: allCount ?? 0 },
    { value: 'draft',    label: 'مسودة',    count: draftCount ?? 0 },
    { value: 'sent',     label: 'مُرسلة',   count: sentCount ?? 0 },
    { value: 'paid',     label: 'مدفوعة',   count: paidCount ?? 0 },
    { value: 'overdue',  label: 'متأخرة',   count: overdueCount ?? 0 },
  ];

  const buildHref = (overrides: { status?: string }) => {
    const sp = new URLSearchParams();
    const s = overrides.status !== undefined ? overrides.status : statusFilter;
    if (s && s !== 'all') sp.set('status', s);
    if (clientFilter) sp.set('client_id', clientFilter);
    const q = sp.toString();
    return q ? `/admin/invoices?${q}` : '/admin/invoices';
  };

  const formatSAR = (n: number | null, c: string) =>
    n == null
      ? '—'
      : new Intl.NumberFormat('ar-SA', { style: 'currency', currency: c || 'SAR', maximumFractionDigits: 0 }).format(n);

  const clientContext = clientFilter ? clientById.get(clientFilter) : null;

  return (
    <div>
      <PageHeader
        title="الفواتير"
        description={clientContext
          ? `فواتير العميل: ${clientContext.name}${clientContext.company ? ` (${clientContext.company})` : ''}`
          : 'فواتير العملاء — قابلة للربط بمشروع وملء تلقائياً من سجلات الوقت.'}
        actions={
          <ButtonLink href={`/admin/invoices/new${clientFilter ? `?client_id=${clientFilter}` : ''}`} size="sm" variant="primary">
            <Plus className="size-4" /> فاتورة جديدة
          </ButtonLink>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tabs.map((tab) => {
          const active = (statusFilter ?? 'all') === tab.value;
          return (
            <Link
              key={tab.value}
              href={buildHref({ status: tab.value })}
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
                {tab.count}
              </span>
            </Link>
          );
        })}
        {clientFilter && (
          <Link
            href="/admin/invoices"
            className="ms-2 text-xs text-ink-600 hover:text-sage-700 underline underline-offset-4"
          >
            إزالة فلتر العميل
          </Link>
        )}
      </div>

      {enriched.length === 0 ? (
        <div className="rounded-2xl bg-paper border border-ink-900/10 p-12 text-center">
          <Receipt className="size-10 mx-auto text-ink-300 mb-3" />
          <p className="text-ink-600 mb-3">لا توجد فواتير بهذه التصفية.</p>
          <ButtonLink href="/admin/invoices/new" size="sm" variant="primary">
            <Plus className="size-4" /> إنشاء أول فاتورة
          </ButtonLink>
        </div>
      ) : (
        <ul className="space-y-2">
          {enriched.map((inv) => (
            <li
              key={inv.id}
              className="rounded-xl border border-ink-900/10 bg-paper p-4 hover:border-sage-300 transition-colors group"
            >
              <div className="flex items-start justify-between gap-3">
                <Link href={`/admin/invoices/${inv.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-xs font-mono bg-linen-100 px-2 py-0.5 rounded text-ink-700 border border-ink-900/10">{inv.number}</code>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[inv.status]}`}>
                      {STATUS_LABELS[inv.status]}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-600">
                    {inv.client_name && (
                      <span>العميل: <Link href={`/admin/clients/${inv.client_id}`} className="text-ink-900 hover:text-sage-700 font-medium">{inv.client_name}</Link></span>
                    )}
                    {inv.project_name && (
                      <span className="inline-flex items-center gap-1">
                        <FileText className="size-3" />
                        <Link href={`/admin/projects/${inv.project_id}`} className="text-ink-900 hover:text-sage-700 font-medium">
                          {inv.project_name}
                        </Link>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="size-3" /> {new Date(inv.issue_date).toLocaleDateString('ar-SA')}
                    </span>
                    {inv.due_date && (
                      <span className="inline-flex items-center gap-1 text-ink-500">
                        استحقاق: {new Date(inv.due_date).toLocaleDateString('ar-SA')}
                      </span>
                    )}
                  </div>
                </Link>
                <div className="shrink-0 text-end">
                  <p className="text-base font-semibold text-ink-900 tabular-nums" dir="ltr">
                    {formatSAR(inv.total, inv.currency)}
                  </p>
                  <div className="mt-1 flex items-center justify-end gap-1">
                    <Link
                      href={`/admin/invoices/${inv.id}`}
                      className="opacity-0 group-hover:opacity-100 text-ink-400 hover:text-sage-700 p-1 transition-opacity"
                      title="فتح"
                    >
                      <ExternalLink className="size-3.5" />
                    </Link>
                    <DeleteButton id={inv.id} action={deleteInvoice} confirm={`حذف الفاتورة ${inv.number}؟`} />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
