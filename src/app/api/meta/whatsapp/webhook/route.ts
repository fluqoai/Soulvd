import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { secretMatches, verifySignature } from '@/lib/meta/security';
import { after } from 'next/server';
import { runStudioWorker } from '@/lib/studio/worker';

export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  if (params.get('hub.mode') !== 'subscribe' || !secretMatches(params.get('hub.verify_token'), process.env.META_WEBHOOK_VERIFY_TOKEN)) return new Response('Forbidden', { status: 403 });
  return new Response(params.get('hub.challenge') ?? '', { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(request: Request) {
  if (!process.env.META_APP_SECRET) return new Response('Not configured', { status: 503 });
  // Bounded streaming read, including requests without Content-Length.
  const reader = request.body?.getReader();
  if (!reader) return new Response('Invalid body', { status: 400 });
  const chunks: Uint8Array[] = []; let size = 0;
  for (;;) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > 1_048_576) { await reader.cancel(); return new Response('Too large', { status: 413 }); }
    chunks.push(part.value);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!verifySignature(raw, request.headers.get('x-hub-signature-256'), process.env.META_APP_SECRET)) return new Response('Forbidden', { status: 403 });
  let payload;
  try { payload = JSON.parse(raw); } catch { return new Response('Invalid JSON', { status: 400 }); }
  if (payload.object !== 'whatsapp_business_account' || !Array.isArray(payload.entry)) return new Response('Invalid event', { status: 400 });
  try {
    const { error } = await createAdminClient().rpc('soulvd_meta_ingest', { p_id: createHash('sha256').update(raw).digest('hex'), p_payload: payload });
    if (error) return new Response('Persistence unavailable', { status: 503 });
    after(async()=>{ try { await runStudioWorker(); } catch { /* Durable queue is retried by the scheduled worker. */ } });
    return new Response('EVENT_RECEIVED');
  } catch { return new Response('Persistence unavailable', { status: 503 }); }
}
