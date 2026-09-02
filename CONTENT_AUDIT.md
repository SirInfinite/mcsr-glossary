# MCSR Glossary v1 Content Audit

Audit date: 2026-09-01

Scope: all 15 entries currently present in `data/terms.json`. This is a content audit only; no glossary data was changed. Sources were prioritized in the requested order: official Minecraft speedrunning rules and leaderboards, official MCSR Ranked documentation, Minecraft Wiki mechanics pages, the official Minecraft Speedrunning videos-and-guides index, and established technique guides. YouTube availability was checked through YouTube's oEmbed endpoint.

Status meanings used here:

- **SAFE**: accurate enough to publish in v1; any recommendation is optional cleanup.
- **MINOR REVISION**: the core meaning is sound, but v1 should remove or qualify a misleading detail.
- **MAJOR REVISION**: the entry's present wording would teach a materially wrong or badly scoped concept.
- **REMOVE**: publication is not justified by the evidence found.

## Minecraft Speedrunning

Status: MINOR REVISION

Current issue: The name and `MCSR` alias are established and the `terminology` category and tags are reasonable. The definition, however, collapses the broad activity into Random Seed Any%: not every Minecraft speedrun uses a newly generated world, and not every category has defeating the Ender Dragon as its objective. For Java Any% Glitchless, killing the dragon is also not the official completion point; completion occurs when the credits sequence begins after the runner enters the exit End portal. `MCSR Ranked` is a valid related concept, but it is not a substitute for missing category concepts such as Random Seed and Set Seed. The exact 2014 creation date and 2024 update date have no cited provenance in the entry: **NEEDS HUMAN VERIFICATION**. `needsUpdating: false` understates the scope problem. There is no embedded media to verify.

Recommended correction: Define Minecraft speedrunning as completing a specified Minecraft goal under a category's rules as quickly as possible. Then identify Java Edition Any% Glitchless Random Seed as a prominent, narrower example: the runner uses an unknown seed, defeats the Ender Dragon, and enters the exit portal. Keep `MCSR` as the alias, but avoid implying that all MCSR is newly generated-world Any%. Treat the date fields as glossary-record metadata, or remove them from public display until their meaning and provenance are documented.

Current/historical context: Minecraft has multiple editions, categories, seed types, version groups, and timing rules. The current official Java leaderboard separately exposes Random Seed and Set Seed subcategories, so a generic definition must not bake in only one of them.

Sources:

- https://rules.minecraftspeedrunning.com/
- https://github.com/Minecraft-Java-Edition-Speedrunning/rules/blob/main/rules.typ
- https://www.speedrun.com/mc?rules=game

## Ludwigging

Status: REMOVE

Current issue: Ludwig Ahgren's Coal I run is documented by community video coverage, and the official Ranked documentation confirms Coal is the lowest rank. No authoritative MCSR source, established glossary, primary creator statement, or discoverable community usage was found for `Ludwigging` as an MCSR term. Searches for the exact word and the entry's example sentence produced no relevant MCSR usage. The definition and example therefore appear to be local joke copy rather than established terminology. The example is also an unattributed quote-like sentence and should not be presented as a quotation. The `clutch` tag conflicts with a definition about failure. The linked Ranked homepage returned HTTP 200 and is not broken. The 2014 creation date predates the documented 2025 Ludwig/Ranked context and cannot be correct as a term-origin date; the 2024 update date has the same problem. `needsUpdating: true` is appropriate. **NEEDS HUMAN VERIFICATION** if maintainers have private Discord/VOD evidence of established usage.

Recommended correction: Remove the entry from v1. Restore it only if a human editor can provide dated, independent community examples showing that MCSR participants actually use the word with a stable meaning. If restored, use a date tied to the attested coinage, remove the invented-looking quote, and replace `clutch` with a truthful tag.

Current/historical context: Ludwig's reaching Coal I can be discussed as a real recent community event, but a real event does not establish every derivative joke as glossary terminology. Coal I is a division within the official Coal rank, not evidence that this coined verb is universal or established.

Sources:

- https://wiki.mcsrranked.com/gameplay/elo_and_ranks
- https://www.youtube.com/watch?v=FRha1Mtweas
- https://mcsrranked.com/

## Any%

Status: MAJOR REVISION

Current issue: The name and broad `terminology` classification are sound, and the tags correctly identify a category. The definition incorrectly equates beating the game with killing the Ender Dragon; the official Java Any% Glitchless finish is the start of the credits after entering the exit End portal. “Golden standard used in the majority of ... leaderboards and tournaments” is an unsupported and overly universal claim. The two dialogue lines are unattributed editorial copy, and the second line is outside the Markdown blockquote because it lacks `>`. The video ID `rVs0EdiVefM` still resolves, but YouTube now titles it “MINECRAFT FORMER WORLD RECORD (6:50),” while the glossary heading still presents it as the current world record. That makes the media label outdated even though the video itself is available. `Set Seed` and `Random Seed` in `relatedTerms` do not exist as current entries. Both date fields are blank, and `needsUpdating: false` is incorrect.

Recommended correction: Define Any% as a category whose objective is to reach the ruleset's completion condition without a required completion percentage. Scope the Minecraft example to Java Any% Glitchless and state its actual finish condition. Explain that Random Seed and Set Seed are separate subcategories rather than implying that one video represents all Any%. Delete the dialogue unless its speakers and source can be cited. Relabel the video as lowkey's former 6:50 record, use the project's controlled YouTube Markdown form instead of a raw iframe, and either add the missing related entries or remove those dead relationships.

Current/historical context: The lowkey video is legitimate historical run footage, not a broken embed. Its own current title explicitly says “former world record,” and the live leaderboard is the correct source for a changing record. Any% rules and finish conditions are game- and category-specific; the `%` does not mean that killing a particular boss is universally the finish.

Sources:

- https://github.com/Minecraft-Java-Edition-Speedrunning/rules/blob/main/rules.typ
- https://www.speedrun.com/mc?rules=game
- https://www.youtube.com/watch?v=rVs0EdiVefM

## Blind

Status: MAJOR REVISION

Current issue: `Blind Travel` is the correct expanded name, and the strategy/stronghold/navigation tags are appropriate. The procedure is materially misleading. In the established Java 1.16 RSG route, blind travel means moving in the Nether to a chosen blind location and building an exit portal intended to land near a first-ring stronghold; the runner generally throws an eye after returning to the Overworld. The current steps instead say to return to the Overworld and then travel a calculated distance, which describes neither ordinary blind travel nor the distinct educated/calculated variants accurately. The `~1800` and `~2500` figures omit the dimension and method and are not supported as universal blind distances. Java first-ring strongholds can generate 1,280–2,816 blocks from the origin, so one or two fixed “typical” Overworld figures are not an adequate procedure. The quote-like sentence has no attribution. All four related terms are absent from the dataset. Both dates are blank and `needsUpdating: false` is wrong. Video `87B3A1klmbg` still resolves as skycrab1's “4:07 Blind,” but it is an example run, not sufficient documentation for the definition. The official resource index's older k4yfour guide is itself now titled “OUTDATED (check description).”

Recommended correction: Scope the definition to Java 1.16 RSG. State that a runner travels through the Nether to a selected coordinate, builds a second portal without first locating the stronghold by eye throws, then uses an eye after exiting to find or correct toward the stronghold. Distinguish blind travel from educated travel (one angle used to choose a Nether direction) and calculated travel (stronghold position/distance estimated before the final Nether portal). Remove the universal distance bullets and unattributed quote. Retain the skycrab video only as a labeled run example, not a tutorial, and use a current technique source for instruction.

Current/historical context: Blind-coordinate selection and calculator-assisted travel have evolved. Ninjabrain Bot's archived official repository explicitly distinguishes evaluation of blind coordinates and documents calculated-travel history. A glossary entry should teach the stable concept without freezing one obsolete coordinate chart into the definition.

Sources:

- https://minecraft.wiki/w/Stronghold
- https://www.minecraftspeedrunning.com/public-resources/videos-and-guides
- https://www.youtube.com/watch?v=0N8Wj8hOVKM
- https://github.com/Minecraft-Java-Edition-Speedrunning/archive-ninjabrain-bot
- https://www.youtube.com/watch?v=87B3A1klmbg&t=221s

## One Cycle

Status: SAFE

Current issue: The core definition is accurate enough for v1: a one cycle kills the dragon during a single perch at the exit portal, normally with bed explosions. Respawn anchors can also explode in the End and can be used as a fallback/variant, so mentioning them is not false, although `beds & respawn anchors` may sound as though both are required. The generic `tech` category is inconsistent with other category labels, and tags and related terms are empty, but those are taxonomy completeness issues rather than factual blockers. The 2024 dates appear to be glossary-record dates rather than technique-origin dates; that meaning is **NEEDS HUMAN VERIFICATION**. `needsUpdating: false` is reasonable for the definition. There are no links or videos to verify.

Recommended correction: No factual rewrite is required for launch. Optional clarity: “Defeating the Ender Dragon with explosions during one perch at the exit portal, most commonly using beds; respawn-anchor variants also exist.” Add Java/End context and normalize the category/tags during the taxonomy cleanup.

Current/historical context: Beds explode when used in the End, which is the mechanic behind the standard one-cycle. Established MCSR guides separately teach a one-cycle bed setup and anchor fallback, so the stable concept is the single-perch kill, not possession of one exact set of explosive items.

Sources:

- https://www.minecraftspeedrunning.com/public-resources/videos-and-guides
- https://www.youtube.com/watch?v=JaVyuTyDxxs
- https://github.com/Metacor/Minecraft-Speedrun-Guide
- https://minecraft.wiki/w/Bed
- https://minecraft.wiki/w/Respawn_Anchor

## Zero Cycle

Status: MINOR REVISION

Current issue: The name and core contrast with a one-cycle are accurate: the dragon is damaged on its initial flight before a normal perch cycle. The definition is too vague to be instructional and makes `beds & respawn anchors` sound like a single mandatory recipe. “Building to certain coordinates” also hides that established setups depend on an End spike/tower, setup orientation and height, dragon path/height, and the chosen explosive method. No Java/version context is given. The category is the inconsistent generic `tech`, with no aliases, tags, or related terms. The 2024 dates are unverified as technique dates, and `needsUpdating` should be true until the scope is clarified. There is no embedded guide.

Recommended correction: Define zero cycle as an advanced End-fight strategy that intercepts and kills the Ender Dragon during its initial flight, before it completes a perch cycle, using a height- and direction-specific setup on an obsidian spike and timed explosions. Say that bed and respawn-anchor setups are variants rather than implying that both are always used. Scope detailed coordinates to the applicable Minecraft version and setup, and link the established T_Wagz guide from the official MCSR resources page.

Current/historical context: The technique depends on dragon movement behavior and has multiple setups. MCSR Ranked even modifies/standardizes relevant dragon target-height and direction RNG, so vanilla RSG and Ranked execution should not be presented as mechanically identical in every detail.

Sources:

- https://www.minecraftspeedrunning.com/public-resources/videos-and-guides
- https://www.youtube.com/watch?v=iClDGWL0e5s
- https://wiki.mcsrranked.com/gameplay/rng
- https://github.com/Metacor/Minecraft-Speedrun-Guide

## Pie Chart

Status: MAJOR REVISION

Current issue: The debug profiler and its `Shift+F3`/`F3+1` shortcuts are real, but those key combinations are shortcuts rather than clean aliases for the technique. The definition's “hover over certain regions” description is false: the profiler is navigated with numbered keys, and speedrunners use version-specific profiler paths, render-distance changes, chunk boundaries, and the appearance of block-entity/spawner work to infer a structure's direction. A spawner signal can also have false positives, including a treasure bastion, so a spike is not unconditional proof of a fortress. The entry should distinguish the profiler itself from `pie-ray`/`piedar`, the specific locating technique. It also omits that this is Java Edition debug functionality and that profiler paths change by version. Both related terms are absent. The embedded YouTube ID `SuPBDxGxQ4I` returned 404 through YouTube oEmbed and is broken. The 2026-01-01 dates appear to be import placeholders unless proven otherwise, and `needsUpdating: false` is wrong.

Recommended correction: Define the Pie Chart as Java's debug profiler, then describe pie-ray as a version-specific use of its block-entity/spawner data: reset the relevant profiler state, alter render distance, cross chunk boundaries, and infer the loaded spawner's direction, with explicit false-positive and version caveats. Do not say the user hovers over chart regions. Move the shortcuts into usage notes, normalize `Shift+F3`, and replace the dead video with a checked guide linked by the official Minecraft Speedrunning resource index.

Current/historical context: The profiler's keybind changed (`Shift+F3` is the older/common MCSR instruction, while current Java also documents `F3+1`), and its internal menu path has changed across versions. The established 1.16.1 guide uses the Tick → Level → Entities → Block Entities path and explicitly warns about treasure-bastion spawner false positives; that path should not be advertised as universal for all current versions.

Sources:

- https://minecraft.wiki/w/Debug_screen
- https://github.com/Metacor/Minecraft-Speedrun-Guide
- https://www.minecraftspeedrunning.com/public-resources/videos-and-guides
- https://www.youtube.com/watch?v=SuPBDxGxQ4I

## Mapless

Status: MAJOR REVISION

Current issue: `Mapless Treasure` is an established alias and the tags identify the correct Overworld strategy context. The central explanation is materially incomplete: knowing that a Java buried-treasure chest is at chunk-relative `(9, ~, 9)` tells the runner where to dig only after the correct treasure chunk has been identified. Merely calculating the current chunk with F3 does not reveal which arbitrary chunk contains treasure. Mapless first uses version-specific debug-profiler/chunk-boundary behavior to locate the chest's chunk, then uses `9,9` inside that chunk. The `9,9` rule is also Java-specific; Bedrock uses a different placement. The loot paragraph is substantially correct for Java—Heart of the Sea is guaranteed and cooked fish, iron, and TNT can appear—but should not distract from the missing locating step. The embedded ID `Xf5oTYEMZjw` returned YouTube oEmbed 404 and is broken. Tags are redundant (`tech` category plus `tech` tag), related terms are empty, the identical 2026-01-01 dates need provenance, and `needsUpdating: false` is wrong.

Recommended correction: Explain both stages: use the applicable Java-version profiler path and chunk boundaries to isolate the buried-treasure chunk, then move to chunk-relative X/Z `9,9` and dig for the chest. State the Java/version limitation and avoid claiming that coordinates alone find an unmapped treasure. Replace the dead video; the official resource index links MoleyG's available mapless guide, and k4yfour published a 2026 guide that explicitly separates profiler paths for different Java versions.

Current/historical context: Mapless is strongly version-sensitive because the debug-profiler path changed repeatedly. The underlying Java chest position remains `9,9`, but that mechanic is not the complete mapless technique. This entry therefore cannot safely be repaired by adding only the word “Java.”

Sources:

- https://minecraft.wiki/w/Buried_Treasure
- https://www.minecraftspeedrunning.com/public-resources/videos-and-guides
- https://www.youtube.com/watch?v=ho1rwmooHRg
- https://www.youtube.com/watch?v=e-wTSITfJFo
- https://www.youtube.com/watch?v=Xf5oTYEMZjw

## Hypermodern

Status: MAJOR REVISION

Current issue: `Hypermodern` is attested in established 1.16.1 RSG guides, but the current entry treats it as a timeless philosophy and “dominant” style across `1.16+`. That wording erases its route-specific meaning and makes a time-sensitive popularity claim without evidence. The established route description includes selective coastal/mapless overworld starts, fast Nether entry, microlensing, bastion routing, pie-ray, fortress, Nether travel, triangulation, and an optimized End fight—not merely “bastion first,” gold counts, beds, and eyes. One-cycle/zero-cycle execution is not uniquely hypermodern. The claimed origin and `Hyper` alias were not established by an authoritative source: **NEEDS HUMAN VERIFICATION**. The final sentence is an unattributed quote-like slogan. `run type` is inconsistent with the category taxonomy, `Bastion` is a missing related entry, the January 1 dates look like import placeholders, and `needsUpdating: false` is wrong.

Recommended correction: Define Hypermodern narrowly as the highly selective, reset-heavy Java 1.16.1 RSG route family documented by k4yfour and later guides, naming the characteristic route sequence instead of calling it a universal optimization philosophy. Avoid “dominant today” unless the statement is dated and sourced. Remove the slogan and unsupported origin claim. Keep `Hyper` only if a human editor can provide community usage, and distinguish vanilla RSG usage from MCSR Ranked's filtered seeds and standardized RNG.

Current/historical context: Hypermodern emerged in the evolving 1.16 RSG meta and is useful historical/community vocabulary, but “1.16+” is not a stable ruleset. Ranked, later Java versions, and other categories can share individual techniques without making every optimized route Hypermodern.

Sources:

- https://www.youtube.com/watch?v=gAHMJfsrHe4
- https://github.com/Metacor/Minecraft-Speedrun-Guide
- https://minecraft.wiki/w/Tutorial:Speedrun
- https://wiki.mcsrranked.com/gameplay/seed

## Reset

Status: MINOR REVISION

Current issue: The core noun/verb meaning is accurate. `Resetting` is a valid grammatical alias, while `Reset Grinding` as a fixed alias is not supported by the reviewed authoritative material: **NEEDS HUMAN VERIFICATION**. The quantitative claims (“thousands ... per session” and “1,500 resets” in two hours) have no source, and the latter is written as a quotation without an attributable speaker. “Most competitive runners have macros or mods” needs rules context: current official Java rules prohibit triggering macros during a run but permit player-triggered reset macros, including multiple simultaneous resets, and separately regulate allowed reset mods. The “bad spawn (in the ocean)” example is misleading for modern 1.16 RSG because favorable coastal/ocean structure starts are central to Hypermodern routing. All three related terms are absent. The January 1 dates need provenance and `needsUpdating: false` is wrong. There are no embedded links or videos.

Recommended correction: Keep the concise core definition. Say that RSG runners abandon seeds that do not meet route-specific viability criteria, and that high-volume multi-instance resetting may use only rules-permitted mods or player-triggered reset macros. Remove the unsourced counts, quotation, and generic “ocean is bad” trigger. Retain examples that are actually route-dependent rather than universally bad. Remove `Reset Grinding` unless community evidence is supplied.

Current/historical context: Reset volume and desirable spawn features vary enormously by route, runner, hardware, category, and era. Modern 1.16 RSG deliberately selects many coastal starts, while other routes may reject them. The stable glossary concept is abandoning an attempt and generating/starting another, not one era's reset rate.

Sources:

- https://github.com/Minecraft-Java-Edition-Speedrunning/rules/blob/main/rules.typ
- https://github.com/Metacor/Minecraft-Speedrun-Guide
- https://minecraft.wiki/w/Tutorial:Speedrun

## Split

Status: MINOR REVISION

Current issue: The definition of a split as a recorded checkpoint time and the LiveSplit link are sound. The listed checkpoints are runner-defined examples, not an official universal MCSR split set. “Killing the dragon” can be an intermediate split, but the official Java Any% Glitchless run does not finish there; it finishes on the credits transition after entering the exit portal. “Finish (credits)” is directionally correct but should use the exact category finish event. The plural alias `Splits` is harmless. The mixed grammatical category `noun, verb` does not fit the rest of the taxonomy, the `general` tag is low-information, and `Pace` is a missing related term. The January 1 dates need provenance and `needsUpdating: false` should be true until the finish language is corrected. The LiveSplit URL returned HTTP 200.

Recommended correction: Define a split as the cumulative time recorded at a runner-selected checkpoint; optionally distinguish the segment as the time between two splits. Label the checkpoint list as examples and make the final example “enter exit End portal / credits begin” for the cited Java category. Keep the LiveSplit link and normalize category/tags with the rest of the glossary.

Current/historical context: Split layouts vary by runner and tool. LiveSplit supports personal-best comparisons and game time, but neither LiveSplit nor the Minecraft rules prescribe the five checkpoints currently listed.

Sources:

- https://livesplit.org/
- https://github.com/LiveSplit/LiveSplit
- https://github.com/Minecraft-Java-Edition-Speedrunning/rules/blob/main/rules.typ

## PB

Status: MINOR REVISION

Current issue: `PB` and `Personal Best` are correct terminology, and “your fastest completed run” captures the core meaning. It needs category/ruleset and timing-method context: one runner can have different PBs for Random Seed, Set Seed, versions, and real-time/game-time comparisons. “Primary goal for most runners,” “core reward loop,” and the `99%` quote are subjective editorial claims with no cited speaker or evidence. `term` is an inconsistent category and `general` is a weak tag. `Pace` is a missing related term. The January 1 dates have no documented meaning, and `needsUpdating: false` should change until the editorial quote is removed. There are no links or videos.

Recommended correction: Use a factual definition: “Personal Best: a runner's fastest valid completion in a particular category, ruleset, and timing method.” Remove the motivational paragraphs and quote, or move clearly authored encouragement outside the factual glossary definition. Retain the `Personal Best` alias and related `WR`/`Split` links.

Current/historical context: A PB is personal and category-specific, whereas a leaderboard record compares runners. LiveSplit's data model and UI explicitly maintain a Personal Best comparison, supporting the term without the unsourced claims about what motivates a percentage of runners.

Sources:

- https://github.com/LiveSplit/LiveSplit
- https://github.com/LiveSplit/LiveSplit.github.io/blob/master/faq.md
- https://www.speedrun.com/mc?rules=game

## WR

Status: MINOR REVISION

Current issue: `WR`/`World Record` and the basic fastest-run concept are correct. “Fastest verified run ever submitted” should say fastest accepted/verified run on the relevant leaderboard; merely submitting a run does not make it a record, and `WR` can also be used outside Speedrun.com-hosted categories. Category and “version” alone are not always enough—seed type, glitch rules, edition, platform, and timing method can distinguish boards. “Broken hundreds of times” and “a small number of elite runners” are unsupported. The moderation sentence is broadly correct for Speedrun.com leaderboards. The canonical Minecraft leaderboard is real, but a scripted request received HTTP 403 from Speedrun.com's anti-bot layer; normal availability should be checked manually before release rather than marking the link broken. `Leaderboard` and `Speedrun.com` are absent related terms. The January 1 dates need provenance and `needsUpdating: false` should be true.

Recommended correction: Define WR as the fastest accepted valid time on a specified category/variables leaderboard as of a stated date. Keep Speedrun.com as the official Minecraft leaderboard example, not as part of a universal definition. Remove the unsupported historical count and elite-runner claim. Link readers to the live board rather than hard-coding a current holder or time.

Current/historical context: Records are dynamic and board-specific. Speedrun.com game moderators review submissions against each board's rules; the official Minecraft rules are maintained separately and change over time. Historical claims about how often the record changed require a leaderboard-history dataset, which this entry does not cite.

Sources:

- https://www.speedrun.com/mc?rules=game
- https://rules.minecraftspeedrunning.com/
- https://www.speedrun.com/support/learn/moderation-rules

## MCSR Ranked

Status: MAJOR REVISION

Current issue: The name, `Ranked` alias, 1v1 premise, matchmaking, Elo changes, seasonal ladder, and same-seed separate-world race are substantially real. Four important details are wrong or incomplete. First, the rank list omits **Emerald** between Gold and Diamond; the official order is Coal, Iron, Gold, Emerald, Diamond, Netherite. Second, `ELO` should be styled `Elo`, the official name. Third, Ranked is not simply “its own client”: the official distribution is a Fabric mod/modpack for Minecraft Java 1.16.1, installable through supported launchers. Fourth, “race to kill the Ender Dragon” omits the completion step; official Ranked Weekly Race documentation requires defeating the dragon and passing through the exit portal, while the official mod page says “first to beat the game wins.” The seeds are not unmodified generic RSG seeds: Ranked/Casual use filtered seeds, independent Overworld and Nether seeds, and standardized RNG. “One of the most active” and “produced many ... recognizable players” are promotional claims without a defined metric. `ELO` and `RSG` are absent related entries, while `Ludwigging` should be removed. The homepage link returned HTTP 200. The January 1 dates need provenance and `needsUpdating: false` is plainly wrong.

Recommended correction: Describe MCSR Ranked as a Minecraft Java 1.16.1 Fabric mod/modpack that runs head-to-head races in separate worlds using the same filtered match seed and standardized RNG. State that Ranked matchmaking uses Elo; list all six ranks in order; explain that a standard completion includes the exit portal; and briefly distinguish Ranked, Casual, Private Rooms, and Weekly Race rather than implying one format is the entire platform. Remove unmeasured popularity copy. Use `Elo` consistently and replace dead related-term relationships.

Current/historical context: Ranked is not vanilla RSG with only an overlay. It intentionally filters starts and Nether structure relationships and standardizes trades, blaze drops, eye breaks, dragon behavior, and more. Private Rooms can change categories/rules, while Weekly Race is a repeated-attempt set-seed mode, so claims should specify standard Ranked matchmaking when that is what they mean.

Sources:

- https://wiki.mcsrranked.com/gameplay/elo_and_ranks
- https://wiki.mcsrranked.com/gameplay/seed
- https://wiki.mcsrranked.com/gameplay/rng
- https://wiki.mcsrranked.com/gameplay/weekly_race
- https://wiki.mcsrranked.com/install/download
- https://modrinth.com/mod/mcsr-ranked

## Classic

Status: MAJOR REVISION

Current issue: `Classic` is real in at least one authoritative Ranked context, but the entry presents one broad historical meaning as universal. Official MCSR Ranked defines its “Classic” achievement precisely as winning a match without entering a bastion. In broader 1.16 RSG guides, “classic strats” can refer to older/no-bastion approaches, including trading with ordinary piglins. The entry's statement that bastion routes “allow runners to obtain Blaze Rods through Piglin bartering” is false: piglins barter items such as Ender Pearls and obsidian; blaze rods come from killing Blazes. This also makes the final example's “Blaze Rods instead of Piglin bartering” a false choice, because runs need blaze powder and pearls for different parts of Eyes of Ender. “Original strategy,” the fallback conditions, the `Classic Run` alias, and the unattributed quote need historical/community evidence: **NEEDS HUMAN VERIFICATION**. All four related terms are absent. Dates are blank and `needsUpdating: false` is wrong. There is no embedded source.

Recommended correction: Choose and label a scope. For Ranked, define Classic as completing and winning a match without entering a bastion. If the glossary also wants the broader RSG usage, explain separately that “classic” can refer to older or no-bastion 1.16 routes, where runners still kill Blazes for rods and may barter gold with non-bastion piglins for pearls and other supplies. Delete the blaze-rod barter claim and unattributed quote. Do not assert a single origin until primary historical evidence is found.

Current/historical context: Bastions changed how runners acquire and organize gold/piglin bartering; they did not make blaze rods a piglin trade. The official Ranked achievement provides a current exact meaning, while community RSG usage can be looser. Presenting both as one universal route is the source of the current contradiction.

Sources:

- https://wiki.mcsrranked.com/gameplay/achievements
- https://wiki.mcsrranked.com/gameplay/rng
- https://github.com/Metacor/Minecraft-Speedrun-Guide
- https://minecraft.wiki/w/Bartering

## Global Findings

- **Factual patterns:** The dataset repeatedly describes Java 1.16/1.16.1 RSG techniques as universal Minecraft mechanics. Edition, version, category, seed type, timing method, and Ranked-vs-vanilla context need to be explicit wherever they change the claim.
- **Finish condition:** Several definitions stop at killing the Ender Dragon. Official Java Any% Glitchless completion occurs after entering the exit End portal when the credits sequence begins; official Ranked material also treats passage through the exit portal as part of completion.
- **Taxonomy:** Categories currently mix semantic classes and grammatical labels: `terminology`, `meme`, `strategy`, `tech`, `run type`, `noun, verb`, and `term`. Tags mix concepts with duplicate category words. A small v1 vocabulary such as `terminology`, `technique`, `strategy`, and `community` would be more truthful without building a complex taxonomy.
- **Related-term integrity:** 22 related-term values point to entries that do not exist. The affected values are Set Seed, Random Seed, Triangulation, Stronghold, Nether Fortress, Eye of Ender, Blaze, Bastion, RSG, Seed, Spawn, Pace, Leaderboard, Speedrun.com, ELO, Bastion Route, Blaze Rods, and Piglin Bartering (some appear in more than one entry). Either add independently audited entries later or remove the dead relationships for v1.
- **Recurring outdated assumptions:** The entries freeze techniques to vague, older 1.16 instructions while calling them current for `1.16+`; they omit Ranked's filtered seeds and standardized RNG; and they treat technique-specific coordinate/profiler paths as universal.
- **Unsupported quotations:** Any%, Blind, Hypermodern, Reset, PB, Ludwigging, and Classic contain dialogue or quote-formatted prose with no speaker/source. These should be treated as editorial placeholder copy, not community quotations, unless provenance is supplied.
- **Dates and update flags:** The shared 2014/2024 values, blank dates, and repeated `2026-01-01` values do not document whether they mean term origin, entry creation, import, or last factual review. Their provenance **NEEDS HUMAN VERIFICATION**. Thirteen entries that require factual revision currently have `needsUpdating: false`.
- **Broken media:** Pie Chart video `SuPBDxGxQ4I` and Mapless video `Xf5oTYEMZjw` returned YouTube oEmbed 404. The Any% and Blind videos resolve. Any%'s video is now explicitly titled as a former world record. The official resource index provides available replacement guides.
- **Markdown/media consistency:** Any% and Blind use raw iframes while Pie Chart and Mapless use the controlled `@[youtube](ID)` syntax. Any%'s second dialogue line falls out of its blockquote. Content should use one controlled video syntax and label historical footage accurately.
- **Questionable/invented terminology:** `Ludwigging` could not be substantiated as MCSR terminology and should not ship. `Hyper` and `Reset Grinding` as fixed aliases, and the broad historical origin claims for Hypermodern and Classic, need human/community-source verification.
- **Citation coverage:** None of the definitions currently cites its factual claims. For v1, at minimum the changing or version-sensitive entries should link an official rule/wiki or the established primary technique guide identified above.

## Priority Corrections

### P0 — should not launch in current form

- **Ludwigging:** Remove until independent, dated MCSR usage establishes the term; the current quote and dates are unsupported.
- **Any%:** Correct the exit-portal finish condition, remove the universal “golden standard” claim and unattributed dialogue, and label the 6:50 video as a former record.
- **Blind:** Replace the incorrect Overworld-travel procedure and unsupported fixed distances; distinguish blind from educated/calculated travel.
- **Pie Chart:** Replace the false hover-based explanation, add Java/version and false-positive context, and replace the 404 video.
- **Mapless:** Add the missing profiler/chunk-identification stage, scope `9,9` to Java, and replace the 404 video.
- **Hypermodern:** Replace the universal/current-dominance framing with a sourced Java 1.16.1 route definition and remove the unsupported slogan/origin claim.
- **MCSR Ranked:** Add Emerald, correct `Elo`, describe the Fabric mod/modpack and filtered/standardized seeds, and include the exit-portal completion step.
- **Classic:** Remove the false blaze-rod bartering claim and define a specific Ranked or broader RSG context rather than merging them.

### P1 — should be corrected for v1

- **Minecraft Speedrunning:** Make the umbrella definition category-neutral, then present RSG Any% as a scoped example.
- **Zero Cycle:** Clarify initial-flight interception, setup/version dependence, and bed versus anchor variants.
- **Reset:** Remove unsourced reset counts/quote, correct the ocean-start example, and state the actual macro restriction.
- **Split:** Mark the checkpoint list as optional and correct the final split to the exit-portal/credits transition.
- **PB:** Add category/ruleset/timing scope and remove subjective percentage/motivational claims from the factual definition.
- **WR:** Define the record as an accepted leaderboard result with all relevant category variables; remove unsupported historical/popularity claims.
- **Cross-entry data cleanup:** Resolve the 22 missing related-term targets, normalize the small category vocabulary, correct `needsUpdating`, and document or clear ambiguous date metadata before those fields are presented as factual history.
- **Quote cleanup:** Remove every unattributed quote-like sentence unless a speaker and source can be supplied.

### P2 — acceptable for v1 but worth improving

- **One Cycle:** Optionally clarify that beds are standard and respawn anchors are a variant/fallback; add Java context, useful tags, and related terms.
- **Source presentation:** Add compact “Further reading” links to official rules/mechanics or primary technique guides after factual corrections are applied.
- **Media formatting:** Convert retained videos to the controlled YouTube syntax and describe each as tutorial, demonstration, or historical run.
- **Metadata provenance:** If creation/update dates are internal editorial timestamps rather than term-history claims, document that meaning in the schema and UI.
