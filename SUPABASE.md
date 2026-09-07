# Supabase backend contract

The configured public beta project is `olmazjfubvpgtpoxlxzy`. Its URL and publishable key live in `js/config.js`. `data/terms.json` remains the only published content store. Supabase holds vote target identity, receipts/totals and private moderation queues, never published definitions.

## Current deployment boundary

The September 7 recheck found 80 live vote targets for the branch's 100 canonical terms. Recent-trending and structured-correction RPCs remain absent. `trendingEnabled` and `structuredCorrectionsEnabled` remain `false` until authenticated migration/capability verification succeeds. The released correction-compatible submission path is retained.

Supabase MCP tools and CLI authentication were unavailable. Local reproduction and public API denial tests do not establish hosted migration parity, schema definitions or advisor results. See [STRUCTURAL_INTEGRITY_QA.md](STRUCTURAL_INTEGRITY_QA.md).

## Tables and authorization

| Table | Stored data | Anonymous/authenticated SELECT / INSERT / UPDATE / DELETE |
| --- | --- | --- |
| `glossary_vote_totals` | Target UUID/name/category, totals, legacy baselines, updated timestamp | All denied; read only through RPCs. |
| `glossary_vote_receipts` | Unique term/hash receipt, direction, creation/meaningful-update timestamps | All denied. |
| `glossary_submissions` | Hashed submitter, proposed text/taxonomy, explicit kind, target FK and moderation fields | All denied. |
| `glossary_term_reports` | Hashed reporter, target/name snapshot, reason/details and moderation fields | All denied. |

All are in `public`, enable RLS, and revoke public table grants. Totals/receipts/proposals have restrictive deny-all policies for `anon`; reports explicitly deny both public roles. `authenticated` has neither grants nor permissive policies. `service_role` retains trusted moderation privileges and is never delivered to the browser. Old prototype tables, when present, are retained and locked down; a fresh project does not need them.

Expose `public`, never `private`, through PostgREST. Public RPCs are `SECURITY INVOKER`; validated implementations are `SECURITY DEFINER` in `private` with `search_path = ''`. SQL `anon` has the narrow usage/execute grants required by these wrappers, but private functions are not separate HTTP endpoints. Internal insertion/trigger helpers have no anonymous execute grants. The CHECK list helper is executable only by trusted moderation writers.

## RPC contract

Calls are POST JSON to `/rest/v1/rpc/NAME` with the public `apikey`. Successful table-returning functions produce arrays. Responses are validated before entering application state; no arbitrary HTML is accepted.

| Name | Inputs (parameter names) | Output | Authorization, idempotency and concurrency |
| --- | --- | --- | --- |
| `get_glossary_vote_state` | `p_browser_id: uuid` | Rows `{term_id, upvotes, downvotes, current_vote}` | Anonymous read-only snapshot; includes only the supplied weak browser identity's state. |
| `set_glossary_vote` | `p_term_id: uuid`, `p_browser_id: uuid`, `p_vote: smallint` | One row `{changed, current_vote, upvotes, downvotes}` | Anonymous; atomic target-row lock, receipt transition and deltas. Same target is a no-op. |
| `get_glossary_vote_totals` | `{}` | Rows `{term_id, upvotes, downvotes}` | Read-only compatibility endpoint. |
| `cast_glossary_vote` | `p_term_id`, `p_browser_id`, `p_direction: up/down` | One row `{accepted, upvotes, downvotes}` | Released one-time-vote API; same row lock/receipt key, no switching existing votes. |
| `get_glossary_trending_terms` | `{}` | Up to five `{term_id, recent_upvotes, recent_downvotes}` rows | Read-only positive net balance among active receipts changed in seven days. Ties: upvotes, latest activity, UUID. Removal deletes activity; unchanged votes do not refresh it. |
| `submit_glossary_term` | `p_browser_id`, `p_name`, `p_category`, `p_aliases: text[]`, `p_tags: text[]`, `p_definition`, `p_website` | One `{submission_id: uuid, submission_status: pending}` | Pending private queue. Per-browser advisory lock serializes duplicate/cooldown/limit checks. Same pending name is rejected. Released correction tags are validated and classified explicitly. |
| `submit_glossary_correction` | `p_browser_id`, `p_term_id`, `p_definition`, `p_website` | Same pending proposal receipt | Additive endpoint; server derives target name/category and stores kind/FK. Same serialized proposal limits. |
| `submit_glossary_term_report` | `p_browser_id`, `p_term_id`, `p_term_name`, `p_reason`, `p_details`, `p_website` | One `{report_id: uuid, report_status: pending, created: boolean}` | Private report only; exact target/name check, per-browser lock, duplicate browser+term returns existing pending ID with `created=false`. |

Mutation IDs must be non-null; browser IDs cannot be zero. PostgreSQL rejects malformed UUID input. Unknown targets and vote values outside `-1,0,1` are rejected. Counts are nonnegative integers; the JS boundary accepts only safe integer numbers or bigint digit strings. Target metadata is a migration-backed identity registry, not another published definition store.

### Queue validation

- Trimmed names: 2–100 characters. Categories: format, strategy, technique, terminology, tool.
- Trimmed definitions/suggestions: 20–5000 characters. IDs, creation timestamps and pending status are generated by the server; the API accepts no approval/publication fields.
- Aliases: at most 10 non-null one-dimensional values, 1–80 characters each, case-insensitively unique, not the canonical name. Tags: at most 12 values, 1–40 characters, normalized lowercase kebab-case, unique.
- Proposal kind: new with no target, or correction with a target FK. Status: pending/approved/rejected; reviewed states require a review timestamp.
- Report reasons: inaccurate, inappropriate, broken_media, spam, other. Details are absent or 10–2000 trimmed characters; other requires details. Report status: pending/resolved/dismissed, with consistent review timestamps.
- Empty honeypot `p_website`; 30-second per-browser queue cooldown and at most five pending items per queue. This is weak abuse friction, not authentication or a global rate limit.
- Application tables store SHA-256 hashes, not raw browser UUIDs, accounts, email, IP or user agents. Supabase infrastructure has its own logging settings.

### Errors and uncertain writes

SQLSTATEs: validation/unknown target `22023`; malformed UUID `22P02`; duplicate proposal `23505`; constraint violation `23514`; cooldown/limit `P0001`; unauthorized operation `42501`. PostgREST commonly maps validation to 400, duplicates to 409, authorization to 401/403. Missing RPCs return 404 / `PGRST202`.

The client distinguishes validation, network, timeout, rejection, unavailable service, configuration, malformed response, cancellation and content failures. Every request has an eight-second deadline through body parsing; mutations are never automatically retried. A failed transport may follow a committed write. Voting disables uncertain further writes until reload; moderation copy fallback says online delivery was unconfirmed. Copy success is not online submission success.

## Voting consistency

The receipt primary key enforces one current vote per term/browser hash. Each transition locks the aggregate row before reading/changing its receipt and commits both deltas atomically. Explicit `legacy_upvotes` / `legacy_downvotes` preserve historical aggregate-only imports:

```text
upvotes   = legacy_upvotes   + count(current up receipts)
downvotes = legacy_downvotes + count(current down receipts)
```

Deferred constraint triggers reject inconsistent final transactions, including accidental trusted maintenance writes. The migration never lowers totals. Negative receipt differences or unresolved historical correction proposals abort migration for maintainer review. Baseline changes require reviewed migrations.

Tabs/clients serialize at the database; the last committed target wins. Click times across tabs are not an ordering guarantee. Local pending/revision guards stop overlapping page writes and stale reads overwriting newer state. Browser storage identity is deliberately weak and replaceable.

## Migrations and fresh projects

Apply every SQL file in `supabase/migrations/` in filename order. The first ten migrations are unchanged. The additive eleventh is `20260906091519_enforce_structural_integrity.sql`, generated by the CLI. It adds target metadata, preserved legacy baselines, deferred consistency checks, explicit corrections and stricter moderation boundaries; it removes no production rows.

Local/CI reproduction uses PostgreSQL 17, pgcrypto, synthetic Supabase platform roles and the extensions schema. `npm run test-database` replays the same files both fresh and with prototype history, checks authorization/constraints/concurrency, and deletes only its disposable databases. This proves the application schema, not the entire managed Auth/Storage/Realtime platform. No dashboard-only application table/function is required.

For a fresh hosted Supabase project:

1. Create a project, enable the Data API and expose public only for this application. Keep private unexposed. The glossary does not require Auth.
2. Use the checked-in `supabase/config.toml` (CLI 2.116.0). It exposes only public, disables implicit grants and separate seeds, and selects PostgreSQL 17 for local reproduction. The remote project version/settings still require verification; this local file does not certify or update them. Authenticate/link outside public configuration, inspect pending migrations and apply the reviewed files:

   ```sh
   npx --yes supabase@2.116.0 login
   npx --yes supabase@2.116.0 link --project-ref YOUR_PROJECT_REF
   npx --yes supabase@2.116.0 migration list --linked
   npx --yes supabase@2.116.0 db push --linked --dry-run
   npx --yes supabase@2.116.0 db push --linked
   ```

3. Verify ordered versions and actual definitions through authenticated Supabase MCP. Run `supabase/audit.sql` read-only, then Security and Performance Advisors; local results do not replace these gates.
4. Set only public project URL/key in `js/config.js`; privileged credentials are rejected. Check CSP if the hosting origin changes. Enable capability flags only after endpoint checks and migration parity.
5. Follow [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md), including hosted valid proposal/correction/report tests, unique QA identities, targeted cleanup and verification.

For an existing project, inspect history/schema and historical data before pushing. Never repair history to pretend unapplied SQL ran. Keep applied files immutable; add timestamped migrations for later schema or target changes. Database reproduction compares each target UUID/name/category to terms.json. The only application-specific external settings are public configuration, exposed schemas and the Pages source, all documented here and in ARCHITECTURE.md.

## Moderation and publication

Review queues through a trusted Dashboard/SQL/MCP connection; treat every field as untrusted. Proposal kind/target/name/category/definition identify the requested change. Reports use an independent target/reason/details record.

Publish through a researched repository edit to terms.json, preserving UUID/legacy routes, updating target migrations and source documentation, and passing release checks. Mark queue records reviewed with the appropriate status, `reviewed_at` and concise `moderation_notes`. Changing moderation status never publishes content.

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [functions](https://supabase.com/docs/guides/database/functions), [advisors](https://supabase.com/docs/guides/observability/advisors).
