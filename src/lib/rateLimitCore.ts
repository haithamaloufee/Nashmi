import { createHash } from "node:crypto";
import type { Model } from "mongoose";
import type { RateLimitBucketDocument } from "@/models/RateLimitBucket";

export class RateLimitError extends Error {
  constructor(public readonly resetAt: number) {
    super("RATE_LIMITED");
    this.name = "RateLimitError";
  }
}

export function retryAfterSeconds(resetAt: number, now = Date.now()) {
  return Math.max(1, Math.ceil((resetAt - now) / 1000));
}

export async function consumeRateLimitBucket(
  bucketModel: Model<RateLimitBucketDocument>,
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now()
) {
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const resetAt = new Date(windowStart + windowMs);
  const id = createHash("sha256").update(`${key}:${windowStart}`).digest("hex");

  try {
    const bucket = await bucketModel.findOneAndUpdate(
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
      const bucket = await bucketModel.findOneAndUpdate(
        { _id: id, count: { $lt: limit } },
        { $inc: { count: 1 } },
        { new: true }
      ).lean();
      return bucket
        ? { ok: true as const, remaining: Math.max(0, limit - bucket.count), resetAt: resetAt.getTime() }
        : { ok: false as const, remaining: 0, resetAt: resetAt.getTime() };
    }
    throw error;
  }
}
