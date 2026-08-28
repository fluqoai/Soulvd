'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const STATUSES = ['pending', 'done', 'cancelled'] as const;
const statusSchema = z.enum(STATUSES);

const milestoneSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().min(1, 'الاسم مطلوب').max(200),
  description: z.string().max(2000).optional().default(''),
  due_date: z.string().optional().default(''),
  status: statusSchema.default('pending'),
  order_index: z.string().optional().default('0'),
});

export type MilestoneStatus = (typeof STATUSES)[number];

export type Milestone = {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  due_date: string | null;
  status: MilestoneStatus;
  order_index: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

function normalize(input: z.infer<typeof milestoneSchema>) {
  return {
    project_id: input.project_id,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    due_date: input.due_date || null,
    status: input.status,
    order_index: Number(input.order_index) || 0,
  };
}

export async function createMilestone(input: z.infer<typeof milestoneSchema>) {
  const parsed = milestoneSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'invalid' };
  }
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };

  const payload = normalize(parsed.data);
  const { data, error } = await supabase.from('milestones').insert(payload).select('id').single();
  if (error) return { ok: false as const, error: error.message };

  revalidatePath('/admin', 'layout');
  return { ok: true as const, id: data.id };
}

export async function updateMilestone(id: string, input: z.infer<typeof milestoneSchema>) {
  const parsed = milestoneSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'invalid' };
  }
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };

  const payload = normalize(parsed.data);
  const { error } = await supabase.from('milestones').update(payload).eq('id', id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath('/admin', 'layout');
  return { ok: true as const };
}

export async function setMilestoneStatus(id: string, status: string) {
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return { ok: false as const, error: 'invalid_status' };
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };
  const { error } = await supabase.from('milestones').update({ status: parsed.data }).eq('id', id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin', 'layout');
  return { ok: true as const };
}

export async function deleteMilestone(id: string) {
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };
  const { error } = await supabase.from('milestones').delete().eq('id', id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin', 'layout');
  return { ok: true as const };
}
