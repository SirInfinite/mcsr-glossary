# Release checklist

Release from a reviewed commit. Passing local checks does not authorize a merge, tag, deployment or release. Attach the commit, tool versions, logs and measured results; do not substitute older QA reports.

## Content

- [ ] `npm run validate-content` passes.
- [ ] UUIDs/names/routes are unique, relations resolve, aliases are unambiguous and media is valid.
- [ ] Renamed terms retain their previous URL in `legacySlugs`; stable UUIDs are unchanged.
- [ ] New/renamed target identity and category are represented in a reviewed migration.
- [ ] Definitions/status changes have evidence in the source/research documents.

## Frontend and security

- [ ] `npm ci` and `npm run check` pass from a clean checkout.
- [ ] `npx playwright install chromium` and `npm run test-browser` pass.
- [ ] Search/filter/random, direct routes/reload, related links, media, copy/edit/report/submission, all vote transitions, Stats/Changelog/theme and back/forward work.
- [ ] No application exceptions, unexpected console/CSP errors or missing static assets.
- [ ] `node scripts/scan-secrets.mjs --history` reports no privileged credentials.
- [ ] Sanitizer attack tests pass; CSP and provider allowlists agree.
- [ ] Every published media item renders once; Markdown cannot consume media placements or discard marker-like prose.
- [ ] Delayed clipboard fallback and closing/reopening a contribution form cannot create overlapping actions or overwrite new input.
- [ ] Review the pinned vendored parser/sanitizer versions against their maintainers' security advisories.

## Backend

- [ ] Run `npm run test-database` against an isolated local PostgreSQL 17 instance; fresh and legacy replays pass and disposable databases are removed.
- [ ] Use authenticated Supabase MCP to inspect tables, constraints, functions, grants, policies, triggers and indexes (`supabase/audit.sql`).
- [ ] Compare every remote migration version/name with the repository, then inspect actual schema definitions for drift.
- [ ] Review the pre-receipt vote difference and any legacy correction proposals before applying the structural migration. Resolve ambiguous records through an explicit safe migration; never silently discard them.
- [ ] Apply only reviewed pending migrations and verify parity again. Do not edit previously applied migration files or repair history to conceal schema drift.
- [ ] `npm run test-live-voting` passes; cleanup and aggregate consistency are verified through MCP.
- [ ] `npm run test-live-backend` passes, including all canonical targets and required RPCs.
- [ ] Hosted valid new/correction/report and duplicate/error tests pass; use unique QA identities, delete only their rows through the privileged connection, and verify cleanup.
- [ ] Hosted RLS/grants deny unauthorized reads and writes; moderation never publishes directly.
- [ ] Supabase Security and Performance Advisors have no meaningful unresolved findings.
- [ ] Enable `trendingEnabled` and `structuredCorrectionsEnabled` only after those capabilities and migration parity are verified.

## Accessibility and performance

- [ ] Lighthouse Accessibility 100; keyboard access, heading/focus/live-region semantics and reduced motion preserved.
- [ ] Mobile performance at least 90 and no serious regression from the previous release; record desktop score too.
- [ ] Best Practices / SEO 100 for the application; separately record third-party player limitations.
- [ ] Both themes work at 1440×900, 1024×768, 768×1024, 390×844 and 360×800 with no horizontal overflow.

## Deployment

- [ ] Run exactly `.github/workflows/validate-content.yml` commands and review the CI result for the release commit.
- [ ] Verify project-relative imports, data, fonts, images, favicon and metadata under `/mcsr-glossary/`.
- [ ] Obtain release/deployment authorization separately.
- [ ] Verify the Pages build succeeded for the intended commit and the production URL returns 200.
- [ ] Smoke-test the published commit, not just a local checkout; record any hosted limitations honestly.
