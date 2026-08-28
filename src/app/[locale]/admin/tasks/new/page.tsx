import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/admin/PageHeader';
import { TaskForm, type LinkOption } from '../TaskForm';
import type { TaskLinkType } from '@/lib/tasks/actions';

export default async function NewTaskPage({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ link_type?: string; link_id?: string }>;
}) {
  const { link_type, link_id } = await searchParams;
  const admin = createAdminClient();

  // Owners = every user
  const { data: ownersData } = await admin
    .from('users')
    .select('id, full_name, email')
    .order('full_name', { ascending: true });
  const owners = (ownersData ?? []) as Array<{ id: string; full_name: string | null; email: string }>;

  // Build link options: clients + leads
  const [{ data: clientsData }, { data: leadsData }] = await Promise.all([
    admin.from('clients').select('id, name, company, status').order('created_at', { ascending: false }).limit(200),
    admin.from('leads').select('id, name, company, status').order('created_at', { ascending: false }).limit(200),
  ]);

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

  // If a pre-fill link was passed, we inject a synthetic task that
  // has link_type/link_id so the form selects the right row.
  const prefilled = link_type && link_id ? {
    id: '',
    title: '',
    description: null,
    due_date: null,
    priority: 'medium' as const,
    status: 'pending' as const,
    assigned_to: null,
    created_by: null,
    link_type: link_type as TaskLinkType,
    link_id,
    completed_at: null,
    created_at: '',
    updated_at: '',
  } : undefined;

  return (
    <div>
      <PageHeader title="مهمة جديدة" backHref="/admin/tasks" />
      <TaskForm mode="create" owners={owners} linkOptions={linkOptions} task={prefilled} />
    </div>
  );
}
