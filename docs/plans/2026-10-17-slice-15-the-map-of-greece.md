# Slice 15 — The map of Greece

*17 Oct 2026. Phase 3, "Greece beyond the walls" (`docs/specs/2026-10-17-greece-beyond-the-walls-design.md`). The first slice of the phase. Builds on slice 14, "A richer town", and the phase 2 review.*

## Goal and check-in

The spec's words: the tabletop map view (the Aegean relief, the five cities and yours, Tyre at the edge, the roads and sea lanes; the Greece button and key; built on first open; camera, hover and click); the world state with shuffled rulers (names, traits, portraits, starting moods with their reasons), each city's goods and steady prices, the city panel showing all of it, renaming your city; the Tyre ship shown on the map in step with the city; the save version and migration; the welcome back.

**Oliver can:** open the map from `#town` (or `#greece`), turn and zoom the table, hover and click each city to meet its ruler and see what they make and want, watch the Tyre ship's sail cross the map in `#greecesail`, and start two new towns to see the rulers shuffle.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#greece`: `#town` with the map of Greece open over it.
- `#greecesail`: `#sail`'s town with the map open, the Tyre ship sailing up the gulf to your quay (her sail on the horizon in the city at the same moment).
- `#ruler`: the map over `#town` with Sparta's panel open: its king or queen, the mood and its reasons, what Sparta makes and wants.
- Every earlier token keeps working and opens exactly as before.

## Not in this slice

Routes and traders, the caravan yard (slice 16); prices that move (17); moods that change from what you do, gifts (18); requests, offers, tribute (19); raids (20); wars, festivals, harvests and news (21). The map shows none of these yet, and the city panel says only what is so now. No sounds beyond a soft rustle for the map.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- Sim code (`src/sim/`, `src/map/`) stays pure and deterministic: no `Math.random`, `Date`, `performance` or timers (the purity test enforces it); every player action (renaming) reaches the sim as a command through the queue.
- **Greece draws from its own random numbers**, apart from the city's three, so every earlier demo opens and plays exactly as before. Proved by a probe outside the repo that plays all 60 demos from the baseline commit and from this slice, comparing a hash of the whole city state (everything but Greece) at opening and 900 ticks on.
- A new game on the bare link shuffles Greece from a fresh seed of its own (the city keeps its seed, so the coast and the opening view are as before); a demo's Greece comes from its city's seed, so it opens the same every time.
- Old saves still load: a version 13 save opens in version 14 with a fresh Greece from its seed (every ruler between wary and cordial); older ones go through every step. A save of this version with a damaged Greece is refused in plain words.
- The renderer and UI only read sim state. Static build, `base: './'`, no runtime network requests, all art generated in code.
- **The city's first load must not slow.** The map's scene and panels are a separate module loaded and built the first time the map opens (a dynamic import, so Vite splits it into its own file); the coast outlines live only in it.
- Judge by screenshots, tune by eye, never claim it looks or feels right on Oliver's behalf.

## Before

Measured at `468f69b` (the phase 3 spec, code as at the end of phase 2), headless Chromium with software WebGL at 1920 × 1080:

| | Before |
|---|---|
| Tests | 211 in 20 files, all passing; typecheck clean |
| Bundle | 3 files, 1,149 KB raw, 332 KB gzipped |
| Load (page clock) | the phase review: bare link ready 1.41 s, first frame 1.69 s; `#town` first frame 2.57 s; `#richtown` first frame 3.02 s. Re-measured at the end, alternating the two builds in one session, since the figures move by a few tenths from run to run. |
| Opening view / overview | 574,460 triangles, 59 draws / 582,868, 61 |
| `#town` / street / overview | 811,660, 86 / 744,269, 74 / 929,244, 112; 693 people |
| `#richtown` / overview | 911,243, 97 / 1,021,806, 119; 928 people |
| `#sail` / `#ship` | 548,594, 41 / 584,483, 54 |
| GPU objects | 57 geometries, 7 textures (by the end of the measure run) |
| A save of `#town` / `#richtown` | 135 KB / 171 KB |
| The 60 demos | each one's opening (tick, people, money, buildings, homes by level) and a hash of its whole state at opening and 900 ticks on, recorded outside the repo |

## Design decisions

**The world state** (`src/sim/state.ts`, `World`), shaped for the whole phase:
- `seed` and `rng`: Greece's own seed and generator (`worldRng`, far from the city's for the same number).
- `name`: your city's name, "Nea Argos" to begin with.
- `cities`: the six in a fixed order (yours, Athens, Sparta, Corinth, Troy, Tyre). Each has a `ruler` (name, title, two traits, a face seed; none for yours and Tyre), `memories` (the ruler's mood towards you as a list: kind, the reason in words, amount, tick, fade), `ties` (feelings towards each other city, for the feuds of slice 21), its goods by trade good (`make`, `need`, `stock` and `price` per hundred, with a year of monthly prices in `history`), and `harvest`, `festival` and `war`, inert for now.
- `routes`, `deals` (requests, offers, tribute, threats), `travellers` (on the map, their place a pure function of the tick: way, start, duration, which way) and `news`: empty this slice, typed so slices 16 to 21 fill them rather than reshape.

**Rulers** (`src/sim/world.ts`). Each ruled city has a character: name lists for men and women (a ruler is a woman about three times in ten), a title ("King of Sparta", "Archon of Athens", "Lady of Corinth"), traits it leans to (Sparta warlike, Athens and Corinth shrewd, Corinth greedy, Troy proud), its size, and which goods it has plenty of or is short of. Two traits are drawn by weight, never greedy with generous or fickle with steadfast.

**Moods with reasons.** A mood is the sum of what each memory is worth now (whole numbers, so the reasons always add up to it). The starting memories: history between your city and theirs, kept for good (Sparta −10: your city stands where old Argos did; Corinth +5: neighbours on the road; Troy −10: the Argives sailed against Troy once); what a trait makes of a newcomer (proud −5, warlike −5, generous +5, steadfast +5); and first word of your city, which fades over three years (half that for a fickle ruler), chosen so the starting mood lands between cold and warm in a new game, and between wary and cordial for a town saved before Greece. Words: hostile (−60 or less), cold (to −30), wary (below 0), cordial (to 29), warm (to 59), devoted.

**Goods and prices.** Each city makes and uses each of the six goods in its measure (a middling city's use, times its size, bent by its character and a shuffle that sometimes turns a good it has about enough of into one it has plenty of or is short of). What it makes plenty of it sells, what it is short of it buys. Its price per hundred is the merchant ship's price bent by how short it is (up to about a quarter either way). Steady this slice; a year of monthly prices is kept. Tyre keeps the ship's prices.

**The geography** (`src/map/greece.ts`, read by the sim; `src/map/aegean.ts`, read only by the map view). Longitude and latitude projected onto a table about 141 by 130 units. Hand-traced coast outlines (mainland Greece with the Peloponnese, Asia Minor, Euboea, Crete), about forty islands as blobs, and about sixty mountain ridges. Your city stands at the head of the Argolic Gulf. Ways from your city: by land to Corinth (by Nemea) and Sparta (by Tegea); by sea to Athens, Corinth, Troy and Tyre, all out past the gulf's mouth. Tyre stands at the table's south-east corner, where its lane runs off. A test checks every sea lane keeps to the water and every road to the land.

**The Tyre ship on the map** (`tyreShip` in world.ts), a pure function of the ship's state and the tick: in the city's bay (sailing in, tied up, sailing off) she is where `shipAt` has her, the city's horizon being the gulf's mouth; beyond it she sails between the gulf and Tyre over twenty days each way, reaching the mouth just as her sail shows on the city's horizon; with no post she waits in Tyre. A test plays `#sail` through a whole visit and checks she never jumps.

**The map view** (`src/render/greece/`, loaded on first open). Its own three.js scene and camera on the same renderer; while it is open the city scene isn't drawn (the city keeps running, pause works as before) and the city's camera is left where it was, so closing returns exactly to it.
- The table: a wooden tabletop with a raised frame; the relief inside it, a height field from the outlines and ridges (land rising from the shore, hills and mountains in ochre, olive and rock, snow on Olympus), flat-shaded; a painted sea of turquoise shallows to deep blue under a glassy water sheet.
- Toy cities in code: walls, houses with red roofs, a banner in the city's colour; Athens with its acropolis and temple, Sparta unwalled in its valley, Corinth under its citadel, Troy with high walls and towers, Tyre on its island, yours small with its banner.
- Roads as dotted lines over the land, lanes as dashed lines on the water.
- The Tyre ship: a little ship with a purple sail on her lane.
- The camera: the city's rig with the table's ground and limits, so it turns (Q, E, right-drag), tilts and zooms (wheel, +/−) and pans (WASD, drag) the same way.

**The UI** (`src/ui/greece.ts`, in the same lazy module, except the button).
- A compact "Greece" button in the top bar, with its key. **Tab** opens and closes the map (every letter is already a tool, overlay or camera key); Tab still moves between a panel's buttons when one has the focus. Esc closes the map when nothing else is open.
- Labels over each city (its name; the ruler's mood as a small face), a hover card with the portrait, name, title and mood word, and a click opens the city's panel.
- The city panel: the portrait (a bust in the city's colour, drawn in SVG from the face seed and traits: helm for a warlike ruler, diadem for a proud or greedy one, laurel for a pious one; the mouth and brows by mood), the name and title, the two traits with what they mean, the mood (word, face and number) and every reason with what it is worth, when, and whether it fades; what they sell and what they buy at what price per hundred against Tyre's; how to reach them (by road, by sea, or both). Your city's panel: its name (renamable), people, homes, what its stores hold and what is ticked for sale. Tyre's: what she buys and where the ship is.
- The city's side panels and corner cards stay as they are; the map's panel sits on the right. (Another thread is adding a side panel on the right: while the map is open it is hidden, see the As built.)
- **The welcome back** for an older save: Greece is there now, and where the button is.

## Tests

`tests/world.test.ts`:
- rulers: names, titles, two traits that go together; the same seed gives the same Greece, different seeds shuffle; Sparta leans warlike;
- moods: the reasons add up to the mood; a new game starts between cold and warm, an older town between wary and cordial; a fading memory fades and is let go; the mood words;
- goods: each city sells some and buys others by its character, dearer where short; Tyre keeps the ship's prices; prices are steady and a year of them kept;
- renaming through the queue, refusing what isn't a name;
- independence: a town plays the same in two different Greeces; a demo's Greece is the same every time;
- saves: Greece round-trips; a real slice 14 save (`tests/fixtures/slice14-richtown.save.json.gz`, from the baseline) and the slice 13 one load with a fresh Greece and play on; a damaged Greece is refused;
- the map: every city stands on land, the lanes keep to the water, the roads to the land;
- the Tyre ship on the map: from Tyre to the gulf, in with the city's ship, home again, never a jump.

Plus the existing suite unchanged, and the 60-demo probe outside the repo. The map's first-open time and frame cost go into `measure.mjs`; `smoke.mjs` opens and closes the map, hovers and clicks a city, renames the city, and checks `#greecesail`'s ship.

## Tasks

1. Plan (this file). Commit.
2. Sim: the world state, rulers, moods, goods, the Tyre ship on the map, renaming, the migration and save checks; tests; the 60-demo probe. Commit.
3. The map view and UI: the lazy module, the relief, cities, ways, ship, camera, labels, hover and panels; the button and Tab; the welcome back; the demo tokens. Commit.
4. Look and tune: screenshots of the table from several angles, each city, the panels; adjust. Smoke and measure extended. Commit.
5. Full checks, measure (alternating with the baseline build), As built, the check-in. Commit, push.

## As built

*(filled in at the end of the slice)*
