# Slice 22 — A world of rivals

*19 Oct 2026. Phase 3, "Greece beyond the walls" (`docs/specs/2026-10-17-greece-beyond-the-walls-design.md`). The eighth and last slice of the phase. Builds on slice 21, "Greece goes on", and its review.*

## Goal and check-in

The spec's words: a prepared demo town trading with every city, with a request open, a threat brewing and a war between rivals, for judging the look and checking the budgets. The world's numbers tuned across a few years of play; a look-and-feel pass over the map, the traders, the raiders and the panels. The per-frame cost of a big town (phase 2's finding: batching the homes that are rising a level), and other rough edges Oliver would notice.

This slice adds no new system. It puts everything the phase built into one town and tunes it so it reads well over years rather than minutes. A prepared town on the bay trades with every city of Greece, by land and by sea: caravans from Corinth, Sparta and Athens walk its streets to the yard, and ships from Athens, Corinth and Troy tie up at the quay beside the Tyre ship. A ruler has a request open, another's threat is running towards its deadline, and two rivals are at war on the map. The world's pacing (how often wars, requests, offers, tribute and raids come; how many traders are in the streets at once; what gifts and routes cost and are worth) is checked over five to eight years of play, left alone and looked after, and tuned where it is too busy or too quiet. The map, the traders and the raiders get a look-and-feel pass by screenshots. Every demo now opens from a town prepared when the game is built, rather than playing its history in the browser, so they all open within the 3-second budget.

**Oliver can:** open the prepared town, play it for a few years, and judge whether Greece feels alive and whether he can always see where he stands with each ruler and why.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#rivals`: the prepared town, over the city. Every route open (Corinth and Athens by land and sea, Sparta by land, Troy by sea, and the Tyre ship as ever), caravans in the streets and ships at the quay or in the bay, a request open, a threat running towards its deadline, two rivals at war on the map.
- `#rivalsmap`: the same town with the map of Greece open, so the war, the traders on the roads and lanes, the threat's seal and the News of Greece are the first thing seen.
- `#rivalstreet`: the same town at street level, where the caravans come down the main street to the yard.
- Every earlier token keeps working, each also with `-paused`, and opens faster.

## Not in this slice

New systems: alliances, colonies, soldiers and walls, fighting raiders, wars that come to your map, your own routes closed by a war in their way, festivals for Troy and Tyre (all recorded for later phases). Sound changes. A new map or starting place.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- Sim code (`src/sim/`, `src/map/`) stays pure and deterministic; everything random is a hash of Greece's seed, as before. Money moves only through `pay` / `income`.
- **Earlier towns are untouched unless tuning changes a history on purpose.** The demo probe (outside the repo) plays every earlier demo at the commit before this plan and after, and compares the whole city at opening and 900 ticks on, leaving out the redraw counters (slice 21's review: `rev` and `looks` made a demo look changed when only redraws differed). Any demo whose history moves because of tuning is named in the check-in, with why, and its What to try steps re-checked.
- A demo opened from its prepared town must be the same town its setup makes: the build checks every prepared town against the state it came from, and a test plays a prepared and a freshly set-up town on side by side.
- Old saves still load: the state version is bumped only if the state changes, with a migration.
- The renderer and UI only read sim state; every action is a command. Static build, `base: './'`, no runtime requests beyond the game's own files, all art generated in code.
- Judge by screenshots, tune by eye, never claim it looks or feels right on Oliver's behalf.

## Before

Measured at `bfbd838` (the end of slice 21's review), headless Chromium with software WebGL at 1920 × 1080:

| | Before |
|---|---|
| Tests | 346 in 28 files, all passing (slice 21 after its review) |
| Bundle | 4 files, 1,446 KB raw, 429 KB gzipped |
| Load, bare link (page clock) | ready 1,499 ms, first frame 1,901 ms |
| `#town` | 799,168 triangles, 83 draw calls, save 145 KB; setup ticks 858 ms, ready 2,135 ms, first frame 2,822 ms |
| `#richtown` | 910,707 triangles, 95 draw calls, save 183 KB; setup ticks 1,364 ms, ready 3,191 ms, first frame 3,911 ms |
| Work a frame, running | `#town` 7.75 ms (1.49 paused), `#richtown` 10.43, `#richstreet` 12.61, `#caravan` 2.75, `#tribute` 5.85, `#raid` 6.28, `#raiders` 7.41, `#war` 7.21, `#festival` 5.01 |
| Map pages | `#war` 314,506 triangles / 33 calls, `#festival` 306,230 / 34, `#raid` 306,218 / 26; the map's first open built in 238 ms |
| Demo load (page clock, ready) | over the 3 s budget: `#richtown` 3.19 s, `#villas` 3.23, `#blaze` 3.41, `#rubble` 3.44, `#raiders` 3.70, `#prices` 3.59, `#famine` 3.06, `#hostile` 3.24, `#request` 3.04, `#tribute` 3.53, `#raid` 3.31 (each demo's setup ticks take 0.85 to 2.2 s of it) |
| The 85 demos | each one's opening and a hash of its whole city state at opening and 900 ticks on (redraw counters left out), recorded outside the repo |

## Design decisions

**Prepared towns** (the load budget, and the cost behind it). Every demo with a history is played once when the game is built, in Node, by a small Vite plugin (`scripts/prepared.ts`), and its state is written as a save in the format the browser's saves already use. Identical towns (twelve demos share `#town`'s) are written once. Each prepared town becomes its own chunk, fetched only when its demo is opened; the bare link's bundle doesn't grow. The page decodes it instead of playing the history, so a demo opens in about the bare link's time plus its scene. The build checks each prepared town by decoding it and comparing it with the state it came from; if anything differs, or the chunk can't be fetched, the page plays the setup as before. Prepared towns are cached under `node_modules/.cache/` by a hash of the sources they come from (`src/sim`, `src/map`, `src/game`), so a rebuild that changes none of them takes no longer than before. In `npm run dev` each demo is prepared when first opened. The tests can read the same cache (see Tests).

**`#rivals`** is built from `#richtown`'s town (928 people, every chain, villas, the quay), not `#town`'s, so it has enough to trade and to pay for six routes:
- the north road and the caravan yard, as `#caravan` builds them; the routes opened one by one as the treasury allows, each with what its city buys and sells ticked (selling the town's surplus, buying wine and fleece it is short of);
- played on with the routes for about a year, so the prices have moved, the rulers have memories of trade, Greece has its own news;
- then what the dice haven't brought by then is set up for the demo and named so on its page, as earlier demos do: a request open from one ruler, a threat from another (Troy's queen or king, who has no demo for a sea raid yet, if the dice allow), and a war between two rivals whose armies are on the map at the first zoom;
- opened when caravans are in the streets and a ship at the quay.

**Tuning: how it is checked.** Scratch runs outside the repo play `#town`'s and `#rivals`' towns, and the bare link, for five to eight game years, left alone (nothing answered) and looked after (requests met when the stores hold enough, tribute paid when it can be, threats paid off, gifts now and then), and count: wars and the gaps between them, feuds, requests, offers, tribute and threats per year per ruler, raids and what they cost, caravans and ships in the city at once, what gifts and routes cost against what a route earns. The numbers before and after go in the check-in. Defaults for the targets (Oliver can change any):
- a war in Greece about every two years, never much more than three years between them;
- a ruler's requests now and then (a few a year across Greece once you trade with everyone), never two from one ruler running back to back;
- raids rare and recoverable: a ruler kept hostile raids at most about once every two years, and a town that ignores everyone loses some fields, not half its people;
- one caravan per route in the city at a time;
- a gift worth what it costs against a route's yearly earnings.

**Look and feel.** By screenshots, over `#rivals` and the earlier demos: armies and raid bands readable at the map's first zoom (bigger figures, or a marker that stays the same size on screen); city labels clear of the fields, of each other and of the City (Tab) button (Troy's label sat under it); the News of Greece list; caravans waiting at the yard gate side by side rather than on top of each other; the traders and raiders in the city; the city's page.

**Rough edges from the reviews**, handled where Oliver would notice: a request made during a war gets a deadline that ends with the war; the Karneia's words while Sparta is at war; a migrated save announcing a festival already on; the Rivals tab built only when shown; the gift buttons' road search cached; a dear price whose every push is clamped still named; the vague "you sold them a good deal of it lately"; the tax floater drawn over the side panel; the frame cost of homes rising a level (refill only what is rising, not the whole chunk, each frame).

## Tests

- **Prepared towns:** a prepared town decodes to exactly the state its setup made, and played on 900 ticks beside the freshly set-up one stays identical (`#rivals`, `#caravan`, `#raiders`).
- **`#rivals`:** every route open and trading, a request and a threat open, a war on, caravans and a foreign ship in the city; plays a year on with the ledger invariant holding.
- **Tuning:** where a number changes, the tests that pin it are moved with it; the determinism, independence and save tests keep passing.
- **Test runtime:** the demo towns the tests set up come from the shared cache when it is fresh (set up once, serialised), so the suite doesn't play the same history in every file.

Plus the existing suite and the demo probe. `smoke.mjs` opens `#rivals`, `#rivalsmap` and `#rivalstreet`; `measure.mjs` adds them, and reports the prepared towns' load.

## Tasks

1. Plan (this file), with the baseline measured. Commit.
2. Prepared towns: the build plugin, the cache, the page's opening from a prepared town, the check; tests. Commit.
3. Tuning: the scratch runs before, the changes, the runs after; rough edges in the sim. Commit.
4. `#rivals`, `#rivalsmap`, `#rivalstreet`; the look-and-feel pass by screenshots; rough edges in the UI and renderer; the homes' frame cost. Commit.
5. Smoke and measure extended; full checks, measurements, As built, the check-in. Commit, push.

## As built

(Filled in at the end of the slice.)
