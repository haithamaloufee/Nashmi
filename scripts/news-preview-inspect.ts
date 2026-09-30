import { readFileSync } from "node:fs";
import { mongo } from "mongoose";
import { parse } from "dotenv";
import { verifyNewsPreviewIsolation } from "../src/lib/news/previewIsolation";
import { NEWS_FRESHNESS_MS } from "../src/lib/news/pipelineCore";

async function main() {
  process.env.MONGODB_URI = parse(readFileSync(".env.preview.local")).MONGODB_URI;
  process.env.VERCEL_ENV = "preview";
  const isolation = await verifyNewsPreviewIsolation();
  const client = new mongo.MongoClient(process.env.MONGODB_URI!);
  try {
    await client.connect();
    const db = client.db();
    const candidates = await db.collection("newscandidates").find({}).toArray();
    const events = await db.collection("newsevents").find({}).toArray();
    const state = await db.collection("newsrefreshstates").findOne({ _id: "global" as any });
    const candidateById = new Map(candidates.map((candidate) => [String(candidate._id), candidate]));
    const countBy = (key: string) => events.reduce<Record<string, number>>((counts, event) => {
      const value = String(event[key] || "eligible");
      counts[value] = (counts[value] || 0) + 1;
      return counts;
    }, {});
    const eligibleNow = events.filter((event) => event.status === "eligible" && event.publishedAt.getTime() >= Date.now() - NEWS_FRESHNESS_MS && event.publishedAt.getTime() <= Date.now());
    const invalidEvidence = events.filter((event) => !event.evidence?.length || event.evidence.some((evidence: any) => {
      const candidate = candidateById.get(String(evidence.candidateId));
      return !candidate || !evidence.passage || evidence.url !== candidate.originalUrl || evidence.publisher !== candidate.publisher || !candidate.eventIds?.some((id: any) => String(id) === String(event._id));
    }));
    const result = {
      isolation, inspectedAt: new Date().toISOString(), candidates: candidates.length, events: events.length,
      reasonCounts: countBy("reason"), stageCounts: countBy("actionStage"), eligibleNow: eligibleNow.length,
      invalidEvidence: invalidEvidence.length,
      publicItems: await db.collection("newsitems").countDocuments({}),
      currentBatchId: state?.currentBatchId || null,
      discovery: state?.pipelineLastDiscoveryStats || null, editorial: state?.pipelineLastEditorialStats || null,
      eligibleExamples: eligibleNow.map((event) => ({ title: event.titleAr, stage: event.actionStage, publishedAt: event.publishedAt, url: event.evidence[0]?.url }))
    };
    if (invalidEvidence.length) throw new Error("PREVIEW_EVENT_EVIDENCE_INVALID");
    console.log(JSON.stringify(result, null, 2));
  } finally { await client.close(); }
}

main().catch((error) => { console.error(error instanceof Error ? error.name : "PREVIEW_INSPECTION_FAILED"); process.exit(1); });
