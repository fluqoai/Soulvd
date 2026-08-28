'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const timeEntrySchema = z.object({
  project_id: z.string().uuid('معرّف المشروع غير صالح'),
  entry_date: z.string().optional().default(''),  // yyyy-mm-dd; empty => today
  hours: z.string().min(1, 'الساعات مطلوبة'),
  description: z.string().max(2000).optional().default(''),
  billable: z.string().optional(),  // checkbox -> 'on' when checked
  hourly_rate: z.string().optional().default(''),
});

export type TimeEntry = {
  id: string;
  project_id: string;
  user_id: string;
  entry_date: string;
  hours: number;
  description: string | null;
  billable: boolean;
  hourly_rate: number | null;
  created_at: string;
  updated_at: string;
  // joined
  user_name?: string | null;
  user_email?: string | null;
};

function normalize(input: z.infer<typeof timeEntrySchema>) {
  const hours = Number(input.hours);
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
    return { error: 'عدد الساعات يجب أن يكون بين 0 و 24' as const };
  }
  return {
    project_id: input.project_id,
    entry_date: input.entry_date || new Date().toISOString().slice(0, 10),
    hours,
    description: input.description?.trim() || null,
    billable: input.billable === 'on',
    hourly_rate: input.hourly_rate === '' ? null : Number(input.hourly_rate),
  };
}

export async function createTimeEntry(input: z.infer<typeof timeEntrySchema>) {
  const parsed = timeEntrySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'invalid' };
  }
  const payload = normalize(parsed.data);
  if ('error' in payload) return { ok: false as const, error: payload.error };

  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'unauthorized' };

  const { data, error } = await supabase
    .from('time_entries')
    .insert({ ...payload, user_id: user.id })
    .select('id')
    .single();
  if (error) return { ok: false as const, error: error.message };

  await supabase.from('activity_log').insert({
    user_id: user.id,
    action: 'time_logged',
    entity_type: 'time_entry',
    entity_id: data.id,
    details: { project_id: payload.project_id, hours: payload.hours },
  });

  revalidatePath('/admin', 'layout');
  return { ok: true as const, id: data.id };
}

export async function updateTimeEntry(id: string, input: z.infer<typeof timeEntrySchema>) {
  const parsed = timeEntrySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'invalid' };
  }
  const payload = normalize(parsed.data);
  if ('error' in payload) return { ok: false as const, error: payload.error };

  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };

  const { error } = await supabase.from('time_entries').update(payload).eq('id', id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath('/admin', 'layout');
  return { ok: true as const };
}

export async function deleteTimeEntry(id: string) {
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };
  const { error } = await supabase.from('time_entries').delete().eq('id', id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin', 'layout');
  return { ok: true as const };
}
