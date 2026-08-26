import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

/**
 * Lightweight event sink. Accepts `sendBeacon` JSON payloads and
 * currently just logs them server-side.
 *
 * Wire to your real analytics backend here when ready:
 *   - PostHog: posthog.capture(...)
 *   - Vercel Analytics: not available server-side; use client only
 *   - BigQuery / Snowflake: insert into events table
 *   - Slack: post to webhook for low-volume events
 *
 * For now: structured console log so you can verify events arrive.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const ua = (await headers()).get('user-agent') ?? 'unknown';
    // eslint-disable-next-line no-console
    console.log(
      `[track] ${body.event ?? 'unknown'}`,
      JSON.stringify({
        props: body.props ?? {},
        ts: body.ts ?? Date.now(),
        ip,
        ua: ua.slice(0, 80),
      })
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'bad_payload' }, { status: 400 });
  }
}
