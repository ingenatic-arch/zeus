# Slice 60 — Gods in war

*1 Nov 2026. Phase 7, "Beloved of the gods" (`docs/specs/2026-10-31-beloved-of-the-gods-design.md`). Wave 2 of the Epiphany line, built in the worktree `/home/claude/zeus-epiphany` on `claude/p7-epiphany`, beside slices 57 (Olympus), 58 (Temples) and 59 (Legends) on their own lines. It starts at `67cfde3`: slice 56 reviewed, with the trunk merged in (slices 55 and 56 joined, state version 50). Slices 53 and 54 are reviewed but not yet on the trunk when this slice begins.*

## Goal and check-in

The spec's words: calling a loving god against invaders; a rival's patron marching with their band, warned; gods fighting gods in your streets. Oliver's decision (31 Oct): "On both sides, in your streets: a god who loves you may answer your call and fight invaders on your map; rivals have patron gods who can march with their armies against you."

**Oliver can:** open `#godwar`, read that Ares marches with Sparta (the alarm, the band's chip, the god's hover), watch Ares come onto the map towering among Sparta's men, striking soldiers and setting roofs alight, then call Athena from the Army tab's "Call on the gods" card and watch the two gods fight in the street until one withdraws; open `#godduel` with the two already fighting.

**Demo links** (bare hash tokens):

- `#godwar`: `#battle`'s town (two companies at the barracks) with Ares furious with the city (staged: "you paid tribute to Athens") and marching with Sparta's band, the band at the west edge with Ares among it; Athena loving the city with a finished sanctuary, ready to call; the Army tab open on the card.
- `#godduel`: the same, Athena called, the two gods fighting in the street.
- `#godwar-paused`, `#godwar-modern`, `#godwar-plain`, `#godduel-modern`, `#godduel-plain`, as for every demo.
- Every earlier token keeps working, and none of them has a god at war.

## Not in this slice

- Heroes facing an enemy god (slice 59 brings heroes; slice 61 wires them in).
- The patron gods' emblems beside the cities on the map of Greece, and gods tipping odds abroad (slice 58).
- A sanctuary's own button to call its god: slice 54's panel is not on this line yet. This slice exports `callRefusal(s, god)` and the `callgod` command for its merge.
- Gods fighting another god's city on the map of Greece (out of scope for the phase).
- New wares (none needed).

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets; the spec's parallel plan binds.
- **State version** 51 locally (`SIM_STATE_VERSION`), with `fromSlice60` in `src/sim/migrate.ts`, hooked by `if (st.version === 50) fromSlice60(st);`. It fills only this slice's new field, only if absent. Its note at the top of `migrate.ts` reads "Slice 60 (Gods in war): ...", with no version number. Tests compare with `SIM_STATE_VERSION`, never a literal, but for the migration step's own test (`SIM_STATE_VERSION - 1`).
- **This slice's state** is one field added to `Gods` (`gods.war`, in a block headed "Slice 60" in `pantheon.ts`), filled by `freshGods` and the migration. Its types live in `src/sim/godwar.ts`. The gods at war are slice 56's figures (`gods.walks.figures`, with `why` 'champion' or 'foe' and a new state 'fighting'), so the renderer, the hover, the panel and the follow all carry over.
- **Moods only through the groundwork's API** (`moodOfGod`, `reasonsOf`, `moodWord`, `moodRank`, `honour` with kind `'staged'` in tests and demos). Lookups this slice needs in `pantheon.ts` go in a block headed "Slice 60" at its end.
- **Nothing changes while no god is at war.** A god marches only with the gods switched on (never in a demo's history), when a rival's patron is angry or furious (no older demo has one); a champion comes only when called. Every earlier demo opens exactly as at `67cfde3`.
- **The sanctuary check:** slice 54 is not on this line. `sanctuaryStands(s, god)` makes slice 54's own test on its records (a finished site of kind 'sanctuary' to the god, its building standing) and is marked for the integrator to become `sanctuaryDone(s, god)`.
- Sim code pure and deterministic (no random numbers at all; maths through `dmath.ts`); the renderer and UI only read; calling a god is a command (`callgod`, appended); messages through `say` with a new kind appended; panels from the kit; no `MAP_SIZE`.
- Shared files edited only in blocks headed "Slice 60"; kinds appended at the ends of their lists; nothing reordered or reformatted.
- Judge by screenshots at 1920 × 1080 in the classic look and in `-modern` and `-plain`; never claim it looks or feels right on Oliver's behalf.

## Before

At `67cfde3`, on the shared machine (four lines building at once on 4 cores).

| What | Before |
|---|---|
| Tests | 796 in 62 files (`vitest list`) |
| Build | 5 min 38 s with every demo baked again (a fresh copy of the tree) |
| Download, loads and frame work | the shortened, loosened `measure.mjs` on `dist` built at `67cfde3` (filled in below once it ends) |

## Design decisions

**State** (`gods.war`, types in `godwar.ts`):
- `marches`: a rival's patron marching with its band: the raid, the god, the god's figure once on your map (0 before), when it was said, the blow's cooldown, when they last set a building alight, how many they have set alight and how many of your soldiers they have struck down.
- `champions`: a god you called: their figure, cooldown, raiders struck down, ships struck, and how many times they have shaken the band's nerve.
- `duel`: two gods fighting, or null: your champion's figure, the enemy god's, when it began and when it ends.
- `called`: when each god last fought for you (sparse, by god).
- `strikes`: the blows struck in the last three days (who, how, from where to where, which soldiers, which ship), for the renderer's effects and for who a fallen soldier fell to; `next`: the next blow's id.

**Their champion** (a rival's patron, `patronOf(city)`):
- **Said first.** Once a day with the gods on and the city noticed, every standing threat, gathering or marching band (and a band on your map) whose city's patron is angry or furious with you gets its god: an alarm under a new kind, Gods in war ("Ares marches with Sparta's raiders: he is furious with you (you paid tribute to Athens). In your streets he strikes your soldiers and sets buildings alight, and your soldiers can't hurt him. Calm him before they come, hold out until the band breaks, or call on a god who loves you."). The band's chip says "· Ares with them", and its line (and the threat's line) "Ares marches with them: he is furious with you: ...". A god who cools past angry before the band reaches your map stays home, and that is said.
- **On your map**, as the band comes onto your land (or lands from its ships), the god rises among it with their flourish, then walks beside it, keeping up (up to 0.32 tiles a tick), straight over everything.
- **Strikes your soldiers**: the nearest soldier in the ranks within reach (the god's own reach, at least 2.4 tiles), and those round him up to the blow's most, at 0.7 of the god's blow on raiders, 1.6 times as slowly; a soldier struck down falls through the battle's own code (wounded or killed), and his house mourns him "fell fighting Ares".
- **Burns**: every two days at most, a building within 2.6 tiles that isn't a store or the tax office the band came for (as the raiders' own torches spare them), at most four; only with fire switched on.
- **Can't be hurt** by your soldiers (nobody goes for a god). The god goes home with the band once it breaks, is turned or paid off, or leaves your map, and says what they did.

**Your champion** (`callgod`, `callGod(s, god)`):
- **Who can come:** a god who is loving, whose sanctuary stands finished, while invaders are on your map (a band ashore, or ships sailing in for your beach, not yet broken), at most once a year each, and not one marching against you. `callRefusal(s, god)` says why not, in words, for the Army tab's card.
- **Where they rise:** beside the danger, 3.5 tiles from the band towards the middle of the town, on land (on the shore by the beach if the band hasn't landed). A god already visiting leaves their visit for it (what they blessed is kept) and rises anew there. They rise in a day (`WAR_ARRIVE`), not a visit's three.
- **How they fight** (`STYLES`, each: reach, ticks between blows, blow, spread, most men a blow strikes, nerve, ships):
  - Ares and Athena hand to hand (reach 2.4), hardest and quickest: two men a blow, every four or five ticks;
  - Zeus lightning from afar (12 tiles, three men a bolt); Poseidon a wave (9 tiles, four men) and, while ships are sailing in, at the ships; Zeus's bolts reach ships too;
  - Apollo's golden and Artemis's silver arrows (10 tiles, a man an arrow, every five or six ticks);
  - Hephaestus fire (7 tiles, three men); Hera a blinding light (8 tiles, two men); Demeter the earth heaving under them (7 tiles, three men); Dionysus madness (a little hurt, and nerve);
  - Aphrodite and Hermes don't fight: every 12 ticks the raiders near them lay down the fight for five days' worth of ticks (50), and the band's nerve is shaken once.
- **Breaking sooner:** a band with a champion within 10 tiles breaks once a third of its men have fallen (not half), or after its nerve is shaken five times; the news says so ("raiders break and run for the west edge: Athena is among them, and a third of their men have fallen").
- **Leaving:** once no unbroken band is on your map, or after ten days at most, where they stand (in two days), saying what they did and when they will answer again.
- The raiders can't hurt a god: they never go for one.

**Gods fight gods:** a champion called while an enemy god is on your map goes for the god first; within two tiles the two fight for four days (both 'fighting', facing, trading blows drawn as clashes of sparks every six ticks). Then the weaker withdraws: your god's love (their mood) against the enemy god's anger (minus their mood), a tie to yours, the defender. Beaten, the enemy god leaves and their band breaks at once ("Ares has fled before Athena"); beaten, yours leaves and the enemy god fights on. Said as it begins (with both numbers) and as it ends.

**Readable:** a god at war's hover names them, says what they are doing, why they fight ("Ares marches with Sparta: he is furious with you (you paid tribute to Athens)"), the duel's weights and who will win, and what can be done ("Your soldiers can't hurt him. Hold out until the band breaks, or call on Athena (the Army tab)"); for a champion, how they fight and what they have done so far. The god's panel gets the same as sections.

**The Army tab:** while a god marches against you or invaders are on your map, a "Call on the gods" card at its head: the god marching against you and why; each god who could come, with their emblem, how they fight and a button; and, in a few short lines, why the others can't (not loving, no sanctuary, came this year).

**Render** (`render/gods.ts`): the figures as slice 56's; a god 'fighting' leans into each blow; each blow drawn its own way from the shared particle pool: a bolt from the sky (Zeus), a rolling wave of spray (Poseidon), streaks of gold or silver (arrows), a ball of fire (Hephaestus), a beam of light (Hera), dust and clods (Demeter), a purple mist (Dionysus), a ring of rose or white light (the nerve), a burst of bronze sparks (a spear), great white and gold sparks between two gods (a duel), and flames as an enemy god sets a building alight.

**The map of Greece:** the band's chip and line name the god (above). A small glow in the god's colour beside the band's marker if the map's code allows it cheaply (it is the Temples line's for slice 58).

## Tests

`tests/godwar.test.ts`:
- **Independence:** no demo's town has a god at war as it opens.
- **Their champion:** with Ares furious, the march is said within a day as an alarm with the reasons, and on the band's chip and line; Ares rises with the band, strikes soldiers (some fall to him, mourned "fell fighting Ares"), sets buildings alight, and goes home with the beaten band. None with the gods off, none when only displeased; calmed before the band comes, he stays home and says so.
- **Your champion:** each refusal in turn (not loving, no sanctuary, no invaders), the call, rising beside the band, the band broken at a third, leaving, once a year.
- **Duels:** the stronger love wins, a tie goes to yours; a beaten enemy god's band breaks.
- **Nerve:** Aphrodite strikes nobody and the band breaks.
- **Determinism:** the same town, call and duel give the same state.
- **Saves:** a round trip mid-duel; the migration step on a hand-built old state; the version 48 fixture loads with no god at war.
- The purity, load-order, kit (an icon for the new message kind) and saves tests pass; `#town`'s save budget raised by what the empty record costs.

## Tasks

1. Plan (this file), with the baseline. Commit.
2. The sim: `godwar.ts`; `pantheon.ts`'s Slice 60 block; `epiphany.ts` (the war whys and state, war figures left to godwar); `state.ts`, `migrate.ts`, `sim.ts`, `commands.ts`, `messages.ts`, `saves.ts`; hooks in `battle.ts` (`breakNow`, who a man fell to), `raids.ts` (the chip and line, a band broken by a god), `fleet.ts` (a ship sunk by a god); tests. Commit.
3. Render and UI: the blows in `render/gods.ts`; the hover (`warStatus`) and the god's panel; the Army tab's card (`src/ui/godwarcard.ts`) and its button in `sidepanel.ts`; the map of Greece's glow if cheap. Commit.
4. Look and tune: `#godwar` and `#godduel` in `demos.ts`, `views.ts`, `smoke.mjs` and `measure.mjs`; screenshots at 1920 × 1080 in all three looks; tune the blows, their pace and the duel by eye. Commit.
5. Full checks: tests, build, the slow smoke (focused), the measure side by side with `67cfde3`, every earlier demo's opening against the baseline's prepared towns, old saves. As built, the check-in. Commit, push.

## As built

(To be filled in.)
