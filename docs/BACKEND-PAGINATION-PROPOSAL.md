# Pagination proposal — approved, implemented and verified locally

Branch: `ux/nashmi-revolution`, based on `a7b748ef21aecf79b537fe3179cc7bc8785267e7`.

The actual local regression test `tests/ux/pagination.spec.ts` inserted 14 synthetic posts with the same `publishedAt`. `/api/updates?limit=5` returned five; the next timestamp-only cursor returned none. Nine posts were skipped. This test failed as expected against unchanged master code; synthetic records were cleaned up.

## Proposed limited server change

- Newest ordering: `(publishedAt DESC, _id DESC)` in all three collections and the merged feed.
- Cursor: ISO timestamp plus the final ObjectId, e.g. `2020-01-01T12:00:00.000Z~<ObjectId>`.
- Boundary: `publishedAt < date OR (publishedAt = date AND _id < id)`.
- Combine the boundary with existing date/search/hashtag restrictions using `$and`; do not overwrite the selected date range.
- Fetch one extra entry to determine whether another page exists.
- Keep accepting the previous timestamp-only cursor for compatibility; reject malformed cursors with HTTP 400.
- Make SSR initial ordering match API ordering. No database schema, credentials, authentication or deployment changes.
- Oldest ordering would use the corresponding ascending boundary. Ranked ordering across content types requires separate pagination design and is not included automatically.

## Required verification after approval

Run the existing equal-timestamp regression, date/filter boundaries, malformed-cursor validation, mixed post/poll/survey page ordering, and UI infinite-scroll deduplication. Passing is not claimed before execution.

## Current status

The user explicitly approved this limited fix on 2026-10-01: «أوافق على إصلاح الـPagination المحدد». The source change implements the chronological composite cursor, deterministic collection/merge ordering, combined date boundaries, one-extra-entry detection, stable totals and matching SSR/client bootstrap. Date objects preserve milliseconds. Ranked pagination remains outside this approval.

Type checking and the local production build passed. `UX_QA_PHASE=pagination-approved npx playwright test -c playwright.ux.config.ts tests/ux/pagination.spec.ts` passed **9/9 tests in 34.3 seconds** across Chromium, Firefox and WebKit. Executed checks cover equal timestamps, fractional milliseconds, unique/stable pages, legacy cursors, malformed cursors, mixed post/poll/survey ordering, newest/oldest date boundaries, stable totals and 35 equal-time posts loaded through the browser. This verifies the chronological cursor fix locally; the new infinite-scroll and Back-restoration frontend is tested separately.
