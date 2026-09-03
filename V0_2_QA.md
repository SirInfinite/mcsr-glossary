# MCSR Glossary v0.2 Showcase QA

Date: 2026-09-03
Branch: `feature/v0.2-showcase`
Base release: `v0.1.0-beta.1` (`3fb1451f1b2782f13d493821fbe44f6078eda4af`)
Refinement base: `75c2e82`
Core implementation checkpoint: `0f45b17`
Tested visual-refinement checkpoint: `f40e084`
Current public beta: <https://sirinfinite.github.io/mcsr-glossary/> (left unchanged)

## Scope and content

| Measure | Released beta | v0.2 showcase candidate |
| --- | ---: | ---: |
| Published terms | 52 | 80 |
| Structured media items | 0 | 21 |
| Media-backed definitions | 0 | 20 |
| Validated related-term links | 173 | 254 |
| Unique URLs in source register | 31 | 64 |
| Automated Node tests | 19 | 53 |
| Tracked Supabase migrations | 4 | 8 |

The source register counts were measured from unique HTTPS URLs in `CONTENT_SOURCES.md`. The released-beta relationship, source, and test counts are from the pre-v0.2 repository baseline; they are not usage or adoption metrics.

### Terms added

Atum; Blaze Bed; Bucket Portal; Buried Treasure; Desert Temple; End Entry; Flintless Portal; Forced Perch; Fortress Navigation; FSG; Glitchless; Half Bow; Lava Pool; Magma Ravine; Matchmaking; Microlensing; Nether Entry; Placement Match; Portal Room; RNG; Ruined Portal; Shipwreck; SpeedRunIGT; StandardSettings; Starter Staircase; Stronghold Navigation; Village; WorldPreview.

### Existing definitions substantially revised

Any%; Bastion; Classic; F3; Filtered Seed; Hypermodern; IGT; Leaderboard; Mapless; MCSR Ranked; Minecraft Speedrunning; Multi-Instance; Ninjabrain Bot; Pie Chart; Reset; RNG Standardization; RSG; SeedQueue; Set Seed; Speedrun.com; Stronghold.

### Media coverage

The current dataset uses YouTube and original local SVG images. The validated inline renderer also supports Twitch clips, allowlisted external images, GIFs, local HTML5 video, and safe external links. No arbitrary iframe or submitted HTML path exists. Every current media object is referenced exactly once at a contextual point in its definition.

All 29 unique external URLs referenced by current media records (sources, creators, and remote assets) returned successfully during the final link check. The two local SVGs are original repository assets; their public attribution links target the live repository until this unpushed branch is merged.

### Final visual refinement

- Removed the remaining public review-status badges and the review-status Stats card while retaining the internal maintenance field and validation contract.
- Replaced sentence-like media annotations with one-line captions and matched the image lightbox to the same caption-plus-credit treatment.
- Reduced the term correction flow to its term context and one suggested-change field without changing the existing private submission payload.
- Verified selected upvote and downvote icons, borders, focus feedback, and inset state marks resolve to `#FF4400` and `#9293FE` respectively; state remains explicit through icon direction and `aria-pressed`.
- At 1024px, utility controls expand from 44px to their text width on hover and keyboard focus (158px for the longest label) while the definition position remains unchanged. At mobile sizes they remain 44px icon controls.
- The reduced-motion media query resolves action transitions to 0.01ms.

## Automated validation

`npm run check-content` passed:

- 80 terms, 80 unique UUIDs, and 80 unique routes.
- All 254 related-term references resolved.
- Every published UUID exists in a tracked vote-seed migration.
- 21 media items passed the controlled schema.
- 30 content-validator tests passed, including all six media types, inline placement, duplicate/missing/out-of-range token rejection, unsafe sources, unsupported fields, captions for audio, aliases, routes, taxonomy, dates, and vote seeds.
- 23 UI-core tests passed, including every reversible vote transition, aggregate projection, media fallback/ignore behavior, inline marker handling, term-report validation, ranked search, routes, and related terms.

`npm run test-live-voting` passed against the beta project. It covered concurrent clients, rapid conflict, idempotency, malformed/unknown input rejection, authoritative totals, and cleanup.

## Voting

Browser and live-database checks passed:

- neutral → upvote
- upvote → neutral
- neutral → downvote
- downvote → neutral
- upvote → downvote
- downvote → upvote
- repeated authoritative target remains idempotent
- rapid requests and concurrent clients do not lose aggregate updates
- disabled pending controls prevent overlapping UI requests
- failure restores the previous truthful UI state
- final QA vote was removed; the target returned to 0/0 with no receipt

The RPC locks the aggregate row, mutates the unique hashed receipt, applies both deltas in one transaction, and returns the current vote and authoritative totals.

## Submission, reporting, and failure handling

- Required, minimum-length, category, list, tag, and server constraints were exercised.
- One clearly named QA proposal was submitted successfully through the browser and appeared only in the private pending table.
- An immediate repeated request was rejected by the backend abuse/cooldown controls and did not create another row.
- The exact QA row was deleted afterward; the moderation queue returned to zero rows.
- With Supabase requests deliberately blocked, all 80 static terms remained usable, voting became honestly disabled, and the form produced a clipboard fallback marked “not sent.”
- A term-page correction action prefills context but still submits only to the pending review queue.
- One clearly labeled published-term report was submitted through the browser, stored only in the private report queue with a 32-byte SHA-256 reporter hash, and returned the same row for an immediate duplicate request.
- Invalid reason, unknown term, honeypot, and missing “Other” details requests returned HTTP 400. Anonymous direct report-table enumeration returned HTTP 401.
- The exact QA report was deleted after verification; the report queue returned to zero rows.
- With Supabase deliberately blocked, the report flow copied a fallback marked “not sent,” voting became disabled, and the definition remained fully usable.

## Responsive and interaction QA

Tested in Chromium through local HTTP at:

- 1440×900
- 1024×768
- 768×1024
- 390×844
- 360×800

Home, search, filters, cards, term detail, inline media, compact utility actions, related terms, voting, submission/report modals, Stats, Changelog, About, footer, dark mode, and light mode had no page-level horizontal overflow. The 360px report modal fit the viewport and focused its first field.

Search checks covered exact canonical terms, exact aliases, partial terms, different case, tags/definitions, nonsense input, clear-all, every category, combined filters, active-filter count, used letters, and disabled unused letters. Direct `?t=` routes, refresh, Back, Forward, related navigation, copy-link feedback, and random navigation were exercised.

## Accessibility

- Final Lighthouse accessibility: 100 mobile and desktop.
- Keyboard search suggestions expose active descendants and open the selected term.
- Skip link, visible focus styles, semantic headings/landmarks, form labels, and live status text are present.
- Submission and report modals trap focus, close with Escape, and restore their triggers.
- Image lightbox closes with Escape and restores the image trigger.
- Vote buttons expose current state with `aria-pressed` and meet touch-target sizing.
- Provider iframes have descriptive titles and never autoplay; images and GIFs require alt text; audio video requires captions.
- Reduced-motion preferences disable nonessential animation and smooth scrolling.

## Performance

Lighthouse was run against the final local candidate with mobile throttling and the desktop preset.

| Audit | Baseline mobile | Final home mobile | Media term mobile | Final home desktop |
| --- | ---: | ---: | ---: | ---: |
| Performance | 76 | 89 | 85 | 100 |
| Accessibility | 100 | 100 | 100 | 100 |
| Best Practices | 100 | 100 | 96 | 100 |
| SEO | 100 | 100 | 100 | 100 |
| FCP | 3.6 s | 2.1 s | 2.1 s | 0.5 s |
| LCP | 4.4 s | 3.5 s | 3.8 s | 0.7 s |
| TBT | 0 ms | 110 ms | 140 ms | 0 ms |
| CLS | 0 | 0.028 | 0.028 | 0.035 |

The site keeps local fonts and icons, optimized WebP interface assets, declared image dimensions, lazy inline embeds, and stable featured content. The media-term Best Practices deduction is a Chrome third-party-cookie diagnostic emitted by the automatically initialized YouTube privacy-enhanced iframe; the page itself had no JavaScript exception, CSP failure, or missing local asset. Lighthouse scores vary slightly between runs and are not guaranteed production constants.

## Security and Supabase

- Project URL verified as `https://olmazjfubvpgtpoxlxzy.supabase.co`.
- Remote migration history exactly matches all eight repository migrations.
- All six public tables have RLS enabled and a restrictive Data API deny policy where rows are private.
- Anonymous direct reads of pending submissions and vote receipts returned 401.
- Anonymous direct update of aggregate totals returned 401.
- Anonymous direct read of the term-report queue returned 401; report creation is available only through the validated RPC.
- The browser has only the project URL and `sb_publishable_...` key; privileged keys are rejected in code.
- Security Advisor returned zero findings at the schema implementation checkpoint. A fresh final-refinement rerun was unavailable because this shell has neither a Supabase CLI access token nor a callable Supabase MCP tool; the final visual commit contains no schema change. Live boundary probes still returned 401 for anonymous report-table reads and 400 for an invalid-term report RPC.
- The relevant new foreign-key index notice was resolved in a follow-up migration. Performance Advisor then returned only informational unused-index notices for the empty/fresh submission and report queues; those indexes support moderation, foreign-key maintenance, and abuse-control queries and were retained.
- Secret-pattern scans of tracked files and all changes introduced on this branch found no Supabase secret key, service-role assignment, database credential URL, personal access token, or GitHub token.
- DOMPurify removed a scripted element, event attribute, image, and `javascript:` link from a malicious Markdown fixture while retaining safe text.
- CSP permits only the intentional local, Supabase, YouTube privacy, Twitch clip, and two external-image origins required by the media contract.

## Browser console and network

Normal local flows completed with zero application JavaScript exceptions, no missing local assets, and no CSP failures. Expected network errors appeared only during deliberate Supabase blocking. The YouTube privacy-enhanced iframe may emit its own Chromium Permissions Policy or Windows WebGPU diagnostic; neither comes from glossary code. YouTube and Twitch iframes initialize automatically and lazily from explicit CSP hosts; no provider SDK or unsupported embed script is loaded.

Local screenshots and Lighthouse JSON reports were kept in the ignored `output/` QA directory and were not added to the release branch.

## Known limitations

- The current public beta remains the pre-refinement `main` build; this focused design branch has intentionally not been merged, tagged, or deployed.
- Browser-generated voter IDs are lightweight duplicate friction. Clearing storage or supplying a new UUID can bypass it.
- Moderation and publication remain manual; approving a database row does not edit `data/terms.json`.
- Community rating data is intentionally sparse and should not be treated as representative sentiment.
- Six media types are supported and passed renderer fixtures, but the current published examples use only YouTube and original local images.
- Opening a media-backed term permits its lazy trusted-provider iframe to initialize. YouTube may emit a browser third-party-cookie diagnostic despite the privacy-enhanced host.
- Embedded providers can become unavailable, geo-restricted, or change policy; every item keeps an original-source fallback.
- Definitions, current rules, legal-mod status, and community terminology remain subject to continued review.
- GitHub Pages cache headers are platform-managed rather than configured by this static repository.

## Recommendation

**PASS — ready for owner review and showcase.** No security-critical, data-corrupting, or release-blocking defect remains in the local v0.2 candidate. Publishing, merging, tagging, and release creation remain intentionally out of scope until owner review.
