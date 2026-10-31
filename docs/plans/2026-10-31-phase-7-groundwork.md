# Phase 7 groundwork — the twelve's table and the gods' mood API

*31 Oct 2026. Phase 7, "Beloved of the gods" (`docs/specs/2026-10-31-beloved-of-the-gods-design.md`). The first stage of slice 53, built on the trunk (`claude/project-thread-1ayu7z`, also `main`) before the four lines (Olympus, Temples, Legends, Epiphany) branch from it. It starts at `9539f63` (state version 47).*

## What the groundwork is

The shared foundation every line of phase 7 reads, and nothing more:

- `src/sim/pantheon.ts`: the twelve gods' table (names, epithets, colours, emblems, loves and hates, rivals, sacred goods, monsters, curse and blessing words), the seven monsters and seven heroes, Greece's patron gods, and the gods' mood API.
- `gods` in the state (the switch, when the city was first noticed, each god's memories), and a shrine's `god` (optional, on the building record; absent means "to all the gods").
- The migration `fromSlice53g` (state version 47 to **48**).
- `tests/pantheon.test.ts`.

Nothing in the city reads the gods yet, so no demo and no history moves. No UI: slice 53 adds the dedication, the panel and everything that moves a mood.

## The API

Types: `GodId` (the twelve), `GOD_IDS` (fixed order, append only), `God`, `GODS`, `Emblem`; `MonsterId`, `MONSTER_IDS`, `Monster`, `MONSTERS`, `Lair`; `HeroId`, `HERO_IDS`, `Hero`, `HEROES`; `PATRONS`; `Gods`, `GodReason`, `GodMood`, `GOD_MOODS`. Constants: `NOTICE_PEOPLE` (300), `MEMORY_CAP` (24), `MOOD_LIMIT` (100).

| Function | What it does | Example |
|---|---|---|
| `honour(s, god, amount, kind, why, fade)` | A god remembers something, fading over `fade` ticks (0: never). One of the same kind and reason is merged into (worth now plus the new amount, from now, kept within ±100). | `honour(s, 'demeter', 20, 'festival', 'your festival to Demeter', 6 * TICKS_PER_MONTH)` |
| `assert(s, god, kind, why, amount, fade = 0)` | Something that counts while it lasts: replaces the memory of that kind and reason, never stacking. 0 forgets it; a fade a little longer than how often it is asserted lets it lapse once it stops. | `assert(s, 'poseidon', 'shrine', 'your shrines to Poseidon', 4)` |
| `moodOfGod(s, god)` | The mood now, -100..100, clamped. | `moodOfGod(s, 'athena') // -34` |
| `reasonsOf(s, god)` | The reasons, `{ worth, why, kind, fading, tick }`, weightiest first either way (newest of equals first), none worth 0. | `reasonsOf(s, 'demeter')[0] // { worth: 18, why: 'your sanctuary to Demeter', … }` |
| `moodWord(n)` | furious (< -60), angry (-60), displeased (-30), watchful (-10), pleased (10), warm (30), loving (60): the `GOD_MOODS` table, each word with the lowest mood it is said of. | `moodWord(moodOfGod(s, 'ares')) // 'angry'` |
| `moodRank(n)`, `moodAtLeast(n, word)` | Where a mood stands, 0 (furious) to 6 (loving); "warm or better". | `moodAtLeast(moodOfGod(s, 'athena'), 'warm')` |
| `noticed(s)` | The city has had 300 people (the tick is kept in `gods.noticedAt`, so it never flips back). | `if (!noticed(s)) return; // no wrath for an early town` |
| `patronOf(city)` | A city's patron god, or null (Memphis, your city). | `patronOf('sparta') // 'ares'` |
| `freshGods(on, noticedAt)` | A fresh `gods` record. | `freshGods()` |
| `setGods(s, on)` | The switch (the `gods` command). Switched on, a city of 300 is noticed at once. | `sim.enqueue({ type: 'gods', on: true })` |
| `stepGods(s)` | Once a tick (after the ambitions): notices the city; once a day, forgets memories that have faded. Nothing with the switch off. | (in `sim.ts`) |

The fading maths is the rulers' (`memoryWorth`), moved to `src/sim/memory.ts` (a leaf, re-exported from `world.ts`) so `pantheon.ts` imports only leaf modules and changes no module's load order (see `laurels.ts`).

## Rules for the lines

- **Moods only through this API.** No line reads or writes `s.gods.memories` directly (tests may, to set things up); use `honour`, `assert`, `moodOfGod`, `reasonsOf`, `moodWord`/`moodRank`/`moodAtLeast` and `noticed`. Until slice 53 merges, a line sets a mood it needs with `honour(s, god, n, 'staged', why, 0)`.
- **Olympus owns the mood maths** (merging, capping, clamping, the thresholds, rivalry, neglect). Rivalry is not in `honour`: slice 53 adds it as its own function.
- **Other lines add only functions**, at the end of `pantheon.ts`, in their own blocks headed by their slice (`// Slice 55: …`). The table's lists are append only.
- **Their own state** goes in their own top-level field (`legends`, sanctuaries in `monuments`), or as new fields appended to `Gods` in a block headed by their slice, filled by their own migration.
- **The switch:** anything a line adds that acts on its own does nothing while `s.gods.on` is false, so every demo's history stays as it is.
- **State versions** are renumbered at merge: the groundwork has 48, the first line to merge after it takes 49.

## As built

State version **48** (`fromSlice53g`). Files: `src/sim/pantheon.ts` (new), `src/sim/memory.ts` (new: `memoryWorth`, moved from `world.ts`, which re-exports it), `src/sim/state.ts` (`gods`, a building's `god?`), `src/sim/sim.ts` (`freshGods`, the `gods` command, `stepGods` after `stepAmbition`), `src/sim/commands.ts` (`{ type: 'gods'; on }`, appended), `src/sim/migrate.ts`, `src/game/saves.ts` (`godsOk`; a building's `god`, if any, must be one of the twelve), `src/game/demos.ts` (`calm()` switches the gods on as every demo opens, after health), `src/main.ts` (a new game switches them on), `tests/pantheon.test.ts`.

Choices the spec left open: the epithets (Zeus the cloud-gatherer, Hera the queen of heaven, Poseidon the earth-shaker, Demeter the giver of grain, Athena the grey-eyed, Apollo the far-shooter, Artemis the huntress, Ares the sacker of cities, Aphrodite the foam-born, Hephaestus the lame smith, Hermes the swift messenger, Dionysus the twice-born); the colours (in `GODS`, all twelve distinct, to be judged by eye when slice 53 draws them); the lairs (the Hydra and the Boar a marsh, the Cyclops and Talos a rocky shore, Medusa, the Minotaur and the Chimera a cave) and the Minotaur's, the Chimera's and Talos' targets; the heroes' epithets. The Legends and Olympus lines may change any of these words.

**Checks**
- `npm run typecheck` clean; `npm test` 803 tests in 60 files, all passing (783 before, plus 20 in `tests/pantheon.test.ts`); `npm run build` succeeds, every one of the 165 prepared towns rebuilt and kept (79 s with the towns baking).
- **Every demo unchanged:** each of the 165 demos with a history was played at `d39b19f` and here, and compared as it opens and 900 ticks on: the same date, people and money for every one, and the whole state the same (leaving out `gods`, the version and the count of commands applied, since switching the gods on is one more command).
