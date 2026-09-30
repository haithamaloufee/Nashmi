# Nashmi news scheduling

The Worker configuration runs hourly discovery at `30 * * * *` UTC and daily editorial at `0 3 * * *` UTC (06:00 Asia/Amman). Discovery and refresh use separate HMAC secrets (`NEWS_DISCOVERY_SECRET`, `NEWS_REFRESH_SECRET`) and different paths. Each secret must match Vercel Production. The discovery route returns 409 in `legacy`. The server also guards publication to one batch per Jordan calendar day.

Activation requires the acceptance gates in `docs/live-news-operations.md`. The user has authorized deployment conditionally on these gates; approval does not permit bypassing a failed gate. Keep `shadow` and auto-publication false while coordinating configuration, exact merged SHA and Worker deployment. Supply secrets through the CLI's secret input/file mechanism, never command arguments or logs.

```text
npx wrangler secret bulk <ignored-secret-file>
npx wrangler deploy
```

Verify actual deployed schedules, bindings, version and `/health` after deployment; a dry run is not deployment proof. `/health` never triggers either job. `npm run test:news:worker` checks both Cron branches against the server HMAC verifier with mocked transport; it does not claim that Cloudflare has executed a live scheduled event.

Rollback: first set Vercel `NEWS_AUTO_PUBLISH=false`, `NEWS_PIPELINE_MODE=shadow` and redeploy. To return to Legacy, restore the backed-up daily-only Worker source/schedule and set mode `legacy`; retain the current matching refresh secret on both sides. Stored secret plaintext cannot be recovered, so do not attempt to restore an unknown previous secret. Preserve all Production news, events and the current batch. The legacy `/feed` endpoint is retained for compatibility, but the new pipeline never uses it to bypass an unavailable publisher.
