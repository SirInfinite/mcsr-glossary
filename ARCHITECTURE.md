# MCSR Glossary architecture

MCSR Glossary is a static reference application. `data/terms.json` is the only published content store. Supabase accepts private community contributions and maintains votes; it cannot publish a definition. There is no framework, bundler, application server, runtime npm dependency, event bus or dependency-injection framework.

## Start here

Read `js/app.js` for startup and composition, `js/content-contract.js` for the schema, `js/core/router.js` for navigation, and `js/backend/voting.js` for request/state ownership. The public backend contract and deployment procedure are in [SUPABASE.md](SUPABASE.md). Run the checks in [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md).

```text
index.html
  ├─ theme.js: apply a validated saved theme before paint
  ├─ local Marked / DOMPurify: Markdown and sanitization
  └─ app.js: initialize once, compose controllers, render the current route
       ├─ config.js: frozen public configuration
       ├─ content/loader → shared content-validation → content-contract
       ├─ core/router → Home / Term / Stats / Changelog / About
       ├─ UI controllers → pure search, validated media, safe content rendering
       └─ backend controllers → one Supabase client → bounded HTTP requests

terms.json → validator + runtime loader → frozen published records
browser UUID → narrow anonymous RPC → private implementation → private tables
moderator → reviewed repository edit → tests → GitHub Pages
```

## Module boundaries

| Module | Responsibility / public boundary |
| --- | --- |
| `js/app.js` | Composition, one-time startup, page visibility, route focus, theme controls, optional-service refresh. |
| `js/config.js` | Repository, Pages URL/subpath, content paths, request deadline, public Supabase configuration and deployment capability flags. |
| `js/theme.js` | Six-line prepaint exception: reads only the `theme` storage key, accepts light/dark, creates no globals. Its key is checked against the runtime convention. |
| `js/core/router.js` | Pure route resolution and URL creation; one history owner; native link interception preserves modifier/new-tab behavior. |
| `js/core/storage.js` | Nonfatal persistence and self-healing browser UUID ownership. |
| `js/core/http.js` | `request`, typed `AppError`, service messages; deadline covers headers and body parsing; no automatic mutation retries. |
| `js/content-contract.js` | Canonical taxonomy, limits, editorial dates, historical route slugs and provider/media validation. |
| `js/content-validation.js` | The same pure whole-dataset validator used by Node and the browser. |
| `js/content/loader.js` | Fetch, validate, clone and freeze the complete dataset; invalid content fails closed. |
| `js/content/search.js` | Pure ranking, composed category/tag/A–Z filtering, related-term resolution and recent-vote ranking. |
| `js/content/media.js` | Inline-slot analysis, deterministic text/media block splitting, media classification, safe HTTPS fallback URLs. |
| `js/backend/client.js` | Configuration validation and the only Supabase HTTP/RPC adapter. |
| `js/backend/vote-contract.js` | Vote values, transitions, optimistic projections and strict response-shape validation. |
| `js/backend/voting.js` | Confirmed rows, per-term in-flight state, stale-read protection, optional trending and versioned confirmed cache. |
| `js/backend/contributions.js` | New/correction/report validation, narrow RPC calls, receipt validation and fallback text; no DOM or clipboard side effects. |
| `js/ui/home.js` | Home rendering, search suggestions/keyboard controls, filter and index state, discovery presentation. |
| `js/ui/term.js` | Reference article markup and utility/vote interactions; each mount has a generation. |
| `js/ui/content.js` | Single trusted Markdown boundary, escaped highlights/previews, validated media DOM and lightbox. |
| `js/ui/pages.js` | Derived Stats and local Changelog presentation; one shared bounded changelog request, retryable after failure. |
| `js/ui/modals.js` | Contribution form state, one focus-trap implementation, pending guards, focus restoration and generation-checked completion/timers. |
| `js/ui/feedback.js` | Clipboard fallback and one resettable toast timer. |

The import graph has 20 reachable ES modules and no cycles. No application state is attached to `window`. Marked and DOMPurify retain their existing, intentional vendor globals. Factories accept small explicit dependencies so their logic can be tested; they are ordinary functions, not a service container.

## State ownership and transitions

| State | Owner | Changes through |
| --- | --- | --- |
| Published records | Loader; retained by `app.js` | One validated immutable snapshot. No component mutates records. |
| Page and active term | Router | `navigate`, `toTerm`, native link interception, `popstate`. |
| Query, category, tags, match mode, index, suggestions | Home controller | Input/change/click/keyboard handlers; pure `filterTerms` computes results. These preferences are not persisted. |
| Confirmed votes, pending writes, uncertain outcomes | Voting controller | `load` and `choose`; views only query or request transitions. |
| Moderation mode, target, pending status, focus, close timers | Modal controller | Open/close/submit; old generations cannot reset or close a newly opened form. |
| Theme | Validated DOM attribute plus storage helper | Prepaint bootstrap and the theme toggle. |
| Changelog request | Pages module | One cached promise; rejected requests are evicted for retry. |

Browser storage is optional. `theme` is a validated enum, `mcsr_browser_id` is one validated UUID, and `mcsr_vote_snapshot` is a version-1 confirmed cache tied to that UUID. The previous two independent vote-cache keys are removed. Bad JSON, obsolete versions, wrong owners and malformed rows cannot enable voting. A blocked/full storage area uses in-memory identity for that page.

## System invariants

### Content and routing

1. Every term has a unique lowercase UUID, a case-insensitively unique canonical name and a unique usable canonical route.
2. UUID routes, canonical slugs and optional `legacySlugs` share one collision-checked namespace. Preserve UUIDs when renaming a term; retain its previous slug explicitly. Invalid/empty routes show a recovery state.
3. Aliases are nonempty, normalized for comparison, unique, and cannot ambiguously identify another term. Related terms resolve to canonical names with exact editorial casing; self/duplicate/unresolved relations fail validation.
4. Categories and statuses come from the controlled taxonomy. `needsUpdating` is boolean. Historical/legacy records require a short historical note. Dates are real calendar dates, with update dates no earlier than creation dates when both exist.
5. Every media item satisfies one declared provider contract and appears exactly once through a standalone `{{media:N}}` token. No raw iframe/directive schema is accepted.
6. Runtime and CLI reject the same invalid editorial records. The CLI additionally verifies migration seeds. Rendering always escapes text or crosses the shared sanitizer boundary.
7. Search precedence is canonical exact, alias exact, canonical prefix, alias prefix, canonical word-prefix, canonical substring, alias substring, tags/category, classification/context, definition. Fixed English collation breaks score ties; filtering is independent of DOM order.
8. Routes and static assets work at `/mcsr-glossary/`, after reload and through back/forward navigation. URLs are generated from the current pathname, not an assumed domain root.

### Votes and contributions

1. The database holds at most one current `(term_id, voter_hash)` receipt. A target is exactly `-1`, `0` or `1`; neutral means no receipt. Repeated target-state writes are idempotent.
2. A short transaction locks the target's total row before changing receipts or totals. Concurrent clients and the older released vote RPC use the same row-lock boundary.
3. `upvotes = legacy_upvotes + count(up receipts)` and likewise for downvotes. Deferred constraint triggers enforce equality at commit. The migration preserves documented pre-receipt history explicitly; it never discards historical counts to force equality.
4. The frontend allows one pending write per term across article recreation. A request's completion can update its service state but cannot modify an unrelated or replaced DOM view. A read started before a write cannot overwrite the newer state.
5. Optimistic totals are ephemeral. Only confirmed responses enter persistent cache. Timeout/network/malformed-response outcomes are uncertain; the last confirmed display is retained and another write is disabled until a fresh page load checks the backend. Browser cancellation does not imply server rollback.
6. Proposal rows explicitly distinguish `new` (no target) and `correction` (stable target FK). Reports have their own private queue and cannot update static terms. Server-generated IDs, timestamps and moderation state are authoritative.
7. Anonymous callers can queue pending items through validated RPCs but cannot enumerate queues, read receipts, modify aggregates directly, approve records or publish content. Browser UUIDs are only weak duplicate friction, not authentication.
8. Repeated form actions cannot overlap, including while clipboard permission or fallback is pending. Closing and reopening a form invalidates its former response and success timer. Failed/unconfirmed delivery preserves a reviewable copy without claiming that the server certainly rolled back.

### Security, initialization and deployment

1. Every application table enables RLS; public table privileges are revoked. Public APIs are invoker wrappers; privileged implementations have an empty search path in the unexposed `private` schema. Internal insertion/trigger helpers are not executable by `anon`.
2. Browser configuration accepts publishable or legacy anon credentials and rejects privileged credentials. History/current-tree scans print only finding type and location, never matched secrets.
3. CSP permits self-hosted scripts/fonts, fixed image hosts and fixed YouTube/Twitch embed origins. No arbitrary iframe HTML, inline script exception, `eval`, or external visual script is introduced.
4. Startup is guarded once. Document/window listeners are installed once, detached article nodes become collectible, the lightbox is a single native dialog, and leaving a term removes its players.
5. Every fetch passes through the deadline/error boundary. Optional community failures do not block static content. No GitHub API is called: Changelog uses the committed Markdown file and an external source link on failure.
6. Ordered migrations reproduce the application schema. A production change requires recorded migration parity, actual hosted advisors, and the release gates; local PostgreSQL tests are not hosted verification.

## HTML and media trust boundary

`ui/content.js::parseDefinition` parses Markdown, runs the local DOMPurify allowlist, then removes unsafe link protocols and adds safe external-link attributes. Its output is the only content-derived rich HTML accepted by article/changelog rendering. `plainText` consumes that sanitized result. Search highlighting splits original text and escapes each fragment, so highlighting cannot break an HTML entity into markup.

Standalone media tokens separate text and media blocks before Markdown parsing. The renderer sanitizes each text block and builds media with DOM APIs into one detached fragment, then replaces the article contents once. It does not search rendered paragraphs for magic marker text. All 100 existing definitions retain their element order and text; regression fixtures cover marker-like prose and Markdown/HTML around media boundaries.

Other UI templates contain fixed local markup/SVG, escaped text, contract-validated UUIDs/enums or validated numeric values. `innerHTML = ""` is only clearing. CSS widths/aspect ratios come from counts or validated dimensions. Media embeds are constructed with DOM APIs from validated IDs; they never pass supplied iframe HTML through a sanitizer exception. Image/video source links remain available if a third-party provider fails. Cross-origin player internals are outside the application's control.

## CSS and layers

The approved visual system is preserved. `css/style.css` remains one small, sectioned stylesheet: tokens/base, layout/header, discovery/search/filters, reference entries/detail, actions/media/votes, Stats/Changelog/About, dialogs/footer, responsive and reduced motion. Only dead compatibility aliases and asset references were removed; repeated z-index literals became named tokens.

| Layer | Token value |
| --- | --- |
| Tag menu | 20 |
| Back to top | 50 |
| Sticky header | 100 |
| Search suggestions | 110 |
| Moderation dialog/backdrop | 1000 |
| Toast / skip link | 1200 |
| Image lightbox | Native browser top layer |

## Development, tests and release

Node 22 runs the validators and pinned development tools. The browser has no npm runtime dependencies. `npm start` is a development-only static server that maps the repository to `/mcsr-glossary/` regardless of checkout folder name and uses gzip/cache headers comparable to Pages.

- `npm run check`: shared content validation, deterministic tests, import/path/CSP/migration structure, secret scan.
- `npm run test-browser`: existing product flows, failure cases, all required sizes/themes, axe scans and screenshots with isolated service responses.
- `npm run test-database`: creates uniquely named disposable loopback databases, replays every migration with and without prototype history, tests RLS/RPC/concurrency/constraints, cleans rows, drops only its own databases.
- `npm run test-live-voting`: real reversible-vote checks with verified removal of QA votes.
- `npm run test-live-backend`: public access-denial and capability/target coverage probes; never creates a valid moderation row.
- `node scripts/scan-secrets.mjs --history`: scans the working tree and historical text blobs without printing credentials.

CI uses the same local commands, one Chromium installation and one PostgreSQL 17 service. It uploads QA evidence and never deploys. `supabase/config.toml` records the local CLI settings: public-only API exposure, explicit grants and migration-owned seed data. GitHub Pages currently uses the repository's existing legacy `main` configuration; the structural branch does not change or publish it.

## Second architecture review

The second review removed a Home-to-Term navigation dependency: the router now owns shared link behavior. It consolidated dialog focus handling, removed obsolete cache/global configuration paths and CSS aliases, preserved first-occurrence alias spelling during normalization, tightened UUID/media-port validation, and explicitly refreshed public SQL wrappers after renaming private helpers. Fresh and legacy migration replays, failure tests and browser QA exercise these boundaries. Remaining hosted verification requirements are recorded in [STRUCTURAL_INTEGRITY_QA.md](STRUCTURAL_INTEGRITY_QA.md), not inferred from local results.

The September 7 follow-up reproduced and fixed clipboard work escaping the form pending guard and text placeholders colliding with definition content. It replaced placeholder-based media rendering with sanitized text/media blocks, removed the unused media-presentation adapter and expanded historical secret scanning. All 100 published articles preserve their rendered content/order, and a fresh checkout passes the full local suite. Hosted parity/advisor gates remain open.
