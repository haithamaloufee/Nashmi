import { existsSync, readFileSync } from "fs";
import path from "path";
import { formatSafeError, loadEnv } from "./env";

loadEnv();

import { connectToDatabase, mongoose } from "../src/lib/db";
import { buildPartyMatchIndexes, matchPartyByName, normalizePartyLogoRecord } from "../src/lib/partyMatching";
import { authorityLogo, DEFAULT_AUTHORITY_NAME } from "../src/lib/publisher";
import AuthorityProfile from "../src/models/AuthorityProfile";
import Party from "../src/models/Party";
import Post from "../src/models/Post";

type LogoRecord = Record<string, unknown>;

type PartyLean = {
  _id: unknown;
  name: string;
  slug: string;
  logoUrl?: string | null;
  isVerified?: boolean;
};

function candidateInputPaths() {
  return [
    process.env.PARTY_LOGOS_JSON,
    path.join(process.cwd(), "scripts", "parties.json"),
    path.join(process.cwd(), "parties.json")
  ].filter(Boolean) as string[];
}

function loadLogoRecords() {
  const inputPath = candidateInputPaths().find((candidate) => existsSync(candidate));
  if (!inputPath) throw new Error("parties.json not found. Put it at scripts/parties.json or set PARTY_LOGOS_JSON.");

  const parsed = JSON.parse(readFileSync(inputPath, "utf8")) as unknown;
  if (!Array.isArray(parsed)) throw new Error("parties.json must contain an array.");
  return { inputPath, records: parsed as LogoRecord[] };
}

async function main() {
  await connectToDatabase();

  const { inputPath, records } = loadLogoRecords();
  const activeParties = await Party.find({ status: "active" }).select("_id name slug logoUrl isVerified").lean<PartyLean[]>();
  const indexes = buildPartyMatchIndexes(activeParties);
  const unmatchedNames: string[] = [];
  const unsafeRecords: LogoRecord[] = [];
  const duplicateMatches: Array<{ name: string; matches: string[] }> = [];
  const matchedPartyIds = new Set<string>();

  let partiesMatched = 0;
  let partyLogosUpdated = 0;
  let partyPostsUpdated = 0;
  let unchangedParties = 0;

  for (const rawRecord of records) {
    const record = normalizePartyLogoRecord(rawRecord);
    if (!record) {
      unsafeRecords.push(rawRecord);
      continue;
    }

    const matches = matchPartyByName(record.name, indexes);
    if (matches.length === 0) {
      unmatchedNames.push(record.name);
      continue;
    }
    if (matches.length > 1) {
      duplicateMatches.push({ name: record.name, matches: matches.map((party) => `${party.name} (${party.slug})`) });
      continue;
    }

    const party = matches[0];
    matchedPartyIds.add(String(party._id));
    partiesMatched += 1;
    if ((party.logoUrl || null) === record.imageUrl) unchangedParties += 1;
    else {
      await Party.updateOne({ _id: party._id, status: "active" }, { $set: { logoUrl: record.imageUrl } });
      partyLogosUpdated += 1;
    }

    const snapshot = {
      name: party.name,
      imageUrl: record.imageUrl,
      href: party.slug ? `/parties/${party.slug}` : null,
      badge: party.isVerified ? "حزب موثق" : "حزب"
    };
    const postResult = await Post.updateMany(
      {
        partyId: party._id,
        status: { $ne: "deleted" },
        $or: [
          { "publisherSnapshot.imageUrl": { $ne: record.imageUrl } },
          { publisherSnapshot: { $exists: false } },
          { "publisherSnapshot.imageUrl": null }
        ]
      },
      { $set: { publisherSnapshot: snapshot } }
    );
    partyPostsUpdated += postResult.modifiedCount || 0;
  }

  const authority = await AuthorityProfile.findOne({ slug: "independent-election-commission" })
    .populate({ path: "logoMediaId", select: "url status" })
    .select("name logoUrl logoMediaId")
    .lean();
  const iecImageUrl = authorityLogo(authority as Record<string, unknown> | null);
  const iecSnapshot = {
    name: authority?.name || DEFAULT_AUTHORITY_NAME,
    imageUrl: iecImageUrl,
    href: "/iec",
    badge: "هيئة"
  };
  const iecResult = await Post.updateMany(
    {
      authorType: "iec",
      status: { $ne: "deleted" },
      $or: [
        { "publisherSnapshot.imageUrl": { $ne: iecImageUrl } },
        { publisherSnapshot: { $exists: false } },
        { "publisherSnapshot.imageUrl": null }
      ]
    },
    { $set: { publisherSnapshot: iecSnapshot } }
  );

  const postsWithoutPublisherImage = await Post.countDocuments({
    status: { $ne: "deleted" },
    $or: [
      { publisherSnapshot: { $exists: false } },
      { "publisherSnapshot.imageUrl": null },
      { "publisherSnapshot.imageUrl": "" }
    ]
  });

  const partiesWithoutMatchedImage = await Party.find({
    status: "active",
    _id: { $nin: [...matchedPartyIds] }
  }).select("name slug").sort({ slug: 1 }).lean<{ name: string; slug: string }[]>();

  const report = {
    inputPath,
    totalJsonRecords: records.length,
    activeParties: activeParties.length,
    partiesMatched,
    partyLogosUpdated,
    unchangedParties,
    partyPostsUpdated,
    iecPostsUpdated: iecResult.modifiedCount || 0,
    postsWithoutPublisherImage,
    unmatchedJsonPartyNames: unmatchedNames,
    unsafeRecordsCount: unsafeRecords.length,
    duplicateMatches,
    partiesWithoutMatchedImage: partiesWithoutMatchedImage.map((party) => `${party.name} (${party.slug})`)
  };

  console.log(JSON.stringify(report, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(formatSafeError(error));
  await mongoose.disconnect();
  process.exit(1);
});
