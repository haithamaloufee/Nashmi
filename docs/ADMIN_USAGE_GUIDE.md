# Admin usage guide

Use an individually assigned administrator account. Shared credentials and repository-stored passwords are prohibited.

When an administrator creates a user or party account, Nashmi returns a one-time password-setup link valid for 24 hours. Share that link only through a private channel. The database stores only a SHA-256 digest of the token and invalidates it after successful use.

Normal administrators cannot change, disable, or moderate administrator or super-administrator accounts. A super-administrator cannot disable or demote their own account, and the last active super-administrator is protected.

For local seeded environments, use the `SEED_*_PASSWORD` environment variables documented in `DEMO_ACCOUNTS.md`.
