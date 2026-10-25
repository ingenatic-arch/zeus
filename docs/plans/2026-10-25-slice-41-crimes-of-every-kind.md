# Slice 41 — Crimes of every kind

*25 Oct 2026. Phase 6, "Crime, health and a polished city" (`docs/specs/2026-10-25-crime-health-and-a-polished-city-design.md`), the order line's first slice (wave 1), built at the same time as slices 42 (Lands of any size), 43 (Colonies that grow up) and 44 (The town's messages) on their own lines. It starts at `53e5bb4` on `claude/p6-order` (state version 37).*

## Goal and check-in

The spec's words: five new crimes beside theft, each from its own kind of trouble and with its own figure in the streets: pickpockets in the agora's and the theatre's crowds, vandals who smash a fountain's spout, a market stall or a shrine's statue until the architect's men mend it, rare arsonists with talk in the quarter first, smugglers at the quay and the caravan yard, and crooked tax collectors with a "Skimmed" line in the ledger. Gangs: when a quarter's temptation stays high for months a gang takes a house as its den, which shows; a forming gang is said aloud a season ahead; a den sends criminals out more often and its men fight a lone watchman; two watch posts covering the quarter break it up. Each kind is named in the home's panel, the crime overlay, the ledger and the stock book, and has its town line. Off in prepared histories, as theft was.

This slice builds on slice 30's machinery (`src/sim/crime.ts`: temptation with named reasons, the thief's walk out and home, the watchman who deters, chases and catches) rather than beside it: the new criminals walk, wait at a door and are caught the same way, and a full temptation decides which crime a home turns to.

**Oliver can:** open `#crimes` to watch a pickpocket working the agora's crowd, a vandal at a fountain and a smuggler on the quay, and `#gang` to see a den in a poor quarter and break it up with a second watch post.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#crimes`: a town with an agora, fountains, a theatre and a trading post, and a poor street between the agora and the quay. Played on with every crime switched on until its homes' temptation has built up; it opens with a pickpocket in the agora's crowd, a vandal on his way to a fountain and a smuggler on his way to the quay (the three sent out together as it opens: staged for the demo, and the line says so), the crime overlay on.
- `#gang`: the hut street behind the villas (`#thieves`' street) left unwatched until a gang has gathered and taken one of its huts as its den; then one watch post was built near it, and its lone watchman has been beaten off. It opens with the den showing and the line naming what breaks it up: a second watch post within reach of the den.
- `#crimes-paused`, `#gang-overlay` and the rest combine as before. Every earlier token keeps working.

## Not in this slice

The court, the prison and punishments other than the fine (slice 45); the crime rate kept month by month (slice 45, read by the overview in slice 51); the watch post's sergeant and watchmen helping each other chase (slice 45). Riots (recorded for later). Health (slice 49). The message log (slice 44): news is raised the way crime raises it now, and slice 44's integrator routes it. New wares: none.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets; the spec's *parallel plan* binds:
  - **one top-level field**: everything new lives inside the existing `crime` (spec: "`crime` grows (slices 41 and 45)");
  - new kinds appended at the very end of `WALKER_KINDS` (`pickpocket`, `vandal`, `arsonist`, `smuggler`), the ledger kinds (`repairs`, `skimmed`), the story kinds and the command kinds (`crimes`);
  - state version 38 on this line, with `fromSlice41` hooked by `if (st.version === 37) fromSlice41(st);`, filling only its own fields if they are absent; its note written as "Slice 41 (Crimes of every kind): ...";
  - new demos in blocks headed "// Slice 41"; main.ts wiring in a block headed "// Slice 41"; nothing reordered or reformatted in the shared files;
  - no new use of `MAP_SIZE` unless unavoidable (each listed in As built).
- Sim code stays pure and deterministic. Every chance in crime is a hash of the seed, the home and the day (`unit` from hazards.ts), never a draw from the state's generators, so crime shifts nobody else's random numbers. Money moves only through `pay` / `income`: repairs, skimming, fines and loot taken back are ledger lines like any other.
- **Earlier towns.** The new crimes and gangs have their own switch beside crime's, `crime.kinds`, turned on by a new command `{ type: 'crimes', on }`: on in a new game, as every demo opens (`calm()`), and from loading an old save; off in a bare state and while a history plays. Slice 30's own histories (`#thieves`, `#nowatch`, `#empire`) play with crime on but `kinds` off, so they and every other earlier demo open exactly as at the starting commit. Played on from opening, every crime can happen.
- Old saves load: a version 37 save gets no broken buildings, no talk of burning, no gangs, nothing tallied of the new kinds, and every crime on.
- The renderer and UI only read sim state; every action is a command. Static build, `base: './'`, all art in code, in the original look.
- Judge by screenshots, tune by eye, never claim it looks or feels right on Oliver's behalf.

## Before

Measured at `53e5bb4` (a copy of it outside the repo), with the other three lines building at the same time (a load of 15 to 20 on 4 cores), so every time below is slow and only large changes count.

| What | Before |
|---|---|
| Tests | 590 in 49 files, all passing (8 min 29 s under that load) |
| Build, download, loads and frame work | a copy of `measure.mjs` with its waits loosened, run on the starting commit's build in the background while the slice is built; its figures go into the check-in's Measurements beside the slice's own, run the same way |

## Design decisions

**State** (all inside `SimState.crime`, types in `crime.ts`):
- `kinds`: the new crimes' and gangs' switch (above).
- `broken`: the buildings vandals have smashed, each with what was smashed (a fountain's spout, a stall of the agora, a shrine's statue), when, and by whom; mended ones leave the list.
- `talk`: talk of burning in a home before its arsonist goes out (the home, since when, and when he goes).
- `heat`: for each district, how many months running its temptation has stayed high (a gang gathers at 2 and forms at 5).
- `gangs`: each gang's den (the home), its name ("the Lykos gang"), its district, when it formed, when its next man goes out, and since when two watch posts have covered it.
- The month's tallies gain a count for each new kind (`picked`, `smashed`, `arson`, `smuggled`, `skimmed`, and `beaten`, watchmen beaten off by a gang).
- The news gains its new kinds.
- No new building fields: a robbed store's `robbedAt` (slice 30) also marks an agora or theatre worked by a pickpocket and a quay or yard smuggled from, so none is worked twice in a month.

**The crimes, and the trouble each comes from.** Temptation is slice 30's: one score of named reasons per home, filling `tempt`. When it is full, the home turns to the crime its own trouble points to, first that has a target in reach:
1. **Arson** (rare): the most aggrieved homes, three of hungry, harshly taxed, robbed lately and fed up. It doesn't strike at once. First there is **talk of burning** in the quarter (a town line, and the home's panel: "talk of burning among the house of Nikias by the bay: hungry, harsh taxes, robbed lately"), for TALK_DAYS (20). A watchman walking by, or the grievance easing, ends the talk ("the talk has died down"). If it doesn't, an **arsonist** (a dark figure with a torch) walks to the richest home in reach or a granary or storehouse and sets it alight; then fire's own rules run (the watchman runs to it, it can spread). One talk at a time in the city, and none within six months of the last arson.
2. **Vandalism**: angry, idle homes (unhappy or fed up, and nobody in work). A **vandal** (a burly figure with a club) walks to the nearest fountain, shrine or agora within reach and smashes a fountain's spout, a shrine's statue or one of the agora's stalls. The broken building sends no walker out (its clock is held) until the architect's inspector walks by and mends it, a small repair (12 to 20 dr, a "Repairs" ledger line). The damage shows on the building, with a mark above it.
3. **Theft** comes first for a home that envies richer homes nearby (slice 30's thief, unchanged).
4. **Smuggling**: poor homes (tent, hut, cottage) with the trading post's quay or the caravan yard within reach and goods waiting there. A **smuggler** (a sea-blue tunic and a knitted cap) walks there, takes a few jars of what is waiting most, and comes home with an amphora on his shoulder: the stock book's "Smuggled away" line.
5. **Pickpocketing**: poor homes with a busy agora or theatre within reach. A **pickpocket** (a slight figure in a short tunic) walks there and works its crowd, sidling round its edge for a few days, then slips home; a few homes near it (cottages and better) have a purse cut, their story says so and their mood dips for a month. The agora's or theatre's tip says "pickpockets about".
6. **Theft**, otherwise.

Each kind has its own cap (thieves three at a time, the others one each), so the streets don't fill. A home whose crime has no target in reach falls through to the next.

**Crooked tax collectors.** When a collector hands in his satchel at an office whose wages are owed and no watchman has walked by it this month, he keeps a quarter of it: the ledger shows the taxes in full and a "Skimmed · by the tax collector" line out. The office's tip and the town line say why ("wages owed, no watchman walks by").

**Caught.** One function, `caught`, decides what happens when a watchman lays hands on any criminal: today the fine (as slice 30) and the loot back (coin to the treasury, goods to the store, quay or yard), or, for a gang's man with no second watchman near, the watchman beaten off. Slice 45 hands the caught to a court from there. A vandal or arsonist caught on his way out does no harm.

**Gangs.** Once a month, each district whose temptation has stayed high (at least three homes rising and no fewer than half the homes around them) gains a month of heat, and loses one otherwise.
- At 2 months: "Talk of a gang gathering by the bay: 5 homes have been tempted for two months. In about a season a gang will take a house as its den, unless the watch comes this way." A town line while it gathers (pressure you can see coming).
- At 5 months: the gang forms. Its den is the most tempted home in the hottest part of the quarter ("the Lykos gang has taken the hut of Lykos by the bay as its den"). The den shows (a dark tattered banner on a pole, a brazier, a mark above it), and homes within its quarter gain a reason, "a gang's den nearby".
- A den sends a man out every GANG_EVERY (8) days, two at most at a time, to steal, smuggle, smash or pick pockets, whatever is in reach (the dice are hashes); its men wear a red sash.
- A lone watchman (no other within HELP_TILES) who catches one of its men is beaten off: the man goes on, the watchman goes home bruised, and his post's next round is a week late.
- Two staffed watch posts whose rounds reach the den (by road within their range) for GANG_BREAK (20) days break it up. The den's panel and the town line count them ("one of the two watch posts needed reaches the den").
- A gang whose den is emptied, burnt or cleared scatters.

**Where it shows.**
- **The home's panel** names which crime tempts it and why ("Tempted to pick pockets at the agora: poor, the agora's crowds close by; hungry, no watchman this month · 64%, in about 12 days"), the talk of burning, a criminal of theirs out (by kind), and the den.
- **The crime overlay** shows every kind: each tempted home's column coloured by its crime, broken buildings, homes with talk of burning, and dens.
- **The ledger:** "Repairs" and "Skimmed" lines. **The stock book:** "Smuggled away".
- **The town lines** (one for crime, as now, choosing the most pressing): news of each kind for a few days, a gang gathering, talk of burning, a broken building not yet mended, criminals out by kind, and homes tempted (by kind).
- **Walkers' tips** name each criminal, what they are about and what the watchman would do.

**Drawn** in the original look, from the thief's figure: four new looks, each with its own outline and colour, and a red sash for a gang's man. Broken buildings get shards on the ground and a mark above (a cracked jar); a den its banner, brazier and mark.

## Tests

- **Determinism:** a town with every kind of crime and a gang in it gives the same state twice, and the same after a save and load.
- **Choice:** a home of each kind of trouble turns to its crime (an angry idle home vandalism, a poor home by the quay smuggling, a poor home by a busy agora pickpocketing, a most aggrieved home talk of burning); with no target, the next.
- **Each crime:** a pickpocket cuts purses and the story says so; a vandal breaks a fountain, it sends nobody out, and an inspector mends it with a "Repairs" ledger line; talk of burning comes before the fire and a watchman walking by ends it; a smuggler takes goods from the quay with a stock book line; a crooked collector skims with a "Skimmed" line. The ledger adds up through each.
- **Caught:** each kind caught gives its fine and its loot back; a gang's man beats off a lone watchman.
- **Gangs:** heat builds month by month, the warning comes a season before the den, the den sends men, two covering posts break it up, an emptied den scatters it.
- **Earlier towns:** with `kinds` off nothing new happens; every earlier demo opens with no new crime state; a loaded demo has `kinds` on.
- **Saves:** a version 37 save (`slice30-nowatch`) loads through `fromSlice41` with every crime on and nothing new under way, and plays on; a save with a gang and a broken fountain round-trips.
- The existing suite. `smoke.mjs` opens `#crimes` (the three criminals out, their tips, a broken fountain or the vandal reaching it) and `#gang` (the den, its line, a second post built and the gang broken); `measure.mjs` adds them.

## Tasks

1. Plan (this file), with the baseline measured. Commit.
2. Sim: the switch and command, the new state and migration, the choice of crime, each crime's walk and act, `caught`, skimming, broken buildings and their mending, talk, gangs; saves; tests. Commit.
3. Render and UI: the four looks and the gang's sash, broken buildings and dens drawn, the panel's crime block by kind, the overlay, the ledger and stock book lines, the town lines, the walkers' and buildings' tips, help. Commit.
4. `#crimes` and `#gang`, their views, smoke and measure; look and tune from screenshots. Commit.
5. Full checks, the demo probe, measurements, As built, the check-in. Commit, push.

## As built

Commits on `claude/p6-order`: the plan `09a8cfb`, the sim `4d06d92`, render and UI `c7eed49`, smoke and measure `818df4c`, the cap shortcut `e67a25b`, and this record after them.

**Built as planned:** the switch (`crime.kinds`, the `crimes` command, on from `calm()` and from loading, off while histories play); the choice of crime in the plan's order (arson after talk, vandalism, theft for envy, smuggling, pickpocketing, theft), each kind with its own cap (thieves 3, the others 1); the four new walkers and their acts (`src/sim/misdeeds.ts`); `caught` in one place in `crime.ts` (a lone watchman beaten off by a gang's man, otherwise the fine and the loot back); crooked collectors (a quarter kept back, "Skimmed"); broken buildings held until mended, with a "Repairs" line (fountain 12, agora 15, shrine 20 dr); talk of burning for 20 days before an arsonist; gangs (`src/sim/gangs.ts`) with heat read monthly, the warning at 2 months and the den at 5, a man out every 8 days (2 at most), broken up by two staffed posts reaching the den for 20 days, scattered when the den is gone; "a gang's den nearby" as a temptation reason; the stock book's "Smuggled away"; the panel, overlay, ledger, side panel, town lines, walkers' and buildings' tips and help.

**Changed from the plan, and why:**
- **A smashed building is mended within a month even with no inspector.** The inspector only goes where his round's creak score sends him, and fountains never creak, so a smashed fountain in a town without an architect stayed broken for good; the treasury test's `#food` town, played on, fell to 220 people (it expects at least 300). Now (1) a smashed building comes first in the inspector's round (`creakScore`, hazards.ts), and (2) after `PATCH_DAYS` (30) its own workers patch it up for the same repair, with news saying an architect's office would mend it within days. With both, that town played on two years holds 524 people.
- **A gang's men smash things only if the den itself is angry and idle** (the plan had them pick any crime in reach). Gang vandalism in a content quarter read as random and, before the patch-up, wrecked towns.
- **The beaten watchman** doesn't go home bruised with his round a week late: the gang's man goes on and that watchman won't run after him again. Simpler, and the news and tally say it happened.
- **Drawn:** a gang's men wear a red tunic rather than a sash (a sash didn't read at the city's zoom); a den has a pole with a red rag and a plaque with crossed clubs, no brazier. A smashed building gets nine shards, a fallen piece at one corner and a plaque with a cracked jar; a smashed fountain also runs dry.
- **`#crimes` is staged**, as the plan said it might be: #richtown's people are content, so its two new hut streets would take a year or more to turn to crime. It plays the town with two hut streets added until the huts are in, switches crime and its kinds on, then sends the pickpocket, and once he is working the agora's crowd, the vandal and the smuggler (`setOutAs`), opening paused with the vandal 7 tiles from the fountain. Played on from opening, every crime happens on its own: the fountain smashed after about 4.5 days, goods smuggled at 5, purses cut at 6, and the fountain mended about 19 days later.
- **`#gang`** opens with the crime overlay off (it hid the den's flag); `J` shows it.
- The pickpocket sidles both ways along the crowd's edge (8 tiles, 3 rounds) so he is seen working it; the plan said "for a few days".
- **Cost.** A CPU profile of a harsh year of `#town` put crime at 21% of a step with every kind on (12% at the starting commit), mostly a road search a day for each full home that the cap then turned away. `turnTo` now skips the search while every crime the home's trouble could point to is at its cap (same choices; 17% of a step).

**Touched outside the line** (each in a "// Slice 41" block or appended, nothing reordered):
- sim: `state.ts` (version 38, walker kinds, story and ledger kinds appended), `commands.ts` (the `crimes` command), `sim.ts` (the command; the new criminals walk as thieves do), `migrate.ts` (`fromSlice41`), `taxes.ts` (skimming), `hazards.ts` (the inspector mends; smashed buildings first in his round), `folk.ts` (caught at any crime; a purse cut), `status.ts` (tips, misdeed lines, town lines);
- game: `saves.ts` (ledger kinds, the crime checks), `demos.ts` (two demos), `views.ts` (two views);
- render and UI: `walkers.ts` (four looks, gang red), `homes.ts` (a smashed fountain runs dry), `overlay.ts` (every kind on the crime overlay), `main.ts` (marks, probes, following any criminal), `household.ts` (the crime block), `ledger.ts`, `sidepanel.ts`, `help.ts`;
- new files: `src/sim/misdeeds.ts`, `src/sim/gangs.ts`, `src/render/misdeeds.ts`, `tests/crimes.test.ts`;
- scripts: `smoke.mjs` (a Slice 41 block and its ok line), `measure.mjs` (two shots).

**MAP_SIZE:** no new use. The two demos use `sim.map.size` where they need the size; their roads and plots use the existing `T`/`row` helpers of `demos.ts`, which already use it.

**Earlier towns:** all 134 prepared towns of the starting commit, decoded by this line's code (through `fromSlice41`), are identical to the same towns decoded at `53e5bb4` except for slice 41's own fields; and this line's own prepared towns for those 134 demos match the starting commit's the same way, once the one extra command (`crimes`, sent by `calm()`) and the change counter it bumps are set aside.

**Checks:** typecheck clean; `tests/crimes.test.ts` 15 of 15; the full suite 605 tests, whose 16 failures under a load of 35 to 40 were time limits and one timing assertion, all passing on their own or failing the same way at the starting commit (the check-in has the detail); the full smoke (loosened) passes everything of this slice, and fails only four earlier checks that fail the same way at the starting commit (the right-drag turn; the trireme's, blockading ship's and quarry tool's hovers); measure run side by side (counts identical for every earlier view; timings not comparable under the load); `-modern` and `-plain` open both demos.
