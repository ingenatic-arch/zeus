# Check-ins

Notes to Oliver, newest first.

## Slice 34 — Vassals and allies (22 Oct)

Your city can now stand over its neighbours. You can take a city in three ways: march a full force on it to conquer it, send a herald demanding that it submit, or offer to let an overdue debt go in return for its loyalty. Before you send, the page shows the odds and the reasons behind them. A vassal pays tribute every season, in coin or in one of its goods, light, fair or heavy. Its donkeys walk the tribute into your storehouse or tax office. It never trades against you or threatens you, and it sends men down its road when raiders come for you. Its loyalty is a number with every reason listed. When loyalty falls under 30, the vassal arms a season before it rises: lighten its tribute, send a gift, or march on it. A warm ruler can become your ally: it sends men when you are raided and asks you to join its wars, and it may march with you when you go to conquer. A lender's army now comes only for 500 dr or more. You weren't here while it was built: every choice below is mine, from the spec's defaults.

What breaks, or moves:
- **Saves.** The state version is 30 on this line (renumbered when it merges). Older saves load, with no vassals or allies.
- **A lender's army marches only for 500 dr or more** (your balance card). Below that, its agents keep seizing your goods until the debt is paid. The line under the top bar says so ("not worth a march for 120 dr, so he sends no army, but the seizing goes on until it is paid"), and so does the Loans tab ("Not worth a march: 120 dr left"). For a smaller debt, the third step's army never comes.
- **Rivals take vassals less often.** A rival now takes a vassal only when that city has lost a war lately, or when its army is under four fifths of its usual size and the two are at a feud. A city that broke free can't be taken again by the same lord for two years. Over 40 runs of twelve years: 41 bows (was 83), Argos to Sparta 25 of them (was 54), in 22 runs (was 34).
- **Earlier demos.** I compared every demo at opening with the baseline (people, money and date). All but ten are the same. Every one that moved did so because Greece now plays differently under the new rival-vassal rule: with the old rule, `#rivals` and `#fortress` open exactly as before.
  - `#rivals`, `#rivalsmap` and `#rivalstreet`: the town waits for Greece's war to end, and that is now a month later: July 746 BC (was June), 1,411 people as before, 4,846 dr (was 3,410). `#lend`, `#repaid` and `#forgive`, built on it, move by the same month.
  - `#fortress`: Greece is calm sooner, so it opens in June 745 BC (was March 744 BC), with 1,330 people (was 1,344) and 3,057 dr (was 2,836). Its loans are now other rulers' than slice 31's note says: you owe Thebes 2,140 dr by 1 October 745 BC and Knossos 1,650 dr by 1 June 744 BC, and Athens owes you 1,110 dr by 25 June 744 BC. So read Thebes' and Knossos' Loans tabs where slice 29's steps say Corinth's. Sparta's band is 31 men, about 21 days from the west edge, and 800 dr still turns it back.
  - `#greecegrows`, `#knossos` and `#memphis`: no rival took a vassal in those ten years. So Argos' bow to Sparta is set up for the demo, and named so, as the setup already did in that case: a day later, 1,313 people (was 1,301). Slice 31's steps for it have moved with Greece: Athens no longer bows to Sparta, so click Argos' line in the News of Greece in step 2 instead; Sparta's army is 65 men (not 84); Memphis has 10,215 people and Athens 6,473; and Knossos now carries a ▼.
  - `#report` opens the same in the town, but its Greece has moved too: Argos won a war with Sparta and pays it no tribute, and only Troy carries a ▲.
- **A force sent west from `#collect`'s town now goes.** It used to find no way out of your land. Its walk out to the west edge is long: about five weeks before it sets off along the road (and as long again coming home).

### What's new
- **An Empire tab on every ruled city's page.**
  - Not yours: the ways to take it, each with its odds and reasons, or why it can't be done now. **Conquer it** meets the city's whole army at home, plus a quarter of each friend's army and its lord's. **Demand it submit** works on a city cold or wary towards you whose side is no more than half your army. **Its debt for its loyalty** needs a loan to you that is overdue. **An alliance** needs a warm ruler. Your herald's last answer stays on the page for a year.
  - Your vassal: its tribute (coin or a good it sells; light, fair or heavy, each with what it comes to a year and what it does to loyalty), what is on its way and what came last, and its loyalty with every reason. Those reasons are how heavy its tribute is, how it was taken, years under you, your army against its army, your army abroad, your gifts, its ruler's feelings otherwise, and rivals whispering.
  - Your ally: its calls to war, Join or Refuse, what it has sent you, and End the alliance.
- **Tribute you can watch arrive.** On the map of Greece, a caravan in the vassal's colours travels its road, or a ship sails its lane. It comes in at your road's edge, and its donkeys walk to the store with room: the tax office for coin, the storehouse or granary for goods. Oil and wine come in jars. A vassal reached only by sea sends a ship that anchors in your bay. The ledger has a tribute line and the stock book has the goods.
- **A rising, a season ahead.** Under 30 at a month's turn, a vassal arms. You get urgent news, a red shield on its label, a line under the top bar naming its day, and three answers on its page: lighten the tribute, send a gift, or march on it. If your army wins, the rising is crushed; if it loses, the city throws off your rule. If it rises, it is a rival again, with a grudge.
- **Men in your defence.** When a band comes for you, each vassal and ally with a road sends a company. Its men walk in from its road's edge in their own city's colours, under their city's banner, and stand by what the raiders make for. They go home when it's over or if they break, and they cost you nothing.
- **Allies' calls.** When an ally goes to war, it asks you to join within 60 days. Join sends a full force, and a win turns the war its way. Refusing is remembered, and two refusals in three years end the alliance. When you march to conquer, your allies with a road may march with you (6 in 10 if warm, 8 in 10 if devoted). That is how help runs both ways: rivals' bands raid only your city, so what you give an ally is your army in its wars.
- **A rival's vassal** can be conquered or cowed. Its lord stands by it, and remembers your taking it. There is no way to set it free without taking it: I kept it to the one way.

### What to try
1. Open #vassal. The camera follows Corinth's tribute: two donkeys with jars of wine, about ten days from your storehouse. Watch them walk in and unload (the town line says what they bring). Then open the stock book: "Tribute from Corinth, your vassal". Open the map of Greece, then Corinth's page and its Empire tab: its loyalty with the reasons, its tribute. Set it heavy and watch the loyalty's target fall.
2. Open #submit. Argos' Empire tab is open: read the odds of making it bow (about 2 in 10 with 48 men against its 21, and a proud king), and the conquest's (about 7 in 10). Send the herald if you like: the page names the day his answer comes back.
3. Open #conquer (it opens paused): your army has just beaten Argos at its gates, and the report is at the top of Argos' Empire tab. Read why Argos is still fairly loyal ("still cowed by its defeat") despite hating you. Set its tribute.
4. Open #rebellion: Corinth is arming against your heavy tribute and a small army. Corinth's bow to you by awe is set up for this demo, and its line in the News of Greece says so; the tribute set heavy and the rest come from the dice. Read the warning and its day, then choose: lighten the tribute, send a gift from the Ruler tab, or march on it.

Each link also opens paused if you add `-paused`.

### What I'd like your eye on
- **The odds of awe.** Cowing a city takes at least twice its side, and the odds start low: about 2 in 10 at a little over twice (Argos in `#submit`), and about 5 in 10 at three times. Is that too hard to be worth trying?
- **What conquest costs.** It's treated like any war without cause: Argos −90, and −12 to −18 with every other ruler. For Argos' 353 dr a year, plus what your men carry off (1,200 dr and 3,000 wheat in `#conquer`), is it worth it?
- **Loyalty.** Light tribute and a big army keep a vassal; heavy tribute and an army no bigger than its own lose it within a month or two (`#rebellion`). Is the balance right, and are the reasons readable?
- **The donkeys' walk.** In from the edge to the store is weeks of game time on `#collect`'s long west road. That is why `#vassal` opens with them ten days from the store.
- **Rival vassals.** Argos is still the city that bows most often, to Sparta.

### Known rough edges
- **There is no `#ally` demo.** Allies are covered by the tests (aid in a raid, calls, refusals) but not by a link: no ruler in the prepared towns is warm enough at the right moment.
- **An allied company takes a company number** while it is in your city, so a company you raise then skips that number.
- **Heralds are not drawn on the map of Greece.** The page names the day his answer comes.
- **A vassal's tribute in goods only goes into your stores,** and nothing in the ledger shows what it is worth. The vassal's page keeps the running total.
- **A tribute ship** with no trading post in your bay is unloaded straight into the stores, and the page says so.

### Measurements
Measured headless with software WebGL at 1920 × 1080, on a machine shared with the other lines (load 14 to 18), so every time swings. Before is `f9b0d56` (the trunk with slices 30 and 31); after is this slice. The loads were measured side by side, alternating the two builds, three rounds each, and I give the medians. Only large changes count.

| What | Before | After |
|---|---|---|
| Tests | 469 in 40 files | 484 in 41 files, all passing (15 new, in `tests/vassals.test.ts`) |
| Download (gzipped) | 3,345 KB: the game 701 KB, the prepared towns 2,643 KB (82 files, the largest 45 KB) | 3,528 KB: the game 719 KB, the prepared towns 2,809 KB (86 files, the largest 45 KB) |
| First load (bare link), side by side | ready at 4.8 s, first frame at 6.2 s | ready at 4.7 s, first frame at 5.5 s |
| Demo loads, side by side (8 earlier demos) | median 5.1 s, slowest 6.1 s (`#report`) | median 5.2 s, slowest 6.8 s (`#town`) |
| The new demos (ready, three loads each) | | `#vassal` 4.2 s, `#submit` 4.5 s, `#conquer` 4.2 s, `#rebellion` 4.5 s (`#town` 4.8 s in the same run) |
| The map of Greece from `#town`, side by side | built in 417 ms; first frame at 16.8 s | built in 559 ms; first frame at 21.4 s |
| The same, five more rounds of the map alone | built in 794 ms; first frame at 20.1 s (16.2 to 24.1) | built in 399 ms; first frame at 23.3 s (16.4 to 26.2) |
| Map triangles in the new demos | | 313,690 to 316,066 (slice 31's were 313,000 to 322,000) |

The map's first frame is drawn by software WebGL here, and takes 16 to 26 s for both builds. This slice was slower in both side-by-side runs, but the ranges overlap, and the map's build was faster in one run and slower in the other, so I can't call it a real change. Nothing new is drawn on the map in `#town`. It's worth a look on a real graphics card.

The smoke test ran with every timeout five times longer, because frames came at under one a second on this machine. It passed with no failures, and the slice 34 section passed again after the final build.

### What the review changed
I went through each step above in the browser at 1920 × 1080 and looked at the screenshots. I also ran some checks outside the browser: allies' and vassals' men against four raids, the herald's dice over many throws, and Greece in the earlier demos. What I changed:
- **A tribute's news gave the wrong day.** "In your city about 14 December" was the day the caravan reaches the edge of your land. On `#collect`'s long west road the donkeys then walk for weeks, and Corinth's wine came in on 1 February. The news now says when it reaches the edge, and that its donkeys then walk it to your stores.
- **Your own vassal's or ally's page showed odds for sending soldiers against it.** On the Ruler and Loans tabs, two buttons showed odds but could not be clicked, and nothing said why. Now the tab just says why: "Corinth is your vassal: you march on it only if it arms against you". A vassal that is arming sends you to its Empire tab, where "March on it" is.
- **The odds of making a city submit now add up.** Before, the reasons gave only the traits, so "your 48 men against its 21; proud (−15)" came to 2 in 10 without saying where the rest came from. Now the first reason names the armies' share: "2.2 times its side (31 in 100)". Then proud takes off 15. I checked the herald's dice over 20,000 throws: they land as the odds say. In `#submit` this herald's dice would say yes, so Argos bows if you send him.
- **An ally that is made to bow to a rival** now ends its alliance with you, because a vassal makes no alliances of its own. Before, it stayed your ally while it served Sparta.
- **A city that breaks free of its lord can be taken again after two years, not four.** Greece already worked this way: the city's memory of breaking free lasts two years. The note said four. The rule now says two as well, so nothing in Greece's history changes.
- **Earlier demos, made exact.** `#fortress`'s loans are now named (Thebes and Knossos lent to you, and Athens owes you). Slice 31's steps for `#greecegrows` have moved with Greece: use Argos' line, not Athens', in step 2. In `#report`, Argos pays Sparta nothing now. A force sent west from `#collect` walks about five weeks to the edge of your land. And `#rebellion`'s step now says that Corinth's bow is set up for the demo.
- **The map of Greece from `#town` is not slower.** It draws exactly the same in both builds: the same triangles, draw calls, meshes, textures and labels. Its first frame was slower in one round and faster in the other, so the difference the measurements showed comes from this busy machine.
- **Checked again after these changes:** all 484 tests pass. The smoke test passes, run in three parts on this busy machine; one `#battle` step timed out once and passed when run again. The download is unchanged at 3,528 KB. In my measuring run, the map of Greece from `#town` drew its first frame 9.8 s after the key (16 to 26 s in the builder's runs: the machine's load swings it), and `#submit`, `#conquer` and `#rebellion` were ready in 3.3 to 3.9 s.

What I checked and left alone, for your eye: in `#vassal` the caravan reaches the store about ten days after the demo opens, as the steps say. Its jars show if you zoom right in. When raiders came in my checks, the allies' and vassals' men were in your city 5 to 16 days before the raiders, and went home afterwards (some broke and left early, as the page then says). Corinth's men come in by the north edge, though its tribute uses the west road: they walk across the fields from Corinth's side of the map.
## Slice 33 — The turning year (22 Oct)

The year now has four seasons. The land goes from green in spring to gold in summer, amber in autumn and a darker grey-green in winter, and the trees, the sea and the sky change with it. It rains, more in winter, with the odd storm. The wheat, the olives and grapes and the flocks follow the year. Winter storms make ships late and keep most rulers' armies at home. A dial under the date says which season it is and what comes next. The game's year is still a year long. You weren't here while it was built: every choice below is mine, from the spec's defaults.

What breaks, or moves:
- **Saves.** The state version is now 29. Older saves load with the seasons on, in whatever season their date falls in. From the next tick their farms, groves and flocks work at that season's pace.
- **A year's food is about the same; when it comes is not.** Each season's pace averages one over the year, so a fully worked farm still brings in the same in a year (within one harvest, checked in a test). More of it now comes in autumn and less in winter. `#town` played on a year ends with 1,059 people (was 1,040) and 12,176 measures in its stores (was 14,815).
- **Every demo's history is played with the seasons on.** So 102 of the 110 earlier demos open on a slightly different town:
  - The eight that open the same are the first few, from before there were farms: `#streets`, `#settlers`, `#water`, `#carrier`, `#fountain`, `#chain`, `#workers` and `#decline`.
  - **The opening day moved** in about half of them. Where the seasons moved the moment a demo opens on, I retuned its setup to open on the same kind of moment (details in the plan's As built). The biggest changes:
    - `#town` (and the 11 demos that open on its town, such as `#ledger`, `#dairy` and `#greece`) opens 15 days later, once every home has its food and a tent stands on the newest plots. It opens with 738 people (was 693) and 631 dr (was 322). The demos built from `#town`'s history move with it.
    - `#rivals` (and `#rivalsmap`, `#rivalstreet`) waits until every route has had its first visit: 1,399 people (was 1,411), 2,207 dr (was 3,350), 5,652 measures of food (was 9,310).
    - `#athensship`, `#anchor` and `#pirates` wait until the treasury can pay for the wine as well.
    - `#pirates` waits until it can pay for the shipyard and a trireme.
    - `#villas` and `#winevendor` wait until every villa has its wine.
    - `#black` opens once the wages have gone unpaid, a few days after her sail shows.
    - `#overhunt` opens in September, four months later, once its deer are down to their last few head (they grow back twice as fast in spring). Cleared of its lodges, its deer are now whole again about three months later, not two, as they grow back at half pace in autumn and winter.
    - `#raid`, `#raiders`, `#aftermath` and `#looted` turn fire risk on as the band nears, not weeks before. With the seasons, a month of risk had an ordinary fire take their farms and granary.
  - **People** at opening: within about 5% everywhere but `#town` and the demos that open on its town (738, was 693), `#hunter` (803, was 704: it opens two months later), `#dry` (863, was 799) and `#rubble` (1,046, was 1,113).
  - **Money** at opening: the median is 10 dr lower. It is down most in the rich military and money towns, with the most in `#forgive` (8,271 dr, was 11,714), `#repaid` (8,592, was 11,612), `#lend` (3,737, was 6,324) and `#triremes` (2,161, was 3,856). It is up most in `#ship` (1,243, was 892) and `#quay` (1,151, was 682).
  - **Food in the stores** at opening: the median is 2% lower, but single demos swing more, from `#harvest` (1,289 measures, was 2,389: it opens in March, after a slow winter) to `#table` (2,332, was 933).
  - **No demo opens in famine.** No demo has more homes going without food than before, except `#repaid` and `#forgive`. They open in December with 11 and 4 homes short of meat (it was 2) and 4 short of cheese, because the hunters and the goats bring in less in winter. None of their homes go down in the 900 ticks after (before, six of them did). In `#fortress`, three homes go down for want of oil two or three months after it opens, as some did before.
  - **`#thieves` and `#nowatch` played on a year** now keep about 1,380 and 1,150 people (it was 772 and 290). Most likely that is the new watch post in the core (below): slice 30's note said fire took much of the core when played on.
- **The crime overlay** shows a home amber from a quarter tempted (it was half), where its panel starts naming it.

### What's new
- **The seasons.** Spring is March to May, summer June to August, autumn September to November and winter December to February. Each is three months of the game's year, 900 ticks.
- **The year's rhythm.** Each of these works at a pace through the year that averages one, so a year brings in what it did:

  | | Spring | Summer | Autumn | Winter |
  |---|---|---|---|---|
  | Wheat | 90% | 110% | 140% | 60% |
  | Olives and grapes | 80% | 100% | 160% | 60% |
  | The flocks (cheese and fleece) | 140% | 110% | 90% | 60% |
  | The wild herds growing back | twice as fast | as usual | half as fast | half as fast |

  The farm's, grove's, vineyard's, dairy's and pasture's panels count the harvest through the seasons ahead and say why: "Autumn: the wheat ripens 40% faster".
- **Winter at sea.** A ship due in winter (the Tyrian ship, or a sea route's ship) is held back 6 to 12 days by the storms. Her chip says "late", and its tip and her line say why: "late: winter storms in the gulf held her back 10 days". Enemy ships in the bay row at three quarters of their pace in winter.
- **Winter on land.** Two times in three, a hostile ruler whose band would march in winter keeps his men at home. A threat already counting down still comes. So do a refused tribute's anger, a lender's army and your own expeditions.
- **The weather.** Spells of about three days. It rains on about a quarter of spring's and autumn's days, hardly ever in summer and nearly half of winter's. There is the odd storm in autumn and winter. The weather only changes the look and the dial, not the farms or ships.
- **The look.**
  - The grass, fields and hillsides take the season's colour, and the leaves of trees and scrub follow more gently.
  - The sea is bluer in summer and greyer in winter, and the sky and haze greyer in winter.
  - In rain, streaks fall around the camera, the ground darkens a little, and the sky, sea and light go greyer. A storm is darker, with lightning.
  - Each season holds its look for most of its length and turns into the next over its last three weeks.
- **The season dial** sits under the date. It is a small four-coloured dial with its hand at today, the season's name and what's coming: "Summer · the harvest in 12 d", "Winter · storms · spring in 9 d". It adds "rain" or "storm" when it's wet. Its tip says the season in a sentence.
- **A winter town line** warns from the last month of autumn if the granaries and stalls won't carry the town to spring at winter's pace. It says how short they are, and that another farm or wheat bought in would help.
- **The camera no longer ends up inside trees.** It keeps above the crowns of the trees and rocks near it, rising quickly and settling slowly.
- **`#thieves` has a watch post in the core.** Its round covers the core's streets and stops short of the hut street, so the core is watched and the huts are not.
- **A thief caught with the tax office's coin hands it back to the treasury,** even if the office has burnt or been cleared since.

### What to try
1. Open #seasons. It is `#town`'s town nine days before spring, at the fastest speed, over the farms by the river, with the Husbandry tab open. Watch the dial and the land through a year: green, gold, amber, grey-green. Click a farm in summer and again in autumn to see its harvest speed up.
2. Open #winter. It is `#richtown`'s town in December, raining over the bay. The ship's chip says "80 d · late": hover it for why. Play on into spring and watch the sea and sky lift.
3. Open #town and play a year at the fastest speed. Watch the dial count down to each season, and look for the rain.
4. Open #thieves and look at the core's new watch post: the crime overlay is on as it opens, so pan down from the hut street to the core to see the post's reach on the roads. The hut street is still unwatched.
5. Add `-plain` to any link (for example #winter-plain) to see the seasons without the finished look. The land keeps its colour; the sea, sky and rain still change.

Each link also opens paused if you add `-paused` (for example `#seasons-paused`).

### What I'd like your eye on
- **The colours.** Is summer gold enough, autumn too orange, winter too grey or too dark? Each season is a handful of numbers, easy to change (screenshots: the same view in all four seasons, and the winter bay in rain).
- **The rain.** Thin pale streaks around the camera. Can you see it at the usual distance? Is it too much close up?
- **How hard winter bites.** The fields at 60% and the flocks at 60%. In the demos the granaries hold enough, so the winter line never shows. Should winter hurt more, so that you plan for it?
- **Ships late 6 to 12 days, and two in three winter threats held back.** Too gentle?
- **The dial.** Is it readable, and is "storms · spring in 9 d" the right thing to say?

### Known rough edges
- **The granaries don't show the harvest.** In `#seasons` the farms grow more than the town eats, so the granaries sit nearly full all year. The rhythm shows in the fields and the farm panels, not in the stores.
- **In `-plain`, the land doesn't change colour.** The finished look's shaders do that, and `-plain` turns them off. Only the sea, sky, light and rain follow the season there.
- **No snow, no day and night, and the festivals keep their own calendar.** The rivals' harvests and wars on the map of Greece don't follow the seasons yet either.
- **The weather doesn't touch the sim.** Rain doesn't slow walkers or put out fires, and a storm doesn't sink ships.
- **Lightning is a flash of the light only,** with no bolt and no sound.
- **`#aftermath`'s band burnt a farm and the dairy, not houses.** Its fires fall otherwise in the seasons' history. The ledger still shows the wheat and coin it took, and the king's spent anger (after the review: see below).
- **Money at opening fell by a quarter or more in the richest demos.** Over their long histories the treasury filled at another pace. Their stories hold, but the numbers in their old notes are out of date.

### Measurements
Headless Chromium with software WebGL. Before is `1af5f81` (the trunk with slice 30 merged); after is this slice. Other lines were building and measuring on the machine at the same time (its load stayed around 13 to 19 on 4 cores), and the container restarted once in the middle, so times swing by a third or more from run to run. I ran the loads and the frame work side by side, alternating the two builds, three rounds each, and give the medians. Only large changes count.

| What | Before | After |
|---|---|---|
| Tests | 457, all passing | 474, all passing (17 new in `tests/seasons.test.ts`: the calendar, the paces, a farm's, a grove's, a dairy's and the wild herds' year, ships late in winter, armies home, the weather, the switch, a year played twice the same, a slice 30 save, the winter line, `#thieves`' core watch, the treasury's coin) |
| Download (JS, CSS and HTML, gzipped) | 3,035 KB: the game 551 KB, the prepared towns 2,484 KB | 3,108 KB: the game 558 KB, the prepared towns 2,550 KB (two more files, for `#seasons` and `#winter`) |
| First load (bare link, side by side) | ready at 4.2 s, first frame at 5.6 s | ready at 4.3 s, first frame at 5.5 s |
| Demo loads (ready, side by side) | `#town` 5.0 s, `#richtown` 4.9 s, `#thieves` 4.2 s, `#raid` 4.9 s, `#fortress` 3.9 s, `#pirates` 4.2 s | `#town` 4.9 s, `#richtown` 5.4 s, `#thieves` 5.1 s, `#raid` 4.3 s, `#fortress` 5.9 s, `#pirates` 4.8 s; `#seasons` 4.3 s and `#winter` 5.8 s (measured once) |
| `#town` | 1,453,964 triangles and 89 draw calls over the town, a save 150 KB | 1,450,538 triangles and 87 draw calls, a save 150 KB |
| `#richtown` | 1,623,607 triangles and 101 draw calls, a save 187 KB | 1,645,321 and 103, a save 180 KB |
| `#seasons` / `#winter` | | 1,400,584 triangles and 83 draw calls / 1,621,703 and 102, from their views. The rain adds one draw call of 2,600 lines when it rains. |
| Frame work (update before drawing, running, side by side) | `#town` 34 ms, `#richtown` 46 ms, `#thieves` 32 ms, `#blaze` 19 ms, `#prices` 29 ms | `#town` 24 ms (one of three runs; the other two drew too few frames to count), `#richtown` 33 ms, `#thieves` 44 ms, `#blaze` 18 ms, `#prices` 22 ms; `#seasons` (at the fastest speed) 28 and 119 ms, `#winter` 15 and 25 ms |

On this machine the frame work numbers are mostly noise: single runs ranged from 0 to 176 ms for the same demo. Neither build is clearly slower. The draws and triangles are the same, plus the rain's one draw.

### What the review changed
I went through the slice as you would, at 1920 × 1080, and read the code. Five things changed:
- **The farm panel's words were wrong in autumn.** It said "the wheat ripens a little faster (140%)", and this note promised "half again as fast", which would be 150%. It now says "Autumn: the wheat ripens 40% faster", and the dial's tooltip says the same. The other seasons read "10% faster", "a little slower (90% of its pace)" and "slower (60% of its pace)".
- **`#aftermath` has its wheat line back.** The ledger keeps only this month and last, and the band took the wheat at the end of April and the coin in May, so by the time it opened the wheat was gone. Its demand now comes on the 3rd of a month and runs out rather than being refused at once, so Sparta's band comes about a week later than in `#raiders` and takes both in May. The ledger opens on "Raided by Sparta · drachmas −191", "Raided by Sparta · wheat 1,600" and what burnt: a dairy, and two farms this month, but nothing it plundered. The king's anger is still spent. It opens on 23 June. `#threat`, `#raid`, `#raiders` and `#looted` are as the builder left them.
- **A sea route's ship says "late" on its chip too,** as the Tyrian ship's does. Before, only her line and tip said so.
- **Two notes above were out of date.** `#overhunt`'s deer now take about three months to grow back once its lodges are cleared, not two (they grow back at half pace in autumn and winter). Step 4 now says the crime overlay is already on in `#thieves`.
- **A test of slice 30's save** compared its version with "the current one minus one". If another line's slice merges first, that is no longer slice 30's version, so it now names slice 30's version, as the other save tests do.

What I checked, and how it looked to me (you should judge the look yourself): the four seasons in `#seasons` side by side, winter in rain and in a storm, `#winter` with the bay grey and the ship's chip at "80 d · late", `#winter-plain`, and `#thieves` in August. In summer the plain by the river goes a strong mustard gold, close up in `#thieves` too. Winter is darker and greyer but the fields and homes still read clearly. The rain streaks show over the bay and the town.

Still 474 tests, all passing. The build is clean. The smoke's end (`#overhunt`, `#aftermath`, slices 30 and 33) passed against the new build.

### At the merge
This slice was built alongside slices 31 and 32, and joined them on the trunk on 22 Oct. What changed in the joining:
- **Saves.** The state version is 31 on the trunk, not 29. Saves from before slices 30 to 33 load through all four steps, with the seasons on and Greece's eleven cities.
- **Cold rulers wait out the winter too.** Since slice 31, a proud or warlike ruler who is only cold towards you can threaten as well as a hostile one. The winter rule now covers both: two times in three, a band that would march in winter stays home. Only 3 months in 12 are winter, so that should take about one threat in six away. I counted threats over 20 nine-year runs of `#rivals` and `#caravan` with the seasons on and off. It came out at 7 both ways, too few to see the difference. Raids still come about as often as you chose on the balance card.
- **Marble and timber keep the same pace all year.** Stone is cut in any season, and the loggers fell trees in winter as much as in summer. A felled tree takes two years to grow back, whatever the season.
- **`#fortress` opens a month later,** on 17 February 744 BC. With the seasons, its north wall went up only days before Sparta's band set out, so it opened with the north tower unmanned and the treasury spent. It now plays on until every tower is manned and the treasury holds two and a half months' wages. It opens with 1,368 people and 2,056 dr. Its loans are new again. You owe Knossos 2,180 dr by 1 August 744 BC and Thebes 2,280 dr by 1 May 743 BC (an offer taken while it waited). Athens owes you 1,110 dr by 1 September. Sparta's band is 26 men, 21 days from the west edge. Use these where slice 29's and 31's notes name other loans.
- **The demos from slices 31 and 32 still show what their notes say.** `#quarry` opens in May with the same stack, storehouse and sledges. `#loggers` opens in June with 27 trees felled and 352 logs stored (it was raining when I opened it). `#greecegrows`, `#knossos` and `#memphis` open in March 740 BC, with Naxos still Rhodian.

## Slice 32 — Marble and timber (21 Oct)

The city has its first building materials: a marble quarry on the pale rock of the headland, whose ox sledges drag the blocks to a storehouse, and a loggers' camp at the edge of two new pine woods, whose loggers fell trees that grow back over two years. Nothing in the city uses marble or timber yet (monuments come in slice 35): they are stored, sold and bought. You weren't here while it was built: every choice below is mine, from the spec's defaults.

What breaks, or moves:
- **Saves.** The state version is 28 on this line (it is renumbered when the three lines merge). Saves from version 27 load: no tree has been felled, every goods list gains marble and timber, Athens makes marble and Troy timber.
- **Two new woods** on the map: on the west slopes above the shore and in the north hills, 121 pines and cypresses in all. Every earlier tree, rock and bush keeps its place.
- **Earlier demos.** Compared at opening and 900 ticks on with the starting commit, all 108 prepared towns play exactly as before. In 33 of them (the towns built street by street on the west side of the river, such as #streets, #food, #fine and #villas) the new west wood stands beside the west streets and is cleared where the streets run. Nothing else in them moves.
- **Greece.** Athens sells marble (usually 300 dr a hundred blocks) and Troy sells timber (usually 150 dr a hundred logs). No other city buys or sells either. Requests, offers, gifts and raids keep to the old goods. Your trading ship buys both if you tick them; nothing is ticked.
- **The boulders on the headland's marble** are now drawn pale, at any time, so you can see the outcrops.
- **Every pine on the map is drawn more simply** (its crown in plain clumps, about 430 triangles where it was 1,100), so with the 121 new trees the coast and town views draw about as many triangles as before; there are 14 more draw calls where the woods are in view (see the measurements). Changed in the review.
- **M** now also cycles to the quarry and the camp, after the winery. Both are on the Industry tab.

### What's new
- **The marble quarry** (3×3, 250 dr, 8 workers). It can only go where the rock under it is rich enough in marble. With its tool in hand the marble shows as a pale glaze over the ground, the stronger the richer, and the tip says how rich it is and about how many blocks a month it would cut. It steps up the hillside in two benches with a riser of fresh-cut marble between them, its spoil heaped round its edge. It has shear-legs with a block slung on the rope, a windlass, a tool shed and a trough. Up to four quarrymen: three swing their picks at the face, and when a block comes free (a day or so) they lever it onto the stack, where the fourth works at the blocks. Ox sledges, slower than carts, drag the blocks along the road to the nearest storehouse, 60 at a time. Fully worked on the richest rock it cuts about 100 blocks a month, and holds 200.
- **The loggers' camp** (2×2, 150 dr, 4 workers). It needs at least 8 pines or cypresses within 12 tiles; its tip says how many stand in reach, how long they would last and how fast they grow back. It has a log cabin, a sawpit, a chopping block and an axe rack. Up to three loggers go out a few days apart, each to the nearest tree no other logger is after. One chops for two days; the tree shudders as the axe bites and goes over while he stands back; he trims it for a day and carries the logs home on his shoulder (16 logs a tree). Ox carts take the timber to a storehouse. About 90 logs a month while the wood lasts. The olive trees are Athena's, and the loggers leave them alone.
- **Felled trees grow back.** A felled tree leaves a stump; nothing shows for about three months, then a sapling grows in steps, slowly at first, to a full tree two years after it fell. A camp that fells faster than its wood grows strips the slope, and its panel says how long the wood in reach will last at that pace.
- **Marble and timber** are in the stock book, on the Goods tab (their own group, "For building"), in the storehouse (stacked blocks and log piles) and on the routes.
- **Leftovers from phase 4:** miners at the copper mine (two with picks at the face, one pushing the ore barrow, one at the windlass), and the caravan yard on a slope now stands on a battered stone footing with earth banked against it, its outer walls laid in courses.

### What to try
1. Open #quarry. It is #richtown's town with a road out along the bay, a quarry on the richest marble of the headland's crown and a storehouse where the road starts up the headland, played on 70 days. The quarry tool is in hand, so the marble glaze shows, and marble's page is open. Move the tool over the outcrop above the bay and read the tip. Watch the quarrymen at the face, hover one and a sledge for their cards, and watch the sledges go down the road to the storehouse. Hover the quarry, and the storehouse, for their cards.
2. Open #loggers. The same town with a road south to the west wood, a camp at its edge, a storehouse on the way and a watch post, played on four months: 27 trees felled, 14 still standing in reach, 352 logs stored. Hover a logger to see what he is doing, and watch one at his tree until it falls. Then play on a few months (fast) and watch the stumps: the first saplings come up about three months after a tree fell.
3. Open #bronze for the miners at the copper mine, and #caravan for the caravan yard's new footing.
4. On the map of Greece, open Athens' and Troy's pages for marble and timber on their routes.

Each link also opens paused if you add `-paused` (for example `#quarry-paused`).

### What I'd like your eye on
- **The quarry's look.** The ground is one mesh and can't be dug, so the quarry is built up as two benches stepped up the slope with spoil round its edge, not sunk as a pit. Does it read as a quarry cut into the hillside?
- **The sledges' pace.** In #quarry the storehouse is about 18 tiles of road away (no storehouse fits nearer on the headland's slope). The sledges are slow, so each carries 60 blocks: the three keep up with the quarry fully worked (about 90 to 100 blocks a month), and its stack rises and falls between about 50 and 180 as they come and go. With a storehouse farther off the stack fills, and the quarrymen then cut only as fast as the sledges take blocks away (the card says so). Is that the right pressure?
- **Felling.** The axe, the fall (a few moments at normal speed) and the trimming, in #loggers. And is two years to grow back the right pressure? The camp strips its 41 trees in reach in about a year and a half.
- **The woods.** Are the two new woods thick enough to read as woods, and the pale boulders as marble?

### Known rough edges
- **Nothing uses marble or timber yet.** Monuments (slice 35) and great houses (slice 36) will. Naxos and Thasos will sell them with slice 31's new sites, on the Greece line.
- **Seasons don't touch the woods** yet (slice 33).
- **Loggers walk across country** to their trees, off the roads, as hunters do.
- **Every pine is drawn a little more simply** (changed in the review, to pay for the new woods): up close their crowns are a little more faceted than before.
- **The quarry stays as it is** however long it is worked: the face doesn't move back.

### Measurements
Headless Chromium with software WebGL at 1920 × 1080. Before is `70087da` (the phase 5 spec, on top of phase 4's review); after is this slice. Two other lines were building on the same machine, so frame and load times swing by a third or more from run to run; only large changes count.

| What | Before | After |
|---|---|---|
| Tests | 444, all passing | 453, all passing (new: `tests/materials.test.ts`) |
| Download (gzipped) | 2,983 KB: the game 681 KB, the prepared towns 2,302 KB (79 files) | 3,077 KB: the game 696 KB, the prepared towns 2,381 KB (81 files) |
| First load (bare link), three runs each side by side | ready at 2.4 to 4.2 s, first frame 3.2 to 5.7 s | ready at 2.4 to 4.4 s, first frame 3.2 to 6.4 s (the same within the swing) |
| Demo loads, side by side (8 demos, 12 loads each) | ready between 2.1 and 4.2 s, 2.9 s on average | ready between 2.1 and 3.8 s, 2.9 s on average |
| `#town` | `town` view 1,453,964 triangles, 89 draw calls; `overview` 1,714,632 and 118; a save 149 KB | `town` 1,458,804 and 103; `overview` 1,663,032 and 132; a save 152 KB (as built, before the review's simpler pines: 1,720,604 and 1,981,272) |
| Map views | `coast` 1,241,324 triangles, 60 draw calls; `overview` 1,271,584 and 63 | `coast` 1,176,220 and 74; `overview` 1,200,360 and 77 (as built: 1,488,340 and 1,518,600) |
| `#quarry` / `#loggers` | | 1,117,299 triangles and 78 draw calls / 976,067 and 61, from their views (as built: 1,238,531 / 1,147,427) |
| Frame work (update before drawing, side by side) | `#town` 14.1 and 12.1 ms, `#richtown` 16.4 and 16.7, `#bronze` 11.0, `#caravan` 4.8, `#companies` 11.6 | `#town` 14.9 and 19.9 ms, `#richtown` 18.6 and 17.0, `#bronze` 6.0, `#caravan` 10.4, `#companies` 12.1; `#quarry` 9.7, `#loggers` 12.4 |

As built, the 121 new pines and cypresses added about 250,000 triangles wherever the woods are in view (about 1,100 triangles a pine, drawn twice with their shadows). The review drew every pine's crown more simply (about 430 triangles), so the coast and town views are now back at or below where they were before the slice. There are still 14 more draw calls where the woods are in view: every pine and cypress is drawn in its own batches so a felled one can fall and grow back. The frame times were read over 4 to 21 frames each, with the machine's load between 5 and 18 on 4 cores, so they swing widely. `#caravan`'s doubling did not hold up in the review: two more side-by-side runs gave 4.9 and 7.7 ms before against 8.8 and 7.6 ms after, over 5 to 8 frames each, so it is within the swing. `npm run measure` itself timed out opening a page after `#barracks` (as the before run did after `#caravan`); the figures above come from a copy in the scratch folder with its waits lengthened, and from side-by-side runs of the two builds.

The smoke test passes in parts: on this loaded machine `npm run smoke` timed out at its first wait for frames, so I ran a copy with longer waits. Its one real failure, `#prices` now showing ten price charts rather than eight, is fixed in the smoke test; `#request`'s caravan hover failed once and passes run on its own; the browser crashed once mid-run, and the rest was run on its own and passes.

### What the review changed
I played every step above in the browser at 1920 × 1080, took screenshots and looked at them, and read the slice's code. What I changed:
- **The storehouse's card now shows marble and timber.** It listed and counted only oil, fleece, wine, copper and armour, so the storehouse in #quarry, with 20 blocks in it, said "empty". It now says what it holds of all seven, and that sledges are bringing the blocks.
- **A sledge carries 60 blocks, not 40.** With 40, the three sledges in #quarry moved about 60 blocks a month against about 100 cut, and the stack filled by the third month. With 60 they keep up with the quarry fully worked, about 18 tiles of road from its storehouse. #quarry now opens with 24 blocks on the stack, 20 in the storehouse and 180 on the road (it was 84, 20 and 120).
- **Every pine is drawn more simply.** Its crown is made of plain clumps, about 430 triangles where it was 1,100. That pays for the new woods: the coast and town views now draw about as many triangles as before the slice, or fewer. I compared the woods side by side in screenshots: at the usual distance I couldn't tell the two apart, and up close the new crowns are a little more faceted. Please look at the pines and say if you see a difference you mind.
- **A felled wood grows back slowly at first.** Before, a year after a slope was stripped it was full of half-grown trees, while the camp's card said every tree was felled, so it looked like a wood the loggers were ignoring. Now the saplings stay small for the first year and grow faster in the second. It is still a full tree two years after it fell.
- **The Goods tab names the makers "Marble quarries" and "Loggers' camps"** (it said "Quarry" and "Loggers"), and the camp's card says "no pine or cypress standing" rather than "0 pines and cypresses".
- **What to try, step 1** now says to hover the quarry and the storehouse for their cards. Clicking a quarry doesn't open a panel.

What I checked and left alone:
- **#caravan's frame time** (4.8 to 10.4 ms in the builder's measurements) didn't hold up when I measured again. Two more runs of the old and new builds side by side gave 4.9 and 7.7 ms before and 8.8 and 7.6 ms after, so it is within the usual swing on this shared machine.
- **Earlier towns:** in all 110 prepared towns, no house, road or other building stands on a tree.
- **Buying marble by road** from Athens works: the caravan unloads it at the yard, it is paid for, and the porters carry it to a storehouse.
- **The quarry's look.** From above it reads to me as a stepped, pale working floor. From downhill, though, its skirt of spoil is a tall, pale battered wall down the slope, close to the blank wall the caravan yard used to have. I left that for your eye (see above).
- **The smoke test** passed all the way through in one run, with every wait lengthened because the machine is loaded. The measurements ran through too; the demos were ready at a median of 3.8 s on a machine loaded about three times over.

### At the merge
This slice was built alongside slices 30 and 31, and joined them on the trunk on 22 Oct. What changed in the joining:
- **Greece's new cities trade marble and timber too.** All eleven cities make and use some of each. Knossos has Crete's cypresses and sells timber, as Troy does. Memphis has no forests along its river, so it buys timber: it is the first place that will pay well for your logs (191 a hundred in `#greecegrows`, against 150 elsewhere). Athens is still the only city with marble of its own to spare.
- **Naxos makes marble and Thasos timber.** A city that founds a colony on either island makes more of that good and starts selling it. In `#greecegrows`, Rhodes holds Naxos and now sells marble (242 a hundred, against Athens' 233). A colony that was already standing in a save from before this merge counts too.
- **Old saves** from before slices 30, 31 and 32 load through all three steps and come out with eleven cities, each with marble and timber at their usual prices.

## Slice 31 — Greece grows (21 Oct)

Greece is no longer six cities that never change. It now has eleven: Thebes, Argos, Knossos, Rhodes and Memphis have joined, with rulers, goods, roads and sea lanes. Six empty islands and capes wait for settlers. Each city with a ruler rises and falls over the years, and its page says why: its harvests, your trade, its wars, its debts, its tribute. Strong rivals found colonies and make weaker neighbours bow. Raids come more often, as you chose on the balance card, and they are still always a threat with a deadline first. You weren't here while it was built: every choice below is mine, from the spec's defaults.

What breaks, or moves:
- **Saves.** The state version is 28 on this line (renumbered when it merges). A phase 4 save loads, and Greece grows to eleven cities in it, each at its usual size.
- **Every town that trades meets a Greece that changes.** A city's prices and yearly limits follow its people. What it can lend follows its treasury, and a band or a garrison follows its army. Tribute demands compare its people with yours. Wars between rivals go to the stronger army more often. A town that has never opened a route plays exactly as before.
- **Raids come more often.** A proud or warlike ruler who is only cold towards you (−30 or worse) can now threaten too, about one month in 120, more often if its army has grown. Before, only a hostile one could (−60). The threat's line says why ("Queen Ida is cold to your city, and proud, with an army grown to 42 men").
- **A refused band no longer camps for months** (`#threat`). In your first year, a band you defy waits at home out of sight ("bide their time at home") and only gathers for its last ten days.
- **A caravan whose road closes** while it is in your streets pays for what it loaded and leaves. On its way in, it turns back without trading. Its line under the top bar now says how many days it has left to walk.
- **One yearly limit per city.** A road and a sea route to the same city now share its limit.
- **Price arrows** are green when the move is good for you and red when it is bad. A price rising on a good you sell them is green, and so is one falling on a good you buy. The arrow still points the way the price went.
- **The map of Greece** opens further back and further south, so Memphis, Cyrene and Thasos are on the table at first look. Labels that would overlap lift clear of each other on longer stems. A label that would sit under the top bar, the lines under it, or the News of Greece hangs below its city instead (Troy's at 1600 × 900).
- **Your army on the map** has a tag over it in your colours ("Your army · 32 men"). Where it would cover a city's label, it hangs below the army, or stands beside it.
- **Earlier demos.** I compared every demo's prepared town at opening with the baseline (people, money and date). 99 of the 108 are the same. In all of them except those that never trade, Greece itself has moved: it has eleven cities, sizes and, by the later demos, colonies and vassals (in `#report`, Argos already pays Sparta tribute, and Corinth is sending settlers to Kythnos). These nine moved in the town too:
  - `#prices`, `#offer`, `#rivals`, `#rivalsmap`, `#rivalstreet`, `#lend` and `#forgive`: the same day and people, 12 to 81 dr more in the treasury (prices in grown cities).
  - `#repaid`: with the new Greece, Athens' dice said no on the loan's day. So the repayment is now set up for the demo, and named so, like `#forgive`'s default. It opens on the same day as before, the herald with the whole sum four days from your land.
  - `#fortress` changed the most. A cold ruler's threat came while the town waited for Greece to be calm, so it opens about nine months later than before: March 744 BC (was June 745 BC). It has 1,344 people and 2,836 dr (was 1,325 people and 1,664 dr). The walls were paid for with the loans Knossos (1,500 dr at 5%) and Rhodes (2,000 dr at 15%) offered, instead of a loan asked of Corinth. Sparta's band is 26 men (was 33): a band now follows its city's army, and Sparta's has changed by then. 800 dr still turns it back. The "What to try" steps from slice 29 still work, but its loans are now other cities': you owe Knossos 1,575 dr by 1 June 744 BC and Rhodes 2,300 dr by 1 September, and Athens owes you 1,110 dr by 1 July. So read Knossos', Rhodes' and Athens' Loans tabs where that note says Corinth's and Athens'.

### What's new
- **Five new cities.**
  - **Thebes**: inland in Boeotia, a city of farmers and soldiers, reached by road through Corinth.
  - **Argos**: small and touchy, on its hill west of your plain. It holds that your city stands on its old ground, so it starts at −10 with you. It is the closest road you can open.
  - **Knossos**: the queen's palace city on Crete, with red columns, reached by sea.
  - **Rhodes**: a trading island with the biggest fleet for its size, and the keenest to found colonies.
  - **Memphis**: Egypt, with pyramids at the southern edge of the table. The richest and biggest city, and slow to change.

  Each newcomer can trade with you, send gifts, ask, offer, lend, borrow, threaten and be sent an army, just as the first four can. Their rulers and moods come from their own dice, so the first four rulers of every town are exactly as before.
- **Six empty sites**: Naxos (marble), Thasos (timber), Kythnos (copper), Melos (fleece), Kythera (oil) and Cyrene (wheat). A free site is a cairn with a pennant and a dashed label. Hover it for what it would make.
- **Cities grow and shrink.** Each city's label shows its people and an arrow when they have moved by a twentieth in the past year ("Sparta 6,500 ▲" in `#report`), and its model grows or shrinks in steps. A vassal's label carries its lord's colour. A city's page has a size line under its mood ("4,465 people · rich ▲ · 26 men · 16 ships ▲ · a colony (Naxos)"). Its Rivals tab opens with **How it stands**: people, treasury, army and fleet, each with what is usual for that city, its change since January a year ago and the reasons, biggest first. For example, Rhodes in `#greecegrows`: "−179 Poor harvests, +96 Room to grow on its land, +17 Its colony on Naxos".
- **Colonies.** From the third year, a well-off city at peace with ships may send settlers to the nearest free site. The news says so three months ahead ("Corinth is fitting out ships for settlers bound for Kythnos"), and again when they land. The site becomes a small town in the founder's colours, its label "Naxos · Rhodian". It grows by itself, adds to its founder's people and treasury, and adds its good to what the founder sells you. Marble and timber become goods only when the works line merges.
- **Vassals.** From the fourth year, a city whose army is two and a half times a neighbour's, and which is on bad terms with it, may make it bow ("Athens has bowed to Sparta: its army of 31 men against Sparta’s 84 men"). A vassal pays its lord a tenth of what it takes in and fights no wars of its own. It breaks free when its lord loses a war, or when its army grows to two thirds of its lord's.
- **`#greecegrows`**: `#rivals`' town played on to its tenth year by a middling player, who meets every other request and tribute, takes every other offer to buy its goods, and pays threats when it can. It opens paused on the map on 1 March 740 BC, with 1,301 people and 37,249 dr. Everything in it came from the dice: Rhodes has held Naxos since 747 BC (about 460 people), Corinth holds Kythnos and Knossos holds Melos, and Argos and Athens (the month the demo opens) have bowed to Sparta, whose army has grown to 84 men (usually about 60). Memphis has grown to 10,400 people. The demo would set up a Rhodian colony and a vassal, and name them so, only if the dice had brought none.

### What to try
1. Open #greecegrows. Look over the labels: each city's people, and which carry a lord's colour. An arrow (▲ or ▼) marks a city moving by a twentieth since January last year; as this town opens, none is moving that fast, so the arrows are in `#report` (Sparta and Troy ▲). Who rose and fell over the decade is on each city's page: How it stands puts its people, army and fleet beside what is usual for it (Memphis 10,413, usually about 9,000; Athens 6,404, usually about 7,000). Hover Naxos, then click it to open Rhodes' page, and read its Rivals tab (How it stands).
2. On the same map, click a line in the News of Greece (Athens bowing to Sparta) and read Athens' page: its size line, its lord, and why it shrank.
3. Open #knossos and #memphis: the same town, on the two farthest newcomers' pages.
4. Open #threat and refuse the threat: Sparta's raiders "bide their time at home", then gather for ten days.
5. Open #report and find your army on the map by its tag, just east of Corinth: above or below it, the tag would cover Corinth's label or Nea Argos'.

Each link also opens paused if you add `-paused`.

### What I'd like your eye on
- **How often raids come.** I counted threats not set up for a demo over nine years of `#rivals`' and `#caravan`'s towns, with a middling player, on the demos' own dice and five reseeded ones (12 runs). They went from 2 to 14, or 0.17 to 1.2 per town in nine years. In these runs the old Greece threatened less than in your game (one in nine years), so this is well over twice my baseline but only a little over what you saw. One number sets it (a cold ruler threatens about one month in 120). Should raids be rarer, or more frequent?
- **The map at first look** (`#greecegrows` at 1920 × 1080). Can you read eleven cities and six sites, or is the Saronic Gulf too crowded? Labels round Corinth, Athens and Thebes stand on longer stems.
- **How it stands.** Are two years and the five biggest reasons per line the right amount?
- **The army's tag.** Is "Your army · 30 men" in your colours clear enough, or too loud?

### Known rough edges
- **At 1280 × 720 with five lines under the top bar,** Thebes' label stands partly under "+3 more". There is no room to hang it below its city without running into its neighbours.
- **Thasos' island sits under the lines under the top bar at first look,** so its label hangs below them, a little away from the island.
- **Rhodes and Memphis have no fields on the map** (no dry ground beside them on a small island and at the table's edge). Their harvests show on their pages.
- **A band biding its time at home is not on the map** until it gathers for its last ten days; the line under the top bar and the chip count the days meanwhile.
- **Memphis stands on the table's southern edge,** its model half on the frame, as Tyre's does at its corner.
- **No pirates wait on the new sea lanes** (to Knossos, Rhodes and Memphis). The pirates' lanes are the works line's (slice 38).
- **A free site's click does nothing yet.** Founding a colony there is slice 37's.
- **Colonies on Naxos or Thasos add nothing to what their founder sells** until marble and timber merge from the works line.
- **`#borrow`'s caravan still takes about two months to walk its long path.** It now says how many days it has left.
- **`#fortress`' slice 29 note** quotes the old numbers and Corinth's loan (see above for the new ones).
- **Only the opening was compared** for earlier demos, not 900 ticks on as in earlier slices: the baseline's prepared towns would have had to be played again on a busy machine.

### Measurements
Measured headless on a machine shared with the other two lines (load 12 to 18), so times swing; the load times were measured side by side with the baseline, alternating builds.

| What | Before | After |
|---|---|---|
| Tests | 444 | 456 |
| Download (gzipped) | 2,983 KB (game 681 KB) | 3,256 KB (game 693 KB; the prepared towns grow by 11%, as every save carries eleven cities) |
| Demo loads, side by side (8 demos) | median 4.0 s, slowest 4.3 s | median 4.2 s, slowest 5.1 s |
| The map of Greece from `#town`, side by side | built in 578 ms | built in 396 ms |
| Map triangles | 304,000 to 314,000 | 313,000 to 322,000 |
| Map draw calls | 24 to 43 | 49 to 68 |
| `#town`'s coast, `#rivals` | 1,241,324 and 1,728,272 triangles | the same |

The demos load in about 4 s here, before and after alike: the 3-second budget can't be judged on this machine.

The smoke test ran with every timeout five times longer, because frames came at under one a second on this machine (the baseline build was the same). It passed with no failures.

### What the review changed
- **Armies are shown as they really are in the game.** Before, a city's army was shown a hundred times over: Sparta had "8,400 men" with only 7,000 people, and your 32 men beat Corinth's "3,000". Now it is the number the game fights with, on the same scale as its garrison, its bands and your own soldiers: Sparta 84 men, Athens 31, Memphis 97. The card over an army at war shows that city's own army or fleet. I'd like your eye on whether these smaller numbers read well beside cities of several thousand people.
- **How it stands now says what is usual for each city.** Beside its people, army and fleet: "10,413 (usually about 9,000)". So a town ten years on shows who rose and fell over the decade, not only what moved them since January. In `#greecegrows` no city is moving fast enough for an arrow as it opens, so step 1 above now says so.
- **The page of a city whose band is biding its time** now says "bide their time at home", as the line under the top bar does. It used to say "are gathering".
- **Your army's tag** stands beside the army when it would otherwise cover a city's label. In `#report` it was covering Nea Argos'.
- **The stock book names the new cities properly.** The price of peace sent to Argos read "Sent to argos".
- **Corrected above:** `#fortress`' loans are now Knossos', Rhodes' and Athens'. The army numbers in the examples are the new ones.
- **Checked and left alone:** how often raids come. I counted the threats again over 12 nine-year runs: 14, against 2 before, as the builder found. Ten of them come from the new rule for cold rulers, and the newcomers bring some of their own. One threat per town every seven or eight years seemed fair next to what you saw in phase 4, so it stays. It's still the first question above.
- Still as listed under the rough edges: at 1280 × 720 with five lines under the top bar, Thebes' label sits partly under "+3 more".
- Tests: 456, all passing. The smoke test passed with longer timeouts, apart from one check that looked too soon: Troy's label at 1600 × 900 was caught on its way down below the lines. Checked by hand, it stands clear a few frames later, and the check now waits for it.

## Slice 30 — Thieves in the night (21 Oct)

Every home now has a temptation to steal, which its panel names. When it fills, one of the household slips out as a hooded figure, robs a richer home, a store or the tax office, and slips home again. A watchman on his round deters thieves, and catches the ones he sees. You weren't here while it was built: every choice below is mine, from the spec's defaults.

What breaks, or moves:
- **Saves.** The state version is now 28. Older saves load with no home tempted and nobody out stealing, and crime switched on. Taxes coming in day by day and harsher harsh taxes (below) come on with it.
- **Taxes reach the treasury day by day.** A collector hands in his satchel once a day while he is out, each collector at his own hour, not at the end of his round. In `#town` over a year, taxes come in on about 225 days instead of 30, in about 280 small sums instead of 28 big ones. The biggest sum to land at once is 172 dr (a whole round's was up to 212), because a collector still calls on many homes in his first day out.
- **Harsh taxes bite harder.** At harsh, a fed-up or unhappy household a collector has called on now leaves whole two times in three (was one in two), a worried one one in three (was one in four), and one getting by one in six (was one in twelve). More households send someone away, and harsh taxes add a lot to the temptation to steal. `#town` played a year at harsh ends with 286 people in 53 homes (was 436 in 68) and 2,735 dr (was 4,160), with 56 thefts and 4 thieves caught.
- **A new town's first year** builds fire risk at 70% of the old pace. The fire line now warns from half way to a smoulder (it waited for three quarters), and gives the days to the first one.
- **J** now cycles tax, fire, wear and crime.
- **While paused**, a line about something the town is short of now shows, or goes, at once. Before, it waited for three days that never came.
- **Earlier demos.** All 108 earlier demos open exactly as before. Crime is off while a demo's history is played, and switched on as it opens. Played on 900 ticks from opening, they differ:
  - People are the same in 107. The exception is `#harsh`: 577 people, was 628, because harsh bites harder.
  - Money is never lower. The median is 219 dr higher, because taxes reach the treasury sooner.
  - With crime switched off again, all 108 play exactly as before.

### What's new
- **Temptation.** Once a day each home's temptation moves by a score of named reasons:
  - hunger (+2), and other needs it is warning about;
  - its mood (fed up +3, unhappy +2, worried +1, content −1);
  - heavy (+1) or harsh (+3) taxes;
  - richer homes nearby (villas next to huts +2);
  - no work, and wages owed.
  
  A watchman walking past within the month takes 3 off. With no watchman, "no watchman this month" adds 1. A score of 3 or more fills the temptation, at about a month for a hungry hut beside villas. Anything less lets it drain.
- **The household panel** names it from a quarter full: "Tempted to steal: hungry, villas nearby, no work, no watchman this month · 81% · a thief in about 6 days", with what is holding them back.
- **Thieves.** When a home's temptation is full, one of the household slips out: a young man first (a son or a brother), else an older man, else a woman. He walks up to 40 steps by road to whatever is most worth the walk, then slips home:
  - a richer home not robbed in the last two months (24 dr from a villa, 2 from a tent; a home within sight of his own counts double);
  - a granary (a sack of food) or a storehouse (a few jars or bales);
  - the tax office (20 dr, or a twentieth of the treasury if that is less).
  
  At most three thieves are out at once. A store or the tax office that has been robbed isn't robbed again for a month.
  - At home, the household's story says so ("Philon came home before dawn with a purse of 24 dr that wasn't his"). Stolen food or goods feed them for twenty days.
  - The robbed home's story and mood say so too ("Robbed 12 days ago: a thief took 24 dr").
  - The tax office's loss is a ledger line, "Stolen · from the tax office", under "Lost to thieves". A store's loss is in the stock book as "Stolen by thieves". A town line carries the news for a few days.
- **The watch.** A watchman on his round who sees a thief within 6 tiles runs after him. Fires still come first. If he catches him:
  - the loot goes back;
  - the family pays a fine, 5 dr for a tent and up to 20 for a villa ("Fines · thieves caught" on the ledger);
  - their story says so, and they are shamed for a season;
  - the town line reads, for example, "A thief caught below the cypress hill: Telekles, the head of the house, on his way home from the villa of Hieron. His family paid a 6 dr fine."
- **Warnings before it happens.** A town line says when homes more than half way to sending someone out have no watchman walking by. It gives how many, why, and how soon: "Crime below the cypress hill: 5 homes are tempted to steal (no watchman this month, no work and villas nearby), the first thief in about 6 days."
- **The crime overlay** (J four times, or the Crime row on the Hygiene and safety tab):
  - homes tinted green, amber or red by their temptation;
  - a column over each one more than half way, red where a thief is out;
  - the watchmen's reach and the roads they walked.
  
  The tab's row says how many thieves are out, or how many homes are tempted.
- **A thief** is a stooped figure in a dark hooded cloak, with a purse at his belt or a sack on his back on the way home. His tip names him and where he is going. A watchman after him runs.
- **"No road" signs.** A plot no road from the edge reaches now has a sign over it: a road with a red bar across it.

### What to try
1. Open #thieves. Five huts on the new street behind the villas are tempted, and the first thief is about six days off. Click a red one to read why. Play. When the line under the top bar says a thief is out, click it: the view closes in on him and follows him to a villa and back. Then build a watch post touching the north side of the street's road (Z twice; the tool warns you if no road is beside it) and watch the next thief caught. In my runs, a post on the north side of the street's road, about a third of the way along, caught the next one between 2 and 12 days after it went in.
2. Open #nowatch. It is four months on with still no watch post. The open panel is the house of Aischron, a hut whose son Philon has stolen twice. Its story is at the bottom, and the Crime row on the Hygiene and safety tab says three thieves are out. Then try a watch post here too.
3. Open #harsh and play a few months: more households leave, and the crime overlay (J four times) shows the temptation building.
4. In any town, mark out a plot away from the roads to see the "no road" sign.

Each link also opens paused if you add `-paused` (for example `#thieves-paused`).

### What I'd like your eye on
- **Can you see a thief?** He is small and dark at the usual distance (screenshots: close up, and on the street with a watchman after him). Is the hood enough, or should he stand out more?
- **How often thieves strike.** In `#nowatch`, the street's eight huts robbed villas nine times in four months with no watchman. With one post, the first thief after it went in was caught 12 days later. Too much, too little?
- **Temptation is invisible until the panel or the overlay.** A tempted home looks like any other until a thief steps out. Should it show on the house itself?
- **Fines and loot.** A villa loses 24 dr and a hut's family pays a 6 dr fine. The tax office gives up at most 20 dr a theft, and at most one theft a month.

### Known rough edges
- **A caught thief just vanishes.** His family pays and the loot goes back, but nobody walks him home.
- **Three thieves at most at once.** So in `#nowatch` the two huts at the street's west end sat full for four months without their turn, while their neighbours went out twice. Their panel says they are waiting on the three out now.
- **A watchman sees a thief through houses,** within 6 tiles as the crow flies, as long as a short road reaches him.
- **`#thieves` has no watchman over the villas either,** so fire builds there too. Played on past about nine months, fire takes much of the core (30 heaps of rubble a year on, with or without crime), as it would in any town with no watch post. A post or two in the core stops it.
- **`#nowatch`'s thieves only robbed villas,** so its ledger has no "Stolen" line. Thieves go for the stores and the tax office when nothing richer is in reach (in `#closed`, played on, they robbed its tax office of 100 dr in six months).
- **No night, and no sound.** Thieves go out whenever their temptation fills, and nothing whistles when one is caught.
- **Thieves don't take from the quay, the caravan yard or the armoury,** and there are no riots, courts or prison (the spec leaves those for later).

### Measurements
Headless Chromium with software WebGL at 1920 × 1080. Before is `70087da` (the phase 5 spec, on the trunk after phase 4's review); after is this slice. Three lines were building on the machine at once (its load stayed around 12 to 17), so loads ran about two and a half times slower than in slice 29's note. I measured the loads side by side, alternating the two builds, five rounds for the bare link and `#town` and three for the rest, and give the medians. Only large changes count.

| What | Before | After |
|---|---|---|
| Tests | 444, all passing | 457, all passing (13 new: temptation, thieves, the tax office's and a granary's thefts, the chase and the catch, the same town twice and through a save, first-year fire, daily taxes, harsh, a slice 29 save) |
| Download (gzipped) | 2,983 KB: the game 681 KB, the prepared towns 2,302 KB (79 files) | 3,066 KB: the game 689 KB, the prepared towns 2,377 KB (81 files; `#thieves` and `#nowatch` about 35 KB each) |
| First load (bare link) | ready at 4.8 s, first frame at 6.0 s | ready at 4.9 s, first frame at 5.9 s |
| Demo loads (ready) | `#town` 4.8 s, `#richtown` 4.5 s, `#fortress` 5.0 s | `#town` 4.6 s, `#richtown` 4.5 s, `#fortress` 5.0 s; `#thieves` 4.6 s, `#nowatch` 5.6 s |
| `#town` / `#richtown` | 693 people, 322 dr, a save 149 KB; 1,453,964 triangles and 89 draw calls over the town / a save 187 KB | the same |
| `#thieves` | | 1,378,012 triangles and 78 draw calls from its view (1,629,690 and 100 over the town) |
| Frame work (update before drawing, running) | `#town` 27.2 ms, `#blaze` 23.2 ms | `#town` 13.3 ms, `#blaze` 30.4 ms; `#thieves` 13.9 ms, `#nowatch` (paused) 3.2 ms |

The frame times swing by more than these differences from run to run. `npm run measure` hit the two-hour limit for a background job both times: the baseline's run stopped part way through the frame-work section, and this slice's before its last section (every demo's load). So the loads above are from the side-by-side runs instead.

### What the review changed
I played every step above in the browser at 1920 × 1080 and looked at the screenshots, read the code, and played old saves and several towns on in the sim. What I changed:
- **Following a thief.** Clicking the line "A thief out ..." now closes the view in on him and follows him, as clicking a caravan's line does. At the usual distance he is a small dark figure, often behind a hut, and hard to find without it.
- **Taxes are smoother.** Each collector now hands in his day's takings at his own hour, so a town's three collectors no longer land their coins in the same moment. In `#town` the biggest jump in the treasury is 172 dr, not 332.
- **A caught thief's purse** now goes back to the treasury only when it was the treasury's. Before, a purse taken from a home that had since burnt down went to the treasury too, money it never had.
- **Words.** A woman who steals comes home with a purse "that wasn't hers", and a home whose loot was brought back says "the watchman caught Philon and brought it all back".
- Small things behind the scenes: older saves fill in everything this slice adds, a test that would have broken when the save version is renumbered at merge, and a test given more time on a busy machine.

What I checked and left as it is:
- **Old saves.** The phase 4 fortress save played a year with crime on: 15 thefts, 40 dr taken from the treasury, the same people (1,090) as with crime off, and more money at the end (taxes come in sooner).
- **Harsh taxes.** `#harsh` played a year: 247 people with crime on, 425 with it off, and 38 thefts. That is the harder bite the spec asked for, and it is large. Tell me if harsh should hurt less.
- **`#nowatch`** still opens as described: the house of Aischron, whose son Philon has stolen twice, nine villas robbed, three thieves out.
- The "no road" sign shows over a plot marked out away from the roads, and the panel, the overlay, the lines, the ledger's fine and the Safety tab's row all say what the sim is doing.
- **Loads,** side by side with the phase's starting point after the fixes (three rounds each, medians, with the machine quiet this time): the bare link ready at 4.5 s both before and after; `#town` 4.1 s before and 4.4 s after, `#richtown` 4.7 and 4.3, `#fortress` 4.5 and 4.3; `#thieves` 4.5 s and `#nowatch` 4.8 s. Single loads swing by a second, so these are the same.

## Slice 29 — A city worth defending (21 Oct)

The phase ends with `#fortress`, a walled town with three companies, two triremes, a loan each way and Sparta's band on its way, and with the numbers tuned over four and a half years of play: your soldiers now reach a threat in time, rulers offer loans when your treasury is low, and an unpaid debt now costs you goods from your own stores. You weren't here while it was built: every choice below is mine, from the spec's defaults.

What breaks, or moves:
- **Saves.** Nothing saved changed shape: the state version stays 27, and old saves load as they are.
- **Companies march half again as fast**: 3 tiles a day, from 2. Raiders keep their pace, so your soldiers outpace a band in your own streets. Expeditions leave and come home faster on your map; their days on the map of Greece are unchanged.
- **Loans have their own turn.** A ruler's loan offer or ask no longer waits for a month when no ruler has made any deal for two months; loans are spaced by their own gap instead (four months between any two across Greece). Offers come about one month in six (one in nine in slice 28), four times as often when your treasury is low or wages are owed. A ruler only cordial with you (0 or more) now offers when your treasury is low, saying so; one pleased with you (15 or more) offers anytime.
- **Seizures reach your stores.** In step 2 of an unpaid debt, on its first day and again a month on, the lender's agents take goods from your storehouses and granaries, up to a quarter of the sum each time. They take what you sell that city first, then whatever is worth most to them, each from the fullest store. Each seizure is a line of news naming the store, a ledger line ("Seized by Corinth · oil") and the stock book, and comes off the debt. The warning and step 2's news say so.
- **Lines under the top bar** show four at most, the most pressing: a raid, a fight, a fire, a debt, wages owed, a ruler's ask and what the town is short of come before ships and caravans. The rest fold under "+2 more", which opens them. They still stand in their usual order, so a raid's line is always first. News lines go as soon as they no longer stand, paused or not.
- **Earlier demos.** Compared at opening and 900 ticks on with the main line, 101 of the 107 with a history are the same. These six differ:
  - `#landing`: the companies march faster, so they are about 6 days' march from the beach (was 9). It also opens on a new view: out over the bay, looking along the shore, with Troy's ships in sight.
  - `#report`: the full force reached Corinth sooner, so it opens on 17 November (was 23), with the same report.
  - `#seized`: step 2 also took 500 dr's worth from the stores, so 1,470 dr is owed (was 1,970), 750 dr seized so far. The gift is still seized on the road.
  - `#creditors`: the stores paid 1,000 dr of the debt first, so Corinth's 35 men come for 1,220 dr (was 2,220) and leave with 1,600 wheat and 900 dr.
  - `#overdue`: the same at opening; played on into step 2, the stores are seized.
  - `#festival`: the same at opening; 900 ticks on, Athens asks to borrow.

### What's new
- **`#fortress`**, the phase's prepared town. It is `#companies`' town (built street by street from the bare map) carried on over about twenty months as its builder would, each step when the treasury could pay for it and a month's wages:
  - the caravan yard, and routes to Corinth and Sparta by road and Athens and Troy by sea;
  - the shipyard by the river mouth and two triremes, the Nike and the Glaukos;
  - a second barracks inside the west gate with a third company of hoplites (13 men: "Only 13 fine houses and villas can spare a man");
  - the walls: up the river's east bank from the hills with the west gate where the road crosses (two towers beside it), and across the valley north of the town with a gate on the north road and a tower.
  - Its loans: Corinth offered 2,000 dr in May 746 BC, "having heard your treasury is low"; it was taken and repaid on time. The walls were paid for with 3,000 dr asked of Corinth at 7% for 6 months, so 3,210 dr is due on 21 November. Athens owes you 1,000 dr at 11% for 12 months. No ruler asked to borrow in time, so that loan is set up for the demo, and named so.
  - Then Sparta's king turned on the city (set up for the demo, and named so). The town opens paused in June 745 BC with his 33 men gathering, about 21 days from the west edge, and 800 dr would turn them back. It has 1,325 people, 1,664 dr, 45 soldiers, 577 dr of wages and pay a month, and the camera over the west gate.
- **Defence in time.** Played the natural way, a company sent when a threat is refused is in place about 8 days before the band reaches the edge (it used to arrive after). One sent when Troy's sails show stands on the beach about a week early (it used to arrive the day they landed).
- **Debts with teeth.** See the stores above. In `#borrow`'s debt of 2,220 dr, step 2 now takes 1,000 dr's worth of goods from the storehouse by the olive grove and the granary below the cypress hill.
- **The map of Greece**: your army on the march is drawn half again as large, its banner above the cities' labels.
- **Rough edges:** a trireme rowing home to her mooring no longer shows the lanes' buttons. Ships that beach with no men left past their guards land nobody and sail home (one man used to land).

### What to try
1. Open #fortress. Read the lines under the top bar, then open "+2 more". Look round the walls, the gates and the towers, then the Military tab (once called the Army tab), the debts chip and the map of Greece (Tab: Corinth's and Athens' Loans tabs).
   - Take the banners of all three companies (click each row on the Military tab) and place them on the main street just inside the west gate. Clicking a row takes the banner in hand and leaves the view where it is, so you can stay at the gate and click each row in turn (the company's place on its row takes you to it). Then play. In my run, held there, they broke the band at the gate: 22 of its 33 men fell and it took nothing, though it set one building alight on the way in. One of ours was killed and one wounded. Left alone, the towers brought down 14 of its 33 men, but it hammered the gate for 36 days, broke in, and left with 748 wheat and 219 dr, having set three buildings alight.
   - Or pay the 800 dr on Sparta's page, and see what the treasury looks like with Corinth's 3,210 dr due in November.
   - Play on for a few years: Athens' repayment in May, Greece's own asks and offers, and whatever else Greece sends.
2. Open #landing and compare the new view with the old one. Place the companies on the beach and play: they are there sooner.
3. Open #seized. Corinth's agents have taken goods from your storehouse and granary as well as the gift on the road (the treasury is open on "Seized against your debts"). Then open #creditors: Corinth's men come for what the stores didn't pay.

Each link also opens paused if you add `-paused` (for example `#fortress-paused`).

### What I'd like your eye on
- **Does defending feel part of the city in #fortress?** The walls, the towers and the companies at the gate, in screenshots: the band on the bridge hammering the gate under two towers, and the hoplites drawn up inside.
- **Is the treasury too tight?** #fortress opens with 1,664 dr against 577 dr a month of wages and pay. 3,210 dr is due to Corinth in five months. In the year before the raid, the town took in about 300 dr a month more than it paid out. In the natural run (no walls, no third company), the treasury held 3,200 dr after a year, 4,200 after two and about 9,000 after four.
- **Seizures.** Two quarters of the sum from your stores, then the army for the rest. Does it bite enough, or too much?
- **The four-line limit** under the top bar, and "+2 more". In #fortress the merchant ship and the caravan fold away at opening.
- **Your army on the map of Greece** (#report): still small beside the cities' labels?

### Known rough edges
- **A band from the sea lands from the ship nearest its way in,** which may not be where your banners stand. In the natural run it walked past companies holding the beach. Planting the banners on it once it landed broke it.
- **Each tower takes 4 workers,** so #fortress's three towers employ 12.
- **Your companies hold where you put them.** Whether they should sally out of the gate or hold behind it is your call, from slice 25.
- **Repaying early still costs the whole interest** (your call, from slice 27).
- **At sea, expeditions meet nobody,** oars don't break, and the shipyard has no panel of its own (from slices 26 and 28).
- **Collectors from across the sea** take about 24 days from the "Sails!" to landing, the sea raiders' own pace.
- **A caravan already in the city** when a lender closes the road: not looked at in this slice.
- **The top bar on the map of Greece**, with a city's page open, wraps the month onto two lines at 1600 wide.

### Measurements
Headless Chromium with software WebGL at 1920 × 1080. Before is `4a8a473` (the main line, slice 26's review); after is this slice. The machine is shared, so frame and load times swing by a third from run to run; only large changes count.

| What | Before | After |
|---|---|---|
| Tests | 438, all passing | 444, all passing (new: the march, loans' turn, two for seizures from the stores, two for `#fortress`, a band with nobody to land) |
| Download (gzipped) | 2,937 KB: the game 677 KB, the prepared towns 2,260 KB (78 files) | 2,981 KB: the game 679 KB, the prepared towns 2,302 KB (79 files; `#fortress` the largest at 42 KB) |
| First load (bare link) | ready at 1.9 s, first frame at 2.6 s | ready at 1.9 s, first frame at 2.6 s |
| Demo loads | 109 demos, median ready 1.7 s, slowest `#trade` 2.1 s; none over 3 s | 110 demos, median ready 1.8 s, slowest `#overdue` 2.7 s; none over 3 s; `#fortress` 2.0 s |
| `#town` / `#richtown` | 693 people, 60 walkers, a save 149 KB / 928 people, 88 walkers, a save 187 KB | the same |
| `#fortress` | | 1,322,021 triangles and 82 draw calls from its view (1,659,677 and 114 over the town); in the fight at the gate 1,266,645 and 83 |
| Frame work (update before drawing) | `#battle` fought 12.1 ms, `#siege` hammering 11.0 ms, `#triremes` fighting 6.1 ms | `#battle` 15.2 ms, `#siege` 11.7 ms, `#triremes` 6.1 ms; `#fortress` fought 17.4 ms |

The frame times are within the run-to-run swing; `#fortress`'s fight (three companies, 33 raiders, three towers) is the heaviest yet, as `#battle`'s was.

### What the review changed
- **#fortress now opens paused,** as this note always said it did. Before, it opened running, so the band's three weeks were ticking away while you read the lines and looked round the walls (by the time I had looked, it was 16 days out, not 21).
- **The lines that stay in sight are the most pressing ones.** Before, the four that showed were simply the first four in their usual order, so the merchant ship and a caravan pushed #fortress's meat shortfall out of sight, and a fire could have been hidden the same way. Now a raid, a fight, a fire, a debt, wages owed, a ruler's ask and whatever the town is short of come before ships and caravans. The lines still stand in their usual order, and "+2 more" still opens the rest.
- **What I checked:** every step above at 1920 × 1080 in the browser, with screenshots. I placed the banners by clicking the Army tab's rows and then the street. With two companies inside the west gate, the band broke there: 22 of its 33 men fell and it took nothing; 3 of ours were killed and 6 wounded. #landing, #seized, #creditors and #report show what this note says they do.
- **What I found playing #fortress on for two years** (the sim on its own, answering Greece as a middling player would, with no other choices made). This is for your "too tight?" question; I changed nothing here:
  - With the companies held at the gate and the band beaten, the treasury holds 2,500 dr a month before Corinth's day. That is about 120 dr short of the 3,210 dr. The reminder says so a month ahead ("the treasury can spend 3,089 dr now"), and Corinth would likely grant more time.
  - Left alone, the loan goes overdue on the day, and Greece hears of it. It is paid four days later, which leaves 3 dr in the treasury. Wages then go unpaid for most of three months, and about 230 people leave over the year. After two years the town has about 1,100 people and 1,450 dr, and is slowly mending.
  - If you pay Sparta's 800 dr instead, the loan stays unpaid for two months. Corinth's agents take 750 dr's worth of oil, wine and wheat from the stores, and then the treasury pays off the rest, leaving almost nothing. The town is down to about 940 people after two years.
  - With nobody at the gate, the band gets in. Then the same squeeze leaves the treasury empty for over a year and the town falls to about 500 people.
  - Each month, wages and pay come to about 575 dr. Taxes swing between about 150 and 730 dr, as the collectors' rounds fall, and sales add about 150. That leaves roughly 125 dr a month to save.
  - So a player who uses the reminder (asking for time, or holding back) gets through. A player who lets the treasury pay on the day comes out of it with nothing left for wages.
- **Measured again after these fixes:** all 444 tests pass, and the smoke test passes. The download is unchanged at 2,981 KB. The bare link is ready at 1.9 s, with the first frame at 2.7 s. The 110 demos have a median of 1.8 s, the slowest is `#lend` at 2.6 s, none is over 3 s, and `#fortress` takes 1.9 s. In `#fortress`'s fight at the gate, the work before drawing each frame is 15.7 ms; `#battle` is 12.4 ms and `#siege` 12.7 ms.

### What the phase review changed
I went over the whole phase at once: every slice's demos, the older ones, and one long game from the bare link with nothing set up for me. These are the changes.

- **Sounds of war.** The spec promised them and they weren't there. A trumpet sounds when a company is raised or marches off. In a fight near where you are looking you hear spear on shield and the whistle of arrows. Raiders hammering a gate or a wall make a thud. Triremes rowing have oars and a drum, and a loan's coin going in or out clinks.
- **An overdue debt of yours no longer empties the treasury.** Before, it was paid the moment the treasury could find the sum, even if that left nothing for next month's wages. In `#fortress` left alone, that meant 3 dr in the treasury and wages unpaid for three months. Now it waits until the treasury can pay the debt and still keep a month's wages and pay, and the steps go on until then. In `#fortress` left alone, Corinth's agents now take about 750 dr of goods from the stores before the rest is paid, and the treasury keeps about 850 dr. After a year the town is the same size either way. "Repay now" still pays at once. The loan's card and line say what sum it waits for.
- **The Military tab.** The control panel renamed the Army tab "Military", and every line that still said "Army tab" now says so.
  - Clicking a company's row takes its banner without moving the view, so you can plant all three of `#fortress`'s companies at one gate in turn. Its place on the row ("on the flood plain") takes you to it. The steps for `#fortress` and `#battle` above now say this.
  - If no hut or cottage can spare a rower, the shipyard and the "Build a trireme" button now say so before you pay. A town grown into townhouses and fine houses has nobody to row. In my long game, a trireme lay unmanned at her jetty for two years.
- **Less crowding at the top.**
  - The raid, army and debts chips sit side by side instead of stacked.
  - Over the map of Greece only two lines show, with "+N more" for the rest, so the cities underneath stay visible. This holds from the moment the map opens.
  - The top bar no longer wraps at 1600 wide with a city's page open.
  - A debt's line has its own colour, as the spec asked.
- **No more lines repeated.** When a gate fell, "broken through the gate" stood as the army's line, then came back ten days later as news from Greece; now it shows once. Pirates who took the same cargo twice say "twice". A lender's army is called an army when it breaks and runs or leaves, not "raiders".
- **The help card** (?) now covers the mine, armoury, barracks, wall, tower and shipyard under B, and has a short Soldiers section: take a banner, click where the company should stand, Esc lets go, orders work while paused.
- **What I checked:**
  - One step from each slice's "What to try", with screenshots: the mine's tip in `#bronze`, a banner sent in `#battle`, the wall drawn in `#walls` (292 dr, a gate on the road), a third trireme in `#triremes`, accepting Corinth's terms in `#borrow`, the full force in `#collect`, and `#seized`. `#town`, `#richtown`, `#quay`, `#rivals` and `#threat` open as before, and a phase 3 save loads with the welcome back. Compared at opening and 900 days on, all 107 demos with a history are the same as before these changes.
  - **The long game.** I played from the bare link in March 750 BC to November 741 BC in the browser, building with the tools, and then let it run six more years on fast, without watching, answering as a middling player would. Everything in the phase came up except a landing from the sea:
    - **Borrowing in a lean year.** I borrowed 2,000 dr from Athens in a lean year and couldn't repay it. Her agents took goods from the stores twice, then her army came twice and carried off coin and goods until the debt was gone.
    - **Building an army.** I built a copper mine, an armoury and a barracks, raised archers and hoplites from the Military tab, drew a wall from the hills to the river with a gate and a tower by the bridge, and built a shipyard and a trireme.
    - **A raid fought at the gate.** Sparta's band of 19 was fought at the west gate in July 742 BC, by the tower and the hoplites. Seven had fallen when they broke, one of mine was killed and his house mourned him, and the band took nothing.
    - **A debt I held back on purpose.** Corinth's agents seized goods from the caravan yard. Twice her army was beaten on the north road by the two companies, the debt still stood, and the line said when the next army would come.
    - **Pirates.** They came three times on the lane to Athens and plundered Athens' ship. My trireme couldn't go out, because she had no rowers.
    - **Lending.** Athens asked to borrow and repaid on the day. Later Corinth asked, couldn't pay, and the full force I sent won and brought back the debt and 1,480 wheat, with the report on Corinth's page.
    - **No landing from the sea.** No ruler sent ships against this town, so I checked landings in `#landing` and `#triremes`.
- **What I noticed about the money and the raids, for your questions:**
  - My town's treasury stayed between nothing and about 2,000 dr for nine years at about 800 people, at heavy taxes. Most of that is down to how I built: three farms, and two tax offices whose collectors reached fewer than half the homes.
  - Rulers did offer loans when the treasury was low, about once a year.
  - Raids were rare. In nine years only Sparta came once, apart from the lenders' armies: a ruler threatens only when hostile and proud or warlike, or after a tribute refused while already cold.
- **Measured again**, before the review's changes and after, on the same machine:

| | Before | After |
|---|---|---|
| Download | 2,981 KB | 2,983 KB |
| Bare link ready, first frame | 2.0 s, 2.8 s | 2.1 s, 2.9 s |
| `#town` ready, first frame | 2.0 s, 3.8 s | 1.8 s, 3.2 s |
| The 110 demos, ready | median 1.9 s, slowest 2.8 s, none over 3 s | median 1.9 s, slowest 2.6 s, none over 3 s |
| Triangles and draw calls in `#town`, `#richtown`, `#fortress` and the map of Greece | as before | the same |
| Work before drawing each frame, `#battle` | 17.4 ms | 18.6 ms |
| The same, `#siege` | 14.8 ms | 15.8 ms |
| The same, `#fortress`'s fight at the gate | 18.6 ms | 18.1 ms |
| The same, `#town` / `#richtown` | 8.4 / 8.1 ms | 10.2 / 6.1 ms |
| The map of Greece, first opened from `#town` | 5.3 s | 5.3 s |

The frame times swing by a millisecond or two either way from one run to the next. All 444 tests pass, the smoke test passes, and the copy prepared for publishing opens the bare link, `#town` and the main demos without errors.

### The phase, all told

Phase 4, "A city worth defending", with loans both ways, in seven slices. Loans (27) and unpaid debts (28) were built alongside the army slices, so they sit out of order above. Here's what you can do now that you couldn't at the end of phase 3:
- **Slice 23, bronze and the barracks.** Find copper in the hills, dig it at a mine and turn it into armour at an armoury, or buy armour from Corinth and Athens. Raise companies of 16 at a barracks: hoplites from fine houses and villas, archers from townhouses. Every soldier is somebody's son, and his house says so. Take a company's banner and click where it should stand, even while paused. Try `#bronze`, `#barracks` and `#companies`.
- **Slice 24, raiders fought in the streets.** Bands now come in force, sized by the ruler and your city, for your stores and the tax office. They set fires on the way and go home with what they took. Your companies meet them blow by blow. A side that loses half its men breaks, the wounded heal, and the dead are mourned at home. Hirelings march in for a steep wage when you're caught short. Try `#battle`, `#looted` and `#hirelings`.
- **Slice 25, walls, gates and towers.** Drag a wall like a road. Where it crosses a road it becomes a gate that your people pass through and raiders must break. Towers shoot over the wall. A band goes round a short wall or hammers the weakest gate until it cracks and falls. Try `#walls` and `#siege`.
- **Slice 26, from the sea.** Troy, and sometimes Athens or Corinth, beach ships on your shore and land their men. A shipyard builds triremes, rowed by men from your huts and cottages, which ram and sink ships in the bay. On the map of Greece, a trireme can guard a lane from the pirates who now take cargoes. Try `#landing`, `#triremes` and `#pirates`.
- **Slice 27, loans both ways.** Ask a ruler for a loan and get terms with every reason named, or a refusal and why. Offer a loan of your own and see how likely they are to repay, and why. Rulers offer you loans when your treasury is low, and ask for them when they're in trouble. Saying yes or no moves their mood. Try `#borrow`, `#lend` and `#repaid`.
- **Slice 28, debts unpaid.** Miss a repayment and it escalates in steps you can see coming: a warning that all Greece hears, then goods seized from your yard, quay and stores, then an army sent to collect. Paying stops it at any step. When a city won't repay you, forgive it, demand it, or send a raiding party or a full force across the map, and read the report of what came home. Try `#overdue`, `#seized`, `#creditors`, `#collect`, `#report` and `#forgive`.
- **Slice 29, a city worth defending.** `#fortress` is a walled town with three companies, two triremes, a loan each way and Sparta's band on its way. Soldiers now march fast enough to meet a threat. Rulers' loans actually come in play. An unpaid debt reaches your stores. And with the phase review, the sounds of war are in.

Two other threads changed the game while this phase was built: the control panel replaced the build bar (the Army tab is now the Military tab), and the city has a new look, with light, ground, stone, sea, trees and people.

**Recorded for later**
- From the spec: harbour blockades, chariots and horsemen, generals and heroes; taking rivals as vassals and colonies; alliances and joining rivals' wars; the gods in war.
- From the way:
  - a band from the sea lands from the ship nearest its target, which may not be where your companies stand;
  - expeditions at sea never meet pirates, and enemy fleets in wars don't take cargoes, only pirates do;
  - oars never break in a sea fight, the shipyard has no panel of its own, and no miners are drawn at the mine;
  - a caravan already in your streets keeps trading after its road is closed;
  - collectors from across the sea take about 24 days from their sails to the beach;
  - at 1600 × 900, Troy's label on the map of Greece sits under the lines;
  - the camera can end up inside trees on hillsides.
- Still open from phase 3: price arrows coloured by direction only, the caravan yard's blank wall on a slope, a refused band camping in `#threat`, an offer's limit across a road and a sea route to one city, plots marked out with no road. Still open from phase 2: early fire, harsh taxes' bite, lumpy tax money, the ship's pace.

**Budgets that moved** (end of phase 3 against now)
- **Download:** the game's own files went from 437 KB to 681 KB compressed. That covers this phase's soldiers, walls, ships, loans and sounds, plus the control panel and the city look from the other threads. With the prepared demo towns it's about 3 MB in all, but each demo fetches only its own small file.
- **Load:** the bare link is ready in about 2 s. All 110 demos are under the 3-second target, median about 1.9 s, the slowest about 2.6 s.
- **Triangles:** `#town` went from about 800,000 to 1.45 million, almost all of it the city look's trees and people. All of a town's walls are one batch, about 3,600 triangles for `#siege`'s.
- **Time per frame** before drawing: about 15 to 19 ms headless in the big fights (`#battle`, `#siege`, `#fortress`), against about 6 to 10 ms in `#town` and `#richtown`. Headless runs about one frame a second, so each frame does several ticks; a battle tick alone is a fraction of a millisecond.
- **Tests:** 353 at the start of the phase, now 444.
- **Frame rate on a real laptop is still unmeasured.** Only your machine can tell whether a fight at the gate in `#fortress` holds 60 frames a second.

**Questions for you**
- Does defending feel part of the city, and does where you plant a banner matter in a way you can read?
- An unpaid debt of yours now waits until the treasury can keep a month's wages before it pays itself. Is that right, or should it pay the moment it can?
- Should rowers come only from huts and cottages? A town grown into townhouses can't crew its triremes (the game now warns you before you pay).
- Is a seizure the right size? One took 1,796 wheat, worth 359 dr.
- Raids are rare: in a nine-year game only Sparta came, once, apart from lenders' armies. More often?
- Repaying early costs the whole interest. Keep it?
- Your companies hold where you plant them, and don't chase. Should they sally out?
- Each tower takes 4 workers. Too many?
- A lender's army comes back about every four months, even for a small remainder. Too dogged?
- Money is tight in a thinly built town. Is the squeeze in `#fortress` fair?
- What should the next phase be?


## Slice 28 — Debts unpaid (20 Oct)

*Built alongside slices 25 and 26, on its own line of work, and joined to the main line once both had landed.*

A loan now has teeth both ways. Leave one of yours unpaid and the lender warns you, closes the road and seizes your goods, then sends an army to take what you owe. When a ruler won't pay you back, you can forgive the debt, demand it, or send your own soldiers out across the map of Greece to collect it. You weren't here while it was built: every choice below is mine, from the spec's defaults.

What breaks, or moves:
- **Saves.** Old saves load at the new version (27, after the sea slice's 26). A loan already overdue in an old save gets its warning (step 1) when the game next runs.
- **Every earlier demo** opens, and plays 900 ticks on, exactly as before (all 100 compared, the sea slice's included).
- **Rulers offer and ask for loans about twice as often** as in slice 27: an offer about one month in nine from a pleased ruler with coin to spare, and an ask about one month in five from one in trouble. This changes no earlier demo's opening or its first 900 ticks.
- **A fix to saving:** a save with a wounded or healing soldier in it was refused on loading. It now loads.

### What's new
- **Your debts, before the day.** A month before a loan falls due, a line of news says what it comes to and what the treasury can spend.
  - On the lender's Loans tab you can **ask for more time**. The answer comes at once, by their mood and character: three months more (six from a generous ruler) for a few percent more. The tab says what they would likely answer.
  - You can also **hold back payment**. If you don't, it is paid on the day if the treasury can, as before.
- **Unpaid, it climbs three steps.** The loan's card shows all three, each with its date: done, now, and to come.
  1. *On the day:* the lender remembers it longest (−30, fading over four years). Every other ruler hears (−5), and every loan's terms are dearer for three years.
  2. *Two months on:* the lender closes their road or sea route and seizes your goods. That means what waits for their trader in your caravan yard or on your quay, and anything of yours on its way to them: a gift, goods for a request, coin. Each seizure is a line of news and a ledger line ("Seized by Corinth"), and comes off the debt.
  3. *Two months more:* a threat. Pay what is left within a month, or an army half again a war band's size marches on your city. It comes in at the edge, makes for the storehouse and tax office, and takes up to what you owe. It sets no fires. If your soldiers beat it off, the debt stands and another comes four months later.
  - Paying at any step stops the next one. Once overdue, the card's button reads "Pay when the treasury can" while you hold it back; let go, it pays the first day the treasury can.
  - **The debts chip** names the step ("Overdue: 1,970 dr to Corinth · seizing"), and the line under the top bar follows each step. While the army is in your city it reads "Collectors in the city".
- **Their debts.** A ruler who doesn't pay you on the day may first ask for time; you grant (+4) or refuse (−4). Once overdue, their Loans tab offers four answers:
  - **Forgive it:** a big lift with them, a small one with every other ruler.
  - **Demand it:** they have two months. Whether they pay is shown in advance, with its reasons, including how much they fear your army.
  - **Send a raiding party or a full force:** each button shows the odds, what a win brings, and what it does to the mood.
- **Expeditions.**
  - Your companies march out of the city to the edge on the debtor's side, then leave the map. The drill ground empties, and the Army tab says where they are ("Away · on the road to Corinth").
  - A little army in your colours marches along the road on the map of Greece. It fights at their city under crossed swords, then comes home the same way.
  - The fight is settled by the two sides' strength and the dice. A raiding party meets only the countryside's watch: likelier to win, but it brings less. A full force meets the garrison and, if it wins, brings the whole debt and a fifth more as goods.
  - **The report** is on the city's Loans tab, in the news and on the map's hover card. It says who went, the fight and the odds, what they took and what is still owed, who was killed and wounded by company and by name, and how the ruler and Greece took it.
  - The coin and goods go into the treasury and stores when the army is home, as "Brought home by your soldiers" on the ledger. The killed are mourned in their homes, and the wounded walk back to heal.
  - **By sea to Troy.** Troy can only be reached by sea, so the companies march to your shipyard instead of an edge and sail in your triremes, one company to each trireme that is crewed and sound. On the map they are a ship in your colours along the lane. The triremes come home with them. With no triremes, the buttons say so.
  - With no debt behind it, a city's Ruler tab has "Send your soldiers against Corinth" folded away. Without cause, every ruler takes it badly.

### What to try
1. Open #overdue. It is `#borrow`'s town some months on, with Corinth's loan held back and its day just passed. The map opens on Corinth's Loans tab: the warning given and the next two steps with their dates.
   - Click "Pay when the treasury can" and play: it is paid, and the steps stop.
2. Open #seized. It is the same debt two months on. The road to Corinth is closed, and a 250 dr gift on its way there has been seized. The treasury is open on "Seized against your debts".
3. Open #creditors. It is the same debt two more months on, with the threat let run: Corinth's 35 men are in your city, and the camera follows them. This town has no soldiers, so watch them take what is owed and leave.
4. Open #collect. It is `#companies`' town (a company of hoplites and one of archers), with Corinth overdue on a loan you made it (set up for the demo). The map opens on Corinth's Loans tab with the four answers and their odds.
   - Send a full force, close the map and watch the companies march north out of the city. Then open the Army tab, and the map again.
5. Open #report. That full force has fought and won. It opens paused, with the little army at Corinth under the crossed swords a day before it marches home. Read the report on Corinth's Loans tab, and hover the army on the map. Then play on to watch it come home and march back in.
6. Open #forgive. It is `#rivals`' town, with Athens unable to repay the 2,000 dr you lent her. Forgive it, then look at her Ruler tab.

Each link also opens paused if you add `-paused` (for example `#collect-paused`).

### What I'd like your eye on
- **The steps on the loan's card.** In #overdue: is it clear what has happened, what comes next and when, and what stops it?
- **The odds and the report.** These are the demos' own runs (one each, so only a sample):

  | | Odds | Result | Ours killed / wounded | Brought home | Home in |
  |---|---|---|---|---|---|
  | `#collect`, raiding party (16 men vs the watch of 8) | about 9 in 10 | won | 1 / 1 | 450 dr and 750 wheat (600 dr against the debt; 1,020 dr still owed) | 51 days |
  | `#collect`, full force (32 men vs the garrison of 30) | about 5 in 10 | won | 2 / 2 | the whole 1,620 dr, and 1,620 wheat as the penalty | 52 days |
  | `#creditors`, Corinth's 35 collectors vs no soldiers | — | took what was owed | — | 2,040 dr and 200 oil carried off (2,220 dr at Corinth's prices); the loan is paid off | — |

  Is a full force at evens worth the risk, set against a near-certain raid that brings back a third? Does about 50 days away feel too long?
- **The army on the map.** It is 3 to 9 figures in your colours, along the road. From the opening view it sits close to your city's label and is hard to pick out. Is it visible enough?
- **Seizures.** They take only what waits for the lender's trader in your yard or on your quay, and what is on its way to them. In `#borrow`'s town the yard is nearly always empty, so seizures rarely bite (#seized shows a gift being seized). Should they take from your storehouse too?

### Known rough edges
- **#seized shows a seized gift, not seized goods,** because the caravan yard there is empty (above).
- **A line under the top bar can lag** for a moment after you pause.
- **Repaying early still costs the whole interest,** as in slice 27.
- **At sea, an expedition meets nobody.** The triremes carry the men but fight no one on the way, and pirates don't waylay them. A full force to Troy takes only as many companies as you have triremes fit to sail. No demo shows it; the test drives it from `#triremes`.

### Measurements
Headless Chromium with software WebGL at 1920 × 1080. Before is `579a3f2` (slice 25's check-in on the main line). After is this slice with main merged in (`42c6b88`): slice 25's review fixes and slice 26, from the sea, are in the After figures too. The machine was shared with other threads, so frame and load times swing by a third from run to run; only large changes count.

| What | Before | After |
|---|---|---|
| Tests | 404, all passing | 434, all passing (13 of them debts, one from the review; the rest from slice 25's review and slice 26) |
| Download (gzipped) | 2,566 KB: the game 641 KB, the prepared towns 1,925 KB | 2,935 KB: the game 676 KB (debts and slice 26's fleet), the prepared towns 2,259 KB (this slice's six demos and slice 26's three) |
| First load (bare link) | ready at 2.9 s, first frame at 3.9 s | ready at 2.5 s, first frame at 3.8 s |
| Demo loads | 100 demos, median ready 2.7 s | 109 demos, median ready 2.4 s, slowest `#panel` 3.1 s |
| `#town` / `#richtown` | 1,453,964 / 1,623,607 triangles, 89 / 101 draw calls | the same |
| Map of Greece (`#greece`) | 305,842 triangles, 32 draw calls | the same; this slice's maps 304,778 to 313,882 triangles, 26 to 31 draw calls |
| Frame work (update before drawing) | `#town` 12.0 ms, `#richtown` 16.1, `#companies` 19.6, `#borrow` 12.3, `#lend` 11.0, `#repaid` 23.5, `#battle` fought 24.0 | `#town` 11.9 ms, `#richtown` 14.8, `#companies` 10.8, `#borrow` 5.9, `#lend` 7.4, `#repaid` 13.7, `#battle` fought 26.9; new: `#overdue` 6.6, `#seized` 10.8, `#creditors` 11.8, `#collect` 12.3, `#report` 8.2, `#forgive` 11.4 |

Every frame time here is within the run-to-run swing.

### What the review changed
A second pass went through every step above in the browser at 1920 × 1080, read the new code, played `#rivals` and `#borrow` on for three years each to see how often rulers now offer and ask, and compared every earlier demo with the main line, at opening and 900 ticks on: all the same. The steps above have been corrected to match. What it changed:
- **Collectors by sea say what they are.** When a lender across the sea sends its army, the "Sails!" news, the line under the top bar and the landing news offered to "pay to turn them back", as for raiders. They now say the army has come to collect what you owe. A new test sends Troy's army by sea and checks it lands, takes no more than is owed, sets no fires and leaves the books adding up.
- **The warning names the right routes.** It used to say a lender would close "the road" (or "the sea" for Troy). It now names what is actually open with them: the road, the sea route, or both.
- **Fewer repeated lines under the top bar.** The news of a debt's warning or its routes closing no longer shows beside the loan's own line, which says the same and what comes next. The news that a ruler hasn't repaid you goes once you forgive it or it is paid or collected, and the news that you sent soldiers out goes while the expedition's own line shows where they are.
- **`#report` opens paused, at Corinth.** It used to open with the army a moment from your edge on the way home, so it walked in before you could hover it. Step 5 above is updated.
- **The raiding party's estimate is closer to what it brings.** The button valued the goods it would carry off at your prices, not Corinth's, and said about 970 dr in `#collect`; it now says about 640, and the run brought 600.
- **Men killed on a raid are mourned as such.** Their homes said they fell fighting a garrison when it was the countryside's watch; they now say the watch, "far from home".
- **Following Corinth's collectors.** In `#creditors` the chip over the town said "Following raiders"; it now says "Following Corinth's collectors".
- **An expedition with nobody left.** If you pull down the barracks while your companies are away, the expedition now ends with a line saying there was nobody left to fight, and any triremes still come home. Before, it would have fought with no men.
- **City tabs fit on one row**, "Loans · overdue" included.
- **The figures for `#creditors`** in the table above are corrected: Corinth's men carried off 2,040 dr and 200 oil, which is the whole debt at Corinth's prices.

What I checked and did not change, for your eye:
- **How busy rulers are.** In three years of each town played on with nobody touching it, no ruler offered or asked for a loan at all (requests and tributes came as before). The new odds are not too busy; if anything, loans from rulers are still rare.
- **Collectors from across the sea are slow.** Troy's army takes about 24 days from being sighted to landing, the sea raiders' own pace.
- **The army on the map** still sits near your city's label at first and is hard to pick out (above).

Measured again after the fixes: the download, triangles and draw calls are as above, every demo is ready within 3 seconds (median 2.2 s), and the frame times are within the run-to-run swing (`#report` is lighter now it opens paused at Corinth). The tests number 434, all passing (one new, for the review).

## Slice 26 — From the sea (20 Oct)

Troy's raiders now come by sea: their dark-sailed ships cross your bay, run up on the beach and land their men, and sail off with what they took. A shipyard on the shore builds triremes that row out to meet them, and that you can send to guard a sea lane from pirates. You weren't here while it was built: every choice below is mine, from the spec's defaults.

What breaks, or moves:
- **Saves.** Saves from before load with no shipyard, no triremes and no pirates. The welcome back says raiders can come from the sea now, and what the shipyard is for.
- **Every earlier demo** opens, and plays 900 ticks on, exactly as before (all 100 compared).
- **Raids from Troy come by sea.** So do raids from Athens or Corinth if you trade with them by sea but not by road. Their threat and line say so ("off your shore"), and they land on the beach nearest what they came for. Raids from Sparta, and from cities you reach by road, still come over land.
- **Pirates** may now appear on a sea lane you trade over, once that trade is a year old.
- **The news when a band breaks** (slice 25's review) is now told once the band has left your land, so it counts every man who fell: "Your soldiers broke Sparta's raiders at the bridge: 20 of their 29 men fell".
- **The wall tool's tip** says "(40 dr each)" only when there is more than one gate.

### What's new
- **The shipyard** (B seven times, or the Military tab after the tower; 300 dr). It goes on the shore like the trading post: a slipway under a tiled shed, timber, a pitch pot and a jetty. It needs 8 shipwrights and a road beside it. Clicking it opens the Army tab at its section.
- **Triremes** (400 dr each, on the Army tab under the shipyard). She is built on the slip in about a month while the yard is staffed. You can watch her frame, then her hull, under the shed.
  - Each yard moors three, side by side off its jetty.
  - She needs 12 rowers, one from each hut or cottage that can spare a man, a few a day. A rower leaves his work and is paid 2 dr a month, on its own line of the ledger ("Rowers' pay"). His house says "Their eldest, Dion, rows in the trireme Nike".
  - Rowers left unpaid for a month go home.
  - Moored, she is mended 3 a day while the yard has shipwrights.
- **Ships in the bay.**
  - Troy's ships show on the horizon about two weeks before they beach: one ship for every eight men or so, two to four of them.
  - They beach a little apart on the open shore. The men march inland as any band does. Each ship keeps two men to guard her, and the men go back to the ships with what they carried.
  - The raid chip reads "Troy's ships · 3 in the bay", and hovering a ship says what she is doing.
- **Fights in the bay.**
  - Every trireme at home with half her rowers and her hull at 60 or more rows out to the nearest enemy ship. Two triremes go for different ships when they can.
  - She rams every day and a half or so, and the ship strikes back. A ship struck rocks and throws up spray. One whose hull runs out lists and goes under, with the men aboard.
  - A trireme badly holed (under 35) breaks off and rows home.
  - If every ship is sunk before it beaches, nobody lands. If the ships are sunk on the beach while the band is ashore, the band comes back to an empty shore, drops what it carried (it goes back to your stores and treasury) and flees overland.
- **Pirates** take up a place on a lane you trade over: off Cape Skyllaion on the way to Athens, off Aegina on the way to Corinth, or off Kea on the way to Troy.
  - They are seen a fortnight before they strike (a line in the News of Greece), stay about four months, and come with one to three ships.
  - While they prey on an unguarded lane, they seize your gifts, goods sent for a ruler, coin sent by sea, and traders' cargo coming to you (the trader comes in empty). What was sent for a ruler's request waits to be sent again.
  - On the map of Greece they are a dark galley at their place.
- **Guarding a lane.**
  - From the Army tab ("Send to guard the lane to: Athens Corinth Troy") or the sea-lane card on a city's page, send a trireme. She rows out of the bay and sails the lane on the map, in your colours, to the pirates' place, and stays there until you bring her home.
  - Nothing is seized on a guarded lane.
  - Pirates on a guarded lane bring a fight, settled the next day, with a report in the news and on the city's page. A trireme is worth two pirate ships, so one trireme against one ship wins about two times in three. Beaten, she comes home holed (or is lost), and the pirates stay.

### What to try
1. Open `#landing`. It is `#companies`' town, paused, with the hoplites' banner in hand. Troy's king has turned on it (set up for this demo): three ships with 24 men are sailing in, about 12 days from the beach below the storehouse by the trading post. Both companies have marched down from the barracks (also set up for the demo) and wait on open ground above the harbour, about 9 days' march from that beach.
   - Place the hoplites on the sand below the storehouse, take the archers' banner (click their row) and place them a little inland behind. Then play, and watch the ships beach and the men land into your companies. In my run the band broke by the bay (9 of its 18 men fell), took nothing, and its ships sailed off empty.
   - Or play without placing anyone: 18 men land on day 12, take 360 wine from the storehouse and 388 dr from the tax office, and sail off with them.
2. Open `#triremes`. It is the same town, playing, with a shipyard west of the trading post and two crewed triremes, the Nike and the Glaukos. Four of Troy's ships with 25 men are just showing on the horizon. The Army tab is open at the shipyard.
   - Watch the triremes row out and ram. In my run they sank three ships at sea (19 men drowned). The fourth beached, landed its last 4 men, and was sunk on the beach. Its men set two buildings alight, came back to an empty shore and dropped the 320 wine and 160 dr they had taken.
   - Hover a trireme or a ship to see her hull and what she is doing.
   - Build a third trireme from the Army tab and watch her on the slip.
3. Open `#pirates`. It is `#athensship`'s town, trading with Athens by sea, with a shipyard and the trireme Nike. One pirate ship has been seen off Cape Skyllaion on the lane to Athens (set up for this demo). The map of Greece is open on Athens.
   - Click "Send the Nike to guard it" on the sea-lane card. She takes about two weeks to row out of the bay, then sails the lane on the map.
   - On station, she fights the pirates the next day. The report lands in the News of Greece, the Army tab and Athens' page. The fight is a throw of the dice: in my runs, sent at once, she was beaten the first time.
   - If she is beaten, she comes home to mend; the button's tip says why she can't go out again until her hull is at 60.
4. Open any earlier demo, say `#siege` or `#richtown`: it is the same town as before.

Each link also opens paused if you add `-paused` (for example `#triremes-paused`).

### What I'd like your eye on
- **Do the ships read?** Are the triremes (long and low in your colours, a bronze ram, eyes, oars that row, the sail furled) and Troy's ships (shorter, dark, a dark sail with Troy's green stripe) clear at the distances you play at?
  - When a trireme rams, I draw her standing off so her ram, not her hull, is at the ship's side. Does a fight read as ramming?
  - Ships sinking (listing, then going under) and ships drawn up on the sand: do these read?
- **The balance.** Two triremes against four ships sank all four in `#triremes`, and the band carried nothing home. Undefended, `#landing`'s band took 360 wine and 388 dr.
  - A trireme costs 400 dr and 24 dr a month in rowers' pay. Is that worth it against Troy?
- **Pirates.** One trireme against two pirate ships is an even fight. In my runs of `#pirates` with two ships, she lost three times running, so the demo now has one ship. Is a pirate place a fair threat, and should a single trireme be stronger than it is?
- **Time.** Rowing out of the bay takes about two weeks, and the ships take about two weeks from the horizon to the beach. Does that feel slow or right?

### Known rough edges
- **Oars don't break.** The plan said a rammed trireme loses oars. She rocks and throws up spray, but her oars stay whole.
- **No panel for the shipyard.** Its triremes, rowers and orders live on the Army tab.
- **Ships can touch in a fight.** A trireme standing off keeps to the side of her ship clearer of other hulls, but two triremes on one ship, or oars, can still draw into each other.
- **A trireme guarding a lane** is drawn just short of the pirates' place, the pirates just beyond. In a fight nothing moves on the map; the report says what happened.
- **Moored triremes** lie side by side off the jetty; their oars can overlap.
- **Pirate places are fixed,** one per lane.

### For slice 28
`fleetFor(s, city)` gives `{ ids, carry, why }`: the triremes at home that are crewed and sound, the men they carry (16 each), or why none can go. `sailFor(s, map, ids, city)` takes them off the bay's guard and out of the bay. They are then 'away' on the lane, placed by `triremeOnMap`, and the call returns the ids that went. `fleetHome(s, map, ids)` brings them home. The state version is 26, so slice 28 takes 27 (or renumbers if it lands first).

### Measurements
Headless Chromium with software WebGL at 1920 × 1080. Before is `b754f9a` (slice 25 with its review). After is this slice. Another builder was running its own browser tests on the same machine for both runs, so frame and load times are noisy.

| What | Before | After |
|---|---|---|
| Tests | 408 in 35 files, all passing | 421 in 36 files, all passing (13 of them the fleet) |
| Download (gzipped) | 2,566 KB: the game 642 KB, the prepared towns 1,925 KB | 2,695 KB: the game 660 KB, the prepared towns 2,034 KB (`#landing`, `#triremes` and `#pirates` among them) |
| First load (bare link) | ready at 2.6 s, first frame at 3.5 s | ready at 2.8 s, first frame at 3.8 s |
| Every demo's load | 100 demos, median 2.9 s, slowest 4.6 s, 12 over 3 s | 103 demos, median 2.4 s, slowest 3.2 s (`#triremes`), 5 over 3 s |
| `#town` / `#richtown` | 1,453,964 / 1,623,607 triangles; 89 / 101 draw calls | the same |
| `#battle` / `#siege` | 1,594,671 and 95 / 1,561,618 and 93 | the same |
| The new demos | — | `#landing` 1,565,491 triangles, 93 draw calls; `#triremes` 1,433,369 and 78; the fight close in 1,398,760 and 73. A trireme is one mesh of 1,282 triangles, an enemy ship 988. `#pirates`' map 313,834 and 43 |
| Work a frame before drawing | `#town` 13.0 ms, `#richtown` 17.3, `#raiders` 9.0, `#companies` 15.1; `#battle` during the fight 23.7; `#siege` 20.2 | 17.5, 15.3, 8.9, 11.5; `#battle` 38.8; `#siege` 24.3; `#triremes` during the fight 17.6 (a busy machine: `#battle` and `#siege` have no ships, and their sim and drawing are unchanged) |
| A save of `#richtown` | 187 KB | 187 KB |

### What the review changed
A second pass went through every step above in the browser at 1920 × 1080, read the new code, and played the raids from the sea again, by hand and in the sim. The steps above have been corrected to match. What it changed:
- **`#landing` gives your companies a chance.** Its ships beached six days after it opened, but both companies stood at the barracks, about three weeks' march away, so wherever you placed them the band landed unopposed. The ships are now about twelve days out, and both companies wait above the harbour, about nine days from the beach.
- **Ships no longer wait on the beach for ever.** If every man a band had landed fell ashore, its ships stayed drawn up on the sand for good. They now put off and sail home.
- **A fleet sunk to the last ship is told as sunk.** About one time in five, when your triremes sank the last of Troy's ships at sea, the raid was settled as if the band had landed and gone home empty-handed, instead of "sunk at sea" with its men drowned. It is now always told as sunk.
- **No jumping between lanes.** A trireme guarding one lane could be sent straight to another, and she jumped across the map of Greece. Now the button's tip says to bring her home first. A trireme called home also vanished from the map; she now sails home along her lane, and while she does there is no "Bring her home" button.
- **Each event once.** A sinking, or the report of a fight on a lane, showed twice in the lines over the town: once as the army's news and once as news from Greece. It now shows once.
- **Moored triremes lie further apart,** so their hulls no longer touch (their oars can still cross).
- **A trireme ramming stands off on the clear side** of her ship. She was sometimes drawn across another ship sinking beside it.
- **Triremes carrying your soldiers stay with them.** With slice 28's expeditions in, a trireme taking your companies to Troy showed a "Bring her home" button that would have left them stranded there. She has no button now, and comes home with them.

What I checked and did not change, for your eye:
- **`#landing`, defended.** With the hoplites on the sand below the storehouse and the archers a little inland behind them, the band broke by the bay: 9 of its 18 men fell, 1 of ours was wounded, and it took nothing. With the archers placed nearer the beach than the hoplites, the archers broke and the band took more. Undefended, it took 360 wine and 388 dr. The ships are far out when it opens and small on the screen; the raid chip and the town line say where they are.
- **`#pirates` and the dice.** In my runs, sent at once, the Nike lost her first fight, and lost again when sent back out with her hull at 60. Her odds are two in three against one ship, and a little over a half once she is holed; over many throws the dice come out as those odds say. A beaten trireme must then mend to 60 at the yard and row out again, about two weeks, before she can try again.
- **`#triremes`** played as step 2 says, in the sim and in the browser: three ships sunk at sea, the fourth sunk on the beach, its four men dropping what they took.
- **Ramming from above.** From high up a fight reads as ships standing bow-on to each other, the struck ship rocking. Close in, two triremes on one ship can still touch.

Measured again after the fixes: every demo's triangles and draw calls are as before, `#landing` a little more (1,569,756 and 93) now its companies stand above the harbour. The fight in `#triremes` took 14.2 ms a frame before drawing (17.6 before), the download is 2,696 KB, and a save of `#richtown` is still 187 KB. Every earlier demo opens, and plays 900 ticks on, exactly as before the review; only `#landing` and `#triremes` changed.

The tests number 438 with slice 28 merged in, all passing (4 of them new, for the review).

## Slice 25 — Walls, gates and towers (20 Oct)

You can now draw stone walls like roads, with a gate wherever a wall crosses a road, and set towers on them whose archers shoot raiders; a band looks for the cheapest way in, round the end of a short wall or through a gate or stretch it hammers at until it breaks. You weren't here while it was built: every choice below is mine, from the spec's defaults.

What breaks, or moves:
- **Saves.** Saves from before load with no walls. The welcome back says the city can wall itself now.
- **Every earlier demo** opens, and plays 900 ticks on, exactly as before (all 93 compared).
- **The band's line** now names every place it makes for ("making for the granary, then the tax office"), and says when the band is hammering at a gate or wall.
- **Raiders look darker.** Black horsehair crests, and shields in their city's colour darkened with an iron rim, so a band reads apart from your red-and-bronze hoplites.
- **Men in a fight wade the river slowly** (a third of their pace), so a bridge narrows a fight more than it did. This changes no earlier demo's opening or its first 900 ticks.

### What's new
- **The wall tool** (B five times, or the Military tab). Drag a line, like a road's straight drag:
  - Each tile of open dry ground becomes a stretch of wall (12 dr). Each road tile becomes a gate (40 dr). A cracked or broken stretch you draw over is mended.
  - Water, the river bank, cliffs, buildings and bridges are skipped: they're marked red, and the tip says why.
  - The tip counts the stretches and gates and says what they cost. Undo takes back the whole drag, and the clear tool clears walls like roads.
- **Walls in the city.**
  - Your people never cross a wall. Carts, vendors and soldiers go through the gates, and anyone walking across country goes round.
  - A gate is an arch over the road with a timber door. The door stands open, and swings shut while raiders are on your land, opening only for your own people going through.
- **Towers** (B six times, 200 dr). A square stone tower, 2 × 2, standing on the wall or right beside it.
  - Its four workers are its archers, paid like any workers. Like any workplace, it needs a road beside it for them to reach it.
  - From its top it shoots the weakest raider within ten tiles, over walls and roofs.
  - Towers don't burn or wear, and raiders can't break them.
- **Raiders and walls.**
  - A band finds the cheapest way in. If the gap round the end of a wall is near, it goes round. Otherwise it goes through the nearest gate or the weakest stretch, and a cracked stretch draws it.
  - Ten men at a time hammer at it. A whole gate holds about 12 days and a whole stretch about 24.
  - A stretch shows cracks as it weakens, below two thirds and again below a third. A badly broken gate has a leaf staved in.
  - Once through, the band goes on to its target. The breach stays: a gap of fallen stones that anyone can walk through, the band going home included, until you draw the wall over it again (the full price).
  - A stretch or gate can't be mended while raiders are hammering at it, only before they come or once they've gone.
- **Hovers.** A stretch or gate says how strong it is. While it is under the rams, it says who is hammering at it and how long it has left at that rate. A tower names its archers and whom they are shooting at. A raider at the wall is "hammering at your gate".
- **The town line** reads "hammering at your gate on the flood plain, to get at the granary, then the tax office". When the band is through, the town line and the Army tab's news both say so.

### What to try
1. Open `#walls`. It is `#battle`'s town, paused, with the wall tool in hand. Sparta's band of 29 is gathering, about three weeks from the west edge and about seven weeks from the town. You look across the old town to the river and its bridge, with the hills on the right.
   - Drag a wall from the foot of the hills on the right, past the bridge's foot, to the river just left of the bridge. A gate goes where it crosses the road coming off the bridge, and the river and the hills close the rest. The tip shows what it costs (about 300 dr).
   - Take the tower (B six times, or the Military tab) and set one or two beside the gate, by the road. Then send both companies to just inside the gate, and play.
   - The band reaches the gate about 45 days after `#walls` opens; your companies are there by about day 25.
   - Try it again without the companies, or without the towers, and see what the wall alone buys.
2. Open `#siege`. It is the same town, paused, walled from the hills to the river, with two towers beside the west gate. The band of 29 is at the gate, hammering, and the towers are shooting. Your companies are still at the barracks.
   - Hover the gate to see how long it has left, then play. Watch the gate crack and the men fall to the towers. At normal speed a day is a second, so the gate holds for about ten seconds.
   - When it breaks, watch the band go through the gap, then come home through it with what it took.
   - Then draw the wall over the broken gate to rebuild it.
3. Open any earlier demo, say `#battle` or `#richtown`: it is the same town as before.

Each link also opens paused if you add `-paused` (for example `#richtown-paused`).

### What I'd like your eye on
- **Do walls read?** In `#siege`, from outside the gate and from above the town: are the stretches, the gate, the towers and the band at the gate clear at the distances you play at? Is the breach (broken piers, the fallen lintel, stones and a broken leaf of the door) clear enough? I tuned all of these by screenshots only.
- **The balance.** These are my runs in `#walls`, with the wall from the hills to the river (304 dr), two towers (400 dr), and the companies just inside the gate:

  | Defence | The gate | Raiders fallen (of 29) | Ours | What the band took |
  |---|---|---|---|---|
  | Wall and two towers, no companies | broke after 12 days | 13 (7 while they hammered) | none | about 330 dr and 600 wheat |
  | Wall, towers and both companies | held | 20; the band broke | 3 killed, 2 wounded | nothing |
  | Wall and both companies | held | 15; the band broke | 1 killed, 8 wounded | nothing |
  | Both companies, no wall | — | 16; the band broke | 3 killed | nothing |

  Every band burnt a house on the west bank on its way in. Is a wall with towers worth its 700 dr? I can't tell from numbers alone whether a gate holding 12 days is too long or too short.
- **Hoplites going out.** With the companies inside, the hoplites march out through their own gate to fight the band hammering at it. Their archers shoot over the wall. Is that what you'd expect, or should they hold behind the gate?
- **Time to get there.** The march from the barracks to the west gate is about 25 days, and a whole gate holds about 12. So in `#siege` the companies can't save the gate; in `#walls` there is time. Does that feel right?
- **Telling the sides apart.** Are your hoplites and the raiders easy to tell apart in a fight now, with the raiders' black crests and darkened shields?

### Known rough edges
- **Towers need a road beside them** for their archers. A tower in the middle of a long wall, away from any road, stands empty; its tip and hover say so.
- **No towers south of `#siege`'s gate.** The river bank and a farm are there, so both towers stand on its north side, one outside the wall and one inside.
- **`#walls` opens three weeks before the band reaches the edge,** not the month I planned; that is the earliest its staged threat allows.
- **Steep ground.** A wall can't stand on cliffs, so a line drawn into the hills stops where they begin. Raiders can't climb them either.
- **Nobody stands on the walls,** and towers can't be broken (as the spec says).

### Measurements
Headless Chromium with software WebGL at 1920 × 1080. Before is `8358833` (slice 24 with its review). After is this slice on the main line, with the control panel, the city look's stages 2 and 3 and the loans merged in. Most of the change in triangles and download comes from those, not from walls: the city look's trees and people roughly double every view's triangles. The machine was shared with other threads, so frame times are noisy.

| What | Before | After |
|---|---|---|
| Tests | 377, all passing | 404, all passing (11 of them walls) |
| Download (gzipped) | 2,224 KB: the game 486 KB, the prepared towns 1,738 KB | 2,566 KB: the game 641 KB (walls, the control panel, the city look, loans), the prepared towns 1,925 KB (`#walls` and `#siege` among the new ones) |
| First load (bare link) | ready at 1.4 s, first frame at 2.4 s | ready at 1.9 s, first frame at 2.6 s |
| Every demo's load | 94 demos, median 2.3 s, slowest 3.8 s, 16 over 3 s (a busy machine) | 100 demos, median 2.0 s, slowest 2.5 s, none over 3 s |
| `#town` / `#richtown` | 799,168 / 910,707 triangles; 83 / 95 draw calls | 1,453,964 / 1,623,607; 89 / 101 (the city look) |
| `#battle` | 923,107 triangles, 89 draw calls; the fight close in 784,710 and 70 | 1,594,671 and 95; the fight 1,314,806 and 76 |
| The new demos | — | `#walls` 1,753,233 triangles, 102 draw calls; `#siege` at the gate 1,561,618 and 93. Every wall, gate and tower is one mesh: 3,636 triangles and one draw call for `#siege`'s 22 stretches and gates and its two towers |
| Work a frame before drawing | `#town` 13.0 ms, `#richtown` 9.5, `#raiders` 8.7, `#companies` 14.9; `#battle` during the fight 26.9 | 7.9, 6.5, 5.3, 9.2; `#battle` 16.4; `#siege` while the band hammers and the towers shoot 12.2 |
| A save of `#richtown` | 187 KB | 187 KB |

### What the review changed
A second pass went through every step above in the browser at 1920 × 1080, read the new code, played the balance table again, and compared every demo (all 98 with a prepared town, the three loans demos included) with the main line before the review, at opening and 900 ticks on: all the same. The three loans demos also play the same as on the loans' own line before walls reached it. The steps above have been corrected to match. What it changed:
- **No sealing the edge.** A wall drawn all along the west edge of the map turned Sparta's band away ("found nothing worth taking") for about 1,000 dr. A wall or gate on the very edge is now a way in like any other: the band stands just off the map and breaks it.
- **No mending under the rams.** Drawing the wall over a gate while the band hammered at it mended it for a few drachmas, again every few days, so a gate held for ever. Now a stretch or gate raiders are hammering at can't be mended until they have gone. Its hover and the wall tool's tip say so.
- **Undo keeps what raiders broke.** Undo handed back the whole price of a wall raiders had cracked or broken since. It is refused now, as it is for a home someone has moved into.
- **Doors that open for your people.** While raiders were on your land, a gate's door was drawn shut even as your soldiers and walkers went through it. It now opens for them. Raiders still can't pass a gate that stands, door open or not.
- **A broken gate reads as broken.** Its piers now stand at about half their height with broken tops, and its lintel lies fallen at the foot of one. Before, the low stumps looked from a distance like a gate standing open.
- **`#walls` shows the whole line.** It opened with the hills' end of the line off the screen. It now opens on the whole stretch from the river to the hills, and step 1 says where to drag as you see it.
- **`#siege` opens paused**, like `#battle` and `#walls`. At normal speed the gate fell about ten seconds after it opened, before there was time to hover it.
- **Older saves.** A save from the loans' own line of work, made before walls reached it, now loads with no walls instead of being called damaged.

What I checked and did not change, for your eye:
- **The march.** A company marches about as fast as raiders walk, two tiles a day. From `#battle`'s barracks, at the east of the town, to the west gate is about 25 days, about as long as the band takes from the edge to the gate. I kept both the pace and where the barracks stands:
  - Sent when the band comes in at the edge (the "Raiders!" line), both companies reach the gate before it falls, hold it and break the band (20 of 29 fall, 4 of ours killed).
  - Sent only once the band is hammering, they arrive 13 days after the gate broke.
  - A banner in hand says how many days away a place is, and a gate under the rams says how many days it has left, so you can read the race before it is run. A barracks nearer the side raids come from shortens it.
- **The balance table** above came out the same when I played it again.
- **Hoplites going out.** They do go out through their own gate to fight a band hammering at it, and the band can't come in behind them while the gate stands.
- **Hidden from some sides.** In `#siege`, from above the town looking west, the two towers hide the band at the gate, and later the breach. Turn the camera to see them.
- **The news when a band breaks** counts the men fallen at that moment (15 in `#walls` with the companies). The towers often shoot a few more as it runs (20 in all).

Measured again after the fixes: the walls are still one mesh of 3,636 triangles and one draw call in `#siege`, and every demo's triangles and draw calls are as before (`#walls` shows a little more town now its view is wider). The frame times and load times came out slower across every demo, walls or none, because another build was running on the same machine; the doors' check each frame looks only at gates while raiders are about.

The tests number 408, all passing (4 of them new, for the review).

## Slice 27 — Loans both ways (19 Oct)

*Built alongside slices 24 to 26, in its own line of work, and landing on the main line before them: slice 24, the control panel and the city look are in, slice 25’s walls are part-way in, and slice 26 is still to come.*

Coin now moves between your city and the rulers as loans, both ways. You can ask a ruler to lend you coin, and their herald brings back terms, every reason named, or a refusal and why. You can lend to a ruler, choosing the sum, the interest and the months, and see beforehand whether they would take it and how likely they are to repay. Now and then a pleased ruler offers you a loan, and a ruler in trouble asks you for one. Each loan is paid back in one payment, interest and all, on the day it falls due. You weren't here while it was built: every choice below is mine, from the spec's defaults.

What breaks, or moves: nothing you had is lost.
- **Saves.** Saves from before load with no loans, slice 24's included. If the town trades with Greece, the welcome back says rulers now lend and borrow, and where to ask.
- **Earlier demos.** Every earlier demo opens, and plays 900 ticks on, exactly as before, the Greek ones included. No ruler happens to offer or ask a loan in any of them in that time.
- **What reads differently.** A ruled city's page has a fifth tab, Loans, so its row of tabs now wraps onto two lines. The ledger has five new lines for loans, and the Administration tab (the old Money tab, now in the control panel) gets a Loans row when there are any.

### What's new
- **Asking for a loan.** On a city's Loans tab, "Ask for a loan" says what the ruler would likely do as things stand: the interest, the months and what the city can spare, with every reason. Or it says why they won't lend ("the king of Sparta does not lend to a city he barely knows (wary, and no route between you)").
  - Pick a sum (500 to 5,000 dr). Your herald goes, on the map as a coin gift goes.
  - When he arrives, the ruler answers, as things stand then. Their terms wait two months for your Accept or Decline. Accepted, their herald brings the coin into the treasury.
- **The terms.** The interest is a percent of the sum for the whole loan, from 12%, and the months run from 12. Each thing that moves them is named:
  - the ruler's mood: cordial −2%, warm −4% and six months more;
  - the city's wealth: Athens and Corinth are rich (−2%), Sparta keeps little coin (+2%);
  - their character: a greedy ruler +5%, a generous one −3% and six months more, a shrewd one +2% and six months fewer;
  - their troubles: at war +3%; beaten in a war lately +2% (and they can spare half as much);
  - your own name: your city owes no one (−2%), you owe another city already (+2%), or Greece knows you pay your debts (−1% for each loan repaid on time lately).
- **Lending.** "Offer a loan" lets you pick the sum, the interest (5 to 20%) and the months (6 to 24).
  - Before you send, it says whether they would likely take it and why ("they need coin (at war with Athens), and 10% is fair to them"), and how likely they are to repay: likely, fair or doubtful, with each reason marked + or −.
  - The coin leaves with your herald. When he arrives they take it, or send it back and say why. A ruler in need takes a fair rate; one not in need takes only cheap coin. Lent to a ruler in need, it warms them.
- **The rulers' own offers and asks.** These come like requests, with the same calm: none until six months after your first route, one a ruler, two across Greece.
  - A pleased ruler with coin to spare, in no trouble of their own, now and then offers you a loan, more often when your treasury is low.
  - A ruler in trouble (at war, a poor harvest, beaten lately) now and then asks to borrow.
  - Both sit on the Ruler tab with a coin-on-a-scroll seal on the city's label and a line under the top bar. Each answer shows what it does to their mood: lend +15 (+19 from a generous ruler such as Athens’ archon), refuse −6, let it run out −4.
- **Repaying.** On the day yours is due, the whole sum goes from the treasury and your herald takes it to them. Repaid on time, the lender is pleased (+8), and every ruler's terms are a percent better.
  - If the treasury can't pay on the day, the loan is overdue. It is paid as soon as the treasury can, and until then no ruler will lend to you.
  - "Repay now" on the Administration tab or the Loans tab pays early.
  - On the day theirs is due, Greece's dice decide, against how likely they were to repay, whether their herald brings it or the loan stands overdue.
- **Where you see it.**
  - A chip under the top bar shows the next date due either way ("You owe Corinth 2,220 dr · 21 November"), red if one is overdue. It opens the Administration tab, which lists every loan with its terms, dates and how it stands.
  - The ledger has the five new lines: Loan, Loan repaid, Loan sent back, Lent, and Loan repaid going out.
  - A line under the top bar shows when terms wait on you, when your loan is due within a month and the treasury can't cover it, or when it is overdue.

### What to try
1. Open `#borrow`. It is `#caravan`'s young town in May 747 BC, with 760 dr in the treasury. You asked Corinth and Athens for 2,000 dr each, and both answers are back. The map is open on Corinth's Loans tab.
   - Corinth will lend at 11%, repaid in 6 months: the lord is shrewd and at war with Athens.
   - Open Athens' Loans tab: 6% over 15 months, as the archon is generous.
   - Open Sparta's: the king won't lend to a city he barely knows. The page also says what he would ask if he did (12% over 15 months) and why.
   - Accept one, run it for a week, and watch the coin come in. Then look at the chip and the Administration tab, and try "Repay now".
2. Open `#lend`. It is `#rivals`' town in November 746 BC, with over 6,000 dr; Sparta's raiders have just left with some of your wheat and coin. Athens lost its war with Troy in September, and the archon asks to borrow 2,000 dr at 11% over a year "to rebuild after their defeat by Troy". Her page says how likely she is to repay (fair) and why. Lend it or refuse it. Her own Loans tab says she is borrowing from you, not lending. Then open Corinth's Loans tab and offer a loan of your own: change the sum and the rate and watch the likely answer change.
3. Open `#repaid`. It is the same town a year on. You lent Athens the 2,000 dr, and on the day the archon paid: her herald is on the road with 2,220 dr, four days from your land. Run it and watch the treasury and the ledger ("Loan repaid · by Athens").
4. Open any earlier demo (say `#rivals` or `#war`): it is the same as before.

Each link also opens paused if you add `-paused` (for example `#borrow-paused`).

### What I'd like your eye on
- **The numbers.** The interest is a flat percent for the whole loan, whatever the months. Six months at 11% from Corinth against 15 months at 6% from Athens: does that feel like a choice?
- **How often rulers offer and ask.** Rarely: in four years of `#caravan`'s town with a full treasury, one ruler did. With a low treasury, offers come four times as often. Too rare to notice, or right for something that should feel like an event?
- **The Loans tab.** It holds a lot: what stands between you, asking, and offering with three rows of choices. Is it readable, or should offering fold away?
- **The herald on the map.** It is drawn as a coin gift is (a caravan or a ship in the sender's colours), and its hover card names it ("Athens' repayment · 2,220 dr"). Should a loan's coin look different?

### Known rough edges
- A ruler's loan that falls overdue just stands overdue, with a line of news. What you can do about it (pressing them, seizing goods) is slice 28. The hook for it is in place (`stepOverdue` in `src/sim/loans.ts`).
- Your own overdue loan has no cost beyond no ruler lending to you until it's paid, and a smaller thank-you when it is.
- No demo shows a ruler's own offer: the dice bring them in their own time. I looked at one set up by hand (Corinth offering 1,500 dr at 10%, on the Ruler tab).
- The tabs on a city's page wrap onto two lines when a tab has a state word ("Trade · 2 open", "Loans · they owe").
- The sum, interest and months you choose in "Offer a loan" are kept while the game is open, not in the save.

### Measurements
Headless Chromium with software WebGL at 1920 × 1080, before (at slice 23's check-in) and after (with the new city look and slice 24 merged in):

| What | Before | After |
|---|---|---|
| Tests | 366, all passing | 390, all passing |
| Download (gzipped) | 2,081 KB: the game 456 KB, the prepared towns 1,625 KB | 2,347 KB: the game 498 KB (loans, the city look and slice 24), the prepared towns 1,849 KB (six more, three of them these) |
| First load (bare link) | ready at 2.4 s, first frame at 3.1 s | ready at 1.5 s, first frame at 2.4 s |
| Every demo's load | 91 demos, median 2.3 s, slowest 4.3 s, 11 over 3 s | 97 demos, median 1.6 s, slowest 2.5 s, none over 3 s (a quieter machine) |
| `#town` / `#richtown` | 799,168 / 910,707 triangles; 83 / 95 draw calls | the same |
| The new demos | — | `#borrow` 774,743 triangles, 81 draw calls; `#lend` 941,135, 87; `#repaid` 942,826, 92 |
| Work a frame before drawing | `#town` 14.6 ms, `#richtown` 22.8, `#richstreet` 20.0, `#rivals` 13.0 | 9.9, 9.0, 30.5, 8.5; `#borrow` 5.6, `#lend` 6.6, `#repaid` 9.3 |
| A save of `#richtown` | 186 KB | 187 KB |

Loans add nothing to draw in the city, and the coin on the map is drawn as a coin gift is. `#richstreet`'s 30.5 ms is noise from a few software-drawn frames on a shared machine: measured twice more it gave 14.6 and 24.1 ms here, and 22.1 and 39.4 ms on the main line without loans.

### What the review changed
A second pass went through every step above in the browser at 1920 × 1080, read the new code, and compared every earlier demo with the main line at opening and 900 ticks on (all 92 the same, and no ruler offers or asks a loan in any of them). The steps above have been corrected to match. What it changed:
- **Dates that agree.** A loan fell due part-way through a day and was settled the next morning, so in `#repaid` the loan said "agreed 23 November" and the archon paid on 24 November. A loan now falls due at the start of the day it names, and is settled that day: `#repaid`'s repayment is dated 23 November.
- **The reasons add up.** Every rate and length now says where it starts ("11%: from 12%, cordial (−2%), …"), and where a limit holds the terms it says so too: Troy's king is wary and shrewd, which would make 3 months, and the page now adds "no loan runs shorter than 6 months (+3 months)"; Athens' warm archon in `#repaid` reaches the 4% floor.
- **Sparta's dearer terms can be read.** The spec promised you could read why Sparta's terms are worse, but in `#borrow` Sparta only refused. Where a ruler refuses for his mood or for want of a route, the page now also shows what he would ask if he did lend, with every reason.
- **A ruler in need doesn't lend.** In `#lend`, Athens asked to borrow 2,000 dr from you while her own page offered to lend you 2,500 at 8%. A ruler who asks you for coin or owes you now has none to lend you, and says so. A ruler beaten in a war lately has half as much to spare and lends 2% dearer, and a ruler in any trouble (a war, a bad harvest, a lost war) no longer offers you a loan.
- **Loans never crowd out older deals.** A ruler's loan offer or ask was tried in the same pass as tribute, requests and offers, so one city's loan could stop a later city's request that month. Now loans come only in a month when no ruler made an older kind of deal, as the plan said.
- **The offer rows fit.** "Offer a loan"'s five sums wrapped onto a second line; each row of choices now fits on one.
- **One wrong capital.** "As things stand, sparta has no coin to spare" now keeps its capital S.

The tests number 392 after the review, all passing, and 404 on the main line (with the control panel, the city look and slice 25's walls), all passing. With the control panel in, the Money tab is the Administration tab: its loans list, "Repay now" and the Loans row sit there, and the debts chip opens it; I looked at them there in `#borrow` and `#repaid`. The browser check passes every loans step on the main line, and every earlier demo plays out exactly as on the main line without loans.

What I checked and did not change, for your eye:
- **Two lines about the same terms.** In `#borrow` the line for Corinth's terms and the news of Athens' answer show together under the top bar, and after you answer while paused, the old line stays until the game runs again (as every line under the top bar does).
- **Repaying early costs the whole interest.** Repaying Corinth a week after the coin arrives still costs 2,220 dr, as the spec says. It buys only "Greece knows you pay your debts".
- **Rarely seen.** In four years of `#caravan`'s town with a full treasury, one ruler asked to borrow (Athens, which lapsed); with the town's own treasury, none did.

## City look, stages 2 and 3 — trees, people and stonework (20 Oct)

The rest of the city-look plan is built and published: new trees and shrubs, a finer figure for every person in the streets, and stonework on the buildings. `#goods` shows it; `#goods-plain` shows the old look. Nothing in the simulation or the saves changed.

### What's new
- **Trees and shrubs.** Olives, stone pines, cypresses, scrub and broom have crowns of leafy clumps that shade as one soft mass, with boughs reaching into them. The olives and cypresses in courtyards and gardens are leafier too.
- **People.** Every walker has a rounded head with a nose, a neck, a waist, shoulders, folds in the skirt, hands and sandals. Each keeps what it carries and wears. This works on any walker's model as it is built, so soldiers, raiders and walkers yet to come get it without extra work.
- **Buildings.** Stone surrounds and sills round the windows, jambs and lintels round the doors, a cornice under the eaves and a string course between floors on two-storey houses.

### Your eye on
- Whether the window surrounds should stand out more. They are kept quiet so the streets don't look busy from above.
- Frame rate. The plants now have about three times the triangles and the people about two and a half times, and I still can't measure frames on this machine. If it stutters, tell me and I'll add a Graphics setting with a lighter option.

## Side slice — The control panel (19 Oct)

You asked for the menus to work more like the original game's, with everything you build in the side panel, and for the interface to look like a polished game rather than parchment and pills. The panel now has a tab for each kind of building, and each tab holds that kind's buildings over that part of the city's state. The build bar along the bottom is gone. The whole interface is marble and bronze, with two typefaces. It was built alongside phase 4 and touches nothing in the simulation: saves load as they are, the save format is unchanged, and every demo plays exactly as before.

### What's new
- **A tab for each kind of building**, as in the original: Population, Husbandry, Industry, Distribution, Hygiene and safety, Administration, Culture, Mythology and Military. Each tab shows its buildings as pictures in bronze-framed wells. The pictures are drawn from the town's own models when the game opens. Each well shows the building's cost, and is dimmed when the treasury can't pay or the city already has its one. Under the wells is the name and cost of the one in hand or under the pointer. Below that is the tab's part of the city:
  - **Population**: who lives here, their homes, work and homes in trouble (the old People tab).
  - **Husbandry** and **Industry**: what their buildings made last month, ware by ware, and how many of each are short of workers. Click a ware for its page, as on the old Goods tab.
  - **Distribution**: every good in the city (the old Goods tab), and how many homes the agora's vendors reach.
  - **Hygiene and safety**: water, fire and wear. **Culture** and **Mythology**: plays and blessings.
  - **Administration**: the treasury, the tax rate and the ledger (the old Money tab). **Military**: the barracks, walls and towers, and the companies (the old Army tab).
- **Keys work as before**, and a key also opens its tool's tab and lights its well. M opens Husbandry or Industry, K and G open Distribution, Z opens Administration or Hygiene and safety.
- **Road, clear, undo and the overlays** are four bronze bosses round the minimap. The overlays boss lists every overlay, with the open tab's own first.
- **North** is a gold N on the minimap's ring. It turns with the view, and a click on it faces north (N still does). The compass button is gone.
- **The tool in hand** says how to use it in a line at the foot of the view, where the build bar was.
- **The panel is always there.** Its hide button is gone, and it still steps aside for the map of Greece. Sound, saves and controls are small bosses above the minimap. I'd planned them for the top bar's right end, but there is no room for them there at 1280 wide. While the map of Greece is open, they go back to the top right corner. The cards they open, and the ledger, stand beside the panel rather than over it.
- **The look.** Every piece of the frame is drawn in code and lit from the upper left, with real shadows and hollows: veined marble, bronze, lapis with gold flecks, gold leaf. The tabs are carved marble tiles, and the open one is inlaid with lapis. Each tab's name is cut into a gilded lintel, and what you read sits on honed marble. The top bar, cards, chips, notices and tips are marble in bronze frames. The speed buttons are bronze bosses, with the one that's on in lapis and gold.
- **Two typefaces**, Cinzel for names and headings and Alegreya for reading. Both are under the SIL Open Font License and ship with the game's files (about 120 KB).
- **`#panel`** opens `#richtown` on the Husbandry tab.

### What to try
1. Open `#panel`. Click each tab and look at the buildings and what sits under them. Click a picture to pick a building up, and see the line at the foot of the view.
2. Press M a few times, then K, then Z, and watch the panel follow the keys.
3. Click the overlays boss (bottom right of the minimap) and pick one. Click the gold N on the ring after turning the view with Q.
4. Open the ledger ($), the controls (?), a household, and the map of Greece (Tab), and judge the cards and frames.

### Your eye on
- Whether the panel's head (the minimap in its ring, with the four bosses) is the right size, or should give more room to the tab below it.
- Whether the wells are too dark, and whether a picture plus a cost reads well enough without the name, which only shows under the wells.
- The colours of the cards next to the city: I kept the marble pale so they don't fight the land.

### Checked
- Typecheck and unit tests pass, including a new one that checks every building is in exactly one tab, so a building phase 4 adds can't be left without a button.
- The smoke test's build bar checks now drive the panel: wells, keys opening tabs, the bosses, the overlays list, and the fit at 1280 × 720. Main's slice 23 fixes are merged in.
- Screenshots at 1920 × 1080, 1600 × 900 and 1280 × 720. On a window up to 820 tall, the panel's head is drawn smaller.
- First load, measured locally in a headless browser. The bare link was ready at 1.8 s, with its first frame at 2.2 s; main was ready at about 1.3 s. That is about half a second slower than main, mostly the marble and bronze being made, which happens while a demo's town is fetched. All 92 demo links were ready at a median of 1.6 s, the slowest being `#offer` at 2.3 s, and none took over 3 s. The game's files are 587 KB gzipped, fonts included.

## Slice 24 — Raiders fought in the streets (20 Oct)

Raiders now come for something, and your soldiers can stand in their way. A band makes for your best-stocked granary or storehouse and then the tax office, carries off goods and drachmas, sets a building or two alight, and goes home. Each raider is a man of his own, and a company placed in the band's way fights it blow by blow: hoplites close with them, archers shoot, men fall, are wounded or killed and mourned at home, and a side that loses half its men breaks and runs. In a pinch the barracks can hire Cretan archers or Arcadian hoplites. You weren't here while it was built: every choice below is mine, from the spec's defaults.

What breaks, or moves:
- **Saves.** Saves from before load. The welcome back says what raids do now, and that companies fight them and the barracks can hire.
- **Raids are harder.** This is on purpose, as the spec says. A band is sized by its ruler and your city: the first ones are the old 8 to 12 men, but a town of 1,150 faces a Spartan band of about 29. A band goes for the stores and the treasury, not a field, and burns on its way. `#threat`, `#raid`, `#raiders` and `#aftermath` play differently from before, and `#raiders` now looks over the granary it plunders. In `#rivals`, `#rivalsmap` and `#rivalstreet` the threat's line now gives the band's size; the towns are otherwise the same.
- **Every other demo** opens, and plays 900 ticks on, exactly as before.
- **What reads differently.** The ledger can show what a band took under "Lost to raiders" ("Raided by Sparta · drachmas", "· wheat"), "Taken back from Sparta’s raiders", and "Hirelings’ pay". The Army tab's "Wounded" count is now real.

### What's new
- **Raiders' aim.** As a band comes in, it picks the nearest granary or storehouse holding 300 measures or more, then the nearest tax office. With no store worth it, it goes straight to the tax office; with neither, a field, as before. The threat and the town line say where it is making for ("making for the granary and then the tax office"), and how many men are in it ("Sparta’s raiders · 29 men · 12 days").
- **What they take.** At a store, the ware it holds most of: up to half, and at most 80 measures a man. At the tax office, a tenth of the treasury, at most 40 dr a man. They spend 4 days at each.
- **Fire.** They may set one building alight on the way in, and more on the way out once loaded (one for every 12 men, at most 4), but never the granary, storehouse or tax office they came to plunder. These are ordinary fires: watchmen fight them, and they can spread.
- **Raiders as men.** Each raider is a figure of his own in a loose pack round the band, in dark leather with a spear or torch, or a sack once loaded. Hover one: who he is, how hurt, what he is doing and what the band carries.
- **The fight.**
  - A company holding its ground, or drilling at its barracks, fights raiders who come near its banner.
  - Hoplites close with raiders within 4 tiles of the banner and hit hard behind their armour. Archers shoot at any raider within 8 tiles, and step back from one who comes at them. Raiders beat archers hand to hand.
  - A marching company that raiders come at stops and fights.
  - Every thrust and every arrow is drawn: hoplites lunge, archers lean into the draw, raiders stab, and arrows fly on a low arc.
- **Falling.**
  - A raider whose health runs out falls, lies a while and fades. His share of the loot is taken back on the spot: goods to the nearest store, drachmas to the treasury.
  - A soldier who falls is wounded or killed, about even odds.
  - The wounded lie a while, get up, limp back to the barracks and heal over a month.
  - The killed are mourned at home. Their house's story says so, its mood drops for a season ("Mourning Lykon, who fell fighting Sparta’s raiders"), there is one fewer living there, and a town line names him.
- **Breaking.** A band that loses half its men runs for its edge with what it still carries, and burns nothing more. A company that loses half of the men it began the fight with runs back to its barracks, and the raiders let it go. Once the fight is over, a company calls new men from homes to fill the places of the fallen.
- **The army's news.** The Army tab keeps the last dozen lines: a band broken, a man fallen, a company broken, hirelings walking off. The latest shows under the top bar for ten days, in bronze with a helmet.
- **Hirelings.** The barracks panel and the Army tab can hire a company:
  - Cretan archers (300 dr) or Arcadian hoplites (450 dr), then 9 dr a man a month, three times a citizen's pay.
  - Sixteen men march in from the nearest edge of your land in their own colours, the Cretans in green and the Arcadians in blue. They take nobody from your homes and bring their own arms.
  - If a month's pay is still owed when the next month turns, they walk off.
- **Slice 23's loose ends.** A dismissed company's unpaid wages are still paid when money comes. A barracks with no road beside it now says so, instead of saying no home can spare a man. Each company's barracks, gate and drill spot are now worked out once a tick, not once for each of its men.

### What to try
1. Open `#battle`. It is `#companies`' town, paused. Sparta's band of 29 is about 11 days from the west edge, the hoplites' banner is in hand and the Army tab is open.
   - Click the west road at the bridge (or just this side of it) to send the hoplites there. Then click the archers' row (the view stays at the bridge) and send them a few tiles behind.
   - Play at normal speed. The march takes the companies about 26 days (the tip says "about 26 days away"), and they stand in their ranks at the bridge about a week before the band gets there. Watch the fight at the bridge from close in, and hover a raider.
   - With both companies there, the band breaks after about half its men fall. Count the cost on the Army tab and in the town line, and find the houses that mourn their men.
2. In `#battle` again, try one company alone. In my runs, the outcome depended on where it stood:
   - Hoplites alone at the bridge's foot were broken: 12 raiders fell, and 4 of ours were killed and 5 wounded.
   - Hoplites alone on the road further east, below the cypress hill, broke the band for 2 killed and 2 wounded.
   - Archers alone at the bridge were broken and ran, and the band went on to the granary and the tax office.
3. Open `#looted`. It is `#raiders`' town, and nobody stood in the way.
   - A band of 32 is making off with 1,600 wheat and 235 dr, past the dairy it has just set alight; a watchman is on his way. On the west bank, the house it set alight on its way in has burnt down, and the fire took the house next door too (no watch post covers that street). The ledger is open on what was taken.
   - Watch the band walk out, then read the town line once it has gone.
4. Open `#hirelings`. It is the barracks town with no companies, paused. Corinth's band of 21 is gathering 16 days out, and the treasury is full.
   - Hire Arcadian hoplites and Cretan archers from the Army tab. Watch them march in from the edge in green and blue, then place them in the band's way.
5. Open any earlier demo, say `#companies` or `#richtown`: it is the same town as before.

Each link also opens paused if you add `-paused` (for example `#battle-paused`).

### What I'd like your eye on
- **Does a fight read?** In `#battle` at the bridge, can you tell raiders from hoplites, and see who is striking whom? The raiders are in dark leather and iron, your hoplites in red and bronze. The lunges and arrows are small, so I'd like to know whether they read at the distances you play at.
- **The balance.** In my runs:
  - Both companies at the bridge break Sparta's 29 every time I tried. What it costs depends on exactly where the banners stand: from 1 to 6 men killed and 2 to 5 wounded over six placements a tile or two apart (6 killed and 2 wounded with the clicks in step 1). The fight at the bridge lasts about ten days.
  - Hoplites alone at the bridge's foot are broken (4 killed). Further east, below the cypress hill, they break the band for 2 killed.
  - Archers alone are broken after taking two or three raiders down.

  I can't tell from numbers alone whether that is the right weight for one company against a band almost twice its size.
- **The cost of a raid let through.** In `#looted` the band takes 1,600 wheat and 235 dr, sets a house alight on its way in (it burns down and takes the next house with it), and sets the dairy and an architect's office alight on its way out (the watchmen put those out). Too harsh, or too light?
- **The fallen.** They topple and lie, then sink into the ground. The wounded get up and limp back. Is that enough to read as a fight's cost, or does it need more?
- **Time to get there.** From `#companies`' barracks to the west bridge is about 26 days' march. In `#battle` the companies are there about a week before the band. The threat gives a couple of months' warning, so there is time if you act when it comes. If you wait until the band is on the map, a company from the barracks can still meet it at the granary, but not at the bridge. Does that feel right?
- **Hirelings' price.** A company costs 300 or 450 dr, then 144 dr a month. Is that the right "in a pinch" cost?

### Known rough edges
- **Close quarters.** Men in a fight keep about a quarter of a tile apart. A crowd at the bridge's foot still overlaps a little.
- **The dead fade** into the ground after a few days; no one carries them home.
- **Mourning stays at home:** the shrine and the theatre don't mark it (as the spec says).
- **Breaking a band.** A band broken at the bridge may already have set a building alight on its way in.

### Measurements
Headless Chromium with software WebGL at 1920 × 1080, before (slice 23 with its review) and after. The machine was busy throughout with another thread's build and tests, so the frame work is noisy; I measured the old and new builds taking turns.

| What | Before | After |
|---|---|---|
| Tests | 366, all passing | 376, all passing (377 after the review) |
| Download (gzipped) | 2,101 KB: the game 476 KB, the prepared towns 1,625 KB | 2,223 KB: the game 486 KB, the prepared towns 1,737 KB (three more) |
| First load (bare link) | ready at 1.9 s, first frame at 2.9 s | ready at 1.1 s, first frame at 1.7 s (the page does the same work as before; load times move with the machine) |
| Every demo's load | 91 demos, median 1.9 s, slowest 2.4 s (slice 23's figures) | 94 demos, median 2.1 s. `#food` (3.2 s) and `#vendor` (3.0 s) went over 3 s on the busy machine, but match the old build when measured side by side |
| `#town` / `#richtown` | 799,168 / 910,707 triangles; 83 / 95 draw calls | the same |
| `#raiders` | 598,249 triangles, 57 draw calls | 691,296 and 63 (its view is now over the granary, with the band drawn man by man) |
| `#battle` | — | 923,107 triangles, 89 draw calls at opening; 783,042 and 70 close in on the fight (29 raiders, 13 arrows in the air) |
| Work a frame before drawing | `#town` 14.7 / 11.2 ms, `#raiders` 11.7 / 14.4, `#companies` 14.8 / 11.2 (two rounds) | 19.4 / 13.4, 8.9 / 12.4, 14.1 / 10.9: within the noise. `#battle` during the fight: 23 ms |
| A save of `#richtown` | 186 KB | 187 KB |

The fight's 23 ms needs a word. Headless software rendering draws a frame or two a second, so each of its frames steps several ticks of the game at once. In Node, a whole tick of the game while a band of 29 is on the map and fighting 32 soldiers costs 1.3 to 2.2 ms. That should leave a real browser well inside its frame, but I haven't seen it on a laptop: your eye on the frame rate during a fight would settle it.

### What the review changed
A second pass went through every step above in the browser at 1920 × 1080, read the new code, played the fights on in the simulation many times, and compared every demo with the build before the review. The steps above have been corrected to match. What it changed:
- **Time to place your companies.** Companies marched so slowly that in `#battle` they reached the bridge less than a day before the band, with no time to form up. They now march a quarter faster, about as fast as raiders run, so the march to the bridge takes about 26 days, not 33, and they stand ready about a week before the band arrives. A company sent when the band is first seen can still meet it at the granary. Drill and the men walking in from their homes go at the same pace as before.
- **Raiders don't burn what they came to steal.** In `#looted` the band set alight the very granary it had just emptied, so all the food was lost, not just what they carried off, and it set the tax office alight too. Every tax office a band reached caught fire. Now a band never lights a granary, storehouse or tax office; it burns houses and workshops on its way in and out. `#looted` now opens three days later, so you see the dairy alight beside the band as it leaves.
- **A broken company is let go.** When a company broke and ran for its barracks, the raiders kept cutting its men down from behind: 12 archers were killed in one run of archers alone. The raiders now let a broken company go, and its men stop fighting while they run.
- **The Army tab's sums.** Hirelings were counted twice, once under Hoplites or Archers and again under Hirelings. Now Hoplites and Archers count only your own citizens. A hired company still walking in from the edge no longer says "at its barracks".
- **Hovering a fight.** In the press, the hover often showed the soldier when the pointer was on the raider. Now whichever man is nearer the pointer is the one described. The band's line in a raider's hover now gives what it carries in full ("1,600 wheat and 235 dr"), not the wheat alone.
- **Saving after a fight.** Once hirelings had been paid, or loot taken back from fallen raiders, the town could no longer be saved and opened again: the save was refused as damaged. It now opens as it should, and I added a check for both.
- **`#hirelings` opens paused,** so the band doesn't walk on while you read the panel.
- **The older raid demos' steps.** `#threat`, `#raiders` and `#aftermath` read differently since this slice; I added a short note to slice 21's steps, and to slice 23's note on the march pace.

What I checked and did not change, for your eye:
- **Red against red.** Your hoplites wear Sparta's red, and so do Sparta's raiders' crests and shields, so close in at the bridge a fight can read as one red crowd.
- **The bridge doesn't narrow the fight.** Hoplites alone at the bridge's foot do worse than in the open below the cypress hill. Men can wade the river beside the bridge, so it doesn't hold the band to a narrow front, which runs against what you might expect.
- **Fights are long.** A fight at the bridge lasts about ten days.
- **One torch, two houses.** On the west bank, where no watch post reaches, a single fire burnt down two houses.
- **The band's line** in the threat names only its first target.

The frame work during a fight is as before: the fight itself costs a fraction of a millisecond a tick in the simulation; the occasional slow tick comes from other walkers finding their way and from the band arriving. A full measure after the review: every demo ready in under 3 s (94 demos, median 1.8 s, slowest 2.5 s); the download is 2,224 KB; `#battle` in the fight 785,000 triangles and 70 draw calls, and 20 ms of work a frame in headless software rendering (several ticks a frame, as above). `#companies` read 24 ms once in that run; measured again with the old build taking turns it was 11 to 13 ms in both. The measure's figures for the map of Greece had been repeating the city's last count since the new city look; they now count the map (305,842 triangles and 32 draw calls for `#greece`, not `#town`'s 799,168).

## City look, stage 1 — light, ground and materials (19 Oct)

You picked look A, Sunlit terracotta. Stage 1 of its plan (`docs/plans/2026-10-19-city-look.md`) is now the game's own look in every demo: light and colour, the ground, the building materials and the sea. Trees and people are stage 2, and cornices and window frames stage 3. Add `-plain` to any link (`#goods-plain`) to see the old look side by side. Nothing in the simulation or the saves changed.

### What's new
- **Light.** A warmer, stronger sun with softer shadows and a lower sky fill; ambient occlusion so buildings sit on the ground; a light bloom and a warm grade with a soft vignette.
- **Ground.** Smooth ground instead of triangle facets: grass in tufts with dry gold drifts and bare soil, ripples on the sand when you're close, bedding on rock. Roads have flagstones, plots have trodden earth.
- **Buildings.** Tiled roofs with rows and channels, plaster walls with grain and dust at the foot, slabs on paving and steps. Awnings, pots and cloth are left as they were.
- **Sea and smoke.** A deeper Aegean with turquoise only in the shallows, shore foam that breaks into drifting lace instead of a hard white band, and hearth smoke that drifts thin instead of white bubbles.

### Your eye on
- Whether the grade is too warm or too dark for you; it is one set of numbers and easy to move.
- Frame rate on your laptop. These shots ran on software graphics here, so I couldn't measure it. If it drops, the fallback in the plan is a Graphics setting that turns off ambient occlusion and bloom.

## Slice 23 — Bronze and the barracks (19 Oct)

The first slice of the new phase lets the city arm itself: copper in the hills, a mine and an armoury that make armour, a barracks that raises companies of hoplites and archers from your best homes, and banners you carry through your streets to march them (there is nobody to fight yet; raiders fought in the streets come next). You weren't here while it was built: every choice below is mine, from the spec's defaults.

What breaks, or moves: nothing you had is lost.
- **Saves.** Saves from before load, with no army. The welcome back says the city can now arm itself, and where.
- **Earlier demos.** Every earlier demo opens, and plays 900 ticks on, exactly as before, the ones with trade routes included. Greece's two new goods draw on no dice, so no route's history moved.
- **What reads differently.** A city's prices page now has eight goods, not six (copper and armour). The ledger and the Money tab gain a "Soldiers' pay" line once you have soldiers.

### What's new
- **Copper on the hills.** There are three copper outcrops: on the rocky north-west massif, in the east hills above the town, and on the headland. Pick up the copper mine (B twice) and they show as green bands over the ground, stronger where the rock is richer. A mine (150 dr, 6 workers) goes only where its ground averages enough copper, and beside a road. On the richest rock it digs about 200 measures of ore a month, fully worked. Its ox carts take the ore to the nearest storehouse.
- **The armoury** (B three times, 300 dr, 6 workers). It is a stone smithy with a forge under a lean-to, bellows, an anvil and a quenching trough. Its smiths hammer ten measures of copper into one set of armour: a bronze helmet, a breastplate, a round shield in the city's colour and a spear. Fully worked, that is up to 20 sets a month. Its porter fetches copper from the storehouse when its heap runs low, and its carts take the armour back. Storehouses show copper ore in baskets and armour on stands.
- **Copper and armour as goods.** Both are in the stock book and on the Goods tab, copper under "From the land" and armour under a new "Arms". On Greece's routes, Sparta sells copper, and Corinth and Athens sell armour, so a town with no copper can still arm its men. The Tyre ship doesn't deal in either.
- **The barracks** (B four times, 500 dr, 4 staff). It is a walled yard with a colonnade along one side, spear racks, a sanded drill ground and a banner pole by the gate. It holds four companies.
- **Raising a company.** On the Army tab, "Raise a company of hoplites" (from fine houses and villas) or "of archers" (from townhouses and better).
  - Sixteen men answer, one from each home, nearest first. Each man leaves his job and walks in from his home.
  - An archer is ready as he arrives. A hoplite waits for his set of armour, which the barracks' porter carries in from the stores, up to 32 sets a trip.
  - A company that can't fill says why, for example "No armour in the stores: 6 men are waiting for theirs".
  - Each soldier is paid 3 dr a month (a worker gets 2), on its own ledger line.
- **Who serves.** A home's panel says who of theirs serves: "Kleon, the head of the house, serves in the 1st company of hoplites; he has left his work". Hovering a soldier says who he is: "Theodoros, son of Xanthos · hoplite of the 1st company, of the house of Hieron, a villa".
- **Drill.** A company at its barracks drills on the ground. It stands in ranks, turns and marches a few paces across the ground and back.
- **Banners and marching.** Each company has a banner on a pole: the city's red, its own emblem (owl, boar, lion, bull and so on) and its number. Archers' banners have a fringe.
  - To pick a banner up, click it, click one of its men, or click its row on the Army tab. The banner rises over a gold ring, and a line at the top says what to do.
  - The tile under the pointer is marked green where it can go and red where it can't. Its tip says how many days away it is, or why not.
  - Click a street or open ground (or drag the banner there) and the company marches by the shortest way, round buildings. It stands in ranks there, facing the way it came.
  - Esc or a right-click puts the banner down. Orders work while paused.
- **The Army tab and the army chip.** The side panel has a fifth tab, Army. It shows the city's whole strength, then each barracks with its companies: men, wounded (none yet), where they are, what they are doing, and pay. It also has the "Back to barracks", "Dismiss" and "Raise" buttons. Dismissing sends the men home to their old work, and their armour back to the stores. A helmet chip under the top bar ("32 soldiers · 2 companies") opens the tab.

### What to try
1. Open `#bronze`. You are over the east hills in June 747 BC with the copper mine tool in hand, and the green bands show the copper.
   - A road runs up from the oil storehouse to a mine on the richest rock, and its ore carts are on the road.
   - The armoury stands lower down the oil road, beside the storehouse. The first sets of armour are already made: the Goods tab counts them, in the storehouse and on the armoury's racks.
   - Move the tool over the rest of the outcrop: the tip says how much a mine there would dig. Build a second one off the road's end.
2. Open `#barracks`. It is the same town four months on, with a barracks beside the armoury. A company of hoplites has just been raised.
   - Half the men are on the streets, walking in from the villas and fine houses. The other half wait on the drill ground for their armour, and the porter is on his way back with it.
   - Run it at normal speed: within a few days the porter arrives, and the men take their armour and start drilling.
   - The Army tab is open; watch the company's line change. Then raise a company of archers there.
3. Open `#companies`. Two full companies, hoplites and archers, are drilling at the barracks, and the hoplites' banner is in hand.
   - Click a street (the north street west of the barracks, say) and watch them march off in a file and form up there.
   - Click the archers' banner (or their row on the Army tab) and send them somewhere else. Bring one back with "Back to barracks".
   - Pause and give orders while paused.
4. In `#companies`, hover a soldier: he says whose son he is and which house he comes from. Find that house and click it to read who of theirs serves. Then dismiss a company and watch the men walk home.
5. Open any earlier demo (say `#rivals` or `#richtown`): it is the same town as before.

Each link also opens paused if you add `-paused` (for example `#companies-paused`).

### What I'd like your eye on
- **The soldiers up close.** Hoplites have a red tunic, a bronze helmet with a crest, a shield and a spear. Archers have an ochre tunic, a cap, a bow and a quiver. Do they read as soldiers, and as two different kinds, at the distances you play at?
- **The banners.** Each is a cloth on a tall pole with its emblem and "1ST", "2ND". Too big, too small, too plain?
- **The barracks and the armoury.** Does the barracks read as a place where men train? The armoury's forge glow sits under its lean-to and only shows from low down.
- **The copper's look.** It shows as green bands over the ground while the mine tool is in hand. On the east hills the map draws much of that ground as grass and scrub rather than bare rock, so the bands lie on both.
- **The pace.** Soldiers march briskly, a third faster than the townsfolk walk and a little slower than raiders run. In `#companies`, the hoplites take about six game days (six seconds at normal speed) to march from the barracks to the north street. *(Since slice 24's review they march quicker still, about as fast as raiders run: about five days to the north street.)* Raising a company took about 16 days in `#barracks`: the men walking in, then the porter's trip for the armour. Too slow for a city under threat, once raiders come?

### Known rough edges
- No miner figures at the mine yet; only its carts and the windlass show it is worked.
- A marching company follows its banner two abreast. On a narrow street the outer file brushes what stands beside it: in `#companies`, the watch tower by the oil road.
- The demos' town has more men out of work than jobs (317 of 476), so raising takes nobody from a short-handed workplace here. In a tighter town, a company of 16 empties a few workplaces.
- Hirelings, wounds and fighting come next slice; the Army tab's "0 wounded" is a placeholder for them.

### Measurements
Headless Chromium with software WebGL at 1920 × 1080, before (at the phase spec) and after:

| What | Before | After |
|---|---|---|
| Tests | 353, all passing | 366, all passing |
| Download (gzipped) | 1,946 KB: the game 437 KB, the prepared towns 1,510 KB | 2,081 KB: the game 456 KB, the prepared towns 1,625 KB (three more) |
| First load (bare link) | ready at 2.5 s, first frame at 3.4 s | ready at 1.9 s, first frame at 2.4 s (a quieter machine; the page does the same work) |
| Every demo's load | 88 demos, median 1.9 s, slowest 2.5 s, none over 3 s | 91 demos, median 1.9 s, slowest 2.4 s, none over 3 s |
| `#town` / `#richtown` | 799,168 / 910,707 triangles; 83 / 95 draw calls | the same |
| `#companies` | — | 914,290 triangles, 86 draw calls, with 32 soldiers and two banners |
| Work a frame before drawing | `#town` 13.0 ms, `#richtown` 14.2, `#richstreet` 17.4, `#rivals` 14.3 | 12.2, 11.7, 16.2, 12.7; `#bronze` 7.2, `#barracks` 9.8, `#companies` 11.8 |
| A save of `#richtown` | 183 KB | 186 KB |

The soldiers are drawn in the same batch as the walkers, and no bigger per figure than the largest walker, so a few hundred stay cheap. The banners are one cloth mesh and one set of poles, whatever their number.

### What the review changed
A second pass went through every step above in the browser at 1920 × 1080, read the new code, and played the demos on in the simulation. What it changed:
- **Who serves is named rightly.** When a house had no grown son, the man who went was often the husband of the woman who heads it, or the head's brother or cousin, and he was still called "the head of the house": 13 of the 32 men in `#companies`. Now he says so: "Phanias, husband of Archippe, serves in the 1st company of hoplites", and his hover says "Phanias, husband of Archippe". A son whose mother leads her part of the house is named by his father, her husband, where the house knows him.
- **Nobody over sixty is called up.** One of `#companies`' hoplites was 65. A house whose only grown man is past sixty now has nobody to spare.
- **Companies march briskly.** The banner used to go slower than anyone else in the streets, and at half the pace raiders run, so a company sent across the town would rarely have met a band in time. It now marches a third faster than the townsfolk walk and a little slower than raiders run: about six game days from the barracks to the north street in `#companies`, not ten. The men walking in from their homes go at the same pace as before.
- **A soldier says who he is while a banner is in hand.** `#companies` opens with the hoplites' banner in hand, and hovering one of the men then only said what a click would do. Now his name and company come first, so step 4 works without putting the banner down first.
- **The smoke check runs again.** A stray apostrophe stopped the whole browser check from starting.
- **Step 1's words.** It said four sets of armour were in the stores; the Goods tab counts the armoury's racks too, and shows six.

The new city look from the other line of work (light, ground, materials and the sea) was merged in before this review, so the screenshots I looked at were in that look. The measurements above were taken before it.

What I checked and did not change, for your eye: the forge's glow is still only seen from low down; there are still no miners at the mine; the marching column still brushes the watch tower by the oil road; a plain red board on a pole stands by the barracks gate beside the company's own banner, and may read as a second banner. Dismissing a company takes one click, with no "are you sure".

## Slice 22 — A world of rivals (19 Oct)

The last slice of the phase puts everything Greece now does into one town, and tunes it to read well over years rather than minutes. `#rivals` is a prepared town on the bay that trades with every city of Greece. Caravans from Corinth, Athens and Sparta walk its streets to the yard, and ships from Athens, Corinth and Troy come in to the quay. Athens' archon has a request open, Sparta's king has a threat running towards its deadline, and Troy and Athens are at war at sea. Every demo now opens from a town prepared when the game is built, rather than playing its history while you wait, so each one opens in about the time the bare link takes. The world's pacing was checked over six to eight years of play, left alone and looked after, and the wars and raids were retuned. The map and the city had a look-and-feel pass by screenshots. You weren't here while it was built: every choice below is mine, from the spec's defaults.

What breaks, or moves: no save is lost, and the save format is unchanged. A loaded town now runs as fast as a played one (before, a loaded town ran a little slower). The caravan change moves 12 of the earlier demos a little: `#caravan`, `#buywine`, `#prices`, `#request`, `#offer`, `#tribute`, `#threat`, `#raid`, `#raiders`, `#aftermath`, `#war` and `#peace`. Their people are the same, open and 900 ticks on. `#prices` and `#offer` open with 50 dr less (3,126 rather than 3,176) and are within 7 dr after 900 ticks. In the others only where the caravans stand differs. The other 73 demos open and play 900 ticks on exactly as before. In every game, Greece's wars now come closer together after a long quiet. In the demos' own Greece, the next war after `#caravan` opens is in August 746 BC, not December 743 BC (slice 21's "What to try" 4 is corrected below). A raiding ruler waits longer before threatening again. A price's reason "you sold them a good deal of it lately" now reads "what you sold them over a year ago is still felt".

### What's new
- **`#rivals`, a town trading with all Greece.** It is `#richtown`'s town (the villas, the quay, every chain) with `#caravan`'s road and yard, a watch post, and `#prices`' olive groves and press, so it has oil to sell.
  - Routes opened one by one as the treasury allowed, from May to December 747 BC: Corinth and Athens by road and by sea, Sparta by road, Troy by sea, and the Tyre ship as always. Each sells what its city buys; Troy's ship also brings fleece the town is short of.
  - It traded for a year from the first route, so prices have moved, the rulers remember the trade, and Greece has its own news.
  - Then three things were set up for the demo, and each says so in its words:
    - Sparta's king, left without his tribute and turned cold, threatens the city: 850 dr by 23 July, or his raiders come.
    - Troy declares war on Athens over "the grain ships in the straits". Their fleets stand off Andros.
    - Athens' archon asks for 1,000 wheat for the fleet, due by the war's end.
  - It opens on 3 June 746 BC with 1,411 people and 3,350 dr. Corinth's and Athens' caravans are at the yard, Sparta's is walking in from the west, the Tyre ship is loading at the quay and Troy's ship is in the bay.
- **Every demo opens from a prepared town.** When the game is built, each demo's history is played once and kept as a save, in the same format your own saves use. Each is checked: decoded, it must be exactly the town its history makes. The page fetches that one small file and opens it. `#prices` was ready at 3.6 s and is now ready at about 1.6 s; every demo is now under the 3 s budget (figures below). The bare link's own files didn't grow. Identical towns are kept once; twelve demos share `#town`'s.
- **The world's pacing, tuned** (figures below):
  - **Wars.** After a year with no war anywhere in Greece, the bar for war now comes down twice as fast: 10 a year, to −20 at most. Over 30 shuffled games of 12 years, the longest gap between wars fell from 4 years 4 months to 3 years 7 months, and a war comes about every two years.
  - **Raids.** A ruler whose band came, or turned back with nothing, waits two years before threatening again, not one. A hostile ruler threatens about one month in eight, not six. With Sparta kept hostile and nothing answered, `#caravan`'s town was raided five times in eight years and lost every farm and its granary, down to 729 people. Now it is raided three times, losing two of its three farms but keeping its granary, with 1,213 people at the end.
  - **Caravans.** A city's next caravan waits at home, in its own city, while its last one is still walking in or trading, and sets off once that one has turned for home. At most two of a route are in the streets, one coming and one going; before, up to three. In `#rivals` that is up to six caravans in town at once, two for each road.
  - **Left as they were:** how often requests, offers and tribute come, about two requests a year across Greece left alone and three looked after; and what gifts and routes are worth (see "your eye on").
- **The map.**
  - Armies, fleets, raiding bands, caravans, gifts and ships are drawn larger the farther out the camera is, up to 1.8 times at the opening view (an army on a road up to 1.25 times, since the roads between the cities are short), and life-size close up. Two armies facing each other grow backwards from their heads, so they don't run into each other.
  - Athens' fields no longer sit under its label: a city's fields go behind it only when nowhere else will do, and then as far back as they can.
  - A label that would stand under the top bar or the City button hangs below its city instead.
  - On windows narrower than 1440 pixels, the News of Greece starts below the City button; before, it covered it.
- **The city.**
  - Caravans waiting at the same gate stand one behind the other, not inside each other.
  - The "+N dr" floaters no longer drift over the side panel.
  - Homes rising a level cost less each frame: only what is rising is redrawn.
- **Rough edges from the reviews.**
  - A request made during a war is due by the war's end, and only asks for what could arrive by then.
  - The Karneia's page line no longer says Sparta begins no war while it is at war: "at war now, its army keeps the feast where it stands".
  - A town saved during a festival no longer announces it again when loaded.
  - The Rivals tab is built only when you open it.
  - The gift buttons share their road searches.
  - A price that is dear or cheap only because of a cap still names what pushed it.
  - "A good deal of it lately" is now "over a year ago is still felt".
- **Faster checks.** The tests take their demo towns from the same prepared towns, so the suite runs in 88 s rather than 111 s, with seven more tests.

### What to try
1. Open `#rivals`. It opens over the town in June 746 BC. Five notes stack at the top: Sparta's threat, the Tyre ship loading, Corinth's caravan trading at the yard, Athens' request, and a fleece shortfall. Run it at normal speed and watch the caravans come and go along the main street to the yard at its east end (top right), and the ships at the quay. Then decide: pay Sparta, or let his band come for the farms by the west edge, as in `#raid`.
2. Open `#rivalsmap`. It is the same town with the map open. Off Andros, Troy's green galleys face Athens' blue across the crossed swords, and the lane from Troy to Athens is red. Sparta's label carries the threat's seal and Athens' the request. Read the News of Greece, then click Athens' line: "At war with Troy … their fleets face each other", and the request "for their fleet". Open Athens' Rivals tab.
3. Open `#rivalstreet`. It is the same town, down the main street from beside the yard. Athens' caravan stands at the yard gate and Corinth's waits right behind it in the street; Sparta's is walking in from the west edge, out of sight.
4. Play `#rivals` for a few game years at the fastest speed, with the map open now and then. Answer things or don't. Left alone, the scratch runs saw about two requests a year from all four cities, Sparta's tribute demands, the one raid, and wars in Greece in June 743 and January 741 BC. Looked after (requests met, tribute paid, the threat paid off, a gift now and then), the rulers warmed and offers came as well.
5. Open any earlier demo (say `#prices`, `#raiders` or `#tribute`). It is the same town as before, ready in well under 3 s.

Each link also opens paused if you add `-paused` (for example `#rivals-paused`).

### What I'd like your eye on
- **The map from afar.** Travellers are now drawn up to 1.8 times larger at the opening view, armies on a road up to 1.25 times. In `#war` the two armies fill the road from Corinth to Athens. Too big, too small?
- **`#rivals`' opening.** Five notes stack at the top, and they stay while what they say holds: the threat for its 50 days, the request until you answer it, the fleece line while homes go without. Over the town they cover the main street; on the map they keep to one row each, but on a 1280 × 720 window they still cover Troy's label. Is it too much at once?
- **How often things happen.** A war about every two years; about two requests a year across Greece; a hostile ruler's raid at most about every two and a half years. Too quiet, too busy?
- **What gifts are worth against routes.** A fair gift for `#rivals`' town is about 700 dr. In the scratch runs its roads to Sparta and Corinth earn 500 to 1,450 dr a year each. Athens takes little: it buys wheat and meat, which the town eats. Troy's ship costs 150 to 300 dr a year, since it is mostly fleece bought in. I left both as they are.
- **Two caravans of a route in the streets.** Most days, one is coming in while the last goes home. Should the next wait until the last has left the map?
- **Money in `#rivals`.** Left alone for four years (found in the review), its treasury grows from 3,350 dr to about 32,000 dr, some 7,000 dr a year from taxes and trade, so a fair gift of about 700 dr soon costs little. Is the town too rich for Greece's prices to bite?

### Known rough edges
- **The prepared towns cost build time and disk.** A build that has to prepare the towns takes about 30 s more (a few seconds when nothing they come from has changed). The prepared towns add about 7.5 MB (1.5 MB gzipped) to the published files, but each is fetched only when its demo is opened.
- **A demo's first few seconds run its simulation a little slower.** The browser hasn't yet warmed up the code that, before, it had just run for the whole history. It settles in seconds.
- **Athens' fields** lie behind and to the left of the city; at the opening view they touch the left end of its label. The land south of Athens is sea.
- **Not done this slice**, left for later:
  - a demo for a raid from the sea (Troy is busy with its war in `#rivals`);
  - `#famine`'s small payoff;
  - the price arrows' colours;
  - the yard's blank wall on a slope;
  - a land and a sea route to one city counting an offer's limit separately;
  - the band camping about 70 days in `#threat`.
- **The sea war in `#rivals`** is Troy against Athens, set up for the demo, as `#war`'s is. The war request and Sparta's threat are set up too, and say so.
- **Browsers don't all do the same sums** (found in the review). A few of the maths functions the simulation uses (sines and powers, for the wild herds' wandering and some curves) can differ in the last decimal place between one browser and another, and between a browser and the build, where the demo towns are prepared. Each demo opens as exactly its prepared town. But a town played on in two different browsers can slowly drift apart: where the deer graze, then what the hunters bring home. Nothing breaks and no save is lost. It matters only for replaying a game exactly, so it is left for later.

### Measurements before and after
Headless Chromium with software rendering, so frame rates mean nothing; "before" is `bfbd838` (the end of slice 21's review). The work a frame swings by a ms or two from run to run.

| | Before | After |
|---|---|---|
| Tests | 346 in 28 files, 111 s | 353 in 30 files, 88 s (7 new: prepared towns and `#rivals`) |
| The game's own files | 4 files, 1,446 KB raw, 429 KB gzipped | 4 files, 1,457 KB raw, 433 KB gzipped |
| The demos' prepared towns | | 58 files, 7,655 KB raw, 1,510 KB gzipped (the largest 38 KB gzipped), each fetched only when its demo opens |
| Building the game | about 1.5 s | about 30 s when the towns must be prepared, about 2 s when they are cached |
| Load, bare link, ready and first frame (page clock) | 1.50 s, 1.90 s | 1.62 s, 2.03 s (the same work: run-to-run noise) |
| Demo loads, ready (page clock) | 11 over 3 s, the slowest `#raiders` 3.70 s, `#prices` 3.59, `#tribute` 3.53 | none over 3 s: median 1.49 s, the slowest `#raiders` 1.88, `#peace` 1.86, `#routes` 1.80; a prepared town is fetched in 10 to 50 ms and opened in 15 to 35 ms |
| `#town`: triangles and draws, save | 799,168, 83; 145 KB | the same |
| `#richtown`: triangles and draws, save | 910,707, 95; 183 KB | the same |
| `#rivals`: over the town, on the map, down the street | | 960,009 triangles, 99 draws; 309,626, 33; 915,189, 96. Ready at 1.51 s, 1.66 s, 1.56 s |
| The map of Greece, first open: built in | 0.24 s | 0.29 s |
| Map pages: triangles and draws | `#war` 314,506, 33; `#festival` 306,230, 34; `#raid` 306,218, 26 | `#war` 313,882, 31; `#festival` and `#raid` the same |
| Work before drawing a frame, running, in the first 8 s after opening | `#town` 7.75 ms, `#richtown` 10.43, `#richstreet` 12.61, `#villas` 6.91, `#blaze` 5.48, `#caravan` 2.75, `#tribute` 5.85, `#raid` 6.28, `#raiders` 7.41, `#war` 7.21, `#festival` 5.01 | `#town` 10.67, `#richtown` 11.54, `#richstreet` 12.51, `#villas` 8.72, `#blaze` 9.09, `#caravan` 3.10, `#tribute` 4.69, `#raid` 6.52, `#raiders` 7.46, `#war` 5.64, `#festival` 4.33; `#rivals` 10.51, `#rivalsmap` 5.14, `#rivalstreet` 12.39 |
| The simulation, 1,200 ticks of a loaded town against the same town played (Node) | loaded about a fifth slower | the same |
| `npm run smoke` | | about 26 min |

About the frame work: the higher figures for `#town`, `#villas` and `#blaze` are measured in the first seconds after a demo opens, while the browser is still compiling the simulation's code. Even a town that has just played its history runs its first 300 ticks about three times slower than later ones. Before, playing the history did some of that warming up while you waited. Now all of it lands in the measured seconds, so the open is faster and the first seconds a little heavier. In Node, from a fresh start, a prepared `#town` and a played one run at the same speed after their first 300 ticks.

The world's pacing, from scratch runs outside the repo:

| | Before | After |
|---|---|---|
| Wars, 30 shuffled games of 12 years: a year; gap median, 9 in 10 under, longest | 0.43; 18, 40, 52 months | 0.49; 18, 32, 43 months |
| The demos' own Greece: wars at month (from the game's start) | 33, 93, 106, 141 | 33, 53, 87, 106, 141 |
| `#caravan`'s town, Sparta kept hostile, nothing answered, 8 years: raids at month; people at the end | 11, 29, 47, 65, 90; 729 (every farm and the granary burned) | 14, 43, 73; 1,213 (two farms burned, the granary kept) |
| `#caravan`'s town, 8 years: caravans of one route in town at once | up to 3; two or more on 2,829 of 2,880 days | at most 2; two on 2,319 days |
| `#caravan`'s town, 8 years: requests left alone, looked after; tribute demanded | 16; 16 (18 answered); 3 | 16; 17 (19 answered); 3 |
| `#rivals`, 6 years left alone: requests, tribute, threats and raids | | 13 requests (Athens 5, Troy 4, Corinth 2, Sparta 2), 3 tribute demands, 1 threat and its raid (set up) |
| `#rivals`, 6 years looked after | | 14 requests met, 2 offers, 1 tribute paid, the threat paid off, 3 gifts; moods between −11 and +35 |
| `#rivals`, routes' yearly earnings | | Sparta's road 500 to 1,450 dr; Corinth's road 400 to 1,300 and its sea route 0 to 1,000; Athens 0 to 160; Troy −300 to +170 |

### What the review changed
I went through every step above in the browser at 1920 × 1080 (and 1280 × 720 for the notes), looked at the screenshots, and played `#rivals` on for four years outside the browser. What I changed:
- **The armies on the map no longer reach into the cities.** At 1.8 times their size from afar, `#war`'s two armies at Megara stood in Corinth's and Athens' streets, as if the fighting were there. An army on a road now grows at most 1.25 times; fleets, bands, caravans and ships still grow up to 1.8 times.
- **A war's crossed swords answer the pointer first.** With the armies smaller, pointing at the swords between them showed Athens' army instead of the war.
- **On the map, the notes under the top bar keep to one row each, in a narrower column** (the whole line shows when you point at it). The five notes `#rivals` opens with stay while what they say holds, not for a few seconds as I first wrote, and on the map they hid Corinth, Athens, your city and the war on a 1280 × 720 window, and Troy's label at 1920. Now everything shows at 1920; at 1280 × 720 Troy's label is still partly under them.
- **`#rivalstreet` looks from a little further round.** The watch post hid Athens' caravan at the yard gate; now you see it there, with Corinth's waiting right behind it in the street.
- **The frame-work measurement now lets each demo run 10 seconds first.** I measured the build before this slice and this one side by side over the same stretches of time: both are heavier in their first 8 seconds (the browser still compiling), and the same after that (`#town` about 5 ms both, `#villas` about 5.6 both, `#blaze` swinging between 3 and 9 ms in both). So the higher "after" figures above were the first seconds plus noise, not a new cost. With the warm-up: `#town` 9.45 ms, `#villas` 11.32, `#blaze` 5.09, `#richtown` 5.78, `#richstreet` 6.68, `#rivals` 10.19, `#rivalsmap` 5.67, `#rivalstreet` 8.58 (each over only 8 to 18 slow headless frames, so they swing by a few ms).
- **Corrected words:** a city's next caravan waits at home, in its own city, not at the edge of your map.

What I checked and found as described: every demo with a history (86) opens as exactly its prepared town, and plays 900 ticks on exactly as the town its history makes; the published files load each town from beside the page (they are ordinary JavaScript files, like the game's own), and if a town's file is missing the page plays its history instead, ending in the same town; a fresh copy of the project with nothing prepared builds the same files in about 35 s; every demo is ready in under 3 s (median 1.5 s, slowest `#pasture` 2.0 s). Left alone, `#rivals` had Sparta's band come in August 746 BC and burn a farm, Troy beat Athens at sea by September, a war between Sparta and Troy in June 743 BC, and two to four requests a year; the treasury balanced every month. I can't tell you whether it feels alive: that is for you to judge.

### What the phase review changed
I played the whole phase the way you would. I started from the bare link and built a town by hand, with the tools: roads, plots, a fountain, farms, a granary, an agora, olive groves and a press. Then I added a caravan yard at the town end of the north road, the road to Corinth, a trading post on the bay and the sea route to Athens. I played it for about six game years (750 to 744 BC), saving it and loading it again five times, until all of Greece had come to it. Then I opened one "What to try" step from each slice of the phase, and `#town`, `#richtown` and `#quay`. What I changed:
- **The same sums in every browser.** This mends the rough edge above, "Browsers don't all do the same sums". The game now works out its own sines, powers and the like, the same way everywhere, so a town plays on the same in any browser as in the build that prepares the demos. Every demo opens as exactly the town it did before, and plays on exactly as before. I also checked six of them (`#town`, `#richtown`, `#caravan`, `#raiders`, `#rivals`, `#war`): each plays 900 ticks the same in the browser as in the build.
- **A straight road drag lays a straight road.** Dragging a road along a row between two roads already there could lay only its two end tiles: the road tool took the way round the block on the roads you had. In one of my hand-built towns that left 17 plots with no road beside them, and newcomers stopped coming at about 300 people. Now a straight drag over open, dry ground lays the straight line. Other drags still find their way round as before.
- **Plots with no road to the edge say so.** When newcomers had no room only because the empty plots had no road to the edge of the map, the side panel and top bar still said "mark out more plots". Now they say the plots have no road beside them that leads to the edge, and to lay a road past them.
- **A slope too steep says what it is too steep for.** Placing a caravan yard, a farm or any building other than a home on a steep slope said "Too steep for a home". Now it says "Too steep to build on", and that roads, olive groves and vineyards can take a slope like that.
- **The controls card knows about Greece.** It now lists Tab for the map of Greece, the caravan yard as the fourth press of G, pointing at a caravan, a ship or a raider to see who they are, and clicking the caravan yard or the traders chip.
- **The notes on the map keep clear of Troy and of a city's page.** With a city's page open, the notes under the top bar took the wider column meant for a household's panel, and at 1920 they covered Troy's label. Now they don't. On windows up to 1440 wide they are narrower, so Troy's label shows at 1280 × 720 (an open point from the slice). Up to 1400 wide, with a city's page open, they start beside the page rather than under it.
- **`#rivals` opens over the whole town.** Before, it used `#richtown`'s view, which showed much empty ground. Now you see the town under the notes, from the farms by the river to the caravan yard at the east end, with the quay and the Tyre ship below. `#rivalsmap` opens with the map as before.
- **Athens' request in `#rivals` can be met.** The archon asked for 1,000 wheat by the war's end, 90 days away, but goods take about 95 days to get from this town to Athens, so even sent at once it could only arrive late. Greece's own war requests already check this, and ask for coin when goods couldn't arrive in time. The demo now does the same: Athens asks for 450 dr within 60 days, "to pay their soldiers". So in steps 1 and 2 of "What to try" above, the request is for coin, not "for their fleet". Only `#rivals`, `#rivalsmap` and `#rivalstreet` change.

What I saw in the hand-built town, as it happened:
- In November 749 BC I opened the road to Corinth (the yard would only go where the north road meets the town: the hillside along it is too steep). Corinth's caravan of five donkeys came down the north road a month later.
- From December 748 BC I sold oil to Corinth. The page showed its price sliding from 91 to 71, "you sold them 2,060 in the last year".
- Requests came about twice a year, from Athens, Corinth, Troy and Sparta. Each page said when what I sent would arrive.
- I took Athens' year's deal for wheat. Athens' page kept count of what I had sold and what keeping my word needed, but I sent only 270 of the 1,000, and it cost me 20.
- I refused Sparta's tribute twice, and Queen Helen went hostile. Her threat gave four months, "pay 300 dr or send 400 oil". The red chip counted down the days as her band gathered and marched. Eight raiders came in at the west edge, burned a wheat farm and carried off 270 wheat. Pointing at them said who they were and where they were going.
- Afterwards her anger was partly spent (+25). A gift of 250 dr brought her from cold to wary, and before the year was out she was asking for oil like anyone else.
- Corinth went to war with Athens in February 744 BC. The trade went on, and the news said why prices moved.

Things I noticed and left for you, since each changes how the game plays:
- **Money: tight early, easy late.** My hand-built town of 455 people, at heavy taxes, sat at 0 to 100 dr for a year, unable to pay all its wages. The money line said so and pointed to taxes. Selling oil to Corinth turned it round: 1,600 dr a year later, 4,500 two years after that. At the other end, `#richtown` on its own grows about 5,000 dr a year from taxes against wages, and `#rivals` about 7,000, of which Greece's trade is about 2,000. So most of the late surplus comes from the town, not from Greece. Tuning taxes or wages would move every demo, so I left them as they are: is it too easy late, too hard early, or both?
- **Fire early on.** My first scripted town had its watch posts waiting behind other building. A fire in its first year went from house to house, from 146 people down to 13. The warning lines were there, saying where no watchman had seen the fire.
- **Harsh taxes.** In the town stuck at 300 people (above), harsh taxes halved it to 94 within two years.
- **Lumpy money.** The drachmas still jump by a month's taxes and wages at a time. The arrow beside them shows last month's net, so "▲ −138" can show together for a moment.
- **Sending takes time.** In my town, 400 wheat took about 85 days to reach Corinth next door, mostly porters fetching it from the granaries and carrying it out of the town. A request due in 56 days that I answered with 18 days left arrived late (+13 rather than +25), as the page had said it would.
- **A whim that flickers.** Once in four years of `#caravan`, a fickle ruler's mood crossed from cordial to warm and back within a month, giving two news lines that contradict each other.
- **#rivals' notes over the town** still cover the top of the main street on a 1280 × 720 window, with the side panel open.

Measurements across the phase, headless Chromium with software rendering (frame rates mean nothing):

| | Phase start (slice 15's "before") | End of slice 22 | After this review |
|---|---|---|---|
| Tests | 234 | 353 | 357 |
| The game's own files | 3 files, 1,205 KB raw, 351 KB gzipped | 4 files, 1,457 KB, 433 KB | 4 files, 1,466 KB, 437 KB |
| The demos' prepared towns | | 58 files, 7,655 KB, 1,510 KB gzipped | the same |
| Bare link, ready and first frame | 2.81 s, 2.36 s | 1.62 s, 2.03 s | 1.93 s, 2.38 s in one run; side by side with the build before this review, four loads each, ready in 1.50 to 1.76 s before and 1.50 to 1.83 s after (the map is worked out about 60 ms slower with the game's own sums) |
| Demo loads, ready | | median 1.49 s, none over 3 s | median 1.72 s, slowest `#famine` 2.46 s, none over 3 s |
| `#town`: triangles and draws, save | 799,168, 83; 140 KB | the same; 145 KB | the same; 145 KB |
| `#richtown`: triangles and draws, save | 910,707, 95; 177 KB | the same; 183 KB | the same; 183 KB |
| `#rivals` as it opens | | 960,009 triangles, 99 draws | 1,013,764, 114 (it now shows the whole town) |
| The map of Greece: first open, built in; `#war`'s triangles and draws | 0.37 s; | 0.29 s; 313,882, 31 | 0.26 s; the same |
| Work before drawing a frame, after 10 s running | | `#town` 9.45 ms, `#richtown` 5.78, `#rivals` 10.19, `#rivalsmap` 5.67 | `#town` 10.55, `#richtown` 7.45, `#rivals` 9.09, `#rivalsmap` 4.91, `#greece` 3.91 (8 to 17 slow frames each, so they swing by a few ms) |
| My hand-built town's save, six years on | | | 79 KB |

What I checked and found as described: requests begin only after the first route; no threat came before the first year of trading was out, and there were four months from the threat to the raid; refusing a cold ruler's tribute led to the threat, as the page said; a hostile ruler's page names every reason with its date; prices name what moved them; the side panel and minimap step aside while the map is open and come back when it closes; every demo is ready in under 3 s. I can't tell you whether any of it feels right: that is yours to judge.

### The phase, all told

Phase 3, "Greece beyond the walls", in eight slices. What you can do now that you couldn't at the end of phase 2:
- **Slice 15, the map of Greece.** Press Tab (or the Greece tab) and the city gives way to a toy Aegean on a table: Athens, Sparta, Corinth and Troy, Tyre far off, and your own Nea Argos, which you can rename. Hover or click a city to meet its ruler: a portrait, two traits, a mood with every reason behind it, and what the city makes and wants. Rulers are shuffled every new game.
- **Slice 16, routes and traders.** Build a caravan yard (G four times), open a road to Corinth or Sparta or a sea lane to Athens, Corinth or Troy, and their donkeys walk your streets and their ships tie up at your quay to buy and sell, within a yearly limit. Buying brings in goods you don't make, and you can watch every trader on the map on their way.
- **Slice 17, prices that move.** Every city has its own price for every good, moved by what you sell and buy there and by its harvests, each with an arrow, a reason and a year's chart. Sell oil to Corinth visit after visit and watch it slide, and say why.
- **Slice 18, rulers who remember.** Send gifts of coin or goods (goods leave by caravan or ship you can follow), see the mood lift with its reason and fade over time, get gifts back from a warm ruler, and see a hostile one close their road until you mend it.
- **Slice 19, favours, offers and tribute.** Rulers ask for goods or coin by a deadline, offer year-long deals, and demand tribute. Promise, send, refuse or let it lapse, and each is remembered: a broken promise longest.
- **Slice 20, raiders at the edge.** Refuse a cold ruler and a threat follows with its price and deadline; a band gathers and marches on the map with a countdown; then raiders come in at your edge, burn a field and carry off its stock. Pay them off, even late, and they turn back.
- **Slice 21, Greece goes on.** Rivals quarrel and go to war with each other, armies and fleets on the map, prices moved in both cities, both sides asking you for help; festivals at Corinth, Athens and Sparta; harvests in the fields; and the News of Greece.
- **Slice 22, a world of rivals.** `#rivals` is a town trading with all of Greece, with a threat running, a request open and a war at sea. Every demo now opens from a town prepared when the game is built, so each is ready in under 3 seconds.

**Recorded for later**
- From the spec: colonies and vassals; war (soldiers, walls, fighting raiders off, fleets guarding and raiding the sea lanes); Egypt and more cities; the gods in diplomacy; alliances; goods that only come from abroad (bronze, marble, timber).
- From the way:
  - no demo of a raid from the sea (Troy's raids work, but you have to wait for one);
  - `#famine`'s payoff is small, because the town keeps most of its wheat;
  - price arrows are red for rising and blue for falling, whatever that means for you;
  - the caravan yard shows a tall blank wall on a slope;
  - a refused band camps at Sparta about 70 days in `#threat`, because of the first-year rule;
  - with a land and a sea route to one city, an offer's limit is counted separately for each;
  - sending goods takes about three months, mostly porters walking;
  - a fickle ruler's mood can cross a line and back within a month, giving two lines that disagree;
  - there is no debt or loan, so a town at break-even sits at 0 dr with wages owed;
  - plots can still be marked out with no road to them (the note now says why nobody comes);
  - at 1280 × 720, `#rivals`' notes cover the top of the main street;
  - the drachma arrow and its floater can disagree for a moment ("▲ −138").
- Still open from phase 2: early fire, harsh taxes' bite, lumpy tax money, the ship's pace.

**Budgets that moved** (end of phase 2 against now)
- **Download:** the game's own files went from 351 KB to 437 KB compressed, for the map of Greece (in its own file, fetched the first time you open it), the traders, the rulers and the raiders. The prepared demo towns are a further 1.5 MB, but each demo fetches only its own small file, and the bare link fetches none.
- **Load:** the bare link is ready in about 1.5 to 1.9 s. Every demo is now under the 3-second target (median about 1.7 s, the slowest about 2.5 s); before this phase, eleven were over it, `#prices` at about 4 s.
- **The map of Greece** builds in about a quarter of a second the first time it opens, and draws about 314k triangles.
- **Triangles and draw batches** in `#town` and `#richtown` are unchanged. `#rivals` is the most yet as it opens, about a million triangles, because its view takes in the whole town.
- **Saves** grew a few KB for Greece (`#town` 140 to 145 KB).
- **Time per frame** before drawing is within noise of the end of phase 2 once a town has warmed up.
- **The same sums everywhere:** the game now does its own maths rather than the browser's, so a town should play the same in any browser and a save carries on the same way wherever it is opened. Checked between Chrome and the build's own engine; Firefox and Safari aren't tested here.
- **Frame rate on a real laptop is still unmeasured.** Only your machine can say whether `#rivals` and the map hold 60 frames a second.

**Questions for you**
- Does Greece feel alive, and can you always see where you stand with each ruler and why?
- Is money tight early and too easy late? A 455-person town at heavy taxes sat at 0 for a year until it sold oil, while `#rivals` grows by about 7,000 dr a year, which makes a 700 dr gift cheap. Should it be retuned, and should there be loans?
- How often things happen: a war about every two years, about two requests a year, a hostile ruler's raid at most every two and a half years. Too quiet or too busy?
- Is one raid's cost (a field burned, its stock taken) the right size of setback?
- Are the travellers on the map the right size from far out, and is `#rivals`' opening, with five notes at once, too much?
- Phase 2's open questions still stand: should early fire be gentler, and should tax money come in smoothly?
- What should the next phase be?

## Slice 21 — Greece goes on (18 Oct)

Greece now has a life of its own. The rulers feel something about each other as well as about you, and those feelings move. Rivals who fall far enough out go to war: their armies march out on the map, the way between them closes, and food grows dear in both cities. Each side may ask your city for help, and whatever you trade with one side, the other remembers. The festivals come round at their seasons, each city's fields on the map show its harvest, and a News of Greece list tells you what happened, newest first. You weren't here while it was built: every choice below is mine, from the spec's defaults.

What breaks, or moves: no save is lost. A town saved before this slice opens with no wars and no feuds, every ruler feeling about the others as before; from there Greece goes on by itself, and the welcome back says so. A town with no trade route plays exactly as before: its city is the same tick for tick. Its Greece may now have wars and festivals, which show on the map, but they don't reach the lines under its top bar until it deals with Greece. 72 of the 82 earlier demos open and play 900 ticks on exactly as before. The 10 that trade with Corinth or Athens (`#caravan`, `#request`, `#tribute`, `#threat`, `#raid`, `#raiders`, `#aftermath`, `#athensship`, `#promise`, `#famine`) earn a little more, with the same people. In their Greece the dice start a war: Corinth declares war on Athens on 1 December 748 BC and wins in May 747 BC, so meat sells dearer in Corinth and food in Athens (11 dr more by 900 ticks in the Corinth towns, 61 to 109 dr in the Athens sea towns). In `#promise`, Athens' archon now asks for 800 wheat rather than 1,000, because wheat is dearer in Athens after its war. Two smaller changes everywhere: a price's reason now names what pushed it the way it went, and the twelve lines of news kept for Greece now include its festivals and wars.

### What's new
- **Rulers' feelings for each other.** Each ruler's feeling for each of the other three is made of reasons, like their mood towards you:
  - the old rivalries of the cities, fixed: Athens and Sparta "old rivals for the leadership of Greece" −20, Sparta and Corinth "old friends in the Peloponnese" +10, everyone and Troy −10;
  - the ruler's own liking or dislike, from the start of the game;
  - what has passed between them lately: quarrels ("a quarrel with Athens: cattle raided across the border") and friendships ("a friendship with Corinth: sacrifices together at Delphi").

  Quarrels and friendships come by the dice, about one month in eighteen and one in sixteen for each pair. They fade over eighteen months. Warlike and proud rulers quarrel more, generous ones less. A proud ruler takes a quarrel harder, a steadfast one more lightly, and a fickle one forgets in half the time. Their feeling in a word: friends, cordial, cool, feuding (−25 or worse), at war. A feud starting or being made up is news.
- **War.** From the third year of a game, a pair whose feelings average −35 or worse may go to war: one war at a time in Greece, none within six months of the last, and the same pair not again within three years. After a year with no war anywhere in Greece, the bar comes down a little each year (to −30, then −25, a feud), so old grudges come to blows in the end. With the dice as they are, that is about one war every two and a half years, and no game goes much more than four or five years without one. The angrier ruler declares it, naming the grievance. It lasts three to six months. It ends in a weary peace about one time in three; otherwise in a defeat, the bigger and the warlike city more likely to win. A battle half-way through hints at the end: "A battle at Megara between Sparta and Athens: Athens had the better of it."
- **On the map.** Each side's army marches out along the road between them: a phalanx of hoplites in their city's colours, more ranks for a bigger city, a banner at the head. Wars with Troy are fought by fleets of three galleys on the sea lane. The armies stand facing each other short of the meeting place (Megara between Athens and Sparta, Mantinea between Sparta and Corinth, off Aegina for Corinth and Troy), with crossed swords between them. The road between the two cities is drawn in red: closed. When it ends, the armies walk home. Hover an army for whose it is and what it is doing, or the swords for the war: since when, why, and the wheat and fleece prices in both cities.
- **Prices.** While a war lasts, wheat, meat and cheese grow about a quarter dearer in both cities, and fleece a third, over about three weeks. A defeat leaves the loser's food and fleece about one and a half times their usual price (oil and wine less so: stores plundered, flocks driven off; its fields, and so its next harvest, are spared). It wears off over months as any push does, two thirds gone in five. The winner's spoils ease its own prices. The reason under each price says so: "their war with Athens", "they lost their war with Athens", "the war with Athens, lately ended". Where two things push a price the same way, as a festival in a city that has just lost a war, the reason names both, the bigger first.
- **Your part.** A ruler at war asks your city for help much more often, about one month in two and a half, for wheat, meat, cheese or fleece for the army: "for their army: they are at war with Athens". Both sides can ask at the same time. Trading with one side cools the other. Each of its traders who buys or sells at your city adds to one memory, "you trade with their enemy Corinth (3 visits during the war)": −3 a visit, at most −15, fading over a year from the last visit. Anything you send to one side, as a gift or because they asked, costs you −8 with the other as soon as you send it ("you sent 250 dr to their enemy Corinth during the war"); the request card and the gift buttons of a city at war say so before you send. A proud ruler takes both half as hard again.
- **Festivals.** The Isthmian Games at Corinth in April, the Panathenaia in Athens in July and the Karneia in Sparta in August, each for a month, every year. From a fortnight before and while it lasts, wine and meat grow about a third dearer there, easing within a season. News comes as each begins. On the map, banners stand round the city and smoke rises from its altar. A gift that arrives while it is on counts half as much again (twice for a pious ruler), and the gift buttons and the memory say so: "for the Panathenaia". Each button reckons with when that gift would arrive, so one sent just before a festival shows the festival's worth, and one that would arrive after it doesn't.
- **Harvests on the map.** Each ruled city has a patch of fields beside it, coloured by its harvest. From June the colour shows how the coming harvest looks; the rest of the year, how the last one was. It runs from parched brown to rich gold. Hover the fields for the harvest in words and the price of wheat there.
- **City labels** carry crossed swords while the city is at war and a wreath while its festival is on.
- **A city's page.** Under the mood, a few lines say whether the city is at war (since when, where the armies are), whether a war has just ended and how, whether its festival is on or coming within a month, and how its harvest looks. A new **Rivals** tab shows how its ruler feels about each of the others, with the reasons and what each feels back. It also shows its war, if any, and when its festival is.
- **News of Greece.** A list at the top right of the map with the latest twelve lines, newest first, each with its date and a dot in its city's colour. Click a line to open that city's page. Click the heading to fold it away. Greece's news keeps its own colour on the line under the top bar, one piece at a time.
- **Raiders and caravans answer the pointer along their whole length** (from slice 20's review): every moving piece on the map, armies and fleets included, can be hovered anywhere from its tail to its head, not only near its leader.

### What to try
1. Open `#war`. It is `#caravan`'s town in June 747 BC. Corinth has just won its war with Athens, and King Eurykrates of Sparta has seized the moment and declared war on Athens (the quarrel is set up for this demo, and says so). The map opens on his page. "At war with Athens since 28 May 747 BC: their armies stand at Megara." He asks your city for 1,000 wheat for his army, and Athens' archon has asked the same. Under the request, in red: "Athens, at war with Sparta, will hold anything you send Sparta against you: −8." Zoom in on Megara, between Corinth and Athens: the two armies face each other with the crossed swords between them, and the road from Sparta to Athens is red. Hover an army and the swords. Look at the Prices tab ("their war with Athens") and the Rivals tab. Click a line in the News of Greece list. Then send the wheat to one side (Send it on Sparta's page) and open the other's page: Athens' archon turns wary at once, "−8 You sent 1,000 wheat to their enemy Sparta during the war". Let it run and the war ends as `#peace` shows, Athens the winner (set for both demos).
2. Open `#festival`. It is `#athensship`'s town on 7 July 747 BC, the Panathenaia six days in. The map opens on Athens' page: "The Panathenaia is on, until 1 August". Hover the drachma buttons: each says it counts for more, "for the Panathenaia" (a herald gets there while it lasts; goods, fetched from the stores first, would arrive after it ends, so their buttons show the plain worth). On the Prices tab, wine and meat are dear, "the Panathenaia is on". Zoom in on Athens for the banners and the smoke, and look at the fields beside each city.
3. Open `#peace`. The same war as `#war`, played on to its end in September: Athens has won. Sparta's army walks home through Corinth, the swords and the red road are gone, and the map opens on Sparta's Prices tab: everything dear, "they lost their war with Athens". Let it run for a few months and watch the prices ease.
4. Open any town that trades (say `#caravan`) and let it run for a few game years with the map open. Watch the News of Greece list: feuds, festivals, and now and then a war. With the demos' dice it is a quiet stretch: Athens and Sparta fall to feuding twice and make it up, and the next war comes in December 743 BC, about four and a half game years after `#caravan` opens (about seven minutes at the fastest speed). *(Slice 22: wars now come sooner after a long quiet; the next is in August 746 BC, about fifteen months after `#caravan` opens.)* A new game shuffles Greece afresh.

Each link also opens paused if you add `-paused` (for example `#war-paused`).

### What I'd like your eye on
- **How a war reads on the map.** At the map's first zoom, the armies at Megara sit under the labels of Corinth and Athens (the labels fade while something passes under them). Up close they are two blocks of shields facing each other. Is that enough, or should a war show more from across the table?
- **How often.** About one war every three and a half years from the third year, and a few feuds in between. Too quiet, too busy?
- **How hard a war hits prices**, and how long a defeat is felt. Pushes stack: in `#festival`, Athens' wine during the Panathenaia, just after losing a war, is twice its usual price, which is as far as a price can go (its reason names both).
- **The News of Greece list** at the top right: its place, its size, and whether twelve lines is the right number.
- **The festivals and the fields.** The banners and smoke are small unless you zoom in. Do the field colours read as a harvest?
- **Choosing a side.** Is "trading with one side cools the other" visible enough to steer what you sell?

### Known rough edges
- A war never closes your own trade routes, even when the fighting is on the way (your road to Athens runs through Corinth). The spec mentioned "routes through the fighting closed"; I left that for the war phase, and only the road between the two rivals is drawn closed.
- The armies don't fight on screen: the battle is a line of news half-way through.
- Troy and Tyre keep no festivals.
- Athens' fields lie north-west of the city, where its label sits at some angles: the land south of Athens is sea.
- In `#war` both requests are set up on the same day for the demo; in play they come at their own times. How the war ends (Athens wins) is set for `#war` and `#peace` alike.
- A request for an army can take longer to arrive than the war lasts: in `#war`, the wheat for Sparta reaches it in October, after the war. It still counts as met, and Athens still remembers it was sent.

### Measurements
Headless Chromium with software rendering at 1920 × 1080, so frame rates mean nothing; "before" is `4a9c792` (the end of slice 20's review). The work a frame swings by a ms or two from run to run, so small rises are noise.

| | Before | After |
|---|---|---|
| Tests | 328 in 27 files | 346 in 28 files after the review, all passing (18 new for feelings, wars, festivals and your part in them) |
| Bundle | 4 files, 1,410 KB raw, 417 KB gzipped | 4 files, 1,445 KB raw, 429 KB gzipped |
| Load, bare link, ready and first frame (page clock) | 1.63 s, 2.15 s | 1.61 s, 2.02 s |
| `#town`: triangles and draws, save | 799,168, 83; 142 KB | the same; 145 KB (the feelings and Greece's news) |
| `#richtown`: triangles and draws, save | 910,707, 95; 179 KB | the same; 183 KB |
| Work before drawing a frame, running: `#town`, `#richtown`, `#caravan`, `#tribute`, `#raid`, `#raiders` | 7.8, 11.0, 3.3, 3.5, 3.4, 3.8 ms | 8.7, 11.2, 2.8, 4.6, 4.8, 7.9 ms (one run each) |
| The map of Greece, first open: built in | 0.24 s | 0.24 s |
| Map pages: triangles and draws | `#tribute` 304,018, 20; `#hostile` 304,642, 22; `#raid` 305,834, 22 | `#tribute` 306,042, 32; `#hostile` 305,026, 26; `#raid` 306,218, 26 (the fields, and in `#tribute` the Panathenaia's banners and smoke) |
| `#war`: the armies at Megara | | 314,506 triangles, 33 draws; ready at 3.1 s; 6.5 ms a frame running |
| `#festival`: the Panathenaia | | 306,230 triangles, 34 draws; ready at 3.2 s; 4.7 ms a frame running |
| The 82 earlier demos | | 72 cities open and play 900 ticks on exactly as before (71, and `#anchor` with only a redraw counter different); the other 10 differ only in money, as above. Greece itself now has its festivals and wars in every one |

### What the review changed
- **Sending to one side of a war counts at once.** The other side now minds the moment you send something, and the request card and gift buttons of a city at war say what it will cost you before you send. Before, the enemy only noticed when the goods arrived, and in `#war` the wheat for Sparta arrives in October, after the war is over, so Athens never minded at all and "send the wheat to one side and watch the other's mood" showed nothing.
- **`#war` and `#peace` tell the same story.** Athens wins in both. Before, `#war` left to run ended with Sparta winning, while `#peace`, "the same war played on", had Athens winning.
- **Gift buttons count from when the gift would arrive.** In `#gift` (slice 18) 250 dr showed +11, then arrived during the Isthmian Games and counted +22; the button now says +22. In `#festival` the goods buttons no longer promise the festival's bonus for goods that would only arrive after it.
- **Price reasons.** When two things push a price the same way, both are named, the bigger first: Athens' wine in `#festival` reads "the Panathenaia is on, and they lost their war with Corinth". A city at war whose oil or wine is dear from an earlier lost war now says so, rather than naming the war on now, which doesn't touch oil or wine.
- **Wars come more reliably.** After a year with no war anywhere in Greece, the bar for war comes down a little each year, to a feud at most. Over 30 shuffled games of 12 years, the longest stretch without a war fell from ten years to under five, and wars come about one every two and a half years rather than three. The demos' own first war (Corinth on Athens, December 748 BC) is unchanged; their next is December 743 BC.
- **Words.** "The Isthmian Games begin", not "begins". A lost war now plunders the loser's stores rather than burning its fields: the fields on the map show the coming harvest, which a defeat doesn't spoil, so "fields burned" beside golden fields read wrong. The News of Greece shows the year on lines from an earlier year: the list reaches back more than a year, and each festival comes every year. An army's card reads "1,300 men", not "1300 men".
- **Earlier check-ins corrected** where this slice changed what you'd see: `#famine` (Athens' ship now pays about 53 for wheat, from 31, because Athens lost a war that spring), `#gift` (+22 for the Games) and `#promise` (800 wheat).
- **Checked and left alone.** The cities of all 85 demos open and play 900 ticks on exactly as the builder left them. Of the 82 earlier demos, 71 cities are identical to before this slice, `#anchor` differs only in a redraw counter, and the other 10 only in money, as above (Greece itself, with its festivals, differs in all of them). `#raiders`' work a frame (7.9 ms in the builder's one run) is the same as before when the two builds are measured in turn, about 4.3 against 4.5 ms. `#raid` and `#tribute`, which open on the map, are about a millisecond higher: the city's page on the map is redrawn twice a second, now with its status lines and Rivals tab, which in the slow test browser lands on nearly every frame; in a real browser it is about a millisecond twice a second.
- **Measured after the review** (one run, same setup): bundle 1,446 KB raw, 429 KB gzipped; bare link ready 1.44 s, first frame 1.82 s; `#town` and `#richtown` triangles, draws and saves as above; the map's first open built in 0.26 s; map pages' triangles and draws unchanged; work a frame running `#town` 6.5 ms, `#richtown` 11.5, `#caravan` 2.9, `#tribute` 5.4, `#raid` 6.1, `#raiders` 3.9, `#war` 6.7, `#festival` 5.7. `npm run smoke` passes.

## Slice 20 — Raiders at the edge (18 Oct)

A ruler you have pushed too far now does something about it. First a threat with a price and a deadline, then a war band you can watch march across the map of Greece, then raiders in your fields with torches, and you can pay them off at any point until they turn for home. You weren't here while it was built: every choice below is mine, from the spec's defaults.

What breaks, or moves: no save is lost. A town saved before this slice opens with no threats. If it has a tribute that was refused while the ruler was already cold, the threat comes on the first of the next month. All 78 earlier demos open and play 900 ticks on exactly as before, the whole of Greece included (checked by playing each one in the old code and the new and comparing). One thing from slice 19 now plays out differently: refusing tribute to a ruler who is already cold brings a threat at once, where before it was only noted.

### What's new
- **The threat.** Refuse tribute to a ruler who is already cold (or let it run out), and he threatens your city: pay a price of peace (about a fair gift and a fifth for your size: 750 dr in `#caravan`'s town), or send goods he is short of worth the same, where your city can send them and your stores hold that much twice over, within two months, "or his raiders will come". A hostile ruler who is proud or warlike may also threaten on his own, about one month in six. Only one threat or band is live at a time in Greece. There is never one before your first trade route, and no raiders reach you in your first year of trade.
- **On his page.** The threat sits at the top of his Ruler tab. It says what it costs, by when, how many men gather if nothing comes, and roughly when they would reach your edge. The buttons are Pay (+10), Send goods (when he takes them) and Refuse, and the page says when goods sent now would arrive, compared with the deadline or with the band. A red seal with crossed spears marks his label on the map.
- **The band.** If nothing comes by the deadline (or you refuse), 8 to 12 men gather at his city for ten days: a camp round a banner on the map. Then they march along the road towards your edge, a little slower than a caravan. Troy's band sails the sea lane in a dark-sailed ship. Hover the band for whose it is and when it arrives.
- **The chip.** Under the top bar, a red chip counts down: "Sparta's raiders · 12 days", then "Raiders in the city". Click it to open the ruler's page. A standing line under it says the same with the date. News of a threat or a band never waits behind other news: it gets its own line at once.
- **The raid.** A horn sounds and "Raiders!" floats up where they come in. They enter at the edge of your land nearest their city (Sparta from the west, Corinth and Athens from the north, Troy from the east) and run across country, roads and open ground, to the nearest field or store near that edge. That means a farm, a pasture or an olive grove, or a granary or storehouse holding 300 or more. They never go for homes. A field is set alight as they arrive. It is the same fire as before: it burns for ten days and the watchmen fight it. For its first five days it burns only that field. If nobody has put it out by then, it can spread to what touches it, though less readily than an ordinary fire. They stay six days, then leave the way they came with sacks over their shoulders, carrying what was in the field's barn (up to 80 a man). A store is plundered instead (never more than half of what it holds). People within six tiles of them run indoors and come out when they have passed. Hover the band to see whose they are, what they carry and where they are going.
- **Stopping them.** Coin paid while the band is out turns it back at once, wherever it is: on the map it turns round on the road, and in your fields it walks off with whatever it already has. Goods count when they reach his city. Anything that lifts his mood above cold (a gift, say) calls them off too. Once they are leaving, nothing is gained by paying.
- **Afterwards.** A raid eases his anger: "their raid has eased the king's temper", +25, fading over eighteen months. Paying him off is remembered too: +10 for a year. Either way he makes no threat for a year (nobody else does for three months). The ledger has a "Lost to raiders" section ("Raided by Sparta · wheat 880") beside "Burnt down"; coin paid goes on "Peace bought · to Sparta"; the goods pages show "Carried off by Sparta's raiders"; the rubble stays where the fire left it.
- **Nothing piles up** (from slice 19's review). While a threat or band is live, no ruler asks for anything new. A yearly tribute that comes round waits a month at a time while its ruler has another deal open, two deals are open in Greece, or a threat is live.
- **Lines refresh at once.** After you answer a ruler, the line under the top bar and the labels on the map change straight away, not up to half a second later.

### What to try
1. Open `#threat`. It is `#caravan`'s town, ten months on. King Eurykrates of Sparta turned cold when you refused his first demand for tribute, demanded again, and was refused again. The map opens on his page with the threat: pay 750 dr within 60 days, or 11 of his men come. Click Refuse (or close the map and let the days run). The band camps at Sparta, marches north, and the chip counts the days. They reach your west edge about 27 March either way: refused this early, they camp at Sparta for longer, because no raiders reach you in your first year of trade. Then the horn: they come in at the west edge, set a wheat farm alight, stand round it six days, and walk off with its wheat.
2. Open `#raid`. The same threat was left to run out, and the band is on the road, 4 days from your west edge, with the chip counting. Click "Pay 750 dr": the band turns round on the map at once, the chip goes, and "+10 You paid them to call off their raiders" goes on his page.
3. Open `#raiders-paused`. The band is at the farm by the river, torches up and the farm burning. Hover them. Click the red "Raiders in the city" chip: Sparta's page opens. Click "Pay 750 dr", press Tab to come back to the city, and press Space: they turn for the edge at once, with nothing. Or open `#raiders` and let it run: they stand round the farm six days, then leave over the bridge with sacks of its wheat.
4. Open `#aftermath`. A few days after they left, the burnt farm is rubble and the ledger is open on "Lost to raiders · Raided by Sparta · wheat 880" and "Burnt down · farms 1". On Sparta's page: "+25 Their raid has eased the king's temper".

*Since slice 24 (20 Oct), raids play by new rules, so steps 1, 3 and 4 now read differently; step 2 is the same. The threat says "about 32 men". The band makes for the granary and then the tax office, four days at each, not a farm. It sets a house alight on its way in (it burns down, and the house next door with it) and more buildings on its way out, which the watchmen put out. It leaves with 1,600 wheat and 235 dr. In `#raiders` it is plundering the granary. In `#aftermath` the ledger's last month shows "Raided by Sparta · drachmas −235", "Raided by Sparta · wheat 1,600" and "Burnt down · homes 1".*

Each link also opens paused if you add `-paused` (for example `#raid-paused`).

### What I'd like your eye on
- **How hard a raid hits.** One raid now costs its target and what is in its barn: in `#raiders` one wheat farm and 880 wheat. Before the review the fire spread to the two farms beside it and the town lost all three. A fire nobody fights for five days can still take a neighbour, less readily than an ordinary fire, so a watch post by the fields still matters. Is that about right, or should raiders hurt more, or less?
- **How the band reads**, on the map (warriors and a banner on the road) and in your fields (shields and crests in Sparta's red, torches, sacks on the way out). Too small, too busy?
- **The warning time.** Two months to pay, ten days gathering, then the march (11 days from Sparta). Enough time to see it coming, or too much?
- **The horn.** I could only check that it plays, not how it sounds. Is it right?

### Known rough edges
- In `#caravan`'s town your stores don't hold enough of what Sparta is short of (cheese and oil) twice over, so he asks only coin. The goods answer is in the tests but not in a demo.
- Troy's band (by sea, landing beyond the eastern hills) has no demo link. I checked it on screen from a save: eleven men with green shields come in over the eastern hills and make for the storehouse.
- People running indoors simply stop and vanish where they stand. They don't walk to a door first.

### Measurements
Headless Chromium with software rendering at 1920 × 1080, so frame rates mean nothing; "before" is `ba7bc00` (the end of slice 19's review). Everything in the "after" run was a little slower, the unchanged demos included (`#greece` 2.95 to 3.34 ms a frame), so small rises are noise.

| | Before | After |
|---|---|---|
| Tests | 308 in 26 files | 326 in 27 files, all passing (18 new for threats, bands and raids) |
| Bundle | 4 files, 1,376 KB raw, 407 KB gzipped | 4 files, 1,409 KB raw, 417 KB gzipped |
| Load, bare link, ready and first frame (page clock) | 1.44 s, 1.82 s | 1.50 s, 1.91 s |
| `#town`: triangles and draws, save | 799,168, 83; 142 KB | the same |
| `#richtown`: triangles and draws, save | 910,707, 95; 179 KB | the same |
| Work before drawing a frame, running: `#town`, `#richtown`, `#caravan`, `#tribute`, `#hostile`, `#blaze` | 7.1, 10.9, 2.8, 3.6, 4.8, 6.3 ms | 7.6, 11.8, 3.9, 5.3, 4.9, 6.8 ms (one run each; these swing by a ms or two run to run) |
| The map of Greece, first open: built in | 0.23 s | 0.25 s |
| Map pages: triangles and draws | `#tribute` 304,018, 20; `#hostile` 304,642, 22 | the same; `#raid` (the band on the road) 305,834, 22, ready at 3.4 s, 5.4 ms a frame running |
| `#raiders`: the band at the farm, fields alight | | 596,979 triangles, 57 draws; ready at 3.9 s; 4.9 ms a frame running |
| The 78 earlier demos | | all 78 open and play 900 ticks on exactly as before, the whole world compared |

### What the review changed
- **A raid costs one field, not a district.** The fire raiders set now burns only the field they came for during its first five days. After that, if nobody has put it out, it can spread, but less readily than an ordinary fire. In `#raiders` and `#aftermath` one farm burns, not three. The line about the fire says when it could spread.
- **They stay long enough to see, and to pay off.** The band stood at its target for only two days, which at normal speed is two seconds. By the time you reached Sparta's page they were leaving with the wheat, and paying was no longer offered. They now stay six days. If you pay while they stand there, they leave at once with nothing; before, they finished their stay first.
- **Goods for peace you can trust.** He now asks for goods only when your stores hold that much twice over, as a request does. With barely enough in store, fetching dragged on for months while the city ate into it, so the date on the page was well out. With this rule the date held to within a few days in the tests.
- **Old news goes.** Once you answer a ruler's request, offer or demand, the news of the ask leaves the line under the top bar. In `#threat`, "Sparta demands 650 dr in tribute" had sat under the threat that followed your refusal.
- **The lines keep up.** The moment you pay off a band at your farm, the line under the top bar says they are paid off and leaving, not still "firing the farm".
- **Small fairness fixes.** Coin paid for peace goes on one ledger line, "Peace bought · to Sparta", whether you pay before the band sets out or after. Goods that reach his city while the band is already leaving with its loot count as a gift, not as the price of peace: paying coin at that point isn't offered either.
- **A raid can't get stuck.** If a band ever vanished from your map without going home, the raid would have stayed live for good, and no ruler would ask for anything again. It now ends the next day.
- **This check-in.** Step 3 now uses `#raiders-paused` and the red chip, because Tab opens the map but not Sparta's page. Steps 1 and 4 and the question about how hard a raid hits are rewritten. I corrected why Sparta asks `#caravan`'s town only for coin: the road was never the problem, the stores hold too little of what he wants. I loaded Troy's sea raid from a save to see it on screen.

What I checked: the four demos played in the browser at 1920 × 1080 with screenshots, paying the band off on the road and at the farm; Troy's band from a save; a hostile Sparta left alone for eight years (a raid about every eighteen months, each costing a field if you don't rebuild); all 78 earlier demos open and play 900 ticks on exactly as before; 328 tests pass, and the full browser smoke check and the measurements run clean (the bundle, load times, triangles and draw calls are as the builder measured them).

## Slice 19 — Favours, offers and tribute (18 Oct)

The rulers now ask things of you. A ruler may ask for goods or coin by a deadline, and you can send it, promise it, refuse it or let it run out; each answer stays in their memory, and a broken promise stays longest. A ruler who is pleased with you may offer a better deal for a year. A proud or warlike ruler who is wary of you, and whose city is far bigger than yours, may demand tribute. You can pay it or refuse it. What you send leaves the city the way slice 18's gifts do: the porters fetch it from the stores, then a caravan or a ship in your colours carries it out. It is faster now, and the page says when it will arrive. You weren't here while it was built: every choice below is mine, from the spec's defaults.

What breaks, or moves: no save is lost. A town saved before this slice opens with no requests and nothing on its way. Rulers only ask once your city has had a trade route open for six months (a gift alone doesn't count), so a town that keeps to itself is left alone. 72 of the 74 earlier demos open and play 900 ticks on exactly as before, `#thanks` included (checked by playing each one in the old code and the new and comparing the whole city). In `#prices` and `#famine` the dice now make requests or demands (in `#prices`' history, Sparta demands tribute), but the towns themselves are the same: same money, same people, same everything apart from two redraw counters. The line under the top bar now shows one piece of Greece's news at a time (it showed the newest two).

### What's new
- **Requests.** Now and then (a ruler's chance is about one month in fourteen, and no two new deals come within two months of each other), a ruler who is wary of you or better asks for something: a good they are short of that your stores hold (wheat, often, after a poor harvest), or now and then coin. A request for goods is about three fifths of a fair gift for your size: 1,000 wheat for `#caravan`'s town. The ruler says why ("their granaries run low", "to mend the walls of their city") and by when. You can answer in four ways:
  - **Send it:** +25 when it arrives in time, half that if late; a generous ruler counts it higher.
  - **Promise it:** +4 for now. If nothing has been sent by the day, that is a broken promise: −35, fading over four years, the slowest of all.
  - **Refuse:** −15.
  - **Let it run out:** −10.
- **Offers.** A pleased ruler (+15 or better, with a route open) may offer, for a year, to buy all of a good you make and have to spare at today's price, however much you sell, up to a quarter more than they usually take. Or they may offer to sell you a good at a fifth off. Taking it is a promise: trade at least a quarter of it in the year (+8 when the year ends), or it counts against you (−20). Taking it ticks the good on the route, and the trade rows show the offer's price and what is left of it.
- **Tribute.** A proud or warlike ruler who is wary of you or worse, and whose city is at least half as big again as yours, may demand tribute: coin or goods worth a fair gift, within three months, and not again for two years after. Now and then it is yearly, for three years. Paying adds +8. Refusing, or letting it run out, costs −30, fading over three years. If the ruler is already cold when you refuse, the page says threats will follow. Threats and raiders come in the next slice; for now the refusal is only marked for them.
- **Sending is faster.** Slice 18's review found a gift of goods took four months. Now porters fetching a gift or a sending walk half as fast again and share the loads between the nearest stores. The yard or the post gets two extra hands while they do it. Your own caravans travel at twice a trader's pace. A ruler also allows for the distance: if sending would take most of the usual four months, the deadline is longer.
- **When it arrives.** The request says when it would arrive if sent now, against its deadline. Once sent, the page and the line under the top bar say where it is and when it will arrive. While the porters are fetching it, that date stays steady.
- **Where you see them.** A deal sits at the top of the city's Ruler tab, with its buttons; each button shows what it would do to the mood now. On the map, the city's label shows a scroll (a red seal for tribute), and its hover card says what they want. Under the top bar, a standing line shows the most pressing deal; click it for that city's Ruler tab. The ledger has "Sent · Sparta" and "Tribute · Sparta" lines, the goods pages "Sent to Sparta", and the porters and the caravan say whom they carry it for.
- **One piece of news at a time** under the top bar (slice 18's review). Each stays a fortnight, or at least five days before the next takes its place, and the line says how many more are waiting.
- **A ruler's gift of goods** that lands at the yard or the quay now goes straight to your stores if you sell that good there. It used to wait to be sold.

### What to try
1. Open `#request`. It is `#caravan`'s town, and King Eurykrates of Sparta has asked for 1,000 wheat within six months. The map opens on his Ruler tab with the request at the top: Send it +31 (he is generous), Promise +4, Refuse −15, and the day it would arrive. Click Send it, then press Tab to close the map and let it run. The yard's porters carry the wheat from the granary (hover one: "for Sparta, as they asked"). In about seven weeks, four donkeys in your colours walk out of the city by the west road (hover them). It arrives about 112 days after you sent it, two months before the deadline, and +31 goes on his page with its reason.
2. Open `#promise`. It is `#athensship`'s town, which promised Athens 800 wheat four months ago and has sent nothing (1,000 before slice 21: wheat is dearer in Athens since its war with Corinth, so the archon asks for less). Five days are left. Let it run: the promise breaks, −35, the top line of Archon Metaneira's page, and she turns wary. She is fickle, so it fades over two years instead of four. Or click "Send it, late" first: it arrives about two months late, for half the thanks, and your word is kept.
3. Open `#offer`. It is `#prices`' town, where oil sold to Corinth has slid to 59 a hundred. Corinth's lord offers to buy all the oil you can send for a year at 59, up to 2,900. **His goodwill is staged for the demo**: +12, "pleased with how your city trades (set up for this demo)". Without it he would be at +5, short of making offers. The offer says what it is worth: without it the price falls as you sell, to about 48 after another 2,900. Take it, then open the Trade tab: oil shows "60 offer" (taking it pleased him, and his better terms lift the market's price a little above the offer's, so you get the better of the two) and 2,900 left. Let it run, and the bar on the Ruler tab fills as the caravans buy. Sparta's demand for tribute in this town comes from the town's own history.
4. Open `#tribute`. It is `#caravan`'s town again, saved up to 1,100 dr. King Eurykrates (warlike, wary, Sparta about 6,000 people to your 1,250) demands 650 dr within three months. Pay it (+8), or refuse it (−30): he turns cold, and the next refusal would be marked for the threats to come.

Each link also opens paused if you add `-paused` (for example `#request-paused`).

### What I'd like your eye on
- **How often rulers ask.** Left alone for four years, `#caravan`'s town got a request about every five or six months and a demand for tribute from Sparta about every two years (until a gift mends him or the town grows). Too much, too little?
- **The offer's worth.** At today's price held for the year, `#offer` is worth having only because the price would otherwise slide as you sell (the offer now says how far: 59 today, about 48 after another 2,900). Is that enough of a carrot?
- **What answers are worth.** Is +25 (−35 broken) the right weight next to gifts (a fair gift +20)?
- **The Ruler tab** with a deal at the top: is it clear what each button does?

### Known rough edges
- A sending's arrival date can move by a few days as the porters work: in `#request` the estimate is 112 days and it takes about 115.
- The line under the top bar refreshes twice a second, so just after you answer, the old line can stay for a moment.
- The dice don't avoid the moment you're busy: two deals can be open at once from different cities, and a yearly tribute coming round can make a third.

### Measurements
Headless Chromium with software rendering at 1920 × 1080, so frame rates mean nothing; "before" is `ddfd4ce` (the end of slice 18's review).

| | Before | After |
|---|---|---|
| Tests | 285 in 25 files | 305 in 26 files, all passing (20 new for favours, offers and tribute) |
| Bundle | 4 files, 1,343 KB raw, 396 KB gzipped | 4 files, 1,375 KB raw, 407 KB gzipped |
| Load, bare link, ready (page clock) | 2.28 s; then 1.89, 2.15, 2.03, 1.88, 2.09, 2.42 s | 3.17 s in the full run (everything in that run was slower, the map bake included, which hasn't changed); then 1.89, 2.04, 2.35, 2.04, 1.94, 1.79 s, alternating with the old build |
| `#town`: triangles and draws, save | 799,168, 83; 142 KB | the same |
| `#richtown`: triangles and draws, save | 910,707, 95; 179 KB | the same |
| Work before drawing a frame, running: `#town`, `#quay`, `#richtown`, `#caravan` | 18.8, 12.9, 22.4, 7.8 ms | 15.9, 8.8, 17.2, 3.8 ms (one run each; these swing by several ms run to run) |
| `#caravan`: triangles and draws following the caravan | 516,365, 39 | the same |
| The map of Greece, first open: built in | 0.41 s | 0.36 s |
| Map pages: triangles and draws | `#prices` 304,642, 22; `#gift` 304,018, 20 | the same; `#request` and `#tribute` 304,018, 20, ready at 4.3 and 4.8 s, 6.7 and 6.3 ms a frame running |
| The 74 earlier demos | | 72 open and play 900 ticks on exactly as before; `#prices` and `#famine` differ only in two redraw counters (the dice make deals there) |

### What the review changed
- **Rulers ask less often.** Left alone, `#caravan`'s town had something open nearly all the time: a request every three or four months and Sparta's demand for tribute most years. Now each ruler's chance of a request is lower, no two new deals come within two months of each other, and a ruler who has demanded tribute waits two years before the next demand. Over four years the same town gets a request every five or six months and tribute about every two years. The four demos open as before.
- **Offers you can keep.** A ruler only offers to buy a good your city has to spare (some sold to a trader this year, or more in store than you keep). Before, `#caravan`'s town could be offered a year's deal for oil it never had spare. Taking it meant nothing went, and the deal counted as a broken promise. The offer also says how far the price would fall without it ("59 today, about 48 after another 2,900") and how much you hold against your keep figure. It warns you if none would go.
- **No second offer while one runs.** A pleased ruler could make a new offer while you were still in a year's deal with them, even for the same good. Only the first deal counted the trade, so the second always ended broken. Now they wait until the first year is over.
- **A promise stays on the page until its own request is settled.** Before, a year's deal with the same ruler ending in the meantime wiped the +4.
- **Requests you can meet.** A ruler only asks for goods if your city could send them goods at all (a caravan yard with a road out to them, or a trading post on a lane to them); otherwise they ask for coin.
- **Less repetition under the top bar.** While a deal's standing line shows, the news line no longer repeats the same request underneath it.
- **The labels on the map of Greece sit under the lines below the top bar and the panels**, so Troy's label no longer covers the end of a long line.
- I judged sending late after a promise as fair rather than a loophole. A promise is worth only +4 while it stands. Sending late earns half the thanks whether you promised or not, so promising everything gains nothing. What the promise adds is the risk: if nothing is sent by the day, it costs −35.

## Slice 18 — Rulers who remember (18 Oct)

The rulers of Greece now answer what you do. Send a ruler a gift of coin or goods and you can watch it go: down the road or out of the bay, then across the map. When it arrives their mood lifts, and the reason goes on their page. A ruler who turns hostile closes their road until you mend things, and a warm one sends you gifts of their own. When a mood turns, a line comes up under the top bar saying so and why. You weren't here while it was built: every choice below is mine, from the spec's defaults.

What breaks, or moves: no save is lost. A town saved before this slice opens with every mood where it was and no gifts on the way. A town that has never dealt with Greece plays exactly as before: rulers only act on your city (whims, gifts back, news of their moods) once you have opened a route or sent a gift. All 64 demos from before slice 16 open and play 900 ticks on exactly as they did, and so do `#routes`, `#caravan`, `#buywine`, `#anchor` and `#prices` (checked by playing each one in the old code and the new and comparing the whole city). Two demos have changed on purpose. In `#athensship` and `#famine`, Athens' lord (who is fickle) now takes a passing fancy to your city, so the town has 18 dr more after 900 ticks. `#routes`, `#prices` and `#famine` now open on the matching tab of the city's page.

### What's new
- **A city's page has tabs.** At the top: the ruler, their traits, their mood (face, word, number) and their terms, said once. Below that, three tabs. **Ruler** has how they feel and why, what that means for you, and sending gifts. **Prices** is slice 17's prices. **Trade** has the routes and how the city is reached. Each tab is shorter than the old page, and the terms line no longer appears twice when a route is open.
- **What the mood means, in words.** The Ruler tab says how often their traders come, whether the road is closed and what would open it, whether they would send you gifts, and where the mood is heading a year on as things stand ("A year on, as things stand: +8, cordial, prices 3% in your favour"). That last line also shows the terms drifting as first impressions fade.
- **Gifts.** Coin: 100, 250 or 500 dr, paid at once, then carried by a herald along the road (or by sea where there is no road). Goods: 200, 400 or 800 of any trade good your stores hold. The caravan yard's porters (or the trading post's dockers) fetch it from the stores, ahead of their trade work. Then it leaves: a little caravan in your city's colours walks out to the edge of the map, or a ship in your colours casts off from the jetty and sails out of the bay. After that it travels the road or the lane on the map of Greece, and it counts when it arrives. Each button shows what that gift would add to the mood right now. You can hover the gift in the city and on the map.
- **What a gift is worth.** A fair gift for your size (half a drachma a head) is worth +20, and more counts for more, but less than you'd think (four times the gift, twice the effect), up to +40. Personalities bend it: a greedy ruler loves coin, a generous one remembers longer, a shrewd one is hard to impress, a steadfast one is slow to change, a proud one thinks little of a meagre gift. Gifts sent close together count for less ("another so soon: kind, but…"). Every bend is named in the reason line, and a gift's worth fades over eighteen months.
- **What the mood does.**
  - It moves the terms (slice 17's), now that the mood moves.
  - A cold ruler (−30 or worse) sends their traders half as often again.
  - A hostile ruler (−60 or worse) closes their road or sea route: no trader sets off, and a caravan already on the road on the map turns back. The road opens again when the mood mends past −60, and the next trader comes a month later.
  - A warm ruler (+30 or better) now and then sends you a gift: coin for the treasury, or goods they make plenty of, which go to the yard or the quay and from there to the stores.
  - A fickle ruler now and then takes a fancy or a dislike to your city for a few months.
  - A trader turned back at your city (no yard, no road, no post) is a small snub.
- **News of moods.** When a ruler's mood passes into another word, a line comes up under the top bar for a fortnight, naming why: "Your gift of 500 dr reached Corinth (+6): Lord Periandros has warmed to you, warm now", "Lord Periandros of Corinth is hostile now, and has closed the road to your city: …". The line shows the newest two pieces of news; click it for that city's page.
- **The books.** The ledger has "Gift · to Corinth" under money going out and "Gift · from Corinth" under money coming in. The side panel's goods pages show "A gift to Corinth" and "A gift from Corinth".

### What to try
1. Open `#gift`. It is the town from `#routes` (a caravan yard on the north road, nothing opened with Corinth yet), with the map on Corinth's Ruler tab. Each gift button shows what it would add when it arrives; Corinth's lord is shrewd, so 250 dr would add +11, but since slice 21 it arrives during the Isthmian Games and he is pious, so the button says +22. Send 250 dr. A herald sets off on the road to Corinth on the map (hover him). About six days later a line comes up under the top bar, and the reason is on the page: "+22 Your gift of 250 dr (shrewd: hard to impress; for the Isthmian Games, and pious)". Try the Prices and Trade tabs too.
2. In `#gift`, send 400 oil instead. Close the map (Tab) and let it run: the yard's porters carry the oil up from the storehouse. When it is all there, three donkeys in your colours walk out of the city by the north road (hover them; it takes a while, the yard is far from the north edge). Then they cross the map to Corinth.
3. Open `#hostile`. It is `#buywine`'s town with Corinth's lord set up furious with your city. **This anger is staged for the demo**: nothing in this slice makes a ruler that angry on its own (broken promises and raids come in later slices), and the reason says "(set up for this demo)". The road is closed, the Trade tab says "closed", and the line under the top bar says why. The wine caravan already in your city still unloads and goes home; no other comes. Send 250 dr (100 is not enough: the Ruler tab says how many points the road is short of opening, and each button what it would add). When it arrives the road opens again, and the next caravan comes about a month later. Left alone, the anger fades and the road opens by itself in about five months.
4. Open `#thanks`. Corinth's lord has been warmed by three gifts of 500 dr sent one after another; the reasons show each one counting for less. His own gift of 400 cheese is on the road to your city, four days from the edge. Close the map and let it run: a line says the gift has come, and the cheese is unloaded at the caravan yard. **The timing is staged:** a warm ruler sends a gift about one month in ten, and the demo sends this one at once rather than waiting.
5. Open `#quay`, press Tab and send Troy (by sea only) 400 wheat. The trading post's dockers carry it to the quay, and a ship in your colours sails out of the bay with it.

Each link also opens paused if you add `-paused` (for example `#gift-paused`).

### What I'd like your eye on
- **The city page's tabs.** Does Ruler / Prices / Trade make the page easier to read? Is the header (mood and terms) the right thing to keep in view?
- **What gifts are worth.** In `#gift`, 250 dr adds +11 to a shrewd lord and 500 dr adds +15, fading over a year and a half; three gifts in a row warmed Corinth from +5 to +33. Is that too cheap, too dear, or about right for what warmth gets you (better terms and, now and then, a gift back)?
- **The gift leaving the city.** The donkeys and the ship are small, and the walk out from `#gift`'s yard to the north edge takes about two months of game time. Is it visible enough, and worth the wait?
- **The news lines.** Is one line for each mood turn the right amount?

### Known rough edges
- On the map of Greece the road from your city to Corinth is short and runs under the city labels; a label now fades while a gift or a caravan passes under it, but at the map's opening distance they are still tiny.
- A gift of goods can take months: fetching it to a far yard, then walking out through the city. Coin is the quick way.

### Measurements
Headless Chromium with software rendering at 1920 × 1080, so frame rates mean nothing; "before" is `2805f15` (the end of slice 17's review), measured twice (the first run while tests were running alongside), the new build once between them.

| | Before | After |
|---|---|---|
| Tests | 268 in 24 files | 284 in 25 files, all passing (16 new for rulers and gifts) |
| Bundle | 4 files, 1,317 KB raw, 387 KB gzipped | 4 files, 1,342 KB raw, 395 KB gzipped |
| Load, bare link, ready and first frame (page clock) | 2.13 and 2.75 s; 2.04 and 2.87 s | 2.01 and 2.63 s |
| `#town`: triangles and draws, save | 799,168, 83; 141 KB | the same; 142 KB |
| `#richtown`: triangles and draws, save | 910,707, 95; 178 KB | the same; 179 KB |
| Work before drawing a frame, running: `#town`, `#quay`, `#richtown` | 13.2 and 13.5 ms; 8.8 and 7.8 ms; 16.1 and 18.4 ms | 12.4 ms; 6.8 ms; 20.2 ms (noise: the review measured `#richtown` four times each way, 13 to 18 ms both before and after) |
| `#caravan`: triangles and draws following the caravan | 516,365, 39 | the same |
| The map of Greece, first open: built in | 0.92 s (loaded), 0.34 s | 0.50 s |
| `#prices`, `#famine`: map triangles and draws | 304,642, 22; 304,206, 22 | the same |
| `#gift`, `#hostile`: map triangles and draws; ready (page clock); work a frame | | 304,018, 20; 4.06 s; 6.1 ms · 304,642, 22; 4.00 s; 6.8 ms |
| The 71 earlier demos | | 69 open and play 900 ticks on exactly as before; `#athensship` and `#famine` differ by Athens' whim |

### What the review changed
I played through every step above in the browser at 1920 × 1080 (`#gift` with coin and with oil, `#hostile`, `#thanks`, and the gift ship from `#quay`), and read the rulers' rules, the gifts, the saves and the demos. What changed:

- **A ship turns back.** When a ruler closes a sea route while their ship is out on the lane, she now turns round where she is and sails home, as a caravan on the road does (she used to vanish from the map). Hovering a trader heading home on a closed route says the ruler has closed it.
- **Every turn of mood says why.** When a mood turned because something had just faded out completely (most often a ruler's first impression of your city), the line under the top bar said only "has turned wary towards you", with no reason. It now names it, in plain words: "the good first word of your city is wearing off", "your gift of 250 dr is wearing off", "the black temper is passing".
- **The Ruler tab,** with a road closed, says how many points short of opening it is ("−59 or better, 8 more than now"), so you can match it against the gift buttons. It no longer mentions gifts back while the ruler is cold or hostile.
- **Labels make way.** On the map of Greece, a city's label fades while a gift or a trader passes under it. The road from Corinth runs right under the labels, so a gift on it used to be hidden for most of its way.
- **Two gift ships.** Gifts of goods to two cities by sea can leave together; each now has her own ship in the bay (only one was drawn).
- **The goods pages** count a gift of goods as gone when the porters take it from the stores, rather than when it leaves the city, so a month's figures match what is in store. A ruler's gift of goods that finds no room in your stores now says so.
- **Under the hood, no change in play:** the porters and gift caravans keep the gift's number in a spare field; that is now read and written in one place, which checks what kind of walker it is. The gift rows on the Ruler tab find the road out of the city once, instead of once per button, twice a second.

Also looked at, and left as they are:
- **What gifts are worth.** In `#gift` a fair gift for the town's size is 550 dr, so 250 dr adds +11 to Corinth's shrewd lord and 500 dr +15; two fair gifts six months apart just take him from cordial (+5) to warm (+30). I've left the numbers as built for you to judge.
- **`#hostile` reopening by itself after about five months.** That is the demo's own set-up anger (−72 fading over four years), chosen so you can see it happen. How long a real closure lasts will come from what makes rulers that angry (refusals, broken promises and raids, the next two slices), each with its own fading.
- **`#richtown`'s 20.2 ms a frame** was noise: measured four times each way, before and after this slice, it ran between 13 and 18 ms both ways. Nothing new runs in a town that has never dealt with Greece.
- A gift of goods from `#gift` takes about four months in all: the porters fetch it from a storehouse about thirty tiles from the yard (seven weeks there and back), the donkeys walk two months to the north edge, then four days on the road. That is the town's walking pace, the same as the trade caravans'.
- All 64 demos from before slice 16, and every route demo, open and play 900 ticks on exactly as the builder left them; `#athensship` and `#famine` still differ from slice 17 only by Athens' whim. Tests: 285 in 25 files; the build, the smoke run and the measurements are clean (bundle 1,343 KB raw, 396 KB gzipped; triangles and draws as above).

## Slice 17 — Prices that move (18 Oct)

Prices in Greece now move: sell a city the same good visit after visit and its price slides, a failed harvest sends wheat soaring in one city, and every price says what moved it, with an arrow and a year's chart. You weren't here while it was built: every choice below is mine, from the spec's defaults.

What breaks, or moves: no save is lost. A town saved before this slice opens with its prices where they were, and they move from then on. A town with no trade routes plays exactly as before: all 64 demos from before slice 16 open and play 900 ticks on exactly as they did (checked by playing each one from the old code and the new and comparing the whole city). The five route demos of slice 16 have changed on purpose: each now has a watch post and an architect's office by the caravan yard (it used to burn down after a year and a half), and they trade at moving prices with the ruler's terms, so `#buywine`'s wine costs 840 dr instead of 852. The Tyre ship's prices don't move.

### What's new
- **Prices that move, city by city.** Underneath, each city has a stock of each good. What you sell it adds to the stock and lowers the price; what you buy from it raises the price. The push wears off over the months (about a third gone after two months, two thirds after six). A price can fall to half its usual level or rise to twice it, never further.
- **Harvests every September.** Each city's harvest comes in failed, poor, fair, good or rich (fair about half the time, failed about one year in fourteen). A failed one makes wheat much dearer there, and oil, wine, meat and cheese a little dearer; a rich one makes them cheaper. From June a city's page says how its fields look ("the fields look parched: the harvest may fail"), so a failed harvest never comes out of the blue.
- **Every price says where it stands and why.** On a city's page on the map of Greece, each good has its price, an arrow (rising, falling or steady), a small chart of the last year against its usual price (the dashed line), and a line saying what is moving it ("Cheap, easing (usually 90): you sold them 2,500 in the last year", "Dear (usually 26): their harvest failed this autumn"). The goods are grouped as the city sells them, buys them or has about enough of them.
- **The ruler's terms.** A ruler who likes you pays a little more for what you sell and asks a little less for what you buy, and one who doesn't does the opposite (up to a fifth either way). For now the terms come from the starting moods: in a new game anything from a tenth or more against you (a cold ruler) to a tenth or more in your favour (a warm one); in the demos, which grew from older towns, they are small ("Corinth’s terms: cordial, prices 2% in your favour"). The line is at the top of each city's prices and each route tab, and the routes and the ledger trade at your price.
- **The trade panel.** A route's tab shows your price with its arrow, the terms above the tables, and a "Prices in …" list below with the harvest, each good's chart and its reason. On the Tyre tab, hovering a price says what the open routes pay for that good now, so you can see from the quay where to sell.
- **News of harvests.** When a city's harvest fails or is rich, a line comes up under the top bar in your town ("From Greece: Athens’ harvest has failed, and wheat there is 46 a hundred (it was 25)"). Click it to open that city's page.
- **Travellers on the map can be hovered** (caravans and foreign ships): who they are, where they are going and when, and what they come for. Clicking one opens its city's page.

### What to try
1. Open `#prices`: the town from `#caravan` a year and a half on (April 746 BC), selling oil to Corinth caravan after caravan, with the map open on Corinth's page. Oil there is 56 against its usual 90, and the chart shows it stepping down visit by visit. Hover a chart for its year in figures. Close the map (Tab) and open the trade panel's Corinth tab: the same prices, at your price on Corinth's terms.
2. In `#prices`, run at speed and watch Corinth's oil ease back up between caravans, then drop again as the next one pays (a week in, from 56 to 48). Corinth only buys so much oil a year (the route tab's "Left" column): by June this year's is used up, and the price climbs back until January. Untick oil in the route tab and watch it recover over the following months.
3. Open `#famine`: the town from `#athensship` in late August, with the map on Athens' page saying "the fields look parched". Close the map and let it run: five days later the harvests come in, Athens' fails, and a line comes up under the top bar. Click it: wheat in Athens has nearly doubled, and the reason says why. Athens' ship ties up in mid-September, about two weeks after the harvest, and pays about 53 a hundred for the wheat on the quay, where it was 31 before (42 and 25 before slice 21: Athens lost a war to Corinth that spring, which already made its wheat dear).
4. Open `#ruler` and read Sparta's terms, or open any city's page (Tab, then click a city) to compare prices across Greece. On the map, hover a caravan on the road or a foreign ship at sea.
5. Open `#buywine`, `#routes` or `#caravan`: the watch post and the architect's office now stand by the caravan yard.

Each link also opens paused if you add `-paused` (for example `#famine-paused`).

### What I'd like your eye on
- **The prices block on a city's page.** Each good has a price, an arrow, a chart and, if something is moving it, a reason line. Is that readable at a glance, or is it too much on one page, with the ruler and the trade routes too?
- **The little charts.** They are 84 by 24 pixels, with the usual price as a faint dashed line and a dot at today. Can you read the slide in `#prices`, and the jump in `#famine`?
- **How fast prices move and recover.** In `#prices` the oil you sold in a year took Corinth's price from 90 down to 50 at its lowest, and the push behind a sale wears off by about a third in two months. Does that make selling the same thing to the same city a choice worth thinking about, without punishing it too much?
- **How often harvests fail.** About one year in fourteen per city, with four cities, so somewhere in Greece most years has a poor or failed harvest. Is that the right rhythm of news?

### Known rough edges
- The terms barely change yet: only as a ruler's first impression of your city fades over its first three years (moods that answer what you do are slice 18). In the demos they are only 2%, so they barely show there.
- `#prices` takes about a second longer to open than the other trade demos (about 4 seconds), since it plays the town on from its founding for four years first.
- Wheat's arrow can point down while the reason still says "dear": that is the price easing back after a failed harvest. The reason line says "easing" then, but the arrow on its own can look contradictory.
- A city's page now runs long (the ruler, the prices, the routes). On a laptop screen it scrolls.

### Measurements
Headless Chromium with software rendering at 1920 × 1080, so frame rates mean nothing; "before" is `b8de6cd` (the end of slice 16's review), each build measured twice, alternating.

| | Before | After |
|---|---|---|
| Tests | 252 in 23 files | 266 in 24 files, all passing (14 new for moving prices) |
| Bundle | 4 files, 1,303 KB raw, 383 KB gzipped | 4 files, 1,316 KB raw, 387 KB gzipped |
| Load, bare link, first frame (page clock) | 2.96 s, 2.34 s | 3.48 s, 2.35 s (as noisy as before: the second runs of each were alike) |
| `#town`: triangles and draws, save | 799,168, 83; 140 KB | the same; 141 KB |
| `#richtown`: triangles and draws, save | 910,707, 95; 177 KB | the same; 178 KB |
| Work before drawing a frame, running: `#town`, `#quay`, `#richtown` | 10.2 and 11.3 ms; 7.6 and 6.5 ms; 12.4 and 17.0 ms | 11.5 and 12.9 ms; 6.6 and 7.0 ms; 15.5 and 13.0 ms |
| `#caravan`: triangles and draws following the caravan; ready (page clock) | 529,303, 40; 3.29 s and 3.44 s | 516,365, 39 (the watch post and the architect's office by the yard); 3.53 s and 3.60 s |
| `#prices`: map triangles and draws; ready (page clock); work a frame | | 304,642, 22; 4.43 s and 4.03 s; 4.9 and 6.4 ms |
| `#famine`: map triangles and draws; ready; work a frame | | 304,206, 22; 3.49 s and 3.71 s; 6.1 and 5.5 ms |
| The map of Greece, first open: built in | 0.29 s, 0.35 s | 0.30 s, 0.35 s |
| The 64 demos before slice 16 | | each opens and plays 900 ticks on exactly as before |

### What the review changed
I played through every step above in the browser at 1920 × 1080 and read the price model, the saves and the demos. What changed:

- **Arrows start steady.** In a new game, a few prices showed a rising or falling arrow from the first day with nothing moving them (it came from rounding the prices to whole drachmas). Every arrow now starts steady, in a new game and in a town saved before this slice.
- **Reasons that match the price.** A price within a whisker of its usual level no longer names a push in its tip ("at its usual price: a good harvest last autumn"); it says what the city usually has. And when part of what keeps a price low is trade from more than a year ago, the reason now says so ("you sold them 170 in the last year, and more before") instead of naming only the small figure.
- **Pushes wear off completely.** The last sliver of a push (under one measure) could stay for ever; too small to move a price, but it meant a city never quite got back to normal. It now goes.
- **The harvest news** quotes the wheat price the city's page shows that day (it said one more, from before the day's wear).
- **A measuring fix, not a game one.** The whole-town view of `#caravan` gave different triangle counts from run to run. Nothing in the game varies: the measuring script picked a view while the camera was still following the caravan, which pulled it back at the speed of the frames. Picking a view now stops following, and that view measures the same every run (770,459 triangles, 79 draws, three runs).

Also looked at, and left as they are:
- `#prices` still takes about 4 seconds to open. Most of its setup is the town saving up for the yard, the groves and the road to Corinth; opening the road before the groves made it only about a third of a second faster, and Corinth then bought a fraction of the oil, so the chart barely moved.
- `#famine` sets Athens' coming harvest to fail in its own setup. That is a value any game can roll, only in that demo, so it can't reach a real game, and a save made from it is just a town whose Athens is due a failed harvest.
- In new games the terms run from about 13% against you to 13% in your favour (400 new games); the pages read, for example, "Sparta’s terms: cordial, prices 6% in your favour".
- Corrected above: step 2 now says Corinth's yearly limit for oil runs out by June (after which its price climbs back on its own), step 3 says when Athens' ship ties up and what she pays, and the terms do drift a little as first impressions fade.
- All 64 demos from before slice 16 still open and play 900 ticks on exactly as before, and the route demos are the same as the builder left them. Tests: 268 in 24 files; the build, the smoke run and the measurements are clean (bundle 1,317 KB raw, 387 KB gzipped).

## Slice 16 — Routes and traders (17 Oct)

Greece reaches into the city: you can open trade routes from the map, build a caravan yard, and watch donkeys from Corinth walk down your main street and an Athenian ship tie up at your jetty, buying your surplus and bringing what you ordered. You weren't here while it was built: every choice below is mine, from the spec's defaults.

What breaks, or moves: no save is lost. A town saved before this slice opens as it was, with no routes, and plays exactly as before: all 64 earlier demos open and play 900 ticks on exactly as they did (checked by playing each one from the old code and the new and comparing the whole city). The build bar's G now cycles four ways (granary, storehouse, trading post, caravan yard). The top bar's ship chip has become a traders chip: with no routes open it is the ship chip as before.

### What's new
- **Trade routes, opened from the map of Greece.** Each city's page has a "Trade with …" section: a button for each way there, with its fee, or why it can't be opened yet (no caravan yard, no trading post, not enough in the treasury). By road: Corinth 500 dr, Sparta 600, Athens 750 (the long road through Corinth). By sea: Athens 800, Corinth 800, Troy 1,000. Once open, the whole route can be run from that page.
- **The caravan yard** (G four times, 300 dr, 4 workers, one only): a walled yard with a gateway, a donkey pen with a hay rack, a well, an awning over trestles and a banner. Its porters carry what you sell to the yard and carry what you buy to the granaries and storehouses, as the dockers do for the quay.
- **Caravans.** A drover leading four or five pack donkeys, their blankets in their city's colour (Corinth's orange, Sparta's red, Athens' blue). One comes every two months: in by the road at the edge of the map on its city's side, down your streets at a walking pace to the yard, three days' trading at the gate, and out the way it came. With a yard far from the edge, the next can be walking in while the last walks out; only one trades at a time. With no road from the edge to the yard it turns back, and the route says why. On the map of Greece you can see it on the road between its city and yours.
- **Foreign ships** in their city's colours (the hull band, the stripe, the pennant): one every three months, the same way in, berth and way out as the Tyre ship. If the Tyre ship has the jetty, the visitor anchors off to one side and waits her turn. On the map she sails her lane.
- **Buying and selling, city by city.** Each city buys what it is short of and sells what it has plenty of, at its own price, up to a yearly limit. Tick what to sell to each route (one "keep" figure per good, shared with the Tyre ship). For what you buy, tick the good and set "up to": the trader brings enough to stock your stores up to that figure, as far as the year's limit, the room at the yard or quay, and what the treasury can spare when it arrives (it keeps back a month's wages). You pay as it unloads ("Bought · wine from Corinth" in the ledger) and it pays as it leaves ("Sales · oil to Corinth"). Route fees have their own ledger line.
- **The trade panel has tabs:** Tyre, each open route (its news, what they buy and sell, the price, what is left of the year's limit, your stores, keep or up to, what waits at the yard or quay, and its last visit), and the yard. Clicking the trading post, the yard or a foreign ship opens the right tab (clicking a caravan follows it, as with any walker).
- **The traders chip** on the top bar shows whichever trader matters most (one in port first, then one coming, then the soonest due), with a donkey for a caravan. Click it for that trader's tab.
- **Hover a caravan or a foreign ship** to see who they are and what they're doing. The line under the top bar says when a caravan is in the city or trading, when a ship is sighted, at anchor or in port, and when a trader turned back and why.

### What to try
1. Open `#routes`: `#town` with a caravan yard at the east end of the main street, a road out to the north edge, and the map of Greece open on Corinth's page. Click "Open a road to Corinth". Run at speed and zoom in on the Argolid: the caravan sets out from Corinth on the map.
2. Open `#caravan`: a month after the road opened, the first caravan from Corinth is walking in from the north edge; the camera follows it down to the yard. Hover it. Click the traders chip: its tab opens, and while the caravan is walking in the camera follows it.
3. Open `#buywine`: the same town (it has no vineyards) buying wine from Corinth, up to 1,200, with a wine stall added to the main agora. The caravan is about a week from the yard: watch it arrive, unload the wine and trade, and the porters carry the wine up to the storehouse. Then open the ledger (the coin on the top bar).
4. Open `#athensship`: an Athenian ship coming up the bay to the jetty, with her tab of the trade panel open. Watch her tie up and load wheat; then click the Tyre tab.
5. Open `#anchor`: the Tyre ship is loading at the jetty, so the Athenian ship rides at anchor in the bay. Let it run: she comes alongside once the Tyre ship has gone.
6. In `#athensship` or `#anchor` (the road demos already have their one yard), build a caravan yard yourself (G four times) and read its placement tip; then open the map (Tab), click Sparta or Troy and read why a route can or can't be opened.

Each link also opens paused if you add `-paused` (for example `#buywine-paused`): useful, since a caravan trades for three days and a ship is in port for about three, which is three seconds at normal speed.

### What I'd like your eye on
- **The donkeys and the drover**, walking and resting at the yard's gate. Do they read as a caravan from another city, at the distance you play at?
- **The caravan yard.** It is low and open (walls, gateway, pen, awning), sitting half-way down its slope. Does it read as a place where traders meet, next to the trading post and the storehouse?
- **The Athenian ship's colours.** The difference from the Tyre ship is in the hull band, the stripe and the pennant; the sails are the same cloth. Enough, from your usual height?
- **The trade panel's route tab.** It has six columns (good, price, what is left of the year's limit, stores, keep or up to, at the yard or quay). Is that too much at once?
- **How busy the street gets.** In `#town`'s layout the yard is a long walk from the north edge (about two months), so for a while a caravan walks in as the last walks out: two, now and then three, strings of donkeys on the main street.

### Known rough edges
- The traders on the map of Greece can't be hovered or clicked yet; the Tyre ship still can.
- The donkeys bunch up a little where a caravan turns a corner, and at the gate a donkey can overlap a wall corner.

### Measurements
Headless Chromium with software rendering at 1920 × 1080, so frame rates mean nothing; "before" is `da734a1` (the end of slice 15's review), each build measured twice, alternating.

| | Before | After |
|---|---|---|
| Tests | 234 in 22 files | 252 in 23 files, all passing (18 new for routes and traders, one of them from the review) |
| Bundle | 4 files, 1,252 KB raw, 368 KB gzipped | 4 files, 1,301 KB raw, 382 KB gzipped |
| Load, bare link, first frame (page clock) | 2.45 s, 2.37 s | 2.80 s, 2.40 s |
| `#town`: triangles and draws, people, save | 799,168, 83; 693; 140 KB | the same |
| `#richtown`: triangles and draws, save | 910,707, 95; 177 KB | the same |
| Work before drawing a frame, running: `#town`, `#quay`, `#richtown` | 9.4 and 12.6 ms; 6.3 and 6.8 ms; 16.6 and 15.2 ms | 11.1 and 9.0 ms; 8.6 and 7.3 ms; 19.3 and 13.3 ms (as noisy as before) |
| `#caravan`: triangles and draws; ready (page clock); work a frame | | 524,795, 39 following the caravan (781,853, 86 over the town); 3.27 s and 3.18 s; 5.1 and 4.3 ms |
| `#athensship`: triangles and draws; ready; work a frame | | 573,819, 49 at the jetty (817,862, 86 over the town); 3.22 s and 3.47 s; 7.2 and 5.4 ms |
| The map of Greece, first open: built in | 0.33 s, 0.35 s | 0.30 s, 0.33 s |
| The 64 earlier demos | | each opens and plays 900 ticks on exactly as before |

### What the review changed
I played every step above in a headless browser at 1920 × 1080, looked at the screenshots, read the code, and changed these:

- **Caravans now come every two months, as promised.** Before, each caravan pushed the next one back twice (once when it finished trading and again when it left the map), so in `#town` they came every 87 days at best and sometimes only every 140, and some crossed the map of Greece in a day instead of five. Now the next is due two months after the last one stepped onto your map, whatever that one is doing, and it sets off from Corinth in time to walk the whole road on the map. With a yard far from the edge one walks in while the last walks out; only one trades at a time, and one that reaches the gate while another is trading waits its turn there.
- **Caravans walk at a man's pace**, a third faster than ox carts, so in `#town` a caravan takes about two months from the north edge to the yard rather than nearly three, and the main street rarely has more than two strings of donkeys on it.
- **Buying keeps back a month's wages.** A big order used to spend everything the treasury could spare (`#buywine`'s first caravan could leave 5 dr); now the trader brings only what can be paid for with a month's wages still in hand, so the workplaces are paid on the first. The panels say so.
- **Sounds for traders:** a donkey's bray and harness bells when a caravan comes in at the edge of the map, the harbour bell when a foreign ship is sighted, and coins counted out when a caravan or a foreign ship pays, with the drachmas floating up from the yard or the quay as they do for the Tyre ship.
- **A foreign ship's line under the top bar has a ship on it,** not the caravans' donkey.
- **Hovering any part of a caravan** shows its tip (before, only the drover's feet did), and the camera follows the middle of the string.
- **The traders chip, while a caravan is walking in,** opens its tab and follows it down the street, instead of flying to the empty yard.
- **The route tab's last column** now also shows what you bought that waits at the yard or the quay for the porters or dockers.
- "Athens’ ship", not "Athens’s ship".
- Step 6 above now names a demo you can build a yard in: the road demos already have their one yard.

Measured again after these changes: 252 tests passing, the bundle 1,303 KB raw and 383 KB gzipped, `#town` and `#richtown` exactly as in the table, `#caravan` 529,303 triangles and 40 draws following the caravan, and the 64 earlier demos still open and play 900 ticks on exactly as before.

Still for you to judge, as above: the donkeys, the yard on its slope (from the downhill side its wall stands tall and plain), the ships' colours and the route tab's six columns. One more thing I noticed: in the road demos the yard is outside the watchmen's rounds, so if you play on it catches fire after about a year and a half unless you build a watch post near it (its tip warns first).

## Slice 15 — The map of Greece (17 Oct)

Phase 3's first slice: a map of the Aegean on a table, with Athens, Sparta, Corinth, Troy and Tyre around your city, the rulers of the four you will deal with, how they feel about you and why, and what each city makes and wants. You weren't here while it was built: every choice below is mine, from the spec's defaults.

What breaks, or moves: no save is lost. A town saved before this slice opens with a Greece of its own and a line in the welcome back saying where the map is; its rulers start between wary and cordial. The city plays exactly as before: all 60 earlier demos open and play the same as they did (checked by playing each one on 900 ticks from the old code and the new and comparing the whole city). A new town on the bare link now also shuffles Greece, so its rulers differ from game to game; the coast and the opening view are as before.

### What's new
- **The map of Greece.** The **Greece** tab hanging under the top bar's right end, or the **Tab** key, swaps the city for a relief map of the Aegean on a wooden table: the mainland and the Peloponnese, Asia Minor, Euboea, Crete and about forty islands, hills and mountains rising from the shore, snow on Olympus, turquoise shallows going to deep blue. Your city sits at the head of the Argolic Gulf. Roads run as dotted lines to Corinth and Sparta, sea lanes as dashes out of the gulf to Athens, Corinth, Troy and Tyre (at the table's far corner).
- **Toy cities** made in code, each in its colour: Athens with its acropolis and temple, Sparta unwalled in its valley, Corinth under its citadel, Troy behind high walls, Tyre on its island, and yours, which grows a house at a time as your city grows.
- **The Tyre ship on the map**, in step with the city: when her sail shows on your horizon she is coming up the gulf on the map; she ties up at your city, sails home and waits at Tyre. Click her for Tyre's page.
- **Moving around** is the same as in the city: drag to pan, right-drag or Q and E to turn, the wheel to zoom.
- **Labels and hover cards.** Each city's label shows its ruler's mood as a little face. Hover a city for a card with the ruler's portrait, name, title and mood; click it for the city's page.
- **A city's page:** the ruler's portrait (drawn from their traits: a helmet for a warlike one, a diadem for a proud or greedy one, a laurel for a pious one, the mouth and brows by mood), name and title, two traits and what they mean, the mood as a word and a number with **every reason and what it is worth** (old history with your city, what their character makes of a newcomer, a first impression that fades over three years), what they sell and buy at what price against Tyre's, and how to get there.
- **Four rulers, shuffled per game**, each city with a leaning: Sparta's rulers are often warlike, Athens' and Corinth's shrewd, Corinth's greedy, Troy's proud; about three in ten are women. Moods start between cold and warm.
- **Tyre's page:** what her merchants buy at what price, and where the ship is.
- **Your city's page,** and **a name for it**: click your city, then the pencil, and type a name (two to twenty letters). The map and the page take it.
- **Closing the map** (Tab, Esc or the tab again) brings you back to the city exactly as you left it. While the map is open the city keeps running (pause works as ever), and the side panel steps aside so the map has the whole window.
- **Not yet:** nothing on the map changes from what you do. Trade routes (slice 16), prices that move (17), moods that change and gifts (18), requests and tribute (19), raids (20) and wars, festivals and news (21) come next. The pages say what is so now.

### What to try
1. Open `#greece`: `#town` with the map open. Zoom in on the Argolid and turn the table. Hover each city, then click Athens and Sparta and read why they feel as they do.
2. Press Tab to go back to the city, and Tab again to come back to the map.
3. Open `#ruler`: Sparta's page from the start. Does a ruler read as a person you will have to deal with?
4. Open `#greecesail`: the merchant ship is coming up the gulf on the map. Press Tab to see her sail on the city's horizon, and back. Click her on the map.
5. Click your own city on the map, then the pencil, and give it a name.
6. Open the bare link twice (start a new town each time) and open the map: the rulers shuffle.
7. Open one of your saves from before (`#saved` or `#continue`) and read the welcome back.

### What I'd like your eye on
- **The table as a whole**, from the opening view and zoomed in over your city. Does it read as a model of the Aegean on a table? The mountains are kept low and the colours warm; the coasts are hand-traced and simplified.
- **The toy cities**: do Athens, Sparta, Corinth and Troy read as different places? They are small at the opening view and only really show up close.
- **The portraits**: simple busts drawn from each ruler's traits. Enough character, or too plain?
- **The mood reasons**: is "since the founding, fading" clear enough, and do the starting moods feel fair?
- **The Greece tab and Tab key.** Every letter was already taken, so it is Tab. The tab hangs under the top bar so the bar still fits beside the side panel on a smaller window.

### Known rough edges
- The first time the map opens there is a short wait while it is built (about 0.4 s in my measurements; the first picture takes longer under software rendering, so judge it on your machine).
- Up close the hills are plainly low-poly and the road dots look like stepping stones; the camera stops at a middling distance for that reason.
- Asia Minor and Crete end in a straight cliff at the table's edge.
- Labels can overlap where cities are close (Corinth and your city) when the table is turned or zoomed far out.
- The map's page opens on the left, where the city's house pages open; there is no side panel while the map is open.
- The corner note (welcome back, saves) now wraps at about 460 pixels instead of running across the top bar.
- On a 1280-pixel window with the side panel shut, the top bar still runs under the corner buttons a little; that was so before this slice.

### Measurements
Headless Chromium with software rendering at 1920 × 1080, so frame rates mean nothing; "before" is main just before the map went in (with the side panel), each build measured twice, alternating.

| | Before | After |
|---|---|---|
| Tests | 234 | 234, all passing (the 20 for Greece came with this slice's first part) |
| Bundle | 3 files, 1,205 KB raw, 351 KB gzipped | 4 files, 1,251 KB raw, 368 KB gzipped; the map's file (34 KB, 13 KB gzipped) loads only when the map first opens |
| Load, bare link, first frame (page clock) | 2.81 s, 2.36 s | 2.28 s, 2.29 s |
| The map, first open: built in | | 0.37 to 0.38 s |
| The map: triangles, draw calls | | 303,818, 20 |
| The map: work before drawing, a frame | | 3.9 to 4.7 ms |
| `#town`: triangles and draws, people, save | 799,168, 83; 693; 140 KB | the same |
| `#richtown`: triangles and draws, people, save | 910,707, 95; 928; 177 KB | the same |
| The 60 earlier demos | | each opens and plays 900 ticks on exactly as before |

### What the review changed
I went through every step of "What to try" at 1920 × 1080 (and the map at 1280 × 720), looking at screenshots of each. Most of it did what the notes above say; these I changed:
- **Tab after a click.** Once you had clicked anything in the side panel (a tab, a good), Tab moved a highlight to the panel's next button instead of opening the map, so the key seemed dead. Now, after a click, Tab always opens and closes the map; it only moves between a panel's buttons when you got there with the keyboard.
- **Clicking a city's name.** Zoomed in, the labels float well above the toy cities, and clicking a label did nothing (only the city under it counted). The label and its little stem now count as the city, for the hover card and the click.
- **The hover card** no longer covers the city it is about at the table's edges (Tyre in the far corner): where there is no room below and to the right of the pointer, it opens above or to the left.
- **The town lines on the map** (the ship sailing in, a shortfall) ran over the City tab under the top bar; they now centre with the top bar as they do in the city.
- **A city's page on the map** now runs down to the foot of the window, since there is no build bar there (on a smaller window Sparta's page was cut off at its wine price, with room to spare below).
- **Mood numbers** use the same minus sign as the reasons ("−10 in all", not "-10").
- Small things out of sight: pressing Tab again while the map is loading for the first time now takes it back; the city's floating labels ("+3", "Fire!") no longer pile up hidden while the map is open.
- **The smoke test's one failure** ("hovering the tax collector") wasn't the game: in `#collector` the followed collector is sometimes resting at his office while another walks off the screen, and the test picked that one. It now waits for a collector in plain view.
- Checked afterwards: the 234 tests, the full smoke test (it now also checks Tab after a click in the side panel, and clicking a city's label) and the measurements, which are as in the table above. Nothing in the city's simulation changed.

Still as they were, for you to judge: the Greece tab is small (it hangs under the right end of the top bar); on a 1280-pixel window the opening view puts Sparta under its own page when you open it.

## Side slice — The side panel (17 Oct)

You asked for this while phase 3 was being built in another thread, so it went in on its own branch and onto main with phase 3's first piece (the map of Greece, in the sim only so far). Phase 3 keeps its slice numbers. Every choice below is mine; tell me what to change.

What breaks, or moves: no save is lost. State version 15 adds a stock book (version 14 is phase 3's Greece); a loaded town's book starts empty in the month you load it, so its goods show this month's figures at once and the year's chart fills in as it plays. Nothing about how a town plays changes: every demo opens and plays exactly as before.

### What's new
- **A side panel down the right**, about 300 pixels wide, as in the original. The view narrows to make room rather than hiding anything under it, and the top bar, the build bar and the town lines centre on what is left. The new corner button (beside the others) shows or hides it, and that is remembered. It starts open on a window 1,200 pixels wide or more.
- **A round minimap at its head** showing land, sea and river, trees, roads, and buildings in their colours (homes by level), fires as pulsing marks, the ship as a dot, and the ground in view outlined. It turns with the camera, so what is up on the screen is up on the plate; north is marked on the bronze rim. Click it to fly there, drag on it to jump.
- **Four tabs: Goods, People, Services, Money.**
  - **Goods** lists every ware by group (food, goods, from the land) with what the city holds and this month's net, up or down. Click one for its page: the net, what was made, used, sold, bought and lost this month and last, a year's chart by month (in above the line, out below), a line saying what is wrong if anything is (nothing makes it, its makers are short of workers, the presses have run out of olives, no stall sells it, how many months it will last, the stores are full), where it goes and comes from (homes by district, the presses and wineries, the ship), and where it is kept, with how full each store is. Click a district or a store to fly there.
  - **People:** population and the outlook for newcomers, homes by level, work (filled, can work, without work), the workplaces short of hands, the homes in trouble (click one to open it), and who arrived and left.
  - **Services:** how well each need is covered (click a row for its overlay), fire and wear, watch posts, architects, rubble, and the need most missed.
  - **Money:** the treasury, owed wages, this month and last (taxes, sales, wages, building, net), the tax rate (click to change it), collector coverage, and a button for the ledger.
- **The stock book.** Nothing kept a record of where each ware went, so the sim now notes every measure made, used, sold, bought or lost, by who or where, for this month, last month and a year of months in short. A test checks that over a month each ware's stock moves by exactly the book's net, so nothing comes or goes unnoticed. Phase 3's new goods and its trade with other cities show up by themselves.

### What I checked
- Screenshots at 1600 × 900 and 1280 × 720: the panel, the tabs and a ware's page lay out without overlap, and the top bar and build bar still fit beside the panel.
- Turning the camera turns the minimap the same way, and clicking a spot on it brings the view there. Clicking a ware, a district, a store, a service row and a troubled home each does what it says. Hiding the panel gives the view its full width back.
- The panel costs well under a millisecond each time it refreshes (three times a second while open), and the minimap repaints only when the town changes. No errors in the console.
- All 234 tests pass, including the stock book's and old saves loading.

### What to try
1. Open `#goods`: the richer town with the panel open on wine. Read the page, then click Back and go through the other goods. Does it tell you what you would want to know?
2. Click a district in a ware's "where it goes" list, or a store under "where it is kept", and see where it takes you.
3. Turn the camera with Q and E and watch the minimap. Is a turning plate right, or would you rather north stayed up?
4. Click and drag on the minimap to get around the bay.
5. Look through People, Services and Money. Is anything missing that the original's overseers told you?
6. Press the panel's corner button to hide it, and again to bring it back.

Not done yet: the minimap shows the whole 128-tile map, so it doesn't zoom for larger maps until there are some; the panel has no keys (every letter is taken); the trade panel's goods don't link to their pages yet.

## Slice 14 — A richer town (17 Oct)

Phase 2's last slice: a prepared richer town to look at and measure, the money retuned across the whole game by playing every demo on, and a pass over the rough edges you would notice. You weren't here while it was built: every choice below is mine, from the spec's defaults.

What breaks, or moves: no save is lost. A slice 13 save opens as it was, and the welcome back says taxes are retuned (the finer houses pay more, harsh taxes now drive whole households out and keep newcomers away, collectors are paid first when money runs short). Older saves go through every step. The phase 1 demos (`#streets` to `#people`, and the cottage towns) open and play exactly as before. **The prepared towns from slice 7 onwards open on the same story but with different money and some different figures**, because their histories are played with the new taxes (demo by demo under "The money" below). Saves are about half the size, in a new format; older formats still load.

### What's new
- **`#richtown`, the prepared richer town.** `#town`'s history played on: a road down to the bay with the trading post on the quay, a lane above it with three vineyards on the sunny slope, a winery and a storehouse, wine at both agoras, a third watch post and architect's office, and every good ticked for sale. It opens at normal speed from over the bay, the merchant ship four days out and sailing in toward you, the town behind her: 928 people, 899 dr, 24 villas, 15 fine houses, 6 townhouses, 10 cottages and 14 huts, with watchmen, inspectors and three tax collectors on their rounds. `#richstreet` is the same town at street level among the villas.
- **The money, retuned** (before and after figures below):
  - Fine houses pay a drachma more a month at each rate (fair 10, was 9), villas half as much again (fair 18, was 12). Huts, cottages and townhouses pay as before, so a town of cottages still roughly breaks even at fair.
  - **Harsh taxes have teeth.** On the first of each month every household a collector has called on rolls by its mood: a fed-up or unhappy one leaves whole half the time (the house becomes an empty plot, with "Moved away" floating up), a worried one a quarter of the time (and sends someone away half the time), one getting by now and then; content ones stay. Newcomers come a third as often, and harsh weighs more on a household's mood. A town line says how many households have left for the taxes in the last three months; the tax chip's harsh row and the population tip say so too. Set taxes back down and the town grows back.
  - **Collectors are paid first.** When the treasury runs short, the tax offices' wages are paid before anyone else's, so the collectors keep their pace: `#dry`, set back to fair, pays its wages after 14 days (was 42).
  - **The ship pays about a fifth more:** per hundred, wheat 20 dr, meat and cheese 35, oil 70, fleece 55, wine 100 (were 15, 30, 30, 60, 45, 80).
- **The ship's way in, slower.** Her sail shows 20 days before she ties up (was 6) and she sails out over 16 (was 5). She is in sight for her last 14 days (about 14 seconds at normal speed), crossing the open water at a steady half a tile a tick and slowing evenly to the jetty, with no jump in pace at the map's edge.
- **Polish:**
  - "Back to a hut" and other notes rising at the same time near each other are one note with a count ("Back to a hut ×5"), and notes that would cover each other are nudged apart.
  - The town lines keep a fixed order (ship, fire, wear, rubble, food, oil, fleece, wine, workers, money, taxes), so two shortfalls no longer swap places.
  - **Your autosave is kept.** Starting a new town on the bare link while the autosave holds another town no longer overwrites it: the new town saves itself only once you have saved it by hand (Ctrl+S), and a corner note and the saves card say so.
  - The trade panel, the household panel and the ledger update in place, so hover tips don't flicker and a click always lands; after a click, the keys (Esc, Space, the speeds) still work.
  - Clearing the trading post (or losing it) with goods on the quay says what was lost, and what it was worth, in a town line for a month.
  - The trade panel's wheat and cheese swatches are told apart (wheat tan, cheese yellow).
  - Smoke, from a smouldering building or a hearth, is soft camera-facing puffs instead of round balls.
  - On a neglected street seen from the usual zoom or further, only the worst mark of each kind in each block shows; smouldering and creaking ones always show.
  - A watchman, after a fire, goes on to another fire or a smoulder he can see before going home, and puts out a smoulder as he reaches it.
  - The tax overlay doesn't tint a home a collector visited at "none" as paid.
  - The architect's office is in dressed stone with course lines and a taller hoist, so it reads less like a white box.
- **Saves are about half the size:** `#town` 135 KB (was 258).

### What to try
1. Open `#richtown`. The ship is coming in over the bay toward you; watch her tie up, load and pay (the coins float up over the post), then pan up into the town. Press 2 or 3 and play a year or two: does the money feel tight in a good way?
2. Open `#richstreet`: street level among the villas. Turn with Q and E.
3. Open `#harsh` and play on a few months: households leave, the town line counts them. Set taxes back to fair (the rate by the drachmas) and watch the town grow back.
4. Open `#dry`, set taxes back to fair and press play: the wages are paid within a fortnight.
5. Open `#black` and press play: her visit now pays 898 dr (was 840).
6. Open `#quay`, tick a few goods and press − / + in the trade panel while hovering a figure: the tip stays put. Then clear the trading post (Clear land) with goods on the quay and read the town line.
7. Open `#blaze` or `#creak` and look at the smoke and the marks from the usual zoom.
8. Open one of your slice 13 saves (`#saved` or `#continue`) and read the welcome back. Then open the bare link and start building: the corner note says your old autosave is kept.

### What I'd like your eye on
- **`#richtown` as a whole.** Does it read as a richer town than `#town`: villas, vineyards, the quay and the ship? It opens a little over the 600 to 900 people the spec asked for (928).
- **The money.** Played on at fair, `#richtown` gains about 435 dr a month (sales included); `#town` 138; a cottage town loses 11. Is that tight in a good way, or too easy once you have villas?
- **Harsh taxes.** A year of harsh in `#town` brings in 320 dr a month but loses 510 people (693 → 436). Is that the right size of bite?
- **The ship's way in** (`#sail`, or `#richtown` as it opens). About 14 seconds from the map's edge to the jetty at normal speed. Worth looking up for, or too slow?
- **The soft smoke**, in `#blaze` and over the hearths.

### Known rough edges
- **The collector's round is still about forty days**, so taxes come in lumps. Shortening it made the collectors reach fewer houses and brought in less; paying them first did what it was meant for.
- `#town` opens just before the priestess comes by: for its first fortnight up to nine fine houses show a warning about religion, with months to spare, and it clears when she passes.
- `#richtown`'s quay holds only wheat, meat and cheese at first: the town uses its oil and fleece itself, and its wine reaches the quay only from about the fourth visit, nine months on (the review corrected "all its wine" here).
- The town grows a large food surplus in `#town` and the towns built on it.
- `#grove` loses 24 dr a month at its opening rate (unchanged).
- The variety overlay's blocks, the olive press carts' part loads and how fast carts travel are unchanged.
- Porters, bales and amphorae on carts were looked at and left as they are.
- Fires spread at the same pace as before, and dockers still take about two months over a round trip from the far stores.

### Measurements
**The money**, by a probe outside the repo that plays each demo on from its opening (fire risk and wear off unless noted), before (`3f4037e`) → after:
- Targets:
  - A cottage town at fair (`#food`, `#bridge`): −11 dr a month → −11 (unchanged, as intended).
  - `#town` played on a year at fair: +115 a month → +138; at heavy +259 → +275.
  - `#town` a year at harsh: +404 a month with the town growing 724 → 1,060 people and 11 leaving → +320 a month with the town shrinking 693 → 436, 510 people leaving.
  - Six months harsh, then six at fair: 2,339 → 3,455 dr before; after, 2,332 → 3,193, the town falling to 626 people and growing back to 785.
  - A fine-house town (`#fine`, a year): +13 a month → +41. A villa town (`#villas`): +67 → +219.
  - `#dry` set back to fair: first wages paid after 42 days → 14.
  - `#black`'s visit: 840 dr → 898. `#town` with a post selling four goods for a year: sales 907 dr → 1,278.
  - `#richtown` (new): +435 dr a month over six months (sales 830), about +468 over a year.
- What changed in each demo (its opening money, then six months on at its opening rate):
  - Phase 1 (`#streets` to `#people`, `#warning`, `#decline`, `#missing`): unchanged.
  - `#grow`: opens with 670 dr (was 424); −67 a month → +9.
  - `#shrine`, `#priestess`, `#grove`: unchanged (`#grove` still −24 a month).
  - `#table`: opens with 168 (422); −59 a month → +21. `#overhunt`: 899 (830); −55 → −2.
  - `#theatre`, `#actor`: open with 291 (255); −9 a month, running down to 3 dr with 9 days of wages owed → +24, never below 33.
  - `#fine`, `#compare`, `#pasture`, `#fleecevendor`, `#vineyard`: 945 (828); +31 → +62.
  - `#closed`: 2,459 (2,091); −15 → 0. `#nooil`: 895 (620); +12 → +32.
  - `#villas`, `#winevendor`: 2,067 (1,418); +66 → +203. `#winery`: 717 (507); +11 → +52.
  - `#town` and the demos that open on it (`#townstreet`, `#ledger`, `#collector`, `#dairy`, `#oil`, `#storehouse`, `#oilvendor`, `#watchman`, `#inspector`): 322 dr and 693 people (233 and 724); +94 → +138. `#hunter`: 682 (368); +136 → +110.
  - `#harsh`: 1,586 (1,327), 674 people (809); before it grew to 978 with 4 people leaving, now it shrinks to 494 with 283 leaving, at +323 a month (was +462).
  - `#taxes`: 618 (376); +102 → +32. `#dry`: 2 dr, 799 people (1 and 806).
  - `#fire`, `#blaze`, `#rubble`, `#creak` open later in the year and richer (1,940, 2,682, 2,454 and 2,116 dr; were 1,557, 1,835, 2,026 and 1,698), the same buildings burning or creaking. `#blaze`'s fire is now by the olive grove.
  - `#trade`: 806 (450); +105 → +100. `#quay`, `#sail`, `#ship`: open with 682, 882, 892 (451, 831, 591); about +240 → +260 a month.
  - `#black`: 2 dr, wages owed, as before; she pays 898 (840) and it ends six months on at 170 with taxes still off (was 1).

**Checks**, before (`3f4037e`, the end of slice 13's review) → after, in the same headless Chromium with software graphics at 1920 × 1080:
- Tests: 211 in 20 files, all passing (was 199 in 19); typecheck clean. New:
  - `tests/money.test.ts`: a villa pays clearly more than a fine house; harsh taxes pay more for three months but shrink `#town` over a year where fair grows it, and it grows back at fair; a household leaving for harsh taxes leaves an empty plot and replays identically; harsh slows newcomers; `#dry` back at fair pays its wages within a fortnight; `#richtown` opens on what it promises, saves and loads identically, and gains over 2,000 dr a year with sales over 600.
  - `tests/saves.test.ts`: save format 3 round-trips and is smaller; formats 1 and 2 still read; a real slice 13 save at harsh (`tests/fixtures/slice13-harsh.save.json.gz`) loads.
  - `tests/trade.test.ts`: the ship's pace in the map stays under 0.55 tiles a tick with no jump, slowing to the jetty; clearing the post with goods on the quay says what was lost for a month, and undoing it brings them back.
  - Adjusted on purpose: `#town`'s days with a warning (now under 300), the blaze save test (builds a watch post first: fires now start further east), and tests may take 30 s (demos play on longer before they open).
- Smoke: passes, extended with `#richtown` and `#richstreet`, `#harsh`'s town line and rate card, the trade panel updated in place (a row kept, Esc still closing it after a click), the slice 13 save's welcome back, and a new town keeping the old autosave. Its prices are updated, and its `#town` check now asks that no house is about to fall back rather than none warned (see Known rough edges).
- Download: 332 KB compressed, 1,148 KB raw (was 328 and 1,140).
- Load, by the page's own clock: ready at 1.55 s and first frame at 1.85 s (was 1.35 and 1.57; these move by a tenth or two from run to run). `#town`: ready at 1.83 s, first frame 2.37 (was 1.67 and 2.18). `#richtown`: ready at 2.18 s, first frame 2.69 (it plays the town on for about three years first). Target: under 3 seconds.
- Draw batches and triangles:
  - Unchanged: the opening view (574,460 triangles, 59 draws), `#streets`, `#water`, `#food`, `#fine`.
  - `#town` 811,660 and 86 (was 816,898 and 83), its overview 929,244 and 112 (934,314 and 109). `#villas` 712,432 and 80 (713,904 and 80). `#quay` 637,504 and 55 (643,258 and 55); `#ship` 584,483 and 54 (598,095 and 54); `#sail` 548,594 and 41 (545,932 and 42).
  - Marks shown, from the usual zoom: `#blaze` 8 (was 19), `#creak` 22 (57).
  - New: `#richtown` 911,243 and 97; `#richstreet` 819,931 and 80; its overview 1,021,806 and 119, the most yet.
- Main-thread time per frame before drawing, paused / running (each over 8 seconds; noisy):
  - `#food` 0.75 / 1.40 ms (was 0.60 / 1.19); `#fine` 0.93 / 3.79 (0.83 / 2.91); `#town` 1.52 / 8.58 (1.06 / 8.32); `#villas` running 5.93 (7.51); `#blaze` 1.17 / 4.20 (1.16 / 2.62); `#quay` 3.69 (3.96); `#ship` 3.07 (3.41).
  - New: `#richtown` 1.41 / 10.78; `#richstreet` running 15.51. (The review found most of that was redrawing the ground under each house that rose a level, not the round walkers, and cut it: see below.)
- GPU objects on `#ship`: 38 geometries, 7 textures (was 38 and 6: one more for the soft smoke). `#richtown` reaches 73 geometries as it plays and stays there.
- A save of `#town`: 135 KB (was 258). `#richtown`: 171 KB.
- Frame rate: not measured (software graphics only here). Target: 60 frames a second on a mid-range laptop at 1080p.

### What the review changed
A second pair of eyes went through the slice, played each step above in a headless browser (and `#richtown` on for two years) and fixed what it found. What changed for you:
- **A big town costs less per frame.** Every time a house rose or fell a level (in `#richtown`, a street of fine houses turning into villas), the game redrew the paving and ground of that whole corner of the map, though nothing on the ground had changed. It now redraws it only when a plot gets its first family or a house is left empty. Measured the same way as above, alternating with the slice as it was handed over: `#richstreet` running 17.5 → 9.4 ms a frame, `#richtown` about 11.9 → 9.3, `#town` about 10.3 → 6.3. The round walkers turned out to be a small part (under half a millisecond a frame), so they were left as they are.
- **Tab and Enter work on the panels' buttons again.** After a click, the slice made the game's keys take the focus back from a panel's button (so Space pauses rather than pressing it again); that also swallowed Tab and Enter. They now move between and press a panel's buttons, as before; Space, Esc and the speeds still go to the game.
- **This note was corrected:** the measurement that blamed the round walkers for `#richstreet`'s cost (it was the ground being redrawn); `#richtown`'s quay does get wine, from about nine months on; the moveRounds rough edge is gone from the list.
- Checked and unchanged: every step above works as written (`#richtown`'s ship ties up and pays 614 dr; `#dry` pays its wages 14 days after taxes go back to fair; `#black` pays 898; `#harsh` falls from about 680 to 500 people over six months and grows back past 800 in a year at fair, with the town line counting the leavers; the slice 13 save's welcome back; the new town keeping the old autosave). Every older save in the tests (phase 1 to slice 13, both older file formats) opens, and saves and opens again identically. Earlier demos open and look as before (screenshots of the opening view, `#streets`, `#food`, `#fine`, `#town`, `#villas`, `#quay`, `#sail` and `#ship`); only their money differs, as listed above.
- Worth knowing before you play `#richtown` on: it opens at 928 people and keeps growing (about 1,230 after a year, 1,390 after twenty months, all at fair); it gains about 500 dr a month; and in its second year its one sheep pasture can't keep up, so fleece runs short and a few villas fall back to fine houses (the town line says where the fleece is short and why). It opens 19 ticks before the first of the month, so about 300 dr of wages go out two seconds in, before the ship pays.
- Still for you to judge: `#town` opening with a religion warning (one fine house as it opens; the priestess is a fortnight away; fixing it would move the history of a dozen demos, so it was left); harsh taxes paying well while the town shrinks (in `#harsh`, about +320 dr a month for six months); the size of `#richtown`'s overview (about a million triangles and 119 draw batches, the most yet: worth a look at the frame rate on your laptop).
- Checks after the review: 211 tests in 20 files pass; typecheck, build and smoke pass. Download 332 KB compressed (1,148 KB raw); load ready at 1.24 s, first frame 1.51 s; `#richtown` ready at 2.51 s, first frame 3.11 s by the page's clock in this run (it plays about three years of history first; these move by a few tenths from run to run). Draw batches and triangles unchanged. Time per frame before drawing, running (one run each, noisy): `#town` 5.42 ms, `#villas` 5.77, `#quay` 5.01, `#richtown` 9.53, `#richstreet` 11.59.

### What the phase review changed
Once the whole phase was done, a reviewer played it end to end in a headless browser: from the bare link, building the way a new player would (roads, plots, water, wheat, a tax office, the lodge and dairy, olives, sheep, wine, watch posts and an architect's office, then the trading post), until villas stood and a ship had called. Along the way it changed the tax rate, let a corner burn and cleared the rubble, ran the treasury dry and sold its way back, and saved, reloaded and carried on. It also loaded a demo from every slice, and it played towns on for three to four years outside the browser to check the money. What changed for you:
- **A town that has run dry can reach its untaxed homes again.** In the review's own town, two fires early on left homes no collector reached and wages owed every month. While wages are owed you can't build, so the second tax office that would have paid them couldn't be built: the town was stuck. Now, while wages are owed, a tax office costs no more than the treasury holds (the same rule as a town with no tax office at all). The money line names the homes no collector calls on and says what to build. The tool's tip says so too.
- **The workers line tells the truth when homes are cut off.** When a road tile was cleared by mistake and a street was cut off from the jobs, the line said "more homes would help". Now it says how many people have no road to the jobs left, and to join their streets to them.
- **A new workplace says its workers come at the start of the next day.** Before, hovering one you had just built said everyone who could reach it already worked nearer home, which was not true.
- **The welcome card says what keeps a town going.** After the three first steps it adds a line: workers are paid each month, so build a tax office by the houses; buildings gather fire risk and wear, so build a watch post and an architect's office. Played as a newcomer who ignored them, the review's town lost eight buildings to fire and collapse in its first fifteen months (the granary and the agora among them).
- **The controls card (?) covers phase 2.** It lists every M, G and K press, the tax office, watch post and architect's office under Z, the oil, fleece and wine overlays under L, the tax chip, and the trading post panel. The shrine's and theatre's hints on the bar now give the phase 2 needs (oil for a townhouse, all three foods and fleece for a fine house).
- **Panels no longer sit on top of each other.** The tax rates card fitted badly and could cover the ledger. It is now narrower, and opening it closes the ledger, the saves card and the controls card (and they close it). On screens narrower than about 1,720 pixels the trade panel now sits below the top bar instead of under it. The trade panel no longer says "no workers" twice.
- **Clearing the trading post while paused** now shows the ship turned back at once in the ship chip, instead of still on her way until you unpause.
- **Sharing out the workers is quicker.** Sharing out the workers each day was the biggest single cost of playing a prepared town's history before it opens. Played outside the browser, `#richtown`'s history now takes about a fifth less time; in the browser the gain was smaller than the run-to-run noise. Every demo opens exactly as before.
- Small words: "he walks / they walk" in the ledger's tax note, and the fire and wear lines no longer start mid-sentence with a capital.

Checked and unchanged: a step from each slice's "What to try", from `#coast` to `#richstreet` (around forty demos, no errors on the page); saving and loading, and carrying on from the bare link; every overlay key; the ship calling at a post built by hand and paying 646 dr into a nearly empty treasury.

Worth knowing, from playing on:
- **Fire is the big danger for a new player.** Every prepared town's history is played with fire and wear turned off, so none of them has met an early fire. Played on its own for nearly three years with no watch post or architect's office, a town burns down completely. With watch posts and an architect's office built at the first warning, the same town reached villas in about two and a half years and 1,100 people by year four, with the treasury never empty for more than a few days.
- **Taxes still come in lumps,** about every forty days per collector, so the drachmas jump, and the arrow beside them (last month) can point the other way from the figure beside it (this month so far).
- `#town` shows up to nine homes warned about blessings in its first two months (none goes down), and `#richtown` keeps growing past 1,200 people in a year.

Still for you to judge: whether fire should be gentler early on, or warned about sooner; whether harsh taxes should keep paying as well as they do while the town shrinks; whether up to five town lines at once (about a third of the screen's height) is too many.

Checks after the phase review: 211 tests in 20 files pass; typecheck, build, smoke and the published page (bare link, `#town`, `#richtown`) pass. Download 332 KB compressed (1,149 KB raw). By the page's clock: the bare link ready at 1.41 s, first frame 1.69 s; `#town` first frame 2.57 s; `#richtown` first frame 3.02 s, still about the 3-second target. `#town` 811,660 triangles and 86 draw batches; `#richtown`'s overview 1,021,806 and 119. Time per frame before drawing, running (one run each, noisy): `#town` 5.46 ms, `#richtown` 10.84, `#richstreet` 9.67. A save of `#town` is 135 KB. Against the end of phase 1: download 243 → 332 KB compressed, the bare link's first frame 1.24 → about 1.7 s, `#town` 650,414 → 811,660 triangles (103 → 86 draw batches) and 2.7 → about 5.5 ms a frame running, and its save 452 → 135 KB.

### The phase, all told

Phase 2, "A richer city", in seven slices. What you can do now that you couldn't at the end of phase 1:
- **Slice 8, coin and the ledger.** Build a tax office and follow its collector, who only taxes the homes he walks past. Set the tax rate from none to harsh and hear the households grumble. Every workplace pays wages each month, and the ledger ($) says where each drachma came from and went. A town can run dry and recover.
- **Slice 9, meat and cheese.** Send hunters out from a lodge to the deer and boar on the hills, keep goats at a dairy, and watch cottages become townhouses once a second food reaches them. Over-hunt a valley and the lodge goes short until the herd grows back.
- **Slice 10, olives, oil and the storehouse.** Plant groves on the dry slopes, press the olives, fill a storehouse yard with jars, and send an oil vendor out from the agora. Townhouses now need oil.
- **Slice 11, fleece, wine and the villa.** Graze sheep, plant vineyards and build a winery, and raise a street to villas, the new sixth and grandest level. Fine houses now need fleece, and villas need wine.
- **Slice 12, fire and collapse.** Watch fire risk and wear build up on neglected streets and see the smoke or the creaking a month before anything happens. Put it out with a watch post and an architect's office, or let it burn and clear the rubble.
- **Slice 13, the ship comes in.** Build a trading post on the quay, choose what to sell and how much to keep, and watch the dockers stack the quay. Then see the sail on the horizon and the ship come in and pay.
- **Slice 14, a richer town.** Open `#richtown`, a prepared town of 928 people with every chain, 24 villas and the ship sailing in. The money is retuned across the game, harsh taxes now drive families away, your autosave is kept when you start a new town, and saves are half the size.

**Recorded for later**
- From the spec: prices that move, buying from ships, rival cities and sea lanes; crime; seasons that affect farming and herds; elite estates; a wage slider; which god the shrine belongs to; more goods (fish, bronze, marble, timber).
- **Fire is the big danger for a new player,** and no prepared town has met an early fire, because their histories are played with fire and wear off. A town with no watch post or architect's office burns down completely in under three years.
- **Taxes come in lumps,** about every forty days per collector, so the drachmas jump and the arrow can point the other way from the figure beside it.
- **Harsh taxes still pay well** (about +320 dr a month for a year) even while the town shrinks.
- **The per-frame cost of a big town has roughly doubled.** Refilling the houses that are rising a level is now the biggest piece; batching them is the fix.
- **`#richtown` keeps growing** past 1,200 people in a year. In its second year one pasture can't keep up, so a few villas fall back for lack of fleece.
- **Small things:**
  - `#town` opens with homes warned about blessings for a fortnight;
  - up to five town lines can stack a third of the screen deep;
  - the dairy's goats stay in their pen;
  - there's no shepherd walking the flock;
  - the presses and the treading vat don't move;
  - porters are hard to pick out, and fleece bales look like stones;
  - dockers take about two months over a round trip from the far stores;
  - the town grows a large food surplus;
  - some figures in older check-ins have drifted since the money was retuned.

**Budgets that moved** (end of phase 1 against now)
- **Download:** 243 KB compressed, now 332 KB, from seven new chains, the hazards, the ship and their models and sounds.
- **Load** stays under the 3-second target. The bare link's first frame went from 1.24 s to about 1.7 s, and `#town`'s from 2.0 s to about 2.6 s. `#richtown` sits right at the target, about 3.0 s, because it plays three years of history before it opens.
- **Draw batches went down** (`#town` 103 to 86) once all the walkers and animals were merged into a few batches. Triangles went up (650k to 812k), and `#richtown`'s overview is the most yet at about a million.
- **Time per frame** in `#town` while running roughly doubled, about 2.7 to 5.5 ms headless. The game itself (the sim) is a small part of that.
- **Saves are smaller:** `#town` went from 452 KB to 135 KB.
- **Frame rate on a real laptop is still unmeasured.** Only your machine can tell us whether `#town` and `#richtown` hold 60 frames a second.

**Questions for you**
- Does `#richtown` hold a smooth frame rate on your laptop, and does it read as richer than `#town`?
- Is the money tight in a good way, or too easy once you have villas?
- Should fire be gentler early on, or warned about sooner? Should the prepared towns be played with fire on?
- Harsh taxes bring in more money even while the town shrinks. Is that the right size of bite?
- Should tax money come in smoothly instead of in lumps?
- Is the ship's way in (about 14 seconds in sight) worth looking up for, or too slow?
- Are five town lines at once too many?
- What should the next phase be?

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
