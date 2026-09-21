import { config } from "dotenv";
import { createHash } from "node:crypto";
import mongoose from "mongoose";
import { HeadObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

config({ path: ".env.local" });
config({ path: ".env" });

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  if (process.argv.includes("--repair")) throw new Error("This tool is intentionally read-only; repair individual findings through a reviewed migration run.");
  const bucket = required("R2_BUCKET_NAME");
  const accountId = required("R2_ACCOUNT_ID");
  const prefix = (process.env.R2_ENV_PREFIX?.trim() || "production").replace(/^\/+|\/+$/g, "") + "/";
  const client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT?.trim() || `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: required("R2_ACCESS_KEY_ID"), secretAccessKey: required("R2_SECRET_ACCESS_KEY") },
    forcePathStyle: true
  });
  await mongoose.connect(required("MONGODB_URI"), { serverSelectionTimeoutMS: 10_000 });
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB connection is unavailable");
  const assets = await db.collection("mediaassets").find({ provider: "cloudflare_r2" }).project({ storageKey: 1, sizeBytes: 1, status: 1 }).toArray();
  const keyToAsset = new Map(assets.map((asset) => [String(asset.storageKey), asset]));
  const missingReady: string[] = [];
  const wrongSize: string[] = [];
  const deletedButPresent: string[] = [];
  for (const asset of assets) {
    try {
      const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: String(asset.storageKey) }));
      if (head.ContentLength !== Number(asset.sizeBytes)) wrongSize.push(String(asset._id));
      if (asset.status === "deleted") deletedButPresent.push(String(asset._id));
    } catch (error) {
      const status = typeof error === "object" && error && "$metadata" in error ? (error as any).$metadata?.httpStatusCode : null;
      if (status === 404 && ["ready", "active"].includes(String(asset.status))) missingReady.push(String(asset._id));
      else if (status !== 404) throw error;
    }
  }
  const r2Keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: continuationToken }));
    for (const item of page.Contents || []) if (item.Key) r2Keys.push(item.Key);
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);
  const orphanKeys = r2Keys.filter((key) => !keyToAsset.has(key));
  const wrongProvider = await db.collection("mediaassets").countDocuments({ provider: { $ne: "cloudflare_r2" }, url: /^\/api\/media\// });
  console.log(JSON.stringify({
    mode: "read-only",
    checkedAt: new Date().toISOString(),
    databaseR2Assets: assets.length,
    r2ObjectsUnderPrefix: r2Keys.length,
    readyObjectMissing: missingReady.length,
    wrongSize: wrongSize.length,
    deletedObjectStillPresent: deletedButPresent.length,
    r2ObjectWithoutDatabaseRecord: orphanKeys.length,
    stableUrlWithWrongProvider: wrongProvider,
    findingIds: { missingReady, wrongSize, deletedButPresent },
    orphanKeyHashes: orphanKeys.map((key) => createHash("sha256").update(key).digest("hex").slice(0, 16))
  }, null, 2));
  if (missingReady.length || wrongSize.length || wrongProvider) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Storage reconciliation failed");
  process.exitCode = 1;
}).finally(() => mongoose.disconnect().catch(() => undefined));
