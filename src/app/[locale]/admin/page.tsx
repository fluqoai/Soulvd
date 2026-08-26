// src/app/[locale]/admin/page.tsx
// Dashboard overview.

import { getTranslations } from 'next-intl/server';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

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

  if (isOwner) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [newLeads, totalLeads, openInvoices, templatesCount] = await Promise.all([
      admin.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
      admin.from('leads').select('*', { count: 'exact', head: true }),
      admin.from('invoices').select('*', { count: 'exact', head: true }).in('status', ['draft', 'sent', 'overdue']),
      admin.from('templates').select('*', { count: 'exact', head: true }),
    ]);
    stats = [
      { label: t('stats.new_leads'), value: newLeads.count ?? 0, href: '/admin/leads', icon: 'inbox' },
      { label: t('stats.total_leads'), value: totalLeads.count ?? 0, href: '/admin/leads', icon: 'inbox' },
      { label: t('stats.open_invoices'), value: openInvoices.count ?? 0, href: '/admin/invoices', icon: 'receipt' },
      { label: t('stats.templates_count'), value: templatesCount.count ?? 0, href: '/admin/templates', icon: 'file' },
    ];
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

      {/* Recent leads (owner) */}
      {isOwner && (
        <section className="rounded-2xl bg-paper border border-ink-900/5 p-6 md:p-7">
          <div className="flex items-center justify-between gap-4 mb-5">
            <h2 className="text-lg font-semibold text-ink-900">{t('recent_leads.title')}</h2>
            <Link href="/admin/leads" className="text-sm font-medium text-ink-700 hover:text-ink-900 تحتline-offset-4 hover:تحتline">
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
    </div>
  );
}

function statusPill(status: string) {
  const colors: Record<string, string> = {
    new: 'bg-sage-100 text-sage-800',
    contacted: 'bg-amber-100 text-amber-800',
    qualified: 'bg-blue-100 text-blue-800',
    closed: 'bg-gray-100 text-gray-700',
    lost: 'bg-red-100 text-red-700',
  };
  return `inline-block text-xs font-medium px-2 py-0.5 rounded-full ${colors[status] ?? colors.new}`;
}
