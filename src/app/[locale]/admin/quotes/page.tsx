// src/app/[locale]/admin/quotes/page.tsx
// Quotes list — server component, mirrors /admin/invoices.
// Reads from the `quotes` table; client + project joins use admin client.

import Link from 'next/link';
import { Plus, FileText, Calendar, ExternalLink, ScrollText } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/admin/PageHeader';
import { ButtonLink } from '@/components/ui/Button';
import { DeleteButton } from '@/components/admin/DeleteButton';
import {
  deleteQuote,
} from '@/lib/quotes/actions';
import {
  type QuoteStatus,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_STYLES,
} from '@/lib/quotes/constants';

export default async function QuotesPage({
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
    .from('quotes')
    .select('id, number, client_id, project_id, status, total, currency, issue_date, valid_until, created_at')
    .order('created_at', { ascending: false });

  if (statusFilter && statusFilter !== 'all') query = query.eq('status', statusFilter as QuoteStatus);
  if (clientFilter) query = query.eq('client_id', clientFilter);

  const { data: rows } = await query;
  const items = (rows ?? []) as Array<{
    id: string;
    number: string;
    client_id: string | null;
    project_id: string | null;
    status: QuoteStatus;
    total: number | null;
    currency: string;
    issue_date: string;
    valid_until: string | null;
    created_at: string;
  }>;

  // Join clients + projects (admin client bypasses RLS — safe for server pages).
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

  // Counts per status.
  const [allC, draftC, sentC, acceptedC, rejectedC, expiredC] = await Promise.all([
    admin.from('quotes').select('*', { count: 'exact', head: true }),
    admin.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    admin.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
    admin.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
    admin.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    admin.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'expired'),
  ]);

  const tabs = [
    { value: 'all',      label: 'الكل',      count: allC.count ?? 0 },
    { value: 'draft',    label: QUOTE_STATUS_LABELS.draft,    count: draftC.count ?? 0 },
    { value: 'sent',     label: QUOTE_STATUS_LABELS.sent,     count: sentC.count ?? 0 },
    { value: 'accepted', label: QUOTE_STATUS_LABELS.accepted, count: acceptedC.count ?? 0 },
    { value: 'rejected', label: QUOTE_STATUS_LABELS.rejected, count: rejectedC.count ?? 0 },
    { value: 'expired',  label: QUOTE_STATUS_LABELS.expired,  count: expiredC.count ?? 0 },
  ];

  const buildHref = (overrides: { status?: string }) => {
    const sp = new URLSearchParams();
    const s = overrides.status !== undefined ? overrides.status : statusFilter;
    if (s && s !== 'all') sp.set('status', s);
    if (clientFilter) sp.set('client_id', clientFilter);
    const q = sp.toString();
    return q ? `/admin/quotes?${q}` : '/admin/quotes';
  };

  const formatSAR = (n: number | null, c: string) =>
    n == null
      ? '—'
      : new Intl.NumberFormat('ar-SA', { style: 'currency', currency: c || 'SAR', maximumFractionDigits: 0 }).format(n);

  const clientContext = clientFilter ? clientById.get(clientFilter) : null;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader
        title="عروض الأسعار"
        description={clientContext
          ? `عروض أسعار العميل: ${clientContext.name}${clientContext.company ? ` (${clientContext.company})` : ''}`
          : 'عروض أسعار العملاء — قابلة للربط بمشروع ومولّد PDF.'}
        actions={
          <ButtonLink href="/admin/invoices/new?kind=quote" size="sm" variant="primary">
            <Plus className="size-4" /> عرض سعر جديد
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
            href="/admin/quotes"
            className="ms-2 text-xs text-ink-600 hover:text-sage-700 underline underline-offset-4"
          >
            إزالة فلتر العميل
          </Link>
        )}
      </div>

      {enriched.length === 0 ? (
        <div className="rounded-2xl bg-paper border border-ink-900/10 p-12 text-center">
          <ScrollText className="size-10 mx-auto text-ink-300 mb-3" />
          <p className="text-ink-600 mb-3">لا توجد عروض أسعار بهذه التصفية.</p>
          <ButtonLink href="/admin/invoices/new?kind=quote" size="sm" variant="primary">
            <Plus className="size-4" /> إنشاء أول عرض سعر
          </ButtonLink>
        </div>
      ) : (
        <ul className="space-y-2">
          {enriched.map((q) => {
            const isExpired =
              q.valid_until &&
              q.status !== 'accepted' &&
              q.status !== 'rejected' &&
              q.valid_until < today;
            return (
              <li
                key={q.id}
                className="rounded-xl border border-ink-900/10 bg-paper p-4 hover:border-sage-300 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/admin/quotes/${q.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs font-mono bg-linen-100 px-2 py-0.5 rounded text-ink-700 border border-ink-900/10">
                        {q.number}
                      </code>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${QUOTE_STATUS_STYLES[q.status]}`}
                      >
                        {QUOTE_STATUS_LABELS[q.status]}
                      </span>
                      {isExpired && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          منتهي الصلاحية
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-600">
                      {q.client_name && (
                        <span>
                          العميل:{' '}
                          <Link
                            href={`/admin/clients/${q.client_id}`}
                            className="text-ink-900 hover:text-sage-700 font-medium"
                          >
                            {q.client_name}
                          </Link>
                        </span>
                      )}
                      {q.project_name && (
                        <span className="inline-flex items-center gap-1">
                          <FileText className="size-3" />
                          <Link
                            href={`/admin/projects/${q.project_id}`}
                            className="text-ink-900 hover:text-sage-700 font-medium"
                          >
                            {q.project_name}
                          </Link>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="size-3" /> {new Date(q.issue_date).toLocaleDateString('ar-SA')}
                      </span>
                      {q.valid_until && (
                        <span className="inline-flex items-center gap-1 text-ink-500">
                          صالح حتى: {new Date(q.valid_until).toLocaleDateString('ar-SA')}
                        </span>
                      )}
                    </div>
                  </Link>
                  <div className="shrink-0 text-end">
                    <p className="text-base font-semibold text-ink-900 tabular-nums" dir="ltr">
                      {formatSAR(q.total, q.currency)}
                    </p>
                    <div className="mt-1 flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/quotes/${q.id}`}
                        className="opacity-0 group-hover:opacity-100 text-ink-400 hover:text-sage-700 p-1 transition-opacity"
                        title="فتح"
                      >
                        <ExternalLink className="size-3.5" />
                      </Link>
                      <DeleteButton
                        id={q.id}
                        action={deleteQuote}
                        confirm={`حذف عرض السعر ${q.number}؟`}
                      />
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
