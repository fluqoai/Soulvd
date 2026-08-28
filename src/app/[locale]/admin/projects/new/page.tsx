import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/admin/PageHeader';
import { ProjectForm } from '../ProjectForm';

export default async function NewProjectPage({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ client_id?: string }>;
}) {
  const { client_id: presetClientId } = await searchParams;
  const admin = createAdminClient();

  const [{ data: clientsData }, { data: ownersData }] = await Promise.all([
    admin.from('clients').select('id, name, company, status').neq('status', 'archived').order('name', { ascending: true }),
    admin.from('users').select('id, full_name, email').order('full_name', { ascending: true }),
  ]);
  const clients = (clientsData ?? []) as Array<{ id: string; name: string; company: string | null; status: string }>;
  const owners = (ownersData ?? []) as Array<{ id: string; full_name: string | null; email: string }>;

  return (
    <div>
      <PageHeader title="مشروع جديد" backHref="/admin/projects" />
      <ProjectForm
        mode="create"
        clients={clients}
        owners={owners}
        defaultClientId={presetClientId}
      />
    </div>
  );
}
