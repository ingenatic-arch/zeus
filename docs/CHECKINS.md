# Check-ins

Notes to Oliver, newest first.

## Slice 13 — The ship comes in (17 Oct)

The city can now sell what it has spare: a trading post on the bay shore sends dockers to carry surplus food and goods from the stores to its quay, and every three months a merchant ship sails in across the bay, ties up at its jetty, loads what waits there and pays for it. You weren't here while it was built: every choice below is mine, from the spec's defaults.

What breaks, or moves: nothing. A slice 12 save opens with nothing for sale and no ship due (the schedule starts when a post is built), and the welcome back says merchant ships now call and where to build the post (G three times, on the bay shore where deep water comes close). Older saves go through every step. Every earlier demo opens exactly as before. The trading post joins the granary and the storehouse under the G button, so the build bar keeps its 17 buttons and its width.

### What's new
- **The trading post** (G three times, 250 dr, 6 workers): a stone quay on the shore with a counting house along its landward side, a pennant, a bench with scales under an awning, a crane and bollards, and a timber jetty on piles out to deep water. It goes only where the ship can come alongside: on the bay shore with deep water within 7 tiles, and only one in the city. While you place it, the tool tints the shore where it can go, and a refusal says why ("no sea beside it here", "the water off this shore is too shallow for the ship", "only one trading post"). It needs a road beside it, like any workplace.
- **What it sells.** The ship buys six goods at steady prices per hundred: wheat 15 dr, meat 30, cheese 30, oil 60, fleece 45, wine 80. For each you choose whether to sell it (all off to begin with) and how much the city keeps in its stores (to begin with wheat 1,600; meat, cheese, fleece and wine 600; oil 800). Only what is beyond the keep goes.
- **Dockers** in sea-green tunics, with the porters' handcarts: up to four go out from the post, one every two days, to the nearest granary or storehouse holding a good for sale, and bring a cartload of what is spare back to the quay (wheat 1,200; meat, cheese and oil 800; fleece and wine 600). The quay holds 2,400 of each, stacked where you can see them: sacks, hams, cheeses, oil jars, bales and amphorae. Take a good off sale and the next docker carries it back to the stores.
- **The merchant ship** from Tyre: a round-bellied hull with a dark wale and painted eyes, a swan-neck stern post, steering oars, a single mast and a square sail in cream and russet stripes. The first is due three months after the post is built, then one every three months. Six days before she is due her sail shows on the horizon (with a bell, three strokes) and she sails in, slowing as she enters the bay; she furls her sail and ties up at the jetty for four days, loading what is on the quay; then she pays, the sale floats up over the post with the sound of coins, and she backs off the jetty, swings round, sets her sail and sails out the way she came, her cargo on deck. If the post is cleared while she is coming in, she turns back.
- **Sales on the ledger**, one line a good ("Sales · wheat"), paid as income, so wages owed are paid at once.
- **Readable.** Once a post stands, the top bar has a ship chip: the days until she is due, "In port" while she loads, what she paid as she leaves. Click it (or the post) for the **trade panel**: what the ship is doing and how long until her next call, a row per good with its price, what the stores hold, the keep (− / +), what waits on the quay and a sell tick; what the dockers are doing; what the last ship bought and paid; and a warning when the post has no road or workers or nothing is ticked. Hovering the post, a docker or the ship says what they are doing, and a town line tells you when her sail is on the horizon and while she loads.
- **Sound:** the bell when her sail is sighted, coins when she pays.

### What to try
1. Open `#trade`: `#town` four months on, with a road laid from the main street down to the bay's north-east shore and the trading post tool in hand. Move it along the shore to see the tint and the refusals, then build it at the road's end. The ship chip appears in the top bar: 90 days.
2. Open `#quay`: the post built there, with wheat, meat, cheese and oil for sale, a few cartloads already on the quay and the trade panel open. Tick fleece or wine, change a keep, untick something and watch the next docker carry it back. Hover a docker.
3. Open `#sail`: the ship's sail on the horizon, seen low across the bay. It opens running, so she is already under way: watch her come in to the jetty (her six days take about six seconds at normal speed; pause to look). Hover her.
4. Open `#ship`: tied up at the jetty with her sail furled, loading. It opens running: within a few seconds she pays and sails off. Watch the chip and the floater, and her backing off the jetty and swinging round before she sets her sail.
5. Open `#black`: the treasury has run dry (2 dr, with 240 dr of wages owed: taxes were turned off) and the ledger is open, with all six goods for sale and her sail on the horizon. Press play: when she sails, her 840 dr pays the wages and leaves 602 dr. (Taxes are still off: set them back to fair, or the treasury runs dry again in about three months.)
6. Open one of your slice 12 saves (`#saved` or `#continue`) and read the welcome back.

### What I'd like your eye on
- **The ship** (`#ship` close up, `#sail` from the shore). Does she read as a storybook merchant ship? She is drawn big against the post, toy-town scale, so she shows from the usual zoom.
- **Her way in** (`#sail`, played on). She is beyond the map's edge for about the first two days and in the bay for the last two; the whole way in takes about six seconds at normal speed, so she crosses the open water quickly. Is that a sight worth looking up for, and does it give you time to get goods on the quay?
- **The quay** (`#quay`). Do the stacks read as goods waiting for the ship, and the dockers as people carrying them?
- **The trade panel.** Is it clear what the keep does, and is "nothing for sale to begin with" the right start, or should the city sell its spare food by default?
- **Prices.** A visit to `#black` paid 840 dr for food and oil. Is that worth building a post for? Money is tuned in slice 14.

### Known rough edges
- The quay is levelled to the highest ground under it, so on the sloping shore it stands on a tall stone plinth on its low, beach side (the review corrected "landward" here).
- On the far stretch of her route, beyond the islet, she moves quickly (the last two days of her approach are the slow, close part).
- Goods in the trade panel are marked with a colour swatch from their quay stack, not an icon.
- How fast the quay fills depends on how far the post is from the stores: in the demos a docker's round trip to the granary takes about 55 days. The placing tip now says so.
- Money pressure is still untouched (slice 14).

### Measurements
Before is `a07429f` (the end of slice 12's review); after is this slice, in the same headless Chromium with software graphics at 1920 × 1080.
- Tests: 198 in 19 files, all passing (was 188 in 18). New, in `tests/trade.test.ts`:
  - where the post can go, and the tool's tint agreeing with the refusals;
  - the ship's schedule (due three months after the post, on the horizon six days before, loading, sailing off, every three months), and her staying on deep water;
  - turning back when the post is cleared, and none due until another is built;
  - dockers carrying only the surplus beyond the keep, never overfilling the quay, and the ship paying the shown prices;
  - goods carried back when taken off sale;
  - `#black` paid back into the black;
  - a real slice 12 save (`tests/fixtures/slice12-town.save.json.gz`) loading and saving again identically;
  - a save with the ship sailing in and dockers on the road carrying on identically, and a replay of the log;
  - a damaged trade record refused in plain words;
  - a town with no post never touching its trade record.

  All 51 earlier demos fingerprint exactly as before (checked by a probe outside the repo).
- Smoke: passes, extended with `#trade` (the tool, its tip and refusal, building the post and the 90-day countdown, G cycling), `#quay` (the trade panel, keep and sell, closing and reopening it, the post's and a docker's hovers), `#sail` (her sail far out, set, the town line, drawn), `#ship` (tied up at the berth, furled, "In port", her tip), `#black` (wages owed, then paid by her visit, with "Sales · wheat" on the ledger) and a slice 12 save's welcome back. Every demo token opens with no page errors.
- Download: 328 KB compressed, 1,138 KB raw (was 315 and 1,097).
- Load, by the page's own clock: ready at 1.15 s and first frame at 1.37 s (was 1.26 and 1.50). `#town`: ready at 1.71 s, first frame 2.18 s (was 1.85 and 2.36). The new demos are ready at 2.0 to 2.3 s, because each plays the town on for months first. Target: under 3 seconds. These load times move by a tenth of a second or so from run to run.
- Draw batches and triangles, before → after:
  - The opening view, `#streets`, `#water`, `#food`, `#fine`, `#closed`, `#town`, `#villas`, `#fire` and `#blaze`: unchanged (for example `#town` 816,898 triangles and 83 draws, its overview 934,314 and 109).
  - New: `#quay` 643,000 triangles and 55 draws (its overview 962,000 and 116); `#sail` 546,000 and 42; `#ship` 598,000 and 54, and from the town view 841,000 and 91. The post and jetty join the merged buildings, the quay's goods use the existing batches, and the ship is one more draw while she is out.
- Main-thread time per frame before drawing, paused / running:
  - `#food`: 0.74 / 1.24 ms (was 0.58 / 1.21). `#fine`: 0.87 / 2.39 (was 0.72 / 2.79). `#town`: 1.15 / 8.51 (was 0.87–1.01 / 5.75–8.94; it has no trading post, and this figure is noisy).
  - New: `#quay` running 2.56 ms, `#ship` running 3.05.
- A save of `#town`: 258 KB (unchanged).
- Frame rate: not measured (software graphics only here). Target: 60 frames a second on a mid-range laptop at 1080p.

### What the review changed
A second pair of eyes went through the slice, played each step above and fixed what it found. What changed for you:
- **Dockers no longer stall.** If one good on the quay had nowhere to go (say you took wheat off sale while every granary was full), the dockers stopped for every good until it cleared. Now they get on with the other goods and come back for it when there is room.
- **The ship leaves the jetty properly.** She used to spin round on the spot at the berth, her bow and stern swinging through the jetty. Now she backs off a few lengths with her sail still furled, swings round in open water, sets her sail and sails out bow first.
- **The placing tip says how far the stores are.** Placing the trading post now tells you how long a docker's round trip to the nearest granary and storehouse would be (about two months from the spot in the demos), since that sets how fast the quay fills.
- **Long tool hints fit the screen.** The trading post's hint under the build bar ran off both edges of the screen; long hints now wrap onto a second line, and the trading post's is shorter.
- **The trade panel's buttons don't miss.** The panel redraws itself several times a second while the game runs, and a click on − / + or a sell tick could fall between two redraws and do nothing. It now waits while you press.
- **This note was corrected:** `#sail` and `#ship` open running, not paused (steps 3 and 4 said "press play"); `#black` leaves taxes off after the sale; she isn't drawn lower in the water when laden; and the rough edges that are fixed are gone from the list.
- Checked and unchanged: every earlier demo still opens exactly as before; the ship never sails over land on her way in or out; selling at the starting keep amounts for a year left `#town`'s houses exactly where they were without a post (its meat stores did run down to nothing).
- Still for you to judge: she crosses the open water quickly (her whole way in is about six seconds at normal speed), and in the demos a docker's round trip is about two months, so a far-off post fills slowly. Both are noted for slice 14's tuning.
- Checks after the review: 199 tests in 19 files pass (one new: a good with nowhere to go doesn't hold up the others; and the ship's whole way out is checked); typecheck, build and smoke pass. Download 328 KB compressed (1,140 KB raw); load ready at 1.11 s, first frame 1.34 s; `#town` ready at 1.77 s, first frame 2.26 s; draw batches and triangles unchanged (`#quay` 643,258 and 55; `#sail` 545,932 and 42; `#ship` 598,095 and 54); time per frame before drawing, running: `#quay` 3.04 ms, `#ship` 3.13 ms, `#town` 7.96 ms.

## Slice 12 — Fire and collapse (17 Oct)

Neglect now shows in the town: every building slowly gathers fire risk and wear, a watch post's watchman and an architect's office's inspector keep them down, and a building left alone smoulders and burns, or creaks and falls, leaving rubble to clear. You weren't here while it was built: every choice below is mine, from the spec's defaults.

What breaks, or moves: nothing is lost. A slice 11 save opens with no fire risk or wear anywhere, and the welcome back says buildings can now catch fire and wear out, and what to build (a watch post, Z twice, and an architect's office, Z three times). Older saves go through every step. The cottage demos and `#shrine`, `#priestess` and `#grove` open exactly as before, and no demo opens with any risk or wear. `#town` (and the demos built on it) now has two watch posts and two architects' offices, and the fine-house towns by the lane have one of each. They open at the same moment with the same people and levels but less money: `#town` with 233 drachmas (was 513), `#theatre` 255 (395), `#fine` 828 (968), `#villas` 1,418 (1,558), `#taxes` 376 (704). `#dry`, which waits for the treasury to run out, gets there two months sooner (806 people, was 854). The build bar is regrouped, so some tools have moved into rows (see below); every key still does what it did.

### What's new
- **Fire risk and wear** on every building, filling over a year or so. Fire risk fills faster in crowded houses and busy workshops (the olive press, the winery and the theatre fastest); wear fills faster in big buildings. Fountains never burn. Neighbours fill at slightly different paces, so a street doesn't all go at once.
- **Marks.** Past half way, a small round plaque floats over the building: a flame for fire risk, a cracked brick for wear. It turns from amber to red as it fills, and pulses once the building smoulders or creaks.
- **The watch post** (Z twice, 60 dr, 3 workers): a small stone guard house with a lookout platform on posts, buckets and a red pennant. Its **watchman** wears red-brown with a leather cap and carries a bucket and a hook on a pole. Every building beside his way is made safe. His round goes first to the buildings nearest to smouldering.
- **The architect's office** (Z three times, 80 dr, 3 workers): a whitewashed office with a columned porch, a drawing board and stacked stone. Its **inspector** wears deep blue and carries a measuring rod and a wax tablet. Every building beside her way is made sound.
- **Smoulder.** A building whose fire risk tops out smoulders for about a month: a thin thread of smoke, a crackle, "Smoke" floating up, and a town line naming the house, the family and the place, how long is left, and why no watchman comes ("the nearest watch post is 33 steps away by road; its watchman goes 32 at most: build one nearer"). A watchman passing puts it out.
- **Fire.** If no watchman comes, it catches: flames, a column of smoke leaning with the wind, "Fire!", and a louder crackle. It burns for 10 days, then falls to rubble. While it burns, each day it may spread to one building touching it (never across a road, never to a fountain). A watchman who sees flames within 10 tiles leaves his round and runs to them, then throws water on them for two days, with steam rising, which puts the fire out and saves the building.
- **Creak and collapse.** A building whose wear tops out creaks for about a month, shedding dust, with a groan now and then. An inspector passing makes it sound; otherwise it falls in. A collapse never spreads.
- **Rubble.** A burnt building leaves black timbers and ash; a fallen one leaves a heap of stone and tiles. The family leaves. Nothing can be built on rubble until it is cleared with the clear tool (X), for 10 drachmas a small heap and 20 a large one. Undo brings the heap back and refunds the fee. Hovering rubble says what stood there and whose it was.
- **Readable.** Hovering a building names its fire risk and wear and whether a watchman or inspector reaches it. The household panel has a box for a smoulder or a creak, with the days left. Hovering a watch post or architect's office says what it guards and how far its walker goes, and the placing tool says whether one there would reach the trouble. The town lines warn once buildings are three-quarters full with no one coming, and report rubble. The ledger has lines for buildings that burnt or fell down and for clearing rubble.
- **Overlays:** fire risk (J twice) and wear (J three times) tint buildings green, amber and red, and stand a column over each one past half way.
- **The build bar, regrouped** (17 buttons, 988 pixels wide at 1920 and 728 at 1280; was 32 buttons, 1,763 and 1,178 pixels). Farms and workshops (M), granary and storehouse (G), the agora and its stalls (K) and the offices (Z: the tax office, watch post and architect's office) are each one button that opens a row of their tools above the bar. The food and goods overlays (L) and the tax, fire-risk and wear overlays (J) work the same way. A row closes when you pick a tool, click elsewhere or press Escape. Each group button shows the tool last picked from it. The keys cycle as before.
- **Sound:** a crackle while a fire or smoulder is within earshot, a groan from a creaking building, a thud when one falls, and a hiss when a fire is put out.

### What to try
1. Open `#fire`: `#town` 11 months later, paused on the first thread of smoke, on the east street that no watchman reaches. The fire-risk overlay is on and the watch post tool is in hand. Build a post beside a road near the smoke (the empty corner across the main street from the smoking house, by the crossroads, works; the tip says whether a watchman would reach it), then press play. When I ran the simulation with a post there, it put the smoulder out 5 days later (8 days when the review built one by hand a tile along), and nothing else on the street smouldered for the next five months. Without one, the house caught 33 days later. By five months, 15 buildings on that street had burnt down.
2. Open `#blaze`: the same street a month later, with no post built. Two houses are burning and two more are smouldering, and a watchman from a post across town is running to the nearest fire. Watch whether he gets there in time.
3. Open `#rubble`: later still, with seven heaps of rubble and the clear tool in hand. Hover a heap, then clear it. Five more houses on the street are smouldering, so a watch post is still needed.
4. Open `#creak`: `#town` 10 months on, paused on its first creaking building (the agora by the olive grove), with the wear overlay on and the architect's office tool in hand. Build an office near it before the month is out.
5. Open `#watchman`: following a watchman on his round, with the fire-risk overlay on.
6. Open `#inspector`: following an inspector on her round, with the wear overlay on.
7. Click the Z and J buttons, and the M button, to try the regrouped bar.
8. Open one of your slice 11 saves (`#saved` or `#continue`) and read the welcome back.

### What I'd like your eye on
- **Fire and smoke** (`#blaze`, close up and from the street). The smoke started as a stack of grey stones. It's now soft, rounded puffs that drift and spread with the wind. The flames started as spikes and are now short tongues in yellow, orange and red. Do they read as a house on fire?
- **The smoulder's thread of smoke** in `#fire`. Is it enough to catch your eye before the town line does?
- **The marks.** Are the round flame and cracked-brick plaques readable at the usual zoom? Are there too many on a neglected street? `#creak` opens with 57 of them.
- **The pace.** The first smoulder in a town with no watch post came about nine and a half months in (`#food` left running). Unguarded, the east street of `#town` lost 15 buildings in five months. Is that too fast, too slow, or about right for something you can see coming?
- **The regrouped build bar.** Does finding the farms and workshops in a row cost too much?

### Known rough edges
- The architect's office is less distinctive close up than the watch post.
- Creak dust is hard to see from the town view. The mark, the overlay column and the town line say it instead.
- The watchman's water and the steam show only while he is at the fire. That is two days of game time, two seconds at normal speed, so it is easy to miss.
- Money pressure is still untouched (slice 14). The posts and offices make the prepared towns open poorer.
- No `-fire` or `-wear` link tokens: the fire demos open with their overlay, and J cycles to them in the game.

### Measurements
- Tests: 187 in 18 files, all passing (was 178 in 17). New, in `tests/hazards.test.ts`:
  - how fast risk and wear fill, and that nothing moves while they are switched off;
  - every demo opening with no risk or wear;
  - fire with no watchman: smoulder, catching, spreading one touching building at a time, rubble, the family gone, the same every time for the same seed;
  - the watchman putting out a smoulder, and running to flames and putting them out;
  - creak and collapse, with and without an inspector;
  - rubble refusing buildings, clearing for its fee, and undo;
  - a real slice 11 save (`tests/fixtures/slice11-town.save.json.gz`) loading and saving again identically;
  - a save in the middle of a fire carrying on identically, and a replay of the log;
  - the fire demos opening on what they promise.

  Every cottage demo, `#shrine`, `#priestess` and `#grove` fingerprint exactly as before.
- Smoke: extended with these new checks:
  - `#fire` (the watch post tip, the smouldering home's tip), `#blaze`, `#rubble` (its town line, the clear tool's tip, clearing a heap for its fee, a heap's tip) and `#creak`;
  - following the watchman and the inspector;
  - Z and J cycling;
  - the bar's size, its makers row and closing it;
  - a slice 11 save opening clean, with the welcome back.

  Every demo token opens with no page errors.
- Download: 314 KB compressed (was 299 KB).
- Load, by the page's own clock: ready at 1.12 s and first frame at 1.35 s (was 1.06 and 1.29). `#town`: ready at 1.73 s and first frame at 2.27 s (was 1.62 and 2.08). The new demos are ready at 2.2 to 2.8 s, because each plays the town on for most of a year first. Target: under 3 seconds.
- Draw batches and triangles, before → after:
  - The opening view and every cottage demo: unchanged.
  - `#fine`: 634,000 → 636,000 triangles, 71 draws (unchanged). `#closed`: 617,000 → 619,000, 79 draws (unchanged). `#town`: 812,000 → 816,000 triangles, 83 draws (unchanged); its overview 929,000 → 934,000, 109 draws.
  - New: `#fire` 735,000 triangles, 79 draws. `#blaze` 702,000 and 78 (64 smoke puffs and 24 flames on screen). `#rubble` 773,000 and 74. `#creak` 743,000 and 77. `#watchman` 853,000 and 87. Marks, smoke and flames add a few draws while any are showing, and none while nothing is marked.
- Walker padding: unchanged at 1,356 vertices a look for people (the stag) and 2,412 for carts. The watchman is 888 and the inspector 768.
- Main-thread time per frame before drawing, paused / running. These were measured alternately against a slice 11 build in the same session, because the numbers drift from run to run:
  - `#food`: about 0.6 / 1.1 ms (was 0.7–0.9 / 1.2).
  - `#fine`: 0.7–0.8 / 2.4–3.3 (was 0.7–0.8 / 1.6–1.7).
  - `#town`: 1.0–1.5 / 6.7–6.9 (was 0.8–1.1 / 4.9–5.2).
  - The running figures rose by about 1 to 2 ms. The simulation's own time per tick in `#town` went from 118 to 147 µs, for its four new walkers and the daily risk and wear. In a 10-second profile of `#town`, most of the frame time went to occasional street rebuilds as homes change, and I found no new hot spot.
- A save of `#town`: 257 KB (was 248 KB).
- Frame rate: not measured (software graphics only here). Target: 60 frames a second on a mid-range laptop at 1080p.

### What the review changed
I went through every step above in the browser: I built a watch post by hand beside the smoke in `#fire`, watched `#blaze` play out, cleared a heap in `#rubble`, built an architect's office in `#creak`, and opened every row of the build bar at 1280, 1366 and 1920 pixels wide. I also played the east street on in the simulation to check the pace, and measured again. These are the changes:

- **Undo no longer wipes a building's fire risk and wear.** If you cleared buildings and then pressed undo, they came back as good as new: no fire risk, no wear, and a smouldering or creaking one came back safe. Undo now brings them back exactly as they were, smoke and all. A heap of rubble brought back by undo also no longer shows "Burnt down" and thuds again.
- **Undo no longer pays you back for a building that burnt down.** If a building you had just put up burnt or fell down, pressing undo on it refunded its full price, though it was already rubble. Now it doesn't.
- **The ledger says "This month" when it should.** Its note on buildings lost to fire and collapse always said "Last month", even for this month's losses.
- **The watch post and architect's office tools say whether they'd reach the trouble.** While you place one, the tip now names the building that is smouldering, burning or creaking if this spot would reach it ("It reaches the fine house of Kleon, which is smouldering"), or warns in amber that it wouldn't and to try nearer.
- **The olive grove's mark sits above its trees.** It was half hidden inside them. The vineyard's is a little higher too.
- **The smoulder's thread of smoke is more ragged**: more puffs, of uneven size, drifting and leaning with the wind as they rise, rather than a neat string of beads.
- **The architect's office has a column being made in its yard** (stone drums stacked and one lying on the ground), and its stone is a warmer, darker colour, so it stands apart from the whitewashed walls.
- **Less work for the computer each moment the town runs**: the check for fires catching and buildings creaking no longer redoes its sums for every building every moment.

Things to know when you try it, with numbers:
- **Step 1, the watch post.** I built mine a tile along from the corner the step describes, and it put the smoke out 8 days later (I've added that to step 1). Placed off the road, a watch post is built anyway but no one works there, the same as every other workplace; the tool warns you in amber and hovering it says it needs a road.
- **Step 2, `#blaze`.** The watchman reached the first fire in about a day and put out both fires within about a week. The two smouldering houses beyond his round caught about two weeks later, and over the next two months the street lost more, the agora and the tax office among them.
- **The pace.** Playing the east street on with no post, the first smoke gave about a month before it caught, and the warning in the town lines came well before that. The town lost about 3% of its people and won them back, and the money kept rising. I haven't changed it: whether it's too fast is your call.
- **The build bar.** Every key (M, Z, G, K, J and L) still cycles through its tools, every row opens and closes, and the bar fits at 1280, 1366 and 1920 pixels wide.

What I'd still like your eye on, beyond the list above:
- **The architect's office** close up, now that it has the column drums.
- **The smoke puffs** close up. They still look like round balls when you zoom right in.
- **The watchman after a fire.** Once the fires are out he goes back to his round, home first, rather than to the smoke he passed on the way.

Measured after the review: the download (315 KB compressed), draws, triangles, load times and save size are as in the notes above, to within a few thousand triangles. All 188 tests pass (one new, for undo), and the smoke test passes.

## Slice 11 — Fleece, wine and the villa (17 Oct)

The town gets its last two goods and its grandest homes: sheep pastures and fleece, vineyards, a winery and wine, a fleece stall and a wine stall at the agora, fine houses that now need fleece, and villas, a sixth level for fine houses that also have wine. You weren't here while it was built: every choice below is mine, from the spec's defaults.

What breaks, or moves: nothing is lost. A slice 10 save opens with eight months' grace for its fine houses: they say at once that they have no fleece and why, but nothing warns or goes down for eight months. The welcome back says what to build (a sheep pasture, a storehouse if there isn't one, a fleece stall), and that wine makes villas. Older saves go through every step. The cottage demos and `#shrine`, `#priestess` and `#grove` open exactly as before. The demos with fine houses now build a sheep pasture by the lane and a fleece stall at the lane's agora before their theatre, so they open later and richer: `#theatre` at 713 people and 395 drachmas (was 640 and 290), `#fine` at 830 and 968 (802 and 561), the same levels. `#closed` changed most, see What's new. `#town` gets a pasture and a fleece stall too, and to keep its fine houses' plays I moved its theatre a little north-east, to where it also reaches the far east end of the main street. It opens with 724 people and 513 drachmas (596 and 531), with 5 tents, 21 huts, 10 cottages, 7 townhouses and 38 fine houses. `#harsh` runs its harsh taxes for longer (950 ticks, was 450) before it opens, because with fleece nobody had left by then. `#nooil` rebuilds its storehouse a day after clearing it, so only oil goes missing.

### What's new
- **Goods as data.** Oil, fleece and wine are rows in the same tables. The household panel, warnings, going down, overlays, signs, tips and town lines all treat every good the same way, and each stall has its own porter, so no stall waits behind another.
- **The sheep pasture** (M six times, 150 dr, 4 workers) goes on green grass and yields by how good the grass is: up to 200 bales of fleece a month. You see a ring-shaped stone fold, a stone hut under thatch with the shepherd's crook, an open shearing shelter with bales stacked under it as the store fills, and a trough. Nine sheep (cream, two grey, one black) graze in and round the fold, never on roads or buildings. Ox carts take the bales to the storehouse.
- **The vineyard** (M seven times, 150 dr, 4 workers) goes on dry, sunny slopes, best facing the afternoon sun. The placing tool tints poor ground and says about how much wine a month a vineyard there would give. You see four rows of trellised vines, each length on its own ground down the slope, and bunches of grapes that go from green to purple as the crop ripens. There's a whitewashed hut with a pergola, and baskets of grapes. A full harvest is 400 measures every two months. Carts take the grapes to a winery.
- **The winery** (M eight times, 200 dr, 4 workers): a stone press house under tiles with a wine-red band, a round treading vat of purple must, a lean-to and amphorae by the door. It makes up to 300 amphorae of wine a month while it has grapes. Carts take the wine to the storehouse.
- **The storehouse** has rooms for 1,200 bales and 1,200 amphorae beside its 1,600 jars of oil. Its yard shows jars on one side, bales at the back and amphorae by the gate. Hovering it lists each.
- **The fleece stall and the wine stall** (K three and four times, then click an agora; 100 dr and one more worker each) go beside the oil stall, each under its own awning. The fleece vendor wears slate blue and carries a bale of fleece on her head. The wine vendor wears wine red and carries an amphora. A home they reach has fleece or wine for six months.
- **Fleece is a need for fine houses.** A townhouse with everything else climbs to a fine house only once fleece reaches it. A fine house that loses fleece warns, then goes down two months later.
- **The villa.** A fine house that also has wine becomes a villa: 27 people (a fine house holds 21), and the most tax (12 dr a month at fair, a fine house pays 9). There are two kinds:
  - a peristyle villa: a tall hall under a hipped roof with a little tower, wings round a garden court with a colonnade, a pool and an olive tree, and a gateway with a pediment;
  - a garden villa: an L-shaped house with an upper loggia and a columned portico, and a walled garden with a basin, an olive, cypresses and a vine pergola.

  Both are warm cream stucco with a Pompeian red band, so a villa street reads apart from the whitewashed fine houses. "Villa" floats up when one climbs. The panel says "A villa is as grand as homes get".
- **`#closed` tells its story again.** Its fine houses now have fleece from the lane's stall. The cut street goes without water and plays, so its signs show two icons, not four or five. The scene opens with the most urgent home at least two weeks from going down. In the test, rebuilding the theatre across from the shrine and mending the ringed road at once loses at most 8 homes a level; left alone, 26 go down.
- **Readable:** hovering a pasture, vineyard, winery or stall says what it holds, makes and waits for. Carts, porters and vendors say what they carry. The panel lists fleece and wine under what a home has and lacks, with the missing link in the chain. Signs take up to seven icons. The panel's mood names "warm cloaks of their own wool" and "wine with every meal".
- **Overlays:** fleece (L four times) and wine (L five times).
- **Keys:** M cycles farm, lodge, dairy, grove, press, pasture, vineyard and winery. K cycles agora and the oil, fleece and wine stalls. L cycles food, variety, oil, fleece, wine and off. Shift goes back through any of these.

### What to try
1. Open `#vineyard`: the fine-house town, with the vineyard tool in hand over the sunny slope west of the town. Plant a vineyard or two, build a winery beside the road (M ×8) and add a wine stall to the agora by the lane (K ×4, click the agora). Watch the fine houses nearest the agora become villas as the wine reaches them. In my run (two vineyards, the winery across the road, all at once) the first wine reached a home 153 days after planting, and the first villa came a day later. The treasury fell from 968 to 397 drachmas on building and touched 33 at its lowest.
2. Open `#villas`: the same town nine months after its wine went in. It has 14 villas beside fine houses the wine vendor hasn't reached yet, with the panel open on a villa. Compare a villa street with a fine-house street, and their tax and chatter.
3. Open `#winery`: over the vineyards and the winery, with carts of grapes coming in. Hover them.
4. Open `#winevendor`: following the wine vendor, with the wine overlay on.
5. Open `#pasture`: the fine-house town over its sheep pasture by the lane, the flock grazing. Hover the pasture, and the storehouse.
6. Open `#fleecevendor`: following the fleece vendor, with the fleece overlay on.
7. Open `#closed` and try the fix: rebuild the theatre and mend the cut road.
8. Open one of your slice 10 saves (`#saved` or `#continue`). The welcome back says fine houses now need fleece and that they have eight months.

### What I'd like your eye on
- The villas close up and from the street (`#villas`). Do they read as the grandest homes, and apart from the fine houses? The peristyle's roofs slope into the court over the colonnade; I rebuilt them once after they looked like floating planks.
- The vineyard (`#winery`, `#vineyard` once planted). The first version's rows looked like little tables. Now each row is clumps of leaves on a wire between stakes. From above, do they read as vines, and do the grapes show as they ripen?
- The sheep and the fold (`#pasture`): do they read at the usual zoom?
- The fleece bales: in the storehouse and on carts they are small white lumps, and they may read as stones.
- The pace: about five months from planting to the first villa in `#vineyard`, with the money close to empty on the way.

### Known rough edges
- The treading vat and the presses don't move.
- The porters' handcarts are small. The wine porter's amphorae, lying on the cart, read as brown logs from above.
- The money in the culture demos is tight while they pay for a third chain. Money pressure is still untouched (slice 14).
- Seasons for shearing and the vintage aren't in: fleece comes all year, and grapes come every two months.

### Measurements
- Tests: 178 in 17 files, all passing (was 167 in 16). New, in `tests/fleecewine.test.ts`:
  - every good as a row of data;
  - pastures need grass and vineyards need vine ground;
  - fleece reaching `#fine`'s fine houses, and a fine house that loses it going down;
  - `#villas`' villas, and that a villa pays the most tax;
  - grape carts going to a winery and wine carts to a storehouse;
  - a porter for each stall;
  - a save in the middle of the chain carrying on identically;
  - a real slice 10 save (`tests/fixtures/slice10-fine.save.json.gz`) loading with eight months' grace.

  `#closed` has a new test that it can be saved. Every cottage demo, `#shrine`, `#priestess` and `#grove` fingerprint exactly as before.
- Smoke: extended with these new checks:
  - `#pasture`'s pasture and storehouse hovers;
  - following the fleece and wine vendors, with their overlays;
  - the vineyard tool and its tip;
  - `#winery`'s follow and its vineyard and winery hovers;
  - `#villas` and a villa's panel;
  - the seven-wide sign;
  - L cycling through fleece and wine.

  Every demo token opens with no page errors.
- Download: 299 KB compressed (was 286 KB).
- Load, by the page's own clock: ready at 1.04 s and first frame at 1.25 s (was 1.39 and 1.66). `#town`: ready at 1.57 s and first frame at 2.08 s (was 1.66 and 2.23). Target: under 3 seconds.
- Draw batches and triangles, before → after:
  - The opening view and every cottage demo: unchanged.
  - `#fine`: 625,000 → 634,000 triangles, 70 → 71 draws. Overview: 102 → 103 draws.
  - `#closed`: 595,000 → 617,000 triangles, 84 → 79 draws. Overview: 117 → 112 draws.
  - `#town`: 739,000 → 812,000 triangles, 79 → 83 draws; its town is bigger (724 people, 58 walkers, was 596 and 41). Overview: 857,000 → 929,000 triangles, 105 → 109 draws.
  - New: `#villas` 712,000 triangles and 80 draws; its overview 888,000 and 110.
- Walker padding: unchanged at 1,356 vertices a look for people and animals (the stag) and 2,412 for carts (the oil cart). The wine cart first came to 2,808 and the wine porter to 1,458, which would have made every walker dearer to draw. They now carry four and two amphorae.
- Main-thread time per frame before drawing, paused / running:
  - `#food`: 0.76 / 0.89 ms (was 0.55 / 0.93).
  - `#fine`: 0.57 / 1.61 (was 1.02 / 1.87).
  - `#town`: 0.74 / 5.25 (was 0.83 / 4.65; the running figure is noisy).
- A save of `#town`: 248 KB (was 203 KB; a bigger town).
- Frame rate: not measured (software graphics only here). Target: 60 frames a second on a mid-range laptop at 1080p.

### What the review changed
I went through every step above in the browser. In `#vineyard` I built the wine chain by clicking the tools, as you would. I looked at the pasture, vineyards, winery, stalls and villas close up and from the street, played `#closed` and a slice 10 save forward, compared the cottage demos with pictures from before this slice, and measured again. These are the changes:

- **`#winery` now opens over the vineyards and the winery.** It used to follow a cart from one of the wheat farms, so it opened somewhere else entirely. Now it follows a grape cart from a vineyard, with the vineyards, the winery and the wine overlay in view.
- **The build bar fits on a laptop screen.** With the new buttons it was wider than a 1366- or 1280-pixel window, so the last buttons fell off the edge. The buttons now shrink a little on narrower windows, and the bar scrolls sideways rather than overflowing if a window is narrower still. At 1920 pixels wide it's a little narrower than before.
- **The wine vendor is "he".** He's drawn as a man, but his tips and the stall's tips called him "she".
- **Homes say when goods are on the way.** While the first wine is still travelling, a fine house used to say only "no wine has reached a storehouse yet". It now says the first amphorae are on their way by ox cart, which is slow (about a tile of road a day), or that the stall's porter is bringing them back from the storehouse.
- **The pasture's words match what you see.** Its button said the flock grazes "inside the fence" and a fine house said to "fence" a pasture. There's no fence: the flock grazes round a stone fold. They now say so.

Things to know when you try it, with numbers:
- **The pace in real time.** `#vineyard`'s 153 days from planting to the first villa is about two and a half minutes at normal speed, and about 40 seconds at the fastest. When I built it by clicking, the first villa came at about the same point, with no errors. With only one vineyard it took 156 days, and the money never fell below 207 drachmas (with two vineyards it touched 33).
- **Where those days go:** the first grapes are picked about 60 days in and reach the winery about 10 days later. The wine carts then spend about 40 days on the road from the winery to the storehouse by the main street. Wine is in the storehouse at about day 120, and the stall's porter and the wine vendor take the rest. A storehouse nearer the winery would cut that wait a lot.
- **`#closed`:** it opens with 14 homes warned, the most urgent about 27 days from going down. When I rebuilt the theatre and mended the road at once, 2 homes went down a level. Left alone, 26 did, as the notes above say.
- **A slice 10 save:** the welcome back says what to build. Fine houses say "No fleece yet · they'll put up with it for 8 months more" and what's missing, and nothing warns at first.
- **`#winery`** is the only demo whose opening view changed in the review. Every other demo opens as described above.
- **Corrected in this note:** nothing above was wrong about what you'll see. The technical notes said one change to how services count new homes had been left out. It is in fact in, for the fleece and wine vendors' rounds; the plan says so now.

What I'd still like your eye on, beyond the list above:
- **The porters** are hard to pick out among the carts round the storehouse and the winery.
- **One bale** already shows under the pasture's shelter when its store is only a tenth full.

Measured after the review: the triangles, draws, load times, download and save size are as in the notes above, to within a few hundred triangles. All 178 tests pass, and the smoke test passes.

## Slice 10 — Olives and oil, and the storehouse (16 Oct)

The city makes its first good: olive groves on the dry slopes, an olive press, a storehouse of jars and an oil stall at the agora, and townhouses now need oil. You weren't here while it was built: every choice below is mine, from the spec's defaults.

What breaks, or moves: nothing is lost. A slice 9 save opens with eight months' grace: its townhouses and fine houses say at once that they have no oil and why, but nothing warns or goes down for eight months, time to plant a grove, build a press, a storehouse and an oil stall and for the first oil to reach the homes (about five months in the review's run, which built them as soon as the money allowed; see What the review changed). The welcome back says what to build. Older saves get the same eight months, which covers the meat and cheese too. The cottage demos (`#water`, `#food`, `#vendor`, `#people`, `#warning`, `#decline`, `#missing` and the rest) open exactly as before. The demos with townhouses and fine houses needed oil to stay as they were, so their towns plant two groves by the lane and build a press, a storehouse and an oil stall before their lodge and dairy, with three tax offices to pay for it: `#shrine` opens with 21 cottages and 17 townhouses (was 18 and 20); `#theatre` and `#fine` open a couple of months later in the town's life, `#theatre` with 25 townhouses and 13 fine houses (21 and 17) and 290 drachmas (17), `#fine` with the same 38 fine houses and 561 drachmas (336). In `#closed` the cut-off street now goes without oil as well, so its signs show four icons (one shows five), not three; `#closed` changed more than that, see What the review changed at the end. `#town` runs three wheat farms instead of seven and one olive grove up the slope north of the main street, with a press and a storehouse below it: it opens with 596 people and 531 drachmas (was 616 and 728), 14 huts instead of 21, the same townhouses and fine houses.

### What's new
- The olive grove (M four times, 150 dr, 4 workers): seven gnarled olive trees (a ladder against one), each standing on its own ground on the slope, a low stone terrace wall, a mud-walled picker's hut under thatch, and baskets of olives as its store fills. The fruit shows green a quarter of the way to the harvest and darkens to purple-black as it ripens. A full harvest is 400 measures of olives every two months, by how good the olive ground is. Groves need dry ground: the hillsides and the scrub where the wild olives grow, not the river land, rock or sand. They take slopes too steep for a house. The placing tool tints poor ground and says how good the spot is and about how much oil a month a grove there would give.
- The olive press (M five times, 200 dr, 4 workers): a stone press house under red tiles, a round crushing basin with an upright millstone, a beam press with its weight stone, olive baskets waiting and jars of oil by the door. It turns 30 measures of olives into 30 jars every three days while it has olives.
- The storehouse (G twice, 200 dr, 3 workers): a walled yard with a gateway to the road, a lean-to shed at the back, and up to 24 jars standing in rows as it fills (1,600 jars of room). It's the shared store the next slices' fleece and wine and the trading post will use.
- Ox carts take olives from the groves to the press (four baskets of dark olives) and jars from the press to the storehouse (six jars in straw).
- The oil stall (K twice, then click an agora; 100 dr, one more worker): a small counter with a striped awning at the agora's side, jars on it as it is stocked. Its porter fetches jars from the storehouse with his handcart when it's half empty, and its oil vendor (an olive-green dress, a pale headscarf, a yoke with a jar on each end) walks the same kind of round as the food vendor. A home she reaches has oil for six months; it uses about a jar a month for every six people. Undo takes a new stall off again; clearing the agora takes it with it.
- Townhouses need oil: a blessed cottage with two kinds of food climbs only once oil reaches it, and a townhouse or fine house without oil warns after ten days and goes down two months later, like the other needs. Cottages like oil too once there's an oil stall, but don't need it.
- Readable: hovering a grove, press, storehouse or stall says what it holds, makes and waits for ("Oil stall: 501 of 800 jars · the oil vendor is out …"); carts, the porter and the vendor say what they carry. The household panel lists oil under what a home has and lacks, with the missing link ("the city has no olive press yet for the groves' carts to take their olives to"). A town line names how many homes are going without and why. Moods and chatter about oil for the lamps.
- The oil overlay (L three times, or its button): the oil vendor's reach in olive green, a column over each home that wants oil, as tall as its oil is fresh.
- Keys: M cycles farm, hunting lodge, dairy, olive grove and olive press; G cycles granary and storehouse; K cycles agora and oil stall; L cycles the food, variety and oil overlays and off.
- Under the hood: all walkers and animals are now drawn together in two batches (people on foot and animals; ox carts and hunters carrying a kill) instead of one or two per kind, so there are fewer draws although this slice adds a vendor, carts and a porter.

### What to try
1. Open `#grove`: the culture town as its shrine has blessed its cottages. They have bread, meat and cheese but no oil, so none has climbed. The olive grove tool is in hand over the dry slope by the lane. Plant a grove, then build a press (M ×5) and a storehouse (G G) beside the road, and add an oil stall to the agora (K K, click the agora). Watch the cottages become townhouses as the oil reaches them. In my run, with two groves, a press and a storehouse by the lane, the first homes had oil and the first cottage became a townhouse 115 days after planting. About a month of that is the oil stall's porter walking to the storehouse and back, so a storehouse near the agora shortens the wait. The money runs short as you build: the chain costs 800 of the town's 1,060 drachmas, and at fair taxes the treasury touches empty about 110 days in, so some wages go unpaid for a few days at a time. Setting taxes to heavy for a while avoids it.
2. Open `#oil`: `#town` over its olive grove and press on the slope north of the main street, carts coming and going. Hover the grove and the press.
3. Open `#storehouse`: `#town` over its storehouse, jars standing in the yard. Hover it.
4. Open `#oilvendor`: following the oil vendor at street level with the oil overlay on. Hover her, and the homes she passes.
5. Open `#nooil`: the fine-house town about three months after its press and storehouse were cleared. Its fine houses warn without oil, the oil overlay is on and the panel is open on the house closest to going down. The town line says what's missing.
6. Open one of your slice 9 saves (`#saved` or `#continue`): the welcome back says townhouses now need oil and they have eight months. Build the chain and watch the oil reach them. Money is tight here: a slice 9 `#fine` save opens with 336 drachmas and the chain costs 650 to 800, so you build it piece by piece as taxes come in.

### What I'd like your eye on
- The grove, press and storehouse close up (`#oil`, `#storehouse`): do they read as an olive grove, a press and a store, and apart from the farms and the houses? On a steep slope the press and storehouse stand on a tall stone base on their downhill side.
- The olives ripening on the trees: from above, do the dark dots read as fruit?
- The oil vendor with her yoke and the carts with jars (`#oilvendor`, `#oil`): readable from street level?
- The pace: from planting a grove to the first oil in the homes took 115 days in `#grove` (two months to the first harvest, then the press, the storehouse, the porter and the vendor). Does that feel too slow for the cause and effect?
- The demos open poorer and later again: `#town` with 531 drachmas, `#theatre` two months later than before.

### Known rough edges
- The press's millstone and beam don't move.
- Walkers and animals now draw more triangles than before (every one in a batch has as many corners as the biggest look in it; the empty ones cost very little). There are far fewer draws.
- The money in the culture demos is tight while they pay for oil, meat and cheese and the theatre: they run heavy taxes for a while. Money pressure is untouched otherwise (slice 14).

### Measurements
- Tests: 167 in 16 files, all passing (was 157 in 15). New: groves need olive ground and take slopes; the harvest by ground and workers; the press only from olives in hand; carts to the right store, and home when it's cleared; adding, undoing and clearing the oil stall; a vendor's visit; blessed cottages that climb once oil comes; `#nooil`'s fine houses going down and saying why; a real slice 9 save loading with eight months' grace and saving again identically; a save in the middle of the chain carrying on identically. Every cottage demo fingerprints exactly as before.
- Smoke: extended with the grove tool and its tip, adding an oil stall, hovering a grove, press and storehouse, following the oil vendor, the oil overlay, and `#nooil`'s town line and panel. Every demo token opens with no page errors.
- Download: 285 KB compressed (was 272 KB).
- Load: ready at 1.30 seconds and first frame at 1.55 seconds by the page's own clock (was 1.39 and 1.67). `#town` ready at 1.84 s, first frame at 2.34 s (1.69 and 2.18). Target: under 3 seconds.
- Draw batches, before → after: the opening view 63 → 59; `#food` 71 → 55; `#fine` 106 → 70; `#closed` 119 → 84; `#town` 118 → 79, its overview 144 → 105. Triangles: the opening view 566,000 → 581,000; `#food` 460,000 → 498,000; `#fine` 549,000 → 643,000; `#town` 704,000 → 760,000 (the padded walker shapes and the oil buildings).
- Main-thread time per frame before drawing, paused / running: `#food` 0.57 / 1.12 ms (was 0.83 / 1.21), `#fine` 0.55 / 1.81 (1.04 / 1.87), `#town` 0.72 / 4.84 (1.32 / 6.32; the running figure is noisy).
- A save of `#town`: 203 KB (was 215 KB).
- Frame rate: not measured (software graphics only here). Target: 60 frames a second on a mid-range laptop at 1080p.

### What the review changed
I went through every step above in the browser (building the chain in `#grove` by clicking, as you would), looked at the grove, press and storehouse from several sides on the slope, compared the cottage demos with pictures from before this slice, played `#closed` and a slice 9 save forward, and measured again. These are the changes:

- **Homes say how long the wait for oil is.** While the press waits for the groves' first olives, a cottage's panel and tip now say when the next picking is due ("the next picking is in about 40 days") or that a cart of olives is on its way, instead of only "the press waits for olives".
- **A cottage that would like oil no longer says "The oil vendor doesn't come this way"** while the stall has had no oil to send her out with. It says "They'd like oil for the lamps".
- **The storehouse's button and placing tip say it is best near the agora**, because the oil stall's porter walks there and back for every load (in `#grove` that walk is about a month of the 115 days).
- **The oil jars carried on the carts, the porter's handcart and the vendor's yoke have fewer corners.** They look the same from street level (I compared close-ups), and every walker and animal is cheaper to draw: the oil cart had been the most detailed look, and every cart was drawn as if it were that one. `#town` is down from 760,000 to 739,000 triangles; the number of draws is unchanged.
- **The oil stall's tip** says "one more worker at the agora" (it said "1 more workers").
- **Under the hood:** the oil vendor's round is now built from a small table, so the fleece and wine vendors in the next slice are a matter of adding rows. Every demo plays exactly as before (I checked the towns step for step).
- **Corrected in this note:** `#closed`'s cut-off street shows four icons on most signs and five on one; a slice 9 save took about five months to get oil to its homes in my run, not under four; step 1 and step 6 now say that money runs short while you build.

Things to know when you try it, with numbers:
- **`#closed` plays differently now.** Its town's history changed with the oil chain, so it opens with 23 homes warned (was 16), the most urgent 4 days from going down (was 12), and the cut-off street's oil runs out within days. Slice 7's fix (rebuild the theatre across from the shrine and mend the ringed road tile at once) now still loses 25 homes a level (it lost 7), and every home is a fine house again about three months later. Left alone, 38 homes go down over the next four months. The new actor and oil vendor take a month or more over a round, so they can't reach everyone in time. I've left this for slice 12 or 14 to retune rather than bend the scene to fit.
- **A slice 9 `#fine` save, built up as soon as the money allowed (a grove, then the press, the storehouse and the stall ten days later, a second grove at day 50):** the treasury was empty for much of the first four months, so wages went unpaid and the chain worked at half pace. The first oil reached homes about five months in. When the eight months ran out, 22 homes warned for a few weeks until the vendor reached them, and none went down.
- **`#grove`:** the treasury touches empty about 110 days in at fair taxes. The first townhouse came 116 to 118 days after planting in my runs (two months for the first olives, a week for the cart, a week for the first jars to reach the storehouse, a month for the porter's round trip, then the vendor).
- The ox carts from the press often carry only 10 to 30 jars (the press sends one as soon as it has a batch), though the cart always shows six. I left that as it is.
- Measured after the review: triangles at the opening view 574,000 (was 581,000 in the notes above), `#food` 486,000 (498,000), `#fine` 625,000 (643,000), `#closed` 595,000 (609,000), `#town` 739,000 (760,000), its overview 857,000 (878,000). Draws, download size and the save size are unchanged. All 167 tests pass, and the smoke test passes.

## Slice 9 — Meat and cheese (16 Oct)

The table gets varied: deer and boar roam the hills and woods, a hunting lodge sends hunters across country to bring them back, a dairy keeps goats and makes cheese, and both go through the granary and the stall to the homes. A townhouse now needs two kinds of food and a fine house all three. You weren't here while it was built: every choice below is mine, from the spec's defaults.

What breaks, or moves: nothing is lost. A slice 8 save opens with herds on the hills and six months' grace: its townhouses and fine houses (which have only bread) say at once what they lack, but nothing warns or goes down for six months, time to build a lodge and a dairy and for their food to reach the homes (it takes two to four months). After that the usual ten days' warning and two months apply. Phase 1 saves still open. The cottage demos (`#water`, `#food`, `#vendor`, `#people`, `#warning`, `#decline`, `#missing` and the rest) open exactly as before. The demos with townhouses and fine houses needed meat and cheese to stay as they were, so their towns build a hunting lodge and a dairy by the lane five months before the shrine, with the lane's tax office and heavy taxes from then to pay the wages: `#shrine` opens with 18 cottages and 20 townhouses (was 16 and 22), `#theatre` with the same houses but 17 drachmas (was 137), `#fine` with the same houses and 336 drachmas (420). `#grow` has a dairy already, so placing the shrine still lifts its cottages. `#town` builds a lodge at the head of its north street and a dairy across the main street from the granary once it can afford them: it opens with 616 people and 728 drachmas (was 622 and 1,520), the same townhouses and fine houses, 21 huts instead of 24. `#dry` runs out of money sooner, so it opens about four months earlier in the town's life.

### What's new
- Wild herds: seven of them, deer below the crags, in the north hills, on the east hills and the far east slopes; boar in the pine wood by the bay, the west woods and on the headland. Five to eight head each, tawny deer (the stags antlered) and dark, tusked boar, in loose bunches that graze, drift about their home ground, and bolt a little way when one of them is taken. They stay on firm open ground: never on water, the river banks, cliffs, roads or buildings.
- Herds thin and grow back. A hunted herd loses a head per kill and grows back a head every ten days when nearly whole, slower the fewer are left (about every five weeks at two of seven). Hunters always leave the last two, so no herd dies out.
- The hunting lodge (M twice, 200 dr, 6 workers): a log cabin with a bark roof and antlers over the door, a drying rack where the hams hang (as many as its store holds), a hide on a frame, a fire pit with a spit. It sends up to three hunters, a few days apart, across open country (off the roads, round buildings, never over water or cliffs) to the nearest herd within 40 tiles that has more than two head. A hunter stalks it for two days, takes one (160 measures of meat), and walks back with the deer or boar over his shoulders. When every herd in reach is down to its last two, the lodge sends nobody and says so. Placing one tells you which herds are in reach, how far, and about how much meat a month it would bring, shared with any lodges already hunting them.
- The dairy (M three times, 250 dr, 8 workers): a whitewashed stone house under red tiles with a bench of cheese wheels beside it, and behind it a wattle pen with a goat shed, a hay rack and a trough, where six goats graze. It needs green pasture (35% grass at least, the placing tool tints poor ground) and makes cheese by the grass: about 500 measures a month on the best, fully worked.
- Ox carts take meat and cheese to the granary, which keeps each food in its own room; the agora's porter brings a mix back to the stall; the food vendor carries whatever the stall has, a ham and a cheese in her basket beside the loaves. You can see the stores fill: hams and cheese wheels in the granary's yard, hams hung along the stall's awning, cheeses in its third basket.
- Food variety: each person still eats about a measure a month in all, shared across the kinds on the table, so a town with only bread eats as before. A hut needs one kind to become a cottage, a cottage two kinds (and the blessing) to become a townhouse, a townhouse all three (and plays) to become a fine house. A cottage only wants a second kind once the city makes one.
- The food variety overlay (L twice, or its button): a little stack over each home, one block per food on its table (bread gold, meat red-brown, cheese pale), a dark ring for each kind it needs and lacks; the ground red where it's short, amber where another kind would lift it, green where it has what it needs; farms, lodges, dairies, granaries and agoras marked. A legend under the top bar.
- Homes say what's on the table: "Has food: bread and cheese · the cheese runs out first, in 40 days", "Only bread on the table; a townhouse needs two kinds · no meat or cheese for 12 days: the city has no hunting lodge yet". The household panel's mood says "Only bread on the table: they'd like cheese too" or counts a varied table in their favour, and they talk about it ("Bread, bread and more bread…").
- Hovering a hunter says where he's going and what he carries; hovering a herd says how many head it has, how fast it grows back and how many hunters are after it.
- Keys: every letter was taken, so M cycles the wheat farm, the hunting lodge and the dairy, and L cycles the food overlay, the variety overlay and off.

### What to try
1. Open `#hunter`: `#town` about two weeks on, as a hunter steps out of the lodge at the head of the north street, with the camera following him. Follow him to the deer in the north hills, watch him stalk them, and follow him back with the deer over his shoulders. Hover him on the way, and hover the herd.
2. Open `#dairy`: `#town` close over its dairy, the goats in their pen and the cheeses on the bench. Hover the dairy.
3. Open `#table`: the food town, its cottages blessed by a shrine but with only bread, two months after a dairy went in by the lane, as the first cheese reaches the stall. The variety overlay is on and the panel is open on the cottage nearest the agora. Unpause: in my run it became a townhouse two days later and three more followed within three days; the rest wait for more cheese.
4. Open `#overhunt`: the food town three months after three hunting lodges went in up the lane, all after the same deer below the crags, now down to two or three head. Hover a lodge and the herd, and move the lodge tool beside the lane to see what a fourth would get. Clear all three lodges (the clear tool) and watch the deer grow back: they were whole again about two months later.
5. In `#town`, press L twice for the variety overlay and look along the core's streets: which homes have all three foods, which are short.
6. Open one of your slice 8 saves (`#saved` or `#continue`): the welcome back says what townhouses and fine houses now need and that they have six months; its fine houses say they have only bread and that the city has no hunting lodge or dairy yet, but nothing warns for six months. Build a lodge (M M) within reach of a herd and a dairy (M M M) on green land and watch the meat and cheese reach the homes.

### What I'd like your eye on
- The hunter going out and back (`#hunter`): does it read as a hunt from street level, and does the carcass over his shoulders read as a deer?
- The lodge and the dairy close up (`#dairy`, and the lodge in `#hunter` before he leaves): do they read as a hunting lodge and a dairy, and apart from the houses and the farms?
- The deer and boar herds: the right size against the houses and people? The boar bunch up tightly.
- The variety overlay (`#table`, `#town` with L twice): are three stacked blocks over each house readable from above, or too busy?
- The pace: a new dairy's first cheese reaches the stall about two months after it goes in, and a new lodge's meat takes a while too, because it goes by cart to the granary and then by the porter to the stall. Is that too slow to feel the cause and effect?
- The demos open poorer again: `#theatre` with 17 drachmas, `#town` with 728.

### Known rough edges
- `#town`'s dairy makes more cheese than the town eats: by opening its granary's cheese room is full, the dairy's store fills and it stands idle part of the time (its tip says so: "Every granary's cheese store is full").
- In `#table`, after the first four cottages climb, the next wait about five weeks, because one dairy there (70% grass, about 350 measures of cheese a month) doesn't feed every cottage at once.
- Goats graze only inside their pen, not on the open ground beside it; there's no smoke from the lodge's fire.
- The phase 1 rough edges noted in the phase review are still there (left for slice 14), and money pressure is untouched (slice 14).

### Measurements
- Tests: 156 in 15 files, all passing (was 141 in 13): herds stay on firm open ground and never drop below two; regrowth; off-road paths; the hunter's trip; over-hunting and recovery; the dairy's rate by grass; the granary's and stall's rooms and the porter's mix; levels by kinds of food; a real slice 8 save loading with six months' grace and, with a lodge and a dairy built after loading, keeping its fine houses; determinism and a save mid-hunt. Every cottage demo fingerprints exactly as before.
- Smoke: extended with following a hunter, the dairy's hover and goats, the variety overlay and its legend, L, `#table`'s panel, and `#overhunt` with the lodge tool's tip. Every demo token opens with no page errors.
- Download: 272 KB compressed (was 254 KB).
- Load: ready at 1.19 to 1.35 seconds and first frame at 1.44 to 1.59 seconds by the page's own clock (was 1.14 and 1.37). `#town` ready at 1.58 s, first frame at 2.04 s (was 1.94 and 2.39). Target: under 3 seconds.
- Triangles and draw batches: the opening view 566,000 in 63 (was 534,000 in 57: the herds); `#food` 460,000 in 75 (428,000 in 69); `#fine` 549,000 in 132 (498,000 in 84: the lodge's and dairy's yard pieces and the stores); `#town` 705,000 in 148 (658,000 in 99), overview 821,000 in 173 (774,000 in 124).
- Main-thread time per frame before drawing, paused / running: `#food` 0.66 / 1.10 ms (was 0.61 / 1.15), `#fine` 0.76 / 1.46 (0.56 / 1.26), `#town` 0.92 / 7.04 (0.77 / 1.99). The `#town` running figure is noisy over its 13 frames; side by side with the slice 8 build over 60 frames it was 5.1 to 5.5 ms against 3.2 to 3.9, at about ten game ticks a frame (the headless browser draws one frame a second, so a real one does far fewer ticks a frame). The simulation's cost per tick is unchanged; the extra is drawing more walkers (47 against 38) and the stores changing.
- A save of `#town`: 215 KB (was 205 KB).
- Frame rate: not measured (software graphics only here). Target: 60 frames a second on a mid-range laptop at 1080p.

### What the review changed
I went through every step above in the browser, opened the earlier demos and compared them with pictures from before this slice, played each demo with townhouses or fine houses six months on, and loaded older saves. These are the changes; the first three matter most.

- **Fewer things for the graphics card to draw.** This slice had added about 50 separate draws to `#town` and `#fine`. The farms, granaries, agoras, theatres, lodges and dairies, with the lodges' racks and the dairies' pens, are now drawn together in a few big pieces instead of one batch per kind, and the hams, cheeses and hunters in one batch each. `#town` from its opening view is down from 148 to 118 (it was 99 before this slice), its overview from 173 to 144, `#fine` from 132 to 106, `#food` from 75 to 71. Nothing looks different: I compared pictures before and after. Most of what's left over slice 8 is the new kinds of walker and the four kinds of animal.
- **`#hunter` now goes out with a hunter.** It opened with the hunter it followed already on his way home, so he was back at the lodge within a quarter of a minute. It now opens about two weeks later in the town's life, as the next hunter steps out of the lodge, and the camera follows him to the deer in the north hills (a little over two weeks of game time out, two days stalking, and as long back).
- **Homes say which food they're missing.** A townhouse with bread but no meat or cheese said "No bread for 12 days" in its warning, and its story said it went down "after two months without bread"; a fine house in an older save's six months' grace said "Still no bread, 21 months now". They now name what's actually missing ("No meat or cheese yet · they'll put up with it for 5 more months, then start to worry"), and the trouble list does too.
- **An older save's welcome back says what changed:** townhouses now need two kinds of food and fine houses all three, build a hunting lodge (M M) near the game and a dairy (M M M) on green land, and they have six months. Long notes like this one now stay up long enough to read.
- **A lodge's tip no longer leaves out the herd its hunters are after.** Near the edge of its reach a herd could be missing from "Game in reach" while the same tip said a hunter was after it.
- **`#dairy` looks at the dairy from the meadow side.** From the road a tree hid most of the pen and the goats.
- **The boar stand a little further apart,** since they bunched into one dark lump.
- **Corrected in this note:** the hunter does have a bow and a fur cap (the rough edge said he didn't); in `#overhunt` the deer were whole again about two months after the lodges were cleared, not five; step 1 and step 6 say what you'll now see.

Things to know when you try it, with numbers:
- `#town` makes more food than it eats: all three of its granary's rooms are full at opening (bread, meat and cheese), so the lodge and the dairy fill their own stores and stand idle part of the time. Their tips say so. Nothing goes short.
- A slice 8 `#fine` save opens with 420 drachmas: enough for a lodge (200) but not a dairy as well (250) until taxes come in. Six months is time enough for both, but you may have to wait for money for the second.
- Built from a slice 8 `#fine` save with no lodge or dairy, the fine houses start going down about nine months after loading, as designed. With a lodge and a dairy built in the first weeks, three of the 38 went down for a while and came back.

## Slice 8 — Coin and the ledger (16 Oct)

Money now comes in and goes out: rent is gone, a tax collector walks from a tax office and only the homes beside his way pay, every workplace pays its workers on the first of the month, and a ledger says where each drachma came from and went. You weren't here while it was built: every choice below is mine, from the spec's defaults.

What breaks, or moves: nothing is lost, but money is tighter everywhere. Your phase 1 saves open: rent turns into taxes at the fair rate, and since the town has no tax office yet, nothing comes in until you build one (the welcome back says so, and a line under the top bar too). Every earlier demo with workplaces now has a tax office, so it doesn't drain once open. In `#water`, `#food`, `#warning`, `#fine` and the rest, the streets, houses and people at opening are the same as before (I checked the counts and levels); only the money differs, because rent no longer piled up: `#food` opens with 1,714 drachmas instead of 4,040, `#fine` with 420 instead of 5,402, `#theatre` with 137. `#town`'s history changed: it was built with three tax offices and heavy taxes while it grew, and its builder waits for money before the bigger steps, so it opens with 622 people instead of 635 and 1,520 drachmas instead of 6,080.

### What's new
- The tax office (Z, 150 dr, 3 workers): a small stone counting house with its gable to the road, a bronze-green pediment and band, a porch of three columns with the clerk's table and a balance, an iron-bound strongbox and a bronze-green banner on a pole. It sends out a tax collector: a man in a dark green tunic and a wide straw hat, with a satchel at his hip (it gets a second purse once it's heavy) and a wax tablet. He walks the streets near his office (as far as the water carrier goes, a little faster than she walks), heading for the nearest homes that haven't paid in the last month. Each home beside his way pays him once a month, by its level and the rate; homes he never passes pay nothing. When he gets back, "+180 dr" (or whatever he carried) floats up from the office.
- The tax rate: a "Taxes · fair" chip beside the drachmas opens the five rates, each with what a cottage and a fine house pay a month (fair: 5 and 9 drachmas) and what households think of it. None: they're glad of it. Light: nobody minds. Heavy: they grumble, in their mood and in what they say. Harsh: they're unhappy, and once a month some worried or unhappy households send someone away (a grown child, or a family who joined them), with "moved away: the taxes were too harsh" in their story.
- Wages: every workplace pays its workers 2 drachmas each on the first of the month. When the treasury can't pay a workplace in full, its wages stay owed for the month: it works at half pace, its workers' households grumble ("8 of them are owed wages: the treasury is empty"), and nothing new can be built until money comes in. Money that comes in pays the owed wages first. There's no debt and no game over, and the drachmas never go below zero.
- So you can never get stuck: while the town has no tax office, the treasury keeps back what one costs (150 drachmas). Nothing else can spend it, and a tax office always can. The tool tips say when money is being held back and why.
- The ledger: click the drachmas (or press $). This month so far and last month side by side. Coming in: taxes by district ("Taxes by the olive grove · 27 homes"), and building you undid. Going out: wages by kind of workplace, with the workers ("Wages · farms · 70 workers"), and building by what was built. Then each month's net and what it started with. Under that, how many homes the collectors called on in the last month and where they missed ("Not yet: 26 on the west bank, 4 on the east road…"), the rate and what the homes paid, the wage bill, and any owed wages. The coast is cut into a dozen named districts for this (the flood plain, the west bank, below the cypress hill, the east road, by the bay, the headland…).
- The top bar: a small arrow beside the drachmas for which way money went last month (gold up, rust down); the digits turn rust while wages are owed.
- A money line under the top bar, clickable to open the ledger: when wages go unpaid ("Money: the treasury can't pay this month's wages at 11 workplaces…"); when wages go out and there's no tax office; and when the treasury would run dry within six months at the rate taxes and wages run now ("the tax collectors bring in about 0 dr a month and wages take about 220; at that rate the treasury runs dry in about 5 months").
- The tax overlay (J, or its button): the roads a collector reaches in bronze-green, brighter where one has walked lately; homes that paid in the last month tinted, and a taller amber post over each lived-in home no collector has called on in the last two months (a home he called on a month or so ago is just due again, so it has neither). Placing a tax office turns it on and says how many homes the new collector would reach and how many no collector has called on this month.
- Homes: the hover tip and the household panel say what they paid and when ("Taxes · paid the tax collector 13 dr 27 days ago (harsh)"), or why nobody has called (no tax office; too far by road; not this way yet). Hovering a tax office or its collector says where he is and what his satchel holds.
- Saves are half the size (a save of `#town` is 205 KB, was 452 KB).

### What to try
1. Open `#ledger`: `#town` with the ledger open. Read down it: which districts paid, what each kind of workplace costs. Close it with Esc and open it again by clicking the drachmas.
2. Open `#collector`: `#town` at street level, following a tax collector with the tax overlay on. Hover him to see what's in his satchel; wait for him to get back to see the coins float up.
3. Open `#taxes`: `#town` two months after the east street's tax office was cleared, looking along that street, with the tax office tool picked and the tax overlay on. The amber posts are the homes no collector reaches. Move the tool along the street to see how many homes a new office would reach, and place one.
4. In `#town`, click the "Taxes · fair" chip and pick heavy, then open a household (click a home) a little later: the mood says the taxes are heavy and the chatter grumbles. Set it back to fair and it settles.
5. Open `#harsh`: `#town` a month and a half after taxes went to harsh, with the panel open on a household that sent someone away. In my run, 5 people had left for the taxes by then (14 after seven and a half months), 5 households were unhappy and 11 worried. The town still grows, because newcomers keep arriving, and the treasury gains about 380 drachmas a month.
6. Open `#dry`: `#town` with taxes set to none, played on until the money ran out (eight months later), paused. Eleven workplaces are owed 126 drachmas, the money line says so, the drachmas are rust, and the panel is open on a household whose workers are unpaid. Nothing new can be built until they are paid. Set the rate back to fair, unpause, and watch the wages get paid as the collectors come back. It takes a while, because a collector hands in only at the end of his round: in my run the first coins came in within a week, every workplace was paid again about six weeks later, and the next month's wages went short once more for a few days before the town was back on its feet.
7. Open one of your own phase 1 saves (`#saved` or `#continue`, or Carry on from the bare link): the welcome back says rent is gone and to build a tax office (Z) by the houses.

### What I'd like your eye on
- The tax office and the collector at street level (`#collector`, and `#town` zoomed in on the main street at its west end): do they read as a counting house and a tax man, and apart from the shrine and the houses? From above, the office's bronze-green pediment and banner are what tell it apart.
- The numbers: wages of 2 drachmas a worker and the fair rate make a phase 1 town roughly break even (`#food` loses about 20 drachmas a month; `#town` gains about 90). Is that the right pressure, or should running a town cost more?
- Harsh taxes: they drive a few people out, but the town keeps growing and the treasury fills. Should harsh also slow newcomers, or hurt more?
- The ledger: is it the right amount on one card? It is long in a big town (one wages line per kind of workplace).
- The tax overlay's amber posts: clear enough from above, or do they read as fence posts?
- The demos now open with much less money (`#theatre` with 137 drachmas). Nothing in them needs building, but say if you'd rather they opened richer.

### Known rough edges
- Taxes come in by the collector's round, which takes about forty days there and back, so a home on his way pays about every forty days rather than every thirty, and a calendar month in the ledger can hold one hand-in or three: last month's net (and the arrow) swings between about −30 and +250 in `#town` while the town steadily gains. The money line uses a steadier figure for that reason (what the homes paid over the last month against the wage bill).
- `#town`, over its first two years left running, has a few homes at the far ends of the one priestess's reach (the two fine houses at the east end of the core, and the first townhouses on the east street) go up to about eleven days without her blessing, a few times each: they warn for those days, and none goes down a level (98 warned home-days in two years; slice 7's history had 12; the test allowed under 60 before and allows under 120 now). It came with the new history, not from the walkers' routing, which this slice didn't change.
- The satchel has two looks (light and heavy, from 20 drachmas), not a gradual swell.
- The phase 1 rough edges noted in the phase review are still there (left for slice 14).

### Measurements
- Tests: 139 in 13 files, all passing (was 120 in 12): the ledger always adds up over a scripted run of roads, plots, buildings, undo, taxes and wages; the collector taxes only the homes beside his way, once a month; the rate goes through the command queue; wages, unpaid wages, half pace and nothing built while wages are owed; the reserve; harsh leaving; a real phase 1 save (from the phase 1 code) loads with no tax office, fair taxes and a ledger that adds up, and plays on; `#town` stays within 1,500 drachmas a year of break-even over three years and never owes wages; every demo's setup pays its wages.
- Smoke: extended with the ledger, the rate chip, J, following and hovering the collector, the tax office tool and its tip, `#harsh`, `#dry`, and a phase 1 save opening with its note. Every demo token opens with no page errors.
- Download: 254 KB compressed (was 243 KB).
- Load: ready at 1.06 to 1.39 seconds and first frame at 1.31 to 1.62 seconds over three runs by the page's own clock (was 1.51 and 2.02 in the run before this slice). Target: under 3 seconds.
- Triangles and draw batches: within 2% everywhere. `#town` from its opening view: 658,000 triangles in 99 batches (was 650,000 in 103); overview 774,000 in 124 (766,000 in 128). The opening view: 534,000 in 57, unchanged.
- Main-thread time per frame before drawing, paused / running: `#food` 0.67 / 1.03 ms (was 0.49 / 0.88), `#fine` 0.60 / 1.34 (0.67 / 1.44), `#town` 0.82 / 1.66 (0.79 / 2.85). The districts are now worked out at load (about 25 ms), not when the first collector calls (that had been a 21 ms hitch in `#food`).
- A save of `#town`: 205 KB (was 452 KB).
- Money in `#town`: 1,520 drachmas at opening, about 2,400 a year later and 3,700 two years later (was 6,080, and 17,600 two years later, with rent).
- Frame rate: not measured (software graphics only here). Target: 60 frames a second on a mid-range laptop at 1080p.

### What the review changed
I went through every step above in the browser, opened the earlier demos and compared them with pictures from before this slice, and stress-tested the money rules with long runs. These are the changes; the first two matter most.

- **A town with no tax office can always build one.** The treasury keeps back a tax office's price while there is none, but a town that had run dry and then cleared its only office (say, to move it nearer the houses, as the money line suggests) was left with a few drachmas, no taxes and no way ever to get the money back. Now, while the town has no tax office, one costs no more than the treasury holds, and the tool says so.
- **Raising taxes from none brings them in straight away.** Homes the collector had walked past while the rate was none counted as "called on" for a month, so after turning the rate back up (as step 6 asks) those homes paid nothing until the month was out. Now he collects from them on his next pass.
- **The tax overlay's amber posts mark the homes no collector reaches.** A collector's round takes about forty days there and back, so homes on streets he does walk spent their last ten days or so with a post, and `#town`'s core sprouted posts every few weeks. A post now means no collector has called in two months; a home he called on a month or so ago is just due again and has neither tint nor post. `#taxes` now opens two months after the east street's office was cleared (it was one), so that street's posts show.
- **The water and food demos open with their tax office staffed.** The office went in at the very moment each scene opened, so `#water`, `#food`, `#harvest`, `#bridge`, `#people`, `#warning`, `#decline`, `#missing` and `#grow` opened with the jobs count short and red (2 of 5 in `#water`, 44 of 47 in `#food`). It now goes in a day earlier; I checked that every one of them opens with the same streets, houses, people, walkers and drachmas as before. `#workers` is left as it was, so its line still names the farms.
- **The "+180 dr" over a tax office comes when the collector hands in.** In a town that had stopped growing it could come late.
- **The money line, when wages go unpaid with taxes at none,** now says taxes are set to none, rather than "higher taxes would help".
- **Corrected in this note:** step 3 (two months after, not one), step 6 (how long the wages take to come back), the tax overlay in What's new, the length of the collector's round, and what `#town`'s warned homes are (a few homes at the far ends of the priestess's reach, a few times each for up to about eleven days, not two homes once for a month). The rough edge about `#food`'s jobs count is gone, since it's fixed.

Left for you to judge, with numbers: **harsh taxes cost almost nothing.** I played `#town` a year on at each rate. At fair it reached 965 people and gained about 74 drachmas a month; at heavy, 965 people and about 200 a month (nobody leaves, only the moods and the chatter change); at harsh, 950 people (21 had left for the taxes) and about 320 a month, with exactly the same houses at every level. So harsh is four times the money for 15 fewer people: as the spec has it (leaving is the only penalty) the newcomers refill the homes faster than the taxes empty them. Making harsh bite would take something the spec rules out for now, such as fewer newcomers while taxes are harsh, or households leaving whole. Say if you want either.

## Slice 7 — A town worth keeping (16 Oct)

The town can now be kept: it saves itself, you can save it by hand, and the bare link offers to carry on. The coast has sound, the walkers really walk, and `#town` is a grown town of 635 people to open first. You weren't here while it was built: every choice below is mine, from the spec's defaults.

Nothing breaks: this is the first slice with saves, so there are no older saves to lose. Every earlier demo opens on exactly the same streets, houses and people as before. Two earlier numbers moved because the walkers now go first to the homes closest to going down (see What's new): in `#closed`, rebuilding the theatre and mending the road at once now loses 7 homes a level (the 7 on the cut-off street) instead of 15, and every home is a fine house again about three weeks sooner; and `#grow` played through without more farms loses 15 instead of 17.

### What's new
- Saving. A scroll button in the top right corner opens a small card: Save now (or Ctrl+S), your save and the autosave with their date, people, homes and drachmas and an Open button, and "Start again on an empty coast". The game saves itself every three months of game time and when you leave the page, but only once you've built something (or opened a save), so looking around a demo never overwrites your town. The first time it saves itself in a session a small note by the corner says so (after that the card shows when it last saved), and if it ever can't save, the note says why. Building in one of the demos doesn't count: a demo only saves itself once you've saved it by hand, so trying one never replaces the autosave of your own town. Your own save only changes when you press Save. Saves stay in this browser on this computer.
- Carrying on. The bare link shows a welcome card, and if this browser holds a saved town it offers "Carry on" with its date and people. `#continue` opens the newest save, `#autosave` and `#saved` the one you want. The camera comes back to where it was.
- When saving can't work (site data turned off for the page, storage full), the card and the note say so in plain words and the game plays on. A save from another version, or a damaged one, is refused with the reason ("This save is from an older version of the game (version 5); this one reads version 6, so it can't be opened.") and the coast opens as usual.
- Sound, all made in code, starting at your first click or key press: the sea breathing on the shore (louder near the water), a little wind higher up, birds in the trees and now and then a gull over the bay. Down in the streets, footsteps and the creak of cart wheels near the camera. Soft sounds for laying a road, marking plots, building, clearing, undoing, and a gentle "no" when something can't go there; a little two-note chime when a home goes up a level and a falling pair when one goes down. No music. The speaker button in the corner mutes it, and the game remembers; while muted, or while the tab is in the background, the sound is stopped altogether.
- The welcome card on the bare link: three steps to start (a road in from the edge, housing beside it, a fountain), a pointer to the build bar, and "See a grown town", which opens `#town`. Picking a tool puts it away.
- The town's shortfalls, readable without hovering: a calm line under the top bar when the farms grow less than the town eats and the granaries would run empty within about six months ("Bread: the farms grow about 210 measures of wheat a month and the town eats about 420. Two more farms would keep it fed. The granaries are nearly empty."), and while jobs go unfilled ("Workers: 29 jobs unfilled. The wheat farm has 0 of 10 (and 2 more places). 15 people can work for 44 jobs: more homes would help."). Click a line to go there; the bread line also turns the food overlay on. It waits three game days before showing, so a family moving in or out doesn't make it flicker.
- Placing a farm (or any workplace) with no road beside it: the footprint turns amber and the label says why it wouldn't work ("No road beside it: its workers couldn't get there and its carts couldn't take the harvest away. Lay a road along one side first."). You can still place it, since the road may come next.
- Walkers go first where they can still save someone: the water carrier, the vendor, the priestess and the actor head for the home closest to going down, and don't spend a round on a home they'd reach too late. Where nobody is warned, they choose exactly as before.
- Walkers walk: legs (and settlers' arms) swing in step with the ground they cover, so feet don't slide at any speed; the ox plods with a diagonal gait. The long-robed women still glide with a bob.
- Small details: windows on the backs of townhouses and fine houses (the walls you see from the next street were blank), and a wisp of hearth smoke from some of the bigger houses.
- Fewer draw calls: the settled houses in each patch of the map, and the plants, are now drawn as one piece each, so the opening view draws in 57 batches instead of 125. Nothing should look different.
- `#town`: a town on the east bank a few years in. The road comes in from the west edge, up a lane past a hamlet of huts and new tents, over the timber bridge at the river's narrows, through seven wheat farms and the granary on the flood plain, to a core of fine houses round a fountain, an agora, the shrine and the theatre, with townhouses and cottages along the street to the east round a second fountain and agora. 635 people, every kind of house and building, about 40 walkers, opening at normal speed.

### What to try
1. Open `#town`. It opens from the hills behind the town, looking down over the fine houses to the sea, the river, the bridge and the farms, at normal speed. Pan along the main street, follow a walker (click her), and press I for what's missing (nothing, at first). Left running, in my run no home went down a level in two game years and the town filled up to about 1,290 people. From about the eighteenth month it eats a little more wheat than its farms grow, but the granaries stay nearly full, so no bread line appears in those two years.
2. Open `#townstreet` for the same town at street level among the fine houses, for the walking and the details. Turn the sound on with a click and listen near the fountain, then zoom out over the bay.
3. Build something in `#town` (a road will do), press Ctrl+S, and close the tab. Open the bare link: the welcome card offers to carry on with your town. Or open `#saved` (your save) or `#autosave` directly. After a reload with nothing in the link, you're back on the coast with the offer again. (Building in the demos below without saving leaves your autosave as it was; a demo you've saved by hand saves itself from then on.)
4. Turn off site data for the page in the browser's settings (or block cookies and site data) and open the bare link: the welcome card says saving isn't available there, and the scroll button's card says why; everything else plays as normal. (A private window usually still allows saving, just for that window.)
5. Open `#missing` for the bread line, and `#workers` for both lines. Then open `#grow`, place the shrine and the theatre as in slice 6's check-in and leave it running without more farms: in my run the bread line appeared around day 136 ("At this rate the granaries and stalls run empty in about 5 months"), long before the first house warned about bread (around day 355).
6. Open `#food`, press M and move the farm over the green land by the river away from any road: the footprint turns amber and the label says why.
7. Open `#closed` and try the fix from slice 6's check-in (rebuild the theatre across from the shrine, lay the road back on the ringed tile): in my run 7 homes went down instead of 15, all on the cut-off street, and every home was a fine house again by day 47.

### What I'd like your eye on
- `#town`: does it read as a town you'd want to keep, and is the opening view the right one to land on? I framed it from the hills so the sea, the bridge and the farms are all in it.
- The sound: the levels against each other (sea, birds, building sounds), whether anything gets tiresome after ten minutes, and whether the footsteps near the camera feel like a street or like noise. Everything is meant to be quiet.
- The walk: do the legs read at street level in `#townstreet`, and does the ox look right?
- The shortfall line: calm enough, or does it nag? It waits until the granaries would run empty within about six months; is that enough warning, or too late?
- The welcome card's words and size on the bare link.
- The four-need sign: no demo shows one (a home's needs run out months apart); I drew one through a debug hook and it shows the water drop, the loaf, the temple and the mask in one bubble. `node scripts/screenshots.mjs four-needs` makes the picture.

### Known rough edges
- `#town` takes a moment longer to open than the bare link because it plays two game years through the command queue first: by the page's own clock that takes about half a second here, and the town is ready at about 1.6 to 1.9 seconds with its first picture at about 2.2 to 2.4 (the bare link: ready at about 1.1, first picture at about 1.3). The loading card says it is getting the town ready.
- Saves are only in this browser: no named saves, no more than the two slots, nothing that travels between devices. Opening a save reloads the page.
- Sound can't be heard here (there is no audio in the headless browser); what was checked is that it starts on the first key, that nothing starts while muted, that muting stops it and is remembered, and that unmuting starts it again.
- When a home changes look, its patch of the map is rebuilt (since the phase review only the changed buildings are redone: about 2 milliseconds for `#town`'s busiest patch, down from about 19). In a growing town that happens every few seconds; if you still see a hitch then, this is the first place I'd look.

### Measurements
- Tests: 118 in 12 files, all passing (was 101 in 10): saves (a mid-everything save in `#closed` and `#town` carries on identically, undo survives, old, newer, damaged and incomplete saves refused in words, storage that throws or is full), the walkers' new rule on a hand-made street, `#town` (every level and building, the bridge, no home down in two years), and the shortfall lines.
- Download: 242 KB compressed (was 229 KB). A save of `#town` is 452 KB.
- Load: ready at 1.02 seconds and first frame at 1.26 seconds by the page's own clock (was 1.14 and 1.39). Target: under 3 seconds.
- Draw batches, before → after: the opening view 125 → 57; `#streets` 88 → 42; `#water` 112 → 54; `#food` 125 → 69; `#warning` 129 → 84; `#fine` 134 → 82, its overview 190 → 114; `#closed` 151 → 98, overview 207 → 131. `#town`: 103 batches and 650,000 triangles from the opening view (188 before the merging), 89 at street level, 128 from the overview. Triangles are about the same everywhere.
- Main-thread time per frame before drawing, paused / running: `#food` 0.54 / 1.03 ms, `#fine` 0.64 / 1.37 ms, `#town` 0.72 / 3.4 ms. The running numbers include about a second of game time per frame here (headless frames come about once a second), so they overstate a real frame.
- Frame rate: not measured (software graphics only here). Target: 60 frames a second on a mid-range laptop at 1080p with a few hundred buildings and walkers; `#town` (96 buildings, about 40 walkers) is the town to try it with.

### What the review changed
- **Sound is properly off when it's off.** While muted, nothing is made at all (the first click after unmuting starts it); muting stops the sea and the wind rather than just turning them down, and the sound pauses while the tab is in the background. The little chime for a home going up (or the falling pair for one going down) now plays only for homes near where you're looking, and at most once a second, so a fast-growing town doesn't jingle.
- **A quieter autosave.** The note by the corner says "Saved by itself" the first time in a session only; the saves card always shows when it last saved. If the game ever can't save by itself (storage full), the note says why, once, and the card says so too. A save by hand that failed is mentioned again when you open the card.
- **The bread line no longer cries wolf.** It now waits until the granaries and stalls would run empty within about six months at the rate the town is eating into them, and says how long they'll last ("At this rate the granaries and stalls run empty in about 5 months"). In `#town` the farms fall a little behind from about the eighteenth month, but the granaries stay nearly full, so no bread line shows in its first two years. In `#grow` without more farms it shows around day 136, long before the first house warns.
- **Esc puts the welcome card away** (and then the saves card), as the plan said it would.
- **The loading card** says when it is getting a prepared town ready, or opening your save.
- **Corrected in this note:** how long `#town` takes to open (it was measured from outside the page, which counts the slow first pictures of the software renderer: by the page's own clock the two years of play take about half a second and the town is ready in under two), step 1 (no bread line in two years now), step 3 (building in the demos also saves itself), step 5 (the new day and words), and the rough edges and the request for your eye on the shortfall line.

### What the phase review changed
I looked over the whole phase as one game: one long session from the bare link (roads, plots, a fountain, farms, the granary and agora, the bridge, saving, letting a street go dry and fall back, the shrine and theatre, every overlay, then a reload and Carry on), each slice's main promise again, and four game years of a town built the ordinary way, adding a farm each time the game asked for one. These are the changes; the first two matter most.

- **Trying a demo leaves your autosave alone.** Before, building anything in `#town` or any other demo turned on saving by itself, so the autosave of the town you'd been building could be replaced by a demo without you noticing. Now a demo only saves itself once you've saved it by hand, and its saves card says so. Your own town still saves itself as before. What's new and step 3 above are corrected to match.
- **The bread line speaks up when homes are already going without.** In my four-year town, the farms grew only a little more than the town ate, so the granaries never looked like running dry and the line said nothing. Meanwhile the homes at the far ends of the street went short between harvests and 27 of them fell back a level. Now, when homes are already short of bread and the farms grow less than a tenth more than the town eats, the line says so and how many more farms would keep it fed ("…too little to spare. 7 homes are already going without between harvests. Another farm would keep it fed."). In the same town it now shows in the fourteenth month instead of the twenty-third, and 7 homes fell back instead of 27. `#town` still shows no bread line in its first two years. When a farm, or a workplace short of workers, has no road beside it, the lines now say that rather than "short of workers".
- **Gentle seasons in the light.** The phase spec promised them and they hadn't been built. The sun is now a little warmer and stronger towards July and paler and softer towards January. The land and the farms don't change, and early spring, where every town starts, stays close to the light everything was tuned in. It is subtle on purpose; I'd like your eye on whether it is too subtle to notice or just right.
- **Houses going up a level cost less to draw.** Only the buildings that changed are redone now, not the whole patch: about 2 milliseconds instead of 19 for `#town`'s busiest patch. The rough edge above is updated to match.
- **Walkers standing still stand with their feet together.** One waiting at a farm or pausing on the road used to freeze mid-stride.
- **One card at a time in the top right corner.** The controls card and the saves card used to open on top of each other. Esc now also puts the controls card away.
- **The household panel no longer covers the population** on windows narrower than about 1560 pixels (a 1280-wide window, for example): it starts below the top bar.
- **Small words.** The water and food overlay buttons say what they show. The controls card uses the same curly apostrophes as everything else, and the bread line ends with what is already happening rather than putting it in the middle.

Noticed and left as they are (on the list for later):
- When a whole street falls back at once, the "Back to a hut" notes rise on top of each other.
- When two shortfall lines show and one goes and comes back, they can swap places.
- Money piles up with nothing to spend it on: my four-year town was down to about 3,100 drachmas in its first summer and had 15,000 by the fourth year.
- Pressing Start building on the bare link while a save exists: once you build, the new town's autosave replaces the old town's. Your save by hand is untouched, and Carry on is still offered first.

### The phase, all told

Phase 1, a living neighbourhood, is done: seven slices, each built, then reviewed and fixed, then a review of the whole phase. Here is what you can now do.

- **The coast** (slice 1): fly over a hand-shaped stretch of Greek coast with a bay, a river from the hills, olive groves and moving water, from a bird's-eye view down to the river bank.
- **Streets and settlers** (slice 2): draw roads that follow the ground, mark housing plots, and watch families walk in from the map edge and pitch tents. Clear and undo.
- **Water** (slice 3): place fountains and watch the water carrier choose her way down your streets. Tents become huts where she reaches, and the water overlay shows the street she misses.
- **Bread on the table** (slice 4): wheat farms on the river land, ox carts to the granary, an agora and a food vendor, workers drawn from the homes, rent, and timber bridges over the river. Fed huts become cottages.
- **The people who live there** (slice 5): click any home to meet the family, with their names, mood, what they have and lack, and a line or two of chatter. Neglected homes warn first, then slip back a level, and whole families walk out of town.
- **Shrine and theatre** (slice 6): a priestess and an actor walk the streets, and homes climb to townhouses and fine houses. Each service has its overlay, and the "what's missing" view shows them all.
- **A town worth keeping** (slice 7): saving, by hand and by itself, with Carry on from the bare link; sound made in code; walkers that really walk; calm shortfall lines for bread and workers; and `#town`, a grown town of 635 people to open first.

**Recorded for later**
- Which god the shrine belongs to, and gods reacting to worship (the gods phase).
- More foods and goods, storehouses, and the living market.
- Taxes, wages and tax collectors, and something to spend money on: it piles up with nothing to buy (15,000 drachmas by year four in a town built the ordinary way).
- Fire, collapse and crime, the original's hazards.
- Generated maps, once the wider world exists; music.
- Seasons that affect farming (today only the light changes).
- Small things: "Back to a hut" notes stack when a whole street falls back; two shortfall lines can swap places; starting a new town replaces the old town's autosave; a demo you built in but didn't save loses its changes when you leave it.
- Saves are about 450 KB each, and only two fit comfortably; more slots would need smaller saves.

**Budgets that moved**
- Download: 153 KB at slice 1, 246 KB now, from the extra buildings, walkers, sound and saves. Load stays well under the 3-second target: about 1.1 seconds to ready on the bare link and about 1.6 for `#town`, by the page's own clock.
- Draw batches went up when the map was split into patches (slice 2) and back down when settled houses and plants were merged (slice 7): 57 in the opening view, 103 in `#town`.
- Frame rate on a real laptop has never been measured. Only your machine can tell us whether `#town` holds 60 frames a second.

**Questions for you**
- Does `#town` hold a smooth frame rate on your laptop?
- Is the seasonal light too subtle, and is the sound the right kind of quiet?
- Does the bread line warn at the right moment, or does it nag?
- Should a demo you've built in warn before you leave it, rather than dropping the changes?
- Is money piling up acceptable for now?
- What should the next phase be?

## Slice 6 — Shrine and theatre (16 Oct)

The town gets its first taste of the gods and the stage: a shrine sends a priestess out with an offering bowl, a theatre sends an actor out with a mask, and cottages they reach climb to two-storey townhouses and then to fine houses round a little courtyard. You weren't here while it was built: every choice below is mine, from the spec's defaults.

Nothing to break: there are no saves until slice 7. Every earlier demo still opens on the same streets, houses and people (after the review, `#harvest` has three more people, and `#missing` opens with one more hut and one fewer cottage; see the end of this note). What you'll see change there: a cottage's panel now says what it needs to become a townhouse, and the stalls and granaries hold different amounts, because the review changed how much the food vendor's porter carries.

### What's new
- Shrine (V, 200 drachmas, 2 workers): a little marble temple on a stepped platform, four columns and a pediment to the road and a lilac band round the frieze, an altar in front with a smoking offering fire, jars of offerings and two cypresses behind. Its priestess, in a long white robe with a lilac mantle and veil, carrying a shallow bowl with a little flame in it, walks her round the way the water carrier and the food vendor do (32 road tiles' reach). Every cottage or better beside her way has the priestess's blessing for four months.
- Theatre (P, 400 drachmas, 5 workers): tiers of pale stone seats round a paved orchestra, banked with grass behind, and the stage building along the road, with three doors, painted panels and masks over the doors, a low stage, and rose banners at its ends. A few people sit in the seats. Its actor, in a rose tunic and a short saffron cloak, wearing a big pale comic mask, one arm flung up mid-speech and a scroll of the plays in the other hand, walks his round on the same terms and brings plays to townhouses and fine houses.
- Townhouses: a cottage with water, bread and the priestess's blessing, settled a month and with a month of each in hand, becomes a townhouse. There are two kinds: a two-storey house with its long side to the road, a timber balcony over the door and a walled yard with an olive tree and jars; and an L-shaped one, a two-storey block at the back and a one-storey wing to the road with a vine pergola on its roof terrace, beside a little walled court with a cypress and a bench. A townhouse holds 17 people and pays 6 drachmas rent.
- Fine houses: a townhouse that also has plays becomes a fine house, again after a month settled with a month in hand. There are two kinds: a courtyard house, a two-storey hall with a colonnade across the back, low wings down the sides and a columned gateway in the front wall, so you look into a paved court with an olive tree; and a villa with a porch of four columns under a pediment, steps up to it, and a garden with a clipped hedge and two cypresses. A fine house holds 21 people and pays 9.
- Going down works as before: ten days without, a two-month warning with a sign over the roof, then one level down, and the people it can't hold walk out as whole families. Big households (up to 21 people) now choose who goes the same way, never the head of the house and never breaking up a family.
- Signs for three or four needs: a wider sign holds the water drop, the loaf, a lilac temple and a rose mask in a row, always in that order. Signs sit higher over the taller houses.
- Two new overlays: religion (Y, or the temple button) shows where the priestess reaches in lilac, culture (C, or the mask button) where the actor reaches in rose. Posts stand over homes that want her or him and are without or running low. Placing a shrine or theatre turns its overlay on and says how many homes it would reach.
- The household panel, hover tips, what's-missing overlay and trouble count all know the new needs: "Blessings · last 3 months more unless the priestess comes by again", "To become a fine house: plays from a theatre, with water, bread and blessings kept up", "Gave up the fine house for a townhouse, after two months without plays". A cottage only asks for blessings once there is a shrine in the city, and a townhouse for plays once there is a theatre, so towns without them read as before.
- New talk: 47 lines for blessed cottages, townhouses with and without plays, fine houses, moving up, and going without the priestess or the plays ("We left honey cakes at the shrine. The priestess says the god was pleased. The ants certainly were.").

### What to try
1. Open `#grow`: the fed town of cottages from `#food`, with the shrine tool picked. Place the shrine beside the main road near its end, a few houses past the fountain (anywhere beside a road works; the label says how many homes the priestess would reach). Press 3 (four game days a second). In my run the first townhouses went up within ten game days, and every cottage on the streets was a townhouse after about three months. Then press P and put the theatre across the road from the shrine: fine houses start within ten days, and about four months later the whole street is fine houses. Leave it running: the town of fine houses now eats more wheat than its three farms grow. From about the fifth month, hovering the granary or the agora says so in numbers ("The farms grow about 570 measures of wheat a month and the town eats about 580; another farm would feed it", and from about the eighth month "two more farms"). Left alone, the granary slowly empties: the first fine houses warn about bread around the fifteenth month, their panel naming the two farms, and the first goes back to a townhouse around the eighteenth. In my run, two more farms by the farm road (I ran the road three tiles further east for the second; a farm right beside no road gets no workers, and the tip says so) kept every house fine with no warnings when built by the eighth month; built in the tenth, a few houses warned for a while but none went down; left to the thirteenth, 13 houses went down, because a new field takes two months to ripen and by then the granary was empty. No second agora is needed.
2. Open `#shrine` (add `-overlay` for the religion overlay, or press Y): the same town a month and a half after the shrine went in, townhouses going up among the cottages. Hover a townhouse and a cottage to compare what they say.
3. Open `#priestess` to follow her at street level, and `#actor` to follow the actor (drag or Esc to stop).
4. Open `#theatre` (C for the culture overlay): the theatre a month after it opened, seen from the north, fine houses starting to appear.
5. Open `#fine`: the district from above six months after the theatre opened, every house on the streets a fine house. Click one to meet the household (21 people, with all four needs), and press I for the what's-missing overlay.
6. Open `#compare`: the same moment from the east, the fine houses on the left and, on the right, the hamlet at the lane's far end, with its own fountain and agora but beyond the priestess's and the actor's reach, still cottages.
7. Open `#closed`. It opens paused. Two and a half months ago the theatre was cleared and one tile of the west street's road was cut (ringed in cream). Nobody has gone down yet: 16 fine houses warn, 9 of them about plays only, and the cut-off street's houses show wide signs with three needs (water, blessings and plays). The panel is open on the most urgent house, 12 days from going down. Press Space to watch them go down and families walk out (in my run 59 homes went down a level over the next eight months). Or first rebuild the theatre across the road from the shrine (P) and lay the road back on the ringed tile (T): in my run 15 homes still went down a level, the 7 on the cut-off street within about two weeks and 8 at the west end of the main road about five weeks in, because the new actor went first to the cut-off street, where the need was oldest. About two months later every home was a fine house again.

### What I'd like your eye on
- The four steps up: in `#compare` and `#fine`, can you tell a cottage from a townhouse from a fine house at the default height? Does each step look grander enough to be worth working for?
- The priestess and the actor: easy to pick out from the blue water carrier and the saffron vendor, from above and at street level?
- The shrine and the theatre: do they read as what they are? The theatre has a band of dressed stone round the top of its seats and a grassy bank behind (a tall wall there hid the seats from the road side); from the default camera on the road side you see the rim and the stone stairways rather than the seats themselves.
- The wide signs in `#closed`: can you read three icons at a glance, and tell which need is which?
- The pace: from the shrine going in to a street of fine houses took about seven game months in my run (under a minute at the fastest speed). Too quick, too slow? And the bread squeeze that follows in `#grow`: fair pressure, or a nuisance?
- The overlay colours: the priestess's lilac and the actor's rose, against the water blue and the food gold.
- The new talk: does it keep the voice of the earlier lines?

### Known rough edges
- No demo shows a four-need sign. A home's needs run out months apart, and its two-month countdown starts from the first one, so by the time a fourth need runs out it has already gone down a level. The sign itself is drawn the same way as the three-need one.
- When a theatre comes back after a long gap, the actor heads first for the houses that have gone longest without, not for the ones closest to going down, so a few homes at the far end can go down while he is busy elsewhere (in `#closed`, 8 of the 15).
- The farm shortfall is shown in numbers, but only when you hover the granary or the agora, or in a hungry house's panel. Nothing on the main screen says it until houses start warning.
- The culture towns draw more batches from the overview (up to 207, against 172–187 before). If your laptop struggles there, this is the first place I'd look.

### Measurements
- Tests: 101 in 10 files, all passing (was 90 in 9).
- Download: 232 KB compressed (was 218 KB): the new houses, the shrine, the theatre, the two walkers, the signs and the talk.
- Load: ready at 0.9 to 1.1 seconds and first frame at 1.2 to 1.35 seconds by the page's own clock over two runs (was 0.9 and 1.1).
- The opening view draws exactly what it did: 542,000 triangles in 125 batches. Towns with bread draw a couple more batches than before because the stalls hold more loaves: `#food` 458,000 in 125 (was 123), `#warning` 470,000 in 129 (was 123).
- Each new model is lean: a townhouse 524 or 616 triangles, a fine house 691 or 723, the shrine 633, the theatre 1,796 (a cottage is about 420).
- `#fine` (783 people, 38 fine houses): 488,000 triangles in 134 batches; with what's missing on, 522,000 in 138; `#compare` 491,000 in 134; the theatre 433,000 in 109; the overview 662,000 in 190. `#closed` 482,000 in 151, the overview 655,000 in 207.
- Main-thread time per frame before drawing: `#fine` about 0.4 to 0.6 ms paused and 1.1 to 1.2 ms running (`#food` 0.4 to 0.6 and 0.9 to 1.1; it was 0.4 and 0.7 before slice 6).
- Homes going down a level over two years: `#shrine` 0 (and no bread warnings), `#theatre` 0, `#fine` 0; `#grow` played through with two more farms 0, without them the first goes down around the eighteenth month.
- Frame rate: not measured (software graphics only here). Target: 60 frames a second on a mid-range laptop at 1080p.

### What the review changed
- **One agora can feed a street of fine houses.** Before, the food vendor's porter couldn't carry bread to the stall as fast as 38 houses of 21 people ate it, so the demo towns needed three agoras and a second granary, and even then `#grow` ran short. Now the porter carries half as much again each trip and the stall holds more, and the vendor walks as far as the priestess and the actor (64 road tiles, was 48). The demo towns now have one agora on the main street (plus the hamlet's own), one granary, and five farms; the second granary that stood empty is gone.
- **The game says what to build when bread runs short.** Before, a hungry fine house mostly said the vendor had "taken other turns" or the stall was empty, which pointed at the agora when the real problem was too few farms. Now, when the farms grow less than the town eats, the hungry house's panel, the granary's tip and the agora's tip all say so in numbers and say how many farms would fix it ("another farm", "two more farms"), leaving a tenth to spare. If a farm is short of workers, they say that instead.
- **`#closed` opens before anyone has gone down.** It now opens two and a half months after the theatre was cleared, instead of four, so you see the warnings with nobody yet gone back to a townhouse, and a fix in time saves most of the street. The step above has the new numbers.
- **"Not yet" instead of a grumble.** In the first two months after a shrine or theatre opens, a house the priestess or actor hasn't reached yet says "A theatre has opened; the actor hasn't come this way yet" with no minus to its mood, and its panel doesn't say she or he has "taken other turns".
- **The theatre from the road side.** From the default camera, south of the road, the theatre looked like a green mound. It now has a band of dressed stone round the top of the seats, four stone stairways up each tier and two shades of seat stone, so the tiers show where you can see them.
- **The warning box.** When a home is going without more than one thing, the box now says when each of the others would send it down ("Without blessings, they go in 40 days all the same. Without water, in 55 days."), where before it gave one date for all of them.
- **Smaller things.** The days in a house's mood now match the days in its panel (one rounded up, the other down, so they could be a day apart). Talk that contradicts the town is skipped: nobody wishes for a theatre when there is one, nor for "somewhere proper to thank the gods" when a shrine stands, and a hut doesn't talk about its townhouse.
- **`#shrine` bread.** The west-end bread warnings while the cottages turn into townhouses are gone: over two years `#shrine` has no warnings at all.
- **Re-checked.** I followed the steps of every earlier check-in again after the bread change. They still do what their notes say, and in `#bridge`, where 14 homes went down over two years before, none do now. `#harvest` opens with 473 people (was 470), and `#missing` with 438 (was 434), three huts instead of two and 7 homes warning instead of 9, because bread reaches the stalls at a different pace. In `#missing`, the two extra farms still bring every home back to a cottage in about six months, as its note says.
- **Corrected in this note.** Step 1 (`#grow`) now tells the bread story as it plays now, step 7 (`#closed`) has the new numbers, and the measurements are the new ones.


## Slice 5 — The people who live there (16 Oct)

Every home is now a household you can click: a named family from somewhere in the Greek world, who they are, how they feel and why, what they have and lack, a line or two of their talk, and what has happened to them; when a home loses what it needs it warns you with a sign over its roof for two months before it goes down a level and some of the family walk out. You weren't here while it was built: every choice below is mine, from the spec's defaults.

Nothing to break: there are no saves until slice 7. What changes on purpose: a home now goes down a level about 70 days after a need runs out, not 30 (ten days' grace, then a two-month warning); a hut needs a month's bread in hand to become a cottage; undo only reaches back about a month, and not past someone moving in or grain being stored; the water and food overlays' posts now stand only over homes without, or with less than a month left. Every earlier demo still opens on exactly the same town.

### What's new
- The household panel: click any lived-in home (with no tool picked) and a parchment panel opens on the left. "The house of Sosias, from Megara, here since May 750 BC"; how they feel, from content to fed up, with a little face and every reason named ("+ Bread on the table", "− No water for 39 days"); two lines of talk from named members, which change every 12 days; what they have (and how long it lasts) and what they lack (and why, in the same words as the hover tip); what the next level needs; who lives there, with ages and how they are related ("Eurydike, 40, cousin of Sosias"; "Stephanos, 40, husband of Eurydike"); and their story, newest first ("Became a cottage: whitewash, a tiled roof and bread on the table"). A gold ring on the ground marks the house. Click another home to switch; Esc or open ground closes it.
- Families: the first settlers to a plot found the household and give it their name; later arrivals are the head's brothers, sisters and cousins with their own families. About 60 men's and 60 women's names (Nikias, Lykon, Theano, Myrrhine…) and 20 places they came from (Megara, Argos, a hill village in Arcadia…). Names and ages come from their own seeded stream, so they never change how the town grows.
- Warnings: when a hut loses its water, or a cottage its water or bread, for more than ten days, a round sign floats over its roof with a water drop or a loaf (or both side by side, when both are missing), its rim turning from orange-red to deep red as the two months run down and pulsing in the last ten days. The panel shows a warning box: "No water for 39 days, no bread for 12 days. In 31 days they give up the cottage for a hut, unless the water carrier comes by. 4 of them would move away (Doris and Chairephon; Euboule and Pamphilos)", with a bar running down and the reason for each need ("Water: no road joins it to a fountain").
- Decline: if nothing changes, the home goes down one level ("Back to a hut", and "−4" in rust), the people it can no longer hold walk out of town along the road, and the panel names them. Families leave together: a brother, sister or cousin with their partner and children, or a grown son or daughter or an elderly parent on their own, never the head of the house and never a young child without its parents ("Menon and Charis moved away", "Philippos and family went back to Megara"). Another level down takes another full warning.
- The trouble count: a red triangle in the top bar with the number of homes warning (hidden when none). Hover it for the list; click it to fly to the most urgent and open its panel.
- The "what's missing" overlay (I, or the house-and-question-mark button): homes about to go down a level are tinted red, homes lacking what they need to grow amber (with gold-rimmed signs saying which need), homes with all they need green. A small legend at the top says what the colours mean.
- Hover tips on homes say "The house of X" and "Click to see who lives here". The undo button greys out and says why it can't ("Undo only reaches back about a month", "A family has moved in: clear it instead").
- Under the hood: the town's drawing only redoes what changed (the ground and bridges only when a road or plot changes; workplaces only when something about them changes, not every frame), and the stall's baskets look full from about two-thirds stocked.

### What to try
1. Open `#people` for the fed town by the agora at street level, with the panel open on the house of Sosias. Read it, then click other homes. Hover one first to see its tip.
2. Open `#warning`. It opens paused. A year after the town grew, the one tile of road where its west street met the lane was cleared, so the water carrier and the food vendor can't get in: seven cottages along that street have signs over them, the most urgent with 26 days left. The panel is open on one of them and the road tool is picked. The cut tile is ringed in pale cream, centre right, where the street should meet the lane (the ring goes once the road is back). Click it to lay the road back, then press Space to let time run: within about two weeks of game time (about 15 seconds at normal speed) the water carrier and the food vendor have been down the street, the signs are gone, nobody has gone down a level, and the story says "The water carrier came back" and "The food vendor came back".
3. Open `#decline`, the same street a few weeks later with the panel on the house nearest to going down, 3 days from it. Time is running: watch it become a hut, the rest of the street follow within days, and the leavers walk out of town. Read the panel after.
4. Open `#missing` for the watered town with one farm feeding it, the what's-missing overlay on: red homes are short of bread, amber ones need it to grow. Click the trouble count in the top bar to go to the most urgent home. Then build a second and a third farm (M) on the green land by the river, right beside the farm road (if the tip says "Needs a road beside it", move over: a farm with no road gets no workers), and press 3. A new field takes two months to ripen, so a dozen homes go down to huts first; over the next six or seven game months (about a minute at speed 3) watch them come back to cottages and the reds fade. (One more farm alone isn't enough: with two, a few homes keep warning on and off for months.)
5. In `#people`, press I to turn on the overlay (or open `#people-overlay`): the town is green, and the tents up the lane are amber with water signs, beyond the fountain's reach.
6. In any town, build something, wait a month at speed 3, and hover the undo button.

### What I'd like your eye on
- The panel: is it the right size and place (left side, 344 px wide)? Is the order right (warning, mood, talk, have and lack, who lives there, story)? Is anything there you'd never read, or missing?
- The talk. About 130 lines meant to be warm and gently funny and a little Greek ("The goat ate my sandal. I've forgiven the goat. I haven't forgiven the sandal-maker."). Do they land, and does the voice feel right?
- The signs over roofs: big enough from the default height, too big right down among the houses? Can you tell the red warning rim from the gold "needs to grow" rim in the overlay? When a home lacks both water and bread, the drop and the loaf share one sign: readable?
- The timing: ten days' grace (a water carrier or vendor a few days late is ordinary on a long round, and without it signs flickered on and off all over `#water`), then two months' warning, then one level down. At normal speed a day passes each second, so a home goes down about 70 seconds after its water stops (a little over a minute of warning on screen; 15 seconds at the fastest speed). Enough time to notice and act, or too long to feel any pressure?
- The what's-missing colours: red, amber and green on the ground under the houses. Readable from the overview?
- Mood is only a reading for now: it explains, it doesn't make anyone leave. Does seeing "Fed up" with nothing following from it feel wrong?

### Known rough edges
- The names come from lists of 60, so two households can share a head's name in a big town.
- The story keeps the last eight things that happened; older ones drop off.
- Talk repeats over time (about 130 lines), and the "situation" line only knows a few situations (no festivals, no gods yet).
- Because families leave together, now and then a decline sends away a few more people than the lower level strictly needs (in a test town with 74 declines, it never did).
- The main-thread saving from drawing only what changed doesn't show in my headless numbers at this size of town; it should matter more in a bigger one.

### Measurements
- Tests: 90 in 9 files, all passing (was 74 in 8).
- Download: 217 KB compressed (was 195 KB): the names, the talk, the panel and the signs.
- Load: ready at about 0.9 seconds and first frame at 1.1 seconds by the page's own clock, as before.
- Every earlier view draws exactly what it did: the opening view 542,000 triangles in 125 batches, `#water` 511,000 in 112, `#food` 458,000 in 123.
- `#warning`: 470,000 triangles in 123 batches (the signs add about 1,200 triangles; the ring on the cut road one batch); `#missing` with the overlay on, 552,000 in 145; the overview with the overlay, 649,000 in 178.
- Homes going down a level over three in-game years: `#food` 0 (was 0); `#workers` 0 (was 2); the `#chain` town with three farms and the agora at the edge of town 0 (was 13, the back-and-forth found in review); with one farm, where bread is genuinely short, 43 (was 50).
- In `#food`, over a game year, the drawing compares the town's 25,600 tiles 0 times (was 638), and the workplaces are re-read 638 times instead of every frame. Main-thread time per frame before drawing is about 0.5–0.7 ms both before and after (software graphics, and the noise is bigger than the difference).
- Frame rate: not measured (software graphics only here). Target: 60 frames a second on a mid-range laptop at 1080p.

### What the review changed
- **Families leave together.** Before, people left one at a time from the newest arrivals, so a husband could stay after his wife left, or children could be left without their parents. Now whole families go: a brother, sister or cousin with their partner and children, or a grown son or daughter or an elderly parent on their own. The head of the house never leaves, and nor does a partner or a young child without the rest of their family. The panel's warning names who would go, and the story gives each family its own line.
- **A home warns about everything it lacks.** A cottage cut off from both water and bread now shows both on its sign (a drop and a loaf side by side), and its panel names both, with the reason for each. The story notes each one coming back: before, when the water came back while bread was still short, the story never said the water carrier had come back.
- **The warning and "needs to grow" signs look different.** A warning's rim starts orange-red and turns deep red; the "needs to grow" sign in the what's-missing overlay keeps a gold rim. Before, a fresh warning's amber rim was almost the same colour as the gold one. Signs also grow less when the camera is right down among the houses.
- **`#warning` opens paused, with the cut road ringed.** It used to start with time running, and in my run reading the panel and finding the gap took long enough for two homes to go down a level after the road was mended. Now you can read the panel and find the gap first, then press Space. The gap is ringed in pale cream (in `#decline` too) and the camera is framed on it. I checked the steps as written: after the road is mended, all seven warnings clear within about 15 days of game time, and nobody goes down a level.
- **The talk.** No line has a baby doing grown-up things. No lines say "back to a tent" from a cottage. No line says a relative is leaving when the panel says otherwise. Places of origin now read right in every line ("a farm near Sparta" became "the hills of Laconia"). A few weaker lines were rewritten.
- **Smaller things.** "Here since" stays on the panel even after the story fills up. When bread runs short because a farm has no road or too few workers, the reason now says so instead of asking for another farm. The undo button explains itself from the start. When a home that has already gone down a level is still without and starts worrying again, its story says so.
- **Corrected in this note.** The steps for `#warning` and `#missing` now match what happens: `#warning` opens paused, and the farms in `#missing` must be right beside the road. With three farms the reds clear in about a minute at speed 3, not a couple of minutes. `#warning` and `#decline` don't open any slower than the other demos: by the game's own clock they're ready in about a second, like `#food`. The 3.5 seconds I gave before was the headless browser's overhead.


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
