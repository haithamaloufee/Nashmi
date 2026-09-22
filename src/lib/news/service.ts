import "server-only";

import { connectToDatabase } from "@/lib/db";
import { getNewsConfig } from "@/lib/news/config";
import { canonicalNewsHash, newsTitleSimilarity, sourceUrlHash } from "@/lib/news/dedupe";
import { discoverJordanNews, type DiscoveredCandidate } from "@/lib/news/discovery";
import { newRefreshToken } from "@/lib/news/security";
import type { NewsContextSnapshot, PublicNewsItem } from "@/lib/news/types";
import NewsItem from "@/models/NewsItem";
import NewsRefreshState from "@/models/NewsRefreshState";
import { buildActiveNewsQuery, buildRefreshLockFilter } from "@/lib/news/query";

function asSnapshot(item: any): NewsContextSnapshot {
  return {
    newsId: String(item._id),
    titleAr: item.titleAr,
    summaryAr: item.summaryAr,
    category: item.category,
    urgency: item.urgency,
    publishedAt: new Date(item.publishedAt),
    legislativeStage: item.legislativeStage || null,
    sources: item.sources.map((source: any) => ({
      title: source.title,
      url: source.url,
      publisher: source.publisher,
      sourceClass: source.sourceClass
    }))
  };
}

export function serializePublicNews(item: any): PublicNewsItem {
  const snapshot = asSnapshot(item);
  return { ...snapshot, id: snapshot.newsId, publishedAt: snapshot.publishedAt.toISOString() };
}

export async function getActiveNewsItems(limit = 15) {
  await connectToDatabase();
  const config = getNewsConfig();
  const items = await NewsItem.find(buildActiveNewsQuery(new Date(), config.activeHours))
    .sort({ urgency: -1, publishedAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 15))
    .lean();
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

async function findDuplicate(candidate: DiscoveredCandidate) {
  const hashes = candidate.sources.map((source) => sourceUrlHash(source.url));
  const direct = await NewsItem.findOne({ $or: [{ canonicalHash: canonicalNewsHash(candidate.titleAr, new Date(candidate.publishedAt)) }, { sourceUrlHashes: { $in: hashes } }] });
  if (direct) return direct;
  const nearby = await NewsItem.find({
    category: candidate.category,
    publishedAt: { $gte: new Date(new Date(candidate.publishedAt).getTime() - 36 * 60 * 60 * 1000), $lte: new Date(new Date(candidate.publishedAt).getTime() + 36 * 60 * 60 * 1000) }
  }).select("titleAr sources sourceUrlHashes").limit(50);
  return nearby.find((item) => newsTitleSimilarity(item.titleAr, candidate.titleAr) >= 0.62) || null;
}

export async function refreshNews(options: { forceDryRun?: boolean } = {}) {
  await connectToDatabase();
  const config = getNewsConfig();
  const now = new Date();
  const lockToken = await acquireRefreshLock(now);
  const runId = newRefreshToken();
  const dryRun = options.forceDryRun ?? !config.autoPublish;

  try {
    const discovery = await discoverJordanNews(now);
    const stats = { discovered: discovery.candidates.length, created: 0, merged: 0, rejected: 0, dryRun, model: discovery.model, queryCount: discovery.queryCount };
    const preview: unknown[] = [];

    for (const candidate of discovery.candidates) {
      const duplicate = await findDuplicate(candidate);
      if (duplicate) {
        stats.merged += 1;
        if (!dryRun) {
          const known = new Set(duplicate.sources.map((source: any) => source.url));
          const mergedSources = [...duplicate.sources.map((source: any) => source.toObject?.() || source), ...candidate.sources.filter((source) => !known.has(source.url))].slice(0, 6);
          duplicate.set({ sources: mergedSources, sourceUrlHashes: mergedSources.map((source: any) => sourceUrlHash(source.url)), lastSeenAt: now });
          await duplicate.save();
        }
        continue;
      }

      preview.push(candidate);
      if (dryRun) continue;
      const publishedAt = new Date(candidate.publishedAt);
      await NewsItem.create({
        ...candidate,
        publishedAt,
        canonicalHash: canonicalNewsHash(candidate.titleAr, publishedAt),
        sourceUrlHashes: candidate.sources.map((source) => sourceUrlHash(source.url)),
        status: "published",
        isActive: true,
        discoveredAt: now,
        lastSeenAt: now,
        expiresAt: new Date(now.getTime() + config.retentionDays * 24 * 60 * 60 * 1000),
        discoveryRunId: runId
      });
      stats.created += 1;
    }

    await NewsRefreshState.updateOne(
      { _id: "global", lockToken },
      { $set: { lockToken: null, lockUntil: null, lastCompletedAt: new Date(), lastStatus: dryRun ? "dry_run" : "success", lastRunId: runId, lastStats: stats, lastDryRunCandidates: dryRun ? preview.slice(0, 15) : [] } }
    );
    return { runId, stats, preview: dryRun ? preview : [] };
  } catch (error) {
    await NewsRefreshState.updateOne(
      { _id: "global", lockToken },
      { $set: { lockToken: null, lockUntil: null, lastCompletedAt: new Date(), lastStatus: "failed", lastRunId: runId, lastError: error instanceof Error ? error.message.slice(0, 500) : "unknown" } }
    ).catch(() => undefined);
    throw error;
  }
}
