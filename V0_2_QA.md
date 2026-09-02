# MCSR Glossary v0.2 Showcase QA

Date: 2026-09-02
Branch: `feature/v0.2-showcase`
Base release: `v0.1.0-beta.1` (`3fb1451f1b2782f13d493821fbe44f6078eda4af`)
Tested implementation checkpoint: `180d5ae` plus documentation-only changes recorded with this report
Current public beta: <https://sirinfinite.github.io/mcsr-glossary/> (left unchanged)

## Scope and content

| Measure | Released beta | v0.2 showcase candidate |
| --- | ---: | ---: |
| Published terms | 52 | 80 |
| Structured media items | 0 | 21 |
| Media-backed definitions | 0 | 20 |
| Validated related-term links | 173 | 254 |
| Unique URLs in source register | 31 | 64 |
| Automated Node tests | 19 | 46 |
| Tracked Supabase migrations | 4 | 6 |

The source register counts were measured from unique HTTPS URLs in `CONTENT_SOURCES.md`. The released-beta relationship, source, and test counts are from the pre-v0.2 repository baseline; they are not usage or adoption metrics.

### Terms added

Atum; Blaze Bed; Bucket Portal; Buried Treasure; Desert Temple; End Entry; Flintless Portal; Forced Perch; Fortress Navigation; FSG; Glitchless; Half Bow; Lava Pool; Magma Ravine; Matchmaking; Microlensing; Nether Entry; Placement Match; Portal Room; RNG; Ruined Portal; Shipwreck; SpeedRunIGT; StandardSettings; Starter Staircase; Stronghold Navigation; Village; WorldPreview.

### Existing definitions substantially revised

Any%; Bastion; Classic; F3; Filtered Seed; Hypermodern; IGT; Leaderboard; Mapless; MCSR Ranked; Minecraft Speedrunning; Multi-Instance; Ninjabrain Bot; Pie Chart; Reset; RNG Standardization; RSG; SeedQueue; Set Seed; Speedrun.com; Stronghold.

### Media coverage

The current dataset uses YouTube and original local SVG images. The validated renderer also supports Twitch clips, allowlisted external images, explicitly activated GIFs, local HTML5 video, and safe external-link cards. No arbitrary iframe or submitted HTML path exists.

All 27 unique current media source and creator URLs returned HTTP 200 during the final link check. The two local SVGs are original repository assets; their public attribution links target the live repository until this unpushed branch is merged.

## Automated validation

`npm run check-content` passed:

- 80 terms, 80 unique UUIDs, and 80 unique routes.
- All 254 related-term references resolved.
- Every published UUID exists in a tracked vote-seed migration.
- 21 media items passed the controlled schema.
- 27 content-validator tests passed, including all six media types, unsafe sources, unsupported fields, captions for audio, aliases, routes, taxonomy, dates, and vote seeds.
- 19 UI-core tests passed, including every reversible vote transition, aggregate projection, media fallback/ignore behavior, ranked search, routes, and related terms.

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

## Submission and failure handling

- Required, minimum-length, category, list, tag, and server constraints were exercised.
- One clearly named QA proposal was submitted successfully through the browser and appeared only in the private pending table.
- An immediate repeated request was rejected by the backend abuse/cooldown controls and did not create another row.
- The exact QA row was deleted afterward; the moderation queue returned to zero rows.
- With Supabase requests deliberately blocked, all 80 static terms remained usable, voting became honestly disabled, and the form produced a clipboard fallback marked “not sent.”
- A term-page correction action prefills context but still submits only to the pending review queue.

## Responsive and interaction QA

Tested in Chromium through local HTTP at:

- 1440×900
- 1024×768
- 768×1024
- 390×844
- 360×800

Home, search, filters, cards, term detail, media, related terms, voting, submission modal, Stats, Changelog, About, footer, dark mode, and light mode had no page-level horizontal overflow. The 360px modal fit the viewport and focused its first field.

Search checks covered exact canonical terms, exact aliases, partial terms, different case, tags/definitions, nonsense input, clear-all, every category, combined filters, active-filter count, used letters, and disabled unused letters. Direct `?t=` routes, refresh, Back, Forward, related navigation, copy-link feedback, and random navigation were exercised.

## Accessibility

- Final Lighthouse accessibility: 100 mobile and desktop.
- Keyboard search suggestions expose active descendants and open the selected term.
- Skip link, visible focus styles, semantic headings/landmarks, form labels, and live status text are present.
- Submission modal traps focus, closes with Escape, and restores its trigger.
- Image lightbox closes with Escape and restores the image trigger.
- Vote buttons expose current state with `aria-pressed` and meet touch-target sizing.
- Provider media has a descriptive activation control; images require alt text; audio video requires captions; GIFs start paused.
- Reduced-motion preferences disable nonessential animation and smooth scrolling.

## Performance

Lighthouse was run against the final local candidate with mobile throttling and the desktop preset.

| Audit | Baseline mobile | Final mobile | Final desktop |
| --- | ---: | ---: | ---: |
| Performance | 76 | 94 | 99 |
| Accessibility | 100 | 100 | 100 |
| Best Practices | 100 | 100 | 100 |
| SEO | 100 | 100 | 100 |
| FCP | 3.6 s | 2.1 s | 0.5 s |
| LCP | 4.4 s | 2.7 s | 0.7 s |
| TBT | 0 ms | 90 ms | 0 ms |
| CLS | 0 | 0.028 | 0.055 |

The pass removed external fonts and Font Awesome, converted oversized header/theme PNGs to small WebP assets, uses click-to-load embeds, declares image dimensions, and reserves stable featured content. Lighthouse scores vary slightly between runs; these are the final recorded runs, not guaranteed production constants.

## Security and Supabase

- Project URL verified as `https://olmazjfubvpgtpoxlxzy.supabase.co`.
- Remote migration history exactly matches all six repository migrations.
- All five public tables have RLS enabled and a restrictive anonymous deny policy.
- Anonymous direct reads of pending submissions and vote receipts returned 401.
- Anonymous direct update of aggregate totals returned 401.
- The browser has only the project URL and `sb_publishable_...` key; privileged keys are rejected in code.
- Security Advisor returned zero findings.
- Performance Advisor returned one informational unused-index notice for `glossary_submissions_pending_by_submitter`. The table was empty during QA, and the index supports the intentional pending-count/cooldown path, so it was retained.
- Secret-pattern scans of tracked files and all changes introduced on this branch found no Supabase secret key, service-role assignment, database credential URL, personal access token, or GitHub token.
- DOMPurify removed a scripted element, event attribute, image, and `javascript:` link from a malicious Markdown fixture while retaining safe text.
- CSP permits only the intentional local, Supabase, YouTube privacy, Twitch clip, and two external-image origins required by the media contract.

## Browser console and network

Normal local flows completed with zero JavaScript exceptions and no missing local assets. Expected network errors appeared only during deliberate Supabase blocking and deliberate rejected-submission tests. YouTube made no provider request until the user activated an embed. No unsupported media provider script is loaded.

Local screenshots and Lighthouse JSON reports were kept in the ignored `output/` QA directory and were not added to the release branch.

## Known limitations

- The current public beta still serves v0.1; this branch has intentionally not been pushed, merged, tagged, or deployed.
- Browser-generated voter IDs are lightweight duplicate friction. Clearing storage or supplying a new UUID can bypass it.
- Moderation and publication remain manual; approving a database row does not edit `data/terms.json`.
- Community rating data is intentionally sparse and should not be treated as representative sentiment.
- Six media types are supported, but the current published examples use only YouTube and original local images.
- Embedded providers can become unavailable, geo-restricted, or change policy; every item keeps an original-source fallback.
- Definitions, current rules, legal-mod status, and community terminology remain subject to continued review.
- GitHub Pages cache headers are platform-managed rather than configured by this static repository.

## Recommendation

**PASS — ready for owner review and counselor showcase.** No security-critical, data-corrupting, or release-blocking defect remains in the local v0.2 candidate. Publishing, merging, tagging, and release creation remain intentionally out of scope until owner review.
