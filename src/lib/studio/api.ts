import 'server-only';
import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
export async function crmAuth(request: Request) {
  const bearer = request.headers.get('authorization') ?? '';
  if (!/^Bearer slv_[a-f0-9]{64}$/.test(bearer)) return null;
  const result = await createAdminClient().rpc('soulvd_crm_auth', {
    p_hash: createHash('sha256').update(bearer.slice(7)).digest('hex'),
  });
  if (result.error) throw new Error('AUTH_UNAVAILABLE');
  return result.data as {
    tenant: string;
    actor: string;
    limited?: boolean;
  } | null;
}
export async function boundedJson(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('INVALID_BODY');
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const value = await reader.read();
    if (value.done) break;
    size += value.value.length;
    if (size > 65536) {
      await reader.cancel();
      throw new Error('TOO_LARGE');
    }
    chunks.push(value.value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
