// src/app/api/cron/recurring/route.ts
// API endpoint for processing due recurring projects.
// Intended to be called by an external cron service (e.g. cron-job.org)
// on a daily schedule, or by Vercel Cron when the project moves to Pro.
//
// Security: requires the `Authorization: Bearer <CRON_SECRET>` header.
// Set CRON_SECRET in Vercel and in your cron service.

import { NextResponse } from 'next/server';
import { processAllDueRecurring } from '@/lib/projects/actions';

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}

async function run(request: Request) {
  // Auth check
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    if (token !== expected) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
  } else {
    // CRON_SECRET not configured — refuse to run in production
    return NextResponse.json(
      { ok: false, error: 'CRON_SECRET not set' },
      { status: 500 }
    );
  }

  try {
    const r = await processAllDueRecurring();
    if (!r.ok) {
      return NextResponse.json({ ok: false, error: r.error }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      processed: r.processed,
      results: r.results,
      ranAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
