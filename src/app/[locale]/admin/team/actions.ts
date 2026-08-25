'use server';
import { z } from 'zod';
import { createRowWith, updateRowWith, deleteRowWith, reorderRow } from '@/lib/admin/actions';

const schema = z.object({
  full_name: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  bioAr: z.string().max(2000).optional().default(''),
  bioEn: z.string().max(2000).optional().default(''),
  photo_url: z.string().max(1000).optional().default(''),
  linksJson: z.string().max(2000).optional().default(''),
  order_index: z.coerce.number().int(),
  published: z.boolean(),
});

function build(joined: Record<string, { ar: string; en: string }>, fd: FormData) {
  const p = schema.parse({
    full_name: String(fd.get('full_name') ?? '').trim(),
    role: String(fd.get('role') ?? '').trim(),
    bioAr: joined.bio.ar,
    bioEn: joined.bio.en,
    photo_url: String(fd.get('photo_url') ?? '').trim(),
    linksJson: String(fd.get('links_json') ?? '').trim(),
    order_index: fd.get('order_index'),
    published: String(fd.get('published') ?? '0') === '1',
  });
  let links: Record<string, string> = {};
  if (p.linksJson) {
    try { links = JSON.parse(p.linksJson); } catch { /* ignore */ }
  }
  return {
    full_name: p.full_name,
    role: p.role,
    bio: p.bioAr || p.bioEn ? { ar: p.bioAr, en: p.bioEn } : null,
    photo_url: p.photo_url || null,
    links,
    order_index: p.order_index,
    published: p.published,
  };
}

export async function createMember(_: unknown, fd: FormData) { try { return await createRowWith('team_members', ['bio'], build, fd); } catch (e) { return { ok: false as const, error: (e as Error).message }; } }
export async function updateMember(id: string, _: unknown, fd: FormData) { try { return await updateRowWith('team_members', id, ['bio'], build, fd); } catch (e) { return { ok: false as const, error: (e as Error).message }; } }
export async function deleteMember(id: string) { return deleteRowWith('team_members', id); }
export async function reorderMember(id: string, dir: 'up' | 'down') { return reorderRow('team_members', id, dir); }
