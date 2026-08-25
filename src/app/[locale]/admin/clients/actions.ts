'use server';

import { z } from 'zod';
import { createRowWith, updateRowWith, deleteRowWith } from '@/lib/admin/actions';

const schema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email('Invalid email').max(200).optional().or(z.literal('')),
  phone: z.string().max(50).optional().default(''),
  company: z.string().max(200).optional().default(''),
  vat_number: z.string().max(50).optional().default(''),
  address: z.string().max(500).optional().default(''),
  notes: z.string().max(2000).optional().default(''),
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
  });
  return {
    name: p.name,
    email: p.email || null,
    phone: p.phone || null,
    company: p.company || null,
    vat_number: p.vat_number || null,
    address: p.address || null,
    notes: p.notes || null,
  };
}

export async function createClientAction(_: unknown, fd: FormData) { try { return await createRowWith('clients', [], build, fd); } catch (e) { return { ok: false as const, error: (e as Error).message }; } }
export async function updateClientAction(id: string, _: unknown, fd: FormData) { try { return await updateRowWith('clients', id, [], build, fd); } catch (e) { return { ok: false as const, error: (e as Error).message }; } }
export async function deleteClientAction(id: string) { return deleteRowWith('clients', id); }
