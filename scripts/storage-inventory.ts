import { config } from "dotenv";
import mongoose from "mongoose";

config({ path: ".env.local" });
config({ path: ".env" });

const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";
const HEAD_CONCURRENCY = 5;

type AssetRow = {
  _id: mongoose.Types.ObjectId;
  ownerUserId?: mongoose.Types.ObjectId;
  url?: string;
  storageKey?: string;
  mimeType?: string;
  sizeBytes?: number;
  purpose?: string;
  provider?: string;
  status?: string;
  createdAt?: Date;
};

function isVercelBlobUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(BLOB_HOST_SUFFIX);
  } catch {
    return false;
  }
}

function countBy<T>(items: T[], value: (item: T) => string) {
  return Object.fromEntries(
    [...items.reduce((map, item) => {
      const key = value(item) || "unknown";
      map.set(key, (map.get(key) || 0) + 1);
      return map;
    }, new Map<string, number>()).entries()].sort(([a], [b]) => a.localeCompare(b))
  );
}

function prefixFor(storageKey: string | undefined) {
  if (!storageKey) return "missing";
  const parts = storageKey.split("/").filter(Boolean);
  return parts.slice(0, Math.min(parts.length, 2)).join("/") || "root";
}

async function mapLimit<T, R>(items: T[], concurrency: number, task: (item: T) => Promise<R>) {
  const results = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await task(items[index]);
      }
    })
  );
  return results;
}

async function main() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error("MONGODB_URI is required");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB connection is unavailable");

  const assets = await db.collection<AssetRow>("mediaassets").find({}).toArray();
  const assetIds = new Set(assets.map((asset) => String(asset._id)));
  const referencedIds = new Set<string>();

  const referenceCollections = [
    { name: "posts", fields: ["mediaIds"] },
    { name: "parties", fields: ["logoMediaId", "coverMediaId"] },
    { name: "authorityprofiles", fields: ["logoMediaId", "coverMediaId"] }
  ];
  const referenceCounts: Record<string, number> = {};
  for (const collection of referenceCollections) {
    const documents = await db.collection(collection.name).find({}, { projection: Object.fromEntries(collection.fields.map((field) => [field, 1])) }).toArray();
    let count = 0;
    for (const document of documents) {
      for (const field of collection.fields) {
        const raw = document[field];
        const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
        for (const value of values) {
          const id = String(value);
          if (assetIds.has(id)) {
            referencedIds.add(id);
            count += 1;
          }
        }
      }
    }
    referenceCounts[collection.name] = count;
  }

  const urlFields = [
    { collection: "users", fields: ["avatarUrl", "image"] },
    { collection: "posts", fields: ["imageUrl", "publisherSnapshot.imageUrl"] },
    { collection: "parties", fields: ["logoUrl", "coverUrl"] },
    { collection: "authorityprofiles", fields: ["logoUrl", "coverUrl"] },
    { collection: "surveys", fields: ["imageUrl"] },
    { collection: "laws", fields: ["thumbnailUrl"] }
  ];
  const embeddedUrlCounts: Record<string, number> = {};
  const embeddedBlobUrls = new Set<string>();
  for (const entry of urlFields) {
    const projection = Object.fromEntries(entry.fields.map((field) => [field, 1]));
    const documents = await db.collection(entry.collection).find({}, { projection }).toArray();
    let count = 0;
    for (const document of documents) {
      for (const field of entry.fields) {
        const value = field.split(".").reduce<unknown>((current, segment) => {
          if (!current || typeof current !== "object") return undefined;
          return (current as Record<string, unknown>)[segment];
        }, document);
        if (isVercelBlobUrl(value)) {
          embeddedBlobUrls.add(value);
          count += 1;
        }
      }
    }
    embeddedUrlCounts[entry.collection] = count;
  }

  const blobAssets = assets.filter((asset) => asset.provider === "vercel_blob" || isVercelBlobUrl(asset.url));
  const headChecks = await mapLimit(blobAssets, HEAD_CONCURRENCY, async (asset) => {
    if (!asset.url || !isVercelBlobUrl(asset.url)) return { status: "invalid-url", size: null, contentType: null };
    try {
      const response = await fetch(asset.url, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(15_000) });
      return {
        status: response.ok ? "ok" : `http-${response.status}`,
        size: Number(response.headers.get("content-length") || "0") || null,
        contentType: response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() || null
      };
    } catch {
      return { status: "network-error", size: null, contentType: null };
    }
  });

  const recordedSizes = blobAssets.map((asset) => Number(asset.sizeBytes) || 0);
  const headSizes = headChecks.map((item) => item.size || 0);
  const mismatchCount = blobAssets.filter((asset, index) => {
    const head = headChecks[index];
    return head.status === "ok" && head.size !== null && Number(asset.sizeBytes) !== head.size;
  }).length;
  const mimeMismatchCount = blobAssets.filter((asset, index) => {
    const head = headChecks[index];
    return head.status === "ok" && head.contentType && asset.mimeType && head.contentType !== asset.mimeType.toLowerCase();
  }).length;
  const assetUrls = new Set(blobAssets.map((asset) => asset.url).filter((value): value is string => Boolean(value)));
  const sourceUrls = [...new Set([...assetUrls, ...embeddedBlobUrls])];
  const sourceChecks = await mapLimit(sourceUrls, HEAD_CONCURRENCY, async (url) => {
    try {
      const response = await fetch(url, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(15_000) });
      return {
        status: response.ok ? "ok" : `http-${response.status}`,
        size: Number(response.headers.get("content-length") || "0") || null,
        contentType: response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() || null
      };
    } catch {
      return { status: "network-error", size: null, contentType: null };
    }
  });

  const summary = {
    generatedAt: new Date().toISOString(),
    database: {
      mediaAssetCount: assets.length,
      blobAssetCount: blobAssets.length,
      referencedAssetCount: referencedIds.size,
      unreferencedAssetCount: assets.filter((asset) => !referencedIds.has(String(asset._id))).length,
      referenceCounts,
      embeddedVercelBlobUrls: embeddedBlobUrls.size,
      embeddedVercelBlobUrlsWithoutMediaAsset: [...embeddedBlobUrls].filter((url) => !assetUrls.has(url)).length,
      embeddedUrlCounts
    },
    sourceInventory: {
      referencedUniqueUrlCount: sourceUrls.length,
      reachableObjectCount: sourceChecks.filter((item) => item.status === "ok").length,
      missingObjectCount: sourceChecks.filter((item) => item.status === "http-404").length,
      errorCount: sourceChecks.filter((item) => item.status !== "ok" && item.status !== "http-404").length,
      reachableTotalBytes: sourceChecks.reduce((sum, item) => sum + (item.status === "ok" ? item.size || 0 : 0), 0),
      reachableAverageBytes: sourceChecks.filter((item) => item.status === "ok").length
        ? Math.round(sourceChecks.reduce((sum, item) => sum + (item.status === "ok" ? item.size || 0 : 0), 0) / sourceChecks.filter((item) => item.status === "ok").length)
        : 0,
      reachableMaxBytes: Math.max(0, ...sourceChecks.map((item) => item.status === "ok" ? item.size || 0 : 0)),
      mimeType: countBy(sourceChecks.filter((item) => item.status === "ok"), (item) => item.contentType || "unknown")
    },
    objects: {
      recordedTotalBytes: recordedSizes.reduce((sum, size) => sum + size, 0),
      recordedAverageBytes: recordedSizes.length ? Math.round(recordedSizes.reduce((sum, size) => sum + size, 0) / recordedSizes.length) : 0,
      recordedMaxBytes: recordedSizes.length ? Math.max(...recordedSizes) : 0,
      headReachable: headChecks.filter((item) => item.status === "ok").length,
      headMissing: headChecks.filter((item) => item.status === "http-404").length,
      headErrors: countBy(headChecks.filter((item) => item.status !== "ok" && item.status !== "http-404"), (item) => item.status),
      headTotalBytes: headSizes.reduce((sum, size) => sum + size, 0),
      sizeMismatchCount: mismatchCount,
      mimeMismatchCount
    },
    distributions: {
      provider: countBy(assets, (asset) => asset.provider || "missing"),
      status: countBy(assets, (asset) => asset.status || "missing"),
      mimeType: countBy(assets, (asset) => asset.mimeType || "missing"),
      purpose: countBy(assets, (asset) => asset.purpose || "missing"),
      prefix: countBy(assets, (asset) => prefixFor(asset.storageKey))
    }
  };

  console.log(JSON.stringify(summary, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : "Storage inventory failed");
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
