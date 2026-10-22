# Slice 35 — Monuments

*22 Oct 2026. Phase 5, "Ambitions, empire and a deeper city" (`docs/specs/2026-10-21-ambitions-empire-and-a-deeper-city-design.md`). The works and sea line's second slice (wave 2), built at the same time as slice 33 (the turning year, city line) and slice 34 (vassals and allies, Greece line), on branch `claude/p5-works`. It starts at `daeac58`, the trunk with slices 30, 31 and 32 merged.*

## Goal and check-in

The spec's words: the masons' yard; monument sites in stages that wait for marble, timber and bronze hauled by oxen carts, and for builders. The Lighthouse, the Colossus and the Stadium, each with its effect in the city and in Greece. A monument takes a year or two of a busy town and is the most expensive thing in the game; you can have one of each. Rulers notice when one is finished.

The city gets something to build towards with its marble and timber. A **masons' yard** (2×2) trains builders, who walk by road to a monument site. A **monument** is marked out on the ground first (pegs, strings and a surveyor's cord), then rises in three stages you can watch: its foundations, then its columns (the Lighthouse's tower, the Colossus's bronze frame, the Stadium's stone seats), then its finish (the Lighthouse's lantern, the Colossus's bronze skin, the Stadium's colonnade and starting line). Each stage needs so much marble, timber and (for the Colossus) bronze on site before it starts; ox carts bring them from the storehouses, and the blocks, logs and copper pile up on the site as they come. Once a stage has everything it starts, and goes up at the pace of the builders at work on it. The site always says what it waits for ("The tower: 240 of 400 marble on site, 120 of 120 timber; 6 builders of 8").

- **The Lighthouse**, on high ground by the sea (a headland): its fire burns at the top. The Tyrian ship comes in faster, turns round faster and calls more often, and pirates keep clear of your sea lanes while it burns.
- **The Colossus**, on the shore by deep water (the harbour mouth): every ruler's mood is warmer, a lasting reason in their pages, "they speak of your Colossus".
- **The Stadium**, on flat ground: games every four years, announced well ahead, with visitors walking in from the roads to watch, their takings in the treasury, a festival mood across the city while they last, and athletes from the rulers who are friendly.
- When one is finished every ruler notices: a line in the News of Greece, and a good memory that fades over a year. The nearest friendly ruler sends compliments.

**Oliver can:** open `#monument` to see the Lighthouse half built on the headland, with ox carts of marble and timber on the road up to it and builders at work; open `#lit` to see it finished and burning, and the Tyrian ship coming in faster.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#monument`: `#quarry`'s town carried on as its builder would: a loggers' camp in the headland's pines, two masons' yards, the Lighthouse marked out on the headland above the bay, played on until its tower is going up, with carts on the road and a stage waiting.
- `#lit`: the same town played on until the Lighthouse is finished and burning, opened as the Tyrian ship sails in at her new pace.
- `#colossus` and `#games` if cheap: the Colossus rising on the bay shore; the Stadium finished and its games on, visitors in the streets.
- Every earlier token keeps working, each also with `-paused`.

## Not in this slice

The ambitions and their milestones (slice 39 reads the monuments' state). Blockades and enemy fleets at sea, and pirates on the newcomers' lanes (slice 38). Sanctuaries (the gods phase). Monuments abroad. Repairing a monument (they don't burn or fall in). Sea route traders sailing faster with the Lighthouse (`routes.ts`, the Greece line's: only the Tyrian ship).

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets; the phase spec's *parallel plan* binds this line: the state version is 31 here (renumbered at merge), with `fromSlice35` in `migrate.ts` filling in only this slice's field, hooked in by one `if (st.version === 30)` line, its sentence in the notes as "Slice 35 (Monuments): ..."; new building kinds `masons`, `lighthouse`, `colossus` and `stadium` appended at the end of `BUILDING_KINDS`, walkers `builder`, `oxcart` and `visitor` at the end of `WALKER_KINDS`; no new ware (bronze is copper, ware 8, cast by an armoury's smiths); edits to the shared files kept few and in blocks headed "Slice 35".
- Sim code stays pure and deterministic. Nothing here draws a random number: which store sends a cart, where a builder stands, when the games fall, how many visitors come, all come from the state. A town that builds no masons' yard and no monument plays exactly as before.
- **Earlier towns are untouched**, apart from the findings carried over that change a history on purpose (the loggers' camp clearing the trees round its footprint; see Design decisions), named in the check-in. The demo probe (outside the repo) plays every earlier demo at the starting commit and after, and compares the whole city at opening and 900 ticks on.
- Old saves load: a version 30 save (and a phase 4 save through every step) goes through `fromSlice35` (no sites, no games).
- The renderer and UI only read sim state; every action is a command (building, as before). Money only through the treasury. Static build, `base: './'`, all art in code.
- Judge by screenshots, tune by eye, never claim it looks or feels right on Oliver's behalf.

## Before

Measured at `daeac58`, headless Chromium with software WebGL at 1920 × 1080, with the other two lines building on the same machine (load 17 to 24 on 4 cores); the loads and frame work side by side with this slice's build (see the check-in):

| What | Before |
|---|---|
| Tests | 475 |
| Download (gzipped) | 3,455 KB: the game 717 KB, the prepared towns 2,738 KB (84 files) |
| First load (bare link) | ready at 5.3 to 7.3 s, first frame 6.3 to 8.4 s (five runs) |
| Demo loads | ready between 4.3 and 7.2 s, 5.6 s on average (`#town`, `#richtown`, `#caravan`, `#quarry`, 18 loads) |
| `#town` | 1,458,804 triangles, 103 draw calls; `overview` 1,663,032 and 132; a save 171 KB |
| Frame work (update before drawing) | `#town` 50.8 and 26.9 ms, `#richtown` 40.3 and 33.3, `#quarry` 88.9 and 37.2 (4 to 6 frames each, normal speed) |

## Design decisions

**The masons' yard** (2×2, 200 dr, 8 workers): a walled work yard with a lean-to, a block on the banker being dressed, a column drum, a lifting tripod and tools. It has up to four builders (one for each two of its workers). They walk by road to the nearest site with a stage under way that wants builders, work there, and walk home when the stage is done and the next can't start yet, or when there are more than it needs. A yard with no site to send them to keeps them at home and says so.

**The monuments** (one of each per town; on the Monuments tab, a new tab after Military):

| | Footprint, cost | Where | Foundations | Columns | Finish |
|---|---|---|---|---|---|
| Lighthouse | 3×3, 1,500 dr | high ground (at least 2 above the sea, slopes allowed) with the sea within two tiles | 200 marble, 80 timber; 6 builders; 30 days | the tower: 400 marble, 120 timber; 8 builders; 60 days | the lantern: 200 marble, 160 timber; 8 builders; 40 days |
| Colossus | 3×3, 2,000 dr | on the shore by deep water (as the trading post) | the plinth: 300 marble, 60 timber; 6 builders; 30 days | the bronze frame: 300 bronze, 200 timber; 8 builders; 50 days | the bronze skin: 400 bronze, 60 timber; 10 builders; 60 days |
| Stadium | 6×6, 2,500 dr | flat ground | levelling and the banks: 150 marble, 150 timber; 8 builders; 40 days | the stone seats: 700 marble; 12 builders; 70 days | the colonnade and the starting line: 300 marble, 200 timber; 10 builders; 50 days |

Bronze is copper (ware 8) cast at the site by an armoury's smiths: the Colossus's two bronze stages also need an armoury in the city with workers, and the site says so if there is none. The days are at full strength (every builder there); with half the builders a stage takes twice as long. The totals (about 800 to 1,150 blocks of marble each, against a quarry's 100 a month at best) and the coin make a monument a year or two of a busy town's work.

**A stage starts only when its materials are on site.** Each site holds its materials as any building holds goods. While a stage is waiting, the site asks for what is still missing (needed, less what is on site, less what carts are bringing). Once everything is there the stage starts: its materials are used (the stock book's "used" line, "monuments") and its work begins; meanwhile the carts start bringing the next stage's materials, which pile up beside it. A stage's work is in builder-days; each builder at work adds a day of work a day, up to the stage's number. When the last stage is done the monument is finished: the tick it was finished is kept (`s.monuments.sites[i].finished`), and every builder goes home.

**Ox carts** (`oxcart`): a storehouse holding a material a site is short of sends an ox cart with a load (50) along the road to the site, nearest store first, up to six carts on the road to a site at once, a few days apart; it unloads there (as fast as a fully staffed store) and goes home empty. A cart whose site goes takes its load back. Drawn as an ox and its driver with a cart of blocks, logs or copper ore.

**What the site says** (its card and its section on the Monuments tab): which stage it is at and how far along ("The tower: 45% built, about 33 days left at this pace"), what is on site of each material against the stage's need, the carts on the way and what they carry, the builders at work against the stage's number, and what it waits for, in order: materials ("waiting for 160 more marble: no storehouse has any"), the armoury for bronze, builders ("no masons' yard reaches it by road"). Finished: the year it was finished and what it does.

**The Lighthouse's effect.** In the city: its fire burns (a flickering flame and glow at the top, day and night). The Tyrian ship that set sail after it was lit comes in in 12 days rather than 20, sails off in 10 rather than 16, and calls every two months rather than every three (`trade.ts`: a `pace` on her voyage, so a ship already on her way keeps hers). Pirates keep clear of your waters: no new pirates take a place on your lanes while it burns, and those already there sail away within the day, with a line in the News of Greece (`fleet.ts`, a simple hook for slice 38).

**The Colossus's effect.** Every ruler with a ruler gets a lasting memory, "they speak of your Colossus" (+12, never fading), shown among the reasons for their mood. Cleared, it is gone and so is the memory.

**The Stadium's effect.** Games every four years: the first are announced when it is finished, for two months later, and the town line and the News of Greece say so; each later one is announced a month ahead. The games last a month. While they are on, visitors (groups of three to six) walk in from the map's edge along the road to the stadium, every couple of days, and walk home a few days later; each group's takings (8 dr a head) come into the treasury as "Sales · visitors at the games", and the crowd shows in the stands. Every home has "The games are on at the Stadium" (+2) in its mood while they last, and "Still talking of the games" (+1) for two months after (one line in `folk.ts`'s mood). Each ruler who is cordial or warmer sends athletes (a News line) and remembers the games (+5, fading over a year).

**Rulers notice.** When a monument is finished, every ruler remembers it (+6, fading over a year), and the warmest of them sends his or her compliments (a News of Greece line, which also shows under the top bar). On the map of Greece their pages give the reason.

**Readable for slice 39.** `s.monuments.sites` holds one record per site: the building, the kind, the stage (0 to 3, 3 finished), the work done on the stage, when it was marked out, when each stage was finished and when the whole was. `monumentOf(s, kind)` and `progressOf(site)` (0 to 1) answer "is it finished, and when" and "how far along".

**Findings carried over from slice 32's review.**
- *The quarry's look from downhill:* its skirt of spoil is broken up into tipped heaps and coursed terraces of cut blocks rather than one pale battered face, so it reads as a cut into the hillside (judged by screenshots from below).
- *Help:* the G line names every good a storehouse holds.
- *Sound:* the earshot counts sledges and ox carts with the other carts.
- *Clicks:* clicking a quarry follows its sledges, a loggers' camp its loggers, a masons' yard its builders, a monument opens its section of the Monuments tab.
- *Stock:* the caravan yard and the quay show marble and timber stacked there.
- *The camp's corner:* a loggers' camp clears the plants on the ring of tiles round its footprint, as the quarry does, so no pine stands (or grows back) through its corner. This changes `#loggers` (and anything built on it) on purpose: the trees beside its footprint are cleared when it is placed; the check-in says by how much.
- *Cart check:* "on its way by ox cart" counts sledges too.
- Per-city tables fall back to a default for the newcomers.

**Drawing.** The monuments are code-made models in a new `src/render/monuments.ts`, one mesh per site rebuilt when its stage or a step of its progress changes (eight steps a stage), drawn with the city's materials: a marked-out site of pegs, cords and a surveyor's groma; foundations of coursed marble with timber scaffolding; the Lighthouse's tower rising in drums, its lantern a colonnaded cupola with a flame; the Colossus's plinth, a bronze frame of struts, then a bronze figure with a torch raised; the Stadium's banks, rows of stone seats, its colonnade and starting line. The materials waiting on site are stacks of blocks, logs and copper by it. Builders (with mallets and chisels, on ladders and the scaffold, hammering in turn), ox carts and visitors are figures in the folk batches (`workfolk.ts`). The masons' yard is drawn by Works.

**Tools and panels.** The masons' yard and the three monuments are on the new Monuments tab (and on the build bar's tips with what they cost, need and do). A monument's tool says before you place it whether the ground will do and why not ("Not high enough: a lighthouse wants a headland or a cliff over the sea"), and refuses a second of the same. The Monuments tab lists each site, its stages and what it waits for; clicking a site opens its section.

## Tests

- **Determinism:** the same seed and commands give the same city with a yard and a monument under way after N ticks (sites, carts, builders); a save mid-stage round-trips and plays on identically.
- **Independence:** a town with no yard and no monument plays exactly as before (the existing determinism and demo tests).
- **Migration:** a version 30 save loads through `fromSlice35` at the new version, with no sites; a phase 4 save goes through every step.
- **Placement:** each monument's ground rules (allowed and refused with the reason), one of each.
- **Stages:** a stage doesn't start until every material is on site; carts bring them from storehouses (routing: carts reach the site); builders reach the site and work; half the builders take twice as long; the stage uses its materials (stock book); the last stage finishes the monument.
- **Effects:** the lit Lighthouse shortens the ship's voyage and keeps pirates away; the Colossus warms every ruler; the Stadium's games bring takings into the ledger with the invariant holding, and the mood line.
- The existing suite. `smoke.mjs` opens `#monument` and `#lit` (and any others) and checks what they open on; `measure.mjs` adds them.

## Tasks

1. Plan (this file), with the baseline measured. Commit.
2. Sim: the kinds, the yard and its builders, the sites, stages, carts, effects (ship, pirates, moods, games), migration, saves, status lines; tests. Commit.
3. Render and UI: the yard, the monuments' models stage by stage, the figures, the Monuments tab and the site's section, tools and tips, help, the findings carried over. Commit.
4. Demos `#monument` and `#lit` (and others if cheap); look and tune by screenshots; smoke and measure. Commit.
5. Full checks, the demo probe, measurements, As built, the check-in. Commit, push.

## As built

Built as planned, with these differences:

- **The games' timing.** Visitors walk in from the map's edge, and from there to the Stadium on this map is about two months on foot. As planned (announced a month ahead, groups walking home a few days after they arrive), almost nobody was in the seats. Now the first games open **four months** after the Stadium is finished (not two), every games is announced **three months** ahead (not one), groups set out from the announcement for as long as they would still arrive a few days before the end, and every group stays in its seat until the games end, then leaves over a few days (`LINGER`, a day more for each group in turn up to five). A traced games had 28 groups arrive (about 125 people), 28 groups seated at the peak.
- **The Lighthouse's height rule** is 1.5 above the sea (the mean of its corners), not 2: at 2 nothing on the headland above the bay would do.
- **Steep ground.** Every spot the Lighthouse can go on the headland has 1.4 to 2.1 of rise across its 3 × 3. A pad down to the lowest corner was a tall pale wall. A monument now stands at its footprint's inner high ground, on a stone pad at most 0.3 deep, with a fitted skirt of rubble and earth below it (the quarry's `skirt()`), so it reads as a knoll. The Stadium is laid at its highest corner (its banks hide the step), and the masons' yard at the middle.
- **Drawing steps.** A site's mesh is rebuilt at 12 steps a stage (not 8), and when its piles of marble, timber and copper change by a stack.
- **Timber for `#monument`.** The headland has few pines, so `#monument`'s history opens a sea route to Troy and buys up to 400 timber (the Lighthouse needs 360). The loggers' camp from the plan's demo line is left out.
- **No Colossus demo.** 700 bronze is a long wait on one copper mine and an armoury: `#colossus` would play for years. `#games` (the Stadium's first games, built on `#lit`'s town) was cheap enough and is there.
- **The quarry's look from downhill** (slice 32's finding): its spoil skirt is now banded, spoil next to the quarry, then broken rock, then dry grass, with rubble scattered along the bands and a bulge in its slope, instead of one pale face.

**Files.** New: `src/sim/monuments.ts` (kinds, costs, stages, effects, the games' calendar), `src/sim/monumentworks.ts` (sites, ox carts, builders, visitors, a day at a time), `src/sim/monumentstatus.ts` (cards, tab and town lines), `src/ui/monuments.ts` (the Monuments tab), `src/render/monuments.ts` (one mesh per site, fires, where figures stand), `src/render/monumentmodels.ts` (the yard and the three monuments stage by stage), `tests/monuments.test.ts`.

**Touched outside the line** (each edit in a block headed "Slice 35"):
- Sim: `state.ts` (kinds, walkers, `monuments`, the ship's `pace`), `sim.ts` (the day's step, placing a site, the loggers' camp clearing its ring), `migrate.ts` (`fromSlice35`, version 31), `buildings.ts` (sizes, workers), `build.ts` (costs, ground rules), `hazards.ts` (monuments never burn or wear; the masons' yard is an architect's), `commands.ts`, `walk.ts` (ox carts at a cart's pace, visitors at a sending's), `stocks.ts` (the stock book's "monuments" line), `folk.ts` (the games' mood line), `trade.ts` (the ship's pace while the Lighthouse burns), `fleet.ts` (pirates keep clear), `status.ts` (the walkers' and buildings' cards, town lines), `materialstatus.ts` (ox carts in "on its way").
- Game: `saves.ts`, `demos.ts` (`#monument`, `#lit`, `#games`), `views.ts` (their views).
- UI: `tools.ts`, `buildbar.ts`, `sidepanel.ts`, `categories.ts` (the Monuments tab), `ledger.ts`, `minimap.ts`, `townlines.ts`, `help.ts`, `style.css`, `main.ts` (clicks, probes).
- Render: `city.ts` (the monuments view, where figures stand), `pictures.ts` (the build panel's pictures), `works.ts` (the masons' yard; marble and timber on the quay and in the caravan yard; the quarry's banded skirt), `materialworks.ts` (`skirt()` takes three tones), `workfolk.ts` (builders, ox carts, visitors), `walkers.ts`, `earshot.ts` (ox carts with the carts).
- Scripts: `smoke.mjs`, `measure.mjs`.

**Earlier demos.** The demo probe (outside the repo) opened every earlier demo's prepared town at `daeac58` and at this slice, and compared the city (tick, money, people, every building's kind, place, level and people, walkers by kind) at opening and 900 ticks on. 114 of 115 are the same. `#loggers` opens with the same buildings, people and money, but its camp cleared 2 more trees at its corner when placed (113 cleared, not 111), so 26 trees have been felled at opening (not 27), and 900 ticks on it has no logger out where it had 2.

**Old saves.** A version 30 save comes up through `fromSlice35` with no site and no games; the phase 4 fixture (version 27) comes up through every step and plays a month on (`tests/monuments.test.ts`).

**Checks.** Typecheck, the 488 tests and the build pass. The full smoke passes, run in a copy with its waits lengthened for the loaded machine. Its first run caught the side panel's tab count (ten now, with the Monuments tab; fixed in `smoke.mjs`) and once missed `#request`'s caravan under the pointer (a porter was hovered instead). That check passed in two focused runs on each build and in the full rerun, so it is a hover timing under load, not this slice.

**Measurements** (filled into the Before table above; the after figures are in the check-in).



