import { Plus, Mail, Phone, Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { ButtonLink } from '@/components/ui/Button';
import { deleteClientAction } from './actions';

type C = { id: string; name: string; company: string | null; email: string | null; phone: string | null; vat_number: string | null; created_at: string };

export default async function Page({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const supabase = await createClient();
  const { data } = await supabase.from('clients').select('id, name, company, email, phone, vat_number, created_at').order('created_at', { ascending: false });
  const items = (data ?? []) as unknown as C[];

  return (
    <div>
      <PageHeader
        title="العملاء"
        description="بيانات العملاء المسجّلين — تُستخدم لإنشاء الفواتير وعروض الأسعار."
        actions={
          <ButtonLink href="/admin/clients/new" size="sm" variant="primary">
            <Plus className="size-4" /> عميل جديد
          </ButtonLink>
        }
      />
      <DataTable
        rows={items}
        rowKey={(r) => r.id}
        editHref={(r) => `/admin/clients/${r.id}`}
        emptyMessage="لا يوجد عملاء بعد — أنشئ عميلاً أو حوّل استفساراً."
        columns={[
          {
            key: 'name',
            header: 'الاسم',
            cell: (r) => (
              <div>
                <div className="font-semibold text-ink-900">{r.name}</div>
                {r.company && (
                  <div className="text-xs text-ink-600 flex items-center gap-1 mt-0.5">
                    <Building2 className="size-3" /> {r.company}
                  </div>
                )}
              </div>
            ),
          },
          {
            key: 'contact',
            header: 'التواصل',
            cell: (r) => (
              <div className="space-y-0.5 text-xs">
                {r.email && (
                  <a href={`mailto:${r.email}`} className="flex items-center gap-1.5 text-ink-700 hover:text-sage-700">
                    <Mail className="size-3" /> {r.email}
                  </a>
                )}
                {r.phone && (
                  <a href={`tel:${r.phone}`} className="flex items-center gap-1.5 text-ink-700 hover:text-sage-700">
                    <Phone className="size-3" /> {r.phone}
                  </a>
                )}
              </div>
            ),
          },
          {
            key: 'vat',
            header: 'الرقم الضريبي',
            width: '180px',
            cell: (r) => r.vat_number
              ? <code className="text-xs px-2 py-1 rounded bg-linen-100 text-ink-700 border border-ink-900/10">{r.vat_number}</code>
              : <span className="text-ink-400">—</span>,
          },
          {
            key: 'created',
            header: 'تاريخ الإضافة',
            width: '140px',
            cell: (r) => (
              <span className="text-xs text-ink-700 tabular-nums">
                {new Date(r.created_at).toLocaleDateString('ar-SA')}
              </span>
            ),
          },
        ]}
        rowAction={(r) => (
          <DeleteButton id={r.id} action={deleteClientAction} confirm={`حذف العميل "${r.name}"؟`} />
        )}
      />
    </div>
  );
}
