'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const parentTypes = ['client', 'lead', 'project'] as const;

const addSchema = z.object({
  parent_type: z.enum(parentTypes),
  parent_id: z.string().uuid(),
  body: z.string().min(1, 'لا يمكن إضافة ملاحظة فارغة').max(4000),
});

export type NoteParentType = (typeof parentTypes)[number];

export type Note = {
  id: string;
  parent_type: NoteParentType;
  parent_id: string;
  body: string;
  author_id: string | null;
  created_at: string;
  updated_at: string;
  author_name?: string | null;
  author_email?: string | null;
};

export async function addNote(input: { parent_type: NoteParentType; parent_id: string; body: string }) {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'invalid' };
  }
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };

  // Author id comes from the auth user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'unauthorized' };

  const { error } = await supabase.from('notes').insert({
    parent_type: parsed.data.parent_type,
    parent_id: parsed.data.parent_id,
    body: parsed.data.body,
    author_id: user.id,
  });
  if (error) return { ok: false as const, error: error.message };

  // Also log in activity_log for the timeline
  await supabase.from('activity_log').insert({
    user_id: user.id,
    action: 'note_added',
    entity_type: parsed.data.parent_type,
    entity_id: parsed.data.parent_id,
    details: { length: parsed.data.body.length },
  });

  revalidatePath('/admin', 'layout');
  return { ok: true as const };
}

export async function deleteNote(id: string) {
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };

  // Fetch the note first so we can log + revalidate the right place
  const { data: note } = await supabase.from('notes').select('parent_type, parent_id').eq('id', id).maybeSingle();

  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) return { ok: false as const, error: error.message };

  await supabase.from('activity_log').insert({
    action: 'note_deleted',
    entity_type: note?.parent_type ?? 'unknown',
    entity_id: note?.parent_id ?? null,
    details: { note_id: id },
  });

  revalidatePath('/admin', 'layout');
  return { ok: true as const };
}
