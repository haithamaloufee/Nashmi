# Demo accounts

The repository intentionally contains no shared demo passwords.

For local seeding, provide unique strong values through `SEED_ADMIN_PASSWORD`, `SEED_IEC_PASSWORD`, `SEED_CITIZEN_PASSWORD`, and `SEED_PARTY_PASSWORD`. Never reuse these values in production and never commit them.

For authenticated Playwright checks, provide `E2E_CITIZEN_EMAIL`, `E2E_CITIZEN_PASSWORD`, `E2E_PARTY_EMAIL`, and `E2E_PARTY_PASSWORD` through the CI secret store. Authenticated checks skip cleanly when these optional variables are absent.

Accounts created from the admin dashboard receive a one-time setup link instead of a default password.
