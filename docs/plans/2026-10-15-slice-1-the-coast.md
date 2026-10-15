# Slice 1 — The coast

*15 Oct 2026. Phase 1, "A living neighbourhood" (`docs/specs/2026-10-15-living-neighbourhood-design.md`). First slice of the project.*

## Goal and check-in

The game opens on a sunny, hand-shaped stretch of Greek coast in warm low-poly 3D: a curved bay, a river running from rocky hills to the sea, olive groves and scrub on the slopes, fertile green along the river banks, water that moves and glints. A clock ticks along in the top bar and can be paused or sped up.

**Oliver can:** open the link, fly around the coast (orbit, pan, zoom from bird's-eye down to street level, with mouse or keyboard), drop straight down to the river bank, and pause or speed up the clock and watch the months turn.

**Demo links** (appended to the published page URL, added after publishing):

- `?demo=coast`: the coast from the opening view, clock running.
- `?cam=river`: street-level view of the fertile river bank.
- `?cam=bay`, `?cam=hills`, `?cam=overview`: other prepared framings.

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
- **Top bar:** HTML over the canvas in a warm parchment style using the system's serif fonts (no web fonts): the date, the four speed buttons, and a "?" for the controls. Keyboard: Space pauses, 1–4 pick a speed. Population and drachmas wait for slice 2, when they mean something.
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

*(filled in at the end of the slice)*
