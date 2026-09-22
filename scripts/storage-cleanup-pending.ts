import { config } from "dotenv";
import mongoose from "mongoose";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

config({ path: ".env.local" });
config({ path: ".env" });

const execute = process.argv.includes("--execute");

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  await mongoose.connect(required("MONGODB_URI"), { serverSelectionTimeoutMS: 10_000 });
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB connection is unavailable");
  const expired = await db.collection("mediaassets").find({
    provider: "cloudflare_r2",
    status: "pending",
    uploadExpiresAt: { $lt: new Date(Date.now() - 60 * 60 * 1000) }
  }).project({ storageKey: 1 }).limit(500).toArray();
  console.log(JSON.stringify({ mode: execute ? "execute" : "dry-run", expiredPendingCount: expired.length, limit: 500 }, null, 2));
  if (!execute || !expired.length) return;
  const accountId = required("R2_ACCOUNT_ID");
  const bucket = required("R2_BUCKET_NAME");
  const client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT?.trim() || `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: required("R2_ACCESS_KEY_ID"), secretAccessKey: required("R2_SECRET_ACCESS_KEY") },
    forcePathStyle: true
  });
  let cleaned = 0;
  let failed = 0;
  for (const asset of expired) {
    try {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: String(asset.storageKey) }));
      const result = await db.collection("mediaassets").updateOne(
        { _id: asset._id, status: "pending" },
        { $set: { status: "failed", failureReason: "upload_abandoned", deletedAt: new Date() } }
      );
      cleaned += result.modifiedCount;
    } catch {
      failed += 1;
    }
  }
  console.log(JSON.stringify({ cleaned, failed }, null, 2));
  if (failed) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Pending upload cleanup failed");
  process.exitCode = 1;
}).finally(() => mongoose.disconnect().catch(() => undefined));
