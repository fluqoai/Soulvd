// src/app/[locale]/admin/case-studies/page.tsx
// Case studies are managed via the Supabase dashboard (Table Editor → case_studies).
// This page is a guide to the table's fields so the admin team knows what to fill in.

import { BookOpen, Database, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';

export default function CaseStudiesPage() {
  return (
    <div>
      <PageHeader
        title="دراسات الحالة"
        description="قصص نجاح العملاء — تُدار حالياً من Supabase مباشرة. قريباً ستتاح واجهة إدارة كاملة هنا."
      />

      <div className="rounded-2xl border-2 border-dashed border-ink-900/10 bg-paper p-8 md:p-10 max-w-3xl">
        <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-sage-50 text-sage-700 mb-5">
          <BookOpen className="size-7" aria-hidden />
        </div>
        <h2 className="text-xl font-semibold text-ink-900 mb-2">الإدارة عبر Supabase</h2>
        <p className="text-base text-ink-600 max-w-xl mb-6">
          جدول <code className="text-xs bg-linen-100 px-1.5 py-0.5 rounded font-mono">case_studies</code> أكثر تعقيداً من الجداول الأخرى (يرتبط بقطاع، صورة غلاف، نتائج مقترنة). أبقيناه في Supabase حتى نبني واجهة كاملة.
        </p>

        <div className="space-y-3 mt-6 text-sm">
          <div className="flex items-start gap-2.5">
            <Database className="size-4 text-sage-700 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-ink-800 mb-1">كيف تضيف دراسة حالة الآن</p>
              <ol className="text-ink-700 space-y-1.5 list-decimal list-inside">
                <li>افتح <a className="text-sage-700 hover:underline font-medium" href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">supabase.com/dashboard</a></li>
                <li>اختر مشروع <code className="text-xs font-mono">lyvoiipsmcbffvpkrxhy</code></li>
                <li>Table Editor → <code className="text-xs font-mono">case_studies</code></li>
                <li>اضغط <strong>Insert row</strong> واملأ الحقول أدناه</li>
                <li>تأكد من <code className="text-xs font-mono">published = true</code> ليتم عرضها</li>
              </ol>
            </div>
          </div>

          <div className="flex items-start gap-2.5 pt-4 border-t border-ink-900/10">
            <Sparkles className="size-4 text-sage-700 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-ink-800 mb-1">الحقول المتوقعة</p>
              <ul className="text-ink-700 space-y-1 list-disc list-inside">
                <li><code className="text-xs font-mono">client_name</code> (نص) — اسم العميل</li>
                <li><code className="text-xs font-mono">industry</code> (نص) — القطاع</li>
                <li><code className="text-xs font-mono">result_metric</code> (نص) — النتيجة الرئيسية (مثل: +40% طلبات)</li>
                <li><code className="text-xs font-mono">challenge_ar / challenge_en</code> (نص) — التحدي</li>
                <li><code className="text-xs font-mono">solution_ar / solution_en</code> (نص) — الحل</li>
                <li><code className="text-xs font-mono">outcome_ar / outcome_en</code> (نص) — النتيجة</li>
                <li><code className="text-xs font-mono">logo_url</code> (نص) — شعار العميل (اختياري)</li>
                <li><code className="text-xs font-mono">order_index</code> (رقم) — ترتيب العرض</li>
                <li><code className="text-xs font-mono">published</code> (boolean) — منشور؟</li>
              </ul>
            </div>
          </div>
        </div>

        <p className="mt-6 text-xs text-ink-500">
          💡 الدليل الكامل في <a href="/admin/help#case_studies" className="text-sage-700 hover:underline">دليل الجداول</a>.
        </p>
      </div>
    </div>
  );
}
