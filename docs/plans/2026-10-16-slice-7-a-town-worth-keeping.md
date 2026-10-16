# Slice 7 — A town worth keeping

*16 Oct 2026. Phase 1, "A living neighbourhood" (`docs/specs/2026-10-15-living-neighbourhood-design.md`). The last slice of the phase. Builds on slice 6, "Shrine and theatre", and its review.*

## Goal and check-in

The town becomes something Oliver can keep, listen to and show off. He can build a town, close the tab, come back and carry on: the game saves itself every few months once he has built something, he can save by hand, and the bare link offers to carry on where he left off. The coast sounds like a coast (the sea, birds, the town at work), all made in code, starting only once he clicks, with a mute button that remembers. A look-and-feel pass goes over the whole town (walkers that really walk, small details, light and the interface), and the walkers who bring water, bread, blessings and plays now go first to the homes closest to going down. A prepared town of several hundred people, every kind of house and building in it, is what he opens first after this phase, and it doubles as the frame-rate check.

**Oliver can:** build a town, close the tab, come back to it, and judge how the whole neighbourhood looks and sounds.

**Demo links** (bare hash tokens; a dash combines them):

- `#town`: the prepared town, running at normal speed: tents and new arrivals at its edge, huts, cottages, townhouses and fine houses, every service, farms across a bridge, the shrine and the theatre. The frame-rate budget's town.
- `#townstreet`: the same town at street level, among the fine houses, for the walkers and the details.
- `#continue`: carry on from the newest save in this browser (what the welcome card's Continue button opens). `#autosave` and `#saved` open the autosave or the hand-made save.
- The bare link (no hash): the coast, with a short welcome card pointing at the build bar and at `#town` (and, if there is a save, "Carry on with your town").
- Every earlier token keeps working: `#grow`, `#shrine`, `#priestess`, `#theatre`, `#actor`, `#fine`, `#compare`, `#closed`, `#people`, `#warning`, `#decline`, `#missing`, `#food`, `#vendor`, `#harvest`, `#chain`, `#workers`, `#bridge`, `#water`, `#carrier`, `#fountain`, `#streets`, `#settlers`, `#build`, `-overlay`, the views and the speeds.

## Not in this slice

Music (a later phase); several save slots or named saves (one autosave and one hand-made save); saves that travel between browsers or devices; settings beyond mute; anything beyond the city.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- Sim code (`src/sim/`, `src/map/`) stays pure and deterministic: seeded RNG in the state, no `Math.random`, `Date`, `performance` or timers (the purity test enforces it). Every player action reaches the sim as a command through the queue. Saving, loading and sound live outside the sim (`src/game/`, `src/audio/`) and only read it, except that a load replaces the state before the game starts.
- The renderer and the UI only read sim state. Static build, `base: './'`, no runtime network requests, all art and sound generated in code.
- Browser storage is per viewer and can be missing or throw: every read and write is wrapped, and the game is fully playable without it.
- Judge by screenshots, tune by eye, never claim it looks, sounds or feels right on Oliver's behalf.
- The walker change touches every earlier demo: they need not hash the same, but each earlier check-in's promises are re-checked (scripted runs, recorded in As built).

## Before

Measured at `99b1c81` (the end of slice 6's review), headless Chromium with software WebGL at 1920 × 1080:

| | Before |
|---|---|
| Tests | 101 in 10 files, all passing; typecheck clean |
| Bundle | 3 files, 815 KB raw, 229 KB gzipped |
| Load (local, headless, page clock) | ready at 1.14 s, first frame at 1.39 s; coast bake 0.44 s, scene build 1.06 s |
| Opening / close views | 542 k triangles, 125 calls / 376–403 k, 69–76 |
| `#streets` | 389 k, 88 (overview 563 k, 144) |
| `#water` | 511 k, 112; overlay 545 k, 114; carrier 491 k, 104; overview 652 k, 156 |
| `#food` | 458 k, 125; overlay 491 k, 126; vendor 438 k, 116; harvest 510 k, 135; chain 533 k, 144; overview 616 k, 174 |
| `#warning` | 470 k, 129; decline 460 k, 124; people 472 k, 128; missing 552 k, 154; overview 649 k, 187 |
| `#fine` | 488 k, 134; with what's missing 522 k, 138; compare 491 k, 134; theatre 433 k, 109; overview 662 k, 190 |
| `#closed` | 482 k, 151; overview 655 k, 207 |
| Where the calls go (`#fine` overview) | plants about 76 meshes in 12 chunks (most cast shadows, so twice); homes 6; workplaces 13; walkers 9 |
| GPU objects | 43 geometries, 4 textures |
| Main-thread update per frame, paused / running | `#food` 0.50 / 0.88 ms; `#fine` 0.42 / 0.98 ms |
| Demo setup (node) | `#food` about 1.0 s, `#closed` 0.9 s |
| A save's size (plain JSON of the state) | 310–420 KB (the four services' street records are 260 KB of it) |
| Frame rate | not measurable headless (1–1.5 fps under software rendering) |

Earlier check-in promises, scripted at `99b1c81` (the numbers the walker change is checked against): `#warning` 7 warned, 26–31 days left, mended at once all clear by day 14 with no drops; `#decline` 3 days, 7 drops in 10 days; `#missing` with two farms 22 drops, back to cottages by day 176; no drops over two years in `#food`, `#workers`, `#bridge`, `#shrine`, `#theatre`, `#fine`; `#closed` 16 warned (6 with three needs, 9 plays only), the most urgent 11.5 days out, left alone 59 drops in 240 days, rebuilt and mended at once 15 drops and all 38 fine again by day 69; `#grow` played through with two farms 0 drops and 38 fine, without them 17.

## Design decisions

**Saves** (`src/game/saves.ts`, `src/ui/saves.ts`).
- *What a save is*: the whole `SimState` as plain JSON inside a small envelope: `{ format: 'zeus-remake-save', save: 1, label: { date, people, money, homes }, savedAt (the wall clock, shown only as "saved 3 minutes ago"), view (the camera), state }`. Everything the sim knows goes with it: buildings with `since`, `religionUntil`, `cultureUntil`; households with `came`, `warned` and their stories; every walker mid-round with her trail, carts with their loads, the four services' street records, both random generators, the undo stack (kept, so undo works after a load exactly as before it; it only reaches back a month anyway). Pending commands are applied before saving (what the next tick would do first). The command log is not saved: replay starts from the save.
- *Version*: `SimState` stays at version 6 (its shape doesn't change in this slice; v6 is the first version anyone can save). The envelope has its own number. Loading checks the envelope, the state's version, and the shape of every field the game reads (lists are lists, numbers are numbers, the tile grid is the map's size); anything else fails with a plain message ("This save is from an older version of the game (version 5), so it can't be opened. It's still kept; your autosave and save slots are untouched until you save again.") and the game opens on the coast as usual. Nothing in a bad save can crash the start.
- *Two slots*: the autosave and your save (made by hand). Autosave every three game months, and when the page is hidden or closed, but only once you have built something in this session (or carried on from a save), so looking at a demo never overwrites your town. Your save only changes when you press Save.
- *Where*: `localStorage`, each read and write in try/catch. A probe write at start decides whether saving works here; if not, the save menu says "Saving isn't available in this window (private browsing or blocked site data). The game plays as normal; nothing will be kept." and the buttons are greyed. A write that fails (full storage) says so in the menu and keeps the game running.
- *Loading*: through the link. Continue (or a slot's Load button) sets the hash to `#continue`, `#autosave` or `#saved`, and the page starts on that save, so no half-swapped state is ever drawn. After loading, the hash is cleared (so a reload doesn't load again by surprise), the camera returns to where it was, and a short note says "Carried on from your autosave of June 748 BC".
- *Interface*: a scroll button in the corner beside the compass opens a small parchment menu: Save now (with when it was last saved), the two slots with their date, people and drachmas and a Load button, and whether autosave is on. Ctrl+S saves too.

**Sound** (`src/audio/sound.ts`), all WebAudio, nothing loaded.
- *Starting*: no audio context until the first click or key press (browsers require it), and none at all while muted. The mute button sits in the corner; the choice is remembered (in try/catch storage).
- *Ambience*: the sea, a looped noise bed through a low-pass filter, swelling slowly like waves, with a brighter wash of surf on each swell; louder when the camera is near the shore, softer inland and far out. Birds: short sparrow-like chirps and the odd longer trill at random moments, panned left and right, more over land than over the sea; now and then a gull over the bay.
- *The town*: a soft gravel crunch when a road is laid, a wooden knock when a building or plot goes down, a crumble for clearing, a soft "no" for a refusal, a little two-note chime when a home goes up a level (and a low falling pair when one goes down), both only for homes near the view and rate-limited; soft footsteps and the creak of a cart wheel when walkers are close to the camera at street level.
- *Levels*: everything quiet by default (this is ambience under building, not a soundtrack); one master volume.

**Walkers head for the homes closest to going down** (finding handed over). Today a service walker's score for a home is when its service runs out (`waterUntil` and so on), so a home that went without longest (or one that has just gone down and has a fresh two months) wins over one a few days from dropping. Now:
- A home that needs the service for its level scores by its *deadline* for it: when it would go down for want of it (`missingSince + DECLINE_AFTER`; `missingSince` counts from a drop, so a home that just went down is not the most urgent any more).
- A home that only wants it to grow (a tent wanting water, a hut bread, a cottage blessings, a townhouse plays) scores by when its supply runs out plus the same `DECLINE_AFTER`, so among homes that still have their service the order is exactly today's.
- *Too late*: where she would arrive after the deadline, the home counts as lost for this round (a large penalty), so she goes where she can still save someone, and only goes to the lost one when there is nobody else to save.
- Where nobody is warned the order is unchanged, so towns with no warnings play exactly as before; the earlier demos with warnings change, and are re-checked.

**Seeing a shortfall coming** (finding handed over). A calm line under the top bar, readable without hovering, shown only while something is short:
- *Bread*: when the farms grow less than the town eats: "Bread: the farms grow about 570 measures a month and the town eats about 580. Another farm would keep it fed. The granary holds enough for 4 months." A short-handed farm is named first, as in the tips.
- *Workers*: when jobs go unfilled: "Workers: 6 jobs unfilled. The theatre has 2 of 5. More homes near it by road would help."
- Each line can be clicked to fly to the place it names (the granary, the short-handed building).

**Placing a workplace beside no road** (finding handed over): the placement preview turns amber and the tip says plainly "No road beside it: nobody could work here, and its carts couldn't leave. Place it beside a road." (for a farm; the same idea for every workplace). Beside a road that joins no homes: "No homes reach it by road yet: it will stand empty until they do." It can still be placed (the road may come next).

**`wantOf` cache** (finding handed over): whether the city has a shrine and a theatre is worked out once per change of the buildings (`rev`), kept outside the state (like the road-distance cache).

**The look-and-feel pass**, tuned by screenshots:
- *Walkers walk*: legs and arms swing in step, in the vertex shader, phased by where each walker stands, so feet don't slide and anyone standing still stands still; settlers, carriers, vendors, the priestess, the actor and porters all walk. The ox plods.
- *Fewer draw calls* (finding handed over, measured first): the plants are most of the calls (about 76 meshes in 12 chunks, most also drawn into the shadow map); homes are six. So: the homes in each chunk are merged into one mesh (every house kind, vertex colours, one draw and one shadow draw), with a home that is rising into place drawn on its own until it has settled; and if it is clean, the plants of each chunk that share a material are merged the same way, with the sway kept per plant. Measured before and after.
- *Details, light and interface*: whatever the screenshots of `#town` show wanting, within the slice: small street life (pots, carts, washing) where cheap, the light's warmth, the top bar and the new cards in the same parchment style.

**The welcome card** (bare link): small, warm, brief: "The coast is yours to build on. Lay a road in from the edge of the map (T), mark housing plots beside it (H), and settlers will come. Hover anything to see what it needs; ? lists every key. Or open `#town` for a town that's already grown." With a save in this browser it leads with "Carry on with your town (June 748 BC, 345 people)" and a Continue button. Dismissed by its button, by Esc or by starting to build.

**`#town`**: a new town on the east bank of the river, between the flood plain and the bay, built through the command queue over about two game years in stages, so it has grown outwards: an old quarter by the shore round the agora, the shrine and the theatre, grown to fine houses; townhouses round it within the priestess's reach but beyond the actor's; cottages further out; a newer quarter up the slope with its own fountain, beyond the vendor's reach, of huts; and plots marked last at the edge, where settlers are pitching tents. The main road comes in from the east edge; the farm road crosses the river by a bridge to farms on the west bank's flood plain, with the granary on the town side. It opens at normal speed, framed from over the bay. It has to hold up for a long look: checked for churn over two game years.

**Publishing**: `scripts/publish-prep.mjs` (`npm run publish-prep`) builds and writes `publish/index.html` as a body-only page (first lines: `<title>Zeus Remake</title>`, an inline style for `html, body` height 100%, no margin, no overflow and the background colour, the stylesheet link and the module script with relative `./assets/...` paths, then the `#app` markup), copies the assets beside it and prints their paths. `publish/` is gitignored.

**Four-need signs** (finding handed over): no demo is contorted to show one. A screenshot step pokes a few homes in `#fine` (through a debug hook on the test probe) to lack one, two, three and four needs, and the sign layout is judged from that.

## Tests

- Saves: a save made mid-everything (walkers mid-round, carts loaded, the porter out, settlers and leavers on the road, homes warning and counting down) through the real encode and decode carries on identically to the game that never stopped, in `#closed` and in `#town`; the undo stack survives and still undoes; a save of the wrong version, a damaged save, a save with a missing field and plain garbage all fail with a plain message and never throw out of the loader; storage that throws on every call, or is missing, gives "not available" and never throws; a full storage write fails gracefully.
- Walkers: on a hand-made street, a walker at a junction goes to the home a few days from dropping rather than one that ran out longer ago but has just gone down or has longer left; a home she can't reach in time doesn't take her round from one she can save; with no warnings anywhere, choices are as before (every earlier town without warnings hashes the same at load).
- The earlier demos' check-in promises (scripted, recorded in As built), with the existing tests (water, food, households, warn-then-decline, churn, `#closed`, `#grow`) passing.
- `#town`: has every house level, every kind of building, a bridge and a few hundred people at load; no churn over two years (homes going down a level, beyond the newest edge).
- Shortfall lines: say the bread shortfall with numbers and the short-handed places; say nothing when all is well.
- The purity test still covers `src/sim` and `src/map`; sound and saves stay out of them.

## Tasks

1. Plan (this file). Commit.
2. Sim and game logic: the walkers' deadline rule; the `wantOf` cache; the shortfall words; saves (envelope, validation, safe storage, autosave rules); `#town`; tests; the earlier demos re-checked. Commit.
3. What Oliver sees and hears: the save menu and notes, the welcome card, the shortfall lines, the placement warning, the sound, the mute button, the walkers' walk, merged homes (and plants), `#town`'s views; smoke extended (saves, storage blocked, mute, the welcome card, `#town`). Commit.
4. Look and tune: build, drive it headless, screenshot `#town` and the earlier demos from several angles, look and adjust; four-need signs from the debug hook; measure before and after. `publish-prep`. Commit.
5. Full checks, "As built", the check-in. Commit, push, sync.

## As built

Commits: `9c5a03a` (this plan), `21872e1` (sim and game logic), `d9e8c49` (saves menu, sound, welcome card, shortfall lines, no-road caution), `ad62865` (smoke test), `7e3ff54` (merged homes and plants, walking legs, publish-prep), `1eb1315` (look and feel), and the check-in commit.

**What changed from the design above**
- *`#town`'s site and story*: the town stands on the east bank between the flood plain and the bay, but its road comes in from the **west** edge, up a lane on the west bank and over the bridge at the river's narrows (z 41), then along a main street through the wheat on the flood plain (seven farms and the granary, just over the bridge) to the town. Settlers walk the whole way in, so the road and the bridge are always busy. The core is a grid of fine houses round a fountain, the agora, the shrine and the theatre; townhouses and cottages stand along the street east of it round a second fountain and agora; the huts are a hamlet by the lane on the west bank with its own fountain; tents are on the newest plots at the hamlet's end. It is built through the command queue over 7,200 ticks (two years); it opens half a year after the last plots went down, because earlier the actor's first rounds left the far corner of the core warned about plays for a while. It is framed from the hills behind it (north), looking down over the core to the sea, the river, the bridge and the farms, which shows more of the story than the view over the bay did.
- *At load*: 635 people in 81 lived-in homes (5 tents, 21 huts, 10 cottages, 6 townhouses, 39 fine houses), 96 buildings, about 40 walkers, 101 of 101 jobs filled, no warnings. Over two game years: no home goes down a level, at most a home or two warned for a few days at a time (12 home-days in all), and the population fills up to about 1,290. Bread holds for about 18 months (the farms grow about 1,190 a month); after that the bread line appears, with the granary still full.
- *Saves*: as designed, with the slot buttons called Open, a two-click confirmation when the town on screen has changes not saved, and opening the hand save first keeps the town on screen in the autosave. "Start again on an empty coast" sits at the foot of the card. The note after opening a save reads like "Welcome back · June, 748 BC · 412 people". A save's label carries its tick too. A damaged undo list costs only the undo (dropped), rather than refusing the town. A `#town` save is 452 KB.
- *Autosave*: every three game months and on `pagehide`/`visibilitychange` (hidden), once the player has built, cleared or saved in this session, or opened a save; not when undoing, not when nothing has changed since the last save, and never while the page is reloading to open another save.
- *Welcome card*: "A coast to build on", three numbered steps (road T, housing H, fountain B), a line pointing at the bar along the bottom, "Start building" and "See a grown town" (`#town`); "Carry on" with the save's date and people when there is one; a plain line when storage isn't available. It goes when a tool is picked. A save that can't be opened shows the reason at the top of the same card.
- *Shortfall lines*: under the top bar, in a stack with the follow chip and the overlay legend. A line shows after its shortfall has held three game days (or at once if it stands when the game opens, so a paused demo shows it) and goes after three days without. Clicking the bread line flies to the granary and turns the food overlay on; the workers line flies to the first short-handed place. When the rounded numbers would read the same it says "the town now eats a little more wheat than the farms grow (about 570 measures a month)".
- *No-road caution*: every workplace (fountain, farm, granary, agora, shrine, theatre) shows an amber footprint and an amber caution line when no road is beside it. The "no homes reach it by road yet" line was not built.
- *Sound*: as designed, plus wind that rises as the camera goes up. No key for mute (M is the farm); it is a button in the corner, left of the saves button.
- *Look and feel*: walkers' legs swing about the hip in the vertex shader, phased by where they stand, and the bob follows the same stride; settlers' arms swing against their legs; the ox walks a diagonal gait; the long-robed women (carrier, vendor, priestess) only bob. Townhouses and fine houses have windows on their backs (the walls you see from the next street were blank). About four in nine cottages, townhouses and fine houses have a wisp of hearth smoke from the roof. The light was left as it was.
- *Draw calls*: settled homes, shrines, fountain stones and plot stakes are merged into one mesh per 32-unit chunk; a home rising into place is drawn instanced until it has risen (its chunk's merged mesh is rebuilt once when it starts and once when it ends). Plants are merged per 64-unit chunk into rocks, trees and grasses; the sway now reads where each plant stands from a per-vertex attribute.
- *Four-need signs*: `window.__zeus.warnAll(id)` (debug, screenshots only) makes a home lack every need it has; `node scripts/screenshots.mjs four-needs` shows a fine house in `#fine` with the four-icon sign, close up.
- *Publishing*: `npm run publish-prep` as designed; checked by serving `publish/` and opening `#town` from it.

**The earlier check-ins' promises, re-checked** (scripted at the end of the slice, same scripts as Before). Every earlier demo's state at load hashes exactly as before (the walker rule only changes choices where a home is warned, and the demos build without warnings). What moved: `#closed` rebuilt and mended at once, 7 drops (only the 7 cut-off homes, which were already past saving) instead of 15, the last on day 17 instead of 39, and all 38 fine again by day 47 instead of 69; `#grow` played through without the extra farms, 15 drops instead of 17. Unchanged: `#warning` 7 warned, 26–31 days left, all clear by day 14 with no drops; `#decline` 3 days, 7 drops in 10 days; `#missing` with two farms 22 drops, back to cottages by day 176; no drops over two years in `#food`, `#workers`, `#bridge`, `#shrine`, `#theatre`, `#fine`; `#closed` left alone 59 drops; `#grow` with farms 0 drops and 38 fine. In `#grow` without more farms, the bread line shows from about day 127.

**After** (same machine and method as Before):

| | Before | After |
|---|---|---|
| Tests | 101 in 10 files | 118 in 12 files, all passing; typecheck clean |
| Bundle | 815 KB raw, 229 KB gzipped | 856 KB raw, 242 KB gzipped |
| Load (page clock) | ready 1.14 s, first frame 1.39 s | ready 1.02 s, first frame 1.26 s |
| Opening view | 542 k, 125 calls | 534 k, 57 |
| Close views (river, street, bay) | 376–403 k, 69–76 | 354–376 k, 26–30 |
| `#streets` / overview | 389 k, 88 / 563 k, 144 | 384 k, 42 / 562 k, 74 |
| `#water` / overview | 511 k, 112 / 652 k, 156 | 489 k, 54 / 652 k, 82 |
| `#food` / overview | 458 k, 125 / 616 k, 174 | 426 k, 69 / 617 k, 102 |
| `#warning` / overview | 470 k, 129 / 649 k, 187 | 470 k, 84 / 650 k, 115 |
| `#fine` / overview | 488 k, 134 / 662 k, 190 | 494 k, 82 / 673 k, 114 |
| `#closed` / overview | 482 k, 151 / 655 k, 207 | 475 k, 98 / 666 k, 131 |
| `#town` / street / overview | (188 / 150 / 215 calls before the merging) | 650 k, 103 / 587 k, 89 / 766 k, 128 |
| Update per frame, paused / running | `#food` 0.50 / 0.88 ms; `#fine` 0.42 / 0.98 | `#food` 0.54 / 1.03; `#fine` 0.64 / 1.37; `#town` 0.72 / 3.4 |
| GPU objects | 43 geometries, 4 textures | 52 geometries, 4 textures |

The running update times include the sim's steps for about a second of game time per frame (headless frames come about once a second), so they overstate a real frame; `#town`'s also includes rebuilding a chunk's merged homes when one changes look.

## Review

Reviewed after `b079c01`. Commits: `9b2be63` (sound held while muted or hidden and chimes near the view only, the autosave note once a session and failures said, the bread line's lead time, the loading card's words, `debug-map.mjs`), `4741505` (Esc for the welcome and saves cards, a failed save repeated on the card, smoke checks, check-in corrections), and this note (with `measure.mjs` printing `#town`'s times by the page clock).

**What was wrong**
- *`#town`'s opening time* in the check-in (4 to 6.5 s) was Playwright's wall time, which includes its polling and the first one-second frames of software rendering. By the page's clock (new `probe.setupMs`): the 7,200 setup ticks take 0.46 to 0.64 s, ready at 1.55 to 1.86 s, first frame at 2.03 to 2.40 s (the bare link: ready 1.10, first frame 1.32). Under the ~1 s threshold for the sim part, so no snapshot or render-free fast path was built; the loading card now says "Shaping the coast and getting the town ready…" (and "Opening your town…" for a save link), set at module load before the first paint.
- *Sound*: `start()` created the AudioContext on the first gesture even when muted, and the sea and wind loops ran at zero gain for the whole session while muted, and on with the tab hidden (rAF stops, the loops don't). The rise and decline chimes fired for any home anywhere, with no rate limit (the plan said near the view and rate-limited). Gains and envelopes looked sane (master 1 into a −18 dB, 3:1 compressor, every one-shot scheduled to stop and left to GC; no clipping path).
- *The autosave note* flashed every three game months (about every 20 s at fastest), and an autosave that failed was silent.
- *The bread line* showed as soon as `eaten > grown`, so `#town` showed it from about month 18 with full granaries (about 5,000 stored against a shortfall of a few dozen a month).
- *Esc* did nothing to the welcome card (the plan said Esc dismisses it).
- *The saves card* forgot a failed save by hand once closed.
- *`scripts/debug-map.mjs`* had no colour for `TreeKind.Flowers` (7), so `buf.set(undefined)` threw.

**What changed**
- `sound.ts`: `begin` starts only when not muted; `setMuted(false)` calls `start()` (it runs inside the click); `hold()` suspends the context 400 ms after the master fades (muted or `visibilityState === 'hidden'`) and resumes it when wanted; `update()` does nothing unless running; `rise`/`decline` at most once a second (`lastCue`); `state` getter for the probe. `main.ts` plays a home's chime only within `8 + 0.6 × dist` of the view centre.
- `main.ts`: the autosave flashes once a session (`autoNoted`); a failure flashes once per distinct reason (`autoProblem`) and is passed to the card through `autosave()`. Esc / right-click without a tool: welcome card first, then the saves card, then as before. `probe.setupMs`.
- `status.ts`: `BREAD_LEAD_MONTHS = 6`; the bread line (with farms) needs `stored / (eaten − grown) < 6` as well as `eaten > grown`; the stores clause says "At this rate the granaries and stalls run empty in about N months" (or "within a month or so"; "nearly empty" under half a month of eating). The no-farm line is unchanged.
- `saveMenu.ts`: `problem` kept from `saveNow()` and shown when the card opens; the card shows the autosave's failure.
- Tests (119): `#grow` played on (shrine, theatre at day 90, no farms): at day 150 the town eats more than it grows with no bread line; the line comes within 200 days and names at most six months. Smoke: muted sound is `suspended`, nothing starts while muted, unmuting runs it, Esc dismisses the welcome card.

**Checked** (headless Chromium, scratch scripts; sim runs in vitest)
- *Load path*: Ctrl+S during a road drag saves the town without the half-drawn road, which lands on release; Ctrl+S with the household panel open saves; `#saved` opens with the hash cleared, and undo straight after removes the road and refunds 20 dr; a reload then shows the welcome card with Carry on; opening the autosave from the card with newer changes asks twice, the `leaving` flag stops `pagehide` overwriting it, and the town that opens is the autosaved one (173 roads, not the 178 on screen).
- *Storage*: a `#town` save is 463 K characters (488 K after two more years at 1,285 people; the four street records are 264 K of it, fixed by the map's size). Chromium took about 5.1 M characters in all before `QuotaExceededError`, so the two slots use under a fifth. With storage filled to the brim, Ctrl+S says "The browser’s storage for this page is full, so it couldn’t be saved." in the note, and now on the card.
- *Merged homes*: `#grow` with the shrine placed, at fastest, 14 frames screenshotted while 38 cottages became townhouses in about a month (rebuilds every frame or two): no missing or flickering homes seen. The code keeps a rising home out of the merged mesh and instanced until it has risen, rebuilding the chunk at both ends.
- *Plant sway*: the bend is the same size (local height above 0.15 × bend × the plant's scale); its direction is now world x for every plant (before, each plant's own rotated x), which reads more like one breeze. Paused screenshots of `#fine`, `#compare`, `#food`, `#missing`, `#people`, `#bridge` and `#grow` match slice 6's apart from the two new corner buttons and `#missing`'s bread line.
- *The walkers' rule*: `#closed` mended at once rerun: 7 drops, the last on day 17, all 38 fine by day 47, as the check-in says. `#grow` without farms: bread line day 136, first bread warning day 355, first drop day 440.
- *Bread in `#town`* over two years: the town eats more than it grows from day 536; stores stay between about 3,900 and 6,500; no bread line, no warning, no drop.
- *Invariants*: typecheck clean; 119 tests in 12 files pass; build 858 KB raw, 242 KB gzipped; smoke ok; measure: draw calls unchanged from As built, `#town` update per frame running 3.9 to 5.4 ms across runs (the sim plus chunk rebuilds over about a second of game per headless frame).

**Notes for the next slice**
- *Merged-home rebuilds*: a 32-unit chunk of fine houses is around 100 k vertices (`fineA` alone is 2,709), rebuilt twice per change of look. A 20 s CPU profile of `#town` running put `MergedChunks.set` and `fill` at about 1.5 ms a frame on average, in spikes. If Oliver sees hitches on a laptop: 16-unit merge chunks, reused typed arrays, or a home kept instanced for a while after it changes.
- *Legs at rest*: the leg swing comes from where a walker stands, with no "moving" input, so a walker standing still keeps whatever pose that spot gives (sometimes legs apart). A per-instance moving flag (instance colour alpha, or an attribute) would fix it.
- *The autosave and demos*: building in any demo starts the autosave, so it holds whichever town was built in last (the check-in now says so). If Oliver wants demos never to touch it, gate `autosaving` on the demo (except `#town`).
- *Save size*: the street records (`walked` and `exits` for four services, 16,384 each) are over half of every save; sparse or run-length encoding would halve saves if more slots come.
- Unused cues: `click` and `arrive`. Merged plants' shadows don't sway (the default depth material), as before the merge.
