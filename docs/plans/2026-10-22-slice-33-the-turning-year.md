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

(To be filled in when the slice is built.)
