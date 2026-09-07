# Moderation Philosophy

MCSR Glossary publishes researched explanations of real community language, including niche and older usage. Accuracy and honest scope matter more than popularity, source counts or fast approval. One primary maintainer reviews the private Supabase queues and public GitHub contributions, then publishes a deliberate repository change. AI can assist research; it cannot approve or publish.

**Use the existing Supabase Dashboard plus GitHub. No custom admin UI or moderation CLI is required.** `data/terms.json` is the canonical published content. A queue status never updates that file or deploys the website. Published corrections, source notes and commits provide the public audit trail; the original queue records remain private.

The public expectation is: **“Submissions are reviewed before publication.”** No response-time promise, account system, appeal portal or automatic publication is implied. See [the decisions and verification record](MODERATION_DECISIONS.md) and [the backend contract](SUPABASE.md).

## Current Inbound Paths

| Path | What happens today | Maintainer action |
| --- | --- | --- |
| Website new term | Submit form → `submit_glossary_term` → private `glossary_submissions`, `pending`. Name, category and definition are required; aliases/tags are optional. | Research, check duplicates, curate a repository change or reject. |
| Website edit suggestion | Term action → the same private proposal queue. The released path uses the `correction` tag and canonical name/category; the migration-backed path records `kind=correction` and `term_id`. | Resolve the target against `terms.json`; review the requested change rather than treating it as a new entry. |
| Website report | Term action → `submit_glossary_term_report` → separate private `glossary_term_reports`, `pending`. | Triage the problem; correct it or dismiss it. Reports cannot change published terms. |
| GitHub issue | A public new-term, correction or website-bug issue. It does not create a Supabase record. | Apply the same evidence standard; discuss publicly only what is safe to disclose. |
| Pull request | A proposed repository diff and CI checks. It does not create a Supabase record. | Review evidence and the exact diff; only an authorized maintainer merges/publishes. |
| Voting | Private hashed receipts and protected aggregates; the UI displays aggregate feedback. | Use as a pointer for investigation, never a moderation decision. |

The currently configured structured-correction capability is disabled because the hosted RPC is absent. Do not enable it from policy documentation. Where the hosted target registry lacks a term, reporting may fail; the form offers a reviewable copy fallback. An unconfirmed network request might already have reached the queue: check for duplicates before resubmitting. **Copied text is not a submitted item** until the user sends it through a working intake path.

There is no reliable private reply channel for anonymous website submissions. Do not promise to contact their author. Ask for clarification only on an existing GitHub thread or another channel the contributor voluntarily supplied; do not infer identity from a hash. Otherwise research independently and record what evidence is missing.

# Submission Types

These are editorial classifications, not new API fields or database enums. Record the classification in `moderation_notes` after triage. Do not invent a second inbound queue.

| Type | Required information | Optional information | Evidence / expected action | Existing storage |
| --- | --- | --- | --- | --- |
| `NEW_TERM` | Proposed name, one supported category, proposed meaning | Aliases, tags, mode/version, usage links/timestamps | Establish genuine usage and core meaning; create an entry, merge an alias into an existing entry, or reject. | Proposal `kind=new`, no target FK. If published as an alias, record the resulting target UUID in notes. |
| `EDIT_SUGGESTION` | Existing target, what is wrong or proposed replacement text | Version/era, alias/relation changes | Prefer stronger evidence or a demonstrable clarity correction; edit the supported claim only. | Proposal `kind=correction` + target FK after migration; released correction-tag fallback until parity. |
| `REPORT` | Existing target and reason | Details and evidence; details are required for `other` | Verify the problem and its severity; fix, flag for research, or dismiss. | Report table with `term_id`, name snapshot, `reason`, `details`. |
| `SOURCE_UPDATE` | Existing target, affected source/media, replacement or failure evidence | Creator, timestamp, credit/license, version/era | Verify source health/relevance and update provenance or structured media. | Correction proposal; note `type: SOURCE_UPDATE`. A broken-media report stays a REPORT even if its resolution is a source update. |

For website intake, links can be included in the existing definition/suggestion/details text; there is no dedicated source field. Sources are encouraged at intake, **required for publication claims**, and may be found by the maintainer. Do not reject a genuine niche suggestion merely because its author has no formal guide to link.

Current limits are defined in [DATA_CONTRACT.md](DATA_CONTRACT.md) and [SUPABASE.md](SUPABASE.md): names 2–100 characters; proposal text 20–5000; up to 10 aliases / 12 tags; report details 10–2000 when present. The server creates IDs, timestamps, pending status and hashes. The caller cannot provide review/approval fields. Editorial requirements above are human review rules, not newly implemented form validation.

# Statuses

Keep the database's existing vocabulary. Proposal approval and report resolution are different outcomes; there is no additional `accepted` or `published` queue state.

| Stored status | Applies to | Who sets it / what it means | Next action | Terminal? |
| --- | --- | --- | --- | --- |
| `pending` | Both queues | RPC on intake; maintainer while researching, awaiting evidence or preparing publication. `reviewed_at` is null. | Record the next concrete step in notes and revisit during queue review. | No |
| `approved` | Proposals | Maintainer closes an accepted proposal **after the resulting repository change is published and verified**. | Retain the decision, reviewed timestamp and resulting commit. | Yes |
| `rejected` | Proposals | Maintainer finds false/unsupported content, no useful change, spam, or an already represented duplicate. | Record the specific reason and canonical target for duplicates. | Yes |
| `resolved` | Reports | Maintainer verifies the problem is handled, including a published correction, safe removal, research flag, or an already completed fix. | Record the action and commit, or why no content commit was needed. | Yes |
| `dismissed` | Reports | Maintainer verifies the report is invalid, abusive or a redundant report requiring no new action. | Record why; link the original resolution privately when relevant. | Yes |

Only the maintainer sees these queue states. The website displays a success acknowledgement for intake, not a browsable queue or review-status page. GitHub issues/PRs remain publicly open/closed/merged using GitHub's own states; do not pretend they share database enums.

`reviewing`, `needs_info` and `duplicate` are **not stored statuses**. Research and missing information remain `pending` with a next-action note. Duplicate is a resolution reason, not a second terminal state. This avoids an additional workflow layer for one maintainer.

Save terminal `status`, `reviewed_at` (UTC) and `moderation_notes` **together in one database update**. Both tables reject a terminal state without a review timestamp or a pending state with one. Confirm the exact row ID and its current status before saving; verify the saved row afterward. If someone else changed it, reconcile their decision instead of overwriting it.

To reconsider a closed decision, first preserve its previous status/date/summary/commit in the private notes, then deliberately reopen it with `pending` and a null `reviewed_at`. Revert or correct published content with a new Git commit; do not rewrite published history. Do not silently discard old decisions to fit the notes limit.

# Evidence Standard

| Tier | Sources | What they can establish |
| --- | --- | --- |
| 1 | Official MCSR documentation and rules/resources, speedrun.com, original technique-creator guides, primary tool documentation | Rules, documented tool behavior, original explanations and demonstrated usage within their stated scope. |
| 2 | Recognized runner tutorials/footage, multiple independent community discussions, public Discord evidence and Reddit | Repeated usage, practical meaning, variants and community context. A creator's firsthand explanation can qualify as Tier 1. |
| 3 | Supporting comments and technical Minecraft references | Corroboration and mechanics; a mechanics page alone does not establish MCSR slang. |

Source strength depends on what it proves. Check **community usage separately from game mechanics**. A single weak comment cannot establish a broad claim, widespread adoption or an origin story. A clear original runner clip can establish a narrow niche usage without a popularity threshold. Verify the actual content, context, author, date/version and relevant timestamp; a working URL is insufficient.

Record selected public evidence and what it supports in `CONTENT_SOURCES.md`. Never copy private messages, private queue text, personal details or unreviewed allegations into public provenance. For publicly accessible Discord evidence, retain the public link/context without unnecessary user data; private evidence requires permission and a safe public corroboration or carefully limited claim.

# New Term Review

1. Confirm someone genuinely uses the name in MCSR and identify the supported core meaning.
2. Search canonical names, aliases, spellings, related terms and legacy routes. Check mechanics, version and mode separately.
3. Choose one existing category and accurate tags. Do not add a taxonomy value to accommodate an unclear submission.
4. Approve only a useful, nonduplicate explanation supported by evidence. Curate the text rather than pasting the submitted definition into JSON.
5. If usage is real but details remain unresolved, publish only the supported core with `needsUpdating: true` and a research question. If even genuine usage cannot be established, keep researching or reject as insufficient evidence.

Do not promise publication before the repository/release checks pass. Follow the publication workflow below for stable IDs, source records and vote-target migrations.

# Edit Review

Accept a correction when stronger evidence supports it, when it fixes a demonstrated error, or when wording materially improves clarity without changing meaning. Resolve the exact target UUID before editing, especially for released correction-tag records without an FK. A tag or submitted display name alone is not publication authority.

Keep unrelated researched text intact. Explain any alias, mechanics, mode, status or historical change in the content PR/commit and provenance. A stylistic preference alone is not evidence that the current definition is false. Verify source updates by the same standard even if the definition itself stays unchanged.

# Reports

Stored reasons remain `inaccurate`, `inappropriate`, `broken_media`, `spam`, `other`. Severity is a moderator assessment in notes, not a new field or user-controlled escalation:

- **critical:** exposed private information, malicious content/links, an unsafe embed/security defect, or a materially harmful false instruction. Contain the unsafe material promptly through a reviewed minimal fix; preserve only safe audit details. Ordinary lost-run strategy advice is normally a factual issue, not automatically a critical incident.
- **normal:** wording, missing scope, outdated terminology, ordinary dead media, or a factual disagreement without immediate security/privacy risk.

Verify the report independently. Valid actions include correcting content, removing/replacing unsafe or broken media, adding `needsUpdating`, or changing era/status with evidence. Mark `resolved` only after verifying the action; dismiss unsupported/invalid reports with a reason. A broken source does not by itself invalidate a genuine term.

## Spam and Abuse

Use the existing honeypot, per-browser cooldown, pending limits and duplicate checks. Reject junk proposals and dismiss junk reports. Check related pending IDs before repeating work; client hashes are weak correlation hints, not identities or reputation scores. Do not add IP collection, account bans or a new blocking service.

Delete clearly malicious/private **text from the record** by redacting it to a neutral, constraint-valid placeholder; retain its ID, timestamps, target, disposition and a short safe explanation. Do not preserve harmful payloads merely for an audit trail. Avoid bulk row deletion. If a row itself must be deleted, first retain a redacted decision record in the same existing private queue, referencing the old ID, original submission time and reason for deletion; omit the harmful text and unnecessary personal details. Confirm exact IDs before deleting and verify the retained record afterward. Never put an export in this public repository or public issue.

# Niche / Needs Updating Terms

`needsUpdating` is a published **content-quality flag**, separate from private queue status and from current/legacy/historical. Use it when the term is genuine but scope, sources, mechanics, version or current relevance need more research. It is not a synonym for “probably fake” or a warning to remove niche vocabulary.

Publish a supported core and a restrained description of the uncertainty. Record the unresolved question, supporting public evidence and what would resolve it in `CONTENT_SOURCES.md`; keep submitter details and private review notes in the queue. An approved proposal may legitimately produce a flagged term. Keep flagged terms on the maintainer's research list by checking `needsUpdating` in the canonical dataset during review sessions. Remove the flag only after evidence addresses the recorded question; update provenance and `updatedDate`, and commit the decision.

# Historical / Legacy Terms

Use the existing contract:

- `current`: actively relevant to present community discussion, formats, routes, techniques or tools.
- `legacy`: less common in modern play but still understood and useful in older runs/guides or community discussion.
- `historical`: tied to an earlier rule, route or period and no longer current in that original form.

Age alone does not determine status. Require evidence for the era/context change. Non-current entries require a concise `historicalNote`; current entries must not have one. If evidence is inconclusive, preserve the existing status and consider `needsUpdating` rather than guessing. Keep historical entries discoverable and maintain stable URLs.

# Media Review

Follow [MEDIA_AUDIT.md](MEDIA_AUDIT.md) and the structured media contract. Check relevance to the exact nearby paragraph, source/creator, actual source content and embed playback, timestamp, caption/credit/alt, version/era, reuse permission, responsive layout and provider/CSP safety. A watch-page HTTP 200 does not prove the embed works.

Accept a useful example, replace a weaker/broken one, remove unsafe/decorative material, or use a supported external fallback link. “Broken” is a private finding/next action, not a new media schema field or term status. Do not leave a known broken player as the final resolution, rehost without permission, paste iframe HTML, add social SDKs, or loosen CSP for convenience. Update public provenance for selected/replaced media. Resolve the report only after the published result works or safely falls back.

# Duplicate Handling

- Exact duplicates and already-listed aliases/spellings: reject the new-term proposal as duplicate with the canonical target recorded.
- A genuine missing synonym/spelling: add it as an alias to the canonical entry after collision checks; approve the proposal after that change is published. Record that the outcome was an alias, not a second term.
- Overlap alone is not duplication: keep separate entries when community meaning or usage is materially distinct, with related links and clear scope.
- A historical version usually belongs in the existing term's context; separate it only if community usage/meaning warrants a distinct entry. Preserve UUIDs and legacy slugs when renaming.
- Repeated reports: keep one investigation, privately cross-reference duplicates, and dismiss redundant reports. Do not equate repeated reports from different hashes with proof of an error.

# Conflicting Sources

Seek primary/stronger evidence, then separate version, era, ruleset and mode. Record what each source actually supports. If disagreement remains, keep the safest supported core, describe material scope differences and use `needsUpdating` where appropriate. Do not manufacture consensus or resolve a conflict by counting votes, comments or URLs. A rejected correction can coexist with a separately researched improvement to the existing entry.

# Voting as Signal

Votes may identify confusing or disputed entries worth reviewing. They do not establish facts, identity, trust or publication eligibility. No vote threshold approves, hides, relabels or deletes content. Investigate the claim and its evidence, including when a well-supported niche definition is unpopular.

# Privacy

Public information is the published glossary, its quality/status indicators, curated public provenance, public GitHub contributions and intake acknowledgement. Private information includes queue contents, reporter/submitter hashes, internal notes, rejection reasoning, pending evidence and moderation metadata. Never quote private queue records in public issues or logs. Rejection reasons are surfaced only by an intentional, privacy-reviewed communication.

The application stores SHA-256 hashes of browser UUIDs, not raw IDs, email addresses, IP addresses, user agents or accounts. The original UUID lives in browser storage and can be reset; it is not strong identity. Free-text fields may nevertheless contain personal information and need careful handling. Supabase/hosting providers have separate request logging and retention; do not promise that infrastructure never sees an IP address. No extra tracking is needed for moderation.

Access the queues only through an authorized Supabase Dashboard/SQL session. Ordinary site users and application `authenticated` sessions have no direct queue access. Never distribute a service-role key to future contributors, embed it in a page, or commit local credentials/exports. Future contributors can submit reviewed PRs without queue access; multiple queue reviewers require a separate least-privilege access decision.

## Private Decision Record

Use the existing row ID, `created_at` (submission time), `status`, `reviewed_at` and `moderation_notes`. Use existing target/kind columns where deployed. Notes are limited to 2000 characters, so store concise decisions and selected links, not transcripts. A compact note uses:

```text
type: EDIT_SUGGESTION
target: <canonical term UUID and name>
moderator: <maintainer GitHub handle>
resolution: <what was decided and why>
evidence: <public/private URLs appropriate for this private record>
commit: <full resulting 40-character commit SHA, or none with reason>
next: <specific research/publication step while pending; omit when closed>
```

For reports add `severity: normal` or `critical`. For duplicates include the canonical target or original private item ID. For a new term, record the new UUID after it is assigned. The server's `created_at` and row ID are not rewritten. `reviewed_at` records when this decision was closed; source dates and publication commits have different meanings.

Keep any previous decision summary/date/commit when reopening. If a case cannot fit concise records safely in the existing notes limit, treat that as a tooling/schema review trigger rather than hiding an overflow log on one machine. For public issues/PRs, their URL/number, author timestamps, a safe decision comment and resulting commit are the record; do not duplicate them into Supabase merely to unify storage. Cross-reference a private intake only privately.

# Publication Workflow

```text
Website intake → private pending queue ─┐
Public GitHub issue / PR ───────────────┤
                                      ↓
                         Maintainer evidence review
                         ↙            ↓           ↘
                  reject/dismiss   research     prepare change
                                   (pending)          ↓
                                         terms.json + sources
                                         validation + review
                                                ↓
                                     explicit Git publication
                                     verify deployed content
                                                ↓
                                 close record + resulting SHA
```

1. Open the correct Supabase project and both pending queues. Triage critical reports first, then older actionable items; inspect flagged published terms during the same review session. Check GitHub issues/PRs as a separate inbox. Queue volume and ownership should come from these shared systems, never an untracked personal file.
2. Resolve the target and duplicates; inspect text/links as untrusted. Record classification, evidence and the next action. Researching/awaiting information/ready-to-publish all remain pending. If evidence never becomes sufficient, close with the actual reason rather than promise future contact.
3. For a supported change, edit `data/terms.json` on a focused branch, preserving UUIDs, routes and researched scope. Update `CONTENT_SOURCES.md`, media provenance and editorial dates. For a new UUID, renamed name or changed category, add the required vote-target migration through the established workflow; never hand-edit production target rows as an undocumented shortcut.
4. Run `npm run check-content`, `npm run check` and relevant browser checks (`npm run test-browser` for content/UI/media). New/changed target migrations also require `npm run test-database` and the authenticated hosted gates in [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md). Review the exact diff, aliases/relations, inline media and changed term at desktop/mobile sizes. CI assists; it cannot approve factual claims.
5. Commit the reviewed change and use an explicit maintainer publication action. Verify the intended commit/term on the deployed site, including required backend target availability. A local commit or database review action is not publication. While a PR, deployment or backend gate is pending, leave the item pending with that next action and a branch/PR/commit reference.
6. Close proposals as `approved`, or reports as `resolved`, only after the accepted change is published and verified. Store the full resulting commit SHA, concise resolution/evidence, moderator handle and reviewed timestamp in the private record in one update. Rejections/dismissals need no content commit but do need a reason and reviewed timestamp. Verify the stored result. On GitHub, post a safe decision and close/merge through the normal maintainer workflow.

If publication succeeds but recording the decision fails, do not republish. Locate the existing commit, verify the deployed result, then retry only the private record update. If publication is blocked, retain pending status and an explicit next action. The current hosted capability/migration limitations are documented in [SUPABASE.md](SUPABASE.md); this procedure does not waive them.

# GitHub Contributions

Use website forms for quick suggestions, edits and term reports; use public issues for larger factual discussions or reproducible website bugs; use PRs for researched content/code changes. A source replacement fits the correction issue template. Do not put private information or exploit payloads in public issues; use the private term-report path for a relevant term when available. The project does not promise a separate confidential general-security inbox.

Content PRs need genuine-usage/meaning evidence, source links and scope, validator/test results, resolved related terms and alias/route collisions, taxonomy compliance, historical/status/quality-flag justification, and media provenance when applicable. See [CONTRIBUTING.md](CONTRIBUTING.md) and the PR template. Code-only PRs mark content items not applicable. The maintainer retains editorial and publication authority.

# Moderator Checklist

- [ ] Confirm genuine term usage.
- [ ] Check duplicate, alias, spelling and route collisions.
- [ ] Verify the supported core meaning.
- [ ] Verify game mechanics separately.
- [ ] Check mode and version scope.
- [ ] Determine current / legacy / historical with evidence.
- [ ] Decide `needsUpdating` and record any unresolved question.
- [ ] Verify sources and keep private evidence private.
- [ ] Verify media relevance, source, credit, playback and safety, if any.
- [ ] Update `terms.json`, dates and required target migrations where applicable.
- [ ] Update `CONTENT_SOURCES.md`.
- [ ] Run validation.
- [ ] Run relevant tests and review the changed rendering.
- [ ] Commit the reviewed change; complete explicit publication and verification.
- [ ] Resolve the moderation record with the decision, reviewer, time and commit; verify it saved.

For rejection/dismissal, record why content/publication steps are not applicable. For pending research, leave a concrete next action. No checklist score or automated tool substitutes for a maintainer decision.
