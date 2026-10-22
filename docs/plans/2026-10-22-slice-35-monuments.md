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

Measured at `daeac58`, headless Chromium with software WebGL at 1920 × 1080, with the other two lines building on the same machine (load 8 to 12 on 4 cores):

| What | Before |
|---|---|
| Tests | 475 |
| Download (gzipped) | see the measure log (filled in below once the run finishes) |
| First load (bare link) | |
| Demo loads | |
| `#town` | |
| Frame work (update before drawing) | |

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

*(Filled in when the slice is done.)*
