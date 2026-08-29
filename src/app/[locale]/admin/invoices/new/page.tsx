import { PageHeader } from '@/components/admin/PageHeader';
import { DocumentForm } from '@/components/admin/DocumentForm';
import { createAdminClient } from '@/lib/supabase/admin';
import { nextDocumentNumber } from '@/lib/pdf/actions';

export default async function NewInvoicePage({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ client_id?: string; kind?: string }>;
}) {
  const { client_id, kind } = await searchParams;
  const admin = createAdminClient();

  // If a client is preset, pre-fill its name + company for the form
  let prefill: { defaultClientId?: string; defaultName?: string; defaultCompany?: string; defaultVat?: string; defaultAddress?: string } = {};
  if (client_id) {
    const { data: c } = await admin
      .from('clients')
      .select('id, name, company, vat_number, address')
      .eq('id', client_id)
      .maybeSingle();
    const row = c as { id: string; name: string; company: string | null; vat_number: string | null; address: string | null } | null;
    if (row) {
      prefill = {
        defaultClientId: row.id,
        defaultName: row.name,
        defaultCompany: row.company ?? '',
        defaultVat: row.vat_number ?? '',
        defaultAddress: row.address ?? '',
      };
    }
  }

  // Pre-generate a number suggestion
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const suggestedNumber = supabase
    ? await nextDocumentNumber(supabase, kind === 'quote' ? 'quote' : 'invoice')
    : (kind === 'quote' ? `QT-${new Date().getFullYear()}-001` : `INV-${new Date().getFullYear()}-001`);

  return (
    <div>
      <PageHeader
        title={kind === 'quote' ? 'عرض سعر جديد' : 'فاتورة جديدة'}
        backHref="/admin/invoices"
        description="اكتب التفاصيل، اضغط زراً واحداً، واحصل على PDF جاهز للإرسال."
      />
      <DocumentForm
        defaultKind={kind === 'quote' ? 'quote' : 'invoice'}
        defaultNumber={suggestedNumber}
        defaultClientId={prefill.defaultClientId}
        prefill={{
          name: prefill.defaultName,
          company: prefill.defaultCompany,
          vat_number: prefill.defaultVat,
          address: prefill.defaultAddress,
        }}
      />
    </div>
  );
}
