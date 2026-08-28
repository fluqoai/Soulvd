import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Calendar, FileText, ExternalLink, Trash2, Download, User as UserIcon, Briefcase } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/admin/PageHeader';
import { InvoiceForm } from '../InvoiceForm';
import { setInvoiceStatus, deleteInvoice, type InvoiceStatus, type LineItem } from '@/lib/invoices/actions';

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft:     'مسودة',
  sent:      'مُرسلة',
  paid:      'مدفوعة',
  overdue:   'متأخرة',
  cancelled: 'ملغاة',
};

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft:     'bg-ink-100 text-ink-700 ring-1 ring-ink-900/10',
  sent:      'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
  paid:      'bg-sage-100 text-sage-800 ring-1 ring-sage-200',
  overdue:   'bg-red-100 text-red-800 ring-1 ring-red-200',
  cancelled: 'bg-ink-100 text-ink-500 ring-1 ring-ink-900/10',
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: invoice } = await admin.from('invoices').select('*').eq('id', id).maybeSingle();
  if (!invoice) notFound();

  const [{ data: clientsData }, { data: projectsData }, { data: templatesData }, { data: clientRow }, { data: projectRow }] = await Promise.all([
    admin.from('clients').select('id, name, company, status').order('name', { ascending: true }),
    admin.from('projects').select('id, name, client_id, status').order('created_at', { ascending: false }),
    admin.from('templates').select('id, name, type').order('name', { ascending: true }),
    admin.from('clients').select('id, name, company, status').eq('id', (invoice as { client_id: string | null }).client_id ?? '00000000-0000-0000-0000-000000000000').maybeSingle(),
    admin.from('projects').select('id, name, client_id, status').eq('id', (invoice as { project_id: string | null }).project_id ?? '00000000-0000-0000-0000-000000000000').maybeSingle(),
  ]);

  const inv = invoice as unknown as {
    id: string;
    number: string;
    client_id: string | null;
    project_id: string | null;
    template_id: string | null;
    currency: string;
    vat_rate: number | null;
    vat_amount: number | null;
    subtotal: number | null;
    total: number | null;
    status: InvoiceStatus;
    issue_date: string;
    due_date: string | null;
    notes: string | null;
    data: { line_items?: LineItem[] };
    client_snapshot: { name?: string };
    generated_docx_path: string | null;
    generated_pdf_path: string | null;
  };

  const client = clientRow as { id: string; name: string; company: string | null } | null;
  const project = projectRow as { id: string; name: string } | null;
  const isOverdue = inv.due_date && inv.status !== 'paid' && inv.status !== 'cancelled' && inv.due_date < new Date().toISOString().slice(0, 10);

  const formatSAR = (n: number | null) =>
    n == null
      ? '—'
      : new Intl.NumberFormat('ar-SA', { style: 'currency', currency: inv.currency, maximumFractionDigits: 2 }).format(n);

  return (
    <div>
      <PageHeader
        title={`فاتورة ${inv.number}`}
        backHref="/admin/invoices"
        description={`تاريخ الإصدار: ${new Date(inv.issue_date).toLocaleDateString('ar-SA')}${inv.due_date ? ` · استحقاق: ${new Date(inv.due_date).toLocaleDateString('ar-SA')}` : ''}`}
        actions={
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[inv.status]}`}>
              {STATUS_LABELS[inv.status]}
            </span>
            {inv.status === 'draft' && (
              <form action={async () => { 'use server'; await setInvoiceStatus(inv.id, 'sent'); }}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-paper text-sm font-medium hover:bg-blue-700"
                >
                  تحويل إلى مُرسلة
                </button>
              </form>
            )}
            {inv.status === 'sent' && (
              <form action={async () => { 'use server'; await setInvoiceStatus(inv.id, 'paid'); }}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sage-600 text-paper text-sm font-medium hover:bg-sage-700"
                >
                  وضع كمدفوعة
                </button>
              </form>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-2xl bg-paper border border-ink-900/5 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-700 mb-4">تفاصيل الفاتورة</h2>
            <InvoiceForm
              mode="edit"
              invoice={inv}
              clients={(clientsData ?? []) as Array<{ id: string; name: string; company: string | null; status: string }>}
              projects={(projectsData ?? []) as Array<{ id: string; name: string; client_id: string; status: string }>}
              templates={(templatesData ?? []) as Array<{ id: string; name: string; type: string }>}
            />
          </section>
        </div>

        <aside className="space-y-6">
          {/* Quick stats */}
          <section className="rounded-2xl bg-paper border border-ink-900/5 p-5 space-y-3 text-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-700">الملخص</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-linen-50/60 px-3 py-2">
                <p className="text-[11px] text-ink-600 uppercase tracking-wider">قبل الضريبة</p>
                <p className="text-sm font-semibold text-ink-900 tabular-nums" dir="ltr">{formatSAR(Number(inv.subtotal) || 0)}</p>
              </div>
              <div className="rounded-lg bg-linen-50/60 px-3 py-2">
                <p className="text-[11px] text-ink-600 uppercase tracking-wider">الضريبة ({inv.vat_rate || 0}%)</p>
                <p className="text-sm font-semibold text-ink-900 tabular-nums" dir="ltr">{formatSAR(Number(inv.vat_amount) || 0)}</p>
              </div>
              <div className="rounded-lg bg-sage-50 px-3 py-2 col-span-2">
                <p className="text-[11px] text-sage-700 font-semibold uppercase tracking-wider">الإجمالي</p>
                <p className="text-lg font-bold text-sage-700 tabular-nums" dir="ltr">{formatSAR(Number(inv.total) || 0)}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-paper border border-ink-900/5 p-5 space-y-3 text-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-700">الروابط</h2>
            {client && (
              <Link href={`/admin/clients/${client.id}`} className="flex items-center gap-2 text-ink-700 hover:text-sage-700">
                <UserIcon className="size-4 text-ink-500" />
                <span>{client.name}{client.company ? ` (${client.company})` : ''}</span>
                <ExternalLink className="size-3 text-ink-400" />
              </Link>
            )}
            {project && (
              <Link href={`/admin/projects/${project.id}`} className="flex items-center gap-2 text-ink-700 hover:text-sage-700">
                <Briefcase className="size-4 text-ink-500" />
                <span>{project.name}</span>
                <ExternalLink className="size-3 text-ink-400" />
              </Link>
            )}
            {isOverdue && (
              <p className="pt-2 mt-2 border-t border-ink-900/10 text-xs text-red-700 font-medium flex items-center gap-1.5">
                <Calendar className="size-3.5" /> متأخرة عن الاستحقاق
              </p>
            )}
          </section>

          {/* Generated documents */}
          {(inv.generated_docx_path || inv.generated_pdf_path) && (
            <section className="rounded-2xl bg-paper border border-ink-900/5 p-5 space-y-2 text-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-700">المستندات المولدة</h2>
              {inv.generated_docx_path && (
                <a href={inv.generated_docx_path} className="flex items-center gap-2 text-sage-700 hover:text-sage-800">
                  <Download className="size-3.5" /> ملف .docx
                </a>
              )}
              {inv.generated_pdf_path && (
                <a href={inv.generated_pdf_path} className="flex items-center gap-2 text-sage-700 hover:text-sage-800">
                  <Download className="size-3.5" /> ملف PDF
                </a>
              )}
            </section>
          )}

          {/* Danger zone */}
          <section className="rounded-2xl border border-red-200/60 bg-red-50/40 p-4">
            <form
              action={async () => { 'use server'; await deleteInvoice(inv.id); }}
            >
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 text-xs text-red-700 hover:text-red-800 hover:bg-red-100 rounded-lg py-2 transition-colors"
                onClick={(e) => {
                  if (typeof window !== 'undefined' && !window.confirm(`حذف الفاتورة ${inv.number}؟`)) e.preventDefault();
                }}
              >
                <Trash2 className="size-3.5" /> حذف الفاتورة
              </button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}
