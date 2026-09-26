# Nashmi daily news batch

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
