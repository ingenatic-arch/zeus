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
| Tests | (filled in below) |
| Bundle | |
| Load, bare link (page clock) | |
| `#town` | |
| `#richtown` | |
| `#caravan`, `#prices`, `#famine`, `#gift`, `#hostile` | |
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

