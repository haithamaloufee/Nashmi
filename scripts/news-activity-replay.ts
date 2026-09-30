import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { eventDraftsFromMaterial, sameNewsEvent } from "../src/lib/news/pipelineCore";
import { sourceById, type SourceId, type SourceMaterial } from "../src/lib/news/sourceRegistry";

const reference = JSON.parse(readFileSync("scripts/fixtures/news/public-activity-reference.json", "utf8"));
let tp = 0, fp = 0, fn = 0, tn = 0;
const rows = reference.rows.map((row: any) => {
  const source = sourceById(row.sourceId as SourceId);
  const material: SourceMaterial = { sourceId: source.id, publisher: source.publisher, sourceClass: source.sourceClass, title: row.title, summary: row.passage, paragraphs: [row.passage], url: row.url, publishedAt: new Date(row.publishedAt), datePrecision: "time", publicationVerified: true, aiInputAllowed: source.aiInputAllowed !== false };
  const now = new Date(material.publishedAt.getTime() + 24 * 60 * 60_000);
  const events = eventDraftsFromMaterial(material, now);
  const found = events.some((event) => event.scopeSupported);
  if (found && row.expected) tp++; else if (found) fp++; else if (row.expected) fn++; else tn++;
  assert.equal(found, row.expected, `${row.url}: eligibility`);
  assert.equal(events.some((event) => event.eligible), row.expected && source.aiInputAllowed !== false, `${row.url}: publication rights gate`);
  if (row.expectedKind) assert.equal(events[0]?.eventKind, row.expectedKind, `${row.url}: event kind`);
  assert.ok(eventDraftsFromMaterial(material, new Date(now.getTime() + 49 * 60 * 60_000)).every((event) => !event.eligible), "original dates remain authoritative");
  if (events[0]) assert.equal(sameNewsEvent(events[0], { ...events[0] }), true);
  return { url: row.url, publishedAt: row.publishedAt, expected: row.expected, events: events.map((event) => ({ title: event.titleAr, kind: event.eventKind, stage: event.actionStage, status: event.eventStatus, eligible: event.eligible, reason: event.reason, attributedTo: event.attributedTo })) };
});
console.log(JSON.stringify({ sampleOnly: true, description: reference.description, articles: rows.length, tp, fp, fn, tn, precision: tp / (tp + fp), recall: tp / (tp + fn), rows }, null, 2));
