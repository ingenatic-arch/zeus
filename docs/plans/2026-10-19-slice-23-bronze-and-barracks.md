# Slice 23 — Bronze and the barracks

*19 Oct 2026. Phase 4, "A city worth defending" (`docs/specs/2026-10-19-a-city-worth-defending-design.md`). The first slice of the phase. Builds on slice 22, "A world of rivals", and its review.*

## Goal and check-in

The spec's words: copper on the hills, the copper mine and the armoury; copper and armour as goods (stores, stock book, Goods tab), and on Greece's routes. The barracks; raising companies of hoplites and archers from homes (men leave their jobs, collect armour); pay; dismissing; drilling at peace; homes and soldiers saying who serves. Banners: selecting a company and moving it around the city; the Army tab and the army chip.

The city can arm itself for the first time. A few rocky spots in the hills carry copper; with the mine tool in hand they show as green-streaked rock. A copper mine there digs ore, its carts take it to a storehouse, and an armoury beside the town turns it into armour (a helmet, a breastplate, a round shield and a spear: one set a man), which goes to the storehouse like any good. Corinth and Athens sell armour on their routes, and Sparta copper, so a town with no copper of its own can still arm its men. A barracks (a walled yard with a colonnade, spear racks, a drill ground and a banner pole) raises companies of sixteen: hoplites from the fine houses and villas, archers from the townhouses and better, one man from a home. Each man leaves his job and walks in from his home; hoplites wait for a set of armour, which the barracks' porter carries in from the storehouse. A company that can't fill says why. Soldiers are paid monthly on their own ledger line. At peace they drill on the barracks ground. A home says who of theirs serves, and a soldier whose son he is. Each company has a banner with its number, the city's colour and its own emblem: select it (the banner, a soldier, or its row on the new Army tab) and click or drag to a tile, and it marches there by the shortest way over roads and open ground and stands in ranks facing the way it came. "Back to barracks" brings it home; dismissing sends the men back to their homes and old jobs and their armour back to the stores. Orders work while paused.

**Oliver can:** find copper and build a mine and an armoury in `#bronze`; raise a company in `#barracks` and watch the men walk in from their homes and drill; march banners through his streets in `#companies`.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#bronze`: `#richtown`'s town with a copper outcrop in the north-east hills reached by road, the mine tool in hand so the copper shows, and money to build; a mine and an armoury already working on the other outcrop, their carts on the road, armour in the storehouse.
- `#barracks`: the same town with a barracks built and a company of hoplites just raised: the men walking in from the villas and fine houses, the porter bringing armour, the first ones drilling.
- `#companies`: the same town with two companies (hoplites and archers) standing ready, one banner selected, so a click on a street marches it there.
- Every earlier token keeps working, each also with `-paused`.

## Not in this slice

Enemies to fight, battles, wounds and falling, breaking and running (slice 24). Hirelings (slice 24, with the barracks' panel ready for them). Walls, gates and towers (slice 25). Raiders' new aims (slice 24). Sound (later in the phase). Loans (slices 27 and 28).

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- Sim code (`src/sim/`, `src/map/`) stays pure and deterministic; the army draws on no random numbers at all (which man serves, the drill, the march and the ranks follow from the state). Money moves only through `pay` / `income`.
- **Earlier towns are untouched.** A town that never builds a mine, armoury or barracks plays exactly as before: the new makers step after every older one, the army's step does nothing with no barracks, and Greece's two new goods draw on none of its random numbers, so every city's rulers, prices and dice come out as they did. The demo probe (outside the repo) plays every earlier demo at the commit before this plan and after, and compares the whole city at opening and 900 ticks on (the redraw counters, the new goods' entries and the army left out). Histories with routes may move a little where a route now also carries copper or armour; any that do are named in the check-in.
- Old saves still load: the state version goes to 22 with a migration from 21 (no army, every goods list one copper and one armour longer).
- The renderer and UI only read sim state; every action is a command (raising, dismissing, a banner's move, back to barracks). Static build, `base: './'`, no runtime requests beyond the game's own files, all art generated in code.
- Judge by screenshots, tune by eye, never claim it looks or feels right on Oliver's behalf.

## Before

Measured at `b06bbea` (the phase 4 spec, on top of slice 22's review), headless Chromium with software WebGL at 1920 × 1080:

| What | Before |
|---|---|
| Tests | 353 in 32 files, all passing |
| Bundle | 62 files, 9,121 KB raw, 1,946 KB gzipped (the game itself 4 files, 437 KB gzipped; the prepared towns 58 files, 1,510 KB gzipped) |
| First load (bare link) | ready at 2,492 ms, first frame at 3,414 ms by the page's clock |
| Every demo's load | 88 demos, 86 from prepared towns; ready at median 1,909 ms, slowest `#famine` 2,521 ms; none over 3 s |
| `#town` | 799,168 triangles, 83 draw calls (town view) |
| `#richtown` | 910,707 triangles, 95 draw calls (richtown view); a save 183 KB |
| Work a frame before drawing | `#town-shot` 12.99 ms, `#richtown-shot` 14.16 ms, `#richstreet-shot` 17.40 ms, `#rivals-shot` 14.25 ms |
| Walkers' batch | `folk-people` 452 triangles an instance (its largest look) |

(Headless software rendering: the triangle and draw counts and the frame work compare like with like; the frame rate itself is not representative.)

## Design decisions

**Copper on the hills.** Authored data in `src/map/coast.ts`: three outcrops (`copper`), on the rocky north-west massif, on the rocky east hills and on the headland, each a centre and a radius. `tileCopper` (in `build.ts`, beside `tileOlive` and `tileVine`) is how rich a tile is: highest at an outcrop's centre, nothing at its edge, and only on rock. Nothing is added to the baked map, so every earlier town's ground is byte for byte as it was. While the mine tool is in hand the placement overlay tints every copper tile with a green streak over the rock, the stronger the richer, as the farm tool shows fertile ground.

**The copper mine** (2×2, 150 dr, 6 workers): only where its footprint averages enough copper (`MINE_COPPER_MIN`), on ground as uneven as a grove's (it is cut into the hillside). It is a batch maker like the dairy, scaled by its copper: about 200 measures a month on the richest rock, fully worked. Its carts take ore to a storehouse (new room: 800 copper).

**The armoury** (3×3, 300 dr, 6 workers): a batch maker with an input, like the press, except that a set takes ten measures of copper: up to two sets every three days (20 a month, enough for a company in under a month). It holds 200 copper for its smiths and 40 sets; its carts take armour to a storehouse (new room: 120 sets).

**Copper and armour as wares.** Ware 8 and ware 9, so `GOOD_COUNT` becomes 7. Copper is "from the land" (measures); armour gets its own group, "Arms" (sets), on the Goods tab. They join the stock book (made by mines and armouries; used by armouries, and issued to soldiers at the barracks; armour handed back on dismissal is a negative "used"), the storehouse's display and the Goods tab, as any ware does from its `WARE_INFO` row.

**Greece's new goods.** Copper and armour join the trade goods at the end of the list (indexes 6 and 7). A city's make and use of them is set from its character with no shuffle and no dice: Sparta makes about twice the copper it uses, Corinth and Athens about twice the armour; every other city makes what it uses, so it neither buys nor sells them. The harvest, wars and festivals don't move them. Requests, offers and rulers' gifts keep to the old six goods, so no ruler's dice land differently. The Tyre ship doesn't deal in them (not ticked for sale, and nothing is sold by default). Usual prices: copper 40 dr a hundred, armour 1,200 dr a hundred (12 dr a set).

**The army's state** (`s.army`, `src/sim/army.ts`):
- `companies`: each with its id, number in the city (1st, 2nd…, the lowest free), kind (hoplite or archer), barracks, emblem, order (`drill`, `march`, `hold`, `return`), banner position and facing, its path when marching, the tile it is going to, its pay owed, and why it can't fill (if it can't).
- `soldiers`: each with his id, company, place in the ranks, home (0 for a hireling later), name and father's name, where he stands and faces, his path, what he is doing (`coming` from home, `arming` waiting for armour, `ready`, `leaving` for home), whether he has his armour, and health (100; slice 24 takes it down).
- Kept apart from `s.walkers`, so the walkers' code (sheltering from raiders, the rounds) never sees a soldier, and slice 24's battle reads only the army.

**Raising.** "Raise a company of hoplites" or "of archers" on the barracks panel (a barracks holds four). Once a day a company short of men calls the next man: from the nearest lived-in home by road of the right level (hoplites: fine house or villa; archers: townhouse and better) with a man to spare (it has someone of working age left, and none of its men serve already). The man leaves his job at once (his home counts one fewer who can work, so the next day's work-sharing takes him off), and walks to the barracks over roads and open ground (`offRoadPath`). An archer is ready as he walks in; a hoplite takes a set of armour from the barracks' rack (noted as used), or waits for one. The barracks' porter fetches armour from the nearest storehouse holding some while men are waiting (up to 16 a trip; the rack holds 64). A company that can't fill says why: "Only 9 fine houses and villas can spare a man", "No armour in the stores", "The barracks has no workers".

**Who serves.** The man who goes is the house's eldest son (or its head, if it has no son). The home's panel says "Their eldest, Lykon, serves in the 2nd company"; the soldier's hover says "Lykon, son of Nikias, of the house of Nikias (a villa)". If the home is lost (cleared, burnt, fallen in, abandoned), its man is let go: he leaves the company and the city. Raising only ever calls a man; a company refills by itself while short.

**Pay.** Three drachmas a man a month (workers get two), owed on the first of the month and paid after the workplaces' wages, on its own ledger line ("Soldiers' pay"). Unpaid pay stays owed and is paid as money comes in, like wages; a company unpaid says so. (Hirelings who walk off when unpaid are slice 24's.)

**Dismissing.** Sends every man home by the same off-road way (back to his old job from the next day's sharing), and his armour back onto the barracks' rack; a cart takes armour the barracks has no use for back to a storehouse (handed back: a negative "used"). The company's number is free again.

**Drill.** A company at its barracks with no other order drills on the ground: the ranks stand, turn a quarter, march a few paces across the ground and back, all a function of the tick, so the figures form ranks, turn and march, and a barracks looks alive.

**Banners and marching.** A company's banner stands at its position. A move order (a tile) finds the shortest way over roads and open ground from the banner's tile to the tile (`offRoadPath`, round buildings); if there is none it is refused with a reason ("No way there over open ground"). The banner walks the path at walking pace; the men follow two abreast behind it, each one his place behind along the same path. At the end they form a 4 × 4 block (archers a looser 4 × 4) round the banner, facing the way it marched, and hold. "Back to barracks" marches it to the barracks' gate, then onto the drill ground, then it drills again.

**Selecting and moving** (UI, `src/ui/army.ts`): click a banner, a soldier, or a company's row on the Army tab to select it; while selected a hint line says what it is and what to do, the banner rises and glows, and the tile under the pointer shows whether it can go there; click a tile (or drag the banner onto one) to send it; Escape (or a right-click) deselects. It all works while paused: commands are applied at once while paused, as building is.

**The Army tab** (side panel): every company with its kind, men (16/16), wounded (0 this slice), where it is ("at the 1st barracks", "in the street by the agora"), what it is doing ("drilling", "marching", "holding", "raising: 9 of 16, waiting for armour"), its pay a month and owed; and the city's whole strength (hoplites, archers, pay a month). The top bar gets a small army chip (a helmet and the number of men) when there are soldiers; clicking it opens the Army tab.

**Drawing.** The mine (a pit in the rock with timbered adit, spoil heap, a windlass and ore baskets), the armoury (a smithy with a forge's glow, bellows, an anvil and a rack of shields and helmets), and the barracks (a walled yard with a colonnade on one side, spear racks, a sanded drill ground and a banner pole) are code-made models drawn like the other workplaces. Soldiers are instanced figures in the folk batch: hoplites with a bronze helmet, a round shield in the city's colour and a spear; archers with a cap and a bow. Banners are a pole with a cloth of the city's colour, the company's emblem and number, drawn on one shared canvas texture (one draw call). Storehouses show copper ore in baskets and armour on racks, like the oil jars.

**Seams for slice 24.** A company's order and target, each soldier's state and health, the `hold` order (where slice 24's companies fight what comes within reach of their banner), and `wounded` already on the Army tab.

## Tests

- **Determinism:** the same seed and commands give the same army (raised, marched, dismissed) after N ticks; a save mid-march round-trips and plays on identically.
- **Independence:** a town that never builds a barracks, mine or armoury plays exactly as before (the existing determinism and demo tests, plus a check that Greece's dice and prices for the old six goods are unchanged by the new ones).
- **Migration:** a version 21 save (`slice20-request`, `slice17-caravan`) loads at version 22, with no army and every goods list padded, and plays on.
- **Raising:** a company raised from `#richtown`'s town fills to 16 from fine houses and villas, the right homes lose a worker, hoplites get armour from the stores (the stock book notes it), and the "why" reads right when there isn't enough armour or homes.
- **Pay:** soldiers' pay is on its own ledger line and the ledger invariant holds.
- **Marching:** a company ordered to a tile across the town reaches it by a path round buildings and forms its ranks there; back to barracks brings it home; an unreachable tile is refused.
- **Dismissing:** men go home, the homes' workers come back, armour goes back to the stores.

Plus the existing suite and the demo probe. `smoke.mjs` opens `#bronze`, `#barracks` and `#companies`, and drives a selection and a move order; `measure.mjs` adds them (the soldiers' frame cost).

## Tasks

1. Plan (this file), with the baseline measured. Commit.
2. Sim: wares, copper, the mine and armoury, Greece's new goods, the barracks and the army (raising, pay, drill, march, dismiss), commands, migration, saves; tests. Commit.
3. Render and UI: the overlay, the three buildings, soldiers and banners, selection and moving, the barracks panel, the Army tab and chip, home and soldier lines, the tools. Commit.
4. Demos `#bronze`, `#barracks`, `#companies`; look and tune by screenshots; smoke and measure. Commit.
5. Full checks, the demo probe, measurements, As built, the check-in. Commit, push.

## As built

*(Filled in at the end of the slice.)*
