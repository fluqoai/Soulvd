'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Locale } from '@/i18n/routing';

const schema = z.object({
  email: z.string().email('email_invalid'),
  password: z.string().min(6, 'password_too_short'),
  locale: z.string().optional(),
});

export type LoginState = {
  status: 'idle' | 'error';
  error?: 'invalid_credentials' | 'no_role' | 'unknown';
  fieldErrors?: Record<string, string>;
};

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const raw = {
    email: String(formData.get('email') ?? '').trim().toLowerCase(),
    password: String(formData.get('password') ?? ''),
    locale: String(formData.get('locale') ?? 'en'),
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { status: 'error', error: 'invalid_credentials', fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error || !data.user) {
    return { status: 'error', error: 'invalid_credentials' };
  }

  // Check that the user has a role in public.users (must be owner or editor)
  const admin = createAdminClient();
  const { data: profileData, error: profileErr } = await admin
    .from('users')
    .select('role')
    .eq('id', data.user.id)
    .single();

  const profile = profileData as { role: 'owner' | 'editor' } | null;
  if (profileErr || !profile) {
    await supabase.auth.signOut();
    return { status: 'error', error: 'no_role' };
  }
  if (!['owner', 'editor'].includes(profile.role)) {
    await supabase.auth.signOut();
    return { status: 'error', error: 'no_role' };
  }

  // Success — redirect to /admin (or localized /admin)
  const locale = (parsed.data.locale as Locale) ?? 'ar';
  redirect(`/${locale}/admin`);
  // Unreachable — TypeScript needs an explicit return after redirect
  return { status: 'success' as never };
}

export async function logout(locale: string = 'ar') {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${locale}`);
}
