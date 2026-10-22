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
| Tests | (filled in from the base run below) |
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

*(Filled in at the end of the slice.)*
