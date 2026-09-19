# Nashmi production runbook

## Normal release

1. Merge reviewed work to `master` and push it to `haithamaloufee/Nashmi`.
2. GitHub Actions must pass install, audit, types, lint, security, concurrency, build, and bundle budgets.
3. Vercel must create a **Production** deployment from the same commit. Do not routinely use manual Promote.
4. Run `EXPECTED_GIT_SHA=<full-master-sha> npm run smoke:production`.
5. Confirm `/api/version` reports the expected SHA and `/api/health` reports `status=ok`.

The smoke test retries bounded transient failures and reports a distinct deployment-propagation timeout when the public alias still serves an older SHA.

## Rollback and the automatic-domain incident

Use a Git revert on `master` for normal rollback so the repaired commit follows the same automatic pipeline. A manual Vercel rollback is an emergency-only action. After any manual rollback, immediately verify that **Auto-assign Custom Production Domains** is still enabled, then compare GitHub `master`, the Vercel deployment SHA, and the public `/api/version` SHA. The previous incident occurred because a successful deployment stayed staged while the public alias remained on an older deployment.

## Health and diagnosis

- `/api/health` is intentionally cheap, unauthenticated, non-cached, and does not touch MongoDB or reveal configuration values.
- `/api/version` identifies the deployed commit and environment without exposing secrets.
- Every application response receives `X-Request-Id`; use it to correlate a user-visible failure with structured Vercel logs.
- Unhandled API and AI-provider logs contain an event category, safe error name/message, route where available, and request ID where available. They must never include request bodies, cookies, tokens, passwords, OTPs, or connection strings.

No external error-tracking SDK is installed. The logging contract is ready to forward to a selected service later, but adding a vendor requires an owner decision about account, region, retention, sampling, and privacy.

## Legacy credential audit and recovery

The default command is read-only and requires candidate values at runtime:

```text
LEGACY_CREDENTIAL_CANDIDATES_JSON=<secret JSON array> npm run audit:legacy-credentials
```

It prints only totals, role/status counts, and partially redacted IDs. It never prints candidate values, hashes, email addresses, or reset links.

Remediation is intentionally gated. It requires all of:

```text
--confirm-remediation --delivery-ready --recovery-bundle=<absolute path outside repository>
```

Before using it, verify the account owner and a trusted delivery channel. The tool writes a new file with restrictive permissions before the transaction, invalidates the known credential, moves the account to pending, issues a 24-hour one-time setup link, and increments `sessionVersion` to invalidate existing application sessions. Deliver links individually and securely, then delete the recovery bundle after confirmed delivery. Never upload it to Git, chat, tickets, or shared drives.

## Authentication E2E

Use dedicated non-production accounts and secret-store variables: `E2E_CITIZEN_*`, `E2E_PARTY_*`, and `E2E_ADMIN_*`. Set `E2E_BASE_URL` to a controlled Preview/test deployment. `npm run test:e2e:auth` logs in through the API and writes reusable states only under gitignored `playwright/.auth/`.

Authenticated tests are read-only. If a future test must write, every record must contain the `e2e:nashmi:<timestamp>:<uuid>` marker from `tests/helpers/testData.ts`. Cleanup must target that exact marker/run ID; broad collection cleanup is forbidden. Production writes require a separate explicit review.

## Authentication, email, and public domain

- The canonical Production origin is `https://nashmi.haitham.website`. Set `NEXT_PUBLIC_SITE_URL` to that exact origin in Vercel Production; verification, reset, invitation, canonical, OpenGraph, sitemap, and robots URLs all derive from it.
- Transactional email uses Resend server-side through `RESEND_API_KEY`. The production sender is configured with `EMAIL_FROM` on the verified `auth.nashmi.haitham.website` sending subdomain. Do not expose either variable to browser code.
- Preview and Development only send real messages to recipients listed in `EMAIL_ALLOWED_RECIPIENTS`. Production does not use that allowlist. Set `EMAIL_REPLY_TO` only when a monitored inbox exists.
- Public citizen signup always starts pending and requires email verification. Verification links expire after 24 hours; password-reset links after one hour; invitations after 24 hours. Raw tokens are sent once and only SHA-256 hashes are stored.
- `npm run email:preview` generates token-free HTML examples under the gitignored `.email-preview/` directory. It never calls Resend.
- Real delivery validation must cover verification, password reset, and password-changed messages in a controlled inbox. Confirm the CTA lands on the canonical origin and completes the one-time flow.
- The legacy `nashmii.vercel.app` alias may redirect to the canonical host only after DNS and TLS for the custom domain are healthy. Keep host-based redirects loop-free.

Relevant environment variable names: `NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_ALLOWED_RECIPIENTS`, and optional `EMAIL_REPLY_TO`. Never add their secret values to this repository.

## Secret rotation and recovery safety

- Rotate a credential only after identifying every consumer and establishing rollback material.
- Update all dependent environments, verify Preview, then Production, then revoke the old credential.
- Never print secret values or copy them into documentation.
- Production Blob should use the Vercel project connection with OIDC and `BLOB_STORE_ID`; local development may still use `BLOB_READ_WRITE_TOKEN`. Remove the long-lived Production token only after upload/read/display and a dedicated test-blob delete are proven on a fresh deployment.
- A password reset increments `sessionVersion`; older cookies stop authenticating at the server/data layer.

## Incident checklist

1. Capture the public request ID, route, UTC time, `/api/version`, and `/api/health` response.
2. Compare public SHA with GitHub `master` and the Vercel Current production deployment.
3. Inspect safe structured logs for the request ID.
4. If data access is involved, prefer read-only diagnosis and projections. Never dump user documents.
5. Reproduce in Preview/local, add a regression test, deploy through `master`, then run the production smoke test.
