# Plan: the original Zeus look, and people at work (side slice, unnumbered)

Oliver's ask (24 Oct): bring the art closer to the original Zeus: Master of Olympus, and give every building visible workers doing things, animated, the way the original's cities came alive. From the mock-ups (`/mnt/project-files/zeus-original-look/`) he picked **3, Pixel-crisp** (the classic view, the classic colours, drawn with hard pixels) **plus the busy workers**, and chose to have it built now on its own branch and tried before it goes into the published game (25 Oct).

This is render-only: no sim state changes, no save version bump, determinism untouched. Branch `claude/project-thread-f29vjq`.

## Oliver's decisions

| Question | Answer |
|---|---|
| Which look? (25 Oct) | 3, Pixel-crisp: the original's fixed view, its colours, hard pixels. |
| Busy workers? (25 Oct) | Yes, with the look. |
| Build now or later? (25 Oct) | Now, on its own branch; he plays it before it is merged and published. |

## The agent's defaults (Oliver can change any)

- **The camera.** A fixed view 30° above the ground (the original's 2:1 diamond), always on a diagonal, through a long lens so it is nearly flat. Q and E turn it a quarter at a time (as now), and so does a right-drag that goes far enough sideways; R and F (tilt) do nothing. The wheel still zooms, smoothly, from close enough to watch one worker to the whole coast. There is no low street-level view any more. N turns back to the first diagonal.
- **The pixels.** The city is drawn at half the screen's resolution and shown with hard pixel edges, so a game pixel is two screen pixels on a normal screen (four on a high-density one). The panels and text stay sharp. The map of Greece gets the same pixels but keeps its own camera.
- **The colours.** The mock-up's: greener, cleaner grass, whiter walls, orange tiles, grey stone roads, a bluer sea, a clean high sun from the left with no haze and no vignette, a little sharpening and a gentle limit on the number of shades.
- **The old looks stay.** Add `-modern` to any link for the sunlit terracotta look and free camera of 24 Oct, and `-plain` (as before) for the original low-poly look.
- **Who works where.** Every work and service building shows its people at work, drawn from how well it is staffed (one to four, none when nobody works there), like the copper miners already are. Homes are left alone (there are hundreds, and their people already walk the streets). The quarry, loggers, mine, builders and games keep the people they already have.
- **How they move.** Each job has its own figure and tool and two to four poses taken in turn, timed by the game's clock, so they stop when the game is paused and speed up with it. People who walk (porters, the mill, the shepherd) walk a short beat in the yard.

## What the jobs are

| Building | People at work |
|---|---|
| Farm | reapers with sickles along the field, a thresher with a flail on the threshing floor, a woman carrying sheaves |
| Granary | porters with sacks on their shoulders between the gate and the door, a scribe with a tablet |
| Agora | (its vendors are already there) |
| Shrine | a priestess at the altar, raising her arms |
| Theatre | two actors rehearsing on the stage |
| Tax office | a clerk counting coin at a table |
| Fountain | a woman filling her jar at the basin |
| Hunting lodge | a hunter scraping a hide on its frame, one at the fire |
| Dairy | a milker at the goats, a cheesemaker at the trough |
| Olive grove | beaters knocking olives down with poles, a woman with a basket |
| Olive press | two men at the press beam, one walking the crushing mill |
| Storehouse | porters with barrows and amphorae |
| Pasture | a shepherd with his crook, walking the fold |
| Vineyard | pickers bent to the vines, a carrier with a basket of grapes on her head |
| Winery | treaders in the vat, one filling amphorae |
| Watch post | a watchman with his spear, looking about |
| Architect | an architect at a drawing table |
| Trading post | a merchant at his scales |
| Caravan yard | a drover with the donkeys' fodder |
| Armoury | a smith at the anvil, one quenching at the trough |
| Shipyard | shipwrights with mallets at the hull, a sawyer |
| Masons' yard | stonecutters with chisels at the blocks |
| Horse farm | a groom brushing a horse, one leading |

## Stages

1. **The camera and the look**: the classic view, colours and pixels as the game's own; picking, dragging, the hover tips and the shadows right under the new view; `-modern`.
2. **The workers**: the jobs above, placed by looking at each building close up and tuned by eye.
3. **Looked at and tuned**: screenshots of every demo view, a short animation of the works, the frame cost compared with the 24 Oct look, a reviewer's pass.
4. **Try-out page**: published as its own page (not the game's usual link) for Oliver to play; merged and published to the usual link only after he says yes.

## Tests

No new tests: this is visual and judged by looking. The existing determinism, save and routing tests must still pass, and the sim's results with and without the new look must be the same.

## As built

- **The look is the game's own** (`src/render/classic.ts`, on unless the link has `-modern` or `-plain`). The camera (`cameraRig.ts`) is a 6° lens 30° above the ground, standing about 7.3 times further back than the distance it frames, so `dist` still means how much ground is in view; its yaw snaps to the diagonals, Q, E and a right-drag past about 20° turn a quarter, tilt does nothing. `EYE.back` tells what sizes or thins things by distance (hazard smoke, signs, rain) how far back the camera really stands. The city is drawn at half resolution (`setPixelRatio(0.5)`, canvas `image-rendering: pixelated`); the grade pass has a light sharpen (0.15) and 40 levels of posterising; the classic palette, a sun from the left-front at 55°, no haze (fog 4,000 to 9,000) and no vignette or grain. The controls card says "Turn the view a quarter (drag sideways)" and drops the tilt row.
- **People at work** (`src/render/jobfolk.ts`): 22 kinds of building (the table above; the agora is left to its vendors). Each job has its own figure built from the folk's parts with its tool (sickle, flail, pole, mallet, chisel, saw, hammer, scraper, paddle, lever, crook, spear, tablet, scales, mask) and two or three poses, taken in turn on the game's tick, so they stop when paused and speed up with the game. Porters and carriers walk to and fro with a pause at each end, the shepherd walks round the fold. How many are drawn follows the building's staffing (`rateOf`), one to four. The spots are in each building's own frame (`Works.floorOf`, `Monuments.frameOf`, and the homes' mirrored frame for the two-by-two buildings), placed by looking at each building close up; treaders stand in the vat on its own ground. All of them go into the folk's merged meshes, so they add no draw calls.
- The mock-ups' lab code (`classicLab.ts`, `Workfolk.busy`) is gone.
- **Not done:** the map of Greece keeps its own camera and look. The theatre's actors are on the stage, so from the two diagonals that look at the back of the stage building they are hidden (turn the view to see them).
