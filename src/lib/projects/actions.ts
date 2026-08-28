'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const STATUSES = ['planning', 'in_progress', 'on_hold', 'delivered', 'cancelled'] as const;
const statusSchema = z.enum(STATUSES);

const projectSchema = z.object({
  client_id: z.string().uuid('معرّف العميل غير صالح'),
  name: z.string().min(1, 'الاسم مطلوب').max(200),
  description: z.string().max(4000).optional().default(''),
  status: statusSchema.default('planning'),
  start_date: z.string().optional().default(''),
  due_date: z.string().optional().default(''),
  budget_hours: z.string().optional().default(''),     // numeric as string, validated below
  budget_amount: z.string().optional().default(''),    // numeric as string
  currency: z.string().max(8).default('SAR'),
  owner_id: z.string().uuid().optional().or(z.literal('')),
});

export type ProjectStatus = (typeof STATUSES)[number];

export type Project = {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  start_date: string | null;
  due_date: string | null;
  budget_hours: number | null;
  budget_amount: number | null;
  currency: string;
  owner_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joined
  client_name?: string | null;
  client_company?: string | null;
  owner_name?: string | null;
  owner_email?: string | null;
  total_hours?: number | null;
};

function normalize(input: z.infer<typeof projectSchema>) {
  return {
    client_id: input.client_id,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    status: input.status,
    start_date: input.start_date || null,
    due_date: input.due_date || null,
    budget_hours: input.budget_hours === '' ? null : Number(input.budget_hours),
    budget_amount: input.budget_amount === '' ? null : Number(input.budget_amount),
    currency: input.currency || 'SAR',
    owner_id: input.owner_id || null,
  };
}

export async function createProject(input: z.infer<typeof projectSchema>) {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'invalid' };
  }
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'unauthorized' };

  const payload = { ...normalize(parsed.data), created_by: user.id };

  const { data, error } = await supabase.from('projects').insert(payload).select('id').single();
  if (error) return { ok: false as const, error: error.message };

  await supabase.from('activity_log').insert({
    user_id: user.id,
    action: 'project_created',
    entity_type: 'project',
    entity_id: data.id,
    details: { name: payload.name, client_id: payload.client_id },
  });

  revalidatePath('/admin', 'layout');
  return { ok: true as const, id: data.id };
}

export async function updateProject(id: string, input: z.infer<typeof projectSchema>) {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'invalid' };
  }
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };

  const payload = normalize(parsed.data);
  const { error } = await supabase.from('projects').update(payload).eq('id', id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath('/admin', 'layout');
  return { ok: true as const };
}

export async function setProjectStatus(id: string, status: string) {
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return { ok: false as const, error: 'invalid_status' };
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };
  const { error } = await supabase.from('projects').update({ status: parsed.data }).eq('id', id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin', 'layout');
  return { ok: true as const };
}

export async function deleteProject(id: string) {
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin', 'layout');
  return { ok: true as const };
}
