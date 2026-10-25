# Phase 6: Crime, health and a polished city

*25 Oct 2026. Chosen by Oliver after phase 5 ("Ambitions and empire" with "A deeper city") and the original-look side slice, in his own list of eight: "Improved crime and punishment (prisons, punishments, diverse crime); health (hospitals, plague, doctors); a better notification system (a proper menu and location, with trackable history); an overview menu (resources, crime rates, health, distribution, treasury); diverse map generation (larger maps, procedural generation, diverse terrain); better sub menus (icons, fitting textures and polish, the military tab and the trading post's panel); storehouse and building controls (what's stored, how much it accepts, which goods, like the original); and a deeper colony system", "as before, parallelisation where possible". It serves pillar 1, "The city feels alive" ("Each house is a household with needs, a mood and a small story"), through crime, justice and health; pillar 2, "Warm, storybook Greece" ("every slice can look finished"), through the panels and new lands; and pillar 3, "A world that remembers" ("You can found colonies ... and run them lightly"), through deeper colonies. The vision's "readable depth" is the thread through the messages, the overview and the building panels. Pillar 1 still wins every conflict. The gods are not in this phase.*

Three bugs Oliver reported in the same message (goods not reaching the quay, the war options counting only men with armour, no horsemen at the barracks) are fixed in their own thread and reach this phase through `main`.

## Summary

At the end of phase 5 the city has thieves, seasons, estates, an empire and ambitions, but its surface hasn't kept up with its depth. News arrives as popups that come and go with no record. There is nowhere to see the whole city at once. Most buildings say nothing when clicked, and a storehouse takes whatever comes. The sub-menus are plain text and plain buttons. Every game is played on the same 128-tile bay. Crime is only theft with a fine, nobody is ever ill, and a colony is a number that sends goods.

This phase does three things:
- **Crime and health become systems with choices.** There are five new kinds of crime besides theft, and gangs. A court tries the caught, a prison holds them, and the law you set decides each punishment. Physicians and infirmaries keep homes healthy. Sickness and plague can spread when they don't.
- **The surface catches up.** A message scroll keeps a history you can filter and go back to, and only the urgent pops up. An overview shows every good, the treasury, distribution, crime and health in one place. Clicking any building gives its own panel, and the storehouse and granary have the original's controls. Every sub-menu gets icons, drawn textures and proper controls in the original's look.
- **The world gets wider.** A land generator makes maps in three sizes and several kinds (a bay, islands offshore, a river delta, a mountain shore, a dry plain, a wooded coast), chosen on a new-game screen with a preview. Colonies grow up from outposts into towns: they have works you fund, wants you supply by ship, and governors you choose, and later they become bases for your fleets and armies.

The phase is planned to be **built on four lines at once** (see *The parallel plan*), so twelve slices take about five slices' worth of time.

## Oliver's decisions

| Question | Oliver's answer |
|---|---|
| What should the next phase be? (25 Oct) | His own list: crime and punishment, health, notifications, an overview, map generation, better sub-menus, building controls, deeper colonies. |
| How should it be built? (25 Oct) | "As before, parallelisation where possible": parallel lines in worktrees, as in phase 5. |
| How should a new game choose its land? (25 Oct) | A new-game screen with a preview: pick a kind of land, a size and a seed, see it, then found the city. The bay he knows stays as a choice. |

## Claude's defaults (Oliver can change any of these)

**Crimes of every kind (slice 41)**
- **Five new crimes beside theft**, each from its own kind of trouble and with its own figure in the streets:
  - **Pickpockets** work the crowds at the agora and the theatre. Homes whose people shop or watch there lose a little coin, and the agora's panel says "pickpockets about". They come from poor homes near busy places.
  - **Vandals** come from angry, idle homes. They smash a fountain's spout, a market stall or a shrine's statue, and the building stops serving until the architect's men mend it (a small repair cost). You can see the damage.
  - **Arsonists** are rare and come from the most aggrieved homes (hungry, harshly taxed, robbed, unhappy for long). They set fire to a richer home or a store. Talk of it is heard in the quarter first ("talk of burning among the potters").
  - **Smugglers** at the quay and the caravan yard: goods waiting for a ship or caravan slip away. They come from poor homes near the waterfront.
  - **Crooked tax collectors** skim the takings when wages are owed and no watchman walks by the tax office; the ledger has a "Skimmed" line.
- **Gangs.** When a quarter's temptation stays high for months, a gang takes a house as its den, which shows. A den sends out criminals more often and its men fight a lone watchman. Two watch posts covering the quarter break it up. A forming gang is said aloud a season ahead.
- **Where it shows:** the crime overlay shows every kind; a home's panel names which crime tempts it and why; each crime has a town message; the ledger and stock book have their lines.
- **Off in prepared histories, as theft was:** a loaded town starts from no temptation and builds up.

**The court and the prison (slice 45)**
- **The court** (new, 3×3): a magistrate and jurors. With no court, the caught are fined on the spot as now. With one, the watchman walks the caught to the court and they are tried within days.
- **The law** is set on the court's panel: a punishment for each kind of crime, chosen from:
  - **a fine**: coin from the household; a weak deterrent, nearly none for the rich;
  - **the stocks**: a day pinned in the agora for all to see; a strong deterrent in that quarter, and the household's mood falls;
  - **prison**: months behind bars, so the household loses a worker; it needs room in a prison;
  - **hard labour**: months cutting stone in the quarry or digging in the mines as unpaid hands. It fills jobs, and it is harsh: the whole class's mood falls a little;
  - **exile**: the household is banished and leaves an empty home. It is the strongest deterrent and the harshest: rulers hear of it, and the poor grumble.
  The panel shows each choice's deterrence and cost with reasons. There are no executions, to keep the game's warm tone.
- **The prison** (new, 3×3): cells for a number of prisoners, and guards. A prison that is overfull or short of guards sees escapes, warned of first ("the prison is crowded and the guards are restless"). A jailbreak lets the prisoners out as criminals.
- **The crime rate** is kept month by month (crimes per thousand people, by kind), which the overview shows.
- The watch post gets a sergeant: with two posts within reach of each other, their watchmen help each other chase.

**Physicians and plague (slice 49)**
- **Every home has a health** from 0 to 100, with reasons. It rises with a physician's visits, water and a varied table. It falls with crowding, hunger, no water, winter, and neighbouring works that make the air foul (the hunting lodge, the dairy, the pasture, the tannery yard of the caravans). A home's panel says it ("Healthy: the physician called last week" or "Sickly: crowded, no physician this season").
- **The infirmary** (new, 2×2): physicians walk rounds in crews, like the other services, treating the sick and raising health. It isn't a need for a house to grow, as in the original, so no existing town falls a level.
- **Sickness:** a home of low health can fall ill. A sick member stops working, coughs at the door, and recovers or dies. Sickness spreads to nearby homes of low health.
- **Plague:** an outbreak comes in on a ship or caravan from a plagued city of Greece (the News of Greece says so first: "plague in Athens"), or rises in a crowded, dirty quarter in summer. It spreads fast from home to home: people die, families flee the city, workers fail and the whole city's mood drops. It always gives a warning first, and the city always recovers.
- **Answers:** more physicians; **the asklepieion** (new, 4×4), a hospital where stretcher-bearers bring the sick and they mend faster, which also lifts health around it; and a **quarantine** order that closes the quay and the roads in for a season, stopping trade, ships and caravans while it lasts.
- **Off in prepared histories:** health starts at a home's fair level when a town loads, and plague never comes in a town's first year.

**The town's messages (slice 44)**
- **One message log in the town**, kept with the save. Every event the town hears is written in it: the news of Greece, the army's news, fires, ships, caravans, crimes, colonies, monuments, ambitions and the rest. Each message has a date, a kind, how urgent it is (news, warning or alarm), a title, the full words, and where it happened (a tile, a building, a company, a city or a site). It keeps three game years, up to 600 messages.
- **Where you read it:** a scroll button on the top bar shows the unread count, coloured by the most urgent unread. It opens a Messages panel on the left, like the original's message scroll:
  - messages grouped by month;
  - filter chips (City, Trade, Greece, War, Crime, Health, Empire, Works);
  - unread messages in bold;
  - each message's place is a link that goes there (the city camera or the map of Greece) and marks it read;
  - mark all read, and pin a message so it stays at the top.
- **Quieter popups.** Only alarms pop up: a raid arriving, a fire, plague, a rebellion, a blockade. They appear one at a time in one place at the bottom left, fade after a few seconds, and never cover the middle of the city. Everything else arrives quietly into the scroll, with a soft sound and the badge. The panel has a setting for which kinds may pop up.
- **The lines under the top bar** keep only what the town is short of (bread, workers, money), since that is how things stand rather than news. News lines move to the scroll.
- Old saves start with an empty history ("Messages from before this save weren't kept").

**Building panels and the storehouse (slice 48)**
- **Every building opens a panel when clicked**, if it doesn't have one already. The panel shows:
  - its name and a small drawn picture;
  - its staff ("3 of 4: short of workers in the east");
  - what it is doing, and why not ("Idle: no olives coming; the groves' carts are full");
  - what it holds;
  - its walkers, with a button to follow;
  - its condition (fire risk, wear);
  - its controls.
- **The storehouse and granary**, as in the original, have a row for each good they can take: what's in store (a bar and the number), and a setting:
  - **Accept** (the default);
  - **Don't accept**;
  - **Get**: its carts fetch the good from other stores;
  - **Empty**: its carts take the good out to other stores.
  Each good also has a limit: all, three quarters, half or a quarter of its room. Carts, porters and the quay's dockers follow the settings. A whole store can be set to accept nothing in one click.
- **Other controls:** any work or service building can be **paused**, sending its workers to other jobs, and given **workers first**, so it fills before others. Panels that already exist (the trading post, the barracks, the shipyard, the monuments) are reached from the building as now.

**The overview (slice 51)**
- **One window for the whole city**, from a top-bar button or the O key, with a page for each of the original's advisers:
  - **City:** people by level, homes, mood, work and wages.
  - **Goods:** each ware with what's in store, what was made and used last month, bought and sold, months of supply, and the trend with its reasons.
  - **Treasury:** the ledger for last month and the year, debts, loans and tribute.
  - **Distribution:** for each service and good, the share of homes it reaches and where the gaps are; clicking one shows its overlay.
  - **Crime:** the rate by kind and by quarter, how many were caught, punished and imprisoned.
  - **Health:** the sick, physician coverage, and the plague risk.
  - **Army and fleet.**
  - **Empire:** vassals and colonies.
- **History:** the town keeps a figure for each month (population, money, stores, crime, health), so each page has small charts of the last two years.
- Every figure names its reasons, and clicking goes to the place or the overlay.

**A new look for the panels (slice 50)**
- **A shared kit for every panel and sub-menu**, in the original look's colours and textures: parchment and marble from the existing skin, carved headers, drawn icons for every good, unit, building and action (all in code, as SVG), proper steppers, toggles and sliders, and bars for stock and strength.
- **The military tab:**
  - each company is a card with a drawn figure of its kind;
  - its men are shown as pips (ready, waiting for armour, wounded, walking in);
  - its order buttons have icons;
  - "16 of 32 ready: 16 wait for armour" is spelled out;
  - recruit buttons for hoplites, archers and horsemen, each saying why not when it can't.
- **The trading post:**
  - goods as icons with stock bars and price chips;
  - a picture of the quay and the ship's state;
  - the steppers made easier to use.
- **The rest:** the shipyard, colonies, vassals, loans, monuments, ambitions, routes, prices and rivals panels move onto the kit too.
- Hover tips and keyboard focus behave the same way across all of them.

**Lands of any size (slice 42) and many lands (slice 46)**
- **Three sizes:** small (128 tiles square, today's), medium (192) and large (256, four times today's area).
- **Kinds of land:**
  - **the Bay**, today's hand-made map, kept exactly;
  - **a sheltered bay** (generated);
  - **islands offshore**;
  - **a river delta** (channels, reeds and marsh);
  - **a mountain shore** (cliffs, little flat land, rich in marble and copper);
  - **a dry plain** (ochre ground, olives and vines, little wood, water scarce away from the river);
  - **a wooded coast** (deep pine and oak woods for timber).
  Each kind has its own palette in the original look.
- **The sea always lies to the south**, as today, so ships, landings, the quay and trade come and go as they do now. Roads in from the other cities come from the north, east and west edges, at places that depend on the land.
- **The generator** places everything a game needs on every land: a river, fresh water, farmland, groves, grassland, copper and marble rock, woods, a quay site and a headland for the Lighthouse. Every land is checked to be playable: the roads in meet, the quay can be reached, and there is room for a city.
- **The new-game screen (Oliver's choice):**
  - it opens from the welcome card's "Found a new city";
  - pick a kind of land, a size and a seed (a word, or "another"), and see a drawn preview of the land from above, with its resources marked;
  - then found the city there.
  Your city's place in Greece doesn't change.
- **Saves carry their land** (its kind, size and seed), so a loaded town rebuilds the same ground. Every demo keeps its own town on the Bay.

**Colonies that grow up (slice 43) and a colonial empire (slice 47)**
- **Colonies grow in stages:** outpost, settlement, town and city, at population thresholds. Each stage shows in a drawn picture of the colony on its page, from tents to a walled town with a temple and a harbour, and on its model on the map of Greece.
- **Works you fund:** each stage opens works you can pay for, in drachmas and goods shipped out:
  - a harbour: its ships come faster and its share grows;
  - walls: raids fail more often;
  - an agora and a temple: loyalty;
  - fields: it feeds itself, and grows faster;
  - a second trade from its site: a second good to send you.
  The goods go out from your quay. Porters carry them to the quay, and a ship sails.
- **Wants:** a colony asks for things now and then (wheat after a bad winter, wine for a festival, armour for its militia), each with a deadline. Meeting a want raises loyalty and growth; ignoring it is remembered. You send goods from the colony's page and they leave on a ship, as above.
- **Governors:** when a colony is founded, or its governor dies or is dismissed, you choose from two or three candidates, each with a trait (a builder, a miser, a soldier, a favourite of the people) that changes how the colony grows and how loyal it is.
- **A colonial empire (slice 47):**
  - station a company or triremes in a colony: they defend it, and expeditions launched from it are shorter;
  - colonies trade with Greece on their own and pay you a share of their trade;
  - in your wars, a colony sends its militia;
  - a grown colony that wants its freedom can be offered a treaty that makes it a free ally, as a peaceful end, instead of a revolt;
  - an Empire page lists every vassal and colony with its loyalty, share and wants.
- **The city comes first:** colonists visiting home, the colonies' ships in your bay, and goods going out from your quay are things you can see in the city.

**A city in order (slice 52)**
- `#order`: a prepared town on a generated medium river delta, with every new system in it.
- Numbers are tuned across a few years of play, and there is a look pass that brings slices 49 and 51's new panels onto slice 50's kit. The budgets are checked on a large land.

## What's there today

Phase 5 and the original-look side slice are complete. State version 37, 590 tests, 136 demos opening from prepared towns.

- **Crime** (`src/sim/crime.ts`, slice 30): temptation per home with named reasons, thieves who rob homes, stores and the tax office, and watchmen who deter and catch them, with a fine. Theft is the only crime, and the fine the only punishment.
- **Health:** none. Nobody falls ill; soldiers are wounded in battle (`battle.ts`).
- **News** reaches the player as lines under the top bar (`src/ui/townlines.ts`, from `townLines` in `src/sim/status.ts`): shortfalls and news mixed, the news worked out from each system's own records (diplomacy's news, the army's news, crime's notices) and gone when they age out, with no history. Floaters (`src/ui/floaters.ts`) show coin changes.
- **The side panel** (`src/ui/sidepanel.ts`) has Goods, People, Services, Money, the Army tab (`armytab.ts`), Monuments and the building tabs; the ledger (`ledger.ts`) and stock book (`stockbook.ts`) are monthly. There is no single overview.
- **Clicking a building:** homes open the household panel, the barracks and shipyard the Army tab and shipyard panel, the trading post and caravan yard the trade panel, and monuments the Monuments tab; most other buildings only follow a walker. Stores (`src/sim/stores.ts`) take whatever has room, with no rules.
- **The map** is one hand-made 128-tile coast (`src/map/coast.ts`, baked by `bake.ts` from `CoastData`), with `MAP_SIZE` a constant used in about 50 places (sim arrays, saves, migrations, terrain, water, the camera's limits, demos).
- **Colonies** (`src/sim/colonies.ts`, slice 37): founding with real families, growth, a share by ship, loyalty with reasons, threats and independence. A colony has no stages, works, wants or governor choice.
- **The look:** the original-look side slice made the classic view the default (`src/render/classic.ts`, `jobfolk.ts`); panels use the lit marble and parchment skin (`src/ui/relief.ts`, `skin.ts`, `skin.css`) with mostly text and plain buttons.

## What Oliver will experience

**A quarter going bad.** The poor quarter behind the agora has been hungry for a season. A pickpocket works the agora crowd, a vandal smashes the fountain's spout, and a message says a gang is gathering in the potters' quarter. He builds a second watch post, a court and a prison. He sets the law to the stocks for pickpockets and prison for gangs, and over a few months the crime chart on the overview falls.

**Plague from Athens.** The scroll lights red: plague in Athens, and her ship is due. He orders a quarantine, and the ship waits outside. When a sick family in the crowded harbour quarter coughs anyway, the physicians from two infirmaries close in, and the asklepieion's stretcher-bearers carry the worst away. The plague burns out in three homes instead of thirty.

**Reading the town.** He opens the scroll to see what happened while he was building. He filters to War, clicks a raid from last spring, and the camera goes to the gate. He presses O and sees wine running out in four months, crime up in the east, and the treasury's year. He clicks the storehouse by the quay, sets it to accept only wine and to empty its oil, and watches the carts obey.

**A new land.** He starts a new game, picks a mountain shore at the large size, rerolls twice until the marble cliffs sit near the harbour, and founds his city on ground he has never seen.

**A colony that grows up.** Nea Thasos asks for wheat after a hard winter. He sends it, and the porters carry sacks to the quay. A year on he funds its harbour, and its picture on the page gains a jetty and a second ship. Later he stations two triremes there, and Rhodes' raid fails.

**Panels worth looking at.** The Army tab shows each company as a card with a hoplite's figure and pips for its men, and the trading post shows each good with its picture and a bar.

## Technical design

- **State (`src/sim/state.ts`):** each new system adds **one top-level field**, with its types in its own module:
  - `crime` grows (slices 41 and 45): kinds, gangs, the law, cases at court, prisoners and the monthly rate;
  - `health` (slice 49): the outbreak and quarantine; each home's health and sickness live on the home record;
  - `messages` (slice 44): the log, its read marks and settings;
  - `rules` on store records (slice 48), and `paused` and `first` on buildings;
  - `annals` (slice 51): a figure for each month;
  - `land` (slice 42): the land's kind, size and seed;
  - colonies grow inside `empire`/`colonies` (slices 43 and 47).
- **The map's size** stops being a constant: the sim reads the land's size from the state, and the renderer from the baked map. `bakeCoast(data)` already takes its data; slice 42 adds `generateCoast(kind, size, seed)` (pure and seeded, in `src/map/`), which returns that data.
- **New modules:**
  - `src/sim/gangs.ts`, `justice.ts` and `health.ts` (order line);
  - `src/map/generate.ts`, `src/map/lands.ts` and `src/ui/newgame.ts` (land line);
  - colony stages, works, wants and governors in `src/sim/colonies.ts` or new `src/sim/colonyworks.ts` (empire line);
  - `src/sim/messages.ts`, `src/ui/messages.ts`, `src/ui/buildingpanel.ts`, `src/sim/annals.ts` and `src/ui/overview.ts` (panels line);
  - `src/ui/kit.ts`, `kit.css` and `icons.ts` (slice 50).
- **Messages:** one function, `say(s, msg)` in `src/sim/messages.ts`, is the only way into the log. Slice 44 routes every existing news source into it (diplomacy's news, the army's news, crime's notices, the town lines' news kinds). Once it is merged, every new event in every line goes through `say`.
- **Building panels:** slice 48 makes a registry in `src/ui/buildingpanel.ts`, a section per building kind. Once it is merged, each new building adds its own section there.
- **Rendering:**
  - new walkers (pickpockets, vandals, arsonists, smugglers, gang men, prisoners led by a watchman, physicians, stretcher-bearers, sick figures at doors) join the instanced batches, with jobfolk workers at the new buildings;
  - broken building states and gang dens are drawn on the existing meshes;
  - the court, prison, infirmary and asklepieion are drawn in code in the original look;
  - each land kind's palette goes through `classic.ts` and the terrain's colours;
  - colony pictures are drawn in code (SVG or a small canvas) on their pages.
- **Money:** fines, repairs, skimmed taxes, quarantine's lost trade, colony works and shipments go through the treasury with their own reasons, so the ledger invariant holds.
- **Principles held:** the sim stays pure and deterministic (seeded random only, `dmath` maths, the land generator too); the renderer and UI only read; every action is a command; nothing beyond the walls that the city can't feel.
- **Targets tuned by eye:**
  - how often each crime happens, and each punishment's deterrence;
  - prison sizes and escapes;
  - how fast health rises and falls, how far sickness spreads, and how often plague comes and how hard;
  - how many messages pop up;
  - store limits and cart behaviour;
  - each land kind's shapes and colours;
  - colony stage thresholds, the price and effect of each work, how often wants come;
  - the frame and load budgets on a large land.

## The parallel plan

The phase splits into four lines that touch different parts of the code. Each line's slices run one after another; the lines run at the same time, each in its own git worktree on its own branch. Phase 5's rules carry over unchanged: state versions are numbered at merge, kinds are appended in lists, shared files are edited in each slice's own blocks, and the trunk is merged back into a line before its next slice.

| Line | Branch and worktree | Owns (mostly) | Slices |
|---|---|---|---|
| **Order** | `claude/p6-order`, `/home/claude/zeus-order` | crime, the watch, justice, health, homes and households (`crime.ts`, `houses.ts`, `folk.ts`, `hazards.ts`, `household.ts`, new `gangs.ts`, `justice.ts`, `health.ts`) | 41 Crimes of every kind, 45 The court and the prison, 49 Physicians and plague |
| **Land, then look** | `claude/p6-land`, `/home/claude/zeus-land` | the map and its making (`src/map/*`, `terrain.ts`, `water.ts`, `trees.ts`, `cameraRig.ts`, `minimap.ts`, `welcome.ts`, new `newgame.ts`); in wave 3, the panels' shared kit | 42 Lands of any size, 46 Many lands, 50 A new look for the panels |
| **Empire** | `claude/p6-empire`, `/home/claude/zeus-empire` | colonies, vassals and the map of Greece's pages (`colonies.ts`, `vassals.ts`, `growth.ts`, `src/ui/colonies.ts`, `empire.ts`, `src/render/greece/*`) | 43 Colonies that grow up, 47 A colonial empire |
| **Panels** | `claude/p6-panels`, `/home/claude/zeus-panels` | messages, building panels, stores' rules, the overview (`townlines.ts`, `floaters.ts`, `stores.ts`, new `messages.ts`, `buildingpanel.ts`, `annals.ts`, `overview.ts`) | 44 The town's messages, 48 Building panels and the storehouse, 51 The overview |
| **Trunk** | `claude/project-thread-2jx118` (and `main`) | merges, then the slice that needs everything | 52 A city in order |

**Waves and what waits for what**

```
wave 1             wave 2                     wave 3                       then
41 Crimes ──────── 45 Court and prison ────── 49 Physicians and plague ─┐
42 Lands of any ── 46 Many lands ──────────── 50 A new look for panels ─┼── 52 A city in order ── phase review
43 Colonies grow ─ 47 A colonial empire ─────────────────────────────────┤
44 Messages ────── 48 Building panels ─────── 51 The overview ───────────┘
```

- Within a line, each slice builds on the one before:
  - crime's kinds come before the court that judges them, and health comes last on the order line because it also changes homes and the household panel;
  - land sizes come before land kinds;
  - colonies' stages and works come before the colonial empire;
  - messages come before building panels, because the panels list a building's messages;
  - the overview comes last on the panels line, once crime's kinds and the court have merged.
- Across lines, the only dependencies point backwards in time:
  - 48 and 51 read the crime and colony work merged in waves 1 and 2;
  - 50 restyles the panels that exist when wave 2 has merged;
  - 51's Health page and 50's kit are wired to slice 49's panels at the merge (as slice 39's milestones were in phase 5), and 52 finishes that.
- **Wave 1 depends on no open question.** Oliver's land choice only shapes slice 46.
- **The empire line ends after wave 2**, so wave 3 has three builders. That spares the loaded machine.
- 52 and the phase review run on the trunk alone.

**How a slice reaches the trunk** (as in phase 5)
1. The builder and the reviewer work on the line's branch, in the line's worktree, and push the line's branch after every commit (never `main`, never another line's branch).
2. When the reviewer is done, an integrator merges the line into the trunk with `git merge --no-ff` (never rebase or force-push), in the order the slices finish. It resolves the shared files by the rules below, renumbers the state version and runs the invariants on the merged trunk. It merges `origin/main` first if `main` has moved (the bug thread pushes there), then pushes the trunk and `main` and syncs the shared mirror.
3. Before a line starts its next slice, it merges the trunk back into its branch.

**State versions are numbered at merge.** Each slice's migration is its own `fromSliceN` that fills only its own fields if absent and pads goods arrays to `GOOD_COUNT`. On its line, a slice takes the trunk's version plus one. At merge it gets the next free trunk version (the first to merge gets 38). Tests compare with `SIM_STATE_VERSION`, except a migration step's own test.

**Lists are append only, trunk first.** New building, walker and round kinds and command kinds go at the very end of their lists; at merge the trunk's entries come first. **No new wares** are planned this phase. If one is needed, its line asks the orchestrator for a number first.

**The map's size.** Slice 42 replaces `MAP_SIZE` with the land's size. Lines in wave 1 avoid new uses of `MAP_SIZE`, and the integrator of slice 42 converts any that merged before it. After 42 merges, nobody uses `MAP_SIZE` outside `src/map/coast.ts` (where it stays as the Bay's size).

**Messages and building panels.** Until 44 merges, lines raise their news the way their system already does, and 44's integrator (or the line's next merge from the trunk) routes them through `say`. After 44 merges, all new news goes through `say`. The same holds for 48's building-panel registry.

**Shared files and who touches them**

| File | Rule |
|---|---|
| `src/sim/state.ts` | one new top-level field per system, plus new kinds appended at the end of the lists |
| `src/sim/migrate.ts` | one `fromSliceN` function and one line per slice; renumbered at merge |
| `src/sim/sim.ts` | one step call per new system: city systems after `stepCrime`, empire's after `stepColonies`, messages' and annals' last |
| `src/sim/commands.ts`, `src/game/orders.ts` | new command kinds appended |
| `src/main.ts` | each slice's wiring in a block headed by its slice number; the click handler's new cases each in a block of their own |
| `src/game/demos.ts`, `tests/prepared.ts`, `scripts/smoke.mjs`, `scripts/measure.mjs` | new demos appended in a block headed by the slice number |
| `src/ui/categories.ts`, `src/ui/sidepanel.ts`, `src/ui/topbar.ts`, `src/ui/help.ts`, `src/ui/skin.css` | new rows appended in the slice's own block |
| `docs/CHECKINS.md` | each check-in at the top; the integrator keeps them newest first in merge order |

Anything else outside a line's own files is kept small and listed in the plan's *As built* under **Touched outside the line**.

**Histories.** Each slice checks that earlier demos open as before against its own starting point. New crimes, gangs, sickness and plague are switched off in prepared histories, as theft was. Slice 42 must leave every demo exactly as it was (the Bay at 128). Slice 48's store rules default to "accept everything", which is today's behaviour. At each merge the integrator rebuilds the prepared towns and checks that the only differences are the merged slice's own.

**Agents.** Each line has one builder at a time, followed by a reviewer, then an integrator merges. So at most four builders run at once (three in wave 3). Briefs live in the scratchpad and are backed up to `/mnt/project-files/zeus-briefs/phase6/`.

## Testing

Only where it earns its keep:
- **Determinism:** the same seed and commands give the same city after N ticks, with a gang, a trial, a prisoner, a sickness, a plague, a colony shipment and store rules in it. The same land kind, size and seed give the same map.
- **Independence:** a town that uses none of the new things plays exactly as before. Every demo on the Bay is unchanged by slice 42.
- **Saves:** a round-trip with a prisoner, a plague, store rules, messages and a generated large land. A version 37 save loads and plays on. Migrations applied in either order between lines give the same state.
- **The ledger invariant** with fines, repairs, skimming, quarantine, colony works and shipments.
- **Routing:** watchmen walk the caught to the court; carts obey store rules (accept, get, empty, limits) and never loop; physicians and stretcher-bearers reach homes.
- **Lands:** every kind at every size generates a playable map (the roads in meet the city area, the quay site can be reached, there is copper, marble, wood, grass and farmland). Generation stays inside its time budget.
- **Health:** a plague always warns before it spreads and always ends. Quarantine stops arrivals.
- **Messages:** every news source reaches the log once, never twice, and the log stays within its cap.
- **Budgets:** the prepared demos still open under 3 seconds; a large land and `#order` hold the frame budget headless; generating a large land takes under a second.

## Build slices

Slices are numbered across the whole project. Wave 1 (41 to 44), wave 2 (45 to 48) and wave 3 (49 to 51) each run at the same time on their lines; check-ins appear in the order slices merge.

### Slice 41 — Crimes of every kind (order line, wave 1)
- Pickpockets at the agora and theatre, vandals and broken buildings mended by the architect's men, rare arsonists with talk first, smugglers at the quay and caravan yard, crooked tax collectors.
- Gangs: dens that form in a quarter of lasting temptation, are warned of, send more criminals, fight a lone watchman, and are broken by two watch posts.
- Each kind named in the home's panel, the crime overlay, the ledger and the stock book.

*Oliver can:* open `#crimes` to watch a pickpocket in the agora crowd, a vandal at a fountain and a smuggler on the quay, and `#gang` to see a den in the poor quarter and break it with a second watch post.

### Slice 42 — Lands of any size (land line, wave 1)
- The land in the state (kind, size, seed); `MAP_SIZE` replaced by the land's size across the sim, saves, migrations, terrain, water, the camera and the minimap.
- `generateCoast(kind, size, seed)`, pure and seeded, starting with a generated sheltered bay at all three sizes, checked playable.
- The Bay unchanged, every demo exactly as before. Large lands hold the frame and load budgets.

*Oliver can:* open `#landlarge` to start on a generated 256-tile sheltered bay and lay out a city, and `#landsmall` and `#landmedium` to compare.

### Slice 43 — Colonies that grow up (empire line, wave 1)
- Stages (outpost, settlement, town, city) with a drawn picture on the colony's page and on its model on the map.
- Works you fund with drachmas and shipped goods; wants with deadlines that you meet by ship from your quay; governors chosen from candidates with traits.

*Oliver can:* open `#colonywants` to see Nea Thasos asking for wheat and send it from the quay, and `#colonyworks` to fund a harbour and watch the colony's picture change.

### Slice 44 — The town's messages (panels line, wave 1)
- The message log in the state, fed by every news source through `say`, saved for three years.
- The scroll button with its unread badge; the Messages panel with months, filters, unread marks, go-to links and pins.
- Quieter popups: alarms only, one at a time, bottom left, with a setting. News leaves the lines under the top bar.

*Oliver can:* open `#messages` to read a busy year, filter it to War and click a raid to go there, and play `#raid` to see one alarm pop up while the rest go quietly into the scroll.

### Slice 45 — The court and the prison (order line, wave 2)
- The court, trials and the law on its panel; the stocks, prison, hard labour and exile alongside fines, each with its deterrence and cost.
- The prison, its cells and guards, crowding and escapes with warnings first; the crime rate by month; watchmen helping each other between posts.

*Oliver can:* open `#court` to watch a thief walked to the court and sentenced, change the law and see the stocks in the agora, and `#jailbreak` to see a crowded prison warned of and then broken.

### Slice 46 — Many lands (land line, wave 2)
- Islands offshore, a river delta, a mountain shore, a dry plain and a wooded coast, each with its shapes, resources and palette.
- The new-game screen (Oliver's choice): kind, size, seed and a preview, from the welcome card's "Found a new city".
- Saves carry the land and rebuild it.

*Oliver can:* open the bare link, choose "Found a new city", flip through the kinds and seeds in the preview and found a city on a mountain shore; open `#delta` and `#dryplain` to see two of the kinds straight away.

### Slice 47 — A colonial empire (empire line, wave 2)
- Companies and triremes stationed in colonies; shorter expeditions from them.
- Colonies' own trade and your share of it; militia in your wars; a treaty that makes a free ally instead of a revolt.
- An Empire page with every vassal and colony.

*Oliver can:* open `#colonybase` (three colonies at different stages) to station triremes in one and watch Rhodes' raid fail, and `#freeally` to offer a grown colony its freedom as an ally.

### Slice 48 — Building panels and the storehouse (panels line, wave 2)
- A panel for every building that lacks one, from a registry, a section per kind.
- The storehouse's and granary's settings (accept, don't accept, get, empty, limits), obeyed by carts, porters and dockers.
- Pause and "workers first" for every work and service building.

*Oliver can:* open `#storerules`, click the storehouse by the quay, set it to accept only wine and to empty its oil, and watch the carts obey; click any farm, press or fountain to read its panel.

### Slice 49 — Physicians and plague (order line, wave 3)
- Health per home with reasons; the infirmary and its physicians; sickness that spreads among homes of low health.
- Plague from a plagued city's ships and caravans or a crowded, dirty quarter, warned of first; the asklepieion and its stretcher-bearers; quarantine.

*Oliver can:* open `#physicians` to see health in homes' panels and the physicians' rounds, and `#plague` to see Athens' plague warned of, then quarantine the city or let the ship in and fight the outbreak.

### Slice 50 — A new look for the panels (land line, wave 3)
- The shared kit: icons for goods, units, buildings and actions, carved headers, steppers, toggles, sliders and bars, in the original look's colours and textures.
- The military tab and the trading post rebuilt on it; the shipyard, colonies, vassals, loans, monuments, ambitions, routes, prices and rivals panels moved onto it.

*Oliver can:* open `#companies` and `#goods` to compare the Army tab and the trading post with the screenshots he sent, and `#empire` to look through the other panels.

### Slice 51 — The overview (panels line, wave 3)
- The monthly annals; the overview window (O) with City, Goods, Treasury, Distribution, Crime, Health, Army and Empire pages, small charts, reasons and go-to links.
- The Health page wired to slice 49 at the merge.

*Oliver can:* open `#town` or `#empire`, press O and read the whole city, then click a gap in Distribution to see it on the map.

### Slice 52 — A city in order (trunk, after everything merges)
- `#order`: a prepared town on a generated medium river delta, with gangs and a court, a plague threatened, colonies grown, store rules set and a full message history.
- Numbers tuned across a few years of play; a look pass bringing every new panel onto the kit; the budgets on a large land; any leftovers.

*Oliver can:* open `#order` and play it for a few years, then judge whether the new systems and panels make the city easier to read and more alive.

## Recorded for later

- The gods: *Beloved of the gods*, sanctuaries, gods in war, monsters and heroes. This is still the vision's biggest gap.
- Executions and other harsh punishments, if Oliver wants a darker law.
- A burial ground and funeral processions; disease carried by rats or the dead.
- Riots when a whole quarter is unhappy (still open from phase 5).
- Land where the sea isn't to the south, and lands with no sea at all.
- Laying out a colony's streets yourself.
- Open from phase 5: no boat drawn for families rowed out to their ship; the Lighthouse's and Colossus's knoll on steep shores; a wage slider.

## Out of scope for this phase

- The gods as characters, sanctuaries and heroes.
- Choosing where in Greece to found the city (offered on the card; not picked).
- Multiplayer, authored campaigns, modding and a desktop build (as in the vision).
