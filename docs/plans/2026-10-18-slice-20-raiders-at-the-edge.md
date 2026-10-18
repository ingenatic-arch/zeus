# Slice 20 — Raiders at the edge

*18 Oct 2026. Phase 3, "Greece beyond the walls" (`docs/specs/2026-10-17-greece-beyond-the-walls-design.md`). The sixth slice of the phase. Builds on slice 19, "Favours, offers and tribute", and its review.*

## Goal and check-in

The spec's words: threats with a deadline and a price of peace; the war band on the map; the countdown chip and horn. Raiders on the city map: in at the right edge, over the land to a target, looting or burning, and away; people running indoors. Paying them off late; the anger spent afterwards; the costs in the ledger.

Until now a refused tribute was only marked. This slice gives it teeth, telegraphed in three steps: a threat with a deadline and the price of peace (coin, or goods); if nothing comes, a war band gathers at their city and marches on yours along the road (or the lane) on the map of Greece, with a chip under the top bar counting the days; then a horn, and eight to twelve raiders in their city's colours, with shields and torches, come in at the edge of your map nearest their city and cross the land to the nearest field or store near that edge. They set fields alight (through the phase 2 fire, which the watchmen fight and which can spread) and plunder stores, carrying off what they take, then walk off the way they came. People near them run indoors. Paying what was asked, or a gift that lifts the ruler's mood past cold, turns the band back wherever it is, even in your streets. Afterwards the ruler's anger is partly spent, a lull follows, and the ledger and the rubble show what it cost.

**Oliver can:** refuse a demand in `#threat` and watch it play out to a raid on a farm, pay off a band in `#raid` and see it turn back on the map, and clear up after a raid.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#threat`: `#caravan`'s town a year on. King Eurykrates of Sparta, already cold after a first refused tribute, demanded tribute again and was refused: he threatens the city. The map opens on his Ruler tab with the threat at the top: what it would cost to stop it (coin, or goods), by when, and what follows if nothing comes. Let it run (or click Refuse) and watch the band gather at Sparta and march; the horn, the raiders in at the west edge, a farm set alight, the watchmen, and the band walking off.
- `#raid`: the same threat let run out: the band is on the road from Sparta, days from your west edge, the chip counting down, the map open on Sparta's page. Pay what he asked and watch the band turn round on the map.
- `#raiders`: the band in your city, at a farm near the west edge with torches: the farm alight, people indoors, the watchmen coming. Pay them off now and they turn back with what they have.
- `#aftermath`: some weeks after the raid: the burnt farm's rubble, the ledger open on the raid's lines, and on Sparta's page "their raid has eased the king's temper".
- Every earlier token keeps working, each also with `-paused`. The 78 earlier demos open and play 900 ticks on exactly as before; `#tribute`'s refusal still only turns the king cold (he was wary), and the page says a threat would follow the next refusal.

## Not in this slice

Fighting raiders (walls and soldiers come with the war phase), wars between rivals and their armies on the map (21), festivals (21), the News of Greece list (21). Raids from the sea landing on your shore (Troy's band sails the lane and lands beyond the eastern hills, walking in from the east edge).

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- Sim code (`src/sim/`, `src/map/`) stays pure and deterministic. Everything random (a hostile ruler's threat, the band's size) is a hash of Greece's seed and the month or the raid's number, never `world.rng`, so Greece's harvests stay as they were.
- Money moves only through `pay` / `income`: a new ledger line "Peace · Sparta" for coin paid to call a band off, and a count line "Raided · Sparta" (what was carried off) beside fire and collapse; goods taken go through the stock book as lost ("Carried off by Sparta's raiders").
- **Earlier towns are untouched.** Threats come only from a tribute refused by a ruler who was already cold, or from a hostile proud or warlike ruler, and only after the first route; none of the earlier demos has either. Proved by the demo probe outside the repo.
- Old saves still load: a version 19 save opens in version 20 with no raids, and a tribute already marked angry gets its threat on the next month's turn.
- The renderer and UI only read sim state; every action is a command. Static build, `base: './'`, no runtime network requests, all art generated in code.
- Judge by screenshots, tune by eye, never claim it looks or feels right on Oliver's behalf.

## Before

Measured at `ba7bc00` (the end of slice 19's review), headless Chromium with software WebGL at 1920 × 1080:

| | Before |
|---|---|
| Tests | 308 in 26 files, all passing |
| Bundle | 4 files, 1,376 KB raw, 407 KB gzipped |
| Load, bare link (page clock) | ready 1,442 ms, first frame 1,816 ms |
| `#town` | 799,168 triangles, 83 draw calls, save 142 KB; ready 2,125 ms |
| `#richtown` | 910,707 triangles, 95 draw calls, save 179 KB; ready 2,750 ms |
| Work a frame, running | `#town` 7.11 ms running (1.09 paused), `#richtown` 10.85 ms, `#caravan` 2.76 ms, `#tribute` 3.56 ms, `#hostile` 4.79 ms, `#blaze` 6.33 ms |
| Map pages | `#tribute` 304,018 triangles / 20 calls (ready 3,201 ms), `#hostile` 304,642 / 22 (3,141 ms), `#request` 304,018 / 20 (2,992 ms); the map's first open built in 227 ms |
| The 78 demos | each one's opening and a hash of its whole city state at opening and 900 ticks on, recorded outside the repo |

## Design decisions

**The threat** (a deal of kind `threat`, `src/sim/raids.ts`). It comes:
- from `angered()`: a tribute refused (or let run out) by a ruler who was already cold threatens at once, whatever else is open (it follows from your answer);
- or, on the first of a month, from a hostile proud or warlike ruler (about one month in six), once your first route is six months old.
- Never while another threat or band is live, and never from a ruler within a year of their last raid or of being paid off (the lull). A tribute marked angry while another threat runs gets its threat when that one is settled (within a year).

The price of peace is coin (about a fair gift and a fifth for your size: 300 to 2,500 dr) or, where your city could send them goods, a good they are short of worth the same. The deadline is two months, longer if goods would take longer to send (`deadlineFor`), and long enough that the raiders could reach your edge no sooner than a year after your first route. The page says what it costs, by when, when goods would arrive, and that the raiders gather if nothing comes. You can pay in coin, send the goods, or refuse (the band gathers at once).

**The band** (`world.raids`, one live at a time). Each raid has its threat's deal, its city, its size (8 to 12, by the dice), its phase and the times that make its place a pure function of the tick:
- *threat*: waiting on the deadline (with nothing sent: if something is on its way the ruler waits for it);
- *gathering*: ten days at their city (a banner and figures beside it on the map);
- *marching*: along the road (or the lane, for Troy) to your edge, as long as a caravan takes, and a fifth more;
- *raiding*: on your map (a walker of kind `raider` with the band's size);
- *homeward* or *turned*: back along the way on the map; then it is over.

The chip under the top bar counts the days from the gathering on, then "Raiders in the city", and its click opens the ruler's page.

**On your map.** The band comes in at the edge nearest their city (Corinth and Athens north, Sparta west, Troy east, landing beyond the hills), at the open tile on that edge nearest its target. The target is the field or store nearest that edge that is worth it: a farm, pasture or olive grove (always), or a granary or storehouse holding 300 or more. They walk across the land (roads and open ground, round buildings: the hunters' off-road walking, `offRoadPath`), at a run, re-finding their way if something is built across it. At the target they spend a day: a field is set alight (`ignite`: the phase 2 fire, which the watchmen fight and which can spread to what touches it) and what is in its barn carried off; a store is plundered (up to 80 a man, never more than half of what it holds). Then they walk out the way they came, carrying sacks, and off the map. Houses are never targeted. Walkers within six tiles of the band (but watchmen, caravans and the raiders themselves) stop where they are and are not drawn: they have run indoors; they come out when the band has passed.

**Stopping them.** Paying in coin while the band is out pays at once and turns it at once, wherever it is (on the map it turns round where it is; in the city it walks off with whatever it already took). Goods sent go to their city and count when they arrive: in time (before the deadline, or before the band leaves your map) they turn it back. A gift (or anything) that lifts the ruler's mood past cold calls the band off. The page shows the goods' arrival against the band's.

**Afterwards.** The ruler remembers: a raid done is "their raid has eased the king's temper" (+25, fading over eighteen months); paying it off is "you paid them to call off their raiders" (+10, a year). Either way a lull: no threat from them for a year. The ledger has "Raided · Sparta" (what was carried off, in the lost section) and the fire's own "Burnt down" line when the field falls; the stock book has the loot as lost; news says what happened, from the threat to the band's going.

**News that can't wait.** The threat, the band gathering, the band sighted, turned back and gone are urgent news: they show at once under the top bar, ahead of any news waiting its turn, and a standing line for the threat or the band stays while it is live (the most pressing deal line). The town lines and the map's labels are redrawn straight after a command (slice 19's review), so paying off shows at once.

**Never stack up badly** (slice 19's review): while a threat or band is live no ruler makes a new request, offer or tribute demand; a yearly tribute coming round waits a month at a time while its ruler has another deal open, Greece has two open, or a threat is live.

**Sound and sight.** A horn when the band is sighted at your edge. On the map: the band as little figures with shields and a banner in their colour (a ship for Troy's), a red seal with crossed spears on the city's label while a threat is live, and the hover card saying where the band is. In the city: the raiders with round shields in their city's colour, torches, sacks on the way out; hovering one says whose they are, where they are going and what they carry; "Raiders!" floats up where they come in.

**State** (version 20; `from19`): `world.raids` (always empty before), `world.nextRaid`; walker kind `raider`; deal state `raided`; ledger kinds `peace` and `raid`.

## Tests

`tests/raids.test.ts`:
- a tribute refused by a cold ruler threatens at once; refused by a wary one, no threat; no threat before the first route; the deadline at least two months, and no band at your edge within a year of the first route;
- one live threat at a time; the lull after a raid and after paying off; no new requests while a threat is live; a yearly tribute waits;
- the band's phases and its place on the map as a pure function of the tick; the chip's days;
- on your map: the band enters at the edge nearest its city, reaches the target near that edge, sets a field alight (the fire burning, as the hazards code has it), plunders a store (the stock book's lost line, at most half), leaves the map; never a house; walkers near them shelter;
- paying in coin turns the band at once (on the map and in the city), the ledger invariant holds; goods arriving in time turn it; a gift past cold calls it off;
- the memories: anger spent, paid off; the reasons add up to the mood;
- saves: a town with a band in the city round-trips; a version 19 save loads and plays on;
- determinism: the same seed and commands give the same raid.

Plus the existing suite and the demo probe. `smoke.mjs` opens `#threat` (the threat on the page, refuse), `#raid` (pay, the band turns on the map, the chip gone), `#raiders` (the raiders in the city, the fire, the chip) and `#aftermath` (the ledger's raid line, the memory); `measure.mjs` adds `#raiders` and `#raid`.

## Tasks

1. Plan (this file), with the baseline measured. Commit.
2. Sim: state and migration, threats from `angered()` and hostile rulers, the band's phases and timing, the raiders on the city map (entry, target, walking, firing and plundering, leaving), sheltering, paying off and calling off, the memories and the lull, the stacking rules; tests. Commit.
3. UI and render: the Ruler tab's threat, the chip, the standing line and urgent news, the map's band and seal, the raiders in the city, the tips, the horn, the ledger and stock book lines. Commit.
4. Demos and look-and-tune: `#threat`, `#raid`, `#raiders`, `#aftermath`; screenshots, adjust; smoke and measure extended. Commit.
5. Full checks, measurements, As built, the check-in. Commit, push.

## As built

All five tasks done. What differs from the plan, and what was learned:

- **The fire comes as they arrive, the loot as they leave.** The plan had the field fired at the end of their day at it; that left the band walking away before the fire showed. Now they set the field alight as they come (the phase 2 fire: ten days to burn down, the watchmen fight it, it can spread), stand round it for two days loading up, and carry off what was in its barn as they go. A store is plundered rather than fired unless what they could take is under 150.
- **They come in at the open edge tile with the shortest walk.** Taking the edge tile nearest the target as the crow flies sometimes picked a pocket with no way out (beside cliffs); the way is now found from every open tile on that edge at once, and they come in where it starts.
- **A refusal can't hurry them inside your first year of trade**: refused early, the band gathers for longer, so no raiders reach your edge within a year of your first route either way.
- **Paying the band off once it is leaving** is not offered: they go with what they took, and paying would only lose the anger it spends.
- **A threat's goods arrive when they arrive.** The ruler waits for what is on its way even past the day (as a request does). Fetching the goods took longer than slice 19's estimate in the tests (about a quarter longer), so the page's arrival date can be late; coin does not have that problem.
- **Fields burnt together.** In `#raiders` and `#aftermath` the fire spread from the first farm to the two beside it (no watch post reaches the west fields in `#caravan`'s town): all three wheat farms burn. That is the phase 2 fire doing what it does; it shows why a watch post by the fields matters, but it is a heavy loss, and the check-in asks Oliver about it.
- **Raiders' walker** keeps the target as its origin, so the band survives the target burning down (removeBuilding spares it as it spares caravans); following the band follows the band itself.
- **Urgent news** has its own line (`alarm`) ahead of the queue; while a standing raid line says the same thing, the news that made the phase is hidden. The threat or band has its own standing line (`raid`), above the deal line.
- **Not built:** a Troy raid shown on screen (tested in the sim only: the sea band sails the lane and comes in from the east edge, plundering the storehouse in `#caravan`'s town); goods as the price of peace in the demos (`#caravan`'s town has no way to send Sparta goods, so he asks only coin).

Checks: typecheck clean; 326 tests in 27 files pass (18 new in `tests/raids.test.ts`, one slice 19 test updated: a cold refusal now threatens instead of marking); the 78 earlier demos open and play 900 ticks on identically, the whole of Greece included (probe outside the repo); a version 19 save with a tribute marked angry loads and gets its threat on the month's turn (`tests/fixtures/slice19-angry.save.json.gz`).


After (same machine, headless Chromium with software WebGL at 1920 × 1080): bundle 1,409 KB raw, 417 KB gzipped; bare link ready at 1.50 s, first frame 1.91 s; `#town` and `#richtown` unchanged in triangles, draws and save size; the map first built in 251 ms; `#raid` 305,834 triangles and 22 draws on the map; `#raiders` 596,979 triangles and 57 draws in the city, 4.9 ms a frame running. `npm run smoke` passes.

**Review (18 Oct).** Played the four demos at 1920 × 1080 and read the diff. Changed:
- `AT_TARGET` from two days to six: at normal speed two days is two seconds, so in `#raiders` the band had loaded up and was leaving (and paying was refused) before you could reach Sparta's page. Paid or called off while they stand at the target, they now head off at once with nothing (they used to finish their stay first).
- The fire raiders set (`hazards.ts`, `raidFireHeld`, `spreadChance`): no spread for its first five days (`RAID_FIRE_HELD`), then a quarter of `SPREAD_CHANCE`; the fire's line and tip say so (`spreadWords`). `#raiders` and `#aftermath` now lose one farm, not three; the 78 earlier demos are untouched (no raids in them).
- The goods for a threat only when the stores hold twice the amount (a request asks about half). The quarter-late estimate came from thin stores: in the test town oil was asked at 800 with 900 held, and fetching dragged for 125 days while the city ate into it. With the rule the estimate holds to within five days (now asserted in the test); slice 19's own estimate was exact in `#request` and `#promise`.
- A raid in its `raiding` phase whose band is gone from the map ends on the next day's turn, so a lost walker can't hold every ruler's asks for ever (yearly tribute's `comesRound` waits only while a deal is open, and every other deal ends by its deadline).
- The news queue skips the ask of a deal already answered (`answeredAsk`, status.ts); `#threat` showed "demands 650 dr in tribute" under the threat that followed its refusal.
- Coin paid with the band out goes on `peace · to Sparta`, the same ledger line as coin sent by herald before it sets out (it was `peace · Sparta`). Goods arriving while the band is leaving with its loot count as a gift (`peaceArrived`), as paying coin then is refused.
- The raid line says "paid off, leaving your land" from the moment of paying, not "firing the farm" until the next tick; the peace memory names the goods actually delivered.
- `#caravan`'s town is asked only coin because its stores hold too little cheese or oil, not for want of a road (the check-in said the road). Troy's sea band checked on screen from a save.
- Tests: two new in `tests/raids.test.ts` (paid at the target; the raiders’ fire held) and two changed (the goods’ arrival date asserted, with oil to spare; a longer wait for the loot); 328 in 27 files. Smoke clicks the chip in `#raiders`. The demo probe (whole state at opening and 900 ticks on) is identical for all 78 earlier demos.
