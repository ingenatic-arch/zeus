# Slice 13 — The ship comes in

*17 Oct 2026. Phase 2, "A richer city" (`docs/specs/2026-10-16-a-richer-city-design.md`). The sixth slice of the phase. Builds on slice 12, "Fire and collapse", and its review.*

## Goal and check-in

The city can sell what it has spare. A trading post goes on the bay shore, on land touching deep water, with a road; only one is allowed, and the placing tool tints the shore where it can go and says why elsewhere it can't. Once it stands, a merchant ship from overseas is due: the post and the top bar count the days down. The post's panel has a row for each good the ship buys (wheat, meat and cheese from the granaries; oil, fleece and wine from the storehouses) with its steady price, what the city holds, a sell tick and how much to keep for the city. The post's dockers carry the surplus (what the stores hold beyond what is kept) from the nearest store to the quay by the shortest road, and it stacks up there visibly. A few days before she is due a sail shows on the horizon; she sails into the bay, ties up at the post's jetty, loads what is on the quay of the goods ticked, pays at the prices shown and sails off. The coins land in the ledger as sales, by good, and pay any wages owed first.

**Oliver can:** build the trading post, tick what to sell, watch the quay fill and the ship come in, and pull a struggling treasury back into the black.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#trade`: `#town` four months on, with a road run down to the bay shore and money in hand, the trading post tool in hand. The shore where it can go is tinted.
- `#quay`: the post built a month ago, wheat, cheese, meat and oil ticked to sell, dockers on the road and goods stacking on the quay, the post's panel open.
- `#sail`: the same town a few days before the ship is due: her sail on the horizon, the countdown in the top bar.
- `#ship`: the ship tied up at the jetty, loading.
- `#black`: `#town` with its post built and goods ticked, taxes off (as in `#dry`) until the treasury ran dry and wages went unpaid; it opens paused with the ship's sail on the horizon, the quay stacked and the ledger open. Let it run and watch the sale pay the wages.
- Every earlier token keeps working and opens exactly as before.

## Not in this slice

Buying from the ship, moving prices, rival cities and sea lanes (the market and world phases); the money balance across the game (slice 14: the prices here are steady and sensible, and what slice 14 should balance is noted); a second ship or more than one post; fish; the prepared richer demo town (slice 14).

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- Sim code (`src/sim/`, `src/map/`) stays pure and deterministic: no `Math.random`, `Date`, `performance` or timers (the purity test enforces it). The ship's voyage is sim state: where she is is a pure function of her route, the phase and the tick, so the renderer draws her smoothly between ticks without owning anything. Every player action (building, ticking, keeping) reaches the sim as a command through the queue.
- Money moves only through `pay` (sales through `income`, so they pay owed wages first); the post's cost comes from `priceOf`.
- **No old history changes.** Nothing new happens in a town without a trading post: no new random draws, no new ids, no change to any existing step. Every demo is fingerprinted at `a07429f` (tick, people, money, the generators, the next id, every building's place, kind, level, people, stock, goods, workers, risk and wear, every walker's place and load, the ledger) and must match exactly. The new demos build their post at the end of `#town`'s history.
- The renderer and UI only read sim state. Static build, `base: './'`, no runtime network requests, all art generated in code.
- The ship is one merged mesh (a furled-sail version swapped in while she is tied up), the jetty part of the merged works, the quay's goods the existing instance batches; draw calls and per-frame cost measured before and after.
- Judge by screenshots, tune by eye, never claim it looks or feels right on Oliver's behalf.

## Before

Measured at `a07429f` (the end of slice 12's review), headless Chromium with software WebGL at 1920 × 1080:

| | Before |
|---|---|
| Tests | 188 in 18 files, all passing (39 s); typecheck clean |
| Bundle | 3 files, 1,097 KB raw, 315 KB gzipped |
| Load (local, headless, page clock) | ready at 1.26 s, first frame at 1.50 s; coast bake 0.59 s, scene build 1.19 s |
| Opening view / overview / river / street / bay | 574 k triangles, 59 calls / 583 k, 61 / 395 k, 30 / 416 k, 32 / 417 k, 28 |
| `#streets` / overview | 441 k, 36 / 620 k, 68 |
| `#water` / overview | 722 k, 74 (overview) |
| `#food` / overview | 677 k, 88 (overview) |
| `#fine` / overview | 814 k, 103 (overview) |
| `#town` / street / overview | 817 k, 83 / 749 k, 71 / 934 k, 109; ready at 1.85 s, first frame 2.36 s; 724 people |
| `#villas` / overview | 714 k, 80 / 890 k, 110 |
| `#fire` town / `#blaze` town | 841 k, 90 / 808 k, 89 |
| Update per frame, paused / running | `#food` 0.58 / 1.21 ms; `#fine` 0.72 / 2.79; `#town` 0.87–1.01 / 5.75–8.94 (noisy) |
| GPU objects | 51 geometries, 6 textures |
| A save of `#town` | 258 KB |

## Design decisions

**Where the post can go** (`src/sim/trade.ts`, pure functions of the baked map, worked out once per map).
- *Deep water* is sea at least 0.8 deep (the shelf drops to that four to seven tiles out from the beach), joined to the open sea at the map's edge through deep water. The ship sails only on it.
- A 3 × 3 trading post needs ordinary building ground (as a granary), a sea tile beside its footprint (it stands on the shore), and a *berth*: a deep-water tile within 6 tiles of the footprint, reached by a straight jetty from the middle of the footprint's side facing it over nothing but water. Only one post in the city.
- Refusals say what's wrong: "A trading post goes on the bay shore: no sea beside it here", "The water off this shore is too shallow for the ship: try where the deep water comes closer (the tint shows where)", "Only one trading post: the ship calls at one quay". The tool tints every tile that is part of some footprint with a berth (ignoring what is built there), so the usable shore shows at a glance.
- Good spots: the bay's north-east shore below `#town` (about (79, 72), the deep water five tiles off) and the river mouth's east bank (about (67, 65)). `#trade` lays a road from `#town`'s main street down to the first.

**The post** (`trading`, 3 × 3, 250 dr, 6 workers, fire risk and wear like the granary's, 330 days each). A stone quay with a crane and a counting house, turned to face the sea (a quarter turn to the side its jetty leaves from), and a timber jetty on piles out to the berth. It needs a road for its workers and dockers, like any workplace (amber, not red, without one).

**Selling and keeping** (`s.trade`, plain data).
- The ship buys six goods, each at a steady price per hundred measures: wheat 15 dr, meat 30, cheese 30, fleece 45, oil 60, wine 80 (fine goods worth most, wheat least).
- For each good: `sell` (off to begin with: the player chooses) and `keep`, measures kept in the city's stores (to begin with half a store's room: wheat 1,600, meat and cheese 600, oil 800, fleece and wine 600; steps of 200). A `trade` command sets either.
- The *surplus* of a good is what all the city's granaries (or storehouses) hold beyond `keep`, less what dockers are already on their way to fetch.

**Dockers** (walker kind `docker`). The post sends one (three out at most, one every three days, only while it has workers) whenever a ticked good has a surplus of at least 100 measures and there is room for it on the quay (2,400 measures of each good). He walks (at the tax collector's pace: the stores can be far from the shore) by the shortest road to the nearest store holding that good, loads up to a handcart (wheat 1,200; meat, cheese and oil 600; fleece and wine 400), no more than the surplus there is then, and brings it back to the quay. A good unticked (or its keep raised past what the stores hold) with goods on the quay: the next docker carries it back to the nearest store with room. Room on the quay is reserved as he sets out, so the quay never overfills. If the store goes, he looks for another; if the road is cut, he turns back.

**The ship** (`s.trade.ship`).
- The first is due two months after the post is built; then every three months (`SHIP_EVERY`, 900 ticks), whatever happened. "Due" is when she ties up; the countdown says so in days.
- Six days before she is due she appears on the horizon (`SAIL_IN`) and sails in along her route, slowing as she comes into the bay; tied up, she loads for four days (`LOADING`), taking each day a share of what is on the quay of the ticked goods (more can arrive while she loads); then she pays and sails out the way she came (five days, `SAIL_OUT`).
- Her route is worked out as she sets sail: the shortest way over deep water from the berth to the map's edge, pulled straight where she can sail straight, then out to the horizon beyond the edge; the last stretch brings her alongside the jetty. Where she is at any moment is a pure function of the route, the phase, when it began and the tick (also fractional ticks, for drawing).
- If the post is cleared while she is coming or tied up, she turns back from where she is, and no more are due until a post stands again (the next due two months after it is built).
- *Payment*: on leaving, one ledger line per good (`sales`, "Sales · wheat" with the measures), through `income`, so owed wages are paid at once. The post keeps her last visit (when, what she bought, what she paid) for its panel and tips.

**Readable.**
- The post's hover tip: workers, the countdown (or "on the horizon", "tied up, loading", "sailing off"), what is on the quay and what it would fetch, what is ticked. The ship's hover tip: where she is from, what she will buy, the countdown.
- *The trade panel* (opened by clicking the post, on the left like the household panel): the ship's state and countdown at the top; a row per good with its icon, price, what the city holds, what is on the quay, a sell tick and keep − / + (each a command); the last visit's sale; what the dockers are doing; and a warning when nothing is ticked or the post has no road or workers.
- *The top bar* gets a ship chip once a post stands: "Ship in 34 days", "Ship on the horizon", "Ship loading", clicking it opens the panel.
- *Floaters*: "+512 dr" rises from the ship as she pays. A town line when her sail shows ("A sail on the horizon: the merchant ship ties up in 6 days").
- Welcome back for a version 11 save says the trading post is new and where it goes.

**Rendering.**
- The post and its jetty join the merged works (one draw per chunk as now); the quay's goods use the existing batches (sacks, hams, cheeses, jars, bales, amphorae) in rows on the quay.
- The ship: a merchant ship in the storybook style (a round-bellied hull with a dark wale, a raised stern with a steering oar, a single mast and a square sail in cream and russet stripes, a few amphorae on deck), one merged mesh; a furled-sail version is swapped in while tied up; she rolls a little with the waves (render only). Drawn only while she is out.
- Dockers: the porter's looks (sack, mixed, jars, bale, amphora) on a docker in a sea-blue tunic with a cap.
- A sound cue (a bell) when she ties up, if in earshot.

**Saves.** State version 12: building kind `trading`, walker kind `docker`, the `trade` record (sell, keep, ship). A version 11 save is migrated with a fresh record (nothing ticked, the default keeps, no ship due: the schedule starts when a post is built); older versions go through every step. The save checks refuse a malformed trade record in plain words.

**The build bar.** The trading post joins the granary and the storehouse in the *Granary, storehouse and trading post* group (G cycles all three), so the bar keeps its 17 buttons and its width.

## Tests

- Placement: the post is refused off the shore, on shallow shores and where one already stands, accepted at the spots named above; the tint and the refusal agree.
- The ship's schedule: none due without a post; due two months after it, then every three; on the horizon `SAIL_IN` ticks before, tied up at due, gone `LOADING + SAIL_OUT` after; her position moves smoothly along her route and stays on deep water or beyond the edge.
- Dockers: carry only ticked goods' surplus beyond keep, by the shortest road, never overfill the quay; unticking brings goods back; the store going makes them look again.
- Sales: what was on the quay of the ticked goods is paid for at the shown prices, on the ledger as sales by good, and owed wages are paid at once; the ledger invariant holds.
- Clearing the post sends the ship back and stops the schedule; rebuilding starts it again.
- Saves: a real version 11 save (`#town` from `a07429f`, `tests/fixtures/slice12-town.save.json.gz`) loads with a fresh trade record and saves again identically; a save with the ship coming in carries on identically; the older fixtures still load.
- Determinism and replay with the post, dockers, ticks and a visit.
- The new demos open on what they promise; every earlier demo fingerprints exactly as at `a07429f` (checked by a probe outside the repo, as before, and stated in the check-in).

## Tasks

1. Plan (this file). Commit.
2. Sim: state, kind, walker, command; placement and berths; dockers; the ship's schedule, route and visit; sales; migration and save checks; demos; tests. Commit.
3. What Oliver sees: the post, jetty, quay goods, ship and dockers; the trade panel, ship chip, tips, town line, floaters, sound, welcome back; build bar and keys; smoke and measure extended. Commit.
4. Look and tune: screenshots of the new demos and earlier ones from several angles; adjust. Commit.
5. Full checks, measure, As built, the check-in. Commit, push, sync.

## As built

Commits: plan `81c2e42`, sim `c1357ae`, what Oliver sees `8eb5f69`, look and tune `89cd345`, then the check-in.

**Where it differs from the design above, and why.**
- *Deep water and the jetty.* Deep water is sea at least 0.5 deep (not 0.8) and the jetty reaches up to 7 tiles (not 6), so that both shores the design names have a berth; the tint shows the usable shore as before.
- *The schedule.* The first ship is due three months after the post is built (not two), so the dockers have time to stack a few loads before she comes; then every three months as planned.
- *Dockers.* Four out at most (not three), one every two days (not three), with handcarts of wheat 1,200; meat, cheese and oil 800; fleece and wine 600 (not 1,200 / 600 / 400). At the planned figures a post far from the stores could not fill the quay in three months.
- *Her way in.* The route runs out 60 tiles beyond the map's edge (not 110) and she slows into the bay on a gentler curve (exponent 1.8, not 2.6). With the longer horizon she covered most of her six days far out to sea and raced past the islet; now the sail is on the horizon for the first few days and she is visibly sailing in for the last two.
- *The post's model.* The counting house stands along the landward side of the quay, not at its back, so the stacked goods face the land and show from the usual views; the crane and bollards are on the seaward corner, by the jetty.
- *Readable.* The ship chip is compact ("29 d", "In port", "+504" as she leaves, "Gone" if she turned back) so the top bar still fits at 1280 px wide; its tooltip and the panel carry the full sentence. The bell (three strokes) rings when her sail is sighted, not when she ties up, since that is the moment to act; a coin cue and a "+N dr" floater over the post mark the sale. The town line says "A sail on the horizon" while she is far out and "The merchant ship is sailing into the bay" once she is well in. Goods in the panel are marked with a colour swatch from their quay stack rather than an icon.
- *Demos.* All five open on `#town` with a road laid down column 74 from the main street to the shore and the post at (73, 69). `#trade` plays on four months and opens with the tool in hand; `#quay`, `#sail` and `#ship` build the post and put wheat, meat, cheese and oil up for sale; `#black` builds as soon as the treasury can pay, sells all six goods keeping less (wheat 800; meat, cheese and oil 200) and turns taxes off 450 ticks (a month and a half) before the ship is due, so it opens with 2 dr and 240 dr of wages owed; her visit pays 840 dr and leaves 602 dr with nothing owed. Their own overlay (for `-overlay`) is food and goods.
- *Views.* Three new camera views: `quay` (over the post from the land), `sail` (a low view out across the bay to the horizon) and `ship` (close on the berth).

**Effects on the earlier demos.** None: all 51 earlier demos fingerprint exactly as at `a07429f` (checked by a probe outside the repo). A town that never builds a post never touches its trade record.

**Tests.** 10 new in `tests/trade.test.ts` (placement and the tint, the schedule and her staying on deep water, turning back when the post is cleared, dockers carrying only the surplus and the sale at the shown prices, carrying back what is taken off sale, `#black`, a real slice 12 save `tests/fixtures/slice12-town.save.json.gz` at state version 11, a save mid-approach and replay, a damaged trade record refused, a town without a post unchanged); `tests/treasury.test.ts` and `tests/hazards.test.ts` adjusted for the new ledger and building kinds. 198 tests in 19 files.

**For slice 14.** Prices are untuned (money is slice 14's): the figures are the design's, chosen by feel, not balanced against taxes or wages. How fast the quay fills depends on how far the post is from the stores (the dockers walk), which the panel's docker line shows but the placing tip does not. Measurements are in the check-in.
