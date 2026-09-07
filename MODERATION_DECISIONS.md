# Moderation procedure decisions

Decision date: 2026-09-07. Branch: `docs/moderation-procedure`, based on `2b6cd1c`. This is the public architectural decision log, not a ledger of private submissions. The operational procedure is [MODERATION.md](MODERATION.md).

## Decisions

| Decision | Choice and reason |
| --- | --- |
| Moderation model | Existing private Supabase queues + GitHub review + explicit repository publication. One primary maintainer can use the existing shared systems; nothing depends on one machine/session. |
| Admin UI | **A: no custom UI.** Supabase Dashboard/SQL and GitHub already provide the required intake and record editing. No CLI, local HTML tool, accounts, public dashboard or extra credentials surface. |
| Publication authority | Authorized human maintainer. JSON/commits and explicit deployment determine publication; queue state, AI output, source counts and votes cannot publish. |
| Types | NEW_TERM, EDIT_SUGGESTION, REPORT, SOURCE_UPDATE. Keep `kind=new/correction` and the separate report table. SOURCE_UPDATE is an explicit private editorial classification of a correction, not a second schema representation. |
| Status model | Proposals: pending/approved/rejected. Reports: pending/resolved/dismissed. Proposal acceptance and incident resolution are different outcomes. Do not introduce accepted/published/reviewing/needs_info/duplicate enums; use concise pending next-action and terminal resolution notes. |
| Evidence threshold | Supported genuine usage + a defensible core meaning and scope. Source strength is claim-specific; niche terms do not need popularity or a fixed link count. Mechanics and community usage are checked separately. |
| Quality flag | `needsUpdating` is a public research obligation for a real term, independent of queue/era status. Only stronger evidence addressing the recorded question clears it. |
| Era/status changes | Follow the existing current/legacy/historical contract, require era/mode evidence and preserve the current label when uncertain. |
| Voting | Review-priority signal only; no automatic decision thresholds. |
| Privacy | Raw queues, hashes, pending evidence and internal notes stay private. Public provenance contains curated safe evidence. No email/IP/account/reputation collection is added. |
| Recordkeeping | Reuse id, created_at, target/kind where deployed, status, reviewed_at and moderation_notes. Notes contain classification, reviewer, evidence, resolution, next action and full resulting commit SHA. Existing 2000-character capacity is sufficient for concise normal decisions; long/transcript-style cases trigger reassessment. |
| Database changes | **None.** Existing columns and constraints support this procedure. Preserve applied migrations, RPC signatures and disabled capability flags. A future searchable commit/reviewer field is not needed merely to store a few lines today. |
| Service expectations | “Submissions are reviewed before publication.” No response-time guarantee and no invented contact path for anonymous submissions. |

## Admin options considered

| Option | Cost / maintenance | Security implications | Value now |
| --- | --- | --- | --- |
| A. Existing Dashboard + GitHub | No new application code; a short repeatable checklist | Keep privileged access in the existing maintainer session; no new secret distribution or public routes | Chosen. Both queues already contain state, timestamp and note fields. |
| B. Small local helper | Credential setup, command/error/confirmation handling and tests | Another privileged client to secure, document and maintain | Revisit if repeated manual actions or multiple reviewers produce actual mistakes. |
| C. Full web dashboard | Hosting, authentication, authorization, UI, session and maintenance burden | A new privileged web surface and role model | No demonstrated need; rejected for this pass. |

**Current queue volume is unknown.** This session could not authenticate to the hosted queue, so no private records were read and no queue-size claims are made. Option A is chosen from the single-maintainer requirement and existing capabilities, not invented usage statistics. Validate that choice during actual queue reviews.

## Inspection and verification

Inspected the submission/report tables and constraints in migrations, the structural correction migration and compatibility wrapper, RLS/revokes/private RPC boundaries, frontend contribution validation/transport/modals, current content statuses, all three issue templates, README, CONTRIBUTING, DATA_CONTRACT, SUPABASE, architecture and release documentation. No prior dedicated moderation policy or PR template existed.

The important deployment difference is explicit: the repository's latest migration has correction kind/target fields, but the configured site keeps structured corrections disabled. The released form submits corrections through the original RPC with a correction tag. The procedure requires resolving the target manually until hosted parity is verified; it does not claim that a migration file proves a hosted column exists.

On 2026-09-07, `npm run test-live-backend` again confirmed all 16 public direct-table operations (SELECT/INSERT/UPDATE/DELETE across the four application tables) are denied. It still fails the overall capability gate: 20 missing term targets, missing `get_glossary_trending_terms` and missing `submit_glossary_correction` (404/PGRST202). No valid live moderation records were created or modified.

**Authenticated hosted catalog/RLS/migration inspection and Security Advisors remain unverified.** Supabase MCP tools are unavailable in the session; CLI project-list and the correctly targeted `db advisors --linked --project-ref ... --type security` call both require an unavailable access token. Do not report zero advisor findings or complete hosted RLS certification. No schema mutation was attempted. Public denial probes and disposable local reproduction are useful but different evidence.

Reviewed current [Supabase API security documentation](https://supabase.com/docs/guides/api/securing-your-api) and the [explicit Data API grants change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically). Grants and RLS remain separate controls; this project explicitly revokes queue table access and only exposes validated RPC wrappers. No new public grants or policies are needed for Option A.

Local verification completed for this branch:

- `npm run check`: PASS, 111/111 tests plus content, static/CSP and secret checks.
- `npm run test-database`: PASS, 144/144 checks across fresh and legacy reproduction of all 11 migrations. Covers RLS/grants, private moderation queues, submission/correction/report constraints and authorization. The script removed its disposable databases and QA rows.
- All three edited GitHub issue forms parsed successfully as YAML; referenced local documentation links resolve; `git diff --check` passes.
- The eight procedural walkthroughs below were reviewed against existing field limits, queue enums and publication requirements. These are policy simulations, not claims that eight real moderation items were processed.

Evidence: ignored `output/moderation/check.log`, `database.log`, `live-backend.log` and `security-advisors.log`. There are no private queue exports. Existing runtime/content/media/backend files remain unchanged; no browser behavior changed, so the browser suite was not rerun for this documentation-only pass.

## Procedure simulations

These are hypothetical review inputs and expected decisions, not newly researched glossary entries or actions on real users. Publication/commit references in the scenarios describe required future steps; no fake commit SHA or queue item was published.

| Case | Evidence/decision | Path through the procedure | Expected end result |
| --- | --- | --- | --- |
| A. High-confidence new term | Clear original usage, supported meaning/scope, no canonical or alias collision | NEW_TERM → pending research → JSON + UUID/target migration + sources → validation/tests → explicit publication → record actual SHA | approved after verified publication; no quality flag needed if no uncertainty remains. |
| B. Real niche term, uncertain scope | A credible runner demonstration establishes narrow usage, but one version claim is unresolved | NEW_TERM → pending → retain supported core and limited scope; set needsUpdating and record the research question → checks/publication → actual SHA | approved; public needsUpdating remains until stronger evidence resolves the specific question. |
| C. Alias submitted as new term | “AA” already names All Advancements in the canonical alias list | NEW_TERM → compare names/aliases → record canonical UUID and duplicate reason; no new term or migration | rejected as duplicate, with reviewed timestamp; no content commit required. A genuinely missing alias would instead receive a reviewed alias edit. |
| D. Clearly false term | Claimed MCSR use is fabricated or contradicted; no supported core remains after review | NEW_TERM → verify usage separately from mechanics → safe rejection reason; redact abusive payloads if present | rejected; no published entry and no needsUpdating escape hatch for an unestablished term. |
| E. Stronger correction source | Primary version-specific documentation disproves a sentence | EDIT_SUGGESTION → resolve target UUID → narrow correction and evidence → checks/publication → actual SHA | approved; unrelated researched text stays intact. |
| F. Broken media report | Watch page works but actual player fails, as can happen with a provider restriction | REPORT/broken_media/normal → reproduce inline failure → replace with a verified useful source or remove safely → update provenance/checks → publish/verify | resolved with actual fix SHA; remains pending while a local fix or deployment is incomplete. |
| G. Historical term incorrectly current | Sources establish the described form belonged to an earlier rule/period and is no longer current | EDIT_SUGGESTION → verify era and continuing usage → historical + required historicalNote (legacy instead if still niche/useful) → evidence/checks/publication | approved only after a justified status change; age alone is insufficient. If evidence is inconclusive, retain status and consider needsUpdating. |
| H. Conflicting community sources | Sources describe different modes/eras, or leave a real unresolved discrepancy | EDIT_SUGGESTION → prefer primary evidence, separate scope → preserve supported core and document ambiguity; flag unresolved quality question → checks/publication | approved if a supported scoped correction is published; otherwise pending with a research step or rejected for unsupported requested certainty. Never majority-vote a fact into existence. |

All eight walkthroughs include an evidence decision, duplicate/target handling, the appropriate queue state, a publication gate or explicit no-change reason, and private/public recordkeeping. **Simulated cases: PASS, 8/8. Moderator checklist: PASS.**

## Future scale triggers

Reconsider Option B when repeated queue work causes missed/duplicated decisions, the existing note capacity obscures necessary history, a backlog persists despite regular review sessions, or multiple trusted moderators need explicit ownership and scoped queue access. Measure actual workload first. Start with the smallest helper that removes the demonstrated problem; do not add a dashboard because hypothetical volume might grow.

Only consider Option C if multiple active reviewers require remote role-specific workflows that a small helper and existing systems cannot safely support. Contributors initially use public researched PRs and do not receive privileged Supabase credentials.

## Result and limitations

**Procedure decision: PASS as a documented operating model**, with no automated publication and no new privileged tool. It supports real uncertainty, explicit evidence standards, private intake and auditable publication while preserving existing schema/status vocabulary.

Hosted catalog/advisor verification, queue volume and private-row inspection remain unavailable. Existing hosted backend deployment gaps are not fixed by documentation. This pass does not certify deployment readiness or authorize merge, push, tag or release. Complete authenticated hosted checks before declaring the backend fully verified.
