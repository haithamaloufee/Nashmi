# Nashmi news operations

## Pipeline and publication controls

Hourly Discovery → NewsCandidate → NewsEvent → daily editorial selection → NewsItem → ticker.
Discovery cannot update `currentBatchId` or create public NewsItems. Eligible unselected events remain in the pool for 48 hours from original publication, never from lastSeenAt. Older materials stay in the 180-day internal archive. Original dates are conservative Jordan midnight for day-only official archives; Mamlaka requires the article creation time, because RSS pubDate changes on updates. Roya is archival only (unverified original Atom publication date and ai-input=no).

`NEWS_PIPELINE_MODE` defaults to `legacy`. `shadow` collects and selects without publication. `new` additionally requires `NEWS_AUTO_PUBLISH=true` and Production environment. An explicitly isolated Preview test also requires `NEWS_PREVIEW_TEST_PUBLISH=true`; it must be removed after verification. There is no unconditional Preview publication. Local pipeline writes require a specifically named disposable replica set and `NEWS_PIPELINE_TEST_DB=true`.

`NEWS_MAX_NEW_ITEMS=20` is a ceiling, not a target. Server/model/schema/API/ticker all enforce 20; at most 100 current eligible events reach editorial review. Criteria are civic impact, freshness, documentation, official source quality and subject diversity, without political preference or party quotas. The model returns existing IDs only, never invented text. Invalid IDs, duplicates and oversized selections fail closed. Primary/fallback Gemini usage counts and reported token counts are included in diagnostics.

## Sources and health

See [the expansion audit](news-expansion-source-audit-2026-09-30.md) and the prior audit for exact access and exclusions. Seven registry entries include three added official sources; Roya cannot feed Gemini/publication. The five official archives expose ten cards each and are not complete coverage of every ministry. No Petra/Al Rai access bypass exists in the new pipeline. One failed source does not stop successful sources. No-match days are not filled with unsuitable news.

Requests have same-host/public-DNS checks, no redirects, size/time limits and a 25-request source budget. A source may retry an overload once, respecting bounded Retry-After. ETag/Last-Modified cache is supported. Discovery stats include actual requests/bytes/retries/cache hits/time; injected replay readers report no production-fetch metrics. These measurements are not a claimed dollar cost or long-term availability guarantee.

## Preview verification

Before every pipeline write, native Mongo verification must prove database `nashmi_preview` and only exact built-in read/readWrite roles for that database. Mongoose/index creation follows this proof. Unknown/custom/broad roles are rejected. Never write-probe Production privileges.

Branch-specific Vercel configuration must override MONGODB_URI for `feat/news-discovery-redesign`; verify actual runtime with the signed GET `/api/internal/news/preview-check`. Secrets are kept in ignored `.env.preview.local` and `.env.news-preview.local`, never reports/Git.

Commands: `news:preview-check`, `news:preview-request -- dpl_<id> check|discover|select|publish`, `news:preview-inspect`, `news:preview-replay`, `news:preview-publication-check -- transaction|capacity|repeat`, and `news:preview-browser-check -- dpl_<id> https://<deployment>.vercel.app ticker|publication|smoke`.

The replay harness runs locally against the restricted Preview database; label it separately from deployed API verification. It caches identical inputs, checks no new duplicates, source failure isolation, +48h expiry, evidence links and Shadow's unchanged public pointer/count. The capacity test submits 21 synthetic boundaries (rejected) and 20 (insert path succeeds, deliberately rolled back before visibility); no synthetic public news is left behind. Actual publication testing uses real current events and the deployed signed refresh endpoint. A dedicated Preview-only test admin supports authorized hide/unhide and chat-context tests; disable it after testing. Restore Preview shadow/auto=false and remove its publication flag.

## Worker and activation

The prepared Worker schedules hourly discovery `30 * * * *` UTC and daily editorial `0 3 * * *` UTC (06:00 Asia/Amman). Daily publication also has a Jordan-calendar-day server guard. Different HMAC secrets sign discovery and editorial paths; each must match on Vercel and Worker. The current deployed schedule/settings/source must be backed up before activation, and inspected after deployment. Do not retain a second hourly publisher.

Activate only after source/evidence/freshness/deduplication/publication/atomicity/UI gates, exact PR CI/Preview SHA, master CI/deploy and rollback preparation pass. Match `/api/version` to the merged SHA. Deploy and configure matching Worker/Vercel secrets before enabling new auto-publication. Perform authenticated status inspection, actual Discovery, controlled editorial and public API/ticker/chat smoke; never send synthetic fixtures to Production.

## Atomic publication and rollback

A transaction inserts the complete batch, deactivates previous items, swaps `currentBatchId` under editorial ownership and marks events published. Any failure or zero selection preserves the previous valid batch. A unique event-to-item index prevents repeated publication. Preview initialization and Production ingestion create required indexes additively; no index drops. Public visibility requires published/active/current-batch/non-expired records and the existing seven-day display retention; hidden items do not appear. Published older batches remain available for audit and existing chat snapshots retain their source context.

To stop publication: set `NEWS_AUTO_PUBLISH=false` and redeploy. To keep observation/selection without publication: `NEWS_PIPELINE_MODE=shadow`. To restore old behavior: `legacy`, restore the daily-only Worker schedule, and keep matching refresh secrets on both sides. Preserve existing Production news/current batch. No rollback deletes articles.

GET `/api/internal/news/status` is read-only and HMAC-authenticated with NEWS_DISCOVERY_SECRET; it returns SHA/mode/database, candidate/event/reason counts, current batch, last editorial stats and source health. Admin `/admin/news` and diagnostics provide authorized investigation. GET inspection signatures cannot authorize POST mutations. No credentials or personal user data are returned.