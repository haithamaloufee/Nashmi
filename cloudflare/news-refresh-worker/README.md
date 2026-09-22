# Nashmi hourly news refresh worker

The Worker invokes the production-only internal refresh endpoint at minute 0 of every hour. Store the shared secret with `wrangler secret put NEWS_REFRESH_SECRET`; never place it in `wrangler.toml` or source control. The same value must exist as `NEWS_REFRESH_SECRET` in Vercel Production.

Deployment:

```text
npx wrangler deploy
npx wrangler secret put NEWS_REFRESH_SECRET
```

Keep `NEWS_AUTO_PUBLISH=false` in Vercel until multiple admin dry-runs have been reviewed. The `/health` route does not trigger discovery.
