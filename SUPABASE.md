# Supabase beta backend

MCSR Glossary uses the Supabase development/beta project with project ref
<code>olmazjfubvpgtpoxlxzy</code> and public API URL
<code>https://olmazjfubvpgtpoxlxzy.supabase.co</code>.

<code>data/terms.json</code> remains the only published glossary dataset.
Supabase stores community submissions, private term reports, vote records, and
aggregate vote totals; it does not publish or replace glossary content.

## Architecture

| Object | Purpose | Anonymous access |
| --- | --- | --- |
| <code>public.glossary_vote_totals</code> | Aggregate counts for canonical term UUIDs | None |
| <code>public.glossary_vote_receipts</code> | One hashed vote receipt per term/browser | None |
| <code>public.glossary_submissions</code> | Private moderation queue | None |
| <code>public.glossary_term_reports</code> | Private queue for problems on published terms | None |
| <code>public.cast_glossary_vote(uuid, uuid, text)</code> | Public invoker RPC wrapper | <code>EXECUTE</code> |
| <code>public.get_glossary_vote_totals()</code> | Public read-only invoker RPC wrapper | <code>EXECUTE</code> |
| <code>public.set_glossary_vote(uuid, uuid, smallint)</code> | Reversible public vote RPC wrapper | <code>EXECUTE</code> |
| <code>public.get_glossary_vote_state(uuid)</code> | Aggregate totals plus this browser's current state | <code>EXECUTE</code> |
| <code>public.get_glossary_trending_terms()</code> | Read-only trailing-seven-day popularity aggregate | <code>EXECUTE</code> |
| <code>public.submit_glossary_term(uuid, text, text, text[], text[], text, text)</code> | Public invoker RPC wrapper | <code>EXECUTE</code> |
| <code>public.submit_glossary_term_report(uuid, uuid, text, text, text, text)</code> | Validated private-report RPC wrapper | <code>EXECUTE</code> |
| <code>private.cast_glossary_vote(...)</code> | Privileged atomic vote implementation | Only through the wrapper |
| <code>private.get_glossary_vote_totals()</code> | Privileged aggregate reader | Only through the wrapper |
| <code>private.set_glossary_vote(...)</code> | Privileged reversible vote implementation | Only through the wrapper |
| <code>private.get_glossary_vote_state(...)</code> | Privileged current-state reader | Only through the wrapper |
| <code>private.get_glossary_trending_terms()</code> | Privileged recent-activity aggregate | Only through the wrapper |
| <code>private.submit_glossary_term(...)</code> | Privileged validated submission implementation | Only through the wrapper |
| <code>private.submit_glossary_term_report(...)</code> | Privileged validated report implementation | Only through the wrapper |

The <code>private</code> schema is not exposed through the Data API. The public
RPCs are <code>SECURITY INVOKER</code> wrappers. Their narrowly scoped
implementations are <code>SECURITY DEFINER</code>, have an empty
<code>search_path</code>, qualify every relation, and cannot be called as
independent REST RPC routes.

The old prototype tables <code>public.votes</code> and
<code>public.submissions</code> are retained for audit rather than dropped. The
migrations remove their permissive policies and revoke all
<code>anon</code>/<code>authenticated</code> privileges. Matching legacy vote
totals are copied without lowering existing counts. The beta project had one
such row: Any% with one upvote and zero downvotes. The old submissions table was
empty.

## Voting

The v0.2 browser sends:

- <code>p_term_id</code>: the stable UUID from <code>data/terms.json</code>
- <code>p_browser_id</code>: a persistent random UUID generated in the browser
- <code>p_vote</code>: <code>1</code> for up, <code>-1</code> for down, or
  <code>0</code> for neutral/removal

The application tables store only a SHA-256 hash of the browser UUID. They do
not store an account, email address, IP address, user agent, or the raw browser
UUID. Supabase infrastructure may still retain ordinary request logs under the
project's platform settings.

The private vote implementation locks the term's aggregate row before reading
or changing its receipt. In that same transaction it inserts, updates, or
deletes the unique <code>(term_id, voter_hash)</code> receipt and applies both
aggregate deltas. This serializes simultaneous changes for one term, prevents
lost read-modify-write updates, and keeps the receipt and totals consistent.

The supported transitions are neutral to up/down, up/down to neutral, and
up-to-down or down-to-up. Repeating the already-authoritative target is
idempotent: <code>changed = false</code> and the totals remain unchanged. The
frontend temporarily disables both controls while a request is pending, uses an
optimistic projection, and rolls back to its prior truthful state if the RPC
fails.

Each active receipt also records when its direction last changed. The homepage
calls <code>get_glossary_trending_terms()</code>, which returns at most five
published term UUIDs with a positive net balance among active votes created or
changed in the trailing seven days. Ties favor the higher recent-upvote count
and then later activity. Removing a vote removes it from this window; repeating
an unchanged vote does not refresh it. The response contains only term UUIDs and
recent aggregate counts—never voter hashes or individual timestamps.

This is lightweight early-beta integrity, not strong abuse prevention. A
visitor can clear browser storage or supply another random UUID.

<code>set_glossary_vote</code> returns one authoritative row with:

~~~text
changed boolean
current_vote smallint
upvotes bigint
downvotes bigint
~~~

Only term UUIDs seeded in <code>glossary_vote_totals</code> can receive votes.
Content validation fails when a published term lacks a migration seed.
The v0.2 frontend loads aggregate totals and only its own current state through
<code>get_glossary_vote_state(p_browser_id)</code>. It never receives receipt
hashes or other browsers' choices. The v0.1 <code>cast_glossary_vote</code> and
<code>get_glossary_vote_totals</code> RPCs remain deployed for compatibility
with the released beta; the underlying tables are not exposed through REST or
GraphQL.

## Submissions

The frontend sends <code>p_browser_id</code>, <code>p_name</code>,
<code>p_category</code>, <code>p_aliases</code>, <code>p_tags</code>,
<code>p_definition</code>, and <code>p_website</code>. The last field is the
existing honeypot and must be empty.

The private moderation row contains:

- <code>id</code>
- <code>submitter_hash</code> (SHA-256; never the raw browser UUID)
- <code>name</code>
- <code>category</code>
- <code>aliases</code>
- <code>tags</code>
- <code>definition</code>
- <code>status</code>
- <code>created_at</code>
- <code>reviewed_at</code>
- <code>moderation_notes</code>

Database checks enforce the five published categories, required and trimmed
text, field and array limits, lowercase kebab-case tags, valid moderation
states, and 32-byte hashes. The RPC rejects duplicate pending names for one
browser, serializes simultaneous submissions from one browser, imposes a
30-second cooldown, and allows at most five pending submissions per browser
hash.

The RPC returns <code>submission_id uuid</code> and
<code>submission_status text</code>. Public submissions always start in
<code>pending</code> status.

There is no anonymous <code>SELECT</code>, <code>UPDATE</code>, or
<code>DELETE</code> path for submissions. There is no database path that writes
to <code>data/terms.json</code>.

## Published-term reports

The term-page flag action sends the persistent browser UUID, canonical term
UUID and name, one controlled reason, optional details, and an empty honeypot
to <code>submit_glossary_term_report</code>. Supported reasons are
<code>inaccurate</code>, <code>inappropriate</code>,
<code>broken_media</code>, <code>spam</code>, and <code>other</code>. An
<code>other</code> report requires details.

The private row contains the report UUID, SHA-256 reporter hash, canonical term
UUID, an untrusted display-name snapshot, reason, optional details, status,
timestamps, and optional moderation notes. Status is limited to
<code>pending</code>, <code>resolved</code>, or <code>dismissed</code>, with
database checks keeping review timestamps consistent. Report details are
trimmed and limited to 10–2000 characters when supplied.

Requests from one browser hash are serialized with a transaction-scoped
advisory lock. A second pending report for the same browser and term is
idempotent and returns the existing report. Other reports have a 30-second
cooldown and a five-pending-report limit per browser hash. This is lightweight
spam friction, not strong identity or determined-abuse prevention.

Anonymous visitors can execute the validated RPC but cannot enumerate, insert,
update, or delete report rows directly. Reports never appear in Stats and never
modify <code>data/terms.json</code>.

## RLS and privileges

RLS is enabled on every public table, including the retained prototype tables.

- <code>anon</code> has no direct table grants.
- <code>anon</code> can execute only the seven public RPC wrappers and the
  corresponding non-exposed implementations required by those wrappers.
- <code>anon</code> cannot directly insert, update, or delete any backend table.
- <code>authenticated</code> has no beta-site table or RPC privileges because
  this static site does not use Supabase Auth.
- <code>service_role</code> retains table access for trusted moderation and
  maintenance only. It is never delivered to the website.
- The existing <code>rls_auto_enable()</code> event-trigger function remains
  installed, but all Data API roles have had direct execution revoked.

Every public table has an explicit restrictive direct-access deny policy for
Data API roles. These policies use
<code>USING (false)</code> and <code>WITH CHECK (false)</code>; grants are also
revoked.

## Public frontend configuration

<code>js/supabase-config.js</code> is intentionally public and contains only:

- the project URL
- the enabled <code>sb_publishable_...</code> key

A publishable key identifies a public client; it is not an authorization
boundary. RLS, grants, and RPC privileges provide the authorization boundary.
<code>js/glossary.js</code> rejects <code>sb_secret_...</code>, legacy
<code>service_role</code> JWTs, and any key that is neither publishable nor
legacy <code>anon</code>.

Never add a service-role key, <code>sb_secret_...</code> key, database password,
or personal access token to this repository.

## Migration history

Apply files from <code>supabase/migrations/</code> in filename order:

1. <code>20260902031536_harden_public_interactions.sql</code>
2. <code>20260902031554_seed_v1_vote_totals.sql</code>
3. <code>20260902032016_hide_direct_api_tables.sql</code>
4. <code>20260902033232_clarify_vote_totals_access.sql</code>
5. <code>20260902203148_add_reversible_term_voting.sql</code>
6. <code>20260902205450_seed_v02_vote_totals.sql</code>
7. <code>20260903002325_add_private_term_reporting.sql</code>
8. <code>20260903002833_index_term_reports_by_term.sql</code>
9. <code>20260904013041_seed_researched_term_vote_totals.sql</code>
10. <code>20260904023801_add_recent_vote_trending.sql</code>

These files are the tracked deployment order. Confirm the remote migration list
before deployment, do not edit an applied migration, and add a new timestamped
migration for every future schema, policy, function, or canonical vote-target
change.

## Fresh-project setup

1. Create a Supabase project and ensure its Data API exposes
   <code>public</code>, not <code>private</code>.
2. Link an authenticated Supabase CLI:

   ~~~sh
   supabase link --project-ref YOUR_PROJECT_REF
   ~~~

3. Apply the checked-in migrations:

   ~~~sh
   supabase db push --linked
   ~~~

   MCP <code>apply_migration</code> may also be used. It generates the remote
   timestamp, so reconcile the local filename to the returned migration version
   before committing.
4. Retrieve the project URL and an enabled publishable key. Put only those two
   public values in <code>js/supabase-config.js</code>.
5. Run <code>npm run check-content</code>.
6. Serve the repository over HTTP and test vote loading, trailing-seven-day
   trending results, all six reversible vote transitions, repeat/idempotent
   requests, concurrent clients, a valid
   submission, a valid and duplicate term report, rejected malformed requests,
   direct report-enumeration denial, and graceful behavior when Supabase is
   unavailable.
7. Run the Supabase Security Advisor and review the live grants and policies.

## Moderation and publication

Review pending rows only in a trusted Supabase Dashboard, SQL session, or
server-side tool. Treat every submitted field as untrusted text.

~~~sql
select id, name, category, aliases, tags, definition, created_at
from public.glossary_submissions
where status = 'pending'
order by created_at;
~~~

Review published-term reports through the same trusted channels:

~~~sql
select id, term_id, term_name, reason, details, created_at
from public.glossary_term_reports
where status = 'pending'
order by created_at;
~~~

After factual and Markdown review, copy approved content into
<code>data/terms.json</code>, assign or preserve its stable UUID, add that UUID
to a new vote-seed migration, update the content sources, and run repository
validation. Changing a submission's database status alone never publishes it.

The published site renders Markdown with the vendored <code>marked</code>
library, then sanitizes it with DOMPurify using an explicit element and
attribute allowlist. Raw iframe HTML is prohibited by content validation;
supported embeds are recreated from validated YouTube IDs, Twitch clip slugs,
or safe media URLs.

To record moderation after publication:

~~~sql
update public.glossary_submissions
set status = 'approved',
    reviewed_at = now(),
    moderation_notes = 'Published through a reviewed terms.json change.'
where id = 'SUBMISSION_UUID'
  and status = 'pending';
~~~

## Verification

Inspect the deployed state with read-only catalog queries:

~~~sql
select c.relname, c.relrowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
order by c.relname;

select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

select routine_schema, routine_name, grantee, privilege_type
from information_schema.role_routine_grants
where routine_name in (
  'cast_glossary_vote',
  'get_glossary_vote_totals',
  'set_glossary_vote',
  'get_glossary_vote_state',
  'get_glossary_trending_terms',
  'submit_glossary_term',
  'submit_glossary_term_report'
)
order by routine_schema, routine_name, grantee;
~~~

Then run the Security Advisor. A clean run should have no security lints for
these objects.
