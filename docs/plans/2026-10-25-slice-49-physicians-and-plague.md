# Slice 49 — Physicians and plague

*25 Oct 2026. Phase 6, "Crime, health and a polished city" (`docs/specs/2026-10-25-crime-health-and-a-polished-city-design.md`), the order line's third slice (wave 3), built at the same time as slices 50 and 51 on their own lines. It starts at `7de3755` on `claude/p6-order`: the trunk with slices 43, 41, 44, 42, 48 and 45 merged (state version 43). This line's state version is 44, with `fromSlice49`.*

## Goal and check-in

The spec's words: every home has a health from 0 to 100, with reasons: it rises with a physician's visits, water and a varied table, and falls with crowding, hunger, no water, winter and neighbouring works that foul the air (the hunting lodge, the dairy, the pasture, the caravans' tannery yard). A home's panel says it ("Healthy: the physician called last week", "Sickly: crowded, no physician this season"). The infirmary (new, 2×2) sends physicians on rounds in crews; it is not a need for a house to grow. A home of low health can fall ill: the sick member stops working, coughs at the door, and recovers or dies; sickness spreads to nearby homes of low health. Plague comes in on a ship or caravan from a plagued city of Greece (said first: "plague in Athens"), or rises in a crowded, dirty quarter in summer; it spreads fast, people die, families flee, workers fail and the city's mood drops; it always warns first and the city always recovers. The answers: more physicians; the asklepieion (new, 4×4), where stretcher-bearers bring the sick to mend faster, and which lifts health around it; and a quarantine that closes the quay and the roads in for a season. Off in prepared histories: health starts at a home's fair level as a town loads, and plague never comes in a town's first year.

**Oliver can:** open `#physicians` to see health in the homes' panels and the physicians walking their rounds, and `#plague` to see Athens' plague warned of, then quarantine the city or let the ship in and fight the outbreak.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#physicians`: a town with an infirmary at work in its hut and cottage streets, a physician out on her round, a few homes sick (one coughing at its door), the health overlay on and a sickly home's panel open with its health and reasons.
- `#plague`: the sea-trading town with a route to Athens, the warning just given ("Plague in Athens: her ship is due in N days"), the trading post's panel open on its quarantine order. Order the quarantine and the ship anchors off the quay and waits, then sails home; let her in and the plague comes ashore by the quay, spreads street to street, and ends within a season or so, the infirmary and the asklepieion mending what they can.
- `#physicians-overlay`, `#plague-paused` and the rest combine as before. Every earlier token keeps working.

## Not in this slice

The overview's Health page (slice 51: this slice exposes `healthFigures(s)` for it: the city's sick, the physicians' coverage, the plague risk and its reasons). The panels' new look (slice 50). New wares: none (the physicians carry nothing a store keeps). Settlers held at the edge by a quarantine (it closes trade only, as the spec says). Tribute, gifts and colonists sailing out are not stopped by a quarantine (noted as a rough edge).

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets; the spec's *parallel plan* binds:
  - **one top-level field**: `health` (the switch, the plagues of Greece, the outbreak, the fever in a quarter, the quarantine, the sick and the monthly tallies), types in the new `src/sim/health.ts`; each home's health and the tick a physician last called live on the home record (two numbers on every building, zero where they don't apply, as every building carries every field);
  - new kinds appended at the very end of `BUILDING_KINDS` (`infirmary`, `asklepieion`), `BUILD_KINDS`, `WALKER_KINDS` (`physician`, `bearer`), `ROUND_KINDS` (`health`), the story kinds and the command kinds (`health`, `quarantine`);
  - state version 44 on this line, with `fromSlice49` hooked by `if (st.version === 43) fromSlice49(st);`, filling only its own fields if absent; its note written as "Slice 49 (Physicians and plague): ...";
  - news through `say(s, …)` only: plague breaking out is an alarm (it pops up), plague in Greece with a trader coming, and a fever in a quarter, are warnings; the rest news; the kinds `plague` and `sickness` already exist;
  - the infirmary's and asklepieion's panels are entries in `PANELS` (buildingpanel.ts), their sections in a new `src/ui/health.ts` as the court's are in `src/ui/justice.ts`; the home panel gets the health line;
  - `sizeOf(s)`, `mapOf(s)`, `map.size`: no new use of `MAP_SIZE`;
  - new demos in blocks headed "// Slice 49"; main.ts wiring in a block headed "// Slice 49"; nothing reordered or reformatted in the shared files.
- Sim code stays pure and deterministic: every chance is a hash of the seed (`unit` from hazards.ts), never a draw from the state's generators. No money moves but through `pay` / `income` (building costs and wages, as for every building).
- **Earlier towns.** Health is a switch (`health.on`), off in a bare state and while a demo's history plays, turned on as a demo opens or a game starts, like crime's. Turned on, each lived-in home's health is set to its fair level at once; nobody falls ill for the first four months after it is turned on, and no plague comes for the first year, so every earlier demo opens with the same people, money and levels, and plays its first 900 ticks as before (checked by comparing every prepared town at 900 ticks with the starting commit's). Health itself changes nothing else: no level needs it, and a mood counts only sickness in the house and plague in the city.
- Old saves load: a version 43 save gets health on if crime is (a played game) and off otherwise, every home's health 0 (read as "not yet reckoned": it takes its fair level on its first day), nobody sick, no plague, no quarantine, and the physicians' round record empty.
- The renderer and UI only read sim state; every action is a command (`{ type: 'health', on }`, `{ type: 'quarantine', on }`). Static build, `base: './'`, all art in code, in the original look (classic.ts, jobfolk.ts); `-modern` and `-plain` still work.
- Judge by screenshots, tune by eye, never claim it looks or feels right on Oliver's behalf.

## Before

Measured at `7de3755` (a copy of it outside the repo), with the other lines building at the same time, so every time below is slow and only large changes count.

| What | Before |
|---|---|
| Tests | 690 in 55 files (23 min 38 s under the load): 689 pass; one, every demo's wages while it is set up (a 20-minute limit), timed out under the load |
| Build, download, loads and frame work | a copy of `measure.mjs` with its waits loosened, run on the starting commit's build in the background while the slice is built; its figures go into the check-in's Measurements beside the slice's own, run the same way |

## Design decisions

**State** (`SimState.health`, types in `src/sim/health.ts`):
- `on`, `since` (the tick it was turned on: the four months' grace and the year without plague count from it);
- `sick`: everyone ill now: who (home, name), since when and until when, plague or not, the tick a physician last tended them, and where they lie (at home, carried, or in an asklepieion's bed);
- `greece`: the cities of Greece with plague now, from when until when, and when your town was warned;
- `outbreak` (or none): where it came from (a city, or a quarter), when it began and ends, the homes struck, and its toll so far (fell ill, died, households fled);
- `fever` (or none): a crowded, sickly quarter in summer, warned of, which turns to plague if it lasts;
- `quarantine`: the tick it ends (0: none); `lastPlague`: when the last ended;
- `now` / `last`: this month's and last month's tallies (fell ill, mended, died, fled), and `month`.
- On every building: `health` (0 to 100; 0 for everything but a lived-in home) and `physician` (the tick one last called; 0 never).

**Health.** Once a day (staggered by id, as the homes are) each lived-in home's health moves toward its fair level, up 2 a day and down 1. The fair level is 50 and a sum of named reasons: water close at hand +10 (none −15, river water for a tent −5); food: hungry −20, one kind +5, two +10, three +15; the physician called within a month +25 (within the season +10); a staffed asklepieion within 12 tiles +10; a full house −8; winter −8 (with the seasons on); foul air from a hunting lodge, a dairy, a pasture or the caravan yard within 4 tiles −10 (named). Kept between 5 and 95. Words: 75 and up Healthy, 50 Well, 30 Sickly, below Ailing. The home's panel says the word and its biggest reasons ("Sickly: crowded, no physician this season").

**The infirmary** (2×2, 150 dr, 4 workers: physicians). It sends physicians in crews of three (as a shrine sends priestesses), on a new round, `health`, range 32 and 64 fresh tiles. Every home beside her way: the physician calls (sets `physician`), and tends anyone sick there. She heads first for homes with someone sick, then those she called on longest ago. Not a need for any level.

**Sickness.** After the four months' grace, a home below 35 health has a daily chance of (35 − health) / 600 that one of its members falls ill, for 10 to 20 days. Each sick home also gives a daily 2% chance to every home within 3 tiles below 45 health. A sick member doesn't work (`awayAt` counts them, as it does those at court), and coughs at the door. At the end they mend, or die: 8% (plague 35%), halved if a physician tended them, ×0.3 in an asklepieion's bed, doubled for the very old and the very young, ×1.5 below 20 health. A death is told in the household's story and the town's news; the household loses that member.

**Plague from Greece.** Once a month, with health on and its first year past, each city of Greece has a small chance (1 in 150) of plague, for two to four months. If you trade with it (a route by land or sea, or Tyre's ship), the town is warned at once: "Plague in Athens: her ship is due in 24 days; a quarantine would hold her off" (a warning); otherwise it is news. A ship that ties up at your quay, or a caravan that reaches the yard, from a plagued city at least 10 days after the warning brings the plague ashore: the homes nearest the post or yard are struck first.

**Plague from a quarter.** In summer, once a day: a home below 30 health with five more below 30 within 4 tiles is a fevered quarter, warned of ("Fever in the crowded huts by the market: …"). If it is still so 20 days on, plague breaks out there; if the quarter mends, or summer ends, the fever passes (news). Never in the town's first year after health is on, nor within a year of the last plague.

**The outbreak.** An alarm when it starts ("Plague in the city! …", pops up). For about 60 days (`until`), every day each lived-in home within 5 tiles of a struck home still sick, below 75 health and not yet struck, has a chance of 3% + up to 12% the lower its health (an asklepieion within 12 tiles halves it): struck, one to a third of its members fall ill with plague. Each struck home with plague in it has a 3% daily chance its household flees the city whole (walking out as leavers). Every home's mood: "Plague in the city" −2, "Plague in the house" −2 more. It ends when `until` has passed and nobody has plague: news with its toll. It always ends (no new cases after `until`; every illness has an end).

**The asklepieion** (4×4, 600 dr, 12 workers, 8 beds). Stretcher-bearers (a pair, one walker of kind `bearer`) go out by road to a sick member at home within 40 road tiles of it, the worst first, and carry them back to a bed. In bed they mend in 60% of the time and die a third as often. Homes within 12 tiles get +10 health and half the plague's spread. A short-handed asklepieion sends bearers less often; with nobody working, none.

**Quarantine** (the command, from the trading post's, the caravan yard's, the infirmary's and the asklepieion's panels, and the health line): for a season (`TICKS_PER_SEASON`), or until lifted. While it lasts:
- a sea route's ship sails in to an anchorage off the quay and rides there until it ends or is lifted (she never ties up; her route says "your quarantine holds her off"); one already sailing for the jetty turns back; a ship tied up when it is ordered finishes and sails;
- Tyre's ship is held as by a blockade (waits at sea, turns back if not past the mouth);
- a caravan at your edge turns back home; one already in the streets trades and leaves;
- the post's and yard's dockers send nobody new; a colony's porters carry nothing more to the quay and her ship waits at anchor;
- none of this is a snub: rulers know why.
Lifted (or ended), all of it resumes from where it stands.

**City first.** Sick folk coughing at their doors (a bent figure in a blanket); physicians (a white-robed figure with a staff and a bag) walking their rounds; stretcher-bearers (two figures carrying a litter, a body on it when laden); during plague, struck homes with a smoking brazier of herbs at the door; under quarantine, a ship riding at anchor off the quay and a yellow pennant at the post and yard. The health overlay colours each home's column by its health (green to red) and marks the sick, with the physicians' walked roads.

**UI.** The home panel's health line (word, bar and reasons; the sick named, how long, tended or not); its mood reasons; the infirmary's and asklepieion's panels (physicians out, homes called on this month; beds, who lies there, bearers out; the city's sick and plague risk, and the quarantine button); the trading post's and caravan yard's panels gain the quarantine order; a town line under the top bar for an outbreak, a fever or a quarantine; the side panel's Health row toggles the overlay; the build bar (B cycles fountain, infirmary, asklepieion; both in the Hygiene and safety group); help.

**For slice 51's Health page:** `healthFigures(s)`: the city's sick (and of plague), the share of homes a physician called on this season, the average health, the homes sickly or ailing, the plague risk (low, rising or high) and its reasons, the outbreak and quarantine in words.

**Slice 45's review findings, handled here:**
- The stocks are drawn just outside the agora's square, on the side facing the default camera, so its awnings don't hide them.
- The convict's tunic is a lighter, warmer undyed wool (it reads against the road), and the watchman walks a step behind him, not two tiles ahead.
- The court's "Lately" list reads the town's message log (its sentences there), not crime's news, so it shows the last five sentences however busy crime is.
- The law's balance needs a crime-prone town: left for slice 52's `#order`.

## Tests

- **Determinism:** a town with sickness, physicians, an asklepieion, a plague and a quarantine gives the same state twice, and the same after a save and load.
- **Health:** a home's fair level by its reasons (water, food, physician, crowding, winter, foul air, asklepieion); the daily move toward it; set to fair when the switch turns on.
- **Earlier towns:** with health off nothing moves; turned on, nobody falls ill in the grace, no plague in the first year.
- **Sickness:** a low-health home falls ill; the sick don't work; the sick mend or die by the rules; it spreads to a low-health neighbour, not to a healthy one.
- **Plague:** always warned before it spreads (Greek and local); always ends; a ship from a plagued city brings it ashore; quarantine holds the ship at anchor and turns caravans back, and nothing is lost from the ledger (the invariant holds with a quarantine on); lifted, she berths.
- **Routing:** physicians walk their round and call on homes beside it; stretcher-bearers reach a sick home by road and carry her back to a bed.
- **Saves:** a version 43 save (`SIM_STATE_VERSION - 1`) loads through `fromSlice49`; a save with the sick, an outbreak and a quarantine round-trips; a version 37 save loads through every step.
- The existing suite. `smoke.mjs` opens `#physicians` and `#plague` (and orders a quarantine); `measure.mjs` adds them.

## Tasks

1. Plan (this file), with the baseline measured. Commit.
2. Sim: `health.ts` (health and its reasons, sickness, death, spreading, Greece's plagues, the fever, the outbreak, quarantine, the physicians' round, the bearers, `healthFigures`), the two buildings and walkers, the state, migration and save checks, the quarantine's hooks in routes, trade and colony works, `awayAt`, moods and stories, tests. Commit.
3. Render and UI: the infirmary and asklepieion, their workers; physicians, bearers, the sick at doors, braziers, the pennant; the overlay; the panels, home health line, town line, side panel, build bar, help; slice 45's findings. Commit.
4. `#physicians` and `#plague`, their views, smoke and measure; look and tune from screenshots at 1920×1080. Commit.
5. Full checks, the demo probe, measurements, As built, the check-in. Commit.

## As built

Commits on `claude/p6-order`: the plan `6043ac9`; the sim `1d5aae4`; render and UI `d8c3d30`; the demos and the look tuned by eye `a6dcfca`; this record and the check-in after it.

**Built as planned:** the state (`SimState.health` with `on`, `since`, `sick`, `greece`, `outbreak`, `fever`, `quarantine`, `lastPlague`, the monthly tallies; `health` and `physician` on every building; `rounds.health`; version 44, `fromSlice49` hooked at 43); the `health` and `quarantine` commands; each home's fair level from its named reasons and the daily move toward it (up 2, down 1); the four months' grace and the year without plague after health is turned on; sickness, its spread to weak neighbours, the sick kept from work (`sickAt` in `awayAt`), mending or dying by the planned odds, the household's story and mood; plague in Greece (1 in 150 a month a city), warned of at once when the town trades with it, brought ashore by a ship or caravan from there once the warning is 10 days old; the fevered quarter in summer, warned of before it turns to plague; the outbreak (an alarm), its spread to homes below 75 health within 5 tiles, households fleeing, its end and toll; the infirmary (2×2, 150 dr, 4 workers) with physicians in crews of three on the `health` round; the asklepieion (4×4, 600 dr, 12 workers, 8 beds) with its stretcher-bearers, beds and the health it lends homes round it; the quarantine on ships, Tyre's ship, caravans, dockers and colony shippers, resuming where it stood when lifted; `healthFigures(s)` for slice 51; the health overlay, the home panel's health, the infirmary's and asklepieion's sections in `PANELS`, the quarantine row, the health town line, help; the figures and buildings drawn in code in the original look (`-modern` and `-plain` checked); slice 45's three findings (stocks at the agora's corner facing the camera, the convict paler with bound hands and the watchman a step behind him, "Lately" read from the message log); `#physicians` and `#plague`.

**Changed from the plan, and why:**
- **Build keys:** the infirmary and the asklepieion are on Z (×6 and ×7, after the court and the prison) rather than a new B cycle: Z already cycles the town's offices and safety buildings, and both sit in the Hygiene and safety group.
- **The quarantine row heads every tab of the trade panel** (and the infirmary's and asklepieion's panels), not only the trading post's and the yard's: the trade panel is where the warning sends you, whichever tab it opens on.
- **A sick member carried to an asklepieion's bed no longer spreads plague** to the homes round their house: the bed is the point of the asklepieion. With either an infirmary or an asklepieion near the quay, a plague that lands in `#plague`'s town stops at the first house (one home, four sick, nobody dead); with neither it struck 39 homes, killed 44 and drove 11 households out within about 75 days. Whether the answers are too strong is for Oliver.
- **The health town line also carries the warning of plague in a city the town trades with** (where her ship is, and what to do), after an outbreak and a fever and before a quarantine. The plan had it only for an outbreak, a fever or a quarantine; without it the warning lived only in the message log and the trade panel. Its need, `health`, is appended at the end of `ORDER` and `WEIGHT`, so it ranks last among the lines.
- **The warning says where her ship is** ("her ship is sailing in, due at the jetty in 14 days", "rides at anchor off the quay", "is at the jetty", "is sailing home") rather than a day count that can have passed.
- **`#plague` has no infirmary or asklepieion**: built in, they stopped the plague at the first house (above), so letting her in showed nothing. Now the town has two weeks to choose: quarantine, build one by the quay, or let her in and watch it spread.
- **Both demos open paused** (`speed: 'paused'`): `#physicians`' sick mend within 10 to 20 days, a few seconds at normal speed, and `#plague` is a choice to make before a day passes.
- **Both demos are staged**: `#physicians` makes three of the sickliest homes within the first physician's reach fall ill (the four months' grace would otherwise keep everyone well) and plays three days on; `#plague` starts the plague in Athens two weeks before her ship is due (Greece's dice give it about once in a dozen years).
- **Tribute, gifts and colonists sailing out are not stopped by a quarantine** (as the plan's "Not in this slice" said); settlers still arrive.
- **A popup whose words start with its title and "!"** ("Plague in the city! It came in …") no longer shows a stray "!" under the title (`src/ui/messages.ts`, one character in the strip).
- **Slice 48's save check** (`tests/storerules.test.ts`, "an older save loads with every store accepting everything") now compares the migrated state field by field instead of as text: slice 49's two building fields come after slice 48's in a new building, but slice 48's migration step adds its fields back at the end, so the text differed in key order only.
- **The stretcher-bearers are drawn in the big batch with the carts** (`folk.big` in `src/render/walkers.ts`), not with the people: two men and a litter run to about 4,000 vertices in the original look, which moved the people's batch into a larger size tier (see `MergedLooks` in `looks.ts`) and raised every walker's cost to theirs. With them among the people, triangles in the earlier demos' views rose by a median 5% (at most 10%); in the big batch, by a median 0.08% (at most 0.23%), with draw calls unchanged.

**Touched outside the line's own files** (each in a "Slice 49" block or line): `src/sim/state.ts`, `migrate.ts`, `sim.ts`, `commands.ts` (state, migration, the commands and the daily steps); `src/sim/buildings.ts`, `build.ts` (the two buildings); `src/sim/routes.ts`, `trade.ts`, `colonyworks.ts` (the quarantine's hooks and the landing); `src/sim/labour.ts` (the sick away from work); `src/sim/folk.ts` (moods); `src/sim/hazards.ts` (fire risk and wear of the two buildings); `src/sim/status.ts` (tips, the home's health lines, the town line); `src/game/saves.ts` (checking the new state), `src/game/tools.ts` (the placing tip), `src/game/demos.ts`, `src/game/views.ts`; `src/render/walkers.ts` (physician, bearers, sick, patients; the convict and his escort), `src/render/justice.ts` (the stocks, the convict's tunic), `src/render/jobfolk.ts`, `src/render/works.ts`, `src/render/city.ts`, `src/render/overlay.ts` (the health overlay), `src/render/placement.ts`; `src/ui/buildingpanel.ts`, `trade.ts`, `household.ts`, `justice.ts` ("Lately"), `townlines.ts`, `help.ts`, `categories.ts`, `buildbar.ts`, `ledger.ts`, `minimap.ts`, `sidepanel.ts`, `messages.ts` (the popup's "!"); `src/main.ts` (Z and J cycles, the legend, the probes); `scripts/smoke.mjs` (the slice's block, the Z and J cycles), `scripts/measure.mjs`; `tests/saves.test.ts` (the save-size budget, 194,000), `tests/storerules.test.ts` (above).

**`MAP_SIZE`:** no new uses (`map.size` and `mapOf(s)` throughout).


**Review.** The plague's spread was all or nothing: `PLAGUE_BELOW` (75) made healthy homes immune, and a sick member stopped being a source once the bearers set out (`bed < 0`), so one infirmary or asklepieion by the quay stopped it at the first house. Now every home within `PLAGUE_TILES` of a source can take it, at `PLAGUE_BASE` (0.003) a day plus `PLAGUE_POOR` (0.12) scaled by how far its health is below 100, halved near a staffed asklepieion (`TEMPLE_SPREAD`); the sick stay a source, are shown on the overlay and the infirmary's list, and are tended by a passing physician until they lie in a bed (`bed > 0`); `FLEE_CHANCE` is halved to 0.015. Over six shaken runs of `#plague`: none, 30 to 47 homes struck and 37 to 61 dead; an infirmary by the quay, 12 to 29 and 10 to 33; an asklepieion there, 1 to 11 and up to 9 (a new test checks healthy homes are reached, far less often than sickly ones). `fallIll` no longer picks a member who is away (`isAway`) or a man serving in a company. `traderLine` gave "the city has no trading post" for a trader turned back by the quarantine or a blockade; it now names the real reason. The quarantine row is one quiet line (with the explanation in the button's title) when nothing threatens; the plague warning's line says physicians and an asklepieion slow the spread, the quarantine line names an infirmary's panel only when there is one, and the plague risk's first reason is lower-cased after the colon. `#plague`'s view is drawn back so the anchorage shows. Touched outside the line by the review: `src/sim/status.ts` (`traderLine`), `src/render/overlay.ts` (the sick with bearers coming), `src/game/views.ts` (`#plague`), `src/game/demos.ts` (a comment).
