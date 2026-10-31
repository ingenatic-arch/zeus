# Slice 55 — Monsters at the gates

*31 Oct 2026. Phase 7, "Beloved of the gods" (`docs/specs/2026-10-31-beloved-of-the-gods-design.md`). The Legends line's first slice (wave 1), built in the worktree `/home/claude/zeus-legends` on `claude/p7-legends`, from the groundwork at `11f9290` (state version 48).*

## Goal and check-in

The spec's words: seven monsters with their lairs, raids, targets and figures; companies fight them, wound them and drive them back; announced first; walkers flee; damage through fire and rubble.

Nothing in the city sends a monster yet: the curses that will (slice 57) live on the Olympus line. This slice makes the monsters real and gives the other lines one function to send one, `sendMonster(s, kind, why)`. The demos call it directly.

**Oliver can:** open `#monster` and watch the Cyclops settle into its den on the rocky shore below the quay, after the shepherds' warning; open `#monsterraid` and watch the Calydonian Boar trample the fields while a company of hoplites marches out to it, and fight it off; open `#bestiary` to compare the seven side by side, each before its lair. Hover or click any of them for its name, its god and why, its health, its lair, its last raid and "only a hero can slay it".

**Demo links** (bare hash tokens):

- `#monster`: a town with a quay (`#richtown`'s), the Cyclops sent by Poseidon a few days ago: the warning heard, and the Cyclops walking the last stretch of the shore to its den.
- `#monsterraid`: a town with a barracks and a company of hoplites, the Boar settled in its marsh weeks ago, now out in the fields; the company has been ordered to it and is on the march.
- `#bestiary`: the seven monsters on one open land, each standing still before its lair (two caves, two marshes, three rocky dens), paused, to compare.
- `-paused`, `-plain` and `-modern` on each, as for every demo; every earlier token unchanged.

## Not in this slice

Heroes, halls and slaying (slice 59; this slice exports the hooks). Curses and omens, and anything that sends a monster by itself (slice 57). The gods' figures (slice 56). A monster on the map of Greece. Monsters at sea.

## Ground rules

- The vision wins; `CLAUDE.md` sets the conventions and budgets; the spec's *parallel plan* binds.
- **State version 49 locally** (`SIM_STATE_VERSION`), one migration `fromSlice55` in `migrate.ts`, hooked by `if (st.version === 48) fromSlice55(st);`, filling only `legends`, only if absent. Its note at the top of `migrate.ts` reads "Slice 55 (Monsters at the gates): …", with no version number (renumbered at merge). Tests compare with `SIM_STATE_VERSION`.
- **One new top-level field**, `legends`. New kinds appended at the very end of their lists (a message kind `monster`, a story kind `slain`). No new wares, no new buildings, no new walker kind.
- **No monster unless sent**: nothing in this slice sends one by itself, so every older demo and history is untouched.
- Moods only through the groundwork's API (`moodOfGod`, `moodAtLeast`, `honour` in tests and demos).
- The land's own size (`map.size`), never `MAP_SIZE`. News through `say`. Panels and tips from the kit.
- Sim code pure and deterministic: hashes of the seed and the monster's id (never a shared generator, so no older roll moves), maths through `dmath.ts`. Player actions are commands; nothing here costs money.
- Renderer and UI only read. All art in code. Judge by screenshots at 1920 × 1080 in the original look, and check `-modern` and `-plain`; never claim it looks right on Oliver's behalf.
- Shared files touched only in blocks headed "Slice 55". Anything outside the line listed under **Touched outside the line**.

## Before

At `11f9290`, on a shared, loaded machine (load 10 to 20 on 4 cores, three other lines building beside it).

| What | Before |
|---|---|
| Tests | 803 in 60 files (the groundwork's run) |
| Download (gzipped) | 5,530 KB in all; the game itself 998 KB; prepared towns 4,532 KB in 125 files |
| Bare link ready (page's clock, loaded machine) | 13.9 s |
| `#town` / `#richtown` / `#empire` ready | 13.4 s / 7.7 s / 7.6 s |
| Triangles and draws, `#town`'s view / `#empire`'s view | 1,488,490 and 102 / 1,946,231 and 156 |

## Design decisions

**State (`legends`).** `{ monsters: Beast[], next, stones: Stone[] }`. A `Beast` is one monster in your land: its kind, its id, who sent it (`god`) and why (`why`), when it was sent (`came`) and settled, its lair (tile, kind, the way its mouth faces), its health (`hp` of `full`), its state, where it stands and faces, its way (a flat list of points, the segment and how far along it), its target (a building id or a wall's tile, and the words for it), when it next raids (`next`, or when it settles, or is healed), whether that raid has been announced, its last raid (tick and words), its tallies (raids, wrecked, killed), its foe in the battle while one stands (`foe`), and when it last fought and struck. At most one of each kind (`sendMonster` refuses a second). `stones`: the walkers Medusa turned to stone, where they stood, for a season.

**States**: `coming` (seen, off the map, a few days), `settling` (walking in from the edge to its lair), `lair` (outside its lair, between raids), `raiding` (out to its target and at it), `returning` (home again after a raid, or broken off wounded), `healing` (inside its lair for a season, out of reach), and `leaving` (called home by its god, walking off the land). The brief's six, plus leaving.

**Lairs** (`lairFor`): scored over the land's tiles, a pure function of the map and what is built:
- every lair is on firm open ground a person can walk, at least 10 tiles from any building, never on the map's edge, and reachable on foot from the city (a way exists from it to the town's middle) and from an edge;
- a **cave** wants steep ground close by (cliffs and hillsides) with open ground in front, high and rocky;
- a **marsh** wants marshy ground (a delta's or a wooded coast's marsh) or the river's wet banks;
- a **shore** wants the sea within a tile or two, rocky ground, and the harbour (the trading post or the shipyard) as near as the 10 tiles allow;
- of the candidates the nearest to the city's middle wins once the kind's own score is good enough; when a kind of ground doesn't exist on a land (no river on an island, no cliffs on a dry plain), it falls back to the next best kind (marsh → shore or cave, cave → shore or marsh, shore → marsh or cave), and finally to any open ground far enough from buildings. A test checks every kind of land at every size finds a lair for all seven.
- The lair is chosen when the monster is sent, so the warning can name where it was seen.

**Telegraphed in three steps.** `sendMonster(s, kind, why)`: a warning at once ("Shepherds saw something vast on the hills below the crags", a warning in the Messages, with the place), naming neither the monster nor its god. Four days later it walks in from the edge nearest its lair; when it reaches it, an alarm names it, its god and the reason ("The Calydonian Boar has made its lair in the marsh on the flood plain. Artemis sent it: you hunted her herds thin. It will come out every few weeks for the fields and the herds. Your soldiers can drive it back; only a hero can slay it."). Its first raid is three to five weeks off, each after that three to six weeks (by a hash of the seed, the monster and the raid). A day before each, a warning: "The Boar is stirring in its marsh: tomorrow it comes for the fields".

**Raids.** Each kind has its targets, chosen when it sets out (nearest its lair, of those it can reach):
- the **Boar** fields and herds: farms, olive groves, vineyards, pastures, the horse farm, then the dairy;
- the **Cyclops** the quay: the trading post (first while a ship is moored there: wrecking it sends her off unpaid), the shipyard, then homes by the sea;
- **Medusa** the busiest street: the place with most walkers near it (an agora first), turning to stone the walkers who don't get indoors;
- **Talos** the walls and armouries: a standing stretch of wall or gate, a tower, the armoury, the barracks;
- the **Hydra** homes by the water (river or sea);
- the **Minotaur** the densest homes (the home with most people within three tiles);
- the **Chimera** anything that burns: the barracks and the fields first, then the densest homes, setting alight what it passes.
With none of its own targets, any building nearest its lair; with nothing at all, it stays in its lair.

It walks across country as raiders do (`foeWay`: open ground and roads, round buildings, a wall in the way smashed through in a day), stays two days at its target, then walks home. At the target it wrecks what it reaches, one building every half day, two to four in a raid by kind: through the existing code, `ignite` for the Chimera's fires (and the watch can put them out) and the existing rubble (`toRubble`, passed in as the hazards' `fall` is) for the rest, a wall smashed through `breakPiece`. A home wrecked loses one or two of its people (those who didn't flee), told in the house's story ("killed by the Hydra"), and the rest leave as from any fallen house. Medusa wrecks nothing: once every few ticks one walker in her gaze (beyond the six tiles where walkers run indoors, within nine) turns to stone where she stands, a person of the nearest home dies, and a grey figure stays on the spot for a season. Walkers within six tiles of any monster out of its lair run indoors (the raiders' `bandsAt`). Every raid ends with a message of what it wrecked and who died.

**Against the army** (`battle.ts`, a small hook). While a monster is out of its lair or sitting before it, and a soldier or a tower is within twelve tiles, it stands in the battle as one more foe (`army.foes`, with `raid` set to minus its id), so companies holding ground (or drilling, or ordered to it) close with it, archers shoot it and towers loose at it with the battle's own code, and their blows land on its health. Its own fight is `monsterFight` in `monsters.ts`, called from `stepBattle`: it goes for the nearest soldier within reach of its size, strikes every second or so of game time with a blow that can kill a hoplite outright (the battle's own wounded-or-killed roll, and the dead mourned at home as "fell fighting the Calydonian Boar"), and fights while any stand near; while it fights it doesn't walk on. Health by kind (800 for Medusa to 1,600 for Talos), so a company of 16 hoplites can take it below 40% in a few days of fighting, losing several men. Below 40% it breaks off: no longer a foe, it walks home and heals inside its lair for a season (three months), with no raids, its health coming back to full; then it comes out again. It never dies to soldiers (its health never falls below 1, and only `slayMonster` ends it). Companies are ordered to it with the Army tab's existing order to a place: the banner taken in hand and a click on open ground by the monster or its lair.

**Called home.** Once a day, if its god's mood is warm or better (`moodAtLeast(moodOfGod(s, god), 'warm')`), it leaves: a message ("Artemis is warm to your city again and calls the Boar home"), and it walks off the land by the nearest edge.

**Exports for slice 59** (heroes): `monsterAt(s, x, z, reach)` (the monster nearest a point), `monsterOf(s, id)`, `lairSpot(s, m)` (the open tile before its lair, where a walker can go), `slayMonster(s, id, by)` (ends it cleanly: its foe gone, a message, the lair kept as a place in `legends.places` for slice 59 to make a place of legend). And for slice 57: `sendMonster(s, kind, why)` returns the monster, or `null` (one of that kind already, or no lair anywhere).

**Figures** (`src/render/monsters.ts`): each a few dozen low-poly parts in code, several times a man's height (a man stands about 0.35 tiles; the Boar about 1.2 tiles at the shoulder and long, Medusa and the Minotaur about 2, the Chimera and the Hydra about 2, the Cyclops 3, Talos 3.4), with a silhouette of its own at the classic zoom: the Boar low and long with tusks and a bristled ridge; the Cyclops a hunched giant with one eye and a club; Medusa a woman's figure on a serpent's coil with a crown of snakes and a bow; the Minotaur a bull-headed man with an axe; the Chimera a lion with a goat's head on its back and a serpent tail; Talos a bronze giant, gleaming; the Hydra a low body with five long necks. A walk (legs, necks, coils swaying with the distance walked), a strike (a lunge and a swing of club, axe, heads or tusks), a slump while healing. Shadows from the sun. Lairs drawn at the lair tile: a cave mouth in a rock face, reeds and bones round a dark pool, a rocky den of piled boulders. A health bar over a monster that has been hurt. Medusa's stones as grey figures. A hover tip and a click panel (kit) with its name, its god and why, its health, where its lair is, its last raid, what it's doing and "Only a hero can slay it".

## Tests

`tests/monsters.test.ts`:
- **Lairs on every land**: each of the seven finds a lair on every kind of land at every size (seven kinds × three sizes, generated as `#delta` and the others are), on open walkable ground at least ten tiles from any building, reachable; on the Bay's `#town` the cave is by steep ground, the marsh by the river, the shore by the sea.
- **Telegraphed**: `sendMonster` says a warning at once that names neither monster nor god; it settles in days later with an alarm naming both and the reason; each raid is announced a day before it sets out.
- **Routing**: a raid reaches its target and the monster comes back to its lair; a building is wrecked; a walker within six tiles shelters.
- **Never dies to soldiers**: a company of hoplites against the Boar takes it below the threshold at a cost in men; it breaks off, heals a season with no raid, and its health never reaches 0.
- **Called home**: its god warm, it leaves the land.
- **Determinism**: the same seed and the same `sendMonster` give the same raid, damage and deaths, run twice.
- **Saves**: a round trip with a monster raiding, one healing, and a stone; a version 48 save (and the version 47 fixture) loads through the migrations with no monster.
- **Independence**: a town with no monster plays exactly as before (state the same, but for `legends` and the version).

## Tasks

1. Plan (this file) with the baseline. Commit.
2. The sim: `monsters.ts`, `legends` in the state, the migration, the save check, the battle and shelter hooks, the step in `sim.ts`, the message kind, the tests. Commit.
3. The figures and lairs (`src/render/monsters.ts`), the hover tip and click panel, the walkers' and soldiers' hovers naming it. Commit.
4. Demos `#monster`, `#monsterraid`, `#bestiary` (views, smoke and measure entries); look and tune at 1920 × 1080 in the classic look, then `-modern` and `-plain`. Commit.
5. Full checks: tests, build, the slow smoke, the measure against the start, every older demo opening the same, old saves; As built; the check-in. Commit, push.

## As built

All five tasks done. Commits on `claude/p7-legends`: the plan (`d1f47e7`), the sim (`e01c0d0`), the figures, tip, panel and demos (`30346c8`), the smoke and measure entries (`38856a2`), and this write-up with the check-in.

**What differs from the design above.**
- **Numbers, tuned in scratch fights against `#companies`' hoplites:** health 1,000 (Medusa) to 1,900 (Talos); blows of 290 to 380, every 9 to 14 ticks, each one able to kill a hoplite outright (the battle's own `TAKES` for his armour), the Hydra's, the Cyclops' and Talos' catching a second man beside him for six tenths. Against 16 hoplites ordered beside its target: the Medusa broke off having killed 1, the Chimera 2, the Minotaur 4, the Boar about 4, the Cyclops 8, and the Hydra routed the company (9 dead) before breaking off itself. It stays **five days** at its target (not two), wrecking something every 12 ticks up to its kind's limit (the Boar 2, the Cyclops, Hydra and Minotaur 3, the Chimera and Talos 4).
- **Not getting at a soldier:** a monster that has a soldier in sight but can't reach him (a building between) goes on its way, and after 40 ticks of that pays soldiers no mind for 60 (found when the Boar and a company stood either side of a pasture for ever).
- **No "independence" test.** Instead every earlier demo's prepared town was compared with the starting commit's (below): the same.
- **The slain are kept in `legends.slain`** (kind, lair tile and kind, tick, by whom), not `legends.places`.
- **Figures' heights:** the Boar 1.35 tiles to its back, Medusa 1.9, the Minotaur and the Hydra 2.1, the Chimera 2.0 (built at a lion's size, scaled 1.3), the Cyclops 3.0, Talos 3.4. Medusa has a bronze knife, not a bow. No slump while healing: a healing monster is inside its lair and not drawn (its lair still is, and hovering the lair gives its tip).
- **`#bestiary` is staged:** the seven set down side by side before lairs of their own kind on `#town`'s open ground below the town (real lairs are far apart), in a diagonal row across the classic view, the lairs' mouths to the camera and the seven turned a little to show their shapes. `#monsterraid` holds the hoplites part of the way first, then sends them beside the Boar when it reaches the pasture, so they meet it there.

**State.** `legends: { monsters, next, stones, slain }`. A `Beast` as described, plus `den`, `mouth`, `siege`/`smash` (a wall it is smashing through), `wait` (time left at its target), `broke`, `wrecked`, `stoned`, `men` (soldiers it struck down this raid), `dead` (everyone it has killed), `cool`, `chase` and `calm`. Version 49 on this line; `fromSlice55` adds an empty record to older saves.

**Touched outside the line** (beyond `src/sim/monsters.ts` and `src/render/monsters.ts`):
- `src/sim/battle.ts` (the brief's small hook): monster foes (`raid < 0`) kept in the battle while the monster stands in it; `monsterFight` called after the raiders' blows; reach widened by the monster's bulk for soldiers closing with it and striking it; the raiders' spread, blows and falls skip it; a man killed by it mourned as "fell fighting the Cyclops".
- `src/sim/raids.ts`: `bandsAt` adds each monster out of its lair (`monstersAbout`), so walkers near it run indoors and gates shut as for raiders.
- `src/sim/state.ts`, `sim.ts`, `migrate.ts`, `src/game/saves.ts`: the field, its step (before the battle's), the migration, the save check (a monster's way must be whole points, and may be empty: one standing still has none).
- `src/sim/messages.ts`: the message kind `monster` (war, pops up).
- `src/sim/armystatus.ts`: a soldier fighting a monster says "Fighting the Calydonian Boar", not "a raider".
- `src/ui/household.ts`: the story kind `slain` ("was killed by the Minotaur as the house fell"; "caught in Medusa's gaze in the street and turned to stone").
- `src/ui/monsterpanel.ts` (new): the monster's small panel on the kit.
- `src/ui/icons.ts`: the `monster` message kind's icon (three claw marks), which the kit's test asks of every kind.
- `src/render/walkers.ts`: the raiders' drawing skips monster foes.
- `src/main.ts` (blocks headed "Slice 55"): the view, the hover tip (a monster or its lair, after soldiers and banners, before raiders), the click opening its panel, Esc, the panel's place among the left-hand panels, and the probes `monsters`, `monsterSend`, `monsterRaid`, `monsterOnScreen`.
- `src/game/demos.ts`, `src/game/views.ts`, `scripts/smoke.mjs`, `scripts/measure.mjs`: the three demos, their views and checks.

**Exported hooks for the other lines** (all in `src/sim/monsters.ts`):
- `sendMonster(s, kind, why)`: for slice 57's curses. Returns the `Beast`, or `null` if one of that kind is already on the land or there is nowhere for its lair.
- `monsterAt(s, x, z, reach = 1)`, `monsterOf(s, id)`, `lairSpot(s, m)` (the walkable tile before its lair, and its middle: a place a walker can go), `slayMonster(s, id, by)` (ends it: out of any fight, a message, kept in `legends.slain` with its lair): for slice 59's heroes.
- `beastTip(s, m)`, `beastDoing(s, m)`, `beastName`, `itOf`/`itsOf`/`himOf`, `MAKES`, `fightable`, `roaming`, `onMap`: for anything that wants to show one.

**Measurements and checks.** On a shared machine at load 25 to 45 on 4 cores, with the other three lines building and testing beside it (and a container restart part way, which killed the first full smoke and measure).
- **Tests:** 815 in 61 files (12 new, in `tests/monsters.test.ts`). The full run under load: 810 passed; the 5 that failed were the two land-bake timings (the page measures real time) and three runs that went past their own time limits (`routes` and `trade` replays, the every-demo wages run at 75 minutes). Each passed run alone; the three new demos leave no wages unpaid (checked alone).
- **Build:** clean; 169 prepared towns (165 before; 128 files served, 125 before).
- **Same as before:** every one of the 165 earlier demos' prepared towns matches the starting build's in tick, people, money, home levels, buildings, walkers, soldiers and messages.
- **Smoke:** the full smoke could not finish inside the two-hour limit under this load (twice). Run instead: the bare link, `#town`, `#companies`, `#battle`, `#richtown`, `#bestiary-modern` and `#bestiary-plain` opened with no page errors, and the whole Slice 55 block (`#monster`, `#monsterraid-paused`, `#bestiary-paused` with Talos' tip, panel and Esc): passed.
- **Measure** (a shortened copy of `measure.mjs`, base then this build back to back):

| What | Before (`11f9290`) | After |
|---|---|---|
| Download (gzipped) | 5,530 KB | 5,669 KB (+139 KB: +20 KB the game, +119 KB three prepared towns) |
| The game itself (gzipped) | 998 KB | 1,018 KB |
| Bare link ready (page's clock) | 13.9 s | 15.5 s (the machine's load; the coast bake alone went 3.2 to 3.7 s) |
| `#town` / `#richtown` / `#empire` ready | 13.4 / 7.7 / 7.6 s | 9.3 / 7.9 / 9.8 s |
| Triangles and draws in every older view measured | (as listed) | the same, to the triangle |
| GPU geometries after the frame-work run | 67 | 68 (the stone figures' mesh) |
| `#bestiary` (seven monsters and lairs) | n/a | 1,336,071 triangles, 144 draws |
| `#monsterraid` at normal speed | n/a | 140 ms a frame over 2 frames (noise: `#food` read 122 then 48 ms, `#companies` 75 then 204 ms) |

The frame-work numbers are not usable on this machine: two to six frames in eight seconds under software rendering. The monster view adds nothing to a town without a monster (same triangles and draws); `#bestiary`'s 144 draws are about 40 over `#town`'s, from fourteen figures and lairs built of separate meshes, a cost only while monsters are on screen.

