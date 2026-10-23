# Slice 37 — Colonies

*22 Oct 2026. Phase 5, "Ambitions, empire and a deeper city" (`docs/specs/2026-10-21-ambitions-empire-and-a-deeper-city-design.md`), wave 3, the Greece line (`claude/p5-greece`, built alongside the other lines' slices). Builds on the trunk with slices 30 to 34 merged (`3a63fad`, state version 32). It reuses slice 34's tribute and loyalty (`vassals.ts`, the `empire` field) and slice 33's seasons.*

## Goal and check-in

The spec's words: Oliver's choice, "Conquer, cow or buy; plus colonies". **Founding:** an empty site's page gets "Found a colony" with its price (drachmas, a few households of settlers, starting goods). The settlers are real families from your town: they pack, walk to the quay with their goods and board a ship that sails out across the map, and their homes stand empty behind them. **The colony** appears on the map as a small town that grows by itself over the years, in season; it has a name you can change and a governor with one trait; it makes its site's good and sends you the share you choose by ship, like a vassal's tribute; its loyalty has reasons (how much you take, whether you protect it, how long it has been yours). **Threats:** rivals can raid or claim a colony, telegraphed on the map; you answer with triremes or an expedition, or let it fall. A colony that grows large and is squeezed may declare itself free, with a warning first.

At the end of slice 34 your city can take its neighbours, but the six empty sites are only ever Greece's to fill. After this slice you can plant your own people on them: four households from the streets nearest the quay pack up, walk down to the jetty and sail for Thasos, and some years later timber comes into your storehouse off every ship from Nea Thasos. The city feels it both ways: the empty houses the settlers left, and the goods the colony sends.

**Oliver can:** open `#colony` and watch the families board the ship for Thasos at the quay, their homes standing empty behind them, then follow the ship out on the map of Greece; open `#colonies` and see two grown colonies (Nea Thasos and Nea Naxos) on the map, read their pages (size and why, share, loyalty with reasons, governor), and see their ships bring timber and marble into the storehouse; open `#ally` to see an ally's men come in by its road when you are raided (a finding of slice 34).

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#colony`: `#richtown`'s town with a trading post, a colony on Thasos ordered as a player would; played until the colony ship is at the jetty and the first families are aboard, the rest walking down to the quay. Opens at the quay.
- `#colonies`: a trading town (`#rivals`') that founds Nea Thasos and, once it has landed, Nea Naxos, played on some years with the shares set fair; opens on the map of Greece with Nea Thasos' page, a shipment on its way.
- `#ally`: `#collect`'s town with Corinth as its ally (set up for the demo, and named so), Sparta's band on its way: Corinth's men walking in by the road its caravans use.
- Every earlier token keeps working.

## Not in this slice

Laying out a colony's streets (recorded for later; colonies are run lightly). Colonies of your colonies. Rivals taking back a free colony. Blockades and wars at sea taking cargo (slice 38): a colony's ships can't be taken at sea here. Ambitions' colony milestones (wired at slice 39's merge).

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets; the spec's *parallel plan* binds file ownership.
- Sim code stays pure and deterministic. New dice are hashes of Greece's seed with salts of their own (`colonies.ts`), so Greece's generator and every older roll land as before.
- Money only through `pay` / `income` (a ledger line of its own, "colonies"); goods out of and into the stores through `setHeld`, noted in the stock book.
- **Earlier towns.** A town that founds no colony plays as before, except where this slice changes a rule on purpose: rivals found colonies less often (the finding of slice 31: sites run out), aid companies come in by the road their city's caravans use (finding of slice 34), and allied companies number themselves apart from yours. Each earlier demo is compared at opening against the baseline build (people, money, date); each that moved is named in the check-in with why.
- State version 33 on this line (`SIM_STATE_VERSION`), with `fromSlice37` in `migrate.ts` filling only this slice's fields if absent (renumbered at merge). A version 27 save loads through every step.
- Shared files: few edits, in blocks headed "Slice 37"; the new walker kind (`colonist`) appended at the end of `WALKER_KINDS`; the new command kind (`colony`) and ledger kind (`colonies`) appended; nothing reordered or reformatted. No new ware.
- The renderer and UI only read sim state. Static build, `base: './'`, all art in code. Judge by screenshots; never claim it looks or feels right on Oliver's behalf.

## Before

Measured at `3a63fad`, headless Chromium with software WebGL, on a machine shared with the other lines:

| What | Before |
|---|---|
| Tests | 513 in 43 files, all passing (299 s on the loaded machine) |
| Download (gzipped) | 3,716 KB: the game 743 KB, the prepared towns 2,974 KB (90 files, largest 45 KB) |
| Free sites (probe: Greece alone, 20 seeds) | year 5: 5.3 on average (2 at least); year 10: 4.1 (1 at least; 19 runs of 20 with two or more); year 15: 2.85; year 20: 1.4 (8 runs of 20 with two or more); year 30: 0.35. Founders: Rhodes 33, Knossos 23, Troy 14, Corinth 13, Athens 13, Sparta 12, Memphis 5 |
| Loads | measured side by side against this build at check-in, as slices 31 and 34 did |

## Design decisions

**State.** Slice 34's `empire` field grows two lists (types in the new `src/sim/colonies.ts`): `colonies` (each of your colonies: its site, name, governor, when it was founded, its share, its loyalty and memories, its next shipment, what it has sent, a call for freedom's warning and day, a threat and the triremes guarding it) and `foundings` (a colony on its way: the households, their walk, the ship, the voyage). The site itself is slice 31's record (`owner` 'home', `since`, `pop`); a site whose colony declared itself free keeps `free` (its name), and nobody founds there again. Shipments are slice 34's `Tribute` records with a `colony` field (city 'home': your colours), so they sail in, anchor, come ashore and walk to the store exactly as a sea vassal's do.

**Founding.**
- *Where:* any free site with nobody bound for it, from a new **site page** on the map of Greece (a click on a site opens it; it opened its holder's page before). A rival's colony's page says whose it is; your colony's page is the colony's.
- *The price:* 1,000 dr (ledger "Founding a colony"), four households, and 400 wheat from the granaries ("to see them through their first winter"). One founding at a time. It needs a trading post with a jetty (the quay they sail from: "build a trading post on the bay shore").
- *Who goes:* four households from huts, cottages and townhouses (not tents, fine houses or villas; not a home whose man serves in a company or whose thief is out), the nearest the trading post by road first. The page names them before you send ("the houses of Nikias, Lykos, Thrasyllos and Kallias, 41 people").
- *Their walk:* each household packs (two days), its home stands empty (its level kept, nobody in it, so newcomers can move in later), and it walks the roads to the trading post as a group with its bundles (a new walker, `colonist`, at a caravan's sending pace). A home's hover says who left it and for where.
- *The ship:* your ship (your colours) sails in from the gulf when the founding is ordered and ties up at the jetty. Families reaching the quay go aboard when she is in, and wait on the quay until then. Once all are aboard (or two months on, with whoever has come), she sails out. On the map of Greece she sails the site's own lane (new `SITE_LANES` in `greece.ts`, drawn while you have a voyage or colony there), at the Tyre ship's pace; a voyage that would end in winter is held back by the storms (`stormDelay`), and the page says so.
- *Landing:* the site is yours (`owner` 'home'), the colony record made: its name "Nea Thasos" (changeable on its page), its governor the head of the first household with one trait drawn by the dice (loyal, steady, proud or grasping), its people the settlers.

**The colony, run lightly.**
- *Growth, in season:* each month, newcomers from the islands (most while it is small: about 150 a year at first, none in winter) and its own children (3% a year), less a little for a heavy share and more for a light one, towards a ceiling of 2,000; a raid takes a share at once. Its page names each cause, as a rival's does.
- *What it makes:* its site's good (`SITE_WARES` in growth.ts), worth about 10 dr a person a year at the base price (timber: about 7 a person; marble: about 3). (Tuned at the look: at 3 dr, a grown colony sent a tenth of what one quarry cuts, too little to see in the stores.)
- *The share you take:* light (a fifth), fair (two fifths, the default) or heavy (three fifths), sent each season by ship like a sea vassal's tribute: in your bay, anchored, ashore at the trading post, donkeys to the store with room; with no trading post, onto the beach and straight in. The stock book has "From your colony on Thasos". The first ship sails a season after landing.
- *Loyalty* (0 to 100), moving half the way each month towards the sum of its reasons, each named with its weight: a base of 50; "its settlers are your own people" (+25, fading over twelve years: how long it has been yours); the share (light +15, fair 0, heavy −20: how much you take); protection (+15 for raiders driven off, +10 for striking their city, −25 for a colony sacked while you did nothing, each fading); your triremes (+3 each, at most +9; none at all −5); grown large (−1 for every hundred people over 600, at most −10); and the governor's trait (loyal +10, steady +5, proud −10 once it is over 500, grasping −10 while the share is heavy).
- *Free, with a warning first:* a colony of 500 people or more whose loyalty is under 30 at a month's turn talks of freedom: urgent news, a line under the top bar and a mark on the map, with its day a season on. Back to 40: it drops it. Still under 30 on the day: it declares itself free (no longer yours, its site marked free on the map, nobody founds there again). A smaller one grumbles but can't stand alone, and its page says so.

**Threats.**
- Once a month each colony may draw a threat (about one in forty a month) from a rival with ships that is cold or worse to you, or warlike and not warm, at peace, not your vassal or ally: a **raid** (most), or a **claim** if the colony is small (under 300 people) and the rival has three times its strength. Telegraphed: urgent news, a line under the top bar, its fleet drawn on the map sailing towards the site in its colours, a red mark on the site's label, and the day it arrives, about 60 days on.
- *Answers on the colony's page:* **send triremes** (every fit trireme at home, or as many as you choose: they row out and sail the colony's lane, drawn on the map; at the day, if they are there, a fight: about 7 in 10 with as many ships as theirs, 9 in 10 with twice as many, the odds shown before you send); **strike at its city** (a full force against the rival, slice 28's expedition: while it is out, or if it won since the threat, the threat is called off, "its men are needed at home"); or **let it fall**.
- *If it lands:* a raid takes 15% of the colony's people and its next shipment, and the colony remembers (−25); a claim takes the colony: the site is the rival's, a grudge with its ruler (−15), and the news says so. Guarding triremes come home once a threat is over.

**The town.** The households leaving and their empty homes are the city's side of founding; ships coming in and donkeys bringing timber are its side of holding. The line under the top bar names what needs you, in turn: a colony talking of freedom, a threat to a colony, families walking to the quay, a colony's ship coming in.

**Findings carried over.**
- *Sites run out* (slice 31): rivals' colonising is made rarer, with a longer gap between a city's colonies (numbers tuned by the probe, in *As built*), so a player who wants a colony in the first decade usually has two or three to choose from. This moves Greece's history on purpose in towns more than two years old; the check-in names the demos that moved.
- *Long walks in #collect's town* (slice 34): colonists walk at the caravans' sending pace, and the households nearest the quay go first, so the walk to the quay is days, not weeks. The force sent west from `#collect` and the tribute donkeys are looked at again (*As built* says what was done).
- *Aid comes in by the wrong edge* (slice 34): an ally's or vassal's company comes in at the road edge its city's caravans use (`caravanEntry`), and walks the road in.
- *A weak test:* the aid test checks that the company arrives, unconditionally, and by the caravans' edge.
- *No #ally demo, allied men take your company numbers:* `#ally` (above); an allied company is numbered among its own city's companies, so a company you raise doesn't skip a number.
- *Rival vassals still mostly Argos to Sparta:* Oliver's call; left alone.

## Tests

- **Founding:** the four households named on the page are the ones who leave; their homes stand empty; they reach the quay by road and board; the ship sails, crosses the map and lands; the site is yours. The ledger invariant holds with the founding's cost; the wheat leaves the granaries and the stock book says so.
- **Refusals:** no trading post, a site taken or with settlers bound, too little money or wheat, too few households, a founding under way.
- **The colony:** it grows (and named causes), sends its share by ship into a store (stock book line); a heavier share lowers loyalty and every reason is named; years under you loosen its ties.
- **Freedom is warned first:** a large, squeezed colony warns a season ahead, stands down when loyalty mends, goes free on the day if not; a small one never does.
- **Threats:** a raid answered with enough triremes is driven off (the dice over many seeds land near the odds shown); an expedition against the raider calls it off; an unanswered raid takes people; a claim takes the colony.
- **Determinism** with a colony founded; **save and load** with a colony at sea and families on the quay; `fromSlice37` on a hand-built older state; a version 27 save loads through every step.
- **Greece:** over 20 seeds, two or more free sites at year 10 in nearly every run (the probe's figures pinned loosely); a rival colony still happens in a long run.
- **Aid** arrives (unconditionally) by its city's caravan edge; allied companies don't take your numbers.
- The existing suite; `smoke.mjs` opens the new demos; `measure.mjs` adds them.

## Tasks

1. Plan (this file), with the baseline measured. Commit.
2. The simulation: `colonies.ts` (founding, the walk, the ship, the voyage, landing, growth, shipments, loyalty, freedom, threats and answers), the site lanes, the state and migration, the command, the walker kind; the findings' sim parts (rival colonising, aid's edge, allied numbering). Tests. Commit.
3. What Oliver sees: the site page and the colony page, the map (lanes, the ship, shipments, threats, guards, labels), the colonists in the streets, empty homes' hovers, town lines, the ledger and stock book words. Commit.
4. The demos (`#colony`, `#colonies`, `#ally`), prepared towns, smoke and measure. Look and tune from screenshots. Commit.
5. Full checks (tests, build, smoke, measure side by side, earlier demos compared, a version 27 save), *As built*, the check-in. Commit, push.

## As built

*Commits on `claude/p5-greece`: `62d5516` (plan), `11cc854` (sim and tests), `16039b7` (the pages, the map, the city, the demos), `e848202` (looked at and tuned), `0420bca` (fix: a rival colony's button shared the route buttons' attribute, found by the smoke), then the check-in.*

**As planned**, with these differences:

- **The ship anchors, the families are rowed out.** The plan had your ship tie up at the jetty. The jetty's schedule only knows the Tyre ship and the routes' visitors, and holding it for the weeks the families take to come down would turn them away. So she anchors six tiles back from the jetty and to one side where the water is deep (the other side from where a trader waiting for the jetty anchors first), and a household is rowed out to her a day after it reaches the quay (no boat drawn). She sails once all are aboard, or 60 days after the founding with whoever came; nobody aboard, she sails off empty and the site is free again.
- **What a colony makes:** 10 dr a person a year at the ship's prices (the plan's 3, raised at the look: two years on, a season's ship brought 50 timber or 20 marble, a tenth of what a camp or a quarry gives). A colony of about 270 people at a fair share now sends about 150 timber, or 90 marble, a season.
- **Rivals' colonies:** `COLONY_GAP` in growth.ts is 10 years (was 6). The probe (Greece alone, 20 seeds): year 10 unchanged (4.1 free sites on average, 19 runs of 20 with two or more); year 15, 3.4 on average (was 2.85; 19 runs with two or more); year 20, 1.85 (was 1.4; 12 runs with two or more, was 8); year 30, 0.55 (was 0.35). Only a city's second colony moves, after about year 8.
- **The long walks** (slice 34's finding): colonists walk at `SENDING_SPEED` (0.24 tiles a tick, twice a townsman's) and the households nearest the trading post by road go first; in `#colony`'s town the last of them reaches the quay about three weeks after the founding, as the ship anchors. The full force's march out of `#collect`'s town and the tribute donkeys' walk in are left as they were (the size of that land; noted in the check-in).
- **Aid's edge** is the caravans' (`caravanEntry`) for the walk in, and now for the news when it is sent and the line under the top bar too (they named its road's side, which in `#collect`'s town, with no north road, was not where the men came in).
- **The threat's fleet on the map** sails a straight line from its city towards the site (there is no way between a rival and a site), stopping short of both. It can cross land. *(Review: now by sea, `seaWayTo` in greece.ts: out along one of the city's own lanes as far as the point nearest the site's lane, across, and along it; straight only for a city with no lane, and none of those has ships.)*
- **A site's page** is a page of its own (`site:thasos`), opened by a click on the site, a site's news line, the settlers' ship, a colony's share ship, a threat's fleet, a guarding trireme and the colony's line under the top bar. A rival's colony's page has a button to its city's page.
- **`#colonies`** is `#colony`'s town (`#richtown`'s) rather than `#rivals'`: in both, by the time the town could pay for a second founding Rhodes' settlers were on Naxos. So `#colonies` sends its first settlers to Naxos, and to Thasos once they have landed, then plays on until Nea Thasos is two years old.
- **Not built:** a hover for a colony's share ship in your bay (a vassal's tribute ship has none either); colonies' ships taken at sea (slice 38).

**Numbers** (all in `colonies.ts`): founding 1,000 dr, 400 wheat, four households packing two days (six ticks apart), the ship waiting 60 days at most; growth 150 newcomers a year times the room left under 2,000 (none in winter), children 3%, share +2% / 0 / −3% a year; shares a fifth, two fifths, three fifths; loyalty as in the plan; freedom from 500 people under 30, standing down at 40, 90 days' warning; threats one colony-month in forty from its sixth month, a year apart, none told in winter, arriving in 60 days, 2 to 5 ships of 15 men, a claim under 300 people when their men are three times its own (one in eight of its people); fight odds 0.35 + 0.35 × ours / theirs, at most 0.9; memories +15 (driven off), +10 (struck for), −25 (sacked while you did nothing), −10 (raided though your triremes fought); a raid takes 15% of its people and its next shipment; a claim leaves its ruler expecting your resentment (−15).

**Touched outside the line** (each edit in a block headed "Slice 37"; nothing reordered):

- `src/sim/state.ts`: `SIM_STATE_VERSION` 33; the walker kind `colonist` and the ledger kind `colonies` appended; `Site.free`.
- `src/sim/migrate.ts`: `fromSlice37` and its hook and note.
- `src/sim/commands.ts`: the `colony` command. `src/sim/sim.ts`: `stepColonies` after the empire's step, the command, the colonists' walk.
- `src/sim/walk.ts`: colonists at the sending pace. `src/sim/army.ts`: your companies' numbers ignore allied companies.
- `src/sim/fleet.ts` (works and sea line): a trireme can be sent along a colony's lane (`guardColony`), stationed off its end, and its hover says so.
- `src/sim/stocks.ts`, `src/ui/ledger.ts`: the stock book's and the ledger's words.
- `src/sim/status.ts`: the colonists' and empty homes' hovers, the colony's line under the top bar (one empire line at a time: the colony's when it is urgent and the empire's is not, or when there is no other). *(Review: chosen by rank now, see the review note.)*
- `src/game/saves.ts`: the new fields checked on load.
- `src/render/walkers.ts`: colonists drawn as a family with bundles, hoverable. `src/render/city.ts`: your settlers' ship and colonies' share ships (one view a colony). `src/main.ts`: the settlers' ship's hover.
- `src/game/demos.ts`, `src/game/views.ts`: `#colony`, `#colonies`, `#ally` and two views. `src/ui/style.css`: the site page's few styles.
- `scripts/smoke.mjs`, `scripts/measure.mjs`: the new demos.
- *(Review)* `src/ui/household.ts` (city line): an empty home's panel names the household that left it for a colony (two lines, in the `!f` branch). `src/ui/ledger.ts`: the founding's line under Going out. `src/ui/empire.ts` and `src/ui/greece.ts` (this line's): a tribute ship's day in your bay counts her sail in from the horizon. `src/sim/vassals.ts`: `empireTownLine` gives a rank, for `status.ts` to choose between it and the colony's line.

**Checks at check-in:** the full `npm test`: 526 tests in 44 files, all passing (817 s on the loaded machine). `npm run build`: clean. Every one of the 121 earlier prepared demos opens with the same date, people, money and homes as at `3a63fad`. A version 27 save loads through every step (`tests/colonies.test.ts`, `tests/vassals.test.ts`). The slow smoke: the first full run found one real fault (opening a road on a city's page also opened a page called after the road and stopped the page redrawing, because the rival colony's button shared the route buttons' `data-open`; fixed in `0420bca`, with a smoke step for the rival colony's button), and the failure's long waits ran it out of time at `#hostile`. Every step before it passed. **The full smoke after the fix was started but stopped unfinished at hand-back: it still needs one full run.** The fix was checked by hand from the build: `#routes` opens its road with no page error, and a rival colony's button opens its city. Loads were measured side by side against `3a63fad`, two rounds, with the smoke running at the same time (see the check-in).

**Review** (the commit "Fixes from reviewing slice 37"): one landing day for every line (`landsAbout` in colonies.ts: the news, the site's page and card, the line under the top bar; the page had drifted by two weeks while she sailed out of the bay, and the card said she was coming to the quay); every ship's day in your bay counts `SAIL_IN` (colony shipments, vassals' sea tribute, the tribute card: 20 days early before); the guard odds leave out triremes that arrive after the threat ("too late to fight"); the threat fleet by sea (`seaWayTo`); the founding under Going out in the ledger; the empty home's panel names who left; the line under the top bar chosen by rank (`rank` on `colonyTownLine` and `empireTownLine`: freedom 3, arming 3, a threat, a call or aid 2, settlers 1, tribute and shipments 0; ties to the empire's line), so talk of freedom is never hidden behind a tribute line; the grasping governor's reason no longer repeats the share; `#colony` opens paused as the ship anchors (it had stopped two game seconds before she sailed), and the smoke's two patterns follow. Checked: typecheck and build clean; the full `npm test` 525 of 526 (the one, hazards' fire save with its own 30 s limit, timed out on the loaded machine and passed alone in 23 s); every earlier prepared demo identical, `#colony` four days earlier; a version 27 save loads; the full slow smoke passed end to end on the final build (a run before it, under load 25, timed out at `#hostile`'s wait for the road's reopening line, which stands only five game days and a slow frame at fast speed can step past; the builder's run stopped there too; the step is an earlier slice's, left as it is); long runs at a heavy share (a grasping governor's colony free in year 4; one sacked unguarded in year 6 and free after, both warned a season ahead).
