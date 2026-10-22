# Slice 36 — The great houses

*22 Oct 2026. Phase 5, "Ambitions, empire and a deeper city" (`docs/specs/2026-10-21-ambitions-empire-and-a-deeper-city-design.md`), the city line's third slice (wave 3), built at the same time as slices 37 (Colonies) and 38 (Contested seas) on their own lines, with 39 (Ambitions) alongside. Builds on the trunk with slices 30 to 33 merged (`e0678fc`, state version 31).*

## Goal and check-in

The spec's words: "The estate (new, 4×4, its own plot tool): a walled house with a courtyard, garden and stable. It grows in two levels, *estate* and *great estate*, and needs what a villa needs plus marble for its statues, armour for its sons and horses. Horses come from a new horse farm (3×3) on grassland, or from Thessaly by caravan through Thebes. Horsemen: each estate can send one son to ride in a company of horsemen (fast, good against archers and fleeing raiders, weak against a hoplite line). Estates pay the most tax and draw envy (crime nearby rises)." And from slice 33's rhythm: horses breed in spring, like the flocks.

Findings carried over from slice 33's review and the merge, also in this slice: production that stalls at the seasons' peaks (the most important: a year's output should be about what it was before seasons); a ship's winter lateness that never comes back out of her schedule, and the lateness hash that leaves the ship out; the bread town line's "farms grow about N a month" naming this season's pace, not the year's; the camera's canopy forgetting felled trees. The summer tint is left for Oliver's eye unless it is clearly off beside the estates' gardens.

**Oliver can:** open `#estates` and see two great estates on the hill above the agora, walled, with their courtyards, gardens, statues and stables, horses in the paddock, porters bringing marble and grooms leading horses up from the storehouse; click one to read what it has and wants. Open `#horsemen` and ride a company of horsemen from the great houses at a band of raiders, watching them run down the men who flee.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#estates`: `#richtown`'s town with a quarry on the headland, a horse farm on the grass by the river, an armoury, and two estate plots laid out on the hill above the agora, played on until both are great estates. It opens over the two estates, with the first one's panel open.
- `#horsemen`: a town of great estates with a barracks and a company of horsemen raised from them, ready, and a band of raiders on its way; it opens paused with the horsemen's banner in hand, the Army tab open.
- `-paused`, `-plain` and the rest combine as before. Every earlier token keeps working.

## Not in this slice

Chariots (later, as the spec says). Enemy archers in the bands (so "good against archers" shows only in the riders' card and abroad, not on your streets; noted in the check-in). Horses as a need of anything but the estates and the horsemen. Estates growing from villas (an estate is laid out as its own plot; a villa stays a villa). Rival cities' cavalry. Estates' sons serving in the hoplites or archers (they ride, or not at all).

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets; the spec's *parallel plan* binds: horses are ware 12 (reserved for this line), goods arrays padded to `GOOD_COUNT` and `TRADE_GOODS.length` (never a fixed length); new building kinds (`horsefarm`) appended at the very end of `BUILDING_KINDS`; state version 32 on this line with a `fromSlice36` migration that only fills in its own fields (if absent) and is hooked in with one `if (st.version === 31)` line; the migration's note reads "Slice 36 (The great houses): ..."; tests compare with `SIM_STATE_VERSION`; new demos in a block headed "// Slice 36"; edits to shared files kept few and in blocks of their own. `army.ts` and `battle.ts` belong to no line now: the horsemen go in "Slice 36" blocks there. Anything outside the line is listed under *Touched outside the line*.
- Sim code stays pure and deterministic (seeded random only, `dmath` maths). Money only through the treasury.
- **An estate is a home.** It is a `home` building with a flag (`estate`) and a 4×4 footprint, so water, food, the stall goods, blessings, plays, taxes, fire, crime, the household panel and the people counts all work for it as for any home; its levels are 7 (estate) and 8 (great estate). A town with no estate plot plays exactly as before.
- **Earlier histories.** The production fix and the ships' schedule change histories on purpose (with the seasons on); the demo probe (outside the repo) compares every earlier demo at opening, 900 ticks on and a year on with the baseline, and the check-in names what moved and by how much. The estates, the horse farm and the horsemen change nothing in a town that has none.
- The renderer and UI only read sim state; every action is a command. Static build, `base: './'`, all art in code.
- Judge by screenshots, tune by eye, never claim it looks or feels right on Oliver's behalf.

## Before

Measured at `e0678fc` (the trunk with slices 30 to 33 merged), with the other lines building on the same machine:

| What | Before |
|---|---|
| Tests | counted in As built (the full suite at `e0678fc`) |
| Download (gzipped), loads, frame work | side by side with this slice's build at the end (the full `npm run measure` runs past the two-hour limit for a background job on this machine) |
| Demo probe | every demo at opening, 900 ticks on and a year on (people, money, food, levels), and what each made over that year, by ware, with the seasons on and with them switched off at opening (`scratch-36/probe-base*.json`) |

## Design decisions

**Horses, ware 12** (`foods.ts`, `goods.ts`, `stocks.ts`, `stores.ts`, `trade.ts`, `world.ts`). `HORSES = 12`, counted in horses. A storehouse keeps up to 40 in its stalls. A trade good: the ship pays 2,500 dr a hundred; Thebes breeds Thessaly's horses to spare (it makes four times what it uses) and sells them by its road; Argos keeps a few to spare; every other city uses about what it makes, so only Thebes and Argos sell. Requests, offers and rulers' gifts keep to the first six goods, as they do for copper, armour, marble and timber. In the stock book horses have their own group, "Horses".

**The horse farm** (`horsefarm`, 3×3, 300 dr, 6 workers). It goes on grassland (at least as much grass as a dairy needs, shown while placing it). It breeds horses as a batch by its grass, 4 foals every 15 days fully worked on the best grass (about 8 a month), following the flocks' rhythm (spring 140%, summer 110%, autumn 90%, winter 60%: horses breed in spring). Its paddock holds 16; grooms lead them, four at a time, to the nearest storehouse with room (its carts, drawn as a groom and a string of horses).

**The estate plot** (a new tool and command, `estate`, 4×4, 100 dr). It goes on the same ground as housing and needs a road beside it. An empty estate plot is staked out with a low wall traced on the ground.

**A noble house comes.** Ordinary settlers never take an estate plot. Once a day an empty estate plot that a road from the map's edge reaches looks at the streets beside it: once every walker a villa needs has passed one of them within the last month (the water carrier, the food vendor, the priestess, the oil, fleece and wine vendors and the actor), a noble household of 12 walks in from the edge and the plot becomes an **estate** at once. Until then its tip says who hasn't come by ("A noble house would settle here once the actor and the wine vendor come this way").

**The two levels** (`buildings.ts`, `folk.ts`, `houses.ts`). An estate (level 7) holds 12 and needs what a villa needs. A **great estate** (level 8) holds 20 and also needs marble for its statues, armour for its sons and horses for its stable. An estate settled a month, with a month in hand of everything a great estate needs, becomes one; kin and retainers walk in from the edge to fill it. A great estate short of marble, armour or horses warns and, two months after, goes back to an estate; an estate short of a villa's need warns and, two months after, the noble house leaves and the plot stands empty again (its story says why). Estates' people don't work: they live off their land.

**What an estate keeps** (`estates.ts`, new). Marble, armour and horses are not walked round by vendors: each estate sends its own porter for them to the nearest storehouse that holds some, when it has under two months in hand (an estate does so once the city has some, to rise; a great estate always). What he brings lasts: a block of marble five days (a great estate uses about 6 a month), a set of armour two months, a horse a month and a half. An estate holds at most 24 blocks, 3 sets and 4 horses. The stock book counts them used as they arrive, as it does a vendor's top-up. The needs ride on the same machinery as the others (`LEVEL_NEEDS` grows three needs, `marble`, `armour` and `horses`, read from the home's `goodsUntil`), so the panel, the warnings, the decline and the story treat them alike.

**Money and envy** (`taxes.ts`, `crime.ts`, `hazards.ts`). An estate pays 40 dr a month at fair taxes and a great estate 60 (a villa 18). A thief finds 40 and 60 dr in them. Envy: an estate counts as a richer home within two tiles more than other homes do (it is large and walled), and its neighbours' panels name it ("an estate across the road").

**Horsemen** (`army.ts`, `battle.ts`, `expeditions.ts`, in Slice 36 blocks). A third kind of company, raised at a barracks: 8 riders, one from each great estate (its eldest grown son, or its head), riding in armed and mounted (their house keeps their armour and horse: no armour from the rack). They march at 0.5 tiles a tick (a company on foot 0.3). In a fight: they close fast, strike hard (24, a hoplite 20) and take little (0.55 of a blow); they go for raiders within six tiles of their banner and chase no further than nine, but unlike hoplites they ride down the men of a broken band as they run (within twelve tiles of their banner); and a rider in the press, with three or more raiders standing round him, takes twice the hurt ("weak against a hoplite line"). Abroad a rider counts as a hoplite does (1.2). Their pay is a soldier's.

**The findings.**
- *Production at the seasons' peaks* (`production.ts`, `stores.ts`). The probe (seasons on against off, a year after opening) shows where a year's output is lost, and the fix goes where it shows: crops that stand ripe in the field while their store is full (they keep growing into a standing crop of one harvest, brought in as soon as there is room), and stores' rooms where the surge piles up. The check-in gives the year's output with seasons on before and after the fix, against seasons off, and which demos moved back and by how much.
- *Ships late in winter* (`seasons.ts`, with one-line hooks in `trade.ts` and `routes.ts`). A late visit's lateness comes back out of the schedule: her next visit is due three months after the day she was due, not after the late day. The storm's hash takes the ship's key, so two ships due the same day are late by different amounts.
- *The bread town line* (`status.ts`): "farms grow about N a month" at this season's pace, naming it.
- *The camera's canopy* (`trees.ts`): rebuilt as trees are felled (and grow back), as it is when plants are cleared.

**The look** (`src/render/estates.ts`, new; `animals.ts`, `army.ts`, `walkers.ts`). The estate: a walled compound facing its road, a house of two wings round a colonnaded courtyard, a garden with cypresses and a pool, a stable with a hay loft, a gate. The great estate adds a second storey and a portico, marble statues in the garden, and horses in a paddock behind the stable (drawn from what it holds). The plot: corner stakes and a traced wall. The horse farm: a long stable, a fenced paddock, a trough and hay; its horses graze in the paddock, more as it fills. Horses at a storehouse stand at a rail in its yard. A rider: a horse (bay, chestnut, grey or black) with its rider in the company's tunic, bronze helmet and spear; the legs swing as they ride. The groom leading horses, and an estate's porter with marble or armour on a handcart (or leading a horse home).

**The UI.** The estate plot tool and the horse farm on the build bar (the plot under Housing, the farm under Husbandry), the placement tips (the farm's grass); the home panel for estates (the noble house's needs, its marble, armour and horses with how long each lasts, what a great estate needs); the barracks' panel raises horsemen with a reason when it can't ("No great estate can send a rider"); the Army tab lists them; the stock book shows horses.

## Tests

- **Determinism** (existing, with the new demos in the prepared towns).
- **Estates** (new `tests/estates.test.ts`): a plot is 4×4 and costs its price; ordinary settlers never take it; a noble house comes only once every villa walker has passed it, and the plot becomes an estate; an estate with a month in hand of everything becomes a great estate and fills; a great estate without horses goes back to an estate after its warning; an estate without water is left empty after its warning; a great estate pays more tax than a villa; envy counts an estate.
- **Horses:** the horse farm breeds on grass and not off it, faster in spring than in winter; its grooms take horses to a storehouse; an estate's porter fetches horses and marble from the storehouse and the supply lasts as planned.
- **Horsemen:** a company of horsemen calls only great estates' men; they ride faster than hoplites march; they chase and strike a broken band's runners where hoplites don't.
- **Saves:** a version 31 save (slice 33's) loads through `fromSlice36` with every goods list padded and plays on; a version 27 save loads through all the steps; a save round-trips an estate and a company of horsemen.
- **Findings:** a ship late in winter is back on schedule the visit after; two ships due the same winter day can be late by different amounts; the year's output with seasons on is within a few percent of seasons off for a fully worked farm and grove whose stores fill.
- The existing suite. `smoke.mjs` opens `#estates` (an estate's panel, its tip) and `#horsemen` (the banner, the riders); `measure.mjs` adds them.

## Tasks

1. Plan (this file), with the baseline probe. Commit.
2. Sim: horses, the horse farm, the estate plot, estates' levels, needs and porters, taxes, envy, horsemen, the migration; the findings in the sim; tests. Commit.
3. Render and UI: estates, the horse farm, horses, riders, grooms; the tools, panels and tips. Commit.
4. Demos: `#estates` and `#horsemen`, their views, smoke and measure; look and tune from screenshots. Commit.
5. Full checks, the demo probe, measurements, As built, the check-in. Commit, push.

## As built

*(Filled in when the slice is done.)*
