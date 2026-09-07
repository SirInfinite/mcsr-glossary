# Supabase release migration parity

Project: `olmazjfubvpgtpoxlxzy`

URL: https://olmazjfubvpgtpoxlxzy.supabase.co

Inspection date: 2026-09-07

Candidate: `8b30a2ee660062dc9b0c7eec222b2a1eaf70a979`; audit descendant `4c813986499fddd56e5320e66d02748d07faa6e0`.

## Before application

Authenticated Supabase MCP returned PostgreSQL role/session `postgres`, server 17.6, full catalogs, migration history and both advisors. All inspection calls were read-only. Local PostgreSQL 17.11 replayed the repository SQL independently in a disposable database.

| Classification | State | Evidence / disposition |
| --- | --- | --- |
| EXPECTED | First 8 migration versions and names | Exact ordered match through `20260903002833_index_term_reports_by_term`. |
| EXPECTED | Existing application schema | All 4 application tables, 12 function definitions/signatures/owners/security settings/ACLs, 29 columns, 29 constraints, 11 indexes, 4 policies, 8 role/table access rows and 24 role/function access rows match the first-eight replay. Only CRLF/LF and ACL ordering are normalized. |
| MISSING REMOTELY | `20260904013041_seed_researched_term_vote_totals.sql` | Exactly the 20 missing canonical UUIDs; `INSERT ... ON CONFLICT DO NOTHING`. Local immediate repeat preserves every row and total. |
| MISSING REMOTELY | `20260904023801_add_recent_vote_trending.sql` | Receipt meaningful-update timestamp/index, updated vote implementation, private/public `get_glossary_trending_terms`. |
| MISSING REMOTELY | `20260906091519_enforce_structural_integrity.sql` | Target name/category and preserved legacy counts, two deferred vote consistency triggers, proposal kind/target FK/list constraints/activity indexes, structured correction wrappers, validated report/compatibility wrappers, non-callable insertion helpers. |
| REMOTE-ONLY, legitimate history | `public.votes`, `public.submissions` | Deprecated prototype tables explicitly accommodated/locked down by migrations 1 and 3. Retained, not recreated or removed. Both have RLS and deny public access. |
| REMOTE-ONLY, managed state | `public.rls_auto_enable`, `ensure_rls` and Supabase platform schemas/event triggers | Existing automatic-RLS platform helper explicitly revoked by migration 1. No public execute permission. Managed Auth/Storage/Realtime/GraphQL/extension objects remain outside the application replay. |
| EXPECTED, managed defaults | Existing public-schema/default ACLs | Historical Supabase platform defaults differ from a plain PostgreSQL fixture. Every existing application table/function has explicit restrictive grants; all anon/authenticated direct table operations are denied. Local `auto_expose_new_tables=false` is a local-stack setting, not evidence of a remote settings change. |
| DRIFTED | None outside the missing migration delta | The authenticated effective application contract matches its applied history. |

The canonical seed source is `data/terms.json`. A set comparison against all 80 hosted aggregate UUIDs found 20 missing and no extraneous published-target UUIDs. Their exact names/UUIDs are already recorded in the missing seed migration. The omission is deployment lag: published research additions and the two backend contract migrations reached this candidate but were never applied to this hosted project.

Preflight: one current receipt, zero proposals, zero reports, zero ambiguous historical correction proposals, zero negative aggregate-minus-receipt differences. Existing totals and receipts must remain intact; the structural migration records the positive historical difference as a legacy baseline.

Security advisors: zero findings. Performance advisors: three INFO unused-index notices for `glossary_submissions_pending_by_submitter`, `glossary_term_reports_moderation_queue`, `glossary_term_reports_by_term`. The first is already superseded by the tracked structural migration. Retain the two report indexes; an empty moderation queue is not evidence that these indexes are unnecessary.

## Reviewed application plan

Apply the three pending tracked SQL files in their existing order through authenticated MCP `apply_migration`. No replacement seed or duplicate RPC implementation is needed.

MCP assigns a deployment timestamp and does not accept a caller-supplied version. Align only these three never-hosted local filenames to the versions actually returned in remote history, retaining their SQL bytes, logical migration names, order and Git rename history. Do not edit the eight already-applied files or rewrite remote history. Record the original-to-deployed mapping below.

After application: compare the complete local/remote sequence again and compare the actual effective schema against all eleven locally replayed migrations; verify the historical receipt and baseline; run hosted RPC/UI cases, exact QA cleanup, advisors and the complete local suite. Enable the two existing capability flags only after authenticated parity and endpoint verification pass.

## Deployment mapping and final verification

**MIGRATION PARITY: PASS.** Authenticated post-application catalogs and migration history were compared with a fresh local replay. No remote migration-history rows were edited. The eight original applied migrations remain unchanged; Git records 100% content-preserving renames for the three deployed files.

| Original pending version | Hosted/local deployed version | Logical migration |
| --- | --- | --- |
| 20260904013041 | 20260907210833 | seed_researched_term_vote_totals |
| 20260904023801 | 20260907210845 | add_recent_vote_trending |
| 20260906091519 | 20260907210851 | enforce_structural_integrity |

Final sequence: `20260902031536`, `20260902031554`, `20260902032016`, `20260902033232`, `20260902203148`, `20260902205450`, `20260903002325`, `20260903002833`, `20260907210833`, `20260907210845`, `20260907210851`. All eleven versions and names match.

The actual application contract matches the replay: 4 application tables, 20 functions, 36 columns, 39 constraints, 14 indexes, 4 policies, 2 deferred constraint triggers, private-schema usage grants, and all function/table ACLs and public-role access checks. The two historical prototype tables additionally retain RLS and denied direct public access. All remaining remote-only objects are the explicitly classified managed/historical state above. **Unexplained remote schema drift: none.**

`scripts/check-supabase-parity.mjs` passed 14 checks using the freshly authenticated catalog and migration snapshots. It also repeated the seed with a nonzero existing vote and receipt and proved both unchanged. It normalizes only line endings and ACL ordering; it does not strip SQL bodies or ignore additional application objects.

All 100 canonical UUID/name/category triples match the hosted target registry. The migration preserved every original aggregate value/timestamp and the existing receipt fingerprint. The structural migration retained the one historical upvote baseline alongside the one current upvote receipt. After hosted QA, totals remain 2 up / 0 down, with one original receipt and no inconsistent aggregates.

Eight QA proposals (four new and four corrections) and three reports were inspected by authenticated SQL against their exact returned IDs, hashed QA browser identities, target metadata, payload, pending status and null review timestamps. Cleanup required those identifiers plus the run marker and pending status; it removed exactly 8 proposals and 3 reports. No QA moderation rows or voter receipts remain. Neither legitimate receipt nor legacy baseline was removed.

Final security advisors: **zero findings**. Final performance advisors: **four INFO unused-index notices**, on `glossary_vote_receipts_recent_activity`, `glossary_submission_target`, `glossary_term_reports_moderation_queue` and `glossary_term_reports_by_term`. These support recent-activity/target/moderation queries and are retained on this mostly empty dataset. No meaningful release-impacting performance finding remains. [Supabase unused-index guidance](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

## Reproduce the parity check

1. Through authenticated MCP, run `supabase/audit.sql` and save its `catalog` object to an ignored JSON artifact. Save `list_migrations` as a separate JSON object containing `migrations`.
2. Set `MCSR_TEST_DATABASE_URL` to the isolated loopback PostgreSQL admin connection.
3. Run `node scripts/check-supabase-parity.mjs PATH_TO_CATALOG_JSON PATH_TO_MIGRATIONS_JSON`. The script refuses remote reproduction hosts and removes only its own uniquely named local database.
4. Run both hosted advisors separately. Catalog replay does not certify managed platform internals or replace advisor results.

This run's snapshots, comparison, RLS/rollback SQL, advisor results and targeted cleanup evidence are in ignored `output/release-repair/`. Current release evidence is in [FINAL_RELEASE_AUDIT.md](FINAL_RELEASE_AUDIT.md).
