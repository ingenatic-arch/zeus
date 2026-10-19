# Slice 27 — Loans both ways

*19 Oct 2026. Phase 4, "A city worth defending" (`docs/specs/2026-10-19-a-city-worth-defending-design.md`). Built before slices 24 to 26, in its own branch (`claude/phase-4-loans`), at Oliver's wish that loans come alongside the army; it joins the main line after review. Builds on slice 23, "Bronze and the barracks".*

## Goal and check-in

The spec's words: asking for a loan and the answer with its terms and reasons; offering one; rulers offering and asking; accepting and refusing and what each does to moods. Likely-to-repay with its reasons; repaying, early or on time; repayments arriving; the debts chip and the Money tab's loans; ledger lines.

Each ruled city's page gets a Loans tab. From it you can ask its ruler for a loan (500 dr up to what the city can spare): your herald goes, and when he gets there the ruler answers with terms (how much interest, repaid by when) or a refusal, each with what moved it, the way a price names its reasons ("Corinth will lend 2,000 dr at 9%, repaid in 18 months: cordial (−2%), Corinth is rich (−2%), greedy lord (+5%), your city owes no one (−2%)"). You accept or decline the terms; the coin comes back with the herald and goes into the treasury on its own ledger line. You can also offer a ruler a loan, choosing the amount, the interest and the date: the coin goes with your herald, and they take it or send it back, and say why. Every borrower shows how likely they are to repay (likely, fair, doubtful) and why. Now and then a warm, rich ruler offers you a loan (more often when your treasury is low or wages are owed), and a ruler in trouble (a failed harvest, a war, a lost war) asks you for one; these come like requests, with the same calm (one a ruler at a time, two across Greece, none until six months after your first route). Repayment is one payment of the whole sum, interest included, on the day it is due: yours is paid from the treasury, if it can be, and you can repay early; theirs comes with their herald if they pay. A debts chip under the top bar shows the next date due either way, and the Money tab lists every loan with its terms and dates.

**Oliver can:** borrow from Corinth in a lean year in `#borrow`, read why Sparta's terms are worse, lend to a city that asks in `#lend`, and watch a repayment come in in `#repaid`.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#borrow`: `#caravan`'s young trading town, its treasury nearly empty, where you asked Corinth and Sparta for 2,000 dr each and both answers have come back; the map opens on Corinth's Loans tab, with its terms waiting on you. Sparta's page has its dearer, shorter terms and why.
- `#lend`: a richer town trading with Greece, where a ruler in trouble asks you to lend them coin; the map opens on their page.
- `#repaid`: the same town some months on, the loan you lent come due and paid: their herald is on the road with the whole sum, a few days from your land; the map opens on their Loans tab.
- Every earlier token keeps working, each also with `-paused`.

## Not in this slice

A debt not paid and what follows (slice 28): the reminder and asking for more time, the warning and Greece hearing of it, seized goods, an army sent to collect; forgiving, demanding, sending a raiding party or a full force after a debtor, and expeditions on the map. In this slice a loan whose day passes unpaid simply stands **overdue**: yours is paid from the treasury as soon as it can be, theirs stays owed, each with a line of news and the chip in red, and nothing else follows (a state and a step left ready for slice 28). Terms that mention your city's soldiers (the army stays out of the terms). Sound for coins (later in the phase, with the rest of the phase's sound).

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- Sim code (`src/sim/`, `src/map/`) stays pure and deterministic. What is random about loans (whether a ruler offers or asks this month, whether a borrower pays on the day) is a hash of Greece's seed with salts of its own, so Greece's own generator and every older dice roll land exactly as before. Money moves only through `pay` / `income`, on new ledger lines.
- **Earlier towns.** A town that has never opened a route is never offered or asked anything, and a town that never asks or offers a loan plays as before. Rulers' offers and asks for loans come after every older kind of deal in a month's turn, so a month that brought a request, an offer or tribute before brings the same now; only a month that brought nothing may now bring a loan. So the demos with no routes stay exactly as they were, and a Greek demo with routes changes only where a ruler now offers or asks for a loan (the demo probe names any that do).
- Old saves still load: the state goes to the next version after main's (23 now) with a migration that adds no loans; the welcome back says rulers now lend and borrow, and where.
- The renderer and UI only read sim state; every action is a command. Static build, `base: './'`, all art in code.
- Shared files (`state.ts`, `migrate.ts`, `demos.ts`, `ledger.ts`, the side panel, smoke and measure) get small, grouped edits; the loans live in `src/sim/loans.ts` and `src/ui/loans.ts`, so the army slices merge in cleanly.
- Judge by screenshots, tune by eye, never claim it looks or feels right on Oliver's behalf.

## Before

Measured at `c5695a2` (slice 23's check-in, the main line), headless Chromium with software WebGL at 1920 × 1080:

| What | Before |
|---|---|
| Tests | 366 in 31 files, all passing |
| Bundle | 65 files, 9,949 KB raw, 2,081 KB gzipped (the game itself 4 files, 456 KB gzipped; the prepared towns 61 files, 1,625 KB gzipped) |
| First load (bare link) | ready at 2,359 ms, first frame at 3,050 ms by the page's clock |
| Every demo's load | 91 demos, 89 from prepared towns; ready at median 2,283 ms, slowest `#nooil` 4,284 ms; 11 over 3 s (`#nooil`, `#vineyard`, `#villas`, `#fleecevendor`, `#blaze`, `#watchman`, `#pasture`, `#oilvendor`, `#fire`, `#raiders`, `#winery`: the machine was shared with other builds, so loads ran slower than slice 23 measured) |
| `#town` | 799,168 triangles, 83 draw calls (town view) |
| `#richtown` | 910,707 triangles, 95 draw calls (richtown view); a save 186 KB |
| Work a frame before drawing | `#town-shot` 14.60 ms, `#richtown-shot` 22.76 ms, `#richstreet-shot` 20.03 ms, `#rivals-shot` 13.02 ms |

(Headless software rendering: the triangle and draw counts and the frame work compare like with like; the frame rate itself is not representative.)

## Design decisions

**A loan** (`world.loans`, `src/sim/loans.ts`): who (a city), which way (`in`: you borrowed; `out`: you lent), who started it (you, or them), the sum, the interest (a whole percent of the sum, for the whole loan, not a year), the months it runs, the whole sum owed back (sum and interest), the reasons for the rate and for the months, each with what it moved, the day agreed and the day due, and how it stands:

- borrowing: `asking` (your herald on his way) → `terms` (their answer waits on you for two months) or `refused` → `coming` (accepted: their coin on its way with their herald) → `running` → on the day, `repaying` (paid from the treasury, your herald taking it) → `repaid`; or `overdue` if the treasury can't pay it.
- lending: `offering` (your coin on its way with your offer) → `running` if they take it, or `returning` (sent back) → `declined`; `running` → on the day, `repaying` (their herald bringing it) → `repaid`, or `overdue`.
- a ruler's own offer or ask: `proposed`, tied to a deal (below), until you take it, turn it down or let it lapse.

One loan each way per city at a time. Ended loans are kept three years (they make your name as a payer), then let go.

**Coin travels with a herald**, as coin gifts do (`heraldTicks`): about as long as a trader takes from that city, and a day to set out. The loan's coin is a gift on the map (`Gift.loan` names its loan), drawn and hovered like one ("Corinth's loan to you · 2,000 dr: at the edge of your land in 6 days"). It is never counted as a gift: it makes no gift's memory, and a ruler's gift back can still come while it travels.

**Terms when you ask, haggled by mood** (`loanTerms`). The interest starts at 12%, the months at 12, and each thing that moves them is named:
- the mood: wary +3% and three months fewer, cordial −2%, warm −4% and six months more, devoted −6% and a year more;
- the city: Athens and Corinth are rich (−2%), Troy is wealthy (−1%), Sparta keeps little coin (+2%);
- the ruler: greedy +5%; generous −3% and six months more; shrewd +2% and six months fewer ("wants it back sooner"); steadfast three months more (patient); fickle three months fewer;
- their troubles: at war +3%; a failed harvest +2%, a poor one +1%;
- your name: your city owes no one (−2%), or you already owe another city (+2% each); Greece knows you pay your debts (−1% for each loan repaid on time in the last three years, at most −3%).
- Between 4% and 30%, between 6 and 36 months.
**What a city can spare**: Athens and Corinth 5,000 dr, Troy 4,000, Sparta 2,500; half when wary; a fifth more when warm, half again when devoted; half while at war, and less after a poor or failed harvest; in 500s.
**They refuse** (each with its reason): cold or hostile ("does not lend to a city he is cold towards"); wary with no route between you ("does not lend to a city he barely knows"); nothing to spare ("Sparta has no coin to spare: at war with Athens"); or while your city has a debt overdue anywhere. Asked for more than they can spare when the herald arrives, they offer what they can. The Loans tab says, before you ask, what they would likely answer as things stand; the answer itself is worked out when the herald arrives.

**Lending** (`offerAnswer`): you choose the sum (500 to 5,000), the interest (5, 10, 15 or 20%) and the months (6, 12, 18 or 24). The coin goes with your herald at once (on the ledger as "Lent to Sparta"); when he arrives they take it or send it back:
- they never take coin from you while cold or hostile;
- a ruler in need (at war, a poor or failed harvest, beaten in a war lately) takes it if the interest is no dearer than they will bear (14%, more at war or after a failed harvest, less for a shrewd one); a proud ruler takes it only at war;
- one not in need takes only cheap coin (5%) from a city they are cordial or better with;
- nobody takes more than half again what they could spare themselves.
The tab says, before you send, whether they would likely take it and why.

**How likely a borrower is to repay** (`likelyToRepay`): starts fair, moved by their character (steadfast +, pious +, generous +, fickle −, greedy −), their mood towards you, a war (−), a poor or failed harvest (−), a lost war lately (−), their city's wealth, and a sum or a rate that is heavy for them (−). It reads "likely", "fair" or "doubtful", with each reason marked + or −. On the day a loan to them is due, Greece's dice decide against that chance as it stands then, so the doubtful pay less often.

**Rulers offering and asking** (deals of two new kinds, `loanoffer` and `loanask`, in favours.ts's month's turn, after tribute, requests and offers, with their own dice salts):
- a ruler who is pleased with you (+15 or more), can spare 1,000 dr or more, and is not at war, may offer you a loan, one month in eighteen, four times as often when your treasury is low (wages owed, or less than two months' wages in hand), half as often again when generous or greedy; on their own terms, a percent cheaper as it is their offer; about three fair gifts' worth;
- a ruler in trouble (at war, a poor or failed harvest in the last four months, beaten in a war in the last six) who is wary or better may ask to borrow, one month in ten: about three fair gifts' worth, at 10% (more when desperate, less when shrewd or greedy), over 12 months (18 at war), with how likely they are to repay;
- answered on their page (the Ruler tab's "what he asks of you", and the Loans tab) within two months; the same calm as requests. They are shown like requests on the map (a coin seal on the label) and in the line under the top bar.

**What each does to the mood** (memories, bent by personality as answers are):
- lending to a ruler who asked: +15 ("you lent us 2,000 dr in our need"); your own offer taken by a ruler in need: +12; taken as cheap coin: +5;
- refusing a ruler's ask: −6; letting it lapse: −4;
- taking a ruler's offer: +3; declining it: nothing (a proud ruler −2);
- being refused when you ask: nothing;
- repaying on time: +8 with the lender, and every ruler's terms a percent better for three years ("Greece knows you pay your debts"); repaid late: +2.

**Repaying.** One payment of the whole sum on the day it is due. Yours is paid from what the treasury can spend (never before wages): on its ledger line ("Repaid to Corinth"), and your herald takes it. If it can't be paid on the day, the loan is overdue and is paid as soon as the treasury can, with a line of news (no further consequence this slice). "Repay now" on the Money tab and the city's Loans tab pays it early, interest and all. Theirs: on the day, they pay (their herald brings it, "Repaid by Sparta") or it stands overdue, with a line of news.

**Ledger lines.** Five new kinds: "Loan from Corinth" and "Repaid by Sparta" and "Sent back by Sparta" coming in; "Repaid to Corinth" and "Lent to Sparta" going out. The Money tab's table gets a "Loans" row when there are any.

**The debts chip** (`src/ui/debtschip.ts`): under the top bar while any loan is running or overdue: the next date due either way ("You owe Corinth 2,240 dr · 12 June", "Sparta owes you 2,300 dr · 4 March"), "+1" for more, red while one is overdue. Clicking it opens the Money tab.

**The Money tab's loans**: each loan with its city, which way, the sum, the interest and the whole sum due, the day agreed and due (and days left), and how it stands; "Repay now" for yours; a link to the city's page.

**The Loans tab** on a ruled city's page (`src/ui/loans.ts`): what you owe them and what they owe you (each with its terms, reasons, days left and how likely they are to repay); your herald's ask or offer on its way; their terms waiting on you, with Accept and Decline; "Ask for a loan" with the likely terms as things stand and the sums they can spare; "Offer a loan" with the sum, interest and months to choose, whether they would likely take it and why, and how likely they are to repay. The ruler's own offer or ask shows here and on the Ruler tab.

**Lines under the top bar.** A ruler's offer or ask, like a request ("Corinth offers to lend you 2,000 dr at 9%…: answer on Corinth's page"); terms waiting on you; your loan due within a month when the treasury can't cover it; your loan overdue. The news of each step (an answer, coin arriving, a repayment) as lines from Greece.

**The seam for slice 28.** `overdue` with the day it fell due, a step (`stepOverdue`) that does nothing yet, and the ruler's mood and the terms already reading your record.

## Tests

- **Determinism:** the same seed and commands give the same loans (asked, answered, accepted, repaid; lent and repaid) after N ticks; a save mid-loan (coin on the road) round-trips and plays on identically.
- **Independence:** a town that never opens a route is never offered or asked anything; the existing determinism and demo tests; the demo probe (outside the repo) compares every earlier demo at opening and 900 ticks on.
- **Migration:** a version 22 save (`#companies`, saved at the baseline) loads at the new version with no loans and plays on; the older fixtures still load.
- **Terms:** follow mood, wealth and traits, each reason named and adding up; a cold ruler refuses; a wary one with no route refuses; asking for more than they can spare gets what they can.
- **Lending:** a ruler in need takes a fair loan and one not in need doesn't; likely-to-repay moves with war, harvest and character.
- **Repayment:** on time (from the treasury, the herald, the memory), early (whole sum), overdue when the treasury can't (and paid later); theirs paid or overdue as the dice and the chance say; the ledger invariant holds throughout.
- **Rulers' offers and asks:** come only after the first route's six months, respect the calm, and each answer does what it says to the mood.

Plus the existing suite. `smoke.mjs` opens `#borrow`, `#lend` and `#repaid` and drives an accept, a lend and a repay early; `measure.mjs` adds them.

## Tasks

1. Plan (this file), with the baseline measured. Commit.
2. Sim: the loan state, terms, asking, offering, rulers' offers and asks, repayment, the herald's coin, ledger kinds, the command, migration and saves; tests. Commit.
3. UI: the Loans tab, the deals on the Ruler tab and the map, the debts chip, the Money tab's loans and ledger lines, town lines, the welcome back. Commit.
4. Demos `#borrow`, `#lend`, `#repaid`; look and tune by screenshots; smoke and measure. Commit.
5. Merge main in, full checks, the demo probe, measurements, As built, the check-in. Commit, push.

## As built

*(Filled in at the end of the slice.)*
