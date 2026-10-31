# Slice 57 — Blessings and wrath

*1 Nov 2026. Phase 7, "Beloved of the gods" (`docs/specs/2026-10-31-beloved-of-the-gods-design.md`). The Olympus line's second slice (wave 2), built in the worktree `/home/claude/zeus-olympus` on `claude/p7-olympus`, beside the Temples (58), Legends (59) and Epiphany (60) lines. It starts at `4f62b45`: the trunk with all of wave 1 merged (slices 53 to 56, state version 52) merged into this line.*

## Goal and check-in

The spec's words: twelve blessings asked from a sanctuary or given unasked; omens a month ahead with signs in the city; twelve curses with real damage; offerings and festivals that turn them; wrath in person; monsters sent by curses.

Slice 53 made the moods move and slice 56 put the gods in the streets; nothing yet happens because a god loves or hates you. This slice makes a mood matter. A warm god with a finished sanctuary can be asked for their blessing once a year, and a loving god sometimes gives it unasked: the god walks in, and the effect lands where it shows (the fields turn gold and yield double, the sick get up, the herds swell). An angry god chooses a curse, and a month before it lands the city is warned: a message naming the god, the curse, the day and the reasons; the god's card with a countdown; and signs in the streets over the place it will strike (a dark cloud, dead birds, a red sky over the shore, blight creeping into the fields). Lift the god back past angry, with an offering or a festival, and the curse is turned. If it lands, it does real damage through the systems that already exist (fire, rubble, plague, monsters, people leaving), says plainly what it destroyed, and the city recovers.

**Oliver can:**

1. Open `#omen`: Athena is angry, her omens are running and Medusa is due in a month. Press G to read why, and what would turn it; send an offering of oil from her shrine and watch "Athena is appeased".
2. Open `#blessing`: Demeter is warm and her sanctuary stands. Ask her blessing from its panel, and watch her walk the fields as they turn gold and yield double.
3. Open `#wrath`: Poseidon's earthquake landing on the harbour, the god walking in dark and stormy to deliver it.

**Demo links** (bare hash tokens, no '-'): `#omen`, `#blessing`, `#wrath`, and their `-paused`, `-plain` and `-modern` forms as for every demo. Every earlier token keeps working, and opens exactly as before.

## Not in this slice

The gods of Greece and deeds abroad (58), heroes (59: a monster sent by a curse stays until a hero or a warm god's call), gods in war (60: Zeus's blessing strikes raiders already on the map, but no god is called to fight), the ambition (61). New wares.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets; the spec's parallel plan binds.
- **State version 53** locally (the trunk's 52 plus one), with `fromSlice57` in `migrate.ts` hooked at `if (st.version === 52) fromSlice57(st);`, filling only this slice's own field (`gods.wrath`) if absent. Renumbered at merge.
- **Moods only through the API** in `pantheon.ts`; the Olympus line owns the mood maths. Blessings and curses live in new `blessings.ts` and `wrath.ts`, which nothing else imports but `sim.ts` and the UI (no import cycles: the late notes' warning). The systems a blessing or a curse touches (production, crime, settlers, folk, hunting, trade, the seas) read one small lookup each from `pantheon.ts`, a leaf.
- **Shared files** edited in blocks headed "Slice 57", kinds appended at the end of their lists (a command kind or two, a message kind), never reordering or reformatting existing lines.
- **No new wares.** **Money** only through the treasury (Zeus's gift an income with its own reason).
- **Wrath is always warned** (Oliver's decision): no curse lands without its omen a month before; anything that lifts the god past angry turns it. One omen at a time in the city, never two curses from one god at once. **Never in a demo's history:** wrath and unasked blessings have their own switch, off while a history plays, on as a demo opens and as a game starts, so every older demo opens exactly as before.
- Sim code pure and deterministic (hashes of the seed only, so no older roll moves; `dmath`); the renderer and UI only read; every action a command.
- Judge by screenshots at 1920 × 1080, in the original look and the other two; never claim it looks or feels right on Oliver's behalf.

## Before

At `4f62b45`, on a shared, loaded machine (load about 18 to 25 on 4 cores, three other lines building beside it). Measured in a detached worktree of `4f62b45` in the scratchpad, so the slice's edits never touch the baseline.

| What | Before |
|---|---|
| Tests | 857 in 64 files: 853 pass; 4 fail on time under the load (two land-bake timings, the routes replay at its 60 s limit, the wages test at its 20-minute limit); 40 min 47 s |
| Build | 21 min 7 s with every demo baked again |
| Download | 145 files, 5,975 KB gzipped: the game 1,069 KB, 135 prepared towns 4,906 KB (largest 82 KB) |
| Loads (page's clock, headless, loaded machine) | the bare link ready at 6.8 s, first frame 9.8 s; `#town` ready at 9.4 s |
| `#town` | 1,488,490 triangles and 102 draws in its view; 736 people; a save of 194,806 characters |
| A frame's work before drawing | `#town` 30.6 ms, `#gods` 110.2 ms (two frames each under software rendering: not representative) |

## Design decisions

**Tuning first.** Slice 53's review found one shrine puts its god only at +7 to +9 (the top of watchful), and that Ares, Hephaestus and Hermes see nothing in `#town` and `#richtown`. A scratch run of a few game years (the reviewer's `years.ts`) tunes `worship.ts`'s weights so that a well-run city honouring a god with a shrine reaches pleased within a year, and with a sanctuary and a festival, warm. Every god gets at least two readings an ordinary city can show (Ares: barracks and towers, walls; Hephaestus: workshops at work, the masons; Hermes: the agora's stalls, the caravan yard and the trading post). Slice 58 remembers tribute as a deed, so Ares' monthly "you paid tribute" reading goes (the deed stays). The festival's wording ("by the agora for the agora") is fixed.

**Where it lives.** `src/sim/blessings.ts` (new): the twelve blessings in one table (what each does, how long it lasts, its words), asking, giving unasked, landing and running out. `src/sim/wrath.ts` (new): the curses in one table, choosing one, the omens and their signs, turning, landing, wrath in person, and lasting curses running out. Their state is one new field on the gods' record, `gods.wrath`: its switch, the omens running, the spells (blessings and lasting curses) in force, and when each god last blessed, was asked, and cursed. `pantheon.ts` gains a Slice 57 block of lookups the systems read (`spellOf`, `godPace`, `godCrime`, `godSettle`, `godMood`, `fairSeas`, `godPrice`).

**Blessings** (each god their own; all in one table with how long each lasts):

| God | Blessing | Lasts |
|---|---|---|
| Zeus | a gift of coin from the sky's treasury (an income, its own reason), and his lightning strikes down raiders on your map, one a day | a season |
| Hera | every colony's and vassal's loyalty rises, and a child is born in every house with room | at once |
| Poseidon | fair seas: no winter storm holds the merchant ship back, she sails a quarter quicker, and your triremes too; and a tremor clears every heap of rubble | a year |
| Demeter | every farm yields double | a season |
| Athena | olive groves and presses double, and crime falls by half | a season |
| Apollo | every sick home is healed, and a plague ends at once | at once |
| Artemis | the wild herds swell to whole, and hunters bring home double | a season |
| Ares | armour for every man who waits for it, delivered to his barracks, and the wounded healed | at once |
| Aphrodite | every home's mood rises, and settlers come twice as often | a season |
| Hephaestus | every fire goes out at once, and the armouries, mines and masons work double | a season |
| Hermes | your prices better (a seventh more when you sell, a seventh less when you buy) | a season |
| Dionysus | the vineyards and wineries yield double, and a festival in every home | a season |

Asked (a command, `bless`, from a finished sanctuary's panel or the god's page) once a year per god, when the god is warm or better and their sanctuary stands; given unasked now and then by a loving god (at most once in two years, with the switch on). Either way the god comes in person (slice 56's `startVisit`, a new reason `blessing`) and walks to the places they love, blessing each as slice 56 does; the blessing's own effect lands at once and shows where it lands: the fields gold (slice 56's shimmer on every farm under Demeter's), a line on each building panel it touches, a message saying what it did ("Demeter blesses your fields: every farm yields double until autumn"). A sanctuary its own god walks in is honoured for the season (a reading, "+3 she walked in her sanctuary").

**Wrath, always warned.** Once a day, with the switch on and the city noticed, an angry or furious god with no omen and no curse of theirs in force, and none landed or turned in the last half year, chooses a curse (by a hash of the seed, the god and the day, among those the city can feel), if no other omen is running. The omen begins a month before the curse lands: a warning naming the god, the curse, the day and the reasons ("Ominous signs: owls flee the city and the olives drop unripe. Athena is angry: you honoured Poseidon, her rival; … In a month, on 14 March, she will send Medusa. An offering of oil, a festival to her, or anything that lifts her past angry will turn it."), repeated five days before. The god's card and page show the curse, its target and the day with a countdown, and what would turn it; the overview's Gods page marks it. In the city, signs over the target: a dark cloud turning over it, dead birds on the ground, blight creeping into the fields for Demeter, a red sky over the shore for Poseidon (render only, cheap tints and sprites). Each day, if the god's mood has risen to displeased or better, the curse is turned: "Athena is appeased: the owls come back to the olive trees, and Medusa will not come."

**The curses** (through the existing code; each said plainly with what it destroyed; sized so a mid-sized city loses a season's progress, not its future):

| God | Curse | What it does |
|---|---|---|
| Zeus | lightning (in person) | four buildings round the target catch fire (hazards' fire, which spreads and is fought as any) |
| Hera | the Hydra; or quarrels | `sendMonster('hydra')`; or households in a dozen homes quarrel and some leave the city |
| Poseidon | earthquake (in person); or the Cyclops | buildings within reach of the shore near the quay fall to rubble, walls crack, roads break; or `sendMonster('cyclops')` |
| Demeter | blight | the fields yield a quarter for a season, and the fullest granary's grain rots |
| Athena | Medusa; or the olives fail | `sendMonster('medusa')`; or the groves bear nothing for a year |
| Apollo | plague (in person) | plague from his arrows in the quarter he names (health's outbreak) |
| Artemis | the Boar; or the herds vanish | `sendMonster('boar')`; or every wild herd thinned to a quarter |
| Ares | the Chimera; or brawls | `sendMonster('chimera')`; or the barracks set alight in brawls and a quarter of the soldiers desert |
| Aphrodite | heartbreak | households break up (some leave), and every home's mood falls for a season |
| Hephaestus | Talos; or fires in the workshops | `sendMonster('talos')`; or three workshops catch fire |
| Hermes | thieves | thieves everywhere for a season (temptation to crime doubled) |
| Dionysus | a drunken riot (in person) | revellers smash every fountain, shrine and agora stall in the quarter (crime's broken places, mended as any) and set two houses alight, and half the wine in the stores sours |

**Wrath in person** for the greater curses (lightning, earthquake, plague, riot): a few days before the day, the god rises a few tiles from the target and walks to it, slice 56's figure darker and stormier (a tint and a storm flourish in `src/render/gods.ts`, in a Slice 57 block), and the curse lands on the day. A wrath figure blesses nothing.

**The switch** (`gods.wrath.on`, a command `wrath`): off in a bare state and while a demo's history plays; on as a demo opens (`calm`), as a game starts, and in an older save loaded with the gods on. With it off no omen begins and no blessing comes unasked; asking still works, and an omen staged by a demo runs.

**Messages:** a new kind `wrath` (filter City, may pop up) for omens, curses landing and turned; blessings under `gods`.

## Tests

- `tests/wrath.test.ts`: no omen before noticed, with the switch off, or for a god above angry; an omen chosen a month ahead with its words naming the god, the curse, the day and the reasons; never two at once; turned when the mood rises past angry (an offering's honour); every curse lands without throwing on a prepared town and does what it says (fires lit, rubble, plague, people gone, a monster sent); determinism (same seed and commands, same curse, same target, same city).
- `tests/blessings.test.ts`: asking refused and allowed (warm, a finished sanctuary, once a year); every blessing lands on a prepared town and does what it says (farms' pace doubled, the sick healed, herds whole, fires out, Zeus's coin through the ledger with the invariant held); a loving god's unasked blessing at most once in two years; the season's end.
- The migration from a version 52 state by hand; version 47 and 48 saves loading through every migration; a round-trip with an omen running and a blessing in force.
- Worship's tuning: a scratch run of a few game years recorded in As built (not a test).
- `smoke.mjs` and `measure.mjs`: `#omen`, `#blessing`, `#wrath`.

## Tasks

1. Merge the trunk (done: `4f62b45`), the plan with the baseline. Commit.
2. Tuning: worship's weights and readings from a scratch run of a few years; Ares' tribute reading dropped; the wording. Commit.
3. The sim: `blessings.ts`, `wrath.ts`, the state field, migration, commands, the hooks, tests. Commit.
4. Render and UI: the omens' signs, the stormy figure, the Olympus card and page, the sanctuary's blessing slot, the overview's marks, the message icon. Commit.
5. Look and tune: `#omen`, `#blessing`, `#wrath`, views, smoke and measure entries; screenshots at 1920 × 1080. Commit.
6. Full checks (tests, build, slow smoke, measure, the demo probe, old saves), As built, the check-in. Commit, push.

## As built

**Commits** on `claude/p7-olympus`: `4f62b45` (the trunk merged, wave 1), `1843374` (this plan), `90417c3` (tuning), `6484fa8` (the sim), `08f9eb5` (render, UI and demos), `38d992a` (look and tune), `14b2fd3` (saves keep a god in wrath; the record checked), `f7eb292` (the checks), `5d070f0` (the wrath figure darker), `38e5f6e` (the trunk merged again, slice 59), and the check-in.

**State version 54**: 53 on the line (the trunk's 52 plus one), then 54 after the trunk moved on to 53 with slice 59; `fromSlice57` is hooked at 53 (`if (st.version === 53) fromSlice57(st);`, after slice 59's at 52): it adds `gods.wrath`, switched on when the gods are on. The integrator renumbers at merge.

**Tuning** (`worship.ts`). Shrines honour their god 8, 4, 2, 1 (at most 16 from shrines). New readings so every god can be seen in an ordinary city: Ares the barracks (or "young men enough for an army"), the watch and the walls (the monthly tribute reading is gone, and is forgotten from older saves); Hephaestus the workshops at work and no fire left to burn; Hermes the agora's stalls and a quay or caravan yard. The festival's words are "…, to walk round it". In `#town` one shrine to Demeter lifts her to +10 (pleased) in the first month.

**Blessings** (`src/sim/blessings.ts`): as the table above, with these changes. Hera's lasts a season (the loyalty), with the children born at once. Ares' gives armour to each barracks for the men waiting for it and heals the wounded, but doesn't fill companies. Hermes' is the prices alone (caravans and porters are not quicker: walker speed has no state to read). Poseidon's fair seas make the merchant ship a quarter quicker and enemy ships slower, but not your own triremes. Zeus's coin goes through the treasury (`income`, kind `worship`, "gift of Zeus"); his lightning sets a raider's hp to 0 once a day and the battle does the rest. Asked with the command `bless` (a sanctuary's new Blessing section, the god's Olympus page); a loving god may give one unasked on the first of a month (odds 1 in 6, at most once in two years, switch on). The god walks in (slice 56's figure, reason `blessing`) and blesses the places they love as slice 56 does; a sanctuary its own god has walked in and blessed (on any visit) honours them, "+3 she walked in her sanctuary this season", while that place's blessing lasts. Messages are of kind `gods`.

**Wrath** (`src/sim/wrath.ts`): eighteen curses in one table, as above, with these changes: Poseidon has no shipwreck (the earthquake or the Cyclops), Hermes no lost caravan (thieves for a season), Dionysus' riot sours half the wine but is otherwise as planned. Brawls need a barracks, so `#richtown` can't be given them. Choosing, warning (a month ahead, again five days before), the god in person eight days before (lightning, earthquake, plague, riot), turning, landing and the end of lasting curses are as designed. A monster curse's omen means the monster's lair; its storm gathers over the town's middle so the signs are in the city.

**Render and UI.** `src/render/omens.ts` (new): a storm cloud over the omen's place (bigger and darker as the day nears, lightning flickering), a red ring on the ground for a curse on a place, dead birds about it, grey-brown blight on the farms or groves for Demeter's blight and Athena's failed olives; a small cloud over a god come in wrath. `src/render/gods.ts` (a Slice 57 block): a god in wrath is their figure darkened towards a thundercloud with a thin storm-red rim, a dim glow and halo, embers about them, violet storm-light and lightning at the place; no gold burst or motes. `src/ui/olympus.ts` (a Slice 57 block): a card shows an omen (red, its curse and days left), a curse or a blessing in force, and what the god's blessing and curses really do; the god's page opens on the omen (the days left on a bar, the signs, why, what would turn it), a curse or blessing in force, or the blessing to ask at their sanctuary; "What they can do" lists the real blessing and curses, the coming one marked; the overview's Gods page marks a god with an omen, and the Gods tab reads "omen: Athena" in red. Messages kind `wrath` (City, pops up) with its own icon.

**Demos:** `#omen`, `#blessing`, `#wrath` (described in the check-in). Older demos open as before: `#town`, `#richtown`, `#gods`, `#procession`, `#epiphany`, `#sanctuaries`, `#monster` and `#order` open at the same tick with the same people, money and house levels as at `4f62b45`; only `#gods`' and `#procession`'s moods move with the tuning (Poseidon +28 not +24 in `#gods`, Ares and Hephaestus now +2 and +3 where they were 0). `#town`'s save is 77 characters longer (the empty record of wrath); the budget went from 194,710 to 194,787 on the line, and from the trunk's 194,734 to 194,811 at the second merge. After that merge `#hero` and `#slay` open exactly as on the trunk.

**Hooks other lines can use** (exported): `giveBlessing(s, map, god, asked)`, `askBlessing`, `blessRefusal`, `BLESSINGS` (blessings.ts); `beginOmen(s, map, god, curse?, lead?)` (the hook for staging an omen), `CURSES`, `GOD_CURSES`, `omenOf`, `curseInForce`, `turnWords`, `wrathful` (wrath.ts); `blessingFrom`, `curseNow`, `godPace`, `godHunt`, `godCrime`, `godSettle`, `godMood`, `fairSeas`, `godPrice`, `godBond`, `freshWrath` (pantheon.ts); `healAll(s, by)` (health.ts); `desert(s, map, soldier)` (army.ts); the probe `__zeus.wrath()`.

**Touched outside the line** (each a marked Slice 57 line or block): production.ts (`godPace`), hunt.ts (`godHunt`), crime.ts (`godCrime`), settlers.ts (`godSettle`), folk.ts (`godMood`), seasons.ts (`fairSeas` in `stormDelay`), trade.ts (`FAIR_SAIL`), fleet.ts (enemy ships' pace), routes.ts (`godPrice`), vassals.ts and colonies.ts (`godBond` in loyalty), health.ts (`healAll`, and `startOutbreak`'s words with no city), army.ts (`desert`), epiphany.ts (the reasons `blessing` and `wrath`, their words, a wrath figure blessing nothing, the sanctuary boon's words), state.ts, migrate.ts, messages.ts (kind `wrath`), commands.ts (`bless`, `wrath`), sim.ts, saves.ts (a wrath figure kept; `wrathOk`), icons.ts, main.ts (the omens' view, the wrath probe, wrath on at a new game), demos.ts, views.ts, sanctuarypanel.ts's slot (filled from olympus.ts), olympus.css, smoke.mjs, measure.mjs, tests/saves.test.ts (the budget), tests/epiphany.test.ts (wrath's switch off in the loving-visit test, so an unasked blessing can't come in its weeks).

**Checks before the check-in.** The full `npm test` before the second merge: 893 tests, 890 pass (24 min 46 s); the slice 56 loving-visit test (now needs wrath off) and my own old-save test's expectation were fixed and pass, and the wages test, which timed out at its own 20-minute limit as at `4f62b45`, passes alone (17 of 17). After merging slice 59: wrath, blessings, saves, load order, epiphany, heroes, worship, purity and messages, 121 of 121. Version 47 and 48 saves load through every migration and play a month (`tests/wrath.test.ts`). The build bakes all three new demos faithfully. A focused, loosened smoke (the new demos, the blocks of slices 52 to 59, five older demos opened) passes. The measure, side by side with `4f62b45`, is in the check-in. Screenshots at 1920 × 1080 were judged by eye in the scratchpad.
