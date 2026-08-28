'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const STATUSES = ['pending', 'in_progress', 'done', 'cancelled'] as const;
const PRIORITIES = ['low', 'medium', 'high'] as const;
const LINK_TYPES = ['client', 'lead', 'project'] as const;

const taskSchema = z.object({
  title: z.string().min(1, 'العنوان مطلوب').max(200),
  description: z.string().max(4000).optional().default(''),
  due_date: z.string().optional().default(''), // ISO yyyy-mm-dd
  priority: z.enum(PRIORITIES).default('medium'),
  status: z.enum(STATUSES).default('pending'),
  assigned_to: z.string().uuid().optional().or(z.literal('')),
  link_type: z.enum(LINK_TYPES).optional().or(z.literal('')),
  link_id: z.string().uuid().optional().or(z.literal('')),
});

export type TaskStatus = (typeof STATUSES)[number];
export type TaskPriority = (typeof PRIORITIES)[number];
export type TaskLinkType = (typeof LINK_TYPES)[number];

export type Task = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_to: string | null;
  created_by: string | null;
  link_type: TaskLinkType | null;
  link_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // joined/display fields
  assignee_name?: string | null;
  assignee_email?: string | null;
};

function normalize(input: z.infer<typeof taskSchema>) {
  return {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    due_date: input.due_date || null,
    priority: input.priority,
    status: input.status,
    assigned_to: input.assigned_to || null,
    link_type: input.link_type || null,
    link_id: input.link_id || null,
  };
}

export async function createTask(input: z.infer<typeof taskSchema>) {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'invalid' };
  }
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'unauthorized' };

  const payload = { ...normalize(parsed.data), created_by: user.id };

  const { error } = await supabase.from('tasks').insert(payload);
  if (error) return { ok: false as const, error: error.message };

  await supabase.from('activity_log').insert({
    user_id: user.id,
    action: 'task_created',
    entity_type: 'task',
    details: { title: payload.title, priority: payload.priority },
  });

  revalidatePath('/admin', 'layout');
  return { ok: true as const };
}

export async function updateTask(id: string, input: z.infer<typeof taskSchema>) {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'invalid' };
  }
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };

  const payload = normalize(parsed.data);
  const { error } = await supabase.from('tasks').update(payload).eq('id', id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath('/admin', 'layout');
  return { ok: true as const };
}

/** Quick status change (used by inline toggle). */
export async function setTaskStatus(id: string, status: string) {
  const parsed = z.enum(STATUSES).safeParse(status);
  if (!parsed.success) return { ok: false as const, error: 'invalid_status' };
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };
  const { error } = await supabase.from('tasks').update({ status: parsed.data }).eq('id', id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin', 'layout');
  return { ok: true as const };
}

export async function deleteTask(id: string) {
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin', 'layout');
  return { ok: true as const };
}
