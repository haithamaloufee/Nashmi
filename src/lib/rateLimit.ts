import "server-only";
import { connectToDatabase } from "@/lib/db";
import RateLimitBucket from "@/models/RateLimitBucket";
import { consumeRateLimitBucket, RateLimitError } from "@/lib/rateLimitCore";

export { RateLimitError } from "@/lib/rateLimitCore";

export const rateLimitWindows = {
  minute: 60 * 1000,
  tenMinutes: 10 * 60 * 1000,
  fifteenMinutes: 15 * 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000
} as const;

export async function consumeRateLimit(key: string, limit: number, windowMs: number) {
  await connectToDatabase();
  return consumeRateLimitBucket(RateLimitBucket, key, limit, windowMs);
}

export async function requireRateLimit(key: string, limit: number, windowMs: number) {
  const result = await consumeRateLimit(key, limit, windowMs);
  if (!result.ok) throw new RateLimitError(result.resetAt);
  return result;
}
