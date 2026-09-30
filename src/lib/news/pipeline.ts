import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { getMongoUri, getRequiredEnv } from "@/lib/env";
import { batchDocuments } from "@/lib/news/batchStore";
import { getNewsConfig } from "@/lib/news/config";
import { sha256, sourceUrlHash } from "@/lib/news/dedupe";
import { eventDraftsFromMaterial, NEWS_FRESHNESS_MS, sameNewsEvent, type EventDraft } from "@/lib/news/pipelineCore";
import { mayPublishNewPipeline } from "@/lib/news/pipelineMode";
import { fetchSourceText } from "@/lib/news/sourceFetch";
import { NEWS_SOURCES, parseGovernmentArchive, parseGovernmentDetail, parseRegisteredFeed, type SourceDefinition, type SourceMaterial } from "@/lib/news/sourceRegistry";
import NewsCandidate from "@/models/NewsCandidate";
import NewsEvent from "@/models/NewsEvent";
import NewsItem from "@/models/NewsItem";
import NewsRefreshState from "@/models/NewsRefreshState";

const ARCHIVE_MS = 180 * 24 * 60 * 60_000;
const LOCK_MS = 15 * 60_000;

type SourceStats = { found: number; created: number; duplicates: number; eligible: number; excluded: number; errors: number; failure?: string };
type DiscoveryStats = { runId: string; startedAt: string; completedAt: string; sources: Record<string, SourceStats>; found: number; created: number; duplicates: number; eligible: number; excluded: number; errors: number };
type SourceReader = typeof fetchSourceText;

function safeReason(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 120).replace(/https?:\/\/\S+/g, "[url]") : "unknown";
}

export async function assertPipelineWriteIsolation() {
  const connection = await connectToDatabase();
  const database = connection.connection.db;
  if (!database) throw new Error("NEWS_DATABASE_UNAVAILABLE");
  if (process.env.VERCEL_ENV === "preview") {
    if (database.databaseName !== "nashmi_preview") throw new Error("NEWS_PREVIEW_DATABASE_ISOLATION_FAILED");
    const status = await database.admin().command({ connectionStatus: 1 });
    const roles = status.authInfo?.authenticatedUserRoles as Array<{ role: string; db: string }> | undefined;
    if (!roles?.length || roles.some((role) => role.db !== "nashmi_preview" || /AnyDatabase|root|dbOwner|userAdmin/i.test(role.role))) {
      throw new Error("NEWS_PREVIEW_DATABASE_PERMISSIONS_UNVERIFIED");
    }
  } else if (process.env.VERCEL_ENV !== "production") {
    // Local runs use only a disposable replica set with an explicit test marker.
    if (process.env.NEWS_PIPELINE_TEST_DB !== "true" || !/^mongodb:\/\/(127\.0\.0\.1|localhost):\d+\/nashmi_news_pipeline_test(?:\?|$)/.test(getMongoUri())) {
      throw new Error("NEWS_PIPELINE_LOCAL_WRITE_DISABLED");
    }
  }
  return connection;
}

async function lock(kind: "Discovery" | "Editorial", now: Date) {
  const token = randomUUID();
  await NewsRefreshState.updateOne({ _id: "global" }, { $setOnInsert: { lastStatus: "never" } }, { upsert: true });
  const untilField = `pipeline${kind}LockUntil`;
  const tokenField = `pipeline${kind}LockToken`;
  const state = await NewsRefreshState.findOneAndUpdate(
    { _id: "global", $or: [{ [untilField]: null }, { [untilField]: { $exists: false } }, { [untilField]: { $lt: now } }] },
    { $set: { [tokenField]: token, [untilField]: new Date(now.getTime() + LOCK_MS) } },
    { new: true }
  );
  if (!state) throw new Error(`NEWS_${kind.toUpperCase()}_LOCKED`);
  return token;
}

async function unlock(kind: "Discovery" | "Editorial", token: string) {
  await NewsRefreshState.updateOne({ _id: "global", [`pipeline${kind}LockToken`]: token }, { $set: { [`pipeline${kind}LockToken`]: null, [`pipeline${kind}LockUntil`]: null } });
}

async function sourceListing(source: SourceDefinition, now: Date, read: SourceReader): Promise<SourceMaterial[]> {
  const text = await read(source.url, source);
  return source.access === "public_archive" ? parseGovernmentArchive(text, source) : parseRegisteredFeed(text, source, now);
}

async function findMatchingEvent(draft: EventDraft) {
  const nearby = await NewsEvent.find({
    authority: draft.authority, actionStage: draft.actionStage,
    publishedAt: { $gte: new Date(draft.publishedAt.getTime() - 2 * 24 * 60 * 60_000), $lte: new Date(draft.publishedAt.getTime() + 2 * 24 * 60 * 60_000) }
  }).limit(40);
  return nearby.find((event) => sameNewsEvent(draft, { titleAr: event.titleAr, authority: event.authority, actionStage: event.actionStage, publishedAt: event.publishedAt }));
}

async function ingestMaterial(material: SourceMaterial, source: SourceDefinition, now: Date, read: SourceReader) {
  const urlHash = sourceUrlHash(material.url);
  const existing = await NewsCandidate.findOne({ sourceId: source.id, urlHash });
  if (existing && existing.status !== "error") {
    await NewsCandidate.updateOne({ _id: existing._id }, { $set: { lastSeenAt: now } });
    return { created: false, eligible: 0, excluded: 0, error: false };
  }

  let paragraphs = material.paragraphs;
  if (source.access === "public_archive") {
    try {
      paragraphs = parseGovernmentDetail(await read(material.url, source, 500_000));
    } catch (error) {
      await NewsCandidate.updateOne({ sourceId: source.id, urlHash }, { $set: {
        publisher: material.publisher, sourceClass: material.sourceClass, originalUrl: material.url,
        originalTitle: material.title, originalSummary: material.summary, publishedAt: material.publishedAt,
        datePrecision: material.datePrecision, lastSeenAt: now, status: "error", reason: safeReason(error)
      }, $setOnInsert: { firstDiscoveredAt: now, archiveUntil: new Date(now.getTime() + ARCHIVE_MS) } }, { upsert: true });
      return { created: !existing, eligible: 0, excluded: 0, error: true };
    }
  }

  const candidate = await NewsCandidate.findOneAndUpdate(
    { sourceId: source.id, urlHash },
    { $set: {
      publisher: material.publisher, sourceClass: material.sourceClass, originalUrl: material.url,
      originalTitle: material.title, originalSummary: material.summary, evidenceParagraphs: paragraphs.slice(0, 25).map((value) => value.slice(0, 900)),
      publishedAt: material.publishedAt, datePrecision: material.datePrecision, lastSeenAt: now,
      status: "validated", reason: null
    }, $setOnInsert: { firstDiscoveredAt: now, archiveUntil: new Date(now.getTime() + ARCHIVE_MS) } },
    { upsert: true, new: true }
  );
  if (!candidate) throw new Error("NEWS_CANDIDATE_WRITE_FAILED");

  const drafts = eventDraftsFromMaterial({ ...material, paragraphs }, now);
  const eventIds: mongoose.Types.ObjectId[] = [];
  let eligible = 0;
  for (const draft of drafts) {
    const matching = await findMatchingEvent(draft);
    const evidence = { candidateId: candidate._id, url: material.url, publisher: material.publisher, sourceTitle: material.title, sourceClass: material.sourceClass, passage: draft.passage };
    let event;
    if (matching) {
      if (!matching.evidence.some((item) => String(item.candidateId) === String(candidate._id))) {
        matching.evidence.push(evidence);
        matching.lastSeenAt = now;
        if (draft.verification === "official") matching.verification = "official";
        if (draft.eligible && matching.status === "excluded" && matching.reason !== "older_than_48_hours" && matching.publishedAt.getTime() >= now.getTime() - NEWS_FRESHNESS_MS) {
          matching.status = "eligible";
          matching.reason = null;
        }
        await matching.save();
      }
      event = matching;
    } else {
      event = await NewsEvent.findOneAndUpdate({ eventKey: draft.eventKey }, { $setOnInsert: {
        ...draft, evidence: [evidence], firstDiscoveredAt: now, lastSeenAt: now,
        status: draft.eligible ? "eligible" : "excluded", reason: draft.reason,
        archiveUntil: new Date(now.getTime() + ARCHIVE_MS)
      } }, { upsert: true, new: true });
    }
    if (event) eventIds.push(event._id);
    if (draft.eligible) eligible += 1;
  }
  await NewsCandidate.updateOne({ _id: candidate._id }, { $set: {
    eventIds, status: eligible ? "eligible" : "excluded",
    reason: eligible ? null : drafts[0]?.reason || "no_supported_action"
  } });
  return { created: !existing, eligible, excluded: eligible ? 0 : 1, error: false };
}

export async function runNewsDiscovery(now = new Date(), options: { sources?: readonly SourceDefinition[]; read?: SourceReader } = {}) {
  await assertPipelineWriteIsolation();
  const token = await lock("Discovery", now);
  const runId = randomUUID();
  const sources = options.sources || NEWS_SOURCES;
  const read = options.read || fetchSourceText;
  const stats: DiscoveryStats = { runId, startedAt: now.toISOString(), completedAt: "", sources: {}, found: 0, created: 0, duplicates: 0, eligible: 0, excluded: 0, errors: 0 };
  try {
    const results = await Promise.allSettled(sources.map(async (source) => {
      const sourceStats: SourceStats = { found: 0, created: 0, duplicates: 0, eligible: 0, excluded: 0, errors: 0 };
      const items = await sourceListing(source, now, read);
      sourceStats.found = items.length;
      for (const material of items) {
        try {
          const result = await ingestMaterial(material, source, now, read);
          if (result.created) sourceStats.created += 1;
          else sourceStats.duplicates += 1;
          sourceStats.eligible += result.eligible;
          sourceStats.excluded += result.excluded;
          if (result.error) sourceStats.errors += 1;
        } catch (error) {
          sourceStats.errors += 1;
          console.warn("news_candidate_error", { source: source.id, reason: safeReason(error) });
        }
      }
      return sourceStats;
    }));
    results.forEach((result, index) => {
      const source = sources[index];
      const item = result.status === "fulfilled" ? result.value : { found: 0, created: 0, duplicates: 0, eligible: 0, excluded: 0, errors: 1, failure: safeReason(result.reason) };
      stats.sources[source.id] = item;
      stats.found += item.found;
      stats.created += item.created;
      stats.duplicates += item.duplicates;
      stats.eligible += item.eligible;
      stats.excluded += item.excluded;
      stats.errors += item.errors;
    });
    stats.completedAt = new Date().toISOString();
    await NewsRefreshState.updateOne({ _id: "global", pipelineDiscoveryLockToken: token }, { $set: {
      pipelineLastDiscoveryAt: new Date(), pipelineLastDiscoveryStats: stats,
      pipelineSourceHealth: Object.fromEntries(Object.entries(stats.sources).map(([id, item]) => [id, { lastCheckedAt: stats.completedAt, ok: !item.failure, failure: item.failure || null, ...item }]))
    } });
    if (results.every((result) => result.status === "rejected")) throw new Error("NEWS_ALL_SOURCES_UNAVAILABLE");
    return stats;
  } finally { await unlock("Discovery", token); }
}

export type { DiscoveryStats };

const EditorialResponse = z.object({ selected: z.array(z.string()).max(10) });

async function selectEventIds(events: Array<{ _id: mongoose.Types.ObjectId; titleAr: string; summaryAr: string; actionStage: string; authority: string; verification: string }>, maximum: number) {
  const ai = new GoogleGenAI({ apiKey: getRequiredEnv("GEMINI_API_KEY") });
  const config = getNewsConfig();
  const input = events.map((event) => ({ id: String(event._id), title: event.titleAr, evidence: event.summaryAr.slice(0, 360), stage: event.actionStage, authority: event.authority, verification: event.verification }));
  const prompt = `أنت محرر أخبار نشمي المدنية المحايد. اختر حتى ${maximum} أحداث موثقة ومهمة للمواطنين، مع أولوية قرارات مجلس الوزراء والوزارات، ثم التشريع والانتخابات والتطورات الحزبية الجوهرية. لا تختر الزيارات أو التصريحات العامة أو خبرًا لا يثبت مرحلته. لا تعِد صياغة الأخبار ولا تستنتج بدء النفاذ. أعد JSON فقط {"selected":["existing-id"]} بمعرفات من هذه القائمة حصراً: ${JSON.stringify(input)}`;
  const tryModel = async (model: string) => {
    const result = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json", temperature: 0, maxOutputTokens: 1000 } });
    const parsed = EditorialResponse.parse(JSON.parse(result.text || "{}"));
    if (parsed.selected.length > maximum || new Set(parsed.selected).size !== parsed.selected.length) throw new Error("NEWS_EDITORIAL_SELECTION_INVALID");
    const valid = new Set(input.map((item) => item.id));
    if (parsed.selected.some((id) => !valid.has(id))) throw new Error("NEWS_EDITORIAL_SELECTION_UNKNOWN_ID");
    return parsed.selected;
  };
  try { return { ids: await tryModel(config.discoveryModel), model: config.discoveryModel }; }
  catch (error) {
    if (config.discoveryFallbackModel === config.discoveryModel) throw error;
    return { ids: await tryModel(config.discoveryFallbackModel), model: config.discoveryFallbackModel };
  }
}

function eventSources(event: any) {
  return [...event.evidence].sort((a: any, b: any) => Number(b.sourceClass === "official") - Number(a.sourceClass === "official"))
    .slice(0, 6).map((item: any) => ({ title: item.sourceTitle, url: item.url, publisher: item.publisher, sourceClass: item.sourceClass }));
}

export async function publishEventBatch(events: any[], runId: string, token: string, now: Date) {
  if (!events.length) throw new Error("NEWS_BATCH_EMPTY");
  const candidates = events.map((event) => ({
    titleAr: event.titleAr, summaryAr: event.summaryAr.slice(0, 320).trimEnd(), category: event.category,
    urgency: "normal" as const, publishedAt: event.publishedAt.toISOString(), sources: eventSources(event)
  }));
  const documents = batchDocuments(candidates, runId, now, getNewsConfig().retentionDays).map((document, index) => ({
    ...document, eventId: events[index]._id, canonicalHash: sha256(`event|${events[index]._id}`),
    legislativeStage: events[index].actionStage === "effective" ? "effective" : events[index].actionStage === "gazette_published" ? "published" : events[index].actionStage === "proposal" ? "proposal" : null
  }));
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const inserted = await NewsItem.insertMany(documents, { session, ordered: true });
      if (inserted.length !== events.length) throw new Error("NEWS_BATCH_INCOMPLETE");
      await NewsItem.updateMany({ isActive: true, batchId: { $ne: runId } }, { $set: { isActive: false } }, { session });
      const swap = await NewsRefreshState.updateOne({ _id: "global", pipelineEditorialLockToken: token }, { $set: {
        currentBatchId: runId, currentBatchCreatedAt: now,
        currentBatchWindowStart: new Date(now.getTime() - NEWS_FRESHNESS_MS), currentBatchWindowEnd: now,
        pipelineLastPublishedAt: now
      } }, { session });
      if (swap.matchedCount !== 1) throw new Error("NEWS_EDITORIAL_LOCK_LOST");
      for (let index = 0; index < events.length; index++) {
        const event = events[index];
        const updated = await NewsEvent.updateOne({ _id: event._id, status: "eligible" }, { $set: {
          status: "published", selectedRunId: runId, publishedNewsItemId: inserted[index]._id
        } }, { session });
        if (updated.matchedCount !== 1) throw new Error("NEWS_EVENT_CHANGED_DURING_PUBLISH");
        // A single bulletin may still support other eligible, unselected events.
        // Event status is authoritative; do not mark its whole source as published.
      }
    });
  } finally { await session.endSession(); }
  return documents.length;
}

export async function runNewsEditorial(now = new Date(), choose: typeof selectEventIds = selectEventIds) {
  await assertPipelineWriteIsolation();
  const token = await lock("Editorial", now);
  const runId = randomUUID();
  try {
    // The 48-hour cap is always measured from the publisher's original date.
    // Older candidates remain archived and never gain freshness from lastSeenAt.
    const events = await NewsEvent.find({ status: "eligible", publishedAt: {
      $gte: new Date(now.getTime() - NEWS_FRESHNESS_MS), $lte: now
    } }).sort({ publishedAt: -1 }).limit(100);
    const filtered = events.filter((event) => event.evidence.length > 0 && event.verification !== "unclear" && event.actionStage !== "proposal");
    const maximum = getNewsConfig().maxNewItems;
    const selection = filtered.length ? await choose(filtered, maximum) : { ids: [], model: "none" };
    const selected = selection.ids.map((id) => filtered.find((event) => String(event._id) === id));
    if (selected.some((event) => !event) || new Set(selection.ids).size !== selection.ids.length || selected.length > maximum) throw new Error("NEWS_EDITORIAL_SELECTION_INVALID");
    const publishable = selected.filter((event): event is NonNullable<typeof event> => Boolean(event));
    const published = mayPublishNewPipeline() && publishable.length ? await publishEventBatch(publishable, runId, token, now) : 0;
    const stats = {
      runId, at: now.toISOString(), eligible: filtered.length, selected: publishable.length,
      selectedEventIds: selection.ids, published, model: selection.model,
      mode: mayPublishNewPipeline() ? "new" : "shadow"
    };
    await NewsRefreshState.updateOne({ _id: "global", pipelineEditorialLockToken: token }, { $set: { pipelineLastEditorialAt: new Date(), pipelineLastEditorialStats: stats } });
    return stats;
  } catch (error) {
    await NewsRefreshState.updateOne({ _id: "global", pipelineEditorialLockToken: token }, { $set: {
      pipelineLastEditorialAt: new Date(), pipelineLastEditorialStats: { runId, failed: safeReason(error), mode: "shadow_or_new" }
    } }).catch(() => undefined);
    throw error;
  } finally { await unlock("Editorial", token); }
}
