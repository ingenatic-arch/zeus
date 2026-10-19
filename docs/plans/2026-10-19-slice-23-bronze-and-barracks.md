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
| Tests | 353 in 30 files, all passing |
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

Commits: `dea6638` (this plan), `8210b05` (copper, armour and the army in the sim; the overlay, the three buildings, soldiers, banners, the tools, the Army tab and chip, the home and soldier lines), `16d644f` (the three demos, tuning found while building them, smoke, measure and screenshots), `dae47cd` (the `#bronze` view, probe hooks), `45617d1` (smoke fixes: the Tyre ship's prices in the trading post's tip, Corinth's eight price charts, `#bronze` on the Goods tab), `0af26b8` (soldiers' pay in the ledger and on the Money tab), and the check-in.

**Copper on the hills.** As designed: three outcrops in `src/map/coast.ts` (the north-west massif, the east hills, the headland), `tileCopper` and `copperOf` in `src/sim/build.ts`, a mine allowed where its footprint averages at least 0.3. The baked map is untouched. The placement overlay paints the copper as green bands over the ground while the mine tool is in hand (the map's own colouring of the east outcrop is grass and scrub as much as rock, so the bands lie on both).

**The mine and the armoury.** As designed (`src/sim/production.ts`, `src/sim/stores.ts`): the mine 200 measures a month fully worked on the richest rock and holds 400; the armoury two sets every three days from 10 copper a set, holding 200 copper. One change: the mines' carts take ore to the nearest building with room, usually a storehouse, so an armoury could starve beside a full one. The armoury now has a porter who fetches up to 100 copper from the nearest store holding some whenever its heap is half empty (`smithy` in `src/sim/army.ts`).

**Copper and armour as wares.** Ware 8 and 9, in `WARE_INFO`, the stock book, the storehouse's display (ore baskets and armour stands), the Goods tab (copper under "From the land", armour under its own "Arms"). On Greece's routes: Sparta sells copper, Corinth and Athens armour, from their character with no dice; requests, offers and gifts keep to the old six goods; the Tyre ship doesn't deal in them. The probe confirms every earlier demo plays exactly as before, routes included: no route history moved.

**The army.** As designed (`src/sim/army.ts`, `src/sim/armystatus.ts`, commands `raise`, `dismiss`, `banner`), with two changes found while building the demos:
- The barracks' porter carries 32 sets a trip, not 16. Where a barracks is some way from the stores, a company of 16 waited two round trips.
- Sets left over on the barracks' rack stay there while it has hoplites, for the men who fill places later. Before, a cart took them straight back, so the porter fetched 22 and a cart returned 6. A barracks with no hoplites left still sends its armour back.
- The man who serves is the home's eldest son, or its head if it has none. A home's panel says "Kleon, the head of the house, serves in the 1st company of hoplites; he has left his work".
- The Army tab says "raising: 0 of 16 ready (8 walking in, 8 waiting for armour)" while nobody is ready, rather than "drilling".

**Drawing.** `src/render/arms.ts` holds the mine, the armoury, the barracks, the ore basket, the armour stand and the soldiers' looks. `src/render/army.ts` holds the soldiers (in the walkers' batch), the banners (one instanced mesh of poles, one cloth mesh on a shared canvas atlas with the emblem and number) and the ring under the banner in hand. The workplaces' frames now take any footprint (3×3 unchanged; the 4×4 barracks).

**Selecting and moving.** `src/game/orders.ts` and the hooks in `src/main.ts`. Click a banner (within 24 px), a soldier (14 px), or the company's row on the Army tab. The tile under the pointer is marked, and its tip gives the march's length in days or why not. A click, or a drag from the banner, sends the company; Esc or a right-click lets go; orders apply at once while paused. A build tool and a banner in hand put each other down.

**Demos.** All three are `#richtown`'s town carried on (`armsTown` in `src/game/demos.ts`):
- **`#bronze`:** a road from the top of the oil road into the east hills (35 tiles); the mine on the richest rock there (107, 9); the armoury on the oil road below the storehouse (87, 36). Played until four sets are in the stores (June 747 BC). Higher up, the oil road's slope is too steep for a 3×3. The plan had the working mine on "the other outcrop", but only the east outcrop can be reached by road from the town, so the free copper for Oliver is the rest of that same outcrop.
- **`#barracks`:** a barracks east of the armoury on a two-tile lane, (89, 31), and a company of hoplites raised. It opens when half the men are in, waiting, and the porter is on his way back with their armour.
- **`#companies`:** archers raised too. It opens once both companies are full, plus two days of drill, with the hoplites' banner in hand and the Army tab open.

**Not done** (in the check-in's rough edges): no miner figures at the mine (its carts and the windlass only); the forge's glow is under the lean-to's roof, seen only from low down; the soldiers walk the same pace as everyone, so a march across the town takes a few weeks of game time.
- **Found by the smoke.** The trading post's tip listed copper and armour among the Tyre ship's prices; it now lists the old six. The ledger put soldiers' pay first, under "Coming in"; it is now "Soldiers' pay · N men" under "Going out", and the Money tab has its own row for it.

**Checks.**
- `npm test`: 366 tests in 31 files pass. The new file is `tests/army.test.ts`; `tests/money.test.ts` now expects the new goods unticked for sale in `#richtown`.
- `npm run build`: 65 files.
- `npm run smoke`: passes. The full run was on the build before the ledger fix. Its slice 23 section, with the new check on soldiers' pay, was then run again on its own against the final build and passed.
- The demo probe (outside the repo) played every one of the 86 earlier demos at `b06bbea` and at this slice, and compared the whole city at opening and 900 ticks on (the army, the new goods' entries and the redraw counters left out). All 86 are identical, the route towns included.
- Old saves: a new fixture, `tests/fixtures/slice22-rivals.save.json.gz`, is `#rivals` saved at `b06bbea` (version 21). It loads at version 22 with no army and every goods list two longer, plays a month on, and saves again (`tests/army.test.ts`). The older fixtures (versions 8 to 20) still load through every migration.

**Measurements** (`npm run measure`, headless Chromium, software WebGL, 1920 × 1080):

| What | Before | After |
|---|---|---|
| Tests | 353 in 30 files | 366 in 31 files |
| Bundle | 62 files, 9,121 KB raw, 1,946 KB gzipped (game 437 KB, prepared towns 1,510 KB) | 65 files, 9,949 KB raw, 2,081 KB gzipped (game 456 KB, prepared towns 1,625 KB in 61 files) |
| First load (bare link) | ready at 2,492 ms, first frame at 3,414 ms | ready at 1,881 ms, first frame at 2,399 ms (the machine was quieter; the page's work is the same) |
| Every demo's load | 88 demos, median 1,909 ms, slowest `#famine` 2,521 ms, none over 3 s | 91 demos, median 1,862 ms, slowest `#tribute` 2,395 ms, none over 3 s |
| `#town` | 799,168 triangles, 83 draw calls | the same |
| `#richtown` | 910,707 triangles, 95 draw calls; a save 183 KB | the same; a save 186 KB (the army and the two new goods' entries) |
| `#companies` | — | 914,290 triangles, 86 draw calls (its view); 991,881 and 95 over the town |
| Work a frame before drawing | `#town-shot` 12.99 ms, `#richtown-shot` 14.16, `#richstreet-shot` 17.40, `#rivals-shot` 14.25 | 12.22, 11.65, 16.22, 12.68; `#bronze-shot` 7.20, `#barracks-shot` 9.75, `#companies-shot` 11.79 |
| Walkers' batch | `folk-people` 452 triangles an instance | 452 (the soldiers' looks fit within the largest look); `#companies` draws 191 figures in it, 32 of them soldiers |
| Banners | — | one cloth mesh (768 triangles for two banners) and one instanced mesh of poles |

