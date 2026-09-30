import { eventDraftsFromMaterial, sameNewsEvent } from "../src/lib/news/pipelineCore";
import { NEWS_SOURCES, parseGovernmentArchive, parseGovernmentDetail, parseRegisteredFeed } from "../src/lib/news/sourceRegistry";

async function get(url: string) {
  const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(12_000), headers: { "User-Agent": "NashmiNews-Feasibility/1.0 (+https://nashmi.haitham.website)" } });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const body = await response.text();
  if (body.length > 800_000) throw new Error("RESPONSE_TOO_LARGE");
  return body;
}

async function main() {
  const now = new Date();
  const all = [] as ReturnType<typeof eventDraftsFromMaterial>;
  const sourceResults = [];
  for (const source of NEWS_SOURCES) {
    try {
      const response = await get(source.url);
      const materials = source.access === "public_archive" ? parseGovernmentArchive(response, source) : parseRegisteredFeed(response, source, now);
      let relevant = 0;
      let excluded = 0;
      let events = 0;
      for (const material of materials) {
        if (source.access === "public_archive") {
          try { material.paragraphs = parseGovernmentDetail(await get(material.url)); }
          catch { /* A single detail failure is visible through the resulting exclusion. */ }
        }
        const drafts = eventDraftsFromMaterial(material, now);
        events += drafts.length;
        relevant += drafts.filter((draft) => draft.eligible).length;
        excluded += drafts.filter((draft) => !draft.eligible).length || (drafts.length ? 0 : 1);
        all.push(...drafts.filter((draft) => draft.eligible));
      }
      sourceResults.push({ source: source.id, responding: true, materials: materials.length, events, relevant, excluded });
    } catch (error) {
      sourceResults.push({ source: source.id, responding: false, reason: error instanceof Error ? error.message : "unknown" });
    }
  }
  const groups: typeof all = [];
  for (const event of all) if (!groups.some((existing) => sameNewsEvent(existing, event))) groups.push(event);
  console.log(JSON.stringify({ observedAt: now.toISOString(), sources: sourceResults, eligibleEventsBeforeGrouping: all.length, eligibleEventsAfterGrouping: groups.length, eligibleTitles: groups.map((event) => event.titleAr) }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
