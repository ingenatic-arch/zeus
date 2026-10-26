# Slice 50 — A new look for the panels

*26 Oct 2026. Phase 6, "Crime, health and a polished city" (`docs/specs/2026-10-25-crime-health-and-a-polished-city-design.md`). The land line's third slice (wave 3), built on `claude/p6-land` in `/home/claude/zeus-land`. It starts at `f83499b` (the trunk with slices 43, 41, 44, 42, 48, 45, 47 and 46 merged, state version 45).*

## Goal and check-in

Oliver's words, with two screenshots (the Army tab and the trading post's panel): "Better sub menus. Things like the military tab for example are basic text and basic buttons. Icons, more fitting textures and polish would be great. Same goes for the side menu for things like the trading post." The spec's: a shared kit for every panel and sub-menu, in the original look's colours and textures (parchment and marble from the skin, carved headers, drawn icons for every good, unit, building and action, proper steppers, toggles and sliders, bars for stock and strength); the Army tab with each company a card with a drawn figure, its men as pips, order buttons with icons, "16 of 32 ready: 16 wait for armour" spelled out and recruit buttons that say why not; the trading post with goods as icons, stock bars and price chips, a picture of the quay and the ship's state, and easier steppers; the shipyard, colonies, vassals, loans, monuments, ambitions, routes, prices and rivals panels, slice 48's building panels (the storehouse's rows, the court and the prison) and slice 44's Messages panel moved onto it; hover tips and keyboard focus the same everywhere.

**Oliver can:** open `#companies` and `#goods` and compare the Army tab and the trading post with the screenshots he sent; open `#empire` to look through the other panels; open `#storerules` and click the storehouse by the quay to see its rows fit.

**Demo links** (bare hash tokens), all existing towns, unchanged:
- `#companies`: the Army tab with two full companies (as before).
- `#goods`: `#richtown`'s town with the Goods tab on wine (as before), and now the trading post's panel open beside it.
- `#empire`, `#storerules`, `#storeset`, `#workpanel`, `#messages`, `#newgame`, `#colonybase`, `#shipyard`-style demos: the same towns, the panels in their new dress.
- `-paused`, `-plain`, `-modern` as for every demo.

## Not in this slice

Any change to how the town plays: this is a UI slice, so no sim history moves (no state version, no migration). The overview (slice 51) and the infirmary's and asklepieion's sections and the home's health (slice 49): they are built from an earlier trunk and move onto the kit at their merges or in slice 52 (see As built for how). The new-game preview drawn off the main thread (left for slice 52 unless it turns out small). The household panel's own look beyond the kit's tips and focus (it isn't in the spec's list). No new wares, walkers, buildings or commands.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets; the spec's parallel plan binds (file ownership, blocks headed "Slice 50" in shared files, nothing reordered).
- **No state version.** The slice adds no sim state, so `SIM_STATE_VERSION` stays 45 and there is no `fromSlice50` (said so in As built for the integrator).
- **Histories unchanged.** Every earlier demo opens and plays exactly as at `f83499b` (the demo probe, before and after). The one sim file touched is a refusal's words (a trading post on a lake's shore), which no history reads.
- The renderer and UI only read; every button still sends the same command it sent (same `data-act` names, so the smoke's clicks still land).
- All art in code: the icons and figures are SVG written in `src/ui/icons.ts`; the textures are the skin's marble and gradients.
- `MAP_SIZE`: no new uses.
- Judge by screenshots at 1920 × 1080 and 1366 × 768; never claim it looks or feels right on Oliver's behalf.

## Before

At `f83499b`, on the shared, loaded machine (load 10 to 20 on 4 cores, three lines building).

| What | Before |
|---|---|
| Tests | (filled in below once run) |
| Build | (filled in below) |
| Download, triangles, draw calls, demo loads | the loosened `measure.mjs` at `f83499b` (`scratch-50/dist-before`), side by side with this slice's build (in the check-in) |

## Design decisions

**One kit, three files** (`src/ui/kit.ts`, `src/ui/kit.css`, `src/ui/icons.ts`):
- **Icons** (`icons.ts`): every ware (slice 48's `wareicons.ts`, the same drawings, now reached through the kit); every unit as a figure (hoplite, archer, horseman, the Cretan and Arcadian hirelings, an ally's or a militia's company, the trireme); every building (the build bar's drawings, coloured for a pale ground); every action (raise, hire, dismiss, back to barracks, banner, go there, follow, pause, workers first, accept, don't, get, empty, sell, keep, more, less, ship, caravan, gift, loan, repay, war, treaty, station, found, another, pin, read, close); every message kind. A test checks every ware, message kind and command-button act the panels use has its icon.
- **Pieces** (`kit.ts`): small functions that return HTML, since every panel is built as a string and morphed in place: `khead` (a carved plaque with the panel's picture, its name cut in, a kicker and a line under), `ksec` (a section with a carved rule and an icon), `kbtn` (a bronze plaque with an icon; lapis for the main action, terracotta for one that undoes something; disabled with its reason shown), `kstep` (a stepper: two bronze bosses, 28 px, with the value in a sunk well; held down, it repeats), `ktoggle` (a switch: a sunk groove with a bronze knob, lapis when on), `kslider` (a range in a sunk groove), `kbar` (a sunk groove filled in a tone: stock, strength, health, danger; with a tick for a limit or what is kept), `kpips` (a row of sockets, each filled by its state), `kchip` (a little plaque for a price or a count, with an arrow when it moves), `kcard` (parchment in a thin bronze frame).
- **Materials:** the skin's marble for plaques and wells, a parchment wash (the marble under a warm gradient) for cards, bronze and lapis gradients as the side panel's bosses have, Cinzel cut into the stone for headers. Controls at 13 px text or more, hit areas of 26 px or more.
- **Tips and focus, the same everywhere:** one tip element for the whole interface. Any element of a kit panel with a title shows it in the tip: on hover after a short pause, at once on keyboard focus, below the element (above near the screen's foot), gone on leaving, scrolling, clicking or Esc. Every control has the same gold focus ring. A panel's titles are turned into the tip's data before it is drawn, so the browser's own tooltip never shows as well.

**The Army tab** (the side panel's Military tab, 266 px wide):
- A head plaque: the soldiers in all, the companies of yours and the allies apart (`strength().companies` and `.allies`), and a figure for each kind with its count; under it, spelled out, "16 of 32 ready: 16 wait for armour" (and walking in, wounded, away); the pay a month.
- Each barracks under a carved head with its staff as pips. Each company a card: its figure (hoplite, archer, horseman; hirelings and allies in their own colours), its name, its men as pips (ready, waiting for armour, wounded, walking in, away, an empty place), what it is doing and where (a link to go there), its pay; its orders as icon buttons (take its banner, back to barracks, dismiss).
- Recruit: Hoplites, Archers, Horsemen as three plaques with their figures; each says how many homes could send a man, or why not (no estate yet, the barracks full, no home able to send one), and the hirelings' two with their fee and why not.
- The fleet: each trireme a card with her figure, hull and oars as bars, her rowers as pips, her orders as icon buttons.

**The trading post** (the trade panel, a little wider):
- A picture of the quay drawn from the state: the jetty, the sea, the ship where she is (gone, a sail on the horizon coming nearer, tied up, sailing away), and on the quay a stack for each good waiting, in its colours.
- The ship's state and its bar under the picture.
- Each good a row: a sell switch, its icon and name, a price chip (what the ship pays a hundred; the routes' prices in its tip), a bar of what the stores hold with a tick where the city's keep stands, a stepper for the keep (bigger, held to repeat) and what is on the quay.
- The routes' tabs in the same dress: their goods with icons and price chips.

**The rest move onto the kit:** the building panels (header, staff pips, the store's rows made compact, one line each, with icon mode buttons and a limit stepper, and the orders as switches next to the staff so they are above the fold), the court's law and the prison, the Messages panel (an icon for every kind, the `land` kind's included; chips and buttons), the shipyard, the Monuments tab, the Ambition panel, the new-game screen (kinds with drawn icons, the size as a segmented control, the seed with Another), and the map of Greece's pages (ruler, prices, trade/routes, loans, rivals, empire, colonies, vassals): carved section heads, kit buttons, ware icons where colour swatches were, kit bars. Most of this is the kit's stylesheet over their existing markup plus small markup changes (an icon in a button, a swatch become an icon), so their words and commands don't change.

**Slice 48's finding:** a storehouse's eight rows fit with its walkers and condition in a 1080 window, and its orders sit right under the staff; every row's text and buttons are 13 px or more.

**Slice 46's findings:** the game's keys behind the new-game screen (checked: the merge fixed it); the new-game screen on the kit; the `land` message's icon; a trading post on a lake's shore is refused with "a lake": "This is a lake, not the sea: the ship can't come in. A trading post goes on the sea's shore." The new-game preview off the main thread stays for slice 52.

## Tests

- `tests/kit.test.ts`: every ware, every message kind and every unit kind has a drawn icon; the kit's pieces escape their words (a title with quotes or `<` stays text); a disabled button carries its reason; `kpips` gives one socket for each place.
- The demo probe: every prepared town opened and played 900 ticks, the same before and after (the slice touches no history).
- `smoke.mjs`: the Slice 50 block: `#companies` (the cards, pips, figures and recruit plaques; a click on a card's banner button still takes it), `#goods` (the trading post open with its picture and rows; a keep stepper press changes the keep; the sell switch), `#storerules` (the storehouse's panel: every row and the orders above the 1080 fold), the tip showing on hover and on keyboard focus. Existing checks kept, with their selectors and words still matching.
- `measure.mjs`: the download and `#goods`' panel build time.

## Tasks

1. Plan (this file), with the baseline. Commit.
2. The kit: `icons.ts`, `kit.ts`, `kit.css`, the tip; the test. Commit.
3. The Army tab and the trading post on the kit. Commit.
4. The building panels, the store's rows, justice, Messages, the shipyard, Monuments, Ambition, the new-game screen, the Greece pages. The lake's refusal. Commit.
5. Look and tune at 1920 × 1080 and 1366 × 768, before and after shots; demos (`#goods` opens the trading post), smoke and measure entries. Commit.
6. Full checks (tests, build, the slow smoke, the measure, the demo probe, a version 37 save), As built, the check-in. Commit, push.

## As built

(Filled in at the end.)
