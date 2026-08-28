import Link from 'next/link';
import { Plus, Calendar, Briefcase, User as UserIcon, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/admin/PageHeader';
import { ButtonLink } from '@/components/ui/Button';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { deleteProject } from '@/lib/projects/actions';
import type { ProjectStatus } from '@/lib/projects/actions';

type Row = {
  id: string;
  client_id: string;
  name: string;
  status: ProjectStatus;
  start_date: string | null;
  due_date: string | null;
  budget_hours: number | null;
  budget_amount: number | null;
  currency: string;
  owner_id: string | null;
  created_at: string;
  // joined
  client_name: string | null;
  client_company: string | null;
  owner_name: string | null;
  owner_email: string | null;
  total_hours: number | null;
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  planning:     'تخطيط',
  in_progress:  'جارٍ',
  on_hold:      'متوقف',
  delivered:    'مُسلَّم',
  cancelled:    'ملغى',
};

const STATUS_STYLES: Record<ProjectStatus, string> = {
  planning:     'bg-ink-100 text-ink-700 ring-1 ring-ink-900/10',
  in_progress:  'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
  on_hold:      'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
  delivered:    'bg-sage-100 text-sage-800 ring-1 ring-sage-200',
  cancelled:    'bg-red-100 text-red-800 ring-1 ring-red-200',
};

export default async function ProjectsPage({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; client_id?: string; owner?: string; from?: string; to?: string }>;
}) {
  const { status: statusFilter, client_id: clientFilter, owner: ownerFilter, from: fromFilter, to: toFilter } = await searchParams;
  const supabase = await createClient();
  const admin = createAdminClient();

  let query = admin
    .from('projects')
    .select('id, client_id, name, status, start_date, due_date, budget_hours, budget_amount, currency, owner_id, created_at')
    .order('created_at', { ascending: false });

  if (statusFilter && statusFilter !== 'all') query = query.eq('status', statusFilter as ProjectStatus);
  if (clientFilter) query = query.eq('client_id', clientFilter);
  if (ownerFilter) query = query.eq('owner_id', ownerFilter);
  if (fromFilter) query = query.gte('due_date', fromFilter);
  if (toFilter) query = query.lte('due_date', toFilter);

  const { data: rows } = await query;
  const items = (rows ?? []) as unknown as Omit<Row, 'client_name' | 'client_company' | 'owner_name' | 'owner_email' | 'total_hours'>[];

  // Fetch owners for the filter dropdown (regardless of join below)
  const { data: ownersForFilter } = await admin
    .from('users')
    .select('id, full_name, email')
    .order('full_name', { ascending: true });

  // Join: client + owner names, total hours
  const clientIds = Array.from(new Set(items.map((r) => r.client_id)));
  const ownerIds = Array.from(new Set(items.map((r) => r.owner_id).filter((x): x is string => !!x)));
  const projectIds = items.map((r) => r.id);

  const [{ data: clientsData }, { data: ownersData }, { data: timeData }] = await Promise.all([
    clientIds.length ? admin.from('clients').select('id, name, company, status').in('id', clientIds) : { data: [] },
    ownerIds.length   ? admin.from('users').select('id, full_name, email').in('id', ownerIds)    : { data: [] },
    projectIds.length ? admin.from('time_entries').select('project_id, hours, billable').in('project_id', projectIds) : { data: [] },
  ]);

  const clientById = new Map<string, { name: string; company: string | null; status: string }>(
    ((clientsData ?? []) as Array<{ id: string; name: string; company: string | null; status: string }>).map((c) => [c.id, c]),
  );
  const ownerById = new Map<string, { full_name: string | null; email: string }>(
    ((ownersData ?? []) as Array<{ id: string; full_name: string | null; email: string }>).map((u) => [u.id, u]),
  );
  const hoursByProject = new Map<string, { total: number; billable: number }>();
  for (const e of (timeData ?? []) as Array<{ project_id: string; hours: number; billable: boolean }>) {
    const cur = hoursByProject.get(e.project_id) ?? { total: 0, billable: 0 };
    cur.total += Number(e.hours) || 0;
    if (e.billable) cur.billable += Number(e.hours) || 0;
    hoursByProject.set(e.project_id, cur);
  }

  const enriched: Row[] = items.map((r) => {
    const c = clientById.get(r.client_id);
    const o = r.owner_id ? ownerById.get(r.owner_id) : undefined;
    const h = hoursByProject.get(r.id);
    return {
      ...r,
      client_name: c?.name ?? null,
      client_company: c?.company ?? null,
      owner_name: o?.full_name ?? null,
      owner_email: o?.email ?? null,
      total_hours: h ? Math.round(h.total * 100) / 100 : null,
    };
  });

  // Counts
  const [{ count: allCount }, { count: planCount }, { count: progCount }, { count: doneCount }] = await Promise.all([
    admin.from('projects').select('*', { count: 'exact', head: true }),
    admin.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'planning'),
    admin.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
    admin.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'delivered'),
  ]);

  const tabs = [
    { value: 'all',         label: 'الكل',        count: allCount ?? 0 },
    { value: 'planning',    label: 'تخطيط',       count: planCount ?? 0 },
    { value: 'in_progress', label: 'جارٍ',        count: progCount ?? 0 },
    { value: 'delivered',   label: 'مُسلَّم',      count: doneCount ?? 0 },
  ];

  const formatSAR = (n: number | null) =>
    n == null
      ? '—'
      : new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n);

  const buildHref = (overrides: { status?: string }) => {
    const sp = new URLSearchParams();
    const s = overrides.status !== undefined ? overrides.status : statusFilter;
    if (s && s !== 'all') sp.set('status', s);
    if (clientFilter) sp.set('client_id', clientFilter);
    if (ownerFilter) sp.set('owner', ownerFilter);
    if (fromFilter) sp.set('from', fromFilter);
    if (toFilter) sp.set('to', toFilter);
    const q = sp.toString();
    return q ? `/admin/projects?${q}` : '/admin/projects';
  };

  const hasAdvancedFilter = !!(ownerFilter || fromFilter || toFilter);

  // If client filter is set, show context
  const clientContext = clientFilter ? clientById.get(clientFilter) : null;

  return (
    <div>
      <PageHeader
        title="المشاريع"
        description={clientContext
          ? `مشاريع العميل: ${clientContext.name}${clientContext.company ? ` (${clientContext.company})` : ''}`
          : 'مشاريع العملاء النشطين — كل مشروع مرتبط بعميل ويمكن أن يحوي سجل وقت.'}
        actions={
          <ButtonLink href={`/admin/projects/new${clientFilter ? `?client_id=${clientFilter}` : ''}`} size="sm" variant="primary">
            <Plus className="size-4" /> مشروع جديد
          </ButtonLink>
        }
      />

      {/* Filter tabs */}
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
        {(clientFilter || hasAdvancedFilter) && (
          <Link
            href="/admin/projects"
            className="ms-2 text-xs text-ink-600 hover:text-sage-700 underline underline-offset-4"
          >
            مسح كل الفلاتر
          </Link>
        )}
      </div>

      {/* Advanced filters row */}
      <form
        method="get"
        action="/admin/projects"
        className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-ink-900/10 bg-paper p-3"
      >
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        {clientFilter && <input type="hidden" name="client_id" value={clientFilter} />}

        <div className="min-w-40">
          <label className="block text-[11px] uppercase tracking-wider text-ink-600 mb-1">المسؤول</label>
          <select
            name="owner"
            defaultValue={ownerFilter ?? ''}
            className="w-full rounded-lg border border-ink-900/15 bg-paper px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-600/30 focus:border-sage-600"
          >
            <option value="">الكل</option>
            {((ownersForFilter ?? []) as Array<{ id: string; full_name: string | null; email: string }>).map((o) => (
              <option key={o.id} value={o.id}>{o.full_name || o.email}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-ink-600 mb-1">تاريخ التسليم من</label>
          <input
            type="date"
            name="from"
            defaultValue={fromFilter ?? ''}
            className="rounded-lg border border-ink-900/15 bg-paper px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-600/30 focus:border-sage-600"
          />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-ink-600 mb-1">إلى</label>
          <input
            type="date"
            name="to"
            defaultValue={toFilter ?? ''}
            className="rounded-lg border border-ink-900/15 bg-paper px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sage-600/30 focus:border-sage-600"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-1 rounded-lg bg-ink-900 text-paper text-xs font-medium px-3 py-1.5 hover:bg-ink-800"
        >
          تطبيق
        </button>
        {(ownerFilter || fromFilter || toFilter) && (
          <Link
            href={buildHref({})}
            className="text-xs text-ink-600 hover:text-ink-800 underline underline-offset-4"
          >
            مسح
          </Link>
        )}
      </form>

      {enriched.length === 0 ? (
        <div className="rounded-2xl bg-paper border border-ink-900/10 p-12 text-center">
          <Briefcase className="size-10 mx-auto text-ink-300 mb-3" />
          <p className="text-ink-600 mb-3">لا توجد مشاريع بهذه التصفية.</p>
          <ButtonLink href={`/admin/projects/new${clientFilter ? `?client_id=${clientFilter}` : ''}`} size="sm" variant="primary">
            <Plus className="size-4" /> إنشاء أول مشروع
          </ButtonLink>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {enriched.map((p) => {
            const isOverdue = p.due_date && p.status !== 'delivered' && p.status !== 'cancelled' && p.due_date < new Date().toISOString().slice(0, 10);
            return (
              <li
                key={p.id}
                className="rounded-2xl border border-ink-900/10 bg-paper p-5 hover:border-sage-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Link href={`/admin/projects/${p.id}`} className="flex-1 min-w-0">
                    <h3 className="font-semibold text-ink-900 group-hover:text-sage-700 truncate">{p.name}</h3>
                    {p.client_name && (
                      <Link
                        href={`/admin/clients/${p.client_id}`}
                        className="text-xs text-ink-600 hover:text-sage-700 mt-0.5 inline-block"
                      >
                        {p.client_name}{p.client_company ? ` · ${p.client_company}` : ''}
                      </Link>
                    )}
                  </Link>
                  <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[p.status]}`}>
                    {STATUS_LABELS[p.status]}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-ink-700">
                  {(p.start_date || p.due_date) && (
                    <p className="flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-ink-500" />
                      <span className="tabular-nums">
                        {p.start_date ? new Date(p.start_date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }) : '—'}
                        {' → '}
                        {p.due_date ? new Date(p.due_date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }) : '—'}
                      </span>
                      {isOverdue && <span className="text-red-700 font-medium">· متأخر</span>}
                    </p>
                  )}
                  {p.total_hours != null && p.total_hours > 0 && (
                    <p className="flex items-center gap-1.5">
                      <Clock className="size-3.5 text-ink-500" />
                      <span className="tabular-nums">{p.total_hours} ساعة</span>
                      {p.budget_hours != null && (
                        <span className="text-ink-500">/ {p.budget_hours} مقرر</span>
                      )}
                    </p>
                  )}
                  {p.owner_id && (
                    <p className="flex items-center gap-1.5">
                      <UserIcon className="size-3.5 text-ink-500" />
                      {p.owner_name || p.owner_email}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-ink-900/5 flex items-center justify-between gap-2">
                  {p.budget_amount != null ? (
                    <span className="text-sm font-semibold text-ink-900 tabular-nums" dir="ltr">{formatSAR(p.budget_amount)}</span>
                  ) : (
                    <span className="text-xs text-ink-500">بدون ميزانية محددة</span>
                  )}
                  <DeleteButton id={p.id} action={deleteProject} confirm={`حذف المشروع "${p.name}"؟ سيتم حذف كل سجلات الوقت المرتبطة.`} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
