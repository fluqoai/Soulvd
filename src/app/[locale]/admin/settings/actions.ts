'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  site_name: z.string().min(1).max(200),
  tagline: z.string().max(500).optional().default(''),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional().default(''),
  whatsapp: z.string().max(50).optional().default(''),
  address: z.string().max(500).optional().default(''),
  hours: z.string().max(200).optional().default(''),
  twitter: z.string().url().optional().or(z.literal('')),
  linkedin: z.string().url().optional().or(z.literal('')),
  instagram: z.string().url().optional().or(z.literal('')),
  default_og_image: z.string().max(1000).optional().default(''),
});

export type SettingsState = { ok: boolean; error?: string; fieldErrors?: Record<string, string> };

export async function saveSettings(_prev: SettingsState, fd: FormData): Promise<SettingsState> {
  const raw = {
    site_name: String(fd.get('site_name') ?? '').trim(),
    tagline: String(fd.get('tagline') ?? '').trim(),
    email: String(fd.get('email') ?? '').trim(),
    phone: String(fd.get('phone') ?? '').trim(),
    whatsapp: String(fd.get('whatsapp') ?? '').trim(),
    address: String(fd.get('address') ?? '').trim(),
    hours: String(fd.get('hours') ?? '').trim(),
    twitter: String(fd.get('twitter') ?? '').trim(),
    linkedin: String(fd.get('linkedin') ?? '').trim(),
    instagram: String(fd.get('instagram') ?? '').trim(),
    default_og_image: String(fd.get('default_og_image') ?? '').trim(),
  };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const i of parsed.error.issues) fe[String(i.path[0])] = i.message;
    return { ok: false, error: 'validation', fieldErrors: fe };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: 'unauthorized' };

  // Fetch existing row to know the id
  const { data: existing, error: exErr } = await supabase.from('site_settings').select('id').maybeSingle();
  if (exErr) return { ok: false, error: exErr.message };

  const payload = {
    site_name: parsed.data.site_name,
    tagline: parsed.data.tagline || null,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    whatsapp: parsed.data.whatsapp || null,
    address: parsed.data.address || null,
    hours: parsed.data.hours || null,
    social: {
      twitter: parsed.data.twitter || null,
      linkedin: parsed.data.linkedin || null,
      instagram: parsed.data.instagram || null,
    },
    default_og_image: parsed.data.default_og_image || null,
  };

  if (existing?.id) {
    const { error } = await supabase.from('site_settings').update(payload).eq('id', existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from('site_settings').insert(payload);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath('/', 'layout');
  revalidatePath('/admin', 'layout');
  return { ok: true };
}
