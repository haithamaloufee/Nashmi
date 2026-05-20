import type { Language } from "@/lib/i18n";

type LocalizedRecord = Record<string, unknown>;

export function getLocalizedValue(item: LocalizedRecord | null | undefined, baseKey: string, lang: Language, fallbackKey?: string) {
  const localizedKey = lang === "en" ? `${baseKey}En` : `${baseKey}Ar`;
  const oppositeKey = lang === "en" ? `${baseKey}Ar` : `${baseKey}En`;
  const candidates = [item?.[localizedKey], fallbackKey ? item?.[fallbackKey] : undefined, item?.[baseKey], item?.[oppositeKey]];
  const value = candidates.find((candidate) => typeof candidate === "string" ? candidate.trim().length > 0 : candidate !== null && candidate !== undefined);
  return typeof value === "string" ? value : "";
}

export function localeFor(language: Language) {
  return language === "ar" ? "ar-JO" : "en-US";
}

export function formatNumber(value: number | null | undefined, language: Language, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(localeFor(language), options).format(Number(value || 0));
}

export function formatDate(value: string | Date | number | null | undefined, language: Language, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(localeFor(language), options || { dateStyle: "medium" }).format(date);
}

export function formatRelativeTime(value: string | Date | number | null | undefined, language: Language) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSeconds);
  const formatter = new Intl.RelativeTimeFormat(localeFor(language), { numeric: "auto" });
  if (abs < 60) return formatter.format(diffSeconds, "second");
  if (abs < 3600) return formatter.format(Math.round(diffSeconds / 60), "minute");
  if (abs < 86400) return formatter.format(Math.round(diffSeconds / 3600), "hour");
  if (abs < 604800) return formatter.format(Math.round(diffSeconds / 86400), "day");
  return formatDate(date, language);
}

const hashtagMatcher = /(^|[\s([{"'،؛؟!])#([\p{L}\p{N}_]+)/gu;

export function normalizeHashtag(tag: string) {
  return tag.replace(/^#/, "").trim().toLocaleLowerCase("en-US");
}

export function extractHashtags(text: string | null | undefined) {
  const source = String(text || "");
  const tags: string[] = [];
  const seen = new Set<string>();
  for (const match of source.matchAll(hashtagMatcher)) {
    const raw = match[2] || "";
    const normalized = normalizeHashtag(raw);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    tags.push(raw);
  }
  return tags;
}

export function textHasHashtag(text: string | null | undefined, tag: string) {
  const target = normalizeHashtag(tag);
  if (!target) return false;
  return extractHashtags(text).some((item) => normalizeHashtag(item) === target);
}
