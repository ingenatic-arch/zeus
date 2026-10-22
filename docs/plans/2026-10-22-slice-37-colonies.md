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

(Filled in at the end.)
