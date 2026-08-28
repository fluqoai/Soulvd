import Link from 'next/link';
import { Plus, Calendar, Flag, User as UserIcon, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/admin/PageHeader';
import { ButtonLink } from '@/components/ui/Button';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { deleteTask } from '@/lib/tasks/actions';
import { TaskStatusToggle } from './TaskStatusToggle';
import type { TaskStatus, TaskPriority, TaskLinkType } from '@/lib/tasks/actions';

type Row = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_to: string | null;
  link_type: TaskLinkType | null;
  link_id: string | null;
  completed_at: string | null;
  created_at: string;
  assignee_name?: string | null;
  assignee_email?: string | null;
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending:     'معلّق',
  in_progress: 'جارٍ',
  done:        'منجز',
  cancelled:   'ملغى',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low:    'منخفض',
  medium: 'متوسط',
  high:   'عاجل',
};

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low:    'text-ink-500 bg-ink-100',
  medium: 'text-amber-800 bg-amber-100',
  high:   'text-red-800 bg-red-100',
};

export default async function TasksPage({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; mine?: string; link_type?: string; link_id?: string }>;
}) {
  const { status, mine, link_type, link_id } = await searchParams;
  const supabase = await createClient();
  const admin = createAdminClient();

  // Current user (for "mine" filter)
  const { data: { user } } = await supabase.auth.getUser();

  let query = admin
    .from('tasks')
    .select('id, title, description, due_date, priority, status, assigned_to, link_type, link_id, completed_at, created_at')
    .order('created_at', { ascending: false });

  if (status && status !== 'all') query = query.eq('status', status as TaskStatus);
  if (mine === '1' && user) query = query.eq('assigned_to', user.id);
  if (link_type && link_id) {
    query = query.eq('link_type', link_type as TaskLinkType).eq('link_id', link_id);
  }

  const { data: rows } = await query;
  const items = (rows ?? []) as unknown as Row[];

  // Assignee names
  const assigneeIds = Array.from(new Set(items.map((r) => r.assigned_to).filter((x): x is string => !!x)));
  const { data: users } = assigneeIds.length
    ? await admin.from('users').select('id, full_name, email').in('id', assigneeIds)
    : { data: [] };
  const userById = new Map<string, { full_name: string | null; email: string }>(
    ((users ?? []) as Array<{ id: string; full_name: string | null; email: string }>).map((u) => [u.id, u]),
  );
  for (const r of items) {
    if (r.assigned_to) {
      const u = userById.get(r.assigned_to);
      r.assignee_name = u?.full_name ?? null;
      r.assignee_email = u?.email ?? null;
    }
  }

  // Counts for tabs
  const [{ count: allCount }, { count: pendingCount }, { count: progressCount }, { count: doneCount }] = await Promise.all([
    admin.from('tasks').select('*', { count: 'exact', head: true }),
    admin.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
    admin.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'done'),
  ]);

  const tabs = [
    { value: 'all',         label: 'الكل',         count: allCount ?? 0 },
    { value: 'pending',     label: 'معلّق',        count: pendingCount ?? 0 },
    { value: 'in_progress', label: 'جارٍ',         count: progressCount ?? 0 },
    { value: 'done',        label: 'منجز',         count: doneCount ?? 0 },
  ];

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    if (status) sp.set('status', status);
    if (mine) sp.set('mine', mine);
    if (overrides.status !== undefined) {
      if (overrides.status) sp.set('status', overrides.status);
      else sp.delete('status');
    }
    if (overrides.mine !== undefined) {
      if (overrides.mine) sp.set('mine', overrides.mine);
      else sp.delete('mine');
    }
    const q = sp.toString();
    return q ? `/admin/tasks?${q}` : '/admin/tasks';
  };

  return (
    <div>
      <PageHeader
        title="المهام"
        description="قائمة مهام الفريق — تُربط بالعميل أو الاستفسار لمتابعتها في مكان واحد."
        actions={
          <ButtonLink href="/admin/tasks/new" size="sm" variant="primary">
            <Plus className="size-4" /> مهمة جديدة
          </ButtonLink>
        }
      />

      {/* Filter tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tabs.map((tab) => {
          const active = (status ?? 'all') === tab.value;
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
        <div className="w-px h-6 bg-ink-900/10 mx-1" />
        <Link
          href={buildHref({ mine: mine === '1' ? '' : '1' })}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
            mine === '1'
              ? 'bg-purple-600 text-paper shadow-sm'
              : 'bg-paper text-ink-700 border border-ink-900/10 hover:border-purple-300 hover:text-purple-800'
          }`}
        >
          <UserIcon className="size-3.5" /> المسندة لي
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl bg-paper border border-ink-900/10 p-12 text-center">
          <p className="text-ink-600 mb-3">لا توجد مهام بهذه التصفية.</p>
          <ButtonLink href="/admin/tasks/new" size="sm" variant="primary">
            <Plus className="size-4" /> إنشاء أول مهمة
          </ButtonLink>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((t) => (
            <li
              key={t.id}
              className="rounded-xl border border-ink-900/10 bg-paper p-4 hover:border-sage-300 transition-colors"
            >
              <div className="flex items-start gap-3">
                <TaskStatusToggle id={t.id} status={t.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <a href={`/admin/tasks/${t.id}`} className="flex-1 min-w-0 group">
                      <h3 className={`text-sm font-semibold group-hover:text-sage-700 ${t.status === 'done' || t.status === 'cancelled' ? 'line-through text-ink-500' : 'text-ink-900'}`}>
                        {t.title}
                      </h3>
                    </a>
                    <DeleteButton id={t.id} action={deleteTask} confirm={`حذف المهمة "${t.title}"؟`} />
                  </div>
                  {t.description && (
                    <p className="mt-1 text-xs text-ink-600 line-clamp-2">{t.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[t.priority]}`}>
                      <Flag className="size-3 ms-0.5" /> {PRIORITY_LABELS[t.priority]}
                    </span>
                    {t.due_date && (
                      <span className="inline-flex items-center gap-0.5 text-ink-700">
                        <Calendar className="size-3" />
                        <span className="tabular-nums">{new Date(t.due_date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}</span>
                      </span>
                    )}
                    {t.assigned_to && (
                      <span className="inline-flex items-center gap-1 text-ink-700">
                        <UserIcon className="size-3" /> {t.assignee_name || t.assignee_email}
                      </span>
                    )}
                    {t.link_type && t.link_id && (
                      <Link
                        href={`/admin/${t.link_type === 'lead' ? 'leads' : t.link_type === 'client' ? 'clients' : 'tasks'}/${t.link_id}`}
                        className="inline-flex items-center gap-1 text-sage-700 hover:text-sage-800 hover:underline"
                      >
                        <ExternalLink className="size-3" /> {t.link_type === 'lead' ? 'استفسار' : t.link_type === 'client' ? 'عميل' : 'مشروع'}
                      </Link>
                    )}
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
