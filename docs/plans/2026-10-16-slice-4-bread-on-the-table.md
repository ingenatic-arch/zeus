# Slice 4 — Bread on the table

*16 Oct 2026. Phase 1, "A living neighbourhood" (`docs/specs/2026-10-15-living-neighbourhood-design.md`). Builds on slice 3, "Water".*

## Goal and check-in

Oliver builds the city's first food chain. He puts a wheat farm on the green land by the river: a small farmhouse beside a field of wheat that grows from green shoots to tall gold over two months. At harvest, ox carts piled with sheaves set off down the road to the granary he built, and unload there; the granary's yard fills with sacks. He builds an agora: a paved square with a little stoa and a food stall under a striped awning. A porter pushes a handcart from the stall to the granary and back with grain, and the food vendor, a woman with a wide basket of loaves on her head, walks the streets like the water carrier. Huts she passes have food, and watered huts with food become cottages: whitewashed, with a tiled roof, holding more people. Every building needs workers, who come from the homes nearest it; a building short of workers works slower and says so ("Short of workers: 4 of 10 · working at 40%"), and building more housing fixes it. Each household now pays a little rent every month, more for a better house. And because the river cuts the map in two, a road dragged straight across it where it is narrow builds a timber bridge.

**Oliver can:** build the full food chain, watch carts and the vendor at work, and see what happens when there aren't enough workers.

**Demo links** (bare hash tokens; a dash combines them):

- `#food`: the town west of the river about a year on, with the whole chain running: a fountain, two wheat farms by the river, a granary, an agora, carts on the farm road, the vendor on her round, and many huts already cottages. Time running.
- `#vendor`: the same town at street level, the camera following the food vendor.
- `#harvest`: the same town at the farms, the camera following an ox cart to the granary.
- `#chain`: the watered town (`#water`) a little later, before any food buildings, with the farm tool picked, ready for Oliver to build the chain himself.
- `#workers`: a young town of a few tents with the whole chain already built, every building short of workers. Hover the farm; build more housing and watch them fill.
- `#bridge`: the narrow stretch of river north of the town at street level: a timber bridge already across, a farm on the far bank, and a second road ending at the bank with the road tool picked, to drag across.
- `-overlay`: add to any link to start with that demo's overlay on (food for the food demos, water otherwise), e.g. `#food-overlay`.
- Earlier tokens keep working: `#water`, `#carrier`, `#fountain`, `#streets`, `#settlers`, `#build`, the views and the speeds.

## Not in this slice

The household panel, warning icons and gradual decline with its warning period (slice 5: here a cottage simply goes back to a hut a month after its food or water runs out, and the hover tip says when); more foods, storehouses and trade; labour priorities; wages, taxes and tax collectors; the shrine and theatre and the levels above cottage (slice 6); saves to the browser (slice 7); sound. Bridges are timber road bridges only, straight across, with no traffic rules.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- Sim code (`src/sim/`, `src/map/`) stays pure and deterministic: seeded RNG in the state, no `Math.random`, `Date`, `performance` or timers (the purity test enforces it). Every player action reaches the sim as a command through the queue.
- The renderer only reads sim state. Static build, `base: './'`, no runtime network requests, all art in code.
- Judge by screenshots, tune by eye, never claim it looks right on Oliver's behalf.
- Earlier demo links must still work and look the same when the new things aren't used, except where a handed-over finding asks for a change: the fountain now needs workers (so its first carrier waits until people live nearby), and rent now comes in each month.

## Before

Measured at `56b2883` (the end of slice 3's review), `npm run measure`, headless Chromium with software WebGL at 1920 × 1080:

| | Before |
|---|---|
| Tests | 56 in 7 files, all passing; typecheck clean |
| Bundle | 3 files, 658 KB raw, 179 KB gzipped |
| Load (local, headless) | ready in 2.9 s; coast bake 0.46 s, scene build 0.84 s |
| Triangles, opening view / close views | 542 k / 376–403 k |
| Draw calls, opening view / close views | 125 / 69–76 |
| `#streets` | 389 k triangles, 88 draw calls (overview 563 k, 144) |
| `#water` (46 homes, 40 huts, 93 road tiles, 21 walkers) | 511 k, 112 calls; overlay on 545 k, 114; street level 491 k, 104; overview 652 k, 156 |
| GPU objects (`#water`) | 28 geometries, 5 textures |
| Frame rate | not measurable headless (1–1.5 fps under software rendering) |

## Design decisions

**State, version 4.** `SIM_STATE_VERSION` goes to 4; there are no saves yet, so nothing breaks, and a version 3 state is refused plainly.
- `BuildingKind` gains `'farm'`, `'granary'` and `'agora'`. Homes and fountains stay 2 × 2; the three new buildings are 3 × 3 (`sideOf(kind)`). Every building gains `foodUntil` (a home: the tick its food lasts until), `workers` (a workplace: the people working there; a home: how many of its people have work), `stock` (a farm's barn, a granary's store, the agora's food stall, in measures of wheat) and `growth` (a farm: how far the crop has grown).
- `Walker.kind` gains `'cart'`, `'porter'` and `'food'`; every walker gains `target` (the building a cart or porter is heading for), `load` (measures carried), `wait` (ticks left unloading or loading) and `trail` (road tiles a service walker has walked this round).
- `SimState.carried` and `SimState.exits` become one record per service: `rounds.water` and `rounds.food`, each with `walked` (the tick a walker last stood on each road tile, for the overlay) and `exits` (the next way round at each junction). Whether a road tile is "fresh" for a walker's round now comes from her own `trail`, not the shared record, so two water carriers sharing streets no longer lengthen each other's rounds (finding handed over). With one fountain this is exactly what happened before.
- `rent` (drachmas paid last month, for the top bar's tooltip). `UndoEntry` gains `removedStock`.

**Footprints and placing.** One placing rule for every building: each tile buildable for a home, the whole footprint not too uneven (`HOME_MAX_RISE × 1.6` for 2 × 2, × 2 for 3 × 3). A farm also needs fertile ground: the mean fertility of its nine tiles at least 0.5 (the green river land), and the tool's label shows how fertile the ground is. New command `build { kind, at }` for farms, granaries and agoras, undoable and clearable like the others. Costs (drachmas): farm 200, granary 300, agora 250, bridge 40 a tile; starting money stays 5,000.

**Workers.** Half of each household's people (rounded down) are of working age. Jobs: a fountain 2, a farm 10, a granary 6, the agora 6. Once a day the city's workers are shared out nearest first: every pair of lived-in home and workplace joined by road is taken in order of road distance (breadth-first from the workplace's roadside, cached per workplace and road layout), and each pair fills what it can. This is recomputed from the state every day, so it is rebuilt cleanly whenever buildings come and go (including undo, which gives a building a new id). A building works at `workers / jobs` of its full rate:
- *fountain:* its carrier rests `30 / rate` ticks between rounds; with nobody, no carrier sets off ("No workers · it needs 2 from homes joined to it by road");
- *farm:* the crop grows at `rate` per tick;
- *granary:* unloading a cart or loading a porter takes `40 / rate` ticks; with nobody, carts wait at its gate;
- *agora:* the vendor and the porter rest `30 / rate` ticks; with nobody, neither sets off.
The tip says "Short of workers: 4 of 10 · working at 40%", and a home's tip says how many of its people work. A new figure in the top bar shows jobs filled out of jobs, with a tooltip naming the buildings short of hands.

**The food chain** (`src/sim/food.ts`). One food, wheat, counted in measures (a measure feeds one person for a month).
- *Wheat farm:* the crop takes two months to grow at full strength (`GROW = 600` ticks), and its harvest is `480 × fertility` measures, into the farm's barn (holds 960; when full, nothing more grows). The field shows the crop growing.
- *Carts:* while there is grain in the barn and a granary joined by road has room, the farm sends an ox cart with up to 160 measures, up to three out at once, a few seconds apart. A cart takes the shortest road to the granary (room is reserved there as it sets off), unloads, and comes back the same way. If the road is cut it finds another way; if its granary goes, it heads for another with room, or brings its load home. Carts walk at 0.9 tiles a second.
- *Granary:* holds 3,200 measures; the yard fills with sacks as it fills.
- *Agora and its food stall:* the stall holds 400 measures. When it is down to half, a porter pushes a handcart to the nearest granary with food, loads up to 200 measures, and brings them back. The food vendor sets off from the stall whenever it has food, and walks her round exactly like the water carrier (the same junction rule, her own record): reach 32 road tiles, 48 fresh tiles a round, 1.2 tiles a second.
- *Food in homes:* every hut or better beside a road tile she stands on has its food topped up to last four months (`FOOD_LASTS = 1,200` ticks), paid for from the stall at one measure per person per month added. If the stall runs short, homes get what is left. Tents don't buy food yet: their families live off the land until they have water, and the tip says so.

**The junction rule, shared** (finding handed over). `wayNeeds` moves to `src/sim/walk.ts` and takes the reach limit and a per-home score (`waterUntil` for the water carrier, `foodUntil` for the vendor; slice 6's priestess and actor will pass their own). The water carrier's round logic (choosing ways, heading home, detours) moves to `src/sim/rounds.ts`, shared by both service walkers, with the per-service record passed in. The existing water tests must keep passing unchanged, except one: "clearing a fountain takes its carrier away…" builds a fountain with no homes at all, and now needs a plot with a family to work it.

**Houses.** Each home is looked at once a day, as before:
- a tent with people and water becomes a hut (holds 9); a hut with water and food becomes a cottage (level 3, holds 13);
- a home drops a level when what its level needs has been missing for a month (300 ticks), counted from when it ran out or from the home's last change of level, whichever is later: a hut needs water; a cottage needs water and food. The people it can no longer hold walk out. For huts this is exactly the rule from slice 3.

**Rent.** On the first day of each month every lived-in household pays rent by level: a tent 1 drachma, a hut 2, a cottage 4. The top bar's drachmas show it arrive, and their tooltip says how much came in last month and from how many households.

**Bridges** (finding handed over: the river splits the map). The road tool's route finder may step straight across the river, from land to land, over at most 9 tiles of river and its wet bank (never the sea), on the row or column the drag starts or ends on, so a bridge only appears where Oliver drags across. The river and its bank are at least 6 tiles wide everywhere on this map, so the 5 suggested in the handover would allow no bridge at all; 9 opens the narrower upper reaches north of the town and a few crossings in the middle of the plain, not the wide lower river. Bridge tiles cost 40 drachmas each and are ordinary road tiles to every walker. A bridge tile can't sit beside another road sideways (no wide decks). Clearing any tile of a bridge clears the whole bridge; undo puts it back. The road command carries bridge tiles like any other; the sim checks each run of wet tiles in the list is a whole, straight, short-enough span between two buildable banks. Drawn as a timber deck on posts at the height of its higher bank, with a slight arch and rails; walkers walk on the deck. A line goes into the spec's "Claude's defaults", dated, saying it was added in slice 4 because the river splits the map.

**Clearing and undo.** Clearing a farm sends its carts away at once (their reserved room at the granary is given back); clearing the agora does the same for its vendor and porter (finding handed over: tidily, like the fountain's carrier); clearing a granary sends carts heading there to another granary or home with their load, and porters home empty. Undoing a clear brings a granary, farm or agora back with the stock it had (the grain was left where it stood); workers are shared out again the next day.

**What Oliver sees.**
- *Wheat farm:* a small whitewashed farmhouse with a tiled roof and a threshing floor in one corner, the rest a field of wheat in rows on brown furrows, short and green after sowing, tall and gold before harvest, stubble just after; a fence along one side.
- *Granary:* a stone storehouse with a terracotta roof and two round, domed grain bins, and a yard where sacks pile up with the stock.
- *Agora:* a paved square, a small stoa of columns along the back, and the food stall under a striped awning with baskets of loaves and grain that fill and empty with its stock.
- *Cottages:* two lean variants (whitewashed walls, a terracotta tiled roof, a small walled yard), clearly a step above huts; kept to about the hut's triangle count.
- *Ox cart:* an ox pulling a two-wheeled cart, piled with golden sheaves when loaded, empty on the way back, with a driver walking beside. *Porter:* a man pushing a handcart with sacks. *Food vendor:* a woman in a saffron dress with a wide flat basket of loaves on her head, easy to tell from the water carrier.
- *Food overlay* (the loaf button or L; on by itself while placing an agora): roads in the vendor's reach tinted gold, homes with food a gold post as tall as their food is fresh, huts and cottages without food a terracotta stub.
- *Hover tips* (no tool picked) for every new building and walker: the farm's crop and harvest, its barn and carts, its workers; the granary's stock; the stall's stock, the porter and the vendor. A home's tip gains a food line ("Has food · lasts 32 days more" / "No food · within reach of the agora; the food vendor hasn't come this way yet") and a work line. The placing labels say what each building would do ("Wheat farm · 200 dr · fertile ground 84% · a harvest of about 400 measures every two months").
- *Following:* click the food vendor, a cart or the porter (or the agora or farm) to follow, as with the water carrier.
- *Build bar:* farm (M), granary (G), agora (K) after the fountain; the food overlay (L) after the water overlay. The top bar gains the jobs figure.

**Rendering budget.** Cottages must stay lean (about 1,000–1,300 triangles, like huts). If the `#food` overview climbs much above the `#water` overview's 652 k triangles, homes get a cheaper far-away version; otherwise that waits, with the number recorded.

## Tests

- Determinism: the scripted city gains a farm, a granary and an agora; same seed and commands give the same city; replay; save and load mid-chain (a cart on the road, the vendor out) carries on identically; a version 3 state is refused plainly.
- The chain: on a hand-made layout the farm grows and harvests; carts walk only on roads, deliver to the granary and come home; the granary's stock rises by what they carried; the porter brings grain to the stall; the vendor walks only on roads within her reach and tops up huts beside her way; fed, watered huts become cottages; a cottage without food goes back to a hut a month later and its extra people walk out.
- Workers: with too few people the farm is short-handed and grows slower in proportion; workers go to the nearest workplace first; a fountain with no workers sends no carrier; building homes fills the jobs.
- Rent: a month's rent is paid by level.
- Bridges: a straight road across a narrow stretch of river is laid as a bridge and charged as one; a span too wide, over the sea, or not on the drag's line is refused; walkers cross it; clearing one tile clears the whole bridge and undo restores it.
- The existing water tests keep passing (one setup tweak, above); `wayNeeds` in `walk.ts` gives the same choices as before on the slice 3 layouts.
- Clearing and undo: a cleared farm's carts vanish and release their reservation; undo brings a granary back with its stock.
- Budgets: `npm run measure` adds the `#food` scene.

## Tasks

1. Plan (this file). Commit.
2. Sim: state v4, footprints, the `build` command, workers, the farm, carts, granary, agora, porter and vendor, `wayNeeds` in `walk.ts` and the shared round logic, per-service records, cottages, rent, bridges, clearing and undo; tests. Commit.
3. Render and UI: farm (with its growing field), granary, agora, cottage, cart, porter, vendor and bridge models; the food overlay; the new tools and their labels; hover tips and following for the new walkers; the jobs figure and rent tooltip; demos and links. Commit.
4. Look and tune: build, drive it headless, screenshot from several angles, look and adjust; extend smoke and measure. Commit.
5. Full checks, "As built", the spec's default line for bridges, check-in. Commit, push, sync.

## As built

Commits: plan `856e975`; sim `09aeab9`; render and UI `273974d`; look and tune `90ab04d`; demos matched to this plan, check-in and this section in the last commit.

**Built as planned:** state v4 with per-service records; 3 × 3 footprints and the `build` command; workers shared nearest first each day, with every workplace (the fountain too) slowed in proportion and saying so; the farm, ox carts, granary, agora, porter and food vendor; `wayNeeds` in `walk.ts` with the round logic shared in `src/sim/rounds.ts`; cottages and their decline; rent; bridges (up to 9 tiles, on the drag's row or column); clearing and undo for all of it; the models, the food overlay, the tools and labels, hover tips, following, the jobs figure, the rent tooltip, the help card, and the six demo links.

**Changed from the plan, and why:**
- *The food stall holds 800 and the porter carries 400* (the plan said 400 and 200). With 200 a trip, one porter could bring the stall about 160 measures a month against the 350–400 a town of 40 huts eats, so the town in `#food` never got past half its huts fed while the granary sat full. With 400 it settles at about 35 cottages out of 44 homes.
- *`#food` has three farms, not two,* built a few weeks apart so their fields ripen in turn (one gold, one green, one just cut at most moments) and carts are on the road more often. `#harvest` is the same town at the moment one field is nearly ripe while the carts from the other two are on the road, and follows a cart.
- *The farmhouse is mud-walled under thatch,* not whitewashed under tiles, so it can't be mistaken for a cottage next door; the field rows run back from the yard, fenced on three sides.
- *The bridge deck* rises in a low arch from the height of each bank (not flat at the higher bank), lifted wherever it would come within 0.32 of the water.
- *The food overlay* marks homes without food with a plum stub (not terracotta, which the water overlay uses for "no water"), tints farms and granaries so the chain reads at a glance, and also comes on while placing a farm or granary.
- *The wheat casts no shadow* (it is too fine to read and costs a shadow pass per field). The farm tool also washes rust over ground that is not fertile enough.
- *Smaller fixes found on the way:* letting go of the mouse after pressing Esc mid-drag used to lay one road tile under the pointer (since slice 2); it no longer does. A bridge being dragged shows its marks floating above the water (they were hidden under it). Waits longer than two months read in months ("harvest in about 20 months" rather than "599 days").
- *No far-away cottage model was needed:* cottages cost about 400–450 triangles each (huts about 890), and the `#food` overview (621 k) stays under the `#water` overview (652 k).

**Tests:** 73 in 8 files, all passing; typecheck clean. `npm run smoke` adds the food town and both overlays, hovering the vendor, `#chain`, `#vendor` and `#harvest`, the workers demo and a short-handed farm's tip, the farm tool (label, placing, refusal on dry land), dragging a bridge and undoing it, carts on the bridge, and clearing a farm.

**After** (same machine and method as Before):

| | Before | After |
|---|---|---|
| Tests | 56 in 7 files | 73 in 8 files |
| Bundle | 658 KB raw, 179 KB gzipped | 710 KB raw, 195 KB gzipped |
| Load (local, headless, cold) | 2.9 s; bake 0.46 s, scene 0.84 s | 3.4 s; bake 0.43 s, scene 0.85 s (the slice 3 build measured 2.9–3.0 s in the same runs; see below) |
| Opening / close views | 542 k, 125 calls / 376–403 k, 69–76 | unchanged |
| `#streets` | 389 k, 88 (overview 563 k, 144) | unchanged |
| `#water` | 511 k, 112; overlay 545 k, 114; street 491 k, 104; overview 652 k, 156 | unchanged |
| `#food` (44 homes, 35 cottages, 3 farms, granary, agora, 17 walkers) | — | 463 k, 130; overlay 497 k, 132; vendor 444 k, 121; harvest 516 k, 141; overview 621 k, 179 |
| GPU objects | 28 geometries, 5 textures | 43 geometries, 5 textures |

The cold load is about 0.4 s slower than the slice 3 build measured side by side, but the game's own start-up (bake plus scene) is the same 0.8 s: nearly all of the 3.4 s is the headless browser waiting for its first paint before the game starts, so I couldn't tie the difference to the new code. Worth watching on a real machine.
