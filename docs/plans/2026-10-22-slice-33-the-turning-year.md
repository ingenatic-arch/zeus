# Slice 33 — The turning year

*22 Oct 2026. Phase 5, "Ambitions, empire and a deeper city" (`docs/specs/2026-10-21-ambitions-empire-and-a-deeper-city-design.md`), the city line's second slice (wave 2), built at the same time as slices 34 (Vassals and allies) and 35 (Monuments) on their own lines. Builds on slice 30 as merged into the trunk (`1af5f81`).*

## Goal and check-in

The spec's words, and Oliver's choice (21 Oct, "look and rhythm"): four seasons a year, the game's year keeping its length. "The land goes from green spring to gold summer to a grey-green winter. Crops ripen and are reaped in season, herds breed in spring, and winter storms slow ships and keep most armies home." The land's colour, the trees, the fields, the sea and the weather (rain, the odd storm) follow the season; a season dial in the top bar says what's coming ("Autumn: the harvest in 12 days"). And the leftover the spec gives this slice: the camera no longer ends up inside trees on hillsides.

Findings carried over from slice 30's review, also in this slice: `#thieves`' core gets a watch post (whose round keeps off the hut street); the crime overlay tints homes from a quarter tempted, as their panel names it; a thief caught with the tax office's coin after the office is gone hands it back to the treasury.

**Oliver can:** open `#seasons` and play a year at speed, watching the land go from green to gold to amber to grey-green, the fields ripen faster through the summer and the granaries fill in autumn; open `#winter` to see the grey bay under rain and the Tyrian ship late.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#seasons`: `#town`'s town played on to the last days of February, opening at the fastest speed over the farms on the flood plain, the granary and the core, with the Husbandry tab of the side panel open (what the land gave). The season dial counts down to spring.
- `#winter`: `#richtown`'s town played on into January, with the Tyrian ship held back by winter storms (her chip says she is late and why), opening over the bay in the rain.
- `#seasons-paused`, `#winter-plain` and the rest combine as before. Every earlier token keeps working.

## Not in this slice

Snow (Greece's coast hardly sees it; winter is grey-green and wet). Day and night. Festivals tied to seasons (the festivals of Greece keep their own calendar). Seasons on the map of Greece (rivals' harvests already have their own). Rival wars between themselves held back in winter (rivals.ts is the Greece line's; noted for slice 34 or 40). Fire risk moved by the weather. Your own expeditions held back in winter (an expedition is your choice: it still goes, at its usual pace).

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets; the spec's *parallel plan* binds: one new top-level state field (`season`), new demos in a block headed "// Slice 33", state version 29 on this line with a `fromSlice33` migration that only fills in its own field (if absent), edits to shared files kept few and in a block of their own. Raids, the trading ship's and routes' ships and the fleet belong to other lines: they change only through small hooks that call `src/sim/seasons.ts`, listed under *Touched outside the line*.
- Sim code stays pure and deterministic. The season is a pure function of the tick (tick 0 is 1 March, the first day of spring; a season is three months, 900 ticks), so it never drifts and needs no state of its own beyond a switch. The weather (fair, rain, storm) is a hash of the city's seed and the day, never a draw from the state's generators, so nothing else's random numbers move.
- **The switch.** `season.on`: off in a bare state (so every existing test plays as before), on as a new game starts, on from the first tick of every demo's history, and on as an old save loads. With it off, everything is exactly as at the starting commit, the look included.
- **Histories change on purpose** (the spec: "seasons move every harvest"). Every demo's history is played with seasons on. The demo probe (outside the repo) compares every earlier demo at opening, 900 ticks on and a year on with the baseline (people, money, food in the stores, levels); every one that moved is named in the check-in, and none may open in famine (homes going down for want of food) because of it. Where a demo's history depends on a moment that seasons move, its setup is retuned to open on the same kind of moment.
- **A town's food over a year stays about where it was.** The paces below average to 1 over the year, so a fully worked farm, grove or flock makes what it made before in a year; only when it comes changes. Pressure you can see coming: the season dial and a town line say when winter will run the granaries short.
- The renderer and UI only read sim state; every action is a command. Static build, `base: './'`, all art in code. Seasons tint the land, trees, sea and sky through the city look's palette and shaders (`src/render/finish.ts`) and the trees' colours, not new meshes. `-plain` links keep working (with a lighter seasonal tint, or none).
- Judge by screenshots, tune by eye, never claim it looks or feels right on Oliver's behalf.

## Before

Measured at `1af5f81` (the trunk with slice 30 merged), headless Chromium with software WebGL at 1920 × 1080, with the other lines building at the same time (the machine's load about 10 to 12 on 4 cores):

| What | Before |
|---|---|
| Tests | 457, all passing (as merged; counted again below) |
| Download (gzipped) | the game and the prepared towns as built at `1af5f81` (see the check-in's table) |
| Loads | the bare link and a few demos, side by side with this slice's build at the end (the full `npm run measure` runs past the two-hour limit for a background job on this machine) |
| `#town` | 693 people, 322 dr at opening; 786 people and 932 dr 900 ticks on; 1,040 people a year on |

Software WebGL on a machine shared with three other builders: frame and load times swing by a third or more from run to run, so only large changes count.

## Design decisions

**The calendar** (`src/sim/seasons.ts`, new). `seasonAt(tick)`: spring (March to May), summer (June to August), autumn (September to November), winter (December to February), each 900 ticks; `seasonOf(s)` is that when the switch is on. `seasonNews(s)` for the dial: the season, its day, the days to the next, and what's coming, in words.

**Rhythm.** A pace for each season, averaging 1 over the year:
- *Wheat* (farms): spring 0.9, summer 1.1, autumn 1.4, winter 0.6. A crop grows by its workers times the pace, so fields ripen fastest in autumn and slowest in winter: most harvests come in late summer and autumn, and the granaries fill then. The farm's panel says when its harvest comes with the season's pace in it, and why ("Autumn: the wheat ripens half again as fast").
- *Olives and grapes* (groves, vineyards): spring 0.8, summer 1.0, autumn 1.6, winter 0.6 ("picked in autumn"). The press and the winery work through the year from what the groves and vineyards hold.
- *Goats and sheep* (the dairy's cheese, the pasture's fleece): spring 1.4, summer 1.1, autumn 0.9, winter 0.6 ("herds breed in spring": kids and lambs, milk and shearing).
- *The wild herds* grow back a head twice as fast in spring, as usual in summer, half as fast in autumn and winter (2, 1, 0.5, 0.5).
- With the switch off every pace is 1.

**Winter at sea.** A ship due to sail in winter (the Tyrian ship, a sea route's ship) is held back by the storms: her next visit is late by 6 to 12 days (a hash of the seed and her day), and her chip and line say so ("late: winter storms in the gulf"). Enemy ships in the bay row at three quarters of their pace in winter, and the days to the beach count it. (`seasonLate`, `seaPace`.)

**Winter on land.** A hostile ruler's own threat (the monthly roll in raids.ts) whose band would march in winter is held back two times in three ("keeps his men home for the winter"). A threat already counting down keeps its word, a tribute refused still angers, and a lender's army still comes. (`armiesHome`.)

**The weather.** Spells of three days: rain on about a quarter of spring and autumn days, few in summer, nearly half of winter's, and the odd storm in winter and late autumn (`weatherOn(s, day)`). Only the look and the dial read it; ships' lateness is the season's.

**The look** (`src/render/seasons.ts`, new; finish.ts, trees.ts, water.ts, sky.ts, world.ts). A continuous year phase from the tick, blended between four keyframes (spring is close to today's look, so the founding looks as it did): grass fresh green in spring, gold in summer, amber and russet in autumn, grey-green and darker in winter; the trees' leaves follow more gently (pines and cypresses barely, scrub and broom more); the sea bluer in summer and greyer in winter; the sky and haze paler and greyer in winter; rain as streaks around the camera, heavier and with a darker sky in a storm. All through shader uniforms (one shared set), so it costs no new meshes and changes no geometry. With `-plain` the trees and ground get a lighter vertex tint.

**The fields.** A farm's rows already show its crop's growth (green to gold) and a grove's olives and a vineyard's grapes their ripening; with the seasons' paces they now ripen in season.

**The season dial** (top bar, in a block of its own). A small round dial in four colours with a hand at today, the season's name, and what's coming ("Summer · the harvest in 12 d"; "Autumn · harvest · winter in 30 d"; "Winter · storms · spring in 20 d"; "Spring · lambing · summer in 34 d"). Its tooltip has the season's paces in words and the granaries' wheat against what the town eats. A town line (`season`) warns in late autumn when the granaries won't last the winter at its pace ("Winter in 15 days: the fields give little until spring, and the granaries hold about 5 weeks of bread").

**The camera** (`cameraRig.ts`). Its floor is the ground under it or the top of the plants near it, whichever is higher, plus a little: the trees' crowns are worked out once into a coarse grid (cleared plants drop out), and the floor eases rather than jumps.

**Findings.** `#thieves`: a watch post in the core (placed so its round doesn't reach the hut street; checked in the history). The crime overlay: amber from a quarter tempted (`TEMPT_SHOW`), as the panel names it, columns still from half. A thief's purse from the tax office is marked as the treasury's (`food = -2`), so a catch hands it back to the treasury even when the office has since gone.

## Tests

- **Determinism** (existing, with the new demos in the prepared towns), and a town played a year with seasons on gives the same state twice.
- **The calendar:** tick 0 is spring, each season 900 ticks, the year 3600; the paces average 1; with the switch off every pace is 1.
- **Rhythm:** a fully worked farm over a year with seasons on brings in the same as with them off (within a harvest), more of it in autumn than in winter; a grove's picking likewise; a dairy makes more in spring than in winter; a wild herd regrows faster in spring.
- **Winter at sea:** a trading ship due in winter is late by 6 to 12 days and her line says so; one due in summer is on time.
- **Winter on land:** over many seeded months, hostile rulers' threats whose bands would march in winter are rarer than in summer; a threat already made in autumn still brings its band.
- **Saves:** a version 28 save (slice 30's) loads through `fromSlice33` with seasons on and plays on; a save round-trips the switch.
- **Findings:** the caught thief's treasury coin with the office gone; the overlay's tint (by reading the threshold).
- The existing suite. `smoke.mjs` opens `#seasons` (the dial's words, the land's look changing over a season at speed) and `#winter` (the late ship's chip, the rain); `measure.mjs` adds them.

## Tasks

1. Plan (this file), with the baseline measured. Commit.
2. Sim: `seasons.ts` (calendar, paces, weather, lateness, armies), the switch and its command, state and migration, the paces in production and wild, the hooks in trade, routes, fleet and raids, the panels' harvest timing; the findings in crime; tests. Commit.
3. Render and UI: the season look (land, trees, sea, sky, rain), the dial, the town line, the camera. Commit.
4. Demos: every history with seasons on, retuning any that moved off their moment; `#seasons` and `#winter`, their views, smoke and measure; `#thieves`' watch post; look and tune from screenshots. Commit.
5. Full checks, the demo probe, measurements, As built, the check-in. Commit, push.

## As built

Built as planned, with these differences and choices:

- **Stages.** The plan's stages 2 to 4 (sim, render and UI, demos) went in as one commit (`8d57ebb`), because the demos' histories had to be retuned against the sim and the look tuned against the demos before the suite was green; each stage was typechecked and its tests run as it went.
- **The calendar and paces** are as planned (`src/sim/seasons.ts`). The wild herds' pace (2, 1, 0.5, 0.5) is applied to a head's regrowth clock, not to the herd's size. The panels' harvest and picking times run through the seasons ahead (`ticksToGrow`), and the farm's, grove's, vineyard's, dairy's and pasture's panels name the season's pace ("Autumn: the wheat ripens half again as fast").
- **The weather** is three-day spells, rain odds 25%, 7%, 30% and 45% (spring to winter), a storm in 12% of autumn's rainy spells and 35% of winter's; only the look and the dial read it.
- **Winter at sea.** The Tyrian ship's and the sea routes' visits due in winter are put back 6 to 12 days (`stormDelay`, a hash of the seed, the ship and the day she was due), kept in `season.late` so the chip and lines can say so ("80 d · late"; the tip: "late: winter storms in the gulf held her back 10 days"). Enemy ships in the bay row at three quarters in winter, and `daysToBeach` counts it.
- **Winter on land.** In raids.ts's monthly roll, a hostile ruler's new threat whose band would march in winter is skipped two times in three (`armiesHome`, hashed). Threats already made, refused tributes, lenders' armies and expeditions are untouched.
- **The look.** Shared shader uniforms (`SEASON_UNIFORMS`) added to every material finish.ts patches: the ground's vegetation (weighted by its greenness and flatness, not the sand or cliffs) and the plants' green parts tinted and desaturated by the season, everything a little darker when wet. The sea (`Water.setLook`) goes greyer in autumn and winter and bluer in summer; the sky and fog greyer in winter and in rain, the sun and sky light dimmer, with a lightning flash every few seconds in a storm. Rain is one `LineSegments` draw of 2,600 streaks in a box that follows the camera (`src/render/rain.ts`). Each season holds its look for three quarters of its length and turns into the next over its last quarter. With `-plain` the finish's shaders are off, so the land isn't tinted; the sea, sky, light and rain still follow the season (the plan said a lighter tint: none was needed to keep `-plain` working, and I left it so).
- **The camera** keeps 0.6 above the crowns of the trees and rocks near it: `Plants.canopyAt` reads a per-tile grid of crown tops (each crown widened by 1.2 tiles), rebuilt when plants are cleared; the lift eases up quickly and down slowly.
- **The dial** sits under the date: a small four-colour dial with its hand at today, the season's name and what's coming ("Winter · storms · spring in 9 d"), rain or storm when it is wet, and the season's whole line in its tooltip. The tooltip names the paces in words; it does not give the granaries' wheat against what the town eats (the winter town line does that).
- **The winter town line** (`need: 'season'`, a grey cloud over a sheaf) from the last month of autumn until spring, when the granaries and stalls won't cover winter's shortfall at the farms' 60%. In the demos the granaries hold more than enough, so it doesn't show in any of them; a test drives it.
- **Findings.** `#thieves`: a watch post at (60, 39), the west end of the core's north street: its round reaches all 71 road tiles of the core and stops 6 short of the hut street (38 road tiles away, the round 32). The crime overlay's amber is from `TEMPT_SHOW` (a quarter), as the panel names it; columns are still from half. A thief's purse from the tax office is marked `TREASURY_COIN` (`food = -2`), so a catch pays it back to the treasury when the office has gone.
- **Histories, retuned where seasons moved their moment:**
  - `town()` (`#town` and every demo built from it) plays on, a fortnight at most, until no food line says homes are going without and (but for `#richtown`) a tent stands on the newest plots: with the seasons a few core homes were a week past their food as it opened. `#town` now opens 15 days later (tick 8,550, was 8,400).
  - `#villas` and `#winevendor` play on, a fortnight at most, until every villa has wine.
  - `#rivals` (and its three demos) plays on, three months at most, until every route has had a visit.
  - `#athensship` (and `#anchor`, `#pirates`) waits for a window the treasury can pay her fee and her wine in (+450 dr).
  - `#pirates` waits for the shipyard, its road, a trireme and a month's wages before the fleet goes in.
  - `#black` opens once wages have gone unpaid while her sail is on the horizon (with the seasons the treasury held more, and the first of the month that found it dry came a few days after her sail showed).
  - `#overhunt` plays on, half a year at most, until the deer are down to their last few head: its lodges go in at the end of February, and with the deer growing back twice as fast in spring they were not yet thinned three months on. It opens in September (tick 5,480, was 4,200).
  - `#raid`, `#raiders`, `#aftermath` and `#looted` switch fire risk on as the band nears the edge, not weeks before: with the seasons, a month of risk on the unwatched farm row had an ordinary fire take the farms and the granary.
- **Tests changed, and why.**
  - crime: the tax office purse is now `TREASURY_COIN`; the temptation test reads the score just before the home's own daily step (the seasons moved the day).
  - town: the warned-days bound is 400 (the fleece vendor's round, moved by the seasons).
  - wild: over-hunting is watched 240 days (the herds regrow faster in spring and slower in autumn and winter).
  - raids: the plunder test records what was held each tick until the take (carts arrive during the band's walk); the goods test adds 2,000 oil (April's presses had made little).
  - stockbook: it looks at October, when the presses are busy (March's were idle).
  - debts: it fills the storehouses' oil room before setting the yard's oil (porters had carried it back).
  - rivals: it adds 600 oil before the caravan's visit.
  - seasons (new, 17 tests): the calendar, paces, rhythm (a farm's year the same within a harvest, most in autumn), grove, dairy, wild herds, ships late in winter, the late ship's line, armies home, the weather's odds, the switch, a year twice the same, a slice 30 save (`tests/fixtures/slice30-nowatch.save.json.gz`), the winter line, `#thieves`' core watch post, the treasury's coin.
- **Smoke** (`scripts/smoke.mjs`, each change in a "Slice 33" comment):
  - `#quay`'s ship may now be late (her first call falls in winter), so its chip and panel checks accept "late".
  - `#aftermath`'s ledger check no longer asks for the wheat line or burnt houses. With the seasons' history Sparta's band reaches the edge at the end of a month (its date is pinned a year after the first trade route, which moved nine days earlier), so the wheat it took is two months back by the time the demo opens and off the two-month ledger; and this band burnt a farm on its way, not houses. It still asks for the coin taken and that nothing it plundered burnt. I tried holding the refusal back so the band would come early in a month, but its date is pinned by the first route, so that would have meant moving the whole history.
  - `#raiders`' hover check accepts the tip of one of the band's men (the pointer can fall on one where the band now stands).
  - `#thieves`' panel check accepts the tempted home's other reasons: the most tempted home can now be a newcomer's tent, tempted for want of work with villas near, not hunger.
  - `#seasons` is read paused (at the fastest speed a slow page was well into spring before the first check), and the speed is checked on the bare link after.
  - `#festival`'s wine price check accepts the festival as the second reason: with the seasons' history the 600 wine bought from Athens weighs more in her price ("Dear (usually 71): you bought 600 from them in the last year, and the Panathenaia is on").
  - `#hostile`'s gift is pressed once more in the page itself if the first click didn't send it. Under load the Greece page can be redrawn between the press and the release, and the click is lost (three full runs in a row failed there, with no gift on Corinth's page; run on its own it passed every time).
- **Not done from the plan:** a test of the crime overlay's threshold (it is a renderer constant; the overlay and panel now share `TEMPT_SHOW`), and the dial's tooltip line on the granaries. The check of `#thieves`' core watch is weaker than planned: it checks that the hut street is never watched and that some core home is, not that every core street is, because watchmen walk little in a demo's history (fire risk is off).

### Touched outside the line

Other lines' files, through small hooks that call `src/sim/seasons.ts`, each in a "Slice 33" comment:

- `src/sim/trade.ts`: the Tyrian ship's due date put back by `stormDelay`, and her chip, short and lines with `lateWords`.
- `src/sim/routes.ts`: a sea route's next visit put back by `stormDelay`, and its line with `lateWords`.
- `src/sim/fleet.ts`: enemy ships' pace times `seaPace`, and `daysToBeach` with it.
- `src/sim/raids.ts`: `armiesHome` in the monthly threat roll.

Shared files, in "Slice 33" blocks: `src/sim/state.ts` (the `season` field, version 29), `src/sim/sim.ts` (the field in a fresh state, the `seasons` command), `src/sim/commands.ts`, `src/sim/migrate.ts` (`fromSlice33`), `src/game/saves.ts` (the field's check), `src/sim/status.ts` (panels' harvest timing and pace lines, the winter town line), `src/sim/production.ts` (the makers' pace), `src/sim/wild.ts` (the herds' regrowth), `src/sim/crime.ts` (`TREASURY_COIN`), `src/ui/townlines.ts` (the line's icon), `src/ui/topbar.ts` and `src/ui/style.css` (the dial), `src/render/overlay.ts` (`TEMPT_SHOW`), `src/render/finish.ts`, `src/render/world.ts`, `src/render/water.ts`, `src/render/trees.ts`, `src/render/cameraRig.ts`, `src/main.ts`, `src/game/demos.ts` (the switch in `calm()`, the retuned histories above, the Slice 33 block), `src/game/views.ts`, `scripts/smoke.mjs`, `scripts/measure.mjs`, and the tests named above.

