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

*(Filled in at the end of the slice.)*
