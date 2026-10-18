# Slice 17 — Prices that move

*18 Oct 2026. Phase 3, "Greece beyond the walls" (`docs/specs/2026-10-17-greece-beyond-the-walls-design.md`). The third slice of the phase. Builds on slice 16, "Routes and traders", and its review.*

## Goal and check-in

The spec's words: each city's stocks, needs and production; prices that move with them, your selling and buying, and harvests each autumn. Arrows, reason lines and a year's chart on the city panel and the trade panel. The ruler's terms on top of the market price (from the starting moods, for now).

Until now every city's prices were steady: Corinth paid the same for oil on the hundredth visit as on the first. This slice makes what you sell and where you sell it a choice that changes over time, and makes every price say what moved it.

**Oliver can:** sell oil to Corinth visit after visit and watch the price slide and say why, see a failed harvest send wheat soaring in one city, and play cities off each other.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#prices`: `#caravan`'s town played on for most of a year, selling oil and meat to Corinth caravan after caravan: the map of Greece open on Corinth's page, the oil price's chart sliding down visit by visit with its reason ("you sold them … in the last year"), the next caravan on the road.
- `#famine`: `#athensship`'s town (wheat and meat for sale to Athens by sea) in late August, with Athens' fields looking poor: the map open on Athens' page. In a few days the harvests come in across Greece; Athens' fails, wheat there soars, and a line under the top bar says so. Its ship comes later in the autumn, to buy wheat at the famine price.
- The ruler's terms need no token of their own: they show on every ruled city's page and route tab (`#ruler` shows Sparta's).
- Every earlier token keeps working and opens exactly as before; the five route demos of slice 16 (`#routes`, `#caravan`, `#buywine`, `#athensship`, `#anchor`) gain a watch post and an architect's office covering the caravan yard (the review's finding) and trade at moving prices with the ruler's terms, so their money after opening differs, on purpose.

## Not in this slice

Moods that change from what you do, gifts (slice 18); requests, offers and tribute (19); raids (20); wars, festivals and the News of Greece list (21): the price model leaves room for festivals and wars as further pushes, but none happen yet. The terms come from the starting moods only. What each city sells and buys, and its yearly limits, stay fixed by its character: prices move, the lists don't.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- Sim code (`src/sim/`, `src/map/`) stays pure and deterministic: no `Math.random`, `Date`, `performance` or timers (the purity test enforces it). Harvests draw only on Greece's own generator (`world.rng`), never the city's.
- Money moves only through `pay` / `income`; the ledger invariant holds. Imports still keep back a month's wages.
- **Earlier towns are untouched.** Everything new lives in `world`; the city never reads a ruled city's price unless a route is open, and stepping Greece never touches `rev`, `looks` or anything outside `world`. Proved by the probe outside the repo that plays every earlier demo from the baseline commit and from this slice and compares a hash of the whole city state (everything but Greece and the stock book) at opening and 900 ticks on: all 64 demos before slice 16 must match; the five route demos change on purpose (the watch post, the moving prices).
- Old saves still load: a version 16 save opens in version 17 with nothing yet pushing its prices (they stay where they were, and move from then on); older ones go through every step.
- Tyre keeps the steady phase 2 prices, so the Tyre ship and phase 2's towns play as before.
- The renderer and UI only read sim state. Static build, `base: './'`, no runtime network requests, all art generated in code.
- Judge by screenshots, tune by eye, never claim it looks or feels right on Oliver's behalf.

## Before

Measured at `b8de6cd` (the end of slice 16's review), headless Chromium with software WebGL at 1920 × 1080:

| | Before |
|---|---|
| Tests | 252 in 23 files, all passing; typecheck clean |
| Bundle | 4 files, 1,303 KB raw, 383 KB gzipped |
| Load, bare link (page clock) | ready 2.33 s, first frame 2.96 s (re-measured at the end alternating the two builds) |
| `#town` | 799,168 triangles, 83 draws; save 140 KB |
| `#richtown` | 910,707 triangles, 95 draws; save 177 KB |
| The 69 demos | each one's opening and a hash of its whole city state at opening and 900 ticks on, recorded outside the repo |

## Design decisions

**The price model** (`src/sim/world.ts`, pure). For each ruled city and each of the six trade goods:
- **Its usual price** is what slice 15 set from what it makes and uses (`marketPrice`): cheap where it has plenty, dear where it is short.
- **Its stock.** Underneath, the city keeps a stock of the good: about half a year of what passes through it (`(make + need) / 4`) when nothing is pushing it. Two things push it, each kept separately so the panels can say which moved the price:
  - **you** (`yours`): what you sold them adds to it, what you bought from them takes from it, as each trader settles or unloads;
  - **the harvest** (`crop`): each autumn (the first of September) every ruled city's harvest comes in, failed, poor, fair, good or rich (about 7, 18, 45, 20 and 10 in a hundred, from Greece's own generator). A failed harvest takes three quarters of a normal stock of wheat away, a poor one a third; a good one adds a third, a rich one more than half. Oil and wine feel it at six tenths of that, meat and cheese at three tenths, fleece not at all.
  - **The pull back to normal:** each day both pushes wear off by 1/150 (about a third gone after two months, two thirds after six), as the city eats, makes and trades with the rest of Greece.
- **The price** is the usual price times (stock ÷ normal stock)^−½, the ratio held between a quarter and four, so a price can go to at most twice its usual or down to half. Recomputed each day, and at once when a trader settles, so the next visit sees it.
- **Next year's harvest is foreseen** from the summer: the outcome is drawn a year ahead (just after each harvest) and from the first of June each city's page says how its fields look ("the fields look poor"); a failed one is never a bolt from the blue. A new game starts with last autumn's harvest drawn and half worn off, so prices differ a little from the start.
- **Tyre and your city** are not stepped: Tyre's prices are the ship's steady ones.

**Readable.**
- **The arrow:** up, down or steady, comparing the price now with where it was over the last fortnight or so (a smoothed trail, `trail`): up or down when they differ by more than 1%, so a price easing back after a push shows its way.
- **The reason line** names the biggest push on the price now, by how much each moves it: "Oil cheap in Corinth: you sold them 1,400 in the last year", "Wheat dear in Athens: their harvest failed in September", "Wine cheap in Troy: a rich harvest in September", easing as it wears off. When nothing moves it by more than about 3%: "at its usual price: they make plenty" (or "they are short of it"). What you sold and bought in the last year is kept per city and good by month (`dealt`, 12 months).
- **The chart:** each good's last twelve months (the monthly history slice 15 kept) and today's price, a small line drawn in code, with the usual price as a faint rule.
- **The ruler's terms:** the mood moves what the ruler pays you and asks of you, a third of a percent per point of mood, at most a fifth either way, in whole percents: "Sparta's terms: cold, prices 12% against you". For a good they buy from you, they pay the market price plus the terms; for one they sell you, they ask the market price less the terms. The route's rows and the ledger use your price; the city's page shows the market price and the terms line on top.

**Where it shows.**
- **A city's page on the map:** the terms line, then every good with its price, arrow, a year's chart and its reason line, grouped as it sells, buys or has about enough of; and the harvest (last autumn's, and how this year's fields look from June).
- **The trade panel's route tabs** (and the same rows on the map's page): the price is your price with its arrow; its tip gives the market price, the terms and the reason; under the tables, a short "Prices" list of the route's goods with their chart and reason line.
- **The Tyre tab:** each price's tip says what the open routes pay for it now, so you can see from the quay where to sell.
- **Town lines from Greece:** after the harvests, a failed or rich harvest in a ruled city is a line under the top bar for a fortnight ("From Greece: Athens' harvest has failed; wheat there is 82, was 41"), in Greece's own colour. (The News of Greece list is slice 21.)
- **Travellers on the map** can be hovered (the review's finding): who, coming or going, when due, and what they will buy and bring; clicking one opens its city's page.

**State** (version 17; `from16` adds `crop`, `yours` as zeros, `dealt` as twelve months of zeros, `trail` as the price, `outlook` as a fair harvest): all in `WorldCity`.

## Tests

`tests/prices.test.ts`:
- selling lowers the price the next trader pays, with the reason naming you, and it recovers as the months pass; buying raises it;
- a failed harvest raises wheat's price in that city (and not in the others), with the reason naming the harvest; a rich one lowers it;
- the ruler's terms: a warm ruler pays more and asks less; the ledger's lines are at your price;
- **sane bounds over many years:** a few Greeces, each played twenty years with and without heavy selling and buying, every price stays between a quarter and three times the Tyre price, and back within a tenth of usual after two years of nothing;
- the year's history and the arrow; Tyre's prices never move;
- independence: a town with no route plays exactly as before (the city state, Greece aside), and Greece's prices are the same whatever the city does;
- determinism and saves: a town with moving prices round-trips; a slice 16 save (version 16, with a route open) loads and plays on.

Plus the existing suite (the slice 16 test that compared a sale with today's price now reads it from before the trader settles) and the demo probe outside the repo. `smoke.mjs` opens `#prices` and `#famine` and checks the arrows, reason lines, charts and terms; `measure.mjs` adds `#prices`.

## Tasks

1. Plan (this file). Commit.
2. Sim: state and migration, the price model, harvests and the outlook, the terms, trading pushing the stock, the history and the arrow; tests; the demo probe. Commit.
3. UI: the city page's prices, the route rows and the Prices list, the Tyre tab's tips, town lines from Greece, travellers' hover on the map; the watch posts for the route demos. Commit.
4. Demos and look-and-tune: `#prices` and `#famine`, screenshots, adjust; smoke and measure extended. Commit.
5. Full checks, measurements (alternating with the baseline build), As built, the check-in. Commit, push.

## As built

Built as planned, in three commits after the plan (the sim, the UI, the smoke and measure checks). What came out differently, or was settled while building:

- **The model** is as designed: a stock pushed by you (`yours`) and by the harvest (`crop`), both wearing off by 1/150 a day, the price the usual price times (stock ÷ normal)^−½ with the ratio held between a quarter and four. The arrow compares the price with a trail about a fortnight behind (`TRAIL_DAYS` 15), at 1%: with 2% a price easing back after a push read as steady most of the way. The reason line names the bigger push when it moves the price by at least 3% of usual.
- **The harvest news line** reads "Athens’ harvest has failed, and wheat there is 46 a hundred (it was 25)" (or "A rich harvest in Troy: wheat there is down to …"), shown under the top bar for a fortnight as "From Greece: …" with a small map icon; clicking it opens that city's page. Greece keeps its last twelve lines of news.
- **`#prices`** sells oil only (not oil and meat: meat barely moved and the oil chart is the point). Two more olive groves and a second press are built after the yard so the town has oil to spare, the route opens once two caravans have paid for oil, and the demo opens as the third comes within a week of the yard: April 746 BC, Corinth's oil at 56 against its usual 90, the chart stepping down from 90 visit by visit, "Cheap, easing (usually 90): you sold them 2,500 in the last year". Its setup plays the town on from its founding (March 750 BC) to then, about 4 s in node.
- **`#famine`** sets Athens' coming harvest to fail (a direct edit to Greece's state in the demo's setup, commented as such) rather than waiting for a seed where it does, so the page says "the fields look parched: the harvest may fail". It opens five days before the harvest, in late August 747 BC; wheat in Athens goes from 25 to about 46, and every other good there rises with it at its weight. The Athenian ship arrives about three weeks later.
- **The ruler's terms** show on every ruled city's page and every route tab ("Corinth’s terms: cordial, prices 2% in your favour"), with a tip saying what they mean. The starting moods are all between wary and cordial, so the terms in the demos are small (2% in your favour). `#buywine`'s first caravan now brings its 1,200 wine for 840 dr (852 before).
- **The route tabs** show your price with its arrow in the tables, the terms line above them, and a "Prices in …" list below with the harvest line, each good's chart and its reason. A city's page on the map has the same prices block above its "Trade with …" section. The Tyre tab's price tips add what the open routes pay for that good now, and whether it is rising or falling.
- **Travellers on the map** (caravans and visiting ships) are hoverable, picked before the labels when within 18 pixels: "A caravan from Corinth · On the road to your city: at the edge of your map in 4 days · for your oil". Clicking one opens its city's page.
- **The route demos** (`#routes`, `#caravan`, `#buywine`, `#athensship`, `#anchor`) gain a watch post at (112, 39) and an architect's office at (114, 40) by the caravan yard (the architect first tried at (114, 39) had no road beside it). Their opening differs from slice 16 on purpose; the 64 demos before slice 16 still open and play 900 ticks on exactly as at the baseline (the probe outside the repo, run again after the UI stage).
- **The bounds test** plays four Greeces twenty years each, twice over: once selling every ruled city its whole year's limit of what it buys and buying all it sells, a twelfth every month (more than any route can), and once with no trading. Every price stays between a quarter and three times the Tyre price, and between half and twice its usual (±1 for rounding); three years after the trading stops the hard-traded Greece's prices are the calm one's again, within 1 (the same harvests fell on both). The planned "within a tenth of usual after two years" became this, since harvests keep prices off their usual level in both.
- **Tests:** 14 new in `tests/prices.test.ts`, with a version 16 save fixture (`#buywine` 40 ticks in, from the baseline code); the slice 16 routes tests read the price from before the trader settles, and the world test that checked prices stayed put now checks a year of them is kept monthly. 266 tests in 24 files.
- **Measured** (alternating with the baseline build, twice each): bundle 1,316 KB raw and 387 KB gzipped (+13 and +4); bare link ready and first frame within the noise of the baseline; `#town` and `#richtown` triangles and draws unchanged, saves 1 KB bigger (141 and 178 KB); `#prices` ready at 4.0 to 4.4 s by the page's clock (its setup about 2.5 s in the browser), `#famine` 3.5 to 3.7 s; 22 draws on their map pages with a route open (`#greece` is unchanged at 20; the charts and arrows are HTML, not drawn on the map). `npm test` 266 passing, `npm run build`, `npm run smoke` and `npm run measure` all clean.
