# Slice 24 — Raiders fought in the streets

*20 Oct 2026. Phase 4, "A city worth defending" (`docs/specs/2026-10-19-a-city-worth-defending-design.md`). The second slice of the phase. Builds on slice 23, "Bronze and the barracks", and its review.*

## Goal and check-in

The spec's words: the battle model (melee, arrows, wounds and falling, breaking and running; drawn blow by blow). Raiders' new aim: stores and the tax office, drachmas and goods carried off, buildings set alight on their way, then home; bands sized by the ruler and your city, with numbers in the threat. Fallen soldiers mourned at home; the wounded healing; refilling companies; hirelings.

Raiders now come for something. A band that crosses the edge makes for the nearest store worth taking (a granary or storehouse) and then the tax office, where the treasury is kept: it carries off up to half of what a store holds (as much as its men can carry) and up to a tenth of the treasury, sets a building or two alight on its way, and goes home the way it came. How many come depends on the ruler and your city: the first bands are the old 8 to 12, a big city faces 30 or 40, and the threat says how many ("Sparta's band: about 29 men"). Your companies can stand in the way. Each raider is a figure of his own round the band; hoplites close with raiders who come near their banner and hit hard behind their armour; archers shoot at any raider within bowshot and step back from one who comes at them; raiders beat archers hand to hand. Every thrust and every arrow is drawn. A man whose health runs out falls; a raider lies a moment and fades, and what he carried is taken back; a soldier is wounded (he lies a while, gets up and limps back to the barracks to heal over a month) or killed (his house mourns him: a town line, the family's mood, one fewer in the house) and his company calls another man in his place. A side that loses half its men breaks and runs: raiders for their edge, a company for its barracks. In a pinch the barracks hires a company of Cretan archers or Arcadian hoplites, for a fee and three times a citizen's pay: they march in from the map's edge in their own colours, take nobody from your homes, and walk off grumbling if a month goes unpaid.

**Oliver can:** place two companies in the raiders' way in `#battle` and watch the fight; let a band through in `#looted` and see what it takes; hire mercenaries when the threat comes in `#hirelings`.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#battle`: `#companies`' town (hoplites and archers ready at the barracks) with Sparta's band of 29 two weeks from the west edge, paused, the hoplites' banner selected and the Army tab open: drag the banners into its way (the bridge on the west road) and play.
- `#looted`: `#raiders`' town, with the band let through: it has plundered the granary and the tax office and is on its way out, the ledger open on what it took.
- `#hirelings`: the barracks town with no companies, the treasury full, and Corinth's band gathering against it: the Army tab open on the hire buttons.
- Every earlier token keeps working, each also with `-paused`.

## Not in this slice

Walls, gates and towers, and archers behind walls (slice 25). Landings from the sea and triremes (slice 26). Loans (slices 27 and 28, the first being built alongside). Expeditions abroad (slice 29). Sound (later in the phase). Mourning in the shrine or at the theatre (not in the spec).

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- Sim code (`src/sim/`, `src/map/`) stays pure and deterministic: the battle's dice are hashes of the seed, the tick and who strikes, drawing on no generator, so a town where nobody fights draws exactly as before. Money moves only through `pay` / `income` (hiring fees, hirelings' pay, loot taken and taken back all have their own ledger lines).
- **Earlier towns are untouched, but for raids.** The spec says the raid demos change on purpose (`#threat`, `#raid`, `#raiders`, `#aftermath`, `#rivals`: bands are sized by the city, aim at stores and the tax office, and burn on their way). Every demo without a route plays exactly as before: the demo probe (outside the repo) plays every earlier demo at the commit before this plan and after, and compares the whole city at opening and 900 ticks on (redraw counters and the army's new arrays left out). Any other demo that moves is named in the check-in.
- Old saves still load: the state version goes to 23 with a migration from 22 (no raiders on the army's books, no arrows, no news, nothing owed; companies citizen, unbroken; soldiers fighting nobody; raids with nothing stolen or fallen).
- The renderer and UI only read sim state; every action is a command (`hire` is new). Static build, `base: './'`, no runtime requests beyond the game's own files, all art generated in code.
- Judge by screenshots, tune by eye, never claim it looks or feels right on Oliver's behalf.

## Before

Measured at `99677b8` (slice 23 with its review, on top of main's city look) with the measuring fix below applied, headless Chromium with software WebGL at 1920 × 1080, while another thread's build was also measuring on the machine:

| What | Before |
|---|---|
| Tests | 366 in 31 files, all passing |
| Bundle | 65 files, 10,024 KB raw, 2,101 KB gzipped (the game itself 4 files, 476 KB gzipped; the prepared towns 61 files, 1,625 KB gzipped) |
| First load (bare link) | ready at 1,909 ms, first frame at 2,922 ms by the page's clock |
| Every demo's load | still measuring when this plan was committed: in As built |
| `#town` | 799,168 triangles, 83 draw calls (town view) |
| `#richtown` | 910,707 triangles, 95 draw calls (richtown view); a save 186 KB |
| `#raiders` | 598,249 triangles, 57 draw calls (its view, the band at the farm); ready at 1,807 ms |
| Work a frame before drawing | still measuring when this plan was committed: in As built |

(Headless software rendering: the triangle and draw counts and the frame work compare like with like; the frame rate itself is not representative.)

**The measuring fix.** Since the city look's post-processing, `scripts/measure.mjs` read 1 triangle and 1 draw call everywhere: the composer's last pass (a full-screen quad) reset the renderer's counts. The finish now counts the scene's own pass (a small pass after the render pass copies the renderer's counts) and the probe reports those. The numbers above use it at the old commit, so before and after compare.

**The army's cost, profiled first** (slice 23's review asked for it before battles). In Node, at `99677b8`, the army's step costs about 0.12 to 0.2 ms a tick in `#barracks` and `#companies` (the whole tick 0.7 to 1.4 ms); the reviewer's 1 to 1.4 ms was in the browser on a loaded machine. Either way `placeOf`, `frontOf`, `gateOf` and `drillSpot` were worked out again for every man every tick; they are now worked out once a tick for each barracks and company (below).

## Design decisions

**Performance first.** A per-tick cache (`baseOf` in `src/sim/army.ts`) holds each company's barracks, its front, its gate and its drill spot, keyed by the tick and the state's revision counters, so a company of 16 works them out once a tick, not 16 times. A man who can find no way to his company (the review's stuck man) waits a day before he looks again, instead of pathfinding every tick. A man joining a marching company paths to the company's target (or the gate and drill spot) over roads and open ground instead of walking straight through buildings to his place in the column. The battle steps only while there are raiders on the map, arrows in the air or men lying where they fell.

**The raiders as men.** A band on the map (raids.ts) stays one walker that finds the way; its men are `army.foes`, each with his own place, health, facing and state (with the band, fighting, fallen). They keep a loose pack behind the band's head, three abreast, row behind row along its way, each a little off his line; at a target they stand round it, each at his own spot. A raider who comes within 2.5 tiles of a soldier goes for him; while any of a band's men fight, the band stands where it is. One who can't strike the man he went for in 8 days' worth of ticks (80) gives up on soldiers for a while and goes on, so nobody fights forever.

**Your men in a fight.** A company holding its ground (or drilling at its barracks) fights what comes near its banner, then goes back to its ranks: hoplites close with any raider within 4 tiles of the banner and chase no further than 5.5; archers shoot at any raider within 8 tiles of them and step back from one closer than 1.2 (fighting him hand to hand only if they can't). A marching company that raiders come at stops and fights (its banner waits). A broken company, or a man walking in, only strikes back at a raider on him. Men in a fight step anywhere but inside a building, so a company holding a one-tile bridge can still be come at on its outer files.

**Blows and arrows** (tuned by eye, `src/sim/battle.ts`). A man in reach strikes every 8 to 11 ticks; the dice say whether it lands (65 %) and how hard (80 to 120 % of his strength). Strength: hoplite 20, archer 6, raider 18. What a blow does to each: a hoplite takes 55 % (bronze and a shield), a raider 80 % (a shield), an archer all of it. An archer looses every 14 to 17 ticks; his arrow flies at 1.1 tiles a tick and lands where it was aimed, striking for 11 if it was good (78 % at point blank, 3.5 % less a tile). So hoplites beat raiders man for man, raiders beat archers hand to hand, and archers wear raiders down from range.

**Falling.** A raider whose health runs out falls, lies 4 days' worth of ticks (40) and fades; his share of what the band carries is taken back on the spot (goods to the nearest store with room, written back in the stock book; drachmas to the treasury on a "Taken back from raiders" line). A soldier who falls is wounded or killed, about even odds. The wounded lie 30 ticks, get up and limp back to the barracks, and heal over 30 days (health back a little each day; whole again, they take their place in the ranks). The killed lie a while and fade; a citizen is mourned at home: the house's story ("Lykon fell fighting Sparta's raiders in the streets, and the house mourned him"), its mood for a season ("Mourning Lykon, who fell fighting Sparta's raiders", −2), one fewer living there, and a town line. The company calls another man in his place, as it was raised. A hireling who falls is named in the army's news, and his company doesn't refill.

**Breaking.** A band that has lost half its men breaks: it runs for its edge from where it stands with what it still carries, sets nothing more alight, and its men no longer stand to fight (a hoplite won't chase a running band). A company that has lost half the men it began the fight with breaks and runs back to its barracks ("broken, running back to barracks"); arriving there, it is whole again in spirit and drills.

**The army's news.** The army keeps its last 12 lines (a band broken, a man fallen, a company broken, hirelings walking off), each with the building it is about. The latest shows under the top bar for 10 days, in its own bronze colour with a helmet, and clicking it goes to the place.

**Raiders' new aim** (raids.ts). As they come in, a band picks the nearest store worth raiding (a granary or storehouse holding at least 300 measures in all) by the way from its edge, then the tax office nearest it; with no store worth it, the nearest tax office; with neither, a field as before. Each target takes them 4 days. At a store they carry off the ware it holds most of, as much as their men can carry (80 a man) and never more than half; at the tax office, a tenth of the treasury, at most 40 dr a man, on the raid's ledger line. On the way they set buildings alight (the phase 2 fire, which watchmen fight and which can spread): at most one on the way in, and the rest (up to one for every 12 men, at most 4) on their way out, loaded, each a chance once a day on a building within 1.6 tiles. Then home. The news and the town line say where they make for ("making for the granary and then the tax office") and, when they have gone, what they took and burnt and what they lost.

**Band sizes.** The dice's 8 to 12, plus one man for every 60 people over 400, times the ruler's strength (Sparta 1.4, Athens 1.1, Troy 1, Corinth 0.8), at most 48. A town of 1,150 faces a Spartan band of about 29. The threat and the band's chip say how many.

**Time to place companies** (slice 23's review: companies march at 0.16 tiles a tick, raiders run at 0.192). Unchanged paces; the warning is long enough: the threat's deadline, the gathering and the march on the map give a month and more before a band is at the edge, and a band at the edge is still 30 days from the middle of `#companies`' town, where a company from the barracks reaches the granary in about 22. `#battle` opens with the band two weeks from the edge so the column can reach the bridge with room to spare.

**Hirelings** (army.ts). On the barracks panel and the Army tab, "Hire Cretan archers (300 dr, then 9 dr a man a month)" and "Hire Arcadian hoplites (450 dr, …)". The fee is paid at once (a "Hirelings" ledger line); sixteen men file in two abreast from the nearest open edge of the map, at the double (0.34 tiles a tick), armed with their own, named for their towns ("Damon, son of Lykos, of Mantinea"), in their own colours: the Cretans in green, the Arcadians in blue. They take nobody from your homes and need no armour from the stores. Their pay (three times a citizen's) is owed monthly like the soldiers' on the hirelings' line; a company whose last month's pay is still owed when the month turns walks off for the nearest edge, with a line in the army's news. Their company fills only once; dismissed, they walk off too.

**Slice 23's other findings.** Dismissing a company keeps what it was owed (`army.owed`), paid like wages when money comes. A barracks with no road beside it says "The barracks needs a road beside it: its men come in by the road" instead of "Only N … can spare a man"; a home that could send a man but has no way to the barracks says that.

**Drawing** (`src/render/walkers.ts`, `src/render/army.ts`). Raiders are drawn one by one in the folk batch, each in his city's colour, with a spear or torch, or a sack once the band is loaded; a raider fighting lunges with his spear as he strikes. Soldiers thrust (a hoplite) or draw and loose (an archer) as they strike. The fallen topple, lie, and sink away; the wounded lie, then limp back; the healing are indoors. Arrows are a small instanced pool, each on a low arc from bow to target. Hovering a raider says who he is, how hurt, what he is doing and what the band carries; a soldier's hover adds wounded, healing or hireling.

**The Army tab and the barracks panel.** Wounded counted for real ("14 of 16 ready · 2 wounded"), hirelings with their kind and pay, the hire buttons (with the fee and pay, and why not when the treasury can't spare it), the city's whole strength with wounded and hirelings, and the army's news.

## Tests

- **Determinism:** the same battle twice comes out the same; a save mid-battle round-trips and plays on identically.
- **Battles:** two companies in the band's way break it (half its men fall, it takes nothing, and the fight is over within days); hoplites beat an equal number of raiders; archers out of a band's sight wear it down with arrows untouched; a company that loses half breaks and runs for its barracks, its dead are mourned at home (one fewer in the house, the story, the mood, the news), its wounded walk back and heal, and it fills again.
- **Loot and the ledger invariant:** a band let through carries off goods from the granary and drachmas from the tax office (the stock book and the ledger say so); its fallen give theirs back to a store and the treasury, on their own line.
- **Hirelings:** hired for the fee, they walk in from the edge armed, take nobody from homes, are paid three times a citizen on their own line, and walk off when unpaid.
- **Slice 23's findings:** a dismissed company's pay owed is still paid; a barracks with no road says so.
- **Raids:** the existing raid tests, updated for the new aims (the granary, then the tax office) and band sizes.
- **Migration:** a version 22 save (`slice23-companies`, a company mid-march) loads at version 23 and plays on.

Plus the existing suite and the demo probe. `smoke.mjs` opens `#battle`, `#looted` and `#hirelings` and drives a hire and a battle; `measure.mjs` adds them (a battle's frame cost).

## Tasks

1. Plan (this file), with the baseline measured. Commit.
2. Sim: the army's cache and slice 23's findings, the battle, raiders' aims and band sizes, hirelings, the fallen and the wounded, the army's news and town line, migration; tests. Commit.
3. Render and UI: raiders as men, soldiers striking and falling, arrows, hireling colours, hovers, the Army tab, the barracks panel, the ledger lines. Commit.
4. Demos `#battle`, `#looted`, `#hirelings`; look and tune by screenshots; smoke and measure. Commit.
5. Full checks, the demo probe, measurements, As built, the check-in. Commit, push.

## As built

Commits: `412fe79` (this plan), `e6d2351` (the sim, the drawing and the panels, with tests), `c9021e6` (looked at and tuned by screenshots; smoke, measure and screenshots for the new demos), `fb555f8` (the earlier raid demos' smoke checks brought up to the new raids), and the commit that fills this in with the check-in.

**What changed from the design above**, all found by playing the battle in Node and looking at screenshots:

- **The numbers.** Raiders strike for 16, not 18, and a hoplite takes 45 % of a blow, not 55 %. With the first numbers, hoplites alone at the bridge lost 15 men to Sparta's 29 and broke. Now two companies at the bridge break the band (15 to 17 of its 29 fall) for about one man killed and seven wounded; hoplites alone break it for two killed and two wounded on the road below the cypress hill, but are themselves broken at the bridge's foot (12 raiders fell; 7 of ours killed and 8 wounded); archers alone are broken after 7 raiders fall, and the raid goes on to the granary.
- **A band that is fighting charges.** While any of a band's men fought last tick, the rest close at up to 6 tiles rather than 2.5, so a band's men no longer stand in the pack to be shot. Without it, archers alone beat 29 raiders untouched.
- **An elbow's room apart.** Men in a fight (both sides) push each other apart to about a quarter of a tile, so a company doesn't pile onto one spot.
- **No refilling mid-fight.** A company that is fighting, or broken and running, calls no new men until it is over (or back at its barracks); the barracks panel says so ("In a fight: it fills again once the fight is over"). Without it, men walking in from their homes were fed one by one into the fight: 18 archers killed in one run. A company counts its fight over once the band breaks and runs, so it refills while the beaten band is still on its way out.
- **The ledger's line** for loot recovered reads "Taken back from Sparta’s raiders", not "Taken back from raiders".
- **`#battle` opens about 11 days before the band reaches the edge**, not two weeks: the demo plays on until the band's march has 14 days or fewer left, and the march's steps are coarse.
- **`#raiders`' view** now looks over the granary the band plunders (it used to look at the farm it burnt).
- **Raiders' look.** Dark leather and iron, so a band reads apart from red-and-bronze hoplites.
- **Saves.** The welcome back for a save from slice 22 or earlier says what raids now do.

**The demo probe** (outside the repo; every demo at `99677b8` and at `c9021e6`, the whole city compared at opening and 900 ticks on): 82 demos are identical. `#threat`, `#raid`, `#raiders` and `#aftermath` changed on purpose (the band's size, aim and fires). `#rivals`, `#rivalsmap` and `#rivalstreet` have the same people and money at opening and 900 ticks on; only the threat's line differs, now saying the band's size. `#battle`, `#looted` and `#hirelings` are new.

**Checks.** The typecheck, the full suite (376 tests in 32 files) and the build pass; `npm run smoke` passes. Its first run failed on the earlier raid demos' checks, which still expected the old raids, and on `#battle`'s archers: the Army tab's row flies the camera to them, so the click meant for the bridge landed elsewhere. Both are fixed in `fb555f8`, the game unchanged. That run, with the archers left at the barracks, also gave the hoplites-alone-at-the-bridge result above.

**Old saves.** The slice 23 fixture (`slice23-companies`, version 22, a company mid-march) loads at version 23 and plays on (test).

**Measured** (headless Chromium, software WebGL, 1920 × 1080, while another thread's build and tests ran on the same four cores):

| What | Before (`99677b8`) | After |
|---|---|---|
| Tests | 366 in 31 files, all passing | 376 in 32 files, all passing |
| Bundle | 65 files, 10,024 KB raw, 2,101 KB gzipped (the game 476 KB, the prepared towns 1,625 KB) | 68 files, 10,624 KB raw, 2,223 KB gzipped (the game 486 KB, the prepared towns 1,737 KB: three more) |
| First load (bare link) | ready at 1,909 ms, first frame at 2,922 ms | ready at 1,137 ms, first frame at 1,729 ms |
| Every demo's load | lost to a container restart before it finished; slice 23's: 91 demos, median 1.9 s, slowest 2.4 s, none over 3 s | 94 demos, median 2.1 s; over 3 s: `#food` 3.2 s, `#vendor` 3.0 s. Measured again side by side with the old build: `#food` is the first page a fresh browser opens, 4.2 s in both builds, and 1.7 / 1.8 s on a second round; `#vendor` 2.3 / 2.1 s before and 2.5 / 2.0 s after. The load is unchanged; the machine was busy |
| `#town` | 799,168 triangles, 83 draw calls | the same |
| `#richtown` | 910,707 triangles, 95 draw calls; a save 186 KB | the same; a save 187 KB |
| `#raiders` | 598,249 triangles, 57 draw calls (the farm); ready at 1,807 ms | 691,296 triangles, 63 draw calls (its view now over the granary: the band of 32 drawn man by man, and the fires); ready at 1,944 ms |
| `#battle` | — | 923,107 triangles, 89 draw calls at opening; in the fight, close in, 783,042 and 70, with 29 raiders, 27 of them fighting and 13 arrows in the air; ready at 2,174 ms |
| `#looted`, `#hirelings` | — | 719,305 / 67 and 831,175 / 78; ready at 2,682 and 1,998 ms |
| Work a frame before drawing (two rounds each, old and new builds taking turns) | `#town` 14.7 / 11.2 ms, `#raiders` 11.7 / 14.4, `#rivals` 16.5 / 11.2, `#barracks` 10.8 / 10.7, `#companies` 14.8 / 11.2 | 19.4 / 13.4, 8.9 / 12.4, 13.3 / 16.8, 9.8 / 10.5, 14.1 / 10.9; `#battle` 2.0 / 1.4 at opening, 23.3 ms in the fight (28, then 17 raiders fighting; one run) |

The machine's load average was 11 to 12 on four cores throughout (another thread's build and tests), so the frame work moves by several milliseconds from round to round; the old and new builds are within that. The fight's 23 ms is a frame at normal speed in headless software rendering, which draws a frame or two a second, so each frame steps several ticks; in Node a whole tick of the simulation while the band is on the map, the fight included, costs about 1.3 to 2.2 ms (29 raiders and 32 soldiers) on the same busy machine.

**Review.** `b098597` and the commit after it. The march (`MARCH_SPEED` 0.16 → 0.2, and a march-only `MARCH_STRIDE` 0.27 so drill and ranks are unchanged): `#battle`'s companies reach the bridge about 26 days after the clicks and a week before the band, not 0.8 days. Bands never light a granary, storehouse or tax office (`torch` skipped stores only partly, and `light` set every tax office reached alight; `#looted` burnt the granary it emptied). Raiders drop a routed company's men as targets and routed men stop fighting (archers alone lost 12 killed after breaking). The Army tab counts hirelings once and leaves the place off a hired company still walking in. The hover prefers a raider nearer the pointer than the soldier picked. `#hirelings` opens paused; `#looted` opens 6 days after the band leaves the tax office, not 3. The smoke's `#aftermath` ledger check now expects homes burnt, never granaries or tax offices. New tests: the march leaves at least five days at the bridge, a broken company loses no more men, and a band never lights what it plunders (377 tests). Saves: `LEDGER_KINDS` in `saves.ts` lacked `hirelings` and `recovered`, so a save after hirelings' pay or loot taken back was refused as damaged; both added, and the loot and hirelings tests now save and reopen at those points. The measure's map rows read the city's last count (the finish's tally feeds `info()` even while the map, drawn without the finish, is shown); `info()` now uses the renderer's own count after a map frame. Full measure after the review: 94 demos ready at median 1,767 ms, none over 3 s; bundle 2,224 KB gzipped; `#battle` in the fight 784,710 triangles, 70 draw calls, 19.8 ms update a frame (headless). The demo probe against `2ea88f2`: only the raid demos with a band (`#aftermath`, `#battle`, `#hirelings`, `#looted`, `#raid`, `#raiders`) differ; the rest are identical. A battle tick costs 0.2 to 0.3 ms and the army 0.15 ms in Node; slower ticks (6 to 13 ms) come from other walkers' pathfinding and the band's arrival.
