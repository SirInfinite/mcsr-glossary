# MCSR theme QA

Review date: 2026-09-07. Branch: `style/mcsr-theme-pass`.
Baseline: `1fa3fa3` on `refactor/structural-integrity-overhaul`, with a clean working tree.
Theme implementation: `ea98ea2`. Expanded browser coverage: `9af507b`.

**Theme result: PASS. Public release recommendation: HOLD for the existing hosted backend gaps described below.** This is a local theme review, not a deployment or release. No merge, push, tag or release was performed.

## Baseline and visual direction

The local site was served at `http://127.0.0.1:8001/mcsr-glossary/` before editing. Home, search, filters, regular and media definitions, Stats, Changelog, About/Credits, submission/edit/report dialogs, voting, history and both themes were inspected through browser flows and screenshots. Baseline checks passed: 108 unit tests, 61 product checks, 32 failure checks, 90 responsive layouts and 36 axe scans.

The baseline's title-inspired logo, local Minecraft font, compact reference rows, readable body text and continuous inline media were retained. The weak points were plain tab navigation, surfaces with little material distinction, generic counts/date styling, an understated Stats presentation, and inconsistent control depth. The public site was also rendered and reviewed; it still serves an older 80-term design, while this branch contains 100 terms.

The final language combines stone menu controls with a compact speedrunning reference. Major navigation gets a visible bevel; small controls get a quieter inset or selection border. Technical metadata and numerical rows borrow the alignment and density of run tools. Color follows real content and control states, with no invented ranks, times, coordinates or dimension assignments.

## References reviewed

| Reference | Adapted principle | Evidence |
| --- | --- | --- |
| [MCSR Ranked leaderboard](https://mcsrranked.com/leaderboard) | Compact navigation, restrained dark surfaces, dense data rows and explicit selection | Rendered screenshot `references/ranked.png` |
| [PaceMan](https://paceman.gg/) | Split/version/time column alignment and precise numeric presentation | Rendered screenshot `references/paceman.png` |
| [LiveSplit](https://livesplit.org/) | Tabular timing values, thin split separators and a strong active row | Rendered timer example in `references/livesplit.png` |
| [Ninjabrain Bot](https://github.com/Ninjabrain1/Ninjabrain-Bot) | Compact coordinate metadata and technical overlay density | Public demo reviewed in `references/ninjabrain-demo.png` |
| [Minecraft on Speedrun.com](https://www.speedrun.com/mc) | Textual leaderboard/category context only | Browser returned Cloudflare 403; not counted as a rendered visual review |
| [Public MCSR Glossary](https://sirinfinite.github.io/mcsr-glossary/) | Existing title logo and Minecraft menu-button influence | HTTP 200; `references/public-glossary.png` |

Reference screenshots are under `output/playwright/mcsr-theme/`. No reference assets, logos, illustrations or exact layouts were imported into the product.

## Typography

| Role | Typeface and scale |
| --- | --- |
| Brand | Existing local title-inspired logo, slightly larger desktop rendering and a restrained dimensional shadow |
| UI/display | Existing local Minecraft WOFF fonts; 11–14px controls/labels, 16–20px section headings, 28–44px page/term titles |
| Body | Segoe UI / system sans-serif; 14px list previews, 16px mobile and 17px desktop article text; 1.75–1.8 reading line height |
| Technical | System monospace / Consolas; tabular counts, dates, version/topic metadata, vote totals and 36–52px Stats values |

No serif body text or external font requests. Existing fonts retain `font-display: swap`. Body reading width remains 720px; utility actions reserve their desktop space independently of title text.

## Palette and materials

| Token / purpose | Dark | Light |
| --- | --- | --- |
| Page | `#181B1D` deepslate charcoal | `#E7E5D7` smooth stone / end stone |
| Raised surface | `#232729` | `#F1EFDF` |
| Inset surface | `#111416` | `#D6D7C9` |
| Primary text | `#EEEFE5` | `#242A22` |
| Secondary text | `#BBC2BC` | `#515C4C` |
| Muted text | `#9CA79F` | `#4E5949` |
| Border / strong border | `#3B4242` / `#6B7770` | `#B9BFAE` / `#7D8873` |
| Primary accent | `#B1D883` | `#3D631E` |
| Stone button face | `#3E4646` | `#D0D2C5` |
| Overworld tag | `#A8CB88` | `#476729` |
| Nether tag | `#E4A398` | `#8F453B` |
| End / archived detail | `#C2AED9` | `#70508F` |
| Needs updating | `#DBC088` | `#795719` |
| Upvote | `#FF4400` | `#FF4400` |
| Downvote | `#9293FE` | `#9293FE` |

CSS also centralizes highlight, shade, hover, focus, positive/error, raised/inset bevels, motion and layer tokens. Vote colors remain exclusive to voting. Dimension labels require an explicit existing `overworld`, `nether` or `end` tag; classifications are never guessed from a category or term name. Every rendered dimension label was compared with the 100 source terms.

## Components themed

| Component | Final treatment |
| --- | --- |
| Topbar / logo | Compact rectangular stone buttons, two-pixel inner highlights/shadows, inset active state plus underline; existing logo and geometric theme toggle |
| Home / search | Immediate search, strong inset border, physical shortcut key, command-like alternating suggestions and clear keyboard selection |
| Filters / A–Z | Small inventory-like slots with visible selected borders and underlines; compact expandable category/tag controls |
| Term list | Alternating reference rows, thin selection edge, type/context metadata and explicit dimension markers |
| Term article | Title aligned with prose; one continuous reading surface, narrow top rule and compact debug-inspired metadata strip |
| Term actions | Squared utility controls expand horizontally on desktop hover/focus; title does not reflow; touch remains icon-only |
| Voting | Crisp block controls; exact vote hues, filled selected arrow, inset state, border/underline, status text and `aria-pressed` |
| Media | Thin stone-like frame and small depth offset, natural inline placement and credited captions; existing image lightbox preserved |
| Related terms | Thin connected rails and square nodes, compact term/category links; no literal advancement tree |
| Stats | Shared counter strip, tabular values, alternating split-style rows and truthful segmented category bars with percentages |
| Changelog | Monospaced release labels and restrained green unreleased marker; Minecraft section headings |
| About / Credits | Compact heading markers and existing community facts; readable, unboxed text |
| Modals | Consistent stone border, inset fields, clear labels, field counts and beveled primary action |
| Footer | Compact project links, Minecraft wordmark text and a block-like separator |

Avoided: tiled textures, screenshots as chrome, random items/mobs, fake health/hunger bars, invented rarity, decorative coordinates, neon effects and a literal Minecraft menu recreation. Plain web tabs and undifferentiated controls were replaced. The existing reference-row structure was preserved; no dashboard/card grid was introduced.

## Screenshots and second refinement

All paths below are relative to `output/playwright/mcsr-theme/`. `baseline/` preserves the pre-edit captures. `first/` preserves the first theme implementation. `final/` contains the refined result. Screenshots are local ignored QA artifacts; the browser suite can regenerate them using `QA_OUTPUT_DIR`.

The first review explicitly covered dark Home desktop/mobile, search, filters, regular term, full media term, Stats, modal, and light Home/term/mobile. Additional tablet and smallest-phone captures were inspected.

Changes made after that review:

1. Removed the large raised title panel from the term page, aligned the title with the prose, and confined inset framing to the metadata strip.
2. Increased desktop technical metadata from 11px to 12px and kept a compact mobile scale.
3. Darkened light-theme muted text after axe found a 4.48:1 contrast combination on inset surfaces; the replacement is approximately 5.06:1 there.
4. Moved the fixed-position suggestion list inside the main landmark. The newly added open-search audit exposed the previous placement outside all landmarks.
5. Corrected selected-row specificity so keyboard selection has the same appearance on both alternating suggestion backgrounds. Four focused search/axe retests passed after this final CSS correction.

Final screenshots actually reviewed:

| View | Reviewed files in `final/` |
| --- | --- |
| Dark Home / term list | `dark-home-1440.png`, `dark-home-1280.png`, `dark-home-1024.png`, `dark-home-768.png`, `dark-home-430.png`, `dark-home-390.png`, `dark-home-360.png` |
| Search / filters | `dark-search-1440.png`, `dark-filters-1440.png`, `dark-filters-390.png` |
| Regular term | `dark-term-1440.png`, `dark-term-390.png`, `light-term-1440.png` |
| Media term | `dark-media-full-1440.png`, `light-media-390.png`, `real-youtube-1280.png` |
| Stats | `dark-stats-1440.png`, `dark-stats-390.png` |
| Supporting pages | `dark-changelog-1440.png`, `light-changelog-390.png`, `dark-about-1440.png` |
| Dialogs | `dark-submit-1440.png`, `dark-submit-390.png`, `dark-report-360.png` |
| Vote states / utility expansion | `dark-vote-down-390.png`, `light-vote-up-1440.png`, `dark-utility-expanded-1440.png` |
| Light Home / mobile | `light-home-1440.png`, `light-home-390.png` |

The visual suite additionally captured every main view, open search/filters and each contribution dialog at every tested size in both themes. Deterministic media screenshots replace third-party iframe contents with blank fixtures to audit the host layout; `real-youtube-1280.png` separately shows the automatically loaded real player without autoplay.

## Responsive and accessibility results

Viewports: **1440×900, 1280×720, 1024×768, 768×1024, 430×932, 390×844, 360×800**. All **154 layout checks passed**, with no horizontal overflow. The two-row mobile header retains all four menu buttons; metadata wraps and article media remains full-width.

**44 full-view axe scans passed**, plus **4 focused open-search scans** after the last selection-style correction. Lighthouse Accessibility: **100 mobile / 100 desktop**. Keyboard search, active descendant/selected states, utility expansion without reflow, copy, skip link, modal trap/restore, `aria-current`, voting `aria-pressed`, image lightbox and reduced motion remain covered. Touch-emulated 390px checks confirm icon-only utilities and reversible voting states. These are automated/browser results, not a claim of an exhaustive assistive-technology audit.

## Performance

Local GitHub Pages subpath, gzip and ten-minute static cache policy; no backend mocks in Lighthouse. Lighthouse 12.8.2, headless Chrome 151 on Windows. Standard simulated mobile throttling and desktop preset, measured separately on 2026-09-07.

| Metric | Mobile | Desktop |
| --- | ---: | ---: |
| Performance | **99** | **100** |
| Accessibility | **100** | **100** |
| Best Practices | **100** | **100** |
| SEO | **100** | **100** |
| Largest contentful paint | 2.2s | 0.5s |
| Total blocking time | 60ms | 0ms |
| Cumulative layout shift | 0 | 0 |

CSS changed from 41,957 to 47,416 bytes (gzip: 8,827 to 9,896 bytes, **+1,069 bytes**). No new fonts, images, runtime libraries, build tools or network dependencies. Content, media assets, backend modules, configuration, migrations and package manifests remain unchanged from the baseline.

Evidence: `lighthouse-mobile.json`, `lighthouse-desktop.json`, `measurements.json`.

## Functional, security and network checks

| Check | Result |
| --- | --- |
| `npm run check` | PASS: content validation, **108/108** unit tests, static/import/CSP checks and current-tree secret scan |
| `npm run check-content` | PASS: explicit content and UI-core validation command |
| `npm run test-browser` | PASS: **61 product**, **32 failure**, **154 layout** checks and **44 axe** scans |
| Focused final theme checks | PASS: **16 checks**, including four additional axe scans, semantic dimension labels, successive keyboard selection, utility geometry, touch/reduced-motion and visible vote states |
| `npm run test-database` | PASS: **144 checks**, fresh/legacy replay of all 11 existing migrations, disposable local databases cleaned up |
| `npm run test-live-voting` | PASS: real reversible/idempotent/concurrent voting, rejection paths and verified QA vote cleanup |
| `npm run test-live-backend` | **FAIL, existing hosted capability gaps**, listed below; 16 direct-table access denials passed |
| Real-service browser smoke | PASS: seven pages; no application exceptions, failed local assets, HTTP error responses or host CSP violations |
| `git diff --check` | PASS |
| `node scripts/scan-secrets.mjs --history` | PASS: 105 current files, 257 historical text blobs, no findings |

Product flows cover search, categories/tags, A–Z, random, direct routes/reload, related links, media/lightbox, utility copy/edit/report, vote removal/switching, form validation/submission/fallback, Stats, Changelog, theme and back/forward. Failure checks retain invalid/missing content, malformed backend responses, unavailable services/storage, timeout/race protections and sanitization coverage. No definition or status was rewritten.

CSP, DOMPurify, URL/provider allowlists and all Supabase behavior remain intact. The real YouTube player produced one browser-origin WebGPU `powerPreference` warning on Windows; it produced no application error or CSP failure. The deterministic host audit and real-service smoke are reported separately.

## Known limitations and release recommendation

- The hosted project still lacks vote targets for 20 branch terms and the `get_glossary_trending_terms` / `submit_glossary_correction` RPCs (404/PGRST202). Existing capability flags and fallback behavior remain unchanged. No live moderation rows were inserted. This theme pass does not resolve or claim authenticated migration/advisor parity.
- Browser QA uses Chromium and touch emulation, not physical iOS/Android devices. Pixel-font rasterization and the system body font can differ by platform.
- Third-party player controls, captions supplied by providers, and their performance are outside the theme's control. Real YouTube/Twitch host integration was smoke-tested; deterministic screenshots do not certify provider internals.
- Speedrun.com's rendered page was blocked by Cloudflare. Other named visual references were inspected successfully.

**MCSR identity: PASS. Professionalism: PASS. Over-themed: NO. MCSR theme pass: PASS.** The local visual and regression gates are satisfied, including screenshot-based refinement. Keep the public release on HOLD until the existing backend deployment gates are resolved and independently verified. No release action was taken.
