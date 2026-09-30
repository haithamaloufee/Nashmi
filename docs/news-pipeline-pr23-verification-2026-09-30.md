# PR #23 verification — 30 September 2026

All write-based results below used a disposable local MongoDB replica set. Production was read only. The new pipeline was not enabled, and no Preview database write was attempted.

## Before and after

| Measurement | Earlier PR run | Latest local run |
| --- | ---: | ---: |
| Live observed materials | 55 | 55 |
| Live stored events | 59 | 67 |
| Live eligible events | 1 | 1 |
| Historical official detail pages | 8 | 8 |
| Historical extracted events | 16 | 30 |
| Historical positive articles found | 5/6 | 6/6 |
| Historical negative articles excluded | 2/2 | 2/2 |
| Repeat candidates created | 0 | 0 |
| Public items created in dry run | 0 | 0 |

The earlier 59-event run did not record event-level exclusion reasons, so a precise retrospective distribution for those exact records is unavailable. The latest live run at 03:21 UTC recorded **67 events**: 34 `no_verified_action` (10 Al Mamlaka, 24 Roya), 1 `outside_civic_scope` (Roya), 31 `older_than_48_hours` (22 Prime Ministry, 9 Ministry of Labour), and 1 eligible Ministry of Labour enforcement action. The 55 source materials and 67 events are different units because one Cabinet bulletin can contain multiple decisions. The official archive entries had dates only; the 48-hour window starts at 00:00 Jordan time on their original publication day. The 31 stale events remain archived, and the one eligible event remains available for later selection within its window. The latest run selected zero in shadow mode and left `currentBatchId` null.

Excluded sample, retaining the recorded precedence of the 48-hour reason over other reasons:

| Source item | Reason | Review |
| --- | --- | --- |
| [Al Mamlaka, US consumer confidence](https://almamlakatv.com/news/211360-) | `no_verified_action` | Foreign economic indicator; no Jordanian civic decision. |
| [Roya, US military report](https://royanews.tv/news/396395) | `no_verified_action` | Foreign military report; no Jordanian civic decision. |
| [Roya, restaurant opening](https://royanews.tv/news/396381) | `outside_civic_scope` | Commercial opening, not a government action. |
| [Prime Ministry, AI leadership workshop](https://www.pm.gov.jo/Ar/NewsDetails/am0947) | `older_than_48_hours` | Also a routine workshop, excluded in historical replay at +24 hours. |
| [Ministry of Labour, meeting with Egyptian counterpart](https://www.mol.gov.jo/ar/NewsDetails/وزير_العمل_يستقبل_نظيره_المصري_في_عمّان_لبحث_تعزيز_التعاون_العمالي) | `older_than_48_hours` | Also a routine meeting, excluded in historical replay at +24 hours. |

The original 16 historical events were **under-extracted**, not proven over-split. On the actual government pages, the 17 September bulletin has 11 substantive lead headings, one of which explicitly combines a regulation approval and an approval of reasons for a different regulation; it now yields 12 events. The 20 September bulletin has eight lead headings and an independent body-only decision on Petra commissioners; it yields nine. The 27 September bulletin has four separate decisions; it yields four. The grouped approvals of two institutions' organizational regulations and of two universities' reward/savings regulations stay grouped, because the source does not provide a separate operative clause for each. Explanatory paragraphs and repetitions of lead headings do not become new events.

The long 9 September park item failed because the archive HTML `<title>` was 237 characters and the operative text exceeded the old 180-character headline limit. The detail page's own `<h2>` is 140 characters, so it now supplies the exact title. Its ten detail paragraphs were not truncated, and Gemini did not receive the item before extraction. A separate Arabic normalization mismatch made `رئيس الوزراء` fail the former official-action check. Both are fixed and covered by a regression test. During the same audit, the 17 September bulletin had 57 detail paragraphs but the parser kept only 40; the limit is now 80. Three actual decisions with long headings (National Water Carrier facilitation, grain-purchase allocation, and chambers of commerce board dissolution) are now extracted from verbatim operative clauses. No generated titles are substituted. The Ministry of Labour's 29 September inspection action is now `enforcement_action` instead of a directive.

## Official decision examples

These were observed in real public official detail pages and were eligible **at publication +24 hours in historical replay**. They were not selected or published. Their actual live status on 30 September is governed by the 48-hour window.

| Original date and source | Verified action | Stage and eligibility |
| --- | --- | --- |
| [9 September, Prime Ministry](https://pm.gov.jo/Ar/NewsDetails/am0937) | Prime Minister directed the start of procedures to create six parks. | `directive`; eligible at +24h, too old on 30 September. |
| [17 September, Cabinet](https://www.pm.gov.jo/Ar/NewsDetails/anews10586) | Approved a draft amendment to the Independent Election Commission law. | `cabinet_approved_draft`; eligible at +24h, too old on 30 September. |
| [17 September, Cabinet](https://www.pm.gov.jo/Ar/NewsDetails/anews10586) | Approved reasons for a draft amendment to the anti-money laundering law. | `cabinet_approved_reasons`, **not an enacted law**; eligible at +24h, too old on 30 September. |
| [17 September, Cabinet](https://www.pm.gov.jo/Ar/NewsDetails/anews10586) | Approved a decision granting National Water Carrier project facilitation and exemptions. | `decision_adopted`; eligible at +24h, too old on 30 September. |
| [20 September, Cabinet](https://www.pm.gov.jo/Ar/NewsDetails/anews10594) | Approved establishing a development zone in Ma'an. | `decision_adopted`; eligible at +24h, too old on 30 September. |
| [20 September, Cabinet](https://www.pm.gov.jo/Ar/NewsDetails/anews10594) | Decided to end the service of three Petra Development and Tourism Region Authority commissioners. | `decision_adopted`; eligible at +24h, too old on 30 September. |
| [27 September, Cabinet](https://www.pm.gov.jo/AR/NewsDetails/anews10595) | Approved a regulation amending use of electronic means in civil judicial procedures. | `decision_adopted`; eligible at +24h, too old on 30 September. |
| [29 September, Ministry of Labour](https://www.mol.gov.jo/ar/NewsDetails/وزارة_العمل_تضبط_60_عاملاً_وعاملة_منزل_مسجلة_بحقهم_بلاغات_هروب) | Inspection teams apprehended 60 domestic workers with reported absconding notices. | `enforcement_action`, an action already carried out; the one eligible live event, not selected. |

Each extracted event stores its source URL and exact supporting passage. The local tests assert that events have evidence, repeat input does not create another candidate or event, one failed source does not stop healthy sources, a shadow editorial pass does not create a public item, the public ticker query sees no shadow events, a failed batch transaction leaves no partial publication, and an unselected eligible event remains eligible. Historical replay found eight duplicate candidates on repetition; live replay found 55.

## Preview isolation

Vercel CLI is authenticated to project `haithamaloufees-projects/nashmi`. Its initial environment listing on 30 September shows a shared secret `MONGODB_URI` scoped to **Production and Preview**, with branch-specific overrides only for `fix/media-upload-10mb-formats` and `fix/storage-chat-runtime`. There is no MongoDB override for `feat/news-discovery-redesign`. Vercel CLI cannot reveal those Secret values for reuse. A separate local URI was inspected without printing it: it connects to `sharek_demo` with `readWriteAnyDatabase` on `admin`, so it cannot serve as a safe Preview credential. After the browser connection recovered and the user signed in to Atlas, the database user `nashmi_preview_app` was inspected: its sole role is `readWrite@nashmi_preview`, with no built-in or custom additional role. This verifies the Atlas configuration, not the deployed connection. Its password remains unavailable because saved Vercel Secrets are write-only. The user completed credential generation and creation of `nashmi_news_preview`; the resulting Atlas row confirms `readWrite@nashmi_preview` and access to one cluster. Its copied password was unavailable in the Browser clipboard, so transfer through the ignored local configuration file is still pending. No MongoDB URI change or Preview database write has been made.

The branch now has dedicated Vercel configuration `NEWS_PIPELINE_MODE=shadow`, `NEWS_AUTO_PUBLISH=false`, and separate secret values for `NEWS_DISCOVERY_SECRET` and `NEWS_REFRESH_SECRET`, added through the official CLI for **Preview / feat/news-discovery-redesign only**. Production settings were not changed. The isolation gate was strengthened to inspect the native MongoDB connection before opening Mongoose; its exact role allowlist prevents unknown/broad roles from passing. An authenticated disposable local replica-set test proves the native inspection creates no collections, a restricted user cannot inspect an unrelated database, and a broad user is rejected while Mongoose remains disconnected. A signed `GET /api/internal/news/preview-check` exposes read-only runtime verification only on Preview; its signature binds both the method and path. Production receives 404 from this route. Inspection credentials cannot authorize Discovery POST requests. The operator request script requires the actual runtime to confirm the isolated database, intended branch, and shadow mode before any write-based test.

The actual Gemini primary and fallback paths were exercised locally with public official evidence and a local key; both returned one constrained ID. This did not use the Preview deployment or publish anything. GitHub `validate` and the Vercel deployment passed for commit `d471ec8`; the [Preview deployment](https://nashmi-81rzjqr36-haithamaloufees-projects.vercel.app) is `Ready`, and an authenticated read-only GET to `/api/version` returned that exact SHA and `environment: preview`. A read-only GET to `/api/news/live` returned `SERVER_ERROR`; the corresponding Vercel runtime log states `Invalid environment variable MONGODB_URI: PREVIEW_DATABASE_ISOLATION_FAILED`. This is the expected isolation guard rejecting the inherited shared URI. Thus the actual Preview ticker response, Discovery, persistence, repeat ingestion, and shadow selection remain unverified until the branch receives a restricted `nashmi_preview` credential. Production remains on `legacy`; Cloudflare Cron was not changed.

## Follow-up isolation verification

The native connection and role audit, method-bound GET inspection route, and signed Preview request tooling passed `test:news`, `test:news:pipeline`, `test:security`, `typecheck`, `lint`, `build`, and `bundle:check` locally on 30 September. The authenticated replica-set test checks database permissions and confirms inspection leaves Mongoose disconnected and the Preview database without collections. Atlas user creation is confirmed; actual Preview connection verification and persistence are pending credential transfer and the next deployment.
