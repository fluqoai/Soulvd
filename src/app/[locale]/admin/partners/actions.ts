'use server';
import { z } from 'zod';
import { createRowWith, updateRowWith, deleteRowWith, reorderRow } from '@/lib/admin/actions';

const schema = z.object({
  name: z.string().min(1).max(200),
  logo_url: z.string().max(1000).optional().default(''),
  url: z.string().max(500).optional().default(''),
  order_index: z.coerce.number().int(),
  published: z.boolean(),
});

function build(_: Record<string, { ar: string; en: string }>, fd: FormData) {
  const p = schema.parse({
    name: String(fd.get('name') ?? '').trim(),
    logo_url: String(fd.get('logo_url') ?? '').trim(),
    url: String(fd.get('url') ?? '').trim(),
    order_index: fd.get('order_index'),
    published: String(fd.get('published') ?? '0') === '1',
  });
  return {
    name: p.name,
    logo_url: p.logo_url || null,
    url: p.url || null,
    order_index: p.order_index,
    published: p.published,
  };
}

export async function createPartner(_: unknown, fd: FormData) { try { return await createRowWith('partners', [], build, fd); } catch (e) { return { ok: false as const, error: (e as Error).message }; } }
export async function updatePartner(id: string, _: unknown, fd: FormData) { try { return await updateRowWith('partners', id, [], build, fd); } catch (e) { return { ok: false as const, error: (e as Error).message }; } }
export async function deletePartner(id: string) { return deleteRowWith('partners', id); }
export async function reorderPartner(id: string, dir: 'up' | 'down') { return reorderRow('partners', id, dir); }
