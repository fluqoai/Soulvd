// src/app/[locale]/admin/templates/new/page.tsx
// Add a new .docx template.

import { PageHeader } from '@/components/admin/PageHeader';
import { TemplateForm } from '../TemplateForm';

export const metadata = { title: 'قالب جديد · لوحة الإدارة' };

export default function NewTemplatePage() {
  return (
    <div>
      <PageHeader
        title="قالب جديد"
        backHref="/admin/templates"
        description="ارفع ملف .docx وعرّف هيكل الحقول. يمكنك تعديل القالب بعد حفظه."
      />
      <TemplateForm />
    </div>
  );
}
