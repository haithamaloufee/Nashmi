# News source audit — 30 September 2026

This records access checks, not a claim that every official decision is indexed. Only the four enabled entries in `sourceRegistry.ts` are fetched by the new pipeline.

| Source | Entry point and method | Dated archive / detail | Access and extraction result | Decision |
| --- | --- | --- | --- | --- |
| [Prime Ministry](https://www.pm.gov.jo/AR/Modules/News) | Public HTML archive, fixed-host detail links | Ten dated cards visible in live check; detail has `NewsSection` paragraphs and sometimes separate decision headings | 10/10 live cards and details parsed; replayed Cabinet bulletins dated 17, 20 and 27 September. `robots.txt` returned 404. [Reuse notice](https://pm.gov.jo/AR/Pages/%D8%AD%D9%82%D9%88%D9%82_%D8%A7%D9%84%D9%86%D8%B4%D8%B1) allows links and short unmodified attributed extracts. | Enabled, bounded to 30 cards and 40 detail paragraphs. Missing an archive pagination guarantee; long headings can be excluded. |
| [Ministry of Labour](https://www.mol.gov.jo/AR/Modules/News) | Public HTML archive, fixed-host detail links | Ten dated cards visible in live check; detail has `NewsSection` paragraphs | 10/10 live cards and details parsed; replayed dated detail pages. `robots.txt` returned 404. Published [RSS URL](https://www.mol.gov.jo/RSSFeeds/RSSNewsAR.aspx) reports the service disabled, so it is not used. Reuse notice follows the same link/short extract restriction. | Enabled using archive HTML only. |
| [Al Mamlaka](https://almamlakatv.com/rss.xml) | RSS | 10 entries at live check, generally shallow | 10/10 parsed; existing source and URL validation retained. | Enabled as secondary corroboration, not assumed to cover the last 48 hours. |
| [Roya](https://royanews.tv/rss) | Atom | 25 entries at live check, generally shallow | 25/25 parsed; existing source and URL validation retained. | Enabled as secondary corroboration, not assumed to cover the last 48 hours. |
| [Independent Election Commission](https://iec.jo/ar/archive/news) | Public dated archive | Dated detail links and permissive news robots path observed | Detail structure and repeatable paging were not validated for this code. | Deferred; no adapter. |
| [Ministry of Health](https://moh.gov.jo/) | Public site | Central news listing was stale at audit (latest observed 22 August) | No repeatable timely archive validated. | Deferred; no adapter. |
| Ministry of Education | Public site | News detail paths present | Robots rules disallow `/ar/content/*`. | Deferred; no adapter. |

The government archive date shows the civil day without a time. The pipeline conservatively assigns 00:00 Asia/Amman and starts its 48-hour window there. A later site modification date never renews freshness. Only a small attributed passage and original title/link are stored; no full article is republished.

## Reference and live checks

`npm run news:historical-replay` fetches eight real official detail pages dated 9–29 September, applies the pipeline at publication date +24 hours, and prints each extracted event and stage. The manually reviewed sample contains six material-level positives and two routine negatives. Current extraction finds a qualifying draft for five positives and excludes both negatives; the 9 September park directive is missed because its exact source headline and action passage exceed the 180-character title limit. The 17 September bulletin contains separately evidenced draft approval, reasons approval and other decisions. Do not substitute a generated short headline without source text.

`npm run news:live-replay` fetched the four live entries into a disposable local MongoDB replica set on 30 September at 02:19 UTC: 55 source materials, 55 candidates, 59 event drafts, one eligible event, zero public items. Identical second input yielded 55 duplicate candidates and zero new ones. The selection dry run chose zero; `currentBatchId` stayed null. These counts describe the observed entry pages only, not all Jordanian news. The test database is destroyed after the run.
