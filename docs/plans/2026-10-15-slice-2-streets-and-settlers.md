# Slice 2 — Streets and settlers

*15 Oct 2026. Phase 1, "A living neighbourhood" (`docs/specs/2026-10-15-living-neighbourhood-design.md`). Builds on slice 1, "The coast".*

## Goal and check-in

Oliver lays out his first streets on the coast. He picks the road tool and drags roads across the land; they follow the ground, step around nothing on their own, and refuse water, the river's wet margin and steep rock. He marks out housing plots beside them. Where a road reaches the edge of the map, small groups of settlers walk in along it carrying bundles, find a plot and pitch a tent. The top bar shows the population and the drachmas: he starts with 5,000, and roads and plots cost money. He can clear land and buildings, and undo his last few actions.

**Oliver can:** lay out his first streets, mark plots, and watch families walk in and set up tents.

**Demo links.** The published page only receives a bare `#token`, so every link is a hash token (letters, digits and dashes); a dash combines two (`#streets-fast`). The old `?demo=` / `?cam=` / `?speed=` query parameters keep working for local runs.

- `#streets`: a prepared little neighbourhood on the plain west of the river: a road in from the west edge, a few streets, plots, tents already pitched and more settlers walking in.
- `#settlers`: street level beside the same road, watching a family walk in with their bundles.
- `#build`: a fresh game with the road tool already picked, over open land near the west edge of the map.
- Camera views from slice 1 as tokens: `#coast`, `#river`, `#bay`, `#hills`, `#street`, `#mouth`, `#headland`, `#overview`.
- Speed tokens to add with a dash: `-paused`, `-fast`, `-fastest` (e.g. `#streets-fastest`).

## Not in this slice

Fountains, water carriers and any service walkers (slice 3); houses above tents, rent and workers (slices 3–4); the household panel and decline (slice 5); saves to the browser (slice 7, though the state stays plain serialisable data); sound; a minimap. Settlers come for as long as there is room; there is no measure of how attractive the city is yet.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- Sim code (`src/sim/`, `src/map/`) stays pure and deterministic: seeded RNG in the state, no `Math.random`, `Date`, `performance` or timers (the purity test enforces it). Every player action reaches the sim as a command through the queue, so replay and saves work.
- The renderer only reads sim state. Static build, `base: './'`, no runtime network requests, all art in code.
- Judge by screenshots, tune by eye, never claim it looks right on Oliver's behalf.
- Earlier demo links must still work and look the same when the new tools aren't used.

## Before

Measured at `39079a1` (the end of slice 1's review), `npm run measure`, headless Chromium with software WebGL at 1920 × 1080:

| | Before |
|---|---|
| Tests | 26 in 5 files, all passing; typecheck clean |
| Bundle | 3 files, 582 KB raw, 153 KB gzipped |
| Load (local, headless) | ready in 0.69 s, two frames drawn by 2.2 s; coast bake 0.32 s, scene build 0.58 s total |
| Triangles per frame (incl. shadow pass) | 542,256 in every view (nothing is culled) |
| Draw calls per frame | 21 in every view |
| GPU objects | 14 geometries, 4 textures |
| Frame rate | not measurable headless (1–1.5 fps under software rendering) |

## Design decisions

**The sim knows the map.** The baked coast is memoised (`coastMap()`), so the sim and the renderer share one bake; the sim holds it as a non-serialised reference looked up from `state.mapId`. Build rules live in `src/sim/build.ts` as pure functions of the map and state.

**State, version 2.** `SIM_STATE_VERSION` goes to 2; slice 1 had no saves, so nothing breaks. New plain-data fields:
- `money` (drachmas, starts at 5,000), `population` (sum of people in homes);
- `tiles`: one number per map tile (128 × 128): 0 empty, −1 road, otherwise the id of the building standing there;
- `buildings`: housing plots and the tents pitched on them (`{ id, x, z, level, people, incoming, since }`; a 2 × 2 footprint at its top-left tile; level 0 is an empty plot, 1 a tent);
- `walkers`: settler and leaver groups walking a path of tiles;
- `cleared`: indices into the baked tree list of plants removed for roads, plots or clearing (sorted), so saves and replay know which trees are gone;
- `undo`: the last 10 actions as records of what changed (tiles placed, tiles removed, trees cleared, drachmas spent);
- `rev`: a counter bumped whenever tiles, buildings or trees change, so the renderer knows when to rebuild.

**Commands** (the placeholder `mark` goes): `road { tiles }` (an explicit list of tiles, so replay never depends on how the route was chosen), `plots { at }` (top-left tiles of 2 × 2 plots), `clear { x0, z0, x1, z1 }` and `undo`. Each is validated in the sim, tile by tile; tiles that fail the rules or can't be afforded are skipped, in order.

**Where you can build** (one rule for every tool, so they always agree):
- inside the map, on a tile `tileWater` marks as land;
- every corner at least 0.06 above sea level, and, near the river, at least 0.06 above the river surface there (`map.heightAt` against `map.riverAt().surface`), so the river's underwater shelf and wet margin count as water (the finding handed over from slice 1);
- not too steep: the largest rise across the tile's corners is at most 0.9 for a road and 0.65 for any tile of a housing plot (tuned by eye on the coast's slopes); this is what keeps building off steep rock;
- the tile is free. Trees, scrub, rocks and flowers on the tile are cleared for free when you build, and recorded.

**Costs** (tunable): road 4 drachmas a tile, housing plot 10, clearing free. Not enough money: what can be afforded is built, in order, and the tool says so.

**Roads** are drawn by dragging. The route from the press to the pointer is found with A* over buildable tiles with a turn penalty, so it runs straight where it can and bends around water, steep ground and buildings; with no route the preview shows red. Roads join on four sides.

**Housing plots** are 2 × 2 tiles (room for the grander houses of later slices). Dragging a rectangle fills it with plots that fit. A plot takes settlers only if it touches a road (one of the eight road tiles orthogonally beside its footprint) and that road joins the edge of the map.

**Settlers.** Every 12 ticks (1.2 s at normal speed) the sim looks for a home with room: the oldest empty plot first, then tents with room (a tent holds 5). One breadth-first search over the road network from every road tile on the map's edge finds which homes are reachable and the shortest way in. A group of 2–4 (seeded) is spawned five tiles outside the map beyond that edge tile and walks the road at 0.12 tiles a tick (1.2 tiles a second at normal), then steps off the road onto the plot. On arrival an empty plot becomes a tent with the group in it, or the group joins a tent with room. At most 12 groups are on the road at once. If the road ahead is cut, the group re-routes; if its home is gone, it looks for another, and failing that walks back out.

**Clearing and undo.** The clear tool drags a rectangle: roads, plots and tents in it go (a tent's family packs up and walks out to the edge if a road lets them, otherwise just leaves), and trees on empty tiles in it are cleared. Undo reverses the last action: anything it placed goes (a family living there leaves) and its cost comes back; anything it removed comes back where the ground is still free, a demolished tent coming back as an empty plot because its family has gone; trees it cleared grow back where nothing stands.

**What Oliver sees.**
- *Roads:* a mesh of sandy paving that follows the ground exactly (sub-quads split along the same diagonal as the terrain's triangles, lifted a hair, with polygon offset), inset from the tile's edges except where it joins a neighbour, with a darker worn edge; rebuilt per chunk when tiles change.
- *Plots:* the ground marked out with a trodden patch and four stakes with little flags. *Tents:* a toy canvas ridge tent with a stripe, a smaller lean-to, a ring of stones round a cooking fire with a thin wisp of smoke, a pot and bundles; two variants and four rotations. They rise into place when pitched.
- *Settlers:* little figures in coloured tunics walking in a line, bobbing as they go; the first carries a bundle on the head, others on the back. Leavers look the same, walking out.
- *Placing:* while a tool is picked, a faint grid lies on the ground around the pointer (the terrain's own triangles drawn again with a grid shader; it fades away from the pointer), the tiles the drag would take are tinted (warm white if they can be built, red if not, orange for what clearing would remove), and the map's edge tiles glow gold under the road tool, because that is where settlers come from. A small label by the pointer gives the cost, or why it can't be built.
- *Interface:* a build bar at the bottom in the same parchment style (road T, housing H, clear X, undo U or Ctrl+Z; Esc or a right-click puts the tool down); population and drachmas in the top bar, with a brief +/− when they change; a "+3" floats up from a tent when a family moves in; hovering a plot or tent with no tool picked says who's there or what it's waiting for ("Needs a road to the edge of the map").
- *Mouse:* left-drag places while a tool is picked and pans when none is; middle-drag always pans; right-drag turns, and a right-click without dragging puts the tool down. Keys still pan (WASD), so you can move while placing.

**Culling (finding from slice 1).** Plants, buildings and walkers become instanced meshes per 32 × 32 unit chunk, each with bounds set from its chunk's area and height range, so the view and the shadow pass skip chunks out of sight. Clearing trees rebuilds only the chunks they stood in, from `state.cleared`.

**Hash links.** `location.hash` is split on dashes; each part can be a demo (`streets`, `settlers`, `build`, `coast`), a camera view, a speed or `shot`. Changing the hash reloads the page. Query parameters still work.

## Tests

- Determinism: the same seed and the same scripted build commands give the same serialised city after thousands of ticks (roads, plots, settlers arriving, tents, clearing, undo); a different seed gives a different one; replaying the log rebuilds the same state; save and load mid-walk carries on identically; old versions are refused plainly.
- Build rules: sea, river, the river's underwater shelf and steep rock are refused; land is accepted; money is charged and refused when short; trees on a tile are cleared and recorded.
- Routing: on a small hand-made road layout, settlers enter at the edge road and walk only on road tiles to the plot beside it; a plot off the road network gets nobody; a cut road makes walkers re-route or turn back; a road route found by the tool's A* avoids water.
- Undo and clear: undo refunds and restores trees; clearing a tent sends its family out and lowers the population.
- Budgets: `npm run measure` adds the `#streets` scene (triangles, draw calls) to the views it records.

## Tasks

1. Plan (this file). Commit.
2. Sim: state v2, map memo, build rules, commands, road graph and BFS, settlers and leavers, clearing, undo; tests. Commit.
3. Render and UI: chunked instancing for plants, roads mesh, plots, tents, settlers, grid and preview, build bar, top bar population and drachmas, tooltips, hash links and demos. Commit.
4. Look and tune: build, drive it headless, screenshot from several angles, look and adjust; extend smoke and measure. Commit.
5. Full checks, "As built", check-in (and slice 1's links in hash form, one line in `CLAUDE.md`). Commit, push, sync.

## As built

*15 Oct 2026.*

**What exists.**
- `src/sim/`: state version 2 (`state.ts`) with money, population, tiles, homes, walkers, cleared trees, an undo stack of 10 and a `rev` counter. `build.ts`: the build rules and a per-map index (ground class and rise per tile, which plants stand on which tile), worked out once in ~20 ms. `roads.ts`: breadth-first search over road tiles, edge roads, path tracing, and A* with a turn penalty for laying roads. `settlers.ts`: spawning groups at the edge, walking, re-routing, arriving, leavers, and `homeStatus()` for the hover tip. `sim.ts`: the commands (`road`, `plots`, `clear`, `undo`) and `flush()`, which applies the next tick's commands at once without advancing time (what `step()` does first), so you can build while paused and the log and replay are unchanged. `coastMap()` in `src/map/bake.ts` bakes the coast once for the sim and the renderer.
- `src/render/`: `chunks.ts` (`ChunkedInstances`: one InstancedMesh per square chunk with bounds set from the chunk's area and height range, filled per chunk or every frame); `trees.ts` now chunked and synced from `state.cleared`; `streets.ts` (paving and plot ground per 32-tile chunk, worn tracks off the map edge); `homes.ts` (stakes, two tent models, the rise when pitched, smoke); `walkers.ts` (two person models with a per-person tunic colour through a tint mask in the shader, walking in a loose line with a bob); `placement.ts` (grid, preview and edge glow shader drawn on the terrain's own geometry); `city.ts` (rebuilds only the chunks whose tiles changed).
- `src/game/`: `tools.ts` (road, housing, clear, undo; previews, costs and reasons; sends commands and flushes), `input.ts` (left-drag places with a tool, pans without; middle-drag pans; right-click without a drag puts the tool down; T, H, X, U, Ctrl+Z, Esc), `links.ts` (hash tokens and query parameters), `demos.ts` (`streets`, `settlers`, `build`, `coast`).
- `src/ui/`: population and drachmas in the top bar with a brief +/−, the build bar and its hint line, the pointer tip, "+N" floating up from tents, the controls card's new Building section.
- Scripts: `smoke.mjs` now also loads every hash link and drives the tools (road by drag, plots by drag, right-click, settlers arriving at fastest, clearing a tent, undo); `measure.mjs` records the `#streets` scene and sums chunked meshes by kind; `screenshots.mjs` takes `name@x,z,yaw,dist,tilt` and hash links; `drive.mjs` screenshots a whole build session; `debug-ground.mjs` prints the buildable ground as text.

**Deviations from the plan.**
- Settlers come every 40 ticks (4 s at normal speed), at most 8 groups on the road, not every 12 ticks with 12 groups: at 12 the road filled with an unbroken queue of people.
- Plants are chunked at 64 units, not 32: 32-unit chunks took the opening view from 21 to 341 draw calls for 5% fewer triangles. 64 gives 125 calls in the widest views, 69–88 up close, and still skips 25–30% of triangles up close. Homes, roads and walkers use 32.
- Added: worn tracks where a road leaves the map (so the road visibly leads somewhere), smoke from the cooking fires, a "+N" over a tent when people move in, hover tips on homes with no tool picked, `flush()` so building works while paused.
- H now picks housing; the controls card opens with "?" only.
- No bridges: the river cuts the map in two, so land east of the river is settled from the east edge.

**Checks.** Typecheck clean; `npm test` 39 tests in 6 files pass (13 new: determinism with real building, replay, save mid-walk, building while paused equals building next tick, the build rules including the river's underwater shelf, money, trees cleared and restored, routes around homes and not across the river, settlers entering only by road, cut roads, clearing and undo); `npm run build` succeeds; `npm run smoke` passes; `#coast`, `#river` and the other slice 1 views load and look as before apart from the new top bar figures and build bar.

**Measurements** (`npm run measure`, headless Chromium with software WebGL, 1920 × 1080):

| | Before (`39079a1`) | After |
|---|---|---|
| Tests | 26 | 39 |
| Bundle | 582 KB raw, 153 KB gzipped | 630 KB raw, 169 KB gzipped |
| Load to first frame (local, headless) | 2.2–3.0 s over repeated runs (scene build ~0.65 s) | 2.1–2.9 s over repeated runs (scene build ~0.7 s); `#streets` the same |
| Triangles, opening view | 542 k | 542 k (everything is in view) |
| Triangles, close views (`river`, `street`, `bay`) | 542 k | 376–403 k |
| Draw calls, opening view / close views | 21 / 21 | 125 / 69–76 |
| `#streets` (24 homes, 59 road tiles, 8 groups walking) | — | 384 k triangles, 88 draw calls; the town itself adds about 11 k triangles |

The single "ready in 0.69 s" in the plan's Before was a fast first run; measured side by side against a build of `39079a1`, load time is unchanged. Frame rate still can't be measured here.

**For slice 3.**
- Service walkers can reuse `roadSearch` / `tracePath` and the `Walker` shape; `Walkers` in the renderer lines a group up by distance along the path, which also suits a single water carrier.
- `CityView.sync` diffs `state.tiles` and the homes on every `rev` change; a fountain can be a new building kind in `state.buildings` (add a `kind` field and bump the state version).
- `homeStatus()` is the place for "what reaches this house" in the hover tip.
- Homes are refilled for every chunk on any change to the homes; fine for hundreds, worth narrowing for thousands.
- The tent's capacity (5) and the empty plot's are in `HOME_CAPACITY`; hut and above will extend it.
