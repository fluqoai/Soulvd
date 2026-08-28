// src/app/[locale]/admin/page.tsx
// Dashboard — real KPIs. The single source of truth for "how is the agency doing right now".

import { getTranslations } from 'next-intl/server';
import { ArrowUpRight, ListChecks, Calendar, Flag, Repeat, TrendingUp, Users, Receipt, Wallet, BarChart3, Activity, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { countDueRecurring } from '@/lib/projects/actions';
import { ProcessAllDueRecurring } from '@/components/admin/ProcessAllDueRecurring';

const SAR = (n: number) =>
  new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n);

export default async function AdminDashboard({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const t = await getTranslations('admin.dashboard');
  const tNav = await getTranslations('admin.nav');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: profileData } = await admin
    .from('users')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single();
  const profile = profileData as { role: 'owner' | 'editor'; full_name: string | null; email: string | null } | null;
  if (!profile) return null;

  const isOwner = profile.role === 'owner';

  // Owner: full KPI dashboard. Editor: lighter content overview.
  if (!isOwner) {
    return <EditorDashboard />;
  }

  // ============== OWNER DASHBOARD ==============

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfWeek = new Date(now); startOfWeek.setDate(startOfWeek.getDate() - 7); startOfWeek.setHours(0, 0, 0, 0);

  // Fetch all the numbers in parallel
  const [
    recurringRes,           // MRR: sum of budget_amount for active recurring projects
    pipelineRes,            // Pipeline: sum of expected_value for leads in proposal/negotiation
    outstandingRes,         // Outstanding: sum of total for draft/sent/overdue invoices
    mtdRevenueRes,          // This Month Revenue: sum of total for paid invoices this month (using updated_at as proxy)
    conversionRes,          // Conversion: clients count, leads count
    newLeads7dRes,          // New leads last 7 days
    myHoursRes,             // My hours this week
    dueRecurringCount,      // Due recurring projects
    recentLeadsRes,         // Recent leads
    recentInvoicesRes,      // Recent invoices
    topClientsRes,          // Top clients by revenue
    recentActivityRes,      // Recent activity log
  ] = await Promise.all([
    admin.from('projects').select('budget_amount')
      .eq('is_recurring', true)
      .in('status', ['planning', 'in_progress', 'on_hold']),
    admin.from('leads').select('expected_value')
      .in('status', ['proposal', 'negotiation']),
    admin.from('invoices').select('total')
      .in('status', ['draft', 'sent', 'overdue']),
    admin.from('invoices').select('total, client_id')
      .eq('status', 'paid')
      .gte('updated_at', startOfMonth),
    admin.from('clients').select('*', { count: 'exact', head: true }),
    admin.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    admin.from('time_entries').select('hours').eq('user_id', user.id).gte('entry_date', startOfWeek.toISOString().slice(0, 10)),
    countDueRecurring(),
    admin.from('leads').select('id, name, status, expected_value, created_at').order('created_at', { ascending: false }).limit(5),
    admin.from('invoices').select('id, number, client_id, status, total, currency, issue_date').order('created_at', { ascending: false }).limit(5),
    admin.from('invoices').select('client_id, total, client_snapshot')
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(500),
    admin.from('activity_log').select('id, action, entity_type, entity_id, created_at, details')
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const totalLeadsRes = await admin.from('leads').select('*', { count: 'exact', head: true });

  // Compute
  const mrr = (recurringRes.data ?? []).reduce((s: number, r: { budget_amount: number | null }) => s + Number(r.budget_amount || 0), 0);
  const pipeline = (pipelineRes.data ?? []).reduce((s: number, r: { expected_value: number | null }) => s + Number(r.expected_value || 0), 0);
  const outstanding = (outstandingRes.data ?? []).reduce((s: number, r: { total: number | null }) => s + Number(r.total || 0), 0);
  const mtdRevenue = (mtdRevenueRes.data ?? []).reduce((s: number, r: { total: number | null }) => s + Number(r.total || 0), 0);
  const weekHours = (myHoursRes.data ?? []).reduce((s: number, e: { hours: number }) => s + Number(e.hours || 0), 0);
  const totalLeads = totalLeadsRes.count ?? 0;
  const totalClients = conversionRes.count ?? 0;
  const conversionPct = totalLeads > 0 ? (totalClients / totalLeads) * 100 : 0;
  const newLeads7d = newLeads7dRes.count ?? 0;

  // Top clients: aggregate paid invoices by client
  const revenueByClient = new Map<string, { name: string; total: number; count: number }>();
  for (const inv of (topClientsRes.data ?? []) as Array<{ client_id: string | null; total: number | null; client_snapshot: { name?: string } }>) {
    if (!inv.client_id) continue;
    const cur = revenueByClient.get(inv.client_id) ?? {
      name: inv.client_snapshot?.name ?? '—',
      total: 0,
      count: 0,
    };
    cur.total += Number(inv.total || 0);
    cur.count += 1;
    revenueByClient.set(inv.client_id, cur);
  }
  const topClients = Array.from(revenueByClient.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Resolve recent invoice client names
  const recentInvoiceClientIds = Array.from(new Set(((recentInvoicesRes.data ?? []) as Array<{ client_id: string | null }>).map((r) => r.client_id).filter((x): x is string => !!x)));
  const { data: rcClients } = recentInvoiceClientIds.length
    ? await admin.from('clients').select('id, name').in('id', recentInvoiceClientIds)
    : { data: [] };
  const rcClientById = new Map<string, string>(((rcClients ?? []) as Array<{ id: string; name: string }>).map((c) => [c.id, c.name]));

  const displayName = profile.full_name || profile.email?.split('@')[0] || 'there';
  const welcome = t('welcome', { name: displayName });

  const kpiCards = [
    {
      label: t('kpi.mrr'),
      value: SAR(mrr),
      sub: t('kpi.mrr_sub'),
      href: '/admin/projects',
      icon: <Repeat className="size-5 text-paper" />,
      color: 'bg-purple-600',
    },
    {
      label: t('kpi.pipeline'),
      value: SAR(pipeline),
      sub: t('kpi.pipeline_sub'),
      href: '/admin/leads?status=proposal',
      icon: <TrendingUp className="size-5 text-paper" />,
      color: 'bg-amber-600',
    },
    {
      label: t('kpi.outstanding'),
      value: SAR(outstanding),
      sub: t('kpi.outstanding_sub'),
      href: '/admin/invoices?status=open',
      icon: <Receipt className="size-5 text-paper" />,
      color: 'bg-red-600',
    },
    {
      label: t('kpi.mtd_revenue'),
      value: SAR(mtdRevenue),
      sub: t('kpi.mtd_revenue_sub'),
      href: '/admin/invoices?status=paid',
      icon: <Wallet className="size-5 text-paper" />,
      color: 'bg-sage-600',
    },
    {
      label: t('kpi.hours_this_week'),
      value: weekHours.toFixed(1),
      sub: t('kpi.hours_this_week_sub'),
      href: '/admin/projects',
      icon: <BarChart3 className="size-5 text-paper" />,
      color: 'bg-ink-700',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 leading-tight">
          {t('title')}
        </h1>
        <p className="mt-2 text-base text-ink-600">
          {welcome} · {t('subtitle')}
        </p>
      </header>

      {/* Due renewals banner */}
      {dueRecurringCount > 0 && (
        <div className="rounded-2xl border-2 border-purple-300 bg-purple-50/60 p-5 flex items-center gap-4 flex-wrap">
          <div className="shrink-0 size-12 rounded-xl bg-purple-600 text-paper grid place-items-center">
            <Repeat className="size-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-purple-900">
              {dueRecurringCount === 1
                ? 'مشروع دوري واحد جاهز للتجديد'
                : `${dueRecurringCount} مشاريع دورية جاهزة للتجديد`}
            </h2>
            <p className="text-sm text-purple-800 mt-0.5">
              هذه المشاريع وصلت إلى تاريخ التجديد التالي. كل تجديد ينشئ مشروعاً جديداً + فاتورة مسودة (إذا كانت auto_invoice مفعّلة).
            </p>
          </div>
          <ProcessAllDueRecurring count={dueRecurringCount} />
        </div>
      )}

      {/* KPI cards */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpiCards.map((c) => (
          <Link
            key={c.label}
            href={c.href ?? '#'}
            className="group rounded-2xl bg-paper border border-ink-900/10 p-5 hover:border-sage-300 hover:shadow-sm transition-all"
          >
            <div className={`inline-flex size-9 rounded-xl ${c.color} grid place-items-center mb-3`}>
              {c.icon}
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-700">{c.label}</p>
            <p className="text-xl md:text-2xl font-bold text-ink-900 tabular-nums mt-1" dir="ltr">{c.value}</p>
            <p className="text-[11px] text-ink-500 mt-1">{c.sub}</p>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Conversion + funnel */}
        <section className="rounded-2xl bg-paper border border-ink-900/5 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-ink-900">قُمع التحويل</h2>
          <FunnelBar label="استفسارات (الكل)" value={totalLeads} color="bg-blue-500" total={totalLeads} />
          <FunnelBar label="جديد (هذا الأسبوع)" value={newLeads7d} color="bg-blue-300" total={totalLeads} />
          <FunnelBar label="عملاء فعليون" value={totalClients} color="bg-sage-500" total={totalLeads} />
          <div className="pt-3 border-t border-ink-900/5">
            <p className="text-sm text-ink-700">
              <span className="font-semibold text-sage-700 text-base tabular-nums">{conversionPct.toFixed(1)}%</span>
              {' '}من الاستفسارات تتحول إلى عملاء.
            </p>
          </div>
        </section>

        {/* Top clients by revenue */}
        <section className="rounded-2xl bg-paper border border-ink-900/5 p-6 space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink-900">أعلى العملاء (إيراد مدفوع)</h2>
            <Link href="/admin/clients" className="text-xs text-ink-600 hover:text-sage-700">
              كل العملاء →
            </Link>
          </div>
          {topClients.length === 0 ? (
            <p className="text-sm text-ink-500 italic text-center py-6">لا توجد فواتير مدفوعة بعد.</p>
          ) : (
            <ol className="space-y-2">
              {topClients.map((c, i) => {
                const max = topClients[0]?.total || 1;
                const pct = (c.total / max) * 100;
                return (
                  <li key={c.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0 inline-flex size-6 items-center justify-center rounded-full bg-linen-100 text-ink-700 text-xs font-bold">
                          {i + 1}
                        </span>
                        <Link href={`/admin/clients/${c.id}`} className="font-medium text-ink-900 hover:text-sage-700 truncate">
                          {c.name}
                        </Link>
                        <span className="text-xs text-ink-500 shrink-0">· {c.count} فاتورة</span>
                      </div>
                      <span className="font-semibold text-ink-900 tabular-nums shrink-0" dir="ltr">
                        {SAR(c.total)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-ink-900/5 rounded-full overflow-hidden">
                      <div className="h-full bg-sage-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent leads */}
        <section className="rounded-2xl bg-paper border border-ink-900/5 p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink-900">أحدث الاستفسارات</h2>
            <Link href="/admin/leads" className="text-xs text-ink-600 hover:text-sage-700">الكل →</Link>
          </div>
          {((recentLeadsRes.data ?? []) as Array<{ id: string; name: string; status: string; expected_value: number | null; created_at: string }>).length === 0 ? (
            <p className="text-sm text-ink-500 italic text-center py-6">لا توجد استفسارات بعد.</p>
          ) : (
            <ul className="space-y-2">
              {((recentLeadsRes.data ?? []) as Array<{ id: string; name: string; status: string; expected_value: number | null; created_at: string }>).map((lead) => (
                <li key={lead.id} className="flex items-center justify-between gap-3 py-1.5">
                  <Link href={`/admin/leads/${lead.id}`} className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-900 truncate">{lead.name}</p>
                    <p className="text-xs text-ink-500">{new Date(lead.created_at).toLocaleDateString('ar-SA')}</p>
                  </Link>
                  <div className="shrink-0 flex items-center gap-2">
                    {lead.expected_value != null && lead.expected_value > 0 && (
                      <span className="text-xs text-ink-700 tabular-nums" dir="ltr">{SAR(lead.expected_value)}</span>
                    )}
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 ${
                      lead.status === 'closed' ? 'bg-sage-100 text-sage-800 ring-sage-200' :
                      lead.status === 'lost' ? 'bg-red-100 text-red-800 ring-red-200' :
                      lead.status === 'negotiation' ? 'bg-orange-100 text-orange-800 ring-orange-200' :
                      lead.status === 'proposal' ? 'bg-purple-100 text-purple-800 ring-purple-200' :
                      lead.status === 'qualified' ? 'bg-amber-100 text-amber-800 ring-amber-200' :
                      lead.status === 'contacted' ? 'bg-blue-100 text-blue-800 ring-blue-200' :
                      'bg-ink-100 text-ink-700 ring-ink-900/10'
                    }`}>{lead.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent activity */}
        <section className="rounded-2xl bg-paper border border-ink-900/5 p-6 space-y-3">
          <h2 className="text-lg font-semibold text-ink-900 flex items-center gap-2">
            <Activity className="size-5 text-sage-700" /> نشاط حديث
          </h2>
          {((recentActivityRes.data ?? []) as Array<{ id: string; action: string; entity_type: string | null; entity_id: string | null; created_at: string; details: Record<string, unknown> }>).length === 0 ? (
            <p className="text-sm text-ink-500 italic text-center py-6">لا يوجد نشاط بعد.</p>
          ) : (
            <ul className="space-y-2.5">
              {((recentActivityRes.data ?? []) as Array<{ id: string; action: string; entity_type: string | null; entity_id: string | null; created_at: string; details: Record<string, unknown> }>).map((a) => (
                <li key={a.id} className="flex items-start gap-2.5 text-sm">
                  <span className="shrink-0 mt-1.5 size-1.5 rounded-full bg-sage-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-ink-900">
                      <span className="text-ink-600">{a.action}</span>
                      {a.entity_type && <span className="text-ink-500"> · {a.entity_type}</span>}
                    </p>
                    <p className="text-xs text-ink-500">{new Date(a.created_at).toLocaleString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent invoices */}
        <section className="rounded-2xl bg-paper border border-ink-900/5 p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink-900">أحدث الفواتير</h2>
            <Link href="/admin/invoices" className="text-xs text-ink-600 hover:text-sage-700">الكل →</Link>
          </div>
          {((recentInvoicesRes.data ?? []) as Array<{ id: string; number: string; client_id: string | null; status: string; total: number | null; currency: string; issue_date: string }>).length === 0 ? (
            <p className="text-sm text-ink-500 italic text-center py-6">لا توجد فواتير بعد.</p>
          ) : (
            <ul className="space-y-2">
              {((recentInvoicesRes.data ?? []) as Array<{ id: string; number: string; client_id: string | null; status: string; total: number | null; currency: string; issue_date: string }>).map((inv) => (
                <li key={inv.id}>
                  <Link href={`/admin/invoices/${inv.id}`} className="flex items-center justify-between gap-3 py-1.5 hover:bg-sage-50/40 -mx-2 px-2 rounded">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-900">
                        <code className="text-xs font-mono">{inv.number}</code>
                        {inv.client_id && <span className="ms-2 text-ink-700">{rcClientById.get(inv.client_id) || '—'}</span>}
                      </p>
                      <p className="text-xs text-ink-500">{new Date(inv.issue_date).toLocaleDateString('ar-SA')}</p>
                    </div>
                    <div className="text-end shrink-0">
                      <p className="text-sm font-semibold text-ink-900 tabular-nums" dir="ltr">{SAR(Number(inv.total || 0))}</p>
                      <p className="text-[11px] text-ink-500">{inv.status}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Open tasks widget */}
        <MyTasksWidget userId={user.id} />
      </div>
    </div>
  );
}

// ============== helpers ==============

function FunnelBar({ label, value, color, total }: { label: string; value: number; color: string; total: number }) {
  const pct = total > 0 ? Math.max(2, (value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink-700">{label}</span>
        <span className="font-semibold text-ink-900 tabular-nums">{value}</span>
      </div>
      <div className="h-2 bg-ink-900/5 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

async function MyTasksWidget({ userId }: { userId: string }) {
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: open }, { count: overdueCount }] = await Promise.all([
    admin.from('tasks').select('id, title, due_date, priority, status')
      .eq('assigned_to', userId)
      .in('status', ['pending', 'in_progress'])
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(8),
    admin.from('tasks').select('*', { count: 'exact', head: true })
      .eq('assigned_to', userId)
      .in('status', ['pending', 'in_progress'])
      .lt('due_date', today),
  ]);
  const tasks = (open ?? []) as Array<{ id: string; title: string; due_date: string | null; priority: 'low' | 'medium' | 'high'; status: string }>;
  return (
    <section className="rounded-2xl bg-paper border border-ink-900/5 p-6 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink-900 flex items-center gap-2">
          <ListChecks className="size-5 text-sage-700" /> مهامي
        </h2>
        {(overdueCount ?? 0) > 0 ? (
          <span className="text-xs text-red-700 font-medium">
            {overdueCount} متأخرة
          </span>
        ) : (
          <span className="text-xs text-ink-500">{tasks.length} نشطة</span>
        )}
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-ink-500 italic text-center py-6">لا توجد مهام مفتوحة.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => {
            const isOverdue = task.due_date && task.due_date < today;
            return (
              <li key={task.id}>
                <Link href={`/admin/tasks/${task.id}`} className="flex items-start gap-2.5 group py-1">
                  <Flag className={`size-3.5 mt-0.5 shrink-0 ${
                    task.priority === 'high' ? 'text-red-600' : task.priority === 'medium' ? 'text-amber-600' : 'text-ink-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink-900 group-hover:text-sage-700 truncate">{task.title}</p>
                    {task.due_date && (
                      <p className={`text-xs flex items-center gap-1 mt-0.5 ${isOverdue ? 'text-red-700 font-medium' : 'text-ink-500'}`}>
                        <Calendar className="size-3" />
                        <span className="tabular-nums">{new Date(task.due_date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}</span>
                        {isOverdue && <span>· متأخر</span>}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <div className="pt-2 border-t border-ink-900/5">
        <Link href="/admin/tasks?mine=1" className="text-xs text-ink-600 hover:text-sage-700">كل المهام →</Link>
      </div>
    </section>
  );
}

function EditorDashboard() {
  return (
    <div className="max-w-4xl mx-auto">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 leading-tight">لوحة التحكم</h1>
        <p className="mt-2 text-base text-ink-600">نظرة عامة على محتوى الموقع.</p>
      </header>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: 'الخدمات',     href: '/admin/services' },
          { label: 'القطاعات',    href: '/admin/sectors' },
          { label: 'الإحصائيات',  href: '/admin/stats' },
          { label: 'القيم المضافة', href: '/admin/value-props' },
          { label: 'التكاملات',   href: '/admin/integrations' },
          { label: 'قصص النجاح',  href: '/admin/case-studies' },
          { label: 'آراء العملاء', href: '/admin/testimonials' },
          { label: 'الفريق',      href: '/admin/team' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl bg-paper border border-ink-900/10 p-5 hover:border-sage-300 hover:shadow-sm transition-all flex items-center justify-between"
          >
            <p className="text-sm font-semibold text-ink-900">{item.label}</p>
            <ArrowUpRight className="size-4 text-ink-400" />
          </Link>
        ))}
      </div>
    </div>
  );
}
