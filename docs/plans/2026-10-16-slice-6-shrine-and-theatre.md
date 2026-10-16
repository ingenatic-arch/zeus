# Slice 6 — Shrine and theatre

*16 Oct 2026. Phase 1, "A living neighbourhood" (`docs/specs/2026-10-15-living-neighbourhood-design.md`). Builds on slice 5, "The people who live there". The last slice before slice 7's saves, sound and look-and-feel pass.*

## Goal and check-in

The town gets its first taste of culture and the gods. A small shrine (a generic one: which god it belongs to waits for the gods phase) sends a priestess walking the streets with an offering bowl; an open-air theatre sends an actor out with a mask. They walk their rounds the way the water carrier and the food vendor do. A cottage with water, bread and the priestess's blessings, settled a month, becomes a two-storey townhouse; a townhouse that also gets plays becomes a fine house round a little columned courtyard. Each level looks noticeably grander and holds more people (a townhouse 17, a fine house 21). Losing what a level needs works exactly as before: ten days' grace, a two-month warning with a sign over the roof, then one level down and the people it can no longer hold walk out. Two new overlays show where the priestess and the actor reach; the what's-missing overlay and the household panel know about the new needs; signs can show three or four needs at once; households have new things to say about the priestess, offerings, an unnamed god, actors, comedies and tragedies.

**Oliver can:** grow a street all the way to fine houses, and compare a well-served district with a neglected one.

**Demo links** (bare hash tokens; a dash combines them):

- `#grow`: the fed town of cottages from `#food`, with the shrine tool picked. Place a shrine (and later a theatre, P) and watch the cottages climb.
- `#shrine`: the fed town some months after a shrine went in at the east end of the main road: townhouses going up, the priestess on her round.
- `#priestess`: the same, at street level, following the priestess.
- `#theatre`: later, with a theatre beside the shrine: fine houses going up, the actor out.
- `#actor`: the same, following the actor.
- `#fine`: street level among the fine houses.
- `#compare`: two districts from above: the town by the shrine and theatre, grown to fine houses, and a hamlet at the far end of the lane, with its own fountain, beyond the priestess's and the actor's reach, still cottages.
- `#closed`: the same town some weeks after the theatre was cleared and the west street's road was cut: fine houses warn about plays, and the cut-off street's homes about everything at once (signs with three and four needs).
- `-overlay`: on `#grow`, `#shrine` and `#priestess` the religion overlay; on `#theatre`, `#actor` the culture overlay; on `#fine`, `#compare` and `#closed` the what's-missing overlay.
- Earlier tokens keep working and open on the same towns: `#people`, `#warning`, `#decline`, `#missing`, `#food`, `#vendor`, `#harvest`, `#chain`, `#workers`, `#bridge`, `#water`, `#carrier`, `#fountain`, `#streets`, `#settlers`, `#build`, the views and the speeds.

## Not in this slice

Which god the shrine belongs to, festivals, and the gods reacting (the gods phase); drama schools, actors' training or several kinds of culture building; saves, sound and the town-wide look-and-feel pass (slice 7); a bigger footprint for fine houses (they stay on a 2 × 2 plot); mood changing what the sim does.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- Sim code (`src/sim/`, `src/map/`) stays pure and deterministic: seeded RNG in the state, no `Math.random`, `Date`, `performance` or timers (the purity test enforces it). Every player action reaches the sim as a command through the queue.
- The renderer and the UI only read sim state. Static build, `base: './'`, no runtime network requests, all art in code.
- Judge by screenshots, tune by eye, never claim it looks or reads right on Oliver's behalf.
- Earlier demo links must open on exactly the same towns: without a shrine or theatre nothing in the sim changes (checked by hashing every earlier demo's state at load, before and after).

## Before

Measured at `b76713e` (the end of slice 5's review), headless Chromium with software WebGL at 1920 × 1080:

| | Before |
|---|---|
| Tests | 90 in 9 files, all passing; typecheck clean |
| Bundle | 3 files, 777 KB raw, 218 KB gzipped |
| Load (local, headless, page clock) | ready at 0.88 s, first frame at 1.10 s; coast bake 0.38 s, scene build 0.80 s |
| Opening / close views | 542 k triangles, 125 calls / 376–403 k, 69–76 |
| `#streets` | 389 k, 88 (overview 563 k, 144) |
| `#water` | 511 k, 112; overlay 545 k, 114; street 491 k, 104; overview 652 k, 156 |
| `#food` | 458 k, 123; overlay 491 k, 124; vendor 439 k, 114; harvest 510 k, 134; chain 533 k, 142; overview 616 k, 172 |
| `#warning` | 470 k, 123; with the overlay 471 k, 123; decline 460 k, 118; people 472 k, 122; missing 552 k, 148; overview 649 k, 181 |
| GPU objects | 43 geometries, 4 textures |
| Main-thread update per frame, `#food` paused / running | 0.37 / 0.69 ms |
| Frame rate | not measurable headless (1–1.5 fps under software rendering) |

## Design decisions

**State, version 6.** `SIM_STATE_VERSION` goes to 6 (no saves exist yet; a version 5 state is refused plainly). All new state is plain data.
- `BuildingKind` gains `'shrine'` (2 × 2, like a fountain) and `'theatre'` (3 × 3, like the agora).
- `Service` gains `'religion'` and `'culture'`; `SimState.rounds` gains a record for each (the tick walked, the exits taken at junctions), so the priestess and the actor share the round logic (`src/sim/rounds.ts`, `wayNeeds` in `walk.ts`) exactly as the water carrier and the food vendor do.
- Every building gains `religionUntil` and `cultureUntil` (when a home's blessings and plays run out; 0 for never).
- Walker kinds gain `'priestess'` and `'actor'`.
- Home levels 4 (townhouse) and 5 (fine house).

**The shrine and the theatre** (`src/sim/culture.ts`).
- *Shrine*: 200 drachmas, 2 workers. A small temple front on a stepped base, with an altar and a little flame. Its priestess walks her round (reach 32 road steps, 48 fresh tiles a round, resting 30 ticks between rounds, longer when short-handed) and every home beside her way has the priestess's blessing for four months.
- *Theatre*: 400 drachmas, 5 workers. A half-round of stone seats round a beaten-earth orchestra, with a stage building on the road side. Its actor walks his round on the same terms, and every home beside his way has plays for four months.
- She heads for cottages and better (the homes that want blessings); he for townhouses and better.

**Five house levels** (the spec's default): tent 5 people → hut 9 → cottage 13 → townhouse 17 → fine house 21. Rent 1, 2, 4, 6, 9 drachmas a month.
- *A level's needs*: a hut water; a cottage water and bread; a townhouse water, bread and blessings; a fine house all four.
- *Going up* (hysteresis, handed over): a cottage becomes a townhouse only with water, bread and blessings each lasting at least a month more, and after a month as a cottage (`SETTLE`); a townhouse becomes a fine house on the same terms with plays as well. So a home never climbs on the strength of a walker who just happened by, and never climbs straight back after a drop.
- *Going down* is unchanged: a need missing for ten days warns; two months later the home drops one level, and another drop takes another full warning. The people the lower level can't hold walk out (whole families, as now).

**Who moves away** (finding handed over): `leavingGroups` tries every combination when a household has 12 choices or fewer, exactly as before (so every earlier town loses the same people); with more (a townhouse or fine house can have 20), it chooses with a knapsack over the household's family units (each unit: nobody, one to all of its grown children and elderly parents, or the whole unit), exact, and quick for 21 people.

**Readable depth for the new needs.**
- *Hover tips*: a cottage or better gets a "Blessings" line, a townhouse or better a "Plays" line: how long they last, or why not (no shrine; no road beside it; no road to a shrine; too far, in steps; nobody working there; the priestess has taken other turns). The shrine, the theatre, the priestess and the actor have their own tips, and clicking the shrine or theatre (or the walker) follows her or him.
- *The panel*: the have-and-lack chips gain Blessings and Plays; "To become a townhouse: the priestess's blessing from a shrine, with water and bread kept up" (and how long until they've settled); the warning box, story and mood know every need and level ("Gave up the fine house for a townhouse, after two months without plays"; "The priestess came back, just in time").
- *Mood*: blessings and plays count like water and bread for the levels that need them; a cottage that could have the priestess but doesn't (a shrine exists) is a little put out; with no shrine in the city at all it says nothing about it, so every earlier town's moods read as before.
- *What's missing*: a cottage counts as wanting a shrine (amber, temple sign) once the city has a shrine, and a townhouse a theatre once there is one; until then a cottage has "all it needs" (green), so earlier towns look as before. Warnings show red as now.
- *The trouble count* names the new needs.

**Signs for three or four needs** (finding handed over). Icons: the water drop, the loaf, a little lilac temple front for blessings, a rose comedy mask for plays. One or two needs keep today's round sign (one icon, or two side by side). Three or four use a wider rounded sign holding the icons in a row at nearly full size, always in the same order (water, bread, blessings, plays), so the eye learns where to look; the rim keeps telling how urgent the most urgent need is. Signs sit higher over the taller townhouses.

**The religion and culture overlays** reuse `ServiceOverlay`: the priestess's reach lilac-violet (Y, or the temple button), the actor's rose (C, or the mask button), posts over homes that want her or him and are without or running low, the shrine or theatre lit. Placing a shrine or theatre shows its overlay and previews the reach ("Its priestess would reach 31 cottages and better · 31 without blessings now").

**Homes and buildings drawn** (lean, measured):
- *Townhouse*, two kinds: a two-storey whitewashed house under a tiled roof, with a wooden balcony or an outside stair, a yard wall with a gate, a vine or pots.
- *Fine house*, two kinds: an L of whitewashed wings under tiled roofs round a small courtyard, a porch of columns, a painted band under the eaves, a cypress or a little garden.
- *Shrine*: a stepped stone base, four columns and a pediment under a tiled roof, an altar with a flame, offerings; it stands on its own paving like the fountain.
- *Theatre*: tiers of pale stone seats in a half-round, the orchestra, a stage building with a little colonnade and painted panels facing the road.
- *Priestess*: a woman in a white robe with a lilac stole, carrying an offering bowl with a small flame. *Actor*: a man in a rose-red costume holding a big pale mask up. Both must be easy to tell from the blue water carrier and the saffron vendor.
- Floaters: "Townhouse", "Fine house", "Back to a cottage", "Back to a townhouse".

**Chatter** (finding handed over): new situations, each with six to nine lines: a cottage visited by the priestess, a townhouse without plays, a townhouse with plays, a fine house, just moved up to a townhouse or fine house, no blessings (warning), no plays (warning). Warm and gently funny: the priestess and her bowl, offerings of honey cakes and the odd goat, a god nobody can quite name yet, actors who can't stay in character, comedies against tragedies. `{adult}` for anyone doing grown-up things, `{kin}` (4 or older) for anyone at all. The general lines stay as they are, so earlier households say what they said.

**Tools and keys**: Shrine (V) and Theatre (P) in the build bar after the agora; the religion overlay (Y) and culture overlay (C) after the food overlay; the help lists them. The clear tool names shrines and theatres.

**Demos**: built through the command queue as before, from the food town (`foodTown`): the shrine at (35,78) and the theatre at (35,81) at the east end of the main road, beside the fountain; two more farms (one north of the farm road, one at its east end, which runs a little further) so the bigger households have bread; `#compare` adds a fountain at the lane's far end (24,48) so the hamlet there grows to cottages, out of the shrine's and theatre's reach.

## Tests

- Determinism: same seed and commands give the same city with a shrine and theatre at work; save and load with the priestess and the actor on their rounds carries on identically; a version 5 state is refused plainly.
- Earlier towns: every earlier demo's state at load hashes the same as before this slice (a scratch check, recorded in As built); the existing tests (water, food, households, warn-then-decline, churn) keep passing unchanged.
- The priestess and the actor: walk only on roads within their reach, serve the homes beside their way, come home and set off again; no workers, no walker.
- Growth: a cottage with water, bread and blessings becomes a townhouse only after a month as a cottage and with a month of each in hand; a townhouse with plays becomes a fine house; capacities 17 and 21.
- Warn then decline for the new needs: a fine house that loses its plays warns after ten days, stays two months, then becomes a townhouse and its extra people walk out; a fine house losing everything drops one level at a time, two months apart.
- Who moves away in big households: the knapsack path never takes the head or breaks up a family, leaves exactly as many as needed when it can, and is quick; households of 12 choices or fewer give the same answer as before.
- Mood and chatter: a fine house with all four needs and work is content; lines exist for every new situation; names fill in; deterministic.
- Churn: the `#theatre` town has no homes going back and forth over two years once grown.

## Tasks

1. Plan (this file). Commit.
2. Sim: state v6, shrine and theatre, the priestess and the actor on the shared rounds, townhouses and fine houses with their needs, rise hysteresis, decline, the knapsack for big households, mood, chatter, statuses, demos' setups; tests; churn and earlier demos checked. Commit.
3. Render and UI: the townhouse, fine house, shrine and theatre models, the priestess and actor, the religion and culture overlays, signs for up to four needs, the panel, hover tips, tools, keys, help, floaters, demos. Commit.
4. Look and tune: build, drive it headless, screenshot from several angles, look and adjust; triangles of a fine-house district measured; extend smoke and measure. Commit.
5. Full checks, "As built", check-in. Commit, push, sync.

## As built

