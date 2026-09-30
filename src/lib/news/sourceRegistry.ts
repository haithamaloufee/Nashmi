import { load } from "cheerio";
import { FEEDS, parseFeedWithStats } from "@/lib/news/feedParsing";
import type { NewsSource } from "@/lib/news/types";

export type SourceId = "prime_ministry" | "ministry_of_labour" | "house" | "senate" | "modee" | "mamlaka" | "roya";
export type SourceDefinition = {
  id: SourceId;
  publisher: string;
  sourceClass: NewsSource["sourceClass"];
  url: string;
  host: string;
  access: "public_archive" | "feed";
  aiInputAllowed?: boolean;
};

// Only sources with a tested public entry point are enabled. Other ministries
// stay in the feasibility report until their access and terms are verified.
export const NEWS_SOURCES: readonly SourceDefinition[] = [
  { id: "prime_ministry", publisher: "رئاسة الوزراء", sourceClass: "official", url: "https://www.pm.gov.jo/AR/Modules/News", host: "pm.gov.jo", access: "public_archive" },
  { id: "ministry_of_labour", publisher: "وزارة العمل", sourceClass: "official", url: "https://www.mol.gov.jo/AR/Modules/News", host: "mol.gov.jo", access: "public_archive" },
  { id: "house", publisher: "مجلس النواب", sourceClass: "official", url: "https://www.representatives.jo/AR/Modules/News", host: "representatives.jo", access: "public_archive" },
  { id: "senate", publisher: "مجلس الأعيان", sourceClass: "official", url: "https://www.senate.jo/AR/Modules/News", host: "senate.jo", access: "public_archive" },
  { id: "modee", publisher: "وزارة الاقتصاد الرقمي والريادة", sourceClass: "official", url: "https://www.modee.gov.jo/AR/Modules/News", host: "modee.gov.jo", access: "public_archive" },
  { id: "mamlaka", publisher: "قناة المملكة", sourceClass: "reputable_media", url: FEEDS[0].url, host: FEEDS[0].host, access: "feed" },
  { id: "roya", publisher: "رؤيا الإخباري", sourceClass: "reputable_media", url: FEEDS[1].url, host: FEEDS[1].host, access: "feed", aiInputAllowed: false }
] as const;

export type SourceMaterial = {
  sourceId: SourceId;
  publisher: string;
  sourceClass: NewsSource["sourceClass"];
  title: string;
  detailHeadline?: string;
  summary: string;
  url: string;
  publishedAt: Date;
  datePrecision: "time" | "day";
  paragraphs: string[];
  publicationVerified?: boolean;
  aiInputAllowed?: boolean;
};

export function sourceById(id: SourceId) {
  const source = NEWS_SOURCES.find((entry) => entry.id === id);
  if (!source) throw new Error("NEWS_SOURCE_NOT_REGISTERED");
  return source;
}

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function trustedSourceUrl(href: string, source: SourceDefinition) {
  const url = new URL(href, source.url);
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  if (url.protocol !== "https:" || hostname !== source.host || url.username || url.password || (url.port && url.port !== "443")) throw new Error("NEWS_SOURCE_LINK_UNTRUSTED");
  if (!/^\/ar\/{1,2}NewsDetails\//i.test(url.pathname)) throw new Error("NEWS_SOURCE_LINK_UNEXPECTED");
  return url.toString();
}

function jordanDay(value: string) {
  const input = clean(value);
  const ymd = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(input);
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(ymd ? `${ymd[3]}/${ymd[2]}/${ymd[1]}` : input);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(`${year}-${month}-${day}T00:00:00+03:00`);
  const civil = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return Number.isFinite(date.getTime()) && civil.getUTCFullYear() === Number(year) && civil.getUTCMonth() + 1 === Number(month) && civil.getUTCDate() === Number(day) ? date : null;
}

export function parseGovernmentArchive(html: string, source: SourceDefinition): SourceMaterial[] {
  if (source.access !== "public_archive") throw new Error("NEWS_SOURCE_FORMAT_INVALID");
  const $ = load(html);
  const found = new Map<string, SourceMaterial>();
  $('a[href*="NewsDetails"]').each((_, element) => {
    const block = source.id === "senate" ? $(element).closest(".media-body") : $(element).find(".media.news-block").first();
    if (!block.length) return;
    const title = clean(block.find(".card-title").first().text());
    const summary = clean(block.find(".card-text").first().text()) || title;
    const publishedAt = jordanDay(block.find(".date").first().text());
    if (!publishedAt || title.length < 12 || !summary) return;
    try {
      const url = trustedSourceUrl($(element).attr("href") || "", source);
      found.set(url, { sourceId: source.id, publisher: source.publisher, sourceClass: source.sourceClass, title: title.slice(0, 240), summary: summary.slice(0, 900), url, publishedAt, datePrecision: "day", paragraphs: [] });
    } catch { /* The archive may contain unrelated navigation links. */ }
  });
  return [...found.values()].slice(0, 30);
}

export function parseGovernmentDetail(html: string) {
  const $ = load(html);
  const section = $('div[id$="_NewsSection"]').first();
  if (!section.length) throw new Error("NEWS_SOURCE_DETAIL_LAYOUT_CHANGED");
  return section.find("p, li").toArray().map((element) => clean($(element).text())).filter((value) => value.length >= 20).slice(0, 80);
}

export function parseGovernmentDetailHeadline(html: string) {
  const $ = load(html);
  if (!$('div[id$="_NewsSection"]').length) throw new Error("NEWS_SOURCE_DETAIL_LAYOUT_CHANGED");
  const headline = clean($('[id$="_Devbanner"] h2').first().text() || $("h2.ms-2").first().text());
  return headline.length >= 12 && headline.length <= 180 ? headline : null;
}

export function parseRegisteredFeed(xml: string, source: SourceDefinition, now: Date): SourceMaterial[] {
  const feed = FEEDS.find((entry) => entry.id === source.id);
  if (!feed) throw new Error("NEWS_SOURCE_FORMAT_INVALID");
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("NEWS_FEED_UNSAFE_XML");
  return parseFeedWithStats(xml, now, feed, { keepArchive: true }).items.map((item) => ({
    sourceId: source.id, publisher: source.publisher, sourceClass: source.sourceClass,
    title: item.title, summary: item.summary, url: item.url,
    publishedAt: new Date(item.publishedAt), datePrecision: "time" as const, paragraphs: [],
    // Al Mamlaka's RSS pubDate was observed changing on article updates.
    // Its original creation time must be verified on the public article page.
    publicationVerified: false, aiInputAllowed: source.aiInputAllowed !== false
  }));
}

export function parseMamlakaOriginalPublication(html: string) {
  const original = /تاريخ الإنشاء\s*<time\b[^>]*>([\s\S]*?)<\/time>/i.exec(html)?.[1];
  const value = original ? clean(load(original).text()) : "";
  const parts = /^(\d{2}):(\d{2}):(\d{2})\s+(\d{2})\s*-\s*(\d{2})\s*-\s*(\d{4})$/.exec(value);
  if (!parts) throw new Error("NEWS_ORIGINAL_PUBLICATION_UNVERIFIED");
  const [, hour, minute, second, day, month, year] = parts;
  const civil = new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute, +second));
  if (+hour > 23 || +minute > 59 || +second > 59 || civil.getUTCFullYear() !== +year || civil.getUTCMonth() + 1 !== +month || civil.getUTCDate() !== +day) throw new Error("NEWS_ORIGINAL_PUBLICATION_UNVERIFIED");
  return new Date(civil.getTime() - 3 * 60 * 60_000);
}
