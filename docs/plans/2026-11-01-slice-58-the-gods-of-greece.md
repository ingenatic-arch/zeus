# Slice 58 — The gods of Greece

*31 Oct 2026. Phase 7, "Beloved of the gods" (`docs/specs/2026-10-31-beloved-of-the-gods-design.md`). The Temples line's second slice (wave 2), built in the worktree `/home/claude/zeus-temples` on `claude/p7-temples`, beside the Olympus, Legends and Epiphany lines. It starts at `4b3949c`: the trunk at `fd44330` (slices 55, 56 and 54 merged, state version 51) merged into the line.*

## Goal and check-in

The spec's words: "Patron gods of Greece's cities, deeds abroad moving moods, Olympus on the map of Greece, gods tipping expeditions and sea battles, Greece's festivals honouring their gods."

Greece's cities have gods of their own, and the twelve watch what you do beyond your walls. Each ruled city has a patron (Athena over Athens, Ares over Sparta, Poseidon over Corinth...), shown by their emblem beside the city's name and on its page. Making war on a city, plundering it, paying tribute, breaking a promise or sending a gift for a city's festival is remembered by the god it touches, with the reason named. A pious ruler minds how their patron feels about you. A god who loves you blesses your expeditions; an angry patron stands with their city's men; Poseidon's mood tips the fights at sea. Greece's three festivals are named for their gods. And Mount Olympus stands on the map of Greece, its page showing the twelve's moods towards you.

**Oliver can:** open `#greecegods` (Corinth's Poseidon pleased after gifts at the Isthmian Games, Athens' Athena angry after a war) and read the reasons on the Olympus page and on Athens' and Corinth's pages; send a gift during a festival or an expedition and watch the god's mood and the report.

**Demo links** (bare hash tokens):

- `#greecegods`: a town with an army and trade, its gods watching: two gifts of coin reached Corinth during the Isthmian Games, and a full force went against Athens without cause and plundered it. It opens on the map of Greece with the Olympus page open.
- `#greecegods-paused`, `-plain` and `-modern`, as for every demo; every earlier token keeps working.

## Not in this slice

Gods fighting on the map of Greece (out of scope for the phase). A rival's patron marching with its band (slice 60, which reads the same patrons). Curses and blessings at home (slice 57). Hermes and trade routes: slice 53's monthly reading of the city already counts routes and brisk trade for Hermes, so this slice adds nothing there, so as not to count it twice. Memphis keeps its own gods (no patron, no piety). No new wares.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets; the spec's *parallel plan* binds.
- **State version**: this slice keeps nothing new in the save (the deeds are the gods' memories, the piety a ruler's memory, the festivals' gods a table). It stays at 51 unless saved state turns out to be needed; if it is, the branch's version plus one, with `fromSlice58` hooked at the version before it, filling only its own fields.
- **Moods only through the groundwork's API** (`honour`, `assert`, `moodOfGod`, `reasonsOf`, `moodWord`, `moodRank`, `moodAtLeast`, `patronOf`). I add no mood maths; my functions go in `src/sim/greecegods.ts`.
- **The switch**: every honour, the piety, the blessings and Poseidon's tilt do nothing while `s.gods.on` is false, so every older demo's history (played with the gods off) is unchanged. Multiplying by a factor of exactly 1 is skipped, not done, so no float moves.
- **Hooks into existing code are one call each**, at the place the deed happens (expeditions, favours, diplomacy, raids, fleet), each listed under *Touched outside the line*.
- **Shared files** (sim, demos, prepared, smoke, measure, CHECKINS): few edits, in blocks headed "Slice 58"; nothing reordered or reformatted. New demos appended in a "Slice 58" block; the token has no '-'.
- The map's size from the land, never `MAP_SIZE`; news through Greece's news log (heard as messages by `heard.ts`) and `say`; panels from the kit.
- Sim code pure and deterministic (no random numbers here at all; maths through `dmath.ts`); player actions are commands; money only through the treasury; the renderer and UI only read.
- Judge by screenshots at 1920 × 1080 in the original look (and a glance at `-modern` and `-plain`); never claim it looks right on Oliver's behalf.

## Before

At `4b3949c`, on a loaded machine (four lines building at once on 4 cores; load average 11 to 13 as it starts).

| What | Before |
|---|---|
| Tests | `vitest list`: 804 tests in 63 files (the trunk's own runs at its merges passed, with the load's time-outs) |
| Download, loads and frame work | the loosened short measure on `dist` built at `4b3949c` in a scratch worktree (numbers added with the As built, measured side by side with the slice's) |

## Design decisions

**Findings from slice 54, first.**
- **Copper kept for the sites.** An armoury's smiths fetch copper whenever their heap is under half full, and nothing kept any for a statue or the Colossus: 600 copper went in 180 days in slice 54's test. Now a store keeps back the copper the sites still need on site (`sitesKeep` in `monumentworks.ts`, as `estatesKeep` keeps marble for the estates): the smiths' porter only goes to a store holding more than that, and takes only what is above it. The site's own ox carts take it as before. The monuments' histories: checked by the demo probe (any demo that moves is named in the check-in).
- **The priest's tint** is looked up once per sanctuary, cached by its building (a sanctuary's god never changes), not by searching the buildings for every priest every frame.
- The sanctuary stages' comment says "a year or more" with the measured fifteen months.

**Patrons** (the groundwork's `PATRONS`): Athens Athena, Sparta Ares, Corinth Poseidon, Troy Apollo, Thebes Dionysus, Argos Hera, Knossos Zeus, Rhodes Hermes; Memphis none.

**Deeds in Greece**, each an `honour` with a plain reason at the moment it happens, only with the gods on. The amounts (tuned by eye, all fading):
| Deed | God | Amount | Fades over |
|---|---|---|---|
| An expedition against a patron's city, with cause (a debt, an ally's war, crushing a vassal's rising) | its patron | −8 | two years |
| The same, without cause | its patron | −18 | two years |
| Plunder: a won expedition that took coin or goods | the city's patron | −15 more | two years |
| An expedition won, or a band broken in your streets, or sunk in your bay | Ares | +6 | a year |
| An expedition won with cause (not on Athena's own city) | Athena ("war won well") | +4 | a year |
| An expedition lost | Athena ("a foolish war") | −4 | a year |
| A gift arriving during a city's festival | the festival's god | half the ruler's memory of it, 3 to 10 | a year |
| Tribute paid (or the price of peace paid to a band) | Ares | −6 | a year |
| A promise broken (a promised request never sent, or refused; a year's deal not kept) | Zeus −8, Hera −5 | | two years |
| A promise kept (a promised request sent) | Zeus | +3 | a year |

The words name the city: "you made war on Athens, her city, without cause", "you plundered Athens", "your gift reached Corinth during the Isthmian Games", "you paid tribute to Sparta", "you broke your promise to Corinth". Each news line where the deed happens says what the gods made of it ("Poseidon is pleased (+6)"); the expedition's report says it too.

**Festivals' gods.** A `god` in each of Greece's festivals: the Isthmian Games Poseidon, the Panathenaia Athena, the Karneia Apollo (as festivals.ts says; Sparta's patron is Ares, so the Karneia's gift pleases Apollo, the god it is held for). Their words and chips name the god, and their banners on the map of Greece fly in the god's colour.

**Pious rulers.** On the first of each month, a ruler with the `pious` trait whose city has a patron remembers how that god feels about you, as one memory of its own kind (`piety`), replaced each month and lapsing within six weeks if it isn't renewed: furious −10, angry −6, displeased −3, watchful nothing, pleased +2, warm +4, loving +8, "pious: Athena, Athens' patron, is angry with your city". Through the rulers' own memory list, so it shows in their reasons and moves their mood like any other.

**Gods abroad** (`godsAbroad(s, city)`):
- **A blessing.** The most loving god (60 or more; the target's own patron never), if any, blesses an expedition: its strength counts a quarter more (×1.25). The report says "Ares, who loves your city, blessed them as they set out: the odds were the better for it."
- **An angry patron** stands with their city: its defenders count a fifth more against you (×1.2) when the patron is angry, two fifths when furious; the report says so.
- The odds shown before you send (the city's page) include both, with a line saying why.
- **Poseidon at sea.** His mood tips every sea fight: on a lane, your triremes' strength (×0.7 furious, 0.8 angry, 0.9 displeased, 1 watchful, 1.05 pleased, 1.15 warm, 1.3 loving); in your bay (raiders' and blockades' ships), your rams strike home that much more or less often and theirs the other way. The lane fight's report and the "rows out to meet" line say so when he leans either way.

**Olympus on the map of Greece.** Mount Olympus stands in the north of the map, a snowy peak in a ring of cloud with a gleam at its top, and a label ("Olympus", with how many gods love you and how many are angry). Its page, opened by clicking it: the twelve as kit cards (emblem drawn in their colour, name, the city they watch over, mood word and bar, their top three reasons). Slice 53's Olympus panel is not on this branch yet, so these are simple cards of my own, in `src/ui/greecegods.ts`, for the integrator to unify with slice 53's.

**A city's page.** Its patron's emblem beside its name on the map's label (small, in the god's colour, the tip "Athena watches over Athens"); on its page, under the ruler, a line "Athena watches over Athens" with her emblem, her mood towards you and its top reasons from Greece, and, for a pious ruler, what that is worth to them.

**Exports for other lines** (`src/sim/greecegods.ts`): `godsAbroad(s, city)`, `seaTilt(s)`, `pietyOf(s, c)`, `festivalGod(f)`, and the deed hooks.

## Tests

`tests/greecegods.test.ts`:
- every deed honours its god with its reason (expedition with and without cause, plunder, won and lost, a festival gift, tribute paid, a promise broken and kept, a band broken), and none does with the gods off;
- piety: a pious ruler's memory follows the patron's mood, is replaced not stacked, lapses; a ruler who isn't pious gets none;
- a loving god raises an expedition's odds, an angry patron lowers them; with the gods off the odds are exactly as before;
- Poseidon's tilt: 1 with the gods off or watchful, above 1 loving, below angry;
- the copper reservation: an armoury beside a store holding only what a statue still needs takes none; with more, it takes only the excess;
- determinism: the same commands give the same state with the gods on and deeds done;
- the festivals' gods.

The demo probe: every earlier demo opens exactly as at `4b3949c` (date, people, money, homes, levels, buildings).

## Tasks

1. Plan (this file), with the baseline. Commit.
2. The sim: the copper reservation and the two small findings; `greecegods.ts` (deeds, piety, blessings, Poseidon's tilt, festivals' gods), the hooks, tests. Commit.
3. Render and UI: Mount Olympus and its label and page, the patrons' emblems on labels and pages, the festivals' chips and banners, the expedition's odds line. Commit.
4. Look and tune, with `#greecegods` (setup, smoke and measure entries): screenshots at 1920 × 1080. Commit.
5. Full checks (tests, build, the smoke, the measure, every demo opening, version 47 and 48 saves), As built, the check-in. Commit, push.

## As built

(To be filled in.)
