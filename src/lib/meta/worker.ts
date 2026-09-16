import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptToken } from './security';
import { graph, MetaError } from './client';

type Job = { id: string; kind: 'message' | 'template'; payload: unknown; phone_number_id: string; waba_id: string; encrypted_token: string };
export async function dispatchOne(id?: string) {
  const db = createAdminClient();
  const { data, error } = await db.rpc('soulvd_meta_claim', { p_id: id ?? null });
  if (error) throw new Error('QUEUE_UNAVAILABLE');
  if (!data) return null;
  const job = data as Job;
  let status = 'unknown', metaId: string | null = null, errorCode: string | null = null;
  try {
    const result = await graph<{ messages?: { id: string }[]; id?: string }>(
      job.kind === 'message' ? `${job.phone_number_id}/messages` : `${job.waba_id}/message_templates`,
      decryptToken(job.encrypted_token), job.payload,
    );
    metaId = job.kind === 'message' ? result.messages?.[0]?.id ?? null : result.id ?? null;
    status = metaId ? 'accepted' : 'unknown';
  } catch (error) {
    if (error instanceof MetaError) { status = error.uncertain ? 'unknown' : 'failed'; errorCode = error.code; }
    else { status = 'failed'; errorCode = 'META_CONFIGURATION_ERROR'; }
  }
  const finished = await db.rpc('soulvd_meta_finish', { p_id: job.id, p_status: status, p_meta_id: metaId, p_error: errorCode });
  if (finished.error) throw new Error('JOB_RECONCILIATION_REQUIRED');
  return { id: job.id, status, code: errorCode };
}
