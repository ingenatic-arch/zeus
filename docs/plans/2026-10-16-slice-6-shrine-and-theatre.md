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

Built as designed, except where noted here. Commits: plan `69241fb`; sim `17ef0bc`; render, UI and demos `95c5603`; looked at and tuned, smoke and measure `f490f47`; this note and the check-in after.

**Changes from the design**
- *The priestess's and the actor's walk* is 64 fresh tiles a round, not 48. With 48, the well-run `#fine` town had homes at the far ends of the round warning about blessings and plays now and then (each walker took the other turns too often); with 64, none warn over two years. Reach (32 road steps), rest (30 ticks) and how long a visit lasts (four months) are as designed.
- *The demo town needed more bread.* Townhouses and fine houses hold 17 and 21, so the food town's one agora couldn't keep up: its vendor's round "had taken other turns" and homes at the west end warned about bread. Rather than change the vendor (which would change every earlier demo), the culture town gets, at `SHRINE_AT`: the farm road carried three tiles further east with farms at (41,60) and (51,64) (five in all), a second granary at (35,69) by the agora's street, an agora at the west end of the main road (6,81), and for the hamlet at the lane's far end a fountain (24,48) and an agora (27,48). The second granary mostly stands empty: the porters go to the first.
- *Who moves away*: `leavingGroups` keeps the exact search for 12 groups or fewer (`EXACT_CHOICES`), so every earlier town loses the same people; with more, `knapsack` chooses over the household's units (none of a unit, some of its grown children and elderly parents, or the whole unit) for the cheapest mix that sends at least `n`. Tested: never the head, never a family split, overshoot as small as the exact search allows, and quick for every big household in `#fine`.
- *Rising* (`readyToRise`): a cottage or townhouse must have been at its level a month (`SETTLE`) and have every need of the next level lasting at least a month more (`RISE_MIN`). What's missing (`wantOf`) asks for blessings only once the city has a shrine, and for plays only once it has a theatre, so earlier towns read as before.
- *`#closed`* opens four months after the theatre was cleared and the west street cut (`CLOSED_TICKS = CLOSE_AT + 1200`), paused, with the panel on the most urgent home and the cut tile ringed. By then the fine houses at the west end, where the actor came least often, have already gone back to townhouses (16 homes: 9 on the main road and the 7 cut off); 18 more fine houses warn about plays, and 6 of the 7 cut-off townhouses warn about water, bread and blessings at once. The plays at the two ends of the round run out about three months apart, longer than a warning lasts, so no single moment has every fine house warning and none gone down. Four-need signs are drawn and work, but no demo shows one: the cut-off homes have lost their plays (and their fine house) before their water runs out.
- *Views*: `#fine` looks over the whole district from above rather than from street level (the fine houses are easier to take in together); `#compare` looks from the east with the fine houses on the left and the hamlet on the right.
- *The theatre* has a grassy bank behind its top tier instead of a wall: from the road side a wall hid the seats. `#theatre` looks at it from the north, with the sea behind.
- *Small extras*: the household panel's work line now reads "all 8 who can work would, but no road joins it to a workplace" (it read "the 8 who could would work"); the help card lists V, P, Y and C.

**Triangles** (one instance; a cottage is 406–444): townhouse A 524, townhouse B 616, fine house A 723, fine house B 691, shrine 633 (its altar fire smokes with the hearths' shared puffs), theatre 1,470 (tiered seats, the bank, a stage building with a colonnade, eleven seated people). One new geometry overall (44, was 43).

**Demos**, all from one history (`cultureTown`): `#grow` (the food town at a year, shrine tool picked, religion overlay on with `-overlay`): 38 cottages, 6 tents; `#shrine` 450 ticks after the shrine: 26 cottages, 18 townhouses, 499 people; `#theatre` 300 ticks after the theatre: 6 cottages (the hamlet), 21 townhouses, 17 fine houses, 593 people; `#fine` and `#compare` six months after the theatre: 38 fine houses and the hamlet's 6 cottages, 786 people, nobody warning; `#closed` as above, 781 people, 24 warning, the most urgent 20 days from going down. `#priestess` and `#actor` follow the walkers in `#shrine` and `#theatre`.

**Churn**: no homes go down a level over two years in `#shrine` or `#theatre` (test). In `#shrine`, while the cottages are turning into townhouses (about ticks 4170–4650), some homes at the west end warn about bread for a few weeks and then recover; none go down. `#grow` played as the check-in suggests (shrine at (35,78) at once, theatre at (35,81) 90 days later, both through the command queue in a scratch run): every street home is a townhouse by day 80 and a fine house by day 210, with no warnings; from about day 220 a few fine houses warn about bread, and 12 drops follow by day 720 ("the food vendor has taken other turns lately", later "the agora's food stall is empty"). An agora at (6,81) alone or two farms alone at day 230 still give drops; both together give no drops at all, and no warnings after about day 390. `#closed` with the theatre rebuilt and the cut road laid back at once: 12 drops, then all 38 fine again by day 120; without, 42 drops in six months.

**Earlier demos**: every earlier demo's state at load (buildings, levels, people, stock, supplies, walkers, households, hashed) is identical before and after this slice: `#streets`, `#settlers`, `#water`, `#carrier`, `#fountain`, `#food`, `#vendor`, `#harvest`, `#chain`, `#workers`, `#bridge`, `#people`, `#warning`, `#decline`, `#missing`. The panel's "to become" line for a cottage now names the townhouse.

**After** (headless Chromium, software WebGL, 1920 × 1080):

| | Before | After |
|---|---|---|
| Tests | 90 in 9 files | 100 in 10 files, all passing; typecheck clean |
| Bundle | 777 KB raw, 218 KB gzipped | 813 KB raw, 228 KB gzipped |
| Load (page clock) | ready 0.88 s, first frame 1.10 s | ready 0.92–1.10 s, first frame 1.18–1.35 s (two runs) |
| Opening, `#streets`, `#water`, `#food`, `#warning` views | as in Before | unchanged, to the triangle and call |
| `#fine` | — | 496 k, 144; with what's missing 530 k, 148; compare 499 k, 144; theatre 441 k, 117; overview 670 k, 200 |
| `#closed` | — | 494 k, 158; overview 668 k, 214 |
| GPU objects | 43 geometries, 4 textures | 44 geometries, 4 textures |
| Main-thread update per frame, paused / running | `#food` 0.37 / 0.69 ms | `#food` 0.48–0.53 / 0.84–0.93 ms; `#fine` 0.57–0.58 / 1.11–1.13 ms |

The overview's draw calls reach 200–214 in the culture towns (172–181 in earlier ones): each new model is its own instanced mesh per chunk. Frame rate can't be measured headless.

**For the next slice**
- The vendor's round is the limit on big households: with 17 and 21 people a home, one agora doesn't keep a street fed, and the demo needed three agoras. Worth looking at with the economy.
- Right after a theatre opens, townhouses it hasn't reached yet say "No actor comes this way" as a mild minus in their mood, which reads as a complaint about something that's only just arrived.
- Draw calls: 214 on the `#closed` overview. Merging the house kinds into fewer instanced meshes (or per-chunk merged statics) would bring them down if a laptop struggles.

## Review

Reviewed after `dc53e75`. Commits: `617529c` (one agora feeds a street of fine houses, the hungry reason and the granary and agora tips count the farms, `#closed` opens before any drop, the "not yet" mood, tests), `5db887f` (the theatre's stone rim and stairways, chatter that contradicts the town is skipped, mood days rounded like the panel's), `211cf67` (the warning box gives each other need its own days), and this note.

**What was wrong**
- *The vendor, not the farms, was the first limit.* One agora's porter brought about 650 measures a month to the stall (800 a load, one errand out at a time, the round trip from the granary). 38 fine houses eat about 800 a month (one measure a person a month). So the demo needed three agoras, and `#grow` still ran short with full granaries. The hungry reasons said "the food vendor has taken other turns lately" or "the stall is empty", which pointed Oliver at agoras when, once the porter keeps up, the real gap is wheat: three farms grow about 570 a month.
- *The second granary stood empty* because carts go to the granary with room nearest their farm and porters to the nearest with grain; both were the first granary. That's correct behaviour. The demo didn't need the second granary once the porter carries enough, so it's gone, and an empty granary now says why in its tip.
- *`#closed`* opened four months after the cut, after 16 west-end homes had already dropped.
- *"No actor comes this way"* was a −1 mood reason from the moment a theatre opened. `whyNot` said "taken other turns" for a walker who had never come.
- *The theatre* from the default yaw (0.6, from the road side) showed only its grass bank: a green drum.
- *The warning box* gave one "all the same" date for every other missing need, though they run out at different times.
- *Chatter*: three noShrine lines mention a townhouse and were drawn for huts and cottages. "talk of a theatre" lines were drawn with a theatre standing, and "somewhere proper to thank the gods" with a shrine standing.
- *Mood vs panel days*: `span` rounded down and the panel's `days()` up.

**What changed**
- `food.ts`: `PORTER_LOAD` 800 → 1200, `STALL_CAP` 1600 → 2400 (`STALL_LOW = CAP − LOAD` as before), `VENDOR_WALK` 48 → 64 (the same as `PRIESTESS_WALK` and `ACTOR_WALK`; `CARRIER_WALK` stays 48 because a fountain's reach is what Oliver tunes by placement). One agora now keeps 38 fine houses fed when the wheat is there.
- `status.ts`: `foodBalance(s, map)` gives `{ grown, eaten, perFarm }`. `grown` is Σ `harvestOf(f) × TICKS_PER_MONTH / GROW × rateOf(f)`; `eaten` is the people in homes that eat bread. `balanceWords` asks for `max(1, ceil((eaten × 1.1 − grown) / perFarm))` farms, which leaves a tenth to spare. `balanceLine` goes into the granary and agora tips: a short-handed farm is named first; then a shortfall in words; otherwise both numbers. `whyHungry`, after the reach checks, names the farms when the stalls are low and stored grain is under half a stall, or when the stall is empty and the town eats more than it grows. Otherwise it says "until the next harvest" or "its porter is fetching more". An empty granary while others hold grain says carts and porters go to the nearest.
- `folk.ts`: `justOpened(s, kind, until)` is true while the newest shrine or theatre is under two months old and the home's need hasn't been met since it opened. `moodOf` gives a 0-tone "has opened; … hasn't come this way yet" then; `whyNot` skips "taken other turns". `span` uses `Math.ceil`.
- `demos.ts`: `cultureTown` no longer builds the granary at (35,69) or the agora at (6,81). It keeps the farm road extension, the farms at (41,60) and (51,64), and the hamlet's fountain and agora. `CLOSE_AT = FINE_TICKS + 1100` and `CLOSED_TICKS = CLOSE_AT + 740` (about 2.5 months after the cut).
- `grand.ts` / `palette.ts`: seat treads alternate `seatStone` and `seatStoneAlt` (#d6c7a4). There are four stairways a tier (`seatStair` #a8987a, rotated to the radius), and a dressed-stone band (`seatStoneShade`) from the top tier down to 0.55 of its height, before the grass bank. The theatre is 1,796 triangles (was 1,470).
- `household.ts`: the "also" clause groups the other needs by days left.
- `chatter.ts` `suits()`: the three filters above.
- Tests (101): the `#grow` play-through (shrine, theatre at day 90, two farms with the road run on: no drops in two years, ≥ 36 fine houses; without the farms `whyHungry` names the farms with numbers). The "not yet" mood in `#theatre`. `#closed`'s one-level-at-a-time check now measures gaps between each home's own drops (≥ `DECLINE_AFTER` − 1 day). The one-farm village checks that some cottage has food, not the first.

**Checked** (sim scratch runs; headless Chromium for the views):
- *`#grow` played through*: the first townhouse comes on day 5 and all 38 by day 80. With the theatre on day 90, the first fine house comes on day 94 and all 38 by day 207. The tips show the shortfall from day ~130 ("another farm") and say "two more farms" from day ~230. Left alone, the first bread warning is on day 442 and the first drop on day 531, its reason naming two farms (17 drops by day 720). With two farms and the road built on day 0 or day 230: 0 warnings, 0 drops. On day 300: a few warnings, 0 drops. On day 400: 13 drops (two months to ripen, granary empty). A west agora alone still gives drops.
- *Culture demos at load*:
  - `#shrine`: 501 people, 0 warnings over two years (the churn is gone).
  - `#theatre`: 602 people, 0 drops.
  - `#fine` and `#compare`: 783 people, 38 fine, nobody warning. Brief bread warnings reach at most 5 homes, with 0 drops in two years.
  - `#closed`: 863 people, 38 fine, 16 warning (9 plays only; 6 with three-need signs on the cut street; 1 with two). The panel home is 11.5 days from dropping, and money is 7,598. Left alone: 59 drops in 240 days. Rebuilt and mended at once: 15 drops (the 7 cut-off homes on days 12–17, then 8 on the west main road on days 34–39), and all 38 are fine by day 69.
- *Earlier demos at load*: the houses, levels and people are the same except `#harvest` (473 people, was 470) and `#missing` (438, was 434; huts 2 → 3, cottages 36 → 35; 7 warning, was 9). Stocks differ everywhere. Re-ran each slice 5 claim:
  - `#warning`: 7 warnings, 26–31 days; mended, all clear by day 13 with 0 drops.
  - `#decline`: 3 days; 7 drops by day 10.
  - `#missing` with two farms: 22 drops, back to cottages by ~day 180.
  - `#people` opens on Sosias.
  - `#chain`'s timing is unchanged (harvest at 609 ticks, first cottage at 1481).
  - `#bridge` now has 0 drops in two years (was 14).
- *Theatre*: screenshots from the default camera now show the stone rim and stairways; `#theatre` from the north still shows the tiers.

**Invariants**: no `Math.random`, `Date`, `performance` or timers in `src/sim` or `src/map`; demo actions all go through the queue; no runtime fetches; the build is static with `base: './'`. Typecheck is clean, and 101 tests pass in 10 files. The build is 819 KB raw and 232 KB gzipped. `npm run smoke` is ok. `npm run measure`:
- Load is ready at 1.01 s, first frame at 1.25 s.
- The opening view is 542,256 triangles in 125 calls (unchanged). `#streets` 388,610 / 88 and `#water` 511,380 / 112 are unchanged.
- `#food` is 457,978 / 125 (was 123) and `#warning` 469,739 / 129 (was 123): more loaves on the stalls.
- `#fine`: 487,866 / 134; with what's missing 521,582 / 138; compare 490,582 / 134; theatre 432,731 / 109; overview 661,766 / 190.
- `#closed`: 481,563 / 151; overview 655,463 / 207.
- Update per frame, paused / running: `#fine` 0.39–0.46 / 1.07–1.21 ms; `#food` 0.47 / 0.88 ms.
- 43 geometries, 4 textures.

**State v6**: plain data. The new `Building` fields are `religionUntil` and `cultureUntil` (ticks); `BuildingKind` gains `shrine` and `theatre` and `Service` gains `religion` and `culture` (strings). `justOpened` reads the existing `Building.since`. Families keep v5's shape, with bigger households. There are no class instances, Maps or functions in `SimState`.

**For slice 7 (and later)**
- *Saves* must carry the v6 fields: `religionUntil`, `cultureUntil`, the building `since` (`justOpened` now reads it, so a loaded town must keep it), and v5's `Family.came` and `warned: Service[]`.
- *Walker urgency vs the decline deadline*: at a junction a walker heads for the home whose need runs out soonest. `until` is a long-past tick for homes that have gone without longest, so a returning actor serves the cut-off street first, while west-end homes with less time to their drop wait. In `#closed`, 8 of the 15 drops come from this. Weighting by time left before the drop (now − `until` against `DECLINE_AFTER`) would save them. It's a rounds.ts change that touches every walker, so I left it.
- *Four-need signs* can't happen in a demo with the current rules: needs expire months apart and decline counts from the first missing need, so a home never lacks four for long enough to warn about all four. Either accept that or test the layout directly.
- *The food shortfall is only visible on hover* (the granary and agora tips) until homes warn, about ten months later in `#grow`. A top-bar or overlay hint would make it "pressure you can see coming" without hovering.
- *Draw calls* reach 190–207 on the culture overviews. Each house kind and the shrine and theatre are their own instanced mesh per chunk. Not merged: the budget is still unmeasured on real hardware. Merging house kinds into one instanced mesh per chunk (with a per-instance variant) is the cheap lever if a laptop struggles.
- *`wantOf`* scans every building for a shrine or theatre on every call (for each home, for the overlay and the panel): O(homes × buildings). Cheap at this size; cache a "has shrine / has theatre" flag on state if towns grow large.
- *Labour*: farms built beside no road get no workers, and the tips say so. A farm next to the end of a road that doesn't quite reach it is easy to misplace, and the placement preview could warn.
