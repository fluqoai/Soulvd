'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const STATUSES = ['new', 'contacted', 'qualified', 'closed', 'lost'] as const;
const statusSchema = z.enum(STATUSES);

export async function updateLeadStatus(id: string, status: string) {
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return { ok: false as const, error: 'invalid_status' };
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };
  const { error } = await supabase.from('leads').update({ status: parsed.data }).eq('id', id);
  if (error) return { ok: false as const, error: error.message };
  await supabase.from('activity_log').insert({
    action: 'status_changed',
    entity_type: 'lead',
    entity_id: id,
    details: { from: null, to: parsed.data },
  });
  revalidatePath('/admin', 'layout');
  return { ok: true as const };
}

export async function addLeadNote(id: string, note: string) {
  const trimmed = note.trim();
  if (!trimmed) return { ok: false as const, error: 'empty' };
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };
  // Append to notes (newline-separated timeline)
  const { data: current, error: fetchErr } = await supabase
    .from('leads')
    .select('notes')
    .eq('id', id)
    .maybeSingle();
  if (fetchErr) return { ok: false as const, error: fetchErr.message };
  const existing = (current?.notes ?? '').trim();
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const updated = existing ? `${existing}\n\n[${stamp}]\n${trimmed}` : `[${stamp}]\n${trimmed}`;
  const { error } = await supabase.from('leads').update({ notes: updated }).eq('id', id);
  if (error) return { ok: false as const, error: error.message };
  await supabase.from('activity_log').insert({
    action: 'note_added',
    entity_type: 'lead',
    entity_id: id,
    details: { length: trimmed.length },
  });
  revalidatePath('/admin', 'layout');
  return { ok: true as const };
}

export async function deleteLead(id: string) {
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };
  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin', 'layout');
  return { ok: true as const };
}

/**
 * Convert a lead into a client. Creates a clients row from the lead
 * info, links it back, and marks the lead as 'closed'.
 */
export async function convertLeadToClient(leadId: string) {
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };
  const { data: lead, error: leadErr } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .maybeSingle();
  if (leadErr) return { ok: false as const, error: leadErr.message };
  if (!lead) return { ok: false as const, error: 'not_found' };

  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .insert({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
    })
    .select('id')
    .single();
  if (clientErr) return { ok: false as const, error: clientErr.message };

  await supabase
    .from('leads')
    .update({ status: 'closed', metadata: { ...(lead.metadata ?? {}), client_id: client.id } })
    .eq('id', leadId);

  await supabase.from('activity_log').insert({
    action: 'converted_to_client',
    entity_type: 'lead',
    entity_id: leadId,
    details: { client_id: client.id },
  });

  revalidatePath('/admin', 'layout');
  return { ok: true as const, clientId: client.id };
}
