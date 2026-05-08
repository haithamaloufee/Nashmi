import { normalizeSafeImageUrl } from "@/lib/imageUrls";

export type PartyLogoRecord = {
  name: string;
  imageUrl: string;
};

export function normalizeArabicPartyName(value: string, options: { relaxedTaMarbuta?: boolean } = {}) {
  let normalized = value
    .normalize("NFKC")
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[إأآٱا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^\p{Script=Arabic}\p{Number}\s()]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (options.relaxedTaMarbuta) normalized = normalized.replace(/ة/g, "ه");
  return normalized;
}

export function compactArabicPartyKey(value: string) {
  return normalizeArabicPartyName(value, { relaxedTaMarbuta: true })
    .replace(/^الحزب/, "حزب")
    .replace(/^حزب/, "")
    .replace(/الاردني/g, "")
    .replace(/اردني/g, "")
    .replace(/\s+/g, "");
}

export function normalizePartyLogoRecord(record: unknown): PartyLogoRecord | null {
  if (!record || typeof record !== "object") return null;
  const item = record as Record<string, unknown>;
  const name = typeof item["اسم_الحزب"] === "string" ? item["اسم_الحزب"].trim() : "";
  const rawUrl = typeof item["الرابط"] === "string" ? item["الرابط"].trim() : "";
  const imageUrl = normalizeSafeImageUrl(rawUrl, { localPrefixes: ["/images/", "/uploads/", "/related/"] });
  if (!name || !imageUrl) return null;
  return { name, imageUrl };
}

export function buildPartyMatchIndexes<T extends { name: string }>(parties: T[]) {
  const exact = new Map<string, T[]>();
  const relaxed = new Map<string, T[]>();
  const compact = new Map<string, T[]>();

  for (const party of parties) {
    for (const [index, key] of [
      [exact, normalizeArabicPartyName(party.name)],
      [relaxed, normalizeArabicPartyName(party.name, { relaxedTaMarbuta: true })],
      [compact, compactArabicPartyKey(party.name)]
    ] as Array<[Map<string, T[]>, string]>) {
      const list = index.get(key) || [];
      list.push(party);
      index.set(key, list);
    }
  }

  return { exact, relaxed, compact };
}

export function matchPartyByName<T extends { name: string }>(name: string, indexes: ReturnType<typeof buildPartyMatchIndexes<T>>) {
  const exactKey = normalizeArabicPartyName(name);
  const relaxedKey = normalizeArabicPartyName(name, { relaxedTaMarbuta: true });
  const compactKey = compactArabicPartyKey(name);
  return indexes.exact.get(exactKey) || indexes.relaxed.get(relaxedKey) || indexes.compact.get(compactKey) || [];
}
