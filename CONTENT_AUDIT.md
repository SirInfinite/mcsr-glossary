# MCSR Glossary v0.2 Content Audit

Audit date: 2026-09-02

Scope: every published entry in `data/terms.json`, the structured media attached to those entries, and the source record in `CONTENT_SOURCES.md`.

## Outcome

- 80 published terms, up from the v0.1 baseline of 52.
- 28 source-backed additions covering routing, structures, competitive terminology, navigation, and approved-tool context.
- 21 existing definitions received substantive clarity, scope, or rules-context revisions.
- 20 terms have structured media; 21 media items are recorded and attributed.
- All canonical names, aliases, UUIDs, routes, categories, tags, and related-term references pass automated validation.
- No raw iframe HTML, inline embed directives, invented quotations, unsupported term-origin dates, or unresolved related terms remain.

The audit does not claim that community language is permanently settled. Definitions and rules remain open to sourced corrections through the project issue and submission workflows.

## Research standard

Evidence was prioritized in this order:

1. Current Minecraft Java speedrunning rules and leaderboard pages.
2. Official MCSR Ranked documentation.
3. Primary tool repositories and their documentation.
4. Minecraft Wiki mechanics pages.
5. The official Minecraft Speedrunning resource index and maintained Metacor guide.
6. Established creator tutorials for visual execution examples.

Every factual or media source used in this pass is listed in `CONTENT_SOURCES.md`. Third-party media remains at its original source; the repository contains only two original project diagrams.

## New-term coverage

Atum, Blaze Bed, Bucket Portal, Buried Treasure, Desert Temple, End Entry, Flintless Portal, Forced Perch, Fortress Navigation, FSG, Glitchless, Half Bow, Lava Pool, Magma Ravine, Matchmaking, Microlensing, Nether Entry, Placement Match, Portal Room, RNG, Ruined Portal, Shipwreck, SpeedRunIGT, StandardSettings, Starter Staircase, Stronghold Navigation, Village, and WorldPreview.

## Existing definitions revised

Any%, Bastion, Classic, F3, Filtered Seed, Hypermodern, IGT, Leaderboard, Mapless, MCSR Ranked, Minecraft Speedrunning, Multi-Instance, Ninjabrain Bot, Pie Chart, Reset, RNG Standardization, RSG, SeedQueue, Set Seed, Speedrun.com, and Stronghold.

The revisions focused on:

- separating broad MCSR language from Java 1.16.1 RSG or Ranked-specific meaning;
- stating the exit-portal/credits finish condition accurately;
- distinguishing RSG, FSG, Set Seed, filtered seeds, and Ranked seeds;
- clarifying debug-screen and stronghold-navigation techniques;
- removing time-sensitive legality assumptions from tool definitions;
- explaining practical relevance without promotional claims.

## Taxonomy after review

| Category | Terms |
| --- | ---: |
| format | 8 |
| strategy | 6 |
| technique | 15 |
| terminology | 41 |
| tool | 10 |

The small five-category vocabulary remains intentional. Mode and version limitations stay in prose and tags until the full dataset can support honest mode/version filters.

## Rule-sensitive review queue

These entries are publishable with their current caveats but should be rechecked when upstream rules or software releases change:

- Atum, Multi-Instance, Ninjabrain Bot, SeedQueue, SpeedRunIGT, StandardSettings, and WorldPreview: approved versions/configuration can change.
- MCSR Ranked, Matchmaking, Placement Match, Forced Perch, Filtered Seed, and RNG Standardization: official format behavior can change between seasons.
- F3, Mapless, Microlensing, and Pie Chart: debug fields and profiler paths are version-specific.
- FSG and Glitchless: filters and permitted techniques are defined by the current category rules.

## Media review

- All 19 YouTube items (17 distinct video IDs) used by the dataset resolved during the 2026-09-02 review.
- YouTube is privacy-enhanced and click-to-load; no provider request is made merely by opening a term.
- Each item has a caption, credit, and direct source link.
- The two local SVG diagrams are original MCSR Glossary assets with descriptive alternative text and intrinsic dimensions.
- No third-party video or image was downloaded or rehosted.

## Remaining editorial limitations

- Reliable invention dates are unavailable for most community terms, so historical date fields remain empty instead of being guessed.
- Informal terms such as Classic and Half Bow can be used more loosely in conversation than in a scoped glossary definition.
- The glossary is an educational reference, not a substitute for the live rules, leaderboard, or official Ranked documentation.
- Community review is still valuable for regional phrasing, newly developed techniques, and changing competitive formats.

Recommendation: content is suitable for v0.2 showcase QA, provided automated validation, link checks, and the final browser review remain green.
