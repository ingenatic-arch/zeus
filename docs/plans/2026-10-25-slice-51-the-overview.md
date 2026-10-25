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

*(To be filled in when the slice is built.)*
