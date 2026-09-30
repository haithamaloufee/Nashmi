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
import { verifyNewsPreviewIsolation } from "@/lib/news/previewIsolation";
import { fetchSourceText, fetchSourceDocument, type SourceFetchMetrics } from "@/lib/news/sourceFetch";
import { NEWS_SOURCES, parseGovernmentArchive, parseGovernmentDetail, parseGovernmentDetailHeadline, parseMamlakaOriginalPublication, parseRegisteredFeed, type SourceDefinition, type SourceMaterial } from "@/lib/news/sourceRegistry";
import NewsCandidate from "@/models/NewsCandidate";
import NewsEvent from "@/models/NewsEvent";
import NewsItem from "@/models/NewsItem";
import NewsRefreshState from "@/models/NewsRefreshState";
import NewsSourceCache from "@/models/NewsSourceCache";
import NewsRefreshReplay from "@/models/NewsRefreshReplay";

const ARCHIVE_MS = 180 * 24 * 60 * 60_000;
const LOCK_MS = 15 * 60_000;
const EXTRACTION_VERSION = 4;
const indexReadiness = new Map<string, Promise<unknown>>();

type SourceStats = { found: number; created: number; duplicates: number; eligible: number; excluded: number; errors: number; failure?: string; metrics?: SourceFetchMetrics & { durationMs: number } };
type DiscoveryStats = { runId: string; startedAt: string; completedAt: string; sources: Record<string, SourceStats>; found: number; created: number; duplicates: number; eligible: number; excluded: number; errors: number };
type SourceReader = typeof fetchSourceText;

function safeReason(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 120).replace(/https?:\/\/\S+/g, "[url]") : "unknown";
}

export async function assertPipelineWriteIsolation() {
  if (process.env.VERCEL_ENV === "preview") {
    await verifyNewsPreviewIsolation();
  } else if (process.env.VERCEL_ENV !== "production") {
    // Local runs use only a disposable replica set with an explicit test marker.
    if (process.env.NEWS_PIPELINE_TEST_DB !== "true" || !/^mongodb:\/\/(127\.0\.0\.1|localhost):\d+\/nashmi_news_pipeline_test(?:\?|$)/.test(getMongoUri())) {
      throw new Error("NEWS_PIPELINE_LOCAL_WRITE_DISABLED");
    }
  }
  const connection = await connectToDatabase();
  if (!connection.connection.db) throw new Error("NEWS_DATABASE_UNAVAILABLE");
  // Vercel disables Mongoose autoIndex. Uniqueness must exist before any ingestion
  // or publication; createIndexes is additive and never removes existing indexes.
  const indexKey = `${connection.connection.host}:${connection.connection.port}/${connection.connection.db.databaseName}`;
  if (!indexReadiness.has(indexKey)) {
    const ready = Promise.all([NewsCandidate.createIndexes(), NewsEvent.createIndexes(), NewsItem.createIndexes(), NewsRefreshReplay.createIndexes(), NewsSourceCache.createIndexes()]).catch((error) => { indexReadiness.delete(indexKey); throw error; });
    indexReadiness.set(indexKey, ready);
  }
  await indexReadiness.get(indexKey);
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

async function cachedSourceListing(source: SourceDefinition, now: Date, metrics: SourceFetchMetrics): Promise<SourceMaterial[]> {
  const cached = await NewsSourceCache.findById(source.id).lean() as any;
  const response = await fetchSourceDocument(source.url, source, 800_000, { etag: cached?.etag, lastModified: cached?.lastModified }, metrics);
  if (response.notModified) {
    if (!cached) throw new Error("NEWS_SOURCE_CACHE_MISSING");
    return cached.materials.map((material: any) => ({ ...material, publishedAt: new Date(material.publishedAt) }));
  }
  const materials = source.access === "public_archive" ? parseGovernmentArchive(response.text, source) : parseRegisteredFeed(response.text, source, now);
  if (!materials.length) throw new Error("NEWS_SOURCE_LIST_LAYOUT_CHANGED_OR_EMPTY");
  await NewsSourceCache.updateOne({ _id: source.id }, { $set: { etag: response.etag || null, lastModified: response.lastModified || null, materials, checkedAt: now, expiresAt: new Date(now.getTime() + 24 * 60 * 60_000) } }, { upsert: true });
  return materials;
}

async function findMatchingEvent(draft: EventDraft) {
  const nearby = await NewsEvent.find({
    authority: draft.authority, actionStage: draft.actionStage,
    ...(draft.scheduledAt ? { scheduledAt: draft.scheduledAt } : { publishedAt: { $gte: new Date(draft.publishedAt.getTime() - 2 * 24 * 60 * 60_000), $lte: new Date(draft.publishedAt.getTime() + 2 * 24 * 60 * 60_000) } })
  }).limit(40);
  return nearby.find((event) => sameNewsEvent(draft, { titleAr: event.titleAr, authority: event.authority, actionStage: event.actionStage, publishedAt: event.publishedAt, attributedTo: event.attributedTo || undefined, scheduledAt: event.scheduledAt || undefined, eventStatus: event.eventStatus || undefined }));
}

async function ingestMaterial(material: SourceMaterial, source: SourceDefinition, now: Date, read: SourceReader) {
  material = { ...material, publicationVerified: source.id === "roya" ? false : material.publicationVerified, aiInputAllowed: source.aiInputAllowed !== false && material.aiInputAllowed !== false };
  const urlHash = sourceUrlHash(material.url);
  const existing = await NewsCandidate.findOne({ sourceId: source.id, urlHash });
  if (existing && existing.status !== "error" && existing.extractionVersion === EXTRACTION_VERSION) {
    await NewsCandidate.updateOne({ _id: existing._id }, { $set: { lastSeenAt: now } });
    return { created: false, eligible: 0, excluded: 0, error: false };
  }
  // Rediscovery/classifier upgrades must never renew a publisher's original date.
  if (existing) material = { ...material, publishedAt: existing.publishedAt };

  let paragraphs = material.paragraphs;
  let detailHeadline: string | undefined;
  let publicationFailure: string | undefined;
  if (source.id === "mamlaka") {
    try {
      const originalDate = parseMamlakaOriginalPublication(await read(material.url, source, 500_000));
      material = { ...material, publishedAt: existing ? new Date(Math.min(existing.publishedAt.getTime(), originalDate.getTime())) : originalDate, publicationVerified: true };
    } catch (error) {
      publicationFailure = safeReason(error);
      material = { ...material, publicationVerified: false };
    }
  }
  if (source.access === "public_archive") {
    try {
      const detailHtml = await read(material.url, source, 500_000);
      paragraphs = parseGovernmentDetail(detailHtml);
      detailHeadline = parseGovernmentDetailHeadline(detailHtml) || undefined;
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
      publicationVerified: material.publicationVerified !== false, aiInputAllowed: material.aiInputAllowed !== false,
      status: "validated", reason: null, extractionVersion: EXTRACTION_VERSION
    }, $setOnInsert: { firstDiscoveredAt: now, archiveUntil: new Date(now.getTime() + ARCHIVE_MS) } },
    { upsert: true, new: true }
  );
  if (!candidate) throw new Error("NEWS_CANDIDATE_WRITE_FAILED");

  const drafts = eventDraftsFromMaterial({ ...material, detailHeadline, paragraphs }, now);
  const eventIds: mongoose.Types.ObjectId[] = [];
  let eligible = 0;
  for (const draft of drafts) {
    const matching = await findMatchingEvent(draft);
    const evidence = { candidateId: candidate._id, url: material.url, publisher: material.publisher, sourceTitle: material.title, sourceClass: material.sourceClass, passage: draft.passage, aiInputAllowed: material.aiInputAllowed !== false };
    let event;
    if (matching) {
      const permittedCanonical = material.aiInputAllowed !== false && (!matching.aiInputAllowed || draft.verification === "official");
      if (!matching.evidence.some((item) => String(item.candidateId) === String(candidate._id))) {
        matching.evidence.push(evidence);
      } else {
        const currentEvidence = matching.evidence.find((item) => String(item.candidateId) === String(candidate._id));
        if (currentEvidence) currentEvidence.aiInputAllowed = evidence.aiInputAllowed;
      }
        if (permittedCanonical && !["published", "hidden"].includes(matching.status)) {
          matching.titleAr = draft.titleAr;
          matching.summaryAr = draft.summaryAr;
          matching.aiInputAllowed = true;
        }
        if (!draft.eligible && matching.evidence.every((item) => String(item.candidateId) === String(candidate._id)) && !["published", "hidden"].includes(matching.status)) {
          matching.status = "excluded";
          matching.reason = draft.reason;
          matching.aiInputAllowed = material.aiInputAllowed !== false;
        }
        matching.lastSeenAt = now;
        matching.publishedAt = new Date(Math.min(matching.publishedAt.getTime(), material.publishedAt.getTime()));
        matching.eventKind = draft.eventKind;
        matching.eventStatus = draft.eventStatus;
        matching.scheduledAt = draft.scheduledAt || null;
        matching.attributedTo = draft.attributedTo || null;
        if (draft.verification === "official") matching.verification = "official";
        if (draft.eligible && matching.status === "excluded" && matching.reason !== "older_than_48_hours" && matching.publishedAt.getTime() >= now.getTime() - NEWS_FRESHNESS_MS) {
          matching.status = "eligible";
          matching.reason = null;
        }
        await matching.save();
      event = matching;
    } else {
      event = await NewsEvent.findOneAndUpdate({ eventKey: draft.eventKey }, { $setOnInsert: {
        ...draft, aiInputAllowed: material.aiInputAllowed !== false, evidence: [evidence], firstDiscoveredAt: now, lastSeenAt: now,
        status: draft.eligible ? "eligible" : "excluded", reason: draft.reason,
        archiveUntil: new Date(now.getTime() + ARCHIVE_MS)
      } }, { upsert: true, new: true });
    }
    if (event) eventIds.push(event._id);
    if (draft.eligible) eligible += 1;
  }
  if (existing && existing.extractionVersion !== EXTRACTION_VERSION) {
    await NewsEvent.updateMany({ _id: { $in: existing.eventIds, $nin: eventIds }, status: { $in: ["eligible", "excluded", "validated"] }, "evidence.candidateId": candidate._id }, { $set: { status: "excluded", reason: "extraction_superseded" } });
  }
  await NewsCandidate.updateOne({ _id: candidate._id }, { $set: {
    status: publicationFailure ? "error" : eligible ? "eligible" : "excluded",
    reason: publicationFailure || (eligible ? null : drafts[0]?.reason || "no_supported_action")
  }, $addToSet: { eventIds: { $each: eventIds } } });
  return { created: !existing, eligible, excluded: eligible ? 0 : 1, error: Boolean(publicationFailure) };
}

export async function runNewsDiscovery(now = new Date(), options: { sources?: readonly SourceDefinition[]; read?: SourceReader } = {}) {
  await assertPipelineWriteIsolation();
  const token = await lock("Discovery", now);
  const runId = randomUUID();
  const sources = options.sources || NEWS_SOURCES;
  const read = options.read || fetchSourceText;
  const stats: DiscoveryStats = { runId, startedAt: now.toISOString(), completedAt: "", sources: {}, found: 0, created: 0, duplicates: 0, eligible: 0, excluded: 0, errors: 0 };
  try {
    await NewsEvent.updateMany({ status: "eligible", publishedAt: { $lt: new Date(now.getTime() - NEWS_FRESHNESS_MS) } }, { $set: { status: "excluded", reason: "older_than_48_hours" } });
    await NewsCandidate.updateMany({ status: "eligible", publishedAt: { $lt: new Date(now.getTime() - NEWS_FRESHNESS_MS) } }, { $set: { status: "excluded", reason: "older_than_48_hours" } });
    const results = await Promise.allSettled(sources.map(async (source) => {
      const sourceStarted = Date.now();
      const metrics: SourceFetchMetrics = { requests: 0, bytes: 0, retries: 0, cacheHits: 0 };
      const sourceStats: SourceStats = { found: 0, created: 0, duplicates: 0, eligible: 0, excluded: 0, errors: 0, metrics: { ...metrics, durationMs: 0 } };
      try {
      const sourceRead: SourceReader = options.read ? read : async (url, definition, maximum) => {
        if (Date.now() - sourceStarted > 120_000) throw new Error("NEWS_SOURCE_TIME_BUDGET_EXHAUSTED");
        return (await fetchSourceDocument(url, definition, maximum, {}, metrics)).text;
      };
      const items = options.read ? await sourceListing(source, now, read) : await cachedSourceListing(source, now, metrics);
      sourceStats.found = items.length;
      for (const material of items) {
        try {
          const result = await ingestMaterial(material, source, now, sourceRead);
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
      } catch (error) {
        sourceStats.errors += 1;
        sourceStats.failure = safeReason(error);
      }
      sourceStats.metrics = { ...metrics, durationMs: Date.now() - sourceStarted };
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
      pipelineSourceHealth: Object.fromEntries(Object.entries(stats.sources).map(([id, item]) => [id, { lastCheckedAt: stats.completedAt, ok: !item.failure && item.errors === 0, failure: item.failure || null, ...item }]))
    } });
    if (Object.values(stats.sources).every((item) => item.failure)) throw new Error("NEWS_ALL_SOURCES_UNAVAILABLE");
    return stats;
  } finally { await unlock("Discovery", token); }
}

export type { DiscoveryStats };

const EditorialResponse = z.object({ selected: z.array(z.string()).max(20) });

type Selection = { ids: string[]; model: string; metrics?: { calls: number; promptTokens: number; outputTokens: number; tokensReported: boolean } };
export async function selectEventIds(events: Array<{ _id: mongoose.Types.ObjectId; titleAr: string; summaryAr: string; actionStage: string; authority: string; verification: string }>, maximum: number): Promise<Selection> {
  const ai = new GoogleGenAI({ apiKey: getRequiredEnv("GEMINI_API_KEY") });
  const config = getNewsConfig();
  const metrics = { calls: 0, promptTokens: 0, outputTokens: 0, tokensReported: false };
  const input = events.map((event) => ({ id: String(event._id), title: event.titleAr, evidence: event.summaryAr.slice(0, 360), stage: event.actionStage, authority: event.authority, verification: event.verification }));
  const prompt = `أنت محرر أخبار نشمي المدنية المحايد. اختر حتى ${maximum} أحداث موثقة للمواطنين، بأولوية الأثر المدني والحداثة والمصدر الرسمي وتنوع المواضيع دون حصص أو تفضيل سياسي. يشمل النطاق قرارات الحكومة والتشريع والانتخابات والجلسات ومواعيدها واجتماعات اللجان والرقابة والتصريحات والأنشطة الحزبية العامة. لا تشترط قرارًا حكوميًا لأخبار البرلمان أو الأحزاب. انسب المواقف والادعاءات إلى أصحابها ولا تحول المناقشة أو المشروع إلى قرار نافذ. لا تختَر الزيارات الحكومية الروتينية أو خبرًا بلا دليل. لا تعِد صياغة الأخبار ولا تولد وقائع. أعد JSON فقط {"selected":["existing-id"]} بمعرفات من هذه القائمة حصراً: ${JSON.stringify(input)}`;
  const tryModel = async (model: string) => {
    metrics.calls += 1;
    const result = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json", temperature: 0, maxOutputTokens: 1000 } });
    if (result.usageMetadata) {
      metrics.tokensReported = true;
      metrics.promptTokens += result.usageMetadata.promptTokenCount || 0;
      metrics.outputTokens += result.usageMetadata.candidatesTokenCount || 0;
    }
    const parsed = EditorialResponse.parse(JSON.parse(result.text || "{}"));
    if (parsed.selected.length > maximum || new Set(parsed.selected).size !== parsed.selected.length) throw new Error("NEWS_EDITORIAL_SELECTION_INVALID");
    const valid = new Set(input.map((item) => item.id));
    if (parsed.selected.some((id) => !valid.has(id))) throw new Error("NEWS_EDITORIAL_SELECTION_UNKNOWN_ID");
    return parsed.selected;
  };
  try { return { ids: await tryModel(config.discoveryModel), model: config.discoveryModel, metrics }; }
  catch (error) {
    if (config.discoveryFallbackModel === config.discoveryModel) throw error;
    return { ids: await tryModel(config.discoveryFallbackModel), model: config.discoveryFallbackModel, metrics };
  }
}

function eventSources(event: any) {
  return [...event.evidence].filter((item: any) => item.aiInputAllowed !== false && NEWS_SOURCES.find((source) => source.publisher === item.publisher)?.aiInputAllowed !== false).sort((a: any, b: any) => Number(b.sourceClass === "official") - Number(a.sourceClass === "official"))
    .slice(0, 6).map((item: any) => ({ title: item.sourceTitle, url: item.url, publisher: item.publisher, sourceClass: item.sourceClass }));
}

export async function publishEventBatch(events: any[], runId: string, token: string, now: Date) {
  const disposableLocalTest = process.env.NEWS_PIPELINE_TEST_DB === "true" && !["production", "preview"].includes(process.env.VERCEL_ENV || "") && /^mongodb:\/\/(127\.0\.0\.1|localhost):\d+\/nashmi_news_pipeline_test(?:\?|$)/.test(getMongoUri());
  if (!mayPublishNewPipeline() && !disposableLocalTest) throw new Error("NEWS_PUBLICATION_DISABLED");
  await assertPipelineWriteIsolation();
  if (!events.length) throw new Error("NEWS_BATCH_EMPTY");
  if (events.length > Math.min(20, getNewsConfig().maxNewItems)) throw new Error("NEWS_BATCH_TOO_LARGE");
  if (events.some((event) => event.aiInputAllowed === false || !eventSources(event).length)) throw new Error("NEWS_BATCH_SOURCE_USE_PROHIBITED");
  if (events.some((event) => !event.evidence?.length || event.verification === "unclear" || event.publishedAt.getTime() < now.getTime() - NEWS_FRESHNESS_MS || event.publishedAt.getTime() > now.getTime())) throw new Error("NEWS_BATCH_UNSUPPORTED_EVENT");
  const candidates = events.map((event) => ({
    titleAr: event.titleAr, summaryAr: event.summaryAr.slice(0, 320).trimEnd(), category: event.category,
    urgency: "normal" as const, publishedAt: event.publishedAt.toISOString(), sources: eventSources(event)
  }));
  const documents = batchDocuments(candidates, runId, now, getNewsConfig().retentionDays).map((document, index) => ({
    ...document, eventId: events[index]._id, canonicalHash: sha256(`event|${events[index]._id}`),
    eventKind: events[index].eventKind, eventStatus: events[index].eventStatus, scheduledAt: events[index].scheduledAt || null, attributedTo: events[index].attributedTo || null,
    legislativeStage: events[index].actionStage === "effective" ? "effective" : events[index].actionStage === "gazette_published" ? "published" : ["committee_adopted", "referred_to_committee"].includes(events[index].actionStage) ? "committee" : events[index].actionStage === "parliament_approved" ? (events[index].authority === "مجلس الأعيان" ? "senate" : "lower_house") : ["proposal", "cabinet_approved_reasons", "cabinet_approved_draft", "referred_to_parliament"].includes(events[index].actionStage) ? "proposal" : null
  }));
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const inserted = await NewsItem.insertMany(documents, { session, ordered: true });
      if (inserted.length !== events.length) throw new Error("NEWS_BATCH_INCOMPLETE");
      await NewsItem.updateMany({ isActive: true, batchId: { $ne: runId } }, { $set: { isActive: false } }, { session });
      const swap = await NewsRefreshState.updateOne({ _id: "global", pipelineEditorialLockToken: token, ...(process.env.VERCEL_ENV === "production" ? { pipelinePublishedJordanDay: { $ne: jordanEditorialDay(now) } } : {}) }, { $set: {
        currentBatchId: runId, currentBatchCreatedAt: now,
        currentBatchWindowStart: new Date(now.getTime() - NEWS_FRESHNESS_MS), currentBatchWindowEnd: now,
        pipelineLastPublishedAt: now, pipelinePublishedJordanDay: jordanEditorialDay(now)
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

export function jordanEditorialDay(now: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Amman", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export async function runNewsEditorial(now = new Date(), choose: typeof selectEventIds = selectEventIds) {
  await assertPipelineWriteIsolation();
  const token = await lock("Editorial", now);
  const runId = randomUUID();
  try {
    const state = await NewsRefreshState.findById("global");
    if (process.env.VERCEL_ENV === "production" && mayPublishNewPipeline() && state?.pipelinePublishedJordanDay === jordanEditorialDay(now)) {
      return { runId, at: now.toISOString(), eligible: 0, selected: 0, selectedEventIds: [], published: 0, model: "none", mode: "new", skipped: "already_published_today" };
    }
    // The 48-hour cap is always measured from the publisher's original date.
    // Older candidates remain archived and never gain freshness from lastSeenAt.
    const events = await NewsEvent.find({ status: "eligible", publishedAt: {
      $gte: new Date(now.getTime() - NEWS_FRESHNESS_MS), $lte: now
    } }).sort({ publishedAt: -1 }).limit(100);
    const filtered = events.filter((event) => event.aiInputAllowed !== false && eventSources(event).length > 0 && event.verification !== "unclear");
    const maximum = getNewsConfig().maxNewItems;
    const selection = filtered.length ? await choose(filtered, maximum) : { ids: [], model: "none" };
    const selected = selection.ids.map((id) => filtered.find((event) => String(event._id) === id));
    if (selected.some((event) => !event) || new Set(selection.ids).size !== selection.ids.length || selected.length > maximum) throw new Error("NEWS_EDITORIAL_SELECTION_INVALID");
    const publishable = selected.filter((event): event is NonNullable<typeof event> => Boolean(event));
    const published = mayPublishNewPipeline() && publishable.length ? await publishEventBatch(publishable, runId, token, now) : 0;
    const stats = {
      runId, at: now.toISOString(), eligible: filtered.length, selected: publishable.length,
      selectedEventIds: selection.ids, published, model: selection.model, metrics: selection.metrics || null,
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
