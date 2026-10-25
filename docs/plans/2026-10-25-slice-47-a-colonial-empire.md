# Slice 47 — A colonial empire

*25 Oct 2026. Phase 6, "Crime, health and a polished city" (`docs/specs/2026-10-25-crime-health-and-a-polished-city-design.md`), wave 2, the empire line (`claude/p6-empire`, built alongside the order, land and panels lines). It starts at `5586938` (the trunk with slice 43 merged as state version 38, plus the bug thread's quay and war-options fix). It builds on slice 37's colonies (`src/sim/colonies.ts`), slice 43's colonies that grow up (`src/sim/colonyworks.ts`) and slice 34's vassals and allies (`src/sim/vassals.ts`, `src/ui/empire.ts`).*

## Goal and check-in

The spec's words: station a company or triremes in a colony: they defend it, and expeditions launched from it are shorter; colonies trade with Greece on their own and pay you a share of their trade; in your wars, a colony sends its militia; a grown colony that wants its freedom can be offered a treaty that makes it a free ally, as a peaceful end, instead of a revolt; an Empire page lists every vassal and colony with its loyalty, share and wants.

At the end of slice 43 a colony grows, asks and is built up, but it is defended only by triremes you send when a threat comes (and they come home after), it pays you only in its goods, and when it grows proud it either mends or leaves. After this slice your colonies are an empire: a company of your soldiers can march down to your quay, be rowed out to your ship and sail to hold a colony; triremes can be stationed off it for good; from there they strike at a rival in days instead of weeks. Each colony trades with Greece and sends you a share of that trade in coin with its ships, named in the ledger. When raiders come for your city, your grown colonies' militia sail into your bay and come ashore at your quay to stand with your men, and they sail with your army to its wars. A colony that talks of freedom can be let go by treaty, and stays your friend. Your city's page on the map of Greece lists the whole empire.

**Oliver can:** open `#colonybase` to see three colonies at different stages (an outpost, a settlement and a town), with Rhodes' ships sailing for Nea Naxos: station your two triremes there from its page and watch the raid fail; station a company and watch it march to the quay and sail. Open `#freeally` to offer Nea Thasos, grown and talking of freedom, a treaty that makes it a free ally.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#colonybase`: `#colonies`' town with a barracks, a company of Arcadian hoplites and two triremes at home; Nea Naxos a settlement, Nea Thasos a town, Nea Kythnos (planted for the demo, and named so) an outpost; Rhodes' ships staged against Nea Naxos, its page open on the map of Greece.
- `#freeally`: the same town, Nea Thasos grown to about 600 people with its loyalty low and talking of freedom, its page open.
- `#colony`, `#colonies`, `#colonywants`, `#colonyworks` and `#empire` keep showing what their check-ins say; where the trade share or the militia move their histories, the check-in says exactly how.
- Every earlier token keeps working.

## Not in this slice

Laying out a colony's streets (the vision: run lightly; a colony is run from its page). Rivals' colonies trading or sending militia (their colonies keep slice 31's piece). Garrisons in vassals' cities. A free ally that cools and breaks the treaty (it stays warm; a later slice may give it moods that move). New wares (none is needed). The town's message log (slice 44): this slice's news goes into the News of Greece with `site:` keys, as slice 37's and 43's do, for slice 44's integrator to route.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets; the spec's *parallel plan* binds file ownership.
- **State version 39 on this line** (`SIM_STATE_VERSION`), with `fromSlice47` in `migrate.ts` that fills only this slice's fields, each only if absent, hooked by `if (st.version === 38) fromSlice47(st);`, its note written "Slice 47 (A colonial empire): ..." (renumbered at merge). Tests compare with `SIM_STATE_VERSION`, except the migration step's own.
- **Shared files:** few edits, each in a block headed "Slice 47"; the new command kind (`colonyempire`) and ledger kind (`colonytrade`) appended at the end of their lists; nothing reordered or reformatted. No new ware. No new use of `MAP_SIZE` (the militia land at the quay, so they need no map edge).
- **This line's own files:** a new `src/sim/colonyempire.ts` holds stationing, the colonies' trade, the militia and the treaty; `colonies.ts`, `colonyworks.ts` and `vassals.ts` call into it at a few named points. The colony parts of `army.ts` and `expeditions.ts` stay a few lines each. The trading post's dockers (`trade.ts`) are not touched; the colony porters' store counting is fixed in `colonyworks.ts` only.
- Sim code stays pure and deterministic: no new dice are needed (the threat roll is slice 37's; a colony's strike uses the expedition's own dice); maths through `dmath.ts`. Money only through `pay` and `income` (the trade share as `colonytrade`, a call-off's refund as `refund`).
- **Histories.** A town with no colony plays exactly as before. Towns with colonies move on purpose: the trade share comes in with the share ships (more money), and a colony of town stage sends its militia against a raid (more men at the fight). Every earlier demo is compared at opening (date, people, money) and 900 ticks on against `5586938`; each that moved is named in the check-in with why.
- Renderer and UI only read the sim; buttons go out as commands. All art in code; new art fits the original look (`classic.ts`), and `-modern` and `-plain` still work.
- Judge by screenshots at 1920 × 1080; never claim it looks or feels right on Oliver's behalf.

## Before

At `5586938`, on the shared machine (four lines' builders at work; load about 13 when the tests started, 24 later).

| What | Before |
|---|---|
| Tests | 607 in 50 files, all passing (828 s on the loaded machine) |
| Build | the starting commit's build and every prepared town kept aside (`scratch-47/dist-before`, `scratch-47/saves-before`) |
| Prepared towns | every demo compared at opening and 900 ticks on against these |
| Download, loads and frame work | measured side by side with this slice's build at check-in, with a loosened copy of `measure.mjs` |

## Design decisions

**Where it lives.** New `src/sim/colonyempire.ts`: stationing (a company's passage out and home, triremes on station), striking from a colony, the colonies' trade and your share, the militia, the treaty and free allies. Its records live inside the `empire` field: `Empire` gains `passages` (a company's voyage out or home), `militia` (a colony's or free ally's men coming to your aid) and `freed` (your free allies). `Colony` gains `garrison` (the company stationed there, 0 none) and `ships` (triremes stationed there). `Company` gains `posted` (the colony it is stationed in) and `militia` (the colony its men come from); `Expedition` gains `from` (the colony it set out from). New `src/ui/colonyempire.ts` holds the page's new sections; `src/ui/empire.ts` gains the empire's list.

**A company stationed in a colony.** From the colony's page you choose a company at home (ready men in its ranks, not away). Your ship sails in for it as for goods (20 days in from the gulf), and the company's banner marches to the road beside the trading post. Once she is at anchor, the rowing boat takes its men out, eight a trip (a trip is slice 43's four days out and back), the men going aboard as the boat leaves; she sails when the last are aboard, along the colony's lane (a harbour's quarter quicker), and the company is stationed there once she lands. Men still walking in or waiting for armour stay behind (as for an expedition). While away it is paid as ever, can't be dismissed or marched, and its places are filled once it is home. One company to a colony. **Bringing it home:** your ship sails from the colony, in through your bay, anchors, and the boat brings the men ashore at the quay, eight a trip; they march to their barracks. **What it does there:** raiders and claims fail more often: a company turns them away by itself about 2.5 in 100 for each man's might (a hoplite or horseman 1.2, an archer 0.8: slice 28's numbers), at most 45 in 100 (sixteen hoplites); on the same roll as walls and a soldier governor, so the odds combine. Loyalty +6 ("your company there"). It can strike from there (below).

**Triremes stationed in a colony.** From the colony's page you station your triremes at home (all, or some) there for good: they sail out along its lane as slice 37's guards do, but stay after a threat has passed, fight every threat that comes, keep its ships safe from a war's preying fleets (slice 38's guarded lanes), and count +2 each for its loyalty (at most +6) on top of the +3 every trireme you own gives. Brought home from the page. Slice 37's "send triremes to guard it" stays as it was (they come home when the threat is over).

**The threat roll shows it.** A threat's section names every part of its defence and the odds as they stand: "your 2 triremes off its shore: about 6 in 10; the 1st company of hoplites: 4 in 10; its walls: 4 in 10 — together about 9 in 10 they are turned away", and what sending more would make it.

**Striking from a colony.** A colony with your company stationed there shows its nearest three rival cities (not your vassals or allies) and any city whose ships threaten it, each with how long the voyage is from here and from your city ("Rhodes: 9 days from here, 18 from home"). A raid from there takes the stationed company only, sails at once (no mustering), fights as any raid does (slice 28's odds, takings and losses), and sails back to the colony, where the company stays stationed; the takings are sent home and paid in as any expedition's. The voyage is the sea way from the colony to the city on the map (slice 37's `seaWayTo`) at the colonies' lane pace. It counts as an expedition (one at a time), and like any strike at a threatening city it calls that city's ships home.

**The colonies' trade.** Each colony trades with Greece on its own: about 4 dr a year a person at a town's rate (3 in the first draft; see *As built*) (an outpost half, a settlement three quarters, a city a quarter more), half again with a harbour. It trades with its two nearest cities not at war with you, named on its page. Your share is a third, paid in coin with each season's share ship (a quarter of a year's share each time) and entered in the ledger as "colonies' trade, from Nea Thasos". Halved while its loyalty is under 40; nothing while it talks of freedom; lost with the ship if a war's fleet takes the share. A town of 400 trades about 1,600 dr a year and pays you about 533 (133 a season); with a harbour 2,400 and 800. The page names every factor.

**The militia.** A colony of town stage or more, loyalty 40 or more and not talking of freedom, and every free ally, sends its militia: about one man in forty of its people, at least 8 and at most 16.
- **When you are raided:** once a ruler's threat against you stands (from the threat's day, before the band gathers), the militia sail: along the colony's lane, into your bay and to the quay, where the boat brings them ashore; they march to stand by what the raiders make for, as an ally's aid does (slice 34), fight under their own name ("the militia of Nea Thasos"), and once the raid is over (or the threat paid off) walk back to the quay and sail home.
- **In your wars:** a full force, a conquest or an ally's war you join: the militia's might is counted with yours (named in the plan and the report: "the militia of Nea Thasos, 12 men, sail to meet your army"); the ship sails from the colony to the city on the map.

**A treaty for freedom.** When a colony of 500 or more talks of freedom, its freedom section offers "Offer it a treaty: free, and your ally". It becomes a free city (its site free, with its name), and your **free ally**: its governor (or its council's first man) rules it, warm to you, with the reasons named ("you set it free by treaty", "it was your colony for N years"). It sends you a share of its trade, half what it paid as a colony; its militia come to your aid; it grows slowly by its own children. Its page on the map of Greece says all this. On the treaty, its guards and stationed triremes sail home, its company is brought home, a shipment still loading is called off (refunded), and a want lapses. Left to declare itself free (slice 37), it leaves as before, cold and sending nothing.

**The Empire page.** Your city's page on the map of Greece gains, at its top, **Your empire**: a row for each vassal (its loyalty, tribute, arming), ally, colony (its stage and people, loyalty, share, its want, what is stationed there, its trade share a year) and free ally, each with a button that opens its page. `src/ui/empire.ts` holds it (beside the vassal's Empire tab it already has); nothing is duplicated: the details stay on each page.

**Findings carried from slice 43's review.**
1. *A shipment can stall forever.* The page and the refusals count only stores the trading post's roads reach (as the porters do). A shipment loading gains two buttons: "Sail with what is aboard" (when something is) and "Call it off" (the goods on the quay go back to the stores, a work's drachmas are refunded and its funding undone, a want can be sent again). And a shipment with nothing aboard after 120 days is called off by itself, with the news naming why.
2. *The anchored ship shows her sacks* only once the boat has rowed the first load out (half a trip after she anchors).
3. *One ship per colony:* the city draws every ship of this line in your bay (shipments, a company's passage and the militia's ship), from a pool, and the hover finds each.
4. *`__zeus.where(kind)`* reads the sim's own walker positions, not the renderer's last drawn ones.
5. *The pace* is left as it is, for Oliver's eye.

## Tests

- **Stationing a company:** the banner marches to the quay; the men go aboard as the boat rows, eight a trip; she sails; once landed the company is stationed (garrison set, men away, can't march or be dismissed, paid); the hold is in the threat roll (a staged threat with a roll between the walls' hold and the walls-and-company hold fails only with the company); bringing it home lands the men at the quay and they march to barracks. Refusals: no ready men, away, one there already, no trading post.
- **Stationed triremes:** stay after a threat ends (slice 37's guard test still passes: guards come home); count in the odds and loyalty.
- **Strike from a colony:** shorter than from home; takes only the stationed company; the threat is called off; the company is stationed again after; takings paid in.
- **Trade share:** the numbers above (town of 400, harbour, stages, low loyalty, talk of freedom); paid with the share ship as `colonytrade`; the ledger invariant holds.
- **Militia:** a staged raid on a town with a town-stage colony: the militia's ship sails, anchors, they come ashore at the quay and stand by the goal; home after; a war's plan counts their might.
- **Treaty:** refused unless it talks of freedom; makes a free ally, site free, guards home, cargo called off; the free ally pays its share and sends militia.
- **Findings:** reachable stores only; call-off refunds; sail with what is aboard; the auto call-off.
- **Determinism** with a company stationed, a passage at sea and militia ashore; **save and load** round-trip with them; `fromSlice47` on a hand-built version 38 state; a version 37 save loads through every step.
- **Independence:** a town with no colony plays exactly as before (the demo comparison).
- The existing suite; `smoke.mjs` opens `#colonybase` and `#freeally`; `measure.mjs` adds them.

## Tasks

1. Plan (this file), with the baseline. Commit.
2. The simulation: `colonyempire.ts`, the hooks in `colonies.ts`, `colonyworks.ts`, `vassals.ts`, `expeditions.ts` and `army.ts`, the state and migration, the command and ledger kinds, the saves' checks, the findings' fixes. Tests. Commit.
3. What Oliver sees: the page's new sections, the Empire list, the ships in the bay and their hovers, the pieces on the map of Greece. Commit.
4. The demos (`#colonybase`, `#freeally`), prepared towns, smoke and measure. Look and tune from screenshots. Commit.
5. Full checks (tests, build, the slow smoke of this slice's and slices 37, 40 and 43's blocks, the measure side by side, every earlier demo compared, a version 37 save), *As built*, the check-in. Commit, push.

## As built

Built as designed, in three commits after the plan (`a8d1e20` the simulation and its tests, `b19204a` the page, the Empire list, the ships, the map pieces, the demos, smoke and measure, then the check-in with these notes). Where it differs from the design above:

- **The trade is 4 dr a head a year, not 3.** At 3 a town of 400 sent you about 100 dr a season; I raised it to 4 (133 a season) so the coin stands out in the ledger beside the goods. It is one number to tune. So a town of 400 trades about 1,600 dr a year and pays you about 533; with a harbour about 800 (the design paragraph above is corrected). An outpost trades at half the rate, a settlement three quarters, a city 1.25.
- **The trade's coin rides with the goods.** It is carried on the season's share ship (`Tribute.coin`) and paid in as `colonytrade` when she comes ashore. A colony with no goods to send that season sends the coin on its own ship. A free ally's ship carries only coin. A war's fleet that takes the ship takes the coin too, and the news says so ("and its share of its trade, N dr").
- **A strike from a colony sails the shorter way.** That is the sea way (slice 37's `seaWayTo`, reversed) or straight across counted 1.3 times as long for the shores it keeps to, whichever is shorter (`strikeWay`). `seaWayTo` runs out along the city's own lanes and then down the colony's, so from Nea Thasos to Troy it measures 84.6 on the table against 36.8 straight across (Nea Naxos to Rhodes keeps the sea way, 52.3).
- **The militia come ashore as soon as their ship anchors**, with no rowing boat. Their ship sails in like any visitor (20 days from the gulf), so they arrive about three weeks after the threat. A raid that ends before then sends them home without landing; their ship's hover says why ("came into your bay after the raiders had gone").
- **The third colony in `#colonybase` is on Kythera** ("Nea Kythera"): Kythnos is Corinth's in that history, so the setup takes the first free site, as the design allowed.
- **A free ally's page** shows its ruler's mood with its reasons (`freeMood`), its trade and share, what is on its way to you (in the tribute's words), and its militia. Its label on the map reads "your ally" in your city's colour. Your colony's label gains a small shield while a company or triremes are stationed there.
- **The station picker** lists only companies at home with ready men. While a passage is under way the garrison section shows its words in place of the buttons.
- **The cargo's buttons** ("Sail with what is aboard", "Call it off") sit under the shipment on the colony's page, in `cargoActsHtml`. The line under the top bar names the stores the porters can't reach and the day she gives up: "she sails with what is aboard about X", or "she is called off about X if nothing has come down to her".
- **A passage's or the militia's ship at anchor** has its line under the top bar (rank 1). A colony's threat (rank 2) outranks it, so with Rhodes coming for Nea Naxos the company's rowing is named only in the News of Greece and the ship's hover.

**Files.** New:
- `src/sim/colonyempire.ts`: stationing, passages, the threat-roll parts, strikes from a colony, the trade and share, the militia, the treaty and free allies, the bay's ships, words and save checks.
- `src/ui/colonyempire.ts`: the colony page's garrison, strike, trade, militia, treaty, defence and cargo sections; the free ally's page; the hover pages for ships on the map.
- `tests/colonyempire.test.ts`: 15 tests.

The line's own files changed:
- `src/sim/colonies.ts`: stationing and loyalty causes, the hold on the threat roll, the coin with the share ship, the pirates' words, stationed triremes kept after a threat and brought home on loss.
- `src/sim/colonyworks.ts`: reachable stores only, sail now, call off and the four-month call-off, no sacks before the first row-out, the passage's and militia's town lines.
- `src/sim/vassals.ts`: `Empire.passages`, `militia` and `freed`; `Tribute.coin`; the share's income as `colonytrade`; `aidGoal` exported for the militia.
- `src/ui/colonies.ts`, `src/ui/colonygrowth.ts`, `src/ui/empire.ts` (`empireOverviewHtml`), `src/ui/colonies.css`.
- `src/render/greece/index.ts`: the passage's, militia's and strike's ships on the map; a strike from a colony drawn from there.

**Touched outside the line** (each in a block headed "Slice 47"):
- `src/sim/state.ts`: `SIM_STATE_VERSION` 39; ledger kind `colonytrade` appended; `Company.posted` and `Company.militia`; `Expedition.from`.
- `src/sim/migrate.ts`: the note "Slice 47 (A colonial empire): ..." and `fromSlice47`, hooked `if (st.version === 38) fromSlice47(st);`. It fills `passages`, `militia` and `freed` on the empire, and `garrison` and `ships` on each colony, each only if absent. No goods array is added, so nothing to pad.
- `src/sim/commands.ts`: the `colonyempire` command appended (station, home, ships, shipshome, strike, free, sail, cancel).
- `src/sim/sim.ts`: `stepColonyEmpire` and the command.
- `src/sim/army.ts`: the militia's name; a stationed company can't be marched or dismissed, and its places wait until it is home.
- `src/sim/expeditions.ts`: a raid from a colony (`e.from`) steps in colonyempire.ts; the militia's might is in a full force's plan and fight, and their line is in the report.
- `src/game/saves.ts`: the `colonytrade` ledger kind pushed, and the empire check calls `colonyEmpireOk`.
- `src/ui/ledger.ts`: the `colonytrade` line, shown after the vassals' tribute (`ORDER.splice` at run time; no existing line moved).
- `src/render/city.ts`: the bay's colony ships from a pool (`bayShips`: shipments, passages and militia).
- `src/main.ts`: their hover over the pool; `__zeus.where(kind)` reads the sim's walker positions.
- `src/ui/greece.ts`: the empire list on your city's page; the ships' hover pages.
- `src/ui/rivals.ts`: the stationed shield on a colony's label, and the free ally's label.
- `src/game/demos.ts`: `#colonybase` and `#freeally`, one setup function and two entries.
- `scripts/smoke.mjs`: a slice 47 block (`#colonybase`: the page's sections, stationing, the passage's words, the empire list, the company marching; `#freeally`: the treaty, the free ally's page, its label) and the ok line.
- `scripts/measure.mjs`: both demos on the map's list, and `#colonybase` on the city's.
- No new use of `MAP_SIZE`. No new ware. `trade.ts` and war options are not touched.

**Histories.** Every demo's prepared town was compared with `5586938`'s at opening and 900 ticks on (date, people, money, walkers, buildings, colonies, sites, newest news): 132 of 136 are exactly as before. Four moved, on purpose, and only by the trade's coin; their people, walkers, buildings, loyalties and sites are as before:
- `#colonies`, `#colonywants` and `#colonyworks` (the same town): 422 dr more at opening and 518 more 900 ticks on. Nea Naxos' and Nea Thasos' share ships now carry the coin, and the newest news reads "Nea Naxos sends you its share: 90 marble and 74 dr, your share of its trade".
- `#empire`: 32 dr more at opening and 57 more 900 ticks on.

`#colony` is unchanged. No raid against a town with a town-stage colony happens in any prepared history, so no militia moves one.

**Checks.** See the check-in for the numbers.
- Typecheck is clean.
- Tests: 622 in 51 files. The full run on the loaded machine (load about 35, three other lines testing at once) had six time-bound failures: five timeouts (`hazards` every demo's fire risk, `materials` the loggers' camp, `money` harsh taxes, `routes` determinism, `treasury` every demo's wages) and `culture`'s "quickly" check at 2.1 ms against its 2 ms limit. Each file, rerun alone, passes, as does `colonyempire.test.ts` (rerun after its migration test was set to the literal version 38, as slice 43's uses 37, so it still tests this step after renumbering at merge).
- Every version 37 prepared town (134, slice 43's baseline) loads through `fromSlice43` and `fromSlice47` to version 39 and runs 300 ticks.
- The build is clean.
- The smoke blocks for slices 37, 40, 43 and 47, run on their own on the loaded machine, pass, except the two "#empire: the thieves" checks, which fail on the starting commit too.
- The full slow smoke: SLOW.
- The measure, side by side with `5586938` (a slimmed copy: download, the colony demos' load, triangles, draw calls and frame work): see the check-in's table.
- `#colonybase` and `#freeally` were walked at 1920 × 1080 in the original look, `-modern` and `-plain`.

