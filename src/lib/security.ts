/**
 * Tiny in-memory rate limiter.
 *
 * Caveat: on serverless platforms (Vercel) each instance has its own
 * memory, so this is a *per-instance* limit. For a real production
 * deployment, replace with Upstash Ratelimit or Vercel KV.
 *
 * The defaults here are deliberately conservative: 5 submissions per
 * IP per 10 minutes. Spam bots hammer; humans don't.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetInSeconds: number;
};

export function rateLimit(
  key: string,
  opts: { limit?: number; windowSeconds?: number } = {}
): RateLimitResult {
  const limit = opts.limit ?? 5;
  const windowMs = (opts.windowSeconds ?? 600) * 1000;
  const now = Date.now();

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetInSeconds: windowMs / 1000 };
  }

  bucket.count += 1;
  const remaining = Math.max(0, limit - bucket.count);
  return {
    ok: bucket.count <= limit,
    remaining,
    resetInSeconds: Math.ceil((bucket.resetAt - now) / 1000),
  };
}

/**
 * Periodic cleanup so the Map doesn't grow unbounded. Call from
 * any hot path; cheap to no-op when nothing is stale.
 */
let lastCleanup = Date.now();
export function maybeCleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [k, b] of buckets) {
    if (b.resetAt < now) buckets.delete(k);
  }
}
