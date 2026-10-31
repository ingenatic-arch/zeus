# Slice 59 — Heroes answer

*1 Nov 2026. Phase 7, "Beloved of the gods" (`docs/specs/2026-10-31-beloved-of-the-gods-design.md`). The Legends line's second slice (wave 2), built in the worktree `/home/claude/zeus-legends` on `claude/p7-legends`, from `afd1461` (the trunk merged in: slice 55 alone so far; state version 49).*

## Goal and check-in

The spec's words: seven heroes, their halls, demands, arrival, life in the city, slaying monsters, joining expeditions, their wishes.

A hero is something you build towards: raise their hall, meet what they ask (each demand a named check with its progress), and they come, by sea or by road, to live in the city. They walk its streets, the homes round their hall are proud of them, and when a monster has a lair on your land you can send the hero who can slay it: they walk out to the lair and fight a long fight you can watch, and win. The city celebrates for a week, the monster's god is satisfied, and the lair becomes a place of legend that visitors pay to see. A hero can ride with an expedition and tip its odds a great deal. Each has one wish of their own; ignore it a year or two and they leave, warned first.

**Oliver can:** open `#hero` and find Perseus's hall standing by the agora, Athena warm, and one demand left (her sanctuary), all said on the hall's panel; open `#slay` and watch Theseus walk out from his hall to the Minotaur's cave, and fight it.

**Demo links** (bare hash tokens):

- `#hero`: a mid-sized town (`#richtown`'s) with Perseus's hall standing, Athena warm (staged), and one demand left: a sanctuary to Athena. The hall's panel open, with each demand and its progress.
- `#slay`: a town with a court and fine houses, Theseus come to his hall, the Minotaur in its cave above the town; Theseus has been sent against it and is on his way, a few tiles from the hall.
- `-paused`, `-plain` and `-modern` on each, as for every demo; every earlier token unchanged.

## Not in this slice

Heroes' quests to far places on the map of Greece (recorded for later in the spec). A hero facing a god in war (slice 60's). Curses that send monsters by themselves (slice 57). Sanctuaries themselves (slice 54: a sanctuary demand reads them, loosely until the merge). Festivals at home (slice 53: Heracles' wish reads them, loosely until the merge). Heroes dying. A hero's ship drawn at the quay.

## Ground rules

- The vision wins; `CLAUDE.md` sets the conventions and budgets; the spec's *parallel plan* binds.
- **State version 50 locally** (`SIM_STATE_VERSION` + 1 after merging the trunk), one migration `fromSlice59` in `migrate.ts`, hooked by `if (st.version === 49) fromSlice59(st);`, filling only its own new fields (the heroes and the fête in `legends`, two numbers on each monster), only if absent. Its note reads "Slice 59 (Heroes answer): …". Tests compare with `SIM_STATE_VERSION`, except the migration's own test.
- **No new top-level field:** heroes live in the line's `legends`. New kinds appended at the very end of their lists: the building `herohall` (with an optional `hero` field on the building record, as a shrine's `god`), the commands `herohall` and `hero`, the message kind `hero`, the ledger kind `legends`. No new wares, no new walker kind (heroes are their own records, as monsters are).
- **Nothing acts unless built:** a hero exists only once their hall is placed (a command), so every older demo and history is untouched.
- Moods only through the groundwork's API (`moodOfGod`, `moodAtLeast`, `honour`); the monster's god is satisfied with one `honour`.
- Hooks from wave 1 not on this branch are read loosely and marked for the integrator: a sanctuary to a god (slice 54's `sanctuaryDone`), a festival held (slice 53's `festivalHeld`).
- The land's own size (`map.size`), never `MAP_SIZE`. News through `say`. Panels from the kit, through the building-panel registry.
- Sim code pure and deterministic: hashes of the seed, the hero and what for, maths through `dmath.ts`. Player actions are commands; money only through the treasury (`pay`, `income`).
- Renderer and UI only read. All art in code. Judge by screenshots at 1920 × 1080 in the original look, and check `-modern` and `-plain`; never claim it looks right on Oliver's behalf.
- Shared files touched only in blocks headed "Slice 59". Anything outside the line listed under **Touched outside the line**. `expeditions.ts` (which slice 58 also touches) gets one small, clearly headed block.

## Before

At `afd1461`, the machine lightly loaded at the start (load 3 to 9 on 4 cores, rising as the other lines build).

| What | Before |
|---|---|
| Tests | 816 in 61 files (the merge's run) |
| Download (gzipped) | 5,669 KB in all; the game itself 1,018 KB; prepared towns 4,651 KB in 128 files |
| Bare link ready (page's clock), `#town` / `#richtown` / `#empire` ready | 2,979 ms; 4,349 / 3,249 / 2,636 ms (the full `measure.mjs` on the starting build, `scratch-59/base-dist`) |
| Triangles and draws, `#town`'s view / `#bestiary` | 1,488,490 and 102 / 1,336,071 and 144 |

## Design decisions

**The seven** (the groundwork's `HEROES`, with what each slays): Heracles (any monster), Perseus (Medusa), Theseus (the Minotaur), Odysseus (the Cyclops), Bellerophon (the Chimera), Jason (Talos), Atalanta (the Calydonian Boar).

**State** (`legends.heroes`, one record per hall placed; `legends.fete`, the celebration while it lasts): a hero's record holds the hero, the hall (a building id), its state, when word was sent and when they are due, where they stand and face and how far they have walked, their way (points, segment, along, as a monster's), what they are walking to, the monster they are sent against, the fight's start, their last blow, their wish's clock and warnings, the monsters they have slain, the expedition they are with, and when they may come again after leaving.

**States:** `awaited` (the hall stands, demands not all met), `sent` (all met: word has gone out, due within a month), `arriving` (walking in from the quay or the edge), `home` (at the hall, in its courtyard), `strolling` (out in the streets and back), `hunting` (walking to a lair), `waiting` (at the lair while its monster is out raiding), `fighting`, `returning` (walking home), `mustering` (walking to the expedition's edge), `abroad` (with an expedition), `sailing` (Odysseus's season at sea), `leaving` (walking off, wish ignored).

**The hall** (`herohall`, 4 × 4, `isLarge`, 1,500 dr, no staff, stone: little fire risk, slow wear): one per hero, chosen from a **Hero's hall** button on the Mythology tab that opens a chooser of the seven (as slice 54's sanctuary chooser), each card with the hero's emblem colour, their name and epithet, what they slay, and their demands with progress now; a hero with a hall already is greyed out. The tool's tip says whose hall it places and what they ask. Drawn in code in the original look: a walled courtyard of pale stone with a columned porch (megaron) at the back, a tiled roof, the hero's bronze statue on a plinth in the courtyard with their attributes (a lion skin and club, a winged helmet and shield, a sword, a bow and cap, a winged horse, a fleece, a bow), and two banners on poles at the gate in the hero's colours. Each hall told apart by its statue and banner colours.

**Demands**, each a named check with its progress, read only from what the city already has:
- Heracles: a sanctuary to Zeus; 2,000 people ("1,240 of 2,000"); a full granary (the fullest granary's food against 90% of its wheat room: "the fullest holds 2,100 of 2,880").
- Perseus: Athena warm ("Athena is pleased; warm at 30"); a sanctuary to Athena.
- Theseus: a court; ten fine houses (fine houses, villas and estates: "6 of 10").
- Odysseus: six triremes (afloat, not building: "4 of 6"); a sanctuary to Athena.
- Bellerophon: a horse farm; twenty horsemen (in horsemen companies: "12 of 20").
- Jason: a shipyard; three trade routes open ("2 of 3").
- Atalanta: Artemis warm; three hunting lodges ("1 of 3").
Sanctuaries read through one local function (`sanctuaryStands`): a monuments site of kind `sanctuary` for that god, finished, its building standing; on the trunk it becomes slice 54's `sanctuaryDone` (marked for the integrator). Until slice 54 merges, no sanctuary can be built, so a sanctuary demand stays unmet: `#hero` uses that as Perseus's one demand left.

**Arrival.** Once the hall stands and every demand is met, word goes out (a message: "Perseus has heard of your city… he will come within the month"), and 10 to 30 days later (by a hash) the hero arrives: by sea at the trading post if there is one (stepping off at its jetty side), else by road from the nearest edge, with a message, and walks to the hall. Demands that slip after word has gone out don't stop them.

**Life in the city.** At home the hero stands in the hall's courtyard; every 6 to 12 days they walk out to a busy place within reach (the agora, the theatre, the court, or a home) and back, across country as a monster walks (open ground and roads, round buildings). Drawn half again a man's height (0.53 tiles), each with their attributes: Heracles' lion skin and club, Perseus' winged sandals and mirror shield, Theseus' sword and royal cloak, Odysseus' bow and felt cap, Bellerophon riding Pegasus (wings beating), Jason's golden fleece over his shoulder, Atalanta's bow and short tunic. A soft gold ring on the ground under them so they read among walkers. Hover for who they are and what they are doing; click for their hall's panel. Homes within 12 tiles of a hall whose hero lives there are a little prouder (+1 mood, "Proud to live near Theseus's hall").

**Slaying.** From the hall's panel (a row for each monster on the land) or the monster's panel (a row for each hero come): "Send Theseus". A hero who can't slay that monster says so ("Perseus can slay only Medusa; Theseus or Heracles can slay the Minotaur"); one away, or already out, says that. Sent (a command), the hero walks to the lair (`lairSpot`); if the monster is out raiding, they wait there for it. When both are at the lair the fight begins: it lasts eight days (eight seconds at normal speed), blow for blow, the monster's health falling from where it was to nothing; it stands out of the battle meanwhile (no foe, no raid, no gaze), facing the hero. A hero of that monster always wins (Heracles against any): `slayMonster(s, id, hero)`. Then:
- **the city celebrates for a week**: every home's mood +2 ("The city celebrates: Theseus has slain the Minotaur"), and a crowd gathers at the hall;
- **the monster's god is satisfied**: `honour(s, god, 12, 'slain', …, a year)`;
- **the lair becomes a place of legend**: a stone stele crowned with a laurel and a bronze tripod at the lair, a line in the hall's panel and the lair's tip ("The Minotaur's cave: a place of legend, where Theseus slew it. Visitors leave 20 dr a month"), and each place of legend brings 20 dr a month in visitors' coin (the ledger's `legends` line);
- the hero walks home.

**Heroes abroad** (`expeditions.ts`, one small block of two lines). On the hall's panel, "Ride with the next expedition". While that is on and the hero is at home, an expedition mustering from the city takes them: they walk to its edge and go with it (`abroad`). In the fight their might is added to yours (Heracles 60, the others 40; a hoplite is 1.2), and the report says so ("Theseus fought beside them, worth forty men on his own"). When the expedition is back the hero walks home from the edge, and the order lapses.

**Wishes.** Once come, each hero has one wish of their own, said on the panel with how long it has gone unmet:
- Heracles: a festival to Zeus each year (slice 53's festivals; read loosely until the merge);
- Perseus: Athena kept pleased or better;
- Theseus: the court kept at work (staffed);
- Odysseus: to sail away for a season each year (a button, "Let him sail": he walks to the quay or the edge and is gone three months);
- Bellerophon: Pegasus stabled: a horse farm with horses in it;
- Jason: the Argo's yard: the shipyard kept at work (staffed);
- Atalanta: Artemis kept pleased or better.
A wish unmet for a year makes them restless (a warning); a month before two years, a last warning; at two years unmet they leave (walking off by the quay or the edge, with a message). The hall stays; they may be won back after a year if every demand is met again.

**Findings from slice 55, weighed:**
- **A longer stir:** the raid's warning now comes three days before it sets out (it was one: about a second at normal speed); its words say "in three days". The raid's timing is unchanged, so only `#monsterraid`'s staged opening has the warning a tick earlier (said in the check-in).
- **Towers:** a monster stung by a tower's arrows while before its lair comes out for that tower at once (no other warning than the alarm "stung by your tower's arrows, the Boar comes out for it") and wrecks it, as it would any target. Towers still shoot it on its raids without cost.
- **Standing over a building:** closing with a soldier, a monster now checks the ground under its whole bulk (its middle and four points at two thirds of its bulk), not just its middle.
- **Medusa and the Chimera:** Medusa brighter (gilded wings, a vivid green coil and a red chiton) and a little larger; the Chimera's tail a thick serpent in three segments with a head.
- **The Hydra** routing a company: left as it is (a hero can slay it now).

**Exports for the other lines** (`src/sim/heroes.ts`): `heroOf(s, hero)` (the record, if its hall stands), `heroHere(s, hero)` (come and in the city), `demandsOf(s, hero)` (the named checks with progress), `canSlay(hero, monster)`, `sendHero(s, hero, monsterId)` (refusal words or ''), `heroMight(s, e)` and `heroesFought(s, e)` for expeditions; for slice 60, a hero in the streets is `heroesShown`-readable from `legends.heroes`.

## Tests

`tests/heroes.test.ts`:
- **Demands read the city**: each hero's checks and progress on a prepared town, changing as buildings, people, moods and fleets change.
- **Arrival**: a hall placed with demands met sends word and the hero arrives within a month, at the quay (with a trading post) or an edge, and walks to the hall; with a demand unmet nobody comes.
- **Routing**: a hero reaches a monster's lair and their hall from the edge and the quay on the Bay.
- **A hero of that monster always wins**: sent against it, the fight lasts its days and ends with the monster slain (`legends.slain` with the hero's name), the fête, the god's memory, the place of legend paying its visitors (the ledger holds); a hero who can't slay it is refused with words.
- **Waits for a raider**: sent while the monster is out, the hero waits at the lair, and the fight starts when it comes home.
- **Wishes**: a wish ignored warns at a year and the hero leaves at two; met, the clock resets.
- **Abroad**: a hero ordered to ride goes with the next expedition, its might counts in the odds, the report says so, and they come home with it.
- **Determinism**: the same seed and commands give the same arrival, fight and slaying, run twice.
- **Saves**: a round trip with a hero home, one fighting and one abroad, and a fête; a version 49 save (and the version 47 fixture) loads through the migrations with no hero.

`tests/monsters.test.ts`: the stir's three days, a tower's sting.

## Tasks

1. Plan (this file) with the baseline. Commit.
2. The sim: `heroes.ts` (state, demands, arrival, life, slaying, fête, places of legend, wishes, abroad), the hall in the buildings' tables, the commands, the step in `sim.ts`, the migration, the save check, the monster hooks (held in a fight, the longer stir, towers, the bulk), the expedition block, the moods, the message and ledger kinds, the tests. Commit.
3. The figures and the halls (`src/render/heroes.ts`), the places of legend, the crowd; the chooser, the hall's panel, the monster panel's heroes, the hover tips, the build bar's button; Medusa's and the Chimera's looks. Commit.
4. Demos `#hero` and `#slay` (views, smoke and measure entries); look and tune at 1920 × 1080 in the classic look, then `-modern` and `-plain`. Commit.
5. Full checks: tests, build, the smoke, the measure against the start, every older demo opening the same, old saves; As built; the check-in. Commit, push.

## As built

*Commits on `claude/p7-legends`: `afd1461` (the trunk merged in), `ea01139` (this plan), `603d8fd` (the sim and its tests), `2cf4239` (the figures, halls, panels, chooser and demos), `5346f1b` (look and tune; the smoke and measure blocks), `8fe7f01` (the trunk merged again: slice 56), `0c8b1e8` (`#slay` reframed; the write-up), and the trunk merged a third time (slice 54).*

**What was built, as planned**, with these differences:

- **State version 52, not 50.** Slices 56 and 54 reached the trunk first and took 50 and 51, so `SIM_STATE_VERSION` is 52 and `fromSlice59` is hooked at 51 (`if (st.version === 51) fromSlice59(st);`), after `fromSlice56` at 49 and `fromSlice54` at 50. It fills only `legends.heroes` (`[]`), `legends.fete` (`null`) and each monster's `held` and `tower` (0), each only if absent.
- **The hero stands in the middle of the courtyard** (`courtyard()`: the hall's centre, nudged), not by its gate: by the gate they were hidden behind the gateway from the classic view.
- **The fight is at the den's mouth.** `startFight` places the hero before the lair's mouth (`m.mouth`), facing in, so the fight is seen from the town's side rather than behind the rocks. `#slay`'s view is side on (yaw 0.785, between the cave and where Theseus is as it opens), so his walk, the cave and the fight are all in it; at first it looked at the cave from in front, and he was off the bottom of the screen until he arrived (found by the smoke at the merge, and fixed then).
- **The fête's crowd** is 22 dancers: 6 in the courtyard and the rest in a ring before the gate (they were all inside the walls at first and hard to see).
- **Medusa and the Chimera** went further than the plan's words: Medusa in emerald scales with a gold belly, a purple chiton, twelve larger hair-snakes and bigger eyes, at 1.25 times her old size; the Chimera with a redder mane, a large white goat's head with dark horns and red eyes, and a thicker, longer green serpent tail with a red tongue.
- **The Hero's hall button** is on the Mythology tab and under V (V V cycles shrine, hero's hall). The chooser opens from `tools.onChange` when `herohall` is picked, rather than through the build bar's tool routing, so it never touches the line slice 54 changes for its sanctuary chooser.
- **A hall's tip** (`hallStatus`, read by `status.ts`) says what the hero is doing and either the demands still to meet or what they slay; the panel's own sections say all of it, so the "What it is doing" lines are quiet on a hall.
- **Probes for looking and the smoke:** `__zeus.heroes(open?)`, `heroOnScreen(hero)` and `heroStage(hero, x, z, face)` (sets a hero down for a look at the figure, paused).
- **The expedition's change is three small headed spots, not one block**: the import, the might (`+ heroMight(s, e)` on the line that sums `e.ours`) and the report line (`heroesFought`). Nine lines in all.
- **The tower test in `monsters.test.ts`** keeps its staged tower manned each tick: the labour office took its archers away to other work before the monster came out.

**Exported hooks** (`src/sim/heroes.ts`, for the other lines and the integrator):
- `heroOf(s, hero)`: the record, if their hall stands; `heroHere(s, hero)`: come and in the city; `inCity(c)`, `isCome(c)`, `heroShown(c)` (drawn in the streets), `hallOf(s, c)`.
- `demandsOf(s, hero)` (each named check with its progress), `demandsMet(s, hero)`, `wishOf(s, c)`, `unmetFor(s, c)`.
- `canSlay(hero, monster)`, `slayersOf(monster)`, `sendRefusal(s, hero, monsterId)` (why not, or '') and `sendHero(s, map, hero, monsterId)`.
- `heroMight(s, e)` and `heroesFought(s, e)` for expeditions (slice 60 can read `legends.heroes` for a hero abroad).
- `hallRefusal(s, hero)`, `hallRaised(s, b, hero)` (a hall just built), `heroCommand(s, map, cmd)` (the `hero` command's orders), `stepHeroes(s, map)`.
- `heroMoods(s, b)` (read by `folk.ts`: the fête and pride near a hall), `heroTip`, `legendTip`, `hallStatus`, `heroDoing`, `slaysWords`, `placeName`.
- From `monsters.ts`: `slayMonster(s, id, by, quiet?)`, `STIR_WARN` (three days), `reach(map, s, from)` and `nearestWalkable(map, s, t, most)`.
- For the integrator: `lastFestival(s, god)` becomes slice 53's `festivalHeld(s, god)`, marked `INTEGRATOR` in `heroes.ts`; until then Heracles' festival wish can't be kept. `sanctuaryStands(s, god)` was read loosely too, and now calls slice 54's `sanctuaryDone(s, god)` (wired at the third merge of the trunk, when slice 54 reached it); a sanctuary marked out but not finished reads "marked out, rising" on the demand.

**Touched outside the line** (every change in a block headed "Slice 59", new kinds appended at the ends of their lists):
- Sim: `state.ts` (the `herohall` kind, a building's `hero`, the `legends` ledger kind, the version), `buildings.ts` (`JOBS` and `isLarge`: two single-line lists that end with the new kind), `build.ts` (its cost), `hazards.ts` (its fire and wear), `commands.ts` (`herohall` and `hero`), `messages.ts` (the `hero` kind), `sim.ts` (the step and the commands), `folk.ts` (`heroMoods`), `status.ts` (`hallStatus`), `expeditions.ts` (see above), `migrate.ts` (`fromSlice59`), `monsters.ts` (the line's own: held in a fight, the three-day stir, towers, the bulk, `slayMonster`).
- Game and UI: `saves.ts` (the save check of heroes), `tools.ts` (the hall's tool and preview), `demos.ts` and `views.ts` (`#hero` and `#slay`), `main.ts` (the view, tips, clicks, chooser, probes), `buildingpanel.ts` (the registry entry and the button), `monsterpanel.ts` (its slayers), `buildbar.ts`, `categories.ts`, `help.ts`, `icons.ts`, `ledger.ts`, `minimap.ts`, `render/monsters.ts` (Medusa and the Chimera); and, from the review, `render/pictures.ts` (one line: the hall's picture for the build panel, `heroHallPicture` from `render/heroes.ts`) and `buildingpanel.ts`'s `nameOf` (a hall's title, `hallName`).
- Scripts and tests: `smoke.mjs` and `measure.mjs` (a Slice 59 block each; the smoke's summary line), `saves.test.ts` (`#town`'s budget, 194,625 to 194,700), `monsters.test.ts` (the tower test, the old-save shape).
- Trunk lines changed at the merges, only to append: slice 56's `visit` command and slice 54's `sanctuary` command, and slice 54's `'sanctuary'` in the building kinds' and the tools' unions, each lost its closing semicolon (it moved to the new last entry); `JOBS` and `BUILDING_KINDS`, single-line lists, end with `herohall` after slice 54's `sanctuary`.

**Checks** (numbers in the check-in's Measurements):
- Every one of the 168 earlier demos' prepared towns, decoded and brought up through the migrations from the starting build (`afd1461`), is identical to this build's, key for key (`scratch-59/t/sametowns.test.ts`); after the third merge, so are all 173 of the main line's (`fd44330`, built in a scratch worktree).
- A version 48 save (the groundwork fixture) and the same as a version 47 save load through every migration and play on (`epiphany.test.ts`, `monsters.test.ts`); a version 50 state comes up through `fromSlice59` with no hero (`heroes.test.ts`).

**Review** (`11c5f93` and the docs commit after it): `#slay`'s view drawn back (dist 15) and brought down so the fight and the Minotaur's health bar sit below the town's lines (they were under them), with Theseus still in view as it opens; a hero's ring a fifth wider, and wide and beating in a fight; a hall's panel titled for its hero (`nameOf`, `hallName`) and the hall's own picture in the build panel (`heroHallPicture`); one `worthWords` for a hero abroad (the panel's tip, the ride-out message and the report had said 60, 40, thirty and forty men; the might counts fifty hoplites for Heracles, about 33 for the others); a hero whose hall is lost while they walk in, or who is home without one, now leaves (they stood there for good), with a test. Checked: the focused smoke (the older demos, slice 55's and this slice's blocks, `#hero` and `#slay` in the other looks) on the builder's build and on the review's; the 175 prepared towns identical to the builder's; the shortened measure identical but for `#slay`'s framing; 847 tests: a full run under load had 29 failures, all on time; rerun with longer limits they pass, but for `lands`' 6-second large-land bake and the treasury's 20-minute every-demo check, both on time again.
