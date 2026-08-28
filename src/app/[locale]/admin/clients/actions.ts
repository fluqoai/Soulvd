'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createRowWith, updateRowWith, deleteRowWith } from '@/lib/admin/actions';
import { createClient } from '@/lib/supabase/server';

const STATUSES = ['active', 'inactive', 'archived'] as const;
const statusSchema = z.enum(STATUSES);

const schema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email('Invalid email').max(200).optional().or(z.literal('')),
  phone: z.string().max(50).optional().default(''),
  company: z.string().max(200).optional().default(''),
  vat_number: z.string().max(50).optional().default(''),
  address: z.string().max(500).optional().default(''),
  notes: z.string().max(2000).optional().default(''),
  status: statusSchema.default('active'),
});

function build(_: Record<string, { ar: string; en: string }>, fd: FormData) {
  const p = schema.parse({
    name: String(fd.get('name') ?? '').trim(),
    email: String(fd.get('email') ?? '').trim(),
    phone: String(fd.get('phone') ?? '').trim(),
    company: String(fd.get('company') ?? '').trim(),
    vat_number: String(fd.get('vat_number') ?? '').trim(),
    address: String(fd.get('address') ?? '').trim(),
    notes: String(fd.get('notes') ?? '').trim(),
    status: String(fd.get('status') ?? 'active'),
  });
  return {
    name: p.name,
    email: p.email || null,
    phone: p.phone || null,
    company: p.company || null,
    vat_number: p.vat_number || null,
    address: p.address || null,
    notes: p.notes || null,
    status: p.status,
  };
}

export async function createClientAction(_: unknown, fd: FormData) { try { return await createRowWith('clients', [], build, fd); } catch (e) { return { ok: false as const, error: (e as Error).message }; } }
export async function updateClientAction(id: string, _: unknown, fd: FormData) { try { return await updateRowWith('clients', id, [], build, fd); } catch (e) { return { ok: false as const, error: (e as Error).message }; } }
export async function deleteClientAction(id: string) { return deleteRowWith('clients', id); }

/**
 * Quick status change from the clients list (no form submit).
 * Used by the inline status pill on the list page.
 */
export async function setClientStatus(id: string, status: string) {
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return { ok: false as const, error: 'invalid_status' };
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, error: 'unauthorized' };
  const { error } = await supabase.from('clients').update({ status: parsed.data }).eq('id', id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin', 'layout');
  return { ok: true as const };
}
