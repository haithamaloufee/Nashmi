import { load } from "cheerio";
import { FEEDS, parseFeedWithStats } from "@/lib/news/feedParsing";
import type { NewsSource } from "@/lib/news/types";

export type SourceId = "prime_ministry" | "ministry_of_labour" | "mamlaka" | "roya";
export type SourceDefinition = {
  id: SourceId;
  publisher: string;
  sourceClass: NewsSource["sourceClass"];
  url: string;
  host: string;
  access: "public_archive" | "feed";
};

// Only sources with a tested public entry point are enabled. Other ministries
// stay in the feasibility report until their access and terms are verified.
export const NEWS_SOURCES: readonly SourceDefinition[] = [
  { id: "prime_ministry", publisher: "رئاسة الوزراء", sourceClass: "official", url: "https://www.pm.gov.jo/AR/Modules/News", host: "pm.gov.jo", access: "public_archive" },
  { id: "ministry_of_labour", publisher: "وزارة العمل", sourceClass: "official", url: "https://www.mol.gov.jo/AR/Modules/News", host: "mol.gov.jo", access: "public_archive" },
  { id: "mamlaka", publisher: "قناة المملكة", sourceClass: "reputable_media", url: FEEDS[0].url, host: FEEDS[0].host, access: "feed" },
  { id: "roya", publisher: "رؤيا الإخباري", sourceClass: "reputable_media", url: FEEDS[1].url, host: FEEDS[1].host, access: "feed" }
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
  if (!/^\/(ar|AR|Ar)\/NewsDetails\//.test(url.pathname)) throw new Error("NEWS_SOURCE_LINK_UNEXPECTED");
  return url.toString();
}

function jordanDay(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(clean(value));
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
    const block = $(element).find(".media.news-block").first();
    if (!block.length) return;
    const title = clean(block.find(".card-title").first().text());
    const summary = clean(block.find(".card-text").first().text());
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
  const headline = clean($('[id$="_Devbanner"] h2').first().text());
  return headline.length >= 12 && headline.length <= 180 ? headline : null;
}

export function parseRegisteredFeed(xml: string, source: SourceDefinition, now: Date): SourceMaterial[] {
  const feed = FEEDS.find((entry) => entry.id === source.id);
  if (!feed) throw new Error("NEWS_SOURCE_FORMAT_INVALID");
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("NEWS_FEED_UNSAFE_XML");
  return parseFeedWithStats(xml, now, feed).items.map((item) => ({
    sourceId: source.id, publisher: source.publisher, sourceClass: source.sourceClass,
    title: item.title, summary: item.summary, url: item.url,
    publishedAt: new Date(item.publishedAt), datePrecision: "time" as const, paragraphs: []
  }));
}
