# Nashmi daily news batch

## Proposed discovery pipeline (inactive in Production)

`NEWS_PIPELINE_MODE=legacy` is the default and current Production setting. In `shadow`, `/api/internal/news/discover` ingests official archive entries and the two existing media feeds into `NewsCandidate` and `NewsEvent`, while `/api/internal/news/refresh` makes one daily editorial selection without public publication. In `new`, public publication is additionally allowed only when `VERCEL_ENV=production`; switching modes and changing Cloudflare Cron require separate approval. Source discovery never updates `currentBatchId` or public `NewsItem` records. The `/api/news/live` response and ticker-to-assistant link retain their existing shape.

The source registry, limits and exclusions are recorded in [the 30 September source audit](news-source-audit-2026-09-30.md). A candidate keeps the original publisher date and URL. Events hold one or more source passages and action stages. Unselected eligible events remain available until 48 hours after the original publication date; older material stays in the 180-day archive but cannot enter a new batch. Identical URLs are idempotent, and a unique event-to-item index plus a transaction prevents double publication. An empty editorial selection leaves the existing public batch intact. Admin diagnostics shows source health, candidates, events, reasons, and the last selection.

Before any Preview write, verify the deployed branch's `MONGODB_URI` resolves to database `nashmi_preview` and that its authenticated roles are restricted to that database. `assertPipelineWriteIsolation()` rejects a Preview connection with another database or broader roles; it does no writes during this check. The configured Preview environment and branch deployment must also be checked outside the repository before a Preview replay. A local `news:live-replay` writes only to a disposable in-memory replica set and never contacts Production MongoDB. Production must remain read-only during validation.

For the proposed Worker, see its README. The checked-in Cron change is preparation only; do not deploy it while Production remains on `legacy`. The additional secret is `NEWS_DISCOVERY_SECRET` (32+ characters). Keep it out of source control.

## One daily run

Cloudflare Cron `0 3 * * *` runs at 03:00 UTC, approximately 06:00 Asia/Amman (UTC+3). Its HMAC-signed request reaches `POST /api/internal/news/refresh`. There should be exactly one Production trigger; the former hourly `0 * * * *` trigger must not remain.

Nashmi fetches the public Al Mamlaka RSS (`almamlakatv.com/rss.xml`) and Roya Atom (`royanews.tv/rss`) feeds. Direct fetch is attempted first; the Worker provides a fallback for only these two fixed sources. Up to 100 valid articles per feed can be read if supplied. Articles older than seven days, repeated normalized URLs/titles and obvious unrelated headlines are removed. Local Arabic-normalized topic scoring checks both title (full weight) and summary (half weight), and requires a meaningful policy/institutional action. Only the 25 strongest topic matches go to one Gemini final-editor request. The model returns up to 10 indexes and categories; it does not write or research stories. Publisher title, summary, source URL, and publication time are preserved. A fallback model is attempted only if the primary request fails.

Feed limitation observed on 26 September 2026: the general Roya feed exposed 25 entries spanning about five hours; Al Mamlaka exposed 10 entries spanning about one hour. The seven-day cutoff accepts older entries *if the publisher feed supplies them*, but does not imply seven days of feed coverage. The public publisher pages checked did not advertise a stable section RSS/Atom endpoint, so no undocumented endpoint or HTML scraping was added. A no-match day can mean the shallow general feeds omitted the relevant article; do not weaken the topic threshold to fill the ticker. The admin news page shows raw, age-filtered, deduped, hard-exclusion, positive-topic, Gemini-input and selected counts, including per-publisher raw/topic matches.
If one publisher feed is unavailable, the other can still produce a batch; the failed source is logged. If both feeds fail, the previous batch remains active.

Production uses `NEWS_AUTO_PUBLISH=true`, `NEWS_GEMINI_MODEL=gemini-3.5-flash-lite`, `NEWS_GEMINI_FALLBACK_MODEL=gemini-3.1-flash-lite`, `NEWS_MAX_NEW_ITEMS=10`, and `NEWS_RETENTION_DAYS=7`. `NEWS_ACTIVE_HOURS` is obsolete. No images or article pages are created. The ticker still links directly to a fresh Nashmi chat with the story context; live verification happens only when a user asks for an update.

## Safe activation

`NewsRefreshState.currentBatchId` identifies the one current batch; `NewsItem.batchId` associates its stories. A MongoDB transaction inserts and verifies the selected items, deactivates the previous items, and changes the current pointer together. An exception rolls everything back. A feed error, invalid model output, source validation failure, or database error leaves the previous batch untouched. Zero selected stories also leave it unchanged. Public visibility requires the current batch, published/active status, non-expired retention, and a publication date within the last seven days. A hidden item is excluded. Older batches remain stored temporarily for audit and TTL cleanup.

Preview deployments and local defaults only dry-run; they must not replace Production's current batch. The existing admin manual refresh runs the same batch pipeline: it publishes in Production and previews in Preview. Admin hide/unhide remains available. `NEWS_REFRESH_SECRET` must be the same random 32+ character secret in Vercel Production and the Cloudflare Worker secret store; never commit it.

## Verification and rollback

Run `npm run test:news`, `npm run test:security`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run bundle:check`. Check `NewsRefreshState.lastStats`, `currentBatchId`, the public `/api/news/live`, and a headline-to-chat click after a controlled Production refresh. To stop new batches, set `NEWS_AUTO_PUBLISH=false` and redeploy or pause the daily Cloudflare trigger. Neither action deletes the current batch; items older than seven days hide naturally. Rotate the HMAC secret on both sides together.
