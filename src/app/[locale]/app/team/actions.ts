'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { inviteSeat, type GateResult } from '@/lib/billing/gate';
import { deliverInvitation } from '@/lib/tenancy/invitations';
import { requireTenant } from '@/lib/tenancy/context';
import { createAdminClient } from '@/lib/supabase/admin';

export async function inviteTeamMember(_previous: GateResult, form: FormData): Promise<GateResult> {
  const parsed = z.object({ email: z.string().trim().email().max(254), role: z.enum(['admin', 'agent']) }).safeParse({ email: form.get('email'), role: form.get('role') });
  if (!parsed.success) return { allowed: false, code: 'INVALID_INPUT' };
  const result = await inviteSeat(parsed.data.email, parsed.data.role);
  if (result.allowed && result.invitationId) {
    const delivered = await deliverInvitation(result.invitationId);
    revalidatePath('/[locale]/app', 'layout');
    return delivered;
  }
  return result;
}

export async function manageInvitation(_previous: GateResult, form: FormData): Promise<GateResult> {
  const id = z.uuid().safeParse(form.get('id'));
  if (!id.success) return { allowed: false, code: 'INVALID_INPUT' };
  let result: GateResult;
  if (form.get('action') === 'resend') result = await deliverInvitation(id.data);
  else if (form.get('action') === 'revoke') {
    const c = await requireTenant();
    const { data, error } = await createAdminClient().rpc('soulvd_revoke_invitation', { p_tenant: c.tenantId, p_actor: c.userId, p_invite: id.data });
    result = { allowed: !error && data === true, code: error || !data ? 'ACTION_FAILED' : undefined };
  } else return { allowed: false, code: 'INVALID_INPUT' };
  revalidatePath('/[locale]/app', 'layout');
  return result;
}
