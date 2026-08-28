import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/admin/PageHeader';
import { InvoiceForm } from '../InvoiceForm';

export default async function NewInvoicePage({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ client_id?: string; project_id?: string }>;
}) {
  const { client_id: presetClient, project_id: presetProject } = await searchParams;
  const admin = createAdminClient();

  const [{ data: clientsData }, { data: projectsData }, { data: templatesData }] = await Promise.all([
    admin.from('clients').select('id, name, company, status').order('name', { ascending: true }),
    admin.from('projects').select('id, name, client_id, status').order('created_at', { ascending: false }),
    admin.from('templates').select('id, name, type').order('name', { ascending: true }),
  ]);

  return (
    <div>
      <PageHeader title="فاتورة جديدة" backHref="/admin/invoices" />
      <InvoiceForm
        mode="create"
        clients={(clientsData ?? []) as Array<{ id: string; name: string; company: string | null; status: string }>}
        projects={(projectsData ?? []) as Array<{ id: string; name: string; client_id: string; status: string }>}
        templates={(templatesData ?? []) as Array<{ id: string; name: string; type: string }>}
        defaultClientId={presetClient}
        defaultProjectId={presetProject}
      />
    </div>
  );
}
