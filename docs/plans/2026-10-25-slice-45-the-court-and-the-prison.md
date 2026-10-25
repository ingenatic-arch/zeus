# Slice 45 — The court and the prison

*25 Oct 2026. Phase 6, "Crime, health and a polished city" (`docs/specs/2026-10-25-crime-health-and-a-polished-city-design.md`), the order line's second slice (wave 2), built at the same time as slices 46 (Many lands), 47 (A colonial empire) and 48 (Building panels and the storehouse) on their own lines. It starts at `cbf302e` on `claude/p6-order`: the trunk with slice 41 merged (state version 39), slice 43 and the bug thread's quay and war-options fix.*

## Goal and check-in

The spec's words: the court (new, 3×3, a magistrate and jurors): with no court the caught are fined on the spot as now; with one, the watchman walks the caught to the court and they are tried within days. The law, set on the court's panel, gives each kind of crime its punishment: a fine, the stocks, prison, hard labour, exile or execution (Oliver's decision, 25 Oct: "I'm fine with executions"), each with its deterrence and cost shown with reasons, and what it suits. The prison (new, 3×3): cells and guards; crowded or short of guards, escapes are warned of first, and a jailbreak lets the prisoners out as criminals. The crime rate is kept month by month, by kind. Watchmen from two posts within reach of each other help each other chase.

**Oliver can:** open `#court` to watch a thief walked to the court and sentenced, change the law and see the stocks in the agora, and `#jailbreak` to see a crowded prison warned of and then broken.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#court`: a town with a court, a prison and two watch posts within reach of each other, its law set; it opens with a watchman walking a caught thief to the court (a pair in the street), the court's panel open. Played on, the thief is tried within days and sentenced by the law; set the law for theft to the stocks and the next thief caught stands a day pinned in the agora. An arsonist and a crooked collector are caught and tried in its history (the court's panel lists the last cases).
- `#jailbreak`: the same town with its prison crowded and short of guards: the prison's panel open, the warning given ("the prison is crowded and the guards are restless"); played on, the prisoners break out and run home as criminals, and the watch goes after them.
- `#court-paused`, `#court-overlay` and the rest combine as before. Every earlier token keeps working.

## Not in this slice

Health (slice 49). The overview's Crime page (slice 51: this slice keeps the monthly rate it will read). The message log (slice 44): news is raised through `crime.news`, as slice 41 does, and slice 44's routing turns it into Crime messages. The building-panel registry (slice 48): the court's and the prison's panels are their own, opened from the click handler in main.ts as the trading post's and the shipyard's are; the integrator moves them into the registry. Riots (recorded for later). New wares: none.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets; the spec's *parallel plan* binds:
  - **one top-level field**: everything new lives inside the existing `crime` (spec: "`crime` grows (slices 41 and 45): kinds, gangs, the law, cases at court, prisoners and the monthly rate");
  - new kinds appended at the very end of `BUILDING_KINDS` (`court`, `prison`), `BUILD_KINDS`, `WALKER_KINDS` (`convict`), the story kinds, the ledger kinds and the command kinds (`law`);
  - state version 40 on this line, with `fromSlice45` hooked by `if (st.version === 39) fromSlice45(st);`, filling only its own fields if they are absent; its note written as "Slice 45 (The court and the prison): ...";
  - new demos in blocks headed "// Slice 45"; main.ts wiring in a block headed "// Slice 45"; nothing reordered or reformatted in the shared files;
  - no new use of `MAP_SIZE` unless unavoidable (each listed in As built).
- Sim code stays pure and deterministic: every chance is a hash of the seed (`unit` from hazards.ts), never a draw from the state's generators. Money moves only through `pay` / `income`: fines as now; prisoners and convicts paid no wages; nothing new on the ledger beyond what each punishment's own lines need.
- **Earlier towns.** Nothing changes without a court: the caught are fined on the spot exactly as now, the law deters nobody, and no prison, convict or rate figure exists to move anything. No earlier demo has a court, so every one opens as at the starting commit. The two new rules that touch every town, watchmen helping each other and a gang's man never beating off two, change only chases that a second watchman could reach; they are switched with the new kinds (`crime.kinds`), which every history plays with off, so histories are unchanged, and a town played on from opening can see them.
- Old saves load: a version 39 save (or older, through the earlier steps) gets the default law, no cases, nobody held, no stocks, no prison unrest and an empty rate record.
- The renderer and UI only read sim state; every action is a command (`{ type: 'law', crime, punishment }`). Static build, `base: './'`, all art in code, in the original look.
- Judge by screenshots, tune by eye, never claim it looks or feels right on Oliver's behalf.

## Before

Measured at `cbf302e` (a copy of it outside the repo), with the other three lines building at the same time, so every time below is slow and only large changes count.

| What | Before |
|---|---|
| Tests | 622 in 51 files, all passing (3 min 49 s) |
| Build, download, loads and frame work | a copy of `measure.mjs` with its waits loosened, run on the starting commit's build in the background while the slice is built; its figures go into the check-in's Measurements beside the slice's own, run the same way |

## Design decisions

**State** (all inside `SimState.crime`, types in the new `src/sim/justice.ts`):
- `law`: a punishment for each of the law's rows: theft, pickpocketing, vandalism, arson, smuggling, and a gang's men (whatever they did). Defaults: theft, pickpocketing and vandalism the stocks; smuggling a fine; arson and a gang's men prison.
- `cases`: the caught waiting at a court for trial: who (home, name), what crime, whether a gang's man, the court, when brought in and the day of the trial.
- `held`: those serving a sentence away from home: prison (in which prison) or hard labour (at which quarry or mine), since when and until when.
- `stocks`: those pinned in the stocks, at which agora, from when until when (kept a month after, for the deterrence in that quarter).
- `jails`: each prison's unrest and when it was warned of.
- `rate`: this month's count of each kind of crime, the caught, the tried and the punished; and `rates`, the last 24 months closed, each with the city's people then (for crimes per thousand).
- `cut`: when the city last saw an execution or an exile (for the moods that follow), and its words.
- No new building fields. A convict's walker uses the walker fields as a thief's do (see justice.ts).

**The court** (3×3, 300 dr, 5 workers: a magistrate and four jurors; its fire risk and wear as a theatre's).
- **Caught, with a court.** `caught()` in crime.ts stays the one place that decides: with a staffed court reachable by road from where the watchman stands, the loot goes back as now but no fine is paid; the criminal becomes a **convict** (a new walker, bound hands, head down) and the watchman walks him to the court, the convict a step behind (`escort` in justice.ts). With no court, or none reachable, the fine on the spot as now.
- **At the court** the convict is handed in (a case), and the watchman goes back to his round. The trial is TRIAL_DAYS (3) after, longer while the court is short of workers (a court with none tries nobody until it has some). The household's story and the town hear the sentence.
- **The law's punishments**, each with what it deters and what it costs:
  - **a fine**: as now, coin from the household; a weak deterrent (−1 for a tent or hut, nothing for anyone richer).
  - **the stocks**: pinned for a day in the agora nearest his home (a frame of wood with the figure in it, drawn at its edge), the town's news names him; the household is shamed (mood −2 for two months); every home within 12 tiles of that agora remembers it for a month (−2 to temptation), the rest of the city a little (−1). No agora: a fine instead, said so.
  - **prison**: PRISON_MONTHS (4) behind bars; the household loses a worker for that long; −2 to temptation. It needs a prison: none, and a fine instead, said so. A full prison still takes him (crowding is the prison's trouble).
  - **hard labour**: LABOUR_MONTHS (6) as an unpaid hand at the quarry or copper mine with the most room (he fills a job; no wage is paid for him); −2 to temptation; the whole class he comes from (the poor, the middling or the rich) is a little sorer while any of theirs labours (mood −1). No quarry or mine: prison instead, else a fine.
  - **exile**: the whole household is banished: it walks out of the city as leavers do, and its home stands empty for newcomers; −3 to temptation; the poor grumble for two months (mood −1 in tents, huts and cottages) and kind rulers (generous or pious) think a little worse of you (−2, fading over a year).
  - **execution**: the condemned drinks hemlock in the court's cell, told plainly and without gore; −4 to temptation; the household loses that member and mourns (mood −3 for a season); the whole city is sombre for two months (mood −1); kind rulers think worse of you (−5, fading over a year). A gang whose man is executed or exiled breaks up.
  The deterrence counts only with a staffed court, against the crime the home's own trouble points to (crimeFor's order, read cheaply): "the law: prison for theft" is a reason holding it back, with its weight. With the new kinds off, theft only.
- **What it suits**, said on the panel: a fine suits small crimes and poor towns; the stocks pickpockets and vandals; prison thieves and smugglers; hard labour where hands are short; exile gang men and arsonists, at a cost; execution arsonists and gang men only (the panel says it is too harsh for a pickpocket).

**The prison** (3×3, 400 dr, 6 workers: guards; fire risk and wear as a barracks'). Room for CELLS (8). Each day its unrest rises while it holds more than its cells (+4 a day for each over) or has fewer than half its guards (+5), and falls by 4 otherwise. At 50 the town hears "the prison by the bay is crowded and the guards are restless: unless there is more room or more guards, there will be a breakout" (a warning, and a line on its tip and panel). At 100 the prisoners break out: each runs home as a criminal of his own crime (a thief, a smuggler, …), whom a watchman can catch again; the town hears it. A prisoner whose sentence ends walks home free (his household's story says so).

**The crime rate.** On the first of each month (while crime is on) the month's counts close into `rates` (the last 24 kept): each kind's crimes, and per thousand people. The court's panel shows the last few months; the overview (slice 51) reads it.

**Watchmen help each other.** Two watch posts are in reach of each other when a road joins them within WATCH_RANGE of either. When a watchman starts after a criminal, a watchman of a post in reach of his who is free (on his round, not at a fire, not escorting) and can reach the criminal by a short road runs after him too. Two watchmen together always win: a gang's man is beaten off only by a watchman with no other watchman within HELP_TILES and nobody else after him. A gang's man who has beaten one watchman off is known to the watch: a lone watchman no longer runs after him unless a second can join him (the post's tip says the sergeant calls on the post in reach).

**Findings carried from slice 41's review:**
- The crime overlay colours each tempted home's column by its crime (theft, pickpocketing, vandalism, arson, smuggling), with a key in the overlay's legend.
- `#court` stages an arson and a crooked collector, caught and tried (see the demo).
- Arson with no watch: measured how much an arsonist's fire takes in a town with no watch post; the talk of burning becomes a line under the top bar while it lasts, as loud as a gang gathering, and its news names what would stop it.
- Beaten-off criminals: settled as above.
- The den's count of its men out counts only its household's own grown members, each once; a den sends no more men than it has grown members not already out.
- The arsonist's torch flame drawn about three times larger, with an ember glow.
- The household panel's "Why …" line says the rule that turns them to that crime and where, not the reasons the "Tempted to …" line already gives.

**Drawn** in the original look: the court (a columned hall on a stepped base, a pediment, the magistrate's chair under a porch, two benches of jurors in the yard), the prison (a squat stone block with barred windows, a walled yard, a guard's door with a brazier), the stocks (a wooden frame at an agora's edge with the figure in it, head and hands through), and the convict (hands bound before him, head bowed, a plain grey tunic). Workers at both in `jobfolk.ts`.

## Tests

- **Determinism:** a town with a court, a prison, cases, prisoners and the stocks gives the same state twice, and the same after a save and load.
- **Without a court**, the caught are fined on the spot exactly as before (a chase in slice 30's test town, same fine, same news).
- **Routing:** a watchman walks the caught to the court by road, the convict beside him, and is back on his round after; with no road to the court, a fine on the spot.
- **Each punishment:** fine; stocks (the figure at the agora for a day, the quarter's deterrence); prison (a worker less, released after); hard labour (fills a quarry's job with no wage on the ledger; released after); exile (the household gone, its home empty); execution (one member fewer, mourning, the city's mood, kind rulers' memory). Fallbacks: no agora, no prison, no quarry or mine.
- **The prison:** crowded or short of guards, the warning comes before the breakout; the breakout sends each prisoner home as a criminal; a watchman can catch one again.
- **The rate:** a month of crimes closes into the monthly record with the right counts and per thousand.
- **The watch:** two posts in reach of each other both chase; a gang's man is never beaten off by two; a lone watchman doesn't chase a man who beat one off.
- **The ledger invariant** with fines, convicts at the quarry and prisoners.
- **Saves:** a version 39 save (`SIM_STATE_VERSION - 1`) loads through `fromSlice45` with the default law and nothing held, and plays on; a save with a case, a prisoner and the stocks round-trips.
- The existing suite. `smoke.mjs` opens `#court` (the pair in the street, the court's panel, the trial, a change of law) and `#jailbreak` (the warning, the breakout); `measure.mjs` adds them.

## Tasks

1. Plan (this file), with the baseline measured. Commit.
2. Sim: the buildings, the law and its command, `justice.ts` (escort, cases, trials, punishments, prisons, the rate), `caught()` handing over, the watch's help and the gang rule, deterrence, moods, labour's convicts, the migration and save checks, tests. Commit.
3. Render and UI: the court, the prison, the stocks and the convict drawn; workers at both; the court's and the prison's panels; the household panel's lines (at court, in prison, at labour, exiled, executed); the overlay by kind with a key; the arsonist's flame; tips, town lines, build bar, help. Commit.
4. `#court` and `#jailbreak`, their views, smoke and measure; look and tune from screenshots. Commit.
5. Full checks, the demo probe, measurements, As built, the check-in. Commit, push.

## As built

(Filled in at the end of the slice.)
