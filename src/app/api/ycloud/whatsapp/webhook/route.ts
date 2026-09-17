import { createAdminClient } from '@/lib/supabase/admin';
import { verifyYCloudSignature } from '@/lib/ycloud/security';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  const secret = process.env.YCLOUD_WEBHOOK_SECRET;
  if (!secret) return new Response('Not configured', { status: 503 });
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
  if (!verifyYCloudSignature(raw, request.headers.get('ycloud-signature'), secret)) return new Response('Forbidden', { status: 403 });
  let payload;
  try { payload = JSON.parse(raw); } catch { return new Response('Invalid JSON', { status: 400 }); }
  if (!payload || typeof payload.id !== 'string' || payload.id.length > 256 || !payload.id || typeof payload.type !== 'string') return new Response('Invalid event', { status: 400 });
  try {
    const { error } = await createAdminClient().rpc('soulvd_ycloud_ingest', { p_id: payload.id, p_payload: payload });
    if (error) return new Response('Persistence unavailable', { status: 503 });
    return Response.json({ received: true });
  } catch { return new Response('Persistence unavailable', { status: 503 }); }
}
