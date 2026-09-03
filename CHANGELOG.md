# Changelog

## [Unreleased]

### v0.2 showcase work

- Expanded the reviewed glossary from 52 to 80 published terms and strengthened 21 existing definitions with clearer context and relationships.
- Added a validated structured-media contract and 21 attributed examples across 20 definitions, placed inline with the explanatory text, loaded lazily from allowlisted providers, and paired with safe fallbacks and accessible image expansion.
- Added atomic reversible voting: visitors can add, remove, or switch a vote while the database returns authoritative current state and totals.
- Reworked search ranking, suggestions, filters, result feedback, keyboard shortcuts, term cards, related-term discovery, and empty states.
- Refined term pages into compact reference articles with inline media, icon-first link/edit/report actions, pending edit suggestions, reversible ratings, compact related terms, and a cleaner reference hierarchy.
- Added a private, RLS-protected term-report queue for inaccurate content, inappropriate content, broken media, spam, and other serious issues.
- Removed remote font/icon dependencies, optimized header artwork, strengthened CSP provider limits, and improved responsive and keyboard behavior.
- Expanded the automated suite to 53 content-contract and UI-core tests.

Definitions remain under active review, and community terminology or correction submissions are reviewed before publication.

## [0.1.0-beta.1]

### Included in this beta

- Search across glossary term names, aliases, categories, tags, and definitions.
- Alphabetical browsing, category and tag filters, random-term navigation, and clear no-results states.
- Shareable query-based term pages with aliases, related terms, sanitized Markdown, voting totals, and copy-link feedback.
- Responsive desktop, tablet, and mobile layouts with persistent light and dark themes.
- Glossary statistics, credits, and a changelog loaded from the repository's public commit history.
- Lightweight anonymous voting backed by an atomic database function and a persistent browser-generated voter ID.
- Community term submissions sent to a private moderation queue, with validation, duplicate friction, and a clipboard fallback when the backend is unavailable.
- A static published glossary in `data/terms.json`, with automated content-contract and related-term validation.

### Early-beta notes

- Definitions and glossary content remain under active review.
- Users are encouraged to [report inaccurate, outdated, or missing terms](https://github.com/SirInfinite/mcsr-glossary/issues/new/choose).
- Community terminology submissions are reviewed before publication and are never added to the published glossary automatically.

[0.1.0-beta.1]: https://github.com/SirInfinite/mcsr-glossary/releases/tag/v0.1.0-beta.1
