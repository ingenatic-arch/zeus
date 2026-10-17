# Side slice — The side panel

*17 Oct 2026. Asked for by Oliver while phase 3 ("Greece beyond the walls") was being built in another thread; not numbered, so phase 3 keeps slices 15 to 22. Built on its own branch and merged onto main.*

## Goal and check-in

Oliver's words: "a side panel that shows the city's resources and a minimap (which will be relevant for larger maps). City information should be in different tabs in the side panel, much like the original game. Clicking a resource should open information about the net gain, where it is being consumed, how much is being produced each month etc."

**Oliver can:** open `#goods` (the richer town with the panel open on wine), click through the goods to see each one's net, where it is made and used and what the ship takes, look at the year's chart, click a district or a store to fly there, turn the camera and watch the minimap turn with it, click the minimap to go somewhere, and look at the People, Services and Money tabs.

**Demo link:** `#goods`: `#richtown` with the side panel open on wine's page. On every other link the panel is open on a window 1,200 pixels wide or more, and the corner button shows or hides it (remembered between visits).

## Choices (mine, from the vision; Oliver can change any)

- **A column down the right**, as in the original, about 300 pixels wide. The city's view narrows to make room (nothing is hidden under the panel), and everything centred on the view (the top bar, the build bar, the town lines) centres on what is left. The corner buttons sit over the panel's head, and the cards they open lie over it.
- **A round minimap that turns with the camera**, so what is up on the screen is up on the plate. The camera turns freely, so a fixed map would often show the town upside down from how you see it. North is marked on the bronze rim. It shows land, sea and river, trees, roads and buildings in their colours, fires and the ship as marks, and the ground in view outlined. Click or drag to go there.
- **Four tabs: Goods, People, Services, Money.** Goods is the one asked for; the other three gather what the top bar's tips, the overlays and the ledger already say into one place, as the original's overseers did.
- **A stock book in the simulation.** "Where it is consumed" and "how much each month" need a record that nothing kept: what each ware was made (by which kind of workplace), used (by homes in which district, or by a workshop as its input), sold (to whom), bought (from whom: phase 3's imports) and lost (fire, collapse, clearing), this month, last month and a year of months in short. It is kept like the ledger, read only by the UI, and accounts for every measure: a test checks that each ware's stock moves by exactly the book's net over a month.
- **Generic for phase 3.** A new ware needs only a row in `WARE_INFO`; imports and exports by city show up from `note(s, ware, 'bought' | 'sold', city, n)` with nothing else to change.

## Not in this slice

A minimap that zooms for larger maps (it shows the whole 128-tile map today); keys for the panel (every letter is already taken); the trade panel's goods linking to their pages; per-household consumption.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- The sim stays pure and deterministic; the stock book changes nothing about how a town plays (every demo opens and plays exactly as before).
- Old saves load: state version 15 adds the stock book (phase 3 took 14 for Greece), starting empty in the month a save is loaded.

## Tasks

1. The stock book in the sim (`src/sim/stockbook.ts`), noted wherever a ware comes in or goes out; state version 15 and its migration; the save checks; tests.
2. The panel's reads (`src/sim/stocks.ts`): wares' names and groups, stock and where it is kept, a month's totals, the breakdown, makers and users.
3. The minimap (`src/ui/minimap.ts`), the panel and its tabs (`src/ui/sidepanel.ts`), the view making room for it (`style.css`, `main.ts`), `#goods`.
4. Look and tune by screenshots at 1600 × 900 and 1280 × 720; check the main-thread cost of the panel and the minimap.
5. Check-in, merge onto main with whatever phase 3 has merged, publish.
