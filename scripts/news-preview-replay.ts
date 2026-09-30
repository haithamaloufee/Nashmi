import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import mongoose from "mongoose";
import { parse } from "dotenv";
import { verifyNewsPreviewIsolation } from "../src/lib/news/previewIsolation";
import { runNewsDiscovery, runNewsEditorial } from "../src/lib/news/pipeline";
import { fetchSourceText } from "../src/lib/news/sourceFetch";
import { NEWS_SOURCES } from "../src/lib/news/sourceRegistry";
import { NEWS_FRESHNESS_MS } from "../src/lib/news/pipelineCore";
import NewsCandidate from "../src/models/NewsCandidate";
import NewsEvent from "../src/models/NewsEvent";
import NewsItem from "../src/models/NewsItem";
import NewsRefreshState from "../src/models/NewsRefreshState";

async function main() {
  process.env.MONGODB_URI = parse(readFileSync(".env.preview.local")).MONGODB_URI;
  process.env.VERCEL_ENV = "preview";
  process.env.NEWS_PIPELINE_MODE = "shadow";
  process.env.NEWS_AUTO_PUBLISH = "false";
  const isolation = await verifyNewsPreviewIsolation();
  const cache = new Map<string, string>();
  const cachedRead: typeof fetchSourceText = async (url, source, maximum) => {
    if (!cache.has(url)) cache.set(url, await fetchSourceText(url, source, maximum));
    return cache.get(url)!;
  };
  try {
    const now = new Date();
    const first = await runNewsDiscovery(now, { read: cachedRead });
    const beforeRepeat = { candidates: await NewsCandidate.countDocuments({}), events: await NewsEvent.countDocuments({}) };
    const second = await runNewsDiscovery(now, { read: cachedRead });
    assert.equal(second.created, 0);
    assert.equal(await NewsCandidate.countDocuments({}), beforeRepeat.candidates);
    assert.equal(await NewsEvent.countDocuments({}), beforeRepeat.events);
    assert.equal(second.duplicates, second.found);
    const failedSource = NEWS_SOURCES[1];
    const partial = await runNewsDiscovery(now, { sources: NEWS_SOURCES.slice(0, 2), read: async (url, source, maximum) => {
      if (source.id === failedSource.id) throw new Error("SIMULATED_SOURCE_FAILURE");
      return cachedRead(url, source, maximum);
    } });
    assert.ok(partial.sources[NEWS_SOURCES[0].id].found > 0);
    assert.equal(partial.sources[failedSource.id].errors, 1);
    const publicBefore = await NewsItem.countDocuments({});
    const batchBefore = (await NewsRefreshState.findById("global"))?.currentBatchId || null;
    const atExpiry = new Date(now.getTime() + NEWS_FRESHNESS_MS + 1);
    const expiry = await runNewsEditorial(atExpiry, async () => { throw new Error("EXPIRED_EVENT_REACHED_EDITORIAL"); });
    assert.equal(expiry.eligible, 0);
    assert.equal(expiry.published, 0);
    assert.equal(await NewsItem.countDocuments({}), publicBefore);
    assert.equal((await NewsRefreshState.findById("global"))?.currentBatchId || null, batchBefore);
    console.log(JSON.stringify({ environment: "isolated_preview_database_via_local_harness", isolation, first, beforeRepeat, second, partialFailure: partial, simulatedExpiry: expiry, publicItems: publicBefore, currentBatchId: batchBefore }, null, 2));
  } finally { await mongoose.disconnect(); }
}

main().catch((error) => { console.error(error instanceof Error ? error.name : "PREVIEW_REPLAY_FAILED"); process.exit(1); });
