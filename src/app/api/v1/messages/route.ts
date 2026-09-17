import { z } from 'zod';
import { crmAuth, boundedJson } from '@/lib/studio/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePhone } from '@/lib/meta/security';
import { dispatchOne } from '@/lib/meta/worker';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const auth = await crmAuth(request);
    if (!auth) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    if (auth.limited)
      return Response.json(
        { error: 'RATE_LIMITED' },
        { status: 429, headers: { 'Retry-After': '60' } },
      );
    const data = z
      .object({
        to: z.string().max(30),
        body: z.string().max(4096).default(''),
        templateId: z.string().uuid().optional(),
        parameters: z.array(z.string().min(1).max(1000)).max(10).default([]),
        consent: z.boolean().default(false),
      })
      .parse(await boundedJson(request));
    const requestId = z.uuid().parse(request.headers.get('idempotency-key'));
    let phone: string;
    try {
      phone = normalizePhone(data.to);
    } catch {
      return Response.json({ error: 'INVALID_RECIPIENT' }, { status: 400 });
    }
    const result = await createAdminClient().rpc('soulvd_enqueue_message', {
      p_tenant: auth.tenant,
      p_actor: auth.actor,
      p_request: requestId,
      p_kind: 'message',
      p_to: phone,
      p_body: data.body,
      p_template: data.templateId ?? null,
      p_consent: data.consent,
      p_parameters: data.parameters,
    });
    if (result.error)
      return Response.json({ error: 'REQUEST_REJECTED' }, { status: 409 });
    if (!result.data.allowed)
      return Response.json({ error: result.data.code }, { status: 409 });
    try {
      await dispatchOne(result.data.id);
    } catch {
      /* The committed job is recovered by the scheduler. */
    }
    return Response.json(
      {
        id: result.data.message_id,
        jobId: result.data.id,
        status: 'submitted',
        note: 'Delivery is confirmed through signed webhook events.',
      },
      { status: 202, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    const large = error instanceof Error && error.message === 'TOO_LARGE';
    const invalid =
      error instanceof z.ZodError ||
      error instanceof SyntaxError ||
      (error instanceof Error && error.message === 'INVALID_BODY');
    return Response.json(
      {
        error: large
          ? 'BODY_TOO_LARGE'
          : invalid
            ? 'INVALID_INPUT'
            : 'REQUEST_UNAVAILABLE',
      },
      { status: large ? 413 : invalid ? 400 : 503 },
    );
  }
}
export async function GET(request: Request) {
  try {
    const auth = await crmAuth(request);
    if (!auth) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    if (auth.limited)
      return Response.json({ error: 'RATE_LIMITED' }, { status: 429 });
    const search = new URL(request.url).searchParams,
      cursor = search.get('cursor'),
      id = search.get('id');
    if (id && !z.uuid().safeParse(id).success)
      return Response.json({ error: 'INVALID_ID' }, { status: 400 });
    let query = createAdminClient()
      .from('whatsapp_messages')
      .select('id,contact_id,direction,kind,body,status,created_at')
      .eq('tenant_id', auth.tenant)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(100);
    if (id) query = query.eq('id', id);
    if (cursor) {
      try {
        if (cursor.length > 300) throw new Error('INVALID');
        const c = z
          .object({ at: z.iso.datetime({ offset: true }), id: z.uuid() })
          .parse(JSON.parse(Buffer.from(cursor, 'base64url').toString()));
        query = query.or(
          `created_at.lt.${c.at},and(created_at.eq.${c.at},id.lt.${c.id})`,
        );
      } catch {
        return Response.json({ error: 'INVALID_CURSOR' }, { status: 400 });
      }
    }
    const result = await query;
    if (result.error) throw new Error('READ_FAILED');
    const last = result.data.at(-1);
    return Response.json(
      {
        data: result.data,
        nextCursor:
          result.data.length === 100 && last
            ? Buffer.from(
                JSON.stringify({ at: last.created_at, id: last.id }),
              ).toString('base64url')
            : null,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json({ error: 'UNAVAILABLE' }, { status: 503 });
  }
}
