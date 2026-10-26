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
| Tests | 738 in 56 files, all pass (18 min 2 s, under load) |
| Build | 6 min 35 s (121 prepared towns baked) |
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

**No state version.** The slice adds no sim state: `SIM_STATE_VERSION` stays 45 and there is no `fromSlice50` (nothing for the integrator to hook at `st.version === 45`). Every prepared town in the build is byte-identical to the starting build's (all 121 chunks the same by content hash), so no history moved.

**The kit** (`src/ui/kit.ts`, `src/ui/kit.css`, `src/ui/icons.ts`) as designed above, plus:
- `k-seg`, a segmented control (plaques joined in one frame, the chosen one lapis), made for the new-game screen's sizes.
- `LAND_ICONS`: a little map from above for each kind of land; `tradeIcon(k)`: a trade good's icon by its index in `TRADE_GOODS` (where the Greece pages had colour swatches); `messageIcon` gives every kind of message a drawing, `land` included (`iconOfKind` in `messages.ts` now asks it first, and falls back to its own `KIND_ICON`, so a kind another line adds there still shows).
- The tip: one element (`#k-tip`), installed once from `main.ts`. It shows any `title` or `data-tip` inside a `.kit` element: on hover after 380 ms, at once on keyboard focus (`:focus-visible`), below its element (above near the screen's foot); gone on leaving, a press, Esc or the mouse wheel. A panel that scrolls itself as it is redrawn only moves the tip with its element (it had put the tip away before it showed). A held stepper boss repeats (after 450 ms, every 110 ms). `window.__zeus.kitTip()` reads it.

**How to move a panel onto the kit** (for slices 49 and 51's panels at their merges, or slice 52): give the panel's root the class `kit` (a `household` panel then gets the parchment, the bronze close boss and the carved section rules for free); build its header with `khead({ title, kicker, sub, pic: buildingIcon(kind) })`, its sections with `ksec(title, body, { icon })` or a plain `<h3>` under `.household.kit`; its buttons with `kbtn({ act, data, icon, html, tip, why })`, keeping the same `data-act` and data attributes so its click handler and the smoke still work (`why` disables it and is its tip; `kwhy(why)` says it under the button too); numbers with `kbar` (a stock, strength or danger bar), `kchip` (a price or a count), `kpips` (people as sockets), `kstep` (a stepper; its bosses carry the `less` and `more` data) and `ktoggle` (a switch, `aria-checked`); and pass the HTML through `kitHtml` before morphing it in (titles become the tip's words). Goods get `goodIcon(ware)`, units `unitFigure(kind)`, buildings `buildingIcon(kind)`, actions `actionIcon(name)`. Avoid generic class names on drawings: the horseman's figure was squashed by the side panel's old `.side-body .wide` until its class was renamed `fwide`.

**Panels moved onto it:**
- The Army tab (`armytab.ts`): the summary plaque (the soldiers, the companies of yours and the allies apart, a figure and count for each kind, the strength bar, `readyWords`: "All 32 ready" or "16 of 32 ready: 16 wait for armour, …", chips for pay, wounded, without armour and allied), a key to the pips, each barracks under a carved head with its staff as pips, each company a card (figure in a niche, its banner button, what it is doing and a link to where, its tags, its men as pips, men, wounded and pay, its order buttons with icons), the recruit plaques with their figures and why not, the hirelings with their fee and why not; the fleet's triremes as cards with crew pips and hull and oars bars.
- The trading post (`trade.ts`): the quay picture (`quayPicture`, drawn from the state: the stoa, the quay with a stack for each good waiting, the jetty, the ship by her phase, from a sail on the horizon to tied up and away), the ship's state and bar under it, each good a row (sell switch, icon, name, price chip with the routes' prices in its tip, a bar of the stores' stock with the keep's mark, what is on the quay, a keep stepper that repeats when held); the route and yard tabs with carved heads and ware icons.
- The building panels (`buildingpanel.ts`): the head plaque, staff pips, the orders as two switches right under the staff, the store's rows one line each (icon, name, a bar of what it holds with the limit's mark, four icon mode buttons with a key above them, a limit stepper; the note under the row only when there is one), condition bars, the follow and own-page buttons. The court's laws and the prison (`justice.ts`) by the stylesheet only: 13 px text, 26 px buttons, the laws as plaques.
- The Messages panel: kit chips and buttons, icons for every kind, the tip for each row's words.
- The shipyard: head plaque, trireme cards with figure, crew pips, hull and oars bars marked at the 60 she needs, order buttons with icons, the build plaque with why not.
- The Monuments tab: each monument a card with its picture, its progress bar and three stage bars; the masons' yards with builder pips; the stores' marble, timber and copper with icons.
- The Ambitions: parchment in the bronze frame, the columns as cards, the milestones' bars.
- The new-game screen: each kind of land with its little map, the size as a segmented control, Another with dice, Found and Back as plaques.
- The map of Greece's pages (ruler, prices, trade, loans, rivals, empire, colonies, vassals): parchment, carved heads, the tabs as plaques, every button a plaque (the main ones lapis, a strike terracotta), deals and offers as cards, sunk bars, and ware icons where colour swatches were (`greece.ts`, `prices.ts`, `routes.ts`, `empire.ts`, `colonies.ts`, `colonygrowth.ts`). Their words and commands are unchanged.

**Slice 48's finding:** at 1920 x 1080 the quay's storehouse shows all eight rows, its orders above them, and its walkers and condition under them without scrolling (the panel is 438 px wide when it has stores, 392 px otherwise, 404 px for the court). At 1366 x 768 the rows and orders fit and the walkers and condition are a scroll away. Row text and buttons are 13 px or more, buttons 26 px.

**Slice 46's findings:** the game's keys behind the new-game screen were already left alone after the merge (the smoke's check passes); the new-game screen is on the kit; the `land` message has its icon; a trading post (or a shipyard) on a lake's shore is refused with "This is a lake, not the sea: the ship can't come in. A trading post goes on the sea's shore" (`onlyLake` in `src/sim/trade.ts`, words only; tested in `tests/kit.test.ts` on a delta's lake). The new-game preview off the main thread is left for slice 52.

**Demos:** `#goods` now opens the trading post's panel too (a Slice 50 line after `DEMOS` in `src/game/demos.ts`; its town is unchanged). No new tokens.

**Touched outside the line** (shared files, each change in a block or line marked "Slice 50"):
- `src/main.ts`: imports and installs the kit's tip; `probe.kitTip`.
- `src/game/demos.ts`: `#goods` opens the trading post.
- `src/sim/trade.ts`: the lake's refusal (`onlyLake`), words only.
- `src/render/greece/index.ts`: the Greece panel gets the class `kit` and its HTML goes through `kitHtml`.
- `scripts/smoke.mjs`: checks that followed the old markup now follow the kit's: the trade panel's keep (`.k-good .k-well`) and sell (`button[data-sell]`, `aria-checked`), the in-place check on `.k-goods`, the festival gift's tip (`dataset.tip`), the storehouse's text (the mode words are in the key before the rows), the olive press's and a workplace's text (Orders now under Staff); and the Slice 50 block.
- `scripts/measure.mjs`: the Slice 50 block.
- Not shared but other lines' files, changed for the kit: `messages.ts` (slice 44), `buildingpanel.ts` (slice 48), `shipyard.ts`, `monuments.ts`, `ambition.ts`, `newgame.ts` (slice 46), `greece.ts`, `prices.ts`, `routes.ts`, `empire.ts`, `colonies.ts`, `colonygrowth.ts` (slices 43 and 47).

**`MAP_SIZE`:** no new uses.

**Not done, or left:** the household (home) panel isn't restyled beyond the tip (not in the spec's list). The side panel's other tabs (overview, goods, people and so on) keep their look; slice 51's overview moves onto the kit at its merge. Slice 49's infirmary and asklepieion sections and the home's health aren't on this branch; they move onto the kit at the merge (see above).
