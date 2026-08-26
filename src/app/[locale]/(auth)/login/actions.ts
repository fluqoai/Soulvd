'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const schema = z.object({
  email: z.string().email('email_invalid'),
  password: z.string().min(6, 'password_too_short'),
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

  // Success — admin is always Arabic, no locale prefix
  redirect('/admin');
  // Unreachable — TypeScript needs an explicit return after redirect
  return { status: 'success' as never };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Log out and send the user to the public site home (Arabic default)
  redirect('/');
}
