# Slice 40 — An empire's city

*23 Oct 2026. Phase 5, "Ambitions, empire and a deeper city" (`docs/specs/2026-10-21-ambitions-empire-and-a-deeper-city-design.md`). The phase's last slice, built on the trunk (`claude/project-thread-d84eqt`, also `main`) after all four lines merged. It starts at `61e59ee` (state version 37).*

## Goal and check-in

The spec's words: `#empire`, the ambitions well under way, a vassal, a colony, a monument rising, estates, a thief loose, winter coming and a blockade threatened; numbers tuned across a few years of play; a look-and-feel pass over everything new; any leftovers not yet done.

This slice adds no new system. It puts everything the phase built into one town, plays it and the other rich towns forward for years to find the numbers that are plainly off, looks at every new demo at two window sizes, and closes the leftovers.

**Oliver can:** open `#empire` and play it for a few years, and judge whether the city and the empire feel like one game.

**Demo links** (bare hash tokens):

- `#empire`: `#ambition`'s town carried on about a year and a half. Laurels in all three ambitions; Corinth a vassal sending tribute; Nea Thasos, a colony, sending its share by ship; the Lighthouse rising on the headland with ox carts hauling marble and timber; an estate and a great estate below the villas; a new street of huts behind the town where thieves come from; late autumn, winter about a month off; Rhodes' fleet has put to sea to blockade the harbour, about three weeks out.
- `#empire-paused` and `#empire-plain`, as for every demo.
- Every earlier token keeps working.

## Not in this slice

New systems of any kind. The gods, *Beloved of the gods* and which god the shrine belongs to (the gods phase). Chariots, riots, courts. The phase summary (the orchestrator writes it after the review). A wage slider unless it proves small (see the leftovers below).

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- **State version** stays 37 unless saved state is added; if it is, version 38 with `fromSlice40` hooked at `if (st.version === 37)`, filling only this slice's fields.
- **Histories may move on purpose** (the tuning pass). Before and after each tuning change every demo is compared at opening (date, people, money) and 900 ticks on; laurel rewards are told apart from tuning by comparing with the ambitions off. After the tuning every demo is opened and checked against its own check-in; setups that broke are retuned. `tests/treasury.test.ts` passes and `#ambition`'s laurel years stay roughly 2 to 5.
- **Tune constants, not systems.** Every change is listed with before and after in the check-in. Oliver's phase 4 retune stands: the debt wait and seizure size stay, raids about twice as often, a lender's army only for a worthwhile remainder, money as is.
- `tests/loadorder.test.ts` passes and covers any new sim module.
- Sim code stays pure and deterministic (seeded random only, maths through `dmath.ts`); player actions are commands; money only through the treasury; the renderer and UI only read.
- Judge by screenshots at 1920 × 1080 and 1280 × 720; never claim it looks or feels right on Oliver's behalf.
- Budgets checked on `#empire` against slice 29's numbers, side by side with the starting commit.

## Before

At `61e59ee`, on a quiet machine (load under 4 on 4 cores).

| What | Before |
|---|---|
| Tests | 586 in 49 files, all passing (3 min 43 s) |
| Build | 54 s (the prepared towns baked in about 53 s) |
| Download, loads and frame work | the stock `measure.mjs` at `61e59ee`, side by side with this slice's build (in the check-in's Measurements) |

## Design decisions

**`#empire`** carries on `#ambition`'s town (Corinth a vassal by debt, Athens and Troy by sea, two laurels in each of Master of Greece and the great trading city and two in A city of wonders) and adds, played forward with a middling player's answers to Greece:
- the quarry on the headland and its road, so marble comes from home as well as from Athens;
- the first estate plot below the villas, a horse farm and a pasture with a fleece stall for it; once it is a great estate and full, the second plot;
- Nea Thasos founded (timber), so a colony's share ship comes into the bay;
- the Lighthouse on the headland with its spur and two masons' yards, with Troy's timber and Athens' marble bought by sea;
- a street of huts behind the town on the slope out of the agoras' reach (`#thieves`' street), so thieves come from where the town's poor live;
- crime switched on two months before it opens, so a thief is out as it opens;
- it opens late in autumn, about a month before winter, with Rhodes' fleet just put to sea against the harbour (a staged war: the town line says it is set up for the demo), so the blockade is telegraphed about three weeks ahead and winter may yet drive it home.

The estates and the monument share the town's marble: `estatesKeep` leaves each estate's share in every storehouse while the ox carts haul to the Lighthouse. Checked by numbers over a year and by eye.

**The findings carried over**, triaged: small and plainly wrong ones fixed, numbers tuned, the rest listed for Oliver.

| Finding | What I mean to do |
|---|---|
| The chip at the founding names the richest treasury | Prefer, within each ambition, its lowest milestone not yet won; then the nearest of those three |
| The open Ambition panel redraws twice a second | Redraw on a new day or a new laurel, and only when its contents change |
| `ui/empire.ts` has its own colour list | Use `prices.ts`' `SWATCH` |
| The stock book files a colony's share under "Bought from" | Its own line, "From your colonies" |
| The ledger's clearing estimate uses a 2 × 2 side for an estate | Use the building's own size |
| No hover for the share ship or a tribute ship | Add them as the other ships have |
| `#hostile`'s smoke step misses under load; the fire-save test's 30 s limit | Wait at normal speed; a longer limit |
| Town lines over click targets at 1280 × 720 (`#battle`) | Look; move or narrow the lines |
| The Colossus's wedge under its plinth | Look; a footing that follows the slope |
| Shares too rich in cheap goods | Tuning pass |
| `#repaid` and `#forgive` fall to about 620 people in year 2 | Tuning pass: find what runs out |
| `#horsemen`: newest estates short of food and fleece | Tuning pass |
| Bay fights' weight; `#triremes` 5 of 23 land; rewards small; riders one at a time; pasture carts on long roads; no boat for families rowed out; the share ship behind the town lines; the colony page's length; the slice 36 looks | Look; for Oliver's eye unless plainly broken |

## Leftovers checklist

From the spec's defaults (slices 30 to 39), checked on the trunk at `61e59ee`:

| Slice | Leftover | State |
|---|---|---|
| 30 | Early fire builds slower in a town's first year and warns sooner | Done already (slice 30: 70% pace, warns from half way) |
| 30 | Harsh taxes bite harder | Done already (slice 30) |
| 30 | Tax money comes in day by day | Done already (slice 30) |
| 30 | A "no road" sign on plots no road reaches | Done already (slice 30) |
| 31 | Troy's label under the lines at 1600 × 900 | Done already (slice 31: hangs below its city) |
| 31 | A caravan stops trading when its road closes | Done already (slice 31) |
| 31 | A refused band no longer camps for 70 days in `#threat` | Done already (slice 31) |
| 31 | An offer's yearly limit shared across a land and a sea route | Done already (slice 31) |
| 31 | Price arrows coloured for what the move means to you | Done already (slice 31) |
| 32 | Miners drawn at the copper mine | Done already (slice 32) |
| 32 | The caravan yard's blank wall on a slope | Done already (slice 32: a stone footing) |
| 33 | The camera no longer ends up inside trees | Done already (slice 33) |
| 38 | A band from the sea lands from the ship nearest its target | Done already (slice 38) |
| 38 | Collectors from across the sea within about a fortnight | Done already (slice 38) |
| 38 | The merchant ship's way in quicker | Done already (slice 38: twice as fast across the bay) |
| 34-37, 39 | (no Leftovers lines) | — |

From **Recorded for later** (phases 2 and 3), to check and do here where still open:

| Leftover | State |
|---|---|
| Sending goods takes about three months | To do (see As built) |
| A fickle ruler's mood crossing a line and back within a month | To do |
| `#rivals`' notes at 1280 × 720 | To look at and do |
| The drachma arrow and its floater disagreeing | To do |
| A wage slider (phase 2) | Weigh: in only if small |
| Which god the shrine belongs to (phase 2) | Left for the gods phase, as the brief says |

## Tests

- The existing suite, with `tests/treasury.test.ts` and `tests/loadorder.test.ts` passing.
- Tests for any leftover that changes the sim (the mood's line crossing, the sending time), where they earn their keep.
- `smoke.mjs` opens `#empire` and checks what it shows (the laurels, the vassal, the colony, the Lighthouse rising, the estates, the thief, the blockade's line, the season); `measure.mjs` adds `#empire` with its triangles, draw calls, walkers and the frame work at normal speed.
- The demo probe (every demo at opening and 900 ticks on, before and after, with and without the ambitions) and a version 27 save loading.

## Tasks

1. Plan (this file), with the baseline. Commit.
2. `#empire`: the setup, its view, the smoke block, the measure entry; check `estatesKeep` by eye. Commit.
3. Leftovers and the small findings. Commit.
4. Tuning pass: play `#empire`, `#ambition`, `#colonies` and others forward a few years headless; tune constants; probe every demo before and after. Commit.
5. Look-and-feel pass: every new demo from slices 30 to 39 at 1920 × 1080 and 1280 × 720; fix what reads badly. Commit.
6. Full checks (tests, build, the slow smoke, the measure, every demo opening, a version 27 save), As built, the check-in. Commit, push.

## As built

Commits: the plan `d068eb3`; `#empire` `f1e35a9`; the leftovers and small findings `f08c881`; the look-and-feel pass `bec2b1e`; the smoke test's stale steps and `#winter` `46f391f`; this write-up last. The state version stays 37: nothing new is saved.

**`#empire`** (`src/game/demos.ts` `empireCityTown`, view `empire` in `src/game/views.ts`) is as designed. It opens on 2 November 745 BC with 1,457 people and 2,845 dr: laurels 2 / 2 / 2, the chip on *Trade with half of Greece* (60%); a great estate (20 people) and an estate (6); the Lighthouse in its second stage at 44%, with ox carts on the spur; Nea Thasos (161 people) has sent two shares (195 dr); Corinth a vassal; three thieves out from the hut street; "Autumn · winter in 29 d"; Rhodes' three ships sailing, due about 24 days on. The smoke test checks all of that and, a month on, that both estates still stand at estate or better; the measure adds it.

**`estatesKeep`, checked.** Over four years of play (with a caretaker who rebuilds what burns, `scratch-40/fwd.sh`), the two estates kept 10 to 24 marble in hand while the ox carts hauled to the Lighthouse (the storehouses 350 to 540), and the Lighthouse was finished in June 744 BC. By eye: the opening shows carts on the spur and the estates' panels with marble lasting about three months.

**Findings triaged** (as the table above planned, with these differences):
- The stock book's new heads are "Sent to you" (a colony's share, tribute, gifts and what soldiers took) and "Sent away" (tribute and gifts you send), not a single "From your colonies": tribute and gifts were misfiled the same way.
- The ledger's estate line: an estate that burns or falls is paid under `estates`, and its clearing estimate uses `clearFee(4)` and the estate plot's price.
- Town lines over click targets: on windows up to 800 high the lines over the town keep to one row each (the whole line on hover), as they already did on the map; below 1500 wide they start under the laurel tab. `#battle`'s bridge end and `#rivals`' main street are clear at 1280 × 720.
- The tribute or share ship's hover reads the ship's own phase; it said "at anchor" while she still sailed in (the goods are `bay` from the horizon on).
- The Colossus's and the Lighthouse's skirt on a steep slope: looked at in `#monument` and `#empire` at both sizes. It reads as an earth knoll under the stone pad, steep on the downhill side. Not plainly broken; left for Oliver's eye rather than replaced.
- For Oliver, unchanged: bay fights' weight, `#triremes`' landings, rewards' size, riders charging one at a time, pasture carts on long roads, no boat for families rowed out, the colony page's length, the slice 36 looks, colony shares in cheap goods.

**Leftovers.** Sending goods: 112 days to 76 (`#request`'s 1,000 wheat to Sparta), 59 to 45 (`#promise`). A fickle mood: a ruler's mood that crosses one word and straight back within a month takes its first line back (`takeBack` in `diplomacy.ts`; a new test). `#rivals`' notes at 1280 × 720: the one-row lines above. The drachma arrow: hidden while the change floats beside it. A wage slider: not small (it needs saved state and its effect on labour), left. The shrine's god: the gods phase.

**Tuning pass.** Forward plays of four years (`#empire`, `#colonies`, `#ambition`, `#horsemen`) and two (`#repaid`), with a middling player's answers and, separately, with a caretaker rebuilding rubble:
- `#empire` with the caretaker holds about 1,400 people and grows from 2,845 to 12,351 dr (loans in and out); laurels 2/3/3 by the Lighthouse; the blockade held 24 November to 25 February and lifted; Nea Thasos grew 161 to 563 people, loyalty 69 to 51. Without one it falls to 451 people in three years: fires take the agora and the theatre in the headland and hut street, out of the watch's reach.
- `#colonies` 13.6k to 37.5k dr, its colonies 260 to 650 people each; `#ambition` 9.4k to 31k, laurels 2/1/2 to 2/2/2.
- `#horsemen`: the estates swing between great and estate as the headland quarry wears and falls (no inspector reaches it).
- `#repaid` with the caretaker holds 1,340 to 1,400; the fall to about 620 was fires never rebuilt, not food.
- No threat, raid or colony threat in four years of `#empire`, `#colonies` or `#ambition` (their rulers are warm), and one Spartan raid in `#horsemen`. At slice 31's measured rate (one threat a town every seven or eight years) that is within chance, so the rate stays; listed for Oliver.
- Money piles up late, as Oliver chose ("money as is"). Colony shares are generous but not plainly off.
- **The only constants changed** are the two sending speeds (the leftover): `SENDING_FETCH_SPEED` from `DOCKER_SPEED × 1.5` to `× 2.5`, and a gift caravan from `SENDING_SPEED` (twice a trader's) to a new `GIFT_CARAVAN_SPEED`, three times a trader's.

**The demo probe** (every demo at opening and 900 ticks on, `61e59ee` against this slice, with the ambitions on and off; the two runs differ the same way): 123 of 134 identical. Moved: `#greecegrows`, `#knossos` and `#memphis` (one town) open with 1,393 people and 49,664 dr (was 1,359 and 47,104) and keep 1,395 900 ticks on (was 1,335); `#games` opens with 9,976 dr (was 8,886); `#lit` 4,766 (was 4,376); `#repaid` and `#forgive` 14 and 6 dr less; `#rivals`, `#rivalsmap` and `#rivalstreet` 36 dr more 900 ticks on. All by the quicker sendings and the mood take-back in their histories; none opens on another day or with another story. I looked at the openings of those whose people or story could show it (`#greecegrows`, `#knossos`, `#memphis`, `#games`, `#lit`, `#rivals`) at both sizes; each still shows what its own check-in says. `#ambition`'s laurels fall in years 2 to 5.

**Look-and-feel pass.** Every demo from slices 30 to 39 and `#empire` at 1280 × 720 and 1920 × 1080 (`screenshots/s40/look`, `look2`), no page errors. Fixed: the lines over the laurel tab, the lines over the town at 1280 × 720, the quarry's paving (now marble chips and spoil), the ship hover. The share ship's hover was checked in the browser at 1920 × 1080 in `#colonies`.

**The smoke test's stale steps, and `#winter`.** The full slow smoke failed at six steps from earlier slices. Each fails the same way at `61e59ee` (run against its build), so the trunk's merges had moved what they look for; none is this slice's. Fixed in `scripts/smoke.mjs`: `#water` takes one to three carriers (the crews of walkers); `#shrine` hovers a townhouse in sight (the list's first is off the screen); `#black` waits for the call the ship is sighted for (she has called once before it opens); `#buywine` takes any sum for the wine (852, not 840); `#threat` takes the threat's year (747 BC now). `#winter` had lost its story: no call of the Tyrian ship was held back in the first winter, so it opened at the end of February with no late ship. `winterTown` now tries the next winter (at most two more) when that happens: it opens on 1 December 747 BC, raining, with 1,170 people and 6,561 dr and the ship "61 d · late" (was 26 February 747 BC, 931 people, 1,917 dr). The six steps pass against this slice's build.

**Checks.** 587 tests in 49 files pass (4 min 10 s), `tests/treasury.test.ts`, `tests/loadorder.test.ts` and the version 27 save among them; the build is clean. The full slow smoke ran once: every step passed but the six stale ones above, which pass after their fixes. All 136 demos open with no page errors. Measured side by side with `61e59ee` (`scratch-40/sbs.mjs`) and with the stock `measure.mjs`: the download 4,438 to 4,495 KB gzipped; demo loads median 2.3 s both, none over 3 s, `#empire` 2.2 s; `#empire` 1,899,657 triangles and 148 draw calls from its view (slice 29's `#fortress` 1,322,021 and 82), 139 walkers, frame work at normal speed 17 to 25 ms, about what a fight costs in the same run. The figures are in the check-in.
