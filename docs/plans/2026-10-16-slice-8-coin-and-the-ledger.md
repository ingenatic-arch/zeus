# Slice 8 — Coin and the ledger

*16 Oct 2026. Phase 2, "A richer city" (`docs/specs/2026-10-16-a-richer-city-design.md`). The first slice of the phase. Builds on phase 1 and its review.*

## Goal and check-in

Money starts to matter. Rent is gone: a tax office sends a tax collector on a round, and only the homes beside his way pay, once a month, by their level and the tax rate. Every workplace pays its workers on the first of the month. A ledger says where each drachma came from (taxes by district) and went (wages by kind of building, building by what was built), this month and last. The tax rate sits in the top bar beside the drachmas: heavy and harsh taxes sour moods and the chatter grumbles; at harsh, unhappy families start to leave. When the treasury runs dry, wages go unpaid, those workplaces work at half speed and their households grumble, and nothing new can be built until money comes in again. Phase 1 saves load, with rent turned into taxes and a note to build a tax office. Costs, wages and taxes are tuned so a phase 1 town roughly breaks even at the fair rate.

**Oliver can:** open the ledger in `#town`, build a tax office and follow the collector, find the street he misses with the overlay, turn taxes up and hear the grumbling, and run the treasury dry to see what happens.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#town`: the prepared town, now with a tax office in its core; its collector reaches the core and part of the east street, not the hamlet over the river.
- `#ledger`: `#town` with the ledger open.
- `#taxes`: `#town` as a phase 1 town would open: no tax office, the tax office tool picked and the tax overlay on.
- `#collector`: `#town` at street level, following the tax collector, the tax overlay on.
- `#harsh`: `#town` a month and a half after the taxes went up to harsh: a grumbling household's panel open.
- `#dry`: `#town` with taxes set to none, played on until the treasury has run dry and wages go unpaid.
- Every earlier token keeps working.

## Not in this slice

Goods, storehouses, sales and the ship (slices 9–13); fire, collapse and rubble clearing fees (slice 12); a wage slider; debt or a game over; phase 1's small rough edges (slice 14); smaller saves beyond what this slice needs to stay the same size.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- Sim code (`src/sim/`, `src/map/`) stays pure and deterministic: seeded RNG in the state, no `Math.random`, `Date`, `performance` or timers (the purity test enforces it). Every player action, the tax rate included, reaches the sim as a command through the queue.
- Every change to the treasury goes through one function with a reason (`src/sim/treasury.ts`), which fills the ledger, so the ledger always adds up. Later slices (wages for new buildings, fire costs, ship sales) reuse it.
- The renderer and UI only read sim state. Static build, `base: './'`, no runtime network requests, all art generated in code.
- Judge by screenshots, tune by eye, never claim it looks or feels right on Oliver's behalf.
- Wages and taxes touch every earlier demo: each demo's check-in promises are re-checked and what moved is said in the check-in.

## Before

Measured at `4bdff94` (the phase 2 spec), headless Chromium with software WebGL at 1920 × 1080:

| | Before |
|---|---|
| Tests | 120 in 12 files, all passing; typecheck clean |
| Bundle | 3 files, 861 KB raw, 243 KB gzipped |
| Load (local, headless, page clock) | ready at 1.51 s, first frame at 2.02 s; coast bake 0.45 s, scene build 1.38 s |
| Opening view / overview / river / street / bay | 534 k triangles, 57 calls / 542 k, 59 / 354 k, 28 / 375 k, 30 / 376 k, 26 |
| `#streets` / overview | 384 k, 42 / 562 k, 74 |
| `#water` / overview | 489 k, 54 / 652 k, 82 |
| `#food` / overview | 426 k, 69 / 617 k, 102 |
| `#warning` / overview | 470 k, 84 / 650 k, 115 |
| `#fine` / overview | 494 k, 82 / 673 k, 114 |
| `#closed` / overview | 475 k, 98 / 666 k, 131 |
| `#town` / street / overview | 650 k, 103 / 587 k, 89 / 766 k, 128; setup 0.49 s, ready 1.46 s, first frame 1.92 s |
| Update per frame, paused / running | `#food` 0.49 / 0.88 ms; `#fine` 0.67 / 1.44; `#town` 0.79 / 2.85 |
| GPU objects | 52 geometries, 4 textures |
| A save of `#town` | 452 KB |
| Money in `#town` | 6,080 dr at opening, rent about 480 a month, 17,600 two years later and 23,300 after three |

## Design decisions

**The treasury** (`src/sim/treasury.ts`). `pay(s, amount, kind, what, n)` is the only thing that changes `s.money`; it adds the amount to this month's ledger line for that kind and what (`taxes` by district, `refund` by what was undone; `wages` by building kind, `building` by what was built). The ledger keeps this month and last month, each with the money it started with, so `start + Σ lines = money` always holds and last month's lines add up to the change between the two starts. A new month starts on the first day of each month (and lazily on any payment that finds the month has turned). Saved with the state.

**Taxes.**
- *The tax office* (2 × 2, 150 dr, 3 workers, key Z) sends a *tax collector* on the shared round (32 road tiles' reach, 64 fresh road tiles a round, rests 30 ticks). He heads first for the homes that haven't paid this month, longest unpaid first. Each lived-in home beside his way pays at most once a month (`taxedAt`, `taxPaid` on the home), by its level and the tax rate. He carries the coins in his satchel (a per-district purse on the walker) and they reach the treasury, as taxes by district, when he gets back (or if he's lost, or his office is cleared). A short-handed office lets him rest longer; with nobody working it he doesn't go out.
- *Rates*, by level (tent, hut, cottage, townhouse, fine house), drachmas a month, tuned by playing `#town` forward: none 0; light about half of fair; fair; heavy about one and a half times; harsh about twice. The starting point is fair = 1, 2, 3, 5, 7.
- *The rate* is a command (`{ type: 'tax', rate }`), so replays and saves keep it. Mood: none +1 ("No taxes to pay"), light a neutral line, fair nothing, heavy −1 ("Taxes are heavy"), harsh −3 ("Taxes are harsh"). It is read from the city's rate, so setting it back lifts moods at once (within the month the spec allows).
- *At harsh*, once a month, a household that is unhappy or fed up sends someone away (the smallest group that can go, as when a home goes down: a grown child, or a family who joined them), chosen by a hash of the household and the month, so no random number is drawn and nothing else changes. Their story says they left because of the taxes.
- *Districts* (`src/map/districts.ts`): the coast is cut into a dozen named parts ("the west bank", "below the cypress hill", "by the olive grove", "the east road", "by the bay", "the flood plain", "the headland" …), authored as data like the hills and groves; a home's district is the nearest named place, or the flood plain beside the river. The ledger groups taxes by district; later slices name places in notes the same way.

**Wages.**
- On the first of each month, every workplace owes `WAGE` (3 dr to start, tuned) per worker it has. The treasury pays them in building order, each in full or not at all.
- *Running dry*: a workplace it can't pay keeps its wages owed for the month (`owed`), works at half speed (`rateOf` halves) and the households of its workers grumble ("Not paid this month", −1; `unpaid` on the home counts them, set when workers are shared out). Whenever money comes in, owed wages are paid first, so wages resume as soon as there is money. Owed wages are not carried into the next month (no debt), and money never goes below zero.
- *Nothing new can be built* while wages are owed: money that comes in goes to the wages first, and building can only spend what is left.
- *Never stuck*: while the city has no tax office, the treasury keeps back what one costs (150 dr): neither wages nor other building can spend it, so a tax office can always be built. Said in the ledger and the tax line.
- No upkeep besides wages (the spec's default).

**Starting money** stays 5,000. Building costs stay as they are unless tuning says otherwise.

**Readable**
- *Top bar*: the drachmas open the ledger; a small arrow beside them shows which way money went last month (gold up, rust down); the tax rate chip beside them ("Taxes: fair") opens the five rates with what each does. When wages are owed, the drachmas turn rust.
- *The ledger* (a parchment card like the saves card): this month so far and last month side by side; coming in (taxes by district with the homes that paid, things undone); going out (wages by kind of building with the workers, building by what was built); the month's net; what it started with. Under it: how many homes the collectors reached this month and how many they missed (by district); the tax rate; what each worker is paid; any owed wages, or the reserve kept for a tax office.
- *Town lines* (under the top bar, as for bread and workers): no tax office while wages are being paid ("Taxes: there’s no tax office, so nothing comes in, and wages cost about 130 dr a month. A tax office (Z) by the homes sends a collector round."); the treasury running down ("The treasury lost about 120 dr last month: at this rate it runs dry in about 4 months."), shown when it would run dry within six months and the office has stood for a whole month; the treasury empty ("The treasury is empty: wages for 4 workplaces went unpaid, so they work at half speed…"). Clicking a money line opens the ledger.
- *Homes*: the hover tip and the household panel say what they paid and when ("Taxes · paid 7 dr on 3 June"), or "No tax collector has called this month" and why (no tax office; too far by road; not this way yet). A tax office's tip says where its collector is and what his satchel holds, and what it has brought in this month.
- *The tax overlay* (J, or its button): roads in a collector's reach, brighter where he has walked this month; homes that have paid this month tinted, homes that haven't with a post over them. Placing a tax office shows it and says how many homes the new collector would reach and how many pay nothing now.
- *Chatter*: lines for no taxes, heavy and harsh taxes, and wages not paid, said in the second slot when they apply.

**What Oliver sees**
- *The tax office*: a small stone counting house with a tiled roof, a columned porch to the road, a strongbox and a table with a balance by the door, a bronze-green band so it reads apart from the shrine.
- *The tax collector*: a man in a dark green tunic and a wide straw hat with a leather satchel at his hip and a wax tablet in his hand; the satchel swells as he collects.
- *Coins coming in*: when the collector gets back, "+84 dr" floats up from the office.

**Saves**
- The state goes to version 7: `rent` goes; `taxRate`, `ledger` and the tax round's record come in; homes get `taxedAt`, `taxPaid`, `unpaid`; workplaces `owed`; walkers a `purse`.
- *Phase 1 saves (version 6) load*: `src/sim/migrate.ts` turns a version 6 state into version 7 (fair taxes, a fresh ledger starting from the money it had, every new field zero). The town has no tax office, so the tax line says to build one, and the welcome-back note says rent is gone.
- *Same size*: the five street records (walked and exits, 16,384 numbers each) are packed in the save as runs (`[value, count, …]`), which more than pays for the new one. The envelope goes to version 2; version 1 envelopes still read.

**Demos.** `#town` gets its tax office in the core as the town is founded (with the farms), so its history changes; it is re-checked (every level, the bridge, no drops in two years). Every earlier demo with workplaces gets a tax office placed at the end of its setup, by its homes, so its history up to opening is unchanged (as long as wages never went unpaid on the way: checked) and it doesn't drain once opened. `#workers` (short of hands) gets none, so its numbers stay; it shows the tax line.

## Tests

- The ledger invariant: over a scripted run with roads, plots, buildings, undo, taxes and wages, the treasury only changes through the ledger: each month's lines add up to the change between month starts, and this month's to the money now.
- Taxes: the collector taxes the homes beside his way once a month at the rate's amount, brings the coins back, and homes off his way pay nothing; with the rate at none nobody pays; the rate goes through the command queue and replays.
- Wages: paid on the first per worker; with too little money, the workplaces not paid work at half speed and their households are marked; money coming in pays them; the treasury never goes below zero; with no tax office, 150 dr is kept back and a tax office can still be built.
- Harsh taxes: unhappy households lose a group within a few months; at fair nobody leaves for taxes.
- Saves: the round trip carries on identically with the collector out with coins in his satchel and wages owed; a real phase 1 save (a gzipped fixture made from the phase 1 code) loads, has no tax office, fair taxes, a ledger that adds up, and plays on; a `#town` save is no bigger than before.
- Determinism and replay as before, now with taxes, wages and the rate.
- `#town`: every level, every kind of building, the bridge, a few hundred people; no drops in two years; money over three years stays within about a thousand drachmas a year of break-even (no pile-up).
- The earlier demos' promises (existing tests), with what moved recorded.

## Tasks

1. Plan (this file). Commit.
2. Sim: the treasury and ledger, wages and running dry, the tax office and collector, the tax rate command and moods, harsh leaving, districts, migration, save packing, demos; tests; tune wages and taxes by playing `#town` forward. Commit.
3. What Oliver sees: the tax office and collector models, the top bar's arrow and rate chip, the ledger card, the tax overlay, town lines, tips and panel lines, chatter, the build bar and keys; smoke extended. Commit.
4. Look and tune: screenshots of `#town`, `#ledger`, `#collector`, `#taxes`, `#harsh`, `#dry` and the earlier demos; adjust. Commit.
5. Full checks, measure, As built, the check-in. Commit, push, sync.

## As built


*Commits `bca27cb` (this plan), `bf92fa5` (sim), `9fb00a9` (what Oliver sees), `66d0666` (looked at and tuned), then the check-in.*

**What changed from the plan**
- *Numbers, from playing `#town` forward.* `WAGE` is 2 dr a worker, not 3. The tax table (plot, tent, hut, cottage, townhouse, fine house, dr a month): none 0s; light 0, 1, 2, 3, 5, 6; fair 0, 2, 3, 5, 7, 9; heavy 0, 3, 4, 7, 10, 13; harsh 0, 4, 6, 9, 13, 17. At fair a phase 1 town of cottages roughly breaks even (`#food`: about −20 dr a month), and `#town` gains about 90 dr a month (taxes about 300 in, wages 220 out), not the 480 a month rent brought. Building costs are unchanged; the tax office is 150 dr and 3 workers.
- *The collector.* Reach 32 road steps (as planned), but 32 fresh road tiles a round, not 64, and he walks half as fast again as the other walkers (`COLLECTOR_SPEED`): with the planned slow, long round, one office called on hardly anyone within a month. He heads for the nearest home that owes, not the longest unpaid. "Taxed this month" is a rolling month (`taxedLately`: within the last 300 ticks), so a home pays at most once in any 30 days rather than once per calendar month.
- *Moods.* Harsh is −4 ("Taxes are harsh: hardly worth staying"), not −3, so that a household that is otherwise content is worried by it and can leave. The tax lines in the mood only count for homes a collector has called on within two months. Leaving at harsh: at each month's start, a household of three or more that a collector has called on within two months and whose mood is worried or worse sends its smallest group away, one household in three by a hash of the family and the month (`HARSH_LEAVE_ONE_IN`). Unpaid wages: −1 in the mood, a chatter line, and their workplace at half pace.
- *The reserve and owed wages.* `spendable(s, kind)` is what building can spend: everything for a tax office; otherwise the money less the reserve (150 dr while there is no tax office) and less any wages still owed, so nothing new is built while workers go unpaid. Wages are paid from `payable(s)` (all but the reserve). The tool tips say which held the money back.
- *Saves.* As planned; a save of `#town` is 205 KB (was 452 KB): the round records are packed as runs. Envelope 2; envelope 1 still reads. Version 6 states are migrated (`src/sim/migrate.ts`).
- *The money line* warns from the steady rate (what the homes paid the collectors over the last rolling month, coins still in satchels included, against the wage bill as staffed now), not from last month's ledger: taxes come in by the round, so one calendar month can hold one hand-in or three, and the ledger-based warning fired in `#shrine` and `#theatre` while their towns were in fact gaining. It needs a tax office that has stood a whole month. The ledger states the same figure.
- *The workers line* leaves out a workplace built since workers were last shared out (once a day), so a building placed a moment ago doesn't show as "0 of 3".
- *Demos.*
  - `#town`: tax offices on the core's north street (placed at tick 150), on the main street at the core's west end (300) and on the east street (when that street goes in). Taxes are heavy from tick 150 and fair again 600 ticks before it opens. Before the east street, the theatre and the hamlet, the builder waits (up to 2,400 ticks) until the treasury holds their price plus a month's wages; the theatre went from tick 3,600 to 3,900. It opens with 622 people (was 635) and 1,520 dr (was 6,080), every level and building and the bridge as before, and no home down a level in two years; homes are warned for 98 home-days in all in those two years (a corner of the core, two homes, waits about a month for the priestess once), so the test's bound went from 60 to 120.
  - Every earlier demo with workplaces gets the lane's tax office (24, 60) at the end of its setup, so its streets, houses and people at opening are as before (checked: populations and levels in `#water`, `#food`, `#warning`, `#fine` are unchanged); only its money differs (rent no longer piled up). The culture towns (`#shrine` … `#closed`) get that office and a second on the west street (22, 75) when the shrine goes in, since they would otherwise drain over the year that follows; from then on 6 people work at the offices.
  - `#workers` gets the lane's office too (its numbers at opening: 29 jobs unfilled, the office not counted until workers are next shared out).
  - `#taxes` keeps `#town`'s two other offices: the east street's office is cleared and the scene opens a month later over that street, so the street (and the hamlet over the river) that no collector reaches shows with posts. The tax office tool is picked and the tax overlay on. (The plan had no tax office at all; this shows the point of the overlay better, and a phase 1 town without one is what a migrated save shows.)
  - New: `#ledger`, `#collector`, `#taxes`, `#harsh`, `#dry` as planned.
- *Not built*: the satchel "swells" in two steps (a light and a full model, from 20 dr), not continuously.

**What Oliver sees, as built**
- The tax office: a stone counting house with its gable to the road and a bronze-green pediment and band, a porch of three columns over the clerk's table with a balance and a stack of coin, an iron-bound strongbox, a bronze-green banner on a pole by the road, a stone bench, jars and a cypress behind. The collector: a dark green tunic, a wide straw hat, a satchel on a strap (a second purse once it holds 20 dr), a wax tablet held out.
- The top bar: the drachmas are a button (the ledger), with a gold or rust arrow for last month's net and rust digits while wages are owed; a "Taxes · fair" chip opens the five rates (what a cottage and a fine house pay at each, and what households think of it).
- The ledger card (top right, one card at a time with the saves and controls): this month so far and last month; coming in (taxes by district with the homes that paid, building undone); going out (wages by kind of workplace with the workers, building by what was built); the net and what each month started with; notes on how many homes the collectors called on in the last month and where they missed (by district), the rate and what the homes paid over the last month, the wage and the wage bill, and any owed wages or the reserve.
- The tax overlay (J): roads in a collector's reach in bronze-green, brighter where one has walked this month; homes that paid in the last month tinted; a taller amber post over each lived-in home no collector has called on. Placing a tax office shows it, and the tip says how many homes its collector would reach and how many no collector has called on this month.
- "+180 dr" floats up from the office when a collector hands in.
- The household panel has a taxes line (what they paid and when, or why no collector has called); a phase 1 save opens with "Welcome back … Rent is gone: taxes come in with a tax collector now. Build a tax office (Z) by the houses."
- Keys: Z the tax office, J the tax overlay, $ the ledger.

**Checks**
- 139 tests in 13 files, all passing; typecheck clean; build; smoke (extended: the ledger, the rate chip, J, `#collector` follow and hover, the tax office tool and its tip, `#harsh`, `#dry`, a real phase 1 save opening with the note); every demo token opened in the browser with no page errors.
- Measured after (before in brackets): bundle 895 KB raw, 254 KB gzipped (861, 243); ready at 1.06–1.39 s, first frame at 1.31–1.62 s over three runs (1.51, 2.02); triangles and draw calls within 2% everywhere (`#town` 658 k, 99 calls from its opening view; 650 k, 103 before); update per frame paused / running `#food` 0.67 / 1.03 ms (0.49 / 0.88), `#fine` 0.60 / 1.34 (0.67 / 1.44), `#town` 0.82 / 1.66 (0.79 / 2.85); 55 geometries (52); a save of `#town` 205 KB (452).
- The district grid (about 25 ms) is worked out at load, not when the first collector calls: in `#food` that first call had been a 21 ms hitch.

## Review

*Reviewed after `37bbfbe`. Fix commits: `93b723a`, `b0197e0`, `881c1c1`, `6afb0ad`, then the docs.*

**Found and fixed**
- *Stuck with no tax office.* `reserve` kept 150 dr back while there was no office, but nothing stopped a town below 150 dr from clearing its only office (the money line even suggests moving the collector nearer the homes); then no income could ever arrive (undo aside). `priceOf(s, kind)` (treasury.ts) is now what building costs: a tax office costs `min(150, money)` while the city has none. `placePlots` and the tool use it. Later slices that add costs should go through `priceOf`, not `COST[kind]`. Test on `#dry`.
- *None, then up.* `serve` stamps `taxedAt` even at rate none (the mood's "No taxes to pay" and the overlay need the visit), and `owesTax` was `!taxedLately`, so homes visited at none were skipped for up to 30 days after the rate went up. `owesTax` now also holds for a home with `taxPaid === 0` that would pay at the current rate; `taxLine` says why. Test fails without the fix.
- *Tax overlay posts.* Rounds take about 40 days (measured in `#town`: rounds start every 26–48 days per office, median revisit of a home 39.5 days), so `taxedLately` (30 days) lapses before he comes back and homes on walked streets got posts. Posts now need no call in two months (the window `moodOf` and the chatter already use); a home called on 30–60 days ago is untinted and unposted. `TAXES_AFTER` went from 310 to 620 ticks so `#taxes` still shows the east street posted (10 homes there; tested).
- *Red jobs count in nine demos.* The lane's office was placed at the opening tick, before `shareWork`; `OFFICE_LEAD` (one day) places it at `ticks - 10`. Fingerprinted every demo before and after (tick, population, money, every home's level and people, walker count): identical. `#workers` keeps `officeAt: WORKERS_TICKS`. `townLines`' "built since the last share" filter stays (it still matters when the player builds).
- *Hand-in floater.* The satchel diff in `main.ts` sat inside the `s.rev` block, so a hand-in in a town that wasn't changing showed late; it runs every frame now (walkers loop only).
- *Money line at rate none* says so instead of "higher taxes would help".
- *The builder's scratch tests* (`tests/scratch/`, excluded by `.git/info/exclude`, not committed) broke `npm run typecheck` and were picked up by `vitest run` locally; moved out. They had already been copied to the shared folder by `sync-to-shared.sh` (which copies untracked files); harmless but stale there.

**Checked, no change**
- Ledger invariant (start + Σ lines = money; the only writer of `s.money` is `pay`), purity (no `Math.random`/`Date`/timers in `src/sim`, `src/map`), the rate through the queue, packed saves (205 KB) and v1 envelopes, the phase-1 v6 fixture, reserve and spendable, wages order, half pace. Typecheck, 141 tests, build, smoke and measure all pass; measure matches the builder's numbers (`#town` 658 k triangles / 99 calls, update 0.91 / 1.83 ms paused / running, 55 geometries, save 205 KB, ready 1.26 s).
- `#town`'s warned home-days (98 vs 12 before the slice): not routing (rounds.ts only gained `finish`). Breakdown: homes (83,31) and (83,34), fine houses at the core's east end, religion three times for 11 days each (months 27–28, 36, 44 of the town's life), plus (96,39), (98,39) on the east street (religion) and two cottages' water once. Moving the north office or nudging the history by a few ticks gives the same 98; only a history with less money (an office without a road) gave 12. The priestess's round is about 2.4 months for the whole town, so the far ends sit at the margin. The check-in now says this; the test's bound stays at 120 with a truthful comment.
- Every demo left running a year: none drains (lowest: `#theatre` 112 dr, then gaining) and none owes wages.
- Commit `66d0666`'s message says it holds visual fixes that are in `9fb00a9`; pushed history left alone.

**Left for later (next slices and slice 14)**
- *Harsh is all upside* (a year of `#town`: fair 965 people, +74 dr/month; heavy 965, +200; harsh 950, +320, 21 left). The spec allows no penalty beyond leaving; asked Oliver in the check-in. If he wants teeth: fewer settlers while taxes are harsh (`settlers.ts` interval), or whole households leaving.
- *The collector's round is longer than a month*, so "once a month" is really "about every forty days" and a calendar month's ledger holds one to three hand-ins. A shorter round (higher `COLLECTOR_SPEED` or a smaller `COLLECTOR_WALK`) would change `#town`'s history; worth settling in slice 14's money tuning.
- *Recovery from running dry is slow* (about six weeks in `#dry` after setting fair): coins only reach the treasury at the end of a round, and an unpaid tax office rests twice as long. Paying tax offices first in `settle` would be a small, in-spec change if Oliver finds it sluggish.
- The tax overlay's tint uses `taxedAt` even for visits at rate none (a home visited at none shows as "paid" for a month); harmless while the rate is none.
- `taxes.ts` calls `coastMap()` directly for districts instead of the sim's map (fine while the coast is the only map).
- A phase-1 save with workplaces and no tax office pays wages from what's above the reserve; one with under 150 dr would now still be able to build an office (`priceOf`).
