# Nashmi UX Revolution — Phase 2

Local branch: `ux/nashmi-revolution`. Phase 1 preserved in commits `0eeb505`, `c47a9a8`, `79aac7a`. No push, production deployment or production database mutation.

## Reference review

Facebook public login was opened in the official Playwright MCP browser. No authenticated Facebook session was available, so the private Home Feed could not be examined directly. The contemporary public [Meta December 2025 UI announcement](https://about.fb.com/news/2025/12/making-it-easier-to-create-discover-and-share-content-on-facebook/) provides official feed, navigation, search, comments and profile examples. The actual commenting illustration was opened and visually inspected. Public screenshots are under the root workspace `test-results/phase2/`.

Design interpretation: small publisher identity, secondary time, uninterrupted content/media, counts above quiet actions, compact avatar beside a neutral composer, rounded search beside the brand. Nashmi keeps its own logo, teal and political neutrality. No unsupported reply/comment-reaction actions are added.

## Batch 1–2: fields, comments and navigation

Search has a 44px neutral pill, internal icon, RTL/LTR logical spacing and focus indication. The textarea grows to 144px then scrolls internally. Send is integrated; existing optimistic post/rollback/draft recovery remains. Comment avatars now sit outside bubbles and timestamps beneath them. The screen-reader keyboard hint is preserved.

Navbar: three primary destinations, logo `/`, Home `/updates`, adjacent working GET search, settings/account menus. Height reduced from 109/65px to 101/57px mobile/desktop. General navigation no longer includes the standalone surveys entry or “Community Pulse”. `/surveys` remains a compatibility list for old search/publisher/most-participated query links because the unified feed cannot represent every old combination. Survey deep links, endpoints and administration are preserved; normal discovery is the feed’s survey filter.

Executed: TypeScript check passed; three Chromium regression tests passed in 32.5s (navigation/320px, real local commenting + simulated failed submission/draft recovery + reaction, search dialog and share keyboard/focus). All 8 Arabic/English × light/dark × 390/1440px composer/axe checks passed in 46.7s. Initial run failed because the new test selected poll radio inputs alongside the search; the selector was corrected and the full batch rerun. ESLint passed. Desktop Arabic and mobile English-dark screenshots were visually inspected.

## Explicit limits

The separate equal-time **comment** cursor defect remains unmodified and unapproved. The previously approved **feed** composite cursor fix is preserved. No new backend contracts/schema changes in Phase 2. Production and external service writes are excluded.

## Remaining batches

Licensed local media + rich fixtures; social cards/gallery; other pages/auth; repeated production-build performance measurements; preservation and visual regression; actual Chrome review. Results will be added only after execution.
