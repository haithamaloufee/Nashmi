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
    const result = {
      observedAt: at.toISOString(), first, second, editorial,
      storedCandidates: await NewsCandidate.countDocuments({}),
      storedEvents: await NewsEvent.countDocuments({}),
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
