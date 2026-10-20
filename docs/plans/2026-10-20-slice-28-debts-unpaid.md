# Slice 28 — Debts unpaid

*20 Oct 2026. Phase 4, "A city worth defending" (`docs/specs/2026-10-19-a-city-worth-defending-design.md`). Built alongside slices 25 (in review) and 26 (the sea, next), in its own branch (`claude/phase-4-debts`); it joins the main line after review. Builds on slice 27, "Loans both ways", and on slices 23 to 25's army, battles and walls.*

## Goal and check-in

The spec's words: your default's escalation (the reminder and asking for time, the warning and Greece hearing, seized goods, the threat and the army that comes to collect); their default (forgiving, demanding, a raiding party or a full force on the map, the expedition's fight and its report, and what it brings home).

A loan you owe now has teeth. A month before it falls due a reminder comes, and you can ask the lender for more time: granted or refused by their mood and character, at a higher rate. On the day it is paid from the treasury if it can be; you can also choose to hold the payment back (Oliver: "loans from both sides don't have to be repaid"). Unpaid, it climbs three steps, each shown in advance on the loan with its date: a warning and a broken promise the lender remembers longest, which every ruler hears of (worse terms everywhere for three years); two months on, the lender closes their road or sea route and seizes your goods on it (what waits in the caravan yard or on the quay for their trader, and anything of yours on its way to them), each seizure a town line and a ledger line taken off the debt; two months more, a threat with a deadline for what is left, then an army half again the size of a raid band that marches on your city by the phase 3 road or lane, fights your soldiers as raiders do, and if it gets through loots up to what is owed (no torches: it came for coin) and leaves, the debt paid off by what it took. Beaten, the debt stands and another comes after a lull. Paying at any step stops the next.

A loan owed to you that is not paid on the day: the ruler may first ask for more time, which you grant or refuse; then, from their Loans tab, you can forgive it (a big lift with them, a small one with every ruler), demand it (a deadline they are likelier to meet the more they fear your army), send a raiding party (one or two companies) or a full force (most of your army). The companies march out of your city to the edge on the debtor's side (the drill ground empties, the Army tab says where they are), then a little army in your colours marches along the road on the map of Greece. Its fight with the city's garrison (Sparta strongest, Troy behind walls, Athens with ships, Corinth middling) is resolved from the two sides' strength and the world's dice, with a clear report: what was recovered, men killed and wounded by company, and how the ruler and Greece took it. The coin and goods come home with the army and go into the treasury and the stores; the fallen are mourned at home and the wounded walk back to heal.

**Oliver can:** miss a repayment in `#overdue` and see each step coming; send a full force after a city that won't pay in `#collect` and read the report; forgive a debt in `#forgive`.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#overdue`: `#borrow`'s young town some months on, Corinth's loan taken and its day just passed unpaid. The map opens on Corinth's Loans tab: the warning given, and the next two steps with their dates.
- `#seized`: the same debt two months on: Corinth's road closed, and goods waiting in your caravan yard seized against the debt (the town line, the ledger).
- `#creditors`: the same debt two more months on: the threat let run, Corinth's army in at the north edge of your land, making for your stores and treasury.
- `#collect`: `#companies`' town (a company of hoplites and one of archers at the barracks), Corinth owing you a loan (set up for the demo) that is overdue; the map opens on Corinth's Loans tab with its four answers and the odds.
- `#report`: that full force sent, the fight over: the report on Corinth's Loans tab, the army on its way home on the map.
- `#forgive`: `#rivals`' town, the archon of Athens unable to repay the 2,000 dr you lent her (the dice set for the demo); her Loans tab open, Forgive at hand.
- Every earlier token keeps working, each also with `-paused`.

## Not in this slice

Ships: an expedition by sea needs triremes (slice 26). Troy can only be reached by sea, so its form says why it can't go yet ("Troy can only be reached by sea: you need triremes"); Athens and Corinth go by road. The seam is `fleetFor` in `src/sim/expeditions.ts`, which returns no ships for now: whoever lands the second of slices 26 and 28 wires it to the shipyard's triremes. Pirates (slice 26) stay apart from seizures. Sound. Partial repayments (a loan is paid in one sum, as in slice 27; seizures and an army's loot take bites off it). Rulers marching on you for reasons other than debts and raids.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- Sim code stays pure and deterministic. What is random (whether a ruler grants time, asks for it, meets a demand, the expedition's fight and its losses) is a hash of Greece's seed with salts of its own, so Greece's own generator and every older roll land exactly as before. Money moves only through `pay` / `income`, on new ledger lines (`seized`, `collected`).
- **Earlier towns.** A town that never borrows or lends plays exactly as before: nothing here runs without a loan, and a raid with no loan behind it is untouched (the collectors' differences are all behind `raid.loan`). Every earlier demo opens, and plays 900 ticks on, exactly as at the baseline (the demo probe, outside the repo).
- Old saves load: the state goes to the next version after main's (26 now, renumbered after slice 26 if it lands first), with a self-contained migration that adds no expeditions and fills the new loan, raid and company fields.
- The renderer and UI only read sim state; every action is a command. Static build, `base: './'`, all art in code.
- Shared files (`state.ts`, `migrate.ts`, `demos.ts`, `saves.ts`, the side panel, smoke and measure) get small grouped edits; the work lives in `src/sim/loans.ts`, a new `src/sim/expeditions.ts` and `src/ui/loans.ts`, so slice 26 merges in cleanly.
- Judge by screenshots, tune by eye, never claim it looks or feels right on Oliver's behalf.

## Before

Measured at `579a3f2` (slice 25's check-in, the main line), headless Chromium with software WebGL at 1920 × 1080, on a machine shared with other builds:

| What | Before |
|---|---|
| Tests | 404 in 35 files, all passing (367 s) |
| Bundle | 79 files, 11,793 KB raw, 2,566 KB gzipped: the game 641 KB, the demos' prepared towns 1,925 KB (69 distinct) |
| First load | ready at 2,935 ms, first frame at 3,871 ms |
| Demo loads | 100 demos, 98 from prepared towns; median ready 2,732 ms, slowest `#coast` 3,477 ms |
| `#town` | 1,453,964 triangles, 89 draw calls; 693 people, 60 walkers; a save 149 KB |
| `#richtown` | 1,623,607 triangles, 101 draw calls; 928 people, 88 walkers; a save 187 KB |
| Map of Greece | `#greece` 305,842 triangles, 32 draw calls; first opened 5,364 ms after the key |
| Frame work (update before drawing) | `#town` 11.96 ms, `#richtown` 16.12 ms, `#companies` 19.60 ms, `#borrow` 12.29 ms, `#lend` 11.04 ms, `#repaid` 23.48 ms, `#battle` fought 23.95 ms |

Software WebGL on a shared machine: frame and load times swing by a third from run to run, so only large changes count.

## Design decisions

**The loan's new fields** (`Loan` in `state.ts`): `step` (0 none; 1 warned; 2 seizing; 3 the army), `stepAt` (when the last step came), `fell` (the tick it fell overdue, kept as the record), `seized` (dr taken off it by seizures and an army's loot), `withhold` (you chose not to pay on the day), `extended` (how many times its day was put off), `reminded`, `raid` (the collectors' raid, 0 none), `demand` (the day a demand runs out, 0 none), `demanded` (made once), `sent` (an expedition out after it, 0 none). New states: `grace` (a borrower asks you for more time, waiting on your answer), `forgiven`, and `collected` (paid off by seizures, an army's loot or an expedition).

**Your default.**
- *The reminder:* thirty days before the day, a line of news ("falls due in a month: 2,220 dr; the treasury can spend 1,400 dr now; ask for more time on Corinth's page"), once.
- *Asking for more time* (`loan` act `time`, while it runs, once a loan): answered at once by the ruler's envoy (no herald, so it is never too late). Granted when cordial or better, or wary and steadfast or generous; refused when cold, or wary and greedy or shrewd, each with its reason. Granted: three months more (six from a generous ruler) for 3% more of the sum (5% from a greedy one, 2% from a generous one), the reasons added to the loan's.
- *Holding it back* (`loan` act `withhold`, a toggle): on the day it is not paid, and the steps begin. Otherwise it is paid on the day if the treasury can, as before; and once overdue it is no longer paid by itself: "Repay now" pays what is left and ends the escalation.
- *Step 1, on the day:* the lender's memory "you broke your word: the loan of 2,000 dr went unpaid" (−30, fading over four years, the slowest; bent by character), each other ruler's "heard you failed to repay Corinth" (−5, two years), and every loan's terms dearer for three years ("Greece knows you failed to repay Corinth", +3% each). An urgent line of news with what follows and when.
- *Step 2, two months on:* the lender's routes close (as a hostile ruler's do, until the debt is paid), and each day goods are seized: what waits for their trader in the caravan yard (a land route) or on the quay (a sea route) of what you sell them, valued at their price, and anything of yours on its way to them on the map (a gift, goods sent for a request, coin of a loan to them). Up to what is left owed. Each seizure: a line of news, a ledger line ("Seized by Corinth · oil", the measures), the stock book, and taken off the debt. Paid off by seizures, the loan is `collected`.
- *Step 3, two months on:* a threat (through raids.ts, `raid.loan` set): pay what is left by a month's deadline or an army comes, half again a raid band's size. Paying it is repaying the loan. Refused or let run, the army gathers and marches as a band does, comes in at the edge, makes for the stores and the tax office, takes up to 80 a man of goods and up to 60 dr a man from the treasury (up to half of it), never more in all than what is owed, and leaves. It sets nothing alight. No mood calls it off. What it carries off (less what your soldiers take back) is taken off the debt; paid off, the loan is `collected`. Beaten, the debt stands, and the next threat comes four months after it left.

**Their default.** On the day, the dice and how likely they are to repay decide as before; one who doesn't pay and is not cold may first ask for three months more at 3% more (`grace`, 15 days for your answer: Grant +4 with them, Refuse −4); refused or lapsed, it is overdue. Overdue, their Loans tab offers:
- **Forgive** (`forgive`): ends it; +30 with them (three years), +4 with every other ruler who hears.
- **Demand** (`demand`, once): two months; on the day, the dice against how likely they are to repay plus their fear of your army (up to +30 in 100: your men against their garrison), each named. Met: their herald brings the whole sum. Not met: it stands, and says so.
- **Send a raiding party** / **Send a full force** (`expedition`).

**Expeditions** (`src/sim/expeditions.ts`, `world.expeditions`):
- *Who goes.* A raiding party: the one or two companies with the most men ready. A full force: every company with men ready, but with three or more the weakest stays home. Only men ready in the ranks go; the rest stay at the barracks. Not while raiders are on your land, nor with an expedition already out. Troy: "can only be reached by sea: you need triremes" (`fleetFor`).
- *Leaving the city.* Each company's banner marches to the edge on the debtor's side (Corinth and Athens north, Sparta west), along the open edge tile nearest the barracks that it can reach. There it goes `away` (a new order) and its men too (a new soldier state): they are not drawn, fight nobody and are paid as ever. Once every company is at the edge (or after two months, with those that are), the expedition sets off on the map.
- *On the map.* A little army in your colours along the road (`landTicks` × 1.2, as a band), three days at their city with crossed swords, and home the same way: its place a pure function of the tick, as any traveller's.
- *The fight.* Your strength (a hoplite 1.2, an archer 0.8, hirelings the same) against the garrison: Sparta 60, Athens 40, Troy 45 (behind walls, ×1.5 against a full force), Corinth 30; ×0.6 at war (their army is out), ×0.7 beaten lately, ×1.2 warlike. A raiding party meets only the countryside's watch (a quarter). The odds are ratio² / (1 + ratio²), between 5 and 95 in 100, shown on the button. Losses by the dice: won, 4 to 10% killed and 6 to 14% wounded (a raid half the killed); lost, 18 to 30% killed and 12 to 22% wounded.
- *What it brings.* A raiding party that wins: 30 dr and 50 of their most plentiful good a man, at most three fifths of what is owed. A full force that wins: the whole debt in coin and a fifth more as goods (the penalty). Against a city that owes you nothing: a raid 30 dr and 50 goods a man, a force 40 dr and 100 goods a man. Lost: nothing. The debt comes off when the fight is won (the takings are yours, on their way home): paid off, the loan is `collected`.
- *Moods.* The target: over a debt, a raid −15, a force −25 (three and four years); without cause −40 and −60. Every other ruler: −3 over a debt, −12 without cause.
- *The report* (`exp.report`): its lines in order: who went, the fight ("Your 30 men met Corinth's garrison of about 30 and won"), what was recovered and what is left owed, killed and wounded by company, how the ruler and Greece took it. A line of news, the Army tab and the city's Loans tab show it.
- *Home.* At the edge the companies come back onto your map and march to their barracks; the wounded walk to it to heal; the coin goes into the treasury ("Collected · from Corinth"), the goods into the stores (the stock book's "collected"). The killed were mourned at home when the news came (one fewer in the house, the house's story), as men killed in the streets are.

**Where you see it.** The Loans tab: your overdue loan's three steps with their dates (done, now, to come); "Ask for more time" with the likely answer, and "Hold back payment"; their ask for time with Grant and Refuse; their overdue loan's four answers with their consequences and odds; an expedition under way, and its report. The debts chip ("Overdue: 2,220 dr to Corinth · seizing"); the line under the top bar for each step and the expedition; the Army tab's companies away; the map's army and its hover card.

## Tests

- **Determinism:** the same seed and commands give the same loans, seizures, collectors and expedition after N ticks; a save mid-expedition (companies away, the army on the map) round-trips and plays on identically.
- **Independence:** the existing determinism and demo tests; the demo probe (outside the repo) compares every earlier demo at opening and 900 ticks on.
- **Migration:** a version 25 save (main's `#borrow`, saved at the baseline) loads at the new version and plays on; older fixtures still load.
- **Your default:** reminder once; time granted and refused by mood; withheld goes overdue; the steps in order at their dates and stop when paid; seizures take goods from the yard and a gift on the way, capped at what is owed, on the ledger; the collectors' threat paid repays; the army's loot capped and taken off the debt.
- **Their default:** grace granted and refused; forgive and its memories; demand met and not; an expedition leaves, resolves, comes home, the coin in the treasury and the debt off; Troy refused; the ledger invariant throughout.

Plus the existing suite. `smoke.mjs` opens the new demos and drives a forgive, a full force sent, and the report; `measure.mjs` adds them.

## Tasks

1. Plan (this file), with the baseline measured. Commit.
2. Sim: the loan's new fields and states, the reminder, time, withholding, the three steps and seizures, the collectors in raids.ts, their default's grace, forgive and demand, expeditions; ledger kinds; commands; migration and saves; tests. Commit.
3. UI: the Loans tab's steps and answers, the expedition and report, the debts chip and lines, the Army tab, the map's army and card, the ledger. Commit.
4. Demos; look and tune by screenshots; smoke and measure. Commit.
5. Merge main in, full checks, the demo probe, measurements, As built, the check-in. Commit, push.

## As built

Built as planned, in `src/sim/loans.ts` (the steps, time, holding back, seizures, grace, forgive, demand), the collectors behind `raid.loan` in `src/sim/raids.ts`, a new `src/sim/expeditions.ts`, and `src/ui/loans.ts`; state version 26 with a self-contained migration. Commits: the plan `fc6d79c` and `90e7adc`, the sim `132119e`, the UI `3d9ab58`, the demos `14dfabe`, tuning from screenshots `78e35b9`, main merged in `c13bf0a`, a smoke fix `8e7c3d3`, the check-in `fd9b3e1`, slice 26 merged in and the sea wired `5662cbb` and `42c6b88`, two small follow-ups `5a41393` and `f7e65f0`, and this As built.

**Where it differs from the plan:**
- **Slice 26 landed first, so this slice wires the sea.** The state is version 27; slice 26's migration is 25 to 26, and this one is 26 to 27. `fleetFor` is slice 26's (in `src/sim/fleet.ts`): the triremes at home, crewed and sound. An expedition to Troy takes as many companies as there are such triremes. The companies march to the open tile beside the first trireme's shipyard, not an edge, and go aboard there. When it sets off, `sailFor` takes the triremes off the bay's guard. On the map it is one ship in your colours along the lane (slice 26's own trireme piece is hidden while it is away). At home, `fleetHome` brings the triremes back to their moorings. The words follow ("marching to the shipyard", "at sea, bound for Troy", "They sail home: in your bay"). Without triremes, the refusal says what is missing. A lender's army comes by sea when slice 26's `raidBy` says so (Troy, or a city you trade with only by sea), through slice 26's landings, and its words use `edgeWords`.
- **`#seized` seizes a gift, not the caravan yard.** In `#borrow`'s town the yard is nearly always empty when Corinth's trader is due (its goods leave as fast as they come), so the demo sends Corinth a 250 dr gift that is seized on the road: the ledger's "Seized by Corinth · drachmas 250", the town line and the chip show it. Yard and quay seizures work (tested), but they rarely bite in play for the same reason.
- **`#collect`'s debt is staged.** Corinth asks to borrow (`makeLoanAsk`), is lent the sum and doesn't pay on the day; its news says "(set up for this demo)". With no troubles, its reason falls back to "for new walls and a temple" (only a demo asks for a ruler in no trouble).
- **The expedition on the map is 3 to 9 figures,** a figure for about five men, not one per man: drawn one a man, a full force stretched from your city to Corinth's.
- **Rulers offer and ask more often** (a carried-over finding): an offer a month in 9 (was 18), an ask a month in 5 while in trouble (was 10). Every earlier demo still opens and plays 900 ticks on exactly as before.
- **A fix on the main line's saves:** a save holding a wounded or healing soldier was refused (the save check knew only coming, arming, ready and leaving). It now accepts every soldier state, `away` included.
- **An overdue loan pays itself when it can, unless you hold it back.** The plan had an overdue loan wait for "Repay now". As built, the card's toggle reads "Pay when the treasury can" while you hold it back, and "Hold back payment" while you don't; not held back, it is paid (and the steps stop) on the first day the treasury can spare what is owed. A loan already overdue in an old save gets its warning when the game next runs.
- **A company away** reads "Away · on the road to Corinth" on the Army tab; its banner can't be picked and it has no orders while away.

**The balance, from the demos' own dice** (one run each, so only a sample):
- `#creditors`: Corinth's 35 men, unopposed (the town has no soldiers), carry off 1,826 dr and 200 goods and the loan is `collected`.
- `#collect`, a raiding party (one company, 16 men, odds about 9 in 10 against the countryside's 8): won; 1 killed, 1 wounded; it brings 450 dr and 750 wheat (600 dr against the debt, 1,020 dr still owed); home in 51 days.
- `#collect`, a full force (32 men, odds about 5 in 10 against the garrison of 30): won; 2 killed, 2 wounded; it brings the 1,620 dr and 1,620 wheat (the penalty); home in 52 days.

**After** (measured on `f7e65f0`; the check-in compares it with Before):

| What | Before | After |
|---|---|---|
| Tests | 404, all passing | 433, all passing (12 of them debts; the rest from slice 25's review and slice 26) |
| Download (gzipped) | 2,566 KB: the game 641 KB, the prepared towns 1,925 KB | 2,935 KB: the game 676 KB (debts and slice 26's fleet), the prepared towns 2,259 KB (this slice's six demos and slice 26's three) |
| First load (bare link) | ready at 2.9 s, first frame at 3.9 s | ready at 2.5 s, first frame at 3.8 s |
| Demo loads | 100 demos, median ready 2.7 s | 109 demos, median ready 2.4 s, slowest `#panel` 3.1 s |
| `#town` / `#richtown` | 1,453,964 / 1,623,607 triangles, 89 / 101 draw calls | the same |
| Map of Greece (`#greece`) | 305,842 triangles, 32 draw calls | the same; this slice's maps 304,778 to 313,882 triangles, 26 to 31 draw calls |
| Frame work (update before drawing) | `#town` 12.0 ms, `#richtown` 16.1, `#companies` 19.6, `#borrow` 12.3, `#lend` 11.0, `#repaid` 23.5, `#battle` fought 24.0 | `#town` 11.9 ms, `#richtown` 14.8, `#companies` 10.8, `#borrow` 5.9, `#lend` 7.4, `#repaid` 13.7, `#battle` fought 26.9; new: `#overdue` 6.6, `#seized` 10.8, `#creditors` 11.8, `#collect` 12.3, `#report` 8.2, `#forgive` 11.4 |

Every frame time here is within the run-to-run swing.

**Checks:** `npm test` 433 passing; `npm run build` clean. The full smoke passes, slice 26's and this slice's sections included, apart from two `#battle` checks that failed the same way on the main line (`931c516`). The main line has since fixed them (`8bd48c3`, merged in `048ae03`), and that section re-run on its own passes. Every earlier demo (100, slice 26's included) opens, and plays 900 ticks on, with the same people, money, homes, house levels and soldiers as on main. Old saves load: the version 25 fixture (through slice 26's migration and this one), and every older fixture in the suite. One fix to the smoke on the way: in `#report` the army's hover lies under the town lines at the smoke's 1280 × 720, so the check sets them aside (`8e7c3d3`).

**How far it got:** everything in Tasks 1 to 5.
