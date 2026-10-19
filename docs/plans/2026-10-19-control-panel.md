# Side slice — The control panel

*19 Oct 2026. Asked for by Oliver while phase 4 ("A city worth defending") is being built in another thread: "I want to do a bit of a UI overhaul to make the menu system more in keeping with the original game. I.e., the side panel houses all of the build menus etc." and "Can we also improve the UI textures and visuals?" Not numbered, so phase 4 keeps slices 23 to 29. Built on its own branch, merging main as phase 4 lands, then merged onto main. Builds on the side panel side slice (`docs/plans/2026-10-17-side-panel.md`).*

## Goal and check-in

In the original, the right-hand control panel was the whole game's menu: a tab for each kind of building, each tab holding the buttons to build that kind and the state of that part of the city. This slice makes our side panel work the same way and gives the whole interface a look of its own. The bottom build bar goes, so the city gets that strip of screen back.

**Oliver can:** open `#panel` (the richer town with the Farms tab open), go through the nine tabs, pick a building from its picture and place it, see beside the buttons what that kind of building is doing for the city (stocks, coverage, money, the army), turn an overlay on from the tab it belongs to, and use every key as before. Every other demo link opens with the tab of the tool it puts in hand.

**Demo link:** `#panel`: `#richtown` with the Farms tab open. Every earlier token keeps working.

## Choices

Picked by Oliver (19 Oct):

- **Tabs by kind of building, as in the original** (not one Build tab beside today's tabs).
- *When to build:* now, alongside phase 4, on its own branch. *(recommended; awaiting Oliver)*
- *The look:* marble and bronze. *(recommended; awaiting Oliver; mock in `/mnt/project-files/zeus-ui/panel-looks-mock.png`)*

Mine, from the vision (Oliver can change any):

- **Nine tabs, named as in the original where it fits.** Each holds its buildings and, below them, what today's Goods, People, Services, Money and Army tabs say about that part of the city:

  | Tab (heading) | Buildings | Below them |
  |---|---|---|
  | People (Population) | housing | today's People tab: homes by level, work, homes in trouble, newcomers |
  | Farms (Husbandry) | wheat farm, hunting lodge, dairy, olive grove, sheep pasture, vineyard | the wares they make (wheat, meat, cheese, olives, fleece, grapes), each opening its ware page; farms staffed; food and food variety overlays |
  | Industry | olive press, winery, copper mine, armoury | oil, wine, copper, armour, each opening its ware page; workshops staffed and waiting on inputs; oil and wine overlays |
  | Stores (Distribution) | granary, storehouse, agora, oil, fleece and wine stalls, trading post, caravan yard | every ware, as today's Goods tab, with its pages; where it is kept; the ship and the caravans; fleece overlay |
  | Safety (Hygiene and safety) | fountain, watch post, architect's office | water, fire risk and wear across the town (today's Services rows); water, fire and wear overlays |
  | Admin (Administration) | tax office | today's Money tab: treasury, this month and last, the tax rate, the ledger (and phase 4's loans when they land); tax overlay |
  | Culture | theatre | homes with plays, of those that want them; culture overlay |
  | Gods (Mythology) | shrine | homes blessed, of those that want it; religion overlay |
  | Military | barracks (and phase 4's walls, towers and shipyard as they land) | today's Army tab |

  The original's Aesthetics tab waits until there is something to put in it.
- **Building buttons are pictures of the building**, rendered from the game's own models into small images (an offscreen renderer, once per kind, the first time a tab opens), with the name and cost under each. A button you can't use says why, greyed: too dear, or "only one" for the trading post and caravan yard. Hovering shows today's hint. Kinds that share a key today sit side by side in their tab, in the key's order, so pressing a key again still steps through them.
- **A tool row above the minimap:** road, clear, undo and an overlays button that lists every overlay; each tab also offers its own overlays as links under its numbers. The hint line for the tool in hand moves to the foot of the view, where the build bar was.
- **The panel is always there**, since building lives in it. The corner button that hid it goes. On a window under 1,280 pixels it narrows rather than hiding. While the map of Greece is open it steps aside as it does now.
- **Keys don't change.** A key picks its tool as now, and also opens that tool's tab and lights its button.
- **The look (if marble and bronze):** veined marble for the panel and the bars, bronze for frames, buttons and the minimap's rim, a lapis band with a gold key pattern between the panel's parts, lapis for the open tab; anything you read (numbers, pages, the ledger, tips) on light parchment so it scans. The top bar, the cards (ledger, saves, controls, house pages, the tax rates), the chips and the tips take the same look. All of it is made in code (noise filters into small images at load); the font stays the system serif with small caps for headings, since a web font would be an outside asset.

## Not in this slice

The look of the city itself (terrain, buildings, walkers). New buildings. Keys changing. A minimap that zooms. The original's Aesthetics tab. Any change to the simulation.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- **UI only:** nothing under `src/sim/` or `src/map/` changes, so no state version change, saves load as they are, and every demo plays exactly as before.
- **Phase 4 keeps going.** The tabs and their buildings are one table (`src/ui/categories.ts`): a building phase 4 adds is one row there. Merge main into the branch before each push; whatever phase 4 has added to the build bar or the side panel's tabs by then moves into the new tabs in that merge. When this lands on main, the phase 4 thread is told where new buildings and panel sections now go.
- First load stays under 3 seconds: the textures and building pictures are made lazily and their cost measured.
- Judge by screenshots at 1920 × 1080, 1600 × 900 and 1280 × 720, tune by eye, never claim it looks or feels right on Oliver's behalf.

## Tasks

1. The table of tabs and their buildings (`src/ui/categories.ts`), from today's build bar groups and phase 4's additions.
2. Building pictures: an offscreen renderer that draws each kind's model at a fixed angle into a small image, cached; measure its cost.
3. The panel's new shape (`src/ui/sidepanel.ts`): the tool row, the minimap, the tab strip, each tab's buttons and its part of today's tabs; the overlays menu; the hint line at the foot of the view; keys opening their tab. Remove the build bar (`src/ui/buildbar.ts`) and the corner's hide button; keep `pointerTip`.
4. The look (`src/ui/style.css`, a small `src/ui/textures.ts`): marble, bronze, the lapis key band and parchment for reading, across the panel, the top bar, the cards, the chips and the tips.
5. `#panel`; demos with a tool open on its tab; the smoke test's build bar checks moved to the panel's buttons.
6. Look and tune by screenshots; check first load and the main-thread cost of the panel.
7. Check-in, merge onto main with whatever phase 4 has merged, publish to the playable build.
