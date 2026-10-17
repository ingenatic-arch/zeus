# Phase 3: Greece beyond the walls

*17 Oct 2026. Chosen by Oliver after phase 2 ("A richer city"), which he said "looks great". Serves pillar 3, "A world that remembers" ("Each ruler has a personality and goals, and remembers gifts, broken promises and refused requests. They act on it with trade deals, alliances, demands for tribute and war"; "Readable on the surface: you can always see where you stand with someone and why"), and pillar 4, "A living market and the sea lanes" ("World prices respond to supply, war and harvests, so what you make and sell shifts over time"; "Trade travels by land and sea"). Pillar 1 still wins every conflict: everything beyond the walls must show up as something that changes in the city.*

## Summary

At the end of phase 2 the city makes six goods and one merchant ship from Tyre buys the surplus at steady prices, but there is nothing beyond the walls: no one to trade with by choice, no one who remembers you, and nothing that moves a price. This phase puts the city in Greece. A tabletop map of the Aegean opens from the top bar, with Athens, Sparta, Corinth and Troy on it, each ruled by someone with a personality, a mood towards you and the reasons for it. You open trade routes, and their donkey caravans walk your roads and their ships tie up at your quay to buy and sell. Each city's prices move with what it has, its harvests, its festivals and its wars, and your own selling moves them too. Rulers ask favours, send gifts, demand tribute, and remember what you did; a furious one sends raiders, telegraphed well ahead, who walk onto your map to burn or steal. Greece goes on without you: rivals feud and go to war with each other, and that shows up in your ledger and your requests. By the end, what you make and where you sell it is a choice that changes over time, and every ruler's face says where you stand and why.

## Oliver's decisions

| Question | Oliver's answer |
|---|---|
| How does the world map of Greece look and open? (17 Oct) | A tabletop map: a separate 3D view of the Aegean as a toy relief map, opened with a button; cities, routes and moving ships on it, his city among them. |
| What can the rulers of Athens, Sparta, Corinth and Troy do to you? (17 Oct) | Deals and demands, plus raids: they offer trade, ask favours (goods by a deadline), demand tribute and send gifts; angering one closes their route or raises their prices; and a furious ruler sends raiders who burn a farm or steal goods at the city's edge, before real war exists. |
| How does trade with the other cities work? (17 Oct) | Their traders come, Zeus-style: you open a route to a city for a fee; its donkey caravans walk your roads, or its ships dock at your quay, to buy and sell a few goods each. |
| What moves the prices? (17 Oct) | Each city has its own prices, moving with what it has (selling a lot there drives them down), its harvests and its troubles. Each price shows what moved it. |
| How much does Greece do on its own? (17 Oct) | Greece goes on: rivals have harvests, festivals, feuds and wars with each other; these move prices and bring requests. |

Phase 2's open questions (early fire, harsh taxes' bite, lumpy tax money, the ship's pace) had no answer yet, so they stay as they are; the whole-phase review looks at them again in a world with more money moving.

## Claude's defaults (Oliver can change any of these)

**The tabletop map**
- **What it is.** A separate 3D view: the Aegean as a low-poly relief map on a table, warm and toy-like like the city. Sea in painted blues, land in ochre and olive with raised hills, mountain ridges for the Peloponnese and Thessaly, the coast of Asia Minor to the east, Crete to the south, little islands. Cities are toy walled towns with a banner in their colour; your city is one of them. Land routes are drawn as dotted roads, sea lanes as dashed lines on the water.
- **How it opens.** A "Greece" button in the top bar, and a key (shown on the button). The city keeps running while the map is open; pause works the same. Closing returns the camera exactly where it was. The camera on the map rotates and zooms like the city's, within the table.
- **Where you are.** Your city stands on the Argolic Gulf, between Corinth (north, by road) and Sparta (south-west, over the hills), facing the sea to the south, as the city map does. It is named "Nea Argos" to begin with; you can rename it from its own panel on the map.
- **Who is there.** Four cities with rulers: Athens, Sparta, Corinth and Troy. Tyre stays at the map's far south-east edge as the Phoenician port whose merchant ship already calls; it has no ruler to deal with and keeps its steady prices (it is a great market your selling doesn't dent), so phase 2's ship and towns play as before.
- **What moves on it.** Everything you see on the map is the same thing the city sees: a caravan on the road from Corinth is the caravan that will walk in at your edge; the Tyre ship's sail on the map is her sail on your horizon. Armies of feuding cities, raiders marching on you and festivals show as little figures, banners and smoke.
- **Built lazily.** The map's scene is built the first time it opens, so the city's first load is unchanged.

**Rulers**
- **Shuffled each game.** Each city's ruler gets a name, two traits and a starting mood from the game's seed: traits from proud, greedy, generous, warlike, pious, shrewd, fickle and steadfast. Each city also has fixed character from history: Sparta warlike and short of fine goods, Athens rich and hungry for wheat, Corinth a trading city, Troy far off and wealthy in fleece and wine. What each city makes and wants is set by its character with some shuffle.
- **A portrait.** Each ruler has a small portrait drawn in code (a bust in the city's colour, with a beard, helm or diadem by their traits), a name and title, and their mood shown as a word and a face: hostile, cold, wary, cordial, warm, devoted.
- **Mood with reasons.** The mood is a number underneath, the sum of remembered things, each listed with what it is worth and when it happened: "+20 · your gift of wine, Gamelion, year 2 (fading)", "−30 · you refused their request for wheat", "−10 · you trade with their enemy Troy", "+5 · steadfast: slow to change". Memories fade over a year or two; a broken promise fades slowest. A personality bends how much each thing counts (a greedy ruler loves gifts of coin; a proud one hates refusals; a fickle one forgets fast).
- **What mood does.** Better moods give better prices on their route and bring gifts and offers. Cold rulers raise their prices and send fewer traders. A hostile ruler closes their route (traders stop coming until the mood mends) and, if warlike or proud, makes threats that lead to raids.
- **Gifts.** From a city's panel you can send a gift: drachmas (100, 250, 500) or goods from your stores. Goods leave the city visibly (porters to the quay or caravan yard, then a ship or caravan out along the route on the map). Gifts count more when they're generous for your size and less when they come too often ("Another gift? Kind, but...").
- **Their gifts.** Pleased rulers sometimes send gifts: a caravan or ship arrives with goods for your stores, or coins, with a line saying who sent them and why.

**Trade routes**
- **Opening a route.** From a city's panel: a land route to Corinth or Sparta (from 500 dr), a sea route to Athens, Corinth or Troy (from 800 dr). Athens and Corinth can be reached both ways; Sparta by land only; Troy by sea only. A ruler who is cold or worse won't open one. A sea route needs the trading post; a land route needs a caravan yard.
- **The caravan yard** (new, 3×3, on a road): a walled yard with a donkey pen, a well, an awning over trestles and stacked goods. Caravans come in by the road at the map's edge nearest their city, walk your streets to the yard, trade, and walk out the way they came. Only one yard to begin with; it says when no road leads from it to the map's edge.
- **The traders.** Each open route sends a trader every two or three months (caravans more often than ships), and the city panel, the map and the top bar's ship chip (now a "traders" chip) say when each is due. A caravan is four or five donkeys with packs and a drover in the city's colour; a foreign ship looks like the Tyre ship in that city's colours and sail. Ships tie up at the trading post's jetty; if the jetty is taken, a second ship anchors in the bay and waits her turn.
- **What each city buys and sells.** Each route lists a few goods the city buys from you and a few it sells to you, each with a yearly limit (as in Zeus: "buys up to 1,200 wine a year"), at its current price. For each you choose to sell or buy, and how much to keep (as the trade panel does today) or how much to stock up to.
- **Selling** works as with the Tyre ship: dockers or yard porters carry the surplus to the quay or the yard; the trader takes what is there up to the year's limit and pays at today's price.
- **Buying** lets a city without a chain get its goods: the trader unloads what you ordered onto the quay or yard, you pay at today's price, and dockers or porters carry it to the granaries and storehouses. Buying stops when the treasury can't pay. Imports appear in the ledger as a new out line by city ("Bought · wine from Corinth"), sales by city.
- **One trade panel.** The trading post's panel grows a tab per open route, plus Tyre; the caravan yard opens the same panel on its land routes. The city's panel on the map has the same rows.

**Prices**
- **Each city, each good.** A price per good per city, starting from a base (wheat cheapest, wine dearest, as today) bent by what that city makes and needs. Underneath, each city keeps a stock of each good that its own people make and use; the price rises when the stock is low against its need and falls when it is high.
- **What moves them.** Your selling adds to their stock and your buying takes from it, so selling a lot in one place drives its price down for a while; their harvests (each autumn, good, fair, poor or failed, by seed), their festivals (wine and meat dearer for a season), their wars (food and fleece dearer, routes through the fighting closed) and their troubles; and the slow pull back to normal.
- **Readable.** Every price shows its arrow (up, down, steady) and a reason line naming the biggest thing moving it right now ("Wheat dear in Athens: their harvest failed", "Wine cheap in Corinth: you sold them 2,000 this year"). Each city's panel has a small chart of the last year's price for each good. The trade panel's rows show the price with its arrow, so you can see from the quay where to sell.
- **The ruler's terms.** On top of the market price, the ruler's mood moves what they pay and charge you (up to about a fifth better or worse), and the panel says so ("Sparta's terms: cold, prices 15% against you").
- **Tyre** keeps the steady phase 2 prices, as above.

**Requests, offers and tribute**
- **Requests.** Now and then a ruler asks for something by a deadline: "Sparta asks for 800 wheat within four months: their harvest failed." It arrives as a town line and a card on the map. You can promise it (and later send it), refuse it, or let it run out. Sending it gives a big lift to the mood; refusing costs some; promising and failing costs the most, and that memory fades slowest.
- **Sending.** Goods for a request or a gift go out from the stores the same way trade goods do: carried to the quay or yard, then out by ship or caravan, which you can see leave the city and travel the map. A request is met when it arrives.
- **Offers.** Pleased rulers sometimes offer a deal for a year: "Corinth will buy all the oil you can send at today's price, up to 2,000 a year" or "Athens offers wheat at a fifth off for a year". Taking one is a promise too.
- **Tribute.** A proud or warlike ruler who is wary or worse, and stronger than you, can demand tribute: a sum of drachmas or goods, once or yearly. Paying lifts the mood a little; refusing costs a lot and, from a cold ruler, leads to threats.
- **Requests have teeth but never stack up badly.** They start only once your city has opened its first route. No more than one open request per ruler, and no more than two across Greece at once; none in the first six months after that first route.

**Raids**
- **Telegraphed in three steps.** First a threat with a deadline and what would stop it: "Sparta's king is out of patience: pay 600 dr or send 1,000 wheat within two months, or his raiders will come." Then, if nothing changes, raiders gather (a war band on the map, marching along the road towards you), with a top-bar chip counting the days. Then they reach your map's edge. There is always at least two months from the threat to the raid, and no raid in the first year after your city's first route.
- **On your map.** A band of eight to twelve raiders in their city's colours, with shields and torches, comes in at the edge nearest their city and walks across the land (not only roads) to the nearest worthwhile target near that edge: a farm, pasture, grove, granary or storehouse. They loot it (carry off a share of its stock, which you see go) or set it alight (the phase 2 fire, which the watchmen fight and which can spread), then walk off the way they came. Walkers and people near them run indoors; houses are never targeted directly.
- **Stopping them.** Paying what was asked, or a gift that lifts the mood past cold, turns the band back on the map, even late. There is no fighting them this phase: walls and soldiers come with the war phase. The city's watch posts are the defence against fires spreading.
- **Afterwards.** The ruler's anger is partly spent ("Their raid has eased the king's temper"), so a raid is followed by a lull rather than another. A ledger line and the rubble show what it cost.

**Greece goes on**
- **Harvests** every autumn for every city, by seed, shown on the map as a field colour and a line ("A rich harvest in Athens"), moving food prices and bringing requests.
- **Festivals** at their seasons (the Panathenaia in Athens, the Karneia in Sparta, the Isthmian Games at Corinth), shown with banners and smoke on the map, making wine and meat dearer there for a season and pleasing a ruler you send a gift to then.
- **Feuds and wars.** Rulers have moods towards each other as well as you, from their traits and history, and those move. Two rulers who fall far enough out go to war: crossed swords between them on the map, little armies on the road or ships on the lane, food and fleece dearer in both, the route between them closed. Each side may ask you for help (goods); trading with one's enemy cools the other. Wars end after a season or two in a peace or a defeat (the loser poorer for a while, which shows in its prices). Wars between rivals never come to your map this phase.
- **News.** The world's events come as town lines in their own colour ("From Greece: Sparta and Athens are at war"), on the map as markers you can hover, and in a short "News of Greece" list on the map, newest first.

**Saves and other things**
- **Old saves load.** A phase 2 save gets a fresh Greece from its seed, with every ruler cordial-to-wary and nothing open; the welcome back says Greece is there now and where the button is. New saves are a new version.
- **Earlier towns are untouched.** The world draws its random numbers from its own stream, separate from the city's, so every earlier demo opens and plays on exactly as before as long as you don't open a route or anger anyone. Rulers only start asking, offering and demanding once your city has opened its first route (the Tyre ship doesn't count), so a town that keeps to itself is left in peace; the earlier demos have no routes.
- **Readable everywhere it touches the city.** Hovering a caravan, a foreign ship or a raider says who they are and what they're doing. The trade panel, top-bar chips and town lines say what's due.
- **Sound.** A donkey bray and bells when a caravan comes in, the ship's bell for foreign ships, a horn when raiders are sighted, and a soft parchment rustle for the map.
- **Demo links** are bare hash tokens, one or more per slice, listed in each check-in.

## What's there today

Phase 2 is complete (slices 8–14). The city has six goods (wheat, meat, cheese, oil, fleece, wine) in granaries and storehouses, six house levels up to the villa, taxes, wages and a ledger, fire and collapse with watchmen and inspectors, and a trading post whose dockers stack surplus on the quay for a merchant ship from Tyre that calls every three months and pays steady prices. There is nothing beyond the map: Tyre is a name in the ship's hover tip.

- **The code:** the trading post, dockers and ship live in `src/sim/trade.ts` (pure, with the ship's position a pure function of her route and the tick) and `src/ui/trade.ts`; money moves only through `src/sim/treasury.ts`; settlers already walk in from the map's edge roads (`src/sim/settlers.ts`, `edgeRoads`), and hunters and herds already move off-road (`src/sim/hunt.ts`, `src/sim/wild.ts`), which caravans and raiders can reuse. The state is at version 13; saves are about 135 KB for `#town`.
- **Budgets:** the bare link's first frame at about 1.5–1.85 s, `#town`'s at about 2.4 s, and `#richtown`'s at about 2.7–3.1 s, right at the 3-second target (it plays three years of history first). Download 332 KB compressed.

## What Oliver will experience

**The map of Greece.** He clicks "Greece" and the city gives way to a toy Aegean on a table: the Peloponnese in ochre hills, Athens' walls and acropolis, Sparta in its valley, Corinth on its isthmus, Troy across the sea, Tyre's sail far off to the south-east, his own little city on the Argolic Gulf. Hovering a city shows its ruler's face and mood; clicking opens their panel: who they are, how they feel about him and why, what they make, what they want, at what prices, and what's happening there.

**Traders in the streets.** He builds a caravan yard near the north road, opens a land route to Corinth, and a month later a string of donkeys with a drover in Corinthian red comes in at the map's edge, walks down his main street and into the yard. They take his oil and leave wine, and porters carry the jars off to the storehouse. Athens' ship sails into the bay in blue and white and ties up at the quay. On the map, he can watch both on their way.

**Prices that move.** He sells oil to Corinth every visit and watches the price slide, with the reason saying why. A failed harvest in Athens sends wheat soaring there, and the town line says so; he switches his wheat to the Athenian ship and the ledger shows it.

**Rulers who remember.** He sends wine to Sparta's king for the Karneia, and the mood line lifts with "+18 · your gift of wine". Athens asks for wheat in four months; he promises, then runs short, and the "promise broken" line sits on Athens' panel for a long time, with prices a little against him. He can see exactly why each ruler feels as they do.

**A threat, then raiders.** Troy's proud queen demands tribute; he refuses. A threat follows with a deadline and the price of peace. He lets it run, a war band marches along the map towards him, a horn sounds and a chip counts the days; they come in over the eastern hills, set a farm alight and leave with a cart of fleece. The watchmen save the next street. Afterwards her temper has eased, and he can mend things with a gift.

**Greece goes on.** Sparta and Athens fall out and go to war: crossed swords on the map, little armies on the road. Both ask him for wheat; selling to one cools the other. When peace comes, the loser's prices tell the story for a year.

**A world of rivals.** By the end, a prepared town trades with every city, has a request open and a threat brewing, a war going on between two rivals, and caravans and ships coming and going, so he can judge whether the world feels alive and whether he can always see where he stands.

## Technical design

- **State (`src/sim/state.ts`):** a `world` record:
  - the cities (fixed list: yours, Athens, Sparta, Corinth, Troy, Tyre), each with a ruler (name, traits, portrait seed), mood towards you as a list of memories (kind, amount, tick, fade), moods towards each other, its goods' stocks, needs and production, its price history (monthly, a year), harvest, festival and war state;
  - routes (open or not, land or sea, the next trader's schedule, yearly totals bought and sold, what you buy and sell and the keep or stock-up figures);
  - requests, offers, tribute demands and threats, each with a deadline and state;
  - the travellers on the map (traders, gifts and sent goods, armies, raiders) with their route, phase and start tick, so their position is a pure function of the tick, like the ship's;
  - the world's own RNG state, separate from the city's;
  - the state version is bumped, with a migration from version 13 that seeds a fresh world.
- **Modules:**
  - `src/sim/world.ts`: the cities and their goods, the price model, harvests, festivals and wars, ticked once a day (cheap);
  - `src/sim/diplomacy.ts`: moods and memories, requests, offers, tribute, threats and raids' timing;
  - `src/sim/routes.ts`: routes, the traders' schedules, caravans in the city (entering at the map's edge, walking roads to the yard, reusing the walkers and settlers' edge roads), foreign ships (reusing the ship's berth and path code), buying, selling and imports to stores;
  - `src/sim/raids.ts`: the raiders on the city map (reusing the off-road walking of hunters), looting and setting fires through the phase 2 fire code;
  - the world geography (city positions, roads and sea lanes, travel times) as authored data, like the coast.
- **Rendering:** `src/render/worldmap.ts`, its own three.js scene and camera on the same renderer, built on first open; the relief from authored data (a height field from a few dozen shaped hills and coast outlines), toy cities, routes as dashed lines, travellers as small instanced figures. The city's scene isn't drawn while the map is open. New city meshes: the caravan yard, donkeys and drovers, foreign ships in city colours, raiders, all in code.
- **UI:** the Greece button and key; the city panel (portrait, mood and reasons, goods and prices with arrows and a year's chart, route, gifts, requests); the news list; the trade panel's tabs; new top-bar chips (traders due, a threat's countdown); town lines from Greece in their own colour.
- **Money:** imports, gifts and tribute go through the treasury with their own reasons, so the ledger invariant holds.
- **Principles held:** the sim stays pure and deterministic; the renderer and UI only read; every action is a command; nothing on the map that the city can't feel, and nothing in the city without a reason you can read.
- **Targets tuned by eye:** route fees and trader intervals; yearly limits; the price model's swing and recovery; how much each memory is worth and how fast it fades; how often requests, offers, tribute and threats come; raid size and loot; harvest, festival and war frequency; the map's look and travellers' pace.

## Testing

Only where it earns its keep:
- determinism: the same seed and commands give the same city and the same Greece after N ticks, with routes, requests, a war and a raid in it;
- independence: a town that never opens a route or answers a ruler plays exactly as it did before this phase (the earlier demos' histories unchanged);
- save and load round-trip with the world in it, and a version 13 save loads and plays on;
- the ledger invariant with imports, gifts, tribute and loot;
- prices: selling lowers a price and it recovers; a failed harvest raises food prices; prices stay within sane bounds over many years;
- moods: each memory's effect and fade; a broken promise outlasts a refusal; the reasons list sums to the mood;
- routing: caravans enter at the right edge, reach the yard and leave; foreign ships share the berth; raiders reach a target and leave; a paid-off band turns back;
- budgets: the world map's first open time and frame cost, the city's load unchanged, and the prepared town's frame and load targets.

## Build slices

Slices are numbered across the whole project.

### Slice 15 — The map of Greece
- The tabletop map view: the Aegean relief, the five cities and yours, Tyre at the edge, the roads and sea lanes; the Greece button and key; built on first open; camera, hover and click.
- The world state with shuffled rulers (names, traits, portraits, starting moods with their reasons), each city's goods and steady prices for now; the city panel showing all of it (no routes or actions yet); renaming your city.
- The Tyre ship shown on the map in step with the city; the save version and migration; the welcome back.

*Oliver can:* open the map from `#town` (or the `#greece` token), turn and zoom the table, hover and click each city to meet its ruler and see what they make and want, watch the Tyre ship's sail cross the map in `#sail`, and start two new towns to see the rulers shuffle.

### Slice 16 — Routes and traders
- Opening land and sea routes; the caravan yard; caravans walking in from the map's edge to the yard and out again; foreign ships at the quay, waiting their turn at anchor.
- Buying and selling per city with yearly limits, at each city's prices (still steady); imports carried to the stores; the trade panel's tabs; ledger lines by city; the traders chip.
- Travellers on the map in step with the city.

*Oliver can:* build a caravan yard, open a route to Corinth and watch the donkeys walk down his street; open a sea route to Athens and see her ship tie up; buy wine for a town with no vineyards and watch it reach the villas.

### Slice 17 — Prices that move
- Each city's stocks, needs and production; prices that move with them, your selling and buying, and harvests each autumn.
- Arrows, reason lines and a year's chart on the city panel and the trade panel.
- The ruler's terms on top of the market price (from the starting moods, for now).

*Oliver can:* sell oil to Corinth visit after visit and watch the price slide and say why, see a failed harvest send wheat soaring in one city, and play cities off each other.

### Slice 18 — Rulers who remember
- Moods made of memories, with values, dates and fading; personalities bending them; the mood's effect on terms, gifts and routes (a hostile ruler closes theirs).
- Sending gifts of coin or goods (goods leaving the city visibly); rulers sending gifts back.
- Town lines when a ruler's mood turns.

*Oliver can:* send a gift and see the mood lift with its reason, see what happens to a route when a ruler turns hostile, and mend it.

### Slice 19 — Favours, offers and tribute
- Requests with deadlines; promising, sending, refusing and breaking a promise, and what each does to the mood.
- Year-long offers; tribute demands from proud or warlike rulers.
- The requests on the map and in town lines; goods sent out for them, visibly.

*Oliver can:* meet Sparta's request for wheat and see the lift, break a promise to Athens and watch it linger, take Corinth's offer for oil, and refuse a tribute demand.

### Slice 20 — Raiders at the edge
- Threats with a deadline and a price of peace; the war band on the map; the countdown chip and horn.
- Raiders on the city map: in at the right edge, over the land to a target, looting or burning, and away; people running indoors.
- Paying them off late; the anger spent afterwards; the costs in the ledger.

*Oliver can:* refuse a demand in `#threat` and watch it play out to a raid on a farm, pay off a band in `#raid` and see it turn back on the map, and clear up after a raid.

### Slice 21 — Greece goes on
- Rulers' moods towards each other; feuds and wars between rivals, with armies on the map, closed routes and prices moved; peace and its aftermath.
- Festivals at their seasons; harvests on the map; requests from both sides of a war and the cooling for trading with an enemy.
- The News of Greece list and town lines from Greece.

*Oliver can:* watch a war start between two rivals on the map, see what it does to prices and requests, choose a side by what he sells, and read the news.

### Slice 22 — A world of rivals
- A prepared demo town trading with every city, with a request open, a threat brewing and a war between rivals, for judging the look and checking the budgets.
- The world's numbers tuned across a few years of play; a look-and-feel pass over the map, the traders, the raiders and the panels.
- The per-frame cost of a big town (phase 2's finding: batching the homes that are rising a level), and other rough edges Oliver would notice.

*Oliver can:* open the prepared town, play it for a few years, and judge whether Greece feels alive and whether he can always see where he stands with each ruler and why.

## Recorded for later

- Colonies and vassals, run lightly (the vision's "bring rivals under your rule").
- War: soldiers, walls, fighting raiders off, expeditions abroad, fleets guarding, blockading and raiding the sea lanes (the war phase). Raiders are the first taste.
- Egypt and more cities at the map's edges; generated maps and other starting places.
- The gods in diplomacy: festivals for gods, gods' moods (the gods phase).
- Alliances with rulers, and marriages or hostages.
- New goods that only come from abroad (bronze, marble, timber, papyrus), when the war or monuments phases give them a use.
- From phase 2: crime; seasons that affect farming and herds; elite estates; a wage slider; which god the shrine belongs to; early fire; harsh taxes' bite; smoother tax money.

## Out of scope for this phase

- Fighting: no soldiers or walls; raiders can't be fought, only bought off or recovered from.
- Commanding ships or caravans yourself (their traders come to you).
- Colonies and vassals; alliances.
- The gods as characters.
- Ambitions and monuments.
