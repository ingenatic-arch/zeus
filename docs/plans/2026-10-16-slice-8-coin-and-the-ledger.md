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

