# Slice 9 — Meat and cheese

*16 Oct 2026. Phase 2, "A richer city" (`docs/specs/2026-10-16-a-richer-city-design.md`). The second slice of the phase. Builds on slice 8, "Coin and the ledger", and its review.*

## Goal and check-in

The table gets varied. Wild deer and boar roam in herds on the hills and in the woods, built in code in the same toy style as the walkers. A hunting lodge at the edge of the woods sends hunters off the road and across open country to the nearest herd; they stalk it, bring down an animal and walk back with the carcass over their shoulders, and the herd scatters a little way. Herds thin when hunted hard and slowly grow back, and the lodge says so when game nearby is scarce. A dairy on the grass keeps a small herd of goats grazing round it and makes cheese. Ox carts take meat and cheese to the granary, which now holds all three foods; the agora's porter brings a mix back to the stall, and the food vendor's basket carries whatever the stall has: loaves, a cheese, a ham. Every food feeds a home; a cottage still needs one kind, but a townhouse now needs two and a fine house all three, with the usual warning period for homes that were already above that, so old towns don't drop at once. A food variety overlay shows which homes have which foods, and the household panel says what's on the table and what the next level would take.

**Oliver can:** follow a hunter out to a herd and back, watch the goats at the dairy, see a cottage climb to a townhouse once a second food reaches it, and over-hunt a valley to see the lodge go short.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#hunter`: `#town` at street level by its hunting lodge, following a hunter out to a herd and back.
- `#dairy`: `#town` close over its dairy, the goats grazing round it.
- `#table`: the food town a year on, with a shrine already blessing its cottages and a dairy whose first cheese has just reached the stall: cottages climbing to townhouses as cheese reaches them, the food variety overlay on, the panel open on a cottage about to climb.
- `#overhunt`: the food town with three hunting lodges on the edge of the west woods, months in: the herd they share is down to its last few and the lodges' tips say game is scarce.
- `-overlay` on `#table`, `#hunter`, `#dairy` and `#overhunt` shows the food variety overlay.
- Every earlier token keeps working.

## Not in this slice

Oil, the storehouse and the shared production model for goods (slice 10); fleece, wine and the villa (slice 11); fire and collapse (slice 12); the ship and sales (slice 13); retuning money pressure (harsh taxes, the collector's round: handed to slice 14); seasons for herds; buying food.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- Sim code (`src/sim/`, `src/map/`) stays pure and deterministic: seeded RNG in the state, no `Math.random`, `Date`, `performance` or timers (the purity test enforces it). Every player action reaches the sim as a command through the queue.
- The wild has its own random generator (`s.wild`), so herds wandering never shift the main or the people's generator: a town without a lodge has the same history as before.
- Money moves only through `pay` (`src/sim/treasury.ts`); building costs come from `priceOf`; new workplaces pay wages through `JOBS`.
- Animals and hunters move off the road deterministically and cheaply: herds are a handful of light entities in the state, the animals in a herd and the goats round a dairy are placed by the renderer from the sim's state with instanced meshes and no per-frame allocation, and nothing walks into the sea or up a cliff.
- The renderer and UI only read sim state. Static build, `base: './'`, no runtime network requests, all art generated in code.
- Judge by screenshots, tune by eye, never claim it looks or feels right on Oliver's behalf.
- Earlier demos with only cottages (the water, food and people demos) must open exactly as before (fingerprinted: tick, people, money, every home's level and people, walkers). Demos with townhouses and fine houses get a lodge and a dairy where it keeps their story; what moved is said in the check-in.

## Before

Measured at `6fb12ed` (the end of slice 8's review), headless Chromium with software WebGL at 1920 × 1080:

| | Before |
|---|---|
| Tests | 141 in 13 files, all passing; typecheck clean (about 14 s) |
| Bundle | 3 files, 895 KB raw, 254 KB gzipped |
| Load (local, headless, page clock) | ready at 1.14 s, first frame at 1.37 s; coast bake 0.47 s, scene build 1.07 s |
| Opening view / overview / river / street / bay | 534 k triangles, 57 calls / 542 k, 59 / 354 k, 28 / 375 k, 30 / 376 k, 26 |
| `#water` / overview | 491 k, 54 / 653 k, 82 |
| `#food` / overview | 428 k, 69 / 619 k, 102 |
| `#fine` / overview | 498 k, 84 / 677 k, 116 |
| `#closed` / overview | 479 k, 100 / 670 k, 133 |
| `#town` | 658 k, 99 / street 594 k, 86 / overview 774 k, 124; ready at 1.94 s, first frame 2.39 s (setup 0.60 s); 622 people, 81 homes, 38 walkers, 96 buildings |
| Update per frame, paused / running | `#food` 0.61 / 1.15 ms; `#fine` 0.56 / 1.26 ms; `#town` 0.77 / 1.99 ms |
| GPU objects | 55 geometries, 4 textures |
| A save of `#town` | 205 KB |
| Demos at opening (tick, people, money, levels tent/hut/cottage/townhouse/fine) | `#food` 3600, 453, 1,714 dr, 6/0/38/0/0; `#fine` 6300, 783, 420 dr, 0/0/6/0/38; `#theatre` 4800, 602, 137 dr, 0/0/6/21/17; `#town` 7200, 622, 1,520 dr, 2/24/10/6/39 |

## Design decisions

**Three foods.** Wheat (eaten as bread), meat and cheese, in measures, in a fixed order (`src/sim/foods.ts`).
- *Stores.* A building keeps wheat in `stock` as before, and meat and cheese in new `meat` and `cheese` fields; a granary also has `meatIn` and `cheeseIn` beside `incoming` (room reserved by carts on their way). Each food has its own room in a granary (wheat 3,200 as now; meat and cheese 1,200 each, tuned), so a granary full of wheat still takes meat. The agora's stall likewise: wheat 2,400 as now, meat and cheese 1,200 each.
- *Homes* get `meatUntil` and `cheeseUntil` beside `foodUntil` (bread): the tick each food lasts until.
- *What a home eats.* A person still eats a measure a month in all, shared across the kinds of food on the table: when the vendor tops a home up, each food she adds costs `people × months added ÷ kinds on the table after her visit`. A town with only bread eats exactly what it ate before (one kind, the old cost); with three kinds each lasts three times as long per measure. Only huts and better buy food, as before.
- *Variety and levels.* A home's food need is met by its level's number of kinds: a cottage one, a townhouse two, a fine house three. The food need lasts until the k-th longest-lasting food runs out (k = the kinds its level needs), so the existing rules (warn after ten days, go down two months later; rise with a month in hand) apply unchanged. A hut becomes a cottage with a month of any one food; a cottage becomes a townhouse with a month of two kinds (and the blessing); a townhouse a fine house with a month of all three (and plays). A cottage counts as wanting a second food only once the city makes more than one kind (a farm, a lodge or a dairy), as it wants the priestess only once there is a shrine.
- *The food vendor* carries whatever the stall has. At a home she tops up every food she has (wheat first, then meat, then cheese). At a junction she heads for the home that needs her soonest *for what she carries*: a home's food score is reckoned as its supply would be after her visit, so she doesn't spend a round on a townhouse short of meat when the stall has none. With only wheat in the stall this gives exactly the old choices.
- *The porter* goes when any food on the stall is down to its low mark and a granary he can reach has that food; at the granary he loads up to 1,200 wheat (as now) and up to 600 each of meat and cheese, whatever the stall has room for. With only wheat about, exactly as before.
- *Grace for existing homes.* Homes get a `grace` tick: a need counts as missing from no earlier than it. A version 7 save is migrated with every home's `grace` set to the tick it was saved, so its townhouses and fine houses (which have only bread) get the usual ten days and two months before anything goes down, time to build a lodge and a dairy. New games start with 0. The same field serves slice 10's oil and slice 11's fleece and wine.

**The wild** (`src/sim/wild.ts`, herds authored in `src/map/coast.ts` like the groves).
- *Herds.* About seven, deer on the hills below the crags and the north and east hills, boar in the pine woods and the west woods, each with a home range (a centre and a radius). A herd is a light entity in the state: where it is, where it is heading, how many head (deer up to 8, boar up to 6), and clocks. It grazes a while, then ambles to another spot in its range, on open ground: never onto water, the river's banks, ground too steep (cliffs), roads or buildings, and never across them on the way (the line is checked). A herd whose ground is built over moves off. Its own generator, `s.wild`.
- *Thinning and regrowth.* A hunted herd loses one head per kill and bolts a little way from the hunter. It grows back one head every fifteen days or so (tuned) up to its full size. Hunters leave the last two head alone, so no herd dies out.
- *Off-road paths.* An A* over the map's tiles (eight ways, no corner cutting), through tiles a person can walk: dry ground a road could take (no water, no cliffs), roads and bridges, never through buildings. Waypoints are pruned to straight runs where the line between is clear. Scratch arrays live outside the state (as for the road searches); it is a pure function of the map and the tiles.

**The hunting lodge** (3 × 3, 200 dr, 6 workers, M twice).
- Sends a hunter when it has workers, room in its store (800 measures) and a herd within 40 tiles that has more than two head: up to three out at once (fewer when short-handed), a few days apart. He steps out of the lodge, walks across country to the herd (re-aiming if it has moved, up to three times), stalks it for two days, takes one head (120 measures of meat, tuned) and walks back with it. If the herd is down to its last two when he gets there, he comes back empty.
- *Game scarce.* When no herd in reach has more than two head, the lodge sends nobody and its tip says so, naming the nearest herd and how many it has left, and that it grows back with time.
- Carts take its meat to the granary like a farm's wheat (the cart code is shared: a cart carries one food).
- *Placing:* anywhere a building can go; the tip names the nearest herds within reach and how many head they have.

**The dairy** (3 × 3, 250 dr, 8 workers, M three times).
- *Grass.* A spot's grass is worked out from the map (fertile, not rocky); the dairy needs a footprint with at least 35% grass (the green land), and it makes cheese in proportion: about 300 measures a month on the best grass, fully worked (tuned). The store holds 800; carts take it to the granary. The placing tool washes rust over ground too poor for it and the tip says how good the grass is.
- *Goats.* Six goats graze on the open ground beside it (and in its pen), drawn by the renderer from the dairy's place and the tick; they wander between nearby free tiles and never onto roads, buildings, water or cliffs.

**Readable**
- *Hover tips:* the lodge (workers, hunters out and where, its store, the herds in reach or why none); the dairy (workers, grass, cheese made a month, store, carts); a hunter (heading for the deer below the crags; stalking; bringing back meat); a herd (deer below the crags, 6 head, grows back in time); the granary and the stall by food; carts by what they carry; a home's food line names what's on the table ("Bread and cheese · cheese runs out first, in 40 days").
- *The household panel:* "What they have" shows each food with its days; "What they lack" names the kinds the level needs and why each is missing (no lodge or dairy; not in the stall; the vendor hasn't come); a cottage with only bread says "Bread, and only bread, since they came" when the city makes other foods; the next-level line names the second or third kind.
- *Moods and chatter:* a varied table lifts a mood a little ("Bread, meat and cheese on the table"); a townhouse down to one kind warns with the missing foods named ("No meat or cheese for 12 days"). New lines about cheese, game, goats and the hunt.
- *The food variety overlay* (L twice, or its button): roads in the vendor's reach tinted gold as for food; each home that buys food a stack of up to three coloured discs, one per food on its table (bread gold, meat red-brown, cheese cream), with a plum stub where its level lacks a kind it needs; lodges, dairies, farms and granaries tinted so the chain reads.
- *Keys.* Every letter is taken, so the food buildings share M: M picks the wheat farm, M again the hunting lodge, M a third time the dairy. L shows the food overlay, L again the food variety overlay. The build bar has a button for each.

**What Oliver sees**
- *Hunting lodge:* a log lodge with a steep shingle roof and antlers over the door, a smoking rack of hams, a hide stretched on a frame, a chopping block and a woodpile.
- *Dairy:* a whitewashed byre under thatch, a wattle-fenced pen with a trough, a cheese shed with wheels on its shelves (as many as its store), milk jars.
- *Hunter:* a man in a leaf-green tunic and a fur cap with a bow and a spear; coming back, a carcass over his shoulders.
- *Deer* (tawny, white-tailed, the bucks with antlers), *boar* (dark, bristly, tusked), *goats* (white and brown, little horns): low-poly like the ox, legs swinging as they walk, heads down to graze.
- *Carts* loaded with meat (haunches under a hide) or cheese (pale wheels) besides sheaves; the porter's handcart with a cheese and a ham among the sacks; the vendor's basket with a cheese wheel and a ham beside the loaves when the stall has them; the granary's yard with cheese wheels and hams beside the sacks; the stall's counter likewise.

**Demos**
- *Cottage demos are untouched*: the water, food and people demos open as before (fingerprinted). Herds now roam their hills; nothing in them hunts.
- *The culture towns* (`#shrine`, `#priestess`, `#theatre`, `#actor`, `#fine`, `#compare`, `#closed`) get a hunting lodge by the west woods and a dairy beside the lane when the shrine goes in, so their townhouses and fine houses have the kinds they now need; `#grow` gets a dairy a few months before it opens, so placing the shrine still lifts its cottages. Their numbers at opening will move and are re-checked against their check-ins (every level present, no homes down in two years, the theatre's warned homes).
- *`#town`* gets a hunting lodge at the head of its north street (deer in the north hills) and a dairy on the grass at the east end of the core, as its builder would, waiting for the money. Its history changes; it is re-checked (every level, the bridge, a few hundred people, no drops in two years, money within the slice 8 bound). The money demos (`#harsh`, `#dry`, `#taxes`, `#ledger`, `#collector`) follow from it.
- New: `#hunter`, `#dairy`, `#table`, `#overhunt` as above.

**Saves.** State version 8: `wild`, `herds`; buildings `meat`, `cheese`, `meatIn`, `cheeseIn`, `meatUntil`, `cheeseUntil`, `grace`; walkers `food`, `meat`, `cheese`; kinds `lodge`, `dairy`, walker kind `hunter`. A version 7 save is migrated (`src/sim/migrate.ts`): every new field zero, herds placed fresh, `grace` the save's tick. Phase 1 (version 6) saves go through both steps.

## Tests

- Determinism and replay with a lodge, a dairy, herds and hunters on the move; a save mid-hunt (a hunter out, a herd fleeing, a porter with a mix) carries on identically.
- The wild: herds never stand on water, cliffs, roads or buildings over a long run; a herd hunted below its size grows back; hunters never kill the last two head; off-road paths cross only walkable tiles and avoid buildings.
- The chain: a lodge's hunter walks to a herd and back and its meat reaches the lodge; a dairy makes cheese at the grass's rate; carts take meat and cheese to the granary's own room for each; the porter brings a mix; the vendor tops up each food at the shared cost (with only wheat, the old cost exactly).
- Variety: a cottage with two kinds and a blessing becomes a townhouse; a townhouse down to one kind warns and goes down two months later; a fine house needs all three; with only bread, a cottage stays a cottage.
- Saves: a version 7 save (a gzipped `#fine` from the slice 8 code) loads, plays two months without a home going down, and its townhouses warn about food after the grace; a phase 1 save still loads.
- The earlier demos: the cottage demos fingerprint as before; `#town` and the culture demos keep their promises (existing tests, bounds updated with reasons).
- The ledger invariant with the new buildings' costs and wages.

## Tasks

1. Plan (this file). Commit.
2. Sim: foods, granary and stall per food, porter and vendor mix, variety needs and grace, herds and the off-road search, the lodge and hunters, the dairy, shared carts, migration, demos; tests; tune by running `#town` and the culture towns forward. Commit.
3. What Oliver sees: the lodge, dairy, hunter and animal models, cart and vendor variants, stores in the yards, the variety overlay, tips, panel lines, chatter, the build bar and keys; smoke extended. Commit.
4. Look and tune: screenshots of `#hunter`, `#dairy`, `#table`, `#overhunt`, `#town` and the earlier demos; adjust. Commit.
5. Full checks, measure, As built, the check-in. Commit, push, sync.

## As built

