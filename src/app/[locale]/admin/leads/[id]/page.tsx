import { notFound } from 'next/navigation';
import { Mail, Phone, Building2, MessageSquare, Globe, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { Link } from '@/i18n/routing';
import {
  LeadStatusForm,
  LeadNoteForm,
  ConvertButton,
} from './LeadActions';

type Params = Promise<{ id: string; locale: string }>;

export default async function LeadDetailPage({ params }: { params: Params }) {
  const { id, locale } = await params;
  const supabase = await createClient();
  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) return <div className="text-red-300">{error.message}</div>;
  if (!lead) notFound();

  const isConverted = lead.metadata?.client_id;
  const noteBlocks = (lead.notes ?? '')
    .split(/\n\n(?=\[)/)
    .map((b: string) => b.trim())
    .filter(Boolean);

  return (
    <div>
      <PageHeader
        title={lead.name}
        backHref="/admin/leads"
        description={`From ${lead.source} · ${new Date(lead.created_at).toLocaleString(locale)}`}
        actions={
          !isConverted ? <ConvertButton id={id} locale={locale as 'ar' | 'en'} /> : (
            <Link
              href={`/${locale}/admin/clients/${isConverted}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sage-500/15 text-sage-200 text-sm hover:bg-sage-500/25"
            >
              View client →
            </Link>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: status + notes timeline */}
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-xl border border-linen-400/10 bg-ink-800/40 p-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-linen-400">Pipeline</h2>
            <LeadStatusForm id={id} initialStatus={lead.status} locale={locale as 'ar' | 'en'} />
          </section>

          {lead.message && (
            <section className="rounded-xl border border-linen-400/10 bg-ink-800/40 p-5 space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-linen-400 flex items-center gap-2">
                <MessageSquare className="size-4" />
                Original message
              </h2>
              <p className="text-linen-100 whitespace-pre-wrap text-sm leading-relaxed">{lead.message}</p>
            </section>
          )}

          <section className="rounded-xl border border-linen-400/10 bg-ink-800/40 p-5 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-linen-400">Notes timeline</h2>
            {noteBlocks.length > 0 ? (
              <ol className="space-y-3">
                {noteBlocks.map((block: string, i: number) => {
                  const m = block.match(/^\[(.*?)\]\s*([\s\S]*)$/);
                  const stamp = m?.[1] ?? '';
                  const body = m?.[2] ?? block;
                  return (
                    <li key={i} className="border-s-2 border-sage-600 ps-4">
                      {stamp && <p className="text-xs text-linen-500 mb-1 flex items-center gap-1"><Calendar className="size-3" /> {stamp}</p>}
                      <p className="text-sm text-linen-100 whitespace-pre-wrap">{body}</p>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-sm text-linen-500 italic">No notes yet.</p>
            )}
            <LeadNoteForm id={id} locale={locale as 'ar' | 'en'} />
          </section>
        </div>

        {/* Right: contact card */}
        <aside className="space-y-3">
          <section className="rounded-xl border border-linen-400/10 bg-ink-800/40 p-5 space-y-3 text-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-linen-400">Contact</h2>
            <Field icon={<Mail className="size-4" />} label="Email" value={lead.email} />
            <Field icon={<Phone className="size-4" />} label="Phone" value={lead.phone} />
            <Field icon={<Building2 className="size-4" />} label="Company" value={lead.company} />
            <Field icon={<Globe className="size-4" />} label="Source" value={lead.source} />
            {isConverted && (
              <p className="pt-2 border-t border-linen-400/10 text-xs text-sage-300">
                ✓ Converted to client
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-linen-500 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-linen-500">{label}</p>
        <p className="text-linen-100 truncate">{value || <span className="text-linen-500">—</span>}</p>
      </div>
    </div>
  );
}
