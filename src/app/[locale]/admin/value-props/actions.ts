'use server';
import { z } from 'zod';
import { createRowWith, updateRowWith, deleteRowWith, reorderRow } from '@/lib/admin/actions';

const schema = z.object({
  key: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/i),
  icon: z.string().min(1),
  titleAr: z.string().min(1).max(200),
  titleEn: z.string().min(1).max(200),
  descAr: z.string().min(1).max(1000),
  descEn: z.string().min(1).max(1000),
  order_index: z.coerce.number().int(),
  published: z.boolean(),
});

function build(joined: Record<string, { ar: string; en: string }>, fd: FormData) {
  const p = schema.parse({
    key: String(fd.get('key') ?? '').trim(),
    icon: String(fd.get('icon') ?? '').trim(),
    titleAr: joined.title.ar,
    titleEn: joined.title.en,
    descAr: joined.description.ar,
    descEn: joined.description.en,
    order_index: fd.get('order_index'),
    published: String(fd.get('published') ?? '0') === '1',
  });
  return {
    key: p.key.toLowerCase(),
    icon: p.icon,
    title: { ar: p.titleAr, en: p.titleEn },
    description: { ar: p.descAr, en: p.descEn },
    order_index: p.order_index,
    published: p.published,
  };
}

export async function createVP(_: unknown, fd: FormData) { try { return await createRowWith('value_props', ['title', 'description'], build, fd); } catch (e) { return { ok: false as const, error: (e as Error).message }; } }
export async function updateVP(id: string, _: unknown, fd: FormData) { try { return await updateRowWith('value_props', id, ['title', 'description'], build, fd); } catch (e) { return { ok: false as const, error: (e as Error).message }; } }
export async function deleteVP(id: string) { return deleteRowWith('value_props', id); }
export async function reorderVP(id: string, dir: 'up' | 'down') { return reorderRow('value_props', id, dir); }
