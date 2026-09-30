# Source expansion audit — 30 September 2026

This supplements the earlier four-source audit. A reachable homepage is insufficient approval. Runtime access is checked again on the actual branch deployment before activation. No access-denial proxy is used by the new pipeline.

| Source | Audited entry / access | Dates, extraction, permission | Decision |
|---|---|---|---|
| Prime Ministry | https://www.pm.gov.jo/AR/Modules/News | Ten dated cards; detail headline and up to 80 paragraphs; short unchanged attributed excerpts and links permitted by `/AR/Pages/حقوق_النشر`; robots 404 | Retained |
| Labour | https://www.mol.gov.jo/AR/Modules/News | Ten dated cards and full detail section; same published reuse policy; RSS endpoint broken, not used | Retained HTML archive |
| House | https://www.representatives.jo/AR/Modules/News | Ten `YYYY/MM/DD` cards, detail section; robots allows root; `/AR/Pages/حقوق_النشر` permits links and short unchanged attributed excerpts | Added |
| Senate | https://www.senate.jo/AR/Modules/News | Ten dated cards; different `.media-body` listing and `h2.ms-2` detail headline; www host required; robots 404; same short-excerpt permission | Added |
| Digital Economy | https://www.modee.gov.jo/AR/Modules/News | Ten dated cards; empty card summaries require title fallback plus mandatory detail fetch; same copyright permission; robots 404 | Added |
| Al Mamlaka | https://almamlakatv.com/rss.xml | Ten RSS entries; `pubDate` was observed changing on updates. Original date is verified from the public article's **تاريخ الإنشاء** time element, ignoring آخر تحديث. Robots allows RSS/news; publisher syndication retained. Direct access can vary by deployment | Retained, failure isolated; no 403 bypass; article-date failure archives without eligibility |
| Roya | https://royanews.tv/rss | Atom provides `updated`, not `published`; https://royanews.tv/robots.txt declares `ai-input=no` and `search=yes` | Internal observation/archive only; no Gemini input or new publication |

## Sources audited and withheld

- **Petra:** https://petra.gov.jo/robots.txt has generic `User-agent: * / Disallow: /`, with named crawler exceptions. Nashmi does not impersonate those crawlers. No adapter and no replacement scraping of syndicated copies to bypass this restriction.
- **Al Ghad:** publisher-advertised `/rss` is accessible (15 items), but `/شروط-الاستخدام` limits commercial storage/reproduction/distribution. No adapter pending permission clarification. Observed RSS timezone discrepancy is not silently corrected.
- **Khaberni:** `/page/copyrights` permits personal noncommercial use and requires written permission for institutional reuse. No adapter.
- **Al Rai:** HTTP 403 challenge; no adapter or bypass.
- **Ammon:** homepage-advertised `RSS.php` returns 404. No speculative endpoint or adapter.
- **Saraya:** reachable HTML alone; reuse policy and stable dated feed not proven. No adapter.
- **IEC:** https://iec.jo/ar/archive/news has dated articles; policy for the required reuse was not established, and a different paginated parser would need validation. Deferred.
- **Official Gazette:** PM `/ar/Pages/NewsPaper` exposes document links. Original issue dates, PDF law extraction and permitted stable automation have not yet been validated. Deferred.

The official archives currently expose only ten listing entries each. They are not a claim of complete hourly coverage of every ministry or committee. House sessions/committee sections were found, but separate agenda adapters have not been validated. Party activities rely on permitted media coverage; there is no political quota or preference.

## Fetch limits and archive semantics

Each source has HTTPS/same-host/public-DNS checks, no redirect following, a 10-second request timeout, at most 25 requests and a 120-second source budget. Listing/detail size caps are 800/500 KB. Only overload errors receive one bounded retry; 403 is not retried. ETag/Last-Modified conditional requests are supported; parsed listing cache expires after 24 hours. Candidate/event archive TTL is 180 days.

`publishedAt` remains the original source date, never `lastSeenAt`. Day-only official dates use conservative Jordan midnight. Future `scheduledAt` is separate and does not renew a stale announcement. Roya's update timestamp is retained for archival observation but explicitly fails original-publication verification.
