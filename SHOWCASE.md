# MCSR Glossary

## Problem

Minecraft speedrunning has a large amount of specialized terminology and technique-specific language. Phrases such as *mapless*, *blind travel*, *one cycle*, or *filtered seed* can make a run difficult to understand even when a newcomer knows Minecraft itself. Information is spread across rules, wikis, tool repositories, tutorials, and community knowledge.

MCSR Glossary organizes that vocabulary into one searchable, source-backed reference for newer runners and viewers.

## What I Built

- A responsive glossary with 80 published terms and stable shareable URLs.
- Ranked search across names, aliases, tags, categories, and definition text.
- Alphabetical browsing, combined filters, result counts, clear empty states, and random discovery.
- Complete term pages with aliases, review dates, tags, related-term cards, sources, voting, and correction suggestions.
- 21 attributed visual examples across 20 definitions, including click-to-load tutorials and original diagrams.
- Public aggregate statistics without exposing pending submissions or voter identifiers.
- A moderated contribution form with database validation and an offline clipboard fallback.
- Persistent light and dark themes and layouts tested from desktop to small mobile screens.

The published content remains in `data/terms.json`. Supabase supports community submissions and voting; it does not automatically publish definitions.

## Technical Work

- A data-driven vanilla HTML, CSS, and JavaScript frontend with no build framework.
- A shared structured content schema used by both browser code and Node validation.
- Ranked search and stable route-resolution functions covered by lightweight unit tests.
- A structured multimedia system with a provider allowlist, responsive rendering, lazy loading, attribution, safe fallback links, and no arbitrary iframe HTML.
- Supabase tables protected by Row Level Security and revoked anonymous table access.
- Atomic SQL voting that supports upvote, removal, downvote, and switching while returning authoritative totals.
- Browser voter UUIDs hashed with SHA-256 before storage; this is lightweight beta integrity, not an anti-abuse guarantee.
- Sanitized Markdown using vendored `marked` and DOMPurify, plus a restrictive Content Security Policy.
- Automated contract checks for IDs, aliases, routes, taxonomy, related terms, dates, media, and vote seeds.
- GitHub Actions validation and static deployment through GitHub Pages.
- Responsive, keyboard-accessible UI with click-to-load third-party media and reduced-motion support.

## Community / Open Source

The source, migration history, validation rules, research notes, and QA reports are public at <https://github.com/SirInfinite/mcsr-glossary>.

GitHub issue templates guide reports for incorrect definitions, missing terminology, website defects, and source improvements. Visitors can also submit new terms or suggest a correction from a term page. Both enter a private pending queue and require factual and Markdown review before a maintainer changes the canonical dataset.

`CONTENT_SOURCES.md` records the evidence and media provenance behind the current review, including official rules, MCSR Ranked documentation, primary tool repositories, Minecraft Wiki mechanics, established guides, and original tutorial sources.

## Scale

- 80 published terms, up from 52 in the released beta.
- 28 new terms and 21 substantially revised existing definitions in this iteration.
- 20 media-backed definitions containing 21 attributed media items.
- 64 unique source URLs recorded in the source register.
- 254 validated related-term links.
- 46 automated content-contract and UI-core tests, plus live Supabase integration checks.
- Six tracked Supabase migrations reproduced in the repository.

## What I Learned

- A content product needs a strict schema as much as an application does; stable IDs and validation prevent broken routes and relationships.
- Search quality depends on intent-aware ranking. Exact names and aliases should outrank broad definition matches.
- Public database keys are safe only when RLS, grants, and narrow RPC boundaries enforce the real authorization model.
- Vote totals and individual vote state must change in one database transaction to remain correct under concurrency.
- Embeds are a security and performance decision. A structured allowlist and click-to-load model is safer and faster than accepting arbitrary markup.
- Content credibility requires recording sources and uncertainty, especially when rules, legal mods, or competitive terminology can change.
- Browser QA, automated validation, accessibility checks, and live-backend tests find different classes of defects; none replaces the others.

## Demo Path

This sequence takes about four minutes.

1. **Homepage — 30 seconds.** Open <https://sirinfinite.github.io/mcsr-glossary/>. Explain the problem in the hero, point out the published-term and media counts, and show that this is an open-source early beta rather than a finished encyclopedia.
2. **Search and discovery — 35 seconds.** Press `/`, search `SSG`, and show that the alias ranks **Set Seed** first. Clear it, search `navigation`, then briefly open Filter to show categories and tags. Mention stable validation for aliases and related terms.
3. **Rich definition and media — 45 seconds.** Open **Mapless** from the visual-technique row. Walk through its metadata and newcomer-focused definition. Select the click-to-load tutorial and point out its caption, creator credit, original-source link, and privacy-enhanced YouTube host.
4. **Related learning — 25 seconds.** Open **Pie Chart** from Related terms, then use Back and Forward. Explain that the 254 relationships are validated against canonical term names.
5. **Reversible voting — 35 seconds.** On a term, choose Helpful, choose it again to return to neutral, then switch between Helpful and Needs work. Explain that one atomic Supabase RPC updates the hashed receipt and aggregate totals without client-side read-modify-write races.
6. **Community contribution — 30 seconds.** Select **Suggest an edit**. Show the prefilled term context, validation guidance, character count, and the statement that submissions are reviewed before publication. Close without sending demo content.
7. **Stats and project transparency — 30 seconds.** Open Stats to show term, category, tag, media, recency, and public aggregate-rating data. Point out that pending submissions and voter identifiers are deliberately excluded.
8. **Repository and engineering evidence — 40 seconds.** Open the repository. Show `data/terms.json`, `CONTENT_SOURCES.md`, `supabase/migrations/`, the GitHub Actions workflow, and `V0_2_QA.md`. Summarize the 46 automated checks, RLS model, security advisors, responsive QA, and Lighthouse results.
