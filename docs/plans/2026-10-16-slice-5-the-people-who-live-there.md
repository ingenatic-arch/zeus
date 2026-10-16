# Slice 5 — The people who live there

*16 Oct 2026. Phase 1, "A living neighbourhood" (`docs/specs/2026-10-15-living-neighbourhood-design.md`). Builds on slice 4, "Bread on the table".*

## Goal and check-in

Every home becomes a household Oliver can get to know. Clicking a lived-in home opens a small parchment panel: the house's name ("The house of Nikias, from Megara"), who lives there (names, ages and how they are related, "Doros, 6, son of Lykos"), how they feel (content to fed up, with the reasons named), what they have and what they lack, a line or two of chatter in a warm, gently funny voice, and a short story of what has happened to them. When a home loses what its level needs (a hut its water, a cottage its water or bread), it warns first: a little sign floats over the roof with a water drop or a loaf on it, and the panel says how long the family will put up with it. If nothing changes for about two months, the house drops one level, and the people it can no longer hold pack up and walk out of town, named in the panel. A new "what's missing" overlay tints every home by its biggest unmet need. Undo only reaches back to recent actions, and the town's drawing only redoes what changed.

**Oliver can:** click into any home, cut off a street's water to see the warning and the decline, and fix it before the family leaves.

**Demo links** (bare hash tokens; a dash combines them):

- `#people`: the fed town from `#food` at street level, with the panel open on a cottage. Click any other home.
- `#warning`: the fed town a few months after a street's road was cut where it meets the town: the homes beyond the cut have run dry and show their signs, with about a month to go; the panel is open on one of them, and the road tool is picked, ready to mend the gap.
- `#decline`: the same, a little later: the panel is open on the home nearest to dropping a level, a few days from it. Time running; watch it go back a level and part of the family walk out.
- `#missing`: the watered town with one farm feeding it (food is short), with the "what's missing" overlay on.
- `-overlay`: on any of the slice 5 demos, starts with the "what's missing" overlay.
- Earlier tokens keep working: `#food`, `#vendor`, `#harvest`, `#chain`, `#workers`, `#bridge`, `#water`, `#carrier`, `#fountain`, `#streets`, `#settlers`, `#build`, the views and the speeds.

## Not in this slice

The shrine and theatre, townhouses and fine houses, and the religion and culture overlays (slice 6); saves to the browser and sound (slice 7); births, deaths, marriages, named jobs ("Kleon works at the granary"); a mood that changes what the sim does (here mood is read from the household's state and explains it; it doesn't yet drive arrivals or leaving); hovering leavers on the road.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- Sim code (`src/sim/`, `src/map/`) stays pure and deterministic: seeded RNG in the state, no `Math.random`, `Date`, `performance` or timers (the purity test enforces it). Every player action reaches the sim as a command through the queue.
- The renderer and the UI only read sim state. Static build, `base: './'`, no runtime network requests, all art in code.
- Judge by screenshots, tune by eye, never claim it looks or reads right on Oliver's behalf.
- Earlier demo links must still work and look the same where the new things don't apply: households get their names from a separate seeded stream, so `#streets` and `#water` grow exactly as before. What changes on purpose (handed-over findings): decline now takes two months and warns first; a hut needs a month's bread in hand to become a cottage (so `#food` may grow a little differently); undo only reaches back a month; the water and food overlays' posts stand only on homes running low or without.

## Before

Measured at `61bcaa7` (the end of slice 4's review), headless Chromium with software WebGL at 1920 × 1080:

| | Before |
|---|---|
| Tests | 74 in 8 files, all passing; typecheck clean |
| Bundle | 3 files, 711 KB raw, 195 KB gzipped |
| Load (local, headless, page clock) | ready at 0.86 s, first frame at 1.13 s; coast bake 0.36 s, scene build 0.80 s |
| Opening / close views | 542 k triangles, 125 calls / 376–403 k, 69–76 |
| `#streets` | 389 k, 88 (overview 563 k, 144) |
| `#water` | 511 k, 112; overlay 545 k, 114; street 491 k, 104; overview 652 k, 156 |
| `#food` (44 homes, 38 cottages) | 458 k, 123; overlay 492 k, 125; vendor 438 k, 114; harvest 510 k, 134; chain 533 k, 142; overview 616 k, 172 |
| GPU objects (`#food`) | 40 geometries, 5 textures |
| Frame rate | not measurable headless (1–1.5 fps under software rendering) |

**Churn before** (scratch sim runs, 36 in-game months after each setup; "declines" are homes dropping a level):

| Layout | Declines in 3 years | Homes that declined |
|---|---|---|
| `#food` | 0 | 0 |
| `#workers` (after its jobs fill) | 2 | 2 |
| `#chain` + three farms, agora at the edge of town (30,64) | 13 (2 every ~9 months) | 4 |
| `#chain` + one farm (food genuinely short) | 50 | 33 |

## Design decisions

**State, version 5.** `SIM_STATE_VERSION` goes to 5; there are no saves yet, so nothing breaks, and a version 4 state is refused plainly.
- Every building gains `family: Family | null` (null for workplaces and empty plots).
- `Family`: `name` (the founder's name: "the house of Nikias"), `origin` (where they came from: Megara, Corinth, a hill village in Arcadia…), `seed` (for choosing chatter), `members: Person[]`, `story: Story[]` (the last eight things that happened), and `warned` (the need it is warning about now, or '').
- `Person`: `name`, `female`, `born` (the tick of their birth, so ages grow with the years), `role` and `kin` ("son" of "Lykos"; the head has role 'head').
- `Story`: `tick`, `what` ('came' | 'joined' | 'up' | 'warn' | 'relief' | 'down' | 'left'), `need`, `level`, `names`.
- `SimState.folk`: a second seeded generator for names, ages and origins, seeded from the game's seed, so drawing names never shifts the main generator: settler groups, and so every earlier demo, grow exactly as before.
- `SimState.looks`: a counter bumped when a farm's crop changes stage or any stock changes (barn, granary, stall); these no longer bump `rev`, which now means buildings, roads, levels, people and trees.
- `UndoEntry.tick`: when the action was done.

**People.** The number of members always equals the home's `people`.
- *Settlers arriving* (`arrive`): the group becomes a little family unit, drawn from `folk`: one adult (18–55), then, by size, a partner of a similar age, then children (0–15) or an elderly parent. The first group to a plot founds the household (its first adult is the head, and the house takes their name); later groups join as the head's brother, sister or cousin with their own family ("Theano, 28, wife of Lykos"). The story says who came.
- *Leaving* (a decline, or clearing the home): the people beyond what the home can hold leave as whole units where they can, the most recent arrivals first, never the head while anyone else is left. The story names them.
- About 60 men's and 60 women's names, plausible and ordinary (Nikias, Lykon, Theano, Myrrhine…), about 20 places they came from.

**Warn, then decline** (Oliver's decision; the spec's default "about two months").
- A home's level needs: a hut water; a cottage water and bread. When one runs out, the home is *warned*: `missing(b)` gives the need and since when. It drops one level after `DECLINE_AFTER = 2 months` (600 ticks) of missing it, counted from when it ran out or from the home's last change of level, whichever is later, so a second drop needs another two months of warning. The people the lower level can't hold walk out (cottage 13 → hut 9 → tent 5).
- The story records the warning ("Water ran out"), the relief if it comes back in time ("The water carrier came back"), and the drop with who left.
- *Hysteresis* (finding handed over): a hut with water becomes a cottage only with at least a month's bread in hand (`COTTAGE_FOOD_MIN = 1 month`), so a scrap of bread at the end of a short stall doesn't lift it for a few days.
- If churn at an edge-of-town agora remains after these, try a lighter walk-time weight for the food vendor in `wayNeeds` (finding handed over), measured before and after.

**Mood** (`src/sim/folk.ts`, a pure function of the home and the tick): a score from what it has and lacks, named in five words from content to fed up ("Content", "Getting by", "Worried", "Unhappy", "Fed up"), with every reason listed: water and bread (has it, or how long without), work (everyone who can work has work, or how many can't find any), a recent move up or down, a crowded or a half-empty house, newcomers settling in. It explains; it doesn't change what happens (that waits for later phases).

**Chatter** (`src/sim/chatter.ts`, pure): two lines, one about their situation and one about life in general, each said by a named member, chosen with the family's seed and a slow clock (a new pair every few days), never the same line twice in a pair. Lines are written per situation (just arrived, in a tent, water at last, bread at last, out of water, out of bread, a few days from dropping, just dropped a level, just moved up, no work, a full house, and plenty of everyday lines about goats, olives, the sea, the neighbours, the gods and the market), about 150 in all, with the speaker's family, origin and the water carrier or vendor filled in. Warm and gently funny, never cruel.

**The household panel** (`src/ui/household.ts`): clicking a lived-in home with no tool picked opens it on the left; clicking another home switches, clicking open ground or Esc closes it. It refreshes a few times a second while open. Sections: the house's name, level and how full; mood with its reasons; a warning box when warned (the need, how long without, a bar of the two months running down, and what would fix it, from the same reasons the hover tip gives); what they have and what they lack (with what the next level needs: "To become a cottage: a month's bread from the agora's vendor"); who lives there; the chatter; and the story with dates. A soft gold ring on the ground marks the house.

**Signs on the houses** (`src/render/signs.ts`): a warned home has a small round sign floating over its roof, facing the camera, cream with a water drop or a loaf on it and a rim that turns from amber to red as the two months run out, pulsing in the last ten days. Signs grow a little with distance so they can still be read from the default height. The top bar gains a count of homes in trouble (hidden when none), whose tooltip lists them; clicking it takes the camera to the most urgent and opens its panel.

**The "what's missing" overlay** (I, or a new button after the food overlay): every lived-in home's ground is tinted by its state — red where it is warned (about to drop a level), amber where it lacks what it needs to grow, green where it has everything — with its sign showing which need (the overlay also shows signs for needs to grow). Roads are left untinted. A small legend says what the colours mean.

**The water and food overlays** (finding handed over): the posts now stand only over homes that are without, or have less than a month left; every home's ground tint still shows how fresh its supply is.

**Undo** (finding handed over): an action can be undone for a month after it was done (`UNDO_WINDOW = 300` ticks; while paused, time stands still), and a placement can't be undone once someone lives there or something is stored in it (settlers moved in, grain in the granary or stall or barn). Older entries are dropped. The undo button is greyed out with a tooltip saying why.

**Drawing only what changed** (finding handed over): `CityView.sync` and `Bridges.sync` compare tiles only when `tilesRev` changed; `Works` re-reads its buildings only when `rev` or `looks` changed (not every frame). Settlers arriving or crops growing no longer scan all 25,600 tiles.

**The stall's loaves** (finding handed over): the baskets show as full from about two-thirds of the stall's 1,600 down, and thin out below that; tuned by eye.

**Hover tips and floaters.** A home's tip gains "Click to see who lives here" and its warning lines now read in the two-month terms. When people leave a home that stays (a decline), "−4" floats up in rust beside "Back to a hut".

## Tests

- Determinism: the scripted city grows households; same seed and commands give the same city (names and all); replay; save and load with a home warned and leavers on the road carries on identically; a version 4 state is refused plainly. `#streets` and `#water` settle the same people in the same homes as before households existed (population, levels and walkers checked against the slice 4 numbers).
- Households: over a long scripted run with arrivals, declines, clears and undo, every home's members equal its people; the head is never the one to leave while others stay; ages grow with the years; names come from the lists.
- Warn then decline: a hut whose water runs out is warned at once and stays a hut for two months, then becomes a tent and its extra people walk out (and leave the household); a cottage that loses both water and bread drops to a hut, then waits another two months before a tent; water coming back in time clears the warning and the story says so.
- Hysteresis: a watered hut with only a few days' bread stays a hut; with a month's, it becomes a cottage.
- Mood: a fed, watered cottage with work is content; one out of water a month is worried or worse, and the reasons say why.
- Chatter: deterministic for the same state; the two lines differ; lines exist for every situation.
- Undo: a recent action undoes; one older than the window doesn't; a granary with grain in it, or a plot with a family, can't be unplaced.
- Churn: `#food` and `#workers` have no declines over three in-game years after settling; the edge-of-town agora layout is measured before and after.
- The existing water and food tests keep passing, with the decline timings moved from one month to two.

## Tasks

1. Plan (this file). Commit.
2. Sim: state v5, `folk.ts` (names, units, mood), `chatter.ts`, households on arrive, leave and clear, warn-then-decline with the story, hysteresis, undo limits, the `looks` counter; tests; churn measured. Commit.
3. Render and UI: the household panel, signs on houses, the selection ring, the "what's missing" overlay and its button and key, overlay posts only where wanted, the trouble count in the top bar, floaters, hover tips, undo button state, drawing only what changed, the loaves; demos. Commit.
4. Look and tune: build, drive it headless, screenshot from several angles, look and adjust; extend smoke and measure. Commit.
5. Full checks, "As built", check-in. Commit, push, sync.

## As built

*(Filled in at the end of the slice.)*
