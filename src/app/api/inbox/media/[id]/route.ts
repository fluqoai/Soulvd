import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { tenantContext } from '@/lib/tenancy/context';
import { providerMediaUrl } from '@/lib/inbox/media';
import { decryptToken } from '@/lib/meta/security';
import { metaVersion } from '@/lib/meta/client';

export const maxDuration = 40;
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response(null, { status: 400 });
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return new Response(null, { status: 401 });
  const c = await tenantContext();
  if (!c) return new Response(null, { status: 403 });
  const db = createAdminClient();
  const { data: file, error } = await db.rpc('soulvd_message_media', { p_tenant: c.tenantId, p_actor: user.id, p_message: id });
  if (error || !file) return new Response(null, { status: 404 });
  let response: Response;
  try {
    if (file.source === 'storage') {
      const result = await db.storage.from('conversation-media').download(file.storage_path);
      if (result.error || !result.data) throw new Error('MEDIA_UNAVAILABLE');
      response = new Response(result.data);
    } else {
      let target = file.source_url;
      let headers: Record<string, string>;
      if (file.source === 'ycloud') {
        if (!process.env.YCLOUD_API_KEY) throw new Error('MEDIA_UNAVAILABLE');
        headers = { 'X-API-Key': process.env.YCLOUD_API_KEY };
      } else {
        if (!/^\d+$/.test(file.media_id) || !/^\d+$/.test(file.phone_number_id)) throw new Error('MEDIA_UNAVAILABLE');
        headers = { Authorization: `Bearer ${decryptToken(file.encrypted_token)}` };
        const lookup = await fetch(`https://graph.facebook.com/${metaVersion()}/${file.media_id}?phone_number_id=${file.phone_number_id}`, { headers, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10000) });
        if (!lookup.ok) throw new Error('MEDIA_UNAVAILABLE');
        target = (await lookup.json()).url;
      }
      const url = providerMediaUrl(target, file.source);
      const range = request.headers.get('range');
      if (range && /^bytes=\d+-\d*$/.test(range)) headers.Range = range;
      response = await fetch(url, { headers, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(25000) });
      if (!response.ok) throw new Error('MEDIA_UNAVAILABLE');
    }
  } catch { return NextResponse.json({ error: 'المرفق غير متاح أو انتهت مدة احتفاظ واتساب به.' }, { status: 410, headers: { 'Cache-Control': 'no-store' } }); }
  const mime = String(file.mime ?? 'application/octet-stream').split(';')[0];
  const inline = /^(image\/(jpeg|png|webp)|audio\/(mpeg|ogg|mp4|aac|amr)|video\/mp4)$/.test(mime);
  const download = new URL(request.url).searchParams.get('download') === '1';
  const headers = new Headers({ 'Content-Type': inline ? mime : 'application/octet-stream', 'Content-Disposition': `${inline && !download ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(file.filename ?? 'attachment')}`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
  for (const h of ['content-range','accept-ranges']) { const value = response.headers.get(h); if (value) headers.set(h, value); }
  return new Response(response.body, { status: response.status, headers });
}
