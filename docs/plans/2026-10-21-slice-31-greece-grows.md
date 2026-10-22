# Slice 31 — Greece grows

*21 Oct 2026. Phase 5, "Ambitions, empire and a deeper city" (`docs/specs/2026-10-21-ambitions-empire-and-a-deeper-city-design.md`), wave 1, the Greece line (`claude/p5-greece`, built alongside slices 30 and 32 on their own lines). Builds on phase 4 as it ended (`70087da`). Slices 34 (vassals and allies) and 37 (colonies) build on what this one makes.*

## Goal and check-in

The spec's words: cities as data; Thebes, Argos, Knossos, Rhodes and Memphis join the shuffle; empty sites marked on the map with what they'd make. Population, wealth, army and fleet per city, growing and shrinking with harvests, trade, wars and debts, shown on the map and in the city panel with reasons. Rivals found colonies on empty sites and take weaker neighbours as vassals, with News of Greece lines. Raids about twice as often (balance card). Leftovers: Troy's label, caravans after a road closes, the band camping in `#threat`, offer limits across a road and a sea route, price arrows by meaning.

At the end of phase 4 Greece is six fixed cities that never change size. After this slice it is eleven, and each of the nine with a ruler rises and falls over the years for reasons it names, reaches out for the empty islands and capes, and bends weaker neighbours to its will. Every one of those changes reaches your city: a bigger city buys more from you and its prices move less under your trade; a richer one lends more; a stronger army means a bigger band if its ruler turns on you, and more weight in its wars; a colony adds what its site makes to what its founder sells you.

**Oliver can:** open `#greecegrows` (a town ten years on), see which rivals rose and fell and why, find a site Rhodes has already taken, and meet Knossos and Memphis.

**Demo links** (bare hash tokens; a dash combines them, as before):

- `#greecegrows`: `#rivals`' town (built street by street, its yard and routes to every city of phase 3) played on for ten years from its founding, trading as its builder set it up, answering Greece as a middling player would (requests sent when it can, offers taken, tribute refused, threats paid when it can). It opens paused on the map of Greece, the News of Greece open, every city's label with its size and trend. What the decade brought (who grew, who shrank, whose colony stands where, who bowed to whom) is whatever Greece's dice gave this seed, except that if Rhodes has founded no colony by then, one is staged for the demo on Naxos and named so (the spec's "a site Rhodes has already taken").
- `#greecegrows-rhodes` is not a token; the same town opens on any city's page by clicking it. `#knossos` opens `#greecegrows` on Knossos' page, `#memphis` on Memphis'.
- Every earlier token keeps working (some open on a Greece that has changed: see *Earlier towns* below).

## Not in this slice

Your own vassals, allies and the ways to take a city (slice 34); your own colonies, settlers and the voyage (slice 37). Blockades and wars at sea taking cargo (slice 38). Marble and timber themselves (slice 32: the sites name them; they become wares at merge). A lender's army coming back only for a remainder worth the march (balance card: slice 34). Two wars at once in Greece.

## Ground rules

- The vision wins; `CLAUDE.md` sets conventions and budgets; the spec's *parallel plan* binds file ownership.
- Sim code stays pure and deterministic. What is random is a hash of Greece's seed (as rivals, favours and raids already do) or Greece's own generator; the five newcomers are shuffled from a generator of their own made from Greece's seed, and their harvests from a hash, so **every ruler of the first four, their traits, starting moods and harvests come out exactly as before for the same seed.** Money moves only through `pay` / `income`.
- Growth reads the city (your trade, your loans) but never writes it: it reaches your city only through what the rulers already do (prices, limits, loans, bands, tribute demands).
- **Earlier towns.** This slice changes histories on purpose (the spec: every town trading with Greece meets a changing Greece; raids twice as often). A town that has never opened a route plays exactly as before. The demo probe (outside the repo) compares every earlier demo at opening and 900 ticks on against the baseline; each that differs is named in the check-in with what moved.
- State version 28 on this line (SIM_STATE_VERSION), with `fromSlice31` in `migrate.ts` filling in only this slice's fields; renumbered at merge. A version 27 save loads through it.
- Shared files: few edits, in blocks headed "Slice 31".
- The renderer and UI only read sim state. Static build, `base: './'`, all art in code. Judge by screenshots, never claim it looks or feels right on Oliver's behalf.

## Before

Measured at `70087da` (the phase 5 spec on phase 4's end), headless Chromium with software WebGL at 1920 × 1080:

| What | Before |
|---|---|
| Tests | 444 in 38 files |
| Download (gzipped) | 2,983 KB: the game 681 KB, the prepared towns 2,302 KB (79 files) |
| First load (bare link) | ready at 2.2 s, first frame 3.5 s by the page's clock |
| Demo loads | the 22 prepared demos the run reached before the browser timed out: median ready at 3.5 s, slowest 5.2 s (phase 4 measured median 1.9 s, slowest 2.8 s on a quiet machine) |
| Triangles | `#town`'s coast view 1,241,324; `#rivals` 1,728,272 |
| The map of Greece | built in 297 ms (code fetch and scene) from `#town`; its first frame 10.0 s after the key under this load; 304,000 to 314,000 triangles and 24 to 43 draw calls over the 20 map demos |

Software WebGL on a machine shared with two other lines' builds and tests (load average about 16): load and frame times run two to three times phase 4's and swing by a third or more from run to run, so only large changes count, measured before and after on the same machine. The baseline's `npm run measure` stopped at `#barracks` on a page timeout (the machine's load); the map of Greece was measured on the same baseline build with the measure script's own map section.

## Design decisions

**Cities as data** (`src/map/greece.ts`). `CityId` becomes a string; the table of cities (`CITY_IDS`, `PLACES`) and the cities with rulers (`RULED`) grow by appending, so every array kept by city (`world.cities`, each ruler's `ties`) keeps its first six places. Each city's row says where it stands, its colours, its blurb and its look on the map. A ruled city's character (names, title, leanings, size, goods; copper and armour; history with you; old ties) is a row in `world.ts`'s tables, its base people, army and fleet a row in `growth.ts`. Ways (roads and lanes) to your city and between rivals are rows too. The newcomers:

- **Thebes** (Boeotia, inland): a land city of farmers and soldiers. Sells wheat and cheese, buys oil and wine. By road through Corinth and over the isthmus by Megara, then north over Kithairon. Proud, warlike leanings; old rival of Athens.
- **Argos** (the Argives of the old city, on the hills west of your plain): small and touchy, thinks your city stands on its old ground (history −10 with you). Sells meat and fleece, buys wheat and wine. A short road west. Proud, fickle. The weak neighbour Sparta eyes.
- **Knossos** (Crete): an island queen's palace city. Sells oil and wine, buys wheat and fleece. By sea, south past the Argolid and across to Crete. Proud, pious leanings; a fleet.
- **Rhodes**: a trading island. Sells wine and fleece, buys wheat and meat. By sea, the Tyre lane's way as far as Karpathos, then north-east. Shrewd, greedy; the biggest fleet for its size; the one most likely to found colonies.
- **Memphis** (Egypt, at the map's southern edge, as Tyre is at its corner): rich in wheat, buys fleece, oil and wine. By sea, past Crete. Pious, steadfast, proud; the biggest city, slow to change, rarely at war in the Aegean.

Each newcomer can trade with you (a route, with its fee; land routes come in on the map's north or west edge as their road runs), send gifts, ask, offer, lend, borrow, threaten and be threatened by expeditions, through the same code as the first four.

**Empty sites** (`SITES` in `greece.ts`; `world.sites`). Six: **Naxos** (marble), **Thasos** (timber), **Kythnos** (copper), **Melos** (fleece), **Kythera** (oil) and **Cyrene** (wheat, on the Libyan shore at the map's southern edge). Each has a name, a place, a blurb and the good a city there would make, as a name. Marble and timber are wares 10 and 11 on the works line: until they merge, a site names its good as a string, and only the goods that are already trade goods (copper, fleece, oil, wheat) feed a founder's goods (*As built* notes this for the integrator). A site's record in the world: who holds it (`''` free), since when, its people, and a claim on its way (who is sending settlers, and when they land).

**Growth** (`src/sim/growth.ts`, one call after `stepDiplomacy`). Each ruled city has `pop` (people), `wealth` (its treasury, drachmas), `army` (men under arms, on the same scale as the garrisons and bands the game already uses: 20 to 100) and `fleet` (ships, 0 for inland cities). Starting values are its base with a shuffle of up to a tenth either way (from the newcomers' own generator, so the old four's rulers don't move). On the first of each month:

- **People** change by the sum of named causes, each a small monthly rate: the last harvest (failed −4% a year, poor −1.5%, fair 0, good +1.5%, rich +3%), your trade with them over the last year (+1% a year per 3,000 dr of trade, at most +3%), their own trade (wealth growing), a war on (−2% a year) and how one ended (a defeat −6% at once, a win +2%), debts (owing you a loan that is overdue: −1.5% a year), a lord's tribute (a vassal −1% a year, its lord +0.5% per vassal), colonies (+0.3% a year each), and a pull back towards what its land can hold (its base, more with wealth), which keeps every city between about half and twice its base over any number of years.
- **Wealth** gains taxes (its people) and its trade (its own, and yours with it), pays its army and fleet, its tribute to a lord and its loans to you (lent out, then repaid with interest), and loses a fifth to a defeat (a tenth of the loser's goes to the winner).
- **Army** moves towards what its people and wealth can keep (a share by character: Sparta's most, Memphis' least per head; warlike a fifth more), a twelfth of the gap a month; a war costs a share of it, a defeat two fifths, a win a sixth.
- **Fleet** the same for the sea cities, from people and wealth; a sea war costs ships.
- **Reasons.** Each change is added to a small record per city by cause and year (`c.grew`), kept two years, so the page can say "6,850 → 7,320 people in two years (+7%): good harvests +4%, trade with you +2%, its colony on Naxos +1%".

What it changes for your city (the city comes first):
- **Prices and limits:** a city's normal stock of each good, and the yearly limit of what it buys and sells, grow and shrink with its people (prices with nothing pushing them don't move, as both sides of what it makes and uses grow together; your sales move a bigger city's price less). A colony adds its site's good (if it is a trade good) to what its founder makes.
- **Tribute demands** compare its people with yours (was a fixed figure); **loans** what it can spare with its wealth (was fixed by city), and the page names it ("Athens is rich: 24,000 dr in its treasury"); **a band** sent against you, and an expedition's garrison, with its army (was fixed by city); **wars between rivals** are won by the stronger army (and fleet at sea) more often, as the strength fixed by city did before.

**Rivals reach out** (`growth.ts`, monthly, from the third year):
- **Colonies.** A ruled city at peace, not a vassal, with a fleet (every site is across water) and well-off (wealth at least its base, people at least its base), and no colony begun in the last four years, may send settlers to the nearest free site (one month in so many, more for a shrewd or greedy ruler). News: "Rhodes is fitting out ships for settlers bound for Naxos: they sail within three months". Three months later the colony is founded (news), unless the site was taken first: the site is the founder's, shows its colour on the map, and grows (300 people to about 2,000 over the years). A colony adds to its founder's people and wealth, and its good to what the founder makes. Whoever holds a site is recorded as a city id, so your colonies (slice 37) will use the same record.
- **Vassals.** From the fourth year, a ruled city not itself a vassal, with fewer than two vassals, whose army is at least two and a half times a neighbour's (a pair with a way between them), that neighbour cool or worse to it (or beaten by it in the last two years), may make it bow (one month in so many, more if proud or warlike). News: "Argos has bowed to Sparta: its army of 18 against Sparta's 72, and the war it lost last year. Argos now pays Sparta tribute". The link is the vassal's `lord` (a city id: yours, in slice 34) and since when. A vassal pays its lord a tenth of its income, won't go to war with its lord, and breaks free (news) when its lord loses a war or its army grows to two thirds of its lord's.
- Feuds, friendships and wars run among neighbours (pairs with a road or lane between them: the first four's six pairs and eleven more), still one war at a time across Greece; armies for a war are drawn from each side's army.

**Raids twice as often** (`raids.ts`). In phase 4 a threat came only from a hostile (−60) proud or warlike ruler, one month in eight, or after tribute refused while cold. Measured first by a probe (outside the repo: many seeds, nine years each, a middling player), then tuned until threats come about twice as often, still always as a threat with a deadline before any band marches: a cold (−30) proud or warlike ruler whose army is far bigger than yours may threaten too (less often than a hostile one), and the odds are raised as the probe shows. The numbers go in *As built*.

**Leftovers**
- **Troy's label at 1600 × 900** stands under the lines under the top bar: a label that would stand under the lines (as under the top bar already) hangs below its city instead.
- **A caravan in your streets after its road is closed** (debt or a hostile ruler) stops trading and walks out; it no longer buys or sells. `#borrow`'s caravan path is looked at (a 142-segment path walked for two months reads as "in the city").
- **A refused band no longer camps** at its city for about 70 days: the first-year rule (no raiders at your edge within a year of your first route) is kept by the threat's deadline; refusing it yourself brings them after the usual ten days' gathering, as the button says.
- **An offer's yearly limit** is shared between a land and a sea route to the same city.
- **Price arrows** are coloured for what the move means to you: green where it is good for you (a price rising for a good you sell them, falling for one you buy), red where it is bad, the arrow still showing the way the price went.
- **The army on the map of Greece** near Nea Argos' label: drawn clear of the label at the opening view.
- **The map of Greece** with eleven cities, six sites and more ways: its build time and triangles measured before and after; the camera's opening view adjusted so the new cities read (Memphis and Cyrene sit at the southern edge).

**On the map** (`src/render/greece/*`). Each newcomer has a model of its own (Thebes' walled acropolis, Argos' hill town, Knossos' palace with its red columns, Rhodes' harbour town, Memphis' pyramid and temple by the river), built in code like the first four. A city's model is drawn larger or smaller with its people (in steps, so it never jitters), its label says its size ("7,300") with an arrow when it has grown or shrunk by a twentieth in the last year, and a vassal's label carries its lord's colour. Each site is a small marker (a cairn and a pennant) with its name and its good; a colony is a small town in its founder's colours, its label "Naxos · Rhodian colony"; a claim on its way shows ships at the founder's harbour and a line in the news.

**On the page** (`src/ui/greece.ts`, `rivals.ts`). A ruled city's header has a line of its size ("7,320 people · rich · 64 soldiers · 18 ships"), each with its trend; the Rivals tab opens with "How it stands": people, wealth, army and fleet, each with its change over two years and the reasons, its colonies, its vassals or its lord. A site has a page of its own (hovering or clicking it): what it would make, who holds it and since when, or who is sending settlers there.

**`#greecegrows`** (`demos.ts`): `#rivals`' town played on for ten years from its founding (prepared at build time, so it opens in under 3 s), its routes trading, answering Greece as a middling player (requests sent when its stores can, offers taken, tribute refused while it can, threats paid when the treasury can). Rhodes' colony staged on Naxos only if the dice brought none (named so). Opens paused on the map of Greece, the news open. `#knossos` and `#memphis` open the same town on those cities' pages.

## Tests

- **Determinism** (existing, with `#greecegrows` in the prepared towns): the same seed and commands give the same city and Greece.
- **The first four unchanged:** for many seeds, the first four rulers, traits, starting moods and first harvests are exactly as before (against values recorded at the baseline).
- **Growth in bounds:** thirty years of Greece alone, over several seeds: every city's people, wealth, army and fleet stay between bounds (no city to nothing or without end), and changes name their reasons.
- **Reaching out:** in a long run, some rival founds a colony (announced first, then founded) and some rival takes a vassal; a vassal breaks free when its lord is beaten.
- **Growth reaches your city:** a bigger city's yearly limit is bigger; a band from a city with a bigger army is bigger; a city's spare coin follows its wealth.
- **Save and load:** a town with a colony founded, a claim on its way and a vassal round-trips; a version 27 save (built by hand, or `SIM_STATE_VERSION - 1`) loads through `fromSlice31` with eleven cities and six sites, and plays on.
- **Leftovers:** a caravan in the streets stops trading when its road closes; a refused threat's band gathers ten days, not seventy; an offer's limit is shared across a road and a lane; the arrow's meaning (good or bad for you) for a good you sell and one you buy.
- **Raids:** in the probe's seeds, threats come about twice as often as before (a test pins the new rule: a cold, warlike ruler with a far bigger army may threaten).
- The existing suite. `smoke.mjs` opens `#greecegrows`, `#knossos` and `#memphis`; `measure.mjs` adds `#greecegrows` (load, the map's triangles and build time).

## Tasks

1. Plan (this file), with the baseline measured. Commit.
2. Cities as data: `greece.ts`'s tables, the newcomers and their ways, the world's tables, sites; the migration and saves. Commit.
3. Growth and reaching out (`growth.ts`), its effects on prices, limits, loans, bands, tribute and wars; raids twice as often (probe before and after); the sim leftovers (caravan, band, offer limit). Tests. Commit.
4. The map and the pages: models, labels, sites, the page's growth section; the UI leftovers (arrows, labels, the army by Nea Argos, the opening view). Commit.
5. `#greecegrows`, `#knossos`, `#memphis`; smoke and measure. Look and tune from screenshots. Commit.
6. Full checks, the demo probe, measurements, As built, the check-in. Commit, push.

## As built

Built on `claude/p5-greece` in three commits after the plan (`a331b21`): the simulation (`3e9b855`), the map, the pages and the demos (`0f58683`), and the smoke fixes, this section and the check-in.

**Cities as data.** `CityId` is a string; `CITY_IDS` and `RULED` grew by appending, so the first six places of every array kept by city are as before. The newcomers' rulers, traits and moods come from a generator of their own (`settleRng`), and for every seed tried the first four rulers, memories, ties, harvests, prices and Greece's own generator come out exactly as at `70087da` (a test pins the rulers, memories, ties and harvests for four seeds; a probe outside the repo compared the prices and Greece's generator too). What did move for the first four: a city's normal stocks and crops are now scaled by its people (`scaleOf`), so stocks start a little off their old figures where a city's people were shuffled off its base. Base sizes (people, treasury, army in hundreds of men, ships): Athens 7,000 / 20,000 / 4,000 / 14; Sparta 6,000 / 10,000 / 6,000 / 4; Corinth 5,500 / 20,000 / 3,000 / 12; Troy 6,500 / 16,000 / 4,500 / 12; Thebes 5,000 / 4,500 men / no ships; Argos 2,800 / 2,000 men / none; Knossos 5,500 / 3,500 men / 12; Rhodes 4,500 / 2,500 men / 16; Memphis 9,000 / 7,000 men / 10. **The army is kept in hundreds** (the sim's 40 is "4,000 men" everywhere it is shown), not on the garrisons' scale as the plan said: a band and a garrison take their size from the army against its usual (`armyScale`), so the garrisons and bands keep their old sizes at a city's usual army. *(Review: shown as the sim keeps it, not a hundredfold: see the review note below.)*

- **Argos stands on its hill west of your plain** (22.3° E, 37.75° N), not where the plan first put it: drawn at 22.6° its label covered Nea Argos'. Its road comes in on your west edge, its ways to Sparta (by Tegea) and Corinth (by Nemea) follow.
- **The sites' goods are strings**, as planned. Only wheat, oil, fleece and copper are wares today (`SITE_WARES` in `growth.ts`), so a colony on Naxos (marble) or Thasos (timber) adds nothing to what its founder makes until the works line's wares 10 and 11 merge: the integrator adds them to `SITE_WARES` (two entries). The works line must also let `shuffleGoods` (world.ts) take the new goods if rulers are to trade them.
- **New sea lanes have no pirates.** The five newcomers' routes and the ways between rivals use the lanes in `greece.ts`; `fleet.ts`'s `LANES` (where pirates lie in wait) is the works line's and is unchanged, so no pirate waits on the lanes to Knossos, Rhodes or Memphis (slice 38's to wire, with the blockades).

**Growth** (`growth.ts`, monthly, after `stepDiplomacy`). As planned, with these rates (all named constants at the top of the file): harvests −6%, −2%, 0, +2%, +4% a year from failed to rich (the plan said −4% to +3%); your trade +1% a year per 3,000 dr a year of trade, at most +3%, and merchants keep 15% of it as wealth; a war −2% a year and 3% of its army a month; a defeat at once −6% people, −40% army and fleet, −20% wealth (half of that to the winner); a win +2% people, −15% army; overdue debt to you −1.5% a year; a vassal −1% a year, a lord +0.5% per vassal; a colony +0.3% a year and 0.3 dr a month per colonist; a pull of 8% of the gap a year back towards what its land can hold (0.8 to 1.6 times its base, with wealth). Hard bounds 0.3 to 3 times base. Over thirty years of Greece alone on several seeds every city stays between about half and twice its base (`tests/growth.test.ts`).

**Reaching out.** Colonies from the third year: a city with three ships or more, wealth and people at 90% and 95% of base, at peace and no vassal, one month in 300, half again for a shrewd or greedy ruler, twice for Rhodes, times its reach (Memphis 0.3, Sparta 1.3, Thebes 1.2) and its people against its base, none within six years of its last (the plan said four); settlers cost the founder 2,000 dr and land 90 days after the news, 300 of them, growing to at most 2,000. Vassals from the fourth year: an army two and a half times a neighbour's, the two at −10 or worse to each other (or the lord beat it within two years), one month in 30, at most two vassals each. **A vassal goes to no war of its own** (rivals.ts skips it when picking a war), rather than the plan's "won't go to war with its lord": as vassals go to no war at all, it never fights its lord either. It breaks free when its lord loses a war or its army reaches two thirds of its lord's.

**A site's page** is its hover card plus its owner's page: hovering a site says what it makes, who holds it and since when, or who is sending settlers; clicking it opens the owner's (or the settlers') page, whose Rivals tab names the colony. A free site's click does nothing yet (slice 37's "Found a colony" goes there).

**Raids** (`raids.ts`). A cold (−30 or worse) proud or warlike ruler threatens too, one month in 120, from half to half again as often with its army shrunk or grown (`COLD_ODDS`; a hostile one stays one month in eight). The threat's line says so ("Queen Ida is cold to your city, and proud, with an army grown to 4,200 men"). A probe (outside the repo) played `#rivals`' and `#caravan`'s towns nine years on with a middling player, on the demo's dice and five reseeded ones each (12 runs): threats that were not set up for a demo went from **2 to 14** (from 0.17 to 1.2 a town in nine years). The probe's base is lower than what Oliver saw in phase 4 (one, in nine years), so against the probe this is well over twice, against Oliver's game a little over; the check-in asks him to judge, and `COLD_ODDS` is the knob. Without the cold path the new Greece gave about as many as the old: growth alone does not bring more.

**Leftovers.**
- *Troy's label at 1600 × 900*: a label that would stand under the top bar, the City button, the lines under the top bar, "+N more" or the News of Greece hangs below its city, let down further if a bar would still cover it (`clearOf`). Labels that would overlap are now lifted clear of each other on longer stems, your city's first and then from the lowest on the screen up; one lifted into a bar hangs below its city instead if there is room there.
- *The caravan after its road closes*: it pays for what it loaded and leaves; one on its way in turns back without trading. `#borrow`'s caravan: walkers keep their pace (1.2 tiles a day, about 60 days for its long path); its line now says how long ("on its way to the caravan yard: it gets there in about N days", and "out of your land in about N days" on the way out), rather than shortening the walk, which would have changed every town with a caravan.
- *The refused band in `#threat`*: one defied within the first year bides its time at home, out of sight ("bide their time at home"), and gathers only for its last ten days. This differs from the plan, which had a refusal bring the band after the usual ten days whatever the year: that would have broken the rule that no raiders reach your edge in the town's first year with routes. The line under the top bar and the chip count the days meanwhile; the map shows the band only once it gathers.
- *One yearly limit per city* across a road and a sea route (`soldTo`, `boughtFrom`, `heldFor` in routes.ts), on the trade panel too.
- *Price arrows* are green where the move is good for you and red where it is bad (still pointing the way the price went), with words for screen readers; the chart's last dot likewise.
- *Your army on the map* has a tag over it in your colours ("Your army · 32 men"), standing over the cities' labels, hung below the army where it would cover a city's label (at the city it marches on).
- *The opening view* is drawn back and south (distance 170, centred at 0.62 of the table's depth) so Memphis and Cyrene on the southern edge and Thasos in the north are on the table at first look.

**`#repaid` set up where the dice fell the other way.** With the new Greece, Athens' dice on the loan's day said no, so `#repaid` showed an overdue loan instead of the herald with the money. `loanTown('repaid')` now plays to the day before and, if Athens would not repay, stages the repayment (`stageRepay` in loans.ts, named "set up for this demo", as `stageDefault` already does for `#forgive`).

**`#knossos` and `#memphis`** open `#greecegrows`' town on those cities' pages, as planned.

**Touched outside the line**
- `src/sim/state.ts`: `SIM_STATE_VERSION` 28; on `WorldCity` the fields `pop`, `wealth`, `army`, `fleet`, `lord`, `lordSince`, `grew`; the types `Growth` and `Site`; `world.sites`. Inside `World`, Greece's own record, but in the shared file.
- `src/sim/migrate.ts`: `fromSlice31` and its one line (`st.version === 27`), filling only this slice's fields and settling the newcomers (`settle` from world.ts). Renumber at merge.
- `src/sim/sim.ts`: one `stepGrowth(s)` call after `stepDiplomacy`, and its import.
- `src/game/saves.ts`: two lines in `worldOk` checking the sites and each city's growth fields.
- `src/game/demos.ts`: the slice 31 block (`growsTown`, `GROWS`, three scenes); the `#repaid` change above (four lines in `loanTown`); the import of the growth helpers and of `repaysOnTheDay` and `stageRepay`.
- `scripts/smoke.mjs`: a slice 31 block before the last line, and the ok message; and four older checks brought up to eleven cities: the map's moods (9 ruled cities, was 4), `#festival`'s fields (7: Rhodes on its small island and Memphis at the table's edge have no dry ground for them), `#threat`'s band (biding its time at home, off the map, in the town's first year), and the label click test keeping off site labels and the army tag. `scripts/measure.mjs`: three map demos.
- `src/ui/style.css`: a slice 31 block at the end (arrows, sizes, lord chip, sites, How it stands, lifted stems, the army tag).
- Tests outside the line's own: `tests/saves.test.ts` (the `#town` save budget 160,000 to 175,000 characters: eleven cities and their records add about 10 KB), `tests/treasury.test.ts` (the every-demo test's timeout 400 s to 1,200 s, for `#greecegrows`' ten years on a loaded machine), `tests/prices.test.ts` and `tests/world.test.ts` (Greece's, adjusted for stocks scaled by people). A fixture `tests/fixtures/slice29-rivals.save.json.gz` (a version 27 `#rivals` save from the baseline).
- `src/sim/stocks.ts` (review): the newcomers' names in `TRADER_NAMES`, so the stock book's lines for the price of peace, seizures and goods taken read "Argos", not "argos".
- `CityId` is now `string` (greece.ts): the other lines' code that switches over city ids keeps compiling; a `Record<CityId, …>` they add should list the newcomers or be `Partial`.

**Earlier towns.** Each earlier demo's prepared town compared at opening with the baseline build's (date, people, money, from the towns' labels; outside the repo): 99 of the 108 are the same in the town. Greece itself differs in all that trade (eleven cities, grown and shrunk; later ones with colonies and vassals). Nine moved in the town: `#prices`, `#offer`, `#rivals`, `#rivalsmap`, `#rivalstreet`, `#lend` and `#forgive` by 12 to 81 dr in the treasury, the same day and people; `#repaid` (the repayment now set up, above), the same day; `#fortress` about nine months later (March 744 BC, was June 745 BC: a cold ruler's threat came while it waited for Greece to be calm), 1,344 people and 2,836 dr (was 1,325 and 1,664), its walls paid for with Knossos' and Rhodes' offered loans instead of one asked of Corinth, and Sparta's band 26 men (was 33). Only the opening was compared, not 900 ticks on: the baseline's towns would have had to be played again.

**Measurements.** Headless Chromium, software WebGL, on a machine shared with the other lines (load average 12 to 18), so times swing widely; the comparisons that count were run side by side, alternating this build and the baseline's (`70087da`), twice each.

| What | Before | After |
|---|---|---|
| Tests | 444 in 38 files | 456 in 39 files |
| Download (gzipped) | 2,983 KB: the game 681 KB, the prepared towns 2,302 KB (79 files) | 3,256 KB: the game 693 KB, the prepared towns 2,563 KB (80 files; `#greecegrows`, `#knossos` and `#memphis` share one). Every town's save carries eleven cities and their records |
| Bare link (side by side, median of 2) | ready 7.0 s, first frame 8.2 s | ready 3.8 s, first frame 4.7 s (noise: nothing on the first load changed) |
| Demo loads (side by side: `#rivals`, `#fortress`, `#report`, `#greece`, `#collect`, `#threat`, `#prices`, `#town`) | median 4.0 s, slowest 4.3 s | median 4.2 s, slowest 5.1 s (`#fortress`) |
| The map of Greece, from `#town` (side by side) | built in 578 ms, first map frame 18.7 s | built in 396 ms, first map frame 15.4 s |
| Map triangles over the 20 earlier map demos | 304,000 to 314,000 | 313,000 to 322,000 (`#greecegrows` 314,714) |
| Map draw calls | 24 to 43 | 49 to 68 (each new city's model, field and site is its own mesh) |
| Triangles, town views | `#town`'s coast 1,241,324; `#rivals` 1,728,272 | the same |

`npm run smoke` timed out on its first page's frame waits under this load (under 1 frame a second on `#coast`, the baseline build the same), so smoke was run as a copy in the scratch directory with every timeout five times longer: it passed with no failures. `npm run measure` ran the same way and was stopped after two hours in its every-demo loads, which the side-by-side run above stands in for; its other sections are in the table.

