import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Calendar, User as UserIcon, Trash2, ExternalLink, FileText, Receipt, Repeat, ArrowRight } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/admin/PageHeader';
import { ProjectForm } from '../ProjectForm';
import { TimeEntriesSection } from '@/components/admin/TimeEntriesSection';
import { MilestonesSection } from '@/components/admin/MilestonesSection';
import { NotesSection } from '@/components/admin/NotesSection';
import { TasksSection } from '@/components/admin/TasksSection';
import { GenerateInvoiceButton } from '@/components/admin/GenerateInvoiceButton';
import { RenewNowButton } from '@/components/admin/RenewNowButton';
import { deleteProject } from '@/lib/projects/actions';
import type { Project, ProjectStatus } from '@/lib/projects/actions';
import type { Note } from '@/lib/notes/actions';
import type { Milestone } from '@/lib/milestones/actions';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  planning:    'تخطيط',
  in_progress: 'جارٍ',
  on_hold:     'متوقف',
  delivered:   'مُسلَّم',
  cancelled:   'ملغى',
};

const STATUS_STYLES: Record<ProjectStatus, string> = {
  planning:    'bg-ink-100 text-ink-700 ring-1 ring-ink-900/10',
  in_progress: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
  on_hold:     'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
  delivered:   'bg-sage-100 text-sage-800 ring-1 ring-sage-200',
  cancelled:   'bg-red-100 text-red-800 ring-1 ring-red-200',
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: project } = await admin.from('projects').select('*').eq('id', id).maybeSingle();
  if (!project) notFound();

  // Fetch related data in parallel: clients, owners, time, notes, tasks, milestones, templates
  const [
    { data: clientsData },
    { data: ownersData },
    { data: timeData },
    { data: notesData },
    { data: tasksData },
    { data: milestonesData },
    { data: templatesData },
  ] = await Promise.all([
    admin.from('clients').select('id, name, company, status').order('name', { ascending: true }),
    admin.from('users').select('id, full_name, email').order('full_name', { ascending: true }),
    admin
      .from('time_entries')
      .select('id, project_id, user_id, entry_date, hours, description, billable, hourly_rate, created_at, updated_at')
      .eq('project_id', id)
      .order('entry_date', { ascending: false }),
    admin
      .from('notes')
      .select('id, parent_type, parent_id, body, author_id, created_at, updated_at')
      .eq('parent_type', 'project')
      .eq('parent_id', id)
      .order('created_at', { ascending: false }),
    admin
      .from('tasks')
      .select('id, title, description, due_date, priority, status, assigned_to, created_at, completed_at')
      .eq('link_type', 'project')
      .eq('link_id', id)
      .order('created_at', { ascending: false }),
    admin
      .from('milestones')
      .select('id, project_id, name, description, due_date, status, order_index, completed_at, created_at, updated_at')
      .eq('project_id', id)
      .order('order_index', { ascending: true }),
    admin.from('templates').select('id, name, type').order('name', { ascending: true }),
  ]);

  const t = project as unknown as Project;
  const client = ((clientsData ?? []) as Array<{ id: string; name: string; company: string | null; status: string }>).find((c) => c.id === t.client_id) ?? null;
  const owner = t.owner_id
    ? ((ownersData ?? []) as Array<{ id: string; full_name: string | null; email: string }>).find((o) => o.id === t.owner_id) ?? null
    : null;
  const timeEntries = (timeData ?? []) as Array<{
    id: string; project_id: string; user_id: string; entry_date: string; hours: number;
    description: string | null; billable: boolean; hourly_rate: number | null; created_at: string; updated_at: string;
  }>;
  const tasks = (tasksData ?? []) as Array<{
    id: string; title: string; description: string | null; due_date: string | null;
    priority: 'low' | 'medium' | 'high'; status: 'pending' | 'in_progress' | 'done' | 'cancelled';
    assigned_to: string | null; created_at: string; completed_at: string | null;
  }>;
  const milestones = (milestonesData ?? []) as Milestone[];

  // Resolve note authors
  const noteAuthorIds = Array.from(new Set(((notesData ?? []) as Array<{ author_id: string | null }>).map((n) => n.author_id).filter((x): x is string => !!x)));
  const { data: noteAuthors } = noteAuthorIds.length
    ? await admin.from('users').select('id, full_name, email').in('id', noteAuthorIds)
    : { data: [] };
  const authorById = new Map<string, { full_name: string | null; email: string }>(
    ((noteAuthors ?? []) as Array<{ id: string; full_name: string | null; email: string }>).map((u) => [u.id, u]),
  );
  const notes: Note[] = ((notesData ?? []) as Array<Omit<Note, 'author_name' | 'author_email'>>).map((n) => ({
    ...n,
    parent_type: 'project',
    author_name: n.author_id ? (authorById.get(n.author_id)?.full_name ?? null) : null,
    author_email: n.author_id ? (authorById.get(n.author_id)?.email ?? '') : '',
  }));

  // Time entry users
  const timeUsers = ((ownersData ?? []) as Array<{ id: string; full_name: string | null; email: string }>);

  // Aggregates
  const totalHours = timeEntries.reduce((s, e) => s + Number(e.hours || 0), 0);
  const billableHours = timeEntries.filter((e) => e.billable).reduce((s, e) => s + Number(e.hours || 0), 0);
  const billableAmount = timeEntries
    .filter((e) => e.billable)
    .reduce((s, e) => s + Number(e.hours || 0) * Number(e.hourly_rate || 0), 0);

  const formatSAR = (n: number) =>
    new Intl.NumberFormat('ar-SA', { style: 'currency', currency: t.currency || 'SAR', maximumFractionDigits: 0 }).format(n);

  const isOverdue = t.due_date && t.status !== 'delivered' && t.status !== 'cancelled' && t.due_date < new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader
        title={t.name}
        backHref="/admin/projects"
        description={`${client ? `العميل: ${client.name}${client.company ? ` (${client.company})` : ''}` : 'بدون عميل'} · أنشئ ${new Date(t.created_at).toLocaleDateString('ar-SA')}`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[t.status]}`}>
              {STATUS_LABELS[t.status]}
            </span>
            {t.is_recurring && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 ring-1 ring-purple-200">
                <Repeat className="size-3" /> {t.recurrence_pattern === 'monthly' ? 'شهري' : 'ربع سنوي'}
              </span>
            )}
            {client && (
              <Link
                href={`/admin/clients/${client.id}`}
                className="inline-flex items-center gap-1.5 text-sm text-sage-700 hover:text-sage-800 hover:underline"
              >
                <span>بطاقة العميل</span>
                <ExternalLink className="size-3.5" />
              </Link>
            )}
            {t.is_recurring && (
              <RenewNowButton projectId={t.id} />
            )}
            <GenerateInvoiceButton
              projectId={t.id}
              projectName={t.name}
              templates={((templatesData ?? []) as Array<{ id: string; name: string; type: string }>)}
              hasBillableTime={timeEntries.some((e) => e.billable && e.hourly_rate != null)}
            />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: edit form + time entries */}
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-2xl bg-paper border border-ink-900/5 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-700 mb-4">تفاصيل المشروع</h2>
            <ProjectForm
              mode="edit"
              project={t}
              clients={((clientsData ?? []) as Array<{ id: string; name: string; company: string | null; status: string }>)}
              owners={((ownersData ?? []) as Array<{ id: string; full_name: string | null; email: string }>)}
            />
          </section>

          <TimeEntriesSection
            projectId={id}
            projectCurrency={t.currency ?? 'SAR'}
            entries={timeEntries}
            users={timeUsers}
          />

          <MilestonesSection
            projectId={id}
            milestones={milestones}
          />
        </div>

        {/* Right: summary + notes + tasks */}
        <aside className="space-y-6">
          {/* Summary */}
          <section className="rounded-2xl bg-paper border border-ink-900/5 p-5 space-y-3 text-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-700">الملخص</h2>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="ساعات مسجلة" value={totalHours > 0 ? `${totalHours.toFixed(2)}` : '—'} />
              <Stat label="منها قابلة للفوترة" value={billableHours > 0 ? billableHours.toFixed(2) : '—'} />
              {t.budget_hours != null && <Stat label="ميزانية الساعات" value={t.budget_hours.toString()} />}
              {t.budget_amount != null && <Stat label="ميزانية المبلغ" value={formatSAR(t.budget_amount)} />}
              {billableAmount > 0 && <Stat label="قابل للفوترة (ر.س)" value={formatSAR(billableAmount)} className="col-span-2 text-sage-700" />}
            </div>
            {(t.start_date || t.due_date) && (
              <div className="pt-3 mt-2 border-t border-ink-900/5 space-y-1.5">
                {t.start_date && (
                  <Field icon={<Calendar className="size-4" />} label="تاريخ البداية" value={new Date(t.start_date).toLocaleDateString('ar-SA')} />
                )}
                {t.due_date && (
                  <Field
                    icon={<Calendar className="size-4" />}
                    label="تاريخ التسليم"
                    value={new Date(t.due_date).toLocaleDateString('ar-SA')}
                    accent={isOverdue ? 'red' : undefined}
                  />
                )}
              </div>
            )}
            {owner && (
              <div className="pt-3 mt-2 border-t border-ink-900/5">
                <Field icon={<UserIcon className="size-4" />} label="المسؤول" value={owner.full_name || owner.email} />
              </div>
            )}
          </section>

          <TasksSection
            linkType="project"
            linkId={id}
            linkLabel={t.name}
            tasks={tasks}
          />

          <NotesSection
            parentType="project"
            parentId={id}
            notes={notes}
          />

          {/* Danger zone */}
          <section className="rounded-2xl border border-red-200/60 bg-red-50/40 p-4">
            <form
              action={async () => { 'use server'; await deleteProject(id); }}
            >
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 text-xs text-red-700 hover:text-red-800 hover:bg-red-100 rounded-lg py-2 transition-colors"
                onClick={(e) => {
                  if (typeof window !== 'undefined' && !window.confirm(`حذف المشروع "${t.name}"؟\nسيُحذف كل سجلات الوقت المرتبطة.`)) e.preventDefault();
                }}
              >
                <Trash2 className="size-3.5" /> حذف المشروع
              </button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-lg bg-linen-50/60 px-3 py-2 ${className}`}>
      <p className="text-[11px] text-ink-600 font-medium uppercase tracking-wider">{label}</p>
      <p className="text-base font-semibold text-ink-900 tabular-nums" dir="ltr">{value}</p>
    </div>
  );
}

function Field({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: 'red' }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className={`mt-0.5 shrink-0 ${accent === 'red' ? 'text-red-600' : 'text-ink-500'}`}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium ${accent === 'red' ? 'text-red-700' : 'text-ink-600'}`}>{label}</p>
        <p className={`truncate ${accent === 'red' ? 'text-red-900 font-medium' : 'text-ink-900'}`}>{value}</p>
      </div>
    </div>
  );
}
