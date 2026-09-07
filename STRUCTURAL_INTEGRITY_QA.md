# Structural integrity QA — September 7, 2026

## Current verification and recommendation

**HOLD / full structural integrity gate: FAIL.** The local architecture and checks pass, but this branch is not ready for release. Public probes still show 20 missing vote targets and two missing RPCs. Supabase MCP tools are absent from this session, and the CLI reports `LegacyPlatformAuthRequiredError`. Hosted migration history, actual schema/RLS definitions, valid moderation flows and Security/Performance Advisors remain unverified. No hosted schema changes, push, merge, tag or release were made.

This verification started from clean commit `b06432f` on the already-existing `refactor/structural-integrity-overhaul` branch. It inspected and extended the earlier structural implementation rather than repeating the module split. New implementation checkpoints are `c52cf9a` (media/form integrity) and `cc796c7` (secret scanning). The earlier implementation record is preserved below.

### Current baseline

Before further edits, `npm run check` passed 105 tests, the browser suite passed 61 product plus 23 failure checks, and migration reproduction passed 72 fresh plus 72 legacy checks. Live reversible voting passed and its QA votes were removed. The live backend capability check failed for the same target/RPC gaps listed below. Baseline screenshots, a 100-article rendering snapshot, regression probes and Lighthouse are retained in `output/structural/recheck/baseline/`.

GitHub metadata was refreshed: the latest published prerelease remains `v0.1.0-beta.1` at commit `3fb1451f1b2782f13d493821fbe44f6078eda4af`; the latest successful legacy Pages build remains `75c2e82a4aaa3b1c475168eb5eac605990e3ee8c`, sourced from `main` on September 2. The public site returned HTTP 200 and was inspected in Chromium. Its deployed content/design precede this branch. The configured Supabase project remains `olmazjfubvpgtpoxlxzy`.

| Measurement | This review's starting state (`b06432f`) | Current implementation (`cc796c7`) |
| --- | --- | --- |
| First-party JavaScript | 20 ES modules + prepaint script | 20 ES modules + prepaint script |
| Largest first-party file | `js/ui/home.js`, 520 lines | Unchanged; Home/search/filter presentation |
| Unit tests | 105 | 108 |
| Browser product / failure checks | 61 / 23 | 61 / 32 |
| Database checks | 72 fresh + 72 legacy | 72 fresh + 72 legacy |
| SQL migrations | 11 | 11, unchanged during this review |
| Canonical terms | 100 | 100, byte-for-byte unchanged |
| npm dependencies | 0 runtime / 3 direct development / 17 installed packages | Unchanged |
| CSS | 41,957 bytes | Byte-for-byte unchanged |

The three net additional unit tests reflect five new tests and removal of two tests for an unused media helper. Actual browser coverage now verifies every published media placement, plus the newly identified failure cases.

### Findings fixed in the follow-up review

| Priority | Reproduced defect | Correction and evidence |
| --- | --- | --- |
| P1 | The pending form guard ended before asynchronous clipboard fallback. A delayed clipboard permission permitted two concurrent proposal requests; reports shared the same defect. | The guard covers the complete request/copy action and clears in `finally`. Browser tests cover duplicate dispatch, close/reopen, delayed completion and preservation of the new form for both queues. |
| P1 | The renderer treated `MCSRINLINEMEDIA0MARKER` prose as an internal marker and discarded it. A valid media token inside Markdown could pass validation yet render no media. | The pure media pipeline splits text/media blocks before parsing. Each text block uses the existing sanitizer, and media uses DOM APIs. No text placeholders remain. All 100 existing articles preserve text, element order and media count. |
| P1 | Historical secret scanning excluded some text file extensions, and its loopback exception also matched remote hostnames beginning with `localhost` or `127.0.0.1`. | Scan every historical text blob and require an exact loopback hostname. Tests cover short remote passwords, lookalike hostnames, privileged JWTs and redacted findings. No credentials were found. |
| P1 — open | Hosted capabilities do not cover the branch's content/backend contract. | Keep both capability flags disabled and retain the release hold until authenticated reconciliation and verification are possible. |

No new local P0 or known local data-corruption path was identified. Hosted security cannot be certified without authenticated inspection.

### Final architecture, invariants and contracts

The module/state map in [ARCHITECTURE.md](ARCHITECTURE.md) was reread after the changes. Startup still composes one immutable content snapshot, a router, isolated Home/page/modal controllers and narrow backend services. Search/filter/routing/media analysis are pure operations. There are no circular imports or new application globals. Voting owns confirmed state, pending writes, stale-read guards and uncertain outcomes independently of article mounts.

[DATA_CONTRACT.md](DATA_CONTRACT.md) now explicitly describes media tokens as independent Markdown block boundaries. The runtime and validator retain one content contract, UUID/route/alias/relation integrity and controlled taxonomy. The defensive renderer fallback is distinguished from the loader's rejection of malformed datasets. No researched definitions, statuses, dates, IDs or media records changed.

[SUPABASE.md](SUPABASE.md) remains the RPC, authorization, errors, idempotency and concurrency contract. The 11 migration files reproduce the application schema from both a fresh PostgreSQL 17 database and legacy prototype history. Atomic vote transitions, deferred aggregate/receipt consistency, queue constraints, private moderation, denied public table access and cleanup pass locally. A local replay does not prove remote history parity or the managed Supabase platform.

### Tests, failures, fresh clone and CI

| Check | Current result |
| --- | --- |
| Content / deterministic / static checks | PASS: 100 terms, 100 unique UUIDs/routes, 20 media items, resolved relations; 108/108 unit tests; 20 reachable acyclic modules; project-relative paths and CSP checks. |
| Browser automation | PASS: 61 product + 32 failure checks, 90 layouts, 36 axe scans, zero violations or unexpected host errors. |
| Database reproduction | PASS: 144/144 checks; fresh and legacy paths replay all 11 migrations and drop their disposable databases. |
| Live voting | PASS: all reversible transitions, idempotency, concurrent clients, rapid conflicting writes, malformed/unknown inputs and verified QA vote removal. |
| Live backend capability / denial probes | FAIL overall: 16 direct-table operations denied (401), but 20 target IDs and the trending/correction RPCs are absent. No valid moderation records were inserted. |
| Secret scan | PASS: current tree and all 244 historical text blobs at `cc796c7`; output contains types/locations only. |
| Real-service browser smoke | PASS: Home, Bastion, Triangulation, Nether Travel, Stats, Changelog and About; real media loaded, with no application exceptions, failed local requests, failed external responses or host CSP violations in that run. |
| CI commands | PASS locally from the clean checkout. The new branch commits were not pushed, so no hosted Actions run is claimed. Linux browser/system-package installation was not executed on Windows. |

The failure suite covers missing/broken/invalid content, invalid routes, unavailable or malformed backend responses, unavailable release notes, blocked/corrupt storage, sanitizer payloads, stale voting reads/results, duplicate writes, reopened dialogs and delayed clipboard completion. Pure tests cover timeouts during body consumption, cancellation, ranking, normalization, route collisions, malformed receipts and contribution validation.

Fresh clone: `git clone --no-local --branch refactor/structural-integrity-overhaul . output/structural/recheck/fresh-clone` at `cc796c7`. It began with no `node_modules`. The documented `npm ci`, `npm run check`, `npx playwright install chromium`, `npm run test-browser`, `npm run test-database` with the documented local PostgreSQL connection, history secret scan and `npm start` all succeeded. Installation added 17 packages and reported zero dependency vulnerabilities. The clone served `/mcsr-glossary/` on the documented default port and retained a clean worktree. Logs are `output/structural/recheck/fresh-*.txt`; its browser/database evidence is inside the clone's ignored output directory.

### Accessibility, performance and visual preservation

Lighthouse 12.8.2 on the local gzip-enabled Home page: **mobile Performance 99, desktop Performance 100, Accessibility 100, Best Practices 100, SEO 100**. The newly measured mobile baseline was also 99/100/100/100. These are application Home scores, not a guarantee about third-party player internals. Node 22.11.0, Playwright 1.58.2 / Chromium 145, axe-core 4.13.0 and PostgreSQL 17.11 were used.

Both themes passed 1440×900, 1024×768, 768×1024, 390×844 and 360×800 layout checks. Keyboard suggestions, route focus, modal traps/restoration, vote `aria-pressed`, live regions, skip link and reduced motion remained working. Screenshots reviewed included the public/local baseline Home; desktop Bastion; mobile Triangulation, Bastion and light Home; and the light report dialog. Baseline/current comparisons retained the approved design. All 100 rendered definitions were also compared programmatically, independently of screenshot differences from transient interaction states.

Artifacts: `output/structural/recheck/lighthouse-{mobile,desktop}.json`, `definition-parity.json`, `live-voting.txt`, `live-browser.json`, `real-media.png`, and the baseline directory. The primary browser captures and report are under `output/structural/final/`; the fresh clone has its own independent captures.

### Security and remaining release gates

The CSP, public configuration, sanitizer allowlist, RLS migrations and backend behavior were preserved. Vendored Marked 17.0.1 and DOMPurify 3.4.14 were checked against their maintainers' [Marked advisories](https://github.com/markedjs/marked/security/advisories) and [DOMPurify advisories](https://github.com/cure53/DOMPurify/security/advisories); the published affected ranges inspected did not include these versions. This is separate from the missing Supabase advisor evidence and from the pattern-based credential scan.

- **Hosted migration parity / RLS / advisors: unverified, release gate FAIL.** MCP tools remain unavailable; CLI authentication is absent. Security and Performance Advisor finding counts are unknown, not zero.
- **Known hosted gaps:** 80 live voting targets versus 100 branch terms; `get_glossary_trending_terms` and `submit_glossary_correction` return 404 / `PGRST202`. The exact missing term list is retained in the earlier record below and in the current live-backend artifact.
- **Hosted valid moderation tests:** pending authenticated access and targeted cleanup. Local valid/rejection/concurrency tests passed; public denial probes do not establish the full hosted schema contract.
- **Fresh Supabase platform:** application migrations reproduce locally; the full CLI/Docker stack was not launched because the Docker Linux engine was unavailable. Hosted API settings/version/history remain to be inspected.
- **Deployment/CI:** the existing public site is healthy, but these local commits have not been published or run by hosted Actions.

Second architecture review: **YES**. The new media/form failures were reproduced before fixing them, contracts were updated, dead placeholder functions and the unused media-presentation helper were removed, and clean-checkout verification followed. No framework, runtime dependency, build system, new abstraction layer or database mutation was introduced in this follow-up.

Release recommendation: finish the authenticated checks in [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md), reconcile the missing target/RPC migrations safely, verify hosted moderation and cleanup, then rerun the live gates. The full overhaul remains **FAIL / HOLD** until those required conditions are demonstrated.

---

## Earlier implementation record — September 6, 2026

The remainder preserves the original implementation baseline and its evidence at `b06432f`. Its 105-test totals are historical; the current results above supersede them.

**Release recommendation: HOLD.** Local implementation and all critical local checks pass. The full structural-integrity release gate is **FAIL** because hosted migration parity, catalog/RLS verification and Security/Performance Advisors could not be completed. Public probes also demonstrate missing backend capabilities. No hosted schema changes, push, merge commit, tag or release were made.

Work branch: `refactor/structural-integrity-overhaul`. Implementation/test commits: `d2939e3`, `4b4451d`, `b7c732e`, `96be060`. The report is committed separately so the tested implementation remains identifiable.

## Baseline

- Clean starting commit: `2a12b72`, on the intended design development branch `design/full-visual-overhaul`; `main` was not modified.
- Repository: `SirInfinite/mcsr-glossary`, origin `https://github.com/SirInfinite/mcsr-glossary.git`.
- Current published prerelease: `v0.1.0-beta.1`, resolving to `3fb1451f1b2782f13d493821fbe44f6078eda4af`.
- Latest successful legacy Pages build/deployment: `75c2e82a4aaa3b1c475168eb5eac605990e3ee8c`, from `main`, September 2, 2026. The public URL returned 200 and was inspected in a browser. The deployed site predates this branch.
- Supabase public project ref: `olmazjfubvpgtpoxlxzy`. Authenticated MCP tools were absent and the CLI had no access token. Remote migration versions and current project PostgreSQL version remain unverified.
- Baseline validator and 59/59 unit tests passed. Existing browser product suite: 61/61 checks passed with isolated RPC fixtures. Existing live voting test passed, including concurrency, idempotency, invalid inputs and cleanup.
- Baseline desktop/mobile product views, term/media, discovery, themes, Stats, Changelog, About and moderation dialogs were inspected before refactoring. Screenshots are under `output/structural/baseline/`.

| Measurement | Starting state | Final implementation |
| --- | --- | --- |
| First-party files in `js/` | 6: 3 ES modules, 2 classic scripts, 1 Node helper | 21: 20 ES modules, 1 prepaint script; Node helper moved to scripts |
| Largest first-party JS file | `js/glossary.js`, 2,087 lines | `js/ui/home.js`, 520 lines |
| Unit tests | 59 | 105 |
| Browser product / failure checks | 61 / no separate suite | 61 / 23 |
| Database reproduction checks | No isolated replay suite | 72 fresh + 72 legacy |
| SQL migrations | 10 | 11 |
| Published terms | 100 | 100, unchanged |
| Direct npm runtime / development dependencies | 0 / 0 | 0 / 3 |
| Installed dependency packages | 0 | 17 development-only packages |
| CSS size | Approved visual-overhaul stylesheet | 41,957 bytes; design preserved |

Vendored Marked and DOMPurify are excluded from first-party module counts and retained. Node 22.11.0, Playwright 1.58.2 / Chromium 145, axe-core 4.13.0, pg 8.23.0 and local PostgreSQL 17.11 were used. Lighthouse was pinned to 12.8.2. Supabase CLI configuration was generated and parsed by 2.116.0.

## Risk disposition and architectural changes

No P0 defect remains identified in the reviewed local implementation. This is not certification of the inaccessible hosted schema.

| Priority | Finding | Final disposition |
| --- | --- | --- |
| P1 | A 2,087-line module mixed routing, data, DOM, networking and mutable state. | Explicit composition, content/core/backend/UI boundaries; acyclic import checks. |
| P1 | Runtime and CLI accepted different content. | Shared pure validator, immutable loader and fail-closed error state. |
| P1 | Reopening an article could lose its in-flight vote guard; old reads could replace newer state. | Service-owned per-term writes, revision checks, generation-checked rendering, confirmed-only cache. |
| P1 | Deadlines ended at HTTP headers. | Request boundary covers body consumption, cancellation and typed errors; no automatic mutation retries. |
| P1 | Old modal completions/timers could mutate a reopened form. | Pending guards and generation checks; consolidated focus handling. |
| P1 | Legacy votes lacked receipts and corrections relied on implicit tags. | Additive migration preserves explicit legacy baselines, enforces reconciliation, and models correction kind/target. Released RPC compatibility is retained. |
| P1 | Hosted target/capability coverage differs from repository expectations. | **Open release blocker.** 20 missing targets and two missing RPCs confirmed; migration history/advisors need authenticated access. |
| P1 | QA depended on implicit tooling, a folder name and an undocumented local setup. | Exact development pins, lockfile, Node subpath server, matching CI, checked-in Supabase configuration and disposable database reproduction. |
| P2 | Invalid routes silently fell back to Home, repeated changelog requests and dead assets/CSS aliases. | Useful route recovery, shared bounded changelog request, verified dead artifacts removed. |

The final module map, startup diagram, state ownership and full invariant list are in [ARCHITECTURE.md](ARCHITECTURE.md). The largest module owns only Home rendering, search suggestions, filter/index state and discovery; ranking/filtering logic is pure and separate. There is no framework, build step, event bus, class hierarchy, database abstraction layer or application server.

## Invariants and data contract

- Unique lowercase UUIDs, case-insensitive names/aliases and collision-free canonical/legacy/UUID routes. Every relation resolves. Dates, categories, statuses and `needsUpdating` satisfy one shared contract.
- Published records are validated, cloned and frozen. The same validator runs in the browser and CLI; the CLI additionally checks migration target coverage. Search ranking and route resolution are deterministic pure functions.
- Structured media appears once at a validated inline slot. Providers, IDs, HTTPS/local URLs, credentials, ports, dimensions and alt text are checked before DOM construction. Markdown crosses one DOMPurify boundary.
- The database enforces one receipt per term/browser hash, atomic target states `-1/0/1`, and totals equal to preserved historical baseline plus current receipts.
- Pending proposals/reports remain private, cannot publish static content, and expose no public approval/update/delete path. Corrections have an explicit target FK.
- Optional services, corrupt/blocked storage, stale responses and cancelled requests cannot overwrite unrelated views or enable writes from unconfirmed cache data.

[DATA_CONTRACT.md](DATA_CONTRACT.md) describes contract version 4 and optional `legacySlugs`. `data/terms.json` is byte-for-byte unchanged from the baseline; no researched definitions, status classifications or IDs were rewritten.

## Backend contract, RLS and migrations

[SUPABASE.md](SUPABASE.md) documents every RPC's input/output, authorization, errors, concurrency and idempotency. `backend/client.js` is the only Supabase HTTP adapter. Public configuration accepts only browser-safe credentials; no privileged credential was introduced.

All eleven application migrations replay successfully on isolated PostgreSQL 17 in both fresh and prototype-history scenarios. The original ten files are unchanged. The new `20260906091519_enforce_structural_integrity.sql` adds the complete target identity registry, nonnegative legacy baselines, deferred reconciliation constraints, explicit corrections and stricter moderation validation. Existing rows are retained. Negative legacy differences or unresolvable historical corrections abort safely for review.

The local `supabase/config.toml` exposes only public, uses explicit grants, enables migrations and disables a separate seed file. CLI parsing succeeded; a full Docker-based Supabase stack was not started because no Docker engine was available. The native PostgreSQL application-schema replay passed independently. Managed Auth/Storage/Realtime are outside that reproduction and are unused by this app.

Local authorization checks confirm RLS on all application/retained prototype tables, denied direct anonymous/authenticated CRUD, narrow RPC grants, private privileged helpers with empty search paths, and no anonymous access to internal insertion helpers. Actual public API probes also received denial for all 16 table/verb combinations. Hosted policies, grants, function definitions and migration versions were not accessible; those gates remain unverified.

Security Advisors: **not run — authenticated Supabase MCP unavailable**. Performance Advisors: **not run — same limitation**. No zero-findings claim is made. `supabase/audit.sql` contains the prepared read-only catalog/consistency audit.

### Confirmed hosted gaps

1. Only 80 of 100 published term UUIDs have live voting targets.
2. `get_glossary_trending_terms` returns 404 / PGRST202.
3. `submit_glossary_correction` returns 404 / PGRST202.

Missing targets: All Advancements, Axis Calculated, Blaze TNT, Boat Eye, Completable Ruined Portal, Donkey Kong Route, Double Travel, Nether Exit, No F3, No Reset, PaceMan, Pearl Hanging, Perfect Travel, Pie-Ray, Preemptive Navigation, Reset Efficiency, Seedbank, SSG, Wall and ZSG.

`trendingEnabled` and `structuredCorrectionsEnabled` remain false. Missing-target voting is disabled with an explanatory state; released correction-compatible submissions remain available. Public probes do not prove which migration versions were applied. Compare history and actual definitions before applying any reviewed pending migration.

## Tests and failure modes

| Check | Result | Evidence / scope |
| --- | --- | --- |
| `npm run check` | PASS | 100-term validator, 105/105 tests, static/import/path/CSP/migration checks and secret scan. |
| Product browser suite | PASS, 61/61 | Original flows preserved: search/filters/random, routes/reload/history, related/media/actions, all vote transitions, three forms, Stats/Changelog/themes. |
| Browser failure suite | PASS, 23/23 | Content failures, unavailable services, storage denial, malformed responses, sanitation and stale async actions. |
| Responsive audit | PASS, 90 layouts | Both themes at all five required dimensions, six views and three dialogs. |
| axe audit | PASS, 36 scans | No violations, both themes at desktop/mobile widths. |
| `npm run test-database` | PASS, 144/144 | 72 checks each for fresh/legacy replay, including actual concurrent SQL clients and RLS-denied operations. |
| `npm run test-live-voting` | PASS | Real public RPC transitions, conflicting clients, idempotency, invalid values/UUID/targets, verified vote cleanup. |
| `npm run test-live-backend` | FAIL release gate | All 16 access denials pass; three capability/target gaps remain. No valid moderation records created. |
| Current/history secret scan | PASS | No privileged-key, token, password-URL or tracked historical environment-file findings; values never printed. |
| `git diff --check` | PASS | No whitespace errors. |

Failure coverage includes missing terms JSON, invalid JSON/schema, ambiguous routes, malformed UUIDs, unsafe URLs/media, malicious Markdown/HTML (scripts, handlers, javascript links, SVG/iframe/style payloads), blocked/corrupt storage, disabled configuration, unavailable Supabase, unavailable local changelog, malformed vote/moderation receipts, HTTP rejection, body timeout and cancellation. GitHub API failure is eliminated as a runtime dependency: Changelog uses committed Markdown and a safe external fallback link.

Repeated clicks, navigating away/back to a pending vote, stale vote reads, uncertain write outcomes and closed/reopened form responses/timers are exercised. Database failures cover invalid/oversized proposals, invalid categories/lists, spoofed report targets, unauthorized reads/writes, duplicate/raced submissions, conflicting/simultaneous votes and deliberately inconsistent maintenance writes. Test databases and QA votes were cleaned up. Valid production moderation rows were not submitted because privileged targeted cleanup/verification was unavailable.

## Fresh clone and CI

A clean local clone of this branch was created with `git clone --no-local` at `output/structural/fresh-clone`, initially at `4b4451d`. Its directory name intentionally differs from the project name. Only tracked files were present; it had no prior node_modules or generated inputs.

The documented `npm ci`, `npm run check`, `npx playwright install chromium`, `npm run test-browser`, `npm run test-database` with a documented local PostgreSQL connection, and `npm start` all succeeded. The fresh clone repeated 103 unit tests, 84 browser checks, 90 layouts and both 72-check database scenarios. Default `/mcsr-glossary/` serving worked. Installation reported zero dependency vulnerabilities.

The clone was subsequently updated to `96be060` for final CLI-configuration/audit-tooling and additional failure tests; `npm run check` passed all 105 tests plus static/secret checks, history scanning passed, and its worktree stayed clean. No frontend runtime, dependency, content or migration changes followed the full fresh-clone run. The final report is documentation-only.

The single GitHub Actions job runs the same npm commands with Node 22, pinned Chromium tooling and PostgreSQL 17. Linux additionally installs browser system dependencies through the documented Playwright flag. Local CI-equivalent checks pass; a hosted run of this branch was not triggered because it was not pushed. No deployment workflow was added.

## Performance, accessibility, console and path safety

| Lighthouse Home audit | Mobile | Desktop |
| --- | --- | --- |
| Performance | 99 | 100 |
| Accessibility | 100 | 100 |
| Best Practices | 100 | 100 |
| SEO | 100 | 100 |
| Cumulative layout shift | 0 | 0 |

Measurements used Lighthouse 12.8.2 against the local gzip/cache-enabled project-subpath server. Scores remain at the prior visual-overhaul level. These are Home lab results, not production field metrics or scores for every third-party player. Keyboard behavior, modal traps/restore, live regions, ARIA states, reduced motion and semantic landmarks also passed browser checks.

Viewports: **1440×900, 1024×768, 768×1024, 390×844, 360×800**. No horizontal overflow or application exceptions, unexpected console/CSP errors, or missing local assets were observed. Direct routes/reload/back/forward and relative imports/data/fonts/images/favicon worked under `/mcsr-glossary/`.

A separate real YouTube check from the fresh clone confirmed automatic trusted-player loading, no autoplay, no application errors/diagnostics and no failed local requests. Browser regression tests use service/player fixtures to remain deterministic; provider-owned internals are not an application guarantee.

## Screenshots reviewed and second architecture review

Baseline review: dark desktop Home and Triangulation, dark/light mobile Home and the public mobile site. Final visual spot-checks: dark desktop Home and media article, light mobile term and report dialog, plus the real-player screen. Full automated captures include dark/light Home, term, media, Stats, Changelog and About at 1440/390/360 widths, plus submit/edit/report dialogs at 1440/390 widths. The approved visual design, reading width, theme palette and controls remain intact.

The second architecture review is **complete**. It removed Home's dependency on the Term controller for link handling, consolidated modal focus code, retained alias spelling during normalization, tightened UUID/media-port constraints, refreshed public SQL wrappers after private-helper renames, removed obsolete storage/global configuration paths and added explicit fresh-project CLI settings. Targeted checks and fresh-clone QA cover the resulting boundaries.

Artifact paths (ignored locally; CI uploads its generated evidence):

- `output/structural/baseline/` — baseline captures and logs.
- `output/structural/final/browser.json` and theme/view screenshots — product, failure, responsive and axe results.
- `output/structural/final/database-fresh.json`, `database-legacy.json` — complete migration/check records.
- `output/structural/final/live-backend.json` — real public denial checks and missing capabilities.
- `output/structural/final/lighthouse-mobile.json`, `lighthouse-desktop.json` — Lighthouse results.
- `output/structural/final/real-media.json`, `real-media.png` — actual player check.
- `output/structural/fresh-clone-*.txt` and `fresh-clone/output/structural/final/` — clean-checkout evidence.

## Dead artifacts removed

The old monolith/core/global-configuration entrypoints were replaced; the UUID maintenance script moved out of browser JS. The Python-only QA server and old flat test entrypoints were replaced by documented Node tooling and responsibility-based suites. Unreferenced button textures, old theme icons/dark-logo variants, two unused italic fonts and dead CSS compatibility aliases were removed. Existing vendor libraries, active media/logo assets and historical research/QA documentation remain.

## Known limitations and release recommendation

- **Hosted audit remains required:** migration parity, actual schema/RLS/grants, aggregate reconciliation, advisors, valid moderation tests and privileged QA cleanup could not be verified through Supabase MCP. No production database mutation was attempted to bypass that missing access.
- **Known deployment gaps:** 20 missing vote targets and two unavailable RPCs. The additive migration is locally tested but unapplied to the hosted project.
- Browser UUIDs are weak, replaceable identity. Hashing and per-browser cooldowns are not authentication or strong anti-abuse controls; this is accurately documented.
- Full managed Supabase/Docker reproduction and a hosted CI run remain unperformed. Application migrations were reproduced on real local PostgreSQL with representative roles and legacy history.
- Local Lighthouse/axe/browser success does not establish production deployment success or third-party service availability.

**Do not release this branch yet.** Use [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) to finish authenticated hosted inspection, review/apply pending migrations safely, verify parity/advisors and QA cleanup, and obtain a passing hosted CI result. Local architectural implementation: **PASS**. Full user-defined structural integrity overhaul release gate: **FAIL / HOLD** until those outstanding requirements have evidence.
