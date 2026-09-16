'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { currentMerchant } from './context';

export async function selectWorkspace(form: FormData) {
  const tenant = String(form.get('tenant') ?? '');
  if (!/^[a-f0-9-]{36}$/i.test(tenant)) throw new Error('مساحة غير صحيحة.');
  const { db, user } = await currentMerchant();
  const { data, error } = await db.from('tenant_members').select('tenant_id').eq('tenant_id', tenant).eq('user_id', user.id).maybeSingle();
  if (error || !data) throw new Error('غير مسموح بالوصول إلى هذه المساحة.');
  (await cookies()).set('soulvd_tenant', tenant, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30 });
  redirect('/app/whatsapp');
}
