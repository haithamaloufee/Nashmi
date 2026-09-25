# Nashmi live-news operations

## Production pipeline

The Cloudflare Worker runs hourly (`0 * * * *`) and signs `POST /api/internal/news/refresh` with HMAC. Nashmi fetches the public RSS feed from Al Mamlaka (`almamlakatv.com/rss.xml`) and the Atom feed from Roya (`royanews.tv/rss`). When Vercel cannot reach a publisher directly, the Worker serves only these two explicitly allow-listed feeds through `/feed?source=mamlaka|roya`. It is not an open proxy.

These publishers are discovery sources, not blanket publication approvals. Petra remains a trusted national wire for corroboration and official Jordanian institutions are primary sources for legal or government facts. No automated connectors are enabled for Petra, official institutions, Al Ghad, Al Rai or Addustour. Their public listings were assessed, but a stable permitted machine-readable feed with sufficiently precise timestamps has not been verified for the one-hour active window; do not add fragile HTML scraping or bypass publisher restrictions.

## Editorial gate

The inexpensive first filter requires civic/political subject matter and a change/action signal, and excludes obvious routine incidents and promotions. Gemini then returns a structured decision for each candidate: `relevant`, category, civic impact and reason code. Only positively relevant medium/high-impact items proceed. A model failure tries the configured fallback model, then permits only unmistakable legislative/electoral phrases; it never falls back to geography or a ministry mention. An item must still have a recent timestamp and validated HTTPS source URL. The original publisher title, summary, publication time and link remain unchanged.

The public ticker reads `published`, active, non-expired records whose **publishedAt** is within `NEWS_ACTIVE_HOURS` (one hour in Production). Repeated RSS discovery only updates `lastSeenAt`; it does not extend visibility. MongoDB TTL removes stored records after seven days. If no qualifying story exists, the ticker hides instead of filling with unrelated headlines. Source URL hashes and same-event matching merge duplicate coverage without merging different legislative topics.

## Current production configuration

The intended automatic-publishing settings are:

```text
NEWS_AUTO_PUBLISH=true
NEWS_GEMINI_MODEL=gemini-3.5-flash-lite
NEWS_GEMINI_FALLBACK_MODEL=gemini-3.1-flash-lite
NEWS_MAX_NEW_ITEMS=10
NEWS_ACTIVE_HOURS=1
NEWS_RETENTION_DAYS=7
```

`NEWS_REFRESH_SECRET` must be the same random 32+ character secret in Vercel Production and the Cloudflare Worker secret store; never commit it. `GEMINI_API_KEY` is required by the classifier. `NEWS_MIN_CONFIDENCE` and `NEWS_MIN_JORDAN_RELEVANCE` remain available to the separate search-based discovery module but are not a substitute for this feed editorial gate. Confirm actual Vercel values before changing them.

## Verification and rollback

Run `npm run test:news`, `npm run typecheck`, `npm run lint`, `npm run build`, and the public Playwright smoke tests. Use a dry-run signed refresh to inspect accepted/rejected counts before production publication. Check `/api/news/live` and click a headline to confirm the selected-story chat context. Admins can hide an existing item without deleting it. Setting `NEWS_AUTO_PUBLISH=false` and redeploying stops new publication; pausing the Cloudflare Cron stops discovery. Rotating the shared secret requires updating both sides together.
