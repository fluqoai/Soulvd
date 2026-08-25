'use server';

import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Home-page lead form is shorter than /contact: just name, email, message.
const homeLeadSchema = z.object({
  name: z.string().min(2, 'name_required').max(200),
  email: z.string().email('email_invalid').max(200),
  message: z.string().min(5, 'message_too_short').max(2000),
  locale: z.enum(['ar', 'en']).optional(),
});

export type SubmitHomeLeadState = {
  status: 'idle' | 'success' | 'error';
  errors?: Record<string, string>;
  message?: string;
};

export async function submitHomeLead(
  _prev: SubmitHomeLeadState,
  formData: FormData
): Promise<SubmitHomeLeadState> {
  const raw = {
    name: String(formData.get('name') ?? '').trim(),
    email: String(formData.get('email') ?? '').trim(),
    message: String(formData.get('message') ?? '').trim(),
    locale: String(formData.get('locale') ?? 'en'),
  };

  const parsed = homeLeadSchema.safeParse(raw);
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

  const supabase = createClient(url, anon, { auth: { persistSession: false } });
  const { error } = await supabase.from('leads').insert({
    name: parsed.data.name,
    email: parsed.data.email,
    message: parsed.data.message,
    source: 'home_contact_form',
    metadata: { locale: parsed.data.locale ?? 'en' },
  });

  if (error) {
    console.error('Home lead insert failed:', error);
    return { status: 'error', message: 'insert_failed' };
  }

  return { status: 'success' };
}
