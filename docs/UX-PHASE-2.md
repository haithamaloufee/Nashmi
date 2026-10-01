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

## Batches 3–5: local media and social cards

Ten new rich entries from the clearly synthetic publisher were inserted by `--social`, only in the guarded in-memory loopback database. Eight posts plus a four-option poll and two-question survey; original functional fixtures remain for preservation checks. Three licensed images (Amman, Citadel, portrait library) and a 19-second 640×360 video were downloaded and checked for content type, byte limit, checksum and dimensions. Credits/page/license URLs are tracked in `tests/ux/fixtures/media-sources.json`; binaries remain ignored under `public/uploads/qa-social`. No dependencies installed. Files total approximately 2.45MB plus an optional 90KB poster retained as a reference; production media does not gain unsupported poster metadata.

Publisher badges/type labels no longer crowd text posts. Content/media precede reaction totals and action row. Existing dislike remains. Media frames are bounded; multi-photo grid appears on mobile too. Full viewer supports all images, next/previous, Escape, focus trapping/return and body scroll locking. Video uses native controls, inline playback, preload none and no autoplay. Documents remain linked safely, never misrendered as images. Comments use avatars outside bubbles and quiet timestamps.

Executed: 6/6 Chromium/Firefox/WebKit media/viewer and survey-navigation checks passed in 1.6m, including actual MP4 playback and aspect ratio. The prior attempt selected the report trigger instead of the photo trigger; corrected before rerunning. Native MCP separately opened the image viewer on 390px and filled a two-line unsent comment draft for visual inspection. 64 public page/mode/viewport axe/no-overflow cases passed in 5.3m; screenshots saved. No authenticated Facebook Feed access, physical phone or software keyboard has been claimed.

## Batch 6: supporting surfaces

Login/signup now use a simpler brand/statement + form composition. Party/IEC timeline widths align with social reading proportions; party logo is circular. Party list actions are quiet and rounded. Public user cover/profile composition, account content width, chat framing and dashboard sidebar spacing are improved. Laws and admin users/parties/moderation/news search use the shared pill field. Existing profile, follow, reporting, permissions, form validation and management flows remain.

## Regression finding under investigation

The rich-feed regression passed 14/15 Chromium cases, but Back lost the second loaded page in development. The mount-effect replay refetched the initial page after restoring the cache; a frontend query-aware bootstrap change was verified by 9/9 Back, racing-search and failure/loading cases across all three engines in 1.4m. Restored loaded pages now survive the replay. Backend comment pagination remains untouched.
