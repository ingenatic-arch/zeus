# Slice 52 — A city in order

*26 Oct 2026. Phase 6, "Crime, health and a polished city" (`docs/specs/2026-10-25-crime-health-and-a-polished-city-design.md`). The phase's last slice, built on the trunk (`claude/project-thread-2jx118`, also `main`) after all three lines merged. It starts at `0f9dc87` (state version 47).*

## Goal and check-in

The spec's words: `#order`, a prepared town on a generated medium river delta, with gangs and a court, a plague threatened, colonies grown, store rules set and a full message history; numbers tuned across a few years of play; a look pass bringing every new panel onto the kit; the budgets on a large land; any leftovers.

This slice adds no new system. It puts everything the phase built into one town on one of slice 46's generated lands, plays it and `#town` forward for years to find the numbers that are plainly off, brings the panels slice 50 left behind onto the kit, measures a large wooded land and the new town against the budgets, and closes what it can of the findings carried over.

**Oliver can:** open `#order` and play it for a few years, then judge whether the new systems and panels make the city easier to read and more alive.

**Demo links** (bare hash tokens):

- `#order`: a town founded on a generated medium river delta (the word "order", edition 2) and built up over about six years as a player would: streets of houses up to villas, the watch and the architects, a hut street by the road in where a gang has its den, a court and a prison with the law set and men inside, an infirmary with its physicians out, two colonies (Arcadian hirelings stationed at one, the other trading), the quay's storehouse set to fetch the ship's oil and wine and take nothing else, years of messages and annals, and plague reported in Athens with her ship due (warned, not landed).
- `#bigwoods`: a founded large (256) wooded land, the heaviest kind, for the budgets.
- `#order-paused` and `#order-plain`, as for every demo.
- Every earlier token keeps working.

## Not in this slice

New systems of any kind. The gods (the next phase's biggest gap). A burial ground, riots, laying out a colony's streets, land with the sea elsewhere than the south. The phase summary (the orchestrator writes it after the review).

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets.
- **State version** stays 47 unless saved state is added; if it is, version 48 with `fromSlice52` hooked at `if (st.version === 47)`, filling only this slice's fields.
- **Histories may move on purpose** (the tuning pass) and nowhere else. Every demo is compared at opening (date, people, money, levels) before and after; every one that moves is named in the check-in with how much.
- **Tune constants, not systems.** Every change is listed with before and after in the check-in.
- Kinds appended at the end of their lists; no new wares; no `MAP_SIZE` in new code (the land's own size); news through `say`; building panels through `src/ui/buildingpanel.ts`; panels built from slice 50's kit.
- Sim code stays pure and deterministic (seeded hashes only, maths through `dmath.ts`); player actions are commands; money only through the treasury; the renderer and UI only read.
- Judge by screenshots at 1920 × 1080 and 1366 × 768; never claim it looks or feels right on Oliver's behalf.
- Budgets checked on `#order` and the large wooded land, side by side with the starting commit (a timeout-loosened copy of `measure.mjs`, since the machine is shared).

## Before

At `0f9dc87`, on a loaded machine (load about 4 on 4 cores, other lines' browsers running).

| What | Before |
|---|---|
| Tests | 780 in 59 files, all passing (4 min 7 s) |
| Build | 2.9 s with the prepared towns cached |
| Download, loads and frame work | the loosened `measure.mjs` on `dist` built at `0f9dc87`: the game 993 KB gzipped, prepared towns 4,433 KB gzipped, the bare link ready at 1.49 s, 165 demos with a median load of 1.38 s and none over 3 s (slowest `#delta` 2.53 s) |

## Design decisions

**`#order`** is built in code the way a careful player builds (`orderTown` in `src/game/demos.ts`), on `{ kind: 'delta', size: 192, seed: seedOf('order') }`: each step waits until the treasury can pay for it and a month's wages, with a caretaker who clears and rebuilds what burns or falls, and with a middling player's answers to Greece. In order: the main street and two streets of houses with fountains, farms, a granary, an agora and a tax office; a shrine, a dairy and a hunting lodge; a third street; oil (groves, a press, a storehouse); fleece; a theatre and a second agora; the watch and the architects (hazards on from here); wine; the quay with its trading post and storehouse, selling oil and wine to the Tyrian ship; crime on; a hut street by the road in; a sea route to Athens; Nea Thasos and a second colony; a barracks with Arcadian hirelings stationed at the first colony; a court and a prison with the law set; an infirmary with health on; the quay storehouse's rules; then two years' play so every overview page has two years of charts. Plague is started in Athens a fortnight before it opens (as `#plague` does), so it opens warned and not landed. It opens on its own view over the town.

**The tuning pass** plays `#order` and `#town` headless for four game years (and the plague in `#plague`), counting crimes, cases and punishments, fever deaths with and without an infirmary, the plague's deaths, the colonies' coin and crime against the watch, and changes only the constants that are plainly off.

**The look pass** brings onto the kit what slice 50 left: the home panel (`household.ts`); the side panel's other tabs; the map of Greece's route tables as real `ktoggle` and `kstep`; one bar tone for a trireme's hull and oars; the town lines under the top bar; the close buttons' `title` to `data-tip`; the overview's tab words at 1366 × 768; Space and Enter on a focused button in the help.

**The findings carried over**, triaged: small and plainly wrong ones fixed, numbers tuned, the rest listed for Oliver under Recorded for later.

| Finding | What I mean to do |
|---|---|
| Tyre's ship says "Ship in N d" while a quarantine holds her | `shipNews` says she waits outside |
| Vassal loyalty "your army too small to fear: 32 men against its 31" | Fix the comparison or the words |
| Militia companies' banner can be taken and marched | Refuse it as for aid companies |
| A quarantine doesn't stop tribute, gifts or colonists sailing out | Hold them while it lasts, if small |
| The health town line ranks last | Rank a fever with the other warnings |
| Close buttons carry `title` | `data-tip` |
| The overview's tab words cut at 1366 × 768 | Look; shorten or let them wrap |
| A trading post on a lake "too shallow" | Check slice 50's wording; say why |
| Colony and company ships in the quay picture | Draw them if small |
| Distribution's sparklines read flat | Look; taller or scaled to their own range |
| The sick at their doors hard to see; the small quarantine pennant | Look; a distinct blanket, a larger pennant |
| Delta and islands anchorage past a wide shelf; the third ship anchoring shallow | Look in `#order`; fix only if it does not move other demos' histories, else record |
| War fleets never prey on a free ally's coin ships; Sparta's or Rhodes' label faded; overlapping triremes at the jetties; the new-game preview on the main thread; the wooded coast's opening; the delta's road over the knoll; the dry plain's site; faint far-band lines; routes' far anchorage; the overview refresh on a real laptop; #colonies' frame work | Look and re-measure; fix the small ones, record the rest |

## Tests

- The existing suite, with `tests/treasury.test.ts`, the purity and `tests/loadorder.test.ts` passing.
- A save round-trip of `#order` (a prisoner, a plague, store rules, messages, a generated land), and a version 37 save loading.
- Tests for any leftover that changes the sim, where they earn their keep.
- `smoke.mjs` opens `#order` and checks what it shows (the gang, the court and prison, the infirmary, the colonies, the plague warning, the storehouse rules); `measure.mjs` adds `#order` and `#bigwoods` with their triangles, draw calls and frame work.
- The demo probe: every demo at opening, before and after.

## Tasks

1. Plan (this file), with the baseline. Commit.
2. `#order` and `#bigwoods`: setups, views, smoke and measure entries. Commit.
3. Leftovers in the sim and the small findings. Commit.
4. Tuning pass: `#order` and `#town` four years headless; tune constants; probe every demo before and after. Commit.
5. Look pass: the panels onto the kit; every new panel of the phase at 1920 × 1080 and 1366 × 768. Commit.
6. Budgets: `#order` and the large woods against the starting commit; fix what is over. Commit.
7. Full checks (tests, build, the slow smoke, the measure, every demo opening, a version 37 save), As built, the check-in. Commit, push.

## As built

Commits: `97019e7` (plan), `572a1c8` (`#order` and `#bigwoods`), `6777ba7` (leftovers), `cd32a09` (tuning), `78f335e` (the look pass), `121b4df` (`#order` sells its wheat to Athens), `a6d063d` (the families test), `074af16` (the health line's rank under the top bar), and the check-in. State version stays **47**: nothing saved was added.

**`#order`** (`orderTown` in `src/game/demos.ts`, view `order` in `views.ts`) is built as planned on `{ kind: 'delta', size: 192, seed: seedOf('order') }`, with what the build needed on top: the careful answerer (`answerCarefully`: never borrows; takes an offer, meets a request or a demand only with three months' wages to spare), heavy taxes kept throughout (the plan's switch to fair taxes left the treasury too thin), a second shrine, three olive groves, an east quarter (`ORDER_MARGIN` 400 dr over its cost before it is laid, so no wage is ever owed), an east agora with oil, fleece and wine stalls, a dairy and a lodge, a watch post by the farms, three more farms so the granary can spare the settlers' wheat (`FOUND_WHEAT`), and a caretaker that rebuilds what burns or falls, stalls and store rules included. The second colony goes to the first open site (Naxos was Rhodes'). The law: theft and vandalism to prison, arson to death, smuggling a fine. It plays two years after the last building, then waits (at most `ORDER_TRIES` = 4 calls of Athens' ship) for a gang in its den and someone in prison, and starts the plague in Athens a fortnight before her ship is due. After the colonies are founded it sells wheat to Athens (Athens buys wheat, meat and cheese, not the oil and wine switched on with the route, whose tab said "nothing switched on"). It opens 16 Dec 744 BC with 1,909 people in 103 homes (41 villas), 7,813 dr, the Aristomache gang in its den, two in prison, Nea Thasos (held by the Arcadian company) and Nea Kythnos, the quay storehouse fetching oil and wine and taking nothing else, plague warned in Athens, 394 messages and 24 months of annals. Setup takes about 13 s at build time.

**`#bigwoods`**: `kindTown('woods', 256, 'acorn')` on the `land` view.

**Smoke and measure**: `smoke.mjs` opens `#order-paused` and checks the land, homes, a level 6, the gang, the law and a prisoner, physicians and the plague warned with no outbreak, 200 messages or more, a store rule set to Get, the company away at Nea Thasos and its page, a month on with 80% of the people; and `#bigwoods-paused` on its land. `measure.mjs` adds `#order` (load, views, people, save size, a frame's work at 960 × 540 and 1920 × 1080) and `#bigwoods` (load, bake, triangles at its opening and furthest views, frame work). `tests/saves.test.ts` round-trips `#order`.

**Leftovers fixed** (`6777ba7`):
- `shipNews` (`trade.ts`): the Tyrian ship held off by a quarantine says "Held · quarantine", she waits out at sea.
- A quarantine holds the settlers on the quay (`colonies.ts`: the founding's days wait, nobody is rowed out) and a gift in the city (`diplomacy.ts`), each saying why. Tribute you pay and what a ruler asked for sail as gifts do (a gift with its deal), so they wait too.
- A vassal's loyalty words (`vassals.ts`): "your army smaller than its own", or "not yet large enough to awe it (about N would)".
- A colony's militia carries its own banner (`render/army.ts`: your city's colours turned about, its colony's initial and name). Marching it by hand is kept: slice 34's aid companies march by hand too, so the plan's "refuse it as for aid companies" was wrong about them.
- The health town line comes right after the debts (`status.ts`), not last; and (`074af16`) the top bar's own order and weights (`townlines.ts`) put it after a raid, a battle and an alarm, before a fire, since they decide what folds: `#order`'s plague warning had been folded under "+1 more".
- The sick at their doors in a pale blue blanket, 1.3 times larger; the quarantine pennant 1.8 times larger (`render/health.ts`).
- Tests for the first two in `tests/health.test.ts`.

**Tuning** (`cd32a09`): one constant. `SPREAD_CHANCE` (`health.ts`) 0.02 → 0.008: `#town` with no physicians lost 22, 82, 96 and 71 a year over four years (ill 216 to 1,017 a year), against the spec's "about 50"; after, 6, 24, 25 and 24 (ill 42 to 344), and it grows to 1,285 instead of stalling at 1,210. `#plague` with no quarantine and no infirmary: 71 dead in its year before, 57 after (210 ill instead of 426), and it still grows. Left as they are, with the numbers for Oliver: colony trade at 4 dr a settler (about 8 to 13% of `#order`'s taxes); the law's deterrence (fines left 52, 38 and 21 thefts a year in `#order`, prison 27, 25 and 29, death 22, 9 and 0, and harsh law costs nothing standing, only rulers' memories when a sentence is passed); the watch against crime (`#order`'s thefts fall from 31 to 6 a year as its posts cover the hut street). The families test (`tests/people.test.ts`) now allows for a partner who died of a fever before the move (with fevers spreading less, `#missing`'s history moved and showed it).

**The look pass** (`78f335e`):
- Home panel (`household.ts`): root `household home kit`, `khead` with a picture by level (tent, thatched hut, tiled house, the estate's drawing for a villa or estate), `ksec` sections with icons, `kitHtml`.
- Side panel's other tabs (`sidepanel.ts`): wrapped in `kit k-side` and passed through `kitHtml`; `kh` headings with icons (a new export of `kit.ts`, which `ksec` now uses), `kbar` for the homes, services and places bars, `kbtn` for the tax rate and the ledger. Military and Monuments were on the kit already.
- Route tables (`routes.ts`): `ktoggle` for sell and buy, `kstep` for keep and up-to; `routeEvent` takes the switch's click (no `change` events any more). The old checkbox and stepper CSS is gone from `style.css` and `kit.css`; the map of Greece's 376 px panel closes the table up so the stepper and the quay column fit.
- Trireme bars on the Army tab: tone `sea` with the fit mark, as in the shipyard.
- Town lines (`townlines.ts`, `kit.css`): root `townlines kit`; parchment in the thin bronze frame, the icon in a socket ringed in the line's colour (the skin's frame had hidden the old coloured left edge); "+N more" a bronze plaque.
- The quay picture (`trade.ts`) draws your own ships at anchor off the jetty (`bayShips`: a colony's cargo with its sacks, a company's passage, a militia's in red), nearer than the route ships, three at the most, each with its hover's words as its tip.
- Close buttons: `data-tip` on the home, building, trade, shipyard, messages, ambitions and Greece panels (the ledger and the message pop-ups are not kit panels and keep `title`).
- The overview's tabs under 1500 px wide drop their icons and close up (`overview.css`): at 1366 × 768 every name shows whole. Distribution's sparklines are fitted to their own range, never closer than 30 points (`chart`'s new `fit`).
- Help: "Space: pause or carry on, even with a panel's button in focus (Enter presses the button)".
- Looked at, at 1920 × 1080 and 1366 × 768: the home panel, every side tab, the trade panel's Athens route, the map of Greece's Trade tab, the court, prison, infirmary, quay storehouse and watch post panels, the overview's City, Distribution, Crime, Health, Empire and Army pages, the Messages panel, the quay picture with a company's ship at anchor (`#colonybase`), and the sick at a door in `#physicians`.

**Touched outside the line** (files of other slices): `src/sim/trade.ts`, `colonies.ts`, `diplomacy.ts`, `vassals.ts`, `status.ts`, `health.ts`; `src/render/army.ts`, `render/health.ts`, `render/greece/index.ts` (its close button); `src/ui/household.ts`, `townlines.ts` (its order and weights too), `sidepanel.ts`, `routes.ts`, `trade.ts`, `armytab.ts`, `shipyard.ts`, `buildingpanel.ts`, `messages.ts`, `ambition.ts`, `help.ts`, `overview.ts`, `overview.css`, `icons.ts` (`buildingIcon` takes any build button's name), `kit.ts` (`kh`), `kit.css`, `style.css`; `tests/health.test.ts`, `tests/people.test.ts`; and by the review, `src/sim/favours.ts` (what deal goods held by the quarantine say). No `MAP_SIZE` was added anywhere.

**Recorded for later** (not fixed): war fleets never prey on a free ally's coin ships; the delta's and islands' anchorage past a wide shelf and the third ship anchoring shallow (not seen in `#order`'s bay); Sparta's or Rhodes' label fading and overlapping triremes at the jetties on the map of Greece; the new-game preview on the main thread; the wooded coast's opening; the delta's road over the knoll; the dry plain's site; faint far-band lines; routes' far anchorage; whether the overview's refresh stutters on a real laptop; a widow stays "wife of" a husband who died (seen in the families test); harsh law has no standing cost.

**Review** (the review of slice 52): five bugs fixed and two small ones. (1) `health.ts`: a struck household could flee on its first day ill, and in `#order` the first one always did, so the plague passed the next day and the quarantine decision was moot; a household now flees only once a sick member has been ill `FLEE_AFTER` (4 days). Let in, the plague now strikes 14 homes in `#order` (70 ill, 24 dead, 2 households fled, about 35 days); quarantined, none. No demo's opening changes (no plague lands during a setup). (2) `render/army.ts`: banner atlas cells were keyed on the company's number, which an ally's or colony's militia counts from 1 too, so your 1st company flew the militia's banner; now a cell per banner slot drawn. Seen on screen both ways. (3) `favours.ts` `sentWords`: deal goods held by the quarantine say so, as a gift does in `diplomacy.ts`. (4) `status.ts` `whyNoGood`: in a town whose homes have had the good, not "yet" nor "the first". (5) `kit.css`: the map of Greece's route table was 7 px wider than its panel's body (the quay column cut); cells, bosses and well a pixel or two smaller, 327 px in a 360 px body. Small: `vassals.ts`' loyalty words without nested brackets, comparing against the rounded army; `demos.ts` loses the press storehouse's oil limit of 200 (a limit is a quarter share, so the command was refused and did nothing). Not changed: `#bigwoods`' furthest view (about 2 M tree triangles in the scene, drawn again for shadows since the shadow box spans nearly the whole 256 land at that distance): every cure changes the look, left for Oliver's eye on a real machine.

**Checks before the check-in**

The starting build (`0f9dc87`) and this slice's, measured with the same loosened `measure.mjs` on this machine: headless, software WebGL, load about 4 on 4 cores for the first run and about 8 for the second (the full smoke and the tests ran beside it), so every time below is noisy, the second's more so.

| What | Before (`0f9dc87`) | After |
|---|---|---|
| Tests | 780 in 59 files, all pass (4 min 7 s) | 783 in 59 files, all pass (5 min 24 s, under load) |
| Build | 2.9 s with the prepared towns cached | about 4 s cached; 1 min 37 s when the demos bake again (`#order` takes about 13 s of it) |
| The game itself | 2,990 KB, 993 KB gzipped | 3,000 KB, 997 KB gzipped |
| Prepared towns | 123 files, 4,433 KB gzipped (largest 57 KB) | 125 files, 4,520 KB gzipped (largest 82 KB, `#order`) |
| The bare link, ready (page's clock) | 1.49 s | 1.67 s |
| Every demo's load at 1920 × 1080 | 165 demos, median 1.38 s, slowest `#delta` 2.53 s, none over 3 s | 167 demos, median 1.67 s, slowest `#delta` 2.39 s, then `#lend` 2.21 s and `#order` 2.15 s, none over 3 s |
| `#order` | (new) | ready at 2.05 s, first frame 3.44 s; its view 2.52 M triangles and 150 draw calls, the overview 2.94 M and 204; 1,909 people, 173 walkers; a save of 429 KB |
| `#order`, a frame's work before drawing | (new) | 19.7 ms at 960 × 540, 17.8 ms at 1920 × 1080; `#empire` in the same run 25.6 ms (13.8 ms in the quieter first run) |
| `#bigwoods` (256, woods) | (new) | baked in 392 ms, ready at 2.11 s; opening 2.66 M triangles and 117 draws, furthest 4.76 M and 227 (`#landlarge`, 256, plain: 1.84 M and 95, 2.58 M and 171); 1.2 ms a frame before drawing |
| Triangles and draw calls in every earlier view | | identical |
| The smoke (loosened timeouts) | | every check passes, `#order`'s and `#bigwoods`' included (50 min) |

- **Every earlier demo opens exactly as before.** I opened all 165 earlier demos from the starting build and from this one, paused, and compared the date, people, money, homes, levels and buildings: all 165 are the same. The fever change moves a demo's history only after it opens, once its homes fall sickly (the families test caught it in `#missing`).
- **Saves**: no format change; the version 37 save in the tests loads, and `#order` saves and loads round.
- **The budgets**: every demo is under 3 s. `#order`'s frame work is about three quarters of `#empire`'s in the same run. `#bigwoods` at its furthest is the heaviest view in the game, about 1.8 times `#landlarge`'s, almost all of it trees and timber. Headless software rendering can't say what that does to a laptop's frame rate. I left it as it is and would like you to look at it on a real machine; if it stutters, thinning the far trees is the fix I'd try.
