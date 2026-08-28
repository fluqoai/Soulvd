import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/admin/PageHeader';
import { ClientForm } from '../ClientForm';
import { NotesSection } from '@/components/admin/NotesSection';
import { TasksSection } from '@/components/admin/TasksSection';
import type { Note } from '@/lib/notes/actions';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data } = await supabase.from('clients').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();

  // Load notes + tasks in parallel
  const [notesRes, tasksRes] = await Promise.all([
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

  return (
    <div>
      <PageHeader title="تعديل العميل" backHref="/admin/clients" description={`Editing "${data.name}"`} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ClientForm initial={data} />
        </div>
        <aside className="space-y-6">
          <NotesSection parentType="client" parentId={id} notes={notes} />
          <TasksSection linkType="client" linkId={id} linkLabel={data.name} tasks={tasksRes.data ?? []} />
        </aside>
      </div>
    </div>
  );
}
