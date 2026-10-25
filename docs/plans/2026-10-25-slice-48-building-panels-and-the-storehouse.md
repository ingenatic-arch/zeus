# Slice 48 — Building panels and the storehouse

*25 Oct 2026. Phase 6, "Crime, health and a polished city" (`docs/specs/2026-10-25-crime-health-and-a-polished-city-design.md`). The panels line's second slice (wave 2), built on `claude/p6-panels` in `/home/claude/zeus-panels`. It starts at `9eba183` (the trunk with slices 43, 41 and 44 merged, state version 40) and takes version 41 locally, renumbered at merge.*

## Goal and check-in

Oliver's ask: "Storehouse and building controls. Selecting a building should have relevant controls. Things like the storehouse showing what's stored, how much it will accept, what items it will accept etc. A bit like the original game." The spec's words: every building opens a panel when clicked (its name and a picture, its staff, what it is doing and why not, what it holds, its walkers with a button to follow, its condition, its controls); the storehouse and granary have a row for each good with what's in store and a setting (accept, don't accept, get, empty) and a limit (all, three quarters, half, a quarter), obeyed by carts, porters and dockers, and can be set to accept nothing in one click; any work or service building can be paused or given its workers first.

**Oliver can:** open `#storerules`, click the storehouse by the quay, set it to accept only wine and to empty its oil, and watch the carts obey; click any farm, press or fountain to read its panel.

**Demo links** (bare hash tokens):
- `#storerules`: `#richtown`'s town, where the storehouse by the quay holds oil as well as the winery's wine, over the quay. Nothing is set: every store accepts everything, as before.
- `#storeset`: the same town a few days after its quay storehouse was set to accept only wine and to empty its oil, its panel open: the oil going out by cart to the storehouse up the hill.
- `#workpanel`: `#richtown` with the olive press's panel open (its staff, its work, its jars and olives, its carts, its condition, its messages and its two orders).
- `-paused`, `-plain`, `-modern` as for every demo. Every earlier token keeps working.

## Not in this slice

The court's and prison's panels (slice 45 adds them to the registry at the merge). The overview (51). The shared kit of icons, steppers and toggles (50, which restyles these panels: the markup keeps to a few classes and the goods' icons live in one module). Pause and workers first on the buildings that keep their own panels (the barracks, shipyard, trading post, caravan yard and masons' yard): their panels are other lines' or slice 50's to rework. No new wares, walkers or buildings.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets; the spec's parallel plan binds (file ownership, append-only lists, blocks headed "Slice 48" in shared files).
- **State version 41** locally, with `fromSlice48` in `migrate.ts` hooked at `if (st.version === 40)`. It fills only this slice's fields, only if missing; a store's rules are padded to however many wares there are.
- **Default rules are today's behaviour.** Every store accepts everything, all of its room; nothing is paused or first. With nothing set, every earlier demo opens and plays exactly as at `9eba183` (checked with the demo probe, before and after).
- Sim code stays pure and deterministic (no random numbers at all here; the purity and load-order tests cover the new module); player actions are commands; the renderer and UI only read.
- `MAP_SIZE`: no new uses. A tile's x and z come from the building.
- Judge by screenshots at 1920 × 1080 (and 1280 × 720 for the panel); never claim it looks or feels right on Oliver's behalf.

## Before

At `9eba183`, on a loaded machine (four lines building on four cores; load 12 to 18).

| What | Before |
|---|---|
| Tests | 638 in 52 files (27 min on the loaded machine; two timed out under the load, money's harsh taxes and treasury's demo towns, and are run again alone) |
| Build | 7 min 26 s (`vite build`, every prepared town baked afresh) |
| Download, triangles, draw calls, `#empire` running, demo loads | the loosened `measure.mjs` at `9eba183`, side by side with this slice's build (in the check-in) |

## Design decisions

**Rules on the stores, orders on the workplaces (no new top-level field).** As the spec's technical design says: `rules` on store records, `paused` and `first` on buildings. Every building carries the three (the state's habit: every field on every building):
- `paused` and `first`: booleans, false.
- `rules`: a granary's or storehouse's rule for each ware, in ware order; empty for every other building. One number a ware: the mode in its low two bits (0 accept, 1 don't accept, 2 get, 3 empty) and the limit's cut in the next two (0 all of its room, 1 three quarters, 2 half, 3 a quarter). 0 is accept, all of it: today's store.

**Everyone obeys, through two doors** (`src/sim/stores.ts`):
- **Bringing:** `roomFor(g, w)`, which every carrier bringing to a store already asks, gives no room while the store doesn't accept the ware, is emptying it or is paused, and only up to its limit. So the makers' carts, the barracks' spare armour, the dockers carrying the quay's goods back, tribute, gifts and spoils all keep the rules with no change of their own. At the gate, a cart whose store has stopped taking its ware turns for another, as when its store is cleared.
- **Fetching:** `nearestBy` (food.ts) takes a rank: a store emptying the ware is chosen before any nearer one, and a paused store never. Every carrier fetching from the stores passes it: the agora's food and stall porters, the barracks' and armoury's porters, the estates' porters, the dockers fetching for sale and for gifts, slice 43's colony porters (`shipper`) and the monuments' ox carts. With no store emptying, the choice is exactly the old one.
- **Thieves and smugglers:** a thief caught with a store's goods brings them back to that store (its own goods, whatever its rule); smugglers take from the quay and the caravan yard, not the stores, so nothing changes for them.

**The stores' own carts** (`src/sim/storerules.ts`, `stepStores` after `stepCrime`):
- **Empty:** a staffed store holding a ware it is emptying sends an ox cart of it (up to a cart's load) to the nearest store that takes it, every 30 ticks, at most three carts out.
- **Get:** a staffed store with room below its limit for a ware it is getting has the nearest store that holds some (one emptying it first, never another getting it, never a paused one, one with somebody to load) send a cart of it over.
- **No loops:** goods only ever go from an emptying store to one accepting or getting, or from any store to one getting. A store emptying a ware takes none; a store getting a ware never sends it to another store. No ring can form (tested).
- A cart that can't deliver brings its load back to its store's room.

**Pause and workers first** (`labour.ts`):
- Paused: no workers at the share, so it works at nothing; its workers go to the next nearest jobs; its jobs aren't counted (nor short) on the top bar. A paused store takes and gives nothing (carts and porters go elsewhere).
- Workers first: filled, nearest homes first, before every other workplace, then the rest as always.
- The workers are shared out again the moment either order is given (not at the next morning), so the panel shows the effect at once.

**Commands** (appended): `{ type: 'store', id, ware?, mode?, limit?, all? }` (`all`: 'none' sets every ware not being emptied to don't accept, keeping its limit; 'all' back to accept everything) and `{ type: 'work', id, paused?, first? }`. Anything wrong is ignored.

**The building panel** (`src/ui/buildingpanel.ts`, `buildingpanel.css`), on the left where a home's panel opens, one of them at a time with the household, trading post, shipyard and Messages panels:
- **A registry**, a section per kind of building: its picture, what it holds, extra lines, and whether it has a panel of its own elsewhere (the barracks and shipyard the Army tab and the shipyard's panel, the trading post and caravan yard the trade panel, the masons and monuments the Monuments tab, homes the household panel), which its entry opens. A new building (the court, the prison) adds an entry of a few lines.
- **The panel** (top to bottom): a drawn picture, the name and where it stands; **staff** ("Workers 3 of 4 · short on the west bank", paused, workers first, wages owed); **what it is doing and why not** (the hover tip's lines, which already say why); **what it holds** (a bar and a number for each ware, with its room); **its walkers** (each kind out, with Follow); **its condition** (fire risk and wear as bars, smouldering, burning, creaking, smashed by vandals); **its recent messages** (the log by place, slice 44's `messagesAt`), each going to the Messages panel; **its controls**.
- **The store's rows** (the granary's three foods, the storehouse's eight goods): the ware's icon and name, a bar with the number in store against its room and a tick at its limit, four mode buttons (Accept, Don't, Get, Empty) and a limit stepper (All, ¾, ½, ¼); over the rows, "Accept nothing" and "Accept all". A line under each row says what its rule does now ("Empty: 2 carts taking it out").
- **Pause** and **Workers first** toggles for every work and service building (homes, rubble, walls and the monuments have none).
- The goods' icons live in one module (`src/ui/wareicons.ts`), shared with the household panel's, for slice 50 to restyle.

**In the city.** A paused building shows: its workers leave (jobfolk draws none), and a small plaque with the pause bars floats over it, like the smashed jar's. The stores' carts are the ordinary ox carts on the roads. Hovering a building says "Click for its panel".

**Clicking.** Every building without a panel of its own opens the building panel (main.ts' click handler: the old "follow a walker" for most buildings becomes the panel, whose walkers' row has Follow). Clicking a walker still follows her. The household, trade, shipyard, Army and Monuments panels open as now.

**Slice 44's findings, handled here:**
- **Runs in the scroll:** messages of the same kind, title and place within a few days of each other show as one row with "×4", opening to each day's words.
- **The Messages key by position:** the key left of 1 is matched by its place (`Backquote`, and `IntlBackslash`, which a Mac's ISO keyboard sends for the key left of 1) in `input.ts`; the scroll button's tip and the panel's head name it.
- **Waiting on you** drops a band already leaving with its loot; the smoke's `#looted` check follows.
- **Alarms by kind:** Greece's news gets an `alarm` field (raid, blockade, rebellion), set where those lines are told, and the scroll reads it before the words (older saves' lines still by their words).
- **The seal** counts only unread warnings and alarms; news stays bold in the panel and counted on its chips.

## Tests

- **Rules obeyed** (`tests/storerules.test.ts`): a storehouse that doesn't accept oil gets none and the press's carts go to the other; a limit of a quarter stops deliveries there; a store emptying oil sends its carts to the other and is fetched from first by the agora's porter; a store getting wine fills from the other; accept nothing in one click.
- **Never loops:** two stores getting the same ware, a getter and an emptier, played a year: no cart between two getters, every ware's total kept (nothing made or lost by the carts).
- **Pause and workers first:** a paused workplace has no workers after the order and its workers are elsewhere; a workplace given workers first is full while a nearer one is short.
- **Determinism:** the same commands with rules, pauses and firsts give the same town.
- **Saves:** a round-trip with rules and orders; a version 40 save (`SIM_STATE_VERSION - 1`) loads with every store accepting everything and nothing paused; the prepared towns baked at `9eba183` load through the migration; a version 37 save still loads.
- **Independence:** the demo probe: every prepared town at `9eba183` and here, opened and played 900 ticks, the same (date, people, money, walkers, buildings).
- **Alarms by kind:** a raid's coming in is heard as a raid alarm by its kind.
- `loadorder.test.ts` and `purity.test.ts` cover `storerules.ts`.
- `smoke.mjs`: `#storerules` (click the quay storehouse, set accept nothing, wine accept, oil empty, see an oil cart go out), `#storeset`, `#workpanel` (pause and back), a farm's and a fountain's panel by clicking. `measure.mjs`: `#storeset`.

## Tasks

1. Plan (this file), with the baseline. Commit.
2. The sim: rules and `roomFor`, the ranked `nearestBy` at every fetching carrier, `storerules.ts` (carts, commands), pause and workers first in `labour.ts`, state fields, migration, the save checks, the alarm kind; tests. Commit.
3. The UI: the registry and panel, the store's rows, the controls, the click wiring, the paused plaque, the goods' icons; slice 44's findings in the Messages panel, input and seal. Commit.
4. Demos (`#storerules`, `#storeset`, `#workpanel`) and look-and-tune at 1920 × 1080 and 1280 × 720; smoke and measure entries. Commit.
5. Full checks (tests, build, the slow smoke, the measure, the demo probe, a version 40 save), As built, the check-in. Commit, push.

## As built

Commits on `claude/p6-panels`: the plan (`c28b86d`), the sim (`8a78915`), the UI and demos (`0363a17`), the granary's line and the view (`728a9bb`), the checks and the check-in (this file's commit).

**As planned:**
- Rules on the stores and orders on the workplaces; everyone who brings goods keeps them through `roomFor`, everyone who fetches through the ranked `nearestBy` (`fromStores`): the makers' carts, the agora's food and stall porters, the barracks' and armoury's porters, the estates' porters, the dockers (fetching for sale and for gifts, and carrying back), slice 43's colony porters and the monuments' ox carts. Thieves bring stolen goods back to their own store; smugglers take from the quay, not the stores.
- The stores' own carts (`storerules.ts`, after `stepCrime`): Empty sends to the nearest store that takes the ware; Get has the nearest store holding some (an emptying one first, never one getting it, never a paused one) send a cart over, so only ox carts (sledges for marble) are on the roads. No loops, by construction and tested.
- Pause and workers first in `labour.ts`, the workers shared again at once.
- The building panel and its registry, the store's rows, the controls, the paused plaque, the goods' icons in `wareicons.ts`; slice 44's five findings.
- Demos `#storerules`, `#storeset`, `#workpanel`.

**Changed on the way:**
- **Orders are numbers, not booleans** (`paused` and `first` are 0 or 1), and **a store's rules are empty until it is given one** (and emptied again when every ware is back to accepting all). With booleans and a full row of rules on every store, `#town`'s save grew past its budget in `saves.test.ts` (190,287 characters against 190,000; 188,637 at `9eba183`); now it is 189,397.
- **Clicking a building no longer follows its walker:** it opens the panel, whose walkers' rows each have Follow (main.ts' `FOLLOWS` map went). Clicking a walker still follows her; the household, trade, shipyard, Army and Monuments panels open as before.
- **Where a building stands** is its district ("By the olive grove", "On the west bank"), from `map/districts.ts`, as the messages name places; the short-of-workers words are the staff line's own (why it is short), not a direction.
- **The same message again** is grouped by month, not only when next to each other: within a month, every message of one kind and title is one row, at its newest, with "×N" (a raid's fires interleave with its rubble, so neighbours alone missed most of them).
- **A store's rows come right after its staff**, above what it is doing (they are what it holds); its rooms' line is left out of the doing list, the rows show it.
- **`#storerules`' staging:** #richtown's quay storehouse never holds oil (the dockers sell it to the ship as it comes), so the demo has the town keep its oil from the ship and sets the quay's storehouse to get oil (up to half) from the one on the hill until it holds 700 or more (about two months), then puts it back to accepting everything. Played with the slice's own rules, as a player would.
- **The granary's "full" line** said "Its and undefined store is full" whenever two of its foods were full (it passed names where foods were wanted; there at `9eba183` too). Fixed, as it shows in the panel.

**Touched outside the line** (each small, in a block or line marked Slice 48):
- `src/sim/goods.ts`, `army.ts`, `estates.ts`, `trade.ts`, `colonyworks.ts`, `monumentworks.ts`: the fetching carriers pass the stores' rank to `nearestBy` (one argument each); `trade.ts`' dockers ask `takes` when carrying back.
- `src/sim/diplomacy.ts` (`news` takes an alarm kind), `raids.ts` (its five alarm lines), `blockades.ts`, `vassals.ts`, `colonies.ts` (one each): Greece's alarms carry their kind.
- `src/sim/status.ts`: the staff line says paused or workers first; the granary's full line (above).
- `src/game/saves.ts` (the orders' and rules' check), `src/game/input.ts` (the key left of 1 by its place), `src/game/views.ts` (two views), `src/ui/household.ts` (its goods' icons from `wareicons.ts`, the same drawings), `src/ui/topbar.ts` (the seal's tip), `src/sim/state.ts`, `sim.ts`, `commands.ts`, `migrate.ts`, `src/main.ts`, `src/game/demos.ts`, `scripts/smoke.mjs`, `scripts/measure.mjs`.
- `scripts/smoke.mjs`: `#messages`' seal check counts warnings and alarms; `#looted`'s check now wants the band making off **not** under Waiting on you.
- Added by the review (they were left off this list): `src/sim/food.ts` (`nearestBy`'s rank, `fits` asking `takes`, a store's cart bringing its load back into its room) and `src/sim/labour.ts` (pause and workers first in the day's share and the workforce count).
- From the review: `src/ui/sidepanel.ts` (a building tab's "Their workers" row counts a paused workplace as paused, not short) and `src/sim/status.ts` (the storehouse's title and rooms line say "40 horses", not "40 horses of horses").

**`MAP_SIZE`:** no new uses.

**Checks** (on the same loaded machine, load 20 to 40 on 4 cores, the other lines building beside it):
- **Tests:** 651 in 53 files (638 in 52 before; `storerules.test.ts` is new). In the full run (36 min) twelve tests in eight files ran out of their time under the load (eleven timeouts, and `culture.test.ts`' per-call time budget at 2.5 ms against 2); the eight files run again on their own pass, all 107 tests.
- **Build:** clean, 12 min 34 s (7 min 26 s at the start, on a lighter load).
- **Demo probe:** all 139 prepared towns baked at `9eba183`, opened in the starting code and in this slice's and played 900 ticks on: the whole state the same in both (but this slice's new fields), at the open and after. The towns this build bakes afresh are the same as the starting build's (checked on `#seized` field by field).
- **Old saves:** the 139 version 40 towns load through `fromSlice48`; `saves.test.ts`' version 40 and version 37 saves load.
- **Smoke** (a copy with its waits loosened five times, 105 min, start to end): every slice 48 check passes. Five fail, each the same at the start: a trireme's and a blockading ship's hover and the quarry tool's refusal (as slice 44 found), and `#seized`' line and chip, which look for 1,474 dr left and 746 seized while the town, baked the same at `9eba183`, has 1,470 and 750.
- **Measure** (loosened, both builds, side by side): every view both runs reached has the same triangles and draw calls (114 of them, `#empire`'s 2.08 million and 156 among them). Download 4,866 KB gzipped (4,777 before): the game 872 KB (862), the prepared towns 3,994 KB (3,916; two new towns). `#empire` running read 86 ms a frame against 46, but the machine was far busier during the second run; the sim alone, timed on `#empire` both ways in turn, is the same (2 to 6 ms a tick either way). The demo-load sweep at the end ran out of the two hours on the starting build, so it isn't compared.

**Review** (a fresh reviewer, on the same loaded machine): the check-in's five steps followed in headless Chromium at 1920 × 1080 (and `-modern`, `-plain`), with screenshots looked at; nasty settings played on in a scratch test (both storehouses getting oil, both emptying it, the only granary emptying its wheat, a getter paused while an emptier's carts were on the way to it, wrong commands): no cart between two getters, nothing lost (the turned-away carts brought their wine home), nothing broken. Fixed: a store's row said "its next cart goes out soon" or "the next cart comes soon" when nobody worked there to load one, and "Accepts it up to a quarter" when it already held more than that; Get's "no other store has any to send" counted paused and unstaffed stores; Pause's tip said a paused workplace "sends out nothing" while a maker's carts still take out what it has made; a building tab's "Their workers" counted a paused workplace as short; the storehouse said "40 horses of horses". Checks after: typecheck clean; the full run, 651 tests in 53 files, all passing (14 min, timeouts loosened); the build; the smoke's slice 48 block with `#messages`, `#raid`, `#looted`, `#quay` and `#colonywants`/`#colonyworks` (a loosened copy): all pass; download 4,866 KB gzipped, as built.

