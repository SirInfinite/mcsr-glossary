# MCSR Glossary

MCSR Glossary is a searchable reference for Minecraft speedrunning terminology. It is intended to make a jargon-heavy community easier to understand for new runners, viewers, and contributors.

## EARLY BETA

Live beta: <https://sirinfinite.github.io/mcsr-glossary/>

Repository: <https://github.com/SirInfinite/mcsr-glossary>

Feedback: <https://github.com/SirInfinite/mcsr-glossary/issues/new/choose>

Content and behavior may still change, and tester feedback is welcome.

## Features

- Full-text search across term names, aliases, categories, tags, and definitions
- Alphabetical browsing plus category and tag filters
- Shareable query-based term pages with aliases and related terms
- Random-term navigation
- Light and dark themes saved in the browser
- Glossary statistics and a changelog loaded from the repository's public GitHub commit history
- Lightweight anonymous voting with atomic aggregate updates
- Community term proposals sent to a private review queue, with a clipboard fallback when the backend is unavailable

## Tech

The site is plain HTML, CSS, and JavaScript with no framework or build step. Glossary content lives in [`data/terms.json`](data/terms.json), browser code uses native JavaScript modules, and small vendored libraries handle Markdown rendering, sanitization, and CSS normalization. The configured Supabase beta integration supports private moderated submissions and atomic voting through a public project URL and publishable key; see [`SUPABASE.md`](SUPABASE.md) for the security and deployment model.

## Running Locally

From the repository root, serve the files over HTTP:

```sh
python -m http.server 8000
```

Then open <http://localhost:8000/>. Opening `index.html` directly is not supported because the app fetches JSON and uses JavaScript modules.

Node.js 20 or newer is required only for the content checks; no install step is needed:

```sh
npm run check-content
```

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the content contract, sourcing expectations, and local validation workflow.

## Content Accuracy

Corrections, missing terminology, and better supporting evidence are welcome through [GitHub Issues](https://github.com/SirInfinite/mcsr-glossary/issues/new/choose) or the site's term-proposal form. Research provenance is recorded in [`CONTENT_SOURCES.md`](CONTENT_SOURCES.md), with deeper review notes in [`CONTENT_AUDIT.md`](CONTENT_AUDIT.md).

## License

MCSR Glossary is available under the [MIT License](LICENSE).
