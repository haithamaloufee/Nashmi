# Comment pagination — separate approval required

Observed on 2026-10-01 in the isolated QA database. Five seeded comments share `createdAt`; the first `GET /api/posts/:id/comments?limit=3` returns three, and the timestamp-only cursor returns no further rows. The browser's “more comments” control therefore leaves two comments unread. `revolution.spec.ts` failed with 3 displayed comments instead of at least 5. This is an application failure, not a browser setup failure.

The post and poll comment endpoints both use `src/lib/pagination.ts`, whose timestamp-only boundary cannot represent ties. The approved feed cursor fix concerns `publishedAt` across feed content collections; it does not authorize changing all endpoints that use the generic helper.

Proposed narrow change, **not applied**:

- Change only the GET pagination in `/api/posts/[id]/comments` and `/api/polls/[id]/comments`.
- Use `(createdAt DESC, _id DESC)`, a composite ISO timestamp/ObjectId cursor and boundary `createdAt < date OR (createdAt = date AND _id < id)`.
- Request `limit + 1` to detect another page; return at most `limit` rows.
- Accept legacy ISO cursors; reject malformed composite cursors with HTTP 400.
- Reuse the validated cursor encoding/parser, with a comments-specific helper. Leave the existing generic helper and its other endpoints unchanged.
- No schema, authentication, moderation, data migration, credential or deployment change.

Verification after approval: at least eight equal-time comments per target, fractional milliseconds, three unique pages, stable ordering, legacy/malformed cursors, and actual browser “more comments” interaction for posts and polls. Cleanup is restricted to newly inserted synthetic local records.

## Reproducible status

`tests/ux/comment-pagination.spec.ts` independently creates a synthetic post and eight comments with the explicit timestamp `2020-01-01T12:00:00.731Z`. With a page size of three, only three distinct rows are read; five are skipped. The reproduction is an expected failure in Chromium, Firefox and WebKit. All inserted records are cleaned up. These three expected failures are excluded from actual successful-test counts in `docs/UX-REVOLUTION.md`.

The separate approval request is pending. The comment endpoints and generic pagination helper remain unchanged.
