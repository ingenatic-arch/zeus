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

(Filled in as the slice lands.)
