'use server';
import { z } from 'zod';
import { createRowWith, updateRowWith, deleteRowWith, reorderRow } from '@/lib/admin/actions';

const schema = z.object({
  client_name: z.string().min(1).max(200),
  client_role: z.string().max(200).optional().default(''),
  client_company: z.string().max(200).optional().default(''),
  quoteAr: z.string().min(1).max(2000),
  quoteEn: z.string().min(1).max(2000),
  avatar_url: z.string().max(1000).optional().default(''),
  order_index: z.coerce.number().int(),
  published: z.boolean(),
});

function build(joined: Record<string, { ar: string; en: string }>, fd: FormData) {
  const p = schema.parse({
    client_name: String(fd.get('client_name') ?? '').trim(),
    client_role: String(fd.get('client_role') ?? '').trim(),
    client_company: String(fd.get('client_company') ?? '').trim(),
    quoteAr: joined.quote.ar,
    quoteEn: joined.quote.en,
    avatar_url: String(fd.get('avatar_url') ?? '').trim(),
    order_index: fd.get('order_index'),
    published: String(fd.get('published') ?? '0') === '1',
  });
  return {
    client_name: p.client_name,
    client_role: p.client_role || null,
    client_company: p.client_company || null,
    quote: { ar: p.quoteAr, en: p.quoteEn },
    avatar_url: p.avatar_url || null,
    order_index: p.order_index,
    published: p.published,
  };
}

export async function createTestimonial(_: unknown, fd: FormData) { try { return await createRowWith('testimonials', ['quote'], build, fd); } catch (e) { return { ok: false as const, error: (e as Error).message }; } }
export async function updateTestimonial(id: string, _: unknown, fd: FormData) { try { return await updateRowWith('testimonials', id, ['quote'], build, fd); } catch (e) { return { ok: false as const, error: (e as Error).message }; } }
export async function deleteTestimonial(id: string) { return deleteRowWith('testimonials', id); }
export async function reorderTestimonial(id: string, dir: 'up' | 'down') { return reorderRow('testimonials', id, dir); }
