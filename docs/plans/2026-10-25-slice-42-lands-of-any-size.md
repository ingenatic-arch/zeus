# Slice 42 — Lands of any size

*25 Oct 2026. Phase 6, "Crime, health and a polished city" (`docs/specs/2026-10-25-crime-health-and-a-polished-city-design.md`). The land line's first slice (wave 1), built on `claude/p6-land` in `/home/claude/zeus-land` at the same time as slices 41, 43 and 44 on their own lines. It starts at `53e5bb4` (state version 37).*

## Goal and check-in

The spec's words: the land in the state (kind, size, seed); `MAP_SIZE` replaced by the land's size across the sim, saves, migrations, terrain, water, the camera and the minimap; `generateCoast(kind, size, seed)`, pure and seeded, starting with a generated sheltered bay at all three sizes, checked playable; the Bay unchanged, every demo exactly as before; large lands hold the frame and load budgets.

**Oliver can:** open `#landlarge` to start on a generated 256-tile sheltered bay and lay out a city, and `#landsmall` and `#landmedium` to compare.

**Demo links** (bare hash tokens, no hyphens in them):

- `#landsmall`: a generated sheltered bay of 128 tiles a side (today's size), a road in from the west edge, the treasury a new game's.
- `#landmedium`: the same kind of land at 192 tiles.
- `#landlarge`: the same kind at 256 tiles, four times today's ground.
- `-paused`, `-plain` and `-modern` on each, as for every demo.
- Every earlier token keeps working, on the Bay at 128, exactly as before.

## Not in this slice

The new-game screen with its preview (Oliver's choice; slice 46). The other kinds of land (islands, a delta, a mountain shore, a dry plain, a wooded coast; slice 46). Each kind's own palette (slice 46). A bare link or "Found a new city" on a generated land: the bare link still founds on the Bay until the new-game screen comes. Land where the sea isn't to the south (out of scope this phase). No new wares, buildings, walkers or commands.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets; the spec's parallel plan binds.
- **State version** 38 on this line (`SIM_STATE_VERSION`), with `fromSlice42` in `src/sim/migrate.ts` hooked at `if (st.version === 37)`. It fills only `land`, only if absent (the Bay). Its note at the top of migrate.ts reads "Slice 42 (Lands of any size): ...". Tests compare with `SIM_STATE_VERSION`, except the migration step's own.
- **The Bay is untouched.** A state with no land is the Bay at 128. The Bay's bake must give bit-identical arrays and the same tree list; every prepared demo must open with the same date, people, money and levels as at `53e5bb4`, and play 900 ticks on the same.
- Sim and map code pure and deterministic: seeded random numbers only (`Rng` from `src/sim/rng.ts`), maths through `src/map/dmath.ts`; the purity tests cover `src/map/generate.ts` and `lands.ts`.
- Shared files (state.ts, migrate.ts, sim.ts, main.ts, demos.ts, tests/prepared.ts, smoke.mjs, measure.mjs, CHECKINS.md) are edited in blocks headed "Slice 42"; the `MAP_SIZE` conversion is the one exception, made line by line where each use was.
- Anything changed outside the line's own files is kept small and listed under **Touched outside the line**.
- Judge by screenshots at 1920 × 1080; never claim it looks right on Oliver's behalf.

## Before

At `53e5bb4`, on a machine shared with three other lines (load 9 to 22 on 4 cores).

| What | Before |
|---|---|
| Tests | 590 passed in 49 files (8 min 29 s under load; the same commit's run on the shared machine, `scratch-41/base-test.log` and `scratch-42/baseline-tests.txt`) |
| Build | 45 s wall time under load (`scratch-41/base-build.time`) |
| The Bay's bake | hashes of every baked array, the tree list, the copper, marble, district, ground and quay grids (`scratch-42/bayhash-base.txt`), to compare bit for bit |
| Loads and triangles | measured side by side with this slice's build at the end (`scratch-42/sbs.mjs`): the bare link, `#coast`, `#town`, `#empire` and a handful of others, alternating the two builds |

## Design decisions

**The land.** `src/map/lands.ts` holds what the rest of the game asks of the land:
- `Land = { kind: 'bay' | 'sheltered', size: 128 | 192 | 256, seed: number }`; `BAY` is the Bay at 128 (seed 0).
- `landOf(s)` is a state's land (`s.land`, or the Bay if it has none); `sizeOf(s)` its side in tiles.
- `landData(land)` is its `CoastData`: the Bay's hand-made `coast`, or `generateCoast(kind, size, seed)`.
- `landMap(land)` bakes it once and keeps it (the Bay always, and the last two others); `mapOf(s)` is a state's baked map. `coastMap()` stays as the Bay's baked map, so tests and tools that mean the Bay still say so.

**The state.** One new top-level field, `land`, written by `createState` (the Bay unless a land is given). `new Sim(seed, worldSeed, land?)` founds on a land; `sim.found(land)` (a Slice 42 block in sim.ts) starts a fresh state on another land, clearing the queue and the log, so a demo's setup can found its own land and every caller of a setup (the page, the build's prepared towns, the tests) gets it without knowing. `replay(seed, log, tick, land?)` replays on a land. `mapId` stays `'coast'`.

**The conversion, for the other lines** (mechanical, so the integrator can apply it to code that merged before):
- In sim code that has a map: `map.size`, as most of it already does.
- In sim code that has only a state: `sizeOf(s)` from `src/map/lands.ts`.
- A state's baked map: `mapOf(s)` (never `coastMap()` in sim code).
- Demos on the Bay: `BAY.size` (demos.ts' `T` uses it).
- A ship's place in the bay depends on where the map's edge is, so `shipAt`, `visitorAt`, `tributeShipAt`, `inwardAt`, `pastMouth`, `giftOnMap` and `tributeOnMap` take the map's size as a last argument (`map.size` or `sizeOf(s)`).
- `MAP_SIZE` stays in `src/map/coast.ts` as the Bay's size (lands.ts reads it for `BAY`); nothing else uses it.

**The map's own things come from its data.** The Bay's copper and marble outcrops, its wild herds and its districts' places were read straight from `coast.ts` by the sim. Each now comes from the baked map's data (`map.data.copper`, `map.data.marble`, `map.herds`, the districts' places), so a generated land has its own. A generated land's districts carry the Bay's fourteen names ("below the crags", "by the bay", "on the headland" ...) at the places on that land that fit them, so every text that names a district by its index reads the same.

**The bake takes any size.** `CoastMap` gets `size`, `fieldMin` and `fieldN` as its own (the field is the map plus the same 128-tile margin of scenery each side) and keeps its `data`; `bakeCoast(data)` reads the size and the noise seed from the data (the Bay's: 128 and `COAST_SEED`). The Bay's arrays and trees must come out bit-identical (checked by a hash of every baked array before and after).

**`generateCoast('sheltered', size, seed)`** (`src/map/generate.ts`), pure and seeded. The sea to the south; the land laid out like the Bay but from the seed:
- a shore with a sheltered bay part-way along it (where it sits, how deep and wide it is), an islet in its mouth on some seeds, and a headland to the east of it that rises in cliffs, with a hill behind;
- a rocky massif in the north-west where the river rises, a river that winds from it to the bay, its flood plain the farmland;
- rolling hills along the north, the east hills, low rises inland on larger lands, mountains beyond the map;
- olive groves on the low rises and slopes, pine woods by the shore, woods for the loggers on the slopes (more of them on larger lands), cypress stands;
- copper in the crags above the spring, in the east hills and on the headland; marble on the headland's crown;
- deer on the hills and boar in the woods (more herds on larger lands);
- the fourteen districts placed on their features; a `site` to open the view on (the bay's north shore).
Features keep the Bay's sizes (a hill is as big on a large land as on a small one); a larger land has more of them and more ground between, not bigger ones. The roads in come from the north, east and west edges wherever the player lays them; the check below makes sure every edge can reach the city.

**Playable, checked by the game's own rules.** `landCheck(map, s)` (`src/map/landcheck.ts`, used by the tests and the generator's tuning) bakes the land and asks the build rules on an empty state: somewhere a farm, an olive grove, a pasture, a horse farm, a vineyard, a copper mine, a quarry, a loggers' camp, a trading post (a berth the ship can reach) and the Lighthouse can go; and the road-going ground (no water, not too steep for a road) joins the north, east and west edges to the trading post's site and to room for a city (a few thousand tiles of ground a home can stand on). The test runs it over many seeds at every size.

**The sea-side code.** Ship paths, berths, the harbour's mouth, landings and the fleet already work from `map.size` and the baked shore; the one place that assumed 128 is where a ship crosses the map's edge (`outerLength` in trade.ts), which now takes the size. Checked on a large land by sailing the merchant ship in to a quay.

**The renderer.** The terrain's grid, its surroundings and far scenery (the far bands grow with the field), the water's ground texture, wave fade and skirt, and the camera's limits read the baked map's size and field. The far coast beyond the field follows the land's own shore. The camera may stand further back on larger lands. The minimap already reads `map.size`.

**The page.** main.ts bakes the map from the state's land once the state is known (a demo's prepared town, a save, or a new game), not before. A save is always loaded by reloading the page, so the map never changes under a running scene.

**Saves.** A save carries its land in its state. Reading one checks the land (a known kind, a known size, a whole-number seed) before unpacking its tiles to that size; a land this game doesn't know is refused in plain words.

**Demos.** `#landsmall`, `#landmedium` and `#landlarge` in a "Slice 42" block: `found` the land (seeds chosen by eye from the generator's output), the seasons on, and a road in from the west edge towards the bay's north shore. They open over the land's `site` (a point the generator gives with the land; main.ts reads it from the baked map). Prepared at build time like every other demo.

## Tests

- `tests/lands.test.ts` (new): the same kind, size and seed give the same data and the same baked map (a hash); different seeds differ; `landCheck` passes over many seeds at each size; generating and baking a large land stays inside its time (a generous bound for a loaded machine; the real figure is measured in the browser).
- The Bay unchanged: the baked Bay's arrays hash to the values taken at `53e5bb4` (a test, so no later change moves the Bay unnoticed).
- Saves: a round-trip of a generated large land with a road, a building and walkers; a save with an unknown land refused; a version 37 save (a fixture made at `53e5bb4`) loads through `fromSlice42`, lands on the Bay and plays on; the migration step's own test.
- The ship on a large land: a trading post on the generated bay, the ship sails in and moors (her way in starts beyond the map's real edge).
- The existing suite, with the purity and load-order tests, unchanged (the tests that build Bay towns by tile keep `MAP_SIZE`'s value through `BAY.size`).
- The demo probe: every demo at opening and 900 ticks on, `53e5bb4` against this slice (`scratch-42/probe.ts`).

## Tasks

1. Plan (this file), with the baseline. Commit.
2. The sim: `lands.ts`, the bake at any size (the Bay bit-identical), the state's `land`, the migration, saves, the `MAP_SIZE` conversion across the sim and the tests, the map's own outcrops, herds and districts. Commit.
3. The generator: `generate.ts`, `landCheck`, `tests/lands.test.ts`. Commit.
4. Render and UI: terrain, water, the camera's limits, main.ts' wiring, the demos and their views. Commit.
5. Look and tune: each size at 1920 × 1080 in the original look (and `-modern`, `-plain`), from the opening view, zoomed out and close; tune the generator; measure the bake in the browser and the triangles and draw calls against `#coast`. Smoke and measure entries. Commit.
6. Full checks (tests, build, the slow smoke, the measure side by side, every demo's opening, a version 37 save), As built, the check-in. Commit, push.

## As built

Built as planned, in three commits after the plan (the sim and the generator together, then the demos and the page, then the checks and these notes). What differs from the plan, and what I found:

**The land.** As designed: `src/map/lands.ts` (`Land`, `BAY`, `landOf`, `sizeOf`, `isBay`, `landProblem`, `landData`, `landMap`, `mapOf`); the state's `land` written by `createState`; `new Sim(seed, worldSeed, land)`, `sim.found(land)`, `replay(seed, log, tick, land)`. State version 38, `fromSlice42` at `if (st.version === 37)`.

**The bake.** `CoastMap` keeps `size`, `fieldMin`, `fieldN`, `data`, `seed` and `herds`; `fieldSide(n)` replaces `FIELD_N`. Two exact speed-ups were needed for a large land to bake in time, both checked to leave the Bay bit for bit as it was (hashes of every array, the trees and the derived grids; now a test): the shore line and slope worked out once per column instead of once per field point, and `queryRiver` looking only at runs of the river near enough to matter (it still returns exactly the same nearest point). An islet's bump is skipped where it can't reach.

**The generator.** `generateCoast('sheltered', size, seed)` as designed. Tuned by drawing lands from above (`scratch-42/landpic.mjs`) and in the game: the bay is broad and flat-bottomed (its west side sloping in gently, its east side steeper), widening a little on larger lands (as size^0.7) and deepening less (size^0.45), so a large land is mostly more land rather than a bigger bay. The river keeps the Bay's width at every size: wider (as first written for larger lands) left its lower course too wide to bridge. Larger lands get more low rises inland (eight on a large land) with woods, groves and herds. `landCheck` lives in its own file, `src/map/landcheck.ts`, and also follows a bridge across the river, as the player would.

**Playable.** 55 lands (30 seeds at 128, 15 at 192, 10 at 256) all passed `landCheck` while tuning; the tests check 22 of them every run.

**The demos.** `#landsmall` (128, seed 1), `#landmedium` (192, seed 4) and `#landlarge` (256, seed 2), chosen by eye (seeds with the islet in the bay's mouth). The road in from the west edge is found on the land (`landRoad` in demos.ts): along the first row near the site where every tile takes a road, walking up or down the river bank to where a bridge fits. A land demo's setup founds the land and then sets again what `calm()` set before it (seasons on, hazards off), since founding starts the state afresh.

**The page.** It reads a prepared town before making the `Sim`, so a land demo's `Sim` is founded on its own land and the Bay is never baked for it; the time `probe.bakeMs` reports includes founding. A generated land opens over its `site` at the Bay's opening distance. The camera may stand back further over larger lands, but only as the fourth root of the size (175 on the Bay, 193 at 192, 208 at 256): at the square root the end of the sea showed at the corners.

**Touched outside the line** (all for the size, mechanical): `src/sim/` build.ts, materials.ts, wild.ts, materialstatus.ts, stockbook.ts, armystatus.ts, trade.ts, routes.ts, vassals.ts, colonies.ts, diplomacy.ts, world.ts, fleet.ts, sim.ts, state.ts, migrate.ts; `src/game/` saves.ts, demos.ts, armstips.ts; `src/render/` ship.ts, city.ts, greece/index.ts; `src/ui/greece.ts`; `src/main.ts`; `src/map/districts.ts`; `scripts/smoke.mjs`, `scripts/measure.mjs`, `scripts/debug-map.mjs`; the tests that used `MAP_SIZE` (now `BAY.size`) and the ship helpers' new last argument. The ship helpers that take the map's size as their last argument: `shipAt`, `inwardAt`, `mouthAlong`, `pastMouth` (trade.ts), `visitorAt`, `visitorOnMap` (routes.ts), `tributeShipAt`, `tributeOnMap` (vassals.ts), `giftOnMap` (diplomacy.ts), `visitorLook` (render/ship.ts). The sim's copper, marble, herds and districts now come from the map (`outcropPlace(map, ...)`, `marblePlace(map, ...)` take the map first).

**Where `MAP_SIZE` is still used:** `src/map/coast.ts` (its definition, the Bay's size), `src/map/lands.ts` (`BAY` and `landProblem`'s check that the Bay is 128) and `src/map/bake.ts` (the size of a `CoastData` that gives none: the Bay's). Nothing in the sim, the saves, the renderer or the tests uses it.

**Checks** (on a machine shared with three other lines, load 25 to 40 on 4 cores, so every time below is slow and noisy):
- Typecheck clean. Tests: 607 (the 590 before and 17 new in `tests/lands.test.ts`), all passing; one timing test in `culture.test.ts` ("whole families together ... quickly") failed in the full run under load and passes alone. The full run took 23 min 30 s (8 min 29 s before, on a quieter machine).
- Build: 3 min 32 s (every prepared town baked afresh, the sources having changed).
- Every earlier demo (134 prepared towns), decoded at opening and played 900 ticks on, against the same at `53e5bb4` (`scratch-42/demoprobe.mjs`): all 134 the same (date, people, money, every building and level, and the whole state, the new `land` aside).
- A version 37 save (`tests/fixtures/slice40-ship.save.json.gz`, `#ship` saved at `53e5bb4`) loads on the Bay and plays on (a test).
- The smoke, loosened for the load (`scratch-42/smoke-slow.mjs`): its first run stopped after 76 minutes at `#thanks`, waiting for the line that Corinth's gift has arrived. The trunk's own build does the same here (played in the browser for ten minutes, ten thousand ticks, the line never seen on either build; in Node it shows 220 ticks in, on both), so it is the load or something already on the trunk, not this slice. The Slice 42 block, run on its own, passed. A second full run, with that one wait made non-fatal, went to the end in 98 minutes; the Slice 42 block passed again, and the only other failures were "right-drag did not turn", `#triremes`' and `#blockade`'s ship hovers and `#quarry`'s tip off the marble. Each of these fails the same on the trunk's build (run side by side, `scratch-42/smokemini.mjs`), so none is from this slice: they look like the smoke not yet following the original look's camera (a quarter turn now takes a longer drag than the check makes, and the hovers aim where the old camera put things).
- Measured side by side with the trunk's build at 1920 × 1080, alternating, two rounds (`scratch-42/sbs.mjs`): the bare link, `#coast`, `#town` and `#empire` draw exactly the same triangles and draw calls on both (1,179,652 / 71; 1,487,950 / 102; 2,086,553 / 152). Load times swing by seconds either way between rounds on both builds under this load. The land demos: `#landsmall` 1.16 million triangles in 77 draws at its opening view (1.20 million in 83 furthest out), `#landmedium` 1.74 million in 100 (2.06 million in 132), `#landlarge` 2.07 million in 95 (2.92 million in 171), against `#coast`'s 1.18 million in 71 (1.20 million in 78). The page's bake of the large land took 0.9 and 1.4 s in the two rounds (the Bay's took 0.4 to 1.9 s in the same runs, and 0.23 s on the trunk's quieter baseline); in Node, less loaded, a large land generates and bakes in 0.45 to 0.65 s and the Bay in about 0.25 s. So the large land's bake is a little over twice the Bay's; whether it is under a second on Oliver's machine I couldn't measure here.
- A sim tick on an empty large land costs about what it does on a small one (0.03 to 0.08 ms in Node); the per-tile loops (the minimap's repaint, the placement texture) run on change, not every frame.
