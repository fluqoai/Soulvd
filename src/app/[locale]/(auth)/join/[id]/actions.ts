'use server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type JoinState = { message?: string; sent?: boolean };
export async function joinTeam(_previous: JoinState, form: FormData): Promise<JoinState> {
  const id = z.uuid().safeParse(form.get('id'));
  if (!id.success) return { message: 'الدعوة غير صالحة.' };
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  const admin = createAdminClient();
  if (user) {
    if (!user.email_confirmed_at) return { message: 'أكد بريدك الإلكتروني أولًا.' };
    const { data: target } = await admin.from('tenant_invitations').select('email').eq('id', id.data).maybeSingle();
    if (!target || target.email !== user.email?.toLowerCase()) return { message: 'ادخل بالبريد الذي استلم الدعوة لقبولها.' };
    // Identity always comes from the verified session, never the form.
    const { data, error } = await admin.rpc('soulvd_accept_invitation', { p_actor: user.id, p_invite: id.data });
    if (error || data !== true) return { message: 'تعذر قبول الدعوة. تأكد من دخولك بالبريد المدعو وصلاحية الدعوة والاشتراك.' };
    const { data: invitation } = await admin.from('tenant_invitations').select('tenant_id').eq('id', id.data).eq('status', 'accepted').single();
    if (!invitation) return { message: 'تعذر فتح مساحة الفريق. حاول مجددًا.' };
    (await cookies()).set('soulvd_tenant', invitation.tenant_id, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 90 });
    redirect('/app');
  }
  const fields = z.object({ email: z.email().max(254), name: z.string().trim().min(2).max(80), password: z.string().min(12).max(128), terms: z.literal('on') }).safeParse({ email: String(form.get('email') ?? '').trim().toLowerCase(), name: form.get('name'), password: form.get('password'), terms: form.get('terms') });
  if (!fields.success) return { message: 'راجع الاسم والبريد، واستخدم كلمة مرور من 12 حرفًا على الأقل ووافق على الشروط.' };
  const { data: invite } = await admin.from('tenant_invitations').select('id').eq('id', id.data).eq('email', fields.data.email).eq('status', 'pending').gt('expires_at', new Date().toISOString()).maybeSingle();
  if (!invite) return { message: 'الدعوة غير صالحة لهذا البريد أو انتهت. اطلب من مدير الفريق إعادة دعوتك.' };
  const { error } = await db.auth.signUp({ email: fields.data.email, password: fields.data.password, options: { emailRedirectTo: `https://www.soulvd.sa/api/auth/confirm?next=${encodeURIComponent('/join/' + id.data)}`, data: { full_name: fields.data.name, terms_version: '2026-09-18' } } });
  if (error) return { message: error.status === 429 ? 'انتظر قليلًا قبل محاولة أخرى.' : 'تعذر التسجيل. إذا كان لديك حساب، استخدم تسجيل الدخول.' };
  await db.auth.signOut();
  return { sent: true, message: 'إذا كان البريد مؤهلًا، ستصلك رسالة لتأكيده. افتح الرابط ثم اضغط قبول الدعوة. للحساب الموجود بالفعل استخدم تسجيل الدخول.' };
}
