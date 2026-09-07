# MCSR Glossary

A community reference for Minecraft speedrunning terminology. Search 100 researched terms, browse categories/tags, and read definitions with contextual media, related entries and community feedback.

[Live early beta](https://sirinfinite.github.io/mcsr-glossary/) · [GitHub](https://github.com/SirInfinite/mcsr-glossary) · [Feedback](https://github.com/SirInfinite/mcsr-glossary/issues/new/choose)

## Project status

This is an early beta. The repository contains newer work than the deployed site. Published content lives in `data/terms.json`; community proposals and reports remain private, and only reviewed content changes are published. Changing a database moderation status never publishes a term. [MODERATION.md](MODERATION.md) describes the evidence standard and manual publication procedure.

Minecraft title lettering and menu controls sit alongside readable sans-serif UI, distinct charcoal/stone surfaces and contextual tags. The lightweight HTML/CSS/native-JavaScript architecture is preserved. See [UI_DIRECTION_QA.md](UI_DIRECTION_QA.md) for the latest visual and performance evidence, [MCSR_THEME_QA.md](MCSR_THEME_QA.md) for the earlier theme pass, and [STRUCTURAL_INTEGRITY_QA.md](STRUCTURAL_INTEGRITY_QA.md) for the existing hosted release blockers.

## Product

- Ranked search across names, aliases, taxonomy and definitions; keyboard suggestions and `/` shortcut.
- Combined category/tag filters, A–Z browsing, random discovery and stable direct term links.
- Reference articles, inline allowlisted media, related terms and current/historical/legacy context.
- Reversible votes and private new-term/edit/report flows with a reviewable clipboard fallback.
- Light/dark themes, derived statistics and local release notes.
- Optional seven-day trending, enabled only after its backend migration is verified.

There is no framework, build step, bundler or npm runtime dependency. Marked, DOMPurify, CSS normalization and the existing fonts are vendored locally. The three pinned development tools are Playwright, axe-core and the PostgreSQL test client.

## Fresh checkout

Install Node.js 22 or newer and Git. From a new checkout:

```sh
git clone https://github.com/SirInfinite/mcsr-glossary.git
cd mcsr-glossary
npm ci
npm run check
npx playwright install chromium
npm run test-browser
npm start
```

Open **http://127.0.0.1:8001/mcsr-glossary/**. The development server maps that subpath independently of the folder name. It is not a production backend; GitHub Pages directly serves the static files. Opening `index.html` through `file://` is unsupported.

The browser suite starts/closes its own server and browser contexts, intercepts community RPCs, tests both themes at seven viewport sizes, and writes evidence under ignored `output/structural/final/` (override with `QA_OUTPUT_DIR`). It never inserts live moderation records. On Linux, use `npx playwright install --with-deps chromium`, as CI does. An installed Chrome can alternatively be selected through `QA_BROWSER_CHANNEL=chrome`.

## Checks

| Command | Purpose |
| --- | --- |
| `npm run check` | Content validator, deterministic tests, static/import/CSP checks and current-tree secret scan. |
| `npm run check-content` | Content validator and content/UI-core test groups. |
| `npm run test-browser` | Product, failure, responsive and accessibility checks with service fixtures. |
| `npm run test-database` | Disposable local database reproduction and integrity checks; setup below. |
| `npm run test-live-voting` | Real public voting RPCs; removes its QA votes and verifies cleanup. |
| `npm run test-live-backend` | Public table-access denial, RPC capability and target coverage; no valid moderation inserts. |
| `node scripts/scan-secrets.mjs --history` | Current files and historical text blobs; never prints matched credentials. |

Browser QA covers both themes at seven viewport sizes, including open search/filter states and all contribution dialogs. To save screenshots and results in a separate review directory, set `QA_OUTPUT_DIR` before running the suite. For example, in PowerShell:

```powershell
$env:QA_OUTPUT_DIR = 'output/playwright/mcsr-theme/final'
npm run test-browser
```

Without that variable, the existing `output/structural/final` destination remains the default. Generated screenshots and reports are local QA artifacts, excluded from Git.

For database reproduction, use an isolated local PostgreSQL 17 installation with pgcrypto, or a disposable container:

```sh
docker run --name mcsr-integrity-db -e POSTGRES_PASSWORD=postgres -p 127.0.0.1:5432:5432 -d postgres:17
```

Set the **local test** connection. In PowerShell:

```powershell
$env:MCSR_TEST_DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/postgres'
npm run test-database
```

In Bash:

```sh
MCSR_TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres npm run test-database
```

The script refuses remote hosts, creates unique `mcsr_integrity_*` databases, replays all migrations fresh and with historical prototype data, checks authorization/concurrency/constraints, removes QA rows and drops its databases. Supabase credentials are unnecessary. Stop the optional container with `docker stop mcsr-integrity-db` when finished.

For Lighthouse, keep `npm start` running:

```sh
npx --yes lighthouse@12.8.2 http://127.0.0.1:8001/mcsr-glossary/ --chrome-flags=--headless --output=json --output-path=output/lighthouse-mobile.json
npx --yes lighthouse@12.8.2 http://127.0.0.1:8001/mcsr-glossary/ --preset=desktop --chrome-flags=--headless --output=json --output-path=output/lighthouse-desktop.json
```

The server uses gzip and a ten-minute cache policy for Pages-like measurements. Record conditions and separate third-party embed results. A successful local check is not a hosted database, CI or release result.

## Maintainer guide

[Architecture/invariants](ARCHITECTURE.md) · [Data contract](DATA_CONTRACT.md) · [Backend/migrations](SUPABASE.md) · [Contributing](CONTRIBUTING.md) · [Moderation procedure](MODERATION.md) · [Moderation decisions](MODERATION_DECISIONS.md) · [Release gates](RELEASE_CHECKLIST.md)

Research provenance remains in [CONTENT_SOURCES.md](CONTENT_SOURCES.md), [TERM_RESEARCH_REPORT.md](TERM_RESEARCH_REPORT.md) and [CONTENT_AUDIT.md](CONTENT_AUDIT.md). Historical QA reports remain dated records; use the current checklist/report for a new release.

## License

[MIT](LICENSE).
