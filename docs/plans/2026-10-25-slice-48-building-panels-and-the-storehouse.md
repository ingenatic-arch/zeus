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

*(Filled in at the end of the slice.)*
