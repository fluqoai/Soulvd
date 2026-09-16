import { secretMatches } from '@/lib/meta/security';
import { dispatchOne } from '@/lib/meta/worker';

export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  if (!secretMatches(request.headers.get('authorization'), process.env.META_WORKER_SECRET ? `Bearer ${process.env.META_WORKER_SECRET}` : undefined)) return new Response('Forbidden', { status: 403 });
  try {
    const results = [];
    for (let i = 0; i < 2; i++) { const result = await dispatchOne(); if (!result) break; results.push(result); }
    return Response.json({ processed: results.length }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return new Response('Worker unavailable', { status: 503 }); }
}
