# Slice 18 — Rulers who remember

*18 Oct 2026. Phase 3, "Greece beyond the walls" (`docs/specs/2026-10-17-greece-beyond-the-walls-design.md`). The fourth slice of the phase. Builds on slice 17, "Prices that move", and its review.*

## Goal and check-in

The spec's words: moods made of memories, with values, dates and fading; personalities bending them; the mood's effect on terms, gifts and routes (a hostile ruler closes theirs). Sending gifts of coin or goods (goods leaving the city visibly); rulers sending gifts back. Town lines when a ruler's mood turns.

Until now a ruler's mood was a first impression that faded: nothing you did changed it. This slice makes it answer you. A gift lifts it, with its reason on the ruler's page; a personality bends what a gift is worth; the mood moves the terms (as slice 17 already does), how often their traders come, whether their route stays open, and whether they send you gifts; and when it turns, a line under the top bar says so and why.

**Oliver can:** send a gift and see the mood lift with its reason, see what happens to a route when a ruler turns hostile, and mend it.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#gift`: `#routes`' town (a caravan yard on the north road, nothing opened with Corinth yet) with the map open on Corinth's page, on its ruler's tab: the "Send a gift" rows with what each gift would be worth to the lord now. Send 250 dr and watch the herald walk the road to Corinth; five days later the mood lifts and the reason is on the page ("+17 · your gift of 250 dr"). Send oil from the stores and watch the yard's porters fetch it and a little caravan in your colours walk out of the city by the north road.
- `#hostile`: `#buywine`'s town (it buys its wine from Corinth) with Corinth's lord turned hostile: the road closed, no caravans coming, and the town line saying so. The map opens on Corinth's page. Send a gift and the road opens again when it arrives.
- `#thanks`: Corinth's lord warmed by your gifts, and his own gift (goods for your stores) on the road to your city, a few days from the edge.
- Every earlier token keeps working. The 64 demos from before slice 16 open and play 900 ticks on exactly as before (their city state; Greece's moods can differ only by the new rules, which in a town with no dealings change nothing). The route demos of slices 16 and 17 may differ on purpose (a fickle ruler's whims, a cold ruler's slower traders), and are checked by the same probe.

## Not in this slice

Requests, offers and tribute (19: refusals and broken promises are memories they will add); threats and raids (20); rulers' moods towards each other, wars, festivals and the News of Greece list (21). Nothing in this slice yet angers a ruler a lot on its own, so `#hostile` sets its anger up in the demo (said so on the page and in the check-in). Gifts to win favour at a festival wait for festivals (21).

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- Sim code (`src/sim/`, `src/map/`) stays pure and deterministic. The world's dice: anything new that is random (a fickle ruler's whims, a ruler's gift back) is drawn from a hash of Greece's seed, the month and the city, not from `world.rng`, so the harvests every earlier game rolls stay exactly as they were.
- Money moves only through `pay` / `income`, on new ledger lines ("Gift · 250 dr to Corinth", "Gift · from Corinth"); goods given and received go through the stock book.
- **Earlier towns are untouched.** Rulers only act on you (whims, gifts back) once your city has dealt with Greece: opened a route or sent a gift (`world.contact`). Proved by the demo probe outside the repo (the hash of each demo's whole city state, Greece and the stock book aside, at opening and 900 ticks on, from the baseline and from this slice).
- Old saves still load: a version 17 save opens in version 18 with no gifts on the way, its contact from its first route, and every mood where it was.
- The renderer and UI only read sim state; every action is a command. Static build, `base: './'`, no runtime network requests, all art generated in code.
- Judge by screenshots, tune by eye, never claim it looks or feels right on Oliver's behalf.

## Before

Measured at `2805f15` (the end of slice 17's review), headless Chromium with software WebGL at 1920 × 1080:

| | Before |
|---|---|
| Tests | 268 in 24 files, all passing; typecheck clean |
| Bundle | 4 files, 1,317 KB raw, 387 KB gzipped |
| Load, bare link (page clock) | ready 2.13 s, first frame 2.75 s |
| `#town` | 799,168 triangles, 83 draws; save 141 KB; 13.2 ms work a frame running |
| `#richtown` | 910,707 triangles, 95 draws; save 178 KB; 16.1 ms work a frame running |
| `#caravan`, `#prices`, `#famine` | 516,365 / 39 following the caravan; map 304,642 / 22 and 304,206 / 22 |
| The 69 demos | each one's opening and a hash of its whole city state at opening and 900 ticks on, recorded outside the repo |

## Design decisions

**Memories** (`src/sim/diplomacy.ts`, pure). A ruler's mood stays the sum of their memories (`moodOf`), each with what it is worth, when it happened and how long it takes to fade (linearly, as now). New kinds:
- **Your gift** (`gift`), when it arrives: worth `20 × √(value ÷ a fair gift for your size)`, at most 40. The value is drachmas, or for goods what they are worth to that city (its market price: a gift of what it is short of counts for more). A fair gift is half a drachma a head of your people, at least 200 dr. Fades over eighteen months.
- **Their trader turned back** (`snub`): −4 when their caravan or ship found no yard, road or post to trade at; fades over six months.
- **A fickle ruler's whim** (`whim`): once your city has dealt with Greece, a fickle ruler now and then (about one month in eight, when no whim is on) takes a fancy to your city or a dislike to it, 10 to 30 either way, fading over four to seven months: "in a black temper with your city, for now".
- **Personalities bend them:** greedy (a gift of coin half as much again), generous (a gift a quarter more, remembered half as long again), shrewd (a gift a fifth less), steadfast (everything a quarter less, remembered half as long again), proud (a meagre gift, under half a fair one, counts half; a snub half as much again), fickle (remembered half as long, and whims). **Too often:** each gift of yours that arrived in the last six months cuts the next one's worth ("another gift so soon: kind, but…"): to 1/(1 + 0.7 n). Every bend is named in the reason line.
- **The reasons add up to the mood**, as now, each with its date and whether it is fading.

**What the mood does.**
- **The terms:** as slice 17 (a third of a percent a point, at most a fifth either way), now moving with the mood.
- **Traders:** a cold ruler (−30 to −59) sends them half as often again (a caravan every three months, a ship every four and a half). A hostile ruler (−60 or worse) closes the route: no trader sets off (one already on the road still comes), the route's tab and the city's page say so, and it opens again by itself when the mood is better than hostile, the next trader a month later (or as long as a ship takes to sail). A cold or hostile ruler won't open a new route (as now).
- **Gifts back:** a warm ruler (30 or better), once your city has dealt with Greece and at least eight months after their last gift, sends you one now and then (about one month in ten when warm, one in five when devoted; twice as often if generous, half if greedy): drachmas (150 to 450), or goods they make plenty of, worth about the same. It travels the road or the lane on the map; when it reaches your map's edge or your gulf, the coin goes into the treasury ("Gift · from Corinth") and the goods onto the caravan yard or the quay (whose porters or dockers carry them to the stores), or straight into the stores if there is neither. A line under the top bar says who sent it and why.

**Sending a gift** (command `gift`: a city, a good by its ware number or −1 for drachmas, and how much). From the ruler's tab of a city's page:
- **Coin:** 100, 250 or 500 dr, if the treasury can spare it. Paid at once; a herald takes it along the road (or by sea, where there is no road), and it counts when it arrives.
- **Goods:** 200, 400 or 800 of a trade good the stores hold. By road it goes from the caravan yard, by sea from the trading post (whichever there is, the road first): the yard's porters or the post's dockers fetch it from the stores (their first job, ahead of trade), and when it is all there it leaves: by road as a little caravan in your city's colours walking out to the edge of the map on that city's side, then along the road on the map; by sea in a ship in your colours that casts off from beside the jetty and sails out of the bay, then along the lane. If the stores run out before it is all fetched, it goes with what there is.
- One gift on its way to each ruler at a time. Each row shows what the gift would be worth to the ruler now (the same sum the sim makes on arrival, as things stand), so you can see what a gift will do before you send it.

**Town lines when a mood turns.** When a ruler's mood passes into another word (cordial to warm, wary to cold…), a line comes under the top bar for a fortnight, in Greece's colour, naming why: "Lord Periandros of Corinth has warmed to you: warm now, after your gift of 250 dr", "King Archidamos of Sparta has cooled to wary, as the first word of your city fades", "Lord Periandros of Corinth is hostile now, and has closed the road to your city". A gift arriving, a gift received and a route closing or opening each say so. Clicking the line opens that city's page. The line under the top bar shows the newest two pieces of news.

**The city's page, reorganised** (slice 17's review: it ran long, and with a route open the terms showed twice). A header with the portrait, name, title and traits, the mood (face, word, number) and the terms, once; then three tabs:
- **Ruler:** how they feel and why (the reasons), what that means for you (terms, how often traders come, the route open or closed, gifts back), sending a gift and the gifts on their way, and how the city is reached.
- **Prices:** the harvest and every good's price with its arrow, chart and reason (slice 17's block, without the terms line).
- **Trade:** the routes (slice 16's rows, without the terms line).
The tab is remembered while the map is open; a demo can choose it. The trade panel's route tabs keep the terms line once, above the tables.

**On the maps.** Your gifts and theirs travel the roads and lanes on the map of Greece (yours in your colours, theirs in their city's), hoverable: "Your gift to Corinth · 250 dr · arriving in 3 days". In the city, the gift caravan and the gift ship can be hovered. The ledger has the gift lines; the side panel's goods pages show what went as gifts ("A gift to Corinth") and came as gifts.

**State** (version 18; `from17`): `world.gifts` (each gift: from, to, the good or coin, the amount and what was fetched so far, its way, its phase and its times), `world.contact` (the tick of your first route or gift, 0 for none; from the first route's opening in an older save), `world.nextGift`; each city's `feel` (the mood word last announced) and `gave` (when it last sent you a gift); each route's `closed` (the tick it closed, 0 open). A gift's docker carries the gift's number in the walker's spare `cheese` field.

## Tests

`tests/diplomacy.test.ts`:
- a gift's worth: bigger for a bigger gift, smaller for a bigger city, bent by greedy, generous, shrewd, steadfast and proud as described, and cut when sent too often; the reasons name the bends and add up to the mood;
- memories fade on time, a fickle ruler's twice as fast; whims only for fickle rulers, only after contact, and within their bounds;
- a coin gift: paid at once, on the ledger, travels for the road's time, and lifts the mood on arrival; one at a time per ruler; refused without the money;
- a goods gift by road: the yard's porters fetch it from the stores, it leaves as a caravan to the edge, travels the road, and lifts the mood; the stores and the stock book show it went; a gift by sea leaves from the post;
- a hostile ruler closes the route (no trader sets off), a gift that lifts the mood past hostile opens it again and the next trader comes; a cold ruler's traders come half as often again;
- a warm ruler sends gifts back after contact, never before, and they reach the treasury or the stores; the ledger invariant holds throughout;
- a mood turning makes a line of news naming why;
- independence and saves: a town with no dealings plays exactly as before (the city state, Greece aside); a town with gifts on the way round-trips; a version 17 save loads and plays on.

Plus the existing suite and the demo probe outside the repo. `smoke.mjs` opens `#gift` (sends coin, waits for the arrival and the reason), `#hostile` (closed route, a gift, reopened) and `#thanks`; `measure.mjs` adds `#gift` and `#hostile`.

## Tasks

1. Plan (this file), with the baseline measured. Commit.
2. Sim: state and migration, memories and their bends, gifts (coin and goods, both ways), the mood's effect on routes, whims, gifts back, the news; tests; the demo probe. Commit.
3. UI and render: the city page's header and tabs, the gift rows and gifts on their way, routes closed in the panels, the town lines, gifts on the map of Greece, the gift caravan and ship in the city, the ledger and side panel lines. Commit.
4. Demos and look-and-tune: `#gift`, `#hostile`, `#thanks`; screenshots, adjust; smoke and measure extended. Commit.
5. Full checks, measurements (alternating with the baseline build), As built, the check-in. Commit, push.

## As built

Built as planned, in three commits after the plan (the sim; the UI, render and demos; the check-in), with these differences and settlements:

- **The model** is as designed. A gift is worth `20 × √(value ÷ fair)`, at most 40, with a fair gift `max(200, ½ dr a head)`, bent by greedy (coin ×1.5), generous (×1.25, remembered ×1.5), shrewd (×0.8), steadfast (×0.75, remembered ×1.5), proud (a meagre gift ×0.5) and too often (÷ 1 + 0.7n for the n of yours that arrived in the last six months). The reason line names each bend ("your gift of 500 dr (shrewd: hard to impress; another so soon: kind, but…)"). A snub is −4 (proud −6, steadfast −3) over six months; a fickle ruler's whim is ±10 to 30 over four to seven months, about one month in eight. Gifts back: one month in ten when warm (devoted ×2, generous ×2, greedy ×½), from three months after contact, at least eight months apart, 150 to 450 dr, or goods they make plenty of (60% of the time). The dice are a hash of Greece's seed, the month and the city.
- **News of a mood turning only once your city has dealt with Greece** (`world.contact`). Before, the drift of first impressions changes the word quietly (and the page shows it), so no earlier demo gains a line under the top bar.
- **A ruler closing the road calls home a caravan still on it on the map** (it turns round where it is). The caravan already in your city still comes to the yard. A ship already at sea when a sea route closes simply drops off the lane (a rough edge, said in the check-in).
- **The city's page:** the header holds the portrait, traits, mood (face, word, number) and the terms line, once. The **Ruler** tab has the reasons, "What it means for you" (each route's trader pace or that it is closed and what opens it, gifts back, and **where the mood is heading a year on as things stand**, with the terms then, which answers the review's finding that terms drift as first impressions fade), and the gift rows: drachmas 100 / 250 / 500 and every trade good the stores hold 200 or more of (200 / 400 / 800), each button showing the `+n` it would add now (`giftMemory`, the sim's own sum) and, in its tip, the reason with its bends and the value. A gift on its way, or one coming from that ruler, shows as a line instead. "Getting there" went to the **Trade** tab (it is about routes); **Prices** is slice 17's block without its terms line. The Trade tab's label says "· closed" or "· 1 open". The tab is kept while the map is open and goes back to Ruler when it closes; a demo picks it (`greeceTab`), and so does `probe.greece(open, city, tab)`.
- **On the maps:** gifts on the map of Greece in their giver's colours (a caravan for land, a ship for sea), hoverable ("Your gift to Corinth · 250 dr", with when it arrives); clicking one opens that city. In the city, the gift caravan is a caravan walker in your colours (its drover's tip says what it carries), and the gift ship a `ShipView` in your colours, laden, hoverable.
- **The ledger** has "Gift · to Corinth" (going out) and "Gift · from Corinth" (coming in); the side panel's goods pages say "A gift to Corinth" / "A gift from Corinth". The line under the top bar shows the newest two pieces of Greece's news.
- **`#hostile`** is `#buywine`'s town with a staged memory of −72 ("furious with your city (set up for this demo)") fading over four years: −67 in all, so 250 dr mends it and 100 dr doesn't, and left alone the road opens by itself in about five months. The wine caravan already in the city still unloads; the next, already on the road on the map, turns back.
- **`#thanks`** sends no route: the town saves up 1,500 dr and sends three gifts of 500 dr one after another (Corinth +5 → +33, warm), then the demo sends Corinth's gift back (400 cheese) at once with `rulerGift` rather than waiting for the dice, said in the check-in. It opens four days from your map's edge; the cheese lands on the caravan yard and its porters carry it off.
- **`#gift`** is `#routes`' town as it stands, on Corinth's Ruler tab. `#routes` opens on the Trade tab, `#prices` and `#famine` on Prices.
- **Probe hooks:** `probe.gifts()` (each gift, and where its caravan or ship is drawn), `greeceInfo().tab`.
- **Smoke:** `#gift` (tabs, a 250 dr gift: treasury, panel line, the gift on the map and its hover card, the arrival line and the reason), `#hostile` (closed, the line, a gift reopening it), `#thanks` (the gift coming, its arrival line), and the terms once on `#routes`' page. The `#famine` harvest-line check now waits for the half-second refresh of the lines under the top bar (it read them three frames after pausing, which raced the refresh). `measure.mjs` adds `#gift` and `#hostile`.
- **Tests:** 16 in `tests/diplomacy.test.ts`, with a version 17 save fixture (`#caravan` 40 ticks in, from the baseline code). The Greece-only test helper in `tests/prices.test.ts` steps the rulers too. 284 tests in 25 files.
- **The demo probe** (outside the repo): 69 of the 71 earlier demos open and play 900 ticks on exactly as at the baseline (all 64 from before slice 16, and `#routes`, `#caravan`, `#buywine`, `#anchor`, `#prices`); `#athensship` and `#famine` differ on purpose, by Athens' lord's (fickle) whim: 18 dr more after 900 ticks.
- **Measured** (the baseline twice, the first while tests ran alongside; this build once between): bundle 1,342 KB raw and 395 KB gzipped (+25 and +8); bare link ready 2.0 s and first frame 2.6 s, within the baseline's noise; `#town`, `#richtown`, `#caravan`, `#prices` and `#famine` triangles and draws unchanged, saves 1 KB bigger (142 and 179 KB); `#gift` and `#hostile` ready at about 4.0 s by the page's clock, 20 and 22 draws on their map pages; work a frame within the baseline's spread except `#richtown` running (20.2 ms against 16.1 and 18.4, one run, and nothing new runs there: the town has never dealt with Greece). `npm test` 284 passing, `npm run build`, `npm run smoke` and `npm run measure` clean.
- **Review** (two fixes commits, plus the docs): a ruler closing a sea route turns their ship at sea round where she is (`recall` in `diplomacy.ts` now takes the route; for a ship it moves her `since` so `visitorOnMap` has her outbound from where she was); `causeOf` picks the memory that moved most over the last day, so a turn when a memory fades out completely still names it, worded by kind (`fadingWords`); the gift number in a docker's or caravan's `cheese` is read and set only through `giftOf` / `setGiftOf` in `walk.ts` (they check the walker's kind), with one `giftInHand` in `trade.ts`; a gift's goods are noted in the stock book as each load is handed over; a ruler's gift of goods uses `depotRoom` and says when there was no room; one gift `ShipView` per city sailed for (`CityView.giftShips`); a city label on the map of Greece fades (`.veil`) while a traveller or gift is under it; the Ruler tab says how many points a closed route is short of opening and leaves out gifts back while cold or worse; the gift rows find the goods' way out (a road search) once per draw. Two tests (a ship turned back at sea; a fading memory named in the turn's line): 285 tests in 25 files. `#richtown`'s 20.2 ms was noise (13 to 18 ms in four runs each, before and after). The demo probe: every demo as the builder left it.
