# Nashmi security guarantees and trust boundaries

## Authentication and session invalidation

- Passwords are bcrypt hashes; predictable defaults are rejected by validation and are not present in runtime setup flows.
- Administrative account creation issues a random, hashed, expiring, one-time setup token. The raw token is sent by the server through the transactional provider and is never returned to the browser.
- Public signup remains pending until an atomic, single-use email-verification token is consumed. Password reset uses a separate one-hour token namespace and invalidates all prior sessions.
- JWT cookies are HTTP-only, SameSite=Lax, Secure in production, and expire after seven days.
- JWTs carry `sessionVersion`. Server authorization reloads the user and rejects a token whose version no longer matches. Password resets, role changes, status changes, and legacy-credential remediation increment the version.
- Missing pre-migration version fields are treated as zero, avoiding an unnecessary global logout; the first security-sensitive change revokes old sessions.

## Authorization

- Server routes enforce role, active status, ownership, and privilege hierarchy. UI visibility is not an authorization control.
- Lower roles cannot manage an admin/super-admin, self-target moderation is blocked, and the final active super-admin cannot be disabled or demoted.
- Verification fields are excluded from public profile mutation schemas.

## Data and API boundaries

- Public list endpoints use explicit projections; rich fields live on detail endpoints.
- Survey result visibility is enforced before serialization. Hidden totals/summaries are null and the dedicated results route rejects unauthorized clients.
- Reactions use unique records and atomic/transactional counter updates with non-negative repair semantics.
- Uploads enforce size, extension, MIME signature, and trusted Vercel Blob URLs. Remote fetch validation blocks private, loopback, link-local, reserved, and unsafe redirect destinations.

## AI boundary

- Gemini credentials remain server-only. The client receives only safe answer/source fields.
- User text, history, and retrieved documents are treated as untrusted data; the assistant refuses political endorsement and hidden/private/admin data extraction.
- Conversation context and output tokens have fixed server-side budgets. Provider calls have a timeout and a compatible fallback only for retryable availability failures.
- Model output is rendered as sanitized Markdown; unsafe URL schemes are rejected.
- Local Nashmi law sources remain primary, and web grounding is optional and source-labelled.

## Operational controls

- Middleware adds CSP, HSTS in production, clickjacking/content-type/referrer/permissions protections, no-store for protected routes, and `X-Request-Id`.
- `/api/health` is a shallow liveness check; it exposes no database, secret, filesystem, or host details.
- `/api/version` prevents a stale-domain alias from going unnoticed.
- CI never requires production secrets for untrusted pull requests. Authenticated E2E is optional and limited to trusted `master` pushes with configured secret-store values.
- Logs are structured and redacted. No error-tracking vendor is assumed until privacy, retention, and ownership are approved.

## Transactional email boundary

- Resend credentials and calls are server-only. Email templates include both HTML and plain text and do not contain passwords, session cookies, provider errors, or unnecessary personal data.
- Verification, reset, and invitation tokens are high-entropy values; only SHA-256 hashes and expirations are stored. Atomic database filters provide expiry and single-use enforcement.
- Provider failures leave recoverable pending/reset-request states and expose only generic user messages. Logs use a short irreversible recipient fingerprint, never a full address or raw token.
- Non-production delivery is recipient-allowlisted to prevent Preview automation from emailing real users.
- The application origin (`nashmi.haitham.website`) and the dedicated sender (`auth.nashmi.haitham.website`) are separate trust surfaces with independent DNS/TLS and SPF/DKIM/DMARC checks.
