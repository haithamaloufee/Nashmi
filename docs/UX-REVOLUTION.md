# Nashmi UX Revolution — execution record

Started 2026-10-01, Asia/Amman. Work is local on Windows 11 Pro (10.0.26200).

## Isolation

- Original checkout: `../code`, clean at `d757b93ee88efb25d03ef76f4f1c8ca8fe4ef5f3`, branch `fix/media-upload-10mb-formats`.
- Fetched `origin/master`: `a7b748ef21aecf79b537fe3179cc7bc8785267e7`.
- Independent worktree: `code-ux-revolution`; branch `ux/nashmi-revolution`.
- No existing environment files copied, no production credentials used, no production writes, no push or deployment.
- Tests use a loopback-only ephemeral MongoDB replica set and synthetic actors. Browser sessions are isolated.

## Environment inventory

| Tool | Before setup | Action / result |
| --- | --- | --- |
| Node.js | v26.5.1 | Reused |
| npm | 11.17.0 | Reused |
| Git | 2.50.0.windows.1 | Reused |
| Codex CLI | 0.159.2, bundled executable | Reused without changing user PATH |
| Playwright MCP | Registered, enabled, `npx -y @playwright/mcp@latest` | No duplicate registration; npm cache contains Microsoft's 0.0.83 |
| Playwright Test | 1.63.0 in lockfile / existing checkout | `npm ci` in independent worktree completed (607 packages) |
| axe | @axe-core/playwright 4.13.0 | Existing dependency reused |
| Chromium | revision 1243 cached | Actual launch, page creation and click passed (153.0.8010.12) |
| Firefox / WebKit | Not cached for required revisions | Official installation completed; actual launch and click passed (155.0 / 26.6) |
| Lighthouse | Not declared | Installed locally as dev dependency 13.5.0; mobile and desktop baseline audits executed |
| Computer plugin | @oai/sky available | Chrome window selection, typing and navigation succeeded; initial minimized window recovered |

Production was opened read-only in Chrome. It had an existing real account session, so no forms or reactions were submitted there. The actual QA sessions use separate browser contexts and local fixtures.

MCP tools are absent from this chat's exposed tool inventory despite the enabled configuration. The official Microsoft server was initialized through its standard stdio MCP transport using `scripts/ux-mcp.mjs`. Actual navigation, search typing, form filling, menu opening, Escape, scrolling, resizing, screenshot capture, console/network collection and native dialog dismissal succeeded against local QA. Evidence: `test-results/mcp/tool-results.jsonl`. For native chat integration, use Settings → MCP servers → Restart, then start a new session if the tools remain absent. No app restart is performed while work is running.

## Official sources

- https://learn.chatgpt.com/docs/extend/mcp
- https://github.com/microsoft/playwright-mcp
- https://playwright.dev/docs/browsers
- https://playwright.dev/docs/accessibility-testing
- https://playwright.dev/docs/test-snapshots
- https://developer.chrome.com/docs/lighthouse/overview

## Baseline and batches

### Phase 1: environment and page inventory

Environment setup is functional. Browser engines, axe, official MCP and the Computer plugin were exercised. Lighthouse baseline audits were executed on mobile and desktop. QA runs only at `http://127.0.0.1:3020`, with an ephemeral MongoDB replica set, synthetic role accounts and no production integrations or credentials.

The baseline route audit completed: 43 page files, represented by 43 local routes at 390px and 1440px (86 cases). It records buttons, links, inputs, selects, headings, redirects, overflow and WCAG A/AA axe findings in `test-results/baseline/inventory.json`. No root horizontal overflow was observed; later visual review revealed clipped dashboard columns masked by `overflow-x: clip`. 38 baseline cases had accessibility findings: contrast, missing input/select names, unnamed option removal buttons and invalid moderation menu structure. The follow-up route audit passed all 86 cases after frontend corrections; additional language/theme coverage is recorded below.

Actual baseline regressions: the primary Home link points to `/` instead of `/updates`; the equal-timestamp cursor test returned 5 of 14 synthetic posts, skipping 9. The latter has a separate approved proposal in `BACKEND-PAGINATION-PROPOSAL.md`. Browser interaction capability testing passed. Harness retries were required for Next streamed redirects, hydration readiness and cold development compilation; these are tracked separately from application failures.

Visual review on mobile found a large vertical dashboard navigation card and five stacked metrics pushing useful controls below the fold. Feed actions wrap, and authentication screens have weak contextual hierarchy and contrast. Screenshots are retained under `test-results/baseline`.

### Phase 2: local interaction and permission baseline — executed

The page inventory alone does **not** complete Baseline QA. The final clean baseline production run passed all 28 tests in 3.2 minutes. Two additional populated-report tests passed, and saved-chat/account-menu cases passed for all five authenticated roles (35 distinct successful cases total). These cover six roles against all 23 protected routes (138 permission checks), distinct internal links from the inventory, search/filter/sort, comments, reactions, follow/unfollow, voting and repeated-vote rejection, reports, publisher drafts/discard, actual local post create/edit/delete, dashboard controls, law create/edit dialogs, survey required fields and actual response, profile persistence, synthetic upload limits/file rejection, recovery/verification errors, assistant success/failure/retry, chat session persistence/delete confirmation, display settings and logout.

Mutations are restricted to synthetic local data. Baseline management failure paths use explicitly mocked 503 responses; these do not prove successful server persistence. Separate positive management tests were subsequently executed, as recorded below. SMTP delivery, real R2 upload and external assistant provider responses remain unverified; assistant text and upload limits were synthetic transport fixtures. Therefore full integration QA and the complete campaign are **not** declared complete.

The first draft was withdrawn until the local interaction/permission baseline had run. Frontend batch one is now applied: sticky social navigation and active sections, Home `/updates` and logo `/`, authentication layout and validation, compact horizontal mobile dashboard navigation, complete dashboard links and shared surface tokens. English signup failure/draft retention, dashboard navigation for party/IEC/super-admin, query-only report transitions and navigation passed across the three engines. WebKit's initial real-login test filled before hydration; the corrected readiness check passed on retry. A new synthetic legacy-password account is included for the stronger follow-up login test.

Visual review of the actual batch-one 390px dashboard screenshot exposed clipped columns despite the root overflow check passing (`overflow-x: clip` masked it). The columns now use an explicit single-column grid and `min-width: 0`; bounding-rectangle regressions passed for party, IEC and super-admin in all three engines. The mobile signup and social feed were opened and visually inspected through the official MCP browser. Cairo variable fonts are now served locally (Arabic + Latin, 64,716 bytes total) with their official OFL license and provenance under `public/fonts/cairo`; no system fonts were installed.

The approved pagination change passed all nine runtime regression tests across the three engines; see `BACKEND-PAGINATION-PROPOSAL.md`. Batch two implements the social feed layout, automatic pagination, abortable searches, Back scroll/page restoration, comments, shared dialogs and accessible menus. Actual verification is recorded below.

### Phase 3: social feed and shared interaction system — verified scope

- Desktop feed uses an explorer column, a reading column and neutral context; mobile keeps one reading column. Ten-entry pages load automatically, with a manual fallback and visible retry/loading/end states. Abort controllers and generation checks prevent older search responses from replacing newer results.
- Public feed pages, filters and scroll position are retained for five minutes in bounded session storage (100 entries maximum). Tokens, drafts and the private followed filter are excluded. Back-navigation restoration passed across all three engines.
- Post cards, poll/survey feed surfaces, comment bubbles and comment input share the new surface system. Like **and** dislike remain available; long content expansion, comments, share, reports and publisher actions remain intact.
- Dialogs share Escape, focus trap, body scroll lock and return-focus behavior. Menus support keyboard navigation, close after selection and return focus. Reports use five distinct reason values, labels, pending protection and recoverable errors.
- Session-dependent owner/moderation controls refresh after login and logout. Existing legacy-password accounts can still log in; signup validation remains strict. Query-only report navigation no longer waits for a twelve-second skeleton timeout.
- Labels and names were added to audit filters, upload inputs, survey types/options and text questions. Hidden profile accordions are inert. Horizontal admin tables expose keyboard-focusable regions.

Actual `frontend-final` run: 66 runner-successful cases in 11.4 minutes, comprising **63 actual passes and 3 expected failures** that reproduce the unresolved comment cursor defect. Expected failures are **not** counted as repairs. This run includes Chromium, Firefox and WebKit: feed pagination/search/errors/Back, social actions, dialog focus + axe in both themes, legacy real local login, session invalidation, actual verification/reset/setup, all five survey answer types persisted through browser forms, and browser native dialogs/popups/manual traces/console/failed-request capture. Artifacts: `test-results/ux-frontend-final.json` and `playwright-report/ux-frontend-final`.

The preservation suite was rerun after batch two: **35/35 passed in 6.4 minutes** (`preservation-final`). It retains six-role/23-route permission checks and the original functional scope described in phase 2. A separate final route audit passed **86/86 viewport cases** with no recorded axe violations, root overflow or page exceptions. These checks precede the small mobile-navigation follow-up described below.

Visual reference creation is recorded separately from comparison. Forty-eight Chromium reference images cover six redesigned public routes × two languages × two themes × two widths. After correcting a test selector that also matched poll inputs, the actual comparison passed 8/8 cases in 2.6 minutes (`visual-comparison-retry`). Mobile images were deliberately refreshed after the direct-tab layout; the subsequent **independent comparison passed 8/8 cases (48 images) in 2.6 minutes**, with no reference updates during comparison (`visual-mobile-tabs-comparison`). Firefox and WebKit have functional/axe coverage; their image baselines are not claimed.

### Phase 4: conditional management states and mobile follow-up — executed

Actual positive tests now cover law creation/edit/persistence for IEC/admin/super-admin; survey create/edit/publish/close/archive for party/IEC/admin/super-admin; all four report actions and persisted moderation outcomes for admin/super-admin; news hide/show persistence and a populated accessible ticker for admin/super-admin. Local account creation plus status/role changes and bilingual editorial persistence also passed. SMTP is intentionally unconfigured; account creation does not prove invitation delivery.

Two deliberately aborted network requests exposed missing error handling in survey status changes and news refresh: no user feedback, an unhandled exception, and a stuck news busy state. Frontend catch/finally handling, pending protection and announced feedback were added; both regression cases passed against the follow-up production build. No backend handler was changed for this repair.

The populated news screenshot and bounding rectangles exposed an 11px gap below the new navbar. A shared responsive navbar-height token removes the gap. Mobile now has four direct, accessible 44px social navigation tabs, keeping the complete menu. The sticky new-updates button uses the same token. Actual MCP click navigation and mobile screenshot review were performed. A production build, lint/type check and all five bundle budgets passed. Three-engine interaction retesting passed **36/36 cases in 8.8 minutes** (`navigation-final`); updated visual comparison results are recorded above.

The positive conditional-management run passed 22 cases, with one party-profile harness failure (`conditional-final`). After correcting the actual submit label and targeting the textarea rather than a same-named metadata tag, the party-profile test passed separately (`profile-confirmed`, 9 seconds including setup). It verified HTTP 200, actual local database persistence, reload and the public profile; the fixture was restored afterward. This establishes 23 distinct passing cases across those two runs, not a claim that the original 23-case run was clean.

Other harness corrections are distinct from application defects: a synthetic super-admin law slug initially contained an invalid underscore (HTTP 422); it now follows the existing schema. Ticker motion tests initially inherited the harness's reduced-motion setting, which intentionally disables animation; they now explicitly exercise normal motion and then reduced motion. News states exercise 0/1/10/15/20/25 records at mobile/desktop widths.

### Phase 5: full display matrix and populated accessibility — executed

The four language/theme route audits executed **344 viewport cases** (43 routes × mobile/desktop × Arabic/English × light/dark) in 17.7 minutes. All 344 recorded no page exceptions or root overflow. The initial run passed 330 cases and failed 14 dark-theme cases: recovery/setup error text, survey archive controls and audit metadata. The original failed artifacts remain intact in `test-results/final/routes-{ar,en}-{light,dark}.json`.

After contrast corrections, **8/8 focused cases passed in 3.0 minutes**, checking all six affected routes in both languages, themes and widths (**48 page/state audits**, including all 14 previously failed coordinates). An explicit populated audit record ensures metadata is rendered and scrolled into view. This is a recorded full matrix followed by targeted repair verification; it is not described as a clean rerun of all 344 cases.

Populated comments, enabled vote/submission controls, user chat bubbles, floating assistant messages and law dialogs were also audited at 390px. These exposed low contrast in enabled dark controls and non-focusable chat scroll areas. Chat log regions now accept keyboard focus; user-message content inherits the bubble color. The final **6/6 cases passed across Chromium, Firefox and WebKit in 2.9 minutes**, covering six rendered states per case (`accessibility-confirmed`). Earlier failed runs remain recorded; no external assistant-provider success is implied by these mocked local responses.

The browser was visually reviewed directly through the official MCP, including mobile feed/comments, signup, navigation and desktop/light vs mobile/dark layouts. Rebuilding the ephemeral QA database creates new fixture IDs; an old browser tab can retain the prior public-feed cache. QA browser cache is reset from a non-feed page before reviewing the rebuilt server. The current fixture has a five-comment counter and three initial comments; the missing remainder is the separately documented server cursor issue. Artifacts remain isolated under `test-results/mcp`.

Historical baseline tests are excluded from ordinary QA regression runs to prevent accidental overwriting of baseline records. Opt in explicitly with `UX_QA_INCLUDE_BASELINE=1`. The exhaustive route/visual matrices run in Chromium; interactions and populated accessibility run across all three engines.

### Phase 6: performance follow-up — measured and verified locally

The first final Lighthouse run measured mobile performance **66**, accessibility **98**, best practices **100**, LCP **5,195ms**, CLS **0.0054**, TBT **568ms**. Desktop measured **97/100/100**, LCP **1,144ms**, CLS **0.0005**, TBT **0ms**. This mobile regression is recorded, not hidden; reports were preserved under `test-results/final/lighthouse-before-performance`.

Inspection showed expensive Next route work and eager full-route navbar prefetching during feed hydration, plus a mobile heading-order finding. Mobile/touch/constrained connections now prefetch navbar destinations on user intent; desktop retains idle prefetching. Font preload links advance the existing local font requests, and an accessible feed section heading repairs the mobile hierarchy. The production rebuild passed. **12/12 browser cases passed across all three engines in 1.0 minute** (`feed-loading-final`): absence of eager law preloads after the former idle deadline, intent prefetch, actual navigation, mobile heading order, Home vs logo, infinite-scroll/Back preservation and dialog/menu keyboard focus.

Repeat official Lighthouse measurements on the resulting local production build:

| Feed audit | Performance | Accessibility | Best practices | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- |
| Mobile | 81 | 100 | 100 | 5,113ms | 0.0053 | 100ms |
| Desktop | 99 | 100 | 100 | 1,016ms | 0 | 39ms |

Reports: `test-results/final/lighthouse/updates-{mobile,desktop}.report.{json,html}`. Mobile main-thread work measured 1.8s after the adjustment versus 4.1s in the preserved first final run. These are single-run local measurements, not production field data or a statistical guarantee. Mobile LCP is still about 5.1s and remains a performance limitation even though the score and blocking time improved. No claim is made that every performance metric improved relative to baseline.

The subsequent visual comparison of the final preload/navigation changes passed **8/8 cases (48 images) in 3.5 minutes**, without updating references (`visual-release-comparison`). Lint, critical unit tests, production build/type validation and all five bundle budgets passed. `/updates` remains 152.0KiB gzip against the existing 180KiB maximum budget; the feed budget does not include every later dynamic import.

The final warmed MCP session recorded no console errors, but did log unused-font-preload warnings. Direct inspection confirmed both Cairo font faces were loaded and the resource entries used the preload links, with no second font transfer recorded on that navigation. These warnings remain a browser-cache/preload follow-up; a completely warning-free console is not claimed.

## Current handoff and remaining scope

The implemented local frontend batches and the explicitly approved chronological feed cursor are verified within the recorded fixture scope. The entire campaign and external integration QA are not declared complete. The worktree is still on `ux/nashmi-revolution` at base SHA `a7b748ef21aecf79b537fe3179cc7bc8785267e7`; changes are local and uncommitted. No secrets, production data, master checkout, push or deployment were changed.

| Remaining item | Status / next step |
| --- | --- |
| Equal-time post/poll comment pagination | Separate backend approval pending; deterministic expected failure remains |
| Ranked global cursor and bounded hashtag totals | Existing server contracts require separate design/approval |
| Reloaded poll's initial voted state | Existing server rejects duplicate voting; initial-state contract remains separate |
| Mobile LCP ~5.1 seconds | Further frontend resource/render profiling needed; current local score alone does not close it |
| SMTP delivery, real R2 upload, actual assistant provider | Not tested; controlled test integrations and separate safe credentials are required |
| Native MCP tools in this chat | Standard official MCP transport works; native inventory still requires the app MCP restart/new-session procedure above |

Preview: `http://127.0.0.1:3020/updates`, only while the isolated QA server runs. Maintainer commands: `npm run qa:ux:server`, `npm run qa:ux:test`, `npm run qa:ux:lighthouse`. These are reproducibility notes; environment setup and the reported runs were already performed by the agent. Runtime fixture credentials, database settings, raw traces, video and machine-specific reports are ignored by Git. Reviewed synthetic visual references and the harness source are kept with the branch.

Design rules: `docs/DESIGN-SYSTEM.md`. Original route inventory: `docs/BASELINE-ROUTE-COVERAGE.md`. All test counts above refer to their named runs and overlap; they must not be summed as distinct scenario totals.

### Baseline performance (actual local production build)

| Feed audit | Performance | Accessibility | Best practices | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- |
| Mobile | 73 | 95 | 100 | 4,820ms | 0.0047 | 374ms |
| Desktop | 98 | 98 | 100 | 1,011ms | 0 | 14ms |

Lighthouse 13.5.0 ran against the loopback production build. Reports: `test-results/baseline/lighthouse/updates-{mobile,desktop}.report.{json,html}`. Scores describe this machine and fixture page, not production traffic.

### Additional observed issues

- Query-only report filters and session-dependent owner/moderation controls were repaired and verified as described in phase 3.
- A reloaded poll can offer a vote again; the server correctly returns 409 for the citizen's duplicate vote. No second vote is accepted. Improving the initial voted state may require a separate server contract.
- Duplicate reporting reason values and dialog accessibility were repaired and verified as described in phase 3.
- Ranked feed ordering operates on a bounded sample and does not support a global ranked cursor. This remains outside the approved chronological pagination change.
- Comment pagination can skip equal-time rows. Three deterministic regressions reproduce it using eight explicitly tied synthetic comments; the separate narrow proposal in `BACKEND-COMMENT-PAGINATION-PROPOSAL.md` remains **unapproved and unapplied**.
- Chronological totals are stable for ordinary filters. The pre-existing hashtag count is bounded to the retrieved matching sample; that contract was not broadened as part of the approved cursor change.
