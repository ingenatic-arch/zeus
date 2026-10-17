# Slice 14 — A richer town

*17 Oct 2026. Phase 2, "A richer city" (`docs/specs/2026-10-16-a-richer-city-design.md`). The seventh and last slice of the phase. Builds on slice 13, "The ship comes in", and its review.*

## Goal and check-in

Three jobs, in the spec's words: a prepared demo town of a few hundred people with every chain, villas, hazards and the ship, for judging the look and checking the budgets; the money balance tuned across the whole game by playing it, smaller saves and phase 1's small rough edges fixed; and a look-and-feel pass over the new buildings, walkers, animals and panels.

**Oliver can:** open the richer demo town, play it for a few years, and judge whether money feels tight in a good way and the town looks richer.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#richtown`: the prepared richer town, a few hundred people (aiming for 600 to 900). Every chain at work: wheat, the hunting lodge and the dairy, olive groves and the press, the sheep pasture, vineyards and a winery; granaries and storehouses (one by the quay); villas on the best streets beside fine houses; watchmen, inspectors and tax collectors on their rounds; the trading post with goods on the quay and the merchant ship sailing into the bay. It opens from the hills over the town and the bay, at normal speed.
- `#richstreet`: the same town at street level among its villas.
- Every earlier token keeps working and tells the same story; where the money tuning moved one, the check-in says how.

## Not in this slice

Anything beyond the city except the one ship (the market and world phases); moving prices or buying from the ship; crime; seasons; a wage slider; more save slots; music. A new kind of building, walker or good.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- Sim code (`src/sim/`, `src/map/`) stays pure and deterministic: no `Math.random`, `Date`, `performance` or timers (the purity test enforces it); every player action reaches the sim as a command through the queue.
- Money moves only through `pay` (income through `income`); costs through `priceOf`. The ledger invariant holds over every run.
- **Histories may change this time, on purpose.** The money is retuned across the whole game, so the prepared towns' histories move. Every demo must still open on what it promises (each is checked by its tests and by a probe outside the repo that plays each one on for six months at its opening rate), and the check-in says what moved, demo by demo. Determinism (same seed and commands, same town) is unchanged.
- Old saves still load: a version 12 save opens in this version, and older ones go through every step.
- The renderer and UI only read sim state. Static build, `base: './'`, no runtime network requests, all art generated in code.
- Judge by screenshots, tune by eye, never claim it looks or feels right on Oliver's behalf.

## Before

Measured at `3f4037e` (the end of slice 13's review), headless Chromium with software WebGL at 1920 × 1080:

| | Before |
|---|---|
| Tests | 199 in 19 files, all passing (45 s); typecheck clean |
| Bundle | 3 files, 1,140 KB raw, 328 KB gzipped |
| Load (local, headless, page clock) | ready at 1.35 s, first frame at 1.57 s; coast bake 0.48 s, scene build 1.15 s |
| Opening view / overview / river / street / bay | 574 k triangles, 59 calls / 583 k, 61 / 395 k, 30 / 416 k, 32 / 417 k, 28 |
| `#streets` / `#water` / `#food` / `#fine` overview | 620 k, 68 / 722 k, 74 / 677 k, 88 / 814 k, 103 |
| `#town` / street / overview | 817 k, 83 / 749 k, 71 / 934 k, 109; ready at 1.67 s, first frame 2.18 s; 724 people, 58 walkers |
| `#villas` / overview | 714 k, 80 / 890 k, 110 |
| `#quay` / overview; `#ship` / town | 643 k, 55 / 962 k, 116; 598 k, 54 / 841 k, 91 |
| Update per frame, paused / running | `#food` 0.60 / 1.19 ms; `#fine` 0.83 / 2.91; `#town` 1.06 / 8.32; `#villas` running 7.51; `#quay` 3.96; `#ship` 3.41 |
| GPU objects | 38 geometries, 6 textures |
| A save of `#town` | 258 KB |

Money before (each played on from its opening, fire risk and wear off unless noted, by a probe outside the repo; figures in the check-in).

## Design decisions

**The money, tuned by playing.** The targets, from the spec and the earlier reviews:
1. A phase 1 style town (cottages, no goods: `#food`, `#bridge`) roughly breaks even at fair.
2. Harsh taxes have real teeth: more coin for a while, but households leave whole and newcomers stay away, so the town shrinks; setting them back down lets it recover.
3. Running dry is recoverable, quickly: the treasury pays the tax offices' wages first, so the collectors keep their pace, and the collectors' rounds are shorter, so coins come in steadily rather than in lumps every forty days.
4. Selling to the ship is a real way out: a visit pays a few months of wages for a town with spare goods.
5. Villas and goods are the road to riches: a villa pays clearly more than a fine house, so the wine chain pays for itself within months, and a town that sells its oil, fleece and wine gains several hundred drachmas a month.

The levers: the tax table (the upper levels pay more; the lower levels as now, so target 1 holds), the collector's round, the order wages are paid in, what harsh does, and the ship's prices. Wages stay 2 drachmas a worker. Every figure is tuned by probes that play the demos on for one or two years, and the before and after are written down in the check-in.

**Harsh taxes** (spec: "At harsh, fed-up families can leave"; the slice 8 review asked for teeth). While taxes are harsh, word gets about: newcomers come a third as often. On the first of each month, households a collector has called on that are unhappy or fed up leave whole (the house is left an empty plot, with a floater and a town line), and worried ones send someone away, as now. The tax chip's harsh row and the population tip say so. This goes a step beyond the spec's default ("no other penalty"), at the earlier reviews' request; the check-in asks Oliver to judge it.

**The ship's way in.** Her sail is on the horizon longer and she crosses the open water at a pace you can watch: a longer `SAIL_IN`, held near the horizon for its first part, then sailing in steadily and slowing to the jetty. Leaving takes longer too. Her position is still a pure function of her route, the phase and the tick.

**The prepared town** (`#richtown`). `#town`'s history (the way a player would build it), carried on: a road down to the bay with the trading post on the quay and a storehouse beside it; vineyards on the sunny slope and a winery, wine stalls at both agoras; more homes on the best streets so villas rise there; watch posts and architects' offices so nothing burns; goods ticked for sale. It opens a few days into the ship's approach, so her sail is in the bay as it opens. It goes into `measure.mjs` (triangles, draws, load, update per frame, save size) and `smoke.mjs`.

**Smaller saves.** The save envelope packs every list of records (buildings, walkers, family members and their stories, herds) as rows of values against a shared table of key lists, losslessly (the same keys in the same order come back). Save format 3; formats 1 and 2 still read.

**Phase 1's rough edges.**
- "Back to a hut" notes rising on top of each other when a whole street falls back: floaters with the same words that start at the same time near each other merge into one ("Back to a hut ×5"), and floaters that would overlap on screen are nudged apart.
- Two shortfall lines swapping places: the lines keep a fixed order.
- Starting a new town replacing the old town's autosave: a new town begun on the bare link while the autosave holds another town saves itself only once it has been saved by hand (as a demo does); the saves card and the corner note say so, and that the other town is kept.

**Handed over from the reviews of slices 8 to 13** (fixed where Oliver will notice; the rest are listed under Known rough edges):
- The trade panel brings its figures up to date in place, so hover tips don't flicker and clicks land (and the household panel and ledger, if cheap).
- Clearing the trading post (or losing it to fire or collapse) with goods on the quay says what was lost, in a town line.
- The wheat and cheese swatches in the trade panel are told apart.
- Hazard marks on a neglected street: from the usual zoom and further, only the worst mark of each kind in each block shows (smouldering and creaking ones always show).
- Smoke drawn as soft puffs (camera-facing, with a soft edge) rather than round balls.
- The watchman, after a fire, goes to a smoulder he can see before going home.
- The tax overlay doesn't tint a home visited at rate none as paid; the collector uses the sim's map.
- Round walkers' cost per tick in a big town (moveRounds): measured, and cut if cheap.
- The architect's office reads less like a white box at the usual zoom; bales and amphorae on carts read better.

## Tests

- The money targets as tests (they guard the tuning): a phase 1 style town breaks even within a band at fair; harsh taxes shrink `#town` over a year where fair grows it, and pay more for a while; `#dry` set back to fair pays its wages within a fortnight; a villa pays clearly more than a fine house; `#richtown` gains over a year.
- Harsh: households that are fed up leave whole, newcomers slow; through the command queue, deterministic.
- The ledger invariant still holds over a scripted run with every source of money.
- Saves: format 3 round-trips identically and is smaller; formats 1 and 2 still read; a real version 12 save loads.
- `#richtown` opens on what it promises (people in range, every chain, villas, watchmen, inspectors, collectors, the post, the ship coming in), and is saved and loaded identically.
- The ship's new way in stays on deep water and is smooth.
- Every earlier demo's tests still pass, adjusted where the money moved a figure on purpose (each adjustment is named in the As built).

## Tasks

1. Plan (this file). Commit.
2. Sim: the money (tax table, collector, wages order, harsh), the ship's way in, the watchman after a fire, the tax overlay fix, smaller saves, `#richtown`; tests; probes over every demo. Commit.
3. What Oliver sees: floaters, town line order, autosave guard, trade panel in place, the quay's lost goods, swatches, marks, smoke, the architect's office and the cart loads; measure and smoke extended. Commit.
4. Look and tune: screenshots of `#richtown` and the changed demos from several angles; adjust. Commit.
5. Full checks, measure, As built, the check-in. Commit, push, sync.

## As built

Built in four commits: the plan (`a35f06a`), the sim (`9379001`), what Oliver sees (`1e0f0e9`) and the look-and-tune pass with the check-in (the last commit of the slice). The figures are in the check-in.

**The money** (`src/sim/taxes.ts`, `treasury.ts`, `settlers.ts`, `folk.ts`, `trade.ts`).
- The tax table: the plots, tents, huts, cottages and townhouses pay as before; fine houses pay one more (light 7, fair 10, heavy 14, harsh 18; were 6, 9, 13, 17); villas pay half as much again (12, 18, 25, 32; were 8, 12, 16, 22). Target 1 holds: `#food` and `#bridge` lose 11 drachmas a month at fair, exactly as before.
- The treasury settles in two passes: the tax offices' wages first, then everyone else's. `#dry` set back to fair pays its first wages after 14 days (was 42).
- Harsh: newcomers come a third as often; on the first of each month, each household a collector has called on rolls by its mood: of twelve chances, a fed-up or unhappy household leaves whole on six, a worried one on three (and sends someone away on six more), one getting by on one (and sends someone away on five); a content one stays. Harsh taxes weigh more on a household's mood (−6, was −4). Each leaving is recorded in `s.taxGone` (state version 13), kept a year, read by the town line, the population tip and the tests.
- The ship's prices are up by about a fifth: wheat 20, meat and cheese 35, oil 70, fleece 55, wine 100 (were 15, 30, 30, 60, 45, 80).
- Wages stay 2 drachmas a worker.

**Deviations from the plan.**
- *The collector's round is not shortened.* Shortening it (tried at two lengths) made the collectors reach fewer houses and cut what came in, more than it smoothed it out; paying the tax offices first did the job the shorter round was for (`#dry` recovers in a fortnight). A collector still takes about forty days over a round, so coins still come in lumps. Listed under Known rough edges.
- *The ship's way in* is longer than planned: `SAIL_IN` 20 days (was 6) and `SAIL_OUT` 16 (was 5). Her position stays a pure function (`inwardAt`): full pace beyond the map, an easing over the last 12 tiles to the map's edge down to half a tile a tick across the bay, then an even slowing over her last 12 tiles to the jetty. A test checks her pace in the map stays under 0.55 tiles a tick and never jumps.
- *`#richtown`* is `#town`'s history carried on, with a bay quarter (a road down to the bay, a lane along the vineyards, three vineyards, a winery, a storehouse, wine stalls at both agoras), one more watch post and architect's office, and the trading post with every good ticked. To open with villas *and* the ship in the bay, the post goes up only once the treasury holds the wine chain's cost plus what the villas need, timed so that her first visit comes as they rise, and the town leaves out `#town`'s hamlet back row and the newest plots (or it grew past 1,000 people). It opens at 928 people, a little over the 900 aimed for, with 899 drachmas, 24 villas, 15 fine houses, and the ship 4 days out.
- *Smaller saves* also pack the tiles as runs, which gave most of the saving: `#town` 258 KB → 135 KB.
- *Lost goods* are recorded in the state (`trade.lost`, `trade.lostAt`) when the post goes with goods on the quay, so the town line survives a save.
- *The watchman after a fire* looks for another fire in sight, then a smoulder, and a smoulder he reaches is put out at once.
- *Marks* thin from 24 tiles out in blocks of 10 tiles (tuned by eye from 34 and 8).
- *The harsh town line* counts the households gone in the last three months, not the past month (a month's count dropped to nothing between the first-of-the-month rolls).
- *Panels in place:* a small DOM diff (`src/ui/morph.ts`) for the trade panel, the household panel and the ledger. Because a clicked tick or button now keeps the focus, the game's keys let go of it (`src/game/input.ts`), so Esc, Space and the speeds still work after a click (the smoke caught Esc not closing the trade panel).
- *`#town` opens with a few warned houses:* with the new history it opens just before the priestess comes by, so for a fortnight up to nine fine houses are warned about religion (with months to spare). The smoke's `#town` check now asks that no house is about to fall back, rather than none warned.

**Tests adjusted on purpose** (the money moved them):
- `tests/town.test.ts`: `#town`'s warned days are now under 300 (the town is richer, so the treasury's warnings changed).
- `tests/hazards.test.ts`: the blaze save test builds a watch post first (fires now start further east, out of the old watchmen's sight), with a 30 s time limit.
- `tests/oil.test.ts`: `serve` takes the map.
- `tests/saves.test.ts`: the damage tests and envelope 1 test write plain (envelope 2) files through a helper, since envelope 3 packs the records.
- `vite.config.ts`: tests time out at 30 s (several demos now play on longer before they open).

**Not done** (in the check-in's Known rough edges): the collector's round; `#town`'s food surplus; the variety overlay's blocks; the press carts' part loads; `#grove` slowly losing money; carts' travel speed; porters', bales' and amphorae's look (looked at, unchanged); moveRounds' cost (measured, not cut); the pace of fire; dockers' round trips.

## Review

*17 Oct 2026, a fresh reviewer: read the diff from `3f4037e`, played every "What to try" step in headless Chromium (`#richtown` on for two years at fastest, `#harsh` six months harsh then a year at fair, `#dry`, `#black`, `#quay` with the post cleared, `#richstreet` with Q and E, `#blaze`, `#creak`, the slice 13 save and the bare link), profiled the running frame with the DevTools profiler on an unminified build, and re-ran the checks.*

**Fixed.**
- *The per-frame cost of a big town* (`2a720c6`, `src/render/city.ts`). The profile of `#richstreet` running showed the sim's step at about 2 ms a frame (moveRounds about 0.4 ms) and `CityView.sync` → `Streets.rebuild` → `buildChunk` / `plotGround` at about 6 ms: `sync`'s per-building key included `b.level`, so every home rising or falling a level rebuilt its whole 32-tile street chunk. In `#richtown` 13 fine houses become villas in its first month, and headless frames hold about ten ticks each, so nearly every frame rebuilt one. `plotGround` only distinguishes level 0 (a plot outline) from the rest (trodden earth; `worksGround` reads no level), so the key is now `level > 0`. Alternating the handed-over build and the fixed one, 10 s each: `#richstreet` 16.4 / 18.9 / 17.1 → 9.8 / 9.1 / 9.4 ms; `#richtown` 13.6 / 10.2 → 9.9 / 8.8; `#town` 11.1 / 9.6 → 6.1 / 6.4. What is left in `#richstreet` is mostly `Homes.update` refilling the chunks of homes still rising, and three.js. Caching round routes or stepping round walkers less often would save well under a millisecond, so neither was done.
- *Tab and Enter on a focused panel button* (`2a720c6`, `src/game/input.ts`). The new focus handling blurred any focused button or tick on every key, so Enter no longer pressed a focused button and Tab navigation was lost. Tab and Enter now go to the page; everything else blurs and drives the game as the slice intended. Checked in the browser on `#quay`: a clicked + keeps the focus, Enter presses it again, Space blurs it and runs the game without pressing it, Tab moves to the next control, Esc closes the panel.
- *The `#black` ledger smoke check* (`2a720c6`, `scripts/smoke.mjs`). Not a game bug: `LedgerCard` redraws every `REFRESH` (0.4 s) of the frame clock `time`, which advances at most 0.1 s a frame, and headless frames take about a second; the check read the card two frames after the visit, sometimes before its next redraw. It now waits (up to 60 s) for the sale line.
- *The check-in*: the `#richstreet` cost was blamed on the round walkers; `#richtown`'s quay does get wine (from about the fourth visit); the moveRounds rough edge is gone.

**Checked and left as built.**
- Determinism and purity: no `Math.random`, `Date`, `performance` or timers in `src/sim` or `src/map` (`outerLength`'s WeakMap is a memo of a pure function of the route); the harsh rolls hash the family seed and month; tax and trade changes go through the queue. All 211 tests pass, determinism and replay included.
- Saves: every fixture (envelope 1 with state 6; envelope 2 with states 7 to 12) decodes, migrates to 13, and encodes to format 3 and back to the identical state, at about half the size (`slice13-harsh` 290 → 162 KB).
- Harsh taxes: in `#town` set to harsh, about five households a month leave whole (8, 2, 0, 5, 4, 5, 6, 3, 6, 4, 7, 1), so the fall is steady rather than a cliff, and the town line says "starting to think of leaving" before the first one goes. The treasury still gains about 320 dr a month while it shrinks. Recoverable: `#harsh` back at fair grows from about 500 to over 800 in a year.
- `leaveWhole` leaves the plot's supplies (water, food, goods until-ticks) for the next family, who settle a little faster; harmless, and in the spirit of "setbacks are recoverable".
- The ship's way in: her sail shows 20 days out (200 ticks, 20 s at normal speed) and she is inside the map for about her last 14; smooth, no jump at the edge (test).
- `#richtown`: opens as described (928 people, 24 villas, the ship 4 days out with 614 dr of goods on the quay; wages of about 300 dr go out 19 ticks after it opens). Played on at fair it gains about 500 dr a month and grows past 1,200 people in a year; in its second year the single pasture falls short (16 to 18 homes warned for fleece, 7 villas back to fine houses at 24 months), with a town line saying why. Its overview (1.02 M triangles, 119 draws) is left: about 10 % over `#town`'s, and the GPU budget wants checking on Oliver's laptop rather than here.
- `#town` opening with a religion warning (one house warned as it opens): moving `#town`'s opening would move about a dozen demos' histories and figures; left, and the check-in says so.
- The panels' `morph`: listeners are all delegated on the panel bodies, so replaced nodes lose nothing; ticks and disabled buttons are synced as properties; no `<details>`, `<select>` or range inputs to lose state.
- Clearing the post while paused: the ship chip and town line keep showing her approach until the next tick (the sim turns her back on its next step); the lost-goods line shows once the game runs. Minor, left.

**For the next slice (phase 3).**
- `Homes.update` refilling rising chunks is now the largest per-frame view cost in a growing town; if the frame budget bites on Oliver's laptop, merge rising homes in batches or refill less often.
- `#richtown` grows well past the 600 to 900 the spec aimed at once played on; a phase that adds walkers or units on top should measure at 1,300 people, not 900.
- Taxes still come in lumps (a collector takes about forty days over a round), and harsh taxes are profitable for a year even as the town shrinks; both are tuning questions for Oliver.
- The headless "update per frame" figure is dominated by however many ticks a slow frame holds (about ten); for comparing builds, alternate them in the same session, as above.
