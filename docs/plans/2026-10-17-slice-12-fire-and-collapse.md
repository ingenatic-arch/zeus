# Slice 12 — Fire and collapse

*17 Oct 2026. Phase 2, "A richer city" (`docs/specs/2026-10-16-a-richer-city-design.md`). The fifth slice of the phase. Builds on slice 11, "Fleece, wine and the villa", and its review.*

## Goal and check-in

Neglect starts to show. Every building slowly gathers fire risk (faster in busy and crowded ones: presses, wineries, the theatre, packed houses) and wear (faster in big ones). Past half, a small mark sits over the building, and two new overlays show fire risk and wear across the town, the worst buildings tinted red. A watch post sends a watchman on a round; every building beside his way has its risk reset. An architect's office sends an inspector; every building beside her way has its wear reset. A building whose risk tops out smoulders for about a month first: a thin thread of smoke, a crackle, and a town line naming the place ("Smoke over the Kallias house by the river mouth"). A watchman passing in time puts it out; if none does, it catches, and while it burns it can spread to a neighbour, one at a time, unless a watchman reaches it. A watchman who can see flames from his round runs straight to them and fights them. A building whose wear tops out creaks and sheds dust for about a month, then falls in if no inspector comes; collapse never spreads. A burnt or fallen building leaves rubble (its family leaves), which has to be cleared, for a small fee, before anything goes up there again. The ledger lists what fire and collapse cost.

The build bar, full since slice 11, is regrouped: a few group buttons with a pop-out of tools each, so the watch post and the architect's office have somewhere to go.

**Oliver can:** open a town with a neglected street, watch the smoke rise, put it out with a watch post in time, or let it burn and clear up afterwards.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#fire`: `#town` played on with its east street left without a watchman, opening paused on the first thread of smoke there, the fire-risk overlay on and the watch post tool in hand. Build a post by the street before the month is out and watch the watchman put it out; or don't.
- `#blaze`: the same town later, with no post built: a fire burning on the east street and spreading.
- `#rubble`: later still, the fire out, rubble where the houses stood, the clear tool in hand.
- `#creak`: `#town` played on with no inspector on its east street, opening on the first creaking building, the wear overlay on and the architect's office tool in hand.
- `#watchman`: following a watchman on his round, the fire-risk overlay on.
- `#inspector`: following an inspector, the wear overlay on.
- `-fire` and `-wear` show those overlays on any token; every earlier token keeps working.

## Not in this slice

The trading post, the ship and sales (slice 13); retuning money pressure (slice 14, as handed over); the prepared richer demo town (slice 14); crime; moving millstones and vats in the presses and winery, and bigger porters' handcarts (rough edges carried over); rebuilding a ruin automatically.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- Sim code (`src/sim/`, `src/map/`) stays pure and deterministic: seeded chance from the state's seed, no `Math.random`, `Date`, `performance` or timers (the purity test enforces it). Every player action reaches the sim as a command through the queue.
- Money moves only through `pay`; building costs come from `priceOf`.
- **No old history changes.** Hazards are switched off while a demo's history is built and switched on as it opens, so every demo opens with no fire risk or wear anywhere. The cottage demos and `#shrine`, `#priestess` and `#grove` are fingerprinted at `f4d1b49` (tick, people, money, every home's place, level and people, every walker) and must match exactly. The prepared towns that get watch posts and architects get them at the end of their setup (workplaces a day early, the `OFFICE_LEAD` pattern), and what moved is said in the check-in.
- The renderer and UI only read sim state. Static build, `base: './'`, no runtime network requests, all art generated in code.
- New walker looks register before the first frame and stay under the padding: the stag's 1,356 vertices on foot; the big mesh unchanged.
- Fire, smoke and dust are capped instanced particles; draw calls and per-frame cost measured before and after.
- Judge by screenshots, tune by eye, never claim it looks or feels right on Oliver's behalf.

## Before

Measured at `f4d1b49` (the end of slice 11's review), headless Chromium with software WebGL at 1920 × 1080:

| | Before |
|---|---|
| Tests | 178 in 17 files, all passing (28 s); typecheck clean |
| Bundle | 3 files, 1,043 KB raw, 299 KB gzipped |
| Load (local, headless, page clock) | ready at 1.06 s, first frame at 1.29 s; coast bake 0.35 s, scene build 0.98 s |
| Opening view / overview / river / street / bay | 574 k triangles, 59 calls / 583 k, 61 / 395 k, 30 / 416 k, 32 / 417 k, 28 |
| `#streets` | 441 k, 36 |
| `#water` / overview | 559 k, 46 / 722 k, 74 |
| `#food` / overview | 486 k, 55 / 677 k, 88 |
| `#warning` | 515 k, 66 |
| `#fine` / overview | 634 k, 71 / 812 k, 103 |
| `#closed` / overview | 617 k, 79 / 808 k, 112 |
| `#town` / street / overview | 812 k, 83 / 745 k, 71 / 929 k, 109; ready at 1.62 s, first frame 2.08 s; 724 people, 81 homes, 58 walkers, 92 buildings |
| Update per frame, paused / running | `#food` 0.58 / 0.82 ms; `#fine` 0.55 / 1.60; `#town` 0.94 / 6.24 (noisy) |
| GPU objects | 55 geometries, 6 textures |
| A save of `#town` | 248 KB |
| Walker padding | people mesh 1,356 vertices a look (the stag), big mesh 2,412 (the oil cart) |
| Build bar | 32 buttons in one row: 1,763 px wide at 1920, 1,257 at 1366, 1,178 at 1280 |

## Design decisions

**Risk and wear** (0 to 1,000 on every building; `src/sim/hazards.ts`).
- Counted once a day per building, staggered by id like the homes' daily step, only while `hazards` is on (it is in every new game).
- *Fire risk* fills in about: tents and huts 420 days, cottages 400, townhouses 360, fine houses and villas 330, times a crowding factor (0.7 + 0.5 × people / room, so a full house fills 1.2 × as fast and an empty one 0.7 ×); the olive press, the winery and the theatre 240 days; the agora, granary, storehouse, dairy and hunting lodge 330; farms, groves, vineyards and pastures 480; the shrine, tax office, watch post and architect's office 420. Fountains never burn; rubble neither. Each building's rate is varied by ±15% from a hash of the seed and its id, so a street doesn't all fill on the same day.
- *Wear* fills in about: homes 540 days (tents 600), the theatre, granary, storehouse, agora, press and winery 330 (big), farms, groves, vineyards and pastures 480, the small civic buildings and fountains 450. Varied ±15% the same way.
- A watchman resets the risk of every building beside his way, and an inspector the wear; so does a building's own watchman or inspector leaving and returning (the posts look after themselves).
- *Marks.* Past half, a small mark floats over the building: a flame for risk, a cracked brick for wear (both if both). The overlays tint buildings green below half, amber past half, red past three-quarters, and stand a column over each one past half, as the other overlays do.

**Smoulder, fire and spread.**
- When risk reaches 1,000 a building starts to smoulder for 30 days (±5 by hash). A watchman passing (his round resets it) puts it out; it is also out if the building is cleared.
- If it isn't, it catches: it burns for 12 days, then falls to rubble. While it burns, once a day, each of its four sides is checked for the nearest building touching it (fountains and rubble don't burn); with a seeded chance of 0.12 a day one of them (picked by the same seeded draw) starts burning at once (no smoulder: "one at a time").
- *The watchman's dash.* Every few ticks a watchman on his round looks for a burning building within 10 tiles of him (his sight) that his roads reach. If he sees one he leaves his round and takes the shortest road path to its door, running (1.6 × his walking speed), and fights it for 2 days, which puts it out (its risk back to 0, the building saved). Then he looks for the next fire in sight, else heads home. A watch post whose watchman is in sees a fire within its range and sends him out at once.
- *Losses.* A building that burns down goes as if cleared (its family leaves, its workers go, its walkers go home) and a heap of rubble takes its footprint. The ledger gets a "Lost to fire" line naming it (no money: the line counts the buildings).

**Creak and collapse.** When wear reaches 1,000 a building creaks for 30 days (±5): dust falls from it, a creak sounds now and then, and a town line names it. An inspector passing in time makes it sound (wear back to 0). If none does, it falls in: rubble, the family leaves, a "Fell down" ledger line. Collapse never spreads.

**Rubble** is a building of its own kind (`rubble`), on the footprint of what stood there (it remembers the kind and, for a home, the family's name). Burnt rubble is black timbers and ash; fallen rubble is a heap of stone and tiles. Roads, plots and buildings refuse it ("Rubble: clear it first, with the clear tool"). Clearing it costs a small fee (10 drachmas a 2 × 2 heap, 20 a 3 × 3), on a "Clearing rubble" ledger line; undo brings the heap back and refunds the fee.

**The watch post** (2 × 2, 100 dr, 3 workers) and **the architect's office** (2 × 2, 120 dr, 3 workers) are round walkers' buildings like the tax office (`src/sim/rounds.ts`): range 32, a walk of 48, rest 30 ticks between rounds, speed as the tax collector's, working by how staffed they are. The watchman's round goes first to the buildings nearest to smouldering (a smouldering one most of all); the inspector's to the most worn.
- *The watchman:* a man in a red-brown tunic with a leather cap, a bucket in one hand and a hook on a pole on his shoulder. *The inspector:* a woman in deep blue with a measuring rod and a wax tablet.
- *The watch post:* a little stone guard house with a tiled roof, a lookout platform on posts, a rack of buckets and a red pennant. *The architect's office:* a whitewashed office with a columned porch, a drawing board and stacked building stone in its yard.

**Readable.** Hover tips name the risk and wear ("Fire risk 64%: no watchman passes"), the smoulder or creak and how long is left, and on rubble what stood there and what clearing costs. The household panel gets the same line. The town lines name the place with the household's name and the district ("Smoke over the Kallias house by the river mouth", "The Doros house by the olive grove creaks"); before that, buildings past three-quarters with no watchman or inspector in reach get one line ("Fire risk is high on the east street: no watchman goes there"). A fire's own line: "Fire on …! A watchman is running to it" or "… and no watchman is near". A lost building gets a line too.

**Sound.** A crackle loops faintly while a smoulder or fire is in earshot (louder for flames), and a creak plays now and then near a creaking building; a collapse thuds once.

**The build bar, grouped.** Seven group buttons and the overlay button, each opening a tray of its tools above it (closed by a click elsewhere or Escape): *Roads and homes* (road, homes, bridge); *Water and food* (fountain, farm, granary, agora and its stalls, hunting lodge, dairy); *Goods* (grove, press, storehouse, pasture, vineyard, winery); *Culture* (shrine, theatre); *Civic and safety* (tax office, watch post, architect's office); *Clear*; *Undo*; *Overlays* (every overlay). A group's button shows its chosen tool. The tool keys keep working as before (Z cycles tax office, watch post, architect's office; J cycles the tax, fire-risk and wear overlays); hovering a tool says its key. Checked at 1280, 1366 and 1920.

**Saves.** State version 11: building kinds `watchpost`, `architect`, `rubble`; per building `risk`, `wear`, `fire` (0 none, 1 smoulder, 2 burning), `fireAt`, `creakAt`, `was` (rubble: what stood there), `ruin` (rubble: the household's name); rounds `fire` and `wear`; walker kinds `watchman` and `inspector`; ledger kinds `fire`, `collapse`, `clearing`; the state's `hazards` switch. A version 10 save is migrated with no risk or wear anywhere and hazards on (`src/sim/migrate.ts`); the welcome back says fire and wear now build up and what to build. Older versions go through every step.

**Demos.**
- Every demo opens with no risk or wear (hazards off while its history is built).
- `#town` (and the money and hunt demos built on it) gets two watch posts and an architect's office at the end of its setup, placed so every building in town is in reach. The culture towns with a theatre (`#theatre` … `#closed`, `#nooil`, `#villas`, `#winery`, `#vineyard`, `#pasture`) get a watch post and an architect's office by the lane. The cottage demos and `#shrine`, `#priestess` and `#grove` get nothing (fingerprinted).
- New: `#fire`, `#blaze`, `#rubble`, `#creak`, `#watchman`, `#inspector` (above).

## Tests

- Rates: a crowded house's risk fills faster than an empty one's, a theatre's faster than a farm's; wear faster in big buildings; nothing moves while hazards are off.
- Fire with no watchman spreads by the rules: smoulder for its days, then burning, spreading one neighbour at a time, never to a fountain or across a road, rubble at the end, the family gone; the same seed gives the same fire.
- A watchman on the street puts it out: a smouldering house on his round is put out; a burning one in sight brings him running and he puts it out before it spreads.
- Collapse: a creaking house with an inspector passing is saved; without one it falls to rubble and nothing else does.
- Rubble: refused for roads and buildings, cleared for its fee on the ledger, undo brings it back; the ledger invariant holds through fires and clearing.
- Saves: a real version 10 save (a gzipped `#town` from the slice 11 code, `tests/fixtures/slice11-town.save.json.gz`) loads with no risk or wear and saves again identically; a save in the middle of a fire carries on identically; the older fixtures still load.
- Determinism and replay with watch posts, architects, fires and rubble.
- The earlier demos: the cottage demos fingerprint exactly as before; `#town` and `#food` don't smoulder anywhere within a year of opening.

## Tasks

1. Plan (this file). Commit.
2. Sim: state, kinds and the hazards switch; risk and wear; smoulder, fire, spread and the dash; creak and collapse; rubble and clearing; the watch post and the architect's office; ledger kinds; migration and save checks; demos; tests. Commit.
3. What Oliver sees: the two buildings and two walkers, rubble, marks, smoke, flames and dust, the overlays, tips, panel lines, town lines, ledger lines, welcome back, sound; the grouped build bar and keys; smoke and measure extended. Commit.
4. Look and tune: screenshots of the new demos and earlier ones from several angles; adjust. Commit.
5. Full checks, measure, As built, the check-in. Commit, push, sync.

## As built

Commits: plan `08d2865`, sim `a01550b`, what Oliver sees `742ee5b`, look and tune `353a3a5`, then the check-in.

**Where it differs from the design above, and why.**
- *Costs.* The watch post is 60 dr and the architect's office 80 (not 100 and 120): with money tuning left to slice 14, the prepared towns could not otherwise afford two of each without opening nearly broke.
- *Fire.* A fire burns for 10 days (not 12) and spreads with a chance of 0.08 a day (not 0.12). At the planned figures `#blaze` lost most of the east street within a fortnight, before a watchman built in reply could get there; at these a fire usually takes one or two neighbours.
- *Rounds.* The watchman's range is 32 with a walk of 40; the inspector's range 40 with a walk of 48 (so one architect's office covers about what two posts do); both rest 30 ticks. A watchman looks for flames every 5 ticks within 10 tiles, and dashes at most 24 tiles of road, at the run speed (1.6 × the collector's), and fights for 2 days.
- *The switch.* `hazards` is off in a fresh state and switched on by a command (sent by the game for a new game, and by every demo as it opens), so replays and saves carry it; a version 10 save is migrated with it on. This is what keeps every earlier demo's history unchanged.
- *Placements.* `#town` (and the demos built on it) gets watch posts at (87, 32) and (25, 39) and architects' offices at (87, 34) and (27, 39). The lane towns with a theatre get a post at (24, 68) and an office at (24, 62). `#fire`, `#blaze` and `#rubble` replace the east post with one by the core's west side (60, 35), so the east street is the only one no watchman reaches; `#creak` keeps only the hamlet's office (27, 39).
- *A view.* A new `east` view (over the east street, looking back west) is the opening view for `#fire`, `#blaze`, `#rubble` and `#creak`; from the old `town` view the first smoulder was off the edge of the screen.
- *The build bar.* Grouped differently from the plan, around the existing keys so nothing Oliver has learnt changes: road (bridges with it), housing, fountain, shrine, theatre, clear and undo stay single buttons; *Farms and workshops* (M: farm, lodge, dairy, grove, press, pasture, vineyard, winery), *Granary and storehouse* (G), *The agora and its stalls* (K), *Offices* (Z: tax office, watch post, architect's office) open rows of tools; the overlays keep their single buttons for water, religion, culture and what's missing, and get two rows, *Food and goods* (L) and *Taxes, fire risk and wear* (J). 17 buttons, 988 px wide at 1920, 737 at 1366, 728 at 1280 (was 32 buttons, 1,763, 1,257 and 1,178 px). A row closes on a click elsewhere, on Escape, or on picking a tool; the tool hint lifts above an open row.
- *Overlay tokens.* No new `-fire` / `-wear` link modifiers: the fire demos open with their overlay, `-overlay` turns on any demo's own overlay as before, and J cycles tax, fire risk, wear and off in the game.
- *Marks* show on the plain view and on every overlay (they are the warning, not part of one overlay). Below the mark threshold the overlays tint and stand columns as designed.
- *Words.* Households are named by the family name ("the Kleon house"); rubble from a home says "Kleon's household has left the city". The ledger lines read "Burnt down · homes", "Fell down · …" and "Clearing rubble · … (n heaps)".

**Effects on the earlier demos.** The cottage demos, `#shrine`, `#priestess` and `#grove` fingerprint exactly as at `f4d1b49`. The towns that got posts and offices open at the same tick with the same people and levels and less money: `#town`, `#dairy` 233 dr (was 513), `#hunter` 368 (648), `#taxes` 376 (704), `#harsh` 1,327 (1,679), `#theatre` 255 (395), `#fine`, `#pasture`, `#vineyard` 828 (968), `#closed` 2,091 (2,231), `#nooil` 620 (832), `#villas`, `#winevendor` 1,418 (1,558), `#winery` 507 (647). `#dry`, which waits for the first unpaid wages, opens two months sooner: tick 9,050 with 806 people (was 9,650 and 854). Left running, `#food` first smoulders about 9.5 months after opening and `#town` not within two years (its posts and offices cover it).

**Tests.** 9 new in `tests/hazards.test.ts` (rates and the switch, every demo opening clean, fire and spread without a watchman, the watchman's put-out and dash, creak and collapse, rubble and clearing with undo, a real slice 11 save `tests/fixtures/slice11-town.save.json.gz`, a save mid-fire and replay, the fire demos opening on what they promise); `tests/treasury.test.ts` and `tests/people.test.ts` adjusted for the new ledger kinds and building kinds. 187 tests in 18 files.

**Rough edges left.** The architect's office reads less clearly close up than the watch post. Creak dust is hard to see from the town view (the mark, the overlay column and the town line carry it). `#rubble` opens with five smoulders on the unguarded street round the heaps, so more fire is on its way there. Measurements are in the check-in.

## Review

Reviewed against `f4d1b49..5ef2328`. Every "What to try" step was followed in headless Chromium, the fire demos and the regrouped bar were looked at close up and from the street, and the sim was probed in Node (pace, the watchman's dash, round coverage, cost per tick).

**Fixed** (commits `93c3b98`, `16d732d`, `e81c169`, `0f47ac1`):
- *Undo after clearing reset hazards.* `clearArea` recorded kinds, positions and names but not `risk`, `wear`, `fire`, `fireAt`, `creakAt` or `placed`, so undo brought a smouldering or creaking building back safe and sound with no risk or wear (a free reset of a building's year of neglect), and brought rubble back with `placed = now`, which made the frame loop replay "Burnt down"/"Fell down" and the thud. `UndoEntry.removedHazards` (six numbers a removed building, optional, checked by `undoOk` in saves) now carries them; homes keep the old behaviour (they come back as fresh plots). Old saves without the field undo as before.
- *Undo refunded a building that had burnt down.* `toRubble` dropped the building from its build's undo entry but left the entry's cost, so undoing that build paid back the full price for a building that was rubble. It now takes `COST[kind]` off the entry too. Test in `tests/hazards.test.ts` ("undo"), with `ledgerAddsUp`.
- *Frame loop allocation.* The per-tick hazard diff in `main.ts` cleared and refilled a `Map` of fresh objects for every building every tick (and built a `Vector3` and centre for every building). It now keeps one number a building (`fire * 2 + creak`) in place and does the position work only for a building that changed.
- *Ledger note.* `gone === lost(now)` compared two fresh arrays, so the fire/collapse note always said "Last month".
- *Placing tips.* `hazardReach` now also counts the reached buildings that are smouldering, burning or creaking; the watch post and architect's office placing tips name the one reached ("It reaches the fine house of Kleon, which is smouldering") or count them, and warn in amber when none of the current trouble is reached. The tip cache key now includes the day so it follows the fire. (`placeName` exported from `status.ts`.)
- *Looks.* Grove and vineyard marks were inside the canopy (`TOP` 0.6 → 1.2, 0.45 → 0.55). The smoulder thread: 16 puffs with per-puff jitter and size and a wind drift that grows with height, so it reads less like a string of beads. Architect's office: a column being made in the yard (stacked drums and one lying) and warmer `stoneBlock`/`stoneBlockShade` (used only by the office and rubble).
- A stale "22 buttons" comment in `style.css`.

**Checked and left.**
- *The switch.* Every way into a game turns hazards on: demos through `calm()`, a plain new game and the coast through the else branch in `main.ts`, version 10 saves by migration. A bare `createState` is off; the earlier tests rely on that.
- *Off-road watch post.* It behaves like every other workplace: amber warning on placing, built anyway, hover says it needs a road beside it. No change.
- *Pace.* In Node, `#town` with the east post moved: the first smoke on the east street gives about 30 days before it catches, the three-quarters town line comes well before that, and the street lost 15 buildings in five months as the check-in says. Population dipped about 3% and recovered; money kept rising. Not retuned; it is the question put to Oliver.
- *Performance.* Hazard stepping itself is negligible in a profile. The rise in sim cost per tick in `#town` (about 100 → 150 µs in Node here, the builder's 118 → 147) is the four new round walkers (`moveRounds` 13% → 22% of a tick; inspector 6.4%, watchman 5.2%) and their labour. The headless "running" frame figures include up to 10 sim ticks a frame at about 1 fps, so they overstate what a real 60 fps frame pays (about one tick a frame at normal speed).
- *Invariants.* No `Math.random`, `Date`, `performance.now` or timers in `src/sim` or `src/map`; all new actions go through `enqueue`; no network requests; `base: './'`.

**For the next slice.**
- Marks and overlay columns get busy on a neglected street (`#creak` opens with 57). A cap or fading by distance, or showing only the worst on a block, would help if Oliver finds it noisy.
- Smoke puffs are still visibly round balls close up; a soft sprite or noise texture would read better than more spheres.
- After putting out a fire the watchman goes back to his round (home first) rather than to a smoulder he passed; in `#blaze` the smoulders beyond his round catch about 15 days in.
- Round walkers now cost about a third of a tick in a big town; with more services coming, `moveRounds` is the place to look (route caching per post, or stepping round walkers every other tick).
- The architect's office is better but is still mostly a white box from the usual zoom; it is the drawing board and drums that carry it.
