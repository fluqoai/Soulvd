'use server';

import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { sendLeadNotification, sendLeadAutoReply } from '@/lib/email';

const leadSchema = z.object({
  name: z.string().min(2, 'name_required').max(200),
  email: z.string().email('email_invalid').max(200).optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  company: z.string().max(200).optional().or(z.literal('')),
  message: z.string().min(10, 'message_too_short').max(5000),
  locale: z.enum(['ar', 'en']).optional(),
});

export type SubmitLeadState = {
  status: 'idle' | 'success' | 'error';
  errors?: Record<string, string>;
  message?: string;
};

export async function submitLead(
  _prev: SubmitLeadState,
  formData: FormData
): Promise<SubmitLeadState> {
  const raw = {
    name: String(formData.get('name') ?? '').trim(),
    email: String(formData.get('email') ?? '').trim(),
    phone: String(formData.get('phone') ?? '').trim(),
    company: String(formData.get('company') ?? '').trim(),
    message: String(formData.get('message') ?? '').trim(),
    locale: String(formData.get('locale') ?? 'en'),
  };

  const parsed = leadSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { status: 'error', errors: fieldErrors, message: 'validation' };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return { status: 'error', message: 'config_missing' };
  }

  // Use the anon client — the leads table RLS policy allows anyone to insert
  const supabase = createClient(url, anon, { auth: { persistSession: false } });
  const { data: inserted, error } = await supabase
    .from('leads')
    .insert({
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      company: parsed.data.company || null,
      message: parsed.data.message,
      source: 'contact_form',
      metadata: { locale: parsed.data.locale ?? 'en' },
    })
    .select('id, created_at')
    .single();

  if (error || !inserted) {
    console.error('Lead insert failed:', error);
    return { status: 'error', message: 'insert_failed' };
  }

  // Email pipeline — best-effort, never blocks the form.
  // The DB insert above is the source of truth; emails are notifications.
  await Promise.allSettled([
    sendLeadNotification({
      id: inserted.id,
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      company: parsed.data.company || null,
      message: parsed.data.message,
      locale: parsed.data.locale ?? 'en',
      createdAt: inserted.created_at,
    }),
    sendLeadAutoReply({
      id: inserted.id,
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      company: parsed.data.company || null,
      message: parsed.data.message,
      locale: parsed.data.locale ?? 'en',
      createdAt: inserted.created_at,
    }),
  ]);

  return { status: 'success' };
}

