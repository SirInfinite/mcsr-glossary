# Early Beta QA Report

## Release candidate

- Date: 2026-09-01 (America/Chicago)
- Target: `v0.1.0-beta.1`
- Tested application commit: `3fb1451f1b2782f13d493821fbe44f6078eda4af`
- Public URL: https://sirinfinite.github.io/mcsr-glossary/
- Deployment source: GitHub Pages from `main` at `/(root)`, HTTPS enforced
- Content validation: [run 33589855134](https://github.com/SirInfinite/mcsr-glossary/actions/runs/33589855134) — passed
- Pages deployment: [run 33589854686](https://github.com/SirInfinite/mcsr-glossary/actions/runs/33589854686) — passed
- Version tag / GitHub Release: intentionally not created

## Environments

- Windows desktop, headed Chromium through Playwright
- Production GitHub Pages deployment over HTTPS
- Local Python static server for pre-push regression checks
- Supabase beta project `olmazjfubvpgtpoxlxzy`
- Responsive viewports: 1440×900, 1024×768, 768×1024, 390×844, and 360×800
- Lighthouse mobile emulation against the deployed site

## Test results

### Repository and content

- `npm run check-content`: passed.
- Content validator tests: 19/19 passed.
- `data/terms.json`: 52 terms, 52 unique UUIDs, 52 unique routes, and all IDs seeded for voting.
- All related-term references resolve.
- First-party JavaScript passed syntax checks.
- Repository metadata, canonical site URL, README links, and `GITHUB_REPO = "SirInfinite/mcsr-glossary"` were verified.

### Public site behavior

- Home loaded all 52 terms with the logo, favicon, fonts, styles, and other local assets present.
- Search passed exact-term, partial-term, alias, mixed-case, nonsense-query, suggestion, and clear flows.
- Letter index passed active-letter and inactive-letter behavior.
- Every category filter passed; tag, combined, and no-results filtering passed.
- Term pages passed list navigation, direct `?t=` navigation, refresh, related-term navigation, browser back/forward, and copy-link feedback.
- Markdown rendering passed, including inline code.
- The deployed rendering code was exercised with a controlled media fixture: an allowlisted YouTube URL produced a `youtube-nocookie.com` iframe, while script, event-handler, arbitrary iframe, and `javascript:` payloads were removed and did not execute.
- Home, Stats, Changelog, and Credits navigation passed. Stats reported 52 total terms and 0 needing updates.
- The Changelog loaded current commits from `SirInfinite/mcsr-glossary`.
- Repository, contribution, issue-report, and changelog API endpoints resolved successfully.
- Dark/light switching and reload persistence passed.

### Supabase

- The production site connected to `https://olmazjfubvpgtpoxlxzy.supabase.co` using the modern public publishable key.
- Aggregate vote retrieval returned 52 canonical term rows.
- A live upvote succeeded atomically. A repeat/opposite request for the same browser ID returned `accepted: false` without changing totals. A malformed direction returned HTTP 400.
- Browser-native invalid-submission checks prevented an RPC request.
- A valid production QA submission returned HTTP 200 with `pending` status.
- A duplicate submission returned HTTP 409, and a honeypot request returned HTTP 400.
- With Supabase responses deliberately replaced by HTTP 503, the glossary still loaded all 52 terms, voting disabled cleanly, and a valid submission was copied locally with a clear not-sent message.
- A simulated privileged frontend key was rejected before any Supabase request was made.
- Direct anonymous reads of pending submissions and vote receipts returned HTTP 401. Direct anonymous reads/writes of aggregate tables were also denied; the read-only totals RPC remained available.
- The exact QA vote receipt and pending submission were deleted after verification. Counts returned to 0 receipts, 0 pending submissions, and 0 QA residue; the tested Mapless total returned to 0/0.

### Responsive and accessibility

- Header, navigation, search, filters, cards, term details, modal, vote controls, and footer stayed within all five required viewports.
- No horizontal overflow remained at any required viewport.
- The submission modal fit each viewport, focused the first input, trapped forward/backward Tab navigation, closed with Escape, and returned focus to its trigger.
- Form controls have visible labels, and keyboard navigation showed a visible focus outline.
- Lighthouse accessibility: 100.
- Lighthouse best practices: 100.
- Lighthouse SEO: 100.
- Lighthouse performance: 68 under mobile throttling, with 20 ms total blocking time and 0 cumulative layout shift.

### Console and network

- Final clean production session: 0 JavaScript errors and 0 warnings.
- Final clean production session: 0 HTTP 4xx/5xx requests, no missing local assets, no unexpected CORS failures, and no required CSP-blocked resources.
- Expected 400/401/409/503 responses appeared only in deliberate rejection/failure tests.

### Security

- Supabase security advisors: 0 findings.
- RLS is enabled on every public table.
- Anonymous, authenticated, and public roles have no direct public-table privileges.
- Anonymous access is limited to the three public RPCs for vote totals, atomic vote casting, and pending submissions.
- Pending submissions and vote receipts are not publicly enumerable.
- Browser UUIDs are stored only as SHA-256 hashes in backend records.
- Frontend configuration rejects modern secret keys and legacy service-role JWTs.
- Workspace and release-history scans found no Supabase secret key, service-role credential, database password, personal access token, GitHub token, or private key. The checked-in Supabase URL and publishable key are intentionally public.

## Defects fixed during QA

1. Corrected `SirInfinity` credit/author strings to the repository owner name `SirInfinite` (`396a675`).
2. Moved the compact header breakpoint to cover tablets, removing horizontal overflow at 768×1024 (`86c5dc0`).
3. Declared the search field as an ARIA combobox and raised muted/dim text contrast; Lighthouse accessibility increased from 91 to 100 (`3fb1451`).

Each affected flow was retested locally, deployed through Pages, and retested on the public URL.

## Known early-beta limitations

- The browser-generated voter UUID is lightweight duplicate-vote friction, not authentication; clearing storage or using another browser can bypass it.
- Community submissions require manual moderation. Approved content is still published by editing the canonical static `data/terms.json`; submissions are never auto-published.
- The current published term dataset has no embedded-media examples, so media safety was verified with a controlled fixture against the deployed renderer.
- Lighthouse performance is 68 under mobile throttling because first paint and LCP are dominated by render-blocking third-party font/icon resources. Blocking time and layout stability are good, and no functional defect was observed; asset bundling is deferred beyond this beta QA scope.
- GitHub's Pages workflow emits a non-blocking platform annotation about its own `actions/upload-artifact` Node 20 runtime being forced to Node 24.

## Recommendation

PASS — the deployed site is suitable for the `v0.1.0-beta.1` public beta. Create the tag and GitHub Release only after the separately authorized release step.
