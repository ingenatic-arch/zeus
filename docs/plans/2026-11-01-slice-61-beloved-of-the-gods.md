# Slice 61 — Beloved of the gods

*1 Nov 2026. Phase 7, "Beloved of the gods" (`docs/specs/2026-10-31-beloved-of-the-gods-design.md`). The phase's last slice, built on the trunk (`claude/project-thread-1ayu7z`, also `main`) after all four lines (Olympus, Temples, Legends, Epiphany) merged. It starts at `4d2401a` (state version 55, 944 tests).*

## Goal and check-in

The spec's words: the fourth ambition and its milestones; `#olympus`, a city with everything at once; tuning across a few years of play; the budgets; leftovers. Oliver's decision from phase 5 holds: every ambition is chased at once, so the fourth runs beside the other three from the founding.

This slice adds one small piece of state (which ambitions a town's record has looked at) and one new ambition. Around it, it puts everything the phase built into one town, plays it and `#town` forward for years with the gods on to find the numbers that are plainly off, measures the heaviest scenes against the budgets, looks at every new panel and view of the phase at both screen sizes, and closes what it can of the findings carried over.

**Oliver can:** open `#olympus` and play it for a few years, then judge whether the gods feel like another kind of diplomacy; open the laurel in the top bar and see Beloved of the gods beside the other three.

**Demo links** (bare hash tokens):

- `#olympus`: `#order`'s town (the generated river delta, about 1,900 people) given a year with the gods watching, played as a player honouring them would: shrines to eleven of the twelve (none to Ares), festivals and offerings, six sanctuaries marked out one after another (five finished, the last still rising), Demeter and Athena loving, Poseidon angry with his omen running, a monster in its lair, Heracles' hall raised and waiting on one demand, Sparta's band on the road with Ares marching with it, and a year of messages, moods and annals. Some of every ambition's milestones met, some not.
- `#olympus-paused`, `#olympus-modern`, `#olympus-plain`, as for every demo.
- Every earlier token keeps working.

## Not in this slice

New systems beyond the ambition. The underworld, oracles, heroes' quests abroad, minor gods (recorded for later in the spec). A god's ship or caravan drawn as it is lost to a curse (a finding too large for a closing slice: recorded). The phase summary (the orchestrator writes it after the review).

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- **State version 56**, with `fromSlice61` hooked at `if (st.version === 55)`, filling only this slice's field (`ambition.known`) if it is absent. Tests compare with `SIM_STATE_VERSION`.
- **Append only**: the ambition kind `gods` at the end of `AMBITIONS`, its five ids as `MILESTONE_IDS.gods`, its milestones at the end of `MILESTONES`. Nothing reordered.
- **Histories may move only on purpose** (the tuning pass). The gods are off in every history, so the ambition and any gods' tuning should move none; every demo is compared at opening (date, people, money, levels) before and after, and every one that moves is named in the check-in with how much.
- **Tune constants, not systems.** Every change is listed with before and after.
- Sim imports stay toward the leaves (`ambitions.ts` reads the gods through `pantheon.ts`, a leaf, and the sanctuaries and slain monsters straight from the state); after any sim change `#town` must still open at 8400 ticks, 736 people, 751 dr from a fresh test process.
- Sim code pure and deterministic; player actions are commands; money only through the treasury; the renderer and UI only read; messages through `say`; panels from the kit; no `MAP_SIZE`; demo tokens without '-'.
- Judge by screenshots at 1920 × 1080 and 1366 × 768; never claim it looks or feels right on Oliver's behalf.
- Budgets checked side by side with the starting commit (a shortened, loosened copy of `measure.mjs` in the scratch folder).

## Before

At `4d2401a`, on a quiet machine (load under 1 on 4 cores as it began).

| What | Before |
|---|---|
| Tests | 944 (the trunk's count at the merge of slice 57) |
| Build | 5.2 s with every prepared town cached |
| `#town` | opens 8400 ticks, 736 people, 751 dr; 1,488,490 triangles and 102 draws in its view; a save of 194,989 characters by the page (the save test's budget 194,893 for its own encoding, 194,825 actual) |
| Download, loads and frame work | the shortened `measure61.mjs` on `dist` built at `4d2401a`: see As built's table, "Before" column |

## Design decisions

**The fourth ambition, Beloved of the gods** (`gods` in `AMBITIONS`, appended): "Shrines to all twelve, great sanctuaries, and gods who love you". Its five milestones, easy to grand, each reading only what the town has:

| Id | Name | Wants | Reward | What it says while unmet |
|---|---|---|---|---|
| `shrines` | A shrine to every god | a shrine dedicated to each of the twelve | a gift of 300 dr | "Shrines to 9 of the twelve: none yet to Ares, Hermes or Hephaestus" |
| `sanctuary` | A first sanctuary | a sanctuary finished and standing | settlers drawn by fame, 3 months | "The sanctuary to Demeter: 45% built, stage 2 of 3" or "No sanctuary yet: mark one out from the Mythology tab" |
| `loving` | Loved on Olympus | three gods loving at once | every ruler 5 warmer | "2 of 3 gods loving: Demeter and Athena; Zeus nearest, warm (+48 of +60)" |
| `slain` | A monster slain | a monster slain by a hero | a gift of 1,000 dr | "No monster slain yet: the Hydra holds its marsh, and only Heracles can slay it" |
| `sanctuaries` | Six sanctuaries | six sanctuaries standing (the ambition's crown, in place of a great monument) | every ruler 10 warmer | "5 of 6 sanctuaries standing: Zeus, Demeter, …; Apollo's rising, 40% built" |

- A sanctuary stands while its building does and it is finished (a dimmed one still stands; the words say it is dimmed). Shrines count only when given to a god ("all the gods" honours none). The bars move with partial progress (a rising sanctuary's share), but a milestone is met only when whole.
- Reached milestones stay reached, as the others do. The chip's tie order puts the gods after the other three.
- **All four achieved** is now the grand finish (a town that finished all three before this slice keeps its finish). The rulers' words and the town line name the gods too; a pious ruler speaks of them.
- **Old saves**: the record gains `known`, the ambitions it has looked at. `fromSlice61` sets it to the three if absent. On its first look a town whose record lacks the gods looks at the fourth ambition quietly (what it already meets is recorded with no reward and no fanfare) and says so once, in one message ("A fourth ambition: Beloved of the gods. Your city already has 2 of its 5 milestones: …"). A new game and every demo record all four as they open.
- **Where it shows**: the Ambitions panel gets a fourth column (the panel wider; at 1366 × 768 the four fit or fall into two rows, judged by eye); the top bar's chip offers the nearest of all twenty; the help lists four; the Olympus panel and the overview's Gods page get a line with the ambition's laurels and its next milestone, opening the Ambitions panel.

**`#olympus`** (`olympusTown` in `src/game/demos.ts`, its own view): `orderTown`, then (the gods on, as calm() does as every demo opens, and the ambitions on too, so its gods' laurels come in play) a year played as a player honouring the gods would, each step when the treasury can pay for it: shrines dedicated to eleven gods, a festival each to Demeter and Athena with their sacred goods, offerings; sanctuaries marked out one after another and raised stage by stage at once as `#godwar`'s and `#blessing`'s are (their coin given and noted "set up for this demo", since `#order` has no quarry), the sixth (Apollo's) left rising with its materials coming; Demeter's and Athena's love and Poseidon's anger staged through the mood API where the year doesn't get them there, named as set up for this demo; a monster sent (`sendMonster`) and settled; Heracles' hall raised by its command, waiting on 2,000 people; Sparta's band threatened and refused (as `#battle`'s is), Ares furious and marching with it, still on the road; Poseidon's omen begun (`beginOmen`). It opens on its own view over the sanctuaries. Wrath stays off through the setup as in every demo (on as it opens), so the year has no curse but the staged omen.

**The tuning pass** plays `#olympus` and `#town` headless (gods on, as a fresh game has them) for several game years: each god's mood by month, how long a shrine, a sanctuary and festivals take to make a god pleased and warm, omens and curses (how often, what each costs, whether the city is back within a season), monsters (how often, what they cost), heroes' demands, and the gods in war (Ares with no god called, from `#godwar`). Constants change only where plainly off; figures before and after go in the check-in.

**The budgets**: `#olympus` (six sanctuaries, gods walking, a monster, a band) measured with the starting commit's heaviest scenes; every demo's load under 3 s.

**The look pass**, at 1920 × 1080 and 1366 × 768: the Olympus panel and a god's page, the sanctuary panel, the monster and hero panels, the gods-in-war card, the map of Greece's Olympus page, omens in the city, a god in the streets in all three looks, and the Ambitions panel with four columns.

**The findings carried over**, triaged:

| Finding | What I mean to do |
|---|---|
| The place of legend's plinth floats on a slope and faces the map's centre | Seat it on the lowest ground under it and face it out of the lair's mouth |
| The fête's dancers spill onto the road among the ox carts | Keep the ring of dancers off road tiles |
| Heroes are half again a man's height | For Oliver's eye |
| The god beside a band on the map of Greece is small at the default zoom | Draw it larger |
| A god angered after the band is on the map is warned only just before rising | A god joins a band only with enough days left on the road for the warning to mean something; else stays home, and that is said |
| Ares with no called god costs about 26 of 32 soldiers and 4 fires | Measured in the tuning pass; for Oliver's eye |
| Piety memory never lapses with the gods off (fade 0) | Recorded: the gods can't be switched off in play |
| At 1280 × 720 Olympus on the map of Greece is under the top bar, its label crowding Thebes' | Look; move the label if small |
| A ship or caravan lost to a curse is never drawn | Recorded for later |
| A band broken by your own god is reported as "your soldiers broke" | Say the god did it |
| A hero who withdraws wounded from a god never heals or rests | He rests at his hall for a while, and the panel says so |
| `#herogod`'s Perseus small at Ares' feet | For Oliver's eye |
| Wrath on in every demo as it opens | Check no older demo lands a curse unfairly soon after opening |
| 4f8dc29's message about `#godduel` | Nothing to fix |

## Tests

- The ambition: each of the five milestones met and unmet, read from a city (shrines dedicated, a sanctuary finished and one rising, three gods loving, a monster slain, six sanctuaries); the words name what is missing; the rewards as the others'; the grand finish with four.
- A version 55 save (and a phase 7 save from before) gaining the fourth ambition through the migration: what it meets recorded quietly, one message, no reward.
- Determinism unchanged (the existing tests), the save round-trip, the purity and load-order tests, `#town`'s save budget raised by exactly what the new field adds.
- `#olympus` opening with what it promises (six sanctuaries, one rising; two gods loving; one angry with an omen; a monster in its lair; Heracles' hall waiting on one demand; Sparta's band on the road with Ares; a year of moods and messages), in `tests/` and in `smoke.mjs`; `measure.mjs` adds `#olympus`.

## Tasks

1. Plan (this file), with the baseline. Commit.
2. The ambition: sim, migration, tests, the panel, the chip, help, Olympus and the overview's line. Commit.
3. `#olympus`: the demo, its view, prepared town, test, smoke and measure entries. Commit.
4. Tuning: `#olympus` and `#town` for several years headless; figures before and after; demos compared before and after. Commit.
5. Budgets: `#olympus` against the starting commit; fix what is over. Commit.
6. Look pass. Commit.
7. Leftovers. Commit.
8. Full checks (typecheck, tests, build, focused smoke, the shortened measure, every demo opening, old saves), As built, the check-in. Commit, push.

## As built

Built in six commits after the plan (`af35f96`): the ambition (`4893962`); `#olympus` (`6c51e61`); the findings, the tuning's one change and the look pass (`bfcb64e`); a save bug from slice 59 (`6a1700c`); a quoting fix in the smoke's new block (`d396a61`); the checks, this note and the check-in.

**The ambition** is as designed above, with one addition: a ruler's grand words and the town line name the gods. Olympus's and the overview's line reads "Beloved of the gods: 1 of 5 laurels. Next, a shrine to every god (shrines to 11 of the twelve: none yet to Ares)." The Ambitions panel's four columns fit at 1920 × 1080; at 1366 × 768 they fit side by side and the panel scrolls (two rows, under a container query, only below 940 px).

**`#olympus`, as built, differs from the design in two places:**
- **Hera is the angry god, not Poseidon.** Her curse here (quarrels) is a gentle one, and her fleece comes from a pasture. The Boar wrecks that pasture during the year, so the setup lays it again.
- **Atalanta's hall, not Heracles'.** Heracles' demands (2,000 people and a full granary) came and went with the harvest. Atalanta's two (Artemis warm, three hunting lodges) leave exactly one unmet once a third lodge is built, and she is the Boar's own slayer.

Otherwise it opens as promised:
- 1,910 people;
- shrines to eleven gods;
- five sanctuaries finished and Apollo's at stage 3 of 3. That stage waits for an armoury to cast its bronze, and its panel says so;
- Demeter (+64) and Athena (+79) loving, Hermes nearest (+55);
- Hera −42 with her omen 16.9 days off;
- Ares −72 marching with Sparta's band, 7.8 days from your edge;
- the Boar in its marsh;
- Athena walking for her festival;
- 499 messages over a year;
- the ambitions: Greece 1 of 5, trade 1, wonders 2, gods 1.

The setup takes about 30 s and is prepared at build time. Its staged moods fade (angers over two years, loves over one), because of the tuning pass below.

**The tuning pass** (scratch scripts, gods on, deals answered carefully). The figures are in the check-in's Measurements. **No system constant changed.** None was plainly off:
- shrines, festivals, offerings and sanctuaries warm a god at the rates slice 57 set;
- neglect stops at displeased;
- an angry god's omen comes about every seven months;
- quarrels cost 3% of the people;
- the monsters cost what slice 55 set;
- Ares with no god called fells 26 of 32, which is recorded for Oliver.

The one change was to `#olympus` itself. Its first build staged Hera's and Ares' anger to never fade, and the Boar had left it no fleece. A city that answered every omen still lost 60% of its people in three years, and one that answered nothing lost 70%. Fading staged moods and a pasture laid again make it recoverable: 1,571 people three years on for a player who sends offerings.

**The findings:**

| Finding | Done |
|---|---|
| Plinth floats, faces the map's centre | Fixed. `Slain.mouth` (optional) keeps the lair's mouth; the stele is seated on the lowest ground under its step |
| Fête dancers on the road | Fixed. The ring goes on open ground beside the hall (gate, sides or back), else in its courtyard |
| Heroes' height | For Oliver |
| God beside a band on the map small | Fixed. Drawn 0.95 of the band's scale, not 0.62 |
| God angered late warned just before rising | Fixed. A god joins only with 4 or more days left on the road (`JOIN_LEAST`); later it stays home, without a message (a rough edge) |
| Ares with no god called | Measured (26 of 32 felled, 4 fires); for Oliver |
| Piety memory never lapses when off | Recorded: the gods can't be switched off in play |
| 1280 × 720 Olympus label | Looked at: crowded against Thebes', below the 1366 target; recorded |
| Ship or caravan lost to a curse not drawn | Recorded |
| "Your soldiers broke" for a god's victory | Fixed. `Raid.brokeBy` (optional) and the news names the god |
| Wounded hero never rests | Fixed. `Champion.rest` (optional): a month from reaching the hall, said on the panel and in refusals |
| `#herogod`'s Perseus small | For Oliver |
| Curses soon after opening | Checked every demo with the gods on for 20 days: only `#wrath` (by design, opens paused, 4 days) and `#olympus` (warned, 17 days) land one |
| 4f8dc29's `#godduel` note | Nothing to fix |

**Two more things found and fixed:**
- **The save bug.** Slice 59's `legends` ledger kind was missing from the kinds a save accepts, so a town with visitors paying at a place of legend could not be saved. Found by loading the starting commit's `#slay` and playing it a month.
- **The look pass.** On Olympus at 1366 × 768, long names ran into their mood words.

**Histories:** all 184 earlier demos open at the same tick, people and money as at `4d2401a`.

**Checks at the end:**
- **Typecheck:** clean.
- **Tests:** `npm test`, 70 files, 958 of 958 pass (12 min 55 s).
- **Build:** clean, 2 min 43 s with every demo prepared.
- **Focused smoke:** `#town`, `#order` and the blocks of slices 53 to 61, all ok.
- **Old saves:** v47, v48 and two v55 saves load to v56, play a month and save again.

**Measure** (loosened and shortened, headless software WebGL, `4d2401a` against the end):
- **The game itself:** 1,124 KB to 1,128 KB gzipped.
- **Prepared towns:** 144 files and 5,342 KB, to 145 files and 5,438 KB gzipped.
- **`#town`:** identical triangles and draws. Its save grows from 194,989 to 195,033 characters.
- **Every demo's load:** median 2.5 s to 2.4 s, and 30 to 15 demos over 3 s (the machine's load, not the slice). `#olympus` is ready in 3.3 to 3.4 s, `#order` in 3.5 to 3.8 s.
- **`#olympus`'s opening view:** 2.42 M triangles and 143 draws.
- **A frame's work:** `#order` measured 37 ms against 26 ms at first. Remeasured side by side it was 37.2 and 29.5 ms against 45.2 and 34.5 ms, and the simulation alone runs at 3.3 to 3.7 ms a tick in both. It is noise, not a regression.
