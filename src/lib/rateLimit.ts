type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

// This in-memory store is intentionally lightweight for local development and
// demos. It is not production-safe for multi-instance deployments because each
// process has its own counters. Use Redis or Upstash behind this module before
// running multiple app instances.
export function consumeRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { ok: true, remaining: limit - existing.count };
}

export const rateLimitWindows = {
  minute: 60 * 1000,
  tenMinutes: 10 * 60 * 1000,
  fifteenMinutes: 15 * 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000
} as const;

export function requireRateLimit(key: string, limit: number, windowMs: number) {
  const result = consumeRateLimit(key, limit, windowMs);
  if (!result.ok) throw new Error("RATE_LIMITED");
  return result;
}
