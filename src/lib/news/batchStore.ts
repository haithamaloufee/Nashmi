import mongoose from "mongoose";
import { normalizedExactNewsTitle, sha256, sourceUrlHash } from "@/lib/news/dedupe";
import type { NewsCategory, NewsSource } from "@/lib/news/types";
import NewsItem from "@/models/NewsItem";
import NewsRefreshState from "@/models/NewsRefreshState";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export type BatchCandidate = {
  titleAr: string;
  summaryAr: string;
  category: NewsCategory;
  urgency: "normal" | "breaking";
  publishedAt: string;
  sources: NewsSource[];
};

export function batchDocuments(candidates: BatchCandidate[], batchId: string, now: Date, retentionDays: number) {
  return candidates.map((candidate) => {
    const publishedAt = new Date(candidate.publishedAt);
    if (!Number.isFinite(publishedAt.getTime()) || publishedAt.getTime() < now.getTime() - SEVEN_DAYS_MS || publishedAt > now) throw new Error("NEWS_BATCH_ITEM_STALE");
    if (!candidate.sources.length || !candidate.sources[0].url) throw new Error("NEWS_BATCH_SOURCE_MISSING");
    return {
      batchId,
      titleAr: candidate.titleAr,
      summaryAr: candidate.summaryAr,
      category: candidate.category,
      urgency: candidate.urgency,
      legislativeStage: null,
      sources: candidate.sources,
      publishedAt,
      canonicalHash: sha256(`${batchId}|${normalizedExactNewsTitle(candidate.titleAr)}`),
      sourceUrlHashes: candidate.sources.map((source) => sourceUrlHash(source.url)),
      status: "published" as const,
      isActive: true,
      discoveredAt: now,
      lastSeenAt: now,
      expiresAt: new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000),
      discoveryRunId: batchId
    };
  });
}

export async function activateBatch(candidates: BatchCandidate[], batchId: string, lockToken: string, now: Date, retentionDays: number, stats: Record<string, unknown> = {}) {
  if (!candidates.length) throw new Error("NEWS_BATCH_EMPTY");
  const documents = batchDocuments(candidates, batchId, now, retentionDays);
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const inserted = await NewsItem.insertMany(documents, { session, ordered: true });
      if (inserted.length !== documents.length) throw new Error("NEWS_BATCH_INCOMPLETE");
      await NewsItem.updateMany({ isActive: true, batchId: { $ne: batchId } }, { $set: { isActive: false } }, { session });
      const swap = await NewsRefreshState.updateOne(
        { _id: "global", lockToken },
        { $set: {
          currentBatchId: batchId,
          currentBatchCreatedAt: now,
          currentBatchWindowStart: new Date(now.getTime() - SEVEN_DAYS_MS),
          currentBatchWindowEnd: now,
          lockToken: null,
          lockUntil: null,
          lastCompletedAt: new Date(),
          lastStatus: "success",
          lastRunId: batchId,
          lastStats: stats,
          lastDryRunCandidates: []
        } },
        { session }
      );
      if (swap.matchedCount !== 1) throw new Error("NEWS_BATCH_LOCK_LOST");
    });
  } finally {
    await session.endSession();
  }
  return documents.length;
}
