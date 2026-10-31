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
| Tests | (measured at `4f62b45`: filled in below as the run finishes) |
| Build | (as above) |
| Download, loads and frame work | (the loosened `measure.mjs` on `dist` built at `4f62b45`: as above) |

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

*(Filled in when the slice is done.)*
