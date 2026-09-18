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
    if (job.payload.media_file) {
      const { data: media, error } = await db.rpc('soulvd_job_media', { p_job: job.id });
      if (error || !media) throw new Error('MEDIA_UNAVAILABLE');
      const signed = await db.storage.from('conversation-media').createSignedUrl(media.storage_path, 7200);
      if (signed.error || !signed.data?.signedUrl) throw new Error('MEDIA_UNAVAILABLE');
      const type = String(job.payload.type);
      const item = { link: signed.data.signedUrl, ...(type !== 'audio' && job.payload.caption ? { caption: job.payload.caption } : {}), ...(type === 'document' ? { filename: media.filename } : {}) };
      job.payload = { messaging_product: 'whatsapp', to: job.payload.to, type, [type]: item };
    }
    if (job.provider === 'ycloud') {
      if (job.kind === 'message') {
        if (!job.phone) throw new YCloudError('PROVIDER_NUMBER_MISSING');
        const content = { ...job.payload };
        delete content.messaging_product;
        delete content.to;
        const result = await ycloud<{ id?: string }>('/whatsapp/messages/sendDirectly', { ...content, from: job.phone, to: `+${job.payload.to}`, externalId: job.id });
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
