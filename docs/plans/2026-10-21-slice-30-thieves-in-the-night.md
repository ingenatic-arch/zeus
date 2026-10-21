# Slice 30 — Thieves in the night

*21 Oct 2026. Phase 5, "Ambitions, empire and a deeper city" (`docs/specs/2026-10-21-ambitions-empire-and-a-deeper-city-design.md`), the city line's first slice (wave 1), built at the same time as slices 31 (Greece grows) and 32 (Marble and timber) on their own lines. Builds on phase 4 as merged into the trunk.*

## Goal and check-in

The spec's words: every home has a temptation to crime that rises with want (needs unmet, hunger), unhappiness, harsh taxes and envy (richer homes within a few tiles) and falls with the watch walking by, and its panel names it. When it builds up, a thief (a hooded figure) slips out of the home and walks to a richer home (coin), a store (goods) or the tax office (the treasury), takes something and slips back. The robbed home says so and its mood falls; the ledger has a "Stolen" line and the stock book a "stolen" one. The watchman, who already fights fire, also deters crime along his round, and chases and catches a thief he meets; the thief's family pays a fine, and a town line says so. A loaded town starts with no temptation anywhere, and prepared histories are played with crime off, as fire was.

And the leftovers the spec gives this slice: early fire builds a little slower in a town's first year and warns sooner; harsh taxes bite harder (more households leave, and crime rises); tax money comes in day by day; marked-out plots with no road show a clear "no road" sign; and, if small, town lines that go stale while paused.

**Oliver can:** open `#thieves`, watch a thief slip out of a hungry hut beside the villas and rob one, then build a watch post and watch the next one caught; open `#nowatch` and see temptation named in a poor home's panel.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#thieves`: `#richtown`'s town (its villas in the core) with its watch posts gone and a new street of huts marked out on the slope behind the villas, out of the market's reach, so they have water but no bread. Crime switched on as their huts fill, and played on until the first of them is a few days from sending out a thief. It opens running, the camera on the huts and the villas across the road, the crime overlay on.
- `#nowatch`: the same town carried on about four months with no watch post: thieves have struck a few times (homes robbed, the stores and the treasury), and it opens paused with the panel of the most tempted hut open.
- `#thieves-paused`, `#nowatch-overlay` and the rest combine as before. Every earlier token keeps working.

## Not in this slice

Riots, a court and a prison (the spec's "recorded for later"). Gangs, or thieves who fight back. Thieves stealing from the trading post's quay, the caravan yard or the army's armour. Day and night (thieves go out whenever their temptation fills). Sound for thieves (a whistle when one is caught could come with a later look pass). Seasons, estates and horses (slices 33 and 36).

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets; the spec's *parallel plan* binds: one new top-level state field (`crime`), new kinds appended at the very end of the lists (`thief` in `WALKER_KINDS`), new demos in a block headed "// Slice 30", state version 28 on this line with a `fromSlice30` migration that only fills in its own fields, edits to shared files kept few and in a block of their own.
- Sim code stays pure and deterministic. Every chance in crime is a hash of the seed, the home and the day (as fire's are), never a draw from the state's generators, so crime never shifts anything else's random numbers. Money moves only through `pay` / `income`; theft, fines and loot taken back are ledger lines like any other.
- **Earlier towns.** Crime has a switch, as fire has: `crime.on`, off in a bare state and while a demo's history is played, turned on as a new game starts, as a demo opens and as an old save loads. The slice's other new rules that would change how a history plays (taxes reaching the treasury day by day, harsh taxes' harder bite) come on with the same switch, so every earlier demo opens exactly as at the starting commit (same people, money and levels). Played on from opening, they differ: crime builds, and taxes come in daily. The demo probe (outside the repo) compares every earlier demo at opening and 900 ticks on with the baseline, and 900 ticks on with the switch turned off again; the differences are named in the check-in.
- Old saves load: a version 27 save gets no temptation anywhere, no thieves, and crime on.
- The renderer and UI only read sim state; every action is a command. Static build, `base: './'`, all art in code.
- Judge by screenshots, tune by eye, never claim it looks or feels right on Oliver's behalf.

## Before

Measured at `70087da` (the phase 5 spec, on the trunk after phase 4's review), headless Chromium with software WebGL at 1920 × 1080, with the other lines building at the same time:

| What | Before |
|---|---|
| Tests | 444, all passing |
| Download (gzipped) | 2,983 KB: the game 681 KB, the prepared towns 2,302 KB (79 files) |
| First load (bare link) | ready at 4.8 s, first frame at 6.0 s (side by side with the slice's build, with three lines building: see the check-in) |
| Demo loads | 110 demo links (108 with a history); `#town` ready at 4.8 s, `#richtown` 4.5 s, `#fortress` 5.0 s under the same load |
| `#town` / `#richtown` | 693 people, 322 dr, a save 149 KB / a save 187 KB |

Software WebGL on a machine shared with three other builders: frame and load times swing by a third or more from run to run, so only large changes count.

## Design decisions

**State.** `SimState.crime` (new module `src/sim/crime.ts`): the switch `on`; the last few lines of crime news (a theft, a thief caught) for the town lines; and this month's and last month's tallies (thefts, thieves caught, coin and goods taken, fines), for the side panel. Each building gets `tempt` (0 to 1,000, like fire risk). A thief is a walker of the new kind `thief`, appended at the end of `WALKER_KINDS`. A household's story gains `robbed`, `stole` and `caught` entries (with an optional `n`: how much), which the mood and the panel read, so a robbed mark needs no field of its own. Two new ledger kinds: `stolen` and `fines` (loot taken back is the existing `recovered`). The stock book's goods stolen are `lost` lines, "Stolen by thieves".

**Temptation** (`temptationOf`, pure; the panel, the overlay and the sim read the same). For a lived-in home, a score of named reasons:
- *want*: hungry (no food on the table: a hut without bread, a cottage or better without the food its level needs) +2; any other need it is warning about +1 (at most +2);
- *unhappiness*: by its mood, fed up +3, unhappy +2, worried +1, getting by 0, content −1;
- *taxes*: taxed lately at heavy +1, at harsh +3;
- *envy*: a home two or more levels richer within ENVY_TILES (5) +1, three or more +2 ("villas across the road");
- *work*: everyone who could work out of work +1, wages owed +1;
- *the watch*: if all that comes to more than nothing, a watchman walking by on a road beside it within the last month takes 3 off ("the watchman walks by"); none adds 1 ("no watchman this month").
Each day (staggered by id) `tempt` rises by the score times TEMPT_STEP (about 8, so a score of 4 fills it in about a month), or, with a score of nothing or less, falls by 25 a day. A home's panel shows it from a quarter up: "Tempted to steal: hungry, villas across the road, no watchman this month · 64%, a thief in about 12 days".

**Thieves** (`stepCrime`, `moveThief`). When a home's temptation is full, crime is on, no thief from it is out and fewer than THIEVES_OUT (3) are out in the city, one of its grown members slips out (`tempt` back to nothing). Where to: within THIEF_RANGE (24 steps by road), the most worth the walk (worth over 8 plus the steps) of a richer home not robbed in the last two months (its coin, by level: 2 dr for a tent's to 24 for a villa's), a granary or storehouse with something in it (a sack of food, more worth it to a hungry home, or a few jars or bales), or the tax office (up to 40 dr of the treasury, if it has any). With nothing worth taking in reach, the temptation stays full and the panel says so. He walks the shortest road at a patrol's pace, waits at the door a moment, takes it, and walks home. Home: the household's story gains a line ("Lykon came home before dawn with a purse that wasn't his"), stolen food feeds them for twenty days, and the coin is theirs. The robbed home's story gains "A thief broke in and took 24 dr", and its mood falls (−2 for two months: "Robbed 12 days ago: a thief took 24 dr"). The tax office's loss is a `stolen` ledger line ("Stolen · from the tax office"), a store's a stock book line, and a theft is a line of crime news for the town lines ("A thief robbed the villa of Kallias by the bay: 24 dr").

**The watch** (`hazards.ts`). A watchman on his round who sees a thief within THIEF_SIGHT (6 tiles) and can reach him by a short road (DASH_MAX) runs after him (re-planning his way every few ticks); fires come first. A thief who reaches his door with the watchman after him waits there. Caught: the loot goes back (coin to the robbed home or the treasury as `recovered`, goods to the store), the family pays a fine (by its level, 5 to 20 dr, `fines`), its story says so ("Lykon was caught stealing by the watchman; the house paid a 10 dr fine"), it is shamed for a season (−1), and the town line says "A thief caught by the bay: Lykon of the house of Nikias, on his way to the villa of Kallias. His family paid a 10 dr fine." Then the watchman goes on as after a fire.

**Pressure you can see coming.** A town line warns before thieves go out: when homes are more than half way to sending one and no watchman walks by them ("Crime by the bay: 6 homes are tempted to steal (hungry, villas nearby, no watchman), the first in about 9 days. A watch post (Z twice) would deter them."). News of a theft or a catch shows for a few days in its place. The crime overlay (on the Hygiene and safety tab, beside fire and wear) tints homes green, amber or red by temptation, columns over the most tempted, and the watchmen's reach and walked roads as the fire overlay does; robbed homes stand out.

**Drawn.** A thief is a hooded figure in a dark cloak, stooped, moving quickly; on the way home with a purse at his belt or a sack on his back. His tip names him and where he is going ("A hooded figure, keeping to the side of the road: Lykon of the house of Nikias, on his way to the villa of Kallias"). The watchman running after him shows as running.

**Leftovers.**
- *Early fire* (`hazards.ts`): in a town's first year, fire risk builds at 70% of its pace (about 30% slower); and the fire-risk town line, where no watchman walks, warns from half way (it waited for three-quarters), naming the days until the first smoulder ("…12 buildings are half way to smouldering, the first in about 40 days…"). Fire's other rules are unchanged.
- *Harsh taxes* (`taxes.ts`): with the switch on, at harsh each month a fed-up or unhappy household a collector has called on leaves whole two chances in three (was one in two), a worried one one in three (one in four) and one getting by one in six (one in twelve), and more send someone away; and harsh taxes add 3 to temptation. The natural-play probe measures a year at harsh in `#town` before and after (money, people).
- *Tax money day by day* (`taxes.ts`): with the switch on, each collector hands his satchel in at the end of every day he is out, not at the end of his round; the ledger's lines are the same lines (taxes by district, the homes counted), so the invariant holds. The probe measures the biggest one-day jump in `#town`'s money before and after.
- *"No road" sign* (`signs.ts`): an empty plot that no road from the edge of the map passes has a sign over it, a road with a red bar across, as the homes' signs are drawn; the note already says why nobody comes.
- *Town lines while paused* (`townlines.ts`): while the clock stands still, a shortfall line that no longer stands goes at once (it waited three days of game time, which never came), and a new one shows at once.

## Tests

- **Determinism** (existing, with `#thieves` and `#nowatch` in the prepared towns), and a town with a theft and a catch in it gives the same state twice.
- **Temptation:** a hungry hut beside villas with no watchman has its reasons named (hungry, villas nearby, no watchman) and fills within about a month; the same hut fed and watched doesn't; nothing builds with crime off.
- **Thieves:** a full home sends a thief who reaches a target and gets home; a home robbed loses its mood and has a story line; a theft from the tax office is a `stolen` ledger line and the ledger adds up; a theft from a store is in the stock book.
- **The watch:** a watchman whose round passes a thief catches him; the fine is on the ledger, the loot goes back, the family's story says so; the ledger adds up.
- **Earlier towns:** with crime off a town plays as before (the existing town and money tests); a loaded demo opens with no temptation anywhere.
- **Leftovers:** fire risk in the first year at 70% of its pace; daily tax hand-in keeps the ledger invariant and the same taxes over a month within a few drachmas; harsh's harder bite with the switch on and the old with it off.
- **Saves:** a version 27 save (`tests/fixtures/slice29-fortress.save.json.gz`) loads through `fromSlice30` with no temptation and crime on, and plays on; a save with a thief walking round-trips.
- The existing suite. `smoke.mjs` opens `#thieves` (a thief goes out and steals, the town line, a watch post built and the next one caught) and `#nowatch` (the panel's temptation, the ledger's Stolen line); `measure.mjs` adds them.

## Tasks

1. Plan (this file), with the baseline measured. Commit.
2. Sim: `crime.ts` (temptation, thieves, catches, news), the watchman's chase, the switch and its command, state and migration, saves; the leftovers in the sim (daily taxes, harsh, first-year fire); tests. Commit.
3. Render and UI: the thief's look and tip, the household panel's temptation and robbed lines, story lines, the ledger, the side panel's crime row and the crime overlay, the town lines (crime, paused), the "no road" sign, help. Commit.
4. `#thieves` and `#nowatch`, their views, smoke and measure; look and tune from screenshots. Commit.
5. Full checks, the demo probe, measurements, As built, the check-in. Commit, push.

## As built

Commits on `claude/p5-city`: the plan `4b0e7b5`; the sim, panel, ledger, lines and overlay `52726ac`; the demos, their smoke and measures `f21409a`; the stores' and tax office's month between thefts `3d694f8`; young men first, and the words following who went `f5e5153`; and this note with the check-in.

**As planned:** `crime.ts` (temptation, thieves, catches, news, tallies), the switch (`{ type: 'crime', on }`, on in a new game, as a demo opens and as a save loads), state version 28 with `fromSlice30`, the thief (`thief`, last in `WALKER_KINDS`), the story's `robbed`, `stole` and `caught`, the ledger's `stolen` and `fines`, the stock book's "Stolen by thieves", the panel's temptation block, the crime overlay and side-panel row, the town lines, and the leftovers (first-year fire at 70% and its line from half way; harsh's harder bite; satchels handed in each day; the "no road" sign; town lines while paused). The temptation reasons and their weights are the plan's.

**Changed while tuning** (each found by playing a demo on in the sim and reading what happened):
- **Temptation needs a real grievance.** It rises only at a score of 3 or more (TEMPT_FROM), each point from there adding 8 a day, and falls 25 a day below it. With "more than nothing", as planned, `#food` lost 1,804 dr to thieves over three years and ten homes went down a level; now it loses next to nothing and none go down.
- **A thief's reach is 40 steps by road** (planned 24): at 24 the hut street's thieves could only reach the storehouse and robbed it over and over, never the villas. A richer home within envy's reach (5 tiles) is worth twice as much to them, and a target another thief is already heading for is passed by.
- **The tax office gives up at most 20 dr,** or a twentieth of the treasury if less (planned 40), and counts for a quarter of that in a thief's choice, so homes come first.
- **A store or the tax office robbed isn't robbed again for a month** (new `robbedAt` on every building, filled in by `fromSlice30`). The demo probe found `#closed`, played on with crime on, losing 780 dr in six months to thieves at its tax office, robbed every few days; now it loses 100 dr.
- **The watchman's chase** lives in `crime.ts` (`moveWatch` wraps the round's step and is what `sim.ts` calls), not inside `hazards.ts`; fires still come first.
- **A household's young men go out first,** then the older men, then a woman, and every line says he or she as it is (a run of `#harsh` had "Timarete ... on his way home").
- **A thief who is the head of his house** is named so ("Telekles, the head of the house"), not "Telekles of the house of Telekles"; a full home held back by the three-thieves cap says so in its panel.

**The demos.** `#thieves` is `#richtown`'s town with only the west bank's watch post kept (its hamlet isn't what the demo is about) and a new street of eight huts and a fountain along the slope behind the core's villas, out of either agora's reach; crime goes on once six are huts, and it opens about 6 days before the first thief, with five huts more than half way. `#nowatch` carries it on four months (by then the street's thieves have robbed villas nine times and nothing else: the villas are worth more than the stores or the office), and opens paused on the panel of the most tempted hut whose son has already stolen. So `#nowatch`'s ledger has no Stolen line; the tests cover that line instead, and the smoke checks the story.

**Earlier towns** (the demo probe, outside the repo: every demo's state hashed without the slice's own fields, the version and the command count). All 108 earlier demos open identically. Played on 900 ticks with the switch turned off again, all 108 are identical. With it on: people are the same in 107 (`#harsh` 577, was 628: harsh bites harder), levels the same in 107 (`#harsh`), and money is never lower, median 219 dr higher (taxes reach the treasury day by day, so more of what was collected is in by then). Natural play, `#town` a year on: at its own rate the same 1,040 people and 81 homes, 2,254 dr (was 1,982), taxes in on about 225 days of the year (was 30), the biggest day 332 dr (was 212: the collector still calls on most homes within a day or two); at harsh 286 people and 53 homes (was 436 and 68), 2,735 dr (was 4,160), 56 thefts and 4 thieves caught.

**Touched outside the line** (each in a block of its own marked "Slice 30", nothing reordered):
- `src/sim/state.ts`: the version (28), `tempt` and `robbedAt` on buildings, `thief` at the end of `WALKER_KINDS`, the story's three kinds and `n`, the ledger's two kinds, `SimState.crime`.
- `src/sim/sim.ts`: `crime` in a fresh state, the two building fields, the `crime` command, `stepCrime` after `stepHazards`, the thief's and watchman's steps. `src/sim/commands.ts`: the `crime` command, last in the union.
- `src/sim/migrate.ts`: the note and `fromSlice30`. `src/game/saves.ts`: the two building numbers, the two ledger kinds, a check on `crime`.
- `src/sim/settlers.ts`: `cutOffPlots`, for the "no road" sign. `src/sim/status.ts`: the crime town line, the thief's and the chasing watchman's tips, fire risk's line from half way.
- `src/game/demos.ts`: `calm()` turns crime on as a demo opens; `town()` can drop the rich town's watch posts; the "// Slice 30" block. `src/game/views.ts`: the `thieves` view. `src/main.ts`: crime on in a new game, J's cycle, the thief's name, the `crime` probe.
- `src/render/overlay.ts` (the crime overlay), `src/render/signs.ts` (the "no road" sign), `src/ui/ledger.ts`, `src/ui/sidepanel.ts`, `src/ui/townlines.ts`, `src/ui/categories.ts`, `src/ui/buildbar.ts`, `src/ui/help.ts`, `src/ui/style.css`.
- `scripts/smoke.mjs` and `scripts/measure.mjs`: the two demos; and in the smoke, the J-cycling check's list gains `crime` (the one existing line changed).
- Tests: `battle`, `raids`, `routes` and `treasury` (its ledger test) turn crime off, because their timings count on taxes arriving by the satchel; `treasury`'s every-demo history test has 900 s, not 400.

**Checks:** 457 tests, all passing (13 new in `tests/crime.test.ts`; `treasury`'s every-demo history test now has 15 minutes, as it ran past 400 s with three lines building at once, 2.5 minutes alone). The build passes. The smoke, as written, timed out waiting for frames at its first quarter turn (before anything of this slice's) while two other lines' smokes ran, so I ran a copy outside the repo with its timeouts loosened and every check the same. It found one failure, the old J-cycling check, which didn't know of crime; with that fixed in `smoke.mjs` the check passes on its own, and everything else, this slice's checks included, passed. `npm run measure` hit the background time limit both times (the baseline's part way through the frame-work section, this slice's before every demo's load), so the loads were measured side by side instead.

**Measurements:** see the check-in.

