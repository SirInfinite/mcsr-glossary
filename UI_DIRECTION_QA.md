# UI direction correction QA

Date: 2026-09-07. Branch: `style/mcsr-theme-pass`. Starting commit: `dda8d53` (clean worktree).

**UI correction: PASS for local review. Hosted release: HOLD for existing backend gaps.** No merge, push, tag, release, database migration or content rewrite is part of this correction.

## Scope and visual direction

The previous list placed tiny category/context labels in a narrow third column, repeated project totals, and used similar dark surfaces. The corrected interface keeps the Minecraft logo, beveled primary navigation, square geometry and compact reference-tool structure. It gives term names and definitions priority, adds readable context tags and increases surface separation.

Reviewed the current local rendering and the [MCSR Ranked leaderboard](https://mcsrranked.com/leaderboard). Adapted its compact control density, clear primary navigation and selective use of color; no assets or layouts were copied. This is a refinement of the existing system.

## Typography

| Role | Final treatment |
| --- | --- |
| Display | Existing local Minecraft font for major page headings, term names, primary navigation and major actions; existing title-style logo retained. |
| UI | Segoe UI with system sans-serif fallbacks. Labels, categories, tags, aliases, search suggestions, forms, utilities and secondary navigation use normal text. |
| Body | The same sans-serif stack; 15px desktop list previews, 14px mobile previews, 16–17px article text with comfortable line spacing. |
| Technical | Existing system monospace/Consolas stack for dates, numbers, keyboard shortcuts and code. |

List titles are 21px desktop / 20px mobile. Aliases, categories and tags are 13px sans-serif; status labels are 12px sans-serif. The old 9–11px Minecraft metadata has been removed. Related-link names and vote labels also use sans-serif text.

## Category, tag and status semantics

The canonical taxonomy was already coherent in `TERM_CONTRACT` and all published data. No reclassification was necessary:

- **Format:** the kind of speedrun or competitive format.
- **Strategy:** a broader approach to running or making decisions.
- **Technique:** a specific method or execution skill.
- **Terminology:** a concept, object or piece of community jargon.
- **Tool:** software or a utility used by runners.

Each term still has exactly one primary category. Category labels use readable, capitalized, green-backed text, consistent across browsing, term pages and category filters.

List previews show up to four existing tags. Explicit dimension/mode tags come first, followed by run context such as navigation/resetting, version relevance and other context. Generic tags such as `category`, `format`, `tool`, `minecraft` and `speedrunning` are omitted from previews. An entry with only generic tags, such as Any%, gets no invented substitute. All canonical tags remain available on its term page and in filtering/search.

Display formatting leaves filter values and content untouched: `version-1-16-1` displays as **1.16.1**, not an inferred version range; `rsg` displays as **RSG**; hyphenated words display with spaces. Shared presentation helpers serve the list, term page and tag filter labels.

Only exceptional statuses are shown: **Legacy** in muted lavender, **Historical** in slate gray and **Needs Updating** in gold. Text, outlined geometry and a square marker make these understandable beyond color. Current entries have no status badge. The dataset currently has no Needs Updating flags; that state was additionally reviewed using a browser-only fixture.

## Layout and metric placement

- Removed the entire `Term / alias — Definition — Type / context` header and its CSS. There is no third table-style column.
- Desktop entries have a term/alias area and a wider reading area. Category, tags and exceptional status wrap below the definition preview. Small gaps and raised surfaces separate entries without rounded card chrome.
- Mobile follows one natural column: term, aliases, definition, then wrapping metadata. It does not retain a compressed table.
- Term pages retain the continuous article layout. The dark metadata box and related-term count were removed; readable category/tags, the update date and researched historical notes remain.
- Removed homepage total/category summaries, default “Showing all terms” totals, per-entry media counts and the footer term count. Search/filter/A–Z matches still announce useful result counts. Votes, active-filter counts and form limits remain functional feedback.
- Stats retains totals, five-category distribution, tag totals, current/legacy/historical counts, media coverage, recent updates and available community ratings. It is the home for aggregate project metrics.

## Palette and surfaces

| Token / meaning | Dark | Light |
| --- | --- | --- |
| Page | `#1d252a` | `#e7e5d7` |
| Raised surface | `#2d383e` | `#f1efdf` |
| Inset surface | `#222c31` | `#d6d7c9` |
| Alternating row | `#303b40` | `#e0e1d2` |
| Hover | `#3a4849` | `#d7dfca` |
| Border | `#4a5a61` | `#b9bfae` |
| Primary interaction | `#b6e481` | `#3d631e` |
| Overworld context | `#b5d993` | `#365520` |
| Nether context | `#ffb59f` | `#7b342b` |
| End context | `#d9b7f2` | `#603b7a` |
| Run-mode context | `#a5d7ed` | `#214e63` |
| Needs Updating | `#efd087` | `#795719` |
| Upvote | `#FF4400` | `#FF4400` |
| Downvote | `#9293FE` | `#9293FE` |

Dimension colors apply only to explicit tags or directly associated tags such as bastion/fortress/blaze and dragon/perch. Run-mode tags use blue. Unclassified tags remain neutral. Categories have one consistent green treatment rather than a different color for every category. Vote hues remain exclusive to votes.

## Screenshot review and refinement

Local, ignored evidence directory: `output/playwright/ui-correction/`. The report is tracked; generated PNGs and raw audit reports remain local QA artifacts.

Baseline: `baseline/dark-home-1440.png`, `dark-term-390.png`, `light-home-1440.png`, a fresh CLI capture `home-current.png`, and `ranked-reference.png`.

The first pass generated 36 screenshots in `first/`. Reviewed dark desktop Home, scrolled list, search results, filtered list, Axis Calculated (Legacy), Forced Perch (Historical) and Stats; mobile Home/Bastion; light desktop Home and mobile Bastion.

**Second refinement after that review:** increased tags from 12px to 13px, enlarged mobile navigation lettering, changed category labels from cool gray-blue to a consistent green treatment, removed unhelpful generic preview tags, and prioritized run context ahead of general metadata. The accessibility audit then found light tag contrasts of approximately 4.2–4.4:1; darkened those semantic text colors and reran the complete browser/visual audit successfully.

Final screenshots reviewed in `final/`:

- Desktop: `dark-home-1440.png`, `dark-list-1440.png`, `dark-search-results-1440.png`, `dark-filtered-1440.png`, `dark-term-1440.png`, `dark-legacy-1440.png`, `dark-historical-1440.png`, `dark-stats-1440.png`, `dark-changelog-1440.png`, `light-home-1440.png`.
- Mobile: `dark-home-390.png`, `dark-list-390.png`, `dark-term-390.png`, `dark-home-360.png`, `dark-submit-390.png`, `light-home-390.png`, `light-term-390.png`, `light-filtered-360.png`, `light-updating-fixture-390.png`.
- Tablet/media: `light-media-768.png` (Triangulation). Real external media was also checked in a separate unmocked browser run.

The final matrix generated 228 screenshots: 224 viewport/state captures plus four full-length media captures. Two additional Needs Updating fixture screenshots and refreshed Changelog screenshots supplement it. The required term/definition hierarchy, surfaced tags, reduced numeric noise and clearer material contrast were reviewed in rendered images, not inferred solely from code.

## Responsive and accessibility

Tested **1440×900, 1280×720, 1024×768, 768×1024, 430×932, 390×844 and 360×800** in both themes. All **224 layout checks** passed without horizontal overflow.

**64 full-view axe scans** passed. Another **six focused scans** passed: two Needs Updating fixtures and four updated Changelog views. Lighthouse Accessibility: **100 mobile / 100 desktop**.

Keyboard suggestions, active descendant/selected state, clear/reset feedback, modal trap/restore, skip link, utility expansion without article reflow, vote `aria-pressed`, lightbox and reduced motion remain covered. Touch emulation at 390px additionally verified icon-only utility controls, edit-dialog open/close and eight reversible vote transitions in each theme.

## Performance

Lighthouse 12.8.2, headless Chrome 151 on Windows, local `/mcsr-glossary/` with the existing compression/cache policy. Standard simulated mobile throttling and desktop preset were measured separately, using real service configuration.

| Metric | Mobile | Desktop |
| --- | ---: | ---: |
| Performance | **99** | **100** |
| Accessibility | **100** | **100** |
| Best Practices | **100** | **100** |
| SEO | **100** | **100** |
| LCP | 2.2s | 0.5s |
| Total blocking time | 60ms | 0ms |
| Layout shift | 0 | 0 |

CSS: 47,416 → 46,807 bytes; gzip 9,896 → 9,960 bytes (**+64 bytes compressed**). No new assets, fonts, runtime dependencies or build tools. The performance scores match the preceding theme pass. Evidence: `lighthouse-mobile.json`, `lighthouse-desktop.json`, `measurements.json`.

## Tests and integrity

| Check | Result |
| --- | --- |
| `npm run check` | PASS: content validator, **108/108 unit tests**, static/import/CSP checks and current-tree secret scan |
| `npm run check-content` | PASS: explicit content and UI-core validation groups |
| `npm run test-browser` | PASS: **67 product**, **32 failure**, **224 layout** checks and **64 axe** scans |
| Additional focused browser checks | PASS: both touch themes, all reversible vote transitions, six further axe scans |
| `npm run test-database` | PASS: **144 checks**, fresh/legacy replay of all 11 migrations, disposable databases cleaned up |
| `npm run test-live-voting` | PASS: real transitions, concurrency/idempotency, rejection paths and QA-vote cleanup |
| `npm run test-live-backend` | **FAIL — existing hosted gaps**, below; all 16 anonymous direct-table probes denied |
| Unmocked browser smoke | PASS: seven main/media views, zero application exceptions, local failed assets, external HTTP errors or host CSP violations |
| History secret scan | PASS: 260 historical text blobs, no findings |
| `git diff --check` | PASS |

Product coverage includes search, tags/categories, A–Z, random, direct routes/reload, related links, copy/edit/report, media/lightbox, voting/removal/switching, submissions, Stats, Changelog, themes and back/forward. New assertions check category/tag provenance, the four-tag limit, exceptional statuses, retained filter values and useful result announcements.

Published data, statuses, media/assets/fonts, routing/search logic, backend modules/configuration, migrations and package manifests are unchanged from `dda8d53`. Strong CSP, allowlists and the existing sanitization boundary remain intact. Tag labels and attributes are escaped; only owned keys from the fixed context map can add semantic color attributes.

## Limitations and recommendation

- Hosted capability gate remains unchanged: **20 published terms lack vote targets**; `get_glossary_trending_terms` and `submit_glossary_correction` return **404 / PGRST202**. Optional capability flags remain disabled and edit fallback remains available. Authenticated production catalog/migration/advisor verification remains a separate release gate. This pass did not alter production schema or create moderation rows.
- Tests use Chromium and touch emulation, not physical iOS/Android devices or an exhaustive assistive-technology audit. System-font rendering can differ across platforms.
- Automated media/layout scans use provider fixtures; the separate seven-view smoke uses real services. External embeds remain subject to provider availability.
- Some existing terms have only generic tags; these entries intentionally have fewer than two preview tags. The complete canonical tag set is preserved on detail pages and in filters.

**UI direction correction: PASS.** The excessive darkness, pixel-font metadata, vague table header, hidden context tags and repeated statistics have been addressed. Ready for review on the working branch; public release remains on HOLD for the independently documented backend gaps.
