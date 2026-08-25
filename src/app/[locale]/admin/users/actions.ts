'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const roleSchema = z.enum(['owner', 'editor']);

export async function updateUserRole(userId: string, role: string) {
  const parsed = roleSchema.safeParse(role);
  if (!parsed.success) return { ok: false as const, error: 'invalid_role' };
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };

  // Check the acting user is owner (defense in depth — admin/layout already gates this)
  const { data: { user: acting } } = await supabase.auth.getUser();
  if (!acting) return { ok: false as const, error: 'unauthorized' };
  const { data: actingRow } = await supabase.from('users').select('role').eq('id', acting.id).maybeSingle();
  if (actingRow?.role !== 'owner') return { ok: false as const, error: 'only_owner_can_promote' };

  const { error } = await supabase.from('users').update({ role: parsed.data }).eq('id', userId);
  if (error) return { ok: false as const, error: error.message };

  await supabase.from('activity_log').insert({
    user_id: acting.id,
    action: 'role_changed',
    entity_type: 'user',
    entity_id: userId,
    details: { to: parsed.data },
  });

  revalidatePath('/admin', 'layout');
  return { ok: true as const };
}
