# Slice 51 — The overview

*25 Oct 2026. Phase 6, "Crime, health and a polished city" (`docs/specs/2026-10-25-crime-health-and-a-polished-city-design.md`). The panels line's third slice (wave 3), built on `claude/p6-panels` in `/home/claude/zeus-panels`. It starts at `97947e6` (the trunk with slices 43, 41, 44, 42 and 48 merged, state version 42) and takes version 43 locally, renumbered at merge.*

## Goal and check-in

Oliver's ask: "An overview menu to see all resources, crime rates, health, distribution, treasury etc." The spec's words: one window for the whole city, from a top-bar button or the O key, with a page for each of the original's advisers: City (people by level, homes, mood, work and wages), Goods (each ware with what's in store, made and used last month, bought and sold, months of supply, and the trend with its reasons), Treasury (the ledger for last month and the year, debts, loans and tribute), Distribution (for each service and good, the share of homes it reaches and where the gaps are; clicking one shows its overlay), Crime (the rate by kind and by quarter, how many were caught, punished and imprisoned), Health (the sick, physician coverage and the plague risk), Army and fleet, Empire (vassals and colonies). The town keeps annals, a figure for each month, and each page has small charts of the last two years.

**Oliver can:** open `#town` or `#empire`, press O and read the whole city, then click a gap in Distribution to see it on the map.

**Demo links** (bare hash tokens):
- `#overview`: `#town` (28 months in) with the overview open on its City page: O already pressed.
- `#overviewgaps`: the same town on the Distribution page, where its gaps are (click one to fly there with its overlay on).
- `#overviewcrime`: `#gang`'s town (44 months in, a gang's den behind the core) on the Crime page.
- `#overviewempire`: `#empire`'s city (over five years in: a vassal, a colony, the Lighthouse rising) on the Empire page.
- `#town`, `#empire` and every earlier token open as before; O opens the overview on any of them. `-paused`, `-plain`, `-modern` as for every demo.

## Not in this slice

The court's figures (punished, imprisoned, executed: slice 45, on the order line, wired at the merge into a marked place on the Crime page). The sick, the physicians and the plague (slice 49, wired at the merge into a marked place on the Health page and the annals' `sick`). The panels' new look and shared kit (slice 50 restyles the overview with every other panel; it keeps the original skin's colours and a few classes). No new wares, walkers, buildings or commands: the overview only reads.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets; the spec's parallel plan binds (file ownership, append-only lists, blocks headed "Slice 51" in shared files).
- **State version 43** locally, with `fromSlice51` in `migrate.ts` hooked at `if (st.version === 42)`. It fills only the annals, only if missing: an empty record starting at the save's tick.
- **The annals never change play.** They are written from what the town already counts (the ledger, the stock book, crime's tallies, the homes) and nothing reads them but the overview. Every earlier demo opens and plays exactly as at `97947e6` (checked with the demo probe, before and after).
- Sim code stays pure and deterministic (no random numbers at all here; the purity and load-order tests cover the new module); the UI only reads.
- `MAP_SIZE`: no new uses. A district's place comes from `map.data.districts` and the map's own size.
- Judge by screenshots at 1920 × 1080 (and 1280 × 720); never claim it looks or feels right on Oliver's behalf.

## Before

At `97947e6`, on a loaded machine (four lines building on four cores; load 20 to 24), in a clean copy of the starting tree.

| What | Before |
|---|---|
| Tests | 668 in 54 files, all passing (16 min 26 s) |
| Build | 4 min 34 s (`vite build`, 111 distinct prepared towns baked afresh in 261 s) |
| Download, triangles, draw calls, `#empire` running, demo loads | the loosened `measure.mjs` at `97947e6`, side by side with this slice's build (in the check-in) |

## Design decisions

**The annals** (`src/sim/annals.ts`, one top-level field `annals`, `stepAnnals` last in the step, after the messages):
- On the first tick of each month the month just ended is written as one record of plain numbers: people, homes, homes content or getting by, who came and who left (the running counts), jobs and filled, the treasury, what came in and went out (the ledger's month, whose total is checked against the treasury), each ware in store (in ware order), each service's reach (the share of homes needing it that have it, in need order), crimes and caught (crime's monthly tallies), the sick (0 until slice 49), homes well kept, soldiers, triremes, vassals and colonists.
- The last **24** months are kept. The year so far and last year are kept by kind too (money in and out by group, crime by kind) so the Treasury and Crime pages can say "this year" and "last year" beyond what one month's ledger holds; a new year starts in January.
- `fromSlice51` starts an empty record at the save's tick (its charts say where the annals begin); the save's checks mend a damaged record to an empty one (only the history is lost) and pad a month's stock to however many wares there are.
- About 3.3 KB in a save (`#town` 192,911 characters against 189,582); `saves.test.ts`' budget for `#town` rises to 194,000.

**The window** (`src/ui/overview.ts`, `overview.css`): opened by a columns button on the top bar (beside the scroll) or O, matched by the key's place (`KeyO`) in `input.ts`, so it is the same key on any layout. O was the water overlay; that moves to Shift+O (the help card and the top bar's overlay buttons say so). Esc closes it. It sits over the city between the build bar and the side panel, its tabs across the top, each naming its page and a word on where it stands (a mark when a page wants looking at). It remembers the page last opened.
- **City:** tiles for people, homes, mood and work, each with its two years; people by their homes' level; how the homes feel (a bar of the five moods) with what weighs on most homes and what lifts them, each reason a link to one such home; what holds homes back from the next level, each a link to its overlay; work and wages (jobs, filled, could work, wages, wages owed) with the places short of workers, each a link.
- **Goods:** a row for each ware the city has: in store, made, used, bought, sold (last month's, from the stock book), how long it lasts at that rate, which way it is going and the first reason; a ware's row opens its two years of stock, all its reasons, and where it is kept (each a link to that building's panel), with a link to its page on the side panel.
- **Treasury:** tiles for the treasury, last month, this year and debts; the ledger by kind for this month, last month, this year and last year, the taxes' line naming the rate and the collectors' reach; loans, tribute from vassals and colonies, and tribute asked of the city, each a link to that city's page.
- **Distribution:** a row for each service (water, food, blessings, oil, plays, fleece, wine) and the tax collectors: the homes that need it and have it, a bar, the homes it would lift a level, why, and up to three gaps by quarter. Clicking the service shows its overlay; clicking a gap flies there with that overlay on. Two years of its reach.
- **Crime:** tiles for crimes last month (a rate a thousand people), caught, criminals out now and gangs; crime by kind this month, last month, this year and last year; the court's line (a marked place for slice 45's figures; without a court, the fines); crimes and catches by quarter over the last year (from the scroll's crime news, which now carries its kind), with the homes tempted now and the gangs, each quarter a link with the crime overlay on.
- **Health:** what the city has today: homes well kept (water and food), clean water, crowded homes, the wounded; where homes go without water or food, each a link; and a marked place for slice 49's sick, physicians and plague.
- **Army and fleet:** soldiers ready, triremes, threats, expeditions; each company (a link to its banner), each trireme, each raid, blockade, pirate lane and expedition (links to the city).
- **Empire:** vassals (loyalty and what holds it back, tribute), allies, colonies (people, stage, loyalty, wants and threats, share), each a link to its page on the map of Greece.
- Every figure says why it stands where it does (a line under it, or the row's tip), and every chart point names its month and value when hovered.
- **Clicks go to the place:** the camera flies there and the window steps aside (closes) so the place is seen; Esc or O brings it back on the same page.

**Slice 48's findings, handled here where they fit:**
- A click on a building's footprint opens its panel even with a walker within 22 px (a walker is followed only when the click is off every building, or right on her).
- "Accept nothing" is disabled when every ware left accepting is set to Empty.
- Pinning a "×N" message pins every one of its days.
- A paused press's (any paused maker's) doing line names the pause.
- The agora's "What it holds" gets its room bars.
- Left for slice 50: the storehouse's rows at 1080 (its restyle), Empty's tiny loads and the paused maker's carts (they read right).

## Tests

- **The annals** (`tests/annals.test.ts`): `#town` keeps 24 months, each written as the month ends, with every ware and service; each month's money is the month before's plus what came in, less what went out (`#richtown`), and the ledger's start is the last month's money; the year's money by kind is its months'; keeping them never changes how the town plays (`#empire` played on with fresh annals and without: the same town); a new town writes its first month as the second begins; a save round trip; a damaged record mends to empty; `SIM_STATE_VERSION - 1` migrates to an empty record that writes its first month; a version 37 save loads and writes its first month.
- **Independence:** the demo probe: every prepared town at `97947e6` and here, opened and played 900 ticks, the same (but the annals).
- `loadorder.test.ts` and `purity.test.ts` cover `annals.ts`.
- `smoke.mjs`: `#overview` (every page opens and names its figures), `#overviewgaps` (click a gap: the camera moves and the overlay is on), `#overviewcrime`, `#overviewempire`, O and Shift+O on `#town`. `measure.mjs`: `#overview` loaded, and its window's update time.

## Tasks

1. Plan (this file), with the baseline. Commit.
2. The sim: `annals.ts`, the state field, the step, the migration, the save's mending, the crime news' kind; tests. Commit.
3. The UI: the window and its pages, the top-bar button, O by its place, Esc, the help card; slice 48's findings. Commit.
4. Demos (`#overview`, `#overviewgaps`, `#overviewcrime`, `#overviewempire`) and look-and-tune at 1920 × 1080 and 1280 × 720; smoke and measure entries. Commit.
5. Full checks (tests, build, the slow smoke, the measure, the demo probe, a version 42 save and a version 37 save), As built, the check-in. Commit, push.

## As built

Commits on `claude/p6-panels`: the plan (`a950b18`), the annals (`12d14bf`), the window, its pages, demos and slice 48's findings (`01ba3cf`), the homes tile's words (`c3e6dfb`), the window's refresh after a click (`1a91bcf`), the checks and the check-in (this file's commit).

**As planned:**
- The annals (`src/sim/annals.ts`): a record of plain numbers for each of the last 24 months, written on the first tick of the next month, last in the step; the year so far and last year by kind (money in and out by group, crime by kind). Nothing reads them but the overview. State version 43 with `fromSlice51` (an empty record from the save's tick); the save's checks mend a damaged record (only the history goes) and pad a month's stock to every ware.
- The overview (`src/ui/overview.ts`, `overview.css`): one window over the city, opened by a button beside the scroll on the top bar or O by its place (`KeyO`), Esc closing it; eight pages, each tab naming its page and a word on where it stands, marked amber or red when it wants looking at; two years of small charts on every page, each point naming its month and value; every figure with its reasons; links that fly the camera to the place with the overlay that shows it, or open the household's or building's panel, the ware's page, the ledger, a city's or site's page on the map of Greece, or a company's banner, the window stepping aside.
- The marked places: `courtFigures` (Crime, for slice 45) and `healthFigures` with the annals' `sickNow` (Health, for slice 49), each returning nothing until the integrator wires them.
- Demos `#overview`, `#overviewgaps`, `#overviewcrime`, `#overviewempire` (each the same town as `#town`, `#gang` or `#empire`, checked state for state).
- Slice 48's findings, as planned: the click on a building's footprint (a walker followed within 9 px there, 22 px elsewhere, as for the monuments); Accept nothing disabled when only emptying wares are left; a run's pin pinning every one of its days; the pause named in the doing lines (the press and winery, the grove and vineyard, the mine, the quarry and the masons' yard); the agora's room bars.

**Changed on the way:**
- **O is the overview; Shift+O is the water overlay.** Every letter was taken. The help card and the overlay list show Shift O; the smoke and measure scripts press Shift+O for the water overlay.
- **The crime news carries its kind.** To count crimes by quarter, a message gets an optional `of` (the crime's kind: theft, picked, caught, gathering...), set where heard.ts tells the crime news. Its words are unchanged; older messages without it are skipped by the quarter count.
- **A ware's outlook is its rate over the year**, from the stock book (last month's alone while the book has fewer than three months). Olives come in lumps every few months, so last month alone called them running out between pickings; a ware nothing has moved for three months is "steady". The table's columns stay last month's.
- **Well kept** counts homes with a fountain's water and food on the table; homes whose level doesn't need a fountain yet but fetch water from the river are named on the Health page (they are the gap between "well kept" and "clean water").
- **The window kept refreshing only until a click.** A tab or link refreshed it at once with the clock at Infinity, which then held it still until it was closed (found by the measure's running cost reading 0). The forced refresh now counts as made at the loop's last time; checked in the page: after a tab click at the fastest speed the page changes, where before the fix it didn't. The measure waits 45 s for the running cost, since the loop's clock moves at most 0.1 s a frame and headless draws about one frame in two seconds.
- **The save's budget:** `#town`'s save grows by about 3.3 KB (192,911 characters, 189,582 without the annals), so `saves.test.ts`' budget rises from 190,000 to 194,000.

**Touched outside the line** (each small, in a block or line marked Slice 51):
- `src/sim/state.ts`, `sim.ts`, `migrate.ts` (the field, the step, the migration); `src/game/saves.ts` (`mendAnnals`); `tests/saves.test.ts` (the budget).
- `src/sim/heard.ts`, `messages.ts` (the crime news' kind: these are the line's own).
- `src/sim/status.ts`, `armystatus.ts`, `materialstatus.ts`, `monumentstatus.ts`: a paused building's doing line names the pause (one line each).
- `src/main.ts` (the overview's wiring, Esc, O, the probe, and the click preferring the building on its footprint), `src/game/input.ts` (O by its place), `src/game/demos.ts` (the field and four demos), `src/ui/help.ts` (O and Shift O), `src/ui/buildbar.ts` (the water overlay's key, Shift O), `src/ui/topbar.ts` (the button), `src/ui/buildingpanel.ts` and `src/ui/messages.ts` (slice 48's findings: these are the line's own).
- `scripts/smoke.mjs` (the slice's block; the water overlay by Shift+O), `scripts/measure.mjs` (two demo loads and the overview's cost; the water overlay by Shift+O).

**`MAP_SIZE`:** no new uses.

**Checks:**
- Typecheck clean. Tests: 677 in 55 files (668 in 54 before; 9 new in `tests/annals.test.ts`, which also loads a version 37 save and a version 42 one). In the full run (21 min, beside the other lines' builds) the treasury's "no demo leaves wages unpaid" ran out of its 1,200,000 ms; alone, `tests/treasury.test.ts` passes 17 of 17.
- Build (`vite build`): 4 min 6 s (4 min 34 s before). Download 5,008 KB gzipped (4,888 before): the game 895 KB (876), the prepared towns 4,114 KB (4,011; each now carries its annals). `#town`'s save 192,911 characters (budget 194,000).
- The demo probe: all 145 prepared towns from `97947e6` loaded in this code and played 900 ticks, the same as in the old code apart from the crime news' `of`. The towns baked by both builds, 149 of 149 (the four new demos' included), are the same state for state without the annals and `of`.
- Smoke: the full loosened copy, start to end on this slice's build before `1a91bcf` (79 min): every step passes, the slice's block and every earlier one. The fix after it was checked in the page on its own (above).
- Measure (loosened copy, side by side with `97947e6`): triangles and draw calls the same in all 153 views both reached (`#creditors`' demo view differed by one frame's timing and settles on the same 1,359,454 and 92 on both, checked again); `#empire` running 63 ms a frame of update against 65; the median demo's update 13.0 against 14.1 ms. Both full runs ran out of their two hours in the demo-load sweep, so a set of 12 demo loads ran on each build twice, in turn: medians 4.2 and 4.7 s before, 4.9 and 3.4 s after, the second-run build slower each time. The overview's cost, on the fixed build: each page of `#overviewempire` built afresh in 6 to 26 ms headless; left open on Goods while running, 3.6 ms a second against 46 ms for the whole update. The new views: `#overview` 1,487,950 triangles in 102 draws, `#overviewempire` 2,081,015 in 156.
