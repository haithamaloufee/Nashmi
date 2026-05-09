import { existsSync, readFileSync } from "fs";
import path from "path";
import { formatSafeError, loadEnv } from "./env";

loadEnv();

import { connectToDatabase, mongoose } from "../src/lib/db";
import { buildPartyMatchIndexes, matchPartyByName, normalizePartyLogoRecord } from "../src/lib/partyMatching";
import { authorityLogo } from "../src/lib/publisher";
import AuthorityProfile from "../src/models/AuthorityProfile";
import MediaAsset from "../src/models/MediaAsset";
import Party from "../src/models/Party";
import Post from "../src/models/Post";

type LeanParty = {
  _id: unknown;
  name: string;
  slug?: string | null;
  logoUrl?: string | null;
  accountUserId?: unknown;
};

type LeanPost = {
  _id: unknown;
  authorType: "party" | "iec" | "admin";
  authorUserId: unknown;
  partyId?: LeanParty | string | null;
  publisherSnapshot?: {
    id?: string | null;
    name?: string | null;
    type?: string | null;
    imageUrl?: string | null;
  } | null;
  mediaIds?: Array<{ _id?: unknown; status?: string | null; storageKey?: string | null } | string>;
};

const defaultMediaPrefix = "default-post-media/";
const partyFallbackImageUrl = "/related/parties-logo.svg";
const seedDisabledMessage = [
  "Default post media seeding is disabled.",
  "Post body media must come from user device uploads only.",
  "Use npm run posts:cleanup-seeded-media -- --dry-run to inspect old generated media."
].join(" ");

function assertExplicitlyEnabled() {
  if (process.env.ALLOW_DEFAULT_POST_MEDIA_SEEDING === "1" && process.argv.includes("--force")) return;
  throw new Error(`${seedDisabledMessage} To run this legacy script anyway, set ALLOW_DEFAULT_POST_MEDIA_SEEDING=1 and pass --force.`);
}

function candidateInputPaths() {
  return [
    process.env.PARTY_LOGOS_JSON,
    path.join(process.cwd(), "scripts", "parties.json"),
    path.join(process.cwd(), "parties.json")
  ].filter(Boolean) as string[];
}

function loadLogoRecords() {
  const inputPath = candidateInputPaths().find((candidate) => existsSync(candidate));
  if (!inputPath) return { inputPath: null, records: [] as unknown[] };
  const parsed = JSON.parse(readFileSync(inputPath, "utf8")) as unknown;
  if (!Array.isArray(parsed)) throw new Error("parties.json must contain an array.");
  return { inputPath, records: parsed };
}

function mimeTypeForUrl(url: string) {
  const pathname = (() => {
    try {
      return new URL(url, "https://local.invalid").pathname.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  })();
  if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) return "image/jpeg";
  if (pathname.endsWith(".webp")) return "image/webp";
  if (pathname.endsWith(".gif")) return "image/gif";
  return "image/png";
}

function hasValidMedia(post: LeanPost) {
  return (post.mediaIds || []).some((media) => typeof media === "object" && media.status !== "deleted");
}

function hasDefaultMedia(post: LeanPost) {
  return (post.mediaIds || []).some((media) => typeof media === "object" && typeof media.storageKey === "string" && media.storageKey.startsWith(defaultMediaPrefix) && media.status !== "deleted");
}

function partyObject(value: LeanPost["partyId"]) {
  return value && typeof value === "object" ? value : null;
}

async function getDefaultAsset(input: {
  ownerUserId: unknown;
  storageKey: string;
  url: string;
  purpose: "post";
}) {
  const existing = await MediaAsset.findOne({
    ownerUserId: input.ownerUserId,
    storageKey: input.storageKey,
    status: { $ne: "deleted" }
  }).lean();

  if (existing) return { assetId: existing._id, duplicatePrevented: true };

  const asset = await MediaAsset.create({
    ownerUserId: input.ownerUserId,
    url: input.url,
    storageKey: input.storageKey,
    mimeType: mimeTypeForUrl(input.url),
    sizeBytes: 1,
    width: null,
    height: null,
    type: "image",
    purpose: input.purpose,
    provider: "local_dev",
    status: "active"
  });

  return { assetId: asset._id, duplicatePrevented: false };
}

async function main() {
  assertExplicitlyEnabled();
  await connectToDatabase();

  const { inputPath, records } = loadLogoRecords();
  const activeParties = await Party.find({ status: "active" }).select("_id name slug logoUrl accountUserId").lean<LeanParty[]>();
  const indexes = buildPartyMatchIndexes(activeParties);
  const partyById = new Map(activeParties.map((party) => [String(party._id), party]));
  const jsonLogoByPartyId = new Map<string, string>();
  const unmatchedPublisherNames = new Set<string>();

  for (const rawRecord of records) {
    const record = normalizePartyLogoRecord(rawRecord);
    if (!record) continue;
    const matches = matchPartyByName(record.name, indexes);
    if (matches.length === 1) jsonLogoByPartyId.set(String(matches[0]._id), record.imageUrl);
  }

  const authority = await AuthorityProfile.findOne({ slug: "independent-election-commission", status: "active" })
    .populate({ path: "logoMediaId", select: "url status" })
    .select("name logoUrl logoMediaId")
    .lean();
  const authorityImageUrl = authorityLogo(authority as Record<string, unknown> | null);

  const posts = await Post.find({ status: { $ne: "deleted" } })
    .populate({ path: "partyId", select: "name slug logoUrl accountUserId" })
    .populate({ path: "mediaIds", select: "status storageKey" })
    .select("authorType authorUserId partyId publisherSnapshot mediaIds")
    .lean<LeanPost[]>();

  const report = {
    inputPath,
    totalPostsChecked: posts.length,
    postsAlreadyHadMedia: 0,
    partyPostsUpdatedWithDefaultMedia: 0,
    partyPostsUpdatedWithSafeFallbackMedia: 0,
    authorityPostsUpdatedWithDefaultMedia: 0,
    postsAlreadyCorrect: 0,
    postsSkippedUnknownOrUser: 0,
    postsSkippedWithoutMatchingPublisherImage: 0,
    unmatchedPublisherNames: [] as string[],
    duplicateMediaPreventedCount: 0,
    finalPostsStillWithoutMedia: 0
  };

  for (const post of posts) {
    if (hasValidMedia(post)) {
      if (hasDefaultMedia(post)) report.postsAlreadyCorrect += 1;
      else report.postsAlreadyHadMedia += 1;
      continue;
    }

    if (post.authorType === "iec") {
      if (!authorityImageUrl) {
        report.postsSkippedWithoutMatchingPublisherImage += 1;
        continue;
      }
      const { assetId, duplicatePrevented } = await getDefaultAsset({
        ownerUserId: post.authorUserId,
        storageKey: `${defaultMediaPrefix}authority/iec`,
        url: authorityImageUrl,
        purpose: "post"
      });
      const result = await Post.updateOne({ _id: post._id }, { $addToSet: { mediaIds: assetId } });
      if (result.modifiedCount) report.authorityPostsUpdatedWithDefaultMedia += 1;
      else report.postsAlreadyCorrect += 1;
      if (duplicatePrevented) report.duplicateMediaPreventedCount += 1;
      continue;
    }

    let party = partyObject(post.partyId);
    if (!party && post.publisherSnapshot?.id) party = partyById.get(String(post.publisherSnapshot.id)) || null;
    if (!party && post.publisherSnapshot?.type === "party" && post.publisherSnapshot.name) {
      const matches = matchPartyByName(post.publisherSnapshot.name, indexes);
      if (matches.length === 1) party = matches[0];
    }

    if (!party) {
      if (post.publisherSnapshot?.name) unmatchedPublisherNames.add(post.publisherSnapshot.name);
      report.postsSkippedUnknownOrUser += 1;
      continue;
    }

    const partyId = String(party._id);
    const matchedImageUrl = party.logoUrl || jsonLogoByPartyId.get(partyId) || post.publisherSnapshot?.imageUrl || null;
    const imageUrl = matchedImageUrl || partyFallbackImageUrl;
    if (!matchedImageUrl) unmatchedPublisherNames.add(party.name);
    if (!imageUrl) {
      unmatchedPublisherNames.add(party.name);
      report.postsSkippedWithoutMatchingPublisherImage += 1;
      continue;
    }

    const { assetId, duplicatePrevented } = await getDefaultAsset({
      ownerUserId: party.accountUserId || post.authorUserId,
      storageKey: `${defaultMediaPrefix}party/${partyId}`,
      url: imageUrl,
      purpose: "post"
    });
    const result = await Post.updateOne({ _id: post._id }, { $addToSet: { mediaIds: assetId } });
    if (result.modifiedCount) {
      if (matchedImageUrl) report.partyPostsUpdatedWithDefaultMedia += 1;
      else report.partyPostsUpdatedWithSafeFallbackMedia += 1;
    }
    else report.postsAlreadyCorrect += 1;
    if (duplicatePrevented) report.duplicateMediaPreventedCount += 1;
  }

  report.finalPostsStillWithoutMedia = await Post.countDocuments({
    status: { $ne: "deleted" },
    $or: [{ mediaIds: { $exists: false } }, { mediaIds: { $size: 0 } }]
  });
  report.unmatchedPublisherNames = [...unmatchedPublisherNames].sort();

  console.log(JSON.stringify(report, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(formatSafeError(error));
  await mongoose.disconnect();
  process.exit(1);
});
