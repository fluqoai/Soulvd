// src/app/[locale]/admin/templates/types.ts
// Shared TypeScript types for the templates engine.

export type TemplateType = 'invoice' | 'quote' | 'other';
export type TemplateLanguage = 'ar' | 'en' | 'both';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'currency'
  | 'date'
  | 'line_items'
  | 'image';

export interface FieldSchemaEntry {
  name: string;                    // machine name used as {{name}} in the .docx
  label: string;                   // Arabic label shown in the form
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  currency?: string;               // e.g. 'SAR' for type=currency
  help?: string;                   // optional hint shown beneath the field
}

export interface Template {
  id: string;
  name: string;
  type: TemplateType;
  language: TemplateLanguage;
  file_path: string;
  field_schema: FieldSchemaEntry[] | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
