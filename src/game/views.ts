import type { CameraView } from '../render/cameraRig';

/** Prepared camera framings, reachable as ?cam=<name>. */
export const VIEWS: Record<string, CameraView> = {
  // The opening view: the bay in front, the river valley and hills behind.
  coast: { x: 62, z: 62, yaw: 0.12, dist: 100, tilt: -0.66 },
  // #town: the town on the east bank from the hills behind it, looking down over the fine-house core to the sea, the river, the bridge and the farms.
  town: { x: 69, z: 39.5, yaw: 2.65, dist: 36, tilt: -0.08 },
  // #town's east street, where the fire and creak demos open: the fine houses, the agora and the tax office at the end of the street.
  east: { x: 93, z: 40.5, yaw: 2.65, dist: 26, tilt: -0.06 },
  // Street level in #town's core, by the fountain among the fine houses.
  townstreet: { x: 72, z: 40.5, yaw: 0.6, dist: 9, tilt: 0.03 },
  // #richtown: the richer town from over the bay, the ship coming in to the quay below, the road up past the vineyards to the villas on the slope.
  richtown: { x: 72, z: 63, yaw: -0.3, dist: 48, tilt: -0.25 },
  // #richstreet: at street level among the villas of the core.
  richstreet: { x: 70, z: 33.5, yaw: -1.2, dist: 10, tilt: 0.04 },
  // Close over #town's tax office on the main street (the camera then follows the collector).
  collector: { x: 62, z: 43, yaw: 0.9, dist: 11, tilt: 0.3 },
  // #town's east street, which no tax collector reaches in #taxes, from above the core.
  taxes: { x: 99, z: 42, yaw: 0.6, dist: 26, tilt: 0.1 },
  overview: { x: 64, z: 62, yaw: 0, dist: 170, tilt: 0.2 },
  // Street level on the fertile river bank, looking upstream to the hills.
  river: { x: 52, z: 59, yaw: 0.95, dist: 8, tilt: 0.02 },
  // Over the bay and its islet from the east shore, looking out towards the afternoon sun.
  bay: { x: 74, z: 86, yaw: 2.6, dist: 42, tilt: -0.02 },
  // The trade demos: the bay's north-east shore below #town, where the road comes down to the trading post.
  quay: { x: 74, z: 72, yaw: 2.65, dist: 24, tilt: -0.05 },
  // Out over the bay from the shore above the post, to the horizon where her sail shows.
  sail: { x: 70, z: 92, yaw: 3.1, dist: 30, tilt: -0.5 },
  // The ship tied up at the jetty.
  ship: { x: 74, z: 76, yaw: 2.3, dist: 16, tilt: -0.02 },
  // #threat, #raid and #aftermath: the farms by the west edge of the land, where Sparta's raiders come in.
  raidwest: { x: 44, z: 43, yaw: 2.65, dist: 24, tilt: -0.05 },
  // #raiders: close over the farm they are firing (slice 24: the granary they are plundering, the tax office beyond).
  raidfarm: { x: 54, z: 44, yaw: 2.65, dist: 15, tilt: 0.05 },
  // #caravan: the road in from the north edge, where Corinth's caravans come down to the main street (the camera then follows the caravan).
  caravan: { x: 86.5, z: 9, yaw: 0.4, dist: 9, tilt: 0.12 },
  // #rivals: the whole trading town from over the plain, below the notes under the top bar: the main street with the caravan yard at its east end, the road down to the quay and the ship, the lane in from the west.
  rivals: { x: 88, z: 42, yaw: 0.1, dist: 85, tilt: -0.55 },
  // #rivalstreet: down the main street from beside the caravan yard, where the caravans from Corinth, Athens and Sparta wait at the gate.
  // (Slice 22's review: from a little further round, so the watch post no longer hides the caravan at the gate.)
  rivalstreet: { x: 109, z: 41.5, yaw: 1.45, dist: 15, tilt: 0.02 },
  // #buywine: the caravan yard at the east end of #town's main street.
  yard: { x: 113.5, z: 42.5, yaw: 2.65, dist: 11, tilt: -0.02 },
  // #anchor: the bay off the jetty, a foreign ship at anchor waiting while the Tyre ship loads.
  anchor: { x: 72, z: 80, yaw: 2.6, dist: 30, tilt: -0.1 },
  // The rocky hills where the river rises.
  hills: { x: 26, z: 24, yaw: 0.7, dist: 34, tilt: 0 },
  // Down among the olive trees west of the bay.
  street: { x: 21, z: 70, yaw: 0.3, dist: 6, tilt: 0.05 },
  // Where the river meets the sea.
  mouth: { x: 64, z: 72, yaw: 0.5, dist: 16, tilt: 0 },
  // The headland and its pines.
  headland: { x: 110, z: 100, yaw: -0.9, dist: 30, tilt: 0 },
  // The first neighbourhood (slice 2's demo), from the south-east.
  streets: { x: 26, z: 75, yaw: 0.55, dist: 30, tilt: -0.1 },
  // Street level on the road in from the west, settlers walking towards the camera.
  settlers: { x: 6, z: 80.5, yaw: 1.2, dist: 7, tilt: 0.04 },
  // The water demo: the main junction and its fountain from the south-east, the long lane running north behind.
  water: { x: 25, z: 74, yaw: 0.55, dist: 40, tilt: -0.12 },
  // Street level by the fountain (the camera then follows the water carrier).
  carrier: { x: 27, z: 79, yaw: 0.9, dist: 8, tilt: 0.03 },
  // Over the town of tents, ready to place a fountain.
  fountain: { x: 25, z: 74, yaw: 0.35, dist: 34, tilt: -0.18 },
  // The food town: the agora by the junction, cottages round it, the farm road running off to the fields.
  food: { x: 29, z: 68, yaw: 0.75, dist: 26, tilt: -0.1 },
  // Street level by the agora (the camera then follows the food vendor).
  vendor: { x: 28, z: 70, yaw: 0.9, dist: 8, tilt: 0.03 },
  // Low over the wheat farms by the river, the farm road and the granary beyond.
  harvest: { x: 46, z: 63, yaw: -0.6, dist: 14, tilt: -0.02 },
  // The watered town and the green land by the river beyond it, ready to build the chain.
  chain: { x: 36, z: 66, yaw: 0.35, dist: 42, tilt: -0.25 },
  // The farms, granary and agora just built in a town of tents, short of workers.
  workers: { x: 38, z: 66, yaw: 0.45, dist: 30, tilt: -0.15 },
  // The timber bridge over the river, the farms on the far bank, and the second road stopping at the bank.
  bridge: { x: 33, z: 39.5, yaw: -0.35, dist: 17, tilt: -0.08 },
  // Close by the agora, among the cottages, a household's panel open.
  people: { x: 30, z: 67, yaw: 0.85, dist: 12, tilt: -0.04 },
  // The west street, cut off from the lane where its road joined it (the ringed tile, centre right), its homes warning.
  warning: { x: 21.5, z: 74, yaw: 0.6, dist: 16, tilt: -0.12 },
  // Low along the cut-off street as its first homes drop a level and people walk out.
  decline: { x: 19, z: 75, yaw: 0.9, dist: 11, tilt: -0.03 },
  // The town short of bread, from above, the missing overlay on.
  missing: { x: 27, z: 70, yaw: 0.45, dist: 40, tilt: -0.2 },
  // The grown food town of cottages, ready to place a shrine.
  grow: { x: 30, z: 74, yaw: 0.6, dist: 32, tilt: -0.15 },
  // The shrine by the agora's street and the first townhouses round it.
  shrine: { x: 35, z: 77.5, yaw: 0.75, dist: 13, tilt: -0.04 },
  // Close over the shrine (the camera then follows the priestess), high enough to see her over the two-storey houses.
  priestess: { x: 34, z: 77, yaw: 0.9, dist: 11, tilt: 0.3 },
  // The theatre beside the shrine, from the town side, looking over the seats to the sea.
  theatre: { x: 36.5, z: 82.5, yaw: 3.9, dist: 12, tilt: 0.45 },
  // Close over the theatre (the camera then follows the actor), high enough to see him over the houses.
  actor: { x: 34, z: 80, yaw: 0.9, dist: 11, tilt: 0.3 },
  // The fine-house district from above, the missing overlay on.
  fine: { x: 27, z: 73, yaw: 0.6, dist: 30, tilt: -0.14 },
  // Both districts from the east: the fine houses by the shrine and theatre on the left, the hamlet of cottages up the lane on the right.
  compare: { x: 26, z: 61, yaw: 1.4, dist: 30, tilt: -0.12 },
  // The town after its theatre was cleared and the west street cut off, its homes warning.
  closed: { x: 24, z: 75, yaw: 0.6, dist: 26, tilt: -0.14 },
  // Close over #town's hunting lodge on the north road (the camera then follows a hunter out to the deer in the north hills).
  hunter: { x: 60.5, z: 31, yaw: 2.4, dist: 12, tilt: 0.2 },
  // Over #town’s dairy from the meadow side (a tree hides the pen from the road), its goats in the pen and the cheeses on the bench.
  dairy: { x: 51.5, z: 39.5, yaw: 5.3, dist: 7, tilt: 0.25 },
  // The townhouses round the shrine, the food variety overlay on: what is on each table.
  table: { x: 30, z: 73, yaw: 0.6, dist: 28, tilt: -0.14 },
  // The three lodges up the lane and the deer below the crags they hunt.
  overhunt: { x: 21, z: 47, yaw: 0.9, dist: 24, tilt: -0.1 },
  // The dry slope by the lane, west of the farm road, ready for an olive grove; the blessed cottages beyond.
  grove: { x: 26, z: 60, yaw: 0.9, dist: 22, tilt: -0.05 },
  // #town's olive groves and press on the slope north of the core, carts on the road down.
  oil: { x: 86, z: 26, yaw: 2.6, dist: 16, tilt: 0.15 },
  // Close over #town's storehouse, its jars in the yard.
  storehouse: { x: 88.5, z: 28.5, yaw: 2.3, dist: 8, tilt: 0.25 },
  // Street level by #town's agora (the camera then follows the oil vendor).
  oilvendor: { x: 66.5, z: 41, yaw: 0.9, dist: 11, tilt: 0.3 },
  // The fine-house district after its press and storehouse were cleared, the oil overlay on.
  nooil: { x: 27, z: 70, yaw: 0.6, dist: 30, tilt: -0.14 },
  // Over the culture town's sheep pasture by the lane, the flock grazing round the fold.
  pasture: { x: 28.5, z: 57.5, yaw: 0.9, dist: 12, tilt: 0.15 },
  // Street level by the culture town's agora (the camera then follows the fleece vendor).
  fleecevendor: { x: 28.5, z: 72.5, yaw: 0.9, dist: 11, tilt: 0.3 },
  // The sunny slope by the main road west of the fine-house town, ready for a vineyard.
  vineyard: { x: 9, z: 78, yaw: 0.6, dist: 22, tilt: -0.05 },
  // Street level among the villas by the agora, the fine houses the wine vendor hasn't reached beyond.
  villas: { x: 27, z: 74, yaw: 0.6, dist: 14, tilt: -0.04 },
  // Over the vineyards and the winery west of the town (the camera then follows a cart).
  winery: { x: 10, z: 79.5, yaw: 0.9, dist: 14, tilt: 0.1 },
  // Street level by the agora (the camera then follows the wine vendor).
  winevendor: { x: 28.5, z: 72.5, yaw: 0.9, dist: 11, tilt: 0.3 },
  // Open land near the west edge, ready to build.
  build: { x: 18, z: 80, yaw: 0.2, dist: 44, tilt: -0.2 },
  // #bronze: the east hills from above the top of the oil road, the copper outcrop (green-streaked with the mine tool in hand), the mine on it and the road down past the armoury to the storehouse.
  bronze: { x: 106.5, z: 10, yaw: 0.3, dist: 24, tilt: -0.1 },
  // #barracks: over the barracks beside the armoury below the oil storehouse, the men walking in from the villas.
  barracks: { x: 89, z: 34, yaw: 0.6, dist: 18, tilt: 0.1 },
  // #companies: the barracks and the core's streets round it, both companies' banners in sight.
  companies: { x: 86, z: 35, yaw: 0.6, dist: 26, tilt: 0.0 },
  // #battle: the west of the town from above the granary, where Sparta's band comes in along the lane from the west edge.
  battle: { x: 50, z: 41, yaw: 2.65, dist: 34, tilt: -0.1 },
  // #looted: the granary and the tax office west of the core, the band leaving westwards past what it set alight.
  looted: { x: 52, z: 42, yaw: 2.65, dist: 22, tilt: -0.02 },
  // #walls: the old town east of the river from above its west side, the bridge and the open land to wall in, from the river's bend left of the bridge to the foot of the hills on the right (slice 25's review: the hills' end was off the screen).
  walls: { x: 46, z: 30, yaw: 2.65, dist: 55, tilt: -0.12 },
  // #siege: the west gate just past the bridge from outside it, its two towers, the band at it.
  siege: { x: 40.5, z: 41.5, yaw: -0.7, dist: 11, tilt: 0.1 },
  // #landing: out over the bay where Troy's ships come in, looking west along the shore they make for, the trading post's jetty on the right (slice 29: from above the town the ships were far out and small).
  landing: { x: 80, z: 98, yaw: 1.4, dist: 45, tilt: -0.1 },
  // #fortress: the west gate from inside the walls, its two towers and the second barracks' drill ground below, the bridge and the road west beyond, where Sparta's band will come.
  fortress: { x: 33, z: 41, yaw: 1.4, dist: 30, tilt: 0.0 },
  // #triremes: the shipyard by the river mouth and its jetty, the bay beyond.
  triremes: { x: 70, z: 78, yaw: 3.0, dist: 34, tilt: -0.3 },
  // Slice 30, #thieves and #nowatch: the hut street on the slope behind the core's villas, from above the core looking up the slope.
  thieves: { x: 73, z: 28, yaw: -0.2, dist: 22, tilt: 0.05 },
  // Slice 33, #seasons: the farms on the flood plain and the granary from the hills to the north-east, the core beyond.
  seasons: { x: 52, z: 43, yaw: 2.3, dist: 38, tilt: -0.05 },
  // Slice 33, #winter: the bay and the quay from over the water, the town on the slope behind.
  winter: { x: 72, z: 63, yaw: -0.3, dist: 48, tilt: -0.25 },
};
