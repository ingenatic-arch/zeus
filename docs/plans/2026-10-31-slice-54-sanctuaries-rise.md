# Slice 54 — Sanctuaries rise

*31 Oct 2026. Phase 7, "Beloved of the gods" (`docs/specs/2026-10-31-beloved-of-the-gods-design.md`). The Temples line's first slice (wave 1), built in the worktree `/home/claude/zeus-temples` on `claude/p7-temples`, beside the Olympus, Legends and Epiphany lines. It starts at `11f9290` (the phase 7 groundwork, state version 48).*

## Goal and check-in

The spec's words: "The `sanctuary` building (5×5) for any of the twelve, its stages, ox carts, builders, consecration, priests and its panel. Twelve looks from one builder; neglect dims it."

A great sanctuary is a staged work like a smaller monument: you choose the god, mark out a 5 × 5 precinct for coin, and the masons' builders raise it in three stages from marble and timber that the ox carts haul from the stores, the last stage needing copper (cast into bronze by an armoury's smiths) and a measure of the god's sacred good to consecrate it. The god notices each stage. Finished and staffed, it is a standing honour, and its priests walk further than a shrine's priestess, blessing homes. Left without workers for a season, it dims and the honour lapses.

**Oliver can:** open `#sanctuaries` and `#sanctuary`, mark one out from the Mythology tab (the Sanctuary button asks which god), watch it rise, open its panel, and compare the twelve finished side by side in `#twelve`.

**Demo links** (bare hash tokens):

- `#sanctuaries`: a city with three sanctuaries at different stages (one marked out, one with its temple rising in scaffolds, one with its statue going up) and one finished and staffed, its priests out.
- `#sanctuary`: a site just marked out, the ox carts bringing marble up the road.
- `#twelve`: all twelve finished in a row, to compare.
- `-paused`, `-plain` and `-modern` on each, as for every demo; every earlier token keeps working.

## Not in this slice

Dedicating shrines, rivalry, neglect of gods, festivals, offerings and the Olympus panel (slice 53, on the Olympus line). The god's visit when the sanctuary is finished (slice 56: I leave a named place for it). Blessings (slice 57: a named empty slot on the panel). The god's home in the city (slice 58). No new wares.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets; the spec's *parallel plan* binds.
- **State version 49 locally**, with `fromSlice54` in `migrate.ts`, hooked by `if (st.version === 48) fromSlice54(st);`. It fills only this slice's own fields, only where absent, and assumes nothing of other lines' fields. Its note at the top of `migrate.ts` reads "Slice 54 (Sanctuaries rise): …". Tests compare with `SIM_STATE_VERSION`.
- **Kinds appended**: `sanctuary` at the end of `BUILDING_KINDS`, `priest` at the end of `WALKER_KINDS`, the `sanctuary` command at the end of the command kinds, the `sanctuary` message kind at the end of `KINDS`.
- **Shared files** (state, migrate, sim, commands, main, demos, prepared, smoke, measure, categories, sidepanel, help, CHECKINS): few edits, in blocks headed "Slice 54"; nothing reordered or reformatted.
- **Moods only through the groundwork's API** (`honour`, `assert`, `moodOfGod`, `reasonsOf`, `moodWord`); I add no mood maths.
- The map's size from the land (`map.size`), never `MAP_SIZE`; news through `say`; the panel a section in the building-panel registry, built from the kit.
- **Monuments behave exactly as before**: the generalising of `monuments.ts` and `monumentworks.ts` must leave every monument demo opening and running identically (checked by the demo probe and the monument tests).
- Sim code pure and deterministic (no random numbers at all here); player actions are commands; money only through the treasury; the renderer and UI only read.
- Judge by screenshots at 1920 × 1080 in the original look (and a glance at `-modern` and `-plain`); never claim it looks right on Oliver's behalf.

## Before

At `11f9290`, on a loaded machine (four lines building at once on 4 cores; the load average reached 28).

| What | Before |
|---|---|
| Tests | 803 in 60 files, all passing (the groundwork's own run at this commit). My full run here under the load had `tests/hazards.test.ts`'s "every demo opens with no fire risk or wear anywhere…" time out (31.3 s of its 30 s); I stopped that run to build, so the count stands on the groundwork's |
| Download, loads and frame work | the loosened `measure.mjs` on `dist` built at `11f9290` in a scratch copy (numbers added with the As built, measured side by side with the slice's) |

## Design decisions

**The building.** One new kind, `sanctuary`, 5 × 5 (`isGrand` in `buildings.ts`: the game had 2, 3, 4 and 6), with the groundwork's `god` field on the building record saying whose it is. One per god per city: the tool refuses a second ("Your city has its sanctuary to Demeter already: …"). It costs **1,200 dr** to mark out (the monuments cost 1,500 to 2,500). It has no workers while it rises; finished, it takes **8** (priests and temple servants). It neither burns nor wears (marble, as the monuments).

**Its record and stages**, in `s.monuments.sites` beside the monuments' (the spec's choice), so the masons' yards, the ox carts and the builders serve both:
- A site's `kind` is now a monument's or `'sanctuary'`, with `god` (sanctuaries only) and `idle` (when a finished sanctuary lost its last worker; 0 while staffed or rising).
- `monuments.ts` gains `stagesOf(site)` and `materialsOf(site)`, and a stage gains an optional sacred good (`ware`, `sacred`). The monuments' stages, materials and order are unchanged; every reader that indexed `STAGES[x.kind]` goes through `stagesOf`.
- The stages (the same for every god but the last's sacred good): marked out (the coin); **the foundations** (160 marble, 80 timber; 4 builders, 60 days); **the temple** (320 marble, 160 timber; 6 builders, 80 days); **the statue and finish** (120 marble, 120 copper for the bronze, cast only while an armoury has smiths, and the god's sacred good: 200 measures of a food, 100 of oil, fleece, wine or copper, 16 sets of armour, 8 horses; 6 builders, 70 days). One fully staffed masons' yard (4 builders) does the work in about 285 days and the carts haul the first stage's materials in a month or so: about a year. Two sanctuaries sharing that yard: about two.
- The ox carts haul the sacred good from whichever store holds it (a granary's wheat, meat or cheese; a storehouse's oil, fleece, wine, copper, armour or horses).

**The god notices** (through `honour` and `assert` only, whatever the gods' switch says: a sanctuary exists only where the player built one, so no older town's history moves):
- each stage finished: +6 (foundations), +8 (temple), +10 (consecrated), each fading over two years;
- finished, standing and staffed: **+18 "your sanctuary to Demeter"**, asserted as it is finished and re-asserted on the first of every month, never fading while it lasts;
- without workers for a season (90 days), it dims: the standing honour is forgotten until its workers return (a message says so, and so does its panel).

**The place "sanctuary finished" happens**: `sanctuaryFinished(s, site)` in `sanctuaries.ts`, called by `monumentworks.ts`'s `finish` for a sanctuary. Slice 56's visit is called from there at merge.

**Priests.** A finished, staffed sanctuary sends priests (walker `priest`) in a crew of up to three, like the shrine's priestesses, on the religion round with half as far again to go (48 road tiles of reach, 96 of fresh road a round), blessing every home they pass for four months, exactly as a priestess does. They wear their god's colour.

**Messages** (kind `sanctuary`, under Works): marked out, each stage finished, finished and consecrated, dimmed (a warning) and staffed again.

**Exports for other lines:** `sanctuaryOf(s, god)` (the site record, or undefined), `sanctuaryDone(s, god)` (finished and standing), `sanctuaryFinished(s, site)` (the hook), `SANCTUARY_COST`.

**The look** (`src/render/sanctuary.ts`, one builder with per-god parts, in the original look's colours): a walled court with a gate on its road side, a stepped temple at the back with a ring of columns, a pitched tiled roof and a pediment band in the god's colour, an altar before it, two trees, banners in the god's colour, and the god's statue on a plinth in the court in their own pose, colour and emblem (Zeus's thunderbolt and eagle, Hera's peacock, Poseidon's trident and a horse, Demeter's sheaf and the kore, Athena's owl, spear and an olive tree, Apollo's lyre and a laurel, Artemis's bow and a deer, Ares' spear and a trophy, Aphrodite's dove, Hephaestus's hammer and anvil, Hermes's caduceus and a herm, Dionysus's vines and a cup). Each stage looks different: stakes and cords on a levelled pad; the stylobate laid course by course; the columns rising in their scaffold with the crane; the roof on and the statue rising; finished. A dimmed sanctuary is drawn dimmer. Priestesses at the altar in `jobfolk.ts`.

**The UI.** One Sanctuary button on the Mythology tab; picking it opens a chooser of the twelve as cards (emblem drawn in code in the god's colour, name, what they're god of, their sacred good), those already built greyed out with the reason; choosing one puts the tool in hand for that god, and its tip says whose sanctuary it places. The panel (`PANELS.sanctuary` in the registry, on the kit): the god's emblem and name, the three stages with their bars and what each is missing, the god's mood word and top reasons (read through the API), the staff and the priests, and two empty slots named for slice 53's festival and offering buttons and slice 57's blessing.

## Tests

`tests/sanctuaries.test.ts`:
- placement: 5 × 5 footprint and roads beside it; one per god (a second refused with the reason, another god's allowed); the cost through the treasury (ledger holds);
- stages: materials wait on site, hauled by ox cart (the sacred good from a granary for Demeter), the bronze waits for smiths, builders from the masons' yard, the three stages in order, finished;
- the god notices: stage memories through `reasonsOf`; the standing honour finished and staffed; dimmed and lapsed after a season without workers, back when they return; forgotten when it is taken down;
- priests: sent only when finished and staffed, bless homes further than a priestess's reach;
- determinism: the same commands give the same state;
- saves: a round-trip with a sanctuary rising; a version 48 save (built by hand) loads through `fromSlice54`, and a version 47 one through both steps;
- the existing monument tests unchanged and passing.

The demo probe: every earlier demo opens exactly as at `11f9290` (date, people, money, homes, levels, buildings).

## Tasks

1. Plan (this file), with the baseline. Commit.
2. The sim: the kind and footprint, the generalised sites, `sanctuaries.ts`, the command, priests, honours, neglect, messages, the migration, tests. Commit.
3. Render and UI: `src/render/sanctuary.ts`, the priests' look, jobfolk, the minimap, the button and chooser, the tool's tip, the panel. Commit.
4. Look and tune, with the demos `#sanctuaries`, `#sanctuary`, `#twelve` (setups, views, smoke and measure entries): screenshots at 1920 × 1080, all twelve side by side. Commit.
5. Full checks (tests, build, the slow smoke, the measure, every demo opening, version 47 and 48 saves), As built, the check-in. Commit, push.

## As built

Commits on `claude/p7-temples`: `1db4787` (this plan), `d6155c7` (the sim), `d349ee5` (render, UI and demos), `cfc0b6f` (the look tuned, smoke and measure), `52d379f` (the sanctuaries' message icon, which the kit's test asks for), and the check-in.

**As planned:** the `sanctuary` kind (5 × 5, 1,200 dr, 8 jobs once finished and none while it rises), one per god; the three stages and their materials and builders; the ox carts hauling the sacred good from whichever store keeps it; the god's notice of each stage (+6, +8, +10, fading over two years), the standing honour (+18, asserted when finished and on the first of each month while staffed), dimming after 90 days without workers and the honour forgotten until workers return; priests (a crew of up to three, 48 tiles of reach and 96 of road a round against the priestess's 32 and 64) in their god's colour; the messages; the chooser, the tool's tip, the panel with its two named empty slots; `fromSlice54` and state version 49.

**Changed from the plan, by eye:**
- **The twelve told apart by their roofs and forms.** The first look (a white temple and a red-tiled roof for every god, the god's colour only in the frieze, pediment, banners and statue) made all twelve read the same at the classic zoom. Each roof is now glazed in a tone of its god's (Zeus's in marble tiles), Aphrodite's and Hermes's temples are round tholoi under a cone of tiles, and each god has a side court beside the temple, wide enough to read from afar: Zeus's oak, Hera's irises, Poseidon's pool, Demeter's wheat, Athena's olives, Apollo's laurels, Artemis's wild grove, Ares' yard of arms, Aphrodite's roses, Hephaestus's smoking forge, Hermes's herms, Dionysus's vines. The banners are larger.
- **The chooser opens beside the side panel** (by its button), not over an open building panel.
- **A mood of 0 shows in a neutral tone** on the panel's bar.
- The Mythology tab's tip names the sanctuaries (in the Slice 54 block of `categories.ts`).

**The demos:** `#sanctuaries` (#quarry's town, a year on, with masons' yards and an armoury added, and coin and materials put on site as "set up for this demo" in the ledger and the stock book: Athena's finished and staffed with her priests out, Poseidon's statue going up, Apollo's temple rising, Demeter's just marked out, Athena's panel open); `#sanctuary` (the same town, only Demeter's marked out and the first ox cart on its way, its panel open); `#twelve` (#quarry's town with a new road east of its streets, its coin given as "set up for this demo", and all twelve finished in two rows of six; their stages are completed directly in the setup, a demo shortcut, so its messages and the gods' memories show only the finishing).

**Exported for other lines** (`src/sim/sanctuaries.ts` unless named):
- `sanctuaryOf(s, god)`: the god's site record, or undefined.
- `sanctuaryDone(s, god)`: finished and standing.
- `sanctuaryFinished(s, site)`: the "sanctuary finished" hook, called by `monumentworks.ts`'s `finish` for a sanctuary; slice 56 calls the god's visit from here at merge.
- `sanctuaries(s)`, `sanctuaryName(god)`, `sanctuaryRefusal(s, god)`, `dimmed(s, site)`, `STANDING_HONOUR`, `PRIEST_RANGE`.
- `SANCTUARY_COST` (`build.ts`); `stagesOf`, `siteMaterials`, `isSiteKind`, `sacredMeasure` (`monuments.ts`).
- `SANCTUARY_SLOTS` (`src/ui/sanctuarypanel.ts`): `offerings` for slice 53's festival and offering buttons, `blessing` for slice 57's.
- `godEmblem(god)` and `godColourCss(god)` (`src/ui/godemblems.ts`): the twelve emblems drawn in code, for the gods' other cards.

**Touched outside the line** (beyond the shared files the plan names):
- `src/sim/monuments.ts`, `monumentworks.ts`, `monumentstatus.ts`: generalised to sites of either kind (`stagesOf`, `siteMaterials`, the store predicate for the ox carts, "no granary has any"). The monuments' stages, materials, order and words are unchanged; every monument demo opens identically (below).
- `src/sim/heard.ts`: the stuck-site regex also matches "no granary has any"; a sanctuary's news is its own.
- `src/render/monuments.ts`: `stagesOf` in place of `STAGES[x.kind]`.
- `src/sim/buildings.ts` (the name, the jobs, `isGrand`, `sideOf`), `build.ts`, `hazards.ts`, `messages.ts`, `status.ts`: the new kind's entries.
- `src/game/saves.ts`: a site may be a sanctuary to a known god, and has a finite `idle`.
- `src/game/tools.ts`: the sanctuary tool (the god chosen, its refusal and tip, the command).
- `src/render/city.ts`, `jobfolk.ts`, `walkers.ts`, `pictures.ts`; `src/ui/buildbar.ts`, `buildingpanel.ts`, `ledger.ts`, `minimap.ts`: the new kind's and walker's entries.
- `src/ui/icons.ts`: the sanctuary message kind's icon (a small temple), in a Slice 54 block after `MESSAGE_ICONS`.
- `tests/monuments.test.ts`: its helper reads a site's stages through `stagesOf` (`STAGES[x.kind]` no longer types for a site that may be a sanctuary).

**Checks** (on a machine with three other lines building: load average 30 to 50 on 4 cores; see the check-in's Measurements for the table):
- `npm test`: 809 tests in 61 files. Under the load, 768 pass, 37 time out and 4 fail. One failure was real and is fixed: the kit's test wanted an icon for the new message kind (`52d379f`). The other three time themselves on the clock. Rerun with long timeouts on 2 workers, 283 of the 288 tests in the 21 affected files pass. Of the 5 left: the two land-bake times and the routes replay fail the same way on `11f9290` run beside them; the routes and trade replays pass in a scratch copy with longer timeouts; the every-demo wages test ran out of its 20 minutes, and the three new demos pass it alone.
- `npm run build` succeeds.
- The slow smoke passes with every slice 54 check. It ran in four parts, because the whole would not fit in the two-hour limit. The one failure is `#jailbreak`'s popup, gone before the smoke could click it (slice 51); that step also fails on `11f9290` run alone under this load.
- The demo probe: all 167 earlier demos open identically to `11f9290`. That covers date, money, people, homes, levels, buildings and every count in the probe's city.
- Version 47 and 48 saves of `#monument` and `#town`, made by the code at `11f9290^` and `11f9290`, load to 49, play a quarter on and save again.
- The measure: triangles and draw calls identical in every earlier view. The game is 20 KB larger gzipped. There are three more prepared towns (126 KB gzipped). `#twelve` is 1.94 M triangles and 129 draw calls.

**Review** (a fresh reviewer, on the same loaded machine; focused checks, as the brief allowed). Fixed:
- `#sanctuary` and `#sanctuaries` stalled when played on: `#quarry`'s town has no loggers' camp and no copper mine, so Demeter's foundations waited for timber for ever and Apollo's statue for copper. `supplyStorehouse` in the Slice 54 block of `demos.ts` puts the timber and copper still wanted in the storehouse at the end of each setup (noted as bought, "set up for this demo"), with more copper than the statues need because the armoury's smiths fetch theirs from the same storehouse; `#sanctuary` gains an armoury. Measured in node after the fix: `#sanctuaries` finishes Poseidon's 34 days after opening, Apollo's after 191 and Demeter's after 403 (404 days from marking out). In `#sanctuary` (one yard, the storehouse across town, marble only as the quarry cuts it) the foundations start on day 100, the temple on day 230 and the statue on day 350, which puts the finish at about day 455, about fifteen months, not the year the check-in said. The town's masons' yard burns on about day 440 if nobody builds a watch post (warned first). With a storehouse near the site and two yards (a scratch test on `#quarry`), the foundations start on day 17 and the temple is done by day 180.
- A sanctuary's stuck-site fact was filed as a `monument` message: `heard.ts` now files it as `sanctuary`. When both a granary's food and a storehouse's good are short, `monumentstatus.ts` says "no storehouse or granary has any", and the `heard.ts` pattern takes that wording too. A monument's wording is unchanged.
- `fromSlice54` no longer pads the buildings' goods arrays (no new ware, and the parallel rule says it fills only its own field).
- The sanctuary tool's tip was one line about 1,200 px wide (the tip never wraps). It now gives a line to each stage.
- The chooser moved down (`top: 112px`) so it no longer covers the Greece button.
- The build button's hint says "a year or more with one masons' yard, longer when the stores are far from it".
- The check-in now gives the measured time. It also says `#twelve`'s scroll and memories show every stage, all on one day; it had said they showed only the finishing.

Review checks:
- Typecheck passes and the build succeeds (the demos re-baked).
- 14 test files with long timeouts pass, 131 tests: sanctuaries, monuments, saves, determinism, pantheon, purity, kit, categories, messages, loadorder, materials, treasury, stockbook and preparedtowns. The full suite was not rerun.
- The smoke ran its slice 32, 35, 48 and 54 blocks, and opened `#achieved`, `#empire`, `#estates`, `#colonyworks`, `#town`, `#order`, `#shrine` and `#priestess`. All passed with no page errors.
- Twelve older demos open identical to `11f9290`'s probe: `#monument`, `#lit`, `#games`, `#achieved`, `#empire`, `#quarry`, `#loggers`, `#estates`, `#colonyworks`, `#town`, `#order` and `#storerules`.
- The real version 47 and 48 saves of `#monument` and `#town` load to 49, play a quarter on and save again.
- The check-in's steps were walked at 1920 × 1080 in all three looks. The chooser was opened beside a building panel and was readable. Hermes's sanctuary was marked out: 1,200 dr were taken and his card was greyed afterwards.
- A shortened measure against the base (`11f9290`) at 1920 × 1080 gave identical triangles and draw calls for `#monument`, `#lit`, `#games`, `#quarry`, `#town`, `#empire` and `#order`. The new demos came in under `#empire`/`#order`: `#sanctuaries` had 1.50 M triangles and 94 calls, `#sanctuary` 1.43 M and 83, `#twelve` 1.94 M and 129. The game itself grew from 998 to 1,018 KB gz. Frame work was taken at a load average of about 13, so the readings are noise: `#quarry` was 38 then 32 ms, `#empire` 69 then 53, `#sanctuaries` 79 (6 frames) and `#twelve` 34. They need a rerun on a quiet machine.

**Touched outside the line** (added by the review): none beyond the files already listed (`heard.ts`, `monumentstatus.ts`, `tools.ts`, `buildbar.ts`, `demos.ts`' own block; `migrate.ts`' `fromSlice54` and `sanctuary.css` are this line's own).
