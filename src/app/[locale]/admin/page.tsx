// src/app/[locale]/admin/page.tsx
// Dashboard overview.

import { getTranslations } from 'next-intl/server';
import { ArrowUpRight, ListChecks, Calendar, Flag, Repeat, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { countDueRecurring } from '@/lib/projects/actions';
import { ProcessAllDueRecurring } from '@/components/admin/ProcessAllDueRecurring';

export default async function AdminDashboard({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  // Admin is always Arabic; locale param is kept for Next's typed
  // segment API but not used.
  const t = await getTranslations('admin.dashboard');
  const tNav = await getTranslations('admin.nav');

  // Get the signed-in user + role from the cookie session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null; // layout already redirected

  const admin = createAdminClient();
  const { data: profileData } = await admin
    .from('users')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single();
  const profile = profileData as { role: 'owner' | 'editor'; full_name: string | null; email: string | null } | null;
  if (!profile) return null;

  const isOwner = profile.role === 'owner';

  // Stats (different for owner vs editor)
  let stats: { label: string; value: string | number; href?: string; icon: 'inbox' | 'receipt' | 'file' | 'users' }[] = [];
  let myOpenTasksCount = 0;
  let overdueTasksCount = 0;
  let dueRecurringCount = 0;

  if (isOwner) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7); weekStart.setHours(0, 0, 0, 0);
    const [newLeads, totalLeads, openInvoices, templatesCount, activeProjects, myOpenTasks, overdueTasks, myHoursThisWeek] = await Promise.all([
      admin.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
      admin.from('leads').select('*', { count: 'exact', head: true }),
      admin.from('invoices').select('*', { count: 'exact', head: true }).in('status', ['draft', 'sent', 'overdue']),
      admin.from('templates').select('*', { count: 'exact', head: true }),
      admin.from('projects').select('*', { count: 'exact', head: true }).in('status', ['planning', 'in_progress', 'on_hold']),
      admin.from('tasks').select('*', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .in('status', ['pending', 'in_progress']),
      admin.from('tasks').select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'in_progress'])
        .lt('due_date', todayStart.toISOString().slice(0, 10)),
      admin.from('time_entries').select('hours')
        .eq('user_id', user.id)
        .gte('entry_date', weekStart.toISOString().slice(0, 10)),
    ]);
    const weekHours = (myHoursThisWeek.data ?? []).reduce((s: number, e: { hours: number }) => s + Number(e.hours || 0), 0);
    dueRecurringCount = await countDueRecurring();
    stats = [
      { label: t('stats.new_leads'), value: newLeads.count ?? 0, href: '/admin/leads', icon: 'inbox' },
      { label: t('stats.active_projects'), value: activeProjects.count ?? 0, href: '/admin/projects', icon: 'file' },
      { label: t('stats.open_invoices'), value: openInvoices.count ?? 0, href: '/admin/invoices', icon: 'receipt' },
      { label: t('stats.hours_this_week'), value: weekHours.toFixed(1), href: '/admin/projects', icon: 'file' },
    ];
    myOpenTasksCount = myOpenTasks.count ?? 0;
    overdueTasksCount = overdueTasks.count ?? 0;
  } else {
    const [servicesCount, sectorsCount, statsCount, vpCount] = await Promise.all([
      admin.from('services').select('*', { count: 'exact', head: true }),
      admin.from('sectors').select('*', { count: 'exact', head: true }),
      admin.from('stats').select('*', { count: 'exact', head: true }),
      admin.from('value_props').select('*', { count: 'exact', head: true }),
    ]);
    stats = [
      { label: tNav('services'), value: servicesCount.count ?? 0, href: '/admin/services', icon: 'file' },
      { label: tNav('sectors'), value: sectorsCount.count ?? 0, href: '/admin/sectors', icon: 'file' },
      { label: tNav('stats'), value: statsCount.count ?? 0, href: '/admin/stats', icon: 'file' },
      { label: tNav('value_props'), value: vpCount.count ?? 0, href: '/admin/value-props', icon: 'file' },
    ];
  }

  // Recent leads (owner only)
  const recentLeadsRes = isOwner
    ? await admin.from('leads').select('id, name, email, status, created_at').order('created_at', { ascending: false }).limit(5)
    : { data: [] as { id: string; name: string; email: string | null; status: string; created_at: string }[] };
  const recentLeads = recentLeadsRes.data as Array<{ id: string; name: string; email: string | null; status: string; created_at: string }> | null;

  // My open tasks (owner only — meaningful for the team)
  const myTasksRes = isOwner
    ? await admin
        .from('tasks')
        .select('id, title, due_date, priority, status')
        .eq('assigned_to', user.id)
        .in('status', ['pending', 'in_progress'])
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(8)
    : { data: [] as Array<{ id: string; title: string; due_date: string | null; priority: string; status: string }> };
  const myTasks = myTasksRes.data ?? [];

  const displayName = profile.full_name || profile.email?.split('@')[0] || 'there';
  const welcome = t('welcome', { name: displayName });

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-ink-900 leading-tight">
          {t('title')}
        </h1>
        <p className="mt-2 text-base text-ink-600">
          {welcome} · {t('subtitle')}
        </p>
      </header>

      {isOwner && dueRecurringCount > 0 && (
        <div className="mb-6 rounded-2xl border-2 border-purple-300 bg-purple-50/60 p-5 flex items-center gap-4 flex-wrap">
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

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href ?? '#'}
            className="group rounded-2xl bg-paper border border-ink-900/10 p-5 hover:border-sage-400 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-700">{s.label}</p>
              {s.href && <ArrowUpRight className="size-4 text-ink-400 group-hover:text-sage-700 transition-colors" aria-hidden />}
            </div>
            <p className="text-3xl md:text-4xl font-semibold text-ink-900 tabular-nums">
              {s.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent leads (owner) */}
        {isOwner && (
          <section className="lg:col-span-2 rounded-2xl bg-paper border border-ink-900/5 p-6 md:p-7">
            <div className="flex items-center justify-between gap-4 mb-5">
              <h2 className="text-lg font-semibold text-ink-900">{t('recent_leads.title')}</h2>
              <Link href="/admin/leads" className="text-sm font-medium text-ink-700 hover:text-ink-900 underline-offset-4 hover:underline">
                {t('recent_leads.view_all')}
              </Link>
            </div>
            {recentLeads && recentLeads.length > 0 ? (
              <ul className="divide-y divide-ink-900/5">
                {recentLeads.map((lead) => (
                  <li key={lead.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-900 truncate">{lead.name}</p>
                      <p className="text-xs text-ink-500 truncate">{lead.email ?? '—'}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-3">
                      <span className={statusPill(lead.status)}>{lead.status}</span>
                      <span className="text-xs text-ink-500">
                        {new Date(lead.created_at).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-500 py-6 text-center">{t('recent_leads.empty')}</p>
            )}
          </section>
        )}

        {/* My tasks widget */}
        {isOwner && (
          <section className="rounded-2xl bg-paper border border-ink-900/5 p-6 md:p-7">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg font-semibold text-ink-900 flex items-center gap-2">
                  <ListChecks className="size-5 text-sage-700" />
                  مهامي
                </h2>
                {overdueTasksCount > 0 ? (
                  <p className="text-xs text-red-700 mt-1 font-medium">
                    {overdueTasksCount} مهمة متأخرة عن موعدها
                  </p>
                ) : (
                  <p className="text-xs text-ink-500 mt-1">{myOpenTasksCount} مهمة نشطة</p>
                )}
              </div>
              <Link href="/admin/tasks?mine=1" className="text-sm font-medium text-ink-700 hover:text-ink-900 underline-offset-4 hover:underline">
                عرض الكل
              </Link>
            </div>
            {myTasks.length > 0 ? (
              <ul className="space-y-2">
                {myTasks.map((task) => {
                  const isOverdue = task.due_date && task.due_date < new Date().toISOString().slice(0, 10);
                  return (
                    <li key={task.id}>
                      <Link
                        href={`/admin/tasks/${task.id}`}
                        className="flex items-start gap-2.5 group py-1.5"
                      >
                        <Flag className={`size-3.5 mt-0.5 shrink-0 ${
                          task.priority === 'high' ? 'text-red-600' : task.priority === 'medium' ? 'text-amber-600' : 'text-ink-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-ink-900 group-hover:text-sage-700 truncate">{task.title}</p>
                          {task.due_date && (
                            <p className={`text-xs flex items-center gap-1 mt-0.5 ${isOverdue ? 'text-red-700 font-medium' : 'text-ink-500'}`}>
                              <Calendar className="size-3" />
                              <span className="tabular-nums">{new Date(task.due_date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}</span>
                              {isOverdue && <span className="text-red-700">· متأخر</span>}
                            </p>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-ink-500 py-6 text-center">لا توجد مهام مفتوحة.</p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function statusPill(status: string) {
  const colors: Record<string, string> = {
    new:         'bg-sage-100 text-sage-800',
    contacted:   'bg-blue-100 text-blue-800',
    qualified:   'bg-amber-100 text-amber-800',
    proposal:    'bg-purple-100 text-purple-800',
    negotiation: 'bg-orange-100 text-orange-800',
    closed:      'bg-gray-100 text-gray-700',
    lost:        'bg-red-100 text-red-700',
  };
  return `inline-block text-xs font-medium px-2 py-0.5 rounded-full ${colors[status] ?? colors.new}`;
}
