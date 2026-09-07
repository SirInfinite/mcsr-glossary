# Media audit

In progress — 2026-09-07. Branch: `content/media-quality-pass`. Baseline: `c14df36`.

## Initial inventory

20 items across 19 terms; 18 YouTube embeds and 2 original repository SVGs. No published Twitch/GIF/native-video/external-link items.

Every current item follows its first explanatory paragraph except Triangulation's second item, which follows its second paragraph. YouTube frames initialize eagerly with no autoplay; SVG images load lazily with explicit dimensions and an accessible lightbox. Source health, exact segment relevance and all mobile rendering are being checked rather than inferred from valid metadata.

| Term | Provider | Source | Index / start | Caption | Credit | Dimensions | Initial review |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Blaze Bed | youtube | [3TD4jkuT8QA](https://www.youtube.com/watch?v=3TD4jkuT8QA) | 0; 0s | Open and enclosed Blaze Bed setups | [k4yfour](https://www.youtube.com/@k4yfour) | 16:9 iframe | Pending rendered/source review |
| Blind Travel | youtube | [0N8Wj8hOVKM](https://www.youtube.com/watch?v=0N8Wj8hOVKM&t=81s) | 0; 81s | Blind Travel explained and demonstrated | [BoomerPlayz](https://www.youtube.com/@boomerplayz1) | 16:9 iframe | Pending rendered/source review |
| Bridge Bastion | youtube | [2pzMpX1RJGI](https://www.youtube.com/watch?v=2pzMpX1RJGI&t=128s) | 0; 128s | Bridge Bastion structure overview | [T_Wagz](https://www.youtube.com/@TWagz) | 16:9 iframe | Pending rendered/source review |
| Divine Travel | youtube | [SXem01c44-I](https://www.youtube.com/watch?v=SXem01c44-I) | 0; 0s | Divine Travel conditions and fossil setup | [k4yfour](https://www.youtube.com/@k4yfour) | 16:9 iframe | Pending rendered/source review |
| Educated Travel | youtube | [0N8Wj8hOVKM](https://www.youtube.com/watch?v=0N8Wj8hOVKM&t=516s) | 0; 516s | Educated Travel explained | [BoomerPlayz](https://www.youtube.com/@boomerplayz1) | 16:9 iframe | Pending rendered/source review |
| Fortress Navigation | youtube | [swSbv4AImzI](https://www.youtube.com/watch?v=swSbv4AImzI&t=87s) | 0; 87s | Fortress structure cues and spawner navigation | [Lucas Chan](https://www.youtube.com/@PupleeL) | 16:9 iframe | Pending rendered/source review |
| Housing Bastion | youtube | [BoNr-pbEITM](https://www.youtube.com/watch?v=BoNr-pbEITM&t=132s) | 0; 132s | Housing Units structure overview | [T_Wagz](https://www.youtube.com/@TWagz) | 16:9 iframe | Pending rendered/source review |
| Lava Pool Portal | youtube | [La-yHiEr7QM](https://www.youtube.com/watch?v=La-yHiEr7QM) | 0; 0s | Eight-second lava-pool portal build | [unfried EXTRA](https://www.youtube.com/@unfriedextra) | 16:9 iframe | Pending rendered/source review |
| Mapless | youtube | [e-wTSITfJFo](https://www.youtube.com/watch?v=e-wTSITfJFo&t=19s) | 0; 19s | Mapless buried-treasure finding across Java versions | [k4yfour](https://www.youtube.com/@k4yfour) | 16:9 iframe | Pending rendered/source review |
| Microlensing | youtube | [jvTfMLPnMSw](https://www.youtube.com/watch?v=jvTfMLPnMSw&t=68s) | 0; 68s | Original 2020 bastion microlensing guide | [k4yfour](https://www.youtube.com/@k4yfour) | 16:9 iframe | Pending rendered/source review |
| Nether Travel | image | [images/media/nether-coordinate-scaling.svg](https://github.com/SirInfinite/mcsr-glossary/blob/main/images/media/nether-coordinate-scaling.svg) | 0; —s | One Nether block corresponds to eight blocks of horizontal Overworld coordinates | [MCSR Glossary](https://github.com/SirInfinite/mcsr-glossary) | 1200×675 | Pending rendered/source review |
| Ninjabrain Bot | youtube | [Rx8i7e5lu7g](https://www.youtube.com/watch?v=Rx8i7e5lu7g) | 0; 0s | Ninjabrain Bot setup and eye-measurement guide | [Four](https://www.youtube.com/@FourSR) | 16:9 iframe | Pending rendered/source review |
| One Cycle | youtube | [JaVyuTyDxxs](https://www.youtube.com/watch?v=JaVyuTyDxxs&t=28s) | 0; 28s | One Cycle setup and bed timing | [Marcus Fireworks](https://www.youtube.com/@MarcusFireworks) | 16:9 iframe | Pending rendered/source review |
| Perch | youtube | [6V2sQthCzOc](https://www.youtube.com/watch?v=6V2sQthCzOc&t=330s) | 0; 330s | Dragon pathing phases and perch mechanics | [T_Wagz](https://www.youtube.com/@TWagz) | 16:9 iframe | Pending rendered/source review |
| Stables Bastion | youtube | [TioQsF5ygOg](https://www.youtube.com/watch?v=TioQsF5ygOg&t=149s) | 0; 149s | Hoglin Stables structure overview | [T_Wagz](https://www.youtube.com/@TWagz) | 16:9 iframe | Pending rendered/source review |
| Stronghold Navigation | youtube | [kQCt6JgWr6E](https://www.youtube.com/watch?v=kQCt6JgWr6E) | 0; 0s | Stronghold entrance and portal-room navigation | [k4yfour](https://www.youtube.com/@k4yfour) | 16:9 iframe | Pending rendered/source review |
| Treasure Bastion | youtube | [u4-KxRhNsUc](https://www.youtube.com/watch?v=u4-KxRhNsUc&t=17s) | 0; 17s | Treasure Bastion route variants | [MCSR Wiki](https://www.youtube.com/@MinecraftSpeedrunningWiki) | 16:9 iframe | Pending rendered/source review |
| Triangulation | image | [images/media/stronghold-triangulation.svg](https://github.com/SirInfinite/mcsr-glossary/blob/main/images/media/stronghold-triangulation.svg) | 0; —s | Two eye bearings intersect at an estimated stronghold | [MCSR Glossary](https://github.com/SirInfinite/mcsr-glossary) | 1200×675 | Pending rendered/source review |
| Triangulation | youtube | [8c29j0We2VQ](https://www.youtube.com/watch?v=8c29j0We2VQ&t=54s) | 1; 54s | Two-throw stronghold triangulation | [BoomerPlayz](https://www.youtube.com/@boomerplayz1) | 16:9 iframe | Pending rendered/source review |
| Zero Cycle | youtube | [CSdkCmZ69RI](https://www.youtube.com/watch?v=CSdkCmZ69RI&t=29s) | 0; 29s | Zero Cycle fundamentals and setups with Doogile | [MCSR Wiki](https://www.youtube.com/@MinecraftSpeedrunningWiki) | 16:9 iframe | Pending rendered/source review |

## Baseline risks to investigate

- Long videos starting at 0:00 may open on intros rather than demonstrations.
- Repeated source videos need distinct useful segments (Blind/Educated Travel).
- Repository SVG source links point at `main`; verify that those remote files exist.
- The GIF renderer currently starts motion automatically and offers expansion, not a pause control. No published GIF currently uses this path.
- Runtime URL validation is shared, but local media file existence needs explicit CLI verification.
- HTTP success alone does not verify the example, creator, or embeddability.
