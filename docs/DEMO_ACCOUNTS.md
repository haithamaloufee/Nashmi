# Demo accounts

The repository intentionally contains no shared demo passwords.

For local seeding, provide unique strong values through `SEED_ADMIN_PASSWORD`, `SEED_IEC_PASSWORD`, `SEED_CITIZEN_PASSWORD`, and `SEED_PARTY_PASSWORD`. Never reuse these values in production and never commit them.

For authenticated Playwright checks, provide the `E2E_CITIZEN_*`, `E2E_PARTY_*`, and `E2E_ADMIN_*` email/password pairs through the CI secret store. Use dedicated Preview/test accounts. Authenticated projects skip cleanly when their optional pair is absent, and saved browser state stays under gitignored `playwright/.auth/`.

Accounts created from the admin dashboard receive a one-time setup link instead of a default password.
