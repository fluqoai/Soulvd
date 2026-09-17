import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptToken } from './security';
import { graph, MetaError } from './client';
import { ycloud, YCloudError } from '@/lib/ycloud/client';

type Job = { id: string; kind: 'message' | 'template'; payload: Record<string, unknown>; phone_number_id: string; waba_id: string; encrypted_token: string; provider?: 'meta' | 'ycloud'; phone?: string };
export async function dispatchOne(id?: string) {
  const db = createAdminClient();
  const { data, error } = await db.rpc('soulvd_meta_claim', { p_id: id ?? null });
  if (error) throw new Error('QUEUE_UNAVAILABLE');
  if (!data) return null;
  const job = data as Job;
  let status = 'unknown', metaId: string | null = null, errorCode: string | null = null;
  try {
    if (job.provider === 'ycloud') {
      if (job.kind === 'message') {
        if (!job.phone) throw new YCloudError('PROVIDER_NUMBER_MISSING');
        const result = await ycloud<{ id?: string }>('/whatsapp/messages/sendDirectly', { type: job.payload.type, text: job.payload.text, template: job.payload.template, from: job.phone, to: `+${job.payload.to}`, externalId: job.id });
        metaId = result.id ? `ycloud:${result.id}` : null;
      } else {
        const result = await ycloud<{ id?: string; name?: string }>('/whatsapp/templates', { ...job.payload, wabaId: job.waba_id });
        metaId = result.id ?? (result.name ? `ycloud-template:${result.name}` : null);
      }
    } else {
      const result = await graph<{ messages?: { id: string }[]; id?: string }>(
        job.kind === 'message' ? `${job.phone_number_id}/messages` : `${job.waba_id}/message_templates`,
        decryptToken(job.encrypted_token), job.payload,
      );
      metaId = job.kind === 'message' ? result.messages?.[0]?.id ?? null : result.id ?? null;
    }
    status = metaId ? 'accepted' : 'unknown';
  } catch (error) {
    if (error instanceof MetaError || error instanceof YCloudError) { status = error.uncertain ? 'unknown' : 'failed'; errorCode = error.code; }
    else { status = 'failed'; errorCode = 'META_CONFIGURATION_ERROR'; }
  }
  const finished = await db.rpc('soulvd_meta_finish', { p_id: job.id, p_status: status, p_meta_id: metaId, p_error: errorCode });
  if (finished.error) throw new Error('JOB_RECONCILIATION_REQUIRED');
  return { id: job.id, status, code: errorCode };
}
