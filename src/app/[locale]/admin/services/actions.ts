'use server';

import { z } from 'zod';
import {
  createRowWith,
  updateRowWith,
  deleteRowWith,
  reorderRow,
} from '@/lib/admin/actions';

const schema = z.object({
  key: z
    .string()
    .min(2, 'At least 2 characters')
    .max(50)
    .regex(/^[a-z0-9-]+$/i, 'Lowercase letters, numbers, و dashes only'),
  icon: z.string().min(1, 'مطلوب'),
  titleAr: z.string().min(1, 'Arabic title required').max(200),
  titleEn: z.string().min(1, 'English title required').max(200),
  descAr: z.string().min(1, 'Arabic description required').max(1000),
  descEn: z.string().min(1, 'English description required').max(1000),
  longAr: z.string().max(5000).optional().default(''),
  longEn: z.string().max(5000).optional().default(''),
  order_index: z.coerce.number().int(),
  published: z.boolean(),
});

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
    order_index: parsed.order_index,
    published: parsed.published,
  };
}

export async function createServiceAction(_prev: unknown, formData: FormData) {
  try {
    const r = await createRowWith(
      'services',
      ['title', 'description'],
      buildPayload,
      formData
    );
    return r;
  } catch (e) {
    if (e instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const i of e.issues) fieldErrors[String(i.path[0])] = i.message;
      return { ok: false as const, error: 'validation', fieldErrors };
    }
    return { ok: false as const, error: (e as Error).message };
  }
}

export async function updateServiceAction(id: string, _prev: unknown, formData: FormData) {
  try {
    const r = await updateRowWith(
      'services',
      id,
      ['title', 'description'],
      buildPayload,
      formData
    );
    return r;
  } catch (e) {
    if (e instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const i of e.issues) fieldErrors[String(i.path[0])] = i.message;
      return { ok: false as const, error: 'validation', fieldErrors };
    }
    return { ok: false as const, error: (e as Error).message };
  }
}

export async function deleteServiceAction(id: string) {
  return deleteRowWith('services', id);
}

export async function reorderServiceAction(id: string, direction: 'up' | 'down') {
  return reorderRow('services', id, direction);
}
