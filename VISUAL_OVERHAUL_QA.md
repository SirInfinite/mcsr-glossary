# Visual overhaul QA

Date: 2026-09-06

Branch: `design/full-visual-overhaul`

Baseline: `d5e0479`

Implementation commits: `4014c08`, `53c002c`

Verdict: **PASS for the visual overhaul.** The branch is ready for review. Nothing was pushed, merged, tagged, released, or deployed.

## Product study and baseline

Inspected the repository inventory, HTML, CSS, JavaScript, content contracts, JSON, media and font assets, validators, tests, Supabase migrations, workflows, and project documentation. Started the existing vanilla app locally at `/mcsr-glossary/` before implementation. Visited the current public site and MCSR Ranked's home and ranking/data presentation in a real browser. No Ranked artwork, logo, component markup, or page structure was copied.

The local baseline has 100 terms; the currently published site inspected during this work still has the older 80-term experience. The local checkout was the functional baseline. Baseline desktop and mobile browsing covered Home, alias search and keyboard suggestions, filters, term cards, Bastion, One Cycle with media, Stats, Changelog, About/Credits, submission/edit/report dialogs, reversible voting, and both themes.

Baseline screenshots live in `output/playwright/baseline/`. They include `home-{dark,light}-{desktop,mobile}.png`, search, filters, regular/media terms, Stats, Changelog, About, all three contribution dialogs, voting, the public homepage at desktop/mobile, and `mcsrranked-desktop.png` / `mcsrranked-leaderboard.png`.

Visual weaknesses recorded before implementation:

- Generic two-column cards repeated tags, borders, and a “Read definition” action, consuming space without improving scanning.
- Oversized textured navigation buttons competed with the reference content. The public homepage also had a large hero.
- Typography mixed a pixel identity with cramped monospace metadata and inconsistent heading sizes.
- Article metadata and utility controls occupied too much vertical space; the reading column and related cards lacked a clear rhythm.
- Modal padding, blur, and secondary fields made simple contributions feel unnecessarily large.
- Statistics looked like disconnected dashboard panels. Changelog and About needed a stronger reading hierarchy.
- Mobile alphabetical navigation was cramped or hidden horizontally. Light surfaces and muted text needed deliberate contrast checks.
- The diagrams retained rounded frames and glow effects that did not fit the intended technical reference style.

## Final visual language

Dark charcoal and muted stone surfaces use thin borders, squared corners, and restrained grass-green highlights. Existing Minecraft typography identifies navigation, term names, controls, and numerical information; definitions use a readable system sans-serif. A single reference list replaces the card grid, while term pages use one reading flow with inline examples and compact related navigation. The site remains a search tool with immediate access to its controls.

The principles adapted from [MCSR Ranked](https://mcsrranked.com/) are compact navigation, pixel UI typography, strong surface boundaries, tightly aligned data, and sparse color. The glossary's article hierarchy and reference rows are designed around its own content.

## Typography

| Use | Typeface and scale |
| --- | --- |
| Brand | Existing local logo, retained in both themes |
| UI, navigation, term names, headings, stats | Local Minecraft Regular; existing Bold available where needed |
| Body and definitions | Segoe UI, system-ui, Apple system fonts, sans-serif |
| Technical values and code | ui-monospace, Consolas, Liberation Mono, monospace |
| Reading text | 17px desktop with 1.8 line height; responsive mobile sizing |
| UI scale | 12 / 14 / 16px; smaller subordinate category metadata on phones |
| Titles | Page titles 28–36px; term titles up to 44px, 28px on phones |

Reading content is capped at 720px inside an 840px article shell. Fonts remain local with `font-display: swap`; no remote font service or icon library was introduced.

## Color tokens

| Token | Dark | Light |
| --- | --- | --- |
| `--page-bg` | `#141615` | `#e9e9df` |
| `--surface-raised` | `#1d201e` | `#f4f3e9` |
| `--surface-inset` | `#101210` | `#dfdfd3` |
| `--text-primary` | `#eceee7` | `#242a22` |
| `--text-secondary` | `#b5bcb1` | `#515c4c` |
| `--text-muted` | `#969f92` | `#56614f` |
| `--border` | `#343a34` | `#c5c9ba` |
| `--border-strong` | `#65705f` | `#7d8873` |
| `--accent` | `#acd679` | `#3d631e` |
| `--positive` | `#a5d596` | `#396325` |
| `--warning` | `#dbc088` | `#795719` |
| `--error` | `#f2a498` | `#a53628` |
| `--upvote` | `#FF4400` | `#FF4400` |
| `--downvote` | `#9293FE` | `#9293FE` |
| `--hover` | `#252b23` | `#e0e5d6` |
| `--focus` | `#c4e79b` | `#416725` |

Vote hues are confined to voting. Selection also changes the arrow fill, border treatment, and `aria-pressed`; meaning is not conveyed by color alone.

## Components redesigned

| Component | Result |
| --- | --- |
| Header | Compact existing brand, plain pixel navigation, active underline, SVG theme control; two deliberate rows on phones |
| Home | Immediate search, aligned Random/Filter/Submit controls, factual counts, alphabetical reference list |
| Search | Command-style suggestion rows, highlighted matches, keyboard selection, clear action, slash hint, recoverable empty state |
| Filters | Expandable category/tag rows, selected states, filter count, Clear all; tablet tag menu stays within the viewport |
| Term entries | Native term links, aliases, concise previews, category, relevant archive/review status, example count |
| Term page | Name first, compact metadata, one comfortable reading column; no nested article cards |
| Actions | Link, exclamation, flag SVGs; horizontal label expansion in reserved space; keyboard accessible and icon-only on touch |
| Inline media | Automatic trusted iframe initialization without autoplay, restrained borders, credited captions, image lightbox; restyled original SVG diagrams |
| Voting | Compact reversible states, pending/error feedback and rollback; stale responses cannot overwrite another entry's controls |
| Related terms | Small native link rows with category context |
| Stats | Large numerical strip, CSS distributions, 91 current / 1 historical / 8 legacy terms, 20 examples across 19 definitions, actual aggregate ratings |
| Changelog | Local sanitized release notes grouped by version, clear text hierarchy, GitHub commit-history link |
| About/Credits | Concise purpose, sourcing, contribution and project-status explanations grounded in repository facts |
| Modals | Shared compact system, explicit labels, optional fields collapsed, validation and focus restoration, scrollable mobile forms |
| Footer | Small published-term count, beta status, GitHub, Contributing, and issue links |

## Screenshot review and second refinement

An initial implementation was captured and visually reviewed before the refinement work. Review covered the requested dark Home desktop/mobile, regular term, media-heavy term, Stats and modal, plus light Home, term and mobile. Intermediate captures are in `output/playwright/first/`; some were refreshed while testing the refinements. The baseline and final sets remain distinct.

Changes made after screenshot review:

1. Tightened metadata spacing and reduced the reading column from 760px to 720px.
2. Rebuilt the mobile A–Z index as three complete rows with larger targets and removed duplicated mobile summary text.
3. Aligned suggestion edges with the search surface and improved dropdown sizing.
4. Removed glow/rounded framing from the two original diagrams and corrected their sans-serif rendering.
5. Reserved utility-toolbar space after keyboard testing exposed overlapping expanded actions.
6. Moved tablet tag controls onto a separate compact row after the viewport sweep exposed overflow.
7. Darkened light-theme muted text after axe found a 4.28:1 contrast ratio in the header/footer, and retained the clearer original logo in both themes.
8. Reserved initial list/header space, cached definition previews, preloaded local content/modules, and separated initial reading from community-service loading.

The final sweep produced **102 screenshots** in `output/playwright/final/`. Primary screenshots and the ten `review-{home,filters,term,submit,media}-{dark,light}.png` contact sheets were inspected. Additional direct reviews covered search, media player viewports, Stats, Changelog, About, edit/report dialogs and footer behavior.

Required final views:

- Dark: `home-dark-1440x900.png`, `home-dark-390x844.png`, `term-dark-1440x900.png`, `media-dark-1440x900.png`, `media-player-dark-1440x900.png`, `stats-dark-1440x900.png`, `submit-dark-1440x900.png`.
- Light: `home-light-1440x900.png`, `term-light-1440x900.png`, `media-light-1440x900.png`, `home-light-390x844.png`, `media-player-light-390x844.png`.
- Both themes: Home, filters, Bastion, Triangulation and submission modal at all seven requested sizes; search, edit, report, Stats, Changelog, About and footer captures at 1440 and 390 widths.

The complete filename manifest is in `output/playwright/final/visual-audit.json`. Evidence files are local ignored QA artifacts, not production assets. Chromium can leave offscreen cross-origin players blank in full-page captures; the separate player-viewport screenshots show the loaded YouTube UI.

## Responsive and accessibility results

**Dark: PASS. Light: PASS. Responsive: PASS.**

Tested 1440×900, 1280×720, 1024×768, 768×1024, 430×932, 390×844 and 360×800 in both themes. All **168 layout checks** passed with no horizontal overflow. The checks include header, search, category/tag filters, term metadata and actions, media, votes, all contribution dialogs, footer and secondary pages.

Lighthouse Accessibility: **100** on desktop/mobile Home and the media-heavy term. Axe: **zero violations in 34 scans** across both themes, desktop/mobile Home, filters, regular term, Stats, Changelog, About and submission/edit/report dialogs. Keyboard testing verified active search descendants, arrow/Enter navigation, modal forward/backward focus wrapping, restored trigger focus, lightbox closure, and focused page headings after navigation.

An additional **13 touch/reduced-motion checks** passed with a mobile touch context. Dialogs also fit a shortened 390×440 viewport and retain reachable submit controls through scrolling. Native selects and media player controls remain accessible browser/provider UI. Physical iOS/Android devices and a manual NVDA/VoiceOver session were not tested.

## Lighthouse and performance

Lighthouse 12.8.2, Chromium on Windows, standard simulated mobile throttling and the desktop preset. Production was not deployed. The gzip audit server uses the same files, gzip text responses and `Cache-Control: max-age=600`, matching response headers verified on the current GitHub Pages site. It does not rewrite the application or mock services.

| Page / delivery | Performance | Accessibility | Best Practices | SEO |
| --- | ---: | ---: | ---: | ---: |
| Baseline Home, uncompressed Python server, mobile | 76 | 100 | 96 | 100 |
| Redesigned Home, same uncompressed server, mobile | 89 | 100 | 100 | 100 |
| Redesigned Home, Pages-like gzip, mobile | **99** | **100** | **100** | **100** |
| Redesigned Home, Pages-like gzip, desktop | **100** | **100** | **100** | **100** |
| Triangulation with automatically initialized YouTube, Pages-like gzip, mobile | **99** | **100** | **96** | **100** |

Home mobile with gzip: FCP 1.2s, LCP 1.8s, TBT 70ms, CLS 0. Desktop: FCP 0.3s, LCP 0.4s, TBT 0ms, CLS 0. The baseline CLS was 0.221. Home DOM elements fell from 2,078 to 1,355. The uncompressed local-server score of 89 remains below the requested 90 target; normal Pages compression reaches it without an application build step.

The media term's Best Practices deduction is Chrome's third-party cookie issue for `youtube-nocookie.com`. Automatically loading the allowed provider is retained as requested; CSP and the provider allowlist were not relaxed to remove the warning. Provider scripts also dominate that page's transferred bytes. Final Lighthouse JSON reports are in `output/playwright/final/lighthouse-*.json`.

## Functional, console and security checks

- `npm run check-content`: **PASS**, 33 content-validator tests and 26 UI-core tests. Validated 100 UUIDs/routes, 20 media records, related links, and migration-backed vote seed coverage.
- Playwright CLI `scripts/test-browser.cjs`: **PASS, 61 assertions** covering search/filter/discovery, links/history, utility expansion and no heading reflow, copy, reversible voting UI and failure rollback, late responses, contribution validation/fallback/success, focus, media/lightbox, theme persistence, optional trending and review/unseeded states.
- `npm run test-live-voting`: **PASS** against the configured live service: concurrent clients, conflicting requests, idempotency, rejected invalid inputs and test-vote cleanup.
- Touch/reduced-motion checks: **PASS, 13 checks**. Viewport sweep: **PASS, 168 checks**.
- JavaScript syntax, Python QA-server compilation and `git diff --check`: **PASS**.
- Final unmocked browser sweep: **zero application console errors, JavaScript exceptions, failed requests or HTTP 4xx/5xx responses**. No application CSP violations. YouTube emitted Chrome's known Windows `powerPreference` warning; an earlier manual provider visit also emitted a compute-pressure permissions-policy diagnostic.
- Moderation success/failure cases used isolated browser RPC fixtures; no test submissions or reports were written to the live queues. The live voting script restored its changes.
- `data/terms.json`, content contract, UI-core/security helpers, vendored DOMPurify/Marked and Supabase migrations have **zero diff** from the baseline. The CSP meta value is unchanged. No privileged credentials, arbitrary embeds, remote visual scripts or new production dependencies were introduced.

## Known limitations and release recommendation

1. The live beta has vote targets for 80 of the 100 local terms, and lacks `get_glossary_trending_terms`. The frontend now keeps those unavailable states explicit and avoids the known missing-RPC request. Existing deployed voting remains reversible. Optional trending rendering is preserved and tested with fixtures. The existing pending seed/trending migrations and the `trendingEnabled` configuration are documented in `SUPABASE.md`; no database change was made during this visual task.
2. YouTube owns its player appearance, availability and cookie diagnostics. The glossary's captions/source links remain usable independently. Published content currently exercises YouTube and local images; other supported provider types retain their existing contract/runtime handling and validator coverage.
3. Screenshots and browser checks use Chromium emulation, not physical devices. Manual assistive-technology and other browser-engine checks remain separate.
4. Some pixel-font category metadata is intentionally compact. There are no remaining generic card/dashboard treatments identified in the reviewed primary views. Long changelog content remains a long reference page, grouped by real release metadata without invented dates.

**Recommendation:** approve the design branch for review and a public showcase after the normal deployment decision. Align the pending backend seed/trending setup before claiming full community-service coverage for all 100 terms. Recheck actual GitHub Pages Lighthouse after deployment. This report is not a merge, deployment, tag or release action.
