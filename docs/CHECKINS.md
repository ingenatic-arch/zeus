# Check-ins

Notes to Oliver, newest first.

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
