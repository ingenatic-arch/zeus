# Slice 32 — Marble and timber

*21 Oct 2026. Phase 5, "Ambitions, empire and a deeper city" (`docs/specs/2026-10-21-ambitions-empire-and-a-deeper-city-design.md`). The works and sea line's first slice (wave 1), built at the same time as slice 30 (crime, city line) and slice 31 (Greece grows, Greece line), on branch `claude/p5-works`. Builds on phase 4 and its review.*

## Goal and check-in

The spec's words: the quarry on marble rock, with quarrymen and sledges; the loggers' camp at a wood's edge, trees that fall and grow back; both to the storehouse. Marble and timber in the stock book, the side panel and on the routes (Athens marble, Troy timber). Leftovers: miners drawn at the copper mine; the caravan yard's wall on a slope.

The city gets the two materials its monuments (slice 35) and great houses (slice 36) will be built from. On the headland above the bay there is pale marble in the rock; with the quarry tool in hand it shows as a pale glaze over the ground, and the boulders lying on it are white. A quarry there (3×3) is a stepped pit cut into the marble, with a crane of shear-legs and a shed; its quarrymen stand at the face swinging their picks, and each one's block comes free in a day or two and is levered onto the stack. Sledges drawn by an ox drag the blocks along the road to a storehouse. On the west slopes above the shore and in the north hills there are now woods of pines. A loggers' camp (2×2) at a wood's edge sends its loggers out with their axes: each walks to a tree, chops at it, and the tree goes down; he trims it and carries the logs home on his shoulder, and ox carts take the timber to a storehouse. A felled tree leaves a stump, a sapling shows a few months later, and it grows back to a full tree in two years, so a camp that fells faster than the wood grows can strip a hillside, and its panel says so. Marble and timber appear in the stock book, the Goods tab and the storehouse; Athens sells marble and Troy timber on their routes, and the trading ship buys both if you tick them. For now nothing in the city uses them: they are stored, sold and bought.

**Oliver can:** open `#quarry` and watch the blocks cut and dragged to the storehouse; open `#loggers` and watch a hillside thinned and slowly growing back.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#quarry`: `#richtown`'s town carried on as its builder would: a road out to the headland, a quarry on the richest marble there and a storehouse by the harbour road, played on until marble is in the storehouse and a sledge is on its way. The quarry tool in hand, so the marble shows (the rest of the outcrop is free for another quarry), the Goods tab open.
- `#loggers`: the same town with a road south from the west road to the edge of the west wood, a loggers' camp there and a storehouse near the west road, played on about a year and a half, so the slope near the camp is thinned (stumps and saplings at every stage) and the loggers are at work.
- Every earlier token keeps working, each also with `-paused`.

## Not in this slice

Monuments, the masons' yard, oxen carts to building sites (slice 35). Estates and their marble (slice 36). Naxos and Thasos selling marble and timber (they come with slice 31's sites, on the Greece line). Seasons in the woods (slice 33). Anything in the city using marble or timber.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets; the phase spec's *parallel plan* binds this line: the state version is 28 here (renumbered at merge), with `fromSlice32` in `migrate.ts` filling in only this slice's fields and padding goods arrays to whatever `GOOD_COUNT` and `TRADE_GOODS` are; the building kinds `quarry` and `loggers` go at the end of `BUILDING_KINDS`, the walkers `quarryman`, `logger` and `sledge` at the end of `WALKER_KINDS`; wares 10 (marble) and 11 (timber) only; edits to the shared files kept few and in blocks headed "Slice 32".
- Sim code stays pure and deterministic. The quarry, the camp, the woods' regrowth and the new goods draw on no random numbers at all (which tree a logger fells, how long a block takes, when a tree is back are all from the state), so nothing that was random before lands differently.
- **Earlier towns are untouched.** A town that never builds a quarry or a camp plays exactly as before. The new woods are added to the baked map's plants *after* every existing one, from their own random numbers, so every earlier plant keeps its place and its number (the `cleared` lists in saves and histories point at the same plants). Greece's two new goods are set from each city's character with no shuffle (as copper and armour were in slice 23), and every city but Athens (marble) and Troy (timber) makes what it uses, so no route, request, offer, gift or raid changes. The demo probe (outside the repo) plays every earlier demo at the starting commit and after, and compares the whole city at opening and 900 ticks on, the new goods' entries and the redraw counters left out. Any demo whose history builds on ground where a new wood stands (its `cleared` list then holds the new plants) is named in the check-in.
- Old saves load: a version 27 save goes through `fromSlice32` (no felled trees; every goods list one marble and one timber longer; every trade record two goods longer, each city of Greece making and using them by its character).
- The renderer and UI only read sim state; every action is a command (building, as before). Static build, `base: './'`, all art in code.
- Judge by screenshots, tune by eye, never claim it looks or feels right on Oliver's behalf.

## Before

Measured at `70087da` (the phase 5 spec, on top of phase 4's review), headless Chromium with software WebGL at 1920 × 1080:

| What | Before |
|---|---|
| Tests | 444, all passing |
| Download (gzipped) | 2,983 KB: the game 681 KB, the prepared towns 2,302 KB (79 files) |
| First load (bare link) | ready at 2,803 ms, first frame at 3,908 ms by the page's clock (coast bake 608 ms, scene build 2,156 ms) |
| Demo loads | the demos measured were ready between 3.3 s and 4.8 s by the page's clock (`#richtown` 3,341 ms, `#town` 4,496 ms, `#watchman` 4,771 ms, the slowest) |
| `#town` | 693 people, 81 homes, 60 walkers, 92 buildings; `town` view 1,453,964 triangles and 89 draw calls, `overview` 1,714,632 and 118; a save 149 KB |
| Map views | `coast` 1,241,324 triangles, 60 draw calls; `overview` 1,271,584 and 63 |
| Frame work (update before drawing) | not reached: the run timed out opening a page after the `#caravan` demo (the machine was loaded by the other lines), so the frame timings are taken from the after run on both commits if there is time, and otherwise compared with slice 29's |

Software WebGL on a shared machine (two other lines build at the same time): frame and load times swing by a third or more from run to run, so only large changes count.

## Design decisions

**Marble in the rock.** Authored data in `src/map/coast.ts` beside the copper: two outcrops on the headland, "on the headland's crown" (around 111, 104) and "above the bay on the headland" (around 105, 92), each a centre and a radius, read only by the quarry's rules (`tileMarble` and `marbleOf` in `src/sim/materials.ts`, built like `tileCopper`: richest at the centre, nothing at the edge, only on rock). Nothing about the ground changes. While the quarry tool is in hand the placement overlay glazes the marble pale, the stronger the richer. The boulders the map already scatters on the outcrops are drawn in pale marble rather than grey, so the outcrops show at any time.

**The woods.** Two new woods in `coast.ts` (`woods`): on the west slopes above the shore (about 12, 81, radius 11, running down into the shore's pines) and in the north hills (about 64, 9, radius 10). The bake scatters pines in them (a few cypresses), about 150 in all, appended to the plants after every existing one with their own seed. They are ordinary plants: cleared by roads and buildings, drawn in the chunks, on the minimap.

**The quarry** (3×3, 250 dr, 8 workers): only where its footprint averages enough marble (`QUARRY_MARBLE_MIN`, 0.3), on ground as uneven as a mine's (it is cut into the slope). Up to four quarrymen work its face (one for each quarter of its workers). They are walkers of their own (`quarryman`) who never leave the pit: each stands at his place on the face and cuts a block, which takes `CUT` ticks of work on the richest rock (a day and a fifth), longer on poorer (by the marble in the rock), then levers it onto the stack and starts the next. About 100 blocks a month fully worked on the richest rock. The quarry holds 200 blocks. Its carts are sledges (`sledge`, a cart in every rule, drawn as an ox dragging a sledge with a block on it, and slower than a cart: two thirds of its pace), each 25 blocks, to the nearest storehouse with room (new room: 800 blocks).

**The loggers' camp** (2×2, 150 dr, 4 workers): only where at least 8 standing pines or cypresses are within its reach (12 tiles from its middle), "at the edge of a wood". Up to three loggers out at once (one for each third of its workers), a few days apart. Each walks across country (as the hunters do) to the nearest standing tree in reach that no other logger is after (spreading out as hunters do), chops at it for two days, and it falls; he trims it for a day and carries its logs home (16 logs a tree); its carts take timber to a storehouse (40 a cart; new room: 800 logs). The olive trees are Athena's and the loggers leave them alone (their panel says so). About 90 logs a month fully worked, while the wood lasts.

**Felled trees and regrowth** (`s.materials`, `src/sim/materials.ts`): the one new top-level field, holding `felled`, the trees felled and when (`{ tree, at }`, by tree number, replaced as a new list whenever it changes, as `cleared` is). A felled tree is a stump; it is back as a full tree `REGROW` (two years) after it fell, and only then can it be felled again. A tree cleared away (a road, a building) is no longer felled. Readable: the camp's panel says how many trees stand in its reach, how many are felled and growing back, when the first comes back, and whether it is felling faster than the wood grows ("At this pace the wood within reach is gone in about 9 months, and grows back by about 3 trees a month").

**Marble and timber as wares.** Ware 10 (marble, in blocks) and ware 11 (timber, in logs), so `GOOD_COUNT` becomes 9. They have their own group on the Goods tab, "For building". They join the stock book (made by quarries and camps), the storehouse's display (stacked blocks and log piles) and the Goods tab from their `WARE_INFO` rows.

**Greece's new goods.** Marble and timber join the trade goods at the end of the list (indexes 8 and 9). Athens makes three times the marble it uses and Troy three times the timber; every other city makes what it uses, so it neither buys nor sells them. Set from character with no dice; the harvest, wars and festivals don't move them; requests, offers, gifts and raids keep to the six old goods. Usual prices: marble 300 dr a hundred blocks, timber 150 dr a hundred logs (Athens' marble and Troy's timber cheaper, as plenty makes it). The trading ship buys both if they are ticked for sale; nothing is ticked by default.

**Miners at the copper mine** (a leftover): drawn by the renderer from the mine's workers, as the quarrymen are drawn: up to three men with picks at the rock face by the adit, swinging in turn, and one pushing a little ore barrow between the face and the baskets. Nothing in the sim changes.

**The caravan yard on a slope** (a leftover): on sloping ground its footing showed downhill as a tall blank stone wall. It is drawn as a terrace instead, judged by screenshots: the footing stepped and battered like a field wall, with the slope's earth banked against it.

**Drawing.** The quarry (a stepped pit with pale faces, tool marks and drill holes, blocks on the stack, shear-legs with a rope, a shed and a water trough), the camp (a log cabin, a sawpit with a log across it, a chopping block, stacked logs, an axe rack) and the stock pieces (blocks and log piles at the quarry, the camp and the storehouse) are code-made models drawn with the other workplaces by Works. Quarrymen, loggers (an axe on the shoulder; chopping in two poses; a log carried home), the sledge and the timber cart are figures in the folk batches. A tree being felled sways as the axe bites, goes over in about a second of sim time (easing in as it falls), lies a day while it is trimmed, then leaves its stump. Saplings grow from a sprig to a full tree in steps. The trees still standing stay merged in their chunks; felled and regrowing ones are drawn apart, in a few small batches.

**Tools and panels.** The quarry and the camp are on the Industry tab and on M (after the winery). The quarry's tip, before you place it, says how rich the marble is and about how many blocks a month it would cut; the camp's says how many trees stand in reach, how long they would last and how fast they grow back. Each building's panel says what it is doing, why it is short, and where its goods go, as the mine's does.

## Tests

- **Determinism:** the same seed and commands give the same city with a quarry and a camp working after N ticks (felled trees, quarrymen, sledges); a save mid-felling round-trips and plays on identically.
- **Independence:** a town that never builds them plays exactly as before (the existing determinism and demo tests, plus Greece's prices and dice for the old goods unchanged).
- **Migration:** a version 27 save loads through `fromSlice32` at the new version, with no felled trees, every goods list padded, and plays on; the step pads to whatever the goods lists are, so it works with the other lines' steps in either order.
- **The quarry:** on marble it is allowed, off it refused with the reason; staffed, its quarrymen cut blocks at about the planned rate, sledges take them to a storehouse, the stock book notes them, and a quarry with no workers cuts nothing.
- **The camp:** refused with no wood in reach; its loggers reach trees and come home with logs; a felled tree stands again after `REGROW` and not before; a camp left long enough fells every tree in reach and then only what grows back; a tree cleared under a logger's axe sends him elsewhere.
- **Trade:** Athens sells marble and Troy timber; no other city buys or sells either.
- The existing suite. `smoke.mjs` opens `#quarry` and `#loggers` and checks what they open on; `measure.mjs` adds them (load, triangles and draw calls, the frame).

## Tasks

1. Plan (this file), with the baseline measured. Commit.
2. Sim: wares, marble in the rock, the woods, the quarry and its quarrymen and sledges, the camp and its loggers, felling and regrowth, Greece's new goods, migration, saves; tests. Commit.
3. Render and UI: the overlay and the pale boulders, the quarry, the camp, their stock, the figures, felled and regrowing trees, the miners, the caravan yard; panels, tips, tools, the Goods tab, help. Commit.
4. Demos `#quarry` and `#loggers`; look and tune by screenshots; smoke and measure. Commit.
5. Full checks, the demo probe, measurements, As built, the check-in. Commit, push.

## As built

*(Filled in when the slice is built.)*
