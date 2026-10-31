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

*(Filled in as the slice is built.)*
