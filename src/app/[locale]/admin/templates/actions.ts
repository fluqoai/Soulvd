'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const templateSchema = z.object({
  name: z.string().min(1, 'الاسم مطلوب').max(200),
  type: z.enum(['invoice', 'quote', 'other']),
  language: z.enum(['ar', 'en', 'both']),
  description: z.string().max(2000).optional().or(z.literal('')),
  field_schema: z.string().refine(
    (val) => {
      try { JSON.parse(val); return true; } catch { return false; }
    },
    { message: 'يجب أن يكون هيكل الحقول JSON صالح' }
  ),
  file_path: z.string().min(1, 'مسار الملف مطلوب'),
});

export type TemplateState = {
  status: 'idle' | 'error' | 'success';
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createTemplate(
  _prev: TemplateState,
  formData: FormData
): Promise<TemplateState> {
  const raw = {
    name: String(formData.get('name') ?? '').trim(),
    type: String(formData.get('type') ?? ''),
    language: String(formData.get('language') ?? ''),
    description: String(formData.get('description') ?? '').trim(),
    field_schema: String(formData.get('field_schema') ?? '[]'),
    file_path: String(formData.get('file_path') ?? '').trim(),
  };

  const parsed = templateSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { status: 'error', error: 'بيانات غير صالحة', fieldErrors };
  }

  // Validate field_schema is an array
  let fieldSchemaArr: unknown;
  try {
    fieldSchemaArr = JSON.parse(parsed.data.field_schema);
    if (!Array.isArray(fieldSchemaArr)) {
      return { status: 'error', fieldErrors: { field_schema: 'يجب أن يكون هيكل الحقول مصفوفة JSON' } };
    }
  } catch {
    return { status: 'error', fieldErrors: { field_schema: 'JSON غير صالح' } };
  }

  const supabase = await createClient();
  if (!supabase) return { status: 'error', error: 'غير مصرح' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: 'error', error: 'غير مصرح' };

  const { data, error } = await supabase
    .from('templates')
    .insert({
      name: parsed.data.name,
      type: parsed.data.type,
      language: parsed.data.language,
      description: parsed.data.description || null,
      field_schema: fieldSchemaArr,
      file_path: parsed.data.file_path,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (error) return { status: 'error', error: error.message };

  await supabase.from('activity_log').insert({
    actor_id: user.id,
    action: 'created',
    entity_type: 'template',
    entity_id: data.id,
    details: { name: parsed.data.name, type: parsed.data.type },
  });

  revalidatePath('/admin/templates', 'layout');
  redirect('/admin/templates');
  return { status: 'success' };
}

export async function updateTemplate(
  id: string,
  _prev: TemplateState,
  formData: FormData
): Promise<TemplateState> {
  const raw = {
    name: String(formData.get('name') ?? '').trim(),
    type: String(formData.get('type') ?? ''),
    language: String(formData.get('language') ?? ''),
    description: String(formData.get('description') ?? '').trim(),
    field_schema: String(formData.get('field_schema') ?? '[]'),
    file_path: String(formData.get('file_path') ?? '').trim(),
  };

  const parsed = templateSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { status: 'error', error: 'بيانات غير صالحة', fieldErrors };
  }

  let fieldSchemaArr: unknown;
  try {
    fieldSchemaArr = JSON.parse(parsed.data.field_schema);
    if (!Array.isArray(fieldSchemaArr)) {
      return { status: 'error', fieldErrors: { field_schema: 'يجب أن يكون هيكل الحقول مصفوفة JSON' } };
    }
  } catch {
    return { status: 'error', fieldErrors: { field_schema: 'JSON غير صالح' } };
  }

  const supabase = await createClient();
  if (!supabase) return { status: 'error', error: 'غير مصرح' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: 'error', error: 'غير مصرح' };

  const { error } = await supabase
    .from('templates')
    .update({
      name: parsed.data.name,
      type: parsed.data.type,
      language: parsed.data.language,
      description: parsed.data.description || null,
      field_schema: fieldSchemaArr,
      file_path: parsed.data.file_path,
    })
    .eq('id', id);

  if (error) return { status: 'error', error: error.message };

  await supabase.from('activity_log').insert({
    actor_id: user.id,
    action: 'updated',
    entity_type: 'template',
    entity_id: id,
    details: { name: parsed.data.name },
  });

  revalidatePath('/admin/templates', 'layout');
  revalidatePath(`/admin/templates/${id}`, 'layout');
  redirect('/admin/templates');
  return { status: 'success' };
}

export async function deleteTemplate(id: string) {
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'غير مصرح' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'غير مصرح' };

  // Get the file_path first so we can delete from storage too
  const { data: template } = await supabase
    .from('templates')
    .select('file_path, name')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabase.from('templates').delete().eq('id', id);
  if (error) return { ok: false as const, error: error.message };

  // Best-effort: remove the .docx from storage
  if (template?.file_path) {
    const path = template.file_path.split('/').slice(-1)[0];
    if (path) {
      await supabase.storage.from('templates').remove([path]);
    }
  }

  await supabase.from('activity_log').insert({
    actor_id: user.id,
    action: 'deleted',
    entity_type: 'template',
    entity_id: id,
    details: { name: template?.name ?? 'unknown' },
  });

  revalidatePath('/admin/templates', 'layout');
  return { ok: true as const };
}
