# Check-ins

Notes to Oliver, newest first.

## Slice 5 — The people who live there (16 Oct)

Every home is now a household you can click: a named family from somewhere in the Greek world, who they are, how they feel and why, what they have and lack, a line or two of their talk, and what has happened to them; when a home loses what it needs it warns you with a sign over its roof for two months before it goes down a level and some of the family walk out. You weren't here while it was built: every choice below is mine, from the spec's defaults.

Nothing to break: there are no saves until slice 7. What changes on purpose: a home now goes down a level about 70 days after a need runs out, not 30 (ten days' grace, then a two-month warning); a hut needs a month's bread in hand to become a cottage; undo only reaches back about a month, and not past someone moving in or grain being stored; the water and food overlays' posts now stand only over homes without, or with less than a month left. Every earlier demo still opens on exactly the same town.

### What's new
- The household panel: click any lived-in home (with no tool picked) and a parchment panel opens on the left. "The house of Sosias, from Megara, here since May 750 BC"; how they feel, from content to fed up, with a little face and every reason named ("+ Bread on the table", "− No water for 39 days"); two lines of talk from named members, which change every 12 days; what they have (and how long it lasts) and what they lack (and why, in the same words as the hover tip); what the next level needs; who lives there, with ages and how they are related ("Eurydike, 40, cousin of Sosias"; "Stephanos, 40, husband of Eurydike"); and their story, newest first ("Became a cottage: whitewash, a tiled roof and bread on the table"). A gold ring on the ground marks the house. Click another home to switch; Esc or open ground closes it.
- Families: the first settlers to a plot found the household and give it their name; later arrivals are the head's brothers, sisters and cousins with their own families. About 60 men's and 60 women's names (Nikias, Lykon, Theano, Myrrhine…) and 20 places they came from (Megara, Argos, a hill village in Arcadia…). Names and ages come from their own seeded stream, so they never change how the town grows.
- Warnings: when a hut loses its water, or a cottage its water or bread, for more than ten days, a round sign floats over its roof with a water drop or a loaf, its rim turning from amber to red as the two months run down and pulsing in the last ten days. The panel shows a warning box: "No water for 39 days. In 31 days they give up the cottage for a hut and 4 of them move away, unless the water carrier comes by", with a bar running down and the reason ("Why: no road joins it to a fountain").
- Decline: if nothing changes, the home goes down one level ("Back to a hut", and "−4" in rust), the people it can no longer hold walk out of town along the road, and the panel names them ("Charis, Menon and 2 others moved away"). Another level down takes another full warning.
- The trouble count: a red triangle in the top bar with the number of homes warning (hidden when none). Hover it for the list; click it to fly to the most urgent and open its panel.
- The "what's missing" overlay (I, or the house-and-question-mark button): homes about to go down a level are tinted red, homes lacking what they need to grow amber (with gold-rimmed signs saying which need), homes with all they need green. A small legend at the top says what the colours mean.
- Hover tips on homes say "The house of X" and "Click to see who lives here". The undo button greys out and says why it can't ("Undo only reaches back about a month", "A family has moved in: clear it instead").
- Under the hood: the town's drawing only redoes what changed (the ground and bridges only when a road or plot changes; workplaces only when something about them changes, not every frame), and the stall's baskets look full from about two-thirds stocked.

### What to try
1. Open `#people` for the fed town by the agora at street level, with the panel open on the house of Sosias. Read it, then click other homes. Hover one first to see its tip.
2. Open `#warning`. A year after the town grew, the one tile of road where its west street met the lane was cleared, so the water carrier and the food vendor can't get in: seven cottages along that street have signs over them and about a month left. The panel is open on one of them and the road tool is picked. Find the gap at the east end of the street, where it should meet the lane, lay the road back and let time run: within about two weeks of game time (14 seconds at normal speed) the water carrier has been down the street, the signs are gone and the story says she came back.
3. Open `#decline`, the same street a few weeks later with the panel on the house nearest to going down, 3 days from it. Time is running: watch it become a hut, the rest of the street follow within days, and the leavers walk out of town. Read the panel after.
4. Open `#missing` for the watered town with one farm feeding it, the what's-missing overlay on: red homes are short of bread, amber ones need it to grow. Click the trouble count in the top bar to go to the most urgent home. Then build a second and a third farm (M) on the green land by the river, beside the farm road, and press 3. A new field takes two months to ripen, so some homes go down to huts first; over the next few game months (a couple of minutes at speed 3) watch them come back to cottages and the reds fade. (One more farm alone isn't enough: with two, about six homes are still warning half a year on.)
5. In `#people`, press I to turn on the overlay (or open `#people-overlay`): the town is green, and the tents up the lane are amber with water signs, beyond the fountain's reach.
6. In any town, build something, wait a month at speed 3, and hover the undo button.

### What I'd like your eye on
- The panel: is it the right size and place (left side, 344 px wide)? Is the order right (warning, mood, talk, have and lack, who lives there, story)? Is anything there you'd never read, or missing?
- The talk. About 130 lines meant to be warm and gently funny and a little Greek ("The goat ate my sandal. I've forgiven the goat. I haven't forgiven the sandal-maker."). Do they land, and does the voice feel right?
- The signs over roofs: big enough from the default height, too big up close? Can you tell the red warning rim from the gold "needs to grow" rim in the overlay?
- The timing: ten days' grace, then two months' warning, then one level down. At normal speed a day passes each second, so a home goes down about 70 seconds after its water stops (a little over a minute of warning on screen; 15 seconds at the fastest speed). Enough time to notice and act, or too long to feel any pressure?
- The what's-missing colours: red, amber and green on the ground under the houses. Readable from the overview?
- Mood is only a reading for now: it explains, it doesn't make anyone leave. Does seeing "Fed up" with nothing following from it feel wrong?

### Known rough edges
- A home warns about one need at a time (the one missing longest), so a cottage cut off from both water and bread shows only the water sign; the panel lists both.
- People leave one at a time from the newest arrivals, not as whole families, so a husband can stay while his wife and children leave.
- The names come from lists of 60, so two households can share a head's name in a big town.
- The story keeps the last eight things that happened; older ones drop off.
- Talk repeats over time (about 130 lines), and the "situation" line only knows a few situations (no festivals, no gods yet).
- The gap in `#warning`'s road is hard to see from the opening camera: it is one grass tile between the end of the street and the lane, just east of the house nearest the lane.
- `#warning` and `#decline` take about 3.5 seconds to open (the town is run on for 16–17 months at load).
- The main-thread saving from drawing only what changed doesn't show in my headless numbers at this size of town; it should matter more in a bigger one.

### Measurements
- Tests: 88 in 9 files, all passing (was 74 in 8).
- Download: 216 KB compressed (was 195 KB): the names, the talk, the panel and the signs.
- Load: ready at about 0.9 seconds and first frame at 1.1 seconds by the page's own clock, as before.
- Every earlier view draws exactly what it did: the opening view 542,000 triangles in 125 batches, `#water` 511,000 in 112, `#food` 458,000 in 123.
- `#warning`: 472,000 triangles in 121 batches (the signs add about 1,200 triangles and no extra batches); `#missing` with the overlay on, 552,000 in 145; the overview with the overlay, 649,000 in 178.
- Homes going down a level over three in-game years: `#food` 0 (was 0); `#workers` 0 (was 2); the `#chain` town with three farms and the agora at the edge of town 0 (was 13, the back-and-forth found in review); with one farm, where bread is genuinely short, 43 (was 50).
- In `#food`, over a game year, the drawing compares the town's 25,600 tiles 0 times (was 638), and the workplaces are re-read 638 times instead of every frame. Main-thread time per frame before drawing is about 0.5–0.7 ms both before and after (software graphics, and the noise is bigger than the difference).
- Frame rate: not measured (software graphics only here). Target: 60 frames a second on a mid-range laptop at 1080p.

## Slice 4 — Bread on the table (16 Oct)

You can now build the city's first food chain: a wheat farm on the green land by the river, a granary and an agora, with ox carts, a porter and a food vendor at work, and huts that get water and food turning into whitewashed cottages. You weren't here while it was built: every choice below is mine, from the spec's defaults.

Nothing to break: there are no saves until slice 7. Two changes to what you saw before: every building now needs workers from nearby homes, so in `#fountain` the first water carrier waits until families have moved in; and rent arrives on the first of each month, so the drachmas in `#water` and `#streets` now tick up.

### What's new
- Wheat farm (M, 200 drachmas), on fertile ground by the river only: a mud-walled farmhouse under thatch with an open barn, a threshing floor and a haystack, and a fenced field of wheat in rows on ploughed furrows. The wheat grows from short green rows to tall gold over two months, then is cut to stubble, and stooks of sheaves stand on the threshing floor until the carts take them. While you hold the tool, ground that isn't fertile enough is washed rust-red near the pointer, and the label says how fertile the spot is and about how much it would harvest.
- Ox carts: after each harvest the farm sends up to three carts, each an ox, a two-wheeled cart piled with golden sheaves and a driver walking at the ox's head, by the shortest road to a granary with room. They unload and come back empty.
- Granary (G, 300 drachmas): a long stone storehouse under a tiled roof, two domed grain bins, and a yard where sacks pile up as it fills (it holds 3,200 measures; a measure feeds one person for a month).
- Agora (K, 250 drachmas): a paved square with a small stoa of columns along the back, and a food stall under a red-and-white striped awning with baskets of loaves that fill and empty with its stock. Whenever the stall has room for a full handcart, its porter pushes one to the nearest granary and brings back sacks of grain.
- The food vendor: a woman in a saffron dress with a wide flat basket of loaves on her head. She walks the streets the same way the water carrier does (her own reach of 32 road tiles, the hungriest homes first), and every hut or cottage beside her way has food for four months. Tents don't buy bread: their families live off the land until they have water.
- Cottages: a hut with water and food becomes a cottage, whitewashed with blue shutters and a terracotta tiled roof, a walled yard with an olive tree or a vine pergola. "Cottage" floats up in gold. A cottage holds 13 people (a hut 9). A cottage whose food or water has been gone a month goes back to a hut, and the people it can no longer hold walk out.
- Workers: half of each household can work. Jobs go to the nearest homes by road first: a fountain needs 2, a farm 10, a granary 6, the agora 6. A building short of workers works slower and says so when you hover it ("Short of workers: 4 of 10 · working at 40% · more homes nearby would help"). The top bar shows jobs filled out of jobs (red while any are empty); hover it to see which buildings are short.
- Rent: on the first of each month every lived-in home pays: a tent 1 drachma, a hut 2, a cottage 4. Hover the drachmas to see last month's rent.
- Bridges: drag a road straight across a narrow stretch of the river and it becomes a timber bridge, arched, with rails and piles in the water, at 40 drachmas a tile. The river is at least 6 tiles wide everywhere, so I let a bridge span up to 9 tiles (the 5 suggested would have allowed none); the narrow places are upstream, north of the town. Where it's too wide the label says so, and how wide it is. Clearing any part of a bridge clears all of it.
- The food overlay (L, or the loaf button): roads in the vendor's reach turn gold, homes with food get a gold post (taller the longer it lasts), huts and cottages without food a short plum stub, and farms and the granary are tinted so you can see the whole chain. It comes on by itself while you place an agora, farm or granary, and the agora's label says how many homes its vendor would reach.
- Hover any farm, granary, agora, cart, porter or vendor to see what it's doing: the crop and when it's harvested, the barn, the stock, who's on the road. A home's tip now has a food line and a work line. Click the vendor, a cart or the porter (or the agora or a farm) to follow them.

### What to try
1. Open `#food` for the town west of the river about a year on, with the whole chain running: three farms by the river, the granary half way along the farm road, the agora by the main junction, and most homes already cottages. Hover the agora, a cottage and a farm.
2. Open `#food-overlay` (or press L in `#food`) to see the vendor's reach in gold, the posts over fed homes and the plum stubs over the hungry ones. Press O to flip to the water overlay.
3. Open `#vendor` to follow the food vendor at street level on her round.
4. Open `#harvest` at the farms: one field is gold and nearly ripe, the other two were cut lately and their carts are on the road. The camera waits at the gold field; within a few seconds it is cut to stubble, and the camera follows its first ox cart down the farm road to the granary.
5. Open `#chain` for the watered town from `#water`, before any food buildings, with the farm tool picked. Build a farm on the green land by the river with a road beside it, a granary (G) and an agora (K) by the town, then press 3. The first harvest comes about 15 seconds later at fastest speed, and the first cottages about half a minute after you built. One farm can't feed this town; watch the plum stubs, then add a second and a third farm.
6. Open `#workers` for a young town of tents with the whole chain just built. The jobs figure in the top bar is red. Hover the farms: the granary and agora are nearer the homes, so they took the workers first. Press 3 and watch the jobs fill as families move in.
7. Open `#bridge` at the river north of the town: a bridge is already across, carts are bringing grain over it from farms on the far bank, and a second road stops at the bank by the granary with the road tool picked. Drag from the end of that road straight across the river to build another. Try dragging across where it's wider, or along the river, and read the label (in `#bridge`, a drag across a wide stretch may instead find its way round over the existing bridge; in `#water`, with no bridge yet, the label says how wide the river is there).
8. In `#harvest`, clear a farm with X while its carts are out: they go with it. Press U to bring it back.

### What I'd like your eye on
- The wheat field as it grows, green rows to gold to stubble, both close up and from the default height. Up close it's a ridge of stalks with a fringe of ears; does it read as wheat?
- Whether cottages read as a clear step up from huts, and whether the two kinds (gabled, and hipped with a vine pergola) sit well together.
- The agora: is the stall under its striped awning easy to spot from the usual height, and does the stoa look right?
- The ox carts: can you tell a loaded cart (golden sheaves) from an empty one, and is the ox clear against the road?
- The food vendor in saffron next to the water carrier in blue: easy to tell apart?
- The numbers. A farm harvests about 380–430 measures every two months on good ground; a town of 40 huts eats about 360 a month, and more as they become cottages, so it takes three farms. The stall holds 1,600 and the porter carries 800 (four times what I'd planned: with less, the stall ran dry while the granary sat full). In `#food` every hut becomes a cottage (38 of the 44 homes; the other six are tents beyond the water carrier's reach) and they stay cottages.
- Workers going nearest first: in `#workers` the farms by the river wait while the granary and agora fill up. Is that the right feel, or should farms come first?
- The bridge: its arch and rails, and whether 9 tiles is about the right limit.
- The plum stub for "no food" in the food overlay (terracotta is already "no water").

### Known rough edges
- The food vendor sells to every hut or cottage she passes, even if the stall is nearly empty; the last homes on her round can get only a few days' food.
- (Found in review.) An agora at the edge of town, such as at the top of the lane in `#chain`, can't get round every home in four months, so the homes at the far end of the vendor's reach go back and forth between cottage and hut even with a full stall. An agora nearer the middle of town avoids it. The hover tip only says the vendor "has taken other turns lately".
- Workers are shared out once a day, so a new building waits up to a day before anyone works there, and after an undo the jobs are rebuilt the next day.
- Three farms built at the same moment ripen together, so their carts come in a crowd; the demos stagger them.
- Carts and walkers pass through each other on the road and on bridges.
- The stall's loaves are small; from the default height its stock is easier to read from the hover tip than from the baskets.
- In `#harvest`, carts heading home from the granary are empty, so the first carts you see may not be carrying anything.
- There is no "what's missing" view yet; the food and water overlays have to be flipped between (that comes with slice 5's household panel).

### Measurements
- Download: 195 KB compressed (was 179 KB). Target: first load under 3 seconds.
- Load: by the page's own clock the game is ready about 0.9 seconds after the page starts loading and draws its first frame at about 1.1 seconds, with software graphics on my machine, the same as the slice 3 build side by side. (This note first said 3.4 seconds: that was the test browser noticing late, behind its slow software-drawn first frames. The review sorted this out.)
- The opening view, close-up views, `#streets` and `#water` draw exactly what they did: about 540,000 triangles in 125 batches for the opening view, and 511,000 in 112 for `#water`.
- `#food` (44 homes, 38 of them cottages after the review's fix, 3 farms, a granary, the agora, 15 walkers): 458,000 triangles in 123 batches; with the overlay, 492,000 in 125; at the farms, 510,000 in 134; from the overview, 616,000 in 172. A cottage costs about 400–450 triangles (a hut about 890), so a town of cottages is cheaper to draw than a town of huts, and no far-away cottage model was needed.
- Frame rate: not measured (software graphics only here). Target: 60 frames a second on a mid-range laptop at 1080p.

### What the review changed
- **The food town no longer flips back and forth.** In `#food` the granary sat full and the farms' barns filled up, but the agora's stall kept running empty: the porter only set off once the stall was half empty, and the town ate the rest before he was back. So about a dozen homes went from cottage to hut and back every few months, and families walked out and new ones walked in each time. Now his handcart carries twice as much and he sets off as soon as the stall has room for a full load. Over three years of play in `#food` every hut becomes a cottage and stays one (38 of the 44 homes; the other six are tents beyond the water carrier's reach). The same goes for `#workers` once its jobs fill. With one farm in `#chain` there still isn't enough grain, so homes still go back and forth until you add farms.
- **`#harvest` now shows the harvest.** The camera used to follow a cart already on the road, away from the gold field before it was cut. Now it waits at the gold field, you see it cut to stubble, and then it follows that farm's first cart to the granary. Step 4 above now says so.
- **Bridges go where you drag.** In `#bridge`, dragging straight across from the end of the second road (step 7) built no bridge: the road went round over the existing bridge a few rows south and laid a stretch of road on the far bank instead. Now a straight drag across builds its own bridge.
- **The hover tips give the real reason.** A farm with no workers said it needed workers "from homes joined to it by road" even when it was joined to plenty of homes whose people all worked nearer home (as in `#workers`). It now says that. A farm whose carts can't reach any granary, and an agora whose porter can't reach a granary with grain, now say that no road joins them. The jobs figure's tooltip now says "A wheat farm (1 of 10)".
- **Load time.** The 3.4 seconds above was the test browser noticing late. By the page's own clock the game is ready in about 0.9 seconds headless, the same as slice 3. I corrected the measurement line.
- Under the hood: when a house changes level, only the street patches around buildings that changed are redrawn, rather than the ground under every building in town.

What I checked: every "What to try" step above, in a headless browser. That covers the hover tips in `#food`, both overlays, `#vendor`, `#harvest` (including clearing a farm with its carts out and undoing it), `#workers` filling up, building the whole chain in `#chain` (in the simulation the first harvest comes about 15 seconds after building at fastest, the first cottage at about 25), and `#bridge`: a new bridge, undo, a diagonal drag, a drag along the river, a wide stretch, letting go after Esc mid-drag (no road is laid), and clearing the old bridge while carts were on it, then undoing that. I also placed an agora against a road on each of its four sides (the stoa's back wall faces away from the road every time) and ran several hundred random clears and undos of farms, granaries and the agora with grain in them, checking that no grain is counted twice and no cart is left without a home. I compared `#streets` and `#water` with the slice 3 build: the same city, apart from the new top-bar figure, the extra build buttons and the rent in the treasury. I can't judge how any of it looks or feels for you: whether the cottages, the wheat and the carts read well is still yours to say.

## Slice 3 — Water (15 Oct)

You can now build a fountain, watch its water carrier walk the streets with a jar on her head, and see the tents she passes turn into thatched huts that hold more people. You weren't here while it was built: every choice below is mine, from the spec's defaults.

Nothing to break: there are no saves until slice 7. One change to what you saw before: settlers now come faster when there is lots of free room (and faster still when homes have water), so `#build` fills up quicker than it did.

### What's new
- Fountains (B on the build bar, 150 drachmas): a paved square with a round stone basin and a column spilling four streams of water. It needs a road beside it.
- The water carrier: a woman in a bright blue dress with a big clay jar on her head. A couple of seconds after a fountain is built she steps out onto the road and walks the streets. At each junction she heads for the home within her reach whose water runs out soonest (a nearer one wins a close call); she turns round at dead ends and where the road ahead has no homes on it. She never goes more than 32 road tiles from her fountain. After about 48 tiles of fresh road she walks home the shortest way, rests a few seconds, and sets off again.
- Every home beside a road she walks past has water for four months (about two minutes at normal speed).
- Huts: a tent with water becomes a hut, with mud walls on a stone footing, a thick thatched roof (square on some, round on others), a dark doorway facing the road, and a yard with a woodpile, a fence or a stone wall, and a water jar. "Hut" floats up, glowing blue, when one goes up. A hut holds 9 people, a tent 5, so more settlers come to fill it.
- A hut whose water has been gone a month goes back to a tent ("Back to a tent" floats up, glowing rust red), and the people it can no longer hold pack up and walk out of town.
- The water overlay (O, or the drop button at the end of the build bar). Roads she can reach turn blue, paler towards the edge of her reach and brighter where she has walked lately. Each lived-in home gets a marker: a blue post, taller the longer its water will last, or a short terracotta stub if it has none. The overlay comes on by itself while you're placing a fountain, and the new fountain's reach shows as a pulsing blue on the roads. The label by the pointer says how many homes it would reach and how many of those have no water now.
- Hover over any home with no tool picked to see what reaches it: "Has water (40 days left) · becoming a hut", or "No water · the nearest fountain is 34 steps away by road; its water carrier goes 32 at most". Hover a fountain or the carrier to see what she's doing.
- Click the water carrier, or her fountain, to follow her with the camera through her rounds and rests. Drag the map or press Esc to stop.
- Hover the population figure in the top bar to see how often newcomers are arriving and why.

### What to try
1. Open `#water` for the neighbourhood west of the river five months on. A fountain stands by the main junction and most tents have become huts. At the top of the long lane running north, a few tents stay tents. Hover one to see why.
2. Press O in `#water` (or open `#water-overlay`) to see her reach in blue, the posts over watered homes, and the terracotta stubs at the end of the lane.
3. Open `#carrier` to follow the water carrier at street level as she walks her round. Drag the map to let her go; click her again to pick her back up.
4. Open `#fountain` for the same town before any fountain, with the fountain tool picked. Move the pointer beside a road and read the label, then click to build. Press 3 for fastest and watch the tents she passes turn into huts.
5. In `#fountain`, try a second fountain somewhere else, or build one with no road beside it and hover it.
6. In `#water`, press X and clear the fountain, then let time run at fastest (3). About a month after each home's water runs out, its hut goes back to a tent and a few people walk out. Press U to bring the fountain back.
7. In `#water`, extend the northern lane with the road tool (T) and put plots (H) along it (there are only about six tiles of flat ground before the hills, so the lane can't go far). Use the overlay to see where her reach ends, and where a second fountain would help.

### What I'd like your eye on
- The huts next to the tents: do they read as a clear step up, and as mud-and-thatch homes rather than cottages?
- The water carrier: can you pick her out among the settlers without the overlay, and is her pace good to follow?
- How she chooses her way. She goes for the thirstiest homes first rather than wandering at random, so a compact town stays watered. Does that feel right, or too clever?
- The numbers: a reach of 32 road tiles, water lasting four months, a month's grace before a hut falls back. With one fountain, the 40 or so homes in `#water` stay watered; a much bigger town needs a second fountain.
- The overlay: are the blue posts and terracotta stubs readable, or too much? Is the pulsing blue preview of a new fountain's reach clear?
- The fountain itself, both up close and from the overview.
- How fast settlers come now that it depends on free room and water. In `#water` the road in from the west is busy with families; is that lively, or too busy?

### Known rough edges
- In `#water`, homes far up the lane but still within her reach can take a round or two to get their first water, because she starts with the streets nearest the fountain.
- Clearing a fountain sends its carrier home on the spot: she just vanishes.
- The fountain has no workers yet (they come with slice 4).
- The overlay's posts stand on every lived-in home at once; in a big city that may be a forest of sticks.
- A hut costs about twice the triangles of a tent. I can't measure the frame rate here, so a town of a few hundred huts is worth watching on your machine.
- There are still no bridges, so land east of the river needs its own road in.

### Measurements
- Download: 178 KB compressed (was 170 KB). Target: first load under 3 seconds.
- Load: ready in about 2.7 seconds with software graphics on my machine (2.1–2.9 before).
- Drawing the opening and close-up views is unchanged: about 540,000 triangles in 125 batches, and 380,000–400,000 in about 70.
- `#water` (46 homes, 40 of them huts, a fountain, 21 groups walking): 511,000 triangles in 112 batches; with the overlay on, 545,000 in 114; from the overview, 652,000 in 156.
- The simulation for a town of 161 buildings with 20 fountains and carriers takes about 0.07 ms per tick, so the sim is a tiny share of each frame.
- Frame rate: not measured (software graphics only here). Target: 60 frames a second on a mid-range laptop at 1080p.

### What the review changed
- **The water carrier could leave homes dry for good even though they were within her reach.** She only looked a short way down each street when choosing her way, so homes past a long empty stretch of road (with a couple of homes near the fountain), or on the far side of a loop of streets, could miss out every single round, while the overlay showed them in reach and the hover tip said she just "hadn't come this way yet". Now she weighs every home within her reach when she picks her way at a junction, and goes for the one whose water will run out soonest, counting the walk there. In `#water` the counts I checked come out the same (40 huts, all watered, over several years of play); on loops and long lanes she now takes turns round both sides.
- **Walkers now keep their own colours.** The colour that should only dye a settler's tunic (and the water carrier's dress) was dyeing the whole figure, so faces, hair and bundles took the tunic's colour, and the carrier's terracotta jar came out nearly black. Now skin, hair, bundles and her jar show as they were meant to. This also changes how the settlers from slice 2 look up close.
- Step 7 above now says how much room there is past the end of the lane.

What I checked: every "What to try" step above, driven in a headless browser (the hover tips read as written; clearing the fountain while following her stops the camera without a problem, and U brings the fountain back with a new carrier), the earlier links (`#streets`, `#settlers`, `#build`, the views), and a handful of other street layouts in the simulation (a grid, a loop, a long lane, a fountain at the end of a lane, two fountains sharing streets). Whether her new choices look right on the streets, and whether the settlers look better with their own faces, is for you to judge.

## Slice 2 — Streets and settlers (15 Oct)

You can now lay out your first streets, mark out housing plots beside them, and watch families walk in from the edge of the map and pitch tents. You weren't here while it was built: every choice below is mine, from the spec's defaults.

Nothing to break yet: there are no saves until slice 7.

### What's new
- A build bar at the bottom: road (T), housing (H), clear land (X) and undo (U or Ctrl+Z). Esc or a right-click puts the tool down.
- Roads you drag across the land. They follow the ground, find their own way around water, steep rock and anything already built, run straight where they can, and join up at corners and crossings. They're sandy paving, lighter in the middle and worn at the edges. Where a road leaves the map, a worn track carries on into the countryside.
- Rules you can see: while a tool is picked, a faint grid lies on the ground around the pointer, ground you can't use there is washed rust-red, the tiles your drag would take are lit (red where they can't be built), and a little label by the pointer gives the cost or the reason. The sea, the river and its wet pebbly bank, and steep rock are off limits; trees, bushes and rocks are cleared for free when you build over them.
- Housing plots, two tiles by two, marked out with stakes and little pennants. Click for one, or drag to fill an area.
- Settlers: small groups of two to four in coloured tunics, carrying bundles, walk in along the road from wherever it meets the edge of the map (the map's edge glows gold while you hold the road tool, to show where). Each group finds a plot beside a road joined to the edge and pitches a tent: a striped ridge tent or a round bell tent, with a cooking fire, a wisp of smoke, pots and bundles. The tent rises into place, "+3" floats up, and later groups move in until it holds five.
- Population and drachmas in the top bar. You start with 5,000; a road costs 4 drachmas a tile and a plot 10. Clearing is free.
- Clearing and undo: clear a tent and its family packs up and walks back out of town. Undo puts back what your last action changed (the last ten actions), with the drachmas; a cleared tent comes back as an empty plot, because the family has already gone.
- Hover over a plot or tent with no tool picked to see who lives there, or what it's waiting for ("needs a road beside it", "needs its road joined to the edge of the map").
- Links are now short tokens after a #, like `#streets`, so they work on the published page.

### What to try
1. Open `#streets` for a little neighbourhood on the plain between the olive grove and the river mouth, a month or so in: some tents up, more plots waiting, families on the road. Time is running, so watch them arrive; zoom right in on a tent.
2. Open `#settlers` to stand by the road in from the west and watch families walk towards you with their bundles.
3. Open `#build` for fresh land with the road tool already picked. Drag a road in from the gold edge of the map, press H and drag out a row of plots beside it, then press 2 or 3 to hurry the settlers along.
4. In `#build`, try to lay a road across the river or up into the rocky hills, and drag plots over the river bank, to see what's refused and why.
5. In `#streets`, press X and drag over a tent and a bit of road to clear them; watch the family walk out. Then press U to undo.
6. Pause with Space and build: roads and plots go down at once while time stands still.
7. Add `-fast` or `-fastest` to any link (`#streets-fastest`) to start at that speed. The slice 1 views still work the same way: `#coast`, `#river`, `#bay` and the rest.

### What I'd like your eye on
- The roads: sandy paving with soft worn edges. Should streets look more like stone, or more like packed earth? Are they wide enough?
- The tents and the settlers at street level: are the people the right size next to the tents and trees, and do the groups read as families arriving?
- How often settlers come (a group every four seconds or so at normal speed, while there's room) and how fast they walk. Too slow to watch, or too busy?
- The rule for the river: the wet, pebbly bank and about a tile beside it are off limits. Does that feel fair, or too strict?
- The placing grid, the red-washed ground and the gold map edge: helpful, or too much on the screen?
- Costs: 4 drachmas a road tile and 10 a plot out of 5,000 makes money matter little for now; it will matter more once fountains and farms cost hundreds.
- Left-drag places while a tool is picked; with a tool picked you move with the keys or the middle button. Does that work for you?

### Known rough edges
- There are no bridges yet, and the river and the crags where it rises cut the map in two: a road can't get from one side to the other. Land east of the river needs its own road in from the east or north edge of the map.
- Settlers come for as long as there's room; nothing yet makes the city more or less attractive to them.
- Clearing a tent can't be fully undone: the plot comes back, the family doesn't.
- The smoke from the fires is a few small pale puffs; it may read as specks from some angles.
- Roads meet the hillside in small steps on rough ground, because each tile follows the ground under it.
- I still can't measure the frame rate (software graphics only here). Splitting the plants into areas means close-up views now draw about 30% fewer triangles, at the cost of more, smaller batches; it would help to hear how it runs on your machine.

### Measurements
- Download: 169 KB compressed (was 153 KB).
- Load: about the same as before, 2 to 3 seconds to the first picture with software graphics on my machine (I compared both versions side by side). Target: under 3 seconds.
- Drawing, opening view: about 540,000 triangles (same as before) in 125 batches (was 21). Close-up views: 380,000–400,000 triangles (was 540,000) in about 70 batches.
- The `#streets` neighbourhood (24 homes, 59 road tiles, 8 groups walking) adds only about 11,000 triangles.
- Frame rate: not measured (see above). Target: 60 frames a second on a mid-range laptop.

### What the review changed
A second pass went through every "What to try" step above in a browser, looked at the screenshots, and tried to break the new tools. What it fixed:
- An invisible strip above the build bar swallowed clicks and drags on the map: the first-time hint ("Drag to move…") kept catching the mouse after it had faded away. The little labels by the pointer and the "+3"s could also get in the way of the mouse. None of them catch it now. (This one had been there since the coast.)
- Undo could hand out free plots: clearing some plots, undoing that, then undoing the plots themselves left the plots standing and still gave the drachmas back. Now the plots go and you get the money back once.
- Clearing a tent together with the road beside it (step 5) often cut the family off from the edge of the map, and they simply vanished. Now a family with no road out packs up and walks off across the fields to the nearest edge of the map, going round other people's tents.
- Families on the road no longer step over a piece of road you've just cleared in front of them: they stop and turn round where they stand. A group still beyond the edge of the map when you cut their way in turns back, instead of vanishing.
- The label by the pointer flips to the other side near the edge of the window, so it can always be read.
- `#build` no longer greets you with "Drag to move", since there dragging lays road; the controls card ("?") now says undo also takes back clearing.

Things I looked at and left for you to judge: the extra drawing batches (about 125 in the opening view instead of 21), which should be well within a laptop's reach but I can't measure here; the strip of about a tile beside the river that's off limits; and the smoke, which up close is a few pale puffs.

## Slice 1 — The coast (15 Oct)

The game now opens on a sunny stretch of Greek coast you can fly around, with a clock you can pause and speed up. You weren't here while it was built: every choice below is mine, from the spec's defaults.

### What's new
- A hand-shaped coast in warm low-poly 3D: a curved bay with a small rocky islet, a headland with stone pines to the east, a river that springs from a rocky gorge in the hills and winds down a green, fertile plain to the sea, olive groves planted in loose rows, scrub and yellow broom on the dry golden slopes, cypresses, reeds along the river, and drifts of poppies and daisies.
- Water that moves: gentle waves rolling with the breeze, foam breathing on the beaches, the sun twinkling on the sea, the river flowing with streaks of light and melting into the bay at its mouth.
- Warm afternoon light with soft shadows, a hazy horizon, and the coast and hills carrying on beyond the edge of the land you'll build on.
- A camera you can swing from a view of the whole coast down to standing among the olive trees.
- The calendar: the city's year starts in March 750 BC and counts down, with pause, normal, fast and fastest. At normal speed a month takes about 30 seconds.

### What to try
1. Open `#coast`. Drag with the left mouse button to move across the land, drag with the right button to turn and tilt, scroll to zoom. Press Q and E to turn a quarter at a time, N (or the compass) to face north, and "?" for all the controls.
2. Open `#river` to start at street level on the river bank, looking upstream to the hills. Zoom all the way out from there.
3. Open `#street` to stand among the olive trees west of the bay.
4. Open `#bay` and turn until you face the sun to see the sea glitter.
5. In any view, press Space to pause, then 1, 2 and 3 for normal, fast and fastest, and watch the month and the dots for the days.
6. Also there: `#hills` (where the river rises), `#headland`, `#mouth` (where the river meets the sea) and `#overview` (the whole map from high up).

### What I'd like your eye on
- The overall look: is this the warm, toy-like Greece you had in mind? I tuned colours, light, terrain and water over many rounds of screenshots, but whether it's lovely is your call.
- The colours of the land: I made the slopes dry and golden and kept bright green for the river plain (where farms will go). Too dry, too green, or too patchy?
- The water: the twinkling glints on the sea and the white foam lines on the beaches. Too busy, or not enough?
- The camera: how zooming in lowers the view towards street level, how fast it pans and turns, and whether left-drag to move feels right.
- The calendar: years counting down from 750 BC, with ordinary month names. Would you rather have Greek month names, or a plain "Year 1"?
- The opening view: is that the right first look at the coast?

### Known rough edges
- The river's water now has a smooth edge (see below), but the pebbly strip between the water and the grass still meets the grass in little triangular steps, because the land is shaped in one-tile steps and the stream is only a few tiles wide.
- The far scenery beyond the coast is simpler than the coast itself and only meant to be seen through the haze.
- There's nothing to build yet, and no population or money in the top bar; those come with streets and settlers next.
- No sound yet.
- I couldn't measure the frame rate: I can only run the game with software graphics here, which tells us nothing about your laptop. It would help to hear whether it runs smoothly for you, and on what machine.

### Measurements
- Before: nothing existed.
- Download: 153 KB compressed (three files).
- Load: about 2.5 seconds to the first picture on my machine using software graphics, of which shaping the coast takes about a third of a second; on a real graphics card it should be quicker. The target is under 3 seconds.
- Drawing: about 540,000 triangles in 21 batches each frame (after the review's changes), the same in every view. That should sit well within a laptop graphics chip's reach, but the town will need room too, so I've noted ways to trim it before the town grows.
- Frame rate: not measured (see above). The target is 60 frames a second on a mid-range laptop with a few hundred buildings, which can only be judged once the town exists.

### What the review changed
A second pass went through every "What to try" step above in a browser, looked at screenshots from each prepared view and from far out in every direction, and fixed what it found:
- Space now carries on at the speed you had before you paused; it used to always go back to normal speed. Holding Space down no longer flickers between paused and running.
- Keyboard zoom could get stuck: pressing "+" (Shift and "=") and letting go of Shift first left the view zooming in on its own. Fixed. Holding Q or E now turns a quarter at a time, instead of piling up turns that kept spinning after you let go. The 1, 2 and 3 speed keys also work on keyboards where the digits need Shift.
- Scrolling near the ground with the pointer towards the horizon used to throw the view a long way in a single notch; now it only drifts a little that way.
- The river's edge: the water now draws its own smooth edge with a thin line of foam, over a narrow pebbly shelf, instead of the land's triangles cutting a saw-tooth into it. Small white flecks that showed beside the upper river from far away are gone.
- The river mouth: the river now melts into the bay; before, the two waters overlapped in pale squares where they met.
- The far sea had a hard line where its colour jumped and a thin crack running across it, and a faint line ran along the horizon where the sky met the haze. All three are gone.
- The far scenery is rebuilt: the hills beyond the map no longer streak into long stripes or fan out in wedges at the corners, and the coastline wanders into headlands and bays as it runs off to the horizon instead of a ruler-straight edge with a pale wall where land met sea.
- Down at street level, trees further ahead now cast shadows too; before, shadows stopped a short way in front of you.

Whether these read better is for you to judge.
