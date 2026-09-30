import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { runNewsDiscovery, runNewsEditorial } from "../src/lib/news/pipeline";
import NewsCandidate from "../src/models/NewsCandidate";
import NewsEvent from "../src/models/NewsEvent";
import NewsItem from "../src/models/NewsItem";
import NewsRefreshState from "../src/models/NewsRefreshState";

async function main() {
  const database = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  process.env.MONGODB_URI = database.getUri("nashmi_news_pipeline_test");
  process.env.NEWS_PIPELINE_TEST_DB = "true";
  process.env.NEWS_PIPELINE_MODE = "shadow";
  try {
    const at = new Date();
    const first = await runNewsDiscovery(at);
    const second = await runNewsDiscovery(at);
    const editorial = await runNewsEditorial(at, async () => ({ ids: [], model: "no-selection-dry-run" }));
    const events = await NewsEvent.find({}).select("titleAr status reason actionStage publishedAt evidence").lean();
    const reasonCounts = Object.fromEntries([...new Set(events.map((event) => event.reason || "eligible"))].map((reason) => [reason, events.filter((event) => (event.reason || "eligible") === reason).length]));
    const reasonByPublisher = Object.fromEntries([...new Set(events.map((event) => event.evidence[0]?.publisher || "unknown"))].map((publisher) => [publisher, Object.fromEntries([...new Set(events.filter((event) => (event.evidence[0]?.publisher || "unknown") === publisher).map((event) => event.reason || "eligible"))].map((reason) => [reason, events.filter((event) => (event.evidence[0]?.publisher || "unknown") === publisher && (event.reason || "eligible") === reason).length]))]));
    const stageCounts = Object.fromEntries([...new Set(events.map((event) => event.actionStage))].map((stage) => [stage, events.filter((event) => event.actionStage === stage).length]));
    const excludedSample = [...new Set(events.filter((event) => event.reason).map((event) => `${event.reason}|${event.evidence[0]?.publisher || "unknown"}`))].flatMap((key) => {
      const [reason, publisher] = key.split("|");
      return events.filter((event) => event.reason === reason && event.evidence[0]?.publisher === publisher).slice(0, 2).map((event) => ({ reason, publisher, title: event.titleAr, stage: event.actionStage, publishedAt: event.publishedAt, url: event.evidence[0]?.url }));
    });
    const result = {
      observedAt: at.toISOString(), first, second, editorial,
      storedCandidates: await NewsCandidate.countDocuments({}),
      storedEvents: events.length, reasonCounts, reasonByPublisher, stageCounts, excludedSample,
      eligibleEvents: await NewsEvent.find({ status: "eligible" }).select("titleAr actionStage publishedAt").lean(),
      publicItems: await NewsItem.countDocuments({}),
      currentBatchId: (await NewsRefreshState.findById("global"))?.currentBatchId || null
    };
    if (second.created !== 0 || result.publicItems !== 0 || result.currentBatchId !== null) throw new Error("NEWS_LIVE_REPLAY_INVARIANT_FAILED");
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await mongoose.disconnect();
    await database.stop();
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
