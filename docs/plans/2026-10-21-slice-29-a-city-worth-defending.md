# Slice 29 — A city worth defending

*21 Oct 2026. Phase 4, "A city worth defending" (`docs/specs/2026-10-19-a-city-worth-defending-design.md`). The phase's last slice. Builds on slices 23 to 28 (bronze and the barracks, battles in the streets, walls, the sea, loans both ways, debts unpaid) and their reviews; the whole-phase review comes next.*

## Goal and check-in

The spec's words: a prepared town with walls, towers, barracks, triremes, loans each way and a raid on its way, for judging the look and checking the budgets; numbers tuned across a few years of play (pay, band sizes, loan terms, money early and late); a look-and-feel pass over soldiers, battles, walls, ships and panels; rough edges Oliver would notice, and the phase 3 leftovers that fit.

Played the natural way (the town of `#companies`, built street by street from the bare map as a player would, then given routes to every city, a shipyard and two triremes, and played on for four years with Greece's own dice), the phase's systems hold together, but four things stand out, in the order the brief ranks them:

1. **Defence arrives just too late.** Troy's "Sails!" gives 24 days before the ships beach; companies sent from the barracks by the olive grove the moment the sails show reach that beach in 24 to 25 days, the day the band lands. Without triremes the band took 430 dr and 375 wine and lost one man. By land, a threat refused at once brings the band to the west edge in 21 days and the companies reach the flood plain in 22 to 34. Companies now march half again as fast (3 tiles a day, from 2), so a company sent when the sails show stands on the beach about a week early, and one sent when a threat is refused is in place before the band is at the edge.
2. **Rulers' loans are rare.** In four years of play, one offer (in the third year, when the treasury held 7,000 dr) and one ask. A loan offer or ask can only come in a month when no other ruler has made any deal for two months, and an offer only from a ruler pleased with you (15 or more), so in a lean first year, with every ruler at about 5, none comes. Loans now have their own turn in the month, spaced by their own gap (four months between any two across Greece) instead of everyone's, and a cordial ruler (0 or more) offers when your treasury is low or wages are owed, as the spec says. The four years are played again to check Oliver meets one in the lean first year.
3. **Seizures rarely bite.** They take only what waits in the caravan yard or on the quay for the lender's trader, and what is on its way to them, which is nearly always nothing. Now, from step 2, once a month the lender's agents also take goods from your storehouses and granaries: what you sell them first, then whatever is worth most to them, up to a third of what is owed each time. Each seizure names the store it came from, in the news, a town line and the ledger, and the store's stock drops where you can see it.
4. **`#fortress`**, the phase's prepared town (below).

Then a look-and-feel pass over soldiers, battles, walls, ships and panels from screenshots, and the rough edges Oliver would notice most (below).

**Oliver can:** open `#fortress`, play it for a few years, and judge whether defending feels part of the city and whether debts have teeth.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#fortress`: `#companies`' town (built street by street, its mine, armoury, barracks and two companies), carried on as its builder would carry it: a caravan yard and routes to Corinth, Sparta, Athens and Troy; a wall up the river's east bank from the hills (the west gate where the road crosses, two towers beside it) and a wall across the valley north of the town (a gate on the north road, a tower beside it); a second barracks near the west gate with a third company; a shipyard by the river mouth with two triremes; a loan from Corinth and one to a ruler who asked. It opens with a raid on its way: Sparta's band gathering, about three weeks from the west edge, the Army tab open. A few years of play on it bring the loans' days, more of Greece's asks and offers, and whatever else Greece sends.
- `#fortress-paused` opens it paused, as every token does.
- Every earlier token keeps working.

## Not in this slice

Anything new in kind: harbour blockades, chariots, generals, conquest (the spec's "recorded for later"). Sound. Expeditions at sea meeting pirates. A shipyard panel of its own (its triremes stay on the Army tab). Partial repayments and repaying early for less interest (Oliver's call). Whether a company sallies out or holds the gate (Oliver's call).

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- Sim code stays pure and deterministic. What is random is a hash of Greece's or the city's seed, as before. Money moves only through `pay` / `income`; a seizure from a store is a `seized` ledger line like the others.
- **Earlier towns.** The pace of marching and the loans' turn are tunings the spec asks for, so they change some earlier histories on purpose: a demo whose history marches a company (`#landing`, `#collect`, `#report`) or reaches a month where a ruler would now offer or ask a loan. The demo probe (outside the repo) compares every earlier demo at opening and 900 ticks on, with the baseline; each that differs is named in the check-in with what changed, and its check-in steps re-checked. Demos with no army and no routes don't change.
- Old saves load: the state version stays 27 unless saved state changes shape (a migration if it does).
- The renderer and UI only read sim state; every action is a command. Static build, `base: './'`, all art in code.
- Judge by screenshots, tune by eye, never claim it looks or feels right on Oliver's behalf.

## Before

Measured at `4a8a473` (the main line, slice 26's review), headless Chromium with software WebGL at 1920 × 1080:

| What | Before |
|---|---|
| Tests | 438, all passing |
| Download (gzipped) | 2,937 KB: the game 677 KB, the prepared towns 2,260 KB (78 files) |
| First load (bare link) | ready at 1.9 s, first frame at 2.6 s |
| Demo loads | 109 demos (107 from prepared towns), median ready 1.7 s, slowest `#trade` 2.1 s; none over 3 s |
| `#town` / `#richtown` | 693 people, 60 walkers, a save 149 KB / 928 people, 88 walkers, a save 187 KB |
| Frame work (update before drawing) | `#battle` fought 12.1 ms, `#siege` hammering 11.0 ms, `#triremes` fighting 6.1 ms |

Software WebGL on a shared machine: frame and load times swing by a third from run to run, so only large changes count.

## Design decisions

**Natural play** (a probe outside the repo, `scratch-29/zz-natural.test.ts`). From `#companies`' town: the caravan yard and routes to every city with their trades, a shipyard and two triremes, then four years with Greece's own dice; the player answers as a middling one would (requests sent, offers and loans taken, tribute refused), or as a stingy one (everything refused), and when a threat comes plants both banners on the band's way to what it will make for (the beach, once the sails show). It logs every deal, threat, raid (threat, gathering, edge, landing, fight, end, what it took), each company's arrival, and the money, people, army and moods monthly. It is run before and after each tuning; the numbers go in As built.

**Marching** (`army.ts`). A company's banner moves 0.3 tiles a tick (3 a day; was 0.2), its men 0.38 to keep their places in the column (was 0.27). Raiders keep their pace (about 1.9 a day), so your soldiers outpace a band in their own streets. Expeditions leave and come home at the same new pace on your map; their time on the map of Greece is unchanged.

**Loans' own turn** (`favours.ts`, `loans.ts`). On the first of the month, after the older kinds have had their turn and none was made: if no loan offer or ask was made across Greece in the last four months, each free ruler in turn may ask (in trouble, wary or better: one month in five) or offer (no trouble, coin to spare: one month in six, four times as often when your treasury is low or wages are owed, half again from a generous or greedy ruler). An offer needs a ruler pleased with you (15), or only cordial (0) when your treasury is low. The other gates stay: none within six months of your first route, no threat live, fewer than two deals open, no loan either way with that ruler, no debt of yours overdue for an offer. The older kinds' turn is unchanged.

**Seizures from your stores** (`loans.ts`). From step 2, on its first day and every 30 days after while the debt stands: if what waits in the yard or on the quay and on the way came to less than a third of what is owed, the lender's agents take the rest of that third from your storehouses and granaries. They take the goods you sell to that city first (most first), then whatever is worth most to them, from the fullest store, valued at their prices. Each is a line of news naming the store ("Corinth’s agents seized 420 oil from the storehouse by the olive grove (worth 380 dr to Corinth): 1,240 dr is still owed"), a ledger line ("Seized by Corinth · oil"), the stock book, and comes off the debt. The warning (step 1) and step 2's news say the stores are at risk.

**`#fortress`** (`demos.ts`). `#companies`' town as its builder would carry it on, each step when the treasury can pay for it and a month's wages, answering Greece as a middling player would (requests sent, offers taken): the road north and the caravan yard (as `#rivals`), routes to Corinth and Sparta by road and Athens and Troy by sea, with what each buys ticked for sale; the shipyard by the river mouth and two triremes, built and crewed in turn; a second barracks inside the west gate and a company of hoplites raised there (filling as far as the town's fine houses and villas can spare men, and saying so); a loan to a ruler who asks (Greece's own if one asks within a year; else asked for the demo, and named so); then the walls on a loan asked of Corinth (as a player in want of their cost would): the west wall up the river's east bank from the hills (`#siege`'s line) with its gate and two towers, and a wall across the valley north of the town with a gate on the north road and a tower. Played on until Greece is calm, then Sparta's king is turned against the city (set up for the demo, and named so, as `#battle`'s): his threat refused, his band gathering. It opens with the band about three weeks from the west edge, the Army tab open, the camera over the west gate. The exact numbers (the band's size, the loans' sums and days) are what the history brings and go in As built.

**The look-and-feel pass.** Screenshots of `#fortress` at opening, the band at the west gate under the towers, the companies holding inside, the fight, the triremes at the jetty, the map of Greece with the loans and the band, and the panels (Army tab, Money tab, a city's Loans tab); each tuned until it reads.

**Rough edges** (most noticed first; the rest go to Known rough edges):
- Lines under the top bar go stale while paused, and lag a moment after a pause: news lines now go as soon as they no longer stand, paused or not.
- `#siege` from its opening view: the two towers hide the band at the gate. The view moves so the gate, the band and the towers are all in sight.
- `#landing` opens with Troy's ships far out and small: the view moves nearer the shore they make for.
- The little army on the map of Greece is hard to pick out near your city's label: drawn larger, with its banner.
- A trireme rowing home inside the bay still shows the lane buttons: hidden until she is moored.
- A band landed with no men left still lands one: none land.

## Tests

- **Determinism** (existing, with `#fortress` in the prepared towns): the same seed and commands give the same city.
- **Marching:** a company reaches a banner 30 tiles off in about 10 days (was 15); its men keep their places in the column.
- **Loans' turn:** from a lean town with routes six months old and a cordial ruler with coin to spare, an offer comes within a year; none comes within four months of another loan deal; the older kinds' deals come on the months they did.
- **Seizures from stores:** a debt at step 2 with an empty yard takes up to a third of what is owed from a storehouse (what they buy first), on the ledger and the stock book, off the debt; a month later another; paid, they stop; the ledger invariant holds.
- **`#fortress`:** it opens with walls, gates, towers, two barracks, three companies, two triremes, a loan each way and Sparta's band on the road; played on (a few months), the band is met and the books add up.
- The existing suite. `smoke.mjs` opens `#fortress` and checks what it opens on; `measure.mjs` adds it (load, triangles and draw calls, the frame at the gate fight).

## Tasks

1. Plan (this file), with the baseline measured. Commit.
2. Sim tuning: marching, loans' turn, seizures from stores; tests; the natural-play probe before and after. Commit.
3. `#fortress`: its history in `demos.ts`, its view, smoke and measure. Commit.
4. Look and tune from screenshots: soldiers, battles, walls, ships, panels; the rough edges. Commit.
5. Full checks, the demo probe, measurements, As built, the check-in. Commit, push.

## As built

Commits: the plan `cfe2c78`; the sim's tuning `2a6e49f`; `#fortress` `e5e34fe`; the look and rough edges `ed5184e`; the stores seized twice, not monthly, `ee131f0`; the check-in after.

**Natural play, before and after** (`#companies`' town with every route, a shipyard and two triremes, four and a half years with Greece's dice, a middling player):

| | Before | After |
|---|---|---|
| Loan offers and asks from rulers | 2: Corinth offers 1,500 (month 33, 5,800 dr in the treasury), Troy asks 2,000 (month 37) | 4: Corinth offers 2,000 "having heard your treasury is low" (month 6, in the lean first year), Corinth offers 1,500 (month 33), Troy asks 2,000 (month 37), Athens offers 2,000 (month 41) |
| The treasury at 1, 2, 3, 4 years | 1,241 / 3,884 / 5,514 / 6,619 dr | 3,241 (Corinth's loan in it) / 4,194 / 7,824 / 8,944 dr |
| A land raid refused at once (a stingy player, banners planted on the band's way) | the band at the west edge in 21 days; the companies on the flood plain in 22 to 34 | the companies in place about 8 days before the band reaches the edge: it broke, took nothing, 1 of ours killed |
| A sea raid (Troy's "Sails!", banners planted on the beach) | companies on the beach the day the band landed (24 to 25 days against 24) | on the beach about 8 days early; the band landed from the ship nearest its way in, past the banners (out of reach), and took 430 dr and 375 wine. A player who plants the banners again on the landed band (the probe's "chase"): it broke, took nothing, 3 of theirs fell |

Rulers' other deals (requests, tribute, offers of goods) came on the same months before and after. With triremes, the sea band never landed either way (all its ships sunk in the bay).

**Seizures from your stores.** As planned at first, a third of the sum every month from step 2 on: in `#borrow`'s debt the stores paid 2,001 of the 2,220 dr before the army came, and `#creditors`' collectors came for 219 dr. So the stores are seized twice, on step 2's first day and a month on, up to a quarter of the sum each time: in that debt, 1,000 dr's worth (530 oil and 432 meat, then 210 oil and 2,083 wheat), and the army comes for the 1,220 dr left.

**Loans' turn.** As planned, with offers one month in six (slice 28 had one in nine) from a free ruler with coin to spare, four times as often when your treasury is low.

**`#fortress`**, as the history brings it: it opens in June 745 BC (five years and a quarter in), 1,325 people, 1,664 dr, wages and pay 577 dr a month. 45 soldiers in three companies: the hoplites and archers by the olive grove (16 each) and the hoplites of the second barracks inside the west gate (13: "Only 13 fine houses and villas can spare a man"). The triremes Nike and Glaukos at the shipyard, crewed. The west wall with its gate and two towers, the north wall with its gate and a tower, three towers of 4 men each. Corinth offered 2,000 dr in the fourth year ("having heard your treasury is low"), taken and repaid on time; no ruler asked to borrow within a year of the second barracks, so Athens' ask of 1,000 dr at 11% for 12 months is set up for the demo (named so) and lent; the walls were paid for by 3,000 dr asked of Corinth, at 7% for 6 months (3,210 dr due 21 November). Sparta's band: 33 men, gathering, at the west edge in about 21 days, 800 dr to turn them back. Left alone, the towers bring down 14 of the 33, the band hammers the gate for 36 days, breaks in and leaves with 748 wheat and 219 dr, three buildings alight; with the three companies held inside the gate, they break it there: 22 of its 33 fall, it takes nothing (one building outside set alight), one of ours killed and one wounded (the test checks it is met and takes nothing).

**The look.** Screenshots of `#fortress` (opening, the band at the gate under the towers, the fight, the band before the gate from close, the map of Greece, 1280 wide), `#siege`, `#landing` and `#report`:
- **Lines under the top bar** stacked seven deep over the middle of the screen in `#fortress` (the raid, a ship, a caravan, a sending, the loan's coin, meat short), and on the map of Greece covered Corinth and your city. At most four show now (in their fixed order, so a raid's is always first); the rest fold under "+N more", which opens them. News lines go as soon as they no longer stand, paused or not.
- **`#landing`** opened over the town with Troy's ships far out under the lines: the view is now out over the bay looking west along the shore they make for, two of the three ships in sight and the trading post's jetty on the right.
- **`#siege`**: from its opening view the band stands in sight before the gate, between the towers; the view is unchanged.
- **Your army on the map of Greece** is drawn half again as large (5 to 9 figures, its banner above Corinth's label at `#report`).
- **A trireme rowing home** to her mooring no longer shows the lanes' buttons; **ships that beach with no men left** past their guards land nobody and sail home.

**Earlier demos.** Compared by a hash of the whole town at opening and 900 ticks on with `4a8a473`: 101 of the 107 with a history of their own are the same (the rest open on a fresh map, as before). `#landing` (its companies march faster), `#report` (the expedition marches out faster: the report comes on 17 November, not 23), `#overdue` (900 ticks on: step 2 takes 1,000 dr's worth from the stores), `#seized` (750 dr seized at opening: the gift and 500 dr's worth from the stores; 1,470 dr owed, was 1,970), `#creditors` (the army comes for 1,220 dr, not 2,220, and leaves with 1,600 wheat and 900 dr) and `#festival` (900 ticks on: Athens asks to borrow, in loans' own turn) differ.

**Tests:** 444, all passing (438 before; new: the march, loans' turn, two for seizures from stores, two for `#fortress`, a band with nobody to land). The smoke test passes, with `#fortress` added (its walls, towers, companies, fleet, loans and band, the Army tab, the band met at the gate) and `#seized`'s figures moved (1,470 dr owed, 750 seized, goods from the stores on the ledger); its `#hostile` step now waits for the city's page to redraw after the gift, which under load it once read a moment early.

**Measurements** (after): the download 2,981 KB (the game 679 KB, the prepared towns 2,302 KB in 79 files); first load ready at 1.9 s, first frame 2.6 s; 110 demos, median ready 1.8 s, none over 3 s (`#fortress` 2.0 s); `#town` and `#richtown` as before; `#fortress` 1,322,021 triangles and 82 draw calls from its view, 17.4 ms of work a frame in the fight at the gate; `#battle` fought 15.2 ms, `#siege` 11.7, `#triremes` 6.1.
