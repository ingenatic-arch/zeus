# Slice 44 — The town's messages

*25 Oct 2026. Phase 6, "Crime, health and a polished city" (`docs/specs/2026-10-25-crime-health-and-a-polished-city-design.md`). The panels line's first slice (wave 1), built on `claude/p6-panels` in `/home/claude/zeus-panels`. It starts at `53e5bb4` (state version 37) and takes version 38 locally, renumbered at merge.*

## Goal and check-in

Oliver's ask: "The popups are a little noisy and hard to follow; a proper menu system and location for these would be good, with trackable history." The spec's words: one message log in the town, kept with the save, that every event the town hears is written into; a scroll button on the top bar with its unread count; a Messages panel on the left with months, filters, unread marks, go-to links and pins; quieter popups, alarms only, one at a time at the bottom left, with a setting; the lines under the top bar keep only what the town is short of.

**Oliver can:** open `#messages` to read a busy year, filter it to War and click the raid to go there; play `#raid` and see one alarm pop up (the raiders at the edge of his land) while the rest goes quietly into the scroll.

**Demo links** (bare hash tokens):
- `#messages`: `#aftermath`'s town (a year of trade with Greece, Sparta's tribute refused twice, its raiders in and gone), with the Messages panel open on its scroll and the last season's messages still unread.
- `#raid`: as before (Sparta's band days from the edge); played on, the band's coming in pops up at the bottom left, and the rest goes into the scroll.
- `#messages-paused`, `#messages-plain` and the rest, as for every demo. Every earlier token keeps working.

## Not in this slice

Building panels and a building's own recent messages (slice 48, which reads the log by place); the overview (51); new news of other lines (new crimes, colony stages, generated lands), which their integrators route through `say`. Health's messages (49): the Health chip is there and empty until then. No new wares, no new buildings or walkers.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets; the spec's parallel plan binds (file ownership, append-only lists, one state field, blocks headed "Slice 44" in shared files).
- **State version 38** locally, with `fromSlice44` in `migrate.ts` hooked at `if (st.version === 37)`. It fills only `messages`, only if absent.
- **Writing messages changes no outcome.** The log is written from sim facts, after everything else in the tick, and nothing in the sim reads it. Every earlier demo opens with the same date, people, money and levels as at `53e5bb4`, and plays the same 900 ticks on (checked with a probe, before and after).
- Sim code stays pure and deterministic (no random numbers at all here; the purity tests cover the new modules); player actions are commands; the renderer and UI only read.
- `MAP_SIZE`: no new uses in the sim. Tiles in a place are indexes the UI turns into x and z with the map's own size.
- Judge by screenshots at 1920 × 1080 and 1280 × 720; never claim it looks or feels right on Oliver's behalf.

## Before

At `53e5bb4`, on a loaded machine (four lines building on four cores).

| What | Before |
|---|---|
| Tests | 590 in 49 files, all passing, 8 min 25 s (`npm test`, the machine loaded) |
| Build | 63 s (`npm run build`, the prepared towns baked) |
| `#empire`'s save | 273 KB as JSON (52 KB gzipped), the town as it opens |
| Download and loads | the loosened `measure.mjs` at `53e5bb4`, side by side with this slice's build (in the check-in) |

## Design decisions

**The log (`src/sim/messages.ts`, one top-level field `messages`).**
- A message: `id`, `tick`, `kind` (a fine kind such as `fire`, `raid`, `ship`, `greece`, `colony`), its urgency `u` (0 news, 1 warning, 2 alarm), the words (capped at 360 characters), an optional short `title` (otherwise the title is the words up to their first stop), where it happened `at` (a building, a tile, a company, a city of Greece or a site), and `read` and `pin` (only when true). The filter category (City, Trade, Greece, War, Crime, Health, Empire, Works) is the kind's, from a table, so it isn't saved.
- `say(s, msg)` is the only way in. It stamps the tick and id, caps the words, drops the same words said in the last few days (blockades tell the army's news and Greece's in the same words), and prunes: three game years, at most 600, pinned ones kept first.
- Queries for the panels: by category, unread, by place (`messagesAt(s, place)`, for slice 48's building panels and 51's overview).
- **Read marks and pins are commands** (`{ type: 'messages', act: 'read' | 'pin' | 'unpin' | 'allread', ids }`), saved with the town. **Which kinds may pop up is a setting of the player's, not the town's**, kept in the browser's storage (it holds for every town and demo). Nothing in the sim reads either.
- `since`: the tick the log begins. A new game's is 0; an old save's is its tick when loaded, and the panel says "Messages from before this save weren't kept".

**Routing every news source, once each.** No other line's file is edited for it:
- **The three news logs** (Greece's `world.news`, the army's `army.news`, crime's `crime.news`) are each read with a cursor (the tick and count last heard) at the end of every tick and after commands are applied, so every line pushed is said once. A line pushed by a command while paused is heard at once. Each world line's kind and urgency come from a table of its words (raiders in at the edge or ashore, a blockade taking station, a vassal risen or a colony declared free are alarms; other urgent lines warnings; lines from a colony's site are Empire, a vassal's or ally's Empire, raids, fleets, blockades and expeditions War, the rest Greece). Greece's own doings are heard only once the town deals with Greece, as the lines did.
- **Sources that only work their line out from state** are watched at the end of each tick (`src/sim/heard.ts`), and a message is written the moment each first becomes true. A small list of the facts true at the last look (`seen`, a few short keys) is saved so nothing is said twice across a save:
  - fire: a building smouldering (warning), burning (alarm), creaking (warning), and a building burnt or fallen (news);
  - the merchant ship sighted; a caravan or a sea route's ship in; a caravan or ship turned back (warning); goods lost with the trading post (warning); a ship held back by winter;
  - the monuments: a stage or a monument finished, the games coming and on, a site stuck (warning);
  - a laurel won, an ambition achieved, all three;
  - a new season;
  - a loan due within a month that the treasury can't cover (warning); a ruler's request, offer or demand a week from due and unanswered (warning).
- **Never twice:** the town lines' own rules (a line the army told in other words, the same up to its first stop) are kept, so a blockade's line, told by both Greece and the army, is one message.

**The scroll button and the Messages panel (`src/ui/messages.ts`, `messages.css`).**
- A scroll button on the top bar beside the date, with the unread count on a seal coloured by the most urgent unread (red alarm, amber warning, bronze news). Click or M opens the panel.
- The panel on the left, under the top bar, in the parchment and marble skin: a head with "Mark all read"; the filter chips (All, City, Trade, Greece, War, Crime, Health, Empire, Works, each with its count unread); pinned messages first; then months, newest first, each message a row with its icon, day, title (bold while unread) and its words opening under it on a click (which marks it read); its place as a link ("Go there": the city camera, or the map of Greece on that city's or site's page), which marks it read too; a pin. At the foot: "Pop up for" with a toggle for each alarm kind (raids, fires, plague, rebellions, blockades), and what the log keeps.
- **Waiting on you**: the panel's top lists the deals a ruler waits on you for (requests, offers, tribute, loan terms), with their dates, since those lines leave the top bar.

**Quieter popups.** Only alarms pop up, and only kinds the setting allows: a card at the bottom left, beside the build bar and clear of the city's middle, one at a time, fading after six seconds (longer under the pointer); a queue of at most three, the rest in the scroll. Click goes to the place. Nothing pops for messages that were in the town when it opened. Everything else arrives quietly, with a soft sound (a new cue, a parchment rustle and a small bell, at most once every few seconds) and the badge; an alarm has its own bronze bell.

**The lines under the top bar** keep how things stand that the town can fix: bread, meat and cheese, the stall goods, workers, money, harsh taxes, winter's bread, and the risks nobody guards (fire risk, wear, homes tempted to steal). Ships, traders, Greece, requests, loans, raids, alarms, the army, crime's news and thieves out, the empire, the monuments, laurels, fires burning, smoulders, creaks and rubble all leave for the scroll. Their chips (the ship, raids, debts, the army, the laurel) stay where they are.

**Demos.** `#messages` (above). Every demo's prepared town carries the messages its history wrote, all marked read as it opens, so its scroll has its past and its badge is quiet. (The spec says prepared towns start empty; a prepared town must be exactly the state its setup made, and its history is worth reading, so I keep it, read.) `#raid` unchanged.

## Tests

- **Determinism:** the same seed and commands give the same log.
- **Once each, never twice:** a town played through a raid, a blockade, crime and fires, every line pushed to the three logs reaches the log exactly once (the blockade's double telling as one), and no two messages have the same words within a day.
- **The cap:** three years and 600 at most, pins kept; long play stays within it.
- **Commands:** read, pin, unpin, mark all read; nothing else in the state moves.
- **Saves:** a round-trip with messages, read marks and pins; a version 37 save (`SIM_STATE_VERSION - 1`) loads with an empty log and `since` its tick.
- **Independence:** a town played with and without the log (cleared every tick) ends the same.
- `loadorder.test.ts` and the purity tests cover the new modules.
- `smoke.mjs`: `#messages` (badge, panel, the War filter, the raid's link) and `#raid` played to the band's coming (one popup, the rest in the scroll). `measure.mjs`: `#messages`.

## Tasks

1. Plan (this file), with the baseline. Commit.
2. The sim: `messages.ts` (log, `say`, queries, commands), `heard.ts` (routing and watchers), the state field, migration, the step and flush hooks; tests. Commit.
3. The UI: the scroll button, the Messages panel, popups, sounds; the town lines trimmed. Commit.
4. Demos and look-and-tune at 1920 × 1080 and 1280 × 720; smoke and measure entries. Commit.
5. Full checks (tests, build, the slow smoke, the measure, the demo probe, a version 37 save), As built, the check-in. Commit, push.

## As built

**The log** is as designed: `src/sim/messages.ts` (the log, `say`, `titleOf`/`titleFrom`, queries by filter, place and unread, the `messages` command, and `mendMessages` for a missing or damaged log), one top-level field `messages`, state version 38 (`fromSlice44`). A message's filter comes from its kind's row in `KINDS`, so it isn't saved. Twenty kinds: greece, loan, deal, raid, blockade, army, fleet, vassal, colony, rebellion, ship, caravan, fire, collapse, season, laurel, crime, plague, sickness, monument. Five may pop up: raid, blockade, rebellion, fire, plague.

**Routing** (`src/sim/heard.ts`) runs last in every tick and again after commands are applied (only the facts then):
- Greece's, the army's and crime's news logs are read with a cursor each (tick and count). Greece's lines are sorted by a table of their words (`RULES`): raiders in or ashore, a blockade taking station and a rising are alarms; other urgent lines warnings. A line from a colony's site is Empire; a vassal's or ally's is Empire; raids, fleets, blockades and expeditions are War; loans and asks are Greece; the rest is Greece. A war line the army already told in other words in the last fortnight (the same up to its first comma or colon) is not told twice, and `say` drops the same words within three days.
- The facts that status.ts used to work out, said once as each becomes true: a building burning (alarm), smouldering or creaking (warning), rubble (news); the merchant ship sighted, goods lost with the post (warning); a caravan or route ship in, or turned back (warning); a stage or a monument finished, the games coming and on, a site stuck (warning); a laurel, an ambition, all three; a new season; daily, a ship held back by winter, a ruler's ask or threat a week from due (warning, titled by what waits), a loan due within a month the treasury can't cover (warning). The facts true at the last look are kept in `seen` (short keys), so nothing is said twice across a save.
- Nothing in the sim reads the log; the tests check a town played with the log emptied every tick ends the same, and the demo probe below.

**The town lines** (`status.ts`) keep the shortfalls (bread and food, stall goods, workers, money, harsh taxes, winter's bread), the unguarded risks (fire risk, wear, homes tempted to steal), and one money matter: a loan overdue, or due within a month with too little in the treasury. The news lines' text builders became helpers the watchers use (`burningLine`, `smoulderLine`, `creakLine`, `rubbleLine`, `traderLine`, `shipLine`, `dealsWaiting`, `dealLine`, `loansWaiting`). The raid's standing line (a threat, a band gathering, marching or in the city) left the top bar: the raid chip still shows a band, and the Messages panel lists every threat and band you can still pay off under "Waiting on you", with the rulers' asks and offers, any loan whose terms wait on an answer or whose grace is running out (`loansWaiting`), a vassal arming or an ally's call to answer (from `empireTownLine`), and a colony talking of freedom or threatened (from `colonyTownLine`). The empire's other lines (men coming to help, tribute coming in, settlers on their way) are news in the scroll, which already told them.

**The UI** (`src/ui/messages.ts`, `messages.css`):
- The scroll button beside the date with its seal (`topbar.ts`).
- The Messages panel as a `household messages` card: it takes the home panel's place and its responsive rules, and one of them is open at a time (the trading post's, the shipyard's, a city's page on the map). "Waiting on you", the filter chips with unread counts, pinned, months, rows bold while unread, an open row with Go there, Mark unread and a pin, Mark all read, the popup setting, and the note for a log that began with an old save.
- Popups (`MessagePopups`): only alarms of kinds allowed, said after the page opened, not while the panel is open; one at a time, six seconds, at most three waiting.
- Sounds: `message` (a rustle and a small bell, at most every 4 s) and `alarm` (a bronze bell, twice; not for a fire or raiders, which have their own).
- Keys: the key left of 1 (`), since every letter is taken; Esc closes the panel.
- Probes: `messages(open?, filter?)` and `heard()` (the lines and every message's words).

**Demos.** `#messages` (above). Each demo opens with its history read but for the last `unread` ticks (a Slice 44 field on `Demo`; `#messages` keeps three months unread), sent as a `messages` command as the page opens, so the prepared towns themselves are unchanged in everything but their log.

**Decisions that differ from the spec:**
- Prepared towns carry the messages their history wrote, marked read as they open, instead of starting empty (a prepared town must be exactly the state its setup made, and its history is worth reading).
- A debt you can't meet stays a line under the top bar (it is how things stand, like money).
- "A thief out" and an expedition's progress have no line or message of their own now; a theft, a catch and the expedition's news are messages.
- The panel's key is the one left of 1, not a letter.
- Which alarms pop up is the player's setting, kept in the browser; read marks and pins are commands, saved with the town.

**Touched outside the line:** `src/game/saves.ts` (calls `mendMessages` after migrating, so a damaged log loads empty instead of refusing the save); in Slice 44 blocks, `state.ts`, `migrate.ts`, `sim.ts`, `commands.ts`, `main.ts`, `demos.ts`, `help.ts`, `scripts/smoke.mjs`, `scripts/measure.mjs`; tests whose news moved to the messages (`battle`, `favours`, `raids`, `trade`) or that compare two towns' city state and now leave the log out, as it tells Greece's news (`rivals`, `world`). `status.ts`' `traderLine` no longer asks for a sea route's news when the route has no ship (a test builds such a route by hand).

**MAP_SIZE:** no new uses. A tile place is turned into x and z with the map's own size in `main.ts`.

**Measured** (the machine shared with the other lines throughout, so the times are mostly the load):

| What | Before (`53e5bb4`) | After |
|---|---|---|
| Tests | 590 in 49 files, all passing (8 min 25 s) | 604 in 50 files, all passing: 601 in the full run (25 min, the slow smoke running alongside); the 3 that timed out there (a timing check in `culture.test.ts`, one test each in `money.test.ts` and `treasury.test.ts`) pass alone |
| Build | 63 s with the towns baked | about 4.5 to 9.5 min when the towns rebake (every town now plays its history's messages); 19 s with the towns cached |
| Download (gzipped) | 4,501 KB: the game 822 KB, the prepared towns 3,679 KB (103 files, the largest 52 KB) | 4,606 KB: the game 831 KB, the prepared towns 3,775 KB (103 files, the largest 55 KB) |
| `#empire`'s save | 273 KB (52 KB gzipped) | 289 to 290 KB (55 KB gzipped), 101 messages |
| Triangles and draw calls | every view the measure reached (all the city views to `#empire` and `#messages`'s place in the list) | the same in every one |
| `#empire` running | 37.5 ms a frame before drawing (7 frames) | 34.5 ms (9 frames) |
| The demo probe | | all 134 prepared towns open and play 900 ticks the same as at `53e5bb4` but for the log (the old ones migrated from version 37) |

The loosened measure ran out of its 90 minutes on both builds (the starting build late in the frame work, this one in the map's section), so the map's and the later demos' timings weren't compared.
