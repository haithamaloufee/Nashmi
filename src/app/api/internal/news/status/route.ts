import mongoose from "mongoose";
import { fail, handleApiError, ok } from "@/lib/apiResponse";
import { getMongoUri, getRequiredEnv } from "@/lib/env";
import { getNewsPipelineMode, mayPublishNewPipeline } from "@/lib/news/pipelineMode";
import { getNewsConfig } from "@/lib/news/config";
import { verifyNewsRefreshSignatureWithSecret } from "@/lib/news/securityCore";

export const dynamic = "force-dynamic";

/** Authenticated operational inspection; native driver avoids model/index writes. */
export async function GET(request: Request) {
  let client: mongoose.mongo.MongoClient | undefined;
  try {
    const secret = getRequiredEnv("NEWS_DISCOVERY_SECRET");
    if (secret.length < 32) throw new Error("NEWS_DISCOVERY_SECRET_INVALID");
    verifyNewsRefreshSignatureWithSecret(request, secret, Date.now(), "/api/internal/news/status", "GET");
    client = new mongoose.mongo.MongoClient(getMongoUri(), { serverSelectionTimeoutMS: 10_000 });
    await client.connect();
    const db = client.db();
    const [state, candidates, events, reasonCounts, publicCount] = await Promise.all([
      db.collection("newsrefreshstates").findOne({ _id: "global" as any }, { projection: { currentBatchId: 1, currentBatchCreatedAt: 1, pipelineLastDiscoveryStats: 1, pipelineLastEditorialStats: 1, pipelineSourceHealth: 1, pipelinePublishedJordanDay: 1 } }),
      db.collection("newscandidates").countDocuments({}),
      db.collection("newsevents").aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]).toArray(),
      db.collection("newsevents").aggregate([{ $group: { _id: "$reason", count: { $sum: 1 } } }]).toArray(),
      db.collection("newsitems").countDocuments({ status: "published", isActive: true, expiresAt: { $gt: new Date() } })
    ]);
    return ok({ environment: process.env.VERCEL_ENV || "local", database: db.databaseName, mode: getNewsPipelineMode(), publicationEnabled: mayPublishNewPipeline(), maxNewItems: getNewsConfig().maxNewItems, commit: process.env.VERCEL_GIT_COMMIT_SHA || null, candidates, events, reasonCounts, activePublishedItems: publicCount, state }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Error && ["NEWS_SIGNATURE_EXPIRED", "NEWS_SIGNATURE_INVALID"].includes(error.message)) return fail("UNAUTHORIZED", "توقيع طلب الفحص غير صالح", 401);
    return handleApiError(error, request);
  } finally { await client?.close().catch(() => undefined); }
}
