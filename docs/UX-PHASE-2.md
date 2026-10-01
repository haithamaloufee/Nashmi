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

## Historical checkpoint

The batches below and the final validation section now record the completed local work. External integrations, the separate comment cursor and mobile performance remain limited as stated.

## Batches 3–5: local media and social cards

Ten new rich entries from the clearly synthetic publisher were inserted by `--social`, only in the guarded in-memory loopback database. Eight posts plus a four-option poll and two-question survey; original functional fixtures remain for preservation checks. Three licensed images (Amman, Citadel, portrait library) and a 19-second 640×360 video were downloaded and checked for content type, byte limit, checksum and dimensions. Credits/page/license URLs are tracked in `tests/ux/fixtures/media-sources.json`; binaries remain ignored under `public/uploads/qa-social`. No dependencies installed. Files total approximately 2.36MB, plus an optional 90KB poster retained as a reference (2.45MB together); production media does not gain unsupported poster metadata.

Publisher badges/type labels no longer crowd text posts. Content/media precede reaction totals and action row. Existing dislike remains. Media frames are bounded; multi-photo grid appears on mobile too. Full viewer supports all images, next/previous, Escape, focus trapping/return and body scroll locking. Video uses native controls, inline playback, preload none and no autoplay. Documents remain linked safely, never misrendered as images. Comments use avatars outside bubbles and quiet timestamps.

Executed: 6/6 Chromium/Firefox/WebKit media/viewer and survey-navigation checks passed in 1.6m, including actual MP4 playback and aspect ratio. The prior attempt selected the report trigger instead of the photo trigger; corrected before rerunning. Native MCP separately opened the image viewer on 390px and filled a two-line unsent comment draft for visual inspection. 64 public page/mode/viewport axe/no-overflow cases passed in 5.3m; screenshots saved. No authenticated Facebook Feed access, physical phone or software keyboard has been claimed.

## Batch 6: supporting surfaces

Login/signup now use a simpler brand/statement + form composition. Party/IEC timeline widths align with social reading proportions; party logo is circular. Party list actions are quiet and rounded. Public user cover/profile composition, account content width, chat framing and dashboard sidebar spacing are improved. Laws and admin users/parties/moderation/news search use the shared pill field. Existing profile, follow, reporting, permissions, form validation and management flows remain.

## Resolved Back-navigation regression

The rich-feed regression passed 14/15 Chromium cases, but Back lost the second loaded page in development. The mount-effect replay refetched the initial page after restoring the cache; a frontend query-aware bootstrap change was verified by 9/9 Back, racing-search and failure/loading cases across all three engines in 1.4m. Restored loaded pages now survive the replay. Backend comment pagination remains untouched.

## Final local validation — 2026-10-01

- User-reported toolbar clipping fixed: mobile search occupies the full first row, sort and advanced-search icon the second; desktop reserves 220px for sort. Arabic/English placeholder and all five sort labels fit at 320/390/1440px: 6/6 actual checks passed, 13.4s.
- Preservation suite: 35/35 passed, 2.9m. The historical inventory is not overwritten and is not claimed to have been fully rerun in Phase 2.
- Chromium/Firefox/WebKit regression: 75 actual successes plus 3 expected failures reproducing the unapproved comment cursor defect, 8.0m; zero unexpected failures or flaky tests. Playwright's headline says 78 passed because expected failures satisfy its contract; they are explicitly excluded from successful behavior counts here.
- Public pages, authenticated profile/dashboard surfaces and expanded comment fields: 24 aggregate tests passed, 4.8m; 112 axe/no-horizontal-overflow states (64 public + 40 role surfaces + 8 composer states), Arabic/English × light/dark × mobile/desktop. Automated axe is not complete accessibility certification.
- New separate Phase 2 visual references: 48 PNGs, six routes × eight modes. Reference creation passed; a subsequent comparison **without** snapshot updates passed all 8 tests / 48 comparisons in 30.9s. Dynamic counts/video frames are masked. Selected actual screens, gallery, portrait viewer, comments, video, auth and profiles were visually reviewed, not every pixel of every reference.
- Final production build succeeded; final TypeScript, ESLint, five bundle budgets and critical tests passed. Updates bundle 153.3 KiB gzip, below 180 KiB budget.
- Real local Chrome was controlled using native official Playwright MCP, with scrolling, media viewing, draft typing and actual video playback. User explicitly confirmed it visible. It is left on `http://127.0.0.1:3020/updates` at 390×844; the isolated QA server remains running. Computer's minimized-window status disagreed with the user's confirmed view. A shell attempt to open another Chrome window was rejected by tool policy; native MCP provided the allowed working route.

## Performance: measured improvements and remaining limit

24 Lighthouse runs in four comparable rich-feed batches, three mobile and three desktop per batch, against the local production build; simulated defaults, cold browser cache, no parallel browser test workload. Raw reports remain under `test-results/phase2/performance`; compact numeric results are tracked in `UX-PHASE-2-MEASUREMENTS.json`.

| Batch | Mobile median LCP / score / TBT | Desktop median LCP / score |
| --- | --- | --- |
| rich-before | 5645ms / 62 / 632ms | 1139ms / 98 |
| rich-after | 5199ms / 70 / 464ms | 1080ms / 98 |
| rich-final | 5336ms / 74 / 280ms | 1068ms / 98 |
| rich-toolbar (current source) | 5339ms / 72 / 355ms | 1036ms / 99 |

Only the first visible media image is eager/high-priority. Preview quality 60, viewer default 75; actual avatar/header sizes avoid oversized image requests. Comments initialize on first expansion and retain drafts afterward; owner editing code renders only for existing authorized owners. Script transfer on mobile fell from 194,276 to 182,103 bytes. Current mobile LCP improved about 5.4% compared with the same rich fixture, but remains slow and is **not resolved**. The earlier Phase 1 single text-feed run is not an equivalent comparator.

Current mobile run 2 observed unthrottled LCP insight: TTFB 109ms, resource delay 34ms, load duration 16ms, render delay 512ms. These observations are **not** a decomposition of simulated 5334ms LCP. Rendering/hydration still needs further work; no backend performance change was made. Unused-preload warnings and a native browser `favicon.ico` 404 were observed. Real SMTP, R2 and external assistant provider integration, physical mobile keyboard behavior, and complete English copy remain unverified/incomplete.

Full Arabic report and evidence paths: [UX-PHASE-2-REPORT-AR.md](UX-PHASE-2-REPORT-AR.md). No push, master update, production seed or deployment.
