'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, maybeCleanup } from '@/lib/security';

// Home-page lead form is shorter than /contact: just name, email, message.
// Also captures two anti-spam fields:
//   - `hp_company`  — a honeypot. Real users never see it. Bots fill it in.
//   - `_t`          — timestamp when the form was rendered. Submissions
//                     faster than ~2.5s are almost certainly bots.
const homeLeadSchema = z.object({
  name: z.string().min(2, 'name_required').max(200),
  email: z.string().email('email_invalid').max(200),
  message: z.string().min(5, 'message_too_short').max(2000),
  locale: z.enum(['ar', 'en']).optional(),
  hp_company: z.string().max(200).optional(),
  _t: z.coerce.number().optional(),
});

export type SubmitHomeLeadState = {
  status: 'idle' | 'success' | 'error';
  errors?: Record<string, string>;
  message?: string;
};

const MIN_DWELL_MS = 2_500;
const RATE_LIMIT = 5;
const RATE_WINDOW_SEC = 600; // 10 minutes

export async function submitHomeLead(
  _prev: SubmitHomeLeadState,
  formData: FormData
): Promise<SubmitHomeLeadState> {
  const raw = {
    name: String(formData.get('name') ?? '').trim(),
    email: String(formData.get('email') ?? '').trim(),
    message: String(formData.get('message') ?? '').trim(),
    locale: String(formData.get('locale') ?? 'en'),
    hp_company: String(formData.get('hp_company') ?? '').trim(),
    _t: formData.get('_t') ? Number(formData.get('_t')) : undefined,
  };

  // 1. Honeypot — silently accept and discard, don't reveal the check
  if (raw.hp_company) {
    return { status: 'success' };
  }

  // 2. Timing — humans take at least a couple of seconds on a 3-field form
  if (typeof raw._t === 'number' && Date.now() - raw._t < MIN_DWELL_MS) {
    return { status: 'success' };
  }

  // 3. Rate limit per IP (per-instance, see lib/security caveat)
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anon';
  maybeCleanup();
  const rl = rateLimit(`home-lead:${ip}`, { limit: RATE_LIMIT, windowSeconds: RATE_WINDOW_SEC });
  if (!rl.ok) {
    return { status: 'error', message: 'rate_limited' };
  }

  // 4. Schema validation
  const parsed = homeLeadSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { status: 'error', errors: fieldErrors, message: 'validation' };
  }

  // 5. Insert
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
    metadata: {
      locale: parsed.data.locale ?? 'en',
      ip_hash: hashIp(ip), // never store raw IPs (PDPL)
    },
  });

  if (error) {
    console.error('Home lead insert failed:', error);
    return { status: 'error', message: 'insert_failed' };
  }

  return { status: 'success' };
}

/** Quick non-cryptographic hash of the IP for at-rest privacy. */
function hashIp(ip: string): string {
  let h = 0;
  for (let i = 0; i < ip.length; i++) {
    h = (h * 31 + ip.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16);
}
