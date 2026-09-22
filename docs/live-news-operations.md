# Nashmi live-news operations

## Safety defaults

- `NEWS_AUTO_PUBLISH=false` is the default and is the deployment starting state.
- Discovery candidates require a supported Jordanian category, a publication time inside the rolling window, confidence and Jordan-relevance thresholds, and at least one Google-grounded source whose final URL passes HTTPS, redirect, DNS, private-network, and publisher allow-list checks.
- The public ticker reads only `published`, active, non-expired items from the last 24 hours. MongoDB removes stored news after seven days through the `expiresAt` TTL index.

## Required production configuration

Use the same random 32+ character value for `NEWS_REFRESH_SECRET` in Vercel Production and the Cloudflare Worker secret. Never store the value in Git.

```text
NEWS_AUTO_PUBLISH=false
NEWS_GEMINI_MODEL=gemini-3-flash-preview
NEWS_MAX_NEW_ITEMS=8
NEWS_ACTIVE_HOURS=24
NEWS_RETENTION_DAYS=7
NEWS_MIN_CONFIDENCE=0.72
NEWS_MIN_JORDAN_RELEVANCE=0.8
GEMINI_ENABLE_GOOGLE_SEARCH=true
```

Deploy `cloudflare/news-refresh-worker`, set `NEWS_REFRESH_SECRET` with Wrangler/Cloudflare Secrets, and verify the `0 * * * *` trigger.

## Controlled launch

1. Leave `NEWS_AUTO_PUBLISH=false`.
2. Trigger at least two refreshes, separated enough to observe source and deduplication behavior.
3. Review the saved dry-run candidates in `/admin/news`: wording, dates, Jordan relevance, source URLs, source ownership, category, urgency, and legislative stage.
4. Reject launch if any candidate is unsupported, duplicated, partisan, stale, sensational, or sourced from an unapproved publisher.
5. Only after clean reviews, set `NEWS_AUTO_PUBLISH=true` in Vercel Production and redeploy.
6. Trigger one signed refresh, confirm the first real item in `/api/news/live`, then open it from the ticker and verify that a fresh chat is created with the immutable context card and saved sources.

## Rollback / kill switch

Set `NEWS_AUTO_PUBLISH=false` and redeploy to stop new publication while preserving dry-runs. Pause the Cloudflare Cron trigger to stop discovery entirely. An administrator can hide any existing item from `/admin/news`; hidden items disappear from the ticker immediately without deleting audit/history data. Rotating `NEWS_REFRESH_SECRET` in Vercel invalidates all Worker calls until the matching Cloudflare secret is updated.
