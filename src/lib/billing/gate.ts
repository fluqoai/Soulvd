import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenant, tenantUsage } from '@/lib/tenancy/context';

export type GateResult = { allowed: boolean; code?: string; resource?: string; used?: number; limit?: number; invitationId?: string; id?: string };

export async function inviteSeat(email: string, role: 'admin' | 'agent'): Promise<GateResult> {
  const context = await requireTenant();
  if (!['owner', 'admin'].includes(context.role)) return { allowed: false, code: 'FORBIDDEN' };
  const { data, error } = await createAdminClient().rpc('soulvd_invite_member', {
    p_tenant: context.tenantId, p_actor: context.userId, p_email: email, p_role: role,
  });
  if (error) return { allowed: false, code: 'ACTION_FAILED' };
  return data as GateResult;
}

export async function apiEntitlement() {
  const { subscription, plan } = await tenantUsage();
  const now = Date.now();
  return subscription.status === 'active' && now >= Date.parse(subscription.period_start)
    && now < Date.parse(subscription.period_end) && plan.api_enabled;
}

// Only the eventual verified WhatsApp ingestion/send worker should consume
// a canonical identity. No browser action accepts arbitrary customer keys.
