# Slice 1 — The coast

*15 Oct 2026. Phase 1, "A living neighbourhood" (`docs/specs/2026-10-15-living-neighbourhood-design.md`). First slice of the project.*

## Goal and check-in

The game opens on a sunny, hand-shaped stretch of Greek coast in warm low-poly 3D: a curved bay, a river running from rocky hills to the sea, olive groves and scrub on the slopes, fertile green along the river banks, water that moves and glints. A clock ticks along in the top bar and can be paused or sped up.

**Oliver can:** open the link, fly around the coast (orbit, pan, zoom from bird's-eye down to street level, with mouse or keyboard), drop straight down to the river bank, and pause or speed up the clock and watch the months turn.

**Demo links** (appended to the published page URL, added after publishing):

- `?demo=coast`: the coast from the opening view, clock running.
- `?cam=river`: street-level view of the fertile river bank.
- `?cam=bay`, `?cam=hills`, `?cam=street`, `?cam=headland`, `?cam=mouth`, `?cam=overview`: other prepared framings.
- `?speed=paused|normal|fast|fastest` sets the starting speed; `?shot=1` hides the first-time hint (for screenshots).

## Not in this slice

Roads, buildings, settlers, money and population (slice 2 onward); any building tool or tile grid overlay; saves (slice 7, though the sim state is already plain serialisable data); sound; seasons in the light; the publishing itself (the coordinator publishes `dist/`).

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- Sim code (`src/sim/`, `src/map/`) never touches `Math.random`, `Date` or `performance`; a test enforces this.
- The renderer only reads sim state; player input reaches the sim through the command queue.
- All art in code; no network requests at runtime; `vite` `base: './'` so `dist/` works from any path.
- Judge the look by screenshots, tune by eye, and never claim it looks right on Oliver's behalf.

## Before

There is no code yet: the repository holds only the vision, the working agreement and the phase 1 spec. There is nothing to measure, so the "before" for every budget is "nothing exists".

## Design decisions

- **Toolchain:** TypeScript 7.0.2 (native compiler, used for typechecking only), Vite 8.3.4, three.js 0.186.1, Vitest 5.0.5, all pinned exactly. No ESLint: typescript-eslint does not support TypeScript 7 yet, and the one rule that matters here (no randomness or wall clock in the sim) is enforced by a test instead.
- **Fixed tick:** 10 sim ticks per second at normal speed; a day is 10 ticks and a month is 30 days, so a month is 30 seconds at normal speed, as the spec asks. Speeds: paused, normal (×1), fast (×2), fastest (×4). The host loop runs the sim from a wall-clock accumulator (allowed outside the sim), capped so a stalled tab doesn't run thousands of ticks at once.
- **Calendar:** English month names, years counted BC, starting March 750 BC (the age of Greek colonies founding cities on new coasts). Years count down as they pass, 750 BC → 749 BC. A judgement call for Oliver.
- **Seeded randomness:** a small 32-bit generator (sfc32) whose whole state is four numbers in the sim state, so it serialises and replays.
- **Commands:** one queue. A command is stamped with the tick it applies on (the next tick) and applied in order at the start of that tick, then logged. Replaying the log on a fresh sim with the same seed gives the same state. Slice 1 only has a placeholder command used by the tests; slice 2 adds the real ones (place road, place plot, demolish, undo).
- **State is plain data** with a version number, serialisable with `JSON.stringify`, so saves later are trivial and the determinism test can compare serialised states.
- **The map is authored as data** (`src/map/coast.ts`): a coastline curve for the bay, river control points from the hills to the sea, hill and ridge shapes, grove and scrub areas, with a little seeded noise for variety. At load it is baked into grids: height, fertility, a water mask (sea / river), a river surface height, and a tree scatter list. Same data in, same grids out, every time.
- **Grid:** 128 × 128 tiles, one tile = one world unit (later a building footprint). Heights are stored at tile corners so roads and buildings can follow the ground later.
- **Terrain mesh:** one mesh, faceted (flat-shaded triangles) with a colour per triangle from height, slope, fertility and a small seeded variation: sand at the shore, green on fertile banks, dry gold-green grass on slopes, ochre and grey rock on the hills.
- **Water:** one water mesh over all sea and river tiles plus a large sea skirt out to the horizon, with a custom shader: gentle animated waves, colour from turquoise shallows to deep blue by depth (read from a baked depth texture), shoreline foam, sun glints. The river surface steps down from the hills to the sea and flows. Water animates even when the clock is paused (it's scenery, not simulation).
- **Trees and scatter:** instanced meshes, one draw call per kind: olive trees, umbrella pines, cypresses, scrub bushes, rocks, reeds. Each instance gets a seeded size, rotation and slight colour shift.
- **Light:** warm afternoon sun with soft shadows (one shadow map whose box follows the camera so shadows stay sharp up close), a warm sky/ground hemisphere fill, a sky gradient and a light haze to the horizon.
- **Camera:** a city-builder camera, not a free fly-cam: it looks at a point on the ground. Left-drag pans, right-drag (or middle-drag) orbits and tilts, the wheel zooms towards the cursor. Keyboard: WASD or arrows pan, Q/E turn in 90° steps (smoothly animated), R/F tilt, +/− zoom. Zooming in lowers the view angle towards street level automatically. The camera never dips below the ground. Left-drag is pan only in this slice; once building tools exist it will place things while a tool is selected.
- **Top bar:** HTML over the canvas in a warm parchment style using the system's serif fonts (no web fonts): the date, the four speed buttons, and a "?" for the controls. Keyboard: Space pauses, 1–3 pick normal, fast and fastest. Population and drachmas wait for slice 2, when they mean something.
- **Demo parameters:** `?demo=coast` and `?cam=<name>` pick a camera framing; `?speed=paused|normal|fast|fastest` sets the starting speed. A `?shot=1` flag (for screenshots) hides the help hint.

## Tests

- RNG: the same seed gives the same sequence; different seeds differ; state round-trips.
- Determinism: two sims with the same seed and the same commands give identical serialised state after N ticks; replaying the command log gives the same state.
- Clock: tick → day, month, year readout, including the year rollover (December 750 BC → January 749 BC).
- Map bake: same data gives identical grids; the river runs connected from the hills to the sea with its surface never flowing uphill; there is a bay of open sea.
- Purity: no `Math.random`, `Date` or `performance` in `src/sim/` or `src/map/`.
- Budgets: a measuring script (`scripts/measure.mjs`) loads the built page in headless Chromium and records triangles, draw calls, load time and bundle size. Frame time in headless (software rendering) is not representative and is recorded only as a note.

## Tasks

1. Project skeleton (Vite, TypeScript, three.js, Vitest), sim clock with seeded RNG, speeds and command queue, determinism tests. Commit.
2. Coast data and baking, terrain mesh, water, trees and scatter, light and sky, camera, top bar. Commit.
3. Build, serve, screenshot from several framings, look, and tune colours, light, terrain shapes and water; repeat several times. Add the demo parameters. Commit.
4. Typecheck, tests, build, measure budgets. Fill in "As built", write the check-in. Commit, sync.

## As built

*15 Oct 2026.*

**What exists.** A Vite + TypeScript 7 + three.js 0.186 app (`npm run dev`, `npm run build`, `npm run preview`). The built `dist/` is three static files (`index.html`, one JS, one CSS) with relative paths and no runtime network requests.

- `src/sim/`: the deterministic sim. `rng.ts` (sfc32, state as four numbers), `clock.ts` (10 ticks/s, 10 ticks/day, 30 days/month, March 750 BC, years count down, no year 0), `commands.ts` + `sim.ts` (one queue, commands stamped for the next tick, applied in order, logged; `replay()`; `serialize()`/`deserialize()` with a version check). The only sim system so far is a seeded daily drift of the breeze, which the water reads for wave direction. The only command is a placeholder `mark`.
- `src/game/`: host code outside the sim. `clockDriver.ts` turns real seconds into whole ticks (pause, ×1, ×2, ×4; at most 40 ticks a frame; keeps real time down to one frame a second). `input.ts` (mouse and keys), `views.ts` (the named camera framings).
- `src/map/`: `coast.ts` is the hand-shaped coast as data (shoreline points, islet, 18 hills, river course and widths, olive groves, pine woods, cypress stands). `bake.ts` turns it into a 385 × 385 corner field (the 128 × 128 map plus 128 units of scenery each side): heights, fertility, rock, signed distance to the shore, a river path whose surface never rises downstream, per-tile water (sea / river) and fertility, and a scatter of 4,000-odd plants and rocks. About 0.35 s at load. `heightAt()` returns the exact height of the drawn triangles, so later slices can stand things on the ground.
- `src/render/`: `terrain.ts` (faceted vertex-coloured terrain: 1-unit facets on the map, 2-unit beyond, then rings out to the horizon that share the field's edge vertices), `water.ts` (one shader for sea and river: depth colour from a half-float height texture, gentle faceted waves along the breeze, breathing shoreline foam, sparse twinkling glints, flowing river streaks, the river melting into the sea), `trees.ts` (one instanced mesh per kind: olive, stone pine, cypress, scrub, flowering broom, rock, reeds, wildflowers; plants sway), `sky.ts`, `world.ts` (sun, hemisphere light, camera-following shadow box snapped to texels, haze that thickens with zoom), `cameraRig.ts`, `palette.ts` (the shared warm palette).
- `src/ui/`: the parchment top bar (date, a dot per day of the month, four speed buttons), compass (click faces north), "?" controls card, and a first-time hint that fades.

**Deviations from the plan.**
- Coarser scenery beyond the map is 2-unit facets, not 4 (4 made a visible saw-tooth beach), plus far rings to the horizon, added after a zoomed-out screenshot showed the world ending in a wedge of empty sky.
- PCF soft shadows were removed in three r18x, so shadows use `PCFShadowMap`.
- Pixel ratio is capped at 1.5 to keep shading cost down on high-density screens.
- Wildflowers and swaying plants were added during tuning; gulls, cloud shadows and seasons in the light were not.
- The river banks are drawn as a pebbly margin: at 1-unit terrain resolution a 2–5 tile wide stream otherwise showed green triangles poking through the water.

**Checks.** `npm run typecheck` clean; `npm test` 25 tests in 5 files pass (RNG, determinism, replay, save round-trip and version refusal, speed never changes outcomes, calendar, sim purity, map bake repeatability, river downhill and connected to the sea, fertile banks, no trees on water); `npm run build` succeeds; `npm run smoke` drives the built page headless (pan, orbit, wheel zoom, quarter turn, fastest speed advances the calendar, Space pauses, every `?cam=` view loads, no page errors).

**Measurements** (`npm run measure`, headless Chromium with software WebGL on this machine, 1920 × 1080):

| | Before | After |
|---|---|---|
| Bundle | nothing | 3 files, 579 KB raw, 151 KB gzipped |
| Load to first frame (local server, software GL) | nothing | 2.5 s; of that, baking the coast 0.34 s and building the scene 0.63 s |
| Triangles per frame (incl. shadow pass) | nothing | ~528 k, same in every view (nothing is culled yet) |
| Draw calls per frame | nothing | 21 |
| GPU objects | nothing | 14 geometries, 4 textures |
| Frame rate | nothing | not measurable here: 1–1.5 fps under software rendering says nothing about a laptop GPU |

What headless can't tell: real frame time, and load time over a real network. The 60 fps budget needs a run on a real mid-range laptop; the city that budget is about doesn't exist yet.

**Tools for later slices.** `npm run shots [names]` saves screenshots of named views to `screenshots/` (gitignored); `npm run smoke`; `npm run measure`; `node scripts/debug-map.mjs` draws the baked map top-down to `screenshots/map.ppm`. The page exposes `window.__zeus` (ready flag, frame count, `jump(view)`, `setView(name)`, `view()`, `tick()`, `info()`, `meshes()`) for these scripts.

**Notes for slice 2.**
- Build on `map.tileWater`, `map.heightAt()` and `map.slopeAt()` for the no-building-on-water-or-steep-rock rule; roads should sample `heightAt` at tile corners (`map.corner`).
- Trees are a flat list in `map.trees`; placing roads and plots will need to clear them (keep the list in the sim state or mark removed indices, and rebuild the instanced meshes).
- Commands: replace the placeholder `mark` with the real ones; the queue, log and replay test are ready.
- Left-drag is pan only; once tools exist it should place while a tool is selected (pan stays on right/middle or with no tool).
- Plants are single instanced meshes per kind spanning the whole field, so nothing is culled. With buildings and walkers added, chunk instanced meshes by area so views and the shadow pass can skip what's off screen.

## Review

*15 Oct 2026. A reviewer pass that used the slice as Oliver would (every "What to try" step, headless Chromium, screenshots from every prepared view and from far out in each direction) and fixed what it found. The check-in's "What the review changed" says the same in plain words.*

**Fixed.**
- Keyboard (`src/game/input.ts`, `clockDriver.ts`): Space resumes the speed that was running before the pause (was always normal) and ignores key repeat (holding it flickered); held keys are tracked by `e.code` with the action fixed at keydown, so releasing Shift before "=" no longer leaves zoom running; Q/E repeat only once the previous quarter turn is nearly done; speed digits also match `Digit1`–`Digit3`/numpad. A test covers the resume.
- Zoom to pointer (`cameraRig.ts`): the anchor's pull is capped at 3× the view distance, so one wheel notch aimed near the horizon at street level no longer moves the view ~17 units.
- River edges (`bake.ts`, `water.ts`, `terrain.ts`): a shelf `RIVER_SHELF_DEPTH` under the surface reaches `RIVER_SHELF` past the stream's edge, and the river mesh carries the distance past the edge per vertex, so the shader fades the water out (`RIVER_EDGE_FADE`) with a thin foam rim before the bank breaks the surface. The water's edge is now a smooth curve. The polygon offset on the river is gone (it pulled foam through near-flush banks as white flecks from afar). `tileWater` river tiles use the same fade distance.
- River mouth (`water.ts`): the ground texture is now RG (height, river cover); the sea fades out and lies flat where the river covers it, and the sea no longer writes depth, so the river shows over it without the old pale squares.
- Far sea (`water.ts`): beyond the baked field the sea floor carries on from the field's edge and slopes away, instead of jumping to −9 (a hard colour line); the skirt shares the grid's edge vertices (a hairline crack is gone); the skirt reaches north to z = 20 to fill the far coast's bays.
- Far scenery (`terrain.ts`, `bake.ts`): replaced the extruded perimeter rings with square bands of square cells (`FAR_BANDS`, cells 4 → 256, doubling), stitched crack-free by putting each band's in-between outer-edge points on the coarser band's edge; the field's outer edge is linear between `FAR_STEP` corners for the same reason. The far coastline wanders (±55 units of noise, growing away from the field) and the far sea floor shelves from 0 instead of stepping to −4. ~21k triangles (was ~7k).
- Horizon (`sky.ts`): the sky is no longer tone-mapped, matching the fog colour, which removes a line along the horizon.
- Shadows (`world.ts`): the shadow box is at least 24 units and, close to the ground, slides ahead of the aim point, so the middle distance keeps its shadows at street level.

**Checks after the review.** Typecheck clean; 26 tests pass; build succeeds; `npm run smoke` passes; the built `dist/` loads from a nested subpath with no failed requests; the page makes no requests beyond its own three files. `npm run measure`: 153 KB gzipped, ready in ~2.3 s headless, ~542 k triangles, 21 draw calls.

**For slice 2 (found in review, not fixed here).**
- The river shelf lies just under the water for up to one unit past the visible water's edge, on tiles `tileWater` marks as land. The building rule should refuse tiles whose corners sit below the local river surface (`map.heightAt` below `map.riverAt().surface`), or treat them as river bank.
- Every plant kind is one instanced mesh over the whole field with a field-sized bounding sphere: nothing is ever frustum-culled, and all of it goes through the shadow pass. Chunk instanced meshes by area before adding buildings and walkers, and give each chunk its own bounds.
- Clearing trees for roads and plots: the scatter is baked map data, so the cleared set must live in the sim state (for saves and replay) and the instanced meshes must be rebuilt or compacted from it.
- `CameraRig.groundUnder()` marches a ray against `heightAt` (sea and river count as their floor or sea level) and is fine for picking a tile under the pointer on each move.
