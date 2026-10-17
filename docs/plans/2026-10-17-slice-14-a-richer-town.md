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

*(Filled in when the slice is done.)*
