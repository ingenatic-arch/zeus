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

(To be filled in.)
