# Glossary Data Contract

`data/terms.json` is the source of truth for published glossary content. Contract version 4 is declared in `js/content-contract.js`; the browser and CLI execute the same pure validator in `js/content-validation.js`. The accepted dataset is frozen before rendering. There is no build step or runtime schema dependency.

The root JSON object contains:

- `terms` (required): a nonempty array of term objects.
- `titleString` (optional): site title metadata. It must be a string when present.
- `aboutParagraph` (optional): site description metadata. It must be a string when present.

## Term schema

Every term contains the required fields below and may contain the documented optional `historicalNote`, `media` and `legacySlugs` fields. Unknown term fields fail validation.

| Field | Type | Contract |
| --- | --- | --- |
| `id` | string | Unique lowercase UUID in `8-4-4-4-12` hexadecimal form. IDs are stable database keys and must not change after publication. |
| `name` | string | Unique canonical display name, 2–100 characters, trimmed. Names are compared case-insensitively and must produce a unique URL slug. |
| `category` | string | One value from the controlled category list below. |
| `status` | string | One of `current`, `historical`, or `legacy`. This describes present community relevance, not content quality. |
| `aliases` | string[] | Genuine alternate names, at most 10 values of at most 80 characters each. Values are trimmed, unique case-insensitively, and may not collide with any canonical name or another term's alias. |
| `tags` | string[] | Descriptive filter labels, at most 12 values of at most 40 characters each. Values are unique lowercase kebab-case strings such as `nether-travel` or `version-1-16-1`. |
| `definition` | string | Trimmed Markdown, 20–5000 characters. Definitions under 80 or over 1200 characters produce review warnings. Raw iframe HTML and legacy media directives are prohibited. A media-backed definition places validated items with the inline token described below. |
| `relatedTerms` | string[] | At most 20 exact, case-sensitive canonical term names. Every value must resolve, be unique, and not point back to the current term. |
| `creationDate` | string | Editorial record creation date in `YYYY-MM-DD`, or an empty string when unknown. It is not the date the community term was invented. |
| `needsUpdating` | boolean | Editorial review flag. Use `true` when known content work remains; record the reason in the content audit or source notes. |
| `updatedDate` | string | Most recent substantive content revision in `YYYY-MM-DD`, or an empty string when unknown. The term page displays this value when present. |
| `historicalNote` | string (optional) | Required for `historical` and `legacy` terms and forbidden for `current` terms. A trimmed 20–500 character explanation of when the term mattered and, only when sourced, what changed. |
| `media` | object[] (optional) | Zero to six validated media items. Omit the field when a definition has no useful visual example. |
| `legacySlugs` | string[] (optional) | At most ten distinct lowercase kebab-case routes, at most 100 characters each. Add the old canonical slug when renaming a term. UUIDs, canonical slugs and legacy slugs share one collision-checked namespace. |

Dates must be real calendar dates; when both are known, `updatedDate` cannot precede `creationDate`. Case folding for names/aliases/tags uses fixed English comparison. Slugs retain the existing lowercase ASCII letters/digits with hyphens algorithm, so current links remain stable. Incoming UUID routes and slug casing normalize to the canonical route. Keep previous slugs explicitly when renaming. Do not add a second definition/block representation: Markdown plus standalone structured-media references is the only supported content model.

All media `src` values are strings. HTTPS links cannot contain username/password components. Allowlisted external images use the default HTTPS port, matching CSP; local media paths cannot traverse directories. The CLI also verifies that local images, video files, posters, and caption tracks exist with their exact case-sensitive filename and resolve inside the repository. Broken image requests fall back to a descriptive source link. Canonical source provenance remains in `CONTENT_SOURCES.md` and the research documents rather than an undocumented term field.

### Media schema

Media is presentation data, never arbitrary HTML. Each item requires `type`, `src`, `title`, `caption`, `credit`, and `sourceUrl`. `credit` is exactly `{ "name": "…", "url": "https://…" }`; `sourceUrl` is the original HTTPS source linked from the understated caption line. Titles, captions, and credit names must be trimmed and remain within the limits in `js/content-contract.js`.

| Type | `src` | Additional fields | Browser behavior |
| --- | --- | --- | --- |
| `youtube` | Exact 11-character video ID | Optional integer `start`, 0–86400 seconds | Allowlisted iframe from `youtube-nocookie.com`, initialized when the definition opens, with no autoplay. |
| `twitch` | Exact Twitch clip slug | None | Allowlisted clip iframe initialized when the definition opens, with the current hostname supplied as `parent` and autoplay disabled. |
| `image` | Local image under `images/media/`, or HTTPS from the explicit host allowlist | Required `alt`, integer `width`, integer `height` | Lazy image with an accessible click-to-expand dialog. |
| `gif` | Local GIF under `images/media/`, or allowlisted HTTPS GIF | Required `alt`, `width`, `height`, and local static `poster` | Lazy animated image with accessible alt text and click-to-expand behavior; the poster remains a static fallback. |
| `video` | Local `.mp4` or `.webm` under `media/` | Required `width`, `height`, `hasAudio`; optional local `poster` and `.vtt` `captions` | Native controls, metadata preload, inline playback, and no autoplay. Captions are mandatory when `hasAudio` is true. |
| `link` | HTTPS URL | None | Safe external preview/link only; useful for providers that should not be embedded. |

Unsupported fields or providers fail both repository validation and runtime dataset loading. The media renderer also has a defensive source-link fallback for an invalid item with a safe HTTPS source; it omits items without a safe source. External image hosts are intentionally limited to `minecraft.wiki` and `upload.wikimedia.org`. Expanding any embed or image host requires both a contract change and a matching CSP review.

GIF is supported but unpublished: the current dataset contains no GIFs. The renderer does not yet provide a pause control or a reduced-motion poster replacement; its poster is an image-error fallback. Keep animations unpublished until those controls and actual animated-content accessibility are verified (REL-104 in `FINAL_RELEASE_AUDIT.md`).

### Inline media placement

The `media` array owns validated provider metadata. The definition controls reading order with a zero-based token on its own line:

```text
Paragraph introducing the technique.

{{media:0}}

Paragraph explaining what to notice.
```

Every media item must be referenced exactly once, every index must exist, and each token must be surrounded by blank lines. Terms without media need no token and continue to use ordinary Markdown. Tokens separate independent Markdown blocks before parsing. Close Markdown constructs before a token and keep reference-link declarations in the block that uses them. Each text block crosses the shared sanitizer; media elements are created through trusted DOM APIs between blocks. Ordinary text is never treated as an internal placeholder, and Markdown or HTML cannot swallow a media placement. Tokens never become arbitrary HTML or iframe input.

## Categories

The finite category set is:

- `format`: a ruleset, seed format, or competition format, such as RSG or MCSR Ranked.
- `strategy`: a route or decision-making approach used across multiple actions.
- `technique`: a specific execution or information-gathering method.
- `terminology`: a game object, structure, timing concept, or community term that does not fit a more specific category.
- `tool`: software or an in-game utility interface used to run, time, or analyze attempts.

Use the most specific category that describes why a newcomer needs the entry. Do not introduce synonyms such as `tech`, `term`, `run type`, or grammatical labels such as `noun, verb`.

## Terminology status

- `current`: actively relevant to current community discussion, categories, routes, techniques, or tooling.
- `historical`: tied to an earlier rule, route, or period and no longer current in that original form.
- `legacy`: less common in modern play but still understood and useful for reading older runs, guides, or community discussion.

Only non-current terms receive a public status marker. Their required `historicalNote` is concise context, not a warning that the entry is invalid. Status and history claims require the same source provenance as definitions.

The moderation workflow in [MODERATION.md](MODERATION.md) keeps these content statuses separate from private queue outcomes. `needsUpdating` may coexist with any content status when genuine usage is established but a recorded research question remains. Clearing it requires stronger evidence and a provenance update; no additional content or moderation fields are implied.

## Modes and versions

The current model does not define `modes` or `versions` fields and the site does not present mode/version filters. The dataset does not classify every term completely enough for those filters to be truthful. Put important limitations in the definition, and use a descriptive tag such as `ranked`, `rsg`, or `version-1-16-1` only when it is accurate. An invented `modes` or `versions` field is rejected as an unsupported schema change.

## Adding or editing a term

1. Add an object following `data/termTemplate.txt`, keeping `data/terms.json` alphabetized by canonical `name`.
2. Generate a UUID. `npm run assign-ids` fills any blank `id`, or a UUID can be generated before editing.
3. Use one controlled category and status, then verify aliases, tags, dates, historical context, and related terms against this contract.
4. If the ID is new, add it to a Supabase migration that seeds `glossary_vote_totals` with `term_id`, `term_name` and `term_category`. Renames/category changes also require target-metadata updates. Preserve the old slug in `legacySlugs`. Database reproduction verifies the migrated target registry against the canonical dataset.
5. Record factual and media sources in `CONTENT_SOURCES.md`. Do not copy third-party files into the repository without clear permission.
6. Run the complete local check:

   ```sh
   npm run check-content
   ```

`npm run validate-content` checks the current dataset. `npm run test-content-validator` runs deliberate in-memory corruptions covering the major failure classes; it never modifies `terms.json`.

The validator exits nonzero on errors and prints the offending term and field. Definition-length warnings do not fail the command, but should be reviewed before release.
