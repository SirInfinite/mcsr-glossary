# Final release audit

**FINAL RELEASE AUDIT: FAIL. RELEASE READY: NO.**

The static application passes the local gates. The hosted backend is not ready for this candidate, and authenticated hosted security verification remains unavailable. Do not merge, tag, deploy or publish on the strength of this report.

## Candidate and scope

| Field | Recorded value |
| --- | --- |
| Date | 2026-09-07; evidence finalized after 18:41 UTC |
| Candidate commit | `8b30a2ee660062dc9b0c7eec222b2a1eaf70a979` |
| Branch | `qa/final-release-audit` |
| Starting candidate | `bd9e61973490590f1a2e0324aaea5359f742c4b6`, clean `docs/moderation-procedure` |
| Regression-test commit | `dffcab24caffe4b8bb69a900a816c6ab78a1e424` |
| Fetched `origin/main` | `75c2e82a4aaa3b1c475168eb5eac605990e3ee8c` |
| Remote | `https://github.com/SirInfinite/mcsr-glossary.git` |
| Latest release/tag | `v0.1.0-beta.1`, prerelease published 2026-09-02; tag resolves to `ee4492063d796a2de50bca01bd57da82249fe4fb` |
| Deployed commit | `75c2e82a4aaa3b1c475168eb5eac605990e3ee8c`; GitHub deployment `6232674114`, successful 2026-09-02 |
| Publication state | Candidate is local and unpublished; 32 commits ahead of fetched main, with no remote-only commits |
| Dataset | 100 terms: 91 current, 8 legacy, 1 historical; no `needsUpdating: true` records |
| Media | 25 items on 24 terms: 23 YouTube embeds and 2 original SVG diagrams |
| Tools | Node 22.11.0; npm 11.13.0; Playwright 1.58.2; axe 4.13.0; PostgreSQL 17; Lighthouse 12.8.2; installed Chrome 151 for live playback/Lighthouse |

`git status`, branch, ten-commit log, remotes, `git fetch origin`, and post-fetch status were checked before tests. No unrelated uncommitted work was present. The audit added regression tests and removed one unrelated provenance link. Application JavaScript, HTML, CSS, published JSON, dependencies and migrations are byte-identical to the starting candidate. Browser/Lighthouse evidence remains applicable after the provenance-only commit; content and full local checks were repeated on the candidate. The commit adding this report is an evidence-only descendant, not a deployment.

Local evidence is under `output/release-audit/`, which is intentionally ignored by Git. `candidate.json` contains application/data hashes; logs, JSON results and screenshots remain available in this workspace. The checked-in tests and the procedure below reproduce the automated gates without those artifacts.

## Severity and defect totals

P0: corruption, exploitable security/privacy failure, broken core deployment/content/navigation. P1: important feature/correctness failure or an existing critical release check failing. P2: a demonstrated minor issue that does not block use of this exact published dataset. Lack of authenticated evidence is recorded as an unsatisfied gate, not invented evidence of a security vulnerability.

| Severity | Found | Fixed | Remaining |
| --- | ---: | ---: | ---: |
| P0 | 0 observed | 0 | 0 known within verified scope |
| P1 | 2 | 0 | **2** |
| P2 | 4 | 1 | 3 |

### Unresolved P1 defects

| ID | Reproduction and impact | Cause / required fix | Verification |
| --- | --- | --- | --- |
| REL-001 | Run `npm run test-live-backend`, or open `?t=axis-calculated` / `?t=no-reset` against the real backend. Voting is unavailable on 20 of the candidate's 100 terms. | Hosted vote-target registry does not cover canonical content. Inspect actual migration history and schema, reconcile existing data safely, then apply the reviewed missing migrations. Do not fabricate totals or enable unavailable voting in the UI. | Public RPC inventory and real-browser screenshots reproduce it. Local fresh/legacy migration tests seed all 100 correctly. **Not fixed remotely.** |
| REL-002 | `get_glossary_trending_terms` and `submit_glossary_correction` return HTTP 404 / `PGRST202`. The existing live-backend gate fails. | Required backend capabilities are absent. Establish migration parity and verify the new RPC contracts before enabling their configuration flags. | Both endpoints were probed again without inserting valid moderation data. Flags remain disabled; the released edit compatibility path remains in use. **Not fixed remotely.** |

Missing targets: All Advancements, Axis Calculated, Blaze TNT, Boat Eye, Completable Ruined Portal, Donkey Kong Route, Double Travel, Nether Exit, No F3, No Reset, PaceMan, Pearl Hanging, Perfect Travel, Pie-Ray, Preemptive Navigation, Reset Efficiency, Seedbank, SSG, Wall, ZSG.

### Unsatisfied hosted gates

**GATE-001:** No Supabase MCP tools are exposed in this session. The CLI has no authenticated access token. Project listing and both advisor commands report authentication unavailable. Authenticated catalog inspection, all-role RLS verification, remote migration-history comparison, schema-drift inspection, queue cleanup inspection and advisor results cannot be certified. Access was requested while independent tests continued.

Valid hosted submission/edit/report round trips were not created because there is no authenticated cleanup/inspection path. Public denial probes and local transactional database tests do not substitute for this gate. No production migration, credential setting or capability flag was changed.

### P2 findings

| ID | State | Finding / rationale |
| --- | --- | --- |
| REL-101 | Remaining | Lighthouse Best Practices 96: a Cookie inspector issue originates inside `youtube-nocookie.com`. Players work; no application CSP error or functional failure was observed. |
| REL-102 | Remaining | Magma Ravine's reference to “later world-generation versions” lacks a precise version boundary. Its scoped 1.16.1 technique is supported; clarify the later-version wording in a focused content review. |
| REL-103 | Fixed | Hypermodern's auxiliary historical source `reddit.com/.../1mqrx03/` was an unrelated subcategory meme. Removed it and recorded why in `CONTENT_SOURCES.md`. The other sources support the core definition. Validator/content tests passed afterward. |
| REL-104 | Remaining, dormant | GIF rendering has no pause/reduced-motion replacement control. There are no published GIFs, so no current animated-content regression exists. Add motion controls and review real animation before publishing a GIF. The static GIF decoding fixture does not certify animated accessibility. |

No defect was lowered in severity to obtain a pass. The release is blocked regardless of the local scores.

## Automated checks and CI

All existing checks ran before edits. The expanded browser suite was then run in the working checkout and a clean local clone.

| Command / suite | Result |
| --- | --- |
| `npm ci` | PASS; pinned tools installed, audit reported zero dependency vulnerabilities |
| `npm run check` | PASS: validator, 111 unit tests, static checks, secret scan |
| `npm run check-content` | PASS: validator and existing content/UI-core test groups |
| `npx playwright install --with-deps chromium` | PASS on this Windows host |
| `npm run test-browser` | PASS: 67 product + 32 failure + 13 media + 227 release checks = **339** functional checks |
| Browser visual/axe suite | PASS: **224** layouts, **64** axe scans, zero recorded violations |
| `npm run test-database` | PASS: **144** checks, fresh and legacy replays of all **11** migrations |
| `npm run test-live-voting` | PASS on an existing hosted target; transitions/concurrency/idempotency/rejections/cleanup |
| `npm run test-live-backend` | **FAIL**: missing 20 targets and two RPCs; direct-access denials passed 16/16 |
| `node scripts/scan-secrets.mjs --history` | PASS; no privileged credentials in current tracked files or scanned history |
| `git diff --check` | PASS |

**594/594 local functional checks passed** (111 unit + 339 browser + 144 database), separately from layout/accessibility checks. Repeated runs of the same tests are not counted as new tests. Live voting is a separate scenario suite; the live-backend command remains failing.

The commands match `.github/workflows/validate-content.yml`. PostgreSQL uses a loopback-only test connection, not production. Fresh-clone `npm ci`, `npm run check`, browser suite and database suite passed; the clone was advanced to the provenance-only candidate and checked again. No hidden runtime files or previous `node_modules` were needed. Browser binaries and a PostgreSQL 17 server are the documented development prerequisites. No hosted Actions run exists for this unpublished candidate; Linux-hosted CI remains to be observed after an authorized push.

Disposable databases were removed: the local catalog reported zero `mcsr_integrity_%` databases afterward. The PostgreSQL server started by this audit was stopped. Hosted vote tests restored their target baseline through the public neutral-vote operation. No valid hosted moderation rows were created.

## Viewports, themes and accessibility

Tested **1440×900, 1280×720, 1024×768, 768×1024, 430×932, 390×844, 360×800** in both themes. All normal pages, discovery states and three modal kinds were checked at every size. All 100 UUID term routes were additionally opened at 390×844. No horizontal overflow was detected. Tablet 820×1180 was optional and was not added to the matrix.

Desktop / tablet / phone: **PASS locally**. Light / dark: **PASS**. Theme persistence, invalid stored themes, storage failure, focus indicators, utility expansion without heading reflow, metadata wrapping and media geometry passed. The small-screen modal screenshots keep the primary action reachable.

Lighthouse Accessibility: **100 mobile / 100 desktop**. Axe: zero violations in 64 scans. Keyboard checks cover search selection/Enter/Escape/slash, navigation focus, `aria-current`, `aria-expanded`, voting `aria-pressed`, solid selected icons, shared modal traps, Escape and focus restoration, image/GIF lightbox restoration, and the skip link's `main-content` target. Reduced-motion UI behavior was exercised. This is Chromium automation and visual review, not a claim of a full screen-reader or physical-device certification.

## Core flows, routing, search and filters

Home, Stats, Changelog and About/Credits navigation passed with matching page state, active navigation and heading focus. Random selection, related links, utility actions and footer links worked. Footer GitHub, Contributing and Report Issue destinations each returned 200.

All 100 direct UUID routes resolved to the correct canonical term URL and rendered content. Slug routing/reload, invalid routes, supported legacy-slug/UUID normalization, page queries, copied project-subpath links and back/forward passed. Repeated search → term → Back → Forward retained the query and term identity; term → related → Back and navigation to supporting pages were covered. An empty-related-list fixture omitted the section without retaining stale links.

Search checks covered canonical exact/prefix, alias exact/prefix, substring, mixed case, punctuation, category, tags, definition text, nonexistent queries, clear/reset, filtered search, ranking and result announcements. No harmful ranking defect was found. Every visible category and all 76 tag options were compared with the dataset; any/all/none multi-tag matching, clear-all and A–Z were also checked. Filters are not persisted, so stale persisted-filter JSON is not an application state to migrate.

## Status terms

Historical **Forced Perch** and legacy entries including **Axis Calculated**, **Divine Travel** and **Hypermodern** remained labeled after direct navigation/reload. The historical Forced Perch wording agrees with the former Ranked timer, not the current system. Current entries omit a redundant Current badge.

No published record has `needsUpdating: true`. Controlled valid-content fixtures verified the badge, explanatory text, direct reload and combined Legacy/Needs Updating display, including light 360px and dark desktop screenshots. These screenshots do not claim that the underlying published term is flagged.

The full route sweep includes the short PB/WR entries, long technical entries, the largest actual alias list (Ninjabrain Bot: three), the largest actual tag lists (four), media/no-media entries, and all status records. Empty relations were tested separately because every published record currently has relations.

## Voting

| Transition / invariant | Local UI/database | Hosted existing target |
| --- | --- | --- |
| Neutral → up; up → neutral | PASS | PASS |
| Neutral → down; down → neutral | PASS | PASS |
| Up → down; down → up | PASS | PASS |
| Same target repeated | PASS | PASS |
| Concurrent clients / conflicting writes | PASS | PASS |
| Rapid clicks / pending guard | PASS | PASS at RPC level |
| Failure rollback / stale response isolation | PASS with failures injected | Not simulated as a destructive production outage |
| Invalid UUID/vote/unknown target | PASS | PASS |
| Corrupt/missing browser storage | PASS | Client fixture |

Upvote icon fill/stroke is `#FF4400`; downvote is `#9293FE`. Selected icons are solid and controls expose pressed state. Keyboard transitions passed. The backend stays authoritative. **Overall hosted candidate voting: FAIL**, because 20 candidate terms cannot vote (REL-001).

## Submissions, edit suggestions and reports

New proposals, edits and reports passed local input/length/category/list/honeypot validation, success receipts, rejection, duplicate response, malformed response, unavailable service and unavailable clipboard paths. Failed delivery keeps the form and does not claim the queue received it. Clipboard fallbacks, slow responses, reopening forms, focus traps/restoration and stale-success timers have regression coverage.

The currently enabled edit path uses the released submission RPC with canonical name/category and the correction tag. A browser regression verifies that context. The separate structured correction RPC is locally tested but absent remotely; its flag remains off. Reports use their distinct private RPC/table and validated target/reason/details. Voting cannot approve content, and no form publishes directly.

**Local submissions/edit/report integrity: PASS. Hosted acceptance gates: FAIL / unverified.** Local PostgreSQL tests prove pending-row privacy and malformed/oversized/duplicate/target constraints on reproduced migrations. Live anonymous direct reads/writes are denied. Valid hosted moderation storage and cleanup require authenticated access and have not been certified.

## Media

All 23 published YouTube embeds were opened and played in installed Chrome at their configured starts; three were additionally played at phone width. Actual decoded-frame callbacks were used, not just iframe existence or HTTP status. Sources use `youtube-nocookie.com`, 16:9 geometry, descriptive titles and no autoplay. Independent source links remain available during deliberate provider failure. Trusted players initialize automatically on opening the term.

Both original SVGs have useful alt text, reserved dimensions, lazy decoding, preserved ratio and functioning keyboard lightboxes. A failed image becomes a source fallback. Triangulation's two media items remain between their corresponding paragraphs. Creator captions remain compact; real playback screenshots cover the seven media-backed source-audit terms, with Zero Cycle additionally inspected at 0:40 after the introductory transition.

| Type | Evidence / result |
| --- | --- |
| YouTube | PASS: 23 real embeds plus 3 phone playback checks; timestamp/privacy/no-autoplay/fallback fixtures |
| Images | PASS: both published SVGs; load, dimensions, alt, lightbox and failure checks |
| Twitch | No published clips. Parent uses the hosting hostname, autoplay is false, and fallback/title behavior passes fixtures. A real Twitch clip on the candidate's production deployment is **not verified**. |
| GIF | No published animations. Static GIF decoding, lazy loading, alt and lightbox fixtures pass; motion limitation REL-104 remains. |
| Native video | No published items. A locally generated silent WebM decodes/plays through the real renderer with native controls, reserved dimensions and no autoplay. |
| External link | No published items. Safe structured preview and meaningful accessible-name fixtures pass. |

No new dead published media source or broken YouTube player was found. Invalid providers, unsafe URLs, missing assets, unsupported fields and bad timestamps are covered by shared validation/security tests. No social SDK or arbitrary iframe HTML was introduced. No claim is made about real animation/Twitch/native-video content that is absent from this dataset.

## CSP, sanitization and secrets

**PASS locally.** The existing CSP is unchanged: local scripts/fonts; local and allowlisted images; Supabase connections; YouTube privacy-enhanced and Twitch frames; local native video; no objects; constrained base/form actions. Inline styles remain intentionally allowed by the existing static UI, while content-derived styles are stripped. Supabase's existing wildcard connection allowlist was not broadened.

Controlled scripts, event handlers, JavaScript links, SVG/MathML, iframe payloads, malformed nesting and CSS injections were neutralized at the shared Markdown/DOMPurify boundary. Media URL parsing is separate and allowlisted. No privileged credential was found in current tracked files or 296 historical blobs scanned before the provenance/report-only commits; the final current-tree scan was repeated.

Vendored DOMPurify **3.4.14** and Marked **17.0.1** were compared against their maintainers' published advisories. None of the listed affected version ranges includes these pinned versions. DOMPurify 3.4.15 has newer hardening, but no demonstrated candidate vulnerability requiring an audit-time dependency change was found. Sources: [DOMPurify advisories](https://github.com/cure53/DOMPurify/security/advisories), [Marked advisories](https://github.com/markedjs/marked/security/advisories).

## Supabase RLS, advisors and migration parity

Project: **`olmazjfubvpgtpoxlxzy`**. No keys are included in this report.

Local migration replay verifies RLS on application/public prototype tables, denied direct access for `anon` and `authenticated`, private receipts/queues, protected aggregate mutation, explicit RPC boundaries and private privileged functions with fixed empty search paths. Hosted public probes denied GET/POST/PATCH/DELETE on the four relevant application tables: **16/16**. Probes used empty invalid inserts or unknown UUID filters and did not enumerate private payloads.

**Hosted RLS gate: FAIL / not fully verified. Security advisors: unavailable. Performance advisors: unavailable. Migration parity: FAIL.** There are 11 repository migrations, but no authenticated remote history/catalog result. The missing targets/RPCs prove a contract mismatch; the exact pending history and any dashboard-only drift remain unknown. Public denial results do not establish catalog parity or zero advisor findings. No meaningful advisor finding can be counted or cleared without running the advisors.

## Content validation and 20-definition source audit

Validation passes all 100 terms: UUID/name/route uniqueness, alias collisions, five canonical categories, tags/status/date/boolean fields, relation resolution, media fields/allowlists/local files and migration seed coverage. Static checks pass for 20 reachable acyclic JavaScript modules, project-relative assets and 11 ordered migrations.

Selection was frozen before source inspection. Seed: `bd9e61973490590f1a2e0324aaea5359f742c4b6:final-release-source-audit`. Within each stratum, sort ascending hexadecimal `SHA256(seed + ':' + term.id)`, take without replacement, then continue: 1 historical, 3 legacy, up to 2 needs-updating (none exist), 4 from latest `creationDate` (2026-09-03), 4 media-backed, 3 common, then fill to 20 from the remaining dataset. Common pool: RSG, SSG, Any%, PB, WR, One Cycle, Bastion, Stronghold, Fortress, RNG, IGT, RTA, Nether Travel. This includes SSG from the newly added target cohort and obscure Axis Calculated/Divine Travel/Magma Ravine vocabulary.

All **135 distinct recorded source URLs** in the starting sample were requested: 118 HTTP 200, 17 HTTP 403 (Speedrun.com); no 404/410. Some Reddit 200 responses were challenge pages. These status counts are **not** content verification. Primary text, public document exports, actual media playback and web-readable source versions were then inspected; bot-protected references and web-cached evidence are explicitly limited. No CAPTCHA was bypassed. A source can support a term while an auxiliary reference is weak or blocked.

| Term | Final classification | Evidence reviewed and conclusion |
| --- | --- | --- |
| Forced Perch | PASS | [Ranked change](https://github.com/MCSR-Ranked/Wiki/commit/904a85feb9c490869d721d3bc7b5cf0dae7c6f4d) removes 2:50; API date is 2026-05-10. [Current RNG documentation](https://wiki.mcsrranked.com/gameplay/rng) supports the replacement roll behavior. |
| Axis Calculated | PASS | [Bluecat's recorded guide](https://docs.google.com/document/d/1oora0jzLf6IgydbGciE8-vL8JXsejqvAKm4N9jAfWVg/edit) exported/read; directions, two throws and sheet target agree. [Archived calculator documentation](https://github.com/Minecraft-Java-Edition-Speedrunning/archive-ninjabrain-bot) supports December 2021 legalization. |
| Divine Travel | PASS | [Creator demonstration](https://www.youtube.com/watch?v=SXem01c44-I&t=68s), [reference rules](https://www.speedrun.com/mc/news/4xo7gz62) and [Ranked seed independence](https://wiki.mcsrranked.com/gameplay/seed) support variants and scope. Historic run discussion corroborates 2021 usage; no “first” claim retained. |
| Hypermodern | PASS after minor provenance fix | [Metacor guide](https://github.com/Metacor/Minecraft-Speedrun-Guide) and [2021 usage discussion](https://www.reddit.com/r/MinecraftSpeedrun/comments/obr8r9/) support the route family and loose meaning. Unrelated auxiliary link removed (REL-103). |
| Perch | PASS | [Ranked RNG documentation](https://wiki.mcsrranked.com/gameplay/rng) and the recorded dragon explanation support the perch window and mode distinction; no fixed current timer is claimed. |
| Treasure Bastion | PASS | [MCSR Wiki route](https://www.youtube.com/watch?v=u4-KxRhNsUc&t=33s) inspected; [Metacor's pie-ray discussion](https://github.com/Metacor/Minecraft-Speedrun-Guide#pie-ray-aka-piedar) supports the spawner caveat. |
| SSG | PASS | [Primary rules](https://github.com/Minecraft-Java-Edition-Speedrunning/rules/blob/main/rules.typ), set-seed and Glitchless sections, support the acronym and distinction from general Set Seed. |
| Stables Bastion | PASS | [Mojang's four bastion types](https://www.minecraft.net/en-us/article/minecraft-snapshot-20w16a), [T_Wagz structure footage](https://www.youtube.com/watch?v=TioQsF5ygOg&t=161s), and route guide support names/layout and version context. |
| Fortress Navigation | PASS | [Lucas Chan demonstration](https://www.youtube.com/watch?v=swSbv4AImzI&t=87s) and [Metacor fortress section](https://github.com/Metacor/Minecraft-Speedrun-Guide#fortress) support internal piece reading, not locating the structure externally. |
| Zero Cycle | PASS | [MCSR Wiki / Doogile explanation](https://www.youtube.com/watch?v=CSdkCmZ69RI&t=29s), including actual tower/dragon footage, supports the initial-circling distinction and setup dependence. |
| Triangulation | PASS | [Calculator's primary explanation](https://github.com/Ninjabrain1/Ninjabrain-Bot), [manual eye tutorial](https://www.youtube.com/watch?v=8c29j0We2VQ&t=214s), and repository diagram agree. The one-eye caveat avoids overclaiming. |
| Ninjabrain Bot | PASS | [Primary README](https://github.com/Ninjabrain1/Ninjabrain-Bot) and [official community resources](https://www.minecraftspeedrunning.com/public-resources/tools-and-resources) support probabilistic confidence and 1.9+ scope. Recorded discussion supports NBB/Ninbot shorthand; old interface footage is labeled. |
| PB | PASS | [Recorded terminology discussion](https://www.reddit.com/r/speedrun/comments/11nmhtt/) supports completed-run personal best, distinct from best segments. Web-readable evidence was used where browser requests were challenged. |
| WR | PASS | [Primary category/rules document](https://github.com/Minecraft-Java-Edition-Speedrunning/rules/blob/main/rules.typ) and recorded board sources support category-specific recognition; no current record holder or time is asserted. |
| RSG | PASS | [Primary rules](https://github.com/Minecraft-Java-Edition-Speedrunning/rules/blob/main/rules.typ), B.1.1 and Glitchless sections, support the blank-seed requirement and ruleset scope. |
| Glitchless | PASS | [Rules D.1](https://github.com/Minecraft-Java-Edition-Speedrunning/rules/blob/main/rules.typ#L635-L699) explicitly permits listed cases and reserves borderline decisions to moderation. |
| Magma Ravine | MINOR ISSUE | [Metacor's ocean entry](https://github.com/Metacor/Minecraft-Speedrun-Guide) and [Ranked seed requirements](https://wiki.mcsrranked.com/gameplay/seed) support the 1.16.1 concept and Ocean Ravine alias. Later-version boundary wording remains imprecise (REL-102). |
| Village | PASS | [Metacor village route](https://github.com/Metacor/Minecraft-Speedrun-Guide) and [Ranked seed documentation](https://wiki.mcsrranked.com/gameplay/seed) support resources and conditional suitability; guarantees are not generalized to vanilla villages. |
| Filtered Seed | PASS | [Ranked's primary specification](https://wiki.mcsrranked.com/gameplay/seed) and [FSG Mod documentation](https://modrinth.com/mod/fsg-mod) support software selection and distinct filters. |
| Desert Temple | PASS | [Mojang's pyramid description](https://www.minecraft.net/en-us/article/desert-pyramid), recorded temple guidance and [Ranked filters](https://wiki.mcsrranked.com/gameplay/seed) distinguish vanilla trap/loot from match guarantees. |

Initial sample: 18 PASS, 2 minor issues, 0 P1 content issues. After removing the unrelated Hypermodern source: **19 PASS, 1 minor issue, 0 unresolved P1 content issues**. Canonical names, aliases, mode/version scope, status, attribution and strong claims were reviewed for every sampled term. This is a sample audit, not a new certification of every sentence in all 100 definitions. Bot-protected sources were not declared dead solely because automated access was denied.

## Lighthouse

Measured the actual local candidate at `/mcsr-glossary/?t=triangulation`, with original SVG and real YouTube iframe. No provider mocking or autoplay. Tests were not used to disable required media.

| Metric | Mobile | Desktop |
| --- | ---: | ---: |
| Performance | **98** | **100** |
| Accessibility | **100** | **100** |
| Best Practices | **96** | **96** |
| SEO | **100** | **100** |
| FCP | 1.2 s | 0.3 s |
| LCP | 2.2 s | 0.5 s |
| TBT | 70 ms | 0 ms |
| CLS | 0 | 0 |

The only failed binary audit is `inspector-issues`: a Cookie issue inside the YouTube iframe (REL-101). Scores are local lab measurements, not production field measurements or guarantees on every device. Source files: `lighthouse-mobile.json`, `lighthouse-desktop.json`.

## Console, network and failure modes

Normal local/mocked flows and real-backend browsing had zero recorded application exceptions, console errors, CSP violations or failed application requests. Real browsing checked search/media, four navigation pages, status pages, missing-target UI, both term dialogs, invalid submission and filters. The older deployed site's focused Home/term/Stats/Changelog/About smoke also returned 200 and had no recorded exceptions or failed requests.

**Normal-use application console/network: PASS in the tested flows. Backend capability probes: FAIL**, as documented above. Expected negative tests separately produce 400/409/503, malformed JSON/receipts, unavailable media or missing local assets; these are not hidden as normal-use failures. Browser third-party cookie inspector notices are recorded separately from JavaScript/CSP errors.

Failure coverage includes missing/invalid/schema-invalid `terms.json`, unavailable Supabase, malformed vote/moderation responses, local changelog unavailable, network/request deadlines, blocked/corrupted storage, clipboard failure, rapid overlapping actions, stale async completion and failed media. Independent pages remain usable after content failure; static browsing remains usable during Supabase failure. Changelog uses repository-local release notes, so GitHub API availability does not block it; the missing release-notes fixture verifies its source-link recovery.

## Screenshots reviewed

Representative fresh screenshots were inspected directly and in contact sheets. The complete seven-viewport/two-theme set is in `final-browser/`; the initial unchanged-layout captures are in `browser/`.

- Desktop: dark Home, open search, open filters, list, Bastion, Forced Perch, Stats and edit modal; light Triangulation, Home and Stats.
- Tablet: dark Home/submit at 768px, light Bastion at 768px; light Home/Stats and dark report at 1024px.
- Phone: dark Home 390px, list 360px, Triangulation 390px, submit 360px, Axis Calculated 360px; light Home 430px, Bastion/report 390px.
- Real media frames: Divine Travel, Treasure Bastion, Stables Bastion, Fortress Navigation, Zero Cycle, Triangulation and Ninjabrain Bot; Zero Cycle also at 0:40 on phone.
- Controlled Needs Updating fixture: dark 1440px and light 360px; real missing-target phone screenshot.
- Older production deployment: Home, Bastion, Stats, Changelog and About.

Contact sheets: `sheet-desktop.png`, `sheet-tablet.png`, `sheet-phone.png`, `sheet-played.png`. Detailed reviewed images include `needs-updating-fixture-light-360.png`, `zero-cycle-40-phone.png` and `missing-target-phone.png`. No new clipping, overflow, hidden metadata, oversized player or unreadable modal action was found. The visible heading outline in the status fixture is the intentional keyboard focus indicator.

## Known limitations and release recommendation

1. **Two confirmed P1 defects remain.** Hosted target/RPC mismatch must be resolved safely through authenticated migration review.
2. Hosted RLS/catalog parity, security/performance advisors and valid moderation storage/cleanup are unverified. Absence of access is not a clean advisor result.
3. Candidate is unpublished. The focused production smoke covers the older deployed commit only. After authorized publication, repeat direct routes, assets/CSP, live voting and moderation, real media and console/network checks before any release/tag.
4. Real Twitch/GIF/native-video content is not present; fixture scope and the dormant GIF motion issue are stated above.
5. Source access includes bot-protected sites and web-readable cached evidence; the remaining Magma Ravine wording issue is non-blocking. No broad re-research or redesign was performed.
6. Testing used Chromium/installed Chrome with desktop viewport emulation, not physical iOS/Android devices or a full assistive-technology matrix. No hosted candidate CI result has been observed.

**Release recommendation: HOLD. FINAL RELEASE AUDIT: FAIL. RELEASE READY: NO.**

Required next gate: obtain authenticated Supabase inspection, establish actual migration/schema parity, reconcile and apply reviewed missing migrations, rerun all hosted checks with cleanup and both advisors, then obtain a focused production audit after a separately authorized deployment. Passing local tests does not authorize publication.
