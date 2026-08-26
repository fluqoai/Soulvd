// src/app/[locale]/admin/templates/[id]/page.tsx
// Edit an existing .docx template.

import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/admin/PageHeader';
import { TemplateForm } from '../TemplateForm';
import type { Template } from '../types';

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">
        {error.message}
      </div>
    );
  }
  if (!data) notFound();

  const template = data as unknown as Template;

  return (
    <div>
      <PageHeader
        title="تعديل القالب"
        backHref="/admin/templates"
        description={`تعديل "${template.name}". احفظ التغييرات أو ارجع للقائمة.`}
      />
      <TemplateForm template={template} />
    </div>
  );
}
