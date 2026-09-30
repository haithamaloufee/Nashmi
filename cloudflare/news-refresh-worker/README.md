# Nashmi news scheduling (proposed, not deployed)

The checked-in Worker configuration prepares hourly discovery at `30 * * * *` UTC and the existing editorial refresh at `0 3 * * *` UTC (06:00 Asia/Amman). The live Cloudflare Cron remains unchanged until explicit approval. Discovery and refresh use separate HMAC secrets (`NEWS_DISCOVERY_SECRET`, `NEWS_REFRESH_SECRET`) and different paths. Both requests require the corresponding secret in Vercel. The new route returns 409 while `NEWS_PIPELINE_MODE=legacy`.

After approval to activate, deployment steps are:

```text
npx wrangler deploy
npx wrangler secret put NEWS_REFRESH_SECRET
npx wrangler secret put NEWS_DISCOVERY_SECRET
```

Keep `NEWS_PIPELINE_MODE=legacy` in Production until Preview isolation, historic/live replays and editorial review are accepted. Preview and shadow editorial runs never publish the new pipeline. The `/health` route does not trigger discovery. Confirm Cloudflare triggers and secrets before any future Worker deployment.
