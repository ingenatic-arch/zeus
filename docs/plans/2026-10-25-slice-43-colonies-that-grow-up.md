# Slice 43 — Colonies that grow up

*25 Oct 2026. Phase 6, "Crime, health and a polished city" (`docs/specs/2026-10-25-crime-health-and-a-polished-city-design.md`), wave 1, the empire line (`claude/p6-empire`, built alongside the order, land and panels lines). It starts at `53e5bb4` (the trunk after the original-look side slice and the phase spec, state version 37). It deepens slice 37's colonies (`src/sim/colonies.ts`, `src/ui/colonies.ts`).*

## Goal and check-in

The spec's words: colonies grow in stages (outpost, settlement, town and city) at population thresholds, each shown in a drawn picture on the colony's page and in its model on the map of Greece; works you fund in drachmas and goods shipped out (a harbour, walls, an agora and a temple, fields, a second trade); wants with deadlines that you meet by ship from your quay; governors chosen from two or three candidates with traits. The goods go out from your quay: porters carry them down, and a ship sails.

At the end of slice 37 a colony is a number that sends goods: you can set its share, guard it, or let it go. After this slice it is a place that grows up and asks things of you. Nea Thasos starts as tents on a beach; as its people pass 150, 400 and 900 it becomes a settlement, a town and a city, and its picture and its piece on the map grow with it. Each stage opens works you can pay for, and what you send for them leaves your own quay: porters carry the timber or the wheat down to the jetty, your ship anchors, and she sails. Now and then the colony asks for something by a day, and it remembers whether you sent it. When it is founded, or its governor dies or is dismissed, you choose who governs it.

**Oliver can:** open `#colonywants` to see Nea Thasos asking for wheat after a hard winter, send it from its page and watch the porters carry the sacks down to the quay and the ship sail; open `#colonyworks` to fund Nea Thasos' harbour and watch its picture change as the timber is carried down, sails, lands and the harbour is built.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#colonywants`: `#colonies`' town, Nea Thasos asking for wheat after a hard winter (the ask set up for the demo and named so), its page open on the map of Greece over the quay.
- `#colonyworks`: the same town, Nea Thasos a settlement with its harbour to fund and the timber in your stores, its page open on the map.
- `#colony`, `#colonies` and `#empire` keep showing what their check-ins say; where the stages or the retuning move their histories, the check-in says exactly how.
- Every earlier token keeps working.

## Not in this slice

Slice 47's colonial empire: companies and triremes stationed in a colony, colonies' own trade with Greece, their militia in your wars, a treaty that makes a grown colony a free ally, the Empire page listing every vassal and colony. Laying out a colony's streets (a colony is run from its page). Rivals' colonies growing in stages (they keep slice 31's piece). New wares (none is needed: every work and want uses the eleven trade goods). The message log (slice 44): colony news goes into the News of Greece as slice 37's does, for slice 44's integrator to route.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets; the spec's *parallel plan* binds file ownership.
- **State version 38 on this line** (`SIM_STATE_VERSION`), with `fromSlice43` in `migrate.ts` that fills only this slice's fields, each only if absent, hooked by `if (st.version === 37) fromSlice43(st);`, its note written "Slice 43 (Colonies that grow up): ..." (renumbered at merge). Tests compare with `SIM_STATE_VERSION`, except the migration step's own.
- **Shared files:** few edits, each in a block headed "Slice 43"; the new walker kind (`shipper`) appended at the end of `WALKER_KINDS`; the new command kind (`colonyworks`) appended at the end of the command kinds; nothing reordered or reformatted. No new ware. No new use of `MAP_SIZE`.
- **Shipping out stays in this line's own functions** (new `src/sim/colonyworks.ts`): its porters and ship do not go through the trading post's dockers in `trade.ts` (a separate thread is fixing those on `main`). `trade.ts` is only read from (its berth, ship route and phases).
- Sim code stays pure and deterministic: new dice are hashes of Greece's seed with salts of their own (as `colonies.ts` does), so no older roll moves; maths through `dmath.ts`. Money only through `pay` (ledger kind `colonies`, as founding); goods out of the stores through `setHeld`, noted in the stock book (`colony:<site>`).
- **Histories.** A town with no colony plays exactly as before: nothing new runs without a colony or a founding. The towns with colonies (`#colonies`, `#empire`, and the demos made from them) move on purpose: shares retuned with the stages, a governor chosen by the council, wants asked and (in a history nobody answers) ignored. Every earlier demo is compared at opening (date, people, money) and 900 ticks on against `53e5bb4`; each that moved is named in the check-in with why.
- Renderer and UI only read the sim; buttons go out as commands. All art in code (the colony's picture is SVG); new art fits the original look (`classic.ts`), and `-modern` and `-plain` still work.
- Judge by screenshots at 1920 × 1080 (and the page at 1280 × 720); never claim it looks or feels right on Oliver's behalf.

## Before

At `53e5bb4`, on the shared machine (four lines' builders at work; load 0.1 when the tests started, 17 a minute later).

| What | Before |
|---|---|
| Tests | 590 in 49 files, all passing (515 s on the loaded machine) |
| Build | 2 min 43 s (the prepared towns baked in 153 s: 91 demo towns, 103 distinct) |
| Prepared towns | every demo's town kept aside (`scratch-43/saves-before`) for the comparison of every demo at opening and 900 ticks on |
| Download, loads and frame work | the starting commit's build kept aside (`scratch-43/dist-before`) and measured side by side with this slice's build at check-in, with a loosened copy of `measure.mjs` |

## Design decisions

**Where it lives.** New `src/sim/colonyworks.ts` holds the stages, the works, the wants, the governors and the shipping out; `colonies.ts` calls into it at a few named points (its monthly step, growth, loyalty, what a colony sends, the threat's outcome, landing) and keeps everything else. The records stay inside the `empire` field: `Colony` gains its stage, works, want, boosts and governor candidates; `Empire` gains `cargoes` (shipments going out). New `src/ui/colonypicture.ts` draws the picture.

**Stages.** By its people: an **outpost** (tents on the beach) from landing, a **settlement** from 150, a **town** from 400, a **city** from 900. A colony steps down only if a raid takes it below four fifths of its stage's threshold. Each step up is news ("Nea Thasos has grown into a settlement: a harbour and an agora can be built there now"). The stage sets how much each of its people makes (below) and which works open.

**What a colony makes, retuned** (phase 5's finding: "generous in cheap goods", a colony of 400 sending about 2,290 oil a year at a fair share). It now makes measures of its good per person, set against what one of your own works makes, not drachmas per person, so a cheap good no longer comes in by the thousand. At a town's rate (a settlement makes four fifths of it, an outpost half, a city a tenth more), a colony of 400 at a fair share sends about:

| Its good | Before | Now |
|---|---|---|
| oil (Kythera) | 2,290 | about 1,280 |
| wheat (Cyrene) | 8,000 | about 1,760 |
| copper (Kythnos) | 4,000 | about 1,200 |
| fleece (Melos) | 2,910 | about 960 |
| timber (Thasos) | 1,070 | about 900 |
| marble (Naxos) | 530 | about 600 |

The shares (a fifth, two fifths, three fifths), their loyalty and their growth pull are unchanged. A harbour adds a quarter; a miser governor a tenth.

**Works you fund.** Each is built once, opens at a stage, and costs drachmas (paid when you fund it, ledger `colonies`, "Works for Nea Thasos: its harbour") and goods shipped out from your quay. It is built after its goods land, in a few months.

| Work | Opens | Price | Built in | What it does |
|---|---|---|---|---|
| Fields | outpost | 200 dr, 200 wheat (seed corn) | 2 months | it feeds itself: a quarter more newcomers and +2% a year from its own harvests; no more asking for wheat after a hard winter |
| A harbour | settlement | 500 dr, 150 timber | 3 months | its ships a quarter quicker both ways, its share a quarter larger |
| An agora | settlement | 400 dr, 120 timber | 2 months | loyalty +6 |
| A temple | town | 600 dr, 120 marble | 4 months | loyalty +8 |
| Walls | town | 800 dr, 200 timber | 4 months | raids fail more often (the walls alone turn about 45 in 100 away, with your triremes' odds on top); a raid that gets in takes a third as many people and leaves the season's ship; a walled colony can't be claimed |
| A second trade | town | 500 dr, 150 copper (tools) | 3 months | a second good to send you, at half the first's rate: Naxos wine, Thasos marble, Kythnos cheese, Melos oil, Kythera fleece, Cyrene horses |

Walls answer phase 5's finding (colonies draw threats, 9 in 36 colony-years) by making a threat matter less, not by making it rarer: the threat rate is unchanged.

**Wants.** Now and then a colony asks for something by a day: the first about 6 to 12 months after landing, then 8 to 16 months after the last one ended; none asked in winter. What it asks depends on the season and its state, never its own good:
- **wheat after a hard winter** (spring, without fields): about 0.6 a person;
- **wine for its festival** (summer or autumn): about a quarter a person;
- **oil for its lamps and its gymnasium** (a settlement or more): about 0.3 a person;
- **fleece for cloaks before the winter** (autumn): about 0.3 a person;
- **timber after a storm tore its roofs** (spring, unless it makes timber): about a quarter a person;
- **armour for its militia** (a town or more, or threatened within two years): a set for every 20 people, at least 10.
Each has a day five months on. You send it from the colony's page (it must all go: one button, with why not if your stores are short). Met by that day (the goods landed): it remembers (+10, fading over three years) and grows faster for a year (+4% a year). Late: +3. Not sent by the day: it remembers that too (−10, fading over four years), and a hungry spring slows its growth for a year (−3% a year). The page shows, before you send, when it would land.

**Shipping out.** A shipment (`Cargo`) is a list of goods for one colony (a want's and works' goods share one shipment if it is still loading). Ordering it:
- **your ship** sails in from the gulf (20 days, as the settlers' ship) and anchors off the jetty, beside where the settlers' ship would ride;
- **porters** (a new walker, `shipper`, drawn as a porter with his sack or jars) come from the nearest granary or storehouse that holds the good, by road to the trading post and onto the quay, one a day, up to four at a time, each with a load (what he takes leaves the store then, in the stock book as sent to the colony);
- the goods wait on the quay and a **rowing boat** takes them out while she is at anchor (also drawn now for the settlers' households: phase 5's finding);
- once she is at anchor with everything aboard she **sails** out of the bay and along the colony's lane on the map of Greece (a quarter quicker with its harbour, later in winter's storms), and lands; the want is met or the work begins.
- A blockade holds her as it holds the settlers' ship. With no trading post (or no berth), nothing can be sent, and the page says why. If the stores run short while loading, she waits and the page names what is missing.

**Governors.** When a colony lands, and when its governor dies or is dismissed, you choose from three candidates, each with a trait and what it does, on the colony's page. Until you choose (a month), the council holds it with no governor; then it picks the first. At a landing the first candidate is the head of the first household with slice 37's trait, so a colony nobody chooses for is governed as before. Traits:
- **a builder**: works cost a quarter less and go up in two thirds the time; +1% growth a year;
- **a miser**: its ships carry a tenth more; −1% growth; loyalty −3 ("he pinches its people");
- **a soldier**: raids fail more often (about 20 in 100 turned away by its own men, more behind walls);
- **a favourite of the people**: loyalty +8, +1% growth; dismissing him costs −15 instead of −5;
- slice 37's four stay: loyal (+10), steady (+5), proud (−10 once over 500), grasping (−10 with a heavy share).
A governor may die after eight years in office (about one month in twenty-four from then). Dismissing one costs loyalty (−5, fading over two years; −15 for a favourite).

**Readable depth.** The colony's page grows, in order: the picture and its stage (and how far to the next); talk of freedom and a threat (as now, the threat's odds now with walls and a soldier counted); its want, with the button and when it would land; what is loading at your quay; its governor (or the candidates); its works (built, building with its day, on its way, to fund with price and effect and why not, or opening at a later stage); then its loyalty, share, people, guards and homes, each with the new reasons named (the agora, the temple, a want met or ignored, the governor's trait, fields, a want's boost). The line under the top bar names a want (rank 2, as a threat) and a shipment loading (rank 1). The site's label on the map shows the red mark for a want too.

**The picture** (SVG, about 340 × 150, in the original look's colours): the island's hill over a blue sea. An outpost is tents, a cook fire and a boat drawn up on the beach; a settlement a few white houses with red roofs and a pen; a town a dozen houses up the slope; a city houses on terraces to the hilltop. Works: fields in green and gold strips below the town, a stone mole with a jetty and a second ship (the harbour), a colonnaded square (the agora), a temple on the hilltop, a wall with towers round the houses, and the second trade's mark (vine rows, a pale quarry cut, a cheese hut, an olive grove, sheep, horses in a paddock). A funded work is marked out in a dashed line until its goods land, then stands in scaffolding until built. **The map of Greece:** your colony's piece shows tents at an outpost, houses after, and the walls, the temple, the harbour's mole and the fields once built.

**Findings carried over.**
- *Shares generous in cheap goods:* retuned above.
- *Colonies draw threats:* walls and a soldier governor make them matter less.
- *No boat for the families rowed out:* a rowing boat shuttles between the quay and an anchored settlers' or shipment ship while anyone (or anything) waits on the quay.

## Tests

- **Stages:** a colony steps up at 150, 400 and 900, with the news; steps down only below four fifths after a raid.
- **The retune:** a colony of 400 at a fair share sends the amounts in the table (within rounding); a harbour adds a quarter.
- **Works:** funding pays the drachmas (ledger `colonies`, the invariant holds), porters take the goods from the stores into a shipment (the stock book says so), the ship sails and lands, the work is built after its time, and its effect shows (harbour: share and voyage; agora and temple: named loyalty; fields: growth; walls: a raid fails more often and takes less; second trade: two goods sent). Refusals: stage too low, already built or under way, too little money, goods not in the stores, no trading post.
- **Wants:** a want comes with its day; sent and landed in time it is met (memory and growth named); not sent it is ignored and remembered; late is late; none asked in winter; never for its own good.
- **Governors:** candidates at landing, chosen by command, or the council's after a month; dismissing offers new ones and costs loyalty; traits change the numbers named.
- **Shipping out:** the porters walk by road to the quay, the ship anchors, everything goes aboard, she sails; a blockade holds her.
- **Determinism** with a colony that has a want, a work and a shipment at sea; **save and load** round-trip with porters on the road and the ship at anchor; `fromSlice43` on a hand-built version 37 state; a version 27 save loads through every step.
- **Independence:** a town with no colony plays exactly as before (the demo comparison).
- The existing suite (slice 37's tests updated where the retune moves their numbers); `smoke.mjs` opens `#colonywants` and `#colonyworks`; `measure.mjs` adds them.

## Tasks

1. Plan (this file), with the baseline. Commit.
2. The simulation: `colonyworks.ts` (stages, the retune, works, wants, governors, cargoes and porters), the hooks in `colonies.ts`, the state and migration, the command and walker kinds, the saves' checks. Tests. Commit.
3. What Oliver sees: the page's new sections and the picture, the map's piece, the porters and the shipment ship in the city, the rowing boat, hovers and the line under the top bar. Commit.
4. The demos (`#colonywants`, `#colonyworks`), prepared towns, smoke and measure. Look and tune from screenshots. Commit.
5. Full checks (tests, build, the slow smoke, the measure side by side, every earlier demo compared, a version 37 save), *As built*, the check-in. Commit, push.

## As built

*(Filled in at the end of the slice.)*
