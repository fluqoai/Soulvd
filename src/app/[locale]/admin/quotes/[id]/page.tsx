// src/app/[locale]/admin/quotes/[id]/page.tsx
// Quote detail page (view-only). Mirrors /admin/invoices/[id] but for the
// `quotes` table. Edit flow is not built yet — quotes are created and
// viewed from here; status changes go through the header buttons.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  ExternalLink,
  Trash2,
  Download,
  User as UserIcon,
  Briefcase,
  CheckCircle2,
  XCircle,
  Send,
  Hourglass,
} from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/admin/PageHeader';
import {
  setQuoteStatus,
  deleteQuote,
} from '@/lib/quotes/actions';
import {
  type QuoteStatus,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_STYLES,
} from '@/lib/quotes/constants';

type LineItem = { description: string; quantity: number; unit_price: number };

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: quote } = await admin.from('quotes').select('*').eq('id', id).maybeSingle();
  if (!quote) notFound();

  const q = quote as unknown as {
    id: string;
    number: string;
    client_id: string | null;
    project_id: string | null;
    currency: string;
    vat_rate: number | null;
    vat_amount: number | null;
    subtotal: number | null;
    total: number | null;
    status: QuoteStatus;
    issue_date: string;
    valid_until: string | null;
    notes: string | null;
    data: { line_items?: LineItem[] };
    client_snapshot: { name?: string; company?: string; email?: string; phone?: string; vat_number?: string; address?: string };
    generated_pdf_path: string | null;
  };

  // Fetch client + project for sidebar links.
  const [{ data: clientRow }, { data: projectRow }] = await Promise.all([
    q.client_id
      ? admin
          .from('clients')
          .select('id, name, company')
          .eq('id', q.client_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    q.project_id
      ? admin
          .from('projects')
          .select('id, name')
          .eq('id', q.project_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const client = clientRow as { id: string; name: string; company: string | null } | null;
  const project = projectRow as { id: string; name: string } | null;

  const today = new Date().toISOString().slice(0, 10);
  const isExpired =
    q.valid_until &&
    q.status !== 'accepted' &&
    q.status !== 'rejected' &&
    q.status !== 'expired' &&
    q.valid_until < today;

  const lineItems = q.data?.line_items ?? [];
  const formatSAR = (n: number | null) =>
    n == null
      ? '—'
      : new Intl.NumberFormat('ar-SA', { style: 'currency', currency: q.currency || 'SAR', maximumFractionDigits: 2 }).format(n);

  // Status transition buttons. Terminal states (accepted, rejected, expired)
  // have no outgoing transitions. `draft` goes to `sent`. `sent` branches to
  // accepted / rejected / expired.
  const transitions: Array<{ to: QuoteStatus; label: string; icon: React.ReactNode; className: string }> = [];
  if (q.status === 'draft') {
    transitions.push({
      to: 'sent',
      label: 'إرسال للعميل',
      icon: <Send className="size-3.5" />,
      className: 'bg-blue-600 text-paper hover:bg-blue-700',
    });
  } else if (q.status === 'sent') {
    transitions.push(
      {
        to: 'accepted',
        label: 'قبول',
        icon: <CheckCircle2 className="size-3.5" />,
        className: 'bg-sage-600 text-paper hover:bg-sage-700',
      },
      {
        to: 'rejected',
        label: 'رفض',
        icon: <XCircle className="size-3.5" />,
        className: 'bg-red-600 text-paper hover:bg-red-700',
      },
      {
        to: 'expired',
        label: 'انتهت صلاحيته',
        icon: <Hourglass className="size-3.5" />,
        className: 'bg-ink-700 text-paper hover:bg-ink-800',
      },
    );
  }

  return (
    <div>
      <PageHeader
        title={`عرض سعر ${q.number}`}
        backHref="/admin/quotes"
        description={`تاريخ الإصدار: ${new Date(q.issue_date).toLocaleDateString('ar-SA')}${
          q.valid_until ? ` · صالح حتى: ${new Date(q.valid_until).toLocaleDateString('ar-SA')}` : ''
        }`}
        actions={
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${QUOTE_STATUS_STYLES[q.status]}`}
            >
              {QUOTE_STATUS_LABELS[q.status]}
            </span>
            {transitions.map((t) => (
              <form
                key={t.to}
                action={async () => {
                  'use server';
                  await setQuoteStatus(q.id, t.to);
                }}
              >
                <button
                  type="submit"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${t.className}`}
                >
                  {t.icon}
                  {t.label}
                </button>
              </form>
            ))}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Client block (from snapshot) */}
          <section className="rounded-2xl bg-paper border border-ink-900/5 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-700 mb-4">
              بيانات العميل
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-xs text-ink-500">الاسم</dt>
                <dd className="font-medium text-ink-900">{q.client_snapshot?.name ?? '—'}</dd>
              </div>
              {q.client_snapshot?.company && (
                <div>
                  <dt className="text-xs text-ink-500">الشركة</dt>
                  <dd className="font-medium text-ink-900">{q.client_snapshot.company}</dd>
                </div>
              )}
              {q.client_snapshot?.vat_number && (
                <div>
                  <dt className="text-xs text-ink-500">الرقم الضريبي</dt>
                  <dd className="font-medium text-ink-900 font-mono" dir="ltr">
                    {q.client_snapshot.vat_number}
                  </dd>
                </div>
              )}
              {q.client_snapshot?.phone && (
                <div>
                  <dt className="text-xs text-ink-500">الجوال</dt>
                  <dd className="font-medium text-ink-900 font-mono" dir="ltr">
                    {q.client_snapshot.phone}
                  </dd>
                </div>
              )}
              {q.client_snapshot?.email && (
                <div>
                  <dt className="text-xs text-ink-500">البريد الإلكتروني</dt>
                  <dd className="font-medium text-ink-900 font-mono" dir="ltr">
                    {q.client_snapshot.email}
                  </dd>
                </div>
              )}
              {q.client_snapshot?.address && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-ink-500">العنوان</dt>
                  <dd className="font-medium text-ink-900">{q.client_snapshot.address}</dd>
                </div>
              )}
            </dl>
          </section>

          {/* Line items (read-only) */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-700 mb-2">البنود</h2>
            <div className="rounded-xl border border-ink-900/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-linen-50/60 text-xs text-ink-600 uppercase tracking-wider">
                  <tr>
                    <th className="text-start font-medium px-3 py-2">الوصف</th>
                    <th className="text-end font-medium px-2 py-2 w-24">الكمية</th>
                    <th className="text-end font-medium px-2 py-2 w-32">السعر</th>
                    <th className="text-end font-medium px-2 py-2 w-28">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-900/5">
                  {lineItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-ink-500">
                        لا توجد بنود.
                      </td>
                    </tr>
                  ) : (
                    lineItems.map((it, idx) => {
                      const lineTotal = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0);
                      return (
                        <tr key={idx}>
                          <td className="px-3 py-2 text-ink-900">{it.description}</td>
                          <td className="px-2 py-2 text-end tabular-nums">{it.quantity}</td>
                          <td className="px-2 py-2 text-end tabular-nums" dir="ltr">
                            {formatSAR(Number(it.unit_price) || 0)}
                          </td>
                          <td className="px-2 py-2 text-end font-semibold text-ink-900 tabular-nums" dir="ltr">
                            {lineTotal.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Notes */}
          {q.notes && (
            <section className="rounded-2xl bg-paper border border-ink-900/5 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-700 mb-2">
                ملاحظات
              </h2>
              <p className="text-sm text-ink-800 whitespace-pre-wrap">{q.notes}</p>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          {/* Quick stats */}
          <section className="rounded-2xl bg-paper border border-ink-900/5 p-5 space-y-3 text-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-700">الملخص</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-linen-50/60 px-3 py-2">
                <p className="text-[11px] text-ink-600 uppercase tracking-wider">قبل الضريبة</p>
                <p className="text-sm font-semibold text-ink-900 tabular-nums" dir="ltr">
                  {formatSAR(Number(q.subtotal) || 0)}
                </p>
              </div>
              <div className="rounded-lg bg-linen-50/60 px-3 py-2">
                <p className="text-[11px] text-ink-600 uppercase tracking-wider">
                  الضريبة ({q.vat_rate || 0}%)
                </p>
                <p className="text-sm font-semibold text-ink-900 tabular-nums" dir="ltr">
                  {formatSAR(Number(q.vat_amount) || 0)}
                </p>
              </div>
              <div className="rounded-lg bg-sage-50 px-3 py-2 col-span-2">
                <p className="text-[11px] text-sage-700 font-semibold uppercase tracking-wider">
                  الإجمالي
                </p>
                <p className="text-lg font-bold text-sage-700 tabular-nums" dir="ltr">
                  {formatSAR(Number(q.total) || 0)}
                </p>
              </div>
            </div>
            {isExpired && (
              <p className="pt-2 mt-2 border-t border-ink-900/10 text-xs text-amber-700 font-medium flex items-center gap-1.5">
                <Calendar className="size-3.5" /> تاريخ الصلاحية انتهى — حدّث الحالة يدوياً.
              </p>
            )}
          </section>

          <section className="rounded-2xl bg-paper border border-ink-900/5 p-5 space-y-3 text-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-700">الروابط</h2>
            {client && (
              <Link
                href={`/admin/clients/${client.id}`}
                className="flex items-center gap-2 text-ink-700 hover:text-sage-700"
              >
                <UserIcon className="size-4 text-ink-500" />
                <span>
                  {client.name}
                  {client.company ? ` (${client.company})` : ''}
                </span>
                <ExternalLink className="size-3 text-ink-400" />
              </Link>
            )}
            {project && (
              <Link
                href={`/admin/projects/${project.id}`}
                className="flex items-center gap-2 text-ink-700 hover:text-sage-700"
              >
                <Briefcase className="size-4 text-ink-500" />
                <span>{project.name}</span>
                <ExternalLink className="size-3 text-ink-400" />
              </Link>
            )}
          </section>

          {/* Generated documents */}
          <section className="rounded-2xl bg-paper border border-ink-900/5 p-5 space-y-3 text-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-700">
              المستندات المولّدة
            </h2>
            {q.generated_pdf_path ? (
              <a
                href={q.generated_pdf_path}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sage-700 hover:text-sage-800 hover:underline"
              >
                <Download className="size-3.5" /> تنزيل ملف PDF
              </a>
            ) : (
              <p className="text-xs text-ink-500">لا يوجد ملف PDF محفوظ.</p>
            )}
            <p className="text-xs text-ink-500 pt-2 border-t border-ink-900/5">
              لتوليد ملف .docx من قالب، استخدم مولّد المستندات لإنشاء عرض جديد مع اختيار قالب.
            </p>
          </section>

          {/* Danger zone */}
          <section className="rounded-2xl border border-red-200/60 bg-red-50/40 p-4">
            <form
              action={async () => {
                'use server';
                await deleteQuote(q.id);
              }}
            >
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 text-xs text-red-700 hover:text-red-800 hover:bg-red-100 rounded-lg py-2 transition-colors"
                onClick={(e) => {
                  if (typeof window !== 'undefined' && !window.confirm(`حذف عرض السعر ${q.number}؟`)) {
                    e.preventDefault();
                  }
                }}
              >
                <Trash2 className="size-3.5" /> حذف عرض السعر
              </button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}
