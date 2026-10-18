# Slice 16 — Routes and traders

*17 Oct 2026. Phase 3, "Greece beyond the walls" (`docs/specs/2026-10-17-greece-beyond-the-walls-design.md`). The second slice of the phase. Builds on slice 15, "The map of Greece", and its review.*

## Goal and check-in

The spec's words: opening land and sea routes; the caravan yard; caravans walking in from the map's edge to the yard and out again; foreign ships at the quay, waiting their turn at anchor. Buying and selling per city with yearly limits, at each city's prices (still steady); imports carried to the stores; the trade panel's tabs; ledger lines by city; the traders chip. Travellers on the map in step with the city.

This is the first slice where Greece reaches into the city: donkeys on the streets, a new building, foreign ships at the quay, goods coming into the stores.

**Oliver can:** build a caravan yard, open a route to Corinth and watch the donkeys walk down his street; open a sea route to Athens and see her ship tie up; buy wine for a town with no vineyards and watch it reach the villas.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#routes`: `#town` with a road out to the north edge, a caravan yard built beside it and staffed, and money enough to open a route: the map of Greece open on Corinth's page, its "Open a road to Corinth" button ready.
- `#caravan`: the same town a month after opening the road to Corinth, the first caravan coming in at the north edge and walking down the main street to the yard, the camera following it.
- `#athensship`: `#ship`'s town with a sea route to Athens open, the Athenian ship tied up at the jetty in blue and white, unloading and loading.
- `#anchor`: the same, timed so the Athenian ship comes in while the Tyre ship is loading: she anchors in the bay and waits her turn.
- `#buywine`: `#town` (no vineyards) with the road to Corinth open, buying wine to stock its storehouse and a wine stall added to an agora: the caravan unloading wine at the yard and porters carrying it up to the storehouse.
- Every earlier token keeps working and opens exactly as before (no routes open in any of them).

## Not in this slice

Prices that move, reason lines and charts (slice 17); the ruler's terms and moods that change from what you do, gifts (18); requests, offers and tribute (19); raids (20); wars, festivals and news (21). Rulers do not react to your trading yet. Sounds for traders (a bray, the ship's bell) are left for a later slice unless they come cheap. Only one caravan yard.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- Sim code (`src/sim/`, `src/map/`) stays pure and deterministic: no `Math.random`, `Date`, `performance` or timers (the purity test enforces it). Opening a route and every trade setting reach the sim as commands through the queue.
- Money moves only through `pay` / `income`: route fees, imports and sales each on their own ledger line. The ledger invariant holds.
- **Earlier towns are untouched.** Everything new lives in `world.routes` (and new walkers and buildings only once a route or a yard exists), so a town with no route and no yard plays exactly as before. Proved by the probe outside the repo that plays every earlier demo from the baseline commit and from this slice and compares a hash of the whole city state (everything but Greece and the stock book) at opening and 900 ticks on.
- Old saves still load: a version 15 save opens in version 16 with no routes (nothing in a route record existed before); older ones go through every step.
- Traveller positions on the map are pure functions of the state and the tick (as the Tyre ship's is).
- The renderer and UI only read sim state. Static build, `base: './'`, no runtime network requests, all art generated in code.
- Judge by screenshots, tune by eye, never claim it looks or feels right on Oliver's behalf.

## Before

Measured at `da734a1` (the end of slice 15's review), headless Chromium with software WebGL at 1920 × 1080:

| | Before |
|---|---|
| Tests | 234 in 22 files, all passing; typecheck clean |
| Bundle | 4 files, 1,252 KB raw, 368 KB gzipped |
| Load (page clock) | measured while tests ran alongside, so re-measured at the end alternating the two builds |
| `#town` | 799,168 triangles, 83 draws; save 140 KB |
| `#richtown` | 910,707 triangles, 95 draws |
| The 60 earlier demos | each one's opening and a hash of its whole city state at opening and 900 ticks on, recorded outside the repo |

## Design decisions

**State** (version 16; `from15` gives every route list nothing, which it already is). Everything new is in `world`:
- `TradeRoute` (one per city and kind): `city`, `kind` (land or sea), `opened`, `next` (when its next trader is due: a caravan at your map's edge, a ship at the jetty), this year's `sold` and `bought` by trade good, the player's `sell` and `buy` ticks and `upto` (stock up to) by trade good, a sea route's `ship` (a `Visitor`: phase, since, path, the post she calls at, `turned`, and `stop`, how far along her way in she anchors), and the visit: `hold` (taken so far), `unloaded`, `visits`, and the last visit's date, goods and drachmas each way.
- `travellers`: a caravan on its way between its city and your map's edge (`trader`, its way, start and duration, homeward or not). The map draws it at a pure function of the tick; it is let go when it arrives.
- How much the city keeps of each good (`trade.keep`) stays one figure, shared by the Tyre ship and every route: there is one surplus in the stores.

**Routes** (`src/sim/routes.ts`).
- Ways: by land to Corinth (500 dr), Sparta (600) and Athens (750, by Corinth and the isthmus road); by sea to Athens (800), Corinth (800) and Troy (1,000). A land route needs the caravan yard, a sea route the trading post. A ruler who is cold or worse won't open one ("Sparta's king won't deal with you: cold"); the starting moods are never that low, so this only bites from slice 18.
- Opening: a command. The fee goes out on the ledger (`routes`, "Trade route · Corinth by road"); the first trader is due a month later; nothing is ticked yet.
- **What each city trades:** what it makes plenty of it sells you, what it is short of it buys (as slice 15's page says), each up to a yearly limit of about the gap between what it makes and uses (400 to 6,000, in hundreds), at its own price per hundred (steady). Limits start afresh each new year.
- **Schedules:** a caravan every two months, a ship every three. A caravan takes a few days on the map (by the length of the road), a ship sails at the Tyre ship's pace between her city and the gulf's mouth.

**Caravans in the city.**
- The caravan yard (new, `yard`, 3 × 3, 300 dr, 4 workers; only one): a walled yard with a donkey pen, a well, an awning over trestles and stacked goods. It holds up to 1,600 of each good, like the quay.
- A caravan is a walker (`caravan`): a drover in the city's colour and four or five laden donkeys. It comes in at the edge road nearest its city (Corinth and Athens from the north, Sparta from the west; any edge road if there is none on that side), walks the roads to the yard at a cart's pace, trades for three days and walks out the way it came. On the map it is a little string of donkeys on the road, coming and going, in step with the city.
- No road from any edge to the yard: the caravan turns back at the edge; the yard and the route say why.
- The yard's porters are the dockers' work, reused: carrying the surplus of goods ticked for sale on any land route to the yard, and carrying imports (and anything taken off sale) back to the granaries and storehouses.

**Foreign ships.**
- Each sea route has its ship, the Tyre ship's model in her city's colours (sail stripes and hull band), using the same way in, mooring and way out.
- **Sharing the berth:** the Tyre ship keeps her schedule and always ties up. A foreign ship coming in when the jetty is (or will be) taken sails to an anchorage off her way in, a little to one side, and waits; when the jetty is free and no ship is due before she would be done, she comes alongside. Ships wait in the order they came.
- On the map she sails her lane between her city and your gulf, in step with the city (as the Tyre ship does).

**Buying and selling.**
- Selling: the dockers (or yard porters) carry the surplus of every good ticked for sale on some route of that kind (or to Tyre, for the quay) to the quay or yard. A trader takes what is there of the goods ticked for its route, up to what is left of the year's limit, and pays at its city's price as it leaves ("Sales · oil to Corinth").
- Buying: on arrival, the trader unloads what you ordered: enough to bring the stores up to the route's stock-up figure, up to the year's limit, what fits on the quay or yard, and what the treasury can pay for now. You pay at once ("Bought · wine from Corinth"). The dockers or porters carry it to the stores.
- Both go in the stock book (`sold` / `bought`, by city).

**Readable everywhere it touches the city.**
- Hovering a caravan or a foreign ship says who they are and what they're doing; the yard's tip and panel say what it holds and what is due.
- The trade panel (the trading post and the yard open it) grows a tab per open route, plus Tyre on the quay: each route's tab has its schedule, its rows (what they buy, with a sell tick; what they sell, with a buy tick and a stock-up figure; each with its price and what is left of the year's limit), and its last visit.
- The map's city page gets a "Trade with …" section: the ways to open (fee, what is needed, or why not), and once open the same rows, so the whole route can be run from the map.
- The top bar's ship chip becomes a traders chip: with no routes it is exactly the ship chip; with routes it shows whichever trader is nearest (here now, then coming, then due soonest).
- Town lines: a trader arriving, and a caravan turned back for want of a road.

## Tests

`tests/routes.test.ts`:
- opening: the yard and post are needed, the fee goes on the ledger, the wrong kind of way is refused, a cold ruler refuses, a route opens once;
- caravans: one comes in at the edge road nearest its city, reaches the yard, trades and leaves the way it came; with no road from the edge, it turns back; on the map it travels and arrives as the city sees it;
- selling to a route within the year's limit, and buying: imports land on the yard or quay, are paid for, and reach the stores; buying stops when the treasury can't pay;
- foreign ships: one ties up and trades; while the Tyre ship is loading another anchors and waits, then comes alongside; her place on the map never jumps;
- the ledger invariant and the stock book's net with imports and sales;
- determinism: the same seed and commands give the same state with routes open;
- saves: a town with routes round-trips; the slice 15 save (version 15) loads and plays on; a damaged route is refused.

Plus the existing suite unchanged and the 60-demo probe outside the repo. `smoke.mjs` opens the new demos and checks the caravan, the foreign ship, the tabs and the map's buttons; `measure.mjs` adds `#caravan` and `#athensship`.

## Tasks

1. Plan (this file). Commit.
2. Sim: state and migration, routes, the yard, caravans, foreign ships and the berth, buying and selling, the ledger and stock book, saves; tests; the demo probe. Commit.
3. Render and UI: the yard and caravan models, foreign ships, travellers on the map; the trade panel's tabs, the map's route section, the traders chip, tips and town lines; the build bar. Commit.
4. Demos and look-and-tune: the five tokens, screenshots, adjust; smoke and measure extended. Commit.
5. Full checks, measurements (alternating with the baseline build), As built, the check-in. Commit, push.

## As built


Commits: the plan `73d81f8`; the sim `2ad7d71`; render and UI `fcffbf6`; smoke and measure `c50f83c`; this section and the check-in after it. Checked at the end: typecheck clean, 251 tests in 23 files passing, the build, the full smoke test (with the new checks) and the measurements, alternating with the baseline build (in the check-in).

**As planned:** state version 16 (everything in `world.routes` and `world.travellers`; a version 15 save opens with none); the six ways and their fees; opening by command, the fee on its own ledger line, the first trader a month later; each city's goods, prices and yearly limits; the caravan yard (3 × 3, 300 dr, 4 workers, one only, 1,600 of each good) and its porters (the dockers' work, generalised to a depot); caravans in by the edge road on their city's side (any edge road otherwise), turned back with a reason when there is none; foreign ships in their city's colours, anchoring aside while the Tyre ship has the jetty; buying on arrival up to the stock-up figure, the year's limit, the room and what the treasury can spare; selling as the trader leaves; the stock book; the trade panel's tabs; the map's "Trade with …" section; the traders chip; hover tips and town lines. The 17 tests in `tests/routes.test.ts`, and all 64 earlier demos open and play 900 ticks on exactly as at the baseline (the probe outside the repo).

**Different from the plan, and why:**
- **The demos open a little earlier than planned.** A caravan trades at the yard for three days and a ship is at the jetty for about three: at normal speed that is three seconds. So `#buywine` opens with the caravan about a week short of the yard (it comes in, unloads the wine, trades, and the porters carry the wine off), and `#athensship` with the Athenian ship most of the way up the bay, on her tab of the trade panel. `#athensship` buys up to 600 wine, not 1,000, so the town still has money for its wages afterwards. `#routes` opens with 300 dr more than the fee in hand, as the month's wages fell due while it waited for a click.
- **Caravans come less often than every two months in `#town`.** They walk at a cart's pace, and `#town`'s yard is about 70 tiles of road from the north edge: about 80 days in. One caravan trades at a time, and the next is due two months after the last one was, so the next arrives as soon as the last leaves (two on the main street at once, one in and one out): one every 87 days or so. The yard's placement tip says that the nearer the edge road, the sooner it comes and goes. A yard near the edge gets one every two months.
- **The road to Athens** (through Corinth) is not drawn on the map a second time: it is the two roads already there.
- **The traders chip** shows a donkey for a caravan and a ship for a ship. Its ranking was the wrong way round in the sim stage (a trader in port came last); fixed, with a test.
- **Travellers on the map of Greece** are drawn (ships on their lanes, caravans as a drover and three pack donkeys on the road, a little larger than life), but hovering or clicking them does nothing yet.
- No sounds for traders (left for later, as the plan allowed).

**For the next slice:** `routes.ts` keeps each city's price per hundred in `cityOf(world, city).price`; slice 17's moving prices can change that and the panels follow. Every route's news is `routeNews`; `tradersNews` ranks them for the chip. The probe hook `traders()` lists each route's trader, where it is drawn, and its travellers on the map; `greeceInfo().travellers` gives their screen places.

**Review (18 Oct).** Played every step of the check-in in headless Chromium at 1920 × 1080 and read the diff. Fixed: the caravan schedule advanced twice per caravan (`nextCaravan` from both the end of trading and `homeward` on leaving the map), so caravans came every 87 to 140 days and some crossed the map of Greece in a day; now `r.next` moves on once, as a caravan reaches your map's edge (or turns back there), the next sets off on the map regardless of the one in the city, and one reaching the gate while another of its city trades waits there (`tradingNow`); a caravan settles its own visit and keeps what it paid in `load` for its tip on the way out. `CARAVAN_SPEED` is `WALK_SPEED`. Imports spend `importPurse` (spendable less a month's wage bill). Trader sounds (`caravan` cue: bray and bells; the harbour bell for a foreign ship sighted; `sale` with a floater from the depot when a route's trader pays); a ship icon on a sea route's town line; the caravan hovered and followed by the middle of its string; the chip follows a caravan walking in; the buy rows show imports waiting at the depot; "Athens’". One new test (caravans every two months to a far yard, the whole road on the map, one trading at a time) and the buying test now checks the wages kept back; smoke checks the chip's follow and the ship's town line, and now waits for the map's label to take a new name (it is redrawn every half second of the map's clock, which runs slow at a frame a second, so the old fixed wait failed now and then). All 64 earlier demos still open and play 900 ticks on exactly as at the baseline (the probe).
