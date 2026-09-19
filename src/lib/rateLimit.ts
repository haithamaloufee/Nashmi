import "server-only";
import { createHash } from "node:crypto";
import { connectToDatabase } from "@/lib/db";
import RateLimitBucket from "@/models/RateLimitBucket";

export const rateLimitWindows = {
  minute: 60 * 1000,
  tenMinutes: 10 * 60 * 1000,
  fifteenMinutes: 15 * 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000
} as const;

function bucketId(key: string, windowStart: number) {
  return createHash("sha256").update(`${key}:${windowStart}`).digest("hex");
}

export async function consumeRateLimit(key: string, limit: number, windowMs: number) {
  await connectToDatabase();
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const resetAt = new Date(windowStart + windowMs);
  const id = bucketId(key, windowStart);

  try {
    const bucket = await RateLimitBucket.findOneAndUpdate(
      { _id: id, count: { $lt: limit } },
      {
        $inc: { count: 1 },
        $setOnInsert: { _id: id, resetAt, expiresAt: new Date(resetAt.getTime() + windowMs) }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    if (!bucket) return { ok: false as const, remaining: 0, resetAt: resetAt.getTime() };
    return { ok: true as const, remaining: Math.max(0, limit - bucket.count), resetAt: resetAt.getTime() };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000) {
      return { ok: false as const, remaining: 0, resetAt: resetAt.getTime() };
    }
    throw error;
  }
}

export async function requireRateLimit(key: string, limit: number, windowMs: number) {
  const result = await consumeRateLimit(key, limit, windowMs);
  if (!result.ok) throw new Error("RATE_LIMITED");
  return result;
}
