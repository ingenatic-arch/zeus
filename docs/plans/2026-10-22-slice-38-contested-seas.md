# Slice 38 — Contested seas

*22 Oct 2026. Phase 5, "Ambitions, empire and a deeper city" (`docs/specs/2026-10-21-ambitions-empire-and-a-deeper-city-design.md`). The works and sea line's third slice (wave 3), built at the same time as slice 36 (the great houses, city line), slice 37 (colonies, Greece line) and slice 39 (ambitions, trunk), on branch `claude/p5-works`. It starts at `3c9eb51`, the trunk with slices 30 to 35 merged.*

## Goal and check-in

The spec's words: blockades of your harbour, telegraphed; enemy fleets in wars taking cargo; pirates meeting expeditions at sea; broken oars and repairs; the shipyard panel. Leftovers: landings from the ship nearest the target; quicker collectors by sea; the merchant ship's pace.

The sea stops being a place only pirates trouble. A city at war with you can send its fleet to sit across the mouth of your harbour: it is seen putting to sea (a line in the News of Greece, its galleys on its lane on the map), its sails show on your horizon days before it takes station, and while it holds, no ship comes or goes: the Tyrian ship waits out at sea or at the quay, your sea routes' traders stay away, and a vassal's tribute ship waits off the gulf. Your triremes row out to break it, ram and are rammed, and come home with broken oars, limping, to be mended at the shipyard. In wars between rivals, and in yours, warships take station on that city's lane and seize what of yours passes there, as pirates do. Expeditions that sail meet the pirates and warships on their lane, and their triremes fight them. The shipyard gets a panel of its own: build a trireme, her crew, her hull and her oars, repairs and how long they take, and what every ship is doing.

**Oliver can:** open `#blockade` to see Troy's fleet across the harbour mouth, the Tyrian ship held at the quay, and his triremes rowing out to break it; open `#shipyard` for the new panel, with a trireme home from a fight, her oars broken, under repair.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#blockade`: `#triremes`' town (the shipyard by the river mouth, three triremes crewed at its jetty, the trading post and the Tyrian ship) with Troy's king turned against it (set up for the demo, and named so): Troy's fleet of three has just taken station across the harbour mouth, the Tyrian ship is held, and the triremes are rowing out to it. A few days of play and the fight is on.
- `#shipyard`: the same town after the fight, a trireme back at her mooring with her hull holed and oars broken, under repair, the shipyard's panel open.
- Every earlier token keeps working, each also with `-paused`.

## Not in this slice

The ambitions (slice 39). Colonies and their lanes (slice 37, alongside): every sea lane has a place for pirates and warships, worked out from the lane itself where no place is named, so the colonies' lanes are covered when they merge. Sea battles commanded ship by ship (out of scope for the phase). Your own fleet blockading or raiding a rival (a later phase: the vision's "triremes ... blockade and raid rivals"). Gifts by sea held by a blockade (they sail out past it as before; a known rough edge if Oliver wants them held too). Seizing a vassal's tribute at sea.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets; the phase spec's *parallel plan* binds this line: the state version is 34 here (renumbered at merge), with `fromSlice38` in `migrate.ts` filling in only this slice's fields, hooked in by one `if (st.version === 33)` line, its sentence in the notes as "Slice 38 (Contested seas): ..."; no new building, walker or round kind, and no new ware; edits to the shared files kept few and in blocks headed "Slice 38".
- The sea parts of other lines' files are touched only where they must be, each in a block headed "Slice 38", and listed under **Touched outside the line**: `raids.ts` (the landing beach), `routes.ts` (a sea route's ship and the blockade), `vassals.ts` (tribute by sea and the blockade), `expeditions.ts` (none, if the fights can be read from outside), the map of Greece's drawing and pages.
- Sim code stays pure and deterministic. What is random is a hash of Greece's seed (blockades, warships) or the city's (fights in the bay), as before. Money only through the treasury.
- **Earlier towns.** Blockades and warships come only while a town is played (as pirates do: none while a demo's history is built with fire and wear off), so no demo's history changes for them. Three carried-over findings change some histories on purpose, named in the check-in with how much: enemy ships cross the bay at a pace that brings them to the beach in about a fortnight (`#landing`, `#triremes`, `#creditors`, `#fortress` if their raid is at sea), triremes mend faster and stay in until whole, and the merchant ship crosses the bay faster (her times of arrival and departure are unchanged: only where she is drawn). The demo probe (outside the repo) compares every earlier demo at opening and 900 ticks on with the starting commit.
- Old saves load: a version 33 save (and the phase 4 fixture through every step) goes through `fromSlice38`: no blockades, every trireme's oars whole, no ship under repair.
- The renderer and UI only read sim state; every action is a command (`fleet` gains a `repair` act; nothing else new). Static build, `base: './'`, all art in code.
- Judge by screenshots, tune by eye, never claim it looks or feels right on Oliver's behalf.

## Before

Measured at `3c9eb51`, headless Chromium with software WebGL at 1920 × 1080, with the other three lines building on the same machine (load 20 to 27 on 4 cores); the loads and frame work are measured again side by side with this slice's build at check-in, since a lone figure on this machine means little:

| What | Before |
|---|---|
| Tests | 519 (counted at `3c9eb51`) |
| Download (gzipped) | 3,869 KB: the game 766 KB, the prepared towns 3,103 KB (93 files, largest 45 KB) |
| First load (bare link) | ready at 4.5 s, first frame 5.7 s (one run, by the page's clock) |
| Demo loads | `#town` ready at 4.3 s, `#richtown` 4.1 s, `#quay` 4.4 s (by the page's clock) |
| Frame work (update before drawing) | measured side by side at check-in |

## Design decisions

**A war with you** (`src/sim/blockades.ts`, new). Greece has no single "at war with you" flag, so this slice reads one from what the other lines keep, each with its reason in words: a ruler whose threat ran out and whose band is out against you (raids.ts: gathering, marching or in your land; a lender's army too); a city your expedition has gone against, while it is out and for six months after it fought (unless the city is now your vassal or ally); the foe in an ally's war you joined (slice 34), while that war lasts; a vassal that rose against you, for a year after. A demo can stage one (named so). Each blockade keeps the war it came for, and ends with it.

**Blockades.**
- *Who and when.* On the first of the month, a city at war with you with a sea lane to you and a fleet of 6 or more (Athens, Corinth, Troy, Knossos, Rhodes, Memphis as they stand) may send its fleet against your harbour, one month in three, if you have a trading post (a harbour to close). One blockade at a time; none from that city for a year after its last, none from anyone for four months. It comes with 2 to 4 ships (a quarter of its fleet).
- *Telegraphed.* It puts to sea at once (urgent News of Greece: "Troy's fleet has put to sea to blockade your harbour: 3 ships, off your harbour in about 19 days. While they hold its mouth no ship comes or goes..."), sails its lane on the map of Greece at a war fleet's pace (its galleys in its colours), and its sails show on your horizon about three days before it takes station. At least ten days' warning in all.
- *Holding.* Its ships take station across the harbour mouth: on the trading post's way in, where the bay opens to the sea, a little apart across it. While they hold, the harbour is closed: the Tyrian ship due does not set sail (she waits at sea, and her chip says why), one sailing in turns back, one at the quay finishes loading and waits there; a sea route's ship likewise (her route's line says so); a vassal's tribute by sea waits off the gulf, and its ship at anchor waits. When the blockade ends, the ship due sails in at once and those waiting sail.
- *Ending.* Your triremes break it: they row out to its ships as to any enemy ship in your waters, and once half its ships (rounded up) are sunk the rest flee. The city remembers it (a grudge, fading over a year), its fleet is smaller by the ships sunk (a reason in its page's growth), and the News says so. It is lifted when its war ends (the band settled, the expedition's six months over, the ally's war done), after three months at most (supplies run short), or when winter's storms drive it home (at the turn of winter, two times in three: the seasons' `armiesHome`). A blockade that would arrive in winter waits, two times in three, as an army does; its ships in the bay sail at the season's `seaPace`.
- *The Lighthouse.* Blockades are war, not piracy: its fire does not keep a war fleet off. It keeps pirates clear as before.

**Wars at sea take cargo.** While a rival war is on between two cities (slice 21), each side with a fleet of 4 or more puts warships on the other's lane from your city, if you have a sea route to it: seen first (a News line, a galley in its colours on the map), seizing from ten days on what of yours passes their place (your gifts and goods sent to that city, its traders' cargo to you), gone when the war ends. Your wars likewise: a city at war with you puts its warships on its own lane. They are pirates in all but name: the same places, the same seizing, the same lane fights with your guards (a warship counts half again a pirate ship), and their own words ("Troy's warships off Kea"). One to three ships (a sixth of the fleet). The Lighthouse doesn't keep them off.

**Pirates on every lane.** Places on the newcomers' lanes: off Melos (Knossos), off Thera (Rhodes), off Cape Sidero (Memphis). A lane with no place named (the colonies', when they merge) has one worked out from the lane itself: its middle, "on the lane to Thasos". Every lane you trade over can now be guarded.

**Expeditions meet pirates.** An expedition at sea (out or home) passing the place of pirates or warships on its lane fights them there: its triremes and its men aboard (a company counts as much as a trireme) against their ships, resolved from the strengths and the world's dice, with a report in the army's and Greece's news. Won, the pirates are sunk; lost, they hold the lane. Either way the triremes take hull and oars (never sunk: they keep with the fleet carrying your men) and come home to be mended. It changes nothing in the expedition's own record.

**Oars, wounds and repairs.**
- Each trireme has her oars (0 to 100, the share whole). An enemy's blow that strikes home breaks 10 to 25 of them besides her hull; ramming breaks a few of her own one time in four; a lane fight breaks 15 to 40.
- A trireme with oars broken rows slower, down to a third of her pace with none whole: she limps. With her hull under 35 or under 40 oars she breaks off and limps home.
- Home, she is under repair: she stays at her mooring until hull and oars are whole, and doesn't row out at a ship in the bay while she is (the review of slice 26's two-week mend-to-60-and-out loop). At a fully staffed yard the shipwrights mend 6 of her hull and 12 of her oars a day (a share with fewer), so a badly beaten trireme is whole in about ten days, then goes out at full strength.
- A trireme goes out (to the bay's fights, a lane, an expedition) only with half her rowers, her hull at 60 and her oars at 60, and not under repair. The player can call one in for repair from the panel (the `repair` act).
- Drawn: her oars with gaps where they broke (four versions by how many), a slight list while she limps.

**The shipyard panel** (`src/ui/shipyard.ts`, new; a floating panel like the trading post's). Opened by clicking a shipyard or a trireme (the Army tab's fleet keeps its summary, with a button to open it). For each yard: its shipwrights, Build a trireme (price, and why not), the moorings used, the rowers' warning. For each trireme: what she is doing, her hull and her oars (bars), her rowers and why short, her pay, under repair and how many days until whole at this yard's pace, and her orders (guard a lane, bring her home, call her in for repair). Below: the harbour (a blockade coming or holding, what it stops, how to break it), the lanes (pirates and warships), and the last sea fights' reports.

**Findings carried over.**
- *The landing beach.* A band from the sea always lands from the beach the "Sails!" line names (its first ship's), or the nearest of its ships to it if that one is sunk; the other ships draw up within four tiles of it (was ten). While the ships sail in, a marker stands on that beach (a pole with a red pennant), so the companies can be planted there in advance.
- *Collectors and raiders by sea.* Ships set off from the horizon a day apart (was two and a half), and cross your waters at the pace that brings the last to the beach within about a fortnight of the first sail (never slower than now). The "Sails!" line's days follow.
- *The merchant ship's way in.* She crosses the bay twice as fast (a tile a tick, not half), so she is in sight about 7 seconds, not 14; she still ties up on the day she is due (the time from the horizon stays 20 days, more of it beyond the edge). The same for foreign ships.
- *Slice 26's review:* a laden enemy ship sunk as she sails off: her share of the loot is hauled out of the shallows and goes back to the stores and the treasury (as when a band finds its ships sunk), and the news says so. The beaten trireme's loop: repairs (above). Two triremes on one ship take opposite sides of her, so they and their oars no longer draw into each other; moored triremes lie far enough apart that their oars don't overlap. A trireme rowing home in the bay no longer offers the lanes' buttons anywhere (refused with a reason, as on the Army tab).
- *Slice 35's review:* the marble on the quay sits clear of the logs.

## Tests

- **Blockades** (`tests/seas.test.ts`): a staged war sends a fleet that is seen first, sails in and holds; the harbour is closed (the Tyrian ship held out, then held at the quay; a sea route's ship held out; tribute by sea waiting) and opens when it ends; triremes break it (half sunk, the rest flee, a memory, a smaller fleet); it lifts when its war ends; none without a trading post, a lane or a fleet; winter holds one back.
- **Warships:** a rival war puts warships on the lane to the other side, which seize a gift sent there and leave when the war ends; a guard fights them.
- **Expeditions:** an expedition by sea meets pirates on its lane and fights them, with a report; its triremes come home hurt.
- **Oars:** a struck trireme loses oars and rows slower; crippled, she breaks off, comes home, stays in until whole, mended at the yard's rate.
- **Findings:** the band lands from the named beach; a laden ship sunk gives back her share of the loot with the ledger balancing; collectors by sea beach within about a fortnight of their sails; every sea lane has a place.
- **Save and load:** a save mid-blockade round-trips and plays on identically; a version 33 save loads through `fromSlice38` (the test builds the old state by hand); the phase 4 fixture through every step.
- The existing suite. `smoke.mjs` opens `#blockade` and `#shipyard` and checks what they open on; `measure.mjs` adds them.

## Tasks

1. Plan (this file), with the baseline measured. Commit.
2. Sim: wars with you, blockades and their effects, warships on lanes, places on every lane, expeditions meeting pirates, oars and repairs, the findings (landing beach, pace, laden ships, guard refusals), migration and saves; tests. Commit.
3. Render and UI: blockading ships in the bay and on the map, warships on the map, broken oars and limping, the landing marker, the shipyard panel, the ship's chip and the routes' lines, the quay's marble. Commit.
4. Demos `#blockade` and `#shipyard`; look and tune by screenshots; smoke and measure. Commit.
5. Full checks, the demo probe, measurements, As built, the check-in. Commit, push.

## As built

(Filled in at the end of the slice.)
