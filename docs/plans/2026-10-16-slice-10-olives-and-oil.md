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

