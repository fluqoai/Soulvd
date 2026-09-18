import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export type AIStatus = { enabled: boolean; remaining: number; total: number; included: number; extra: number; dailyRemaining: number; expiresAt: string | null; buckets: {kind: string; quantity: number; remaining: number; expiresAt: string}[] };
export async function aiStatus(tenant: string, actor: string): Promise<AIStatus> {
  const result = await createAdminClient().rpc('soulvd_ai_status', { p_tenant: tenant, p_actor: actor });
  if (result.error) throw new Error('AI_STATUS_UNAVAILABLE');
  return result.data;
}
