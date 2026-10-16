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

*Commits `b72e257` (this plan), `952b4d6` (sim), `2dc096d` (what Oliver sees), `5ac0fa5` (looked at and tuned), then the check-in.*

**What changed from the plan**
- *Numbers, from playing the towns forward.* A kill is 160 measures of meat (not 120). Cheese is 50 measures every three days at full grass and full staff, about 500 a month (not 300); the tip works it out from the grass (61% grass: about 310 a month). Carts take 240 measures of meat or cheese a trip. Stores, granary and stall rooms and the porter's loads as planned (800; 1,200 each; 600 each). Hunters: up to 3 out at once, 3 days apart, a two-day stalk, re-aiming up to three times, reach 40 tiles (32 was tried: it starved the culture towns of meat and their fine houses went down).
- *Regrowth depends on what's left.* A herd grows back a head every `10 days × full ÷ head`: 10 days when nearly whole, 35 days at 2 of 7. With a flat 15 days three lodges couldn't thin a herd for long; this way a hard-hunted herd stays thin and a lightly hunted one recovers quickly. The lodge's "about N measures a month" is the lesser of what its hunters can carry and what the game in its reach grows back, shared with the other lodges after the same herds (`meatLimits`, `lodgeOutlook`).
- *Seven herds* (`HERDS` in `src/map/coast.ts`): deer below the crags (7), in the north hills (8), on the east hills (7) and the far east slopes (6); boar in the pine wood by the bay (6), the west woods (6) and on the headland (5). Herds keep to firm ground whose four neighbours are firm too, so they don't stand on the edge of the sea or a cliff.
- *Grace for older saves* is six months from loading (not the save's tick): a new lodge's first meat and a dairy's first cheese take two to four months to reach every home through the carts, the granary and the porter, and with the usual ten days and two months a `#fine` save with a lodge and a dairy built straight after loading lost all 38 fine houses. Within the grace a home says what it lacks ("no meat or cheese yet"), and warns and goes down by the usual rules after it.
- *The food variety overlay* is its own overlay mode (`variety`): a stack of blocks over each home that buys food, one per food on its table (bread gold, meat red-brown, cheese pale), with a dark ring for each kind its level needs and lacks; the ground red where it is short of a kind it needs, amber where another kind the city makes would lift it, green where it has what it needs; farms, lodges, dairies, granaries and agoras marked. A legend under the top bar.
- *Yard pieces stand on their own ground.* The lodge's rack, hide frame and fire pit and the dairy's fence panels, goat shed, hay rack and trough are drawn as separate pieces, each at the lowest ground under it with its posts running into the slope; the cabin and the dairy house sit on the lowest ground under themselves. Drawn as one model, the back half of a dairy on a slope was buried (only the shed roof's tip showed).
- *Animals* are drawn in one batch per kind for the whole map (stags, hinds, boar, goats), not per walker chunk.
- *Demos.*
  - The culture towns (`#shrine` … `#closed`) build a hunting lodge (27, 52) and a dairy (23, 52) by the lane five months before the shrine (`MEAT_AT`), with the lane's tax office going in then (it went in with the shrine) and taxes heavy from then until the theatre goes up (or 600 ticks before the scene opens), to pay the new wages. At opening: `#shrine` 503 people, 6 huts, 18 cottages, 20 townhouses (was 501; 16 and 22), 507 dr (627); `#theatre` same levels, 601 people, 17 dr (137); `#fine` same levels, 781 people, 336 dr (420); `#closed` 860 people, 788 dr (735).
  - `#grow` gets a dairy by the lane five months before it opens, so placing the shrine still lifts its cottages: it opens with 1,384 dr (1,714), otherwise the same.
  - `#town` builds its lodge at the head of the north street (59, 32) and its dairy on the river meadow across the main street from the granary (50, 38), as soon as it can afford them after the shrine (a dairy at the far end of the core sent its carts too far). The newest plots at the hamlet's end go down 120 ticks before it opens (was 450), so a few are still tents. It opens with 616 people and 728 dr (was 622 and 1,520): 2 tents, 21 huts (24), 10 cottages, 6 townhouses, 39 fine houses. `#harsh`, `#taxes`, `#ledger`, `#collector` follow; `#dry` runs out of money sooner and opens at tick 8,450 (9,650).
  - `#table` as planned: the food town gets a shrine, then a dairy two months later; it opens as the dairy's first cheese reaches the stall (tick 4,870), with the panel on the blessed cottage nearest the agora, which climbs to a townhouse two days later; three more follow within three days.
  - `#overhunt`: three lodges up the lane at (27, 48), (23, 48), (23, 51), three months before it opens; it opens with the lodge tool in hand. The deer below the crags are down to two or three.
  - The cottage demos (`#water`, `#food`, `#vendor`, `#harvest`, `#people`, `#warning`, `#decline`, `#missing`, `#bridge`, `#workers`, `#streets`, `#settlers`) open exactly as before (fingerprinted: tick, people, money, every home's level and people, walkers).
- *Not built*: goats graze only inside their pen, not on the open ground beside it; the hunter has a spear but no bow or fur cap; the lodge has no smoke over its rack.

**What Oliver sees, as built**
- The hunting lodge: a log cabin (stacked round logs, notched at the corners) under a steep bark-shingle roof with crossed poles at the gable ends, a stag's skull and antlers over the door, spears leaning by it, a woodpile and a chopping block; in the yard a drying rack where up to six hams hang (as many as its store), a hide on a leaning frame, a fire pit ringed with stones with a spit; a trodden earth yard.
- The dairy: a small whitewashed stone house under red tiles with a blue-shuttered window, a bench beside it where up to eight cheese wheels stand (in two layers), pails and a milking stool; behind, a pen of woven wattle on a cropped meadow, with a thatched goat shed, a hay rack and a water trough; six goats (white and brown) grazing in the pen, still when the dairy has no workers.
- Hunters: a green tunic, a spear held forward; coming back, a deer or a boar over his shoulders. Deer (tawny, the stags antlered), boar (dark, bristly, tusked), in loose bunches that graze and drift, trail along when they move, and bolt when hunted.
- Ox carts loaded with hams or cheese wheels; the porter's handcart with a mix; the vendor's basket with a cheese and a ham beside the loaves when the stall has them; hams laid and cheeses stacked in the granary's yard; hams hung along the stall's awning and cheeses in its third basket.
- Tips: placing a lodge names the game in reach (kind, place, head, distance) and about how much meat a month, shared with the lodges already after it, or warns there is no game in reach; placing a dairy gives the grass and about how much cheese a month, or refuses poor ground ("Too little grass for goats … here 0%, it needs 35%"). Hovering a lodge, a dairy, a hunter or a herd says what it's doing; a herd says how fast it grows back.
- The household panel and moods: what's on the table, what the next level needs ("a month of water and of two kinds of food (bread and meat or cheese)"), "Only bread on the table: they'd like cheese too", a varied table as a reason for content; new chatter about plain tables and varied ones.
- Keys: M cycles the farm, the hunting lodge and the dairy; L cycles the food overlay, the variety overlay and off. The build bar has a button for each.

**Checks**
- 156 tests in 15 files, all passing (was 141 in 13); typecheck clean; build; smoke (extended: following a hunter, hovering the dairy, its goats drawn, the variety overlay and its legend, L cycling, `#table`'s panel, `#overhunt` and the lodge tool's tip beside the lane); every demo token opened in the browser with no page errors.
- New tests: `tests/wild.test.ts` (herds fresh and deterministic; a year of `#town` with herds only on firm empty ground and never below two head; regrowth slower when thin; off-road paths step only between walkable tiles with no corner cutting and never into the sea; a hunter's trip out, stalk and back; `#overhunt` thinning the crag deer to two and the lodge saying game is scarce, and the deer regrowing within five months once the lodges are cleared; a lodge with no game in reach; the dairy's rate by grass and its refusal on poor ground; the granary's and stall's rooms; the porter's mix; levels by kinds; determinism and a save mid-stalk) and `tests/variety.test.ts` (cottages with only bread stay cottages and say why, then climb once a dairy's cheese reaches them; townhouses that lose meat and cheese warn, name it and go back to cottages with their bread; the culture towns keep their kinds; a real slice 8 `#fine` save loads with herds and six months' grace, warns only after it, saves again identically; with a lodge and a dairy built after loading, at most a tenth go down and over 70% of fine houses end with all three foods).
- Fingerprints: every cottage demo opens exactly as before (tick, people, money, every home's level and people, walkers).
- Measured after (before in brackets), headless software WebGL at 1920 × 1080: bundle 949 KB raw, 272 KB gzipped (895, 254); ready at 1.19–1.35 s, first frame 1.44–1.59 s over three runs (1.14, 1.37); `#town` ready at 1.58 s, first frame 2.04 s (1.94, 2.39). Triangles and draw calls: the opening view 566 k, 63 (534 k, 57); `#food` 460 k, 75 (428 k, 69); `#fine` 549 k, 132 (498 k, 84); `#town` 705 k, 148 (658 k, 99), overview 821 k, 173 (774 k, 124). Update per frame paused: `#food` 0.66 ms (0.61), `#fine` 0.76 (0.56), `#town` 0.92 (0.77); running `#food` 1.10 (1.15), `#fine` 1.46 (1.26), `#town` 7.04 (1.99), but `#town` running is noisy over 13 frames: side by side over 60 frames with the slice 8 build, 5.1–5.5 ms against 3.2–3.9 ms, at about ten game ticks a frame (the headless browser draws a frame a second); the simulation's cost per tick is unchanged (0.11 ms mean), the rest is the view keeping up with more walkers (47 against 38) and the stores' looks. 77 geometries (55); a save of `#town` 215 KB (205).
