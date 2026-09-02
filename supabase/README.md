# Supabase setup for MCSR Glossary

The public site uses Supabase's REST API directly. It does not use authentication and must only be configured with a **publishable** key (`sb_publishable_...`) or, while legacy keys remain supported, an `anon` key. Never put an `sb_secret_...` key or legacy `service_role` JWT in this repository or any browser-delivered file.

## Public architecture

| Object | Anonymous access |
| --- | --- |
| `glossary_vote_totals` | `SELECT` aggregate counts only |
| `glossary_vote_receipts` | No direct access |
| `glossary_submissions` | No direct access |
| `cast_glossary_vote(uuid, uuid, text)` | `EXECUTE` |
| `submit_glossary_term(uuid, text, text, text[], text[], text, text)` | `EXECUTE` |

`cast_glossary_vote` locks the selected aggregate row, validates `up` or `down`, inserts one receipt for `(term_id, browser_id)`, and increments the counter inside the same database transaction. The browser UUID is only lightweight duplicate friction. Clearing storage or choosing a different UUID bypasses it; it is not authentication or strong anti-abuse protection.

`submit_glossary_term` validates lengths and arrays, rejects a filled honeypot, and inserts a `pending` row into the private moderation table. It cannot update `terms.json` or any approved glossary content.

## Setup sequence

1. Create or select the Supabase project.
2. In **SQL Editor**, run the files in [`migrations/`](migrations/) in filename order as a project owner. If using the Supabase CLI, apply the migrations through the normal migration workflow instead.
3. Confirm all 52 current term UUIDs exist in `glossary_vote_totals`. The `20260901010000_seed_v1_vote_totals.sql` migration seeds the complete v1 set. Whenever a term is added to `data/terms.json`, add its UUID through a new migration as well.
4. Open **Project Settings → API Keys** (or the Connect dialog) and copy the project URL and **publishable** key.
5. Set those two public values in `js/supabase-config.js`:

   ```js
   window.MCSR_CONFIG = Object.freeze({
       supabaseUrl: "https://YOUR_PROJECT.supabase.co",
       supabasePublishableKey: "sb_publishable_YOUR_KEY"
   });
   ```

6. Serve the site over HTTP, submit a test proposal, and cast votes from two different browser profiles.
7. In **Database → Security Advisor**, review all findings. In **Authentication → Policies** or SQL Editor, manually confirm the live policies and grants match the migration before publishing.

The Content Security Policy in `index.html` permits standard `https://*.supabase.co` project URLs. If a custom Supabase domain is used, add that exact HTTPS origin to `connect-src`.

## Moderation

Review submissions only from the Supabase Dashboard, SQL Editor, or another trusted tool using server-side privileged access. Do not expose a secret/service-role key to the static site. Treat every stored field as untrusted text: never render a submission as HTML. The public glossary sanitizes approved Markdown with the vendored DOMPurify library and recreates supported embeds from validated IDs/URLs.

Example moderation queries:

```sql
select *
from public.glossary_submissions
where status = 'pending'
order by created_at;

update public.glossary_submissions
set status = 'approved',
    reviewed_at = now(),
    moderation_notes = 'Copied into data/terms.json after review.'
where id = 'SUBMISSION_UUID';
```

Approval is intentionally manual: review the Markdown and factual content, then make a normal repository change to `data/terms.json`. A database status change alone never publishes content.

## Live-state verification

The repository migration defines the intended state, but it cannot prove what is currently active in a hosted Supabase project. After applying it, verify RLS and policies in the live database:

```sql
select relname, relrowsecurity
from pg_class
where relname in (
  'glossary_vote_totals',
  'glossary_vote_receipts',
  'glossary_submissions'
);

select schemaname, tablename, policyname, roles, cmd
from pg_policies
where tablename like 'glossary_%'
order by tablename, policyname;

select routine_name, grantee, privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public'
  and routine_name in ('cast_glossary_vote', 'submit_glossary_term')
order by routine_name, grantee;
```

Expected result: RLS is enabled on all three tables; only `glossary_vote_totals` has an anonymous `SELECT` policy. Receipts and submissions have no anonymous table policies. Only `anon` (plus trusted owner/administrative roles, if shown by the catalog) should have `EXECUTE` on the two public functions. Anonymous writes happen only through those `SECURITY DEFINER` functions, each with an empty `search_path` and fully qualified table names.

Legacy tables named `votes` or `submissions`, if they exist in an older project, are not used by this frontend. Inspect and archive them manually only after confirming no other client depends on them.
