# Slice 10 — Olives and oil, and the storehouse

*16 Oct 2026. Phase 2, "A richer city" (`docs/specs/2026-10-16-a-richer-city-design.md`). The third slice of the phase. Builds on slice 9, "Meat and cheese", and its review.*

## Goal and check-in

The city makes its first good. Olive groves go on the dry slopes, where the wild olives already grow: rows of trees whose fruit ripens from green to black and is picked into baskets. Ox carts take the olives to an olive press, a stone press house with a crushing basin and a beam press, which makes jars of oil; carts take the jars to a storehouse, a walled yard where the jars stand in rows. The agora gets room for stalls beside its food stall, and the first of them, the oil stall, is added to an agora from the build bar: its porter fetches jars from the storehouse and its oil vendor walks her round with two jars on a yoke. Townhouses now need oil as well as their two kinds of food and the blessing, so a cottage climbs only once oil reaches it, and a townhouse without oil warns and, two months later, goes back to a cottage. An oil overlay shows who has oil and where the vendor walks. Under it all is one model for "a workplace that turns time and workers (and, for the press, an input) into stock" and one for "a store that takes some wares, each in its own room", which wheat, meat and cheese now use too, so fleece and wine (slice 11) and the ship's quay (slice 13) only add data.

**Oliver can:** build a grove, press, storehouse and oil stall, watch jars stack in the yard and the oil vendor on her round, and see which townhouses warn without oil.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#grove`: build it yourself. The culture town as its shrine has blessed its cottages, which have bread, meat and cheese but no oil, so none has climbed; the olive grove tool is in hand over the dry slope by the lane. Build a grove, a press, a storehouse and an oil stall (K twice on the agora) and watch the cottages become townhouses as oil reaches them.
- `#oil`: `#town` over its olive groves and press on the slope north of the main street, carts coming and going.
- `#storehouse`: `#town` over its storehouse, jars standing in the yard.
- `#oilvendor`: `#town` at street level following the oil vendor, the oil overlay on.
- `#nooil`: the fine-house town (`#fine`) three months after its press was cleared: its fine houses warn without oil, the oil overlay is on and the panel is open on the house closest to going down.
- `-overlay` on these shows the oil overlay.
- Every earlier token keeps working.

## Not in this slice

Fleece, wine and the villa, their stalls and vendors (slice 11; the goods list, the storehouse's rooms and the stall slots for them exist, unused); fire and collapse (slice 12); the trading post, porters to the quay and sales (slice 13); retuning money pressure (slice 14); smaller saves beyond what this slice needs; seasons for the olive harvest.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- Sim code (`src/sim/`, `src/map/`) stays pure and deterministic: seeded RNG in the state, no `Math.random`, `Date`, `performance` or timers (the purity test enforces it). Every player action, adding a stall included, reaches the sim as a command through the queue.
- Money moves only through `pay` (`src/sim/treasury.ts`); building costs (and the stall's) come from `priceOf`; new workplaces pay wages through their jobs (`jobsAt`, which counts an agora's stalls).
- Moving wheat, meat and cheese onto the shared production and storage model must not change a single history: the cottage demos (`#water`, `#carrier`, `#fountain`, `#food`, `#vendor`, `#harvest`, `#chain`, `#workers`, `#bridge`, `#people`, `#warning`, `#decline`, `#missing`, `#streets`, `#settlers`) are fingerprinted before and after (tick, people, money, every home's place, level and people, walkers) and must match exactly.
- Demos with townhouses and fine houses get an oil chain where it keeps their story; what moved is said in the check-in.
- The renderer and UI only read sim state. Static build, `base: './'`, no runtime network requests, all art generated in code.
- Draw calls go down, not up, though this slice adds a vendor, carts and a porter: the walker looks are merged first (below).
- Judge by screenshots, tune by eye, never claim it looks or feels right on Oliver's behalf.

## Before

Measured at `3d1df90` (the end of slice 9's review), headless Chromium with software WebGL at 1920 × 1080:

| | Before |
|---|---|
| Tests | 157 in 15 files, all passing (21 s); typecheck clean (1 s) |
| Bundle | 3 files, 951 KB raw, 272 KB gzipped |
| Load (local, headless, page clock) | ready at 1.39 s, first frame at 1.67 s; coast bake 0.41 s, scene build 1.18 s |
| Opening view / overview / river / street / bay | 566 k triangles, 63 calls / 575 k, 65 / 387 k, 34 / 407 k, 36 / 409 k, 32 |
| `#water` / overview | 523 k, 60 / 686 k, 88 |
| `#food` / overview | 460 k, 71 / 651 k, 104 |
| `#fine` / overview | 549 k, 106 / 728 k, 138 |
| `#closed` / overview | 528 k, 119 / 723 k, 153 |
| `#town` / street / overview | 704 k, 118 / 641 k, 103 / 822 k, 144; ready at 1.69 s, first frame 2.18 s (setup 0.65 s); 616 people, 81 homes, 47 walkers, 96 buildings |
| Update per frame, paused / running | `#food` 0.83 / 1.21 ms; `#fine` 1.04 / 1.87; `#town` 1.32 / 6.32 (14 frames, noisy) |
| GPU objects | 66 geometries, 4 textures |
| A save of `#town` | 215 KB |
| Demos at opening (tick, people, money, levels tent/hut/cottage/townhouse/fine) | `#food` 3600, 453, 1,714 dr, 6/0/38/0/0; `#shrine` 4050, 503, 507 dr, 0/6/18/20/0; `#theatre` 4800, 601, 17 dr, 0/0/6/21/17; `#fine` 6300, 781, 336 dr, 0/0/6/0/38; `#town` 7200, 616, 728 dr, 2/21/10/6/39 |

## Design decisions

**Wares: one list for everything carried and stored** (`src/sim/foods.ts` grows into the wares, `src/sim/goods.ts` names the goods).
- Wares in a fixed order, saved by index: wheat, meat, cheese (the foods, as now: 0, 1, 2), then the goods: olives, oil, fleece, grapes, wine (3 to 7). Fleece, grapes and wine are in the list now so slice 11 only adds producers and data.
- A building keeps foods where it does now (`stock`, `meat`, `cheese`) and goods in a new `goods` array (one number per good: a grove's olives, a press's olives and oil, a storehouse's oil, an agora stall's oil); `goodsIn` is room reserved by carts on their way (as `incoming`, `meatIn`, `cheeseIn` for foods). `held`, `setHeld`, `coming`, `addComing` take any ware.
- A cart carries one ware (`food` holds its index, as now).

**The shared production model** (`src/sim/production.ts`). A table of makers, one row per kind: what it makes, its own store, and how it makes it.
- *A crop* (the wheat farm, the olive grove): grows with its workers to a harvest, which fills its store (exactly the farm's arithmetic now: growth to `GROW`, reset, harvest scaled by the ground).
- *A batch* (the dairy, the olive press): every so many ticks of work (scaled by the ground: the dairy's grass) it makes a batch; with an input (the press: olives) only while it has the input in hand, using it up.
- *Hunted* (the lodge): its hunters fill the store (hunt.ts, unchanged).
- Every maker sends carts the same way: up to three on the road, 30 ticks apart, each with a load of its ware to the nearest building with room for that ware.
- The steps run in the same order as now (farms, lodges, lodge carts, dairies), then groves and presses, so towns without them have exactly the histories they had.

**The shared storage model.** A table of rooms: for each kind of store, how much of each ware it holds. The granary: wheat 3,200, meat 1,200, cheese 1,200 (as now). The storehouse: oil 1,600 (fleece and wine get rooms in slice 11). The press: olives 600 (its input). Carts look for the nearest store with room for their ware (olives go to a press, oil to a storehouse, foods to a granary), wait at its gate while its workers unload (faster with more of them), and take their load home if there is nowhere to go. Rethinking when the target is cleared works for every ware.

**The olive grove** (3 × 3, 180 dr, 6 workers).
- *Dry ground.* A spot's olive ground is worked out from the map: dry (not the green flood plain), not rock, above the shore (`oliveOf`); a grove needs at least 35% and yields in proportion. The placing tool washes rust over the river land, the crags and the sand, and the tip says how good the ground is and about how much oil a month a grove there would give. (Most of the hillsides and the scrub round the wild olives suit.)
- *The crop.* A full harvest of 300 measures of olives every two months on the best ground, fully worked (tuned); its store holds 600. Carts take the olives to a press.

**The olive press** (3 × 3, 250 dr, 6 workers): 30 measures of olives into 30 jars of oil every 3 days, fully worked (300 a month), while it has olives; it holds 600 olives and 600 jars. Carts take the oil to a storehouse.

**The storehouse** (3 × 3, 250 dr, 4 workers): a walled yard of jars, with rooms for oil (and later fleece and wine); hovering it says what it holds and what carts are bringing.

**The oil stall** (on an agora, 120 dr, 2 more workers at the agora).
- *Stalls* are part of the agora: an agora has a set of stall slots for goods (`stalls`, one bit per good). The oil stall is added with a command (`{ type: 'stall', at, good }`, `at` any tile of the agora) from a tool: K picks the agora, K again the oil stall, and clicking an agora without one adds it. Undo takes it off again while it holds nothing; clearing the agora takes it with it.
- *Its porter* (a second porter, carrying one good) goes when the stall's oil is down to 400 of its 800 and a storehouse he can reach has oil, and brings back up to 400 jars.
- *Its vendor* walks the shared round (`src/sim/rounds.ts`) like the food vendor (same reach and round length), from her own clock on the agora (`vclock`). She sells oil to cottages and better: a home she tops up has oil for four months, and it costs a jar a month for every five people (tuned), so a fine house of 21 uses about four jars a month. A cottage wants oil only once the city has an oil stall (as it wants the priestess only once there is a shrine).

**Townhouses need oil.**
- The ladder: hut (water) → cottage (one food) → townhouse (blessing, two foods, oil) → fine house (plays, three foods). The needs per level are a table (`LEVEL_NEEDS`), not a slice of a list, and oil is a need (a `Service`) with its own round record, so the household panel, warnings, decline, the missing overlay and the tips treat it like the others: a townhouse without oil warns after ten days and goes down two months later.
- *Grace.* `grace` now covers oil as well as food. A version 8 save is migrated with every home's grace set to at least eight months after loading (tuned against how long a new grove's first oil takes to reach the homes), so its townhouses and fine houses say they lack oil at once but nothing warns until then.

**Readable**
- *Hover tips:* the grove (workers, its olive ground, the crop and when it's picked, its store, carts); the press (workers, olives in hand, jars made a month, carts, or what it waits for); the storehouse (what it holds of each good, carts bringing more, full rooms); the agora (its stalls, the oil vendor and the second porter); the oil vendor, the carts and porters by what they carry; a home's oil line ("Oil · lasts 40 days", or "No oil for 12 days: the agora has no oil stall yet: K K on an agora adds one").
- *The household panel:* "What they have" and "What they lack" include oil and why it's missing (no grove, no press, no storehouse, no oil stall, the vendor hasn't come); the next-level line for a cottage names oil.
- *Moods and chatter:* oil in the lamps lifts a mood a little; a townhouse without oil grumbles. New lines about oil, olives and the press.
- *Town lines:* homes warning for want of oil get a line naming what the chain lacks (as meat and cheese have).
- *The oil overlay* (L three times, or its button): roads in the oil vendor's reach in olive green, each home that wants oil with a column as tall as its oil is fresh, a stub where it has none; groves, presses, storehouses and agoras with an oil stall marked.
- *Keys.* Every letter is taken, so: M cycles farm, hunting lodge, dairy, olive grove, olive press; G cycles granary, storehouse; K cycles agora, oil stall; L cycles food, variety, oil, off. The build bar has a button for each.

**What Oliver sees**
- *The grove:* rows of olive trees (silver-green, gnarled trunks), each on its own ground on a slope, their fruit showing as it ripens; a little picker's hut, ladders and baskets of olives as the store fills; a low stone terrace wall.
- *The press:* a stone press house under tiles, a round crushing basin with an upright millstone turned by a pole, a beam press with its weight stone, olive baskets waiting, and jars of oil (as many as its store) by the door.
- *The storehouse:* a walled yard with a gateway to the road and a lean-to shed at the back; jars of oil in rows (and room left for bales and amphorae).
- *The oil stall:* a small stall with a striped awning at the agora's side, jars on its counter as it is stocked.
- *The oil vendor:* a woman in an olive-green dress and a pale headscarf with a yoke across her shoulders and a jar hanging at each end.
- *Carts and porter:* ox carts with baskets of dark olives or jars of oil in straw; the porter's handcart with jars.
- *The walker merge.* Every walker and animal look (settlers, the service walkers, carts, porters, hunters, deer, boar, goats and the new looks) goes into two instanced meshes, one for people and animals and one for carts, drawn once each for the whole map (plus their shadows). Each instance picks its look from a data texture holding every look's vertices (position, colour, which part is tinted, which legs swing), read in the vertex shader by vertex number; a look with fewer vertices than the largest is padded with empty triangles. Draw calls for walkers and animals go from about 34 in `#town` to 4.

**Fixes handed over**
- `herdsInReach` uses a herd's home and roaming radius, not where it stands now, so a herd near the 40-tile line no longer flickers in and out of a lodge's reach.
- The smoke test's clock-speed check waits on ticks and frames instead of a fixed second and a half of real time; screenshots and smoke wait a few frames after a jump before hovering or reading positions.

**Demos**
- *Cottage demos are untouched* (fingerprinted).
- *The culture towns* (`#shrine` … `#closed`) get an olive grove, a press, a storehouse and an oil stall at the lane's agora at the same time as their lodge and dairy (`MEAT_AT`), so their townhouses and fine houses have oil; `#grow` and `#table` get the same chain before they open, so placing the shrine still lifts `#grow`'s cottages and `#table`'s cottages still climb as cheese arrives. Their numbers at opening will move and are re-checked against their check-ins.
- *`#town`* gets olive groves on the slope north of the main street, a press and a storehouse between them and the core, and oil stalls at both agoras, as its builder would, waiting for the money. Its history changes; re-checked (every level, the bridge, a few hundred people, no drops in two years, money within the slice 8 bound). The money and hunt demos follow from it.
- New: `#grove`, `#oil`, `#storehouse`, `#oilvendor`, `#nooil` as above.

**Saves.** State version 9: buildings `goods`, `goodsIn`, `goodsUntil` (a home's supply of each good), `stalls`, `vclock`, `fetch`; the `oil` round; kinds `grove`, `press`, `storehouse`; walker kind `oil`. A version 8 save is migrated (`src/sim/migrate.ts`): every new field empty, the oil round fresh, homes' grace from loading as above. Versions 6 and 7 go through every step.

## Tests

- Determinism and replay with groves, presses, a storehouse, an oil stall and their carts, porters and vendor; a save mid-chain (carts with olives and oil on the road, the porter loading, the vendor out) carries on identically.
- Production: a grove's harvest by its ground and staff; a press makes oil only from olives in hand; the dairy and the farm make exactly what they made before (the cottage fingerprints).
- Routing: olive carts go to the nearest press with room, oil carts to the nearest storehouse with room, food carts to the granary (never the other way round); the oil porter fetches from the nearest storehouse with oil; carts whose store is cleared find another or go home.
- The stall: the command adds it at its price through the ledger, an agora without a road or one that already has it refuses, undo takes it off and refunds it, and clearing the agora takes it.
- Oil as a need: a blessed cottage with two foods but no oil stays a cottage and says why, then climbs once the vendor brings oil; a townhouse that loses its oil warns and goes down two months later; the vendor's cost per visit.
- Saves: a real version 8 save (a gzipped `#fine` from the slice 9 code) loads with oil missing, warns only after the grace, and saves again identically; phase 1 and slice 8 saves still load.
- The earlier demos: the cottage demos fingerprint exactly as before; `#town` and the culture demos keep their promises (existing tests, bounds updated with reasons).
- The ledger invariant with the new costs and wages.

## Tasks

1. Plan (this file). Commit.
2. Sim: wares and goods, the production and storage tables (wheat, meat and cheese moved onto them, fingerprints unchanged), the grove, press and storehouse, the stall command, the oil porter and vendor, oil as a need with grace, `herdsInReach`, migration, demos; tests; tune by running the culture towns and `#town` forward. Commit.
3. What Oliver sees: the walker merge first (draw calls measured before and after), then the grove, press, storehouse and stall models, the vendor, cart and porter looks, the oil overlay, tips, panel lines, chatter, town lines, the build bar and keys; smoke extended (and its speed check waiting on ticks). Commit.
4. Look and tune: screenshots of `#grove`, `#oil`, `#storehouse`, `#oilvendor`, `#nooil`, `#town` and the earlier demos; adjust. Commit.
5. Full checks, measure, As built, the check-in. Commit, push, sync.

## As built


*Commits `0d24273` (this plan), `d3da01b` (sim), `81ede29` (what Oliver sees), `37f7fc7` (looked at and tuned), `8b7ebc2` (the animals' mesh), then the check-in.*

**What changed from the plan**
- *Numbers, from playing the towns forward.* The grove costs 150 dr with 4 workers (not 180 and 6), the press 200 with 4 (250 and 6), the storehouse 200 with 3 (250 and 4), the oil stall 100 and one more worker at the agora (120 and 2): with the planned prices and staff the culture towns couldn't pay for oil as well as meat, cheese and the theatre, and ran short of workers. A full harvest is 400 measures of olives every two months on the best ground (300 left a press idle half the time). A vendor's visit tops a home up to six months of oil (not four), a jar a month for every six people (not five): with four months and five, one press couldn't keep `#fine`'s 38 fine houses in oil. Grace for a version 8 save: eight months from loading, as planned.
- *Groves on slopes.* A grove needs 35% olive ground (`oliveOf`, `GROVE_OLIVE_MIN`) and takes ground that rises up to 2.2 across its plot (`GROVE_MAX_RISE`), steeper than any other building may stand on: the dry hillsides where olives grow are mostly too steep for houses.
- *The goods porter* fetches when the stall's oil is down to 400 of its 800 (as planned), from the nearest storehouse with oil.
- *Fixes handed over.* `herdsInReach` measures from each herd's home spot (`hx`, `hz`). `lineClear` (open-country paths) now checks every tile a line touches (a supercover line): a hunter on a pruned path had clipped a house corner.
- *Welcome back.* A version 8 or older save with townhouses or better says townhouses now need oil, what to build (M ×4, M ×5, G G, K K) and that they have eight months; a version 7 or older save's line about meat and cheese no longer says six months, since the eight months cover both.
- *Mood.* Oil in the lamps is +1 for a townhouse or better that has it, 0 within its grace, −1 when it is late and −2 or −3 when it has been missing a while; a cottage with oil gets +1, and a cottage the vendor doesn't reach (where the city has an oil stall) says so at 0. `moodOf` feeds harsh-tax departures, so these weights are part of the `#harsh` history.
- *The walker merge* went into two meshes split by size, not by kind: the people on foot, the porters' handcarts and the animals in one (up to about 1,600 vertices a look), the ox carts and the hunters carrying a kill in the other (up to about 3,100). Every instance runs as many vertices as the biggest look in its mesh, so this keeps the padding small. The animals first went in with the carts, which tripled their triangles; moved in `8b7ebc2`.
- *Buildings on the slope.* The press and the storehouse are levelled to the highest ground under the main building (`HIGH_FOOT`; the house or shed sits on a stone plinth on its downhill side), and the yard pieces (the press's basin and beam press, the storehouse's walls and gate, the grove's trees and terrace walls) each stand on their own ground. Levelled to the lowest ground, as the farm and dairy are, the press was buried to its eaves on the slope.
- *Demos.*
  - The culture towns (`#shrine` … `#closed`) get two groves by the lane, a press, a storehouse and an oil stall fifty days before their lodge and dairy (`OIL_AT = MEAT_AT − 500`), three tax offices (a second on the west street and a third at the east street's end, so the collectors between them reach every home), and heavy taxes from five months before the lodge until the theatre is up. They wait for the money for their farms and the theatre, and their later scenes open as long after the theatre as before. At opening (before in brackets): `#shrine` 502 people, 468 dr, 21 cottages and 17 townhouses (503, 507, 18 and 20); `#theatre` at tick 5,340 (4,800), 640 people, 290 dr, 25 townhouses and 13 fine houses (601, 17, 21 and 17); `#fine` at 6,840 (6,300), 802 people, 561 dr (781, 336), the same 38 fine houses; `#closed` at 9,690 (8,140), 876 people, 2,140 dr (860, 788). In `#closed` the cut street now goes without oil as well as plays, blessings and water, so its signs show four icons; the smoke test takes three or more.
  - `#grow` and `#table` get the same oil chain before they open: `#grow` opens with 424 dr (1,384) and `#table` with 422 (864), the same homes.
  - `#town` runs three wheat farms (not seven: it ate about 170 of the 1,070 measures they grew, and the farms' workers were wanted for oil) and one olive grove up the slope north of the main street's east end at (83, 23), the press and storehouse below it on column 86, and oil stalls at both agoras. It opens with 596 people and 531 dr (616 and 728): 2 tents, 14 huts (21), 10 cottages, 6 townhouses, 39 fine houses. `#harsh` 631 people, 953 dr (627, 1,160); `#taxes` 632, 916 (667, 677); `#dry` opens at 8,750 (8,450); `#hunter` at 7,290 (7,347), 614 people.
  - New: `#grove` (the culture town at its shrine scene with no oil: 486 people, 1,060 dr, 38 cottages, the grove tool in hand), `#oil`, `#storehouse`, `#oilvendor` (all `#town`), `#nooil` (`#fine` with its press and storehouse cleared as it opens, played on until the first fine houses are a month from going down: tick 7,850, 843 people, 9 homes warning).
  - The cottage demos (`#water`, `#carrier`, `#fountain`, `#food`, `#vendor`, `#harvest`, `#chain`, `#workers`, `#bridge`, `#people`, `#warning`, `#decline`, `#missing`, `#streets`, `#settlers`) open exactly as before (fingerprinted against `3d1df90`: tick, people, money, every home's place, level and people, walkers). `#overhunt` too.
- *Tests with bounds moved, each with its reason in the test:* `#closed`'s warned fine houses are counted on plays alone (more than 12; the cut street's also lack oil); `#town`'s water warnings under 160 home-days (141, none down a level; was under 120); `#town`'s treasury moves under 1,800 dr a year (about 1,700 at fair; slice 14 retunes money); `#grow`'s farm test is given 5,000 dr (it has spent its savings on oil).
- *Not built:* the press's millstone and beam don't move; seasons for the harvest (as planned, not in this slice).

**What Oliver sees, as built**
- The olive grove: seven gnarled, silver-green olive trees (a ladder against one), each on its own ground, a low stone terrace wall along the back and one side, a mud-walled picker's hut under a steep thatched roof with a bench and stacked baskets, and up to six baskets of dark olives as its store fills. The fruit shows from a quarter of the way to the harvest, green, darkening to purple-black as it ripens.
- The olive press: a stone press house under red tiles on a plinth, a round crushing basin with an upright millstone and its pole, a beam press with its post and hanging weight stone, up to five olive baskets in a row and up to eight jars of oil by the door.
- The storehouse: a walled yard with a gateway to the road, a lean-to shed under tiles at the back with straw on its floor, and up to 24 jars of oil in rows.
- The oil stall: a small counter with a striped awning at the agora's side, up to four jars on it.
- The oil vendor: an olive-green dress and a pale headscarf, a yoke across her shoulders with a jar on a cord at each end. Ox carts with four baskets of olives or six jars in straw; the porter's handcart with three jars.
- Tips: placing a grove gives its olive ground and about how much oil a month, or refuses ("Poor ground for olives: groves need the dry slopes, not the river land, rock or sand (olive ground here 20%, it needs 35%)", or "Too steep"); hovering a grove, press, storehouse, stall, cart, porter or vendor says what it holds, makes and waits for. The stall line reads "Oil stall: 501 of 800 jars · the oil vendor is out …".
- The household panel lists oil under what they have and lack, with why ("the city has no olive press yet for the groves' carts to take their olives to"); the next-level line for a cottage names oil; moods and chatter about lamps and oil. The town line "Oil: N homes are going without (townhouses and better need it): …" names the missing link in the chain. Clearing a store or a grove says which wares are lost.
- The oil overlay (L three times): the oil vendor's reach in olive green, a column over each home that wants oil, as tall as its oil is fresh; the groves, presses and storehouses marked.
- Keys: M cycles farm, lodge, dairy, olive grove, olive press; G cycles granary, storehouse; K cycles agora, oil stall; L cycles food, variety, oil, off.

**Checks**
- 167 tests in 16 files, all passing (was 157 in 15); typecheck clean; build; smoke (extended: the grove tool and its tip, the oil stall tool on an agora, hovering a grove, press and storehouse, following the oil vendor, the oil overlay, `#nooil`'s town line and panel; the speed check now waits on ticks and frames). New: `tests/oil.test.ts` (olive ground and slopes; harvest by ground and staff; the press only from olives in hand; carts to the right store, and home when it's cleared; the stall command, undo and clearing; a vendor's visit; blessed cottages that climb once oil comes; `#nooil`'s fine houses going down and saying why; a real slice 9 `#fine` save (version 8) loading with oil missing, warning only after the grace, saving again identically; a save mid-chain carrying on identically, and determinism).
- Measured after (before in brackets), headless software WebGL at 1920 × 1080: bundle 994 KB raw, 285 KB gzipped (951, 272); ready at 1.30 s, first frame 1.55 s (1.39, 1.67); `#town` ready at 1.84 s, first frame 2.34 s (1.69, 2.18). Triangles and draw calls: the opening view 581 k, 59 (566 k, 63); `#water` 573 k, 46 (523 k, 60); `#food` 498 k, 55 (460 k, 71); `#fine` 643 k, 70 (549 k, 106), overview 822 k, 102 (728 k, 138); `#closed` 609 k, 84 (528 k, 119); `#town` 760 k, 79 (704 k, 118), street 702 k, 67 (641 k, 103), overview 878 k, 105 (822 k, 144). The walkers and animals draw in 2 calls and 2 shadow calls in place of 30 to 40; the triangles rise with the padded vertices and the oil buildings. Update per frame paused / running: `#food` 0.57 / 1.12 ms (0.83 / 1.21), `#fine` 0.55 / 1.81 (1.04 / 1.87), `#town` 0.72 / 4.84 (1.32 / 6.32; noisy). 55 geometries, 6 textures (66, 4); a save of `#town` 203 KB (215).
