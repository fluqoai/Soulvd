import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Flag, User as UserIcon, ExternalLink, Trash2 } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/admin/PageHeader';
import { TaskForm, type LinkOption } from '../TaskForm';
import { deleteTask } from '@/lib/tasks/actions';
import type { Task, TaskLinkType } from '@/lib/tasks/actions';

const PRIORITY_LABELS = { low: 'منخفض', medium: 'متوسط', high: 'عاجل' } as const;
const STATUS_LABELS = { pending: 'معلّق', in_progress: 'جارٍ', done: 'منجز', cancelled: 'ملغى' } as const;

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: task } = await admin.from('tasks').select('*').eq('id', id).maybeSingle();
  if (!task) notFound();

  const [{ data: ownersData }, { data: clientsData }, { data: leadsData }] = await Promise.all([
    admin.from('users').select('id, full_name, email').order('full_name', { ascending: true }),
    admin.from('clients').select('id, name, company, status').order('created_at', { ascending: false }).limit(200),
    admin.from('leads').select('id, name, company, status').order('created_at', { ascending: false }).limit(200),
  ]);
  const owners = (ownersData ?? []) as Array<{ id: string; full_name: string | null; email: string }>;
  const linkOptions: LinkOption[] = [
    ...((clientsData ?? []) as Array<{ id: string; name: string; company: string | null; status: string }>).map((c) => ({
      value: c.id,
      link_type: 'client' as TaskLinkType,
      label: `عميل · ${c.name}${c.company ? ` (${c.company})` : ''}${c.status === 'archived' ? ' · مؤرشف' : ''}`,
    })),
    ...((leadsData ?? []) as Array<{ id: string; name: string; company: string | null; status: string }>).map((l) => ({
      value: l.id,
      link_type: 'lead' as TaskLinkType,
      label: `استفسار · ${l.name}${l.company ? ` (${l.company})` : ''}`,
    })),
  ];

  // The form expects a Task shape; cast our select('*') row to it.
  const t = task as unknown as Task;

  // Resolve linked entity name (for the right side)
  let linkedTo: { label: string; href: string } | null = null;
  if (t.link_type === 'client' && t.link_id) {
    const { data: c } = await admin.from('clients').select('id, name').eq('id', t.link_id).maybeSingle();
    const cRow = c as { id: string; name: string } | null;
    if (cRow) linkedTo = { label: `عميل · ${cRow.name}`, href: `/admin/clients/${cRow.id}` };
  } else if (t.link_type === 'lead' && t.link_id) {
    const { data: l } = await admin.from('leads').select('id, name').eq('id', t.link_id).maybeSingle();
    const lRow = l as { id: string; name: string } | null;
    if (lRow) linkedTo = { label: `استفسار · ${lRow.name}`, href: `/admin/leads/${lRow.id}` };
  }

  return (
    <div>
      <PageHeader
        title={t.title || 'مهمة'}
        backHref="/admin/tasks"
        description={`أنشئت في ${new Date(t.created_at).toLocaleString('ar-SA')}`}
        actions={
          <form action={async () => { 'use server'; await deleteTask(t.id); }}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 text-xs text-red-700 hover:text-red-800 hover:bg-red-50 rounded-lg px-3 py-2 transition-colors"
              onClick={(e) => {
                if (typeof window !== 'undefined' && !window.confirm(`حذف المهمة "${t.title}"؟`)) e.preventDefault();
              }}
            >
              <Trash2 className="size-3.5" /> حذف
            </button>
          </form>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TaskForm mode="edit" task={t} owners={owners} linkOptions={linkOptions} />
        </div>
        <aside className="space-y-3">
          <section className="rounded-xl border border-ink-900/10 bg-paper p-5 space-y-3 text-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-700">الحالة</h2>
            <Field icon={<Flag className="size-4" />} label="الأولوية" value={PRIORITY_LABELS[t.priority]} />
            <Field icon={<Calendar className="size-4" />} label="تاريخ الاستحقاق" value={t.due_date ? new Date(t.due_date).toLocaleDateString('ar-SA') : null} />
            <Field icon={<UserIcon className="size-4" />} label="المسؤول" value={t.assigned_to ? owners.find((o) => o.id === t.assigned_to)?.full_name ?? owners.find((o) => o.id === t.assigned_to)?.email : null} />
            <Field icon={<Calendar className="size-4" />} label="الحالة" value={STATUS_LABELS[t.status]} />
            {t.completed_at && (
              <p className="pt-2 mt-2 border-t border-ink-900/10 text-xs text-sage-700 font-medium flex items-center gap-1.5">
                ✓ أنجزت في {new Date(t.completed_at).toLocaleString('ar-SA')}
              </p>
            )}
            {linkedTo && (
              <Link
                href={linkedTo.href}
                className="flex items-center gap-1.5 text-sm text-sage-700 hover:text-sage-800 hover:underline pt-2 mt-2 border-t border-ink-900/10"
              >
                <ExternalLink className="size-3.5" /> {linkedTo.label}
              </Link>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-ink-500 mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-ink-600 font-medium">{label}</p>
        <p className="text-ink-900 truncate">{value || <span className="text-ink-400">—</span>}</p>
      </div>
    </div>
  );
}
