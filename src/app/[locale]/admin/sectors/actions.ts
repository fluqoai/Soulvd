'use server';

import { z } from 'zod';
import {
  createRowWith,
  updateRowWith,
  deleteRowWith,
  reorderRow,
} from '@/lib/admin/actions';

const schema = z.object({
  key: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/i),
  icon: z.string().min(1),
  titleAr: z.string().min(1).max(200),
  titleEn: z.string().min(1).max(200),
  descAr: z.string().min(1).max(1000),
  descEn: z.string().min(1).max(1000),
  longAr: z.string().max(5000).optional().default(''),
  longEn: z.string().max(5000).optional().default(''),
  useCasesAr: z.string().max(2000).optional().default(''),
  useCasesEn: z.string().max(2000).optional().default(''),
  order_index: z.coerce.number().int(),
  published: z.boolean(),
});

function splitLines(s: string): string[] {
  return s.split('\n').map((l) => l.trim()).filter(Boolean);
}

function buildPayload(joined: Record<string, { ar: string; en: string }>, fd: FormData) {
  const parsed = schema.parse({
    key: String(fd.get('key') ?? '').trim(),
    icon: String(fd.get('icon') ?? '').trim(),
    titleAr: joined.title.ar,
    titleEn: joined.title.en,
    descAr: joined.description.ar,
    descEn: joined.description.en,
    longAr: String(fd.get('long_description_ar') ?? '').trim(),
    longEn: String(fd.get('long_description_en') ?? '').trim(),
    useCasesAr: String(fd.get('use_cases_ar') ?? '').trim(),
    useCasesEn: String(fd.get('use_cases_en') ?? '').trim(),
    order_index: fd.get('order_index'),
    published: String(fd.get('published') ?? '0') === '1',
  });

  return {
    key: parsed.key.toLowerCase(),
    icon: parsed.icon,
    title: { ar: parsed.titleAr, en: parsed.titleEn },
    description: { ar: parsed.descAr, en: parsed.descEn },
    long_description:
      parsed.longAr || parsed.longEn
        ? { ar: parsed.longAr, en: parsed.longEn }
        : null,
    use_cases: [
      ...splitLines(parsed.useCasesAr).map((text) => ({ ar: text, en: '' })),
      ...splitLines(parsed.useCasesEn).map((text) => ({ ar: '', en: text })),
    ],
    order_index: parsed.order_index,
    published: parsed.published,
  };
}

export async function createSectorAction(_prev: unknown, fd: FormData) {
  try { return await createRowWith('sectors', ['title', 'description'], buildPayload, fd); }
  catch (e) { return { ok: false as const, error: (e as Error).message }; }
}
export async function updateSectorAction(id: string, _prev: unknown, fd: FormData) {
  try { return await updateRowWith('sectors', id, ['title', 'description'], buildPayload, fd); }
  catch (e) { return { ok: false as const, error: (e as Error).message }; }
}
export async function deleteSectorAction(id: string) { return deleteRowWith('sectors', id); }
export async function reorderSectorAction(id: string, direction: 'up' | 'down') {
  return reorderRow('sectors', id, direction);
}
