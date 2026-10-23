# Slice 39 — Ambitions

*22 Oct 2026. Phase 5, "Ambitions, empire and a deeper city" (`docs/specs/2026-10-21-ambitions-empire-and-a-deeper-city-design.md`). A fourth line in wave 3, built at the same time as slices 36 (the great houses, city line), 37 (colonies, Greece line) and 38 (contested seas, works line), on branch `claude/p5-ambitions`. It starts at `3c9eb51`, the trunk with slices 30 to 35 merged (state version 33).*

## Goal and check-in

The spec's words: the laurel chip and the Ambition panel with all three ambitions side by side, counting from the founding; five milestones per ambition, each with what it wants and how far you are, their rewards, and the great monument at the end; playing on after. Colony and estate milestones wired in at merge.

The game gets a direction. Three **ambitions** run side by side from the founding, and there is nothing to pick (**Oliver's choice, 21 Oct: "Chase all three at once"**): every town works toward all three, and whatever you do counts toward one of them.

- **Master of Greece**: vassals and colonies, an army feared across Greece. Its great monument is the Colossus.
- **The great trading city**: routes, trade and the richest treasury. Its great monument is the Lighthouse.
- **A city of wonders**: monuments, grand estates and a great population. Its great monument is the Stadium.

Each has **five milestones**, from easy to grand, each naming what it wants and how far you are ("2 of 3 vassals and colonies: Corinth and Argos"). Reaching one brings a town line, a short fanfare, a laurel on the panel and a small reward, named on the panel before you reach it. All five, and the ambition is achieved: its column says "Achieved in year 9", the city is proud of it, and the other two carry on. All three is the grand finish, with a word from every ruler; play goes on.

Where Oliver sees it: a **laurel chip** at the end of the top bar (the nearest milestone across all three, with a small bar and how far along), and the **Ambition panel** from it, the three side by side.

**Oliver can:** found a new town and see all three paths start at nothing; open `#ambition` to see a town a few milestones in across the three; open `#achieved` to see Master of Greece completed with the Colossus standing at the harbour mouth.

**Demo links** (bare hash tokens; `-paused` as before):

- `#ambition`: a town a few milestones in across the three, the Ambition panel open.
- `#achieved`: Master of Greece completed, the Colossus standing (the first look at a finished Colossus), the panel open.
- Every earlier token keeps working.

## Not in this slice

*Beloved of the gods* (the gods phase). Choosing an ambition (Oliver chose all three at once). Colonies and great estates themselves (slices 37 and 36): their milestones are defined here and count 0 until wired at merge. Gating monuments behind milestones (the spec's "the right to build the next monument" as a reward): monuments are buildable as slice 35 left them, so the rewards are gifts, fame and renown. `#empire` (slice 40).

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets; the phase spec's *parallel plan* binds this line: the state version is 34 here (renumbered at merge), with `fromSlice39` in `migrate.ts` filling in only this slice's field if absent, hooked in by one `if (st.version === 33)` line, its sentence in the notes as "Slice 39 (Ambitions): ...". No new ware, building, walker or round kind. One new command kind (`ambition`, the switch), appended. Edits to shared files kept few and in blocks headed "Slice 39".
- This line owns `src/sim/ambitions.ts`, `src/ui/ambition.ts`, the top bar's laurel chip, the ambition sounds and the Colossus's look. Anything else touched is listed under **Touched outside the line**.
- Sim code stays pure and deterministic: nothing here draws a random number. The milestones only read state that already exists.
- **Earlier towns are untouched.** The ambitions are switched off in a bare state and while a demo's history is played, and switched on as a game starts or a demo opens (as crime is): so every earlier demo opens with the same people, money and levels. Switched on, what the town already meets is recorded quietly (no fanfare, no reward). The demo probe compares every earlier demo at opening with the starting commit.
- Old saves load: a version 33 save (and a version 27 save through every step) goes through `fromSlice39` (on, nothing recorded; its first tick records quietly what it already meets).
- The renderer and UI only read sim state; the switch is a command. Money only through the treasury (a ruler's gift arrives through the existing gift path). Static build, `base: './'`, all art in code.
- Judge by screenshots, tune by eye, never claim it looks or feels right on Oliver's behalf.

## Before

At `3c9eb51`, headless Chromium with software WebGL at 1920 × 1080, with the other three lines building on the same machine. The loads and frame work are measured side by side with this slice's build (the stock `measure.mjs` times out on this loaded machine); the after figures are in the check-in.

| What | Before |
|---|---|
| Tests | 523, all passing (44 files) |
| Download (gzipped) | 3,869 KB: the game 766 KB, the prepared towns 3,103 KB (93 files) |
| Loads and frame work | side by side with this slice's build (see the check-in) |

## Design decisions

**The record** (`s.ambition`, one top-level field): the switch, whether the town has been looked at since it was switched on, the laurels won (each milestone's id, the tick, whether it was already met when the town was opened, and what its reward came to in words), when settlers drawn by fame stop, and when all three were achieved. An ambition's "achieved" is derived: the tick its last milestone was reached.

**Looked at once a day.** Each milestone not yet won is checked; met, it is won for good (a laurel is never taken back, even if a vassal later rises). Every milestone counts from the founding, in any order.

**The milestones** (thresholds tuned against the prepared towns; see As built):

| | 1 (easy) | 2 | 3 | 4 | 5 (grand) |
|---|---|---|---|---|---|
| Master of Greece | an army: 32 men under arms (two full companies) | a city bows to you: your first vassal or colony | feared across Greece: your army as big as the strongest in Greece (at least 40) | lord of three cities: 3 vassals and colonies | the Colossus standing |
| The great trading city | open for trade: routes to 2 cities | a busy market: 600 dr sold to the ship and traders in a month | trade with half of Greece: 5 cities (Tyre's ship counts) | the richest treasury in Greece (at least 10,000 dr) | the Lighthouse burning |
| A city of wonders | a thriving town: 600 people | streets of villas: 20 villas | grand estates: 2 great estates (wired at the merge of slice 36) | a great city: 2,000 people | the Stadium finished |

- "Greece" for the strongest army and the richest treasury is the ruled cities other than your vassals and Memphis (Egypt is not Greece).
- The colonies (wired at the merge of slice 37) count with vassals in milestones 2 and 4 of Master of Greece, so it can be achieved before colonies exist.
- The great monument's milestone shows its progress (`progressOf`) and stage.

**Rewards**, one each, named on the panel before you reach it:
- *A gift*: the warmest ruler sends 300 dr (or 1,000 for milestone 4), by road or sea as rulers' gifts already come (on the map of Greece, then the ledger's gift line and a News of Greece line).
- *Fame*: settlers drawn by fame: newcomers come twice as often for 3 months (6 for the grand ones); named in the population's tooltip.
- *Renown*: every ruler 5 warmer (10 for a great monument), fading over a year: a reason in each ruler's mood, "Your city's renown: ...".

**An ambition achieved**: its column says "Achieved in year N"; the warmest ruler's News of Greece line ("all Greece calls Nea Argos master of Greece now"); every home a little prouder for a year (+1, "Proud of their city: master of Greece"). **The grand finish** (all three): a line in the News of Greece from every ruler, in their own voice by their mood and traits, a town line, and every home +2 for a year ("All Greece speaks of our city"). Play goes on.

**The town line** (`ambition`, a laurel icon): the newest laurel for twelve days: "A laurel for the great trading city (2 of 5): a busy market. Settlers drawn by its fame come twice as often for 3 months." Clicking it opens the panel.

**The sounds**: `laurel`, a short salpinx call rising to the fifth with a lyre's chord; `triumph`, two salpinxes answering, the last call held and bells cascading, for an ambition achieved and the grand finish. Made in code like the others; the chip glows for a few seconds.

**The chip**: at the end of the top bar, a laurel wreath, the nearest milestone's name (the furthest along not yet won, across all three), a small bar and its percentage; its tooltip says what it wants, how far you are, which ambition, its reward, and the laurels won. **The panel**: three columns side by side, each with its emblem, name and what it is about, "N of 5 milestones" or "Achieved in year 9", and its five milestones: won ones with a laurel, the year and date and what the reward came to (or "already yours when this town was opened"), the rest with what they want, a bar, how far you are in words, and the reward.

**The Colossus's look** (slice 35's review: the bronze-frame stage's thin struts): thicker struts and hoops, and a check of the finished figure up close in `#achieved`.

## Tests

- **Determinism**: the same seed and commands with the ambitions on give the same state after N ticks, with a milestone and its reward in it.
- **Independence**: switched off (every demo's history), nothing changes; the earlier demos open as before (the demo probe).
- **Quiet on load**: a town switched on records what it already meets quietly, with no reward; a version 33 save comes up through `fromSlice39` and records quietly on its first tick; a version 27 save comes up through every step.
- **Milestones**: each one's progress reads what it should (army, vassals, routes, sales, treasury, homes, monuments); a reached one gives its reward (a ruler's gift on its way, fame quickening settlers, renown in each ruler's mood) and its town line; an ambition achieved by its fifth; a laurel stays won.
- **Save round trip** with laurels won; the ledger invariant with a gift arrived.
- The existing suite. `smoke.mjs` opens `#ambition` and `#achieved` and checks the chip, the panel and what they say; `measure.mjs` adds them.

## Tasks

1. Plan (this file), with the baseline. Commit.
2. Sim: `ambitions.ts` (the record, milestones, rewards, the look, the town line, pride), the switch command, migration, saves, the mood line; tests. Commit.
3. UI and sound: the chip, the panel, the town line's icon, the fanfares; the Colossus's look. Commit.
4. Demos `#ambition` and `#achieved`; look and tune by screenshots; smoke and measure. Commit.
5. Full checks, the demo probe, measurements, As built, the check-in. Commit, push.

## As built

**The milestones**, as planned. Where the prepared towns stand on them as they open (each recorded quietly, as a town opened):

| Town | Laurels | Master of Greece | The great trading city | A city of wonders | Nearest |
|---|---|---|---|---|---|
| `#town` | 1 | none | none | a thriving town | a great city, 37% |
| `#richtown` | 2 | none | none | a thriving town, streets of villas | a great city, 47% |
| `#fortress` | 5 | an army | open for trade, trade with half of Greece | a thriving town, streets of villas | feared across Greece, 76% (45 men; Sparta's 59) |
| `#greecegrows` | 6 | none | open for trade, a busy market, half of Greece, the richest treasury (35,816 dr; Rhodes' 25,786) | a thriving town, streets of villas | a great city, 71% |
| `#vassal` | 5 | an army, a city bows to you | a busy market | a thriving town, streets of villas | a great city, 70% |
| `#lit` | 3 | none | the Lighthouse | a thriving town, streets of villas | a great city, 70% |

A new game meets none (a test). No prepared town has the second Master of Greece milestone but #vassal's line; none has three cities; only #greecegrows is the richest in Greece (Memphis aside).

**The rewards**, one each:

| | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| Master of Greece | a gift of 300 dr | fame, 3 months | renown +5 | a gift of 1,000 dr | renown +10 |
| The great trading city | a gift of 300 dr | fame, 3 months | renown +5 | fame, 6 months | renown +10 |
| A city of wonders | a gift of 300 dr | fame, 3 months | renown +5 | a gift of 1,000 dr | fame, 6 months |

(The Stadium's reward is fame rather than renown: its games already bring every ruler's notice.) A gift comes from the warmest ruler by the rulers' gift path (`rulerGift`, its note "in honour of ..."), so it arrives on the map of Greece, then in the ledger as given. Fame runs the settlers' clock twice as fast. Renown is a memory in each ruler's mood ("Your city's renown: the Lighthouse"), fading over a year.

**The demos.** `#ambition` is #vassal's history played with the ambitions on from the founding, so its five laurels came in play with their rewards and dates (an army, Corinth bowed, a busy market, a thriving town, streets of villas); its rewards change its history, so it opens in December 746 BC with 1,393 people and 6,061 dr (after the review: 1,298 people and 6,319 dr, its first laurel a year sooner), where #vassal opens in January 745 BC. `#achieved` carries that town on: the Colossus on the shore west of the trading post (a one-tile spur off the quay road's end), three masons' yards by the quay; its 300 marble, 320 timber and 700 copper put on site at once (set up for this demo: the town has no quarry, and one mine would take years over the copper); 150 days to stand. Then an Arcadian and a Cretan company hired at the barracks (64 men against Sparta's 55) and Argos and Thebes bowed by awe (set up for this demo, and named so in their news lines), until Master of Greece's fifth is won. It opens in June 745 BC, year 6 (after the review: May 745 BC).

**The Colossus's look.** The bronze frame's struts are twice as thick (0.034, five-sided), in bright bronze rather than the darkest, with rings of bars round each leg and the body every so high and a brace across each face, the bars at his hips and shoulders and a ring for his head: it reads as a cast lattice in the shape of a man, apart from the timber scaffold's poles. His crown of rays now radiates all round his head (it stood up in one row, like a crest), his face has a nose, and the pale box on his chest is gone.

**A finding: the order the sim's modules load in.** At first folk.ts imported the homes' pride from ambitions.ts, which pulled diplomacy, monuments and world in ahead of their turn. That changed the order the sim's modules are first evaluated in, so routes.ts was evaluated before trade.ts, and its `CLEAR` (`BACK_TICKS + TURN_TICKS + 2 * TICKS_PER_DAY`, worked out as routes.ts loads, from trade.ts's exports) came out NaN: a visiting ship then saw the jetty as free while the Tyrian ship was due. Ten earlier demos opened differently (#anchor five months later). The demo probe caught it. The record, `achieved` and the pride now live in `src/sim/laurels.ts`, which imports only the clock; folk.ts, migrate.ts and state.ts read that. Every earlier demo opens as at `3c9eb51` again. The trap itself is the trunk's (routes.ts's module-level constants from another module of an import cycle), so the merges should rerun the demo probe.

**Wired at the merge:** `colonyNames` (slice 37: your colonies, counted with vassals in "a city bows to you" and "lord of three cities") and `greatEstates` (slice 36: homes at the great estate's level, for "grand estates"), both in `src/sim/ambitions.ts`, marked `// Wired at the merge of slice 37` and `// Wired at the merge of slice 36`. Until then they count 0.

**Touched outside the line**, each in a "Slice 39" block:
- `src/sim/state.ts`: the version (34), the `ambition` field, its type import.
- `src/sim/commands.ts`: the `ambition` command, appended.
- `src/sim/sim.ts`: the fresh record, `stepAmbition` after the errands, the command.
- `src/sim/migrate.ts`: `fromSlice39`, its hook and its note.
- `src/sim/folk.ts`: the homes' pride as a mood reason.
- `src/sim/status.ts`: the `ambition` town line.
- `src/game/saves.ts`: the record checked as a save is read.
- `src/game/demos.ts`: `calm()` switches the ambitions on as a demo opens; the `ambition` demo option; `#ambition` and `#achieved`.
- `src/game/views.ts`: the `achieved` view.
- `src/main.ts`: the panel, the chip's updates and tooltip, the fanfares, Esc, the town line opening the panel, the population tooltip's fame, the switch on for a new game, the probe.
- `src/ui/topbar.ts` (the chip is this line's), `src/ui/townlines.ts` (the laurel icon), `src/ui/style.css` (the chip and the panel), `src/ui/help.ts` (a line for the chip).
- `src/audio/sound.ts` (the two cues are this line's).
- `src/render/monumentmodels.ts` (the Colossus is this line's).
- `src/sim/routes.ts` (review): the jetty's margin `CLEAR` is worked out when used (`clearTicks()`), not as the module loads; the value is the same. With `tests/loadorder.test.ts`, new.
- `scripts/smoke.mjs` and `scripts/measure.mjs`: the two demos.

**Review (23 Oct).** Every earlier demo still opens as at `3c9eb51` (124 of 124, compared at opening; only `#ambition` and `#achieved` differ, and those on purpose). Changed:
- *The load-order trap, at its root.* `routes.ts`'s `CLEAR` is now a function (`clearTicks()`), so it cannot come out NaN whichever module loads first; it was NaN at 3c9eb51 too whenever trade.ts or world.ts was the first sim module loaded. `tests/loadorder.test.ts` enters the import graph at every sim and map module in turn (about 5 s) and fails on any exported number, or entry of an exported list or table, that is NaN or missing. It sees only exported constants; every module-private constant made from another module's exports was checked once by exporting it, and only `CLEAR` went wrong.
- *A great monument's laurel came early.* Its progress was rounded to the hundredth, so the laurel (and its renown) came while the last stage was 99.5% done. It is now rounded down and kept under 1 until the monument stands (a test).
- *The pace.* A thriving town is 300 people (was 600), so the first laurel comes in year 2 of a town built as the prepared histories build it (at 600 it came in year 3 in every one). In `#ambition` the laurels now come in years 2, 3, 4, 4 and 5.
- *The town line for an ambition achieved* names its last deed in words ("with your rule over three cities", was "with Lord of three cities").
- *The chip.* Its tip is the game's own (beside the pointer, at once, a line each, kept left of the side panel), not the browser's slow one. At 1280 wide it pushed the top bar past its room and the date wrapped onto two lines: below 1500 wide it now hangs under the bar as a tab, left of the Greece tab. Its glow is a little stronger and longer (four pulses, the chip lighting up).
- Tests: 537 (new: the load order, a monument's laurel waiting until it stands).
- Checked and left: fanfares once per laurel won in play, none for quiet ones (code); `#achieved`'s help named in the check-in and its news lines; the Colossus and his frame (from the builder's saved towns) by screenshot; the smoke test's slow tail (`#war` to the end) passes; main-thread work a frame in `#vassal` 16.0 to 19.6 ms against 14.8 to 25.4 at `3c9eb51` side by side; the open panel's redraw about 6 ms twice a second under software rendering.

