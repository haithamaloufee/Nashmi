const tashkeel = /[\u064B-\u065F\u0670]/g;
const tatweel = /\u0640/g;

export function normalizeArabic(input: string | null | undefined) {
  return (input || "")
    .toLowerCase()
    .trim()
    .replace(tashkeel, "")
    .replace(tatweel, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ");
}

export function createSearchText(values: Array<string | null | undefined>) {
  return normalizeArabic(values.filter(Boolean).join(" "));
}

export function searchRegex(search: string) {
  const normalized = normalizeArabic(search);
  if (!normalized) return null;
  return new RegExp(normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}
