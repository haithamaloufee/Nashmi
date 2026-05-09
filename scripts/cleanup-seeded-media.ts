import { formatSafeError, loadEnv } from "./env";

loadEnv();

import { connectToDatabase, mongoose } from "../src/lib/db";
import MediaAsset from "../src/models/MediaAsset";
import Post from "../src/models/Post";

type CandidateAsset = {
  _id: unknown;
  url: string;
  storageKey?: string | null;
  provider?: string | null;
  purpose?: string | null;
};

const defaultPostMediaPrefix = "default-post-media/";

function isBlobUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

function isRealLocalUpload(value: string) {
  return value.startsWith("/uploads/");
}

function cleanupReason(asset: CandidateAsset) {
  const storageKey = asset.storageKey || "";
  const url = asset.url || "";
  if (storageKey.startsWith(defaultPostMediaPrefix)) return "default-post-media-storage-key";
  if (url.startsWith("https://parties.iec.jo/")) return "parties-iec-post-body-url";
  if (url.startsWith("/related/")) return "related-default-post-body-url";
  if (asset.purpose === "post" && !isBlobUrl(url) && !isRealLocalUpload(url)) return "non-upload-post-body-url";
  return null;
}

function parseMode() {
  const dryRun = process.argv.includes("--dry-run") || !process.argv.includes("--apply");
  return { dryRun };
}

async function main() {
  const { dryRun } = parseMode();
  await connectToDatabase();

  const assets = await MediaAsset.find({
    status: { $ne: "deleted" },
    purpose: "post"
  })
    .select("_id url storageKey provider purpose")
    .lean<CandidateAsset[]>();

  const candidates = assets
    .map((asset) => ({ asset, reason: cleanupReason(asset) }))
    .filter((item): item is { asset: CandidateAsset; reason: string } => Boolean(item.reason));

  const candidateIds = candidates.map((item) => item.asset._id);
  const affectedPosts = candidateIds.length
    ? await Post.find({ status: { $ne: "deleted" }, mediaIds: { $in: candidateIds } })
        .select("_id authorType partyId mediaIds publishedAt")
        .lean()
    : [];

  const reasonCounts = candidates.reduce<Record<string, number>>((counts, item) => {
    counts[item.reason] = (counts[item.reason] || 0) + 1;
    return counts;
  }, {});

  const report = {
    dryRun,
    mode: dryRun ? "dry-run" : "apply",
    candidateAssets: candidates.length,
    affectedPosts: affectedPosts.length,
    reasonCounts,
    preservedRule: "Vercel Blob URLs and /uploads/ local development uploads are not cleanup candidates.",
    sampleAssets: candidates.slice(0, 12).map(({ asset, reason }) => ({
      id: String(asset._id),
      reason,
      provider: asset.provider || null,
      storageKey: asset.storageKey || null,
      url: asset.url
    })),
    samplePostIds: affectedPosts.slice(0, 20).map((post) => String(post._id))
  };

  if (!dryRun && candidateIds.length) {
    const postResult = await Post.updateMany(
      { mediaIds: { $in: candidateIds } },
      { $pull: { mediaIds: { $in: candidateIds } } }
    );
    const assetResult = await MediaAsset.updateMany(
      { _id: { $in: candidateIds }, status: { $ne: "deleted" } },
      { $set: { status: "deleted" } }
    );
    Object.assign(report, {
      postsModified: postResult.modifiedCount || 0,
      assetsSoftDeleted: assetResult.modifiedCount || 0
    });
  }

  console.log(JSON.stringify(report, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(formatSafeError(error));
  await mongoose.disconnect();
  process.exit(1);
});
