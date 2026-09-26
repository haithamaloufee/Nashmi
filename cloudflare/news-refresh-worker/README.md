# Nashmi daily news refresh worker

The Worker invokes the production-only internal refresh endpoint once a day at `0 3 * * *` UTC, corresponding to approximately 06:00 Asia/Amman (UTC+3). Store the shared secret with `wrangler secret put NEWS_REFRESH_SECRET`; never place it in `wrangler.toml` or source control. The same value must exist as `NEWS_REFRESH_SECRET` in Vercel Production.

Deployment:

```text
npx wrangler deploy
npx wrangler secret put NEWS_REFRESH_SECRET
```

Keep `NEWS_AUTO_PUBLISH=true` in Production. Preview refreshes are dry-runs even if they share the database. The `/health` route does not trigger discovery. After deployment, confirm Cloudflare has exactly one Production cron trigger and no remaining hourly trigger.
