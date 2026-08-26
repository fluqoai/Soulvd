import { notFound } from 'next/navigation';
import { Mail, Phone, Building2, MessageSquare, Globe, Calendar, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/PageHeader';
import Link from 'next/link';
import {
  LeadStatusForm,
  LeadNoteForm,
  ConvertButton,
} from './LeadActions';

type Params = Promise<{ id: string; locale: string }>;

const STATUS_LABELS: Record<string, string> = {
  new:        'جديد',
  contacted:  'تم التواصل',
  qualified:  'مؤهل',
  closed:     'مغلق',
  lost:       'خاسر',
};

const STATUS_STYLES: Record<string, string> = {
  new:        'bg-sage-100 text-sage-800 ring-1 ring-sage-200',
  contacted:  'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
  qualified:  'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
  closed:     'bg-ink-100 text-ink-700 ring-1 ring-ink-900/10',
  lost:       'bg-red-100 text-red-800 ring-1 ring-red-200',
};

export default async function LeadDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) return <div className="text-red-700 bg-red-50 border border-red-200 p-4 rounded-lg">{error.message}</div>;
  if (!lead) notFound();

  const isConverted = lead.metadata?.client_id;
  const noteBlocks = (lead.notes ?? '')
    .split(/\n\n(?=\[)/)
    .map((b: string) => b.trim())
    .filter(Boolean);

  const statusStyle = STATUS_STYLES[lead.status] ?? STATUS_STYLES.new;

  return (
    <div>
      <PageHeader
        title={lead.name}
        backHref="/admin/leads"
        description={`من ${lead.source} · ${new Date(lead.created_at).toLocaleString('ar-SA')}`}
        actions={
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusStyle}`}>
              {STATUS_LABELS[lead.status] ?? lead.status}
            </span>
            {!isConverted ? (
              <ConvertButton id={id} />
            ) : (
              <Link
                href={`/admin/clients/${isConverted}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sage-600 text-paper text-sm font-medium hover:bg-sage-700"
              >
                <span>عرض العميل</span>
                <ExternalLink className="size-3.5" />
              </Link>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: status + notes timeline */}
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-xl border border-ink-900/10 bg-paper p-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-700">الحالة</h2>
            <LeadStatusForm id={id} initialStatus={lead.status} />
          </section>

          {lead.message && (
            <section className="rounded-xl border border-ink-900/10 bg-paper p-5 space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-700 flex items-center gap-2">
                <MessageSquare className="size-4 text-sage-700" />
                الرسالة الأصلية
              </h2>
              <p className="text-ink-900 whitespace-pre-wrap text-sm leading-relaxed">{lead.message}</p>
            </section>
          )}

          <section className="rounded-xl border border-ink-900/10 bg-paper p-5 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-700">سجل الملاحظات</h2>
            {noteBlocks.length > 0 ? (
              <ol className="space-y-3">
                {noteBlocks.map((block: string, i: number) => {
                  const m = block.match(/^\[(.*?)\]\s*([\s\S]*)$/);
                  const stamp = m?.[1] ?? '';
                  const body = m?.[2] ?? block;
                  return (
                    <li key={i} className="border-s-2 border-sage-400 ps-4">
                      {stamp && (
                        <p className="text-xs text-ink-600 mb-1 flex items-center gap-1">
                          <Calendar className="size-3" /> {stamp}
                        </p>
                      )}
                      <p className="text-sm text-ink-900 whitespace-pre-wrap">{body}</p>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-sm text-ink-500 italic">لا توجد ملاحظات بعد.</p>
            )}
            <LeadNoteForm id={id} />
          </section>
        </div>

        {/* Right: contact card */}
        <aside className="space-y-3">
          <section className="rounded-xl border border-ink-900/10 bg-paper p-5 space-y-3 text-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-700">بيانات التواصل</h2>
            <Field icon={<Mail className="size-4" />} label="البريد" value={lead.email} href={lead.email ? `mailto:${lead.email}` : undefined} />
            <Field icon={<Phone className="size-4" />} label="الهاتف" value={lead.phone} href={lead.phone ? `tel:${lead.phone}` : undefined} />
            <Field icon={<Building2 className="size-4" />} label="الشركة" value={lead.company} />
            <Field icon={<Globe className="size-4" />} label="المصدر" value={lead.source} />
            {isConverted && (
              <p className="pt-3 mt-2 border-t border-ink-900/10 text-xs text-sage-700 font-medium flex items-center gap-1.5">
                <span>✓</span> تم التحويل إلى عميل
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Field({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string | null | undefined; href?: string }) {
  const inner = (
    <>
      <span className="text-ink-500 mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-ink-600 font-medium">{label}</p>
        <p className="text-ink-900 truncate">{value || <span className="text-ink-400">—</span>}</p>
      </div>
    </>
  );
  if (href && value) {
    return (
      <a href={href} className="flex items-start gap-2.5 hover:bg-sage-50 -mx-2 px-2 py-1 rounded transition-colors">
        {inner}
      </a>
    );
  }
  return <div className="flex items-start gap-2.5">{inner}</div>;
}
