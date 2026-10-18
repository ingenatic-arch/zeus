# Slice 19 — Favours, offers and tribute

*18 Oct 2026. Phase 3, "Greece beyond the walls" (`docs/specs/2026-10-17-greece-beyond-the-walls-design.md`). The fifth slice of the phase. Builds on slice 18, "Rulers who remember", and its review.*

## Goal and check-in

The spec's words: requests with deadlines; promising, sending, refusing and breaking a promise, and what each does to the mood. Year-long offers; tribute demands from proud or warlike rulers. The requests on the map and in town lines; goods sent out for them, visibly.

Until now a ruler's mood answered only gifts. This slice gives the rulers something to ask of you, and makes your answer count: a request for goods (or coin) by a deadline, which you can promise, send, refuse or let run out, each with its memory; a pleased ruler's offer of a better deal for a year, which binds you once taken; and a demand for tribute from a proud or warlike ruler who is wary of you and stronger than you, which you can pay or refuse. What you send leaves the city as gifts do (porters to the yard or the quay, then a caravan or a ship in your colours out along the road or the lane), and now at a pace a deadline can be met by, with the page saying when it will arrive.

**Oliver can:** meet Sparta's request for wheat and see the lift, break a promise to Athens and watch it linger, take Corinth's offer for oil, and refuse a tribute demand.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#request`: `#caravan`'s town (the road to Corinth open, a caravan yard on the north road) with Sparta's harvest failed and King Eurykrates asking for wheat within four months. The map opens on Sparta's Ruler tab with the request at the top: promise, send or refuse, with what each would do to his mood and when the wheat would arrive if sent now. Send it, close the map and watch the porters carry the wheat from the granaries to the yard and a caravan in your colours walk out of the city; on the map it travels the road to Sparta, and when it arrives the mood lifts with its reason.
- `#promise`: `#athensship`'s town (the sea route to Athens), which promised Athens wheat four months ago and has sent nothing: the deadline is a few days away. Let it run out and the broken promise goes on the page, the biggest memory there, fading over four years; or send it now and it arrives late (half the thanks, and no broken promise).
- `#offer`: `#prices`' town (oil sold to Corinth caravan after caravan, its price slid to about 56) with Corinth's lord offering to buy all the oil you can send for a year at his city's usual price, up to a larger yearly limit. Take it, and the next caravans pay the offer's price however much you sell.
- `#tribute`: `#caravan`'s town with King Eurykrates of Sparta (warlike, wary of you, his city far stronger than yours) demanding tribute. Pay it or refuse it, and see what each does.
- Every earlier token keeps working. The 64 demos from before slice 16, and `#routes`, `#gift`, `#caravan`, `#buywine` and `#hostile`, open and play 900 ticks on exactly as before. Route demos whose history runs more than six months past their first route (`#prices`, `#famine`, `#athensship`, `#anchor`, `#thanks`) may now have had requests, offers or tribute come and lapse in their history: checked by the probe and said in the check-in.

## Not in this slice

Threats and raids (20): a tribute refused by a cold ruler is marked as the place a threat will come from, and the page says threats will follow, but nothing follows yet. Requests from both sides of a war and festivals (21). The News of Greece list (21).

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- Sim code (`src/sim/`, `src/map/`) stays pure and deterministic. Everything new that is random (when a ruler asks, what, how much) is drawn from a hash of Greece's seed, the month and the city (as slice 18's whims are), never from `world.rng`, so the harvests every earlier game rolls stay as they were.
- Money moves only through `pay` / `income`, on new ledger lines ("Sent · to Sparta" for coin sent for a request, "Tribute · to Sparta"); goods sent go through the stock book ("Sent to Sparta", "Tribute to Sparta").
- **Earlier towns are untouched.** Rulers ask, offer and demand only once your city has opened its first trade route (a gift alone doesn't count), and never in the six months after it. Proved by the demo probe outside the repo (each demo's whole city state, Greece and the stock book aside, at opening and 900 ticks on, from the baseline and from this slice).
- Old saves still load: a version 18 save opens in version 19 with no deals and no sendings.
- The renderer and UI only read sim state; every action is a command. Static build, `base: './'`, no runtime network requests, all art generated in code.
- Judge by screenshots, tune by eye, never claim it looks or feels right on Oliver's behalf.

## Before

Measured at `ddfd4ce` (the end of slice 18's review), headless Chromium with software WebGL at 1920 × 1080:

| | Before |
|---|---|
| Tests | 285 in 25 files, all passing |
| Bundle | 4 files, 1,343 KB raw, 396 KB gzipped |
| Load, bare link (page clock) | ready 2,279 ms, first frame 2,963 ms |
| `#town` | 799,168 triangles, 83 draw calls, save 142 KB, update 18.76 ms a frame running (1.88 paused) |
| `#richtown` | 910,707 triangles, 95 draw calls, save 179 KB, update 22.42 ms running |
| `#caravan`, `#prices`, `#famine`, `#gift`, `#hostile` | `#caravan` 7.80 ms running; map pages: `#prices` 304,642 triangles / 22 calls (ready 4,779 ms), `#famine` 304,206 / 22 (4,042 ms), `#gift` 304,018 / 20 (3,649 ms), `#hostile` 304,642 / 22 (4,405 ms); running: `#prices` 8.23 ms, `#famine` 10.59, `#gift` 5.63, `#hostile` 15.87; the map's first open built in 414 ms |
| The 74 demos | each one's opening and a hash of its whole city state at opening and 900 ticks on, recorded outside the repo |

## Design decisions

**Deals** (`src/sim/favours.ts`, pure; `world.deals`). Each has an id, a kind (request, offer, tribute), the city, the good (a trade good, or −1 for drachmas) and amount, when it was made and its deadline, a state, why it was made, whether you promised, the sending on its way for it, and for an offer its side (they buy from you or sell to you), price, how much has gone under it and when it ends; for tribute whether it is yearly and how often it has been paid.

**When rulers ask.** On the first of each month, once your city's first route is six months old: each ruler in turn, if they have no deal open and none ended in the last three months, and Greece has fewer than two open, may ask (a hash of Greece's seed, the month and the city). No two new deals in the same month.
- **A request** (wary or better): about one month in ten, three times as often in the four months after their harvest failed or was poor. For a good they are short of that your city made in the last year (or wheat after a poor or failed harvest), or now and then drachmas. Sized to your city: about four fifths of a fair gift (half a drachma a head) in value, 200 to 1,200 measures, never more than two fifths of what you made of it in a year; coin 150 to 1,000 dr. Goods within four months, coin within two. Each says why: "their harvest failed", "their granaries run low", "to mend the walls of their city".
- **An offer** (pleased: +15 or better, with a route open and not closed): about one month in ten, twice as often when warm. Either they buy a good they are short of that you make, at their usual price (or today's, if better) however much you sell, up to half as much again as their yearly limit, for a year; or they sell you a good they make plenty of at a fifth off today's price, up to their yearly limit, for a year. Answer within two months.
- **Tribute** (proud or warlike, wary or worse, and stronger than you: their city is far bigger than yours, about 5,000 to 7,000 people): about one month in eight, never within a year of their last. Drachmas (twice a fair gift) or goods they are short of, worth the same; one time in three yearly, at three fifths of that, for three years or until their mood is cordial again. Within three months.

**Your answers, and what each does to the mood** (personalities bend them as gifts do, each bend named in the reason line; all fade evenly):
- **Promise** (a request): +4 while the promise stands ("you promised them 800 wheat"), replaced by what follows.
- **Send** (a request or tribute): coin is paid at once and a herald takes it; goods are fetched from the stores by the caravan yard's porters or the trading post's dockers and leave the city as a caravan or a ship in your colours, then travel the road or the lane, as gifts do. It counts when it arrives.
- **Met** (a request arriving by the deadline): +25 over two years (generous ×1.25 and remembered longer, steadfast ×0.75). **Late** (sent, arriving after the deadline): half that, and no broken promise. **Short** (the stores ran out while fetching): in proportion.
- **Refused:** −15 over two years (proud ×1.5, steadfast ×0.75).
- **Let run out** (nothing sent, never promised): −10 over eighteen months (proud ×1.5).
- **Broken** (promised, and nothing sent by the deadline): −35 over four years, the slowest to fade (proud ×1.5; a steadfast ruler remembers it six years). With a wary ruler that is enough to turn them cold; with a proud one it can close their route, until it fades or is mended.
- **Tribute paid:** +8 over a year (greedy ×1.5 for coin). **Tribute refused** (or let run out): −30 over three years (proud ×1.5). Refused by a ruler who is cold or worse, it is marked angry: the threat of slice 20 starts there (`angered` in `favours.ts`), and the page and the news say so.
- **An offer taken:** +5 over a year, and a promise: at the end of its year, if at least a quarter of its limit went, "you kept to the deal" (+8 over a year); if not, a broken promise (−20 over three years). Taking it ticks the good for sale (or to buy) on your routes to that city. Declined or let run out: nothing (a proud ruler −3). If their route closes, the deal ends with no blame.

**Sending at a pace a deadline can be met by** (slice 18's review: a gift of goods took four months). Your own caravans, walking out of the city, travel light: half as fast again as a trader's donkeys. The porters fetching a sending (or a gift) share it between the stores, each going to the nearest store that still has some no other porter is already fetching, so the loads come in together instead of one after another. The request on the page says when the goods would arrive if sent now, and once sent, when they will ("arrives about 12 June, 38 days before the deadline"), from the fetching, the walk out and the road or lane. The deadlines are chosen so a town with a yard or a post and the goods in store meets them with a month or more to spare.

**Where you see them.**
- **The Ruler tab** of the city's page, at the top, when a deal is open or running: what they ask and why, by when, the buttons (Promise, Send, Refuse; Pay, Refuse; Take, Decline), what each would do to the mood, and when a sending would arrive; a running offer with how much has gone under it. The header's mood and terms are unchanged.
- **The map of Greece:** a city with a deal open shows a small scroll on its label (a red seal for tribute), and its hover card says what they ask.
- **Under the top bar:** a standing line for the most pressing open deal ("Sparta asks for 800 wheat by 12 July, 63 days: their harvest failed"), clicking it opens that city's page; and the news of each turn (asked, met, refused, broken, paid) as Greece's news. **One piece of news at a time** (slice 18's review): each shows for a fortnight, or at least five days before the next one takes its place, newest last.
- **The ledger and the side panel:** "Sent · to Sparta" and "Tribute · to Sparta" lines; "Sent to Sparta" and "Tribute to Sparta" in the goods pages.
- **In the city:** the porters, the caravan and the ship say what they carry and for whom ("800 wheat for Sparta, as they asked").

**Also from slice 18's review:** a ruler's gift of goods that lands on the yard or the quay goes straight into the stores if that good is for sale there (it used to wait there to be sold).

**State** (version 19; `from18`): `world.deals` (always empty before), `world.nextDeal`; each gift's `deal` (0 for a gift). Ledger kinds `favours` and `tribute`.

## Tests

`tests/favours.test.ts`:
- no deals before the first route, nor in the six months after it; one open per ruler and two across Greece; the dice are Greece's own (the harvests unchanged);
- requests for goods your city makes, sized to it; tribute only from proud or warlike rulers who are wary or worse and stronger; offers only from pleased rulers with a route open;
- each answer's memory: met, late, short, refused, lapsed, broken (outlasting a refusal), paid and refused tribute, an offer kept and broken; the bends named; the reasons add up to the mood;
- sending: coin paid at once (the ledger invariant), goods fetched and carried out of the city, arriving and meeting the request; the estimate of arrival within reason of the real one;
- offers: a caravan pays the offer's price up to its limit; a cheaper import under a sell offer;
- a yearly tribute comes round again; a tribute refused by a cold ruler is marked angry;
- saves: a town with deals and sendings round-trips; a version 18 save loads and plays on.

Plus the existing suite and the demo probe. `smoke.mjs` opens `#request` (send, the sending on the map, arrival and lift), `#promise` (broken, the reason on the page), `#offer` (take it, the price on the route) and `#tribute` (refuse it); `measure.mjs` adds `#request` and `#tribute`.

## Tasks

1. Plan (this file), with the baseline measured. Commit.
2. Sim: state and migration, deals and their dice, answers and memories, sendings through the gift path (with the faster walk and shared fetching), offers in the routes' trade, tribute and its hook; tests. Commit.
3. UI and render: the Ruler tab's deals, the map's scroll and card, the standing town line and the one-at-a-time news, the ledger and side panel lines, the tips. Commit.
4. Demos and look-and-tune: `#request`, `#promise`, `#offer`, `#tribute`; screenshots, adjust; smoke and measure extended. Commit.
5. Full checks, measurements, As built, the check-in. Commit, push.

## As built


Built in three commits after the plan (the sim with the Ruler tab and lines; the demos and tuning; the check-in), with these differences and settlements:

- **Deals** live in `src/sim/favours.ts` (`world.deals`, `world.nextDeal`; each gift's `deal`). The monthly asking is as designed (six months after the first route, two open at most, none from a ruler with one open or one settled in the last three months, one new deal a month), the dice a hash of Greece's seed, the month and the city's place.
- **Sizes, tuned down by eye:** a request for goods is three fifths of a fair gift in value (not four fifths), 200 to 1,000 (not 1,200), and at most three fifths of what the stores hold (half, if the city doesn't make it), rather than of a year's making; coin is three fifths of a fair gift, 150 to 1,000 dr. Tribute is one fair gift (not two): 300 to 2,000 dr, or goods worth the same, 200 to 1,600; yearly tribute three fifths of that, for three years, ending early if the ruler warms to cordial or your city outgrows the threat. "Far stronger" is a ruler's city at least half as big again as yours (Athens 7,000, Sparta 6,000, Troy 6,500, Corinth 5,500).
- **Deadlines that can be met:** each is the base (goods four months, coin two, tribute three) or, if sending it would take most of that, what sending takes from now, a quarter again and a fortnight, rounded up to whole months, at most eight (`deadlineFor`). `#request`'s 1,000 wheat to Sparta, 123 tiles from the west edge, gets six months and arrives in about 112 days.
- **Faster sendings:** porters fetching a gift or a sending walk half as fast again as at their trade work, and your own caravans (gifts and sendings) twice a trader's pace; two extra hands at the yard or the post while a gift is being fetched (so trade work doesn't hold it up); each porter goes to the nearest store with some left that no other porter is already fetching. Estimates (`sendTicks`, `arrivesAt`) were checked against real runs: Sparta wheat 112 against 113 days, Athens wheat by sea 60 against 59, Corinth oil 71 against 72, coin 10 against 10. While the porters are out, the estimate counts the loads already on their way (it first slipped a day each day).
- **Offers to buy hold today's price for the year** (the spec's words), however much you sell, up to a quarter more than the usual yearly limit, 600 to 4,000; offers to sell are a fifth off today's price, up to the usual limit. While one is taken, the route's caravans pay the offer's price (or the market's, if better) and count against the offer's amount instead of the usual limit; the trade rows show "95 offer" and what is left of it. The year ends kept (a quarter or more went: +8) or reneged (−20, three years), or with no blame if the route closes.
- **Memories** as designed, with these fades: met and refused two years, let run out eighteen months, broken four years (a fickle ruler halves it), tribute paid one year, defied three, offer taken and kept one, reneged three, declined six months. Late counts half. A promise stands at +4 until what follows replaces it; sending late keeps your word (half the thanks, no broken promise).
- **The hook for slice 20:** `angered(s, c, d)` in `favours.ts` marks a tribute refused (or let run out) by a ruler who was already cold `d.angry = true`; nothing else follows yet. The Ruler tab says threats will follow.
- **Where you see them:** the Ruler tab's top section (`dealsHtml` in `src/ui/greece.ts`), with the answer buttons each showing their worth now, the arrival line ("If sent now (...), it arrives about 10 September 747 BC, 55 days before it is due"), and once sent where it is; the Send button reads "Send it, late" with the late worth when it can no longer arrive in time. A scroll on the city's label (a red seal for tribute) and a line on its hover card. One standing line under the top bar for the most pressing deal (a promise near its day says it is about to be broken), clicking it opens the Ruler tab; Greece's news one piece at a time (`newsNow` in `status.ts`: each a fortnight, at least five days before the next, "(2 more to come)"). Dates in deals are to the day.
- **Ledger, stock book, tips:** "Sent · Sparta, as they asked" and "Tribute · Sparta" lines; "Sent to Sparta, as they asked" and "Tribute to Sparta" in the goods pages; the porter "Going to the granary for wheat for Sparta, as they asked"; the caravan "1,000 wheat for Sparta … with the 1,000 wheat Sparta asked for"; the ship "Your ship · … as they asked".
- **A ruler's gift of goods** that lands at a yard or quay where that good is for sale goes straight into the stores (slice 18's review).
- **Demos** (`favourTown` in `demos.ts`): `#request` on `#caravan`'s town (the request made by the demo; the why is the dice's for wheat, "their granaries run low", not a failed harvest, so Greece's harvests stay untouched); `#promise` on `#athensship`'s town, promised, then run until five days before its day (about four months of play); `#offer` on `#prices`' town with a staged memory "pleased with how your city trades (set up for this demo)", +12 over two years, to lift Corinth's lord past +15; `#tribute` on `#caravan`'s town, saved up until the treasury could pay the 650 dr. `#offer`'s town also has Sparta's demand for tribute open: the dice made it in `#prices`' own history.
- **Probe hooks:** `probe.deals()`, and `probe.gifts()` now lists each gift's deal and the porters fetching it.
- **Tests:** 20 in `tests/favours.test.ts`, with a version 18 save fixture (`#hostile` with a gift being fetched, made from the baseline code). The demo-wages test in `tests/treasury.test.ts` has a longer timeout (four more demos to set up).
- **The demo probe** (outside the repo): 72 of the 74 earlier demos open and play 900 ticks on exactly as at the baseline, `#thanks`, `#athensship` and `#anchor` included. `#prices` and `#famine` differ only in the redraw counters (`rev`, `looks`): with those left out of the hash both are identical too, money and people the same; the dice make deals in them (in `#prices`' history, Sparta's demand for tribute; in `#famine`, during its 900 ticks), which live in `world`.
- **Smoke:** `#request` (the request, its buttons and worths, the town line and the label's scroll; sent: the porters, the caravan and its tip, the arrival and +31 on the page), `#promise` (the late button, the town line; the promise broken, −35 on the page and in the news), `#offer` (taken: the deal's bar, "oil … offer" on the Trade tab), `#tribute` (refused: no money spent, cold, −30 on the page). `measure.mjs` adds `#request` and `#tribute`.
- **Measured** (one full run; the bare link's load three more times each, alternating with the baseline's build, because the full run was slow throughout): bundle 1,375 KB raw and 407 KB gzipped (+32 and +11); bare link ready 1.8 to 2.4 s, the same as the baseline's 1.9 to 2.4 s; `#town`, `#richtown`, `#caravan` and the map pages' triangles and draws unchanged, saves the same size; `#request` and `#tribute` 20 draws on their map pages, ready at 4.3 and 4.8 s; work a frame within the baseline's spread. `npm test` 305 passing in 26 files, `npm run build`, `npm run smoke` and `npm run measure` clean.

**Review (slice 19).** Followed the four "What to try" steps at 1920 × 1080 (the request sent, fetched, carried out and arriving at +31; the promise broken at −35; the offer taken with the trade row; the tribute refused and Sparta cold). Arrival estimates checked against real runs: Sparta wheat 112 against 113 days (the estimate stays within a day while the porters work), Athens wheat by sea 60 against 59, coin 10 against 11. Changed: pacing (`REQUEST_ODDS` 1/14, `GREECE_GAP` two months between new deals, `TRIBUTE_ODDS` 1/10 and `TRIBUTE_GAP` two years; four unattended years of `#caravan` went from a deal every 3.5 months to one every 4.5, tribute from most years to every two); offers to buy only goods with some to spare (`offerGoods`), and none while a ruler's taken offer runs (`mayOffer`), since `offerOn` found only the first, so a second taken offer always ended reneged; a promise memory is cleared only by its own request (`remember` on a deal with `promised`); goods are asked for only when your city can send goods that way (`canSendGoods`), else coin; `priceAfter` in `world.ts` for the offer's "about 48 after another 2,900" and `spareWords` for stock against the keep figure; the asking news is hidden while the deal's standing line shows it; the map's label layer is prepended to `#ui` so the town lines and panels stand over it. Late after a promise left as is (it gains nothing over not promising). Tests: three more in `tests/favours.test.ts` (a sell offer's imports at its price; no offer of a good without spare, none while one runs; a promise outliving an offer's year). The hiding matches only the news that made the deal (its day, its city and "asks for", "demands" or "offers"), since `#famine`'s harvest line shares the day and the city with Athens' request (the smoke caught it). The smoke's `#decline` panel check now waits for the panel to catch up (a headless timing flake also seen in slice 15). After the review: 308 tests passing in 26 files; demo probe 72 of 74 identical to the baseline, `#prices` and `#famine` the same money and people as before; bundle 1,376 KB raw, 407 KB gzipped; bare link ready at 2.0 s; triangles and draws unchanged; `#request` and `#tribute` 4.9 and 3.8 ms a frame running.
