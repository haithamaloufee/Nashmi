import "server-only";

import { connectToDatabase } from "@/lib/db";
import { getNewsConfig } from "@/lib/news/config";
import { activateBatch } from "@/lib/news/batchStore";
import { discoverJordanNews } from "@/lib/news/feedDiscovery";
import { newRefreshToken } from "@/lib/news/security";
import type { NewsContextSnapshot, PublicNewsItem } from "@/lib/news/types";
import NewsItem from "@/models/NewsItem";
import NewsRefreshState from "@/models/NewsRefreshState";
import { buildActiveNewsQuery, buildRefreshLockFilter } from "@/lib/news/query";

function asSnapshot(item: any): NewsContextSnapshot {
  return {
    newsId: String(item._id), titleAr: item.titleAr, summaryAr: item.summaryAr,
    category: item.category, urgency: item.urgency, publishedAt: new Date(item.publishedAt),
    legislativeStage: item.legislativeStage || null,
    sources: item.sources.map((source: any) => ({
      title: source.title, url: source.url, publisher: source.publisher, sourceClass: source.sourceClass
    }))
  };
}

export function serializePublicNews(item: any): PublicNewsItem {
  const snapshot = asSnapshot(item);
  return { ...snapshot, id: snapshot.newsId, publishedAt: snapshot.publishedAt.toISOString() };
}

export async function getActiveNewsItems(limit = 10) {
  await connectToDatabase();
  const state = await NewsRefreshState.findById("global").select("currentBatchId").lean();
  // Before the first daily swap, keep eligible legacy news visible on refresh failure.
  const items = await NewsItem.find(buildActiveNewsQuery(new Date(), state?.currentBatchId || null))
    .sort({ publishedAt: -1 }).limit(Math.min(Math.max(limit, 1), 10)).lean();
  return items.map(serializePublicNews);
}

export async function getNewsSnapshot(newsId: string) {
  await connectToDatabase();
  const item = await NewsItem.findOne({ _id: newsId, status: "published", expiresAt: { $gt: new Date() } }).lean();
  if (!item) throw new Error("NOT_FOUND");
  return asSnapshot(item);
}

async function acquireRefreshLock(now: Date) {
  const token = newRefreshToken();
  await NewsRefreshState.updateOne({ _id: "global" }, { $setOnInsert: { lastStatus: "never" } }, { upsert: true });
  const state = await NewsRefreshState.findOneAndUpdate(
    buildRefreshLockFilter(now),
    { $set: { lockToken: token, lockUntil: new Date(now.getTime() + 15 * 60 * 1000), lastStartedAt: now, lastStatus: "running", lastError: null } },
    { new: true }
  );
  if (!state) throw new Error("NEWS_REFRESH_LOCKED");
  return token;
}

export async function refreshNews(options: { forceDryRun?: boolean } = {}) {
  const config = getNewsConfig();
  const now = new Date();
  const runId = newRefreshToken();
  // Preview must not mutate Production data even if it shares a database URL.
  const dryRun = Boolean(process.env.VERCEL && process.env.VERCEL_ENV !== "production") || (options.forceDryRun ?? !config.autoPublish);
  if (!dryRun) await connectToDatabase();
  const lockToken = dryRun ? null : await acquireRefreshLock(now);
  console.info("daily_news_batch_started", { runId, dryRun });

  try {
    const discovery = await discoverJordanNews(now);
    const stats = {
      discovered: discovery.diagnostics.parsed, candidates: discovery.diagnostics.candidates,
      selected: discovery.candidates.length, created: 0, dryRun, model: discovery.model,
      queryCount: discovery.queryCount, rejectionReasons: discovery.diagnostics
    };
    if (dryRun) return { runId, stats, preview: discovery.candidates };
    if (!dryRun && discovery.candidates.length) {
      stats.created = await activateBatch(discovery.candidates, runId, lockToken!, now, config.retentionDays, { ...stats, created: discovery.candidates.length });
      console.info("batch_created", { runId, count: stats.created });
      console.info("batch_activated", { batchId: runId, count: stats.created });
      return { runId, stats, preview: [] };
    }
    // Empty selection is successful discovery, not an empty replacement batch.
    await NewsRefreshState.updateOne(
      { _id: "global", lockToken },
      { $set: { lockToken: null, lockUntil: null, lastCompletedAt: new Date(), lastStatus: "success", lastRunId: runId, lastStats: stats, lastDryRunCandidates: [] } }
    );
    return { runId, stats, preview: [] };
  } catch (error) {
    console.error("batch_failed", { runId, reason: error instanceof Error ? error.message.slice(0, 160) : "unknown" });
    if (lockToken) await NewsRefreshState.updateOne(
      { _id: "global", lockToken },
      { $set: { lockToken: null, lockUntil: null, lastCompletedAt: new Date(), lastStatus: "failed", lastRunId: runId, lastError: error instanceof Error ? error.message.slice(0, 500) : "unknown" } }
    ).catch(() => undefined);
    throw error;
  }
}
