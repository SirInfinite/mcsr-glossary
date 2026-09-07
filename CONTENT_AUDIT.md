# MCSR Glossary Full Content Audit

Audit date: 2026-09-03

Scope: every published entry in `data/terms.json`, all structured media, aliases, status classifications, related-term links, and the term-by-term source ledger in `CONTENT_SOURCES.md`.

## Outcome

- 100 published terms, rebuilt from a starting set of 80 unverified entries.
- All 80 starting concepts met the admission standard; 78 retain their prior canonical name, while Blind became Blind Travel and Bucket Portal became Lava Pool Portal.
- 20 evidence-supported terms were added after independent candidate review.
- All 100 definitions were rewritten from the research, not lightly revised from the previous copy.
- 21 unsupported aliases were removed and 37 verified aliases were added.
- 91 terms are current, one is historical, and eight are legacy.
- 19 terms contain structured inline media; 20 media items are recorded and attributed.
- Every canonical name, alias, UUID, route, category, status, date, media reference, tag, and related-term reference passes automated validation.

The full decision record, including rejected candidates and sources unavailable to this environment, is in `TERM_RESEARCH_REPORT.md`. The per-term evidence is in `CONTENT_SOURCES.md`.

## Admission and research standard

A term was admitted only when at least one of these standards was met:

1. A strong primary or authoritative MCSR source explicitly established the terminology or technique.
2. At least two independent community sources demonstrated substantially the same usage.
3. Enough dated evidence established a genuine obscure or historical term.

Community usage and the underlying Minecraft mechanic were checked as separate questions. Primary rules, MCSR Ranked documentation, tool repositories, runner-authored guides, public community discussions, and technical Minecraft references were used according to the claim being verified. Direct Discord research was unavailable; no private Discord access is claimed.

## Taxonomy after rebuild

| Category | Terms |
| --- | ---: |
| format | 13 |
| strategy | 10 |
| technique | 22 |
| terminology | 43 |
| tool | 12 |

The compact five-category vocabulary remains intentional. Mode and version scope stays in the researched prose and tags rather than adding speculative filter dimensions.

## Status review

`current` identifies terminology that remains relevant in present community use. `historical` identifies a real term whose described system no longer exists. `legacy` identifies terminology that remains understood but whose original route or tool role is less common today.

- Historical: Forced Perch.
- Legacy: Axis Calculated, Calculated Travel, Divine Travel, Educated Travel, Hypermodern, LiveSplit, Multi-Instance, and Perfect Travel.

Each non-current entry has a required public status indicator and a sourced historical note. Classic remains current because the label is still used even though the route style it describes is older.

## Media review

- All media remains in the safe structured inline model; no arbitrary iframe HTML was introduced.
- The final dataset contains 18 YouTube embeds and two original local SVG diagrams.
- One duplicate starting embed was removed, four items were moved to the most relevant surviving term, and three older videos were replaced with stronger explanations.
- Every item has alternative text or an accessible title, a concise caption, a credit, and a direct source URL.
- Third-party media remains hosted by its source; no third-party image or video was copied into the repository.

## High-risk claim review

The final pass separately rechecked every historical and legacy classification, all explicit dates, origin or first-use claims, strategy-replacement claims, mutable legality statements, and version boundaries. Unsupported origins and first-use claims were not published. Mutable rules and service behavior are either tied to the current authoritative source or worded with a maintenance caveat.

A randomized 15-term source audit initially identified seven narrow wording or alias issues. Each was corrected, and three independent read-only rechecks passed all 15 entries with zero unsupported published claims remaining in the sample.

## Maintenance-sensitive entries

These entries meet the publication standard but should be rechecked when their upstream rules, software, or service changes:

- Atum, Multi-Instance, Ninjabrain Bot, SeedQueue, SpeedRunIGT, StandardSettings, and WorldPreview: approved versions and configuration rules can change.
- Elo, Matchmaking, MCSR Ranked, Placement Match, Filtered Seed, Forced Perch, and RNG Standardization: service rules can change between Ranked seasons.
- F3, Mapless, Microlensing, Pie Chart, Pie-Ray, and Preemptive Navigation: debug behavior is version-specific.
- FSG, Seedbank, ZSG, and Glitchless: filters and legal techniques are governed by live category rules.

This rebuild establishes evidence for the published content as researched on 2026-09-03; it does not claim that community vocabulary or live rules are permanently fixed.

## Final verification

- 33 content-validator tests and 24 UI-core tests passed.
- The live voting integration test passed and restored its target to the baseline totals.
- The source-ledger audit found exactly 100 matching term sections and 508 unique public URLs.
- Browser checks passed for 29 representative term-page loads, including ten current terms, six historical/legacy terms, and six inline-media terms.
- Responsive captures at 1440×900, 1024×768, 768×1024, 390×844, and 360×800 showed no horizontal overflow.
- The browser recorded zero page exceptions, console errors, local request failures, or HTTP error responses.
