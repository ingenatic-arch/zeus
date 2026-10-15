# Slice 3 — Water

*15 Oct 2026. Phase 1, "A living neighbourhood" (`docs/specs/2026-10-15-living-neighbourhood-design.md`). Builds on slice 2, "Streets and settlers".*

## Goal and check-in

Oliver places a fountain beside a road. A water carrier, a woman with a jar on her head, steps out of it and wanders the streets, choosing her turns at junctions, until she has walked her range; then she heads home by the shortest way and, after a short rest, sets off again. Every home beside a road she passes has water for a while. Tents with water become huts: solid little mud-brick homes with thatched roofs, which hold more people, so more settlers come. A water overlay shows which streets she can reach and which homes have water, and hovering over any home says what reaches it, and if nothing does, why not ("the nearest fountain is 38 steps away along the road; its water carrier walks 32"). A hut whose water stops for a month goes back to a tent, and the people it can no longer hold walk out.

**Oliver can:** place a fountain, follow the water carrier, see tents become huts, and use the overlay to find the street she missed.

**Demo links** (bare hash tokens, as in slice 2; a dash combines them):

- `#water`: a neighbourhood on the plain west of the river, a few months in: a fountain by the main junction, the carrier out on her round, some tents already huts, and a long lane running north whose far end she never reaches. Time running.
- `#carrier`: the same town at street level, with the camera following the water carrier as she walks.
- `#fountain`: the same town of tents before any fountain, with the fountain tool picked, ready for Oliver to place his first one.
- `-overlay`: add to any link to start with the water overlay on (`#water-overlay`).
- Earlier tokens keep working: `#streets`, `#settlers`, `#build`, the camera views, and the speed tokens.

## Not in this slice

Workers for the fountain (slice 4: buildings will need workers from housing); food, cottages and rent (slice 4); the household panel, warning icons on houses and gradual decline with its warning period (slice 5; here a hut simply goes back to a tent a month after its water runs out, and the hover tip says when); other overlays (food, religion, culture, "what's missing"); bridges (slice 4); saves to the browser (slice 7); sound.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- Sim code (`src/sim/`, `src/map/`) stays pure and deterministic: seeded RNG in the state, no `Math.random`, `Date`, `performance` or timers (the purity test enforces it). Every player action reaches the sim as a command through the queue.
- The renderer only reads sim state. Static build, `base: './'`, no runtime network requests, all art in code.
- Judge by screenshots, tune by eye, never claim it looks right on Oliver's behalf.
- Earlier demo links must still work and look the same when the new things aren't used, except where a handed-over finding asks for a change (settlers now arrive faster when there is plenty of room).

## Before

Measured at `4910132` (the end of slice 2's review), `npm run measure`, headless Chromium with software WebGL at 1920 × 1080:

| | Before |
|---|---|
| Tests | 42 in 6 files, all passing; typecheck clean |
| Bundle | 3 files, 632 KB raw, 170 KB gzipped |
| Load (local, headless) | ready in 2.9 s (2.1–2.9 s over repeated runs in slice 2); coast bake 0.41 s, scene build 0.81 s |
| Triangles, opening view / close views | 542 k / 376–403 k |
| Draw calls, opening view / close views | 125 / 69–76 |
| `#streets` (24 homes, 59 road tiles, 8 groups walking) | 384 k triangles, 88 draw calls (overview 558 k, 144) |
| GPU objects (`#streets`) | 22 geometries, 4 textures |
| Frame rate | not measurable headless (1–2 fps under software rendering) |

## Design decisions

**State, version 3.** `SIM_STATE_VERSION` goes to 3; there are no saves yet, so nothing breaks, and a version 2 state is refused plainly.
- `Building` gains `kind` (`'home'` or `'fountain'`), `waterUntil` (the tick a home's water lasts until; 0 for never), and, for fountains, `walker` (the carrier out, 0 if none), `clock` (ticks until the next carrier sets off) and `turn` (which side of the fountain she leaves by next, so successive carriers set off different ways). Every building carries every field, so the state stays uniform plain data.
- `Walker.kind` gains `'water'`; every walker gains `origin` (the fountain a carrier belongs to), `back` (heading home), `steps` (road tiles walked out) and `trail` (road tiles walked this round, which she prefers not to walk again, and which the overlay shows).
- `tilesRev`: bumped only when tiles change, so the road tool's cached route survives settlers arriving and houses changing (finding handed over).
- `UndoEntry.removedKinds`, so undoing a clear brings a fountain back as a fountain.

**The fountain.** A 2 × 2 building, on the same ground rules as a housing plot, costing 150 drachmas (starting money stays 5,000). It works only with a road beside it; without one it waits and says so. New command `fountain { at }` (top-left tiles), undoable and clearable like plots; clearing a fountain sends its carrier home at once (she vanishes into it).

**The water carrier** (`src/sim/water.ts`), Zeus-style:
- She sets off 2 seconds after the fountain is built (and 3 seconds after she gets back), from one of the road tiles beside it, taking each side in turn.
- She walks one road tile at a time at 1 tile a second at normal speed (a little slower than settlers, so she is easy to follow). At each tile she looks at the road tiles beside it, not counting the one she came from: one way on, she takes it; a dead end, she turns round; a junction, she prefers a way she hasn't walked this round, and picks among those with the seeded random numbers. Choosing tile by tile means she always walks the roads as they are now.
- After 32 tiles out she turns for home along the shortest road (a breadth-first search back to her fountain, done once; redone only if the road ahead is cut), still watering as she goes. If no road leads home, she is gone and the fountain sends another.
- Every home beside a road tile she stands on (orthogonally, the same "beside" as a plot needing a road) has water for 2 months (600 ticks).
- She never uses `overland()` (finding handed over).

**Reach.** Because she walks at most 32 tiles out, a home whose nearest road tile is more than 32 road steps from a fountain can never get water. One breadth-first search from the road tiles beside every fountain gives the distance for the overlay and the hover tip; this is how the "house at the end of a long lane" is explained.

**Houses.** Each home is looked at once a day (staggered by id so they don't all change on the same tick):
- a tent with people and water becomes a hut (level 2), which holds 9 (a tent 5);
- a hut whose water ran out a month ago (300 ticks) goes back to a tent; people beyond the tent's 5 pack up and walk out by road, as when a home is cleared.
Settlers then come to fill the huts' extra room as they do for tents.

**Settlers come faster when there's room and water** (finding handed over). After each look for a home, the wait before the next is `40 / (1 + room / 30 + 1.2 × water)` ticks, between 12 and 40, where `room` is the free room in homes the road from the edge reaches and `water` is the share of lived-in homes that have water. At most `4 + room / 8` groups are on the road at once (up to 30). One tent's worth of room gives about one group every 3.4 s as before; a large empty district a group every 1.2 s; water shortens the wait when room is scarce. The population figure's tooltip says how often newcomers are arriving and why.

**Rerouted settlers keep looking** (finding handed over). A group whose home has gone takes the first home it can reach with room for the whole group; failing that, the reachable home with the most room, and only the people who fit move in (the rest never arrive). A group that finds its home full on arrival (a hut went back to a tent) does the same.

**What Oliver sees.**
- *Fountain:* a paved square with a round stone basin of blue water, a fluted column with a bowl spilling water, a couple of jars by the rim.
- *Huts:* two variants, distinct from tents at a glance: whitewashed mud-brick walls on a stone plinth, a thick golden thatch (a ridged roof on one, a round hut with a conical roof on the other), a dark doorway facing the road, a small yard with a woodpile or a fence, the cooking fire and its smoke kept. They rise into place like tents.
- *Water carrier:* a woman in a pale blue dress with a terracotta water jar on her head, one arm raised to steady it.
- *Water overlay* (the drop button or O; on automatically while placing a fountain): road tiles she can reach are tinted blue, paler towards the edge of her range, her current round's trail brighter; homes with water get a blue column over them whose height is how long their water lasts; homes without it a short terracotta stub; the ground of each plot is tinted to match. While placing a fountain, the reach of the new one is previewed and the label says how many homes it would bring water to.
- *Hover tips* (no tool picked) on two lines: "A tent · 4 people · room for more" then "Has water (18 days left) · becoming a hut", or "No water · the nearest fountain is 38 steps away by road; its water carrier walks 32". Fountains say what their carrier is doing; hovering the carrier says how far into her round she is.
- *Following:* click the water carrier (or her fountain) with no tool picked and the camera follows her, through rests and new rounds, until you drag, pan or press Esc; a small label says so.
- *Build bar:* fountain (B) beside the housing tool; the water overlay toggle (O) after undo.

**Rendering findings handed over.**
- `Homes.sync` refills only the chunks whose buildings changed (added, removed, or a different kind, level or facing), not every chunk.
- The placing overlay's texture is rewritten only when the marks actually change, and only the tiles that changed are cleared.
- The road preview's route is cached against `tilesRev`, not `rev`.

## Tests

- Determinism: the scripted city gains a fountain; same seed and commands give the same city; replay; save and load mid-round (carrier on the road) carries on identically; a version 2 state is refused plainly.
- The carrier: on a hand-made layout she walks only road tiles, never further than 32 road steps from her fountain, turns at dead ends, comes home and sets off again; homes beside her way get water and tents become huts; a home at the end of a lane beyond her reach never does; clearing the fountain takes her away; a cut road sends her home another way or ends her round.
- Houses: a hut without water goes back to a tent after a month and its extra people leave; settlers fill a hut to 9.
- Settlers: the arrival wait shortens with room and water; a rerouted group finds another home with room for all of them rather than leaving.
- Undo and clear: a cleared fountain comes back as a fountain on undo; undoing a fountain refunds it.
- Budgets: `npm run measure` adds the `#water` scene.

## Tasks

1. Plan (this file). Commit.
2. Sim: state v3, `kind`, fountain command, the water carrier, reach, houses changing level, arrival rate, rerouting, `tilesRev`; tests. Commit.
3. Render and UI: fountain, huts and carrier models, the overlay (ground tint and columns), the fountain tool with reach preview, hover tips, following, overlay button, demos and links; the handed-over rendering findings. Commit.
4. Look and tune: build, drive it headless, screenshot from several angles, look and adjust; extend smoke and measure. Commit.
5. Full checks, "As built", check-in. Commit, push, sync.

## As built

Commits: `6b73476` plan; `8e8ec62` sim; `0d96e47` render and UI; `16bb183` carrier round tuning; `36355bf` look and tune; `3895dd7` smoke and measure; then this write-up and the check-in.

**Where it differs from the design above**, all found by running the sim on the demo town and looking:
- *Water lasts 4 months (1,200 ticks), not 2.* With 2 months, one carrier could not get round even a compact town of about 45 homes before the first homes she watered dried out again, so huts kept falling back to tents in a town that was well inside her reach.
- *How she chooses at a junction.* Picking at random among ways not walked this round left about half the homes in reach dry. Preferring the oldest-walked road drew her into empty dead ends. As built, at a junction she looks up to 16 road tiles down each way (not past her reach) and takes the way to the home whose water runs out soonest; where that is a tie (often: nobody watered yet), she takes the next way round from the one a carrier last took out of that junction (`SimState.exits`), so successive rounds cover different streets. Where no lived-in home lies ahead but some lie behind, she turns round rather than walk an empty road. No random numbers are used.
- *Range and round are two numbers.* `CARRIER_RANGE = 32` is how far by road from her fountain she ever goes (and what the overlay and the hover tip use); `CARRIER_WALK = 48` is how much road she walks on a round. Only road not yet walked this round counts towards the 48, so going back down a dead end or along a street she has just watered doesn't use up her round; she turns for home after 96 tiles in all whatever happens.
- *She walks at 1.2 tiles a second*, the same as settlers (0.12 a tick), not slower: at 1 tile a second her rounds were too long for a town of this size. Her bright blue dress and big jar make her easy to pick out anyway.
- *No `trail` field.* Instead `SimState.carried` (the tick a carrier last stood on each road tile; the overlay draws recently walked roads brighter) and `SimState.exits` (above). Walkers gained `origin`, `back`, `steps` and `since` (the tick her round began).
- *Huts have mud walls, not whitewash.* Whitewashed, they read as cottages, which is the next step up (slice 4).
- *Settler groups on the road*: at most `4 + room / 8`, up to 30, as designed.

**Handed-over findings, as built:**
- Road preview route cached on `tilesRev` (`Tools.routesFound` counts recomputes; the smoke test checks it doesn't grow while settlers arrive and tents turn to huts).
- Arrival rate tied to free room and water: `arrivalInterval(room, water)`; the population tooltip says how often newcomers come and why.
- Rerouted settlers take a home with room for the whole group, else the one with the most room (the group is trimmed); a group finding its home full on arrival does the same.
- The carrier uses `roadSearch`/`tracePath` and the shared walker shape (`src/sim/walk.ts`); never `overland()`.
- `Homes.sync` refills only chunks whose buildings changed look (kind, level, facing), counted in `homesRefilled`.
- `Building.kind`, state version 3 (version 2 refused plainly); `homeStatus()` (now in `src/sim/status.ts`) gives "what reaches this house".
- The placing texture is rewritten only when marks change (`markWrites`; the smoke test checks pointer moves within one tile write nothing).
- No bridges.

**Checks at the end:** 54 tests in 7 files pass (11 new in `tests/water.test.ts`, 1 new in determinism: save and load mid-round, with the scripted city now gaining a fountain and huts); typecheck clean; `npm run build` clean; `npm run smoke` passes with the new water steps; `npm run measure` below. A scratch run of a 161-building, 492-road-tile town with 20 fountains costs 0.065 ms a sim tick.

| | Before | After |
|---|---|---|
| Tests | 42 | 54 |
| Bundle | 632 KB raw, 170 KB gzipped | 657 KB raw, 178 KB gzipped |
| Load (local, headless) | ready in 2.9 s (2.1–2.9) | ready in 2.7 s |
| Opening view / close views | 542 k triangles, 125 calls / 376–403 k, 69–76 | unchanged |
| `#streets` | 384 k, 88 calls (overview 558 k, 144) | 389 k, 88 (overview 563 k, 144) |
| `#water` (46 homes, 40 huts, 93 road tiles, 21 walkers) | — | 511 k, 112 calls; overlay on 545 k, 114; street level 491 k, 104; overview 652 k, 156 |
| GPU objects | 22 geometries, 4 textures | 28 geometries, 5 textures |

A hut is about 900–1,200 triangles (a tent about 450–530); 40 huts add about 41 k. A few hundred huts would add 250–350 k, worth watching against the frame-rate budget once it can be measured on real hardware.
