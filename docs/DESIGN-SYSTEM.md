# Nashmi social interface foundations

The shared styles are implemented in `src/app/globals.css`, `tailwind.config.ts` and the existing UI components. No additional UI library is required.

| Token | Light | Dark |
| --- | --- | --- |
| Surface | `#ffffff` | `#15212c` |
| Muted surface | `#f2f4f7` | `#0b141b` |
| Border | `#dfe3e8` | `#344454` |
| Foreground | `#17212b` | `#f1f5f9` |
| Secondary text | `#58636f` | `#bac7d4` |
| Brand | `#126b6f` | `#62d3c8` |

- Typography: self-hosted Cairo variable font for Arabic and Latin; Segoe UI, Tahoma and Arial fallbacks. Preserve readable line heights for Arabic body text. Font license and source URLs live in `public/fonts/cairo`.
- Navigation: 56px desktop header content; mobile adds a 44px row of three direct tabs. `--navbar-height` is 57/101px including the border and also positions the fixed news ticker and sticky feed notice. Search sits beside the Nashmi logo. Active destinations expose `aria-current="page"`; logo opens `/`, Home opens `/updates`. Surveys appear inside the feed; old list/detail URLs remain compatible.
- Loading: preload the two local Cairo subsets. Navbar prefetch uses user intent on mobile/touch or constrained connections and idle work on desktop. The feed section has a readable heading hierarchy in the accessibility tree.
- Surfaces: feed cards use 14px corners and 12px mobile / 16px desktop padding. Comment bubbles use the muted surface and 18px corners. Feed cards remain stationary on hover.
- Layout: mobile reading column; desktop explorer, bounded 620px reading column (680px without the contextual column) and contextual column. Dashboard columns have `min-width: 0`; wide tables scroll inside accessible regions.
- Controls: primary social actions and tabs provide at least 44px targets. Preserve both positive and negative reactions. Active filters expose `aria-pressed`; expanding comments/content expose their state.
- Fields: neutral 44px search pills with internal icons, logical spacing and brand focus. Other fields use 12px rounded rectangles. Comment composer has an adjacent avatar, integrated send, 24px corners and grows from 44px to 144px before scrolling internally.
- Media: single images are contained inside bounded frames and open in an uncropped viewer. Multiple images use a two-column grid; videos remain inline 16:9 with native controls, no autoplay and preload none. Only the first feed item's first image is preloaded at high priority; other images are lazy. Small publisher avatars declare 44px sizes instead of requesting feed-sized images. Comment code loads on first expansion and stays mounted to retain drafts.
- Dialogs: use `useDialog` for Escape, focus trapping, scroll lock and return focus. Label the panel, its fields and close button. Menus use keyboard arrows, Home/End, Escape and return focus after selection.
- Feedback: retain drafts after failed submissions, clear busy state on network errors, announce feedback, offer retry and avoid replacing newer results with stale responses. New feed items appear behind an explicit user action rather than moving the reader automatically.
- Direction: use logical `start`, `end`, `text-start` and inline spacing. Keep publisher names and content neutral; colors identify interface roles and status, never political preference.
- Verification: isolated local role fixtures, Playwright across three browser engines, axe A/AA checks, RTL/LTR and light/dark viewport audits, and separately recorded visual reference creation/comparison. These checks complement actual browser visual review.

Contrast and accessibility are verified against rendered states. A token alone does not prove every composited text/background pair is accessible.
