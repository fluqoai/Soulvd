'use client';

import { useActionState, useState } from 'react';
import { Save, FileUp, Info } from 'lucide-react';
import { Field, TextInput, Textarea, Select } from '@/components/admin/Field';
import { Button } from '@/components/ui/Button';
import { createTemplate, updateTemplate, type TemplateState } from './actions';
import type { Template } from './types';

const initial: TemplateState = { status: 'idle' };

const TYPES = [
  { value: 'invoice', label: 'فاتورة' },
  { value: 'quote',   label: 'عرض سعر' },
  { value: 'other',   label: 'أخرى' },
];

const LANGS = [
  { value: 'ar',   label: 'العربية فقط' },
  { value: 'en',   label: 'الإنجليزية فقط' },
  { value: 'both', label: 'ثنائي اللغة' },
];

const SCHEMA_EXAMPLE = `[
  { "name": "client_name",   "label": "اسم العميل",       "type": "text",       "required": true },
  { "name": "invoice_date",  "label": "تاريخ الفاتورة",   "type": "date",       "required": true },
  { "name": "line_items",    "label": "البنود",           "type": "line_items", "required": true },
  { "name": "total",         "label": "الإجمالي",         "type": "currency",   "required": true, "currency": "SAR" }
]`;

const SCHEMA_TYPES = [
  { value: 'text',       label: 'نص قصير' },
  { value: 'textarea',   label: 'نص طويل' },
  { value: 'number',     label: 'رقم' },
  { value: 'currency',   label: 'مبلغ مالي' },
  { value: 'date',       label: 'تاريخ' },
  { value: 'line_items', label: 'بنود (صفوف متكررة)' },
  { value: 'image',      label: 'صورة' },
];

export function TemplateForm({ template }: { template?: Template }) {
  const isEdit = !!template;
  const action = isEdit ? updateTemplate.bind(null, template!.id) : createTemplate;
  const [state, formAction, isPending] = useActionState<TemplateState, FormData>(action, initial);

  const [schemaText, setSchemaText] = useState(
    template?.field_schema && Array.isArray(template.field_schema) && template.field_schema.length > 0
      ? JSON.stringify(template.field_schema, null, 2)
      : SCHEMA_EXAMPLE
  );
  const [schemaValid, setSchemaValid] = useState(true);

  // Validate JSON as user types
  const handleSchemaChange = (val: string) => {
    setSchemaText(val);
    if (!val.trim()) {
      setSchemaValid(true);
      return;
    }
    try {
      const parsed = JSON.parse(val);
      setSchemaValid(Array.isArray(parsed));
    } catch {
      setSchemaValid(false);
    }
  };

  return (
    <form action={formAction} className="space-y-6 max-w-3xl">
      {/* File path */}
      <div className="rounded-xl border border-ink-900/10 bg-sage-50/40 p-4">
        <div className="flex items-start gap-3">
          <FileUp className="size-5 text-sage-700 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-ink-900 mb-1">ملف القالب</p>
            <p className="text-xs text-ink-600 leading-relaxed mb-3">
              ارفع ملف <code className="font-mono">.docx</code> في Supabase Storage (bucket: <code className="font-mono">templates</code>)، ثم الصق الرابط العام هنا.
              الملف يجب أن يحتوي على متغيرات بصيغة <code className="font-mono">{`{{اسم_الحقل}}`}</code>.
            </p>
            <Field
              label="رابط ملف القالب"
              hint="مثال: https://lyvoiipsmcbffvpkrxhy.supabase.co/storage/v1/object/public/templates/invoice-ar.docx"
              required
            >
              <TextInput
                name="file_path"
                type="url"
                defaultValue={template?.file_path ?? ''}
                placeholder="https://..."
                required
              />
            </Field>
          </div>
        </div>
      </div>

      {/* Basic info */}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="اسم القالب" required>
          <TextInput
            name="name"
            defaultValue={template?.name ?? ''}
            placeholder="فاتورة VAT عربية"
            required
          />
        </Field>
        <div className="grid gap-5 grid-cols-2">
          <Field label="النوع" required>
            <Select name="type" defaultValue={template?.type ?? 'invoice'}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="اللغة" required>
            <Select name="language" defaultValue={template?.language ?? 'ar'}>
              {LANGS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </Select>
          </Field>
        </div>
      </div>

      <Field label="وصف (اختياري)" hint="يظهر في قائمة القوالب فقط">
        <Textarea
          name="description"
          defaultValue={template?.description ?? ''}
          rows={2}
          placeholder="فاتورة رسمية بالعربية مع ضريبة القيمة المضافة، تصميم نظيف، يشمل البنود المتكررة."
        />
      </Field>

      {/* Field schema */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <label htmlFor="field_schema" className="block text-sm font-medium text-ink-800">
            هيكل الحقول (Field schema) <span className="text-red-600">*</span>
          </label>
          <span className={`text-xs font-medium ${schemaValid ? 'text-sage-700' : 'text-red-700'}`}>
            {schemaValid ? '✓ JSON صالح' : '✗ JSON غير صالح'}
          </span>
        </div>
        <p className="text-xs text-ink-600 mb-2 flex items-start gap-1.5">
          <Info className="size-3.5 mt-0.5 shrink-0" />
          <span>
            مصفوفة JSON تربط كل متغير في القالب بنوع بياناته. الأنواع المتاحة:{' '}
            {SCHEMA_TYPES.map((t, i) => (
              <span key={t.value}>
                <code className="font-mono">{t.value}</code>
                <span className="text-ink-500"> ({t.label})</span>
                {i < SCHEMA_TYPES.length - 1 ? '، ' : ''}
              </span>
            ))}
            .
          </span>
        </p>
        <textarea
          id="field_schema"
          name="field_schema"
          value={schemaText}
          onChange={(e) => handleSchemaChange(e.target.value)}
          rows={10}
          required
          dir="ltr"
          className={`w-full rounded-lg border bg-paper px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-sage-600/30 focus:border-sage-600 hover:border-ink-900/25 ${
            schemaValid ? 'border-ink-900/15' : 'border-red-300 bg-red-50/50'
          }`}
        />
        {state.status === 'error' && state.fieldErrors?.field_schema && (
          <p className="text-xs text-red-700 mt-1">{state.fieldErrors.field_schema}</p>
        )}
      </div>

      {/* Error display */}
      {state.status === 'error' && state.error && !state.fieldErrors && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3.5 text-sm text-red-800">
          {state.error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-ink-900/10">
        <Button
          type="submit"
          size="lg"
          disabled={isPending || !schemaValid}
        >
          <Save className="size-4" />
          {isPending
            ? 'جاري الحفظ…'
            : isEdit
              ? 'حفظ التغييرات'
              : 'إنشاء القالب'}
        </Button>
        <a
          href="/admin/templates"
          className="inline-flex items-center justify-center h-11 px-5 rounded-lg text-sm font-medium text-ink-700 hover:bg-sage-50 transition-colors"
        >
          إلغاء
        </a>
      </div>
    </form>
  );
}
