import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/admin/PageHeader';
import { ClientForm } from '../ClientForm';
import { NotesSection } from '@/components/admin/NotesSection';
import { TasksSection } from '@/components/admin/TasksSection';
import { ProjectsSection } from '@/components/admin/ProjectsSection';
import type { Note } from '@/lib/notes/actions';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data } = await supabase.from('clients').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();

  // Load notes + tasks + projects in parallel
  const [notesRes, tasksRes, projectsRes] = await Promise.all([
    admin
      .from('notes')
      .select('id, parent_type, parent_id, body, author_id, created_at, updated_at')
      .eq('parent_type', 'client')
      .eq('parent_id', id)
      .order('created_at', { ascending: false }),
    admin
      .from('tasks')
      .select('id, title, description, due_date, priority, status, assigned_to, created_at, completed_at')
      .eq('link_type', 'client')
      .eq('link_id', id)
      .order('created_at', { ascending: false }),
    admin
      .from('projects')
      .select('id, name, status, start_date, due_date')
      .eq('client_id', id)
      .order('created_at', { ascending: false }),
  ]);

  // Resolve author names for notes
  const notesRaw = (notesRes.data ?? []) as unknown as Array<{
    id: string;
    parent_type: 'client' | 'lead' | 'project';
    parent_id: string;
    body: string;
    author_id: string | null;
    created_at: string;
    updated_at: string;
  }>;
  const authorIds = Array.from(new Set(notesRaw.map((n) => n.author_id).filter((x): x is string => !!x)));
  const { data: authors } = authorIds.length
    ? await admin.from('users').select('id, full_name, email').in('id', authorIds)
    : { data: [] };
  const authorById = new Map<string, { full_name: string | null; email: string }>(
    ((authors ?? []) as Array<{ id: string; full_name: string | null; email: string }>).map((u) => [u.id, u]),
  );
  const notes: Note[] = notesRaw.map((n) => ({
    ...n,
    author_name: n.author_id ? (authorById.get(n.author_id)?.full_name ?? null) : null,
    author_email: n.author_id ? (authorById.get(n.author_id)?.email ?? '') : '',
  }));

  // For projects: also fetch total hours per project
  const projectIds = ((projectsRes.data ?? []) as Array<{ id: string }>).map((p) => p.id);
  const { data: timeData } = projectIds.length
    ? await admin.from('time_entries').select('project_id, hours').in('project_id', projectIds)
    : { data: [] };
  const hoursByProject = new Map<string, number>();
  for (const e of (timeData ?? []) as Array<{ project_id: string; hours: number }>) {
    hoursByProject.set(e.project_id, (hoursByProject.get(e.project_id) ?? 0) + Number(e.hours || 0));
  }
  const projects = ((projectsRes.data ?? []) as Array<{
    id: string; name: string; status: 'planning' | 'in_progress' | 'on_hold' | 'delivered' | 'cancelled';
    start_date: string | null; due_date: string | null;
  }>).map((p) => ({
    ...p,
    total_hours: hoursByProject.get(p.id) ?? 0,
  }));

  return (
    <div>
      <PageHeader title="تعديل العميل" backHref="/admin/clients" description={`Editing "${data.name}"`} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ClientForm initial={data} />
        </div>
        <aside className="space-y-6">
          <ProjectsSection clientId={id} clientName={data.name} projects={projects} />
          <TasksSection linkType="client" linkId={id} linkLabel={data.name} tasks={tasksRes.data ?? []} />
          <NotesSection parentType="client" parentId={id} notes={notes} />
        </aside>
      </div>
    </div>
  );
}
