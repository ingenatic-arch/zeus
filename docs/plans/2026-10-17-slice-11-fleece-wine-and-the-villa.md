# Slice 11 — Fleece, wine and the villa

*17 Oct 2026. Phase 2, "A richer city" (`docs/specs/2026-10-16-a-richer-city-design.md`). The fourth slice of the phase. Builds on slice 10, "Olives and oil, and the storehouse", and its review.*

## Goal and check-in

The town gets its last two goods and its grandest homes. A sheep pasture on the grass keeps a small flock that grazes the open ground round its fold, and its shepherds shear them into bales of fleece; ox carts take the bales to the storehouse. A vineyard of trellised vines goes on the sunny slopes, its grapes ripening from green to purple; carts take the grapes to a winery, a press house with treading vats and rows of amphorae, which makes wine; carts take the amphorae to the storehouse. The agora gets a fleece stall and a wine stall beside its oil stall, each with its own porter and its own vendor. Fine houses now need fleece as well as plays and all three foods, and a fine house that also has wine becomes a villa: a sixth level, the grandest house in town (a courtyard house with a colonnade round its garden, a tiled roof, an olive tree), which holds the most people and pays the most tax. Underneath, the goods become data: oil, fleece and wine are rows in the same tables, so the household panel, warnings, decline, overlays, signs, tips and town lines treat every good the same way.

**Oliver can:** raise a street to villas, and compare a villa street with a fine-house street in looks, tax and chatter.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#vineyard`: build it yourself. The fine-house town (`#fine`, now with fleece) with the vineyard tool in hand over a sunny slope by the town. Plant a vineyard, build a winery (M ×7), add a wine stall to the agora (K ×4) and watch the fine houses nearest the agora become villas as wine reaches them.
- `#villas`: the same town a few months after its wine stall opened: a street of villas beside a street of fine houses the wine vendor hasn't reached yet, at street level, the panel open on a villa.
- `#winery`: `#villas` over its vineyard and winery, carts coming and going.
- `#winevendor`: following the wine vendor, the wine overlay on.
- `#pasture`: `#town` over its sheep pasture, the flock grazing round the fold.
- `#fleecevendor`: `#town` following the fleece vendor, the fleece overlay on.
- `-overlay` on these shows that good's overlay.
- Every earlier token keeps working.

## Not in this slice

Fire and collapse (slice 12); the trading post, porters to the quay and sales (slice 13); retuning money pressure (slice 14, as handed over); the prepared richer demo town with every chain (slice 14: `#town` gets fleece here so its fine houses keep their level, but no wine or villas); seasons for shearing and the vintage; moving millstones and beams in the presses (still a rough edge).

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- Sim code (`src/sim/`, `src/map/`) stays pure and deterministic: seeded RNG in the state, no `Math.random`, `Date`, `performance` or timers (the purity test enforces it). Every player action, adding a stall included, reaches the sim as a command through the queue.
- Money moves only through `pay` (`src/sim/treasury.ts`); building costs come from `priceOf`; the new workplaces pay wages through their jobs.
- Making the goods generic must not change a single history: the cottage demos (`#water`, `#carrier`, `#fountain`, `#food`, `#vendor`, `#harvest`, `#chain`, `#workers`, `#bridge`, `#people`, `#warning`, `#decline`, `#missing`, `#streets`, `#settlers`, `#overhunt`, `#grow`, `#table`) and the oil-era culture scenes before fine houses (`#shrine`, `#priestess`, `#grove`) are fingerprinted at `23a8832` (tick, people, money, every home's place, level and people, every walker) and must match exactly, unless a change below says otherwise and why.
- Demos with fine houses get a fleece chain where it keeps their story; what moved is said in the check-in.
- The renderer and UI only read sim state. Static build, `base: './'`, no runtime network requests, all art generated in code.
- New walker and animal looks register with `folk.people.look` or `folk.big.look` before the first frame; no look over about 1,600 vertices in the people mesh, and the biggest look in each mesh (padding) is measured before and after.
- Module-level constants are declared above any piece list or IIFE that reads them (the rolldown ordering hazard).
- Judge by screenshots, tune by eye, never claim it looks or feels right on Oliver's behalf.

## Before

Measured at `23a8832` (the end of slice 10's review), headless Chromium with software WebGL at 1920 × 1080:

| | Before |
|---|---|
| Tests | 167 in 16 files, all passing (23 s); typecheck clean (1 s) |
| Bundle | 3 files, 994 KB raw, 286 KB gzipped |
| Load (local, headless, page clock) | ready at 1.39 s, first frame at 1.66 s; coast bake 0.50 s, scene build 1.19 s |
| Opening view / overview / river / street / bay | 574 k triangles, 59 calls / 583 k, 61 / 395 k, 30 / 416 k, 32 / 417 k, 28 |
| `#water` / overview | 559 k, 46 / 722 k, 74 |
| `#food` / overview | 486 k, 55 / 677 k, 88 |
| `#fine` / overview | 625 k, 70 / 804 k, 102 |
| `#closed` / overview | 595 k, 84 / 786 k, 117 |
| `#town` / street / overview | 739 k, 79 / 681 k, 67 / 857 k, 105; ready at 1.66 s, first frame 2.23 s; 596 people, 81 homes, 41 walkers, 92 buildings |
| Update per frame, paused / running | `#food` 0.55 / 0.93 ms; `#fine` 1.02 / 1.87; `#town` 0.83 / 4.65 (noisy) |
| GPU objects | 55 geometries, 6 textures |
| A save of `#town` | 203 KB |
| Walker padding | people mesh 1,356 vertices a look (the stag), big mesh 2,412 (the oil cart) |
| Demos at opening (tick, people, money, levels hut/cottage/townhouse/fine) | `#shrine` 4050, 502, 468 dr, 6/21/17/0; `#theatre` 5340, 640, 290 dr, 0/6/25/13; `#fine` 6840, 802, 561 dr, 0/6/0/38; `#closed` 9690, 876, 2,140 dr, 0/6/0/38; `#town` 7200, 596, 531 dr, 14/10/6/39 (2 tents); `#nooil` 7850, 843; `#harsh` 7650, 631 |

## Design decisions

**First, the goods are data** (the slice 10 review's list).
- *Needs.* `Service` gains `fleece` and `wine`; every good with a stall has a row in one table (`GOOD_USE`, goods.ts): the need it is (`service`), who buys it, how long a vendor's top-up lasts, how many people a unit serves a month, its unit ("jars", "bales", "amphorae"), its words for moods and tips. `SERVICE_GOOD` maps a need back to its good, so `untilOf`, `missingSince` (grace covers food and every good, not "food or oil"), `wantOf`, `cityHas(s).stalls`, `serviceScore` and the household panel work from the table. `wantsOil` becomes `wantsGood(s, b, good)`.
- *Levels.* `LEVEL_NEEDS` is a table to the villa: hut water; cottage water and bread; townhouse blessings and oil (two foods); fine house plays and fleece (three foods); villa wine. `NEEDS` (the order every list and sign shows): water, bread, blessings, oil, plays, fleece, wine.
- *Stalls.* `STALL_GOODS` is oil, fleece, wine; each has a vendor kind (`oil`, `fleece`, `wine`), a name, a room and a porter's load (`STALL_ROOMS`, `STALL_TAKE`; `STALL_GOOD_LOW` per good). **A porter per stall**: an agora's `fetch` becomes one clock per good, so each stall's porter goes for its own good when it is down to half and none waits behind another. With only an oil stall this is exactly slice 10's porter (fingerprinted).
- *Saves.* The save's `ROUNDS` and `WALKER_KINDS` lists come from the sim's own lists (`ROUND_KINDS`, `WALKER_KINDS` in state.ts), so a new good can't be forgotten there.
- *Text.* `whyNoOil`, `oilLine`, `oilTownLine` and `oilStallLines` become `whyNoGood`, `goodLine`, `goodTownLine` and `stallLines`, written from a chain table per good (its makers in order: grove → press → storehouse → stall; pasture → storehouse → stall; vineyard → winery → storehouse → stall), with the key presses to build each link.
- *Overlay and signs.* The overlay's `MODES` and `TONE` and the signs' icons get a row per good: fleece (a bale, cream and grey) and wine (an amphora, wine red). Signs take up to seven icons.

**The sheep pasture** (3 × 3, 150 dr, 4 workers; M ×6).
- Grass, like the dairy: at least 35% (`PASTURE_GRASS_MIN`), tinted on placing, yields by its grass.
- A batch maker: 20 bales of fleece every 3 days fully worked on the best grass (200 a month); its store holds 400. Carts take the bales to a storehouse.
- What Oliver sees: a stone fold with a wattle hurdle pen, a shearing shed with an open front, bales stacked under its eaves as the store fills, a trough; and a flock of eight sheep (cream, a couple grey and one black) grazing the open ground round it with a shepherd and his crook, drifting slowly, never on roads, buildings, water or cliffs (drawn from the tick, like the dairy's goats: no sim state).

**The vineyard** (3 × 3, 150 dr, 4 workers; M ×7) and **the winery** (3 × 3, 200 dr, 4 workers; M ×8).
- *Sunny slopes.* `tileVine`: dry ground (not the flood plain), not rock, above the shore, best on a slope facing the afternoon sun (the south-west, where the light comes from). A vineyard needs 35% and takes slopes like a grove (`GROVE_MAX_RISE`); the placing tool tints poor ground and says about how much wine a month a vineyard there would give.
- *The crop.* A full harvest of 400 measures of grapes every two months on the best ground, fully worked; its store holds 600. Carts take grapes to a winery.
- *The winery* makes 30 amphorae of wine from 30 measures of grapes every 3 days fully worked (300 a month) while it has grapes; it holds 600 grapes and 600 amphorae. Carts take the wine to a storehouse.
- What Oliver sees: the vineyard as rows of vines on trellis posts, each on its own ground down the slope, bunches of grapes green then purple as the crop ripens, baskets of grapes by a little shelter; the winery as a whitewashed press house under tiles, a treading vat with a figure-less stone floor and a spout to a sunken vat, and amphorae of wine in a row by the door as its store fills.

**The storehouse** gets rooms for fleece (1,200 bales) and wine (1,200 amphorae) beside oil (1,600 jars). Its yard is shared out: jars in rows on one side, bales stacked in the middle, amphorae leaning in racks by the gate; hovering it lists each.

**The stalls and vendors.** The fleece stall and the wine stall (100 dr each, one more worker at the agora each; K cycles agora, oil stall, fleece stall, wine stall) go beside the oil stall on the agora's side, each under its own awning, its goods on the counter. Their porters fetch from the storehouse; their vendors walk the shared round:
- *Fleece:* a home topped up has fleece for six months; a bale a month for every eight people. Townhouses like it once there is a fleece stall; fine houses and villas need it. The vendor: a woman in a slate-blue dress with a bale of fleece on her head.
- *Wine:* six months; an amphora a month for every eight people. Fine houses like it once there is a wine stall; villas need it. The vendor: a man in a wine-red tunic with an amphora on his shoulder and a jug in his hand.
- Carts: bales of fleece roped on the bed; baskets of purple grapes; amphorae of wine bedded in straw. Porters' handcarts with bales or amphorae.

**The villa: a sixth level.**
- `HOME_CAPACITY` 27 (a fine house holds 21); `HOME_NAMES` "A villa"; `TOP_LEVEL` is the villa. Tax by rate (none, light, fair, heavy, harsh): 0, 8, 12, 16, 22 (a fine house pays 0, 6, 9, 13, 17). It needs everything a fine house needs, and wine.
- *What Oliver sees:* the grandest house in town, two variants: a two-storey hall under a hipped roof of red tiles, a colonnade round three sides of a garden court with clipped shrubs, an olive tree and a cypress, a little basin, painted plaster in warm ochre or rose (the fine houses are whitewashed), a gateway with a pediment. Merged per chunk like the other homes.
- *Readable:* the household panel and tips name the villa, its tax ("pays 12 dr a month at fair"), what it lacks; moving up says so ("Villa" floats up, as "Fine house" does), and so does going down. Chatter about wine, fleece and grand houses; villa households speak a little grander.

**Fixes handed over**
- *`#closed`'s story.* Two changes, then the scene's opening re-tuned against them. (1) A home that only wants a walker to grow never outranks one whose level needs her: at cottage level and up, a want-to-grow home's score counts from now at the earliest (`serviceScore`), so after Oliver's fix the new actor and the vendors go to the fine houses about to go down before the townhouses that already have (the review found those were served first). Tents keep their old order, so the water demos are unchanged. (2) If that is not enough, the scene opens a little earlier after the cut (`CLOSED_TICKS`), so the most urgent home has at least about two weeks left. The test: Oliver's fix (rebuild the theatre across from the shrine and mend the ringed tile at once) loses at most a few homes a level; left alone, the cut street goes down.
- *The other culture demos* (`#shrine`, `#theatre`, `#fine`, `#compare`) are re-checked against their stories now that fine houses need fleece and villas exist; their numbers at opening are re-measured and said in the check-in.
- *Logistics headroom.* Fleece and wine get the same headroom as oil: a version 9 save is migrated with every home's grace at least eight months after loading (`GRACE_GOODS`), and the welcome back says fine houses now need fleece and what to build. The `#vineyard` timeline (planting to the first villa) is measured and said in the check-in.
- *Storehouse rooms and stall slots* for fleece and wine (`ROOMS`, `STALL_GOODS`, `STALL_VENDOR`, `STALL_NAMES`).
- *Padding.* The new cart looks (bales, grapes, amphorae) stay under the oil cart's 2,412 vertices; the new vendors and porters and the sheep stay under the stag's 1,356.

**Keys.** M cycles farm, hunting lodge, dairy, olive grove, olive press, sheep pasture, vineyard, winery (Shift+M goes back); K cycles agora, oil stall, fleece stall, wine stall; L cycles food, variety, oil, fleece, wine, off. The build bar has a button for each.

**Demos**
- *Cottage demos and the scenes before fine houses* are untouched (fingerprinted).
- *The culture towns with a theatre* (`#theatre` … `#closed`, `#nooil`) get a sheep pasture by the lane and a fleece stall at the lane's agora before the theatre, so their townhouses can become fine houses; their opening numbers will move and are re-checked against their check-ins. `#shrine`, `#priestess` and `#grove` (no theatre) stay as they were.
- *`#town`* gets a sheep pasture on the meadow by the granary and fleece stalls at both agoras, as its builder would, waiting for the money. Its history changes; re-checked (every level up to fine houses, a few hundred people, no drops in two years, money within the slice 10 bound). The money and hunt demos follow from it.
- *New:* `#vineyard`, `#villas`, `#winery`, `#winevendor` (the fine town with wine), `#pasture`, `#fleecevendor` (`#town`).

**Saves.** State version 10: rounds `fleece` and `wine`; walker kinds `fleece` and `wine`; building kinds `pasture`, `vineyard`, `winery`; an agora's `fetch` is one clock per good. A version 9 save is migrated (`src/sim/migrate.ts`): the new round records empty, `fetch` from its one clock (for the oil stall), every home's grace at least eight months from loading. Versions 6 to 8 go through every step.

## Tests

- Determinism and replay with pastures, vineyards, a winery, three stalls, their carts, porters and vendors; a save mid-chain (carts with fleece, grapes and wine on the road, porters out, vendors out) carries on identically.
- Production: a pasture's fleece by its grass and staff; a vineyard's harvest by its ground; a winery makes wine only from grapes in hand.
- Routing: fleece and wine carts go to the nearest storehouse with room, grape carts to a winery (never the other way round); each stall's porter fetches its own good, and with all three stalls low none waits behind another.
- The stalls: adding a fleece and a wine stall at their price, refused twice, undo and clearing.
- Fleece as a need: a townhouse with everything a fine house needs but fleece stays a townhouse and says why, then climbs once fleece comes; a fine house that loses fleece warns and goes down two months later.
- The villa: a fine house with wine becomes a villa; a villa without wine warns and goes back to a fine house; a villa pays the most tax.
- Saves: a real version 9 save (a gzipped `#fine` from the slice 10 code, `tests/fixtures/slice10-fine.save.json.gz`) loads with fleece missing, warns only after the grace, and saves again identically; the older fixtures still load.
- The earlier demos: the cottage demos fingerprint exactly as before; `#closed` tells its story again (Oliver's fix loses at most a few homes); `#town` and the culture demos keep their promises (existing tests, bounds updated with reasons).
- The ledger invariant with the new costs and wages.

## Tasks

1. Plan (this file). Commit.
2. Sim: goods as data (needs, stalls, porters per stall, round and walker lists), fingerprints unchanged; the pasture, vineyard and winery; the storehouse's rooms; the fleece and wine stalls and vendors; fleece and wine as needs; the villa; the `#closed` fixes; migration; demos; tests; tune by running the culture towns and `#town` forward. Commit.
3. What Oliver sees: the pasture and its flock, the vineyard, the winery, the storehouse's new yard, the stalls, vendors, carts and porters, the villa models; overlays, signs, tips, panel lines, chatter, town lines, welcome back, build bar and keys; smoke extended. Commit.
4. Look and tune: screenshots of the new demos and the earlier ones from several angles; adjust. Commit.
5. Full checks, measure, As built, the check-in. Commit, push, sync.

## As built

Commits: plan `a2fc228`; sim `f61308d`; render and UI `3975a58`; look and tune, smoke, measurements and this section in the commits after it.

Built as designed above, with these differences:

- **Goods as data.** As planned (`GOOD_USE`, `SERVICE_GOOD`, `STALL_GOODS`, `CHAINS`, one fetch clock per stall good, the save's lists from the sim's own). Every cottage demo and `#shrine`, `#priestess` and `#grove` fingerprint exactly as at `23a8832`.
- **`#pasture` and `#fleecevendor` open on the culture town** (the `#fine` town, which now has a sheep pasture by the lane and a fleece stall at the lane's agora), not on `#town`: that is where fine houses need fleece, and its pasture stands in open grass with its flock in view. `#town` has its own pasture and fleece stall too.
- **Grace for version 9 saves** applies to homes at fine-house level and up (the ones that need fleece), at least eight months from loading; the welcome back says what to build for fleece, and mentions wine and villas.
- **`#closed`.** The `serviceScore` change (a want-to-grow home counts from now) was tried and changed nothing in `#closed`, so it was left out. What tells the story again is the town itself: its fine houses now have fleece from the lane's stall, and the cut street goes without water and plays (two icons on its signs, not four or five). The scene opens at tick 11,560 with the most urgent home at least 14 days from going down; the test rebuilds the theatre across from the shrine and mends the ringed road at once and loses at most 8 homes a level; left alone, 26 go down.
- **`#town`.** It gets a sheep pasture and a fleece stall after its oil and before its theatre. To keep its promises the theatre moved from (57, 42) to (63, 36), where it reaches the far east end of the main street (from (57, 42) the east end went without plays for up to 46 days at a time); `NEWEST` (how long the newest homes stay tents) went from 120 to 300 ticks so tents still show. It opens with 724 people and 513 drachmas (was 596 and 531): 5 tents, 21 huts, 10 cottages, 7 townhouses, 38 fine houses. Two years on it has no drops; 99 warned home-days in all, the longest run 12 days.
- **`#harsh`** runs harsh taxes for 950 ticks before opening (was 450): the town is richer with fleece and nobody had left by 450.
- **`#nooil`** rebuilds its storehouse a day after clearing the press and storehouse, so fleece keeps reaching the fine houses and only oil goes missing. Its test asks for at least 3 warned fine houses (the warnings come later than in slice 10, as the stall's oil runs down).
- **The flock** is nine sheep (cream, two grey, one black): three in or by the stone fold, the rest grazing a ring 1.9 to 2.8 tiles out on open ground, falling back to the fold where there's none. No shepherd walks with them; his crook leans by the hut. The fold is a ring of terrace stones with a gap toward the road, beside a stone hut under thatch and an open shearing shelter.
- **The vineyard**: four rows of four trellised vines, each length on its own ground, clumps of leaves along a wire between stakes (the first version, a solid hedge of leaves on stilts, read as tables, so it was broken into clumps); bunches of grapes under the leaves coloured green to purple as the crop ripens; a whitewashed hut with a pergola and baskets of grapes.
- **The winery**: a stone press house under tiles with a wine-red band, a round treading vat of purple must with an upright stone, a lean-to, baskets of grapes waiting and amphorae as its store fills.
- **The villas**: two variants as planned, in warm cream stucco with a Pompeian red band (not ochre or rose walls). The peristyle villa's wing roofs first stood as thin slabs above the walls; they now run on from the outer walls, which rise to meet them, over a beam on the columns and slope down into the court, and the portico of the garden villa likewise.
- **The storehouse yard**: 16 jars of oil in a 4 × 4 grid on one side, bales stacked at the back, amphorae on the gate side.
- **Signs** take up to seven icons (rims 6 and 7).
- **Screenshot tooling**: the debug `jump` now stops following, so a shot can look at a building in a demo that follows a walker.
- **Smoke**: `#closed` no longer checks wide signs (its street now lacks two needs); the seven-wide sign is checked instead by warning a villa on all seven needs.

**The `#vineyard` timeline** (the culture town at `#vineyard`'s opening, two vineyards on the slope west of the town, a winery across the road and a wine stall at the lane's agora, all at once): the first amphorae reach a home 153 days after planting and the first villa follows a day later. The treasury goes from 968 to 397 drachmas on building and touches 33 at its lowest.

**Demos at opening** (tick, people, drachmas, levels tent/hut/cottage/townhouse/fine/villa):

| | Slice 10 | Slice 11 |
|---|---|---|
| `#shrine` | 4050, 502, 468, 0/6/21/17/0 | unchanged |
| `#theatre` | 5340, 640, 290, 0/0/6/25/13 | 7440, 713, 395, 0/0/6/25/13/0 |
| `#fine`, `#pasture`, `#fleecevendor`, `#vineyard` | 6840, 802, 561, 0/0/6/0/38 | 8940, 830, 968, 0/0/6/0/38/0 |
| `#closed` | 9690, 876, 2,140 | 11560, 876, 2,231, 0/0/6/0/38/0 |
| `#town` | 7200, 596, 531, 2/14/10/6/39 | 8400, 724, 513, 5/21/10/7/38/0 |
| `#nooil` | 7850, 843, 714 | 10570, 873, 832 |
| `#harsh` | 7650, 631, 953 | 9350, 809, 1,679 |
| `#winery` | | 10040, 866, 647, 0/0/6/0/38/0 |
| `#villas`, `#winevendor` | | 13840, 910, 1,558, 0/0/6/0/24/14 |

**Padding.** The wine cart first came to 2,808 vertices and the wine porter to 1,458, over the oil cart's 2,412 and the stag's 1,356, which would have made every walker dearer to draw; the cart now carries four amphorae and the porter two, and the padding is back to 1,356 and 2,412.

**`scripts/measure.mjs`** pressed L once to turn `#food`'s overlay off, which with five overlays left it on through the later views; it now presses until the overlay is off (`#food`'s vendor and harvest views measured with an overlay on before: 528 k and 556 k then, 494 k and 522 k now without).

**Measurements after** (same machine and method as Before): 178 tests in 17 files, all passing; bundle 1,042 KB raw, 299 KB gzipped; ready at 1.04 s, first frame 1.25 s; the opening views and every cottage demo unchanged; `#fine` 634 k, 71 / overview 812 k, 103; `#closed` 617 k, 79 / 808 k, 112; `#town` 812 k, 83 / street 745 k, 71 / overview 929 k, 109, ready 1.57 s, first frame 2.08 s, 724 people, 58 walkers; `#villas` 712 k, 80 / winery 627 k, 59 / overview 888 k, 110; update per frame paused / running `#food` 0.76 / 0.89 ms, `#fine` 0.57 / 1.61, `#town` 0.74 / 5.25; 55 geometries, 6 textures; a save of `#town` 248 KB.
