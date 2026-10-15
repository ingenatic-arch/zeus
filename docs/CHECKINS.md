# Check-ins

Notes to Oliver, newest first.

## Slice 1 — The coast (15 Oct)

The game now opens on a sunny stretch of Greek coast you can fly around, with a clock you can pause and speed up. You weren't here while it was built: every choice below is mine, from the spec's defaults.

### What's new
- A hand-shaped coast in warm low-poly 3D: a curved bay with a small rocky islet, a headland with stone pines to the east, a river that springs from a rocky gorge in the hills and winds down a green, fertile plain to the sea, olive groves planted in loose rows, scrub and yellow broom on the dry golden slopes, cypresses, reeds along the river, and drifts of poppies and daisies.
- Water that moves: gentle waves rolling with the breeze, foam breathing on the beaches, the sun twinkling on the sea, the river flowing with streaks of light and melting into the bay at its mouth.
- Warm afternoon light with soft shadows, a hazy horizon, and the coast and hills carrying on beyond the edge of the land you'll build on.
- A camera you can swing from a view of the whole coast down to standing among the olive trees.
- The calendar: the city's year starts in March 750 BC and counts down, with pause, normal, fast and fastest. At normal speed a month takes about 30 seconds.

### What to try
1. Open `?demo=coast`. Drag with the left mouse button to move across the land, drag with the right button to turn and tilt, scroll to zoom. Press Q and E to turn a quarter at a time, N (or the compass) to face north, and "?" for all the controls.
2. Open `?cam=river` to start at street level on the river bank, looking upstream to the hills. Zoom all the way out from there.
3. Open `?cam=street` to stand among the olive trees west of the bay.
4. Open `?cam=bay` and turn until you face the sun to see the sea glitter.
5. In any view, press Space to pause, then 1, 2 and 3 for normal, fast and fastest, and watch the month and the dots for the days.
6. Also there: `?cam=hills` (where the river rises), `?cam=headland`, `?cam=mouth` (where the river meets the sea) and `?cam=overview` (the whole map from high up).

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
