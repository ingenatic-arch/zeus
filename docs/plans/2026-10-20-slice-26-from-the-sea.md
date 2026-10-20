# Slice 26 — From the sea

*20 Oct 2026. Phase 4, "A city worth defending" (`docs/specs/2026-10-19-a-city-worth-defending-design.md`). The fourth slice of the phase. Builds on slice 25, "Walls, gates and towers", and its review; slice 27 (loans) is on the main line; slice 28 (debts unpaid) is being built alongside on its own line and will need triremes to carry a force by sea.*

## Goal and check-in

The spec's words: landings: enemy ships in the bay, beaching, raiders landing and sailing off with their loot. The shipyard, triremes and rowers; triremes meeting enemy ships in the bay. Pirates on the sea lanes; sending triremes to guard a lane on the map; sea fights there with a report.

Raiders from a sea city now come by sea. A few dark-sailed ships show on the horizon, cross the bay and run up on the open shore nearest what the band came for; the men land and march inland; the ships wait on the beach and take them off again with what they carried. A new shipyard on the shore (like the trading post) builds triremes for drachmas, crewed by rowers from the huts and cottages and paid monthly; each moors at the shipyard's jetty: long and low, a bronze ram, painted eyes, a row of oars each side and a square sail. When enemy ships are in the bay, your triremes row out to meet them, ram them, and you watch ships list and sink. A landing whose ships are sunk before they beach never lands; one that lands and loses its ships can't carry off what it took. Beyond the bay, pirates now and then take up a place on a sea lane, seen and named before they strike ("Pirates seen off Cape Skyllaion"), and seize your goods passing there: a gift, goods sent for a ruler, coin, a trader's cargo. A trireme sent to guard the lane keeps it safe, and a fight there is resolved on the map with a report.

**Oliver can:** watch Troy's ships beach and fight the landing in `#landing`; sink a landing fleet with triremes in `#triremes`; guard the lane to Athens from pirates in `#pirates`.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#landing`: `#companies`' town (two companies drilling at the barracks) with Troy's king turned against it (set up for the demo, and named so): his ships in the bay, a few days from the beach below the store they came for, paused, the hoplites' banner in hand, so both companies can be placed on the shore.
- `#triremes`: the same town with a shipyard on the shore and two triremes crewed and moored, Troy's ships just showing in the bay; the Army tab open on the fleet.
- `#pirates`: a town trading with Athens by sea, with a shipyard and a crewed trireme, as pirates are seen on the lane to Athens (set up for the demo, and named so); the map of Greece open on Athens.
- Every earlier token keeps working, each also with `-paused`.

## Not in this slice

Loans (slice 27, on the main line) and debts unpaid (slice 28, alongside): this slice only exposes what slice 28 needs to carry a force by sea. Enemy fleets of rivals' wars on the lanes, blockades of your harbour (the spec's "recorded for later"). Sound (later in the phase). Commanding ships one by one (out of scope for the phase: triremes guard the bay on their own).

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- Sim code (`src/sim/`, `src/map/`) stays pure and deterministic: the sea fights' dice are hashes of the seed, the tick and the ship, like the battle's, drawing on no generator; Greece's pirates use Greece's hashed dice by month. Money moves only through `pay` / `income` (the shipyard and triremes on the building line, rowers' pay on its own line).
- **Earlier towns are untouched where the sea isn't involved.** A town that never builds a shipyard and has no raid from the sea plays exactly as before. What changes on purpose: raids from Troy (and from Athens or Corinth when you trade with them only by sea) come by ship instead of at the east or north edge, and pirates may appear on the lanes you trade over. The demo probe (outside the repo) plays every earlier demo at the commit before this plan and after, and compares the whole city at opening and 900 ticks on; any that differ are named in the check-in.
- Old saves still load: the state version goes up by one (26; slice 28 may take it first, and whoever lands second renumbers). The migration adds an empty fleet, no pirates, and marks every raid as by land or by sea as it was.
- The renderer and UI only read sim state; every action is a command (`trireme` and `fleet` are new; the shipyard is built with `build`). Static build, `base: './'`, no runtime requests beyond the game's own files, all art generated in code.
- Judge by screenshots, tune by eye, never claim it looks or feels right on Oliver's behalf.

## Before

Measured at `b754f9a` (slice 25 with its review, the main line), headless Chromium with software WebGL at 1920 × 1080, while slice 28's builder works on the same machine: in **As built** (the measure takes the best part of an hour on a busy machine, so it runs alongside the building).

| What | Before |
|---|---|
| Tests | 408 in 35 files, all passing (slice 25's review) |
| Everything else | in As built |

## Design decisions

**Who comes by sea.** Troy always (it has no road to you). Athens and Corinth by sea when you trade with them by sea and not by land (they come the way their traders come); otherwise by the road, as now. Sparta by the road. The threat and the band's line say which: "Troy's raiders will come by sea, about 22 men in 3 ships".

**The landing** (`src/sim/fleet.ts`, with `raids.ts`). When a band by sea reaches the gulf's mouth (where a band by land reaches your edge), its ships show on the horizon: one ship for every eight men or so, two to four. What they make for is chosen as on land (the stores worth it, then the tax office; with neither, a field), and where they beach is the open shore (dry land beside sea water joined to the open sea) from which the walk to it is shortest, worked out with the raiders' own way-finding (walls and gates count as on land). Each ship has its own spot on that shore, a little apart, and sails its own way there over water (the fewest steps, pulled straight), far out at a ship's pace and across the bay more slowly, so the sails show about two weeks before they beach. When the last ship still afloat is on the beach, the band lands: its men (those aboard the ships that made it) form up on the shore and march inland as a band does, and the town line says where. Going home, their way ends at the beach: they wade out, the ships take them off, and sail away laden. A band beaten in the city runs for its ships, not an edge.

**Ships lost.** A ship sunk before it beaches takes its men down with it (they never land, and are counted apart from those who fall in the streets). All sunk: the raid is over, nobody landed ("Your triremes sank all three of Troy's ships in the bay"). Ships sunk on the beach while the band is ashore: when the band comes back to the shore and finds no ship, it drops what it carried on the beach (taken back into the stores and the treasury, as from the fallen) and flees overland to the nearest edge.

**The shipyard.** 3 × 3 on the shore, placed like the trading post (the same berth rule: deep water near enough for a jetty), 300 dr, 8 shipwrights from the labour pool. Several may be built. It builds one trireme at a time, for 400 dr paid when it is ordered, in 30 days (slower if short-staffed), and moors up to three at its jetty, side by side off its end. Drawn as a long shed over a slipway running down into the water, a trireme's ribs on the slip while one is building (keel, ribs, then planked), timber stacked, and its jetty.

**Triremes and rowers.** A trireme needs 12 rowers: like soldiers, one man a home, from huts and cottages (levels 2 and 3) that can spare one, four a day while it is short, the yard staffed. A rower leaves his job (his home counts one fewer who can work) and is paid 2 dr a month, on his own ledger line ("Rowers' pay"), after the soldiers. A home says "Their eldest, Dion, rows in the trireme Nike". A trireme sunk loses its hull; its rowers swim ashore and go home. Each trireme has a name (Nike, Glaukos, Paralos…), a hull (0 to 100, mended at its yard 3 a day while moored and the yard staffed), and an order: guard the bay (at home), or guard a sea lane (away).

**Fights in the bay.** While enemy ships are in your waters (sailing in, on the beach, or sailing off), every trireme at home with at least half its rowers and a sound hull (40 or more) rows out to the nearest of them (two may take one), at a pace a little quicker than theirs. Within a ship's length it rams every one and a half days or so: the dice say whether it strikes home (likelier the fuller its crew) and how hard (30 to 50 off the hull, more against a ship drawn up on the beach). An enemy ship strikes back (its men's spears and arrows, grappling) less often and less hard; on the beach only its few guards. A ship whose hull runs out lists and sinks over a few days, where it is. A trireme badly hurt (under 35) breaks off and rows home to mend. With no enemy left in the water, they row back to the jetty. A ship struck reels and throws up spray; oars break off a trireme that is rammed. Each sinking is a town line.

**Pirates** (Greece, `fleet.ts`). Once your city trades over a sea lane (a sea route to Athens, Corinth or Troy) and its first year of trade is past, each month there is about one chance in ten that pirates take up a place on one of the lanes you use (one band at a time across Greece; none for six months after the last): one to three ships, at that lane's place (off Cape Skyllaion on the lane to Athens, in the Saronic Gulf off Aegina on the lane to Corinth, off Kea on the lane to Troy). They are seen first ("Pirates seen off Kea, on the lane to Troy: 2 ships"), prey from about two weeks later, and sail off after four months. While they prey on an unguarded lane they seize what of yours passes their place: a gift or goods sent for a ruler (lost; what was sent for a request, tribute or the price of peace waits to be sent again, as when nothing could be fetched), coin sent by sea, and a trader coming to you (she comes in empty, with nothing to sell you this time). A loan's coin goes under a herald's staff, and they leave it be. Each seizure is a line of news.

**Guarding a lane.** From the Army tab's fleet (or the city's page on the map of Greece): "Guard the lane to Athens". The trireme sails out of the bay, along the lane on the map to that lane's place, and stays on station until called home. A lane with a trireme on station is safe: nothing is seized there. Pirates on a guarded lane (or a trireme coming on station where pirates are) bring a sea fight, resolved on the map the next day: your strength (each trireme on station: its hull share times its crew share, twice a pirate ship's) against theirs, the dice, and a report that says what happened ("The Nike met two pirate ships off Kea and sank both; her hull took 22"). Lost: the trireme comes home badly hurt (or is sunk, if her hull runs out), and the pirates stay. On the map, a trireme on station is a small galley in your colours, pirates a dark one.

**For slice 28** (expeditions by sea). `fleetFor(s, city)` says what can carry a force to a city: the triremes at home, crewed and sound, how many men they carry (one company of 16 each), and why not if none can. `sailFor(s, map, ids, city)` takes them off the bay's guard and out of the bay (order 'away', state on the map), `fleetHome(s, map, ids)` brings them back. Slice 28 positions the expedition on the map itself.

**Slice 25's findings folded in.**
- *The news when a band breaks* counts the men fallen over the whole fight: the "Your soldiers broke…" line is written when the band has left your land (or its ships have taken it off), with the count then.
- *The wall tool's tip* says "(40 dr each)" only for gates; a line with stretches and gates gives each its price.
- *Landing parties and walls*: a band from the sea finds its way inland with the same way-finding (walls and gates as a cost, hammering at what it must break), and goes back to its ships the same way.

**Drawing it** (`src/render/fleet.ts`). Triremes and enemy ships are a few meshes each (never more than a handful), built in code like the merchant ship: a trireme long and low, its hull in your city's colour band with a bronze ram at the waterline, painted eyes, a row of oars each side (four versions swapped as they row), a mast with the sail furled while rowing; an enemy ship shorter, dark-hulled, a dark sail with their city's colour in its stripe. Drawn between ticks; a ship struck rocks and throws spray; a sinking ship lists, settles and goes under over its last days. On the map of Greece: pirates and triremes on station as small ships. Hovering a trireme or an enemy ship says who she is, how strong, and what she is doing.

## Tests

- **Landings:** a band by sea from Troy sails in, beaches on the shore nearest its target, lands its men, plunders and goes back to its ships; the ships sail off laden; walls on the shore are hammered like any (`tests/fleet.test.ts`).
- **Ships lost:** all ships sunk before beaching: nobody lands and the raid is over; ships sunk while the band is ashore: the band drops its loot and leaves overland.
- **The shipyard:** a trireme ordered is paid for, built in about 30 days, crewed from huts and cottages (the rowers leave their jobs), paid monthly on its own line; mended at the yard.
- **Bay fights:** two crewed triremes sink an unescorted landing of two ships before it beaches; a trireme with no rowers stays moored.
- **Pirates:** pirates on an unguarded lane seize a gift by sea passing their place; a trireme on station keeps the same gift safe; a guard and pirates on one lane fight, and a report is written.
- **Determinism:** the same landing and fight twice come out the same; a save mid-landing round-trips and plays on identically.
- **Ledger:** the shipyard, triremes and rowers' pay keep the ledger invariant.
- **Migration:** a version 25 save (the walls' fixture from slice 25, or a slice 25 demo saved) loads and plays on with an empty fleet.
- **Slice 25's finding:** the "broke" news counts the men fallen as the band left.

Plus the existing suite and the demo probe. `smoke.mjs` opens `#landing`, `#triremes` and `#pirates` and checks the ships in the bay, the triremes rowing out, the pirates on the map and the guard order; `measure.mjs` adds them (a sea fight's frame cost).

## Tasks

1. Plan (this file), with the baseline measuring. Commit.
2. Sim: the fleet state and migration, the shipyard and triremes, rowers, landings in raids.ts, fights in the bay, pirates and guards, `fleetFor` for slice 28, the "broke" news; tests. Commit.
3. Render and UI: triremes and enemy ships, the shipyard, the map of Greece's pirates and guards, hovers, the Army tab's fleet and the shipyard panel, the shipyard in the build bar (the Military tab only, after the tower; B seven times), the wall tool's tip. Commit.
4. Demos `#landing`, `#triremes`, `#pirates`; look and tune by screenshots; smoke and measure. Commit.
5. Full checks, the demo probe, measurements, As built, the check-in. Commit, push.

## As built

*(Filled in when the slice is done.)*
