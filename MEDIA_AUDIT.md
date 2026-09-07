# Media audit

Completed curation and verification: 2026-09-07. Branch: `content/media-quality-pass`. Starting commit: `c14df36`; baseline inventory commit: `b3a670f`. This is a local media/content pass; nothing was pushed, merged, tagged or released.

## Result and scope

| Metric | Starting | Final |
| --- | ---: | ---: |
| Media items | 20 | 25 |
| Terms containing media | 19 | 24 |
| YouTube items | 18 | 23 |
| Unique YouTube uploads | 17 | 22 |
| Original repository SVG images | 2 | 2 |
| Twitch / GIF / native video / external-link items | 0 | 0 |
| Glossary terms | 100 | 100 |

Final dispositions: **KEEP 3 · IMPROVE 14 · REPLACE 2 · MOVE 0 · REMOVE 1 · ADD 6**. Improvements include timestamp and caption changes; MOVE is reserved for relocating an existing inline slot. Additions have new inline placements. The two replacement uploads do not count as additions.

One broken inline embed was found and replaced: Stronghold Navigation's former k4yfour upload. Its watch page still works. No final source was deleted, redirected to unrelated material, or unavailable at the recorded check. Perch was removed for relevance, not source failure.

The approved UI, all 100 researched definitions (ignoring whitespace and media tokens), categories, statuses, routes, Supabase behavior, and review flags are preserved. The only definition edits introduce paragraph breaks/media tokens or remove the Perch token. No new providers, runtime dependencies, third-party scripts or CSP origins were added. Statistics remain in this report and the existing Stats view.

## Initial inventory


20 items across 19 terms; 18 YouTube embeds and 2 original repository SVGs. No published Twitch/GIF/native-video/external-link items.

Every current item follows its first explanatory paragraph except Triangulation's second item, which follows its second paragraph. YouTube frames initialize eagerly with no autoplay; SVG images load lazily with explicit dimensions and an accessible lightbox. Source health, exact segment relevance and all mobile rendering are being checked rather than inferred from valid metadata.

| Term | Provider | Source | Index / start | Caption | Credit | Dimensions | Initial review |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Blaze Bed | youtube | [3TD4jkuT8QA](https://www.youtube.com/watch?v=3TD4jkuT8QA) | 0; 0s | Open and enclosed Blaze Bed setups | [k4yfour](https://www.youtube.com/@k4yfour) | 16:9 iframe | Intake recorded; resolved below |
| Blind Travel | youtube | [0N8Wj8hOVKM](https://www.youtube.com/watch?v=0N8Wj8hOVKM&t=81s) | 0; 81s | Blind Travel explained and demonstrated | [BoomerPlayz](https://www.youtube.com/@boomerplayz1) | 16:9 iframe | Intake recorded; resolved below |
| Bridge Bastion | youtube | [2pzMpX1RJGI](https://www.youtube.com/watch?v=2pzMpX1RJGI&t=128s) | 0; 128s | Bridge Bastion structure overview | [T_Wagz](https://www.youtube.com/@TWagz) | 16:9 iframe | Intake recorded; resolved below |
| Divine Travel | youtube | [SXem01c44-I](https://www.youtube.com/watch?v=SXem01c44-I) | 0; 0s | Divine Travel conditions and fossil setup | [k4yfour](https://www.youtube.com/@k4yfour) | 16:9 iframe | Intake recorded; resolved below |
| Educated Travel | youtube | [0N8Wj8hOVKM](https://www.youtube.com/watch?v=0N8Wj8hOVKM&t=516s) | 0; 516s | Educated Travel explained | [BoomerPlayz](https://www.youtube.com/@boomerplayz1) | 16:9 iframe | Intake recorded; resolved below |
| Fortress Navigation | youtube | [swSbv4AImzI](https://www.youtube.com/watch?v=swSbv4AImzI&t=87s) | 0; 87s | Fortress structure cues and spawner navigation | [Lucas Chan](https://www.youtube.com/@PupleeL) | 16:9 iframe | Intake recorded; resolved below |
| Housing Bastion | youtube | [BoNr-pbEITM](https://www.youtube.com/watch?v=BoNr-pbEITM&t=132s) | 0; 132s | Housing Units structure overview | [T_Wagz](https://www.youtube.com/@TWagz) | 16:9 iframe | Intake recorded; resolved below |
| Lava Pool Portal | youtube | [La-yHiEr7QM](https://www.youtube.com/watch?v=La-yHiEr7QM) | 0; 0s | Eight-second lava-pool portal build | [unfried EXTRA](https://www.youtube.com/@unfriedextra) | 16:9 iframe | Intake recorded; resolved below |
| Mapless | youtube | [e-wTSITfJFo](https://www.youtube.com/watch?v=e-wTSITfJFo&t=19s) | 0; 19s | Mapless buried-treasure finding across Java versions | [k4yfour](https://www.youtube.com/@k4yfour) | 16:9 iframe | Intake recorded; resolved below |
| Microlensing | youtube | [jvTfMLPnMSw](https://www.youtube.com/watch?v=jvTfMLPnMSw&t=68s) | 0; 68s | Original 2020 bastion microlensing guide | [k4yfour](https://www.youtube.com/@k4yfour) | 16:9 iframe | Intake recorded; resolved below |
| Nether Travel | image | [images/media/nether-coordinate-scaling.svg](https://github.com/SirInfinite/mcsr-glossary/blob/main/images/media/nether-coordinate-scaling.svg) | 0; —s | One Nether block corresponds to eight blocks of horizontal Overworld coordinates | [MCSR Glossary](https://github.com/SirInfinite/mcsr-glossary) | 1200×675 | Intake recorded; resolved below |
| Ninjabrain Bot | youtube | [Rx8i7e5lu7g](https://www.youtube.com/watch?v=Rx8i7e5lu7g) | 0; 0s | Ninjabrain Bot setup and eye-measurement guide | [Four](https://www.youtube.com/@FourSR) | 16:9 iframe | Intake recorded; resolved below |
| One Cycle | youtube | [JaVyuTyDxxs](https://www.youtube.com/watch?v=JaVyuTyDxxs&t=28s) | 0; 28s | One Cycle setup and bed timing | [Marcus Fireworks](https://www.youtube.com/@MarcusFireworks) | 16:9 iframe | Intake recorded; resolved below |
| Perch | youtube | [6V2sQthCzOc](https://www.youtube.com/watch?v=6V2sQthCzOc&t=330s) | 0; 330s | Dragon pathing phases and perch mechanics | [T_Wagz](https://www.youtube.com/@TWagz) | 16:9 iframe | Intake recorded; resolved below |
| Stables Bastion | youtube | [TioQsF5ygOg](https://www.youtube.com/watch?v=TioQsF5ygOg&t=149s) | 0; 149s | Hoglin Stables structure overview | [T_Wagz](https://www.youtube.com/@TWagz) | 16:9 iframe | Intake recorded; resolved below |
| Stronghold Navigation | youtube | [kQCt6JgWr6E](https://www.youtube.com/watch?v=kQCt6JgWr6E) | 0; 0s | Stronghold entrance and portal-room navigation | [k4yfour](https://www.youtube.com/@k4yfour) | 16:9 iframe | Intake recorded; resolved below |
| Treasure Bastion | youtube | [u4-KxRhNsUc](https://www.youtube.com/watch?v=u4-KxRhNsUc&t=17s) | 0; 17s | Treasure Bastion route variants | [MCSR Wiki](https://www.youtube.com/@MinecraftSpeedrunningWiki) | 16:9 iframe | Intake recorded; resolved below |
| Triangulation | image | [images/media/stronghold-triangulation.svg](https://github.com/SirInfinite/mcsr-glossary/blob/main/images/media/stronghold-triangulation.svg) | 0; —s | Two eye bearings intersect at an estimated stronghold | [MCSR Glossary](https://github.com/SirInfinite/mcsr-glossary) | 1200×675 | Intake recorded; resolved below |
| Triangulation | youtube | [8c29j0We2VQ](https://www.youtube.com/watch?v=8c29j0We2VQ&t=54s) | 1; 54s | Two-throw stronghold triangulation | [BoomerPlayz](https://www.youtube.com/@boomerplayz1) | 16:9 iframe | Intake recorded; resolved below |
| Zero Cycle | youtube | [CSdkCmZ69RI](https://www.youtube.com/watch?v=CSdkCmZ69RI&t=29s) | 0; 29s | Zero Cycle fundamentals and setups with Doogile | [MCSR Wiki](https://www.youtube.com/@MinecraftSpeedrunningWiki) | 16:9 iframe | Intake recorded; resolved below |


## Final disposition

“Previous Action” records the first curation disposition before the final playback/screenshot refinement; the Stronghold Navigation KEEP was overturned by repeatable embed failure. Source links and revised starts below describe the final selection. The complete original source/caption/credit record remains above.

| Term | Media | Previous Action | Final Action | Reason |
| --- | --- | --- | --- | --- |
| Blaze Bed | [youtube: 3TD4jkuT8QA](https://www.youtube.com/watch?v=3TD4jkuT8QA&t=132s) · 0:00 → 2:12 | IMPROVE | IMPROVE | Start at the open-spawner bed placement, not the introduction; caption explicitly scopes the example to 1.16.1. |
| Blind Travel | [youtube: 0N8Wj8hOVKM](https://www.youtube.com/watch?v=0N8Wj8hOVKM&t=81s) | KEEP | KEEP | The 1:21 chapter introduces the uninformed portal-target method; it is distinct from the later Educated Travel chapter. |
| Bridge Bastion | [youtube: 2pzMpX1RJGI](https://www.youtube.com/watch?v=2pzMpX1RJGI&t=140s) · 2:08 → 2:20 | IMPROVE | IMPROVE | Start on the bridge/chalice structure walkthrough. Label the 2020 footage as structure identification, not a recommendation of one current route. |
| Divine Travel | [youtube: SXem01c44-I](https://www.youtube.com/watch?v=SXem01c44-I&t=68s) · 0:00 → 1:08 | IMPROVE | IMPROVE | Start at fossil identification. Preserve the legacy 1.16.1 / 2021 context and the definition's exclusion of Ranked seeds. |
| Educated Travel | [youtube: 0N8Wj8hOVKM](https://www.youtube.com/watch?v=0N8Wj8hOVKM&t=516s) | IMPROVE | IMPROVE | Retain the direction-only second-portal chapter; make the 2021 method explicit. Sharing a source with Blind Travel is justified by the different chapter and concept. |
| Fortress Navigation | [youtube: swSbv4AImzI](https://www.youtube.com/watch?v=swSbv4AImzI&t=87s) | KEEP | KEEP | The selected chapter clearly distinguishes fortress pieces and the route toward spawners. Credit matches the public channel name Lucas Chan, whose handle is PupleeL. |
| Housing Bastion | [youtube: BoNr-pbEITM](https://www.youtube.com/watch?v=BoNr-pbEITM&t=144s) · 2:12 → 2:24 | IMPROVE | IMPROVE | Skip the opening explanation and enter the housing/courtyard structure tour; label it as a 2020 walkthrough. |
| Lava Pool Portal | [youtube: La-yHiEr7QM](https://www.youtube.com/watch?v=La-yHiEr7QM) | IMPROVE | IMPROVE | Keep the short build from its original uploader. Describe water/lava casting rather than repeating the title's eight-second claim as a precise glossary fact. |
| Mapless | [youtube: e-wTSITfJFo](https://www.youtube.com/watch?v=e-wTSITfJFo&t=70s) · 0:19 → 1:10 | IMPROVE | IMPROVE | Skip the initial controls discussion and start on the buried-treasure chunk search. Caption identifies the 1.16.1 procedure within the creator's broader version discussion. |
| Microlensing | [youtube: M-sffdCnv-4](https://www.youtube.com/watch?v=M-sffdCnv-4&t=14s) · 1:08 → 0:14 | REPLACE | REPLACE | Replace the long original-2020 guide, uploaded in 2021, with the same creator's concise 2025 bastion-finding demonstration. Start on F3 entity-count scanning; older setup/rule advice is not presented as current. |
| Nether Travel | [image: images/media/nether-coordinate-scaling.svg](https://github.com/SirInfinite/mcsr-glossary/blob/main/images/media/nether-coordinate-scaling.svg) | IMPROVE | IMPROVE | Original SVG makes the 8:1 X/Z relationship visible with equal-size 100-block squares and concrete coordinates. Larger labels, explicit unscaled Y, no claim that terrain permits every portal placement. |
| Ninjabrain Bot | [youtube: Rx8i7e5lu7g](https://www.youtube.com/watch?v=Rx8i7e5lu7g&t=575s) · 0:00 → 9:35 | IMPROVE | IMPROVE | Move past installation material to an actual eye-angle measurement. Label the 2021 interface; it illustrates the calculator's purpose, not current installation steps or a verified minor version. |
| One Cycle | [youtube: JaVyuTyDxxs](https://www.youtube.com/watch?v=JaVyuTyDxxs&t=28s) | KEEP | KEEP | The existing setup/bed-timing chapter demonstrates the exact mechanic and remains compact enough to retain. |
| Perch | [YouTube: 6V2sQthCzOc](https://www.youtube.com/watch?v=6V2sQthCzOc&t=330s) | REMOVE | REMOVE | Working source; the broad dragon-pathing lecture does not promptly demonstrate the term. Related One Cycle already supplies a clearer visual. |
| Stables Bastion | [youtube: TioQsF5ygOg](https://www.youtube.com/watch?v=TioQsF5ygOg&t=161s) · 2:29 → 2:41 | IMPROVE | IMPROVE | Start inside the lower stable sections instead of on the preceding transition; identify the footage as a 2020 structure walkthrough. |
| Stronghold Navigation | [youtube: 4It26dOki7g](https://www.youtube.com/watch?v=4It26dOki7g&t=258s) · 0:00 → 4:18 | KEEP | REPLACE | Replace the older k4yfour embed after it repeatedly displayed unavailable in the glossary despite a working watch page. Mikeyboie's 2025 routing chapter shows room branches and a stronghold cutaway; start at 4:18 in the long tutorial. |
| Treasure Bastion | [youtube: u4-KxRhNsUc](https://www.youtube.com/watch?v=u4-KxRhNsUc&t=33s) · 0:17 → 0:33 | IMPROVE | IMPROVE | Start at the annotated Twagz route demonstration in MCSR Wiki's 2024 1.16.1 guide. Name the demonstrated route instead of promising every variant. |
| Triangulation | [image: images/media/stronghold-triangulation.svg](https://github.com/SirInfinite/mcsr-glossary/blob/main/images/media/stronghold-triangulation.svg) | IMPROVE | IMPROVE | Original SVG explains two intersecting bearings with readable labels and an explicit schematic caveat; the separate video starts at actual eye measurements instead of duplicating the conceptual diagram. |
| Triangulation | [youtube: 8c29j0We2VQ](https://www.youtube.com/watch?v=8c29j0We2VQ&t=214s) · 0:54 → 3:34 | IMPROVE | IMPROVE | Original SVG explains two intersecting bearings with readable labels and an explicit schematic caveat; the separate video starts at actual eye measurements instead of duplicating the conceptual diagram. |
| Zero Cycle | [youtube: CSdkCmZ69RI](https://www.youtube.com/watch?v=CSdkCmZ69RI&t=29s) | IMPROVE | IMPROVE | Retain the early-kill/setup chapter. Credit MCSR Wiki and name featured contributor Doogile without implying that he owns the channel; specify the 1.16.1 context. |
| Boat Eye | [youtube: SxVJD7rW-x8](https://www.youtube.com/watch?v=SxVJD7rW-x8&t=380s) · 6:20 | ADD | ADD | The 2026 full example shows the angle setup, eye measurement and calculator result together. More useful here than an obsolete sensitivity-installation guide. |
| Donkey Kong Route | [youtube: n5F1oVomh10](https://www.youtube.com/watch?v=n5F1oVomh10) · 0:00 | ADD | ADD | A concise 2025 runner demonstration connects chalice gold, piglin collection and the trading position. Explicitly one 1.16.1 DK variant, not a universal route. |
| Flintless Portal | [youtube: DVDbfKuLaWo](https://www.youtube.com/watch?v=DVDbfKuLaWo&t=9s) · 0:09 | ADD | ADD | Fyroah demonstrates a plank-and-lava design in their own 2020 compilation of designed methods. Start at the first build; do not claim invention of all flintless portals. |
| Half Bow | [youtube: whwjNbIni58](https://www.youtube.com/watch?v=whwjNbIni58&t=20s) · 0:20 | ADD | ADD | Ninjabrain's original 2021 proof of concept shows crystal shots followed by a one-cycle finish. Retain its historical context without changing the current term status. |
| Pie-Ray | [youtube: 5LuoaGFCoBU](https://www.youtube.com/watch?v=5LuoaGFCoBU&t=6s) · 0:06 | ADD | ADD | The creator's concise 2025 fortress tutorial shows spawner readings and chunk/render-distance narrowing. Keep the profiler-version caveat; this is not a universal profiler path. |
| Preemptive Navigation | [youtube: yF4kcBk3lKo](https://www.youtube.com/watch?v=yF4kcBk3lKo&t=434s) · 7:14 | ADD | ADD | A controlled spawner test in meebie's 2024 guide explains the profiler signal. Final review advances the start from 6:44 to 7:14 to remove the walk to the test. Nearby prose retains false-positive limitations. |

## Review method and source health

Every intake media term was opened locally at desktop and mobile widths before content changes (19 terms × 2 viewports). Source metadata was checked against original watch pages, public descriptions, chapter markers and creator channels. Relevant footage was inspected, including multiple frames around technical sequences. Final source checks used fresh Chrome contexts and confirmed decoded main-video frames at the stored start, excluding thumbnails and ads. The original SVGs and their GitHub source links were opened as well.

Final evidence: **25/25 source items**, **16/16 unique creator links**, and **26/26 actual inline playback checks** (all 23 YouTube items on desktop, plus Boat Eye, Divine Travel and Triangulation on mobile). Players initialize paused; playback starts only after the normal player control is activated. Source-page success was not treated as embed success: that distinction caught the Stronghold Navigation failure.

All final YouTube source URLs returned HTTP 200 with the expected creator and content. Metadata declared embedding allowed; actual iframe playback was then tested separately. Both local SVGs load and their source links return 200. This is point-in-time verification, not a guarantee of future third-party availability. Independent source links always remain outside the iframe.

Some early browser probes failed because the bundled browser could not play the provider stream or because a seek captured a stale frame. Those probes were not accepted as source failures or final evidence. The completed checks use installed Chrome and decoded video-frame timestamps. An early image check also sampled before lazy decoding; the corrected check scrolls the image into view and awaits decoding.

### Historical and version context

- Divine Travel and Educated Travel retain their legacy labels and 2021 examples. The definitions keep their mode limitations.
- Half Bow uses Ninjabrain's 2021 proof of concept, explicitly identified as such; the term remains current.
- Bridge, Housing and Stables use 2020 structure walkthroughs. Captions distinguish the structure from modern route choices and later-version hazards.
- Ninjabrain Bot shows a 2021 interface at the measurement step. Current tool installation/allowed-version guidance remains in the definition and primary project documentation.
- Flintless Portal uses the designer's 2020 setup footage; it does not imply fixed fire-spread timing.
- Forced Perch, the dataset's historical-status term, was reviewed without media. No suitable example was forced onto it.
- There are **no needsUpdating:true terms** in this dataset. That requested media scenario is not applicable; no status or flag was fabricated to satisfy coverage.

### Density, placement and attribution

23 terms have one item; Triangulation has two, separated by explanatory text. Its schematic explains the intersection, then a video shows actual eye measurement. The only repeated final upload is BoomerPlayz's travel guide, at 1:21 for Blind Travel and 8:36 for Educated Travel. Each chapter explains a different method. No videos are stacked together without context.

Every item follows the paragraph introducing its exact concept. Captions remain a single understated text block with creator and source links; they naturally wrap on phones. No media/gallery/source-review section was added to public term pages. Long tutorials start at relevant chapters and retain the complete source link. No publicly hosted third-party media was copied into the repository.

## Renderer, validator and accessibility

- Preserve the single structured media pipeline, shared schema/URL allowlist, Markdown sanitizer, DOMPurify, and project-relative paths under `/mcsr-glossary/`.
- YouTube uses `youtube-nocookie.com`, automatic active-term initialization, exact start seconds, 16:9 sizing and no autoplay. Existing eager iframe initialization is retained to satisfy the approved automatic-loading behavior; local images remain lazy with reserved dimensions.
- Original SVGs are 800 × 520 with enlarged labels, descriptive alt text, preserved aspect ratio and the existing keyboard-accessible lightbox. Combined SVG weight is smaller than baseline.
- Image failures now become descriptive source links instead of broken expansion buttons. External previews and source anchors identify the actual demonstration. Captions/credits use a consistent middle-dot separator.
- The CLI now checks local image/video/poster/caption file existence, exact filename case and real-path containment. Runtime and CLI still share media type, field, URL, provider, ID, timestamp, alt/caption/credit and inline-slot rules.
- Added regression coverage for missing files/case mismatches, offline validation, failed-image and unavailable-provider fallbacks, iframe titles, timestamps/no-autoplay, Twitch parent handling and descriptive external links. Twitch is fixture-tested only; no Twitch item is published or claimed as production-domain verified.
- No GIF is published. The existing dormant GIF renderer has no pause control; adding a GIF later requires a separate motion-accessibility review. No auto-playing animation was added in this pass.

## Browser and screenshot review

All 24 final media terms and 10 terms without media were opened. Non-media terms: All Advancements, Any%, Atum, Axis Calculated, Bastion, Bastion Route, Blaze, Blaze Rods, Blaze TNT and Forced Perch.

Viewports: **1440×900, 1024×768, 768×1024, 390×844, 360×800**. The final review records 170 term/viewport/theme views, 32 axe scans, zero page overflow, zero page JavaScript exceptions, zero own-origin HTTP errors and zero CSP violations. Both dark and light media surfaces were inspected. The separate product suite also exercises navigation, search, filters, media/lightbox, votes, submission/edit/report forms, Stats, Changelog, themes and browser history.

Evidence is under ignored `output/playwright/media-quality/`; it is local QA output, not a shipped asset dependency:

- `baseline/terms/`: every original media term, desktop and mobile.
- `source-review/`: source-sequence frames and contact sheets reviewed for all intake items and candidate additions.
- `final-sources/`: verified final sources and the reproducible 15-item sample.
- `pass1/` and `pass2/`: first implementation and refinement screenshots.
- `embeds/`: actual viewport screenshots and final playback results. Offscreen cross-origin frames can be blank in full-page captures; viewport captures and decoded playback checks were used to verify those players.
- `final-viewport/`: additional in-view captures of Triangulation's player, the Stronghold Navigation replacement and the 360px coordinate diagram.

Representative screenshots reviewed: Triangulation (image + video, dark desktop/mobile), Nether Travel (image, light/dark mobile), Boat Eye (YouTube, dark desktop/mobile), Preemptive Navigation (light 360px), Divine Travel (legacy, dark mobile), Half Bow (historical footage), Ninjabrain Bot (older tool interface) and the final Stronghold Navigation replacement. GIF/Twitch screenshots are not applicable to the published dataset.

### Second refinement pass

After inspecting the first screenshots, shortened captions and removed awkward sentence-to-“by” joins; made the SVG footnotes shorter and larger; removed an unverified Ninjabrain Bot minor-version label in favor of the known 2021 date; advanced Preemptive Navigation from 6:44 to 7:14 for the actual spawner test. Final playback also replaced the failing Stronghold Navigation embed. Reopened affected sources and repeated affected layout/playback checks. The reading column, controls, themes and overall design remain unchanged.

## Random 15-item source audit

Sampled before reopening with a deterministic SHA-256 ordering of `mcsr-media-2026-09-07:<term><index>`; the first 15 form a reproducible pseudorandom sample. Every selected final source was reopened, creator/caption/timestamp checked, and its video frame or SVG inspected. Stronghold Navigation was re-audited after replacement without changing the selected term slot.

| Term | Source / creator | Start | Result |
| --- | --- | --- | --- |
| Blaze Bed | [k4yfour](https://www.youtube.com/watch?v=3TD4jkuT8QA&t=132s) | 2:12 | PASS |
| Triangulation (image) | [MCSR Glossary](https://github.com/SirInfinite/mcsr-glossary/blob/main/images/media/stronghold-triangulation.svg) | — | PASS |
| Mapless | [k4yfour](https://www.youtube.com/watch?v=e-wTSITfJFo&t=70s) | 1:10 | PASS |
| Microlensing | [k4yfour](https://www.youtube.com/watch?v=M-sffdCnv-4&t=14s) | 0:14 | PASS |
| Educated Travel | [BoomerPlayz](https://www.youtube.com/watch?v=0N8Wj8hOVKM&t=516s) | 8:36 | PASS |
| Stables Bastion | [T_Wagz](https://www.youtube.com/watch?v=TioQsF5ygOg&t=161s) | 2:41 | PASS |
| Ninjabrain Bot | [Four](https://www.youtube.com/watch?v=Rx8i7e5lu7g&t=575s) | 9:35 | PASS |
| Preemptive Navigation | [meebie](https://www.youtube.com/watch?v=yF4kcBk3lKo&t=434s) | 7:14 | PASS |
| Flintless Portal | [Fyroah](https://www.youtube.com/watch?v=DVDbfKuLaWo&t=9s) | 0:09 | PASS |
| Lava Pool Portal | [unfried EXTRA](https://www.youtube.com/watch?v=La-yHiEr7QM) | 0:00 | PASS |
| Half Bow | [Ninjabrain](https://www.youtube.com/watch?v=whwjNbIni58&t=20s) | 0:20 | PASS |
| Divine Travel | [k4yfour](https://www.youtube.com/watch?v=SXem01c44-I&t=68s) | 1:08 | PASS |
| Pie-Ray | [k4yfour](https://www.youtube.com/watch?v=5LuoaGFCoBU&t=6s) | 0:06 | PASS |
| Stronghold Navigation | [Mikeyboie](https://www.youtube.com/watch?v=4It26dOki7g&t=258s) | 4:18 | PASS |
| Nether Travel | [MCSR Glossary](https://github.com/SirInfinite/mcsr-glossary/blob/main/images/media/nether-coordinate-scaling.svg) | — | PASS |

## Tests, performance and release recommendation

| Check | Baseline | Final evidence |
| --- | --- | --- |
| `npm run check` | PASS: 108 unit tests, content/static/secret checks | PASS: **111/111 unit tests**, 100 valid terms / 25 valid media, static checks and secret scan clean |
| `npm run test-browser` | PASS: 67 product + 32 failure checks | PASS: **107/107 checks** (67 product + 32 failure + 8 media); **224 layouts and 64 axe scans**, zero errors/violations |
| `npm run test-database` | PASS: **144/144**, fresh + legacy reproduction of all 11 migrations | Baseline evidence retained; no database, migrations, IDs, categories or backend calls changed in this media pass |
| `npm run test-live-voting` | PASS: concurrent clients, rapid conflict, idempotency, rejection and cleanup | Baseline hosted behavior retained; no voting code/configuration changed |
| `npm run test-live-backend` | **FAIL (pre-existing)**: 20 missing hosted vote targets and two missing RPCs | Unresolved outside media scope; do not mistake local UI tests for a fully healthy hosted backend |
| Final source / creator audit | Intake recorded before edits | PASS: 25/25 sources, 16/16 creator URLs, 15/15 random sample |
| Real inline playback | Original Stronghold Navigation player failed | PASS: 26/26 final checks; all final players start paused and play at the stored segment |
| Media-focused browser review | 38 intake views | PASS: 170 final views, 32 axe scans; no overflow, own-origin 404s, JavaScript exceptions or CSP violations |
| Content preservation comparison | 100 definitions | PASS: no researched prose or status changes after stripping media tokens and normalizing whitespace |

Test logs: `baseline/{check,browser,database,live-voting,live-backend}.log`, `final-check.log`, `final-suite.log`, `final-suite/browser.json`, `pass2/browser.json`, `embeds/results.json`, `final-sources/results.json`, and `credit-links.json` under the evidence directory. Baseline database/live-voting results are explicitly distinguished from the frontend suites rerun after the final media edit.

### Lighthouse

Lighthouse 12.8.2, locally served project path, **Triangulation** (an original SVG plus an automatically initialized YouTube embed), fresh mobile/desktop runs after browser regression testing:

| Metric | Mobile | Desktop |
| --- | ---: | ---: |
| Performance | **96** | **100** |
| Accessibility | **100** | **100** |
| Best Practices | **96** | **96** |
| SEO | **100** | **100** |
| Largest Contentful Paint | 2.2 s | 0.5 s |
| Total Blocking Time | 170 ms | 0 ms |
| Cumulative Layout Shift | 0 | 0 |
| Transferred bytes before playback | 1,265,139 | 1,387,753 |

Reports: `lighthouse-mobile-final.json` and `lighthouse-desktop-final.json`. The **Best Practices 100 target was not met**: the sole failing weighted audit is Chrome DevTools' Cookie issue in the cross-origin `youtube-nocookie.com` frame. No own-site CSP error accompanies it. Provider requests and thumbnails vary between runs. No security restriction was loosened and no useful video was removed merely to suppress that provider warning.

The JSON grows by 3,794 bytes, or **819 bytes gzipped**. The two original SVGs together shrink from 4,322 to **3,360 bytes**. No new font/library/runtime script is loaded. The media player is the main third-party payload; it remains confined to the active term and never autoplays. The measured mobile target is met with no layout shift.

### Remaining limitations and recommendation

- No final media selection has an unresolved relevance, credit, source or playback concern at the review date. Ninjabrain Bot intentionally demonstrates a dated 2021 interface; the caption makes that limitation explicit.
- Future deletion, regional restrictions, provider outages, ads and player UI changes remain outside this static site's control. Independent caption source links and failed-image fallback are preserved. Sources require periodic rechecking.
- GIF/Twitch/native-video/external-link publication is not exercised because none is curated into the dataset. Existing support remains, with shared contract/fixture coverage; a new GIF would need motion controls reviewed before publication.
- The existing hosted release gate remains **HOLD**: missing vote targets and the `get_glossary_trending_terms` / `submit_glossary_correction` RPCs were observed before edits. Supabase was not changed, and this media report does not certify migration parity or authenticated security advisors.

**MEDIA QUALITY PASS: PASS for this local branch.** Recommend the media changes for review with the provider Best Practices limitation disclosed. This is not release approval; resolve the existing hosted backend gate in its own authorized work before a full release. No merge, push, tag or release was performed.
