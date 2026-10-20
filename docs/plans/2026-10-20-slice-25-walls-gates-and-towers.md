# Slice 25 — Walls, gates and towers

*20 Oct 2026. Phase 4, "A city worth defending" (`docs/specs/2026-10-19-a-city-worth-defending-design.md`). The third slice of the phase. Builds on slice 24, "Raiders fought in the streets", and its review; slice 27 (loans) is being reviewed and merged alongside.*

## Goal and check-in

The spec's words: drawing walls like roads; gates where they cross roads; towers on the line with archers; paths that go through gates and round walls. Raiders breaking gates and weak stretches; cracks, breaches, rubble and rebuilding.

How you built now decides how you defend. A new wall tool draws a stone wall like a road: drag a line, a few drachmas a tile, on dry land only. Where the line crosses a road it becomes a gate. Your own people never cross a wall: carts, vendors and soldiers go through the gates, and anyone walking across country goes round. Towers (2 × 2) stand on the wall line; each takes a few workers from the labour pool, paid like any workers, who are its archers, and shoots at raiders within about ten tiles, over the wall. Raiders look for the cheapest way in: round the end of a wall if there is a gap near enough, otherwise through the nearest gate or the weakest stretch, which they stand and hammer at. A stretch under the rams shows cracks as it weakens, and a broken gate or stretch is a breach of rubble that anyone can walk through until you draw the wall over it again. A band at a gate under two towers loses men while it hammers, and the time it takes is time for your companies to arrive.

**Oliver can:** wall in the old town and set towers at the gates in `#walls`, then watch a band try them in `#siege`.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#walls`: `#battle`'s town about a month before Sparta's band of 29 reaches the west edge, paused, the wall tool in hand and the treasury able to pay for a ring of wall, gates and towers. Draw a wall round the old town, place towers beside the gates, and play.
- `#siege`: the same town already walled on its west side, with gates where the roads cross and towers either side of the west gate, the band at the gate hammering at it while the towers shoot; your companies at the barracks.
- Every earlier token keeps working, each also with `-paused`.

## Not in this slice

Landings from the sea, triremes and pirates (slice 26). Loans (slice 27, merged alongside) and debts unpaid (slice 28). Sound (later in the phase). Towers that raiders can break, soldiers standing on the walls, walls across water or bridges (not in the spec; recorded if they come up).

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- Sim code (`src/sim/`, `src/map/`) stays pure and deterministic: the towers' dice are hashes of the seed, the tick and the tower, like the battle's, drawing on no generator. Money moves only through `pay` / `income` (walls, gates, towers and repairs on the building line, refunds on the refund line).
- **Earlier towns are untouched.** A town that never draws a wall plays exactly as before: with no walls, every path, fight and raid is worked out as it was. The two findings from slice 24's review that change fights (men wading the river slowly, and the raiders' colours) change only what happens while raiders are on the map and how they are drawn; the demo probe (outside the repo) plays every earlier demo at the commit before this plan and after, and compares the whole city at opening and 900 ticks on. Only demos with a band in the city can differ, and any that do are named in the check-in.
- Old saves still load: the state version goes up by one (24 after the loans' 23 → 24, if the loans land first; the migration adds no walls and no siege to any raid).
- The renderer and UI only read sim state; every action is a command (`wall` is new; towers are built with `build`). Static build, `base: './'`, no runtime requests beyond the game's own files, all art generated in code.
- Judge by screenshots, tune by eye, never claim it looks or feels right on Oliver's behalf.

## Before

Measured at `8358833` (slice 24 with its review), headless Chromium with software WebGL at 1920 × 1080, while the loans' review was running on the same machine: in **As built** (the measure takes the best part of an hour on the busy machine, so it runs alongside the building).

| What | Before |
|---|---|
| Tests | 377 in 32 files, all passing |
| Everything else | in As built |

## Design decisions

**The wall layer.** A wall stretch is one tile, kept in a short list in the state (`walls`: the tile, its strength now, and whether it is a gate), sorted by tile, with the tile itself marked `TILE_WALL` while the stretch stands. A gate stands on a road tile, which stays a road, so every walker on the roads goes through it as before. A broken stretch keeps its place in the list at strength 0 (rubble, drawn as a heap of stones): its tile is open ground again (a broken gate's, a road again) and anyone can walk through. Building a road or a building over rubble clears it from the list. A lookup by tile is cached outside the state, keyed by the list and the tiles' revision.

**The numbers** (to tune by eye). A wall stretch costs 12 dr, a gate 40 dr; a stretch is 600 strong, a gate 300. A tower costs 200 dr and needs 4 workers. Repairing a cracked stretch costs its share of the price; a rubble stretch costs the whole price again.

**Drawing.** The wall tool drags an L from where you press to where you let go, like a road's straight drag: each tile of open dry ground becomes a stretch, each road tile (not a bridge) a gate, each cracked or broken stretch is mended; water, cliffs, buildings and bridges are skipped (marked red, with why). The tip says how many stretches, gates and repairs and what they cost. Undo takes back a whole drag; the clear tool clears walls like roads.

**Towers.** A tower (2 × 2) goes on the wall line: its footprint on open ground or standing wall, with a stretch under it or beside it; the stretches under it are taken into it. Its four workers are its archers. A staffed tower looses an arrow every few ticks (a full tower about as often as four archers), from its top, at the nearest raider within 10 tiles, over walls and roofs; a tower half staffed shoots half as often. Arrows from a tower strike a little harder and fall off less with the distance than an archer's on the ground (they are loosed from above). Towers don't burn, don't wear, and can't be broken.

**Paths.** Anyone walking across country (hunters, soldiers, settlers' last steps, leavers, herds) goes round walls and towers; a gate is a road, open to your people. Raiders find their way with a search where a standing stretch or gate is not a wall but a cost: its strength now in tiles' walking (a whole gate about 25 tiles, a whole stretch 50). So a band goes round the end of a wall if the gap is near, else through the nearest gate, else through the weakest stretch, and a stretch already cracked draws them. The band's way ends at the stretch it must break, and when it breaks they find their way on (another wall, another breach). Going home they do the same.

**Breaking in.** A band at its stretch stands and hammers at it: each of up to 10 men standing round it takes 0.5 off its strength a tick (a whole gate in about 6 days, a whole stretch in about 12, for a band of 10 or more). Men drawn off to fight a soldier don't hammer. The threat's line says what the band is doing ("hammering at the west gate"), and the town line when it is through ("Sparta's raiders have broken the west gate"). Cracks show below two thirds and again below a third.

**Fights at the wall.** No man in a fight steps onto a wall, a tower or (a raider) a standing gate. A raider doesn't go for a soldier he can't reach for a standing wall or gate between them, and a hoplite doesn't chase a raider beyond one; archers on the ground shoot over walls as towers do.

**Slice 24's review findings.**
- *The bridge doesn't narrow the fight.* A man in a fight wades a river (water off a bridge) at a third of his pace, so a band held at a bridge's foot fights on a narrow front rather than spreading through the shallows. Only fights change.
- *Red against red.* Raiders' crests are black horsehair and their shields their city's colour darkened, with an iron rim, so a band reads as dark against your terracotta-and-bronze hoplites; checked by screenshots at the bridge.
- *The band's line* names every place it makes for ("making for the granary, then the tax office").
- *Fights are long.* Judged again with towers in the mix: the check-in says how long a siege and the fight after it last.

**Drawing it** (`src/render/walls.ts`). Walls, gates, towers and rubble are one merged mesh rebuilt when the wall list changes (by stretch, kind and crack stage), like the bridges: each stretch a block of dressed stone with a walkway and merlons, joined to its neighbours along the line (straight, corners and ends), a gate an arch over the road with a timber door, a tower a square stone tower with a roof walk and merlons, cracks dark seams down the face, rubble a heap of stones. Tower arrows rise from the tower's top. Hovering a stretch, gate or tower says what it is, how strong, and what it is doing (a tower: its archers, and whom it is shooting at).

## Tests

- **Paths:** a walker across country goes round a wall and through a gate; a company marches through a gate to a banner outside the wall and back; a band goes round a short wall's end, breaks a gate rather than going far round, prefers a cracked stretch to a whole one, and goes home through its breach.
- **Breaking:** a band at a gate breaks it in about the time above, it becomes rubble, the band goes on to its target; a rubble stretch redrawn stands again, for its price.
- **Towers:** a staffed tower kills raiders within range and none beyond; an unstaffed tower shoots nothing; arrows from towers reach over the wall.
- **Fights:** archers behind a wall wear down raiders who can't reach them; raiders breaking a gate under two towers lose men.
- **Determinism:** the same siege twice comes out the same; a save mid-siege round-trips and plays on identically.
- **Ledger:** walls, gates, towers and repairs are paid on the building line and an undo refunds them.
- **Migration:** a version 23 save (`slice24-battle`) loads and plays on with no walls.
- **Slice 24's tests,** including the march leaving at least five days at the bridge.

Plus the existing suite and the demo probe. `smoke.mjs` opens `#walls` and `#siege`, draws a wall and places a tower in `#walls`, and checks the band hammering and a tower shooting in `#siege`; `measure.mjs` adds both (a siege's frame cost).

## Tasks

1. Plan (this file), with the baseline measuring. Commit.
2. Sim: the wall layer and its lookup, the wall command, towers, foe paths, breaking in, towers shooting, fights at the wall, the wading and the band's line, migration; tests. Commit.
3. Render and UI: the walls mesh, tower arrows, hovers, the wall tool and the tower in the build bar, the raiders' colours. Commit.
4. Demos `#walls` and `#siege`; look and tune by screenshots; smoke and measure. Commit.
5. Full checks, the demo probe, measurements, As built, the check-in. Commit, push.

## As built

Commits: `fe3a956` (this plan), `f4a0768` (the sim, with tests and a slice 24 save fixture), `f883b62` (the drawing, the hovers, the wall tool and tower in the build bar, the raiders' colours, `#walls` and `#siege`, looked at and tuned by screenshots), `56c77c7` (smoke and measure for the new demos), `5932f01` (`#walls` opens as early as its threat allows), `41a08f9` (the `#raiders` smoke check reads the band's longer line), `72c4864` (main merged in: the control panel), `30b4da0` (the welcome back mentions walls), `3c7713d` (the smoke waits longer in `#battle`), then main fast-forwarded to `6d96d85` (the city look, stages 2 and 3, and the loans), and the commit that fills this in with the check-in.

**What changed from the design above**, found by playing sieges in Node and looking at screenshots:

- **Raiders hammer at half the planned pace.** Each of up to 10 men takes 0.25 off a stretch a tick, not 0.5: a whole gate holds about 12 days, a stretch about 24. At the planned pace a gate fell in 6 days, while a company takes about 25 days to march from `#companies`' barracks to the west gate, so the gate bought too little time to matter.
- **Towers strike harder and pick their man.** A tower's arrow hurts 18, not 14, and its archers shoot the weakest raider within range (the nearest of equals), so their hits finish men rather than spreading over the band. With the first numbers two towers took 2 of Sparta's 29 while the gate held; now about 7 while it holds and 13 in all.
- **A tower needs a road beside it** for its archers to get there, like any workplace; its tip and hover say so. A tower on the wall away from a road stands empty and shoots nothing (test).
- **`#siege`'s towers stand both on the north side of the west gate**, one outside the wall and one inside, not either side of it: south of the gate are the river bank (refused: towers stand on dry land) and a farm.
- **`#walls` opens about three weeks before the band reaches the edge**, not a month: the staged threat is refused and the band gathers at once, so three weeks is the earliest. The band then takes about 24 days more to walk from the edge to the west gate.
- **State version 24, not 25.** Walls reached main before the loans (slice 27), so walls take 24 (`from23`) and the loans 25 (`from24`); a slice 24 save goes through both.
- **The wall and the tower live in the Military tab** of the control panel, which landed on main while this was built (the plan had them in the build bar's bronze-and-army group). The B key still reaches them: five and six presses.
- **The rest as designed**: the wall layer, gates as road tiles with a record, raiders' ways treating walls as a cost (a whole gate about 25 tiles' walking, a whole stretch 50), hammering, cracks below two thirds and a third, breaches as rubble anyone walks through, mending by drawing over, the clear tool clearing walls, fights that keep off walls and standing gates, men wading the river at a third of their pace, the band's line naming every place it makes for and what it is hammering at, the raiders' black crests and darkened iron-rimmed shields.

**Playing it out** (`#walls`, in Node; the wall up the east bank with its gate, 304 dr; two towers, 400 dr; the companies' banners just inside the gate):

| Defence | The gate | Raiders fallen (of 29) | Ours | What the band took |
|---|---|---|---|---|
| Wall and two towers, no companies | broken after 12 days | 13 (7 while it hammered) | none | 331 dr and wheat; 3 fires |
| Wall, towers and both companies | held | 20, band broken | 3 killed, 2 wounded | nothing; 1 fire on the west bank |
| Wall and both companies | held | 15, band broken | 1 killed, 8 wounded | nothing; 1 fire |
| Both companies there, no wall | — | 16, band broken | 3 killed | nothing; 1 fire |

With a wall the band reaches the gate about 45 days after `#walls` opens; the companies are in place by day 25. The hoplites go out through their own gate to fight the band hammering at it.

**Checks**: `npm test` 404 passing in 35 files; `npm run build` clean; `npm run smoke` ok, `#walls` and `#siege` included; `npm run measure` below. The demo probe opened all 93 earlier demos, and played each 900 ticks on, against `8358833`: every one the same once walls, sieges and breaches are left out of the comparison. A slice 24 save (`tests/fixtures/slice24-battle.save.json.gz`, version 23) loads with no walls and plays on, through the walls' step and the loans'.

**Measured**: Headless Chromium with software WebGL at 1920 × 1080. Before is `8358833` (slice 24 with its review). After is this slice on the main line, with the control panel, the city look's stages 2 and 3 and the loans merged in. Most of the change in triangles and download comes from those, not from walls: the city look's trees and people roughly double every view's triangles. The machine was shared with other threads, so frame times are noisy.

| What | Before | After |
|---|---|---|
| Tests | 377, all passing | 404, all passing (11 of them walls) |
| Download (gzipped) | 2,224 KB: the game 486 KB, the prepared towns 1,738 KB | 2,566 KB: the game 641 KB (walls, the control panel, the city look, loans), the prepared towns 1,925 KB (`#walls` and `#siege` among the new ones) |
| First load (bare link) | ready at 1.4 s, first frame at 2.4 s | ready at 1.9 s, first frame at 2.6 s |
| Every demo's load | 94 demos, median 2.3 s, slowest 3.8 s, 16 over 3 s (a busy machine) | 100 demos, median 2.0 s, slowest 2.5 s, none over 3 s |
| `#town` / `#richtown` | 799,168 / 910,707 triangles; 83 / 95 draw calls | 1,453,964 / 1,623,607; 89 / 101 (the city look) |
| `#battle` | 923,107 triangles, 89 draw calls; the fight close in 784,710 and 70 | 1,594,671 and 95; the fight 1,314,806 and 76 |
| The new demos | — | `#walls` 1,753,233 triangles, 102 draw calls; `#siege` at the gate 1,561,618 and 93. Every wall, gate and tower is one mesh: 3,636 triangles and one draw call for `#siege`'s 22 stretches and gates and its two towers |
| Work a frame before drawing | `#town` 13.0 ms, `#richtown` 9.5, `#raiders` 8.7, `#companies` 14.9; `#battle` during the fight 26.9 | 7.9, 6.5, 5.3, 9.2; `#battle` 16.4; `#siege` while the band hammers and the towers shoot 12.2 |
| A save of `#richtown` | 187 KB | 187 KB |

**Review** (`1b7d905` and the commit that records it): the check-in's steps followed in headless Chromium at 1920 × 1080, the diff read, the balance table played again (the same), and the demo probe run against `6d96d85` (all 98 demos with a town the same at opening and 900 ticks on, exactly) and the loans demos against `a60f70a`, the loans' line before walls (the same, walls left out). Fixed: a wall along the map's edge turned every band away (an edge stretch or gate is now a way in at its toll: `offRoadPath` takes starts and a goal at a toll, `foeWay` returns where the way starts, `landing` stands the band just off the map, and `headOff` sends a band still off the map straight off again rather than in through the wall it never broke); mending a stretch or gate under the rams is refused (`underRams` in walls.ts), so a few drachmas every few days no longer hold a gate for ever; undo is refused for a wall raiders have cracked or broken since; `from24` gives a version 24 save from the loans' line (no walls) its walls; gates' doors open for your own soldiers and walkers passing while raiders are about (`WallsView.frame`, each frame, the sheltering walkers left out); a broken gate's piers stand at half height with its lintel fallen; `#walls` opens with the whole line in view; `#siege` opens paused; the wall tool's tip for mending a gate. Kept: the march's pace and the barracks' place (sent when the band comes in at the edge, the companies reach the gate before it falls). Measure re-run after the fixes: `#siege` 1,561,618 triangles and 93 draw calls, the walls mesh 3,636 triangles, `#walls` 1,801,653 and 107 in its wider view; download unchanged (the game 642 KB gzipped); frame and load times about twice as slow in every demo, walls or none (`#battle` too), from another thread's build on the same machine. Tests 408 in 35 files.
