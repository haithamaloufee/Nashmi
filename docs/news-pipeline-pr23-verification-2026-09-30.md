# PR #23 verification — 30 September 2026

This is the earlier verification snapshot. Subsequent expansion, real Preview publication, UI repairs and updated measurements are recorded in [news-expansion-verification-2026-09-30.md](news-expansion-verification-2026-09-30.md). Statements below about remaining work and Production status refer to their original snapshot.

Historical and local replay results used a disposable local MongoDB replica set. Subsequent isolated Preview verification is documented below. Production was read only; its pipeline remains on legacy.

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

## Preview isolation and actual runtime verification

The initial Vercel environment listing showed a shared Production/Preview MongoDB Secret without an override for this branch. The initial Preview correctly rejected that inherited URI. After the user created `nashmi_news_preview`, its only Atlas role was confirmed as `readWrite@nashmi_preview`, limited to Cluster0. The copied password was transferred through the Git-ignored local configuration file, converted to a URI targeting `nashmi_preview`, and the temporary password field was removed. No credential was logged or committed.

Before any database write, the native MongoDB driver connected read only and confirmed the actual database and exact role. A `connectionStatus: 1, showPrivileges: true` audit found **zero write privileges outside nashmi_preview**. No Production write probe was attempted. Listing/reading an unrelated database did not yield an authorization error, so no claim is made that an actual denied read proved isolation; the built-in database-specific role and expanded privileges are the write-boundary evidence.

Through official Vercel CLI settings, this branch received its own `MONGODB_URI` Secret, `NEWS_PIPELINE_MODE=shadow`, `NEWS_AUTO_PUBLISH=false`, and separate HMAC Secrets, all scoped to **Preview / feat/news-discovery-redesign**. Production settings were not changed. The signed GET on deployment `dpl_HFTCp7eJgufmJMHzw3Jc5TDTJAX8` confirmed `database=nashmi_preview`, `readWrite@nashmi_preview`, `mode=shadow`, the intended branch and commit `a83c33e`. An unsigned GET received 401.

## Actual Preview Discovery

The first POST on the Vercel deployment at 09:55 UTC saved **45 candidates and 57 events**, with one eligible event. Prime Ministry and Ministry of Labour each supplied ten materials without extraction errors; Roya supplied 25. Al Mamlaka returned HTTP 403 from Vercel. The other three sources continued normally. This hosting-specific failure is not counted as successful deployed source coverage.

The first event exclusions were: 31 older than 48 hours, 23 without verified action, one unrelated topic, and one outside civic scope. The 31 older events remained archived. The eligible event was the Ministry of Labour's 29 September inspection action linked in the examples above. It uses the original date at Jordan midnight with `datePrecision=day`; it is an enforcement action already carried out, not a new legislative decision.

A second actual deployed POST found 45 materials: **44 duplicates and one genuinely new Roya URL**, with no error from the government sources. This is a changed live feed, so it is not presented as an identical-input replay.

## Identical-input replay against the isolated Preview database

The local operator harness fetched and cached 55 real materials, then repeated exactly those cached inputs against `nashmi_preview`. Al Mamlaka was accessible from this local network and supplied ten additional candidates. At the end of the cached replay, the database had **56 candidates and 68 events**, including the one new Roya URL between deployed requests. Replaying the cached 55 inputs created **zero candidates and zero events**, with all 55 recognized as duplicates. This harness used the actual isolated Atlas Preview database; its source fetching did not run inside Vercel.

The exclusions at that cached-replay snapshot were 31 older than 48 hours, 31 without verified action, four outside civic scope, one unrelated topic, and one eligible event. All 68 events had a supporting passage, source URL, and a candidate reference that resolved. A simulated Ministry of Labour source failure left all ten Prime Ministry inputs processing successfully. Advancing time by 48 hours and one millisecond yielded zero eligible events, zero selected events and zero published items, without deleting the archive.

## Shadow editorial and public visibility

The actual Vercel Preview editorial POST invoked `gemini-3.5-flash-lite`, selected the one eligible event, and returned `published=0` and `mode=shadow`. Database inspection confirmed zero NewsItems and `currentBatchId=null`. The event remained eligible after shadow selection. The deployed `/api/news/live` returned an empty item array, and the Preview homepage was inspected in Browser without exposing the discovered event. No approval or publication was inferred from Discovery success.

The actual deployed fallback was also exercised: a temporary branch-only `NEWS_GEMINI_MODEL=gemini-nonexistent-news-replay` caused primary failure on deployment `dpl_6aDkkzPGPsQqZiTrFB2hNpF1QtLu`. The editorial endpoint then used `gemini-3.1-flash-lite`, selected one event, and published zero. The temporary model override was removed before the final revision deployment, restoring the inherited primary model. These are actual Vercel runtime calls, not mocked selectors. Two successful deployed editorial runs were made: one primary and one fallback; the forced invalid primary request adds a failed model attempt.

A final real deployed Discovery restored source-health diagnostics after the simulated failure. At 10:09 UTC, the database contained **57 candidates and 69 events** after another new Roya URL. The final exclusions were 32 without verified action, 31 older than 48 hours, four outside civic scope, and one unrelated topic; one event remained eligible. All 69 evidence links resolved to their candidate with matching source URL/publisher and reverse event reference. Public item count stayed zero and the batch pointer stayed null.

## Verification gates and remaining limits

News tests, pipeline regression tests, security, types, lint, build and bundle budgets passed locally. CI and Vercel passed for `a83c33e`; the operator inspection/replay scripts and final documentation are included in the follow-up revision. The native isolation tests prove inspection creates no collections and rejects unknown or broad roles before Mongoose connects.

Production remains on legacy, no PR was merged, Cloudflare Cron was not changed, and no Production batch was published. Ministry coverage remains limited to Prime Ministry and Labour; MODEE and IEC remain audited references without unverified adapters. Al Mamlaka's Vercel 403 still needs resolution before it can be counted in deployed coverage. Actual atomic publication/rollback was tested on a disposable local replica set, not by publishing a Preview or Production batch. Gemini token usage and billed costs were not instrumented; no monetary estimate is claimed.
