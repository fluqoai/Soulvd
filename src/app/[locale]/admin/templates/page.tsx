// src/app/[locale]/admin/templates/page.tsx
// Templates list — .docx templates used to generate invoices and quotes.

import { Plus, FileText, Download, Trash2, ExternalLink, FileUp } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { ButtonLink } from '@/components/ui/Button';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { deleteTemplate } from './actions';

type Template = {
  id: string;
  name: string;
  type: 'invoice' | 'quote' | 'other';
  language: 'ar' | 'en' | 'both';
  file_path: string;
  field_schema: unknown;
  description: string | null;
  created_at: string;
};

const TYPE_LABELS: Record<string, string> = {
  invoice: 'فاتورة',
  quote: 'عرض سعر',
  other: 'أخرى',
};

const LANG_LABELS: Record<string, string> = {
  ar: 'العربية',
  en: 'الإنجليزية',
  both: 'ثنائي اللغة',
};

const TYPE_STYLES: Record<string, string> = {
  invoice: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
  quote: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
  other: 'bg-ink-100 text-ink-700 ring-1 ring-ink-900/10',
};

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from('templates')
    .select('id, name, type, language, file_path, field_schema, description, created_at')
    .order('created_at', { ascending: false });

  const templates = (rows ?? []) as unknown as Template[];

  return (
    <div>
      <PageHeader
        title="القوالب"
        description="قوالب المستندات .docx المستخدمة لتوليد الفواتير وعروض الأسعار. ارفع قالبك مع المتغيرات {{…}} مرة واحدة، واستخدمه مرات لا نهائية."
        actions={
          <ButtonLink href="/admin/templates/new" size="sm" variant="primary">
            <Plus className="size-4" /> قالب جديد
          </ButtonLink>
        }
      />

      {templates.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => {
            const fieldCount = Array.isArray(t.field_schema) ? t.field_schema.length : 0;
            return (
              <article
                key={t.id}
                className="rounded-2xl border border-ink-900/10 bg-paper p-5 hover:border-sage-300 hover:shadow-sm transition-all"
              >
                <header className="flex items-start justify-between gap-3 mb-3">
                  <div className="size-10 rounded-lg bg-sage-50 text-sage-700 grid place-items-center shrink-0">
                    <FileText className="size-5" />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLES[t.type]}`}>
                      {TYPE_LABELS[t.type] ?? t.type}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-ink-100 text-ink-700 ring-1 ring-ink-900/10">
                      {LANG_LABELS[t.language] ?? t.language}
                    </span>
                  </div>
                </header>

                <h3 className="text-base font-semibold text-ink-900 mb-1.5 line-clamp-1">
                  {t.name}
                </h3>
                {t.description && (
                  <p className="text-sm text-ink-600 mb-3 line-clamp-2">{t.description}</p>
                )}

                <div className="flex items-center gap-3 text-xs text-ink-500 mb-4">
                  <span className="inline-flex items-center gap-1">
                    <span className="font-semibold text-ink-700 tabular-nums">{fieldCount}</span>
                    <span>حقل</span>
                  </span>
                  <span aria-hidden>·</span>
                  <span className="font-mono text-[11px] truncate max-w-[140px]" title={t.file_path}>
                    {t.file_path.split('/').pop()}
                  </span>
                </div>

                <div className="flex items-center gap-1 pt-3 border-t border-ink-900/10">
                  <Link
                    href={t.file_path}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-ink-700 hover:text-sage-800 hover:bg-sage-50 transition-colors"
                  >
                    <Download className="size-3.5" />
                    <span>تحميل</span>
                  </Link>
                  <Link
                    href={`/admin/templates/${t.id}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-sage-700 hover:text-paper hover:bg-sage-600 transition-colors"
                  >
                    <ExternalLink className="size-3.5" />
                    <span>تعديل</span>
                  </Link>
                  <DeleteButton
                    id={t.id}
                    action={deleteTemplate}
                    confirm={`حذف القالب "${t.name}"؟`}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-ink-900/10 bg-paper p-8 md:p-10 text-center max-w-3xl">
      <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-sage-50 text-sage-700 mb-5">
        <FileUp className="size-7" />
      </div>
      <h2 className="text-xl font-semibold text-ink-900 mb-2">لا توجد قوالب بعد</h2>
      <p className="text-base text-ink-600 max-w-xl mx-auto mb-6">
        محرّك القوالب يولّد ملفات <code className="text-xs bg-linen-100 px-1.5 py-0.5 rounded">.docx</code> و PDF للفواتير وعروض الأسعار.
        ارفع قالباً واحداً واستخدمه مرات لا نهائية.
      </p>

      <ol className="text-start mt-6 space-y-3 text-sm text-ink-700 max-w-xl mx-auto">
        <li className="flex gap-3">
          <span className="size-6 shrink-0 rounded-full bg-sage-600 text-paper grid place-items-center text-xs font-semibold">1</span>
          <span>
            صمّم الفاتورة أو عرض السعر في <strong>Microsoft Word</strong> مع متغيرات
            مثل <code className="text-xs bg-linen-100 px-1.5 py-0.5 rounded font-mono">{`{{client_name}}`}</code>
            {' '}و <code className="text-xs bg-linen-100 px-1.5 py-0.5 rounded font-mono">{`{{total}}`}</code>.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="size-6 shrink-0 rounded-full bg-sage-600 text-paper grid place-items-center text-xs font-semibold">2</span>
          <span>
            اضغط <strong>قالب جديد</strong> أعلاه، ارفع الملف، سمّه، واختر اللغة.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="size-6 shrink-0 rounded-full bg-sage-600 text-paper grid place-items-center text-xs font-semibold">3</span>
          <span>
            عرّف <strong>هيكل الحقول</strong> (field_schema) بصيغة JSON:
            اسم الحقل، التسمية، النوع (<code className="text-xs">text / number / date / currency / line_items</code>).
          </span>
        </li>
        <li className="flex gap-3">
          <span className="size-6 shrink-0 rounded-full bg-sage-600 text-paper grid place-items-center text-xs font-semibold">4</span>
          <span>
            من صفحة <strong>الفواتير</strong> أو <strong>عروض الأسعار</strong>، اختر العميل والقالب — النظام يملأ المتغيرات ويُرجع <code className="text-xs">.docx</code> + PDF.
          </span>
        </li>
      </ol>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <ButtonLink href="/admin/templates/new" size="lg" variant="primary">
          <Plus className="size-4" />
          ارفع أول قالب
        </ButtonLink>
        <Link
          href="/admin/help#templates"
          className="inline-flex items-center gap-1.5 px-4 h-11 rounded-lg border border-ink-900/15 text-ink-700 hover:bg-sage-50 hover:border-sage-300 transition-colors text-sm font-medium"
        >
          اقرأ الدليل الكامل
        </Link>
      </div>
    </div>
  );
}
