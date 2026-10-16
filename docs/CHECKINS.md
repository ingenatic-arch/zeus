# Check-ins

Notes to Oliver, newest first.

## Slice 8 — Coin and the ledger (16 Oct)

Money now comes in and goes out: rent is gone, a tax collector walks from a tax office and only the homes beside his way pay, every workplace pays its workers on the first of the month, and a ledger says where each drachma came from and went. You weren't here while it was built: every choice below is mine, from the spec's defaults.

What breaks, or moves: nothing is lost, but money is tighter everywhere. Your phase 1 saves open: rent turns into taxes at the fair rate, and since the town has no tax office yet, nothing comes in until you build one (the welcome back says so, and a line under the top bar too). Every earlier demo with workplaces now has a tax office, so it doesn't drain once open. In `#water`, `#food`, `#warning`, `#fine` and the rest, the streets, houses and people at opening are the same as before (I checked the counts and levels); only the money differs, because rent no longer piled up: `#food` opens with 1,714 drachmas instead of 4,040, `#fine` with 420 instead of 5,402, `#theatre` with 137. `#town`'s history changed: it was built with three tax offices and heavy taxes while it grew, and its builder waits for money before the bigger steps, so it opens with 622 people instead of 635 and 1,520 drachmas instead of 6,080.

### What's new
- The tax office (Z, 150 dr, 3 workers): a small stone counting house with its gable to the road, a bronze-green pediment and band, a porch of three columns with the clerk's table and a balance, an iron-bound strongbox and a bronze-green banner on a pole. It sends out a tax collector: a man in a dark green tunic and a wide straw hat, with a satchel at his hip (it gets a second purse once it's heavy) and a wax tablet. He walks the streets near his office (as far as the water carrier goes, a little faster than she walks), heading for the nearest homes that haven't paid in the last month. Each home beside his way pays him once a month, by its level and the rate; homes he never passes pay nothing. When he gets back, "+180 dr" (or whatever he carried) floats up from the office.
- The tax rate: a "Taxes · fair" chip beside the drachmas opens the five rates, each with what a cottage and a fine house pay a month (fair: 5 and 9 drachmas) and what households think of it. None: they're glad of it. Light: nobody minds. Heavy: they grumble, in their mood and in what they say. Harsh: they're unhappy, and once a month some worried or unhappy households send someone away (a grown child, or a family who joined them), with "moved away: the taxes were too harsh" in their story.
- Wages: every workplace pays its workers 2 drachmas each on the first of the month. When the treasury can't pay a workplace in full, its wages stay owed for the month: it works at half pace, its workers' households grumble ("8 of them are owed wages: the treasury is empty"), and nothing new can be built until money comes in. Money that comes in pays the owed wages first. There's no debt and no game over, and the drachmas never go below zero.
- So you can never get stuck: while the town has no tax office, the treasury keeps back what one costs (150 drachmas). Nothing else can spend it, and a tax office always can. The tool tips say when money is being held back and why.
- The ledger: click the drachmas (or press $). This month so far and last month side by side. Coming in: taxes by district ("Taxes by the olive grove · 27 homes"), and building you undid. Going out: wages by kind of workplace, with the workers ("Wages · farms · 70 workers"), and building by what was built. Then each month's net and what it started with. Under that, how many homes the collectors called on in the last month and where they missed ("Not yet: 26 on the west bank, 4 on the east road…"), the rate and what the homes paid, the wage bill, and any owed wages. The coast is cut into a dozen named districts for this (the flood plain, the west bank, below the cypress hill, the east road, by the bay, the headland…).
- The top bar: a small arrow beside the drachmas for which way money went last month (gold up, rust down); the digits turn rust while wages are owed.
- A money line under the top bar, clickable to open the ledger: when wages go unpaid ("Money: the treasury can't pay this month's wages at 11 workplaces…"); when wages go out and there's no tax office; and when the treasury would run dry within six months at the rate taxes and wages run now ("the tax collectors bring in about 0 dr a month and wages take about 220; at that rate the treasury runs dry in about 5 months").
- The tax overlay (J, or its button): the roads a collector reaches in bronze-green, brighter where one has walked lately; homes that paid in the last month tinted, and a taller amber post over each lived-in home no collector has called on. Placing a tax office turns it on and says how many homes the new collector would reach and how many no collector has called on this month.
- Homes: the hover tip and the household panel say what they paid and when ("Taxes · paid the tax collector 13 dr 27 days ago (harsh)"), or why nobody has called (no tax office; too far by road; not this way yet). Hovering a tax office or its collector says where he is and what his satchel holds.
- Saves are half the size (a save of `#town` is 205 KB, was 452 KB).

### What to try
1. Open `#ledger`: `#town` with the ledger open. Read down it: which districts paid, what each kind of workplace costs. Close it with Esc and open it again by clicking the drachmas.
2. Open `#collector`: `#town` at street level, following a tax collector with the tax overlay on. Hover him to see what's in his satchel; wait for him to get back to see the coins float up.
3. Open `#taxes`: `#town` a month after the east street's tax office was cleared, looking along that street, with the tax office tool picked and the tax overlay on. The amber posts are the homes no collector reaches. Move the tool along the street to see how many homes a new office would reach, and place one.
4. In `#town`, click the "Taxes · fair" chip and pick heavy, then open a household (click a home) a little later: the mood says the taxes are heavy and the chatter grumbles. Set it back to fair and it settles.
5. Open `#harsh`: `#town` a month and a half after taxes went to harsh, with the panel open on a household that sent someone away. In my run, 5 people had left for the taxes by then (14 after seven and a half months), 5 households were unhappy and 11 worried. The town still grows, because newcomers keep arriving, and the treasury gains about 380 drachmas a month.
6. Open `#dry`: `#town` with taxes set to none, played on until the money ran out (eight months later), paused. Eleven workplaces are owed 126 drachmas, the money line says so, the drachmas are rust, and the panel is open on a household whose workers are unpaid. Nothing new can be built until they are paid. Set the rate back to fair, unpause, and watch the wages get paid as the collectors come back.
7. Open one of your own phase 1 saves (`#saved` or `#continue`, or Carry on from the bare link): the welcome back says rent is gone and to build a tax office (Z) by the houses.

### What I'd like your eye on
- The tax office and the collector at street level (`#collector`, and `#town` zoomed in on the main street at its west end): do they read as a counting house and a tax man, and apart from the shrine and the houses? From above, the office's bronze-green pediment and banner are what tell it apart.
- The numbers: wages of 2 drachmas a worker and the fair rate make a phase 1 town roughly break even (`#food` loses about 20 drachmas a month; `#town` gains about 90). Is that the right pressure, or should running a town cost more?
- Harsh taxes: they drive a few people out, but the town keeps growing and the treasury fills. Should harsh also slow newcomers, or hurt more?
- The ledger: is it the right amount on one card? It is long in a big town (one wages line per kind of workplace).
- The tax overlay's amber posts: clear enough from above, or do they read as fence posts?
- The demos now open with much less money (`#theatre` with 137 drachmas). Nothing in them needs building, but say if you'd rather they opened richer.

### Known rough edges
- Taxes come in by the collector's round, which takes about a month, so a calendar month in the ledger can hold one hand-in or three: last month's net (and the arrow) swings between about −30 and +250 in `#town` while the town steadily gains. The money line uses a steadier figure for that reason (what the homes paid over the last month against the wage bill).
- `#town`, over its first two years left running, has a corner of the core wait about a month for the priestess once: those homes are warned for a while, but none goes down a level. It appeared with the new history: two homes, once, about a month (98 warned home-days in two years; the test allowed under 60 before and allows under 120 now); the walkers' routing is the first place I'd look.
- `#food` (and the other demos built on it) open the instant their tax office goes in, so the office counts no workers until the next morning's share of work. The workers line leaves it out until then, but the jobs count in the top bar reads 44 of 47 for that first day.
- The satchel has two looks (light and heavy, from 20 drachmas), not a gradual swell.
- The phase 1 rough edges noted in the phase review are still there (left for slice 14).

### Measurements
- Tests: 139 in 13 files, all passing (was 120 in 12): the ledger always adds up over a scripted run of roads, plots, buildings, undo, taxes and wages; the collector taxes only the homes beside his way, once a month; the rate goes through the command queue; wages, unpaid wages, half pace and nothing built while wages are owed; the reserve; harsh leaving; a real phase 1 save (from the phase 1 code) loads with no tax office, fair taxes and a ledger that adds up, and plays on; `#town` stays within 1,500 drachmas a year of break-even over three years and never owes wages; every demo's setup pays its wages.
- Smoke: extended with the ledger, the rate chip, J, following and hovering the collector, the tax office tool and its tip, `#harsh`, `#dry`, and a phase 1 save opening with its note. Every demo token opens with no page errors.
- Download: 254 KB compressed (was 243 KB).
- Load: ready at 1.06 to 1.39 seconds and first frame at 1.31 to 1.62 seconds over three runs by the page's own clock (was 1.51 and 2.02 in the run before this slice). Target: under 3 seconds.
- Triangles and draw batches: within 2% everywhere. `#town` from its opening view: 658,000 triangles in 99 batches (was 650,000 in 103); overview 774,000 in 124 (766,000 in 128). The opening view: 534,000 in 57, unchanged.
- Main-thread time per frame before drawing, paused / running: `#food` 0.67 / 1.03 ms (was 0.49 / 0.88), `#fine` 0.60 / 1.34 (0.67 / 1.44), `#town` 0.82 / 1.66 (0.79 / 2.85). The districts are now worked out at load (about 25 ms), not when the first collector calls (that had been a 21 ms hitch in `#food`).
- A save of `#town`: 205 KB (was 452 KB).
- Money in `#town`: 1,520 drachmas at opening, about 2,400 a year later and 3,700 two years later (was 6,080, and 17,600 two years later, with rent).
- Frame rate: not measured (software graphics only here). Target: 60 frames a second on a mid-range laptop at 1080p.

## Slice 7 — A town worth keeping (16 Oct)

The town can now be kept: it saves itself, you can save it by hand, and the bare link offers to carry on. The coast has sound, the walkers really walk, and `#town` is a grown town of 635 people to open first. You weren't here while it was built: every choice below is mine, from the spec's defaults.

Nothing breaks: this is the first slice with saves, so there are no older saves to lose. Every earlier demo opens on exactly the same streets, houses and people as before. Two earlier numbers moved because the walkers now go first to the homes closest to going down (see What's new): in `#closed`, rebuilding the theatre and mending the road at once now loses 7 homes a level (the 7 on the cut-off street) instead of 15, and every home is a fine house again about three weeks sooner; and `#grow` played through without more farms loses 15 instead of 17.

### What's new
- Saving. A scroll button in the top right corner opens a small card: Save now (or Ctrl+S), your save and the autosave with their date, people, homes and drachmas and an Open button, and "Start again on an empty coast". The game saves itself every three months of game time and when you leave the page, but only once you've built something (or opened a save), so looking around a demo never overwrites your town. The first time it saves itself in a session a small note by the corner says so (after that the card shows when it last saved), and if it ever can't save, the note says why. Building in one of the demos doesn't count: a demo only saves itself once you've saved it by hand, so trying one never replaces the autosave of your own town. Your own save only changes when you press Save. Saves stay in this browser on this computer.
- Carrying on. The bare link shows a welcome card, and if this browser holds a saved town it offers "Carry on" with its date and people. `#continue` opens the newest save, `#autosave` and `#saved` the one you want. The camera comes back to where it was.
- When saving can't work (site data turned off for the page, storage full), the card and the note say so in plain words and the game plays on. A save from another version, or a damaged one, is refused with the reason ("This save is from an older version of the game (version 5); this one reads version 6, so it can't be opened.") and the coast opens as usual.
- Sound, all made in code, starting at your first click or key press: the sea breathing on the shore (louder near the water), a little wind higher up, birds in the trees and now and then a gull over the bay. Down in the streets, footsteps and the creak of cart wheels near the camera. Soft sounds for laying a road, marking plots, building, clearing, undoing, and a gentle "no" when something can't go there; a little two-note chime when a home goes up a level and a falling pair when one goes down. No music. The speaker button in the corner mutes it, and the game remembers; while muted, or while the tab is in the background, the sound is stopped altogether.
- The welcome card on the bare link: three steps to start (a road in from the edge, housing beside it, a fountain), a pointer to the build bar, and "See a grown town", which opens `#town`. Picking a tool puts it away.
- The town's shortfalls, readable without hovering: a calm line under the top bar when the farms grow less than the town eats and the granaries would run empty within about six months ("Bread: the farms grow about 210 measures of wheat a month and the town eats about 420. Two more farms would keep it fed. The granaries are nearly empty."), and while jobs go unfilled ("Workers: 29 jobs unfilled. The wheat farm has 0 of 10 (and 2 more places). 15 people can work for 44 jobs: more homes would help."). Click a line to go there; the bread line also turns the food overlay on. It waits three game days before showing, so a family moving in or out doesn't make it flicker.
- Placing a farm (or any workplace) with no road beside it: the footprint turns amber and the label says why it wouldn't work ("No road beside it: its workers couldn't get there and its carts couldn't take the harvest away. Lay a road along one side first."). You can still place it, since the road may come next.
- Walkers go first where they can still save someone: the water carrier, the vendor, the priestess and the actor head for the home closest to going down, and don't spend a round on a home they'd reach too late. Where nobody is warned, they choose exactly as before.
- Walkers walk: legs (and settlers' arms) swing in step with the ground they cover, so feet don't slide at any speed; the ox plods with a diagonal gait. The long-robed women still glide with a bob.
- Small details: windows on the backs of townhouses and fine houses (the walls you see from the next street were blank), and a wisp of hearth smoke from some of the bigger houses.
- Fewer draw calls: the settled houses in each patch of the map, and the plants, are now drawn as one piece each, so the opening view draws in 57 batches instead of 125. Nothing should look different.
- `#town`: a town on the east bank a few years in. The road comes in from the west edge, up a lane past a hamlet of huts and new tents, over the timber bridge at the river's narrows, through seven wheat farms and the granary on the flood plain, to a core of fine houses round a fountain, an agora, the shrine and the theatre, with townhouses and cottages along the street to the east round a second fountain and agora. 635 people, every kind of house and building, about 40 walkers, opening at normal speed.

### What to try
1. Open `#town`. It opens from the hills behind the town, looking down over the fine houses to the sea, the river, the bridge and the farms, at normal speed. Pan along the main street, follow a walker (click her), and press I for what's missing (nothing, at first). Left running, in my run no home went down a level in two game years and the town filled up to about 1,290 people. From about the eighteenth month it eats a little more wheat than its farms grow, but the granaries stay nearly full, so no bread line appears in those two years.
2. Open `#townstreet` for the same town at street level among the fine houses, for the walking and the details. Turn the sound on with a click and listen near the fountain, then zoom out over the bay.
3. Build something in `#town` (a road will do), press Ctrl+S, and close the tab. Open the bare link: the welcome card offers to carry on with your town. Or open `#saved` (your save) or `#autosave` directly. After a reload with nothing in the link, you're back on the coast with the offer again. (Building in the demos below without saving leaves your autosave as it was; a demo you've saved by hand saves itself from then on.)
4. Turn off site data for the page in the browser's settings (or block cookies and site data) and open the bare link: the welcome card says saving isn't available there, and the scroll button's card says why; everything else plays as normal. (A private window usually still allows saving, just for that window.)
5. Open `#missing` for the bread line, and `#workers` for both lines. Then open `#grow`, place the shrine and the theatre as in slice 6's check-in and leave it running without more farms: in my run the bread line appeared around day 136 ("At this rate the granaries and stalls run empty in about 5 months"), long before the first house warned about bread (around day 355).
6. Open `#food`, press M and move the farm over the green land by the river away from any road: the footprint turns amber and the label says why.
7. Open `#closed` and try the fix from slice 6's check-in (rebuild the theatre across from the shrine, lay the road back on the ringed tile): in my run 7 homes went down instead of 15, all on the cut-off street, and every home was a fine house again by day 47.

### What I'd like your eye on
- `#town`: does it read as a town you'd want to keep, and is the opening view the right one to land on? I framed it from the hills so the sea, the bridge and the farms are all in it.
- The sound: the levels against each other (sea, birds, building sounds), whether anything gets tiresome after ten minutes, and whether the footsteps near the camera feel like a street or like noise. Everything is meant to be quiet.
- The walk: do the legs read at street level in `#townstreet`, and does the ox look right?
- The shortfall line: calm enough, or does it nag? It waits until the granaries would run empty within about six months; is that enough warning, or too late?
- The welcome card's words and size on the bare link.
- The four-need sign: no demo shows one (a home's needs run out months apart); I drew one through a debug hook and it shows the water drop, the loaf, the temple and the mask in one bubble. `node scripts/screenshots.mjs four-needs` makes the picture.

### Known rough edges
- `#town` takes a moment longer to open than the bare link because it plays two game years through the command queue first: by the page's own clock that takes about half a second here, and the town is ready at about 1.6 to 1.9 seconds with its first picture at about 2.2 to 2.4 (the bare link: ready at about 1.1, first picture at about 1.3). The loading card says it is getting the town ready.
- Saves are only in this browser: no named saves, no more than the two slots, nothing that travels between devices. Opening a save reloads the page.
- Sound can't be heard here (there is no audio in the headless browser); what was checked is that it starts on the first key, that nothing starts while muted, that muting stops it and is remembered, and that unmuting starts it again.
- When a home changes look, its patch of the map is rebuilt (since the phase review only the changed buildings are redone: about 2 milliseconds for `#town`'s busiest patch, down from about 19). In a growing town that happens every few seconds; if you still see a hitch then, this is the first place I'd look.

### Measurements
- Tests: 118 in 12 files, all passing (was 101 in 10): saves (a mid-everything save in `#closed` and `#town` carries on identically, undo survives, old, newer, damaged and incomplete saves refused in words, storage that throws or is full), the walkers' new rule on a hand-made street, `#town` (every level and building, the bridge, no home down in two years), and the shortfall lines.
- Download: 242 KB compressed (was 229 KB). A save of `#town` is 452 KB.
- Load: ready at 1.02 seconds and first frame at 1.26 seconds by the page's own clock (was 1.14 and 1.39). Target: under 3 seconds.
- Draw batches, before → after: the opening view 125 → 57; `#streets` 88 → 42; `#water` 112 → 54; `#food` 125 → 69; `#warning` 129 → 84; `#fine` 134 → 82, its overview 190 → 114; `#closed` 151 → 98, overview 207 → 131. `#town`: 103 batches and 650,000 triangles from the opening view (188 before the merging), 89 at street level, 128 from the overview. Triangles are about the same everywhere.
- Main-thread time per frame before drawing, paused / running: `#food` 0.54 / 1.03 ms, `#fine` 0.64 / 1.37 ms, `#town` 0.72 / 3.4 ms. The running numbers include about a second of game time per frame here (headless frames come about once a second), so they overstate a real frame.
- Frame rate: not measured (software graphics only here). Target: 60 frames a second on a mid-range laptop at 1080p with a few hundred buildings and walkers; `#town` (96 buildings, about 40 walkers) is the town to try it with.

### What the review changed
- **Sound is properly off when it's off.** While muted, nothing is made at all (the first click after unmuting starts it); muting stops the sea and the wind rather than just turning them down, and the sound pauses while the tab is in the background. The little chime for a home going up (or the falling pair for one going down) now plays only for homes near where you're looking, and at most once a second, so a fast-growing town doesn't jingle.
- **A quieter autosave.** The note by the corner says "Saved by itself" the first time in a session only; the saves card always shows when it last saved. If the game ever can't save by itself (storage full), the note says why, once, and the card says so too. A save by hand that failed is mentioned again when you open the card.
- **The bread line no longer cries wolf.** It now waits until the granaries and stalls would run empty within about six months at the rate the town is eating into them, and says how long they'll last ("At this rate the granaries and stalls run empty in about 5 months"). In `#town` the farms fall a little behind from about the eighteenth month, but the granaries stay nearly full, so no bread line shows in its first two years. In `#grow` without more farms it shows around day 136, long before the first house warns.
- **Esc puts the welcome card away** (and then the saves card), as the plan said it would.
- **The loading card** says when it is getting a prepared town ready, or opening your save.
- **Corrected in this note:** how long `#town` takes to open (it was measured from outside the page, which counts the slow first pictures of the software renderer: by the page's own clock the two years of play take about half a second and the town is ready in under two), step 1 (no bread line in two years now), step 3 (building in the demos also saves itself), step 5 (the new day and words), and the rough edges and the request for your eye on the shortfall line.

### What the phase review changed
I looked over the whole phase as one game: one long session from the bare link (roads, plots, a fountain, farms, the granary and agora, the bridge, saving, letting a street go dry and fall back, the shrine and theatre, every overlay, then a reload and Carry on), each slice's main promise again, and four game years of a town built the ordinary way, adding a farm each time the game asked for one. These are the changes; the first two matter most.

- **Trying a demo leaves your autosave alone.** Before, building anything in `#town` or any other demo turned on saving by itself, so the autosave of the town you'd been building could be replaced by a demo without you noticing. Now a demo only saves itself once you've saved it by hand, and its saves card says so. Your own town still saves itself as before. What's new and step 3 above are corrected to match.
- **The bread line speaks up when homes are already going without.** In my four-year town, the farms grew only a little more than the town ate, so the granaries never looked like running dry and the line said nothing. Meanwhile the homes at the far ends of the street went short between harvests and 27 of them fell back a level. Now, when homes are already short of bread and the farms grow less than a tenth more than the town eats, the line says so and how many more farms would keep it fed ("…too little to spare. 7 homes are already going without between harvests. Another farm would keep it fed."). In the same town it now shows in the fourteenth month instead of the twenty-third, and 7 homes fell back instead of 27. `#town` still shows no bread line in its first two years. When a farm, or a workplace short of workers, has no road beside it, the lines now say that rather than "short of workers".
- **Gentle seasons in the light.** The phase spec promised them and they hadn't been built. The sun is now a little warmer and stronger towards July and paler and softer towards January. The land and the farms don't change, and early spring, where every town starts, stays close to the light everything was tuned in. It is subtle on purpose; I'd like your eye on whether it is too subtle to notice or just right.
- **Houses going up a level cost less to draw.** Only the buildings that changed are redone now, not the whole patch: about 2 milliseconds instead of 19 for `#town`'s busiest patch. The rough edge above is updated to match.
- **Walkers standing still stand with their feet together.** One waiting at a farm or pausing on the road used to freeze mid-stride.
- **One card at a time in the top right corner.** The controls card and the saves card used to open on top of each other. Esc now also puts the controls card away.
- **The household panel no longer covers the population** on windows narrower than about 1560 pixels (a 1280-wide window, for example): it starts below the top bar.
- **Small words.** The water and food overlay buttons say what they show. The controls card uses the same curly apostrophes as everything else, and the bread line ends with what is already happening rather than putting it in the middle.

Noticed and left as they are (on the list for later):
- When a whole street falls back at once, the "Back to a hut" notes rise on top of each other.
- When two shortfall lines show and one goes and comes back, they can swap places.
- Money piles up with nothing to spend it on: my four-year town was down to about 3,100 drachmas in its first summer and had 15,000 by the fourth year.
- Pressing Start building on the bare link while a save exists: once you build, the new town's autosave replaces the old town's. Your save by hand is untouched, and Carry on is still offered first.

### The phase, all told

Phase 1, a living neighbourhood, is done: seven slices, each built, then reviewed and fixed, then a review of the whole phase. Here is what you can now do.

- **The coast** (slice 1): fly over a hand-shaped stretch of Greek coast with a bay, a river from the hills, olive groves and moving water, from a bird's-eye view down to the river bank.
- **Streets and settlers** (slice 2): draw roads that follow the ground, mark housing plots, and watch families walk in from the map edge and pitch tents. Clear and undo.
- **Water** (slice 3): place fountains and watch the water carrier choose her way down your streets. Tents become huts where she reaches, and the water overlay shows the street she misses.
- **Bread on the table** (slice 4): wheat farms on the river land, ox carts to the granary, an agora and a food vendor, workers drawn from the homes, rent, and timber bridges over the river. Fed huts become cottages.
- **The people who live there** (slice 5): click any home to meet the family, with their names, mood, what they have and lack, and a line or two of chatter. Neglected homes warn first, then slip back a level, and whole families walk out of town.
- **Shrine and theatre** (slice 6): a priestess and an actor walk the streets, and homes climb to townhouses and fine houses. Each service has its overlay, and the "what's missing" view shows them all.
- **A town worth keeping** (slice 7): saving, by hand and by itself, with Carry on from the bare link; sound made in code; walkers that really walk; calm shortfall lines for bread and workers; and `#town`, a grown town of 635 people to open first.

**Recorded for later**
- Which god the shrine belongs to, and gods reacting to worship (the gods phase).
- More foods and goods, storehouses, and the living market.
- Taxes, wages and tax collectors, and something to spend money on: it piles up with nothing to buy (15,000 drachmas by year four in a town built the ordinary way).
- Fire, collapse and crime, the original's hazards.
- Generated maps, once the wider world exists; music.
- Seasons that affect farming (today only the light changes).
- Small things: "Back to a hut" notes stack when a whole street falls back; two shortfall lines can swap places; starting a new town replaces the old town's autosave; a demo you built in but didn't save loses its changes when you leave it.
- Saves are about 450 KB each, and only two fit comfortably; more slots would need smaller saves.

**Budgets that moved**
- Download: 153 KB at slice 1, 246 KB now, from the extra buildings, walkers, sound and saves. Load stays well under the 3-second target: about 1.1 seconds to ready on the bare link and about 1.6 for `#town`, by the page's own clock.
- Draw batches went up when the map was split into patches (slice 2) and back down when settled houses and plants were merged (slice 7): 57 in the opening view, 103 in `#town`.
- Frame rate on a real laptop has never been measured. Only your machine can tell us whether `#town` holds 60 frames a second.

**Questions for you**
- Does `#town` hold a smooth frame rate on your laptop?
- Is the seasonal light too subtle, and is the sound the right kind of quiet?
- Does the bread line warn at the right moment, or does it nag?
- Should a demo you've built in warn before you leave it, rather than dropping the changes?
- Is money piling up acceptable for now?
- What should the next phase be?

## Slice 6 — Shrine and theatre (16 Oct)

The town gets its first taste of the gods and the stage: a shrine sends a priestess out with an offering bowl, a theatre sends an actor out with a mask, and cottages they reach climb to two-storey townhouses and then to fine houses round a little courtyard. You weren't here while it was built: every choice below is mine, from the spec's defaults.

Nothing to break: there are no saves until slice 7. Every earlier demo still opens on the same streets, houses and people (after the review, `#harvest` has three more people, and `#missing` opens with one more hut and one fewer cottage; see the end of this note). What you'll see change there: a cottage's panel now says what it needs to become a townhouse, and the stalls and granaries hold different amounts, because the review changed how much the food vendor's porter carries.

### What's new
- Shrine (V, 200 drachmas, 2 workers): a little marble temple on a stepped platform, four columns and a pediment to the road and a lilac band round the frieze, an altar in front with a smoking offering fire, jars of offerings and two cypresses behind. Its priestess, in a long white robe with a lilac mantle and veil, carrying a shallow bowl with a little flame in it, walks her round the way the water carrier and the food vendor do (32 road tiles' reach). Every cottage or better beside her way has the priestess's blessing for four months.
- Theatre (P, 400 drachmas, 5 workers): tiers of pale stone seats round a paved orchestra, banked with grass behind, and the stage building along the road, with three doors, painted panels and masks over the doors, a low stage, and rose banners at its ends. A few people sit in the seats. Its actor, in a rose tunic and a short saffron cloak, wearing a big pale comic mask, one arm flung up mid-speech and a scroll of the plays in the other hand, walks his round on the same terms and brings plays to townhouses and fine houses.
- Townhouses: a cottage with water, bread and the priestess's blessing, settled a month and with a month of each in hand, becomes a townhouse. There are two kinds: a two-storey house with its long side to the road, a timber balcony over the door and a walled yard with an olive tree and jars; and an L-shaped one, a two-storey block at the back and a one-storey wing to the road with a vine pergola on its roof terrace, beside a little walled court with a cypress and a bench. A townhouse holds 17 people and pays 6 drachmas rent.
- Fine houses: a townhouse that also has plays becomes a fine house, again after a month settled with a month in hand. There are two kinds: a courtyard house, a two-storey hall with a colonnade across the back, low wings down the sides and a columned gateway in the front wall, so you look into a paved court with an olive tree; and a villa with a porch of four columns under a pediment, steps up to it, and a garden with a clipped hedge and two cypresses. A fine house holds 21 people and pays 9.
- Going down works as before: ten days without, a two-month warning with a sign over the roof, then one level down, and the people it can't hold walk out as whole families. Big households (up to 21 people) now choose who goes the same way, never the head of the house and never breaking up a family.
- Signs for three or four needs: a wider sign holds the water drop, the loaf, a lilac temple and a rose mask in a row, always in that order. Signs sit higher over the taller houses.
- Two new overlays: religion (Y, or the temple button) shows where the priestess reaches in lilac, culture (C, or the mask button) where the actor reaches in rose. Posts stand over homes that want her or him and are without or running low. Placing a shrine or theatre turns its overlay on and says how many homes it would reach.
- The household panel, hover tips, what's-missing overlay and trouble count all know the new needs: "Blessings · last 3 months more unless the priestess comes by again", "To become a fine house: plays from a theatre, with water, bread and blessings kept up", "Gave up the fine house for a townhouse, after two months without plays". A cottage only asks for blessings once there is a shrine in the city, and a townhouse for plays once there is a theatre, so towns without them read as before.
- New talk: 47 lines for blessed cottages, townhouses with and without plays, fine houses, moving up, and going without the priestess or the plays ("We left honey cakes at the shrine. The priestess says the god was pleased. The ants certainly were.").

### What to try
1. Open `#grow`: the fed town of cottages from `#food`, with the shrine tool picked. Place the shrine beside the main road near its end, a few houses past the fountain (anywhere beside a road works; the label says how many homes the priestess would reach). Press 3 (four game days a second). In my run the first townhouses went up within ten game days, and every cottage on the streets was a townhouse after about three months. Then press P and put the theatre across the road from the shrine: fine houses start within ten days, and about four months later the whole street is fine houses. Leave it running: the town of fine houses now eats more wheat than its three farms grow. From about the fifth month, hovering the granary or the agora says so in numbers ("The farms grow about 570 measures of wheat a month and the town eats about 580; another farm would feed it", and from about the eighth month "two more farms"). Left alone, the granary slowly empties: the first fine houses warn about bread around the fifteenth month, their panel naming the two farms, and the first goes back to a townhouse around the eighteenth. In my run, two more farms by the farm road (I ran the road three tiles further east for the second; a farm right beside no road gets no workers, and the tip says so) kept every house fine with no warnings when built by the eighth month; built in the tenth, a few houses warned for a while but none went down; left to the thirteenth, 13 houses went down, because a new field takes two months to ripen and by then the granary was empty. No second agora is needed.
2. Open `#shrine` (add `-overlay` for the religion overlay, or press Y): the same town a month and a half after the shrine went in, townhouses going up among the cottages. Hover a townhouse and a cottage to compare what they say.
3. Open `#priestess` to follow her at street level, and `#actor` to follow the actor (drag or Esc to stop).
4. Open `#theatre` (C for the culture overlay): the theatre a month after it opened, seen from the north, fine houses starting to appear.
5. Open `#fine`: the district from above six months after the theatre opened, every house on the streets a fine house. Click one to meet the household (21 people, with all four needs), and press I for the what's-missing overlay.
6. Open `#compare`: the same moment from the east, the fine houses on the left and, on the right, the hamlet at the lane's far end, with its own fountain and agora but beyond the priestess's and the actor's reach, still cottages.
7. Open `#closed`. It opens paused. Two and a half months ago the theatre was cleared and one tile of the west street's road was cut (ringed in cream). Nobody has gone down yet: 16 fine houses warn, 9 of them about plays only, and the cut-off street's houses show wide signs with three needs (water, blessings and plays). The panel is open on the most urgent house, 12 days from going down. Press Space to watch them go down and families walk out (in my run 59 homes went down a level over the next eight months). Or first rebuild the theatre across the road from the shrine (P) and lay the road back on the ringed tile (T): in my run 15 homes still went down a level, the 7 on the cut-off street within about two weeks and 8 at the west end of the main road about five weeks in, because the new actor went first to the cut-off street, where the need was oldest. About two months later every home was a fine house again.

### What I'd like your eye on
- The four steps up: in `#compare` and `#fine`, can you tell a cottage from a townhouse from a fine house at the default height? Does each step look grander enough to be worth working for?
- The priestess and the actor: easy to pick out from the blue water carrier and the saffron vendor, from above and at street level?
- The shrine and the theatre: do they read as what they are? The theatre has a band of dressed stone round the top of its seats and a grassy bank behind (a tall wall there hid the seats from the road side); from the default camera on the road side you see the rim and the stone stairways rather than the seats themselves.
- The wide signs in `#closed`: can you read three icons at a glance, and tell which need is which?
- The pace: from the shrine going in to a street of fine houses took about seven game months in my run (under a minute at the fastest speed). Too quick, too slow? And the bread squeeze that follows in `#grow`: fair pressure, or a nuisance?
- The overlay colours: the priestess's lilac and the actor's rose, against the water blue and the food gold.
- The new talk: does it keep the voice of the earlier lines?

### Known rough edges
- No demo shows a four-need sign. A home's needs run out months apart, and its two-month countdown starts from the first one, so by the time a fourth need runs out it has already gone down a level. The sign itself is drawn the same way as the three-need one.
- When a theatre comes back after a long gap, the actor heads first for the houses that have gone longest without, not for the ones closest to going down, so a few homes at the far end can go down while he is busy elsewhere (in `#closed`, 8 of the 15).
- The farm shortfall is shown in numbers, but only when you hover the granary or the agora, or in a hungry house's panel. Nothing on the main screen says it until houses start warning.
- The culture towns draw more batches from the overview (up to 207, against 172–187 before). If your laptop struggles there, this is the first place I'd look.

### Measurements
- Tests: 101 in 10 files, all passing (was 90 in 9).
- Download: 232 KB compressed (was 218 KB): the new houses, the shrine, the theatre, the two walkers, the signs and the talk.
- Load: ready at 0.9 to 1.1 seconds and first frame at 1.2 to 1.35 seconds by the page's own clock over two runs (was 0.9 and 1.1).
- The opening view draws exactly what it did: 542,000 triangles in 125 batches. Towns with bread draw a couple more batches than before because the stalls hold more loaves: `#food` 458,000 in 125 (was 123), `#warning` 470,000 in 129 (was 123).
- Each new model is lean: a townhouse 524 or 616 triangles, a fine house 691 or 723, the shrine 633, the theatre 1,796 (a cottage is about 420).
- `#fine` (783 people, 38 fine houses): 488,000 triangles in 134 batches; with what's missing on, 522,000 in 138; `#compare` 491,000 in 134; the theatre 433,000 in 109; the overview 662,000 in 190. `#closed` 482,000 in 151, the overview 655,000 in 207.
- Main-thread time per frame before drawing: `#fine` about 0.4 to 0.6 ms paused and 1.1 to 1.2 ms running (`#food` 0.4 to 0.6 and 0.9 to 1.1; it was 0.4 and 0.7 before slice 6).
- Homes going down a level over two years: `#shrine` 0 (and no bread warnings), `#theatre` 0, `#fine` 0; `#grow` played through with two more farms 0, without them the first goes down around the eighteenth month.
- Frame rate: not measured (software graphics only here). Target: 60 frames a second on a mid-range laptop at 1080p.

### What the review changed
- **One agora can feed a street of fine houses.** Before, the food vendor's porter couldn't carry bread to the stall as fast as 38 houses of 21 people ate it, so the demo towns needed three agoras and a second granary, and even then `#grow` ran short. Now the porter carries half as much again each trip and the stall holds more, and the vendor walks as far as the priestess and the actor (64 road tiles, was 48). The demo towns now have one agora on the main street (plus the hamlet's own), one granary, and five farms; the second granary that stood empty is gone.
- **The game says what to build when bread runs short.** Before, a hungry fine house mostly said the vendor had "taken other turns" or the stall was empty, which pointed at the agora when the real problem was too few farms. Now, when the farms grow less than the town eats, the hungry house's panel, the granary's tip and the agora's tip all say so in numbers and say how many farms would fix it ("another farm", "two more farms"), leaving a tenth to spare. If a farm is short of workers, they say that instead.
- **`#closed` opens before anyone has gone down.** It now opens two and a half months after the theatre was cleared, instead of four, so you see the warnings with nobody yet gone back to a townhouse, and a fix in time saves most of the street. The step above has the new numbers.
- **"Not yet" instead of a grumble.** In the first two months after a shrine or theatre opens, a house the priestess or actor hasn't reached yet says "A theatre has opened; the actor hasn't come this way yet" with no minus to its mood, and its panel doesn't say she or he has "taken other turns".
- **The theatre from the road side.** From the default camera, south of the road, the theatre looked like a green mound. It now has a band of dressed stone round the top of the seats, four stone stairways up each tier and two shades of seat stone, so the tiers show where you can see them.
- **The warning box.** When a home is going without more than one thing, the box now says when each of the others would send it down ("Without blessings, they go in 40 days all the same. Without water, in 55 days."), where before it gave one date for all of them.
- **Smaller things.** The days in a house's mood now match the days in its panel (one rounded up, the other down, so they could be a day apart). Talk that contradicts the town is skipped: nobody wishes for a theatre when there is one, nor for "somewhere proper to thank the gods" when a shrine stands, and a hut doesn't talk about its townhouse.
- **`#shrine` bread.** The west-end bread warnings while the cottages turn into townhouses are gone: over two years `#shrine` has no warnings at all.
- **Re-checked.** I followed the steps of every earlier check-in again after the bread change. They still do what their notes say, and in `#bridge`, where 14 homes went down over two years before, none do now. `#harvest` opens with 473 people (was 470), and `#missing` with 438 (was 434), three huts instead of two and 7 homes warning instead of 9, because bread reaches the stalls at a different pace. In `#missing`, the two extra farms still bring every home back to a cottage in about six months, as its note says.
- **Corrected in this note.** Step 1 (`#grow`) now tells the bread story as it plays now, step 7 (`#closed`) has the new numbers, and the measurements are the new ones.


## Slice 5 — The people who live there (16 Oct)

Every home is now a household you can click: a named family from somewhere in the Greek world, who they are, how they feel and why, what they have and lack, a line or two of their talk, and what has happened to them; when a home loses what it needs it warns you with a sign over its roof for two months before it goes down a level and some of the family walk out. You weren't here while it was built: every choice below is mine, from the spec's defaults.

Nothing to break: there are no saves until slice 7. What changes on purpose: a home now goes down a level about 70 days after a need runs out, not 30 (ten days' grace, then a two-month warning); a hut needs a month's bread in hand to become a cottage; undo only reaches back about a month, and not past someone moving in or grain being stored; the water and food overlays' posts now stand only over homes without, or with less than a month left. Every earlier demo still opens on exactly the same town.

### What's new
- The household panel: click any lived-in home (with no tool picked) and a parchment panel opens on the left. "The house of Sosias, from Megara, here since May 750 BC"; how they feel, from content to fed up, with a little face and every reason named ("+ Bread on the table", "− No water for 39 days"); two lines of talk from named members, which change every 12 days; what they have (and how long it lasts) and what they lack (and why, in the same words as the hover tip); what the next level needs; who lives there, with ages and how they are related ("Eurydike, 40, cousin of Sosias"; "Stephanos, 40, husband of Eurydike"); and their story, newest first ("Became a cottage: whitewash, a tiled roof and bread on the table"). A gold ring on the ground marks the house. Click another home to switch; Esc or open ground closes it.
- Families: the first settlers to a plot found the household and give it their name; later arrivals are the head's brothers, sisters and cousins with their own families. About 60 men's and 60 women's names (Nikias, Lykon, Theano, Myrrhine…) and 20 places they came from (Megara, Argos, a hill village in Arcadia…). Names and ages come from their own seeded stream, so they never change how the town grows.
- Warnings: when a hut loses its water, or a cottage its water or bread, for more than ten days, a round sign floats over its roof with a water drop or a loaf (or both side by side, when both are missing), its rim turning from orange-red to deep red as the two months run down and pulsing in the last ten days. The panel shows a warning box: "No water for 39 days, no bread for 12 days. In 31 days they give up the cottage for a hut, unless the water carrier comes by. 4 of them would move away (Doris and Chairephon; Euboule and Pamphilos)", with a bar running down and the reason for each need ("Water: no road joins it to a fountain").
- Decline: if nothing changes, the home goes down one level ("Back to a hut", and "−4" in rust), the people it can no longer hold walk out of town along the road, and the panel names them. Families leave together: a brother, sister or cousin with their partner and children, or a grown son or daughter or an elderly parent on their own, never the head of the house and never a young child without its parents ("Menon and Charis moved away", "Philippos and family went back to Megara"). Another level down takes another full warning.
- The trouble count: a red triangle in the top bar with the number of homes warning (hidden when none). Hover it for the list; click it to fly to the most urgent and open its panel.
- The "what's missing" overlay (I, or the house-and-question-mark button): homes about to go down a level are tinted red, homes lacking what they need to grow amber (with gold-rimmed signs saying which need), homes with all they need green. A small legend at the top says what the colours mean.
- Hover tips on homes say "The house of X" and "Click to see who lives here". The undo button greys out and says why it can't ("Undo only reaches back about a month", "A family has moved in: clear it instead").
- Under the hood: the town's drawing only redoes what changed (the ground and bridges only when a road or plot changes; workplaces only when something about them changes, not every frame), and the stall's baskets look full from about two-thirds stocked.

### What to try
1. Open `#people` for the fed town by the agora at street level, with the panel open on the house of Sosias. Read it, then click other homes. Hover one first to see its tip.
2. Open `#warning`. It opens paused. A year after the town grew, the one tile of road where its west street met the lane was cleared, so the water carrier and the food vendor can't get in: seven cottages along that street have signs over them, the most urgent with 26 days left. The panel is open on one of them and the road tool is picked. The cut tile is ringed in pale cream, centre right, where the street should meet the lane (the ring goes once the road is back). Click it to lay the road back, then press Space to let time run: within about two weeks of game time (about 15 seconds at normal speed) the water carrier and the food vendor have been down the street, the signs are gone, nobody has gone down a level, and the story says "The water carrier came back" and "The food vendor came back".
3. Open `#decline`, the same street a few weeks later with the panel on the house nearest to going down, 3 days from it. Time is running: watch it become a hut, the rest of the street follow within days, and the leavers walk out of town. Read the panel after.
4. Open `#missing` for the watered town with one farm feeding it, the what's-missing overlay on: red homes are short of bread, amber ones need it to grow. Click the trouble count in the top bar to go to the most urgent home. Then build a second and a third farm (M) on the green land by the river, right beside the farm road (if the tip says "Needs a road beside it", move over: a farm with no road gets no workers), and press 3. A new field takes two months to ripen, so a dozen homes go down to huts first; over the next six or seven game months (about a minute at speed 3) watch them come back to cottages and the reds fade. (One more farm alone isn't enough: with two, a few homes keep warning on and off for months.)
5. In `#people`, press I to turn on the overlay (or open `#people-overlay`): the town is green, and the tents up the lane are amber with water signs, beyond the fountain's reach.
6. In any town, build something, wait a month at speed 3, and hover the undo button.

### What I'd like your eye on
- The panel: is it the right size and place (left side, 344 px wide)? Is the order right (warning, mood, talk, have and lack, who lives there, story)? Is anything there you'd never read, or missing?
- The talk. About 130 lines meant to be warm and gently funny and a little Greek ("The goat ate my sandal. I've forgiven the goat. I haven't forgiven the sandal-maker."). Do they land, and does the voice feel right?
- The signs over roofs: big enough from the default height, too big right down among the houses? Can you tell the red warning rim from the gold "needs to grow" rim in the overlay? When a home lacks both water and bread, the drop and the loaf share one sign: readable?
- The timing: ten days' grace (a water carrier or vendor a few days late is ordinary on a long round, and without it signs flickered on and off all over `#water`), then two months' warning, then one level down. At normal speed a day passes each second, so a home goes down about 70 seconds after its water stops (a little over a minute of warning on screen; 15 seconds at the fastest speed). Enough time to notice and act, or too long to feel any pressure?
- The what's-missing colours: red, amber and green on the ground under the houses. Readable from the overview?
- Mood is only a reading for now: it explains, it doesn't make anyone leave. Does seeing "Fed up" with nothing following from it feel wrong?

### Known rough edges
- The names come from lists of 60, so two households can share a head's name in a big town.
- The story keeps the last eight things that happened; older ones drop off.
- Talk repeats over time (about 130 lines), and the "situation" line only knows a few situations (no festivals, no gods yet).
- Because families leave together, now and then a decline sends away a few more people than the lower level strictly needs (in a test town with 74 declines, it never did).
- The main-thread saving from drawing only what changed doesn't show in my headless numbers at this size of town; it should matter more in a bigger one.

### Measurements
- Tests: 90 in 9 files, all passing (was 74 in 8).
- Download: 217 KB compressed (was 195 KB): the names, the talk, the panel and the signs.
- Load: ready at about 0.9 seconds and first frame at 1.1 seconds by the page's own clock, as before.
- Every earlier view draws exactly what it did: the opening view 542,000 triangles in 125 batches, `#water` 511,000 in 112, `#food` 458,000 in 123.
- `#warning`: 470,000 triangles in 123 batches (the signs add about 1,200 triangles; the ring on the cut road one batch); `#missing` with the overlay on, 552,000 in 145; the overview with the overlay, 649,000 in 178.
- Homes going down a level over three in-game years: `#food` 0 (was 0); `#workers` 0 (was 2); the `#chain` town with three farms and the agora at the edge of town 0 (was 13, the back-and-forth found in review); with one farm, where bread is genuinely short, 43 (was 50).
- In `#food`, over a game year, the drawing compares the town's 25,600 tiles 0 times (was 638), and the workplaces are re-read 638 times instead of every frame. Main-thread time per frame before drawing is about 0.5–0.7 ms both before and after (software graphics, and the noise is bigger than the difference).
- Frame rate: not measured (software graphics only here). Target: 60 frames a second on a mid-range laptop at 1080p.

### What the review changed
- **Families leave together.** Before, people left one at a time from the newest arrivals, so a husband could stay after his wife left, or children could be left without their parents. Now whole families go: a brother, sister or cousin with their partner and children, or a grown son or daughter or an elderly parent on their own. The head of the house never leaves, and nor does a partner or a young child without the rest of their family. The panel's warning names who would go, and the story gives each family its own line.
- **A home warns about everything it lacks.** A cottage cut off from both water and bread now shows both on its sign (a drop and a loaf side by side), and its panel names both, with the reason for each. The story notes each one coming back: before, when the water came back while bread was still short, the story never said the water carrier had come back.
- **The warning and "needs to grow" signs look different.** A warning's rim starts orange-red and turns deep red; the "needs to grow" sign in the what's-missing overlay keeps a gold rim. Before, a fresh warning's amber rim was almost the same colour as the gold one. Signs also grow less when the camera is right down among the houses.
- **`#warning` opens paused, with the cut road ringed.** It used to start with time running, and in my run reading the panel and finding the gap took long enough for two homes to go down a level after the road was mended. Now you can read the panel and find the gap first, then press Space. The gap is ringed in pale cream (in `#decline` too) and the camera is framed on it. I checked the steps as written: after the road is mended, all seven warnings clear within about 15 days of game time, and nobody goes down a level.
- **The talk.** No line has a baby doing grown-up things. No lines say "back to a tent" from a cottage. No line says a relative is leaving when the panel says otherwise. Places of origin now read right in every line ("a farm near Sparta" became "the hills of Laconia"). A few weaker lines were rewritten.
- **Smaller things.** "Here since" stays on the panel even after the story fills up. When bread runs short because a farm has no road or too few workers, the reason now says so instead of asking for another farm. The undo button explains itself from the start. When a home that has already gone down a level is still without and starts worrying again, its story says so.
- **Corrected in this note.** The steps for `#warning` and `#missing` now match what happens: `#warning` opens paused, and the farms in `#missing` must be right beside the road. With three farms the reds clear in about a minute at speed 3, not a couple of minutes. `#warning` and `#decline` don't open any slower than the other demos: by the game's own clock they're ready in about a second, like `#food`. The 3.5 seconds I gave before was the headless browser's overhead.


## Slice 4 — Bread on the table (16 Oct)

You can now build the city's first food chain: a wheat farm on the green land by the river, a granary and an agora, with ox carts, a porter and a food vendor at work, and huts that get water and food turning into whitewashed cottages. You weren't here while it was built: every choice below is mine, from the spec's defaults.

Nothing to break: there are no saves until slice 7. Two changes to what you saw before: every building now needs workers from nearby homes, so in `#fountain` the first water carrier waits until families have moved in; and rent arrives on the first of each month, so the drachmas in `#water` and `#streets` now tick up.

### What's new
- Wheat farm (M, 200 drachmas), on fertile ground by the river only: a mud-walled farmhouse under thatch with an open barn, a threshing floor and a haystack, and a fenced field of wheat in rows on ploughed furrows. The wheat grows from short green rows to tall gold over two months, then is cut to stubble, and stooks of sheaves stand on the threshing floor until the carts take them. While you hold the tool, ground that isn't fertile enough is washed rust-red near the pointer, and the label says how fertile the spot is and about how much it would harvest.
- Ox carts: after each harvest the farm sends up to three carts, each an ox, a two-wheeled cart piled with golden sheaves and a driver walking at the ox's head, by the shortest road to a granary with room. They unload and come back empty.
- Granary (G, 300 drachmas): a long stone storehouse under a tiled roof, two domed grain bins, and a yard where sacks pile up as it fills (it holds 3,200 measures; a measure feeds one person for a month).
- Agora (K, 250 drachmas): a paved square with a small stoa of columns along the back, and a food stall under a red-and-white striped awning with baskets of loaves that fill and empty with its stock. Whenever the stall has room for a full handcart, its porter pushes one to the nearest granary and brings back sacks of grain.
- The food vendor: a woman in a saffron dress with a wide flat basket of loaves on her head. She walks the streets the same way the water carrier does (her own reach of 32 road tiles, the hungriest homes first), and every hut or cottage beside her way has food for four months. Tents don't buy bread: their families live off the land until they have water.
- Cottages: a hut with water and food becomes a cottage, whitewashed with blue shutters and a terracotta tiled roof, a walled yard with an olive tree or a vine pergola. "Cottage" floats up in gold. A cottage holds 13 people (a hut 9). A cottage whose food or water has been gone a month goes back to a hut, and the people it can no longer hold walk out.
- Workers: half of each household can work. Jobs go to the nearest homes by road first: a fountain needs 2, a farm 10, a granary 6, the agora 6. A building short of workers works slower and says so when you hover it ("Short of workers: 4 of 10 · working at 40% · more homes nearby would help"). The top bar shows jobs filled out of jobs (red while any are empty); hover it to see which buildings are short.
- Rent: on the first of each month every lived-in home pays: a tent 1 drachma, a hut 2, a cottage 4. Hover the drachmas to see last month's rent.
- Bridges: drag a road straight across a narrow stretch of the river and it becomes a timber bridge, arched, with rails and piles in the water, at 40 drachmas a tile. The river is at least 6 tiles wide everywhere, so I let a bridge span up to 9 tiles (the 5 suggested would have allowed none); the narrow places are upstream, north of the town. Where it's too wide the label says so, and how wide it is. Clearing any part of a bridge clears all of it.
- The food overlay (L, or the loaf button): roads in the vendor's reach turn gold, homes with food get a gold post (taller the longer it lasts), huts and cottages without food a short plum stub, and farms and the granary are tinted so you can see the whole chain. It comes on by itself while you place an agora, farm or granary, and the agora's label says how many homes its vendor would reach.
- Hover any farm, granary, agora, cart, porter or vendor to see what it's doing: the crop and when it's harvested, the barn, the stock, who's on the road. A home's tip now has a food line and a work line. Click the vendor, a cart or the porter (or the agora or a farm) to follow them.

### What to try
1. Open `#food` for the town west of the river about a year on, with the whole chain running: three farms by the river, the granary half way along the farm road, the agora by the main junction, and most homes already cottages. Hover the agora, a cottage and a farm.
2. Open `#food-overlay` (or press L in `#food`) to see the vendor's reach in gold, the posts over fed homes and the plum stubs over the hungry ones. Press O to flip to the water overlay.
3. Open `#vendor` to follow the food vendor at street level on her round.
4. Open `#harvest` at the farms: one field is gold and nearly ripe, the other two were cut lately and their carts are on the road. The camera waits at the gold field; within a few seconds it is cut to stubble, and the camera follows its first ox cart down the farm road to the granary.
5. Open `#chain` for the watered town from `#water`, before any food buildings, with the farm tool picked. Build a farm on the green land by the river with a road beside it, a granary (G) and an agora (K) by the town, then press 3. The first harvest comes about 15 seconds later at fastest speed, and the first cottages about half a minute after you built. One farm can't feed this town; watch the plum stubs, then add a second and a third farm.
6. Open `#workers` for a young town of tents with the whole chain just built. The jobs figure in the top bar is red. Hover the farms: the granary and agora are nearer the homes, so they took the workers first. Press 3 and watch the jobs fill as families move in.
7. Open `#bridge` at the river north of the town: a bridge is already across, carts are bringing grain over it from farms on the far bank, and a second road stops at the bank by the granary with the road tool picked. Drag from the end of that road straight across the river to build another. Try dragging across where it's wider, or along the river, and read the label (in `#bridge`, a drag across a wide stretch may instead find its way round over the existing bridge; in `#water`, with no bridge yet, the label says how wide the river is there).
8. In `#harvest`, clear a farm with X while its carts are out: they go with it. Press U to bring it back.

### What I'd like your eye on
- The wheat field as it grows, green rows to gold to stubble, both close up and from the default height. Up close it's a ridge of stalks with a fringe of ears; does it read as wheat?
- Whether cottages read as a clear step up from huts, and whether the two kinds (gabled, and hipped with a vine pergola) sit well together.
- The agora: is the stall under its striped awning easy to spot from the usual height, and does the stoa look right?
- The ox carts: can you tell a loaded cart (golden sheaves) from an empty one, and is the ox clear against the road?
- The food vendor in saffron next to the water carrier in blue: easy to tell apart?
- The numbers. A farm harvests about 380–430 measures every two months on good ground; a town of 40 huts eats about 360 a month, and more as they become cottages, so it takes three farms. The stall holds 1,600 and the porter carries 800 (four times what I'd planned: with less, the stall ran dry while the granary sat full). In `#food` every hut becomes a cottage (38 of the 44 homes; the other six are tents beyond the water carrier's reach) and they stay cottages.
- Workers going nearest first: in `#workers` the farms by the river wait while the granary and agora fill up. Is that the right feel, or should farms come first?
- The bridge: its arch and rails, and whether 9 tiles is about the right limit.
- The plum stub for "no food" in the food overlay (terracotta is already "no water").

### Known rough edges
- The food vendor sells to every hut or cottage she passes, even if the stall is nearly empty; the last homes on her round can get only a few days' food.
- (Found in review.) An agora at the edge of town, such as at the top of the lane in `#chain`, can't get round every home in four months, so the homes at the far end of the vendor's reach go back and forth between cottage and hut even with a full stall. An agora nearer the middle of town avoids it. The hover tip only says the vendor "has taken other turns lately".
- Workers are shared out once a day, so a new building waits up to a day before anyone works there, and after an undo the jobs are rebuilt the next day.
- Three farms built at the same moment ripen together, so their carts come in a crowd; the demos stagger them.
- Carts and walkers pass through each other on the road and on bridges.
- The stall's loaves are small; from the default height its stock is easier to read from the hover tip than from the baskets.
- In `#harvest`, carts heading home from the granary are empty, so the first carts you see may not be carrying anything.
- There is no "what's missing" view yet; the food and water overlays have to be flipped between (that comes with slice 5's household panel).

### Measurements
- Download: 195 KB compressed (was 179 KB). Target: first load under 3 seconds.
- Load: by the page's own clock the game is ready about 0.9 seconds after the page starts loading and draws its first frame at about 1.1 seconds, with software graphics on my machine, the same as the slice 3 build side by side. (This note first said 3.4 seconds: that was the test browser noticing late, behind its slow software-drawn first frames. The review sorted this out.)
- The opening view, close-up views, `#streets` and `#water` draw exactly what they did: about 540,000 triangles in 125 batches for the opening view, and 511,000 in 112 for `#water`.
- `#food` (44 homes, 38 of them cottages after the review's fix, 3 farms, a granary, the agora, 15 walkers): 458,000 triangles in 123 batches; with the overlay, 492,000 in 125; at the farms, 510,000 in 134; from the overview, 616,000 in 172. A cottage costs about 400–450 triangles (a hut about 890), so a town of cottages is cheaper to draw than a town of huts, and no far-away cottage model was needed.
- Frame rate: not measured (software graphics only here). Target: 60 frames a second on a mid-range laptop at 1080p.

### What the review changed
- **The food town no longer flips back and forth.** In `#food` the granary sat full and the farms' barns filled up, but the agora's stall kept running empty: the porter only set off once the stall was half empty, and the town ate the rest before he was back. So about a dozen homes went from cottage to hut and back every few months, and families walked out and new ones walked in each time. Now his handcart carries twice as much and he sets off as soon as the stall has room for a full load. Over three years of play in `#food` every hut becomes a cottage and stays one (38 of the 44 homes; the other six are tents beyond the water carrier's reach). The same goes for `#workers` once its jobs fill. With one farm in `#chain` there still isn't enough grain, so homes still go back and forth until you add farms.
- **`#harvest` now shows the harvest.** The camera used to follow a cart already on the road, away from the gold field before it was cut. Now it waits at the gold field, you see it cut to stubble, and then it follows that farm's first cart to the granary. Step 4 above now says so.
- **Bridges go where you drag.** In `#bridge`, dragging straight across from the end of the second road (step 7) built no bridge: the road went round over the existing bridge a few rows south and laid a stretch of road on the far bank instead. Now a straight drag across builds its own bridge.
- **The hover tips give the real reason.** A farm with no workers said it needed workers "from homes joined to it by road" even when it was joined to plenty of homes whose people all worked nearer home (as in `#workers`). It now says that. A farm whose carts can't reach any granary, and an agora whose porter can't reach a granary with grain, now say that no road joins them. The jobs figure's tooltip now says "A wheat farm (1 of 10)".
- **Load time.** The 3.4 seconds above was the test browser noticing late. By the page's own clock the game is ready in about 0.9 seconds headless, the same as slice 3. I corrected the measurement line.
- Under the hood: when a house changes level, only the street patches around buildings that changed are redrawn, rather than the ground under every building in town.

What I checked: every "What to try" step above, in a headless browser. That covers the hover tips in `#food`, both overlays, `#vendor`, `#harvest` (including clearing a farm with its carts out and undoing it), `#workers` filling up, building the whole chain in `#chain` (in the simulation the first harvest comes about 15 seconds after building at fastest, the first cottage at about 25), and `#bridge`: a new bridge, undo, a diagonal drag, a drag along the river, a wide stretch, letting go after Esc mid-drag (no road is laid), and clearing the old bridge while carts were on it, then undoing that. I also placed an agora against a road on each of its four sides (the stoa's back wall faces away from the road every time) and ran several hundred random clears and undos of farms, granaries and the agora with grain in them, checking that no grain is counted twice and no cart is left without a home. I compared `#streets` and `#water` with the slice 3 build: the same city, apart from the new top-bar figure, the extra build buttons and the rent in the treasury. I can't judge how any of it looks or feels for you: whether the cottages, the wheat and the carts read well is still yours to say.

## Slice 3 — Water (15 Oct)

You can now build a fountain, watch its water carrier walk the streets with a jar on her head, and see the tents she passes turn into thatched huts that hold more people. You weren't here while it was built: every choice below is mine, from the spec's defaults.

Nothing to break: there are no saves until slice 7. One change to what you saw before: settlers now come faster when there is lots of free room (and faster still when homes have water), so `#build` fills up quicker than it did.

### What's new
- Fountains (B on the build bar, 150 drachmas): a paved square with a round stone basin and a column spilling four streams of water. It needs a road beside it.
- The water carrier: a woman in a bright blue dress with a big clay jar on her head. A couple of seconds after a fountain is built she steps out onto the road and walks the streets. At each junction she heads for the home within her reach whose water runs out soonest (a nearer one wins a close call); she turns round at dead ends and where the road ahead has no homes on it. She never goes more than 32 road tiles from her fountain. After about 48 tiles of fresh road she walks home the shortest way, rests a few seconds, and sets off again.
- Every home beside a road she walks past has water for four months (about two minutes at normal speed).
- Huts: a tent with water becomes a hut, with mud walls on a stone footing, a thick thatched roof (square on some, round on others), a dark doorway facing the road, and a yard with a woodpile, a fence or a stone wall, and a water jar. "Hut" floats up, glowing blue, when one goes up. A hut holds 9 people, a tent 5, so more settlers come to fill it.
- A hut whose water has been gone a month goes back to a tent ("Back to a tent" floats up, glowing rust red), and the people it can no longer hold pack up and walk out of town.
- The water overlay (O, or the drop button at the end of the build bar). Roads she can reach turn blue, paler towards the edge of her reach and brighter where she has walked lately. Each lived-in home gets a marker: a blue post, taller the longer its water will last, or a short terracotta stub if it has none. The overlay comes on by itself while you're placing a fountain, and the new fountain's reach shows as a pulsing blue on the roads. The label by the pointer says how many homes it would reach and how many of those have no water now.
- Hover over any home with no tool picked to see what reaches it: "Has water (40 days left) · becoming a hut", or "No water · the nearest fountain is 34 steps away by road; its water carrier goes 32 at most". Hover a fountain or the carrier to see what she's doing.
- Click the water carrier, or her fountain, to follow her with the camera through her rounds and rests. Drag the map or press Esc to stop.
- Hover the population figure in the top bar to see how often newcomers are arriving and why.

### What to try
1. Open `#water` for the neighbourhood west of the river five months on. A fountain stands by the main junction and most tents have become huts. At the top of the long lane running north, a few tents stay tents. Hover one to see why.
2. Press O in `#water` (or open `#water-overlay`) to see her reach in blue, the posts over watered homes, and the terracotta stubs at the end of the lane.
3. Open `#carrier` to follow the water carrier at street level as she walks her round. Drag the map to let her go; click her again to pick her back up.
4. Open `#fountain` for the same town before any fountain, with the fountain tool picked. Move the pointer beside a road and read the label, then click to build. Press 3 for fastest and watch the tents she passes turn into huts.
5. In `#fountain`, try a second fountain somewhere else, or build one with no road beside it and hover it.
6. In `#water`, press X and clear the fountain, then let time run at fastest (3). About a month after each home's water runs out, its hut goes back to a tent and a few people walk out. Press U to bring the fountain back.
7. In `#water`, extend the northern lane with the road tool (T) and put plots (H) along it (there are only about six tiles of flat ground before the hills, so the lane can't go far). Use the overlay to see where her reach ends, and where a second fountain would help.

### What I'd like your eye on
- The huts next to the tents: do they read as a clear step up, and as mud-and-thatch homes rather than cottages?
- The water carrier: can you pick her out among the settlers without the overlay, and is her pace good to follow?
- How she chooses her way. She goes for the thirstiest homes first rather than wandering at random, so a compact town stays watered. Does that feel right, or too clever?
- The numbers: a reach of 32 road tiles, water lasting four months, a month's grace before a hut falls back. With one fountain, the 40 or so homes in `#water` stay watered; a much bigger town needs a second fountain.
- The overlay: are the blue posts and terracotta stubs readable, or too much? Is the pulsing blue preview of a new fountain's reach clear?
- The fountain itself, both up close and from the overview.
- How fast settlers come now that it depends on free room and water. In `#water` the road in from the west is busy with families; is that lively, or too busy?

### Known rough edges
- In `#water`, homes far up the lane but still within her reach can take a round or two to get their first water, because she starts with the streets nearest the fountain.
- Clearing a fountain sends its carrier home on the spot: she just vanishes.
- The fountain has no workers yet (they come with slice 4).
- The overlay's posts stand on every lived-in home at once; in a big city that may be a forest of sticks.
- A hut costs about twice the triangles of a tent. I can't measure the frame rate here, so a town of a few hundred huts is worth watching on your machine.
- There are still no bridges, so land east of the river needs its own road in.

### Measurements
- Download: 178 KB compressed (was 170 KB). Target: first load under 3 seconds.
- Load: ready in about 2.7 seconds with software graphics on my machine (2.1–2.9 before).
- Drawing the opening and close-up views is unchanged: about 540,000 triangles in 125 batches, and 380,000–400,000 in about 70.
- `#water` (46 homes, 40 of them huts, a fountain, 21 groups walking): 511,000 triangles in 112 batches; with the overlay on, 545,000 in 114; from the overview, 652,000 in 156.
- The simulation for a town of 161 buildings with 20 fountains and carriers takes about 0.07 ms per tick, so the sim is a tiny share of each frame.
- Frame rate: not measured (software graphics only here). Target: 60 frames a second on a mid-range laptop at 1080p.

### What the review changed
- **The water carrier could leave homes dry for good even though they were within her reach.** She only looked a short way down each street when choosing her way, so homes past a long empty stretch of road (with a couple of homes near the fountain), or on the far side of a loop of streets, could miss out every single round, while the overlay showed them in reach and the hover tip said she just "hadn't come this way yet". Now she weighs every home within her reach when she picks her way at a junction, and goes for the one whose water will run out soonest, counting the walk there. In `#water` the counts I checked come out the same (40 huts, all watered, over several years of play); on loops and long lanes she now takes turns round both sides.
- **Walkers now keep their own colours.** The colour that should only dye a settler's tunic (and the water carrier's dress) was dyeing the whole figure, so faces, hair and bundles took the tunic's colour, and the carrier's terracotta jar came out nearly black. Now skin, hair, bundles and her jar show as they were meant to. This also changes how the settlers from slice 2 look up close.
- Step 7 above now says how much room there is past the end of the lane.

What I checked: every "What to try" step above, driven in a headless browser (the hover tips read as written; clearing the fountain while following her stops the camera without a problem, and U brings the fountain back with a new carrier), the earlier links (`#streets`, `#settlers`, `#build`, the views), and a handful of other street layouts in the simulation (a grid, a loop, a long lane, a fountain at the end of a lane, two fountains sharing streets). Whether her new choices look right on the streets, and whether the settlers look better with their own faces, is for you to judge.

## Slice 2 — Streets and settlers (15 Oct)

You can now lay out your first streets, mark out housing plots beside them, and watch families walk in from the edge of the map and pitch tents. You weren't here while it was built: every choice below is mine, from the spec's defaults.

Nothing to break yet: there are no saves until slice 7.

### What's new
- A build bar at the bottom: road (T), housing (H), clear land (X) and undo (U or Ctrl+Z). Esc or a right-click puts the tool down.
- Roads you drag across the land. They follow the ground, find their own way around water, steep rock and anything already built, run straight where they can, and join up at corners and crossings. They're sandy paving, lighter in the middle and worn at the edges. Where a road leaves the map, a worn track carries on into the countryside.
- Rules you can see: while a tool is picked, a faint grid lies on the ground around the pointer, ground you can't use there is washed rust-red, the tiles your drag would take are lit (red where they can't be built), and a little label by the pointer gives the cost or the reason. The sea, the river and its wet pebbly bank, and steep rock are off limits; trees, bushes and rocks are cleared for free when you build over them.
- Housing plots, two tiles by two, marked out with stakes and little pennants. Click for one, or drag to fill an area.
- Settlers: small groups of two to four in coloured tunics, carrying bundles, walk in along the road from wherever it meets the edge of the map (the map's edge glows gold while you hold the road tool, to show where). Each group finds a plot beside a road joined to the edge and pitches a tent: a striped ridge tent or a round bell tent, with a cooking fire, a wisp of smoke, pots and bundles. The tent rises into place, "+3" floats up, and later groups move in until it holds five.
- Population and drachmas in the top bar. You start with 5,000; a road costs 4 drachmas a tile and a plot 10. Clearing is free.
- Clearing and undo: clear a tent and its family packs up and walks back out of town. Undo puts back what your last action changed (the last ten actions), with the drachmas; a cleared tent comes back as an empty plot, because the family has already gone.
- Hover over a plot or tent with no tool picked to see who lives there, or what it's waiting for ("needs a road beside it", "needs its road joined to the edge of the map").
- Links are now short tokens after a #, like `#streets`, so they work on the published page.

### What to try
1. Open `#streets` for a little neighbourhood on the plain between the olive grove and the river mouth, a month or so in: some tents up, more plots waiting, families on the road. Time is running, so watch them arrive; zoom right in on a tent.
2. Open `#settlers` to stand by the road in from the west and watch families walk towards you with their bundles.
3. Open `#build` for fresh land with the road tool already picked. Drag a road in from the gold edge of the map, press H and drag out a row of plots beside it, then press 2 or 3 to hurry the settlers along.
4. In `#build`, try to lay a road across the river or up into the rocky hills, and drag plots over the river bank, to see what's refused and why.
5. In `#streets`, press X and drag over a tent and a bit of road to clear them; watch the family walk out. Then press U to undo.
6. Pause with Space and build: roads and plots go down at once while time stands still.
7. Add `-fast` or `-fastest` to any link (`#streets-fastest`) to start at that speed. The slice 1 views still work the same way: `#coast`, `#river`, `#bay` and the rest.

### What I'd like your eye on
- The roads: sandy paving with soft worn edges. Should streets look more like stone, or more like packed earth? Are they wide enough?
- The tents and the settlers at street level: are the people the right size next to the tents and trees, and do the groups read as families arriving?
- How often settlers come (a group every four seconds or so at normal speed, while there's room) and how fast they walk. Too slow to watch, or too busy?
- The rule for the river: the wet, pebbly bank and about a tile beside it are off limits. Does that feel fair, or too strict?
- The placing grid, the red-washed ground and the gold map edge: helpful, or too much on the screen?
- Costs: 4 drachmas a road tile and 10 a plot out of 5,000 makes money matter little for now; it will matter more once fountains and farms cost hundreds.
- Left-drag places while a tool is picked; with a tool picked you move with the keys or the middle button. Does that work for you?

### Known rough edges
- There are no bridges yet, and the river and the crags where it rises cut the map in two: a road can't get from one side to the other. Land east of the river needs its own road in from the east or north edge of the map.
- Settlers come for as long as there's room; nothing yet makes the city more or less attractive to them.
- Clearing a tent can't be fully undone: the plot comes back, the family doesn't.
- The smoke from the fires is a few small pale puffs; it may read as specks from some angles.
- Roads meet the hillside in small steps on rough ground, because each tile follows the ground under it.
- I still can't measure the frame rate (software graphics only here). Splitting the plants into areas means close-up views now draw about 30% fewer triangles, at the cost of more, smaller batches; it would help to hear how it runs on your machine.

### Measurements
- Download: 169 KB compressed (was 153 KB).
- Load: about the same as before, 2 to 3 seconds to the first picture with software graphics on my machine (I compared both versions side by side). Target: under 3 seconds.
- Drawing, opening view: about 540,000 triangles (same as before) in 125 batches (was 21). Close-up views: 380,000–400,000 triangles (was 540,000) in about 70 batches.
- The `#streets` neighbourhood (24 homes, 59 road tiles, 8 groups walking) adds only about 11,000 triangles.
- Frame rate: not measured (see above). Target: 60 frames a second on a mid-range laptop.

### What the review changed
A second pass went through every "What to try" step above in a browser, looked at the screenshots, and tried to break the new tools. What it fixed:
- An invisible strip above the build bar swallowed clicks and drags on the map: the first-time hint ("Drag to move…") kept catching the mouse after it had faded away. The little labels by the pointer and the "+3"s could also get in the way of the mouse. None of them catch it now. (This one had been there since the coast.)
- Undo could hand out free plots: clearing some plots, undoing that, then undoing the plots themselves left the plots standing and still gave the drachmas back. Now the plots go and you get the money back once.
- Clearing a tent together with the road beside it (step 5) often cut the family off from the edge of the map, and they simply vanished. Now a family with no road out packs up and walks off across the fields to the nearest edge of the map, going round other people's tents.
- Families on the road no longer step over a piece of road you've just cleared in front of them: they stop and turn round where they stand. A group still beyond the edge of the map when you cut their way in turns back, instead of vanishing.
- The label by the pointer flips to the other side near the edge of the window, so it can always be read.
- `#build` no longer greets you with "Drag to move", since there dragging lays road; the controls card ("?") now says undo also takes back clearing.

Things I looked at and left for you to judge: the extra drawing batches (about 125 in the opening view instead of 21), which should be well within a laptop's reach but I can't measure here; the strip of about a tile beside the river that's off limits; and the smoke, which up close is a few pale puffs.

## Slice 1 — The coast (15 Oct)

The game now opens on a sunny stretch of Greek coast you can fly around, with a clock you can pause and speed up. You weren't here while it was built: every choice below is mine, from the spec's defaults.

### What's new
- A hand-shaped coast in warm low-poly 3D: a curved bay with a small rocky islet, a headland with stone pines to the east, a river that springs from a rocky gorge in the hills and winds down a green, fertile plain to the sea, olive groves planted in loose rows, scrub and yellow broom on the dry golden slopes, cypresses, reeds along the river, and drifts of poppies and daisies.
- Water that moves: gentle waves rolling with the breeze, foam breathing on the beaches, the sun twinkling on the sea, the river flowing with streaks of light and melting into the bay at its mouth.
- Warm afternoon light with soft shadows, a hazy horizon, and the coast and hills carrying on beyond the edge of the land you'll build on.
- A camera you can swing from a view of the whole coast down to standing among the olive trees.
- The calendar: the city's year starts in March 750 BC and counts down, with pause, normal, fast and fastest. At normal speed a month takes about 30 seconds.

### What to try
1. Open `#coast`. Drag with the left mouse button to move across the land, drag with the right button to turn and tilt, scroll to zoom. Press Q and E to turn a quarter at a time, N (or the compass) to face north, and "?" for all the controls.
2. Open `#river` to start at street level on the river bank, looking upstream to the hills. Zoom all the way out from there.
3. Open `#street` to stand among the olive trees west of the bay.
4. Open `#bay` and turn until you face the sun to see the sea glitter.
5. In any view, press Space to pause, then 1, 2 and 3 for normal, fast and fastest, and watch the month and the dots for the days.
6. Also there: `#hills` (where the river rises), `#headland`, `#mouth` (where the river meets the sea) and `#overview` (the whole map from high up).

### What I'd like your eye on
- The overall look: is this the warm, toy-like Greece you had in mind? I tuned colours, light, terrain and water over many rounds of screenshots, but whether it's lovely is your call.
- The colours of the land: I made the slopes dry and golden and kept bright green for the river plain (where farms will go). Too dry, too green, or too patchy?
- The water: the twinkling glints on the sea and the white foam lines on the beaches. Too busy, or not enough?
- The camera: how zooming in lowers the view towards street level, how fast it pans and turns, and whether left-drag to move feels right.
- The calendar: years counting down from 750 BC, with ordinary month names. Would you rather have Greek month names, or a plain "Year 1"?
- The opening view: is that the right first look at the coast?

### Known rough edges
- The river's water now has a smooth edge (see below), but the pebbly strip between the water and the grass still meets the grass in little triangular steps, because the land is shaped in one-tile steps and the stream is only a few tiles wide.
- The far scenery beyond the coast is simpler than the coast itself and only meant to be seen through the haze.
- There's nothing to build yet, and no population or money in the top bar; those come with streets and settlers next.
- No sound yet.
- I couldn't measure the frame rate: I can only run the game with software graphics here, which tells us nothing about your laptop. It would help to hear whether it runs smoothly for you, and on what machine.

### Measurements
- Before: nothing existed.
- Download: 153 KB compressed (three files).
- Load: about 2.5 seconds to the first picture on my machine using software graphics, of which shaping the coast takes about a third of a second; on a real graphics card it should be quicker. The target is under 3 seconds.
- Drawing: about 540,000 triangles in 21 batches each frame (after the review's changes), the same in every view. That should sit well within a laptop graphics chip's reach, but the town will need room too, so I've noted ways to trim it before the town grows.
- Frame rate: not measured (see above). The target is 60 frames a second on a mid-range laptop with a few hundred buildings, which can only be judged once the town exists.

### What the review changed
A second pass went through every "What to try" step above in a browser, looked at screenshots from each prepared view and from far out in every direction, and fixed what it found:
- Space now carries on at the speed you had before you paused; it used to always go back to normal speed. Holding Space down no longer flickers between paused and running.
- Keyboard zoom could get stuck: pressing "+" (Shift and "=") and letting go of Shift first left the view zooming in on its own. Fixed. Holding Q or E now turns a quarter at a time, instead of piling up turns that kept spinning after you let go. The 1, 2 and 3 speed keys also work on keyboards where the digits need Shift.
- Scrolling near the ground with the pointer towards the horizon used to throw the view a long way in a single notch; now it only drifts a little that way.
- The river's edge: the water now draws its own smooth edge with a thin line of foam, over a narrow pebbly shelf, instead of the land's triangles cutting a saw-tooth into it. Small white flecks that showed beside the upper river from far away are gone.
- The river mouth: the river now melts into the bay; before, the two waters overlapped in pale squares where they met.
- The far sea had a hard line where its colour jumped and a thin crack running across it, and a faint line ran along the horizon where the sky met the haze. All three are gone.
- The far scenery is rebuilt: the hills beyond the map no longer streak into long stripes or fan out in wedges at the corners, and the coastline wanders into headlands and bays as it runs off to the horizon instead of a ruler-straight edge with a pale wall where land met sea.
- Down at street level, trees further ahead now cast shadows too; before, shadows stopped a short way in front of you.

Whether these read better is for you to judge.
