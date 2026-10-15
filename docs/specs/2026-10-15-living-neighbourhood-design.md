# Phase 1: A living neighbourhood

*15 Oct 2026. The first phase, straight from the vision's "What comes first". Serves pillar 1, "The city feels alive", and pillar 2, "Warm, storybook Greece", with a first glimpse of pillar 6, "Gods with feelings".*

## Summary

There is nothing yet. Oliver wants to start where Zeus started: laying out streets and houses and watching walkers bring them what they need. This phase builds a small, handsome Greek neighbourhood on a hand-shaped stretch of coast, where houses climb from tents to fine homes as water, food, a shrine and a theatre reach them, and slowly decline when they don't. Every household can be clicked to see who lives there and how they feel. Nothing outside the city exists yet; the aim is for the core loop and the look to feel right before anything presses on them.

## Oliver's decisions

| Question | Oliver's answer |
|---|---|
| What does the first neighbourhood include? (15 Oct) | Houses, water and food (roads, houses, fountains, one food chain from farm to granary to market, houses that grow, households you can click), plus a first taste of culture and the gods: a small shrine and a theatre so houses can climb higher. |
| What land do you build on? (15 Oct) | One hand-shaped stretch of coast with a bay, hills, a river and olive groves, the same every time, tuned until it's lovely. Generated maps come later with the wider world. |
| What happens when a house's needs aren't met? (15 Oct) | It warns, then declines: the household says what it's missing, and if nothing changes the house slowly drops a level and some of the family moves away. |

## Claude's defaults (Oliver can change any of these)

- **A tile grid underneath, hidden by default.** Buildings snap to square tiles; a faint grid shows only while placing. Rotating the camera turns the view in 90° steps and smooth orbit is allowed between them.
- **Five house levels:** tent → hut → cottage → townhouse → fine house. Water lifts a tent to a hut, food to a cottage, the shrine to a townhouse, the theatre to a fine house. Each level looks distinctly different and holds more people.
- **Zeus-style walkers.** Service walkers leave their building and wander the road network, choosing turns at junctions, up to a set distance, then walk home. Any house beside a road they pass is served for a while. Delivery carts follow shortest paths between buildings. Settlers walk in from the map edge along the road; leavers walk out the same way.
- **Workers come from housing.** Each building needs a few workers; the city's working-age people fill jobs nearest first. Short of workers, buildings work slower, and the building says so.
- **Money is simple.** You start with 5,000 drachmas. Buildings cost money; each household pays a little rent each month, scaled by house level. No tax collectors or wages yet.
- **Time:** one in-game month is about 30 seconds at normal speed. Pause, normal, fast and fastest. A month and year readout, with gentle seasons in the light (not in the simulation yet).
- **The food chain:** wheat farm on fertile river land → carts to the granary → the agora's food stall fetches from the granary → a food vendor walks the streets. One food type for now.
- **The shrine** is a small generic shrine with a priestess walker; which god it belongs to waits for the gods phase. **The theatre** is a small open-air theatre with an actor walker.
- **Overlays** show coverage for water, food, religion and culture, plus a "what's missing" view that tints houses by their biggest unmet need. This is the readable-depth principle in practice.
- **Households:** each has a family name, a few members with names and ages, a mood from content to fed up, what they have and what they lack, and a few lines of chatter in a warm, gently funny voice. Warnings appear on the house (an icon and a line in the panel) for about two months before it declines.
- **Building tools:** road (drag to draw), housing plot, each service building, demolish, and undo for the last few actions.
- **Saving:** an autosave every few months plus a manual save, both in the browser. Old saves that can't load say so plainly.
- **Sound:** soft ambient sea and birds, and simple placement and walker sounds, all generated in code. Music waits for a later phase.
- **Demo links:** every slice adds a link (a URL parameter, such as `?demo=water`) that drops Oliver straight into a prepared city showing the new thing.
- **Where Oliver plays it:** each slice's build is published as a private claude.ai page, so a link opens the game in the browser with nothing to install.

## What's there today

Nothing: no code and no repository yet. The vision and working agreement exist in `/mnt/project-files/zeus/`.

## What Oliver will experience

**The coast.** The game opens on a sunny stretch of Greek coast: a curved bay, a river running down from rocky hills, olive groves and scrub on the slopes, fertile green along the river banks. Oliver can orbit, pan and zoom, from a bird's-eye view down to street level. Water glints and moves; the light is warm.

**Laying out streets.** He drags roads across the land, and they follow the ground. He marks out housing plots beside them. Within moments, small groups of settlers walk in along the road from the edge of the map, carrying bundles, and pitch tents on the plots.

**Bringing water.** He places a fountain. A water carrier sets off down the road, turning at junctions. Tents she passes become huts. The water overlay shows which streets she reached, and why the house at the end of a long lane missed out.

**Feeding people.** He places a wheat farm on the river land, a granary and an agora. Carts carry sheaves from the farm to the granary; the agora's food stall fetches from it, and a vendor walks the streets with a basket. Fed huts become cottages. If he's short of workers, the farm says so, and building more housing fixes it.

**Getting to know people.** Clicking a house opens a small panel: the family's name, who lives there, how they feel, what they have and what they lack, and a line or two of chatter. Neglect a street and its houses warn first; ignore the warning and a house slips back a level, and a couple of people walk out of town.

**Shrine and theatre.** A shrine sends a priestess walking; a theatre sends an actor. Houses with both climb to townhouses and fine houses, which look noticeably grander. By the end, the neighbourhood is a lively little town of a few hundred people that rewards a good street layout.

## Technical design

- **Stack:** TypeScript, Vite and three.js, as the working agreement sets out.
- **Simulation (`src/sim/`):** a deterministic, fixed-tick model (seeded random numbers, no wall clock) holding the tile map, terrain, buildings, households, walkers, carts, stock and treasury. The renderer only reads it. Commands from the player (place, demolish, undo) go through one queue so they replay identically.
- **Map (`src/map/`):** the coast is authored as data (a heightmap, a fertility map, water and river masks, a tree scatter) and turned into a low-poly mesh at load.
- **Movement:** roads form a graph. Carts use shortest paths; service walkers do bounded wandering with a rule for choosing turns, close to the original's feel.
- **Rendering (`src/render/`):** instanced low-poly meshes for houses, trees and walkers, so a few hundred of each stays smooth. Buildings are built from simple shapes with a shared warm palette. Five visibly different house models.
- **Interface (`src/ui/`):** a build bar, top bar (population, drachmas, date, speed), overlay buttons and the household panel, in a warm storybook style.
- **Saves:** the simulation state serialised with a version number.
- **Targets that can be tuned by eye:** walker speed and range, how long a house keeps a service after a walker passes, how long warnings last before decline, settler arrival rate, starting money and costs.

## Testing

Only where it earns its keep:
- determinism: the same seed and commands give the same city after N ticks;
- save and load round-trip to the same state;
- walker routing and cart paths on small hand-made road layouts;
- the frame-rate budget, checked against a prepared city of a few hundred buildings and walkers.

## Build slices

Slices are numbered across the whole project.

### Slice 1 — The coast
- The project skeleton, the deterministic simulation clock with pause and speed controls, and the publishing step that gives Oliver a link.
- The hand-shaped coast in low-poly 3D: bay, river, hills, olive groves and fertile land, with moving water and warm light.
- Orbit, pan and zoom camera, from bird's-eye to street level.

*Oliver can:* open the link, fly around the coast, zoom down to the river bank, and pause or speed up the clock.

### Slice 2 — Streets and settlers
- Road drawing that follows the terrain, housing plots, demolish and undo, with rules against building on water or steep rock.
- Settlers walk in from the map edge along the road and pitch tents; the top bar shows population and drachmas, and building costs money.

*Oliver can:* lay out his first streets, mark plots, and watch families walk in and set up tents.

### Slice 3 — Water
- Fountains, the water carrier and the wandering-walker rules.
- Tents with water become huts. The water overlay, and a hover tip on any house saying what reaches it.

*Oliver can:* place a fountain, follow the water carrier, see tents become huts, and use the overlay to find the street she missed.

### Slice 4 — Bread on the table
- Wheat farm, granary and agora with a food stall; carts, the food vendor and stock levels.
- Workers drawn from housing, with buildings that slow down when short-handed. Huts with food become cottages; rent starts flowing.

*Oliver can:* build the full food chain, watch carts and the vendor at work, and see what happens when there aren't enough workers.

### Slice 5 — The people who live there
- The household panel: family, members, mood, haves and lacks, and chatter.
- Warnings on houses, then gradual decline and people leaving; the "what's missing" overlay.

*Oliver can:* click into any home, cut off a street's water to see the warning and the decline, and fix it before the family leaves.

### Slice 6 — Shrine and theatre
- A small shrine with a priestess walker, and a theatre with an actor walker.
- Townhouses and fine houses, the religion and culture overlays.

*Oliver can:* grow a street all the way to fine houses, and compare a well-served district with a neglected one.

### Slice 7 — A town worth keeping
- Autosave and manual save; the ambient soundscape and placement sounds.
- A look-and-feel pass over the whole town: walker animation, building details, lighting and the interface, tuned by looking.
- A prepared demo town of a few hundred people for checking the frame-rate budget.

*Oliver can:* build a town, close the tab, come back to it, and judge how the whole neighbourhood looks and sounds.

## Recorded for later

- Which god the shrine belongs to, and the gods reacting to worship (the gods phase).
- More foods and goods, storehouses, and the living market.
- Taxes, wages and tax collectors.
- Fire, collapse and crime, the original's hazards.
- Generated maps, once the wider world exists.
- Music.

## Out of scope for this phase

- Anything beyond the city: rival cities, trade, diplomacy, armies, fleets and gods as characters.
- Ambitions and monuments.
- Seasons that affect farming.
