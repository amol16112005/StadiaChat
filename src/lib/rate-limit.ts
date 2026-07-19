/**
 * Simple in-memory sliding-window rate limiter (per process).
 * Good enough for single-instance Render demos; not a distributed limiter.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number }
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true };
  }
  if (existing.count >= opts.limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return { ok: true };
}

/** Client IP from common proxy headers (Render, etc.) */
export function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}
