import { existsSync, readFileSync } from "fs";
import path from "path";
import { formatSafeError, loadEnv } from "./env";

loadEnv();

import { connectToDatabase, mongoose } from "../src/lib/db";
import { normalizeSafeImageUrl } from "../src/lib/imageUrls";
import Party from "../src/models/Party";

type LogoRecord = {
  "اسم_الحزب"?: unknown;
  "الرابط"?: unknown;
};

type PartyLean = {
  _id: unknown;
  name: string;
  slug: string;
  logoUrl?: string | null;
};

function normalizeArabicName(value: string, options: { relaxedTaMarbuta?: boolean } = {}) {
  let normalized = value
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[^\p{Script=Arabic}\p{Number}\s()]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (options.relaxedTaMarbuta) normalized = normalized.replace(/ة/g, "ه");
  return normalized;
}

function compactArabicMatchKey(value: string) {
  return normalizeArabicName(value, { relaxedTaMarbuta: true })
    .replace(/^الحزب/, "حزب")
    .replace(/^حزب/, "")
    .replace(/الاردني/g, "")
    .replace(/اردني/g, "")
    .replace(/\s+/g, "");
}

function candidateInputPaths() {
  const paths = [
    process.env.PARTY_LOGOS_JSON,
    path.join(process.cwd(), "scripts", "parties.json"),
    path.join(process.cwd(), "parties.json")
  ].filter(Boolean) as string[];
  return paths;
}

function loadLogoRecords() {
  const inputPath = candidateInputPaths().find((candidate) => existsSync(candidate));
  if (!inputPath) {
    throw new Error("parties.json not found. Put it at scripts/parties.json or set PARTY_LOGOS_JSON.");
  }

  const parsed = JSON.parse(readFileSync(inputPath, "utf8")) as unknown;
  if (!Array.isArray(parsed)) throw new Error("parties.json must contain an array.");
  return { inputPath, records: parsed as LogoRecord[] };
}

function indexParties(parties: PartyLean[], keyBuilder: (value: string) => string) {
  const index = new Map<string, PartyLean[]>();
  for (const party of parties) {
    const key = keyBuilder(party.name);
    const list = index.get(key) || [];
    list.push(party);
    index.set(key, list);
  }
  return index;
}

async function main() {
  await connectToDatabase();

  const { inputPath, records } = loadLogoRecords();
  const activeParties = await Party.find({ status: "active" }).select("_id name slug logoUrl").lean<PartyLean[]>();
  const exactIndex = indexParties(activeParties, (value) => normalizeArabicName(value));
  const relaxedIndex = indexParties(activeParties, (value) => normalizeArabicName(value, { relaxedTaMarbuta: true }));
  const compactIndex = indexParties(activeParties, compactArabicMatchKey);

  const unmatchedNames: string[] = [];
  const unsafeUrls: Array<{ name: string; url: string }> = [];
  const duplicateMatches: Array<{ name: string; matches: string[] }> = [];
  let matched = 0;
  let updated = 0;
  let unchanged = 0;

  for (const record of records) {
    const name = typeof record["اسم_الحزب"] === "string" ? record["اسم_الحزب"].trim() : "";
    const rawUrl = typeof record["الرابط"] === "string" ? record["الرابط"].trim() : "";
    if (!name) {
      unmatchedNames.push("(missing اسم_الحزب)");
      continue;
    }

    const safeUrl = normalizeSafeImageUrl(rawUrl, { localPrefixes: ["/images/"] });
    if (!safeUrl) {
      unsafeUrls.push({ name, url: rawUrl });
      continue;
    }

    const exactKey = normalizeArabicName(name);
    const relaxedKey = normalizeArabicName(name, { relaxedTaMarbuta: true });
    const compactKey = compactArabicMatchKey(name);
    const matches = exactIndex.get(exactKey) || relaxedIndex.get(relaxedKey) || compactIndex.get(compactKey) || [];
    if (matches.length === 0) {
      unmatchedNames.push(name);
      continue;
    }
    if (matches.length > 1) {
      duplicateMatches.push({ name, matches: matches.map((party) => `${party.name} (${party.slug})`) });
      continue;
    }

    const party = matches[0];
    matched += 1;
    if ((party.logoUrl || null) === safeUrl) {
      unchanged += 1;
      continue;
    }

    await Party.updateOne({ _id: party._id, status: "active" }, { $set: { logoUrl: safeUrl } });
    updated += 1;
  }

  const missingLogoParties = await Party.find({
    status: "active",
    $or: [{ logoUrl: null }, { logoUrl: "" }, { logoUrl: { $exists: false } }]
  })
    .select("name slug")
    .sort({ slug: 1 })
    .lean<{ name: string; slug: string }[]>();

  const report = {
    inputPath,
    totalJsonRecords: records.length,
    activeParties: activeParties.length,
    matched,
    updatedLogoUrlCount: updated,
    unchangedLogoUrlCount: unchanged,
    skippedNotFoundCount: unmatchedNames.length,
    skippedUnsafeUrlCount: unsafeUrls.length,
    duplicateMatchesCount: duplicateMatches.length,
    unmatchedNames,
    unsafeUrls,
    duplicateMatches,
    partiesStillMissingLogoUrl: missingLogoParties.map((party) => `${party.name} (${party.slug})`)
  };

  console.log(JSON.stringify(report, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(formatSafeError(error));
  await mongoose.disconnect();
  process.exit(1);
});
