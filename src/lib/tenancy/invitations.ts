import 'server-only';
import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenant } from './context';
import type { GateResult } from '@/lib/billing/gate';

export async function deliverInvitation(id: string): Promise<GateResult> {
  const c = await requireTenant();
  const db = createAdminClient();
  if (!process.env.RESEND_API_KEY) {
    // Reuse the institution's configured mail provider without exposing its key to Vercel/browser clients.
    const { data, error } = await db.functions.invoke('team-invitation-mail', { body: { tenant: c.tenantId, actor: c.userId, invitation: id } });
    return error || !data ? { allowed: false, code: 'EMAIL_FAILED' } : data as GateResult;
  }
  const { data, error } = await db.rpc('soulvd_invitation_delivery', { p_tenant: c.tenantId, p_actor: c.userId, p_invite: id });
  if (error || !data?.email) return { allowed: false, code: data?.code ?? 'ACTION_FAILED' };
  const url = `https://www.soulvd.sa/join/${id}`;
  try {
    const result = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: process.env.LEAD_FROM ?? 'Soulvd <noreply@soulvd.sa>',
      to: data.email,
      subject: 'دعوة للانضمام إلى فريق Soulvd',
      text: `تمت دعوتك للانضمام إلى فريق ${data.name} في Soulvd.\n\nافتح الرابط لإنشاء حسابك أو الدخول ثم قبول الدعوة:\n${url}\n\nالدعوة صالحة لمدة 7 أيام من إنشائها. إذا لم تكن تتوقعها، يمكنك تجاهلها.`,
    }, { idempotencyKey: `team-invite-${id}-${data.deliveryKey}` });
    if (result.error) return { allowed: false, code: 'EMAIL_FAILED' };
    await db.from('tenant_invitations').update({ email_sent_at: new Date().toISOString() }).eq('id', id).eq('tenant_id', c.tenantId).eq('delivery_key', data.deliveryKey);
    return { allowed: true, invitationId: id };
  } catch { return { allowed: false, code: 'EMAIL_FAILED' }; }
}
