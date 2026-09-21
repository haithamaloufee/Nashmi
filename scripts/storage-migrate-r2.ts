import { createHash } from "node:crypto";
import { Readable, Transform } from "node:stream";
import { config } from "dotenv";
import mongoose, { type AnyBulkWriteOperation } from "mongoose";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

config({ path: ".env.local" });
config({ path: ".env" });

const execute = process.argv.includes("--execute");
const pilot = process.argv.includes("--pilot");
const concurrency = Math.max(1, Math.min(8, Number(process.env.R2_MIGRATION_CONCURRENCY || "3")));
const maximumBytes = 250 * 1024 * 1024;
const blobSuffix = ".public.blob.vercel-storage.com";

type Reference = { collection: string; id: mongoose.Types.ObjectId; field: string; ownerUserId: mongoose.Types.ObjectId; purpose: string };
type Candidate = {
  sourceUrl: string;
  sourceStorageKey: string | null;
  ownerUserId: mongoose.Types.ObjectId;
  purpose: string;
  mediaAssetId: mongoose.Types.ObjectId | null;
  references: Reference[];
};

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function isBlobUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(blobSuffix) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function contentType(value: string | null) {
  return value?.split(";", 1)[0]?.trim().toLowerCase() || "application/octet-stream";
}

function extensionFor(type: string) {
  return ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "video/mp4": "mp4", "video/webm": "webm", "application/pdf": "pdf" } as Record<string, string>)[type] || "bin";
}

function purposeDetails(purpose: string) {
  if (purpose === "avatar") return { resourceType: "avatar", visibility: "public", type: "image" };
  if (purpose.startsWith("party_")) return { resourceType: "party", visibility: "public", type: "image" };
  if (purpose.startsWith("authority_")) return { resourceType: "update", visibility: "public", type: "image" };
  if (purpose === "law_thumbnail") return { resourceType: "document", visibility: "public", type: "image" };
  return { resourceType: "post", visibility: "public", type: "image" };
}

async function mapLimit<T>(items: T[], limit: number, task: (item: T, index: number) => Promise<void>) {
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await task(items[index], index);
    }
  }));
}

async function hashBody(body: unknown) {
  if (!body || typeof body !== "object" || !(Symbol.asyncIterator in body)) throw new Error("DESTINATION_BODY_MISSING");
  const hash = createHash("sha256");
  let size = 0;
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    hash.update(chunk);
    size += chunk.byteLength;
  }
  return { sha256: hash.digest("hex"), size };
}

async function collectCandidates(db: NonNullable<typeof mongoose.connection.db>) {
  const candidates = new Map<string, Candidate>();
  const ensure = (input: Omit<Candidate, "references">, reference?: Reference) => {
    const existing = candidates.get(input.sourceUrl);
    if (existing) {
      if (reference) existing.references.push(reference);
      if (!existing.mediaAssetId && input.mediaAssetId) existing.mediaAssetId = input.mediaAssetId;
      return;
    }
    candidates.set(input.sourceUrl, { ...input, references: reference ? [reference] : [] });
  };

  const assets = await db.collection("mediaassets").find({
    $or: [
      { provider: "vercel_blob" },
      { url: { $regex: "\\.public\\.blob\\.vercel-storage\\.com" } },
      { provider: "cloudflare_r2", sourceProvider: "vercel_blob", sourceUrl: { $type: "string" } }
    ],
    status: { $in: ["ready", "active"] }
  }).toArray();
  for (const asset of assets) {
    const sourceUrl = isBlobUrl(asset.sourceUrl) ? asset.sourceUrl : asset.url;
    if (!isBlobUrl(sourceUrl) || !asset.ownerUserId) continue;
    ensure({ sourceUrl, sourceStorageKey: asset.sourceStorageKey || asset.storageKey || null, ownerUserId: asset.ownerUserId, purpose: asset.purpose || "misc", mediaAssetId: asset._id });
  }

  const authorityOwner = await db.collection("users").findOne({ role: "iec", status: { $ne: "disabled" } }, { projection: { _id: 1 } });
  const specs = [
    { collection: "users", fields: [{ name: "avatarUrl", purpose: "avatar" }, { name: "image", purpose: "avatar" }], owner: (doc: any) => doc._id },
    { collection: "parties", fields: [{ name: "logoUrl", purpose: "party_logo" }, { name: "coverUrl", purpose: "party_cover" }], owner: (doc: any) => doc.accountUserId || doc.createdByAdminId },
    { collection: "authorityprofiles", fields: [{ name: "logoUrl", purpose: "authority_logo" }, { name: "coverUrl", purpose: "authority_cover" }], owner: () => authorityOwner?._id },
    { collection: "laws", fields: [{ name: "thumbnailUrl", purpose: "law_thumbnail" }], owner: (doc: any) => doc.createdByUserId },
    { collection: "surveys", fields: [{ name: "imageUrl", purpose: "post" }], owner: (doc: any) => doc.authorUserId },
    { collection: "posts", fields: [{ name: "publisherSnapshot.imageUrl", purpose: "post" }], owner: (doc: any) => doc.authorUserId }
  ];
  for (const spec of specs) {
    const projection: Record<string, number> = { accountUserId: 1, createdByAdminId: 1, createdByUserId: 1, authorUserId: 1 };
    for (const field of spec.fields) projection[field.name] = 1;
    const documents = await db.collection(spec.collection).find({}, { projection }).toArray();
    for (const document of documents) {
      const ownerUserId = spec.owner(document);
      if (!ownerUserId) continue;
      for (const field of spec.fields) {
        const value = field.name.split(".").reduce<any>((current, segment) => current?.[segment], document);
        if (!isBlobUrl(value)) continue;
        ensure(
          { sourceUrl: value, sourceStorageKey: null, ownerUserId, purpose: field.purpose, mediaAssetId: null },
          { collection: spec.collection, id: document._id, field: field.name, ownerUserId, purpose: field.purpose }
        );
      }
    }
  }
  return [...candidates.values()];
}

async function main() {
  const mongoUri = required("MONGODB_URI");
  const bucket = execute ? required("R2_BUCKET_NAME") : process.env.R2_BUCKET_NAME?.trim() || "<not-configured>";
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10_000 });
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB connection is unavailable");
  let candidates = await collectCandidates(db);
  if (pilot) candidates = candidates.slice(0, Math.min(3, candidates.length));
  console.log(JSON.stringify({ mode: execute ? "execute" : "dry-run", pilot, candidateCount: candidates.length, concurrency, bucket }, null, 2));
  if (!execute) {
    console.log(JSON.stringify({ classifications: { referenced: candidates.length, skippedMissingOwner: 0 }, note: "No source, R2, or MongoDB data was modified." }, null, 2));
    return;
  }

  const accountId = required("R2_ACCOUNT_ID");
  const client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT?.trim() || `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: required("R2_ACCESS_KEY_ID"), secretAccessKey: required("R2_SECRET_ACCESS_KEY") },
    forcePathStyle: true
  });
  const manifests = db.collection("storagemigrations");
  await manifests.createIndex({ sourceUrlHash: 1 }, { unique: true });
  const stats = { verified: 0, dbUpdated: 0, skipped: 0, failed: 0 };

  await mapLimit(candidates, concurrency, async (candidate, index) => {
    const sourceUrlHash = createHash("sha256").update(candidate.sourceUrl).digest("hex");
    const prefix = process.env.R2_ENV_PREFIX?.trim().replace(/^\/+|\/+$/g, "") || "production";
      const manifest = await manifests.findOne({ sourceUrlHash });
    try {
      if (manifest?.status === "db_updated") {
        stats.skipped += 1;
        return;
      }
      const head = await fetch(candidate.sourceUrl, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(20_000) });
      if (!head.ok) throw new Error(`SOURCE_HEAD_${head.status}`);
      const sourceSize = Number(head.headers.get("content-length") || "0");
      const mimeType = contentType(head.headers.get("content-type"));
      if (!Number.isSafeInteger(sourceSize) || sourceSize <= 0 || sourceSize > maximumBytes) throw new Error("SOURCE_SIZE_INVALID");
      const storageKey = manifest?.storageKey || `${prefix}/legacy/${candidate.ownerUserId}/${sourceUrlHash.slice(0, 32)}.${extensionFor(mimeType)}`;
      await manifests.updateOne(
        { sourceUrlHash },
        { $setOnInsert: { createdAt: new Date(), sourceProvider: "vercel_blob" }, $set: { status: "copying", storageKey, bucket, sourceSize, mimeType, updatedAt: new Date() }, $inc: { attempts: 1 } },
        { upsert: true }
      );

      const source = await fetch(candidate.sourceUrl, { redirect: "manual", signal: AbortSignal.timeout(120_000) });
      if (!source.ok || !source.body) throw new Error(`SOURCE_GET_${source.status}`);
      const hash = createHash("sha256");
      let streamedSize = 0;
      const hashingStream = new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          streamedSize += chunk.length;
          hash.update(chunk);
          callback(null, chunk);
        }
      });
      const body = Readable.fromWeb(source.body as any).pipe(hashingStream);
      const put = await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: storageKey,
        Body: body,
        ContentLength: sourceSize,
        ContentType: mimeType,
        CacheControl: "public, max-age=31536000, immutable",
        Metadata: { "nashmi-source": "vercel-blob", "nashmi-size": String(sourceSize) }
      }));
      const sourceSha256 = hash.digest("hex");
      if (streamedSize !== sourceSize) throw new Error("SOURCE_SIZE_CHANGED");
      const destinationHead = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: storageKey }));
      if (destinationHead.ContentLength !== sourceSize || contentType(destinationHead.ContentType || null) !== mimeType) throw new Error("DESTINATION_METADATA_MISMATCH");
      const destination = await client.send(new GetObjectCommand({ Bucket: bucket, Key: storageKey }));
      const destinationHash = await hashBody(destination.Body);
      if (destinationHash.size !== sourceSize || destinationHash.sha256 !== sourceSha256) throw new Error("DESTINATION_CHECKSUM_MISMATCH");
      stats.verified += 1;

      let mediaAssetId = candidate.mediaAssetId;
      const details = purposeDetails(candidate.purpose);
      if (mediaAssetId) {
        const update = await db.collection("mediaassets").updateOne(
          {
            _id: mediaAssetId,
            $or: [
              { url: candidate.sourceUrl, provider: "vercel_blob" },
              { provider: "cloudflare_r2", sourceProvider: "vercel_blob", sourceUrl: candidate.sourceUrl }
            ]
          },
          { $set: { provider: "cloudflare_r2", bucket, storageKey, url: `/api/media/${mediaAssetId}`, sha256: sourceSha256, etag: put.ETag?.replace(/^\"|\"$/g, "") || null, sourceProvider: "vercel_blob", sourceUrl: candidate.sourceUrl, sourceStorageKey: candidate.sourceStorageKey, status: "ready", completedAt: new Date() } }
        );
        if (update.matchedCount !== 1) throw new Error("MEDIA_ASSET_CONCURRENT_CHANGE");
      } else {
        const existing = await db.collection("mediaassets").findOne({ sourceUrl: candidate.sourceUrl });
        if (existing) mediaAssetId = existing._id;
        else {
          mediaAssetId = new mongoose.Types.ObjectId();
          await db.collection("mediaassets").insertOne({
            _id: mediaAssetId,
            ownerUserId: candidate.ownerUserId,
            url: `/api/media/${mediaAssetId}`,
            storageKey,
            bucket,
            mimeType,
            sizeBytes: sourceSize,
            sha256: sourceSha256,
            etag: put.ETag?.replace(/^\"|\"$/g, "") || null,
            type: mimeType === "application/pdf" ? "document" : mimeType.startsWith("video/") ? "video" : details.type,
            purpose: candidate.purpose,
            resourceType: details.resourceType,
            visibility: details.visibility,
            provider: "cloudflare_r2",
            status: "ready",
            sourceProvider: "vercel_blob",
            sourceUrl: candidate.sourceUrl,
            sourceStorageKey: candidate.sourceStorageKey,
            completedAt: new Date(),
            createdAt: new Date()
          });
        }
      }

      const operationsByCollection = new Map<string, AnyBulkWriteOperation<any>[]>();
      for (const reference of candidate.references) {
        const operations = operationsByCollection.get(reference.collection) || [];
        const mediaField = reference.field === "logoUrl" ? "logoMediaId" : reference.field === "coverUrl" ? "coverMediaId" : reference.field === "avatarUrl" ? "avatarMediaId" : null;
        const set: Record<string, unknown> = { [reference.field]: `/api/media/${mediaAssetId}` };
        if (mediaField) set[mediaField] = mediaAssetId;
        operations.push({ updateOne: { filter: { _id: reference.id, [reference.field]: candidate.sourceUrl }, update: { $set: set } } });
        operationsByCollection.set(reference.collection, operations);
      }
      for (const [collection, operations] of operationsByCollection) if (operations.length) await db.collection(collection).bulkWrite(operations as any, { ordered: false });
      await manifests.updateOne({ sourceUrlHash }, { $set: { status: "db_updated", mediaAssetId, sourceSha256, destinationSha256: destinationHash.sha256, destinationSize: destinationHash.size, verifiedAt: new Date(), dbUpdatedAt: new Date(), updatedAt: new Date() }, $unset: { lastErrorCode: "" } });
      stats.dbUpdated += 1;
      console.log(JSON.stringify({ progress: `${index + 1}/${candidates.length}`, status: "db_updated", sourceUrlHash: sourceUrlHash.slice(0, 12) }));
    } catch (error) {
      const code = error instanceof Error ? error.message.slice(0, 120) : "UNKNOWN";
      await manifests.updateOne({ sourceUrlHash }, { $set: { status: "failed", lastErrorCode: code, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
      stats.failed += 1;
      console.error(JSON.stringify({ progress: `${index + 1}/${candidates.length}`, status: "failed", sourceUrlHash: sourceUrlHash.slice(0, 12), code }));
    }
  });
  console.log(JSON.stringify({ mode: "execute", candidates: candidates.length, ...stats }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Storage migration failed");
  process.exitCode = 1;
}).finally(() => mongoose.disconnect().catch(() => undefined));
