import { z } from 'zod';

export const flowSchema = z.object({
  name: z.string().trim().min(1).max(120),
  status: z.enum(['draft', 'active', 'archived']),
  priority: z.coerce.number().int().min(1).max(999),
  definition: z
    .object({
      trigger: z.enum(['all', 'keywords']),
      keywords: z.array(z.string().trim().min(1).max(60)).max(20),
      action: z.enum(['text', 'ai', 'handoff']),
      mode: z.enum(['auto', 'draft']),
      reply: z.string().max(4096),
    })
    .refine(
      (d) => d.trigger !== 'keywords' || d.keywords.length > 0,
      'أضف كلمة مفتاحية واحدة على الأقل.',
    )
    .refine(
      (d) => d.action !== 'text' || d.reply.trim().length > 0,
      'أدخل نص الرد.',
    ),
});
export const settingsSchema = z.object({
  enabled: z.boolean(),
  instructions: z.string().max(4000),
  daily_limit: z.coerce.number().int().min(1).max(1000),
  cooldown_seconds: z.coerce.number().int().min(10).max(86400),
});
export function parameterCount(body: string) {
  const slots = [...body.matchAll(/\{\{([1-9][0-9]?)\}\}/g)].map((m) =>
    Number(m[1]),
  );
  if (/[{}]/.test(body.replace(/\{\{([1-9][0-9]?)\}\}/g, '')))
    throw new Error('استخدم متغيرات مرقمة مثل {{1}} و{{2}}.');
  const count = new Set(slots).size;
  if (count > 10 || slots.some((n) => n > count))
    throw new Error('رقّم المتغيرات بالتسلسل من 1 حتى 10 كحد أقصى.');
  return count;
}
export const templateSchema = z
  .object({
    name: z.string().regex(/^[a-z][a-z0-9_]{0,119}$/),
    body: z.string().trim().min(1).max(1024),
    category: z.enum(['UTILITY', 'MARKETING']),
    language: z.enum(['ar', 'en_US']),
    examples: z.array(z.string().trim().min(1).max(200)).max(10),
    library_key: z.string().max(60).nullable().optional(),
  })
  .superRefine((v, ctx) => {
    try {
      if (parameterCount(v.body) !== v.examples.length)
        ctx.addIssue({
          code: 'custom',
          message: 'أدخل مثالًا لكل متغير، كل مثال في سطر.',
        });
    } catch (e) {
      ctx.addIssue({ code: 'custom', message: (e as Error).message });
    }
  });
export type Flow = z.infer<typeof flowSchema> & {
  id: string;
  created_by: string;
};
export function normalizeMatch(text: string) {
  return text.normalize('NFKC').toLocaleLowerCase('ar')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا');
}
export function matchFlow(flows: Flow[], body: string) {
  const text = normalizeMatch(body);
  return flows.filter((flow) => flow.status === 'active').sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id)).find(
    (f) =>
      f.definition.trigger === 'all' ||
      f.definition.keywords.some((k) =>
        normalizeMatch(k).length > 0 && text.includes(normalizeMatch(k)),
      ),
  );
}
