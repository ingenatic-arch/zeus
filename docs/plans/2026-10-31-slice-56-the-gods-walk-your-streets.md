# Slice 56 — The gods walk your streets

*31 Oct 2026. Phase 7, "Beloved of the gods" (`docs/specs/2026-10-31-beloved-of-the-gods-design.md`). Wave 1 of the Epiphany line, built in the worktree `/home/claude/zeus-epiphany` on `claude/p7-epiphany`, beside slices 53 (Olympus), 54 (Temples) and 55 (Legends) on their own lines. It starts at `11f9290` (the groundwork: the twelve's table, the mood API, state version 48).*

## Goal and check-in

The spec's words: twelve towering, glowing god figures, their flourishes, halos and trails; visits that walk to what each god loves and bless it for a season. A god's figure is about three storeys tall, built in code from their parts, glowing in their colour, with a soft halo on the ground and a fading trail of light where they step; they walk over houses and roads, never blocked, at a stately pace. Their arrival is a flourish with a short sound sting and a message saying who has come and why; the camera never moves on its own. Hovering a god names them and says what they're doing.

**Oliver can:** open `#epiphany` and watch Demeter rise over the fields of a farming town and walk the farms and the granary, each place she touches shimmering gold and saying so in its panel; open `#pantheon` and compare all twelve standing in a row in an open field; hover a god to read what they're doing and why, and click one for a small panel (their mood, why they came, where they go next).

**Demo links** (bare hash tokens):

- `#epiphany`: a farming town (`#town`'s, 28 months in) with Demeter loving it (staged through the mood API), the moment she arrives over its fields in a rain of petals. It runs at normal speed, so she rises, walks to the farms and the granary, blesses each, and leaves.
- `#pantheon`: all twelve standing still in a row in an open field on the Bay, posed (they never walk or leave), the camera over them.
- `#epiphany-paused`, `#epiphany-modern`, `#epiphany-plain`, `#pantheon-modern`, `#pantheon-plain`, as for every demo.
- Every earlier token keeps working, and none of them shows a god.

## Not in this slice

- Moods in play, dedications, festivals at home, offerings (slice 53, Olympus line) and sanctuaries (slice 54, Temples line). This slice exports `startVisit(s, god, why)` for their merges to call (a festival begun, a sanctuary finished); until then a visit starts only when a god's mood first reaches loving, or from a demo.
- Wrath in person (slice 57 reuses these figures, darker, with storm instead of light) and gods in war (slice 60).
- The Olympus panel and the Gods page of the overview (slice 53).
- New wares (none needed).

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets; the spec's parallel plan binds.
- **State version** 49 locally (`SIM_STATE_VERSION`), with `fromSlice56` in `src/sim/migrate.ts`, hooked by `if (st.version === 48) fromSlice56(st);`. It fills only this slice's new field, only if absent. Its note at the top of `migrate.ts` reads "Slice 56 (The gods walk your streets): ...", with no version number (the orchestrator renumbers at merge). Tests compare with `SIM_STATE_VERSION`, never a literal, but for the migration step's own test.
- **This slice's state** is one field added to `Gods` (`gods.walks`, in a block headed "Slice 56" in `pantheon.ts`), filled by `freshGods` and the migration. Its types live in `src/sim/epiphany.ts`.
- **Moods only through the groundwork's API** (`moodOfGod`, `reasonsOf`, `moodWord`, `moodAtLeast`, `honour` with kind `'staged'` in tests and demos). Functions this slice needs in `pantheon.ts` go in a block headed "Slice 56" at its end.
- **Nothing changes while no god walks.** Every effect a visit has (a blessing on a building) exists only after a visit; visits start only with the gods switched on, when a god reaches loving (no demo's history has one), or from a demo's setup. Every earlier demo opens exactly as at `11f9290`.
- Sim code pure and deterministic (no random numbers at all here; maths through `dmath.ts`); the renderer and UI only read; a visit started from outside the sim is a command (`visit`, appended); messages through `say` with a new kind appended; panels from the kit; no `MAP_SIZE` (the land's own size).
- Shared files edited only in blocks headed "Slice 56"; kinds appended at the ends of their lists; nothing reordered or reformatted.
- Judge by screenshots at 1920 × 1080 in the classic look and in `-modern` and `-plain`; never claim it looks or feels right on Oliver's behalf.

## Before

At `11f9290`, on a loaded machine (four lines building at once on 4 cores; load 8 to 16).

| What | Before |
|---|---|
| Tests | 803 in 60 files (the groundwork's own run: all pass). My run on the loaded machine: 795 passed, 8 timed out, in 29 min 40 s |
| Build | 14.6 s with the prepared towns cached |
| Download, loads and frame work | the loosened `measure.mjs` on `dist` built at `11f9290` (filled in below once it ends) |

## Design decisions

**State** (`gods.walks`, types in `epiphany.ts`):
- `figures`: the gods in the city now, each with its god, where it stands (`x`, `z`, and where it stood a tick ago, for the renderer's smooth step), its heading, its state (`arriving`, `walking`, `blessing`, `leaving`, or `posing` for `#pantheon`), when that state began, why it came (`loving`, `festival`, `sanctuary`, or `pose`) and the words for it, the places it means to visit (building ids, with the spot it walks to), which it is on, and the tick it must leave by.
- `blessed`: each place blessed, by building id, the god and the tick it lasts until.
- `loving`: the gods who were loving at the last daily look, so a visit comes as a god *first* reaches loving (again after a year).
- `last`: when each god last visited (-1: never), by `GOD_IDS` order.
- `next`: the next figure's id.

**A visit** (`startVisit(s, god, why)`, exported, also the `visit` command):
- Refused (returns null) if the same god is already in the city, or `MAX_GODS` (3) walk already (a pose ignores the cap).
- **Where they arrive:** Poseidon on the shore (the land tile beside the sea nearest the quay, or the town); Demeter among the fields (the farm nearest the middle of the farms); Hephaestus by the armoury, else the mine, quarry or masons' yard; Artemis in the woods (the thickest stand of trees nearest the town); the others at a shrine dedicated to them, else the agora, else the middle of the town. Never on water.
- **Where they go:** up to four of the places they love, the nearest of each kind first, in a tour from where they arrived. Demeter farms and granaries; Hephaestus armouries, mines, quarries and the masons' yard; Dionysus vineyards, wineries and theatres; Athena groves, presses and the court; Apollo theatres, infirmaries and the asklepieion; Artemis hunting lodges; Ares barracks and towers; Aphrodite the finest homes; Hermes the trading post and the caravan yard; Poseidon the trading post (the quay), the shipyard and the lighthouse; Zeus the tax office, the court and the agora; Hera the biggest households. A god who finds none of theirs walks among the homes nearest the middle of the town instead (and says so).
- **How they move:** `arriving` for 3 days (the flourish, rising); then `walking` in straight lines over everything (never blocked by buildings or water) at `GOD_SPEED` (0.15 tiles a tick: about a body's height a second for a figure three storeys tall, stately for its size beside the walkers' 0.12); stopping a little short of each place's middle; `blessing` for a day and a half at each; and, after the last, `leaving` where they stand for 3 days (the flourish reversed). A visit is cut short (the rest of its places dropped) so it never lasts past `VISIT_TICKS` (30 days, half a minute at normal speed). The spec says "a few days"; at normal speed a day passes in a second, so a few days would be over before Oliver could follow it with the hover tip. I'd rather he could watch it; this is a number to tune by eye.
- **Blessing:** each place touched is blessed until the start of the season after next, three to six months (`until spring`, `until autumn`): no fire or wear can build up in it while it lasts (`hazards.ts`: its risk and wear rates are 0); a maker (farm, grove, vineyard, dairy, pasture, press, winery, mine, armoury, horse farm) works a quarter faster (`production.ts`, through `boonOf`); a home's mood lifts by two ("Blessed by Aphrodite: her visit lifts the house", `folk.ts`). The same god blessing the same place again extends it; another god's blessing replaces it. Blessings of places that are gone are forgotten once a day.
- **Words** (`say`, a new kind `epiphany`, filed under City): on arrival, "Demeter walks among your fields: she is pleased with your granaries" (why: her weightiest reason from `reasonsOf`, or the festival or sanctuary that called her); at each place, "Demeter blesses the farm by the river: its crop grows a quarter faster until autumn"; on leaving, "Demeter has gone: she blessed three farms and a granary until autumn".
- **The trigger:** once a day with the gods switched on, a god whose mood is loving and who was not loving at the last look visits (if not refused, and at most once a year per god). Slice 53's festivals and 54's finished sanctuaries call `startVisit` at their merges.

**The figures** (`src/render/gods.ts`): one builder of low-poly parts (a robe or tunic, a torso, arms, a head with hair or a helmet, feet), dressed per god: Zeus's beard, thunderbolt and royal mantle; Hera's diadem, veil and sceptre; Poseidon's beard and trident; Demeter's sheaf and torch; Athena's crested helmet, spear and round aegis; Apollo's lyre and laurel; Artemis's short tunic, bow and crescent; Ares' crested helmet, shield and spear; Aphrodite's flowing hair and dove; Hephaestus's hammer and leather apron; Hermes's winged sandals, broad hat and caduceus; Dionysus's thyrsus and vine crown. About 1.5 tiles tall (three storeys), a few hundred triangles each, flat-shaded vertex colours with an emissive glow in the god's colour; a soft glow behind them (a sprite), a halo on the ground (an additive disc), and a trail of fading footprints of light. A slow, grand walk: the legs swing under the robe, the body rises and sways a little, the arms barely. Rising out of the ground (or the flourish's light) as they arrive and sinking as they leave.

**Flourishes** (one shared particle pool: camera-facing additive quads in an instanced mesh, plus a lightning bolt and a shaft of light): Zeus a lightning strike and flash; Poseidon a column of sea spray; Demeter falling petals over the fields; Athena an owl circling; Apollo a shaft of sunlight; Artemis moonlight and silver arrows falling; Ares a crash of bronze sparks and a ring of dust; Aphrodite a swirl of rose petals and white doves; Hephaestus a burst of sparks; Hermes a flash of white wings; Dionysus a ring of vines and a wine-dark mist; Hera a peacock's fan of light. Leaving plays it reversed (or its own fall). Each has a short sound sting in `sound.ts`, made in code (thunder, surf, a lyre, a horn...), played as the renderer first sees the god arrive or leave. The camera never moves on its own.

**Blessed places** show a soft gold shimmer (a ring of light round the footprint and a few motes rising), and in their panel ("Blessed by Demeter until autumn: ...") and their hover tip.

**Hover and click** (`main.ts`, in a Slice 56 block): the god nearest the pointer on screen (their body, not a point) names them and says what they're doing and why ("Demeter, the giver of grain · walking to the granary · She came because she loves your city: +18 your full granaries"). A click opens a small kit panel on the left (`src/ui/godpanel.ts`): the god's emblem drawn in code in their colour, their mood word and bar with its top reasons, why they came, where they are going next and what they have blessed, and when they leave.

## Tests

`tests/epiphany.test.ts`:
- **Determinism:** the same town, the same visit, the same ticks give the same state.
- **Routing:** a visit reaches every place it set out for (in order), blesses each, and is gone by its leaving tick; it walks straight across water; Poseidon arrives on land by the sea; a god with nothing of theirs walks among homes.
- **Refusals:** the same god twice, more than `MAX_GODS`.
- **The trigger:** a god staged to loving with the gods on visits once; not again while loving; not with the gods off; a pose never moves or leaves.
- **Effects:** a blessed farm's crop grows a quarter faster than its twin unblessed; a blessed building gains no fire risk or wear; a blessed home's mood has the reason.
- **Independence:** every demo's prepared town has no figure and no blessing.
- **Saves:** a round trip with a god in the streets and places blessed; a version 48 save (`#town` saved at `11f9290`, kept as a fixture) and the same with its `gods` taken out (as a phase 6 save) load through the migrations; the migration step itself on a hand-built old state.
- The purity and load-order tests pass with the new module.

## Tasks

1. Plan (this file), with the baseline. Commit.
2. The sim: `epiphany.ts` (state, `startVisit`, the step, the trigger, the words), `pantheon.ts`'s Slice 56 block, `state.ts`, `migrate.ts`, `sim.ts`, `commands.ts`, `messages.ts`, `saves.ts`; the blessing's effects in `production.ts`, `hazards.ts`, `folk.ts`; tests. Commit.
3. Render and UI: `render/gods.ts` (figures, halos, trails, flourishes, shimmer), `sound.ts`'s stings, `ui/godpanel.ts`, hover and click and the building panel's line in `main.ts` and `buildingpanel.ts`. Commit.
4. Look and tune: `#epiphany` and `#pantheon` in `demos.ts`, `views.ts`, `smoke.mjs` and `measure.mjs`; screenshots at 1920 × 1080 in all three looks; tune sizes, glow, pace and flourishes by eye. Commit.
5. Full checks: tests, build, the full slow smoke, the measure side by side with `11f9290`, every earlier demo's opening against the baseline's prepared towns, old saves. As built, the check-in. Commit, push.

## As built

(To be filled in.)
