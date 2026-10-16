/**
 * Prepared scenes for demo links. Each one builds through the sim's command
 * queue (so it is an ordinary, replayable game) and runs the clock on a
 * little so there is something to see.
 */
import { MAP_SIZE } from '../map/coast';
import type { OverlayMode } from '../render/overlay';
import { warningOf } from '../sim/folk';
import type { Sim } from '../sim/sim';
import { FAIR, HARSH, HEAVY } from '../sim/taxes';
import { wageBill } from '../sim/treasury';
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
 * (FOOD_TICKS), gets a shrine, two more farms and a fountain and an agora for
 * the hamlet at the lane's far end; three months later a theatre. The scenes
 * open at moments along it. #closed clears the theatre and cuts the west
 * street off almost ten months after the theatre opened, and opens about
 * two and a half months later, before any home has gone down: the fine houses
 * the actor reached longest ago warn about plays, and the cut-off street
 * about plays, blessings and water at once. (The plays at the two ends of
 * the actor's round run out months apart, so a later moment has some homes
 * gone down and an earlier one fewer signs.)
 */
const SHRINE_AT = FOOD_TICKS;
const THEATRE_AT = SHRINE_AT + 900;
const SHRINE_TICKS = SHRINE_AT + 450;
const THEATRE_TICKS = THEATRE_AT + 300;
const FINE_TICKS = THEATRE_AT + 1800;
const CLOSE_AT = FINE_TICKS + 1100;
const CLOSED_TICKS = CLOSE_AT + 740;

export interface Demo {
  /** Camera view (a VIEWS name). */
  view: string;
  speed?: Speed;
  /** A tool picked from the start. */
  tool?: ToolName;
  /** The camera follows the first walker of this kind (or waits at her workplace). */
  follow?: 'water' | 'food' | 'cart' | 'porter' | 'priestess' | 'actor' | 'tax';
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
function waterTown(ticks: number, fountain: boolean, food?: (at: At) => void, officeAt = ticks): (sim: Sim) => void {
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
    // The tax office goes in after whatever else is built at officeAt (by default when the scene opens); until then wages come out of what the town started with.
    let placed = !fountain;
    const office = (): void => {
      placed = true;
      at(officeAt, { type: 'build', kind: 'taxoffice', at: [T(LANE_OFFICE.x, LANE_OFFICE.z)] });
    };
    food?.((t, c) => {
      if (!placed && t > officeAt) office();
      at(t, c);
    });
    if (!placed) office();
    if (sim.state.tick < ticks) sim.run(ticks - sim.state.tick);
  };
}

type At = (t: number, c: Parameters<Sim['enqueue']>[0]) => void;

/** Where the water, food and culture towns' tax office stands: beside the lane, between the town and the hamlet at its far end. */
const LANE_OFFICE = { x: 24, z: 60 };
/** The culture towns' second tax office: on the west street, by the junction with the lane. */
const WEST_OFFICE = { x: 22, z: 75 };

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
 * The food town given the gods and the theatre (see SHRINE_AT): the farm road
 * runs a little further east, with a farm at its end and another north of it,
 * so the bigger households have bread; a fountain and an agora go in at the
 * lane's far end, so the hamlet there grows to cottages, beyond the shrine's
 * and the theatre's reach. `close` clears the theatre and the west street's
 * road then.
 */
function cultureTown(ticks: number, theatre = true, close = false): (sim: Sim) => void {
  return foodTown(ticks, 400, 200, {
    // The tax offices go in with the shrine: the theatre and the bigger households' wages need taxes.
    officeAt: SHRINE_AT,
    then: (at) => {
      at(SHRINE_AT, { type: 'road', tiles: row(51, 53, 63) });
      at(SHRINE_AT, { type: 'build', kind: 'farm', at: [T(41, 60), T(51, 64)] });
      // The hamlet at the lane's far end: its own fountain and a small agora across the lane.
      at(SHRINE_AT, { type: 'fountain', at: [T(24, 48)] });
      at(SHRINE_AT, { type: 'build', kind: 'agora', at: [T(27, 48)] });
      at(SHRINE_AT, { type: 'build', kind: 'shrine', at: [T(SHRINE.x, SHRINE.z)] });
      // A second tax office on the west street, so the collectors between them reach most of the town.
      at(SHRINE_AT, { type: 'build', kind: 'taxoffice', at: [T(WEST_OFFICE.x, WEST_OFFICE.z)] });
      if (theatre) at(THEATRE_AT, { type: 'build', kind: 'theatre', at: [T(THEATRE.x, THEATRE.z)] });
      if (close) {
        at(CLOSE_AT, { type: 'clear', x0: THEATRE.x, z0: THEATRE.z, x1: THEATRE.x, z1: THEATRE.z });
        at(CLOSE_AT, { type: 'clear', x0: CUT.x, z0: CUT.z, x1: CUT.x, z1: CUT.z });
      }
    },
  });
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
/** The longest #town's builder waits for the money for what goes in next. */
const AFFORD_WAIT = 2400;
/** #town's tax offices: one on the main street at the west end of the core… */
const TOWN_OFFICE = { x: 61, z: 42 };
/** …another at the head of the core's north street… */
const NORTH_OFFICE = { x: 73, z: 31 };
/** …and the east street's, beside its agora. */
const EAST_OFFICE = { x: 100, z: 42 };
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
      if (sim.state.tick < t) sim.run(t - sim.state.tick);
      while (sim.state.money < cost + wageBill(sim.state) && sim.state.tick < t + AFFORD_WAIT) sim.run(30);
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
    // Bread: wheat on the flood plain along the main street, a granary and an agora.
    at(300, { type: 'build', kind: 'farm', at: [T(41, 42), T(44, 42), T(47, 42)] });
    at(300, { type: 'build', kind: 'granary', at: [T(53, 42)] });
    at(300, { type: 'build', kind: 'agora', at: [T(65, 42)] });
    at(300, { type: 'build', kind: 'taxoffice', at: [T(TOWN_OFFICE.x, TOWN_OFFICE.z)] });
    at(500, { type: 'build', kind: 'farm', at: [T(38, 38), T(41, 38)] });
    at(2400, { type: 'build', kind: 'shrine', at: [T(68, 39)] });
    at(2400, { type: 'build', kind: 'farm', at: [T(50, 42)] });
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
    // The theatre, once the treasury has recovered from the new street.
    afford(3900, 400);
    at(3900, { type: 'build', kind: 'theatre', at: [T(57, 42)] });
    // The hamlet by the lane on the west bank, then the newest plots at its end.
    afford(4500, 610);
    at(4500, {
      type: 'plots',
      at: [...along([8, 10, 12, 14, 16, 18, 20, 22], 48), ...along([10, 12, 14, 16, 18, 20, 22], 51), ...col(24, 42, 42), T(24, 44), T(24, 46), T(27, 42), T(27, 44), T(27, 48)],
    });
    at(4500, { type: 'fountain', at: [T(27, 46)] });
    at(4500, { type: 'build', kind: 'farm', at: [T(44, 38)] });
    at(ticks - 450, { type: 'plots', at: [...along([2, 4, 6], 48), ...along([2, 4, 6, 8], 51)] });
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
 * collector reaches, a month on so the street's last visits have lapsed.
 */
const HARSH_FOR = 450;
const DRY_AFTER = 50;
const DRY_WAIT = 12000;
const TAXES_AFTER = 310;

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

function taxesTown(sim: Sim): void {
  town(TOWN_TICKS)(sim);
  sim.enqueue({ type: 'clear', x0: EAST_OFFICE.x, z0: EAST_OFFICE.z, x1: EAST_OFFICE.x, z1: EAST_OFFICE.z });
  sim.flush();
  // A month on, so the street's last visit from its own collector has lapsed.
  sim.run(TAXES_AFTER);
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
  workers: { view: 'workers', setup: foodTown(WORKERS_TICKS, 120, 0), overlay: 'food' },
  bridge: { view: 'bridge', tool: 'road', setup: bridgeTown(BRIDGE_TICKS), overlay: 'food' },
  people: { view: 'people', setup: foodTown(FOOD_TICKS), overlay: 'missing', open: (s) => nearest(s, 30, 67) },
  warning: { view: 'warning', speed: 'paused', tool: 'road', setup: cutTown(CUT_WARNING), overlay: 'missing', open: (s) => warned(s, true), mark: CUT },
  decline: { view: 'decline', setup: cutTown(CUT_DECLINE), overlay: 'missing', open: (s) => warned(s, false), mark: CUT },
  missing: { view: 'missing', setup: foodTown(MISSING_TICKS, 400, 200, { farms: 1 }), overlay: 'missing', overlayOn: true },
  grow: { view: 'grow', tool: 'shrine', setup: foodTown(FOOD_TICKS), overlay: 'religion' },
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
};
