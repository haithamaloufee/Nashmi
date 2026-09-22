import { createHash } from "node:crypto";
import { normalizeArabic } from "@/lib/arabicSearch";

const TITLE_STOP_WORDS = new Set(["في", "من", "على", "الى", "إلى", "عن", "هذا", "هذه", "مع", "بعد", "قبل", "الأردن", "الاردن"]);

export function normalizeNewsTitle(value: string) {
  return normalizeArabic(value)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !TITLE_STOP_WORDS.has(token))
    .map((token) => token.startsWith("ال") && token.length > 4 ? token.slice(2) : token)
    .sort()
    .join(" ");
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function canonicalNewsHash(title: string, publishedAt: Date) {
  return sha256(`${normalizeNewsTitle(title)}|${publishedAt.toISOString().slice(0, 10)}`);
}

export function sourceUrlHash(value: string) {
  const url = new URL(value);
  url.hash = "";
  ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"].forEach((key) => url.searchParams.delete(key));
  url.searchParams.sort();
  return sha256(url.toString().replace(/\/$/, ""));
}

export function newsTitleSimilarity(left: string, right: string) {
  const a = new Set(normalizeNewsTitle(left).split(" ").filter(Boolean));
  const b = new Set(normalizeNewsTitle(right).split(" ").filter(Boolean));
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}
