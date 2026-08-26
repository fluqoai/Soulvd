import { Plus, Mail, Phone, Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { ButtonLink } from '@/components/ui/Button';
import { deleteClientAction } from './actions';

type C = { id: string; name: string; company: string | null; email: string | null; phone: string | null; vat_number: string | null; created_at: string };

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('clients').select('id, name, company, email, phone, vat_number, created_at').order('created_at', { ascending: false });
  const items = (data ?? []) as unknown as C[];

  return (
    <div>
      <PageHeader title="Clients" description="Saved client info — used to generate invoices and quotes." actions={
        <ButtonLink href={`/admin/clients/new`} size="sm" variant="primary"><Plus className="size-4" />New client</ButtonLink>
      } />
      <DataTable rows={items} rowKey={(r) => r.id} editHref={(r) => `/admin/clients/${r.id}`} emptyMessage="No clients yet — create one or convert a lead."
        columns={[
          { key: 'name', header: 'Name', cell: (r) => <div><div className="font-medium">{r.name}</div>{r.company && <div className="text-xs text-linen-400 flex items-center gap-1"><Building2 className="size-3" />{r.company}</div>}</div> },
          { key: 'contact', header: 'Contact', cell: (r) => <div className="space-y-0.5 text-xs">{r.email && <div className="flex items-center gap-1 text-linen-300"><Mail className="size-3" />{r.email}</div>}{r.phone && <div className="flex items-center gap-1 text-linen-300"><Phone className="size-3" />{r.phone}</div>}</div> },
          { key: 'vat', header: 'VAT', width: '180px', cell: (r) => r.vat_number ? <code className="text-xs text-linen-300">{r.vat_number}</code> : <span className="text-linen-500">—</span> },
          { key: 'created', header: 'Added', width: '120px', cell: (r) => <span className="text-xs text-linen-400">{new Date(r.created_at).toLocaleDateString(locale)}</span> },
        ]}
        rowAction={(r) => <DeleteButton id={r.id} action={deleteClientAction} confirm={`Delete client "${r.name}"?`} />}
      />
    </div>
  );
}
