'use server';

import { z } from 'zod';
import { createRowWith, updateRowWith, deleteRowWith, reorderRow } from '@/lib/admin/actions';

const schema = z.object({
  value: z.string().min(1, 'مطلوب').max(20),
  labelAr: z.string().min(1).max(200),
  labelEn: z.string().min(1).max(200),
  order_index: z.coerce.number().int(),
  published: z.boolean(),
});

function build(joined: Record<string, { ar: string; en: string }>, fd: FormData) {
  const p = schema.parse({
    value: String(fd.get('value') ?? '').trim(),
    labelAr: joined.label.ar,
    labelEn: joined.label.en,
    order_index: fd.get('order_index'),
    published: String(fd.get('published') ?? '0') === '1',
  });
  return {
    value: p.value,
    label: { ar: p.labelAr, en: p.labelEn },
    order_index: p.order_index,
    published: p.published,
  };
}

export async function createStatAction(_: unknown, fd: FormData) {
  try { return await createRowWith('stats', ['label'], build, fd); }
  catch (e) { return { ok: false as const, error: (e as Error).message }; }
}
export async function updateStatAction(id: string, _: unknown, fd: FormData) {
  try { return await updateRowWith('stats', id, ['label'], build, fd); }
  catch (e) { return { ok: false as const, error: (e as Error).message }; }
}
export async function deleteStatAction(id: string) { return deleteRowWith('stats', id); }
export async function reorderStatAction(id: string, dir: 'up' | 'down') { return reorderRow('stats', id, dir); }
