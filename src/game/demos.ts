/**
 * Prepared scenes for demo links. Each one builds through the sim's command
 * queue (so it is an ordinary, replayable game) and runs the clock on a
 * little so there is something to see.
 */
import { MAP_SIZE } from '../map/coast';
import type { OverlayMode } from '../render/overlay';
import { FARM_COST, GROVE_COST, PRESS_COST, ROAD_COST, STALL_COST, STOREHOUSE_COST, THEATRE_COST } from '../sim/build';
import { COTTAGE, JOBS } from '../sim/buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from '../sim/clock';
import { warningOf, warningsOf } from '../sim/folk';
import { OIL } from '../sim/foods';
import type { Sim } from '../sim/sim';
import { FAIR, HARSH, HEAVY } from '../sim/taxes';
import { WAGE, wageBill } from '../sim/treasury';
import type { Building, SimState } from '../sim/state';
import type { Speed } from './clockDriver';
import type { ToolName } from './tools';

/**
 * How far the food demos have got: a town of cottages; one field ripe for
 * harvest while carts take the others' to the granary; the chain built early
 * in a town of tents, short of hands; carts crossing the bridge. (#chain is
 * the watered town of #water, before any food buildings.)
 */
const FOOD_TICKS = 3600;
const HARVEST_TICKS = 3790;
const WORKERS_TICKS = 420;
const BRIDGE_TICKS = 2200;
/**
 * The people demos: how long after the food town has grown (FOOD_TICKS) the
 * scene opens, its west street having been cut off then (#warning: its homes ran dry over a month ago and have about a month
 * left; #decline: the first of them is a few days from dropping a level),
 * and how far the
 * one-farm town of #missing has got.
 */
const CUT_WARNING = 1250;
const CUT_DECLINE = 1480;
const MISSING_TICKS = 3600;
/**
 * The culture demos share one history: the food town, grown a year
 * (FOOD_TICKS), gets a shrine, a fountain and an agora for the hamlet at the
 * lane's far end, and two more farms once it can pay for them; three months
 * later (or once it can pay for it) a theatre. The scenes open at moments
 * along it, those after the theatre as long after it as planned. #closed
 * clears the theatre and cuts the west street off twenty months after
 * the theatre opened, and opens about three months later, before any home
 * has gone down: the fine houses
 * the actor reached longest ago warn about plays, and the cut-off street
 * about plays, blessings and water at once. (The plays at the two ends of
 * the actor's round run out months apart, so a later moment has some homes
 * gone down and an earlier one fewer signs.)
 */
const SHRINE_AT = FOOD_TICKS;
/** When the culture towns build their hunting lodge and dairy: five months before the shrine (cheese and meat take a while to reach every home). */
const MEAT_AT = SHRINE_AT - 1500;
/**
 * When the culture towns' tax offices go in, with heavy taxes: five months
 * before the lodge and dairy, so the treasury can pay for the oil (olive
 * groves, a press, a storehouse and an oil stall) that comes with them.
 */
const CULTURE_TAXES_AT = MEAT_AT - 1500;
/** And their oil: olive groves, a press, a storehouse and an oil stall, fifty days before the lodge and dairy (a grove's first olives take two months to ripen, and the oil vendor's first rounds a while longer). */
const OIL_AT = MEAT_AT - 500;
const THEATRE_AT = SHRINE_AT + 900;
const SHRINE_TICKS = SHRINE_AT + 450;
const THEATRE_TICKS = THEATRE_AT + 300;
const FINE_TICKS = THEATRE_AT + 1800;
const CLOSE_AT = FINE_TICKS + 2000;
const CLOSED_TICKS = CLOSE_AT + 850;

export interface Demo {
  /** Camera view (a VIEWS name). */
  view: string;
  speed?: Speed;
  /** A tool picked from the start. */
  tool?: ToolName;
  /** The camera follows the first walker of this kind (or waits at her workplace). */
  follow?: 'water' | 'food' | 'cart' | 'porter' | 'priestess' | 'actor' | 'tax' | 'hunter' | 'oil';
  /** Which overlay `-overlay` shows for this demo (water if not given). */
  overlay?: OverlayMode;
  /** Start with that overlay on, even without `-overlay`. */
  overlayOn?: boolean;
  setup?: (sim: Sim) => void;
  /** The household whose panel is open from the start (a building id, 0 for none). */
  open?: (s: SimState) => number;
  /** Open the ledger from the start. */
  ledger?: boolean;
  /** A tile to ring on the ground until a road is laid on it (where #warning's road was cut). */
  mark?: { x: number; z: number };
}

const T = (x: number, z: number): number => z * MAP_SIZE + x;
const row = (x0: number, x1: number, z: number): number[] => Array.from({ length: x1 - x0 + 1 }, (_, i) => T(x0 + i, z));
const col = (x: number, z0: number, z1: number): number[] => Array.from({ length: z1 - z0 + 1 }, (_, i) => T(x, z0 + i));

/**
 * A first little neighbourhood on the plain between the olive grove and the
 * river mouth: a road in from the west edge, two streets off it, plots on
 * both sides. `ticks` sets how far the settling has got.
 */
function neighbourhood(ticks: number): (sim: Sim) => void {
  return (sim) => {
    const at = (t: number, c: Parameters<Sim['enqueue']>[0]): void => {
      if (sim.state.tick < t) sim.run(t - sim.state.tick);
      sim.enqueue(c);
      sim.flush();
    };
    at(0, { type: 'road', tiles: row(0, 36, 80) });
    at(0, { type: 'road', tiles: col(26, 66, 79) });
    at(0, { type: 'road', tiles: row(27, 34, 70) });
    at(0, {
      type: 'plots',
      at: [T(24, 78), T(27, 78), T(22, 78), T(29, 78), T(24, 81), T(27, 81), T(24, 76), T(27, 76), T(31, 78), T(22, 81), T(29, 81)],
    });
    at(Math.round(ticks * 0.45), { type: 'plots', at: [T(24, 74), T(27, 74), T(24, 72), T(27, 72), T(27, 68), T(29, 68), T(31, 81), T(20, 78)] });
    at(Math.round(ticks * 0.75), { type: 'plots', at: [T(31, 71), T(33, 71), T(29, 71), T(24, 70), T(24, 68)] });
    if (sim.state.tick < ticks) sim.run(ticks - sim.state.tick);
  };
}

/**
 * A bigger neighbourhood for the water demos, on the same plain: the road in
 * from the west, a lane running a long way north from the main junction with
 * streets off it, and homes along them, some at the lane's far end, beyond
 * the reach of a fountain by the junction. With `fountain`, one goes in by
 * the junction once the first tents are up. `ticks` sets how far it has got.
 */
function waterTown(ticks: number, fountain: boolean, food?: (at: At) => void, officeAt = ticks - OFFICE_LEAD): (sim: Sim) => void {
  return (sim) => {
    const at: At = (t, c) => {
      if (sim.state.tick < t) sim.run(t - sim.state.tick);
      sim.enqueue(c);
      sim.flush();
    };
    at(0, { type: 'road', tiles: [...row(0, 36, 80), ...col(26, 42, 79), ...row(27, 34, 70), ...row(16, 25, 74)] });
    at(0, {
      type: 'plots',
      at: [
        ...[16, 18, 20, 22, 24, 27, 29, 31, 33].map((x) => T(x, 78)),
        ...[16, 18, 20, 22, 24, 29, 31, 33].map((x) => T(x, 81)),
        ...[16, 18, 20, 22, 24].map((x) => T(x, 72)),
        ...[16, 18, 20].map((x) => T(x, 75)),
        T(24, 76),
        T(27, 76),
        T(27, 74),
        ...[27, 29, 31, 33].map((x) => T(x, 68)),
        // (With food, the agora takes the first two of these.)
        ...(food ? [31, 33] : [27, 29, 31, 33]).map((x) => T(x, 71)),
        // Up the lane: two pairs near the junction, three pairs at its far end.
        ...[66, 64, 46, 44, 42].flatMap((z) => [T(24, z), T(27, z)]),
      ],
    });
    if (fountain) at(300, { type: 'fountain', at: [T(27, 81)] });
    // The tax office goes in after whatever else is built at officeAt (by default a day before the scene opens, so its workers have been shared out by then); until then wages come out of what the town started with.
    let placed = !fountain;
    const office = (): void => {
      placed = true;
      at(officeAt, { type: 'build', kind: 'taxoffice', at: [T(LANE_OFFICE.x, LANE_OFFICE.z)] });
    };
    const then: At = (t, c) => {
      if (!placed && t > officeAt) office();
      at(t, c);
    };
    then.sim = sim;
    food?.(then);
    if (!placed) office();
    if (sim.state.tick < ticks) sim.run(ticks - sim.state.tick);
  };
}

/** Queue a command at tick t (running the clock on to it first); `sim` is the town being built, for a builder that waits for the money. */
type At = ((t: number, c: Parameters<Sim['enqueue']>[0]) => void) & { sim?: Sim };

/** As a player would: wait (from tick t) until the treasury can pay for what goes in next and still pay a month's wages, or till `until` (AFFORD_WAIT at most by default). False if it got there first. */
function waitFor(sim: Sim, t: number, cost: number, until = t + AFFORD_WAIT): boolean {
  if (sim.state.tick < t) sim.run(t - sim.state.tick);
  while (sim.state.money < cost + wageBill(sim.state) && sim.state.tick < until) sim.run(Math.min(30, until - sim.state.tick));
  return sim.state.tick < until;
}

/** How long before a water or food town's scene opens its tax office goes in (a day: workers are shared out once a day, so the office is staffed when it opens). */
const OFFICE_LEAD = 10;
/** Where the water, food and culture towns' tax office stands: beside the lane, between the town and the hamlet at its far end. */
const LANE_OFFICE = { x: 24, z: 60 };
/** The culture towns' second tax office: on the west street, by the junction with the lane. */
const WEST_OFFICE = { x: 22, z: 75 };
/** The culture towns' third: at the end of the east street (the agora's), so the homes there and on the main road's east end are reached too. */
const STREET_OFFICE = { x: 35, z: 71 };

/**
 * The water town given bread: once its huts are going up, a farm road runs
 * east from the lane to the fertile land by the river, with three wheat
 * farms on it and a granary half way, and an agora goes in by the junction
 * of the town's streets. `ticks` sets how far it has got.
 */
function foodTown(ticks: number, start = 400, stagger = 200, more?: { farms?: number; then?: (at: At) => void; officeAt?: number }): (sim: Sim) => void {
  const farms = more?.farms ?? 3;
  return waterTown(ticks, true, (at) => {
    at(start, { type: 'road', tiles: row(27, 50, 63) });
    at(start, { type: 'build', kind: 'farm', at: [T(47, 60)] });
    at(start, { type: 'build', kind: 'granary', at: [T(35, 64)] });
    at(start, { type: 'build', kind: 'agora', at: [T(27, 71)] });
    // The other two farms a little later, so their crops ripen in turn.
    if (farms > 1) at(start + stagger, { type: 'build', kind: 'farm', at: [T(44, 60)] });
    if (farms > 2) at(start + 2 * stagger, { type: 'build', kind: 'farm', at: [T(48, 64)] });
    more?.then?.(at);
  }, more?.officeAt);
}

/**
 * The food town with its west street cut off: once the town has grown, the
 * one tile of road that joins it to the lane is cleared, and the scene opens
 * `after` ticks later. The water carrier and the vendor can no longer walk it. Its homes run dry
 * about three months later (what they had stored lasts that long), warn, and
 * two months after that drop a level each, one at a time, unless the road
 * goes back.
 */
function cutTown(after: number): (sim: Sim) => void {
  return foodTown(FOOD_TICKS + after, 400, 200, { then: (at) => at(FOOD_TICKS, { type: 'clear', x0: CUT.x, z0: CUT.z, x1: CUT.x, z1: CUT.z }) });
}

/** The tile of road cut in #warning and #decline: where the west street met the lane. */
const CUT = { x: 25, z: 74 };

const homes = (s: SimState): Building[] => s.buildings.filter((b) => b.kind === 'home' && b.people > 0 && b.family);

/** The lived-in home nearest a spot. */
function nearest(s: SimState, x: number, z: number, among = homes(s)): number {
  let best = 0;
  let d = Infinity;
  for (const b of among) {
    const e = (b.x + 1 - x) ** 2 + (b.z + 1 - z) ** 2;
    if (e < d) [best, d] = [b.id, e];
  }
  return best;
}

/** The warned home with the most (or least) time left. */
function warned(s: SimState, most: boolean): number {
  let best = 0;
  let k = most ? -1 : Infinity;
  for (const b of homes(s)) {
    const w = warningOf(s, b);
    if (w && (most ? w.left > k : w.left < k)) [best, k] = [b.id, w.left];
  }
  return best;
}

/**
 * The food town's farms across the river instead: the lane carries on north
 * to a road that bridges the river (seven tiles of water and wet bank) to
 * the fertile east bank, with farms either side of it there and the granary
 * on the town's side. The ox carts cross the bridge. A second road runs up
 * past the granary and stops at the bank, for Oliver to bridge.
 */
function bridgeTown(ticks: number): (sim: Sim) => void {
  return waterTown(ticks, true, (at) => {
    at(400, { type: 'road', tiles: [...col(26, 41, 41), ...row(27, 48, 41)] });
    // A second road up past the granary to the bank, ready to be bridged.
    at(400, { type: 'road', tiles: [...col(26, 36, 40), ...row(27, 29, 36)] });
    at(400, { type: 'build', kind: 'farm', at: [T(38, 38), T(41, 42), T(44, 42)] });
    at(400, { type: 'build', kind: 'granary', at: [T(27, 38)] });
    at(400, { type: 'build', kind: 'agora', at: [T(27, 71)] });
  });
}

/** Where the shrine and the theatre go: at the east end of the main road, beside the fountain. */
const SHRINE = { x: 35, z: 78 };
const THEATRE = { x: 35, z: 81 };
/**
 * The water and food towns' hunting lodge and dairy: either side of the lane
 * north of the tax office, the lodge within reach of the deer below the
 * crags and the boar in the west woods, the dairy on the grass west of the
 * lane. (Townhouses need two kinds of food and fine houses three.)
 */
const LANE_LODGE = { x: 27, z: 52 };
const LANE_DAIRY = { x: 23, z: 52 };
/** #overhunt's three lodges up the lane, after the same two herds. */
const OVERHUNT_LODGES = [
  { x: 27, z: 48 },
  { x: 23, z: 48 },
  { x: 23, z: 51 },
];

/**
 * The water and food towns' oil: two olive groves on the dry ground by the
 * lane south of the dairy, an olive press and a storehouse on the farm
 * road's north side, and an oil stall at the agora by the junction.
 * (Townhouses need oil.)
 */
const LANE_GROVES = [
  { x: 27, z: 60 },
  { x: 23, z: 56 },
];
const LANE_PRESS = { x: 30, z: 60 };
const LANE_STORE = { x: 33, z: 60 };
const LANE_AGORA = { x: 27, z: 71 };
function laneOil(at: At, t: number): void {
  at(t, { type: 'build', kind: 'grove', at: LANE_GROVES.map((g) => T(g.x, g.z)) });
  at(t, { type: 'build', kind: 'press', at: [T(LANE_PRESS.x, LANE_PRESS.z)] });
  at(t, { type: 'build', kind: 'storehouse', at: [T(LANE_STORE.x, LANE_STORE.z)] });
  at(t, { type: 'stall', at: T(LANE_AGORA.x, LANE_AGORA.z), good: OIL });
}

/**
 * The food town given the gods and the theatre (see SHRINE_AT). Ten months
 * before the shrine the town's three tax offices go in (by the lane, on the
 * west street and at the east street's end) with heavy taxes, as a player
 * saving up would; five months before it a hunting lodge and a dairy go in by
 * the lane (MEAT_AT), so the cottages have meat and cheese (townhouses need
 * two kinds of food, fine houses three), and with `oil`, fifty days before
 * them, two olive groves, an olive press, a storehouse and an oil stall
 * (laneOil), so the townhouses have oil; without it (#grove) the cottages
 * wait for it. With the shrine a
 * fountain and an agora go in at the lane's far end, so the hamlet there
 * grows to cottages beyond the shrine's and the theatre's reach, and once the
 * treasury can pay for them the farm road runs a little further east, with a
 * farm at its end and another north of it, for the bigger households' bread.
 * The theatre goes in three months after the shrine, or once it can be paid
 * for; taxes go back to fair before the scene opens. `close` clears the
 * theatre and the west street's road later.
 */
function cultureTown(ticks: number, theatre = true, close = false, oil = true, more?: (at: At) => void): (sim: Sim) => void {
  return foodTown(ticks, 400, 200, {
    officeAt: CULTURE_TAXES_AT,
    then: (at) => {
      // Heavy taxes while the oil, the shrine, the hamlet and the theatre are paid for, as a player short of money would; fair again before the scene opens (or once the theatre is up).
      at(CULTURE_TAXES_AT, { type: 'tax', rate: HEAVY });
      // A second tax office on the west street and a third at the east street's end, so the collectors between them reach the whole town.
      at(CULTURE_TAXES_AT, { type: 'build', kind: 'taxoffice', at: [T(WEST_OFFICE.x, WEST_OFFICE.z)] });
      at(CULTURE_TAXES_AT, { type: 'road', tiles: [T(STREET_OFFICE.x, STREET_OFFICE.z - 1)] });
      at(CULTURE_TAXES_AT, { type: 'build', kind: 'taxoffice', at: [T(STREET_OFFICE.x, STREET_OFFICE.z)] });
      // Oil a little before them (see OIL_AT).
      if (oil) laneOil(at, OIL_AT);
      // Meat and cheese a little before the shrine, so the cottages the priestess blesses have the second kind of food a townhouse needs (and fine houses the third).
      at(MEAT_AT, { type: 'build', kind: 'dairy', at: [T(LANE_DAIRY.x, LANE_DAIRY.z)] });
      at(MEAT_AT, { type: 'build', kind: 'lodge', at: [T(LANE_LODGE.x, LANE_LODGE.z)] });
      // Fair again a little before the scene opens; a scene after the theatre opens as long after it as planned, however long the theatre waited for the money.
      const fair = (t: number): void => at(t, { type: 'tax', rate: FAIR });
      if (!theatre) fair(ticks - FAIR_AGAIN);
      at(SHRINE_AT, { type: 'build', kind: 'shrine', at: [T(SHRINE.x, SHRINE.z)] });
      // The hamlet at the lane's far end: its own fountain and a small agora across the lane.
      at(SHRINE_AT, { type: 'fountain', at: [T(24, 48)] });
      at(SHRINE_AT, { type: 'build', kind: 'agora', at: [T(27, 48)] });
      // Two more farms for the bigger households' bread, once the treasury can pay for them and a month's wages.
      // (#shrine opens before they are afforded.)
      if (!at.sim || waitFor(at.sim, SHRINE_AT, 2 * (FARM_COST + JOBS.farm * WAGE), ticks)) {
        at(SHRINE_AT, { type: 'road', tiles: row(51, 53, 63) });
        at(SHRINE_AT, { type: 'build', kind: 'farm', at: [T(41, 60), T(51, 64)] });
      }
      let late = 0;
      if (theatre) {
        if (at.sim) waitFor(at.sim, THEATRE_AT, THEATRE_COST + JOBS.theatre * WAGE);
        late = Math.max(0, (at.sim?.state.tick ?? 0) - THEATRE_AT);
        at(THEATRE_AT, { type: 'build', kind: 'theatre', at: [T(THEATRE.x, THEATRE.z)] });
      }
      const fairAt = Math.max(THEATRE_AT + late, ticks + late - FAIR_AGAIN);
      if (theatre && !(close && fairAt > CLOSE_AT + late)) fair(fairAt);
      if (close) {
        at(CLOSE_AT + late, { type: 'clear', x0: THEATRE.x, z0: THEATRE.z, x1: THEATRE.x, z1: THEATRE.z });
        at(CLOSE_AT + late, { type: 'clear', x0: CUT.x, z0: CUT.z, x1: CUT.x, z1: CUT.z });
        if (fairAt > CLOSE_AT + late) fair(fairAt);
      }
      more?.(at);
      if (at.sim && at.sim.state.tick < ticks + late) at.sim.run(ticks + late - at.sim.state.tick);
    },
  });
}

/**
 * #grow: the food town with a dairy beside the lane three months before it
 * opens, so its cottages have bread and cheese, and placing the shrine lifts
 * them to townhouses.
 */
const GROW_DAIRY = FOOD_TICKS - 1500;
function growTown(ticks: number): (sim: Sim) => void {
  return foodTown(ticks, 400, 200, {
    then: (at) => {
      at(GROW_DAIRY, { type: 'build', kind: 'dairy', at: [T(LANE_DAIRY.x, LANE_DAIRY.z)] });
      // And oil, which a townhouse needs too.
      laneOil(at, GROW_DAIRY);
    },
  });
}

/**
 * #table: the food town gets a shrine (its cottages are blessed but have only
 * bread, so they stay cottages), then a dairy by the lane two months later;
 * the scene opens as its first cheese reaches the stall, a few days before
 * the cottages nearest the agora climb to townhouses.
 */
const TABLE_DAIRY = FOOD_TICKS + 600;
const TABLE_TICKS = FOOD_TICKS + 1270;
/** #table's oil (and the lane's tax office, to help pay for it) goes in four months before the shrine, so it has reached the cottages by the time the cheese does. */
const TABLE_OIL = FOOD_TICKS - 1200;
function tableTown(ticks: number): (sim: Sim) => void {
  return foodTown(ticks, 400, 200, {
    officeAt: TABLE_OIL,
    then: (at) => {
      laneOil(at, TABLE_OIL);
      at(FOOD_TICKS, { type: 'build', kind: 'shrine', at: [T(SHRINE.x, SHRINE.z)] });
      at(TABLE_DAIRY, { type: 'build', kind: 'dairy', at: [T(LANE_DAIRY.x, LANE_DAIRY.z)] });
    },
  });
}
/** The blessed cottage with only bread nearest the agora's north corner: the first to climb once cheese reaches it. */
function aboutToClimb(s: SimState): number {
  const ready = homes(s).filter((b) => b.level === COTTAGE && b.religionUntil > s.tick && b.cheeseUntil <= s.tick);
  return nearest(s, 28, 69, ready.length ? ready : homes(s));
}

/**
 * #overhunt: the food town builds three hunting lodges up the lane at once,
 * all after the deer below the crags and the boar in the west woods. Three
 * months on the herds are down to their last few head and the lodges send
 * fewer hunters; the herds grow back if lodges are cleared.
 */
const OVERHUNT_AT = FOOD_TICKS - 300;
const OVERHUNT_TICKS = FOOD_TICKS + 600;
function overhuntTown(ticks: number): (sim: Sim) => void {
  return foodTown(ticks, 400, 200, { then: (at) => at(OVERHUNT_AT, { type: 'build', kind: 'lodge', at: OVERHUNT_LODGES.map((l) => T(l.x, l.z)) }) });
}

/**
 * #town: a town of a few hundred people a few years in, on the east bank of
 * the river, where Oliver looks first. The way in runs from the west edge up
 * a lane, over the bridge at the river's narrows and along a main street
 * through the wheat on the flood plain to the town: a core of fine houses
 * round a fountain, an agora, the shrine and the theatre; townhouses and
 * cottages along the street east of it, round a second fountain and agora;
 * huts in a hamlet by the lane on the west bank; tents on the newest plots
 * at the hamlet's end. It grows outward the way a player would build it, so
 * every house has earned its level. It opens half a year after the last
 * plots went down, once every walker's round has settled (earlier, the
 * actor's first rounds leave the far corner of the core warned about plays
 * for a while), and its bread holds for well over a year as it fills up.
 */
const TOWN_TICKS = 7200;
/** How long before #town opens its taxes go back to fair (moods settle within a month). */
const FAIR_AGAIN = 600;
/** How long before #town opens the newest plots go down at the hamlet's end (so a few are still tents). */
const NEWEST = 120;
/** The longest #town's builder waits for the money for what goes in next. */
const AFFORD_WAIT = 2400;
/** #town's tax offices: one on the main street at the west end of the core… */
const TOWN_OFFICE = { x: 61, z: 42 };
/** …another at the head of the core's north street… */
const NORTH_OFFICE = { x: 73, z: 31 };
/** …and the east street's, beside its agora. */
const EAST_OFFICE = { x: 100, z: 42 };
/** #town's hunting lodge at the head of the north street (the deer in the north hills are close), and its dairy on the river meadow across the main street from the granary (a dairy at the far end of the core sent its carts too far: its cheese piled up). */
const TOWN_LODGE = { x: 59, z: 32 };
const TOWN_DAIRY = { x: 50, z: 38 };
/**
 * #town's oil: a road up the slope north of the core from the head of its
 * east cross street, an olive grove at the top (the best olive ground on the
 * map) and a second beside it once the fine houses come, the press and the
 * storehouse below them (between the deer of the north hills and of the east
 * hills).
 */
const TOWN_OIL_X = 86;
const TOWN_OIL_ROAD = 23;
const TOWN_GROVES = [
  { x: 83, z: 23 },
  { x: 87, z: 23 },
];
const TOWN_PRESS = { x: 83, z: 27 };
const TOWN_STORE = { x: 87, z: 27 };
const TOWN_OIL_COST = (33 - TOWN_OIL_ROAD) * ROAD_COST + GROVE_COST + PRESS_COST + STOREHOUSE_COST + STALL_COST;
const CORE_W = [63, 65, 67, 69, 71];
const CORE_E = [75, 77, 79, 81, 83];
const along = (xs: number[], z: number): number[] => xs.map((x) => T(x, z));

function town(ticks: number): (sim: Sim) => void {
  return (sim) => {
    const at: At = (t, c) => {
      if (sim.state.tick < t) sim.run(t - sim.state.tick);
      sim.enqueue(c);
      sim.flush();
    };
    // As a player would: wait (from tick t) until the treasury can pay for what goes in next, and still pay a month's wages.
    const afford = (t: number, cost: number): void => {
      waitFor(sim, t, cost);
    };
    // The way in, and the core's cross streets.
    at(0, { type: 'road', tiles: [...row(0, 26, 50), ...col(26, 41, 49).reverse(), ...row(27, 95, 41)] });
    at(0, { type: 'road', tiles: [...col(62, 33, 40), ...col(74, 33, 40), ...col(86, 33, 40), ...row(63, 85, 33)] });
    at(0, {
      type: 'plots',
      at: [...along([63, 65, 71, 77, 79, 81, 83], 39), ...along([63, 69, 71, ...CORE_E], 42)],
    });
    at(0, { type: 'fountain', at: [T(75, 39)] });
    at(150, { type: 'plots', at: [...along([...CORE_W, ...CORE_E], 34), ...along([...CORE_W, ...CORE_E], 31)] });
    at(150, { type: 'build', kind: 'taxoffice', at: [T(NORTH_OFFICE.x, NORTH_OFFICE.z)] });
    // Heavy taxes while the town is being built, as a player short of money would; fair again before it opens.
    at(150, { type: 'tax', rate: HEAVY });
    // Bread: wheat on the flood plain along the main street, a granary and an agora. (Three farms: since slice 9 the
    // townhouses and fine houses share their table with meat and cheese, and seven farms grew about 1,070 measures a
    // month for a town eating about 170; the money goes on oil instead.)
    at(300, { type: 'build', kind: 'farm', at: [T(41, 42), T(44, 42), T(47, 42)] });
    at(300, { type: 'build', kind: 'granary', at: [T(53, 42)] });
    at(300, { type: 'build', kind: 'agora', at: [T(65, 42)] });
    at(300, { type: 'build', kind: 'taxoffice', at: [T(TOWN_OFFICE.x, TOWN_OFFICE.z)] });
    at(2400, { type: 'build', kind: 'shrine', at: [T(68, 39)] });
    // Meat and cheese for the townhouses the shrine will bring, once there is money for them.
    afford(2400, 450);
    at(sim.state.tick, { type: 'build', kind: 'lodge', at: [T(TOWN_LODGE.x, TOWN_LODGE.z)] });
    at(sim.state.tick, { type: 'build', kind: 'dairy', at: [T(TOWN_DAIRY.x, TOWN_DAIRY.z)] });
    // Oil for them too (townhouses need it): a road up the slope north of the core, an olive grove at its top, the press and the storehouse below it, and an oil stall at the agora.
    afford(sim.state.tick, TOWN_OIL_COST);
    at(sim.state.tick, { type: 'road', tiles: col(TOWN_OIL_X, TOWN_OIL_ROAD, 32).reverse() });
    at(sim.state.tick, { type: 'build', kind: 'grove', at: [T(TOWN_GROVES[0].x, TOWN_GROVES[0].z)] });
    at(sim.state.tick, { type: 'build', kind: 'press', at: [T(TOWN_PRESS.x, TOWN_PRESS.z)] });
    at(sim.state.tick, { type: 'build', kind: 'storehouse', at: [T(TOWN_STORE.x, TOWN_STORE.z)] });
    at(sim.state.tick, { type: 'stall', at: T(65, 42), good: OIL });
    // The street east of the core, with its own fountain, agora and tax office.
    afford(3600, 820);
    at(3600, { type: 'road', tiles: row(96, 112, 41) });
    at(3600, { type: 'build', kind: 'taxoffice', at: [T(EAST_OFFICE.x, EAST_OFFICE.z)] });
    at(3600, {
      type: 'plots',
      at: [...along([88, 90, 92, 94, 96, 98, 102, 104, 106, 108, 110], 39), ...along([88, 90, 92, 94, 102, 104, 106, 108, 110], 42)],
    });
    at(3600, { type: 'build', kind: 'agora', at: [T(97, 42)] });
    at(3600, { type: 'fountain', at: [T(100, 39)] });
    // Its agora's oil stall, once there is money for it.
    afford(3600, STALL_COST);
    at(sim.state.tick, { type: 'stall', at: T(97, 42), good: OIL });
    // The theatre, once the treasury has recovered from the new street.
    afford(3900, THEATRE_COST + JOBS.theatre * WAGE);
    at(3900, { type: 'build', kind: 'theatre', at: [T(57, 42)] });
    // The hamlet by the lane on the west bank, then the newest plots at its end.
    afford(4500, 410 + JOBS.fountain * WAGE);
    at(4500, {
      type: 'plots',
      at: [...along([8, 10, 12, 14, 16, 18, 20, 22], 48), ...along([10, 12, 14, 16, 18, 20, 22], 51), ...col(24, 42, 42), T(24, 44), T(24, 46), T(27, 42), T(27, 44), T(27, 48)],
    });
    at(4500, { type: 'fountain', at: [T(27, 46)] });
    at(ticks - NEWEST, { type: 'plots', at: [...along([2, 4, 6], 48), ...along([2, 4, 6, 8], 51)] });
    at(ticks - FAIR_AGAIN, { type: 'tax', rate: FAIR });
    if (sim.state.tick < ticks) sim.run(ticks - sim.state.tick);
  };
}

/**
 * The money demos all start from #town as it opens. #harsh: taxes turned up
 * to harsh, a month and a half on, so moods have soured and a few households
 * have sent someone away (the panel opens on the first that did). #dry: taxes
 * set to none until the treasury runs out, then a few days more, so wages go
 * unpaid at some workplaces (which work at half pace) and the money line says
 * so. #taxes: the east street's tax office cleared as the town opens, so the
 * tax overlay shows the street (and the hamlet on the west bank) that no
 * collector reaches, two months on so the street's last visits have lapsed
 * (the overlay posts homes no collector has called on in two months).
 */
const HARSH_FOR = 450;
const DRY_AFTER = 50;
const DRY_WAIT = 12000;
const TAXES_AFTER = 620;

function harshTown(sim: Sim): void {
  town(TOWN_TICKS)(sim);
  sim.enqueue({ type: 'tax', rate: HARSH });
  sim.flush();
  sim.run(HARSH_FOR);
}

function dryTown(sim: Sim): void {
  town(TOWN_TICKS)(sim);
  sim.enqueue({ type: 'tax', rate: 0 });
  sim.flush();
  const s = sim.state;
  const end = s.tick + DRY_WAIT;
  while (!s.buildings.some((b) => b.owed > 0) && s.tick < end) sim.run(10);
  sim.run(DRY_AFTER);
}

/**
 * #hunter: #town played on until the next hunter steps out of the lodge (about
 * two weeks: at #town's opening its three hunters are already out, one of
 * them on his way home), so the camera goes out with him from the door.
 */
function hunterTown(sim: Sim): void {
  town(TOWN_TICKS)(sim);
  const s = sim.state;
  const out = new Set(s.walkers.filter((w) => w.kind === 'hunter').map((w) => w.id));
  for (let t = 0; t < TICKS_PER_MONTH * 2; t++) {
    sim.step();
    if (s.walkers.some((w) => w.kind === 'hunter' && !out.has(w.id))) return;
  }
}

function taxesTown(sim: Sim): void {
  town(TOWN_TICKS)(sim);
  sim.enqueue({ type: 'clear', x0: EAST_OFFICE.x, z0: EAST_OFFICE.z, x1: EAST_OFFICE.x, z1: EAST_OFFICE.z });
  sim.flush();
  // Two months on, so the street's last visit from its own collector has lapsed.
  sim.run(TAXES_AFTER);
}


/**
 * #nooil: #fine with its olive press and storehouse cleared as it opens,
 * played on until the first fine houses have gone without oil long enough to
 * be a month from going down (the stall's jars and the homes' own last months
 * first). The panel opens on the house closest to going down.
 */
const NOOIL_LEFT = TICKS_PER_MONTH;
const NOOIL_WAIT = 18 * TICKS_PER_MONTH;
function noOilTown(sim: Sim): void {
  cultureTown(FINE_TICKS)(sim);
  for (const p of [LANE_PRESS, LANE_STORE]) sim.enqueue({ type: 'clear', x0: p.x, z0: p.z, x1: p.x, z1: p.z });
  sim.flush();
  const s = sim.state;
  const end = s.tick + NOOIL_WAIT;
  while (s.tick < end && oilLeft(s) > NOOIL_LEFT) sim.run(TICKS_PER_DAY);
}

/** The least time any home has left before it goes down for want of oil (Infinity if none is warned). */
function oilLeft(s: SimState): number {
  let left = Infinity;
  for (const b of homes(s)) for (const w of warningsOf(s, b)) if (w.need === 'oil') left = Math.min(left, w.left);
  return left;
}

/** The home closest to going down for want of oil. */
function nearestOilDrop(s: SimState): number {
  let best = 0;
  let left = Infinity;
  for (const b of homes(s)) for (const w of warningsOf(s, b)) if (w.need === 'oil' && w.left < left) [best, left] = [b.id, w.left];
  return best;
}

/** The household that sent someone away for the taxes most recently, else the unhappiest. */
function drivenOut(s: SimState): number {
  let best = 0;
  let at = -1;
  for (const b of homes(s)) {
    for (const e of b.family!.story) if (e.what === 'left' && e.need === 'tax' && e.tick > at) [best, at] = [b.id, e.tick];
  }
  return best;
}

export const DEMOS: Record<string, Demo> = {
  coast: { view: 'coast' },
  town: { view: 'town', setup: town(TOWN_TICKS), overlay: 'missing' },
  townstreet: { view: 'townstreet', setup: town(TOWN_TICKS), overlay: 'missing' },
  streets: { view: 'streets', setup: neighbourhood(560) },
  settlers: { view: 'settlers', setup: neighbourhood(230) },
  build: { view: 'build', tool: 'road' },
  water: { view: 'water', setup: waterTown(1500, true) },
  carrier: { view: 'carrier', setup: waterTown(1500, true), follow: 'water' },
  fountain: { view: 'fountain', tool: 'fountain', setup: waterTown(700, false) },
  food: { view: 'food', setup: foodTown(FOOD_TICKS), overlay: 'food' },
  vendor: { view: 'vendor', setup: foodTown(FOOD_TICKS), follow: 'food', overlay: 'food' },
  harvest: { view: 'harvest', setup: foodTown(HARVEST_TICKS), follow: 'cart', overlay: 'food' },
  chain: { view: 'chain', tool: 'farm', setup: waterTown(1500, true), overlay: 'food' },
  // #workers' office goes in as it opens, so the jobs it shows short are the farms' and the granary's (the office joins them next morning).
  workers: { view: 'workers', setup: foodTown(WORKERS_TICKS, 120, 0, { officeAt: WORKERS_TICKS }), overlay: 'food' },
  bridge: { view: 'bridge', tool: 'road', setup: bridgeTown(BRIDGE_TICKS), overlay: 'food' },
  people: { view: 'people', setup: foodTown(FOOD_TICKS), overlay: 'missing', open: (s) => nearest(s, 30, 67) },
  warning: { view: 'warning', speed: 'paused', tool: 'road', setup: cutTown(CUT_WARNING), overlay: 'missing', open: (s) => warned(s, true), mark: CUT },
  decline: { view: 'decline', setup: cutTown(CUT_DECLINE), overlay: 'missing', open: (s) => warned(s, false), mark: CUT },
  missing: { view: 'missing', setup: foodTown(MISSING_TICKS, 400, 200, { farms: 1 }), overlay: 'missing', overlayOn: true },
  grow: { view: 'grow', tool: 'shrine', setup: growTown(FOOD_TICKS), overlay: 'religion' },
  shrine: { view: 'shrine', setup: cultureTown(SHRINE_TICKS, false), overlay: 'religion' },
  priestess: { view: 'priestess', setup: cultureTown(SHRINE_TICKS, false), follow: 'priestess', overlay: 'religion' },
  theatre: { view: 'theatre', setup: cultureTown(THEATRE_TICKS), overlay: 'culture' },
  actor: { view: 'actor', setup: cultureTown(THEATRE_TICKS), follow: 'actor', overlay: 'culture' },
  fine: { view: 'fine', setup: cultureTown(FINE_TICKS), overlay: 'missing' },
  compare: { view: 'compare', setup: cultureTown(FINE_TICKS), overlay: 'missing' },
  closed: { view: 'closed', speed: 'paused', setup: cultureTown(CLOSED_TICKS, true, true), overlay: 'missing', open: (s) => warned(s, false), mark: CUT },
  harsh: { view: 'town', setup: harshTown, overlay: 'missing', open: drivenOut },
  dry: { view: 'town', speed: 'paused', setup: dryTown, overlay: 'missing', open: (s) => homes(s).find((b) => b.unpaid > 0)?.id ?? 0 },
  taxes: { view: 'taxes', tool: 'taxoffice', setup: taxesTown, overlay: 'tax' },
  ledger: { view: 'town', setup: town(TOWN_TICKS), overlay: 'missing', ledger: true },
  collector: { view: 'collector', setup: town(TOWN_TICKS), follow: 'tax', overlay: 'tax', overlayOn: true },
  hunter: { view: 'hunter', setup: hunterTown, follow: 'hunter', overlay: 'food' },
  dairy: { view: 'dairy', setup: town(TOWN_TICKS), overlay: 'food' },
  table: { view: 'table', setup: tableTown(TABLE_TICKS), overlay: 'variety', overlayOn: true, open: aboutToClimb },
  overhunt: { view: 'overhunt', tool: 'lodge', setup: overhuntTown(OVERHUNT_TICKS), overlay: 'food' },
  grove: { view: 'grove', tool: 'grove', setup: cultureTown(SHRINE_TICKS, false, false, false), overlay: 'oil' },
  oil: { view: 'oil', setup: town(TOWN_TICKS), overlay: 'oil' },
  storehouse: { view: 'storehouse', setup: town(TOWN_TICKS), overlay: 'oil' },
  oilvendor: { view: 'oilvendor', setup: town(TOWN_TICKS), follow: 'oil', overlay: 'oil', overlayOn: true },
  nooil: { view: 'nooil', speed: 'paused', setup: noOilTown, overlay: 'oil', overlayOn: true, open: nearestOilDrop },
};
