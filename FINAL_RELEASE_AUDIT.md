# Final release audit

**FINAL RELEASE AUDIT: PASS. RELEASE CANDIDATE BACKEND READY: YES.**

P0 remaining: **0**. P1 remaining: **0**. All three blocker groups are resolved: missing voting targets, missing RPCs, and the authenticated verification gate. A production frontend deployment smoke pass is still required. **Do not merge, tag, deploy or publish a release on the strength of this report.**

## Candidate and scope

| Field | Verified value |
| --- | --- |
| Date | 2026-09-07 |
| Original candidate | `8b30a2ee660062dc9b0c7eec222b2a1eaf70a979` |
| Failed-audit descendant | `4c813986499fddd56e5320e66d02748d07faa6e0` |
| Repaired application / migration commit | `298301aa980a004c1ffa65fd1cc4e009ffe036be` |
| Branch | `qa/final-release-audit` |
| Repository | `SirInfinite/mcsr-glossary` |
| Hosted project | `olmazjfubvpgtpoxlxzy` |
| Project URL | https://olmazjfubvpgtpoxlxzy.supabase.co |
| Dataset | 100 terms: 91 current, 8 legacy, 1 historical; 25 media items |
| Application change | Enable the existing verified trending and structured-correction capability flags in `js/config.js` |
| Backend change | Apply the three missing tracked migrations; preserve their SQL and align their pending filenames with MCP-assigned deployment versions |
| Other changes | Reproducible parity/hosted test scripts, regression fixtures for the enabled edit contract, and certification/limitation documentation |
| Publication | Local commits only. No merge, push, tag, GitHub Release or frontend deployment performed |

Application JavaScript outside `js/config.js`, HTML, CSS, published JSON, media and dependencies remain unchanged from the original candidate. Existing migrations were not squashed. The certification documentation is a descendant of the repaired code commit and does not change runtime behavior.

Evidence is under ignored `output/release-repair/`: authenticated catalogs/history/advisors, parity comparison, hosted QA manifest and cleanup SQL/results, functional logs, browser JSON/screenshots and Lighthouse JSON. No privileged credentials or private user payloads are published in this report.

## Blocker repairs

### P1 #1 / REL-001: 20 missing voting targets

**ROOT CAUSE:** Deployment lag. The candidate included 20 researched additions in canonical `data/terms.json`, but the hosted history stopped before their seed migration. A complete authenticated UUID set comparison found exactly 80 existing targets and the 20 missing IDs already listed in the repository seed; there were no unexplained extra target IDs.

**FIX:** Applied the existing additive seed through authenticated MCP. Its `INSERT ... ON CONFLICT DO NOTHING` uses the exact canonical UUIDs, creates no duplicates, and does not reset totals or delete receipts.

**MIGRATION:** `20260907210833_seed_researched_term_vote_totals.sql`, originally pending as `20260904013041_seed_researched_term_vote_totals.sql`; SQL unchanged.

**VERIFICATION:** Found **20**, fixed **20**, remaining **0**. Coverage **100/100** through both the hosted vote-state RPC and the actual browser. Canonical UUID/name/category metadata matches every hosted target. Local seed replay with an existing nonzero vote and receipt preserved both. Immediately after migration, all 80 original aggregate values/timestamps and the original receipt fingerprint were unchanged.

The repaired cohort is All Advancements, Axis Calculated, Blaze TNT, Boat Eye, Completable Ruined Portal, Donkey Kong Route, Double Travel, Nether Exit, No F3, No Reset, PaceMan, Pearl Hanging, Perfect Travel, Pie-Ray, Preemptive Navigation, Reset Efficiency, Seedbank, SSG, Wall and ZSG. Their exact UUIDs are in the tracked seed migration and the authenticated comparison artifact.

### P1 #2 / REL-002: two missing RPCs

**ROOT CAUSE:** The frontend modules and repository migrations expected two capabilities whose migrations were never applied remotely. Names and signatures were derived from `js/backend/voting.js`, `js/backend/contributions.js`, and the migration SQL.

**FIX:** Applied the existing trending and structural-integrity migrations. No new moderation architecture or duplicate implementation was introduced. Enabled the existing frontend flags only after authenticated schema parity and hosted endpoint checks passed.

**MIGRATIONS:** `20260907210845_add_recent_vote_trending.sql` and `20260907210851_enforce_structural_integrity.sql`. Original pending versions were `20260904023801` and `20260906091519`; SQL unchanged.

**VERIFICATION:** Both RPCs are present in authenticated catalogs, match the locally replayed definitions, and pass real HTTP/application checks. There are no remaining 404/PGRST202 failures for required endpoints.

| Contract | `get_glossary_trending_terms` | `submit_glossary_correction` |
| --- | --- | --- |
| Purpose | Return up to five terms with a positive net balance among active votes changed within seven days | Queue a structured edit to a published term for private manual review |
| Input | Empty JSON object | `p_browser_id: uuid`, `p_term_id: uuid`, `p_definition: text`, `p_website: text` |
| Output | Array of `{term_id, recent_upvotes, recent_downvotes}` | One-element array of `{submission_id: uuid, submission_status: "pending"}` |
| Authorization | Explicit `anon` execute on public invoker wrapper and private implementation | Same narrow anonymous wrapper/implementation grants; no direct queue access |
| RLS relationship | Private security-definer implementation reads protected receipts with empty search path; no voter identity leaves the function | Private security-definer implementation validates input and inserts only pending proposals behind RLS; target name/category come from the registry |
| Error behavior | Empty array is valid when no terms qualify; normal transport/permission failures remain failures | Invalid input/unknown target `22023`; malformed UUID `22P02`; duplicate `23505`; cooldown/limit `P0001`; unauthorized `42501` |
| Idempotency | Read-only; repeating a vote target does not refresh its activity timestamp | A duplicate pending proposal is rejected with 409/23505 and creates no second row; it does not return a success receipt |
| Concurrency | Stable read snapshot; deterministic score/upvotes/activity/UUID ordering | Per-browser advisory transaction lock and unique pending-name index serialize duplicate/cooldown checks |
| Hosted evidence | Newly repaired positive votes appeared with correct recent counts; application response normalization passed | Valid structured RPC, invalid and duplicate requests, application service and actual browser form passed; authenticated rows had the exact target/kind/name/category/payload |

Both private implementations are in an unexposed schema. Write RPCs hash the browser UUID with SHA-256 before storage. The public `authenticated` role is not a frontend identity in this anonymous application and has no unintended RPC/table grants.

### Authenticated verification / GATE-001

**SUPABASE AUTH: VERIFIED.** The initial read-only MCP inspection confirmed the requested URL/ref, PostgreSQL management role/session `postgres`, tables, functions, migrations, policies, grants and both advisors before any hosted mutation. The previous session's lack of access was not treated as current evidence, and anonymous HTTP probes were not substituted for management inspection.

A precise pre-application delta and the final migration mapping are recorded in [SUPABASE_RELEASE_PARITY.md](SUPABASE_RELEASE_PARITY.md).

## Authenticated RLS, grants and exposed APIs

**RLS: VERIFIED / PASS.** Authenticated catalogs show the following; actual SQL role tests separately denied all **48** combinations of six tables, two public roles and four operations.

| Public table | RLS | Anonymous SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- | --- |
| `glossary_vote_totals` | YES | Denied, expected | Denied | Denied | Denied |
| `glossary_vote_receipts` | YES | Denied, expected | Denied | Denied | Denied |
| `glossary_submissions` (new/edit queue) | YES | Denied, expected | Denied | Denied | Denied |
| `glossary_term_reports` | YES | Denied, expected | Denied | Denied | Denied |
| `votes` (deprecated) | YES | Denied, expected | Denied | Denied | Denied |
| `submissions` (deprecated) | YES | Denied, expected | Denied | Denied | Denied |

The same direct operations are denied to `authenticated`. Cataloged policies are restrictive false policies, with table grants revoked. Trusted `service_role` moderation privileges remain separate from public browser configuration.

The eight intended public RPCs have explicit anonymous grants. Validated private implementations have empty search paths. Internal insertion/integrity helpers have no public execute grants. The pre-existing managed `rls_auto_enable` helper is revoked from public roles; its direct RPC attempt returned 401/42501. Requesting the private API schema returned 406/PGRST106, corroborating the inspected namespace/grant boundary. These two HTTP exposure checks supplement authenticated evidence.

Moderation proposals, edit suggestions, reports and voter receipts cannot be publicly enumerated. Aggregates cannot be directly mutated. The frontend continues to use a publishable key only; configuration validation rejects privileged keys. Current-tree/history secret scans found no privileged credentials.

## Advisors and migration parity

**SECURITY ADVISORS: PASS — zero findings.**

**PERFORMANCE ADVISORS: PASS for release — four INFO unused-index notices, zero meaningful unresolved release findings.** Retained indexes:

- `glossary_vote_receipts_recent_activity`
- `glossary_submission_target`
- `glossary_term_reports_moderation_queue`
- `glossary_term_reports_by_term`

They support recent activity, target lookup and moderation work on a database with one current receipt and empty queues after QA. No index was added solely to silence a notice. The obsolete pending-submitter index was replaced by the activity index as already specified in the tracked structural migration. [Supabase unused-index guidance](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

**MIGRATION PARITY: PASS — 11/11 versions and names.** Effective schema comparison also passes for 4 application tables, 20 function definitions/signatures/security settings/ACLs, 36 columns, 39 constraints, 14 indexes, 4 policies, 2 deferred constraint triggers and private-schema usage grants. The parity script passed **14/14** checks.

**REMOTE SCHEMA DRIFT REMAINING: none unexplained.** The retained prototypes, revoked automatic-RLS helper, managed platform schemas/event triggers and historical Supabase defaults are explicitly classified as legitimate historical/managed state. Their application access boundaries were checked. Remote migration history was not edited to conceal drift.

## Hosted voting

**HOSTED VOTING: PASS.**

The expanded real-RPC suite exercised five previously working terms — Any%, Bastion, Ninjabrain Bot, One Cycle and RSG — plus **all twenty repaired terms**. Every one passed neutral → up, up → neutral, neutral → down, down → neutral, up → down and down → up, with repeated target-state checks and authoritative totals.

Additional cases passed: independent concurrent clients, six rapid conflicting writes from one browser identity, malformed votes/UUIDs, null/zero identity, unknown term, trending after new activity, and rejection without receipt/total changes. A fresh application controller enabled voting for every published UUID. Real Chrome opened all 100 term routes and found both voting controls enabled; actual button transitions on repaired Axis Calculated also passed.

Authenticated transactional tests verified two failure rollbacks: an aborted normal RPC mutation leaves no receipt/delta, and a trusted inconsistent aggregate write is rejected by the deferred consistency trigger and rolled back. The original `npm run test-live-voting` suite also passed, including its own neutral cleanup. Production service outages were not induced.

## Hosted submissions, edits and reports

| Flow | Result | Hosted verification |
| --- | --- | --- |
| New term submission | PASS | Valid pending receipt, invalid field/list/category/honeypot rejection, duplicate rejection, cooldown and concurrent cooldown protection; exact private row verified |
| Edit suggestion | PASS | Correct target UUID, structured request fields, valid/invalid/duplicate cases, explicit correction kind and server-derived target metadata; compatibility path also verified |
| Report | PASS | Canonical target/name, valid reason/details, invalid target/name/reason/details/honeypot rejection, cooldown, duplicate returns same pending ID; exact private row verified |
| Actual browser forms | PASS | All three forms reached the real hosted RPC, displayed success only after a valid pending receipt, and retained the intended target context |

The hosted scripts produced **454 RPC/application-service checks** and **117 real-browser checks**. Separate authenticated SQL produced **48 role-denial checks** and **2 rollback checks**, with **2 supplementary RPC-exposure checks**: **623/623 checks** in these explicitly counted hosted groups. Existing live-backend/live-voting command passes are reported separately, not added again.

### QA data cleanup

**QA DATA CLEANUP: PASS.** QA identities and payloads used one unique `MCSR release QA` run marker, with the manifest written before requests. Authenticated SQL compared all **8 proposals** (4 new, 4 corrections) and **3 reports** with their exact IDs, hashed QA identities, canonical target metadata, content and pending state.

Targeted transactional cleanup required matching row IDs, browser hashes, marker and pending status; it removed exactly those eleven rows. Final authenticated inspection found **0 QA proposals, 0 QA reports and 0 QA receipts**; both moderation tables are empty. The original receipt fingerprint remains identical. Totals are **2 up / 0 down**, preserving the original one-receipt upvote plus the **1 historical upvote** baseline. There are **0 inconsistent aggregates**. No legitimate data was deleted.

## Complete local automation and clean checkout

| Gate | Result |
| --- | --- |
| `npm ci` | PASS in working checkout and clean local clone; zero dependency vulnerabilities |
| `npm run check` | PASS: content validator, **112/112 unit tests**, static integrity and secret scan |
| `npm run check-content` | PASS: 100 terms, unique UUIDs/routes, valid media/relations and complete migration seed coverage |
| `npx playwright install --with-deps chromium` | PASS |
| `npm run test-browser` | PASS: 67 product + 32 failure + 13 media + 227 release = **339/339** |
| Browser layout matrix | PASS: **224/224** |
| Accessibility | PASS: **64/64 axe scans**, zero violations |
| `npm run test-database` | PASS: **144/144**, fresh and legacy scenarios, all eleven migrations |
| Authenticated-snapshot parity replay | PASS: **14/14**, separate from the functional total |
| `npm run test-live-backend` | PASS: 100 targets, both capabilities, 16/16 table access-denial probes |
| `npm run test-live-voting` | PASS: transitions, concurrency, rejection and cleanup |
| `node scripts/scan-secrets.mjs --history` | PASS: no findings |
| `git diff --check` | PASS after final documentation/format review |

**595/595 local functional checks passed**: 112 unit + 339 browser + 144 database. This is one more than the failed audit, from explicit regression coverage of the released edit compatibility path while the default browser contract now exercises structured corrections. Layout scans, axe scans, parity checks and hosted checks are reported separately. Repeated runs are not counted as additional tests.

The repaired code commit was cloned locally without hardlinks. Clean-clone `npm ci`, `npm run check`, complete browser suite and database suite reproduced the same results. No hidden runtime files or prior node_modules were needed. Disposable database cleanup was verified: zero `mcsr_integrity_%` databases remain. Hosted Linux Actions have not run for this unpublished candidate.

Tools: Node 22.11.0, Playwright 1.58.2, axe 4.13.0, Lighthouse 12.8.2, local PostgreSQL 17.11 and hosted PostgreSQL 17.6. Real hosted UI/Lighthouse used installed Chrome; local functional fixtures use pinned Chromium.

The browser suite covers 1440×900, 1280×720, 1024×768, 768×1024, 430×932, 390×844 and 360×800 in both themes, all 100 UUID routes, navigation/search/filters, votes, modal focus/keyboard flows, malformed/unavailable responses, media/sanitization and storage failures. Fresh hosted screenshots of neutral repaired voting and all three successful moderation forms were visually reviewed.

## P2 recheck and Lighthouse

| ID | State after this repair | Evidence / decision |
| --- | --- | --- |
| REL-101 | Accepted P2 | Fresh mobile/desktop Lighthouse still reports `inspector-issues`: **Cookie**, inside `https://www.youtube-nocookie.com/embed/8c29j0We2VQ?rel=0&start=214`. This is the only failed weighted Best Practices check. Keep automatic privacy-enhanced embeds and source fallbacks; no safe application-only cookie correction was established. |
| REL-102 | Remaining P2 | Reopened Magma Ravine's recorded guide, community references, wiki and video sources, plus Ranked's seed reference. [Metacor's guide](https://github.com/Metacor/Minecraft-Speedrun-Guide) supports its 1.16 ocean-ravine route; the retrieved evidence does not establish a precise later-version boundary. Some video/wiki retrievals were unavailable. No unsupported version cutoff or content rewrite was introduced. |
| REL-104 | Accepted, dormant P2 | Zero published GIFs. Source review confirms the poster is only an image-error fallback, with no pause/reduced-motion replacement. GIF remains supported-but-unpublished with this explicit limitation in `DATA_CONTRACT.md`; controls and real animated-content QA are required before publishing one. |

The earlier REL-103 provenance fix remains in the starting candidate. **P2 remaining: 3.** No P1 was downgraded to obtain this pass.

Fresh Lighthouse measured the actual repaired local candidate at `/mcsr-glossary/?t=triangulation`, with real automatic YouTube embedding and the original SVG, without provider mocking.

| Metric | Mobile | Desktop |
| --- | ---: | ---: |
| Performance | **99** | **100** |
| Accessibility | **100** | **100** |
| Best Practices | **96** | **96** |
| SEO | **100** | **100** |
| FCP | 1.2 s | 0.3 s |
| LCP | 2.2 s | 0.5 s |
| TBT | 50 ms | 10 ms |
| CLS | 0 | 0 |

No Lighthouse run warning was reported. The remaining Best Practices deduction is the documented third-party issue. These are local lab results, not production field measurements.

The earlier audit's full 23-embed playback and 20-definition source review remain historical evidence for unchanged content/rendering; they were not counted as fresh playback/source checks in this repair. Fresh media fixtures, real YouTube Lighthouse loading and the focused P2 source review ran here. No new claim is made about unpublished Twitch/GIF/native-video content, physical mobile devices or a complete assistive-technology matrix.

## Reproduction and final release gate

1. Use authenticated MCP `get_project_url`, `list_migrations`, `list_tables`, `execute_sql` with `supabase/audit.sql`, and both `get_advisors` types. Follow the parity report's snapshot/replay procedure.
2. Run the repository local commands above. Run the hosted public probe commands only after management access is established.
3. With an authenticated inspection/cleanup session available, run `node scripts/test-hosted-release.mjs --write-qa`, then `node scripts/test-hosted-browser.mjs --write-qa`. The manifest records identities before requests and every confirmed receipt. These commands are deliberately separate from CI because they create real QA moderation rows.
4. Inspect exact pending rows through management access, then remove only the recorded QA rows using IDs/hashes/run marker and verify no QA receipts/rows remain. Do not mark the manifest cleaned based solely on public responses.
5. Recheck actual catalog parity, aggregate consistency and both advisors.

| Required gate | Certified result |
| --- | --- |
| SUPABASE AUTH | VERIFIED |
| RLS | VERIFIED / PASS |
| SECURITY ADVISORS | PASS: zero findings |
| PERFORMANCE ADVISORS | PASS: four informational notices, no meaningful release issue |
| MIGRATION PARITY | PASS |
| HOSTED VOTING | PASS, 100/100 coverage |
| HOSTED SUBMISSION | PASS |
| HOSTED EDIT | PASS |
| HOSTED REPORT | PASS |
| QA DATA CLEANUP | PASS |
| CONTENT VALIDATION | PASS |
| LOCAL AUTOMATION | PASS |
| P0 remaining | 0 |
| P1 remaining | 0 |
| FINAL RELEASE AUDIT | **PASS** |
| RELEASE CANDIDATE BACKEND READY | **YES** |

The next gate is a separately authorized production frontend deployment followed by a smoke pass of that deployed commit: direct routes/assets/CSP, live voting and moderation, media, and console/network behavior. This report certifies the repaired backend/candidate gates; it is not merge, deployment, tag or release approval.
