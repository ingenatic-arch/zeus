/**
 * Prepared scenes for demo links. Each one builds through the sim's command
 * queue (so it is an ordinary, replayable game) and runs the clock on a
 * little so there is something to see.
 */
import { MAP_SIZE } from '../map/coast';
import type { OverlayMode } from '../render/overlay';
import { ARCHITECT_COST, ARMOURY_COST, BARRACKS_COST, FARM_COST, MINE_COST, GROVE_COST, PASTURE_COST, PRESS_COST, ROAD_COST, STALL_COST, STOREHOUSE_COST, THEATRE_COST, TRADING_COST, VINEYARD_COST, WATCHPOST_COST, WINERY_COST, YARD_COST } from '../sim/build';
import { COTTAGE, JOBS, VILLA } from '../sim/buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from '../sim/clock';
import { warningOf, warningsOf } from '../sim/folk';
import { ARMOUR, CHEESE, FLEECE, held, MEAT, OIL, WHEAT, WINE } from '../sim/foods';
import { COMPANY_SIZE, readyOf } from '../sim/army';
import { roadRoute } from '../sim/roads';
import { FIRE_BURNING, FIRE_SMOULDER, BURNT } from '../sim/hazards';
import type { Sim } from '../sim/sim';
import { FAIR, HARSH, HEAVY } from '../sim/taxes';
import { WAGE, wageBill } from '../sim/treasury';
import type { Building, SimState } from '../sim/state';
import { dockersOut, FIRST_SHIP, OLD_GOODS, SAIL_IN, SHIP_ANCHORED, SHIP_COMING, SHIP_EVERY, SHIP_MOORED, TRADE_GOODS, tradingPost } from '../sim/trade';
import { caravanOf, caravanYard, firstShipAfter, routeOf, routeRefusal, routeWay, tradesOf, visitorAt } from '../sim/routes';
import { cityOf, COLD, lastHarvest, moodOf, sellsAndBuys } from '../sim/world';
import { giftFrom, giftTo, rulerGift } from '../sim/diplomacy';
import { rateOf } from '../sim/labour';
import { askWhy, deadlineFor, firstRoute, makeOffer, makeRequest, makeTribute, requestCoin, requestSize, tributeSize, warWhy } from '../sim/favours';
import { armiesOnMap, declareWar, endWar, warOn } from '../sim/rivals';
import { nextFestival } from '../sim/festivals';
import { AT_TARGET, GATHER, liveRaid, marchTicks, raidersOf, threaten, THREAT_DAYS } from '../sim/raids';
import { dhypot, sq } from '../map/dmath';
import type { CityId } from '../map/greece';
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
 * along it, those after the theatre as long after it as planned. The towns
 * with a theatre get a sheep pasture and a fleece stall a month before it
 * (FLEECE_AT): fine houses need fleece. #closed clears the theatre and cuts
 * the west street off twenty months after the theatre opened, and opens about
 * two months later, before any home has gone down (see CLOSED_TICKS). (The
 * plays at the two ends of the actor's round run out months apart, so a later
 * moment has more homes past saving and an earlier one fewer signs.)
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
/**
 * #closed opens 62 days after the theatre is cleared and the street cut: the
 * plays the actor brought longest ago have run out, 14 fine houses warn
 * about them (the cut-off street about water too), the most urgent 27 days
 * from going down. Rebuilding the theatre and mending the road then loses
 * only the few homes at the main road's far west end that the new actor's
 * first round reaches last; a few days later it loses twice as many (her
 * round takes about two months), and left alone the town loses most of them.
 */
const CLOSED_TICKS = CLOSE_AT + 620;

export interface Demo {
  /** Camera view (a VIEWS name). */
  view: string;
  speed?: Speed;
  /** A tool picked from the start. */
  tool?: ToolName;
  /** The camera follows the first walker of this kind (or waits at her workplace). */
  follow?: 'water' | 'food' | 'cart' | 'porter' | 'priestess' | 'actor' | 'tax' | 'hunter' | 'oil' | 'fleece' | 'wine' | 'watchman' | 'inspector' | 'caravan' | 'docker' | 'raider';
  /** For `follow: 'cart'`: the kind of maker whose carts to follow (a farm if not given). */
  followFrom?: 'farm' | 'vineyard' | 'winery' | 'pasture' | 'grove' | 'press';
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
  /** Open the trade panel from the start (on a tab: a route's key, such as 'athens-sea', if one is named). */
  trade?: true | string;
  /** Open the map of Greece from the start, with a city's panel if one is named. */
  greece?: true | CityId;
  /** The tab that city's page opens on (its ruler's, unless named). */
  greeceTab?: 'ruler' | 'prices' | 'trade' | 'rivals';
  /** Open the side panel from the start, on a tab or a ware's page (whatever the window's width or the last visit chose). */
  side?: { tab?: 'goods' | 'people' | 'services' | 'money' | 'army'; ware?: number };
  /** The company whose banner is in hand from the start (a company id, 0 for none). */
  select?: (s: SimState) => number;
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
/** The culture towns' watch post and architect's office (slice 12): by the lane between the town and the hamlet, where one of each reaches every building. */
const LANE_WATCH = { x: 24, z: 68 };
const LANE_ARCHITECT = { x: 24, z: 62 };

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
    const e = sq(b.x + 1 - x) + sq(b.z + 1 - z);
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
 * The culture towns' fleece (fine houses need it), in the towns that get a
 * theatre: a sheep pasture on the grass beside the lane north of the groves,
 * its bales going to the storehouse, and a fleece stall at the agora by the
 * junction. It goes in a month before the theatre (FLEECE_AT), once the
 * treasury can pay for it and a month's wages, so the fleece vendor has been
 * round by the time the actor has.
 */
const LANE_PASTURE = { x: 27, z: 56 };
const FLEECE_AT = THEATRE_AT - 300;
const FLEECE_COST = PASTURE_COST + STALL_COST + (JOBS.pasture + 1) * WAGE;
function laneFleece(at: At, t: number): void {
  at(t, { type: 'build', kind: 'pasture', at: [T(LANE_PASTURE.x, LANE_PASTURE.z)] });
  at(t, { type: 'stall', at: T(LANE_AGORA.x, LANE_AGORA.z), good: FLEECE });
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
function cultureTown(ticks: number, theatre = true, close = false, oil = true, more?: (at: At, late: number) => number | void): (sim: Sim) => void {
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
        // Fleece for the fine houses to come, a month before the theatre (see FLEECE_AT).
        if (at.sim) waitFor(at.sim, FLEECE_AT, FLEECE_COST);
        laneFleece(at, FLEECE_AT);
        // (The fleece set the treasury back: the theatre can wait longer for its money than other things.)
        if (at.sim) waitFor(at.sim, THEATRE_AT, THEATRE_COST + JOBS.theatre * WAGE, THEATRE_AT + 2 * AFFORD_WAIT);
        late = Math.max(0, (at.sim?.state.tick ?? 0) - THEATRE_AT);
        at(THEATRE_AT, { type: 'build', kind: 'theatre', at: [T(THEATRE.x, THEATRE.z)] });
      }
      // (Since slice 14, taxes stay heavy for a month after the theatre opens, or till the day before the scene does, so the treasury has a cushion.)
      const fairAt = Math.max(Math.min(THEATRE_AT + late + TICKS_PER_MONTH, ticks + late - OFFICE_LEAD), ticks + late - FAIR_AGAIN);
      if (theatre && !(close && fairAt > CLOSE_AT + late)) fair(fairAt);
      if (close) {
        at(CLOSE_AT + late, { type: 'clear', x0: THEATRE.x, z0: THEATRE.z, x1: THEATRE.x, z1: THEATRE.z });
        at(CLOSE_AT + late, { type: 'clear', x0: CUT.x, z0: CUT.z, x1: CUT.x, z1: CUT.z });
        if (fairAt > CLOSE_AT + late) fair(fairAt);
      }
      const end = Math.max(ticks + late, more?.(at, late) ?? 0);
      // A watch post and an architect's office by the lane, a day before the scene opens (slice 12), for the towns with a theatre.
      if (theatre) {
        at(end - OFFICE_LEAD, { type: 'build', kind: 'watchpost', at: [T(LANE_WATCH.x, LANE_WATCH.z)] });
        at(end - OFFICE_LEAD, { type: 'build', kind: 'architect', at: [T(LANE_ARCHITECT.x, LANE_ARCHITECT.z)] });
      }
      if (at.sim && at.sim.state.tick < end) at.sim.run(end - at.sim.state.tick);
    },
  });
}

/**
 * The villa town: the culture town, seven months after its theatre opened (its
 * townhouses all fine houses by then), plants two vineyards on the sunny
 * slope by the main road west of the town, with a winery across the road; the
 * wine goes to the storehouse by the lane and is sold from a wine stall at the
 * agora by the junction (villas need wine). Once the treasury can pay for it
 * and a month's wages.
 */
const WINE_VINEYARDS = [
  { x: 6, z: 77 },
  { x: 9, z: 77 },
];
const WINE_WINERY = { x: 12, z: 81 };
const WINE_AT = THEATRE_AT + 2100;
const WINE_COST = 2 * VINEYARD_COST + WINERY_COST + STALL_COST + (2 * JOBS.vineyard + JOBS.winery + 1) * WAGE;
/** #villas: nine months after the vines went in, as the first dozen or so villas fill and more fine houses climb. */
const VILLAS_AFTER = 2600;
/** #winery: the first vintage being trodden, its carts on the road to the storehouse. */
const WINERY_AFTER = 700;
/** The wine chain, and the scene opening `after` ticks after it went in (however long it waited for the money). */
const wineChain =
  (after: number) =>
  (at: At, late: number): number => {
    if (at.sim) waitFor(at.sim, WINE_AT + late, WINE_COST, WINE_AT + late + 2 * AFFORD_WAIT);
    const t = Math.max(WINE_AT + late, at.sim?.state.tick ?? 0);
    at(t, { type: 'build', kind: 'vineyard', at: WINE_VINEYARDS.map((v) => T(v.x, v.z)) });
    at(t, { type: 'build', kind: 'winery', at: [T(WINE_WINERY.x, WINE_WINERY.z)] });
    at(t, { type: 'stall', at: T(LANE_AGORA.x, LANE_AGORA.z), good: WINE });
    // The scene opens `after` ticks on (the town's builder stops a day short of it, for the watch post: see cultureTown).
    if (at.sim && at.sim.state.tick < t + after - OFFICE_LEAD) at.sim.run(t + after - OFFICE_LEAD - at.sim.state.tick);
    return t + after;
  };
const villaTown = (after: number): ((sim: Sim) => void) => cultureTown(WINE_AT + after, true, false, true, wineChain(after));

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
      moreOffices(at, GROW_DAIRY);
    },
  });
}

/**
 * The culture towns' second and third tax offices (on the west street and at
 * the east street's end), for the food towns that pay for a dairy, an oil
 * chain or hunting lodges as well (since slice 14: one collector reaches only
 * about half the town's homes, and its taxes don't cover the extra wages).
 */
function moreOffices(at: At, t: number): void {
  at(t, { type: 'build', kind: 'taxoffice', at: [T(WEST_OFFICE.x, WEST_OFFICE.z)] });
  at(t, { type: 'road', tiles: [T(STREET_OFFICE.x, STREET_OFFICE.z - 1)] });
  at(t, { type: 'build', kind: 'taxoffice', at: [T(STREET_OFFICE.x, STREET_OFFICE.z)] });
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
      moreOffices(at, TABLE_OIL);
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
  return foodTown(ticks, 400, 200, {
    then: (at) => {
      at(OVERHUNT_AT, { type: 'build', kind: 'lodge', at: OVERHUNT_LODGES.map((l) => T(l.x, l.z)) });
      moreOffices(at, OVERHUNT_AT);
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
 * every house has earned its level. Since slice 11 the core gets its sheep
 * pasture, fleece stall and theatre before the east street goes in (fine
 * houses need fleece, and pay the most tax: the treasury couldn't pay for
 * the street first and still have them in time), and it opens later in its
 * life (tick 8,400, was 7,200), once every walker's round has settled; its
 * bread holds for well over a year as it fills up.
 */
const TOWN_TICKS = 8400;
/** How long before #town opens its taxes go back to fair (moods settle within a month). */
const FAIR_AGAIN = 600;
/** How long before #town opens the newest plots go down at the hamlet's end (so a few are still tents). */
const NEWEST = 330;
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
 * east cross street, one olive grove at the top (the best olive ground on the
 * map; one is enough for its townhouses and fine houses, and a second took
 * the workers its hamlet needed), the press and the storehouse below it
 * (between the deer of the north hills and of the east hills).
 */
const TOWN_OIL_X = 86;
const TOWN_OIL_ROAD = 23;
const TOWN_GROVES = [{ x: 83, z: 23 }];
const TOWN_PRESS = { x: 83, z: 27 };
const TOWN_STORE = { x: 87, z: 27 };
const TOWN_OIL_COST = (33 - TOWN_OIL_ROAD) * ROAD_COST + GROVE_COST + PRESS_COST + STOREHOUSE_COST + STALL_COST;
/**
 * #town's fleece (fine houses need it): a sheep pasture on the river meadow
 * between the farms and the granary, its bales going up to the storehouse,
 * and a fleece stall at each agora.
 */
const TOWN_PASTURE = { x: 50, z: 42 };
const CORE_W = [63, 65, 67, 69, 71];
const CORE_E = [75, 77, 79, 81, 83];
const along = (xs: number[], z: number): number[] => xs.map((x) => T(x, z));

/**
 * #town's watch posts and architects' offices (slice 12): one of each at the
 * foot of the slope road up to the oil, at the head of the core's east cross
 * street, and one of each by the lane on the west bank, so every building in
 * town is in a watchman's and an inspector's reach. They go in a day before it opens, as
 * the tax offices of the smaller towns do, so they are staffed when it opens.
 */
interface Spot {
  x: number;
  z: number;
}
const TOWN_WATCH: Spot[] = [
  { x: 87, z: 32 },
  { x: 25, z: 39 },
];
const TOWN_ARCHITECTS: Spot[] = [
  { x: 87, z: 34 },
  { x: 27, z: 39 },
];
/** Which of them a history leaves out: #fire's town has no watchman on the east street, #creak's no inspector there. */
interface Safety {
  watch: Spot[];
  architects: Spot[];
}
const SAFE: Safety = { watch: TOWN_WATCH, architects: TOWN_ARCHITECTS };

/**
 * #richtown (slice 14): #town's history carried on, as its builder would
 * carry it on once the hamlet is in. A road down to the bay (the one #quay
 * lays) and a lane along the sunny slope above the quay, with three vineyards
 * on it, a winery and a storehouse across it by the quay, and wine stalls at
 * both agoras (the fine houses become villas); then the trading post at the
 * foot of the road, with every good ticked for sale (the town keeping what it
 * needs), and a watch post and an architect's office by the road. It opens at
 * the first of the ship's visits after RICH_MIN, RICH_IN ticks into her way
 * in, so her sail is crossing the bay; its taxes stay heavy until FAIR_AGAIN
 * before that.
 */
const QUAY_ROAD = col(74, 42, 68);
const QUAY_ROAD_LEN = QUAY_ROAD.length;
const QUAY_POST = { x: 73, z: 69 };
const RICH_WINE_AT = 4800;
const RICH_LANE = row(75, 89, 68);
const RICH_VINEYARDS = [
  { x: 80, z: 69 },
  { x: 83, z: 69 },
  { x: 86, z: 69 },
];
const RICH_WINERY = { x: 80, z: 65 };
const RICH_STORE = { x: 76, z: 65 };
const RICH_WINE_COST = QUAY_ROAD_LEN * ROAD_COST + RICH_LANE.length * ROAD_COST + 3 * VINEYARD_COST + WINERY_COST + STOREHOUSE_COST + 2 * STALL_COST + (3 * JOBS.vineyard + JOBS.winery + JOBS.storehouse + 2) * WAGE;
const RICH_WATCH = { x: 72, z: 61 };
const RICH_ARCHITECT = { x: 72, z: 57 };
/** How long after its wine chain goes in #richtown opens (time for the first vintage to reach the fine houses and most of them to become villas), and how far into the ship's way in (of SAIL_IN). */
const RICH_VILLAS = 1900;
/** #richtown's watch posts and architects' offices go in a month before it opens, so their walkers are out on their rounds. */
const RICH_LEAD = TICKS_PER_MONTH;
const RICH_IN = 165;

function town(opening: number, safety: Safety = SAFE, rich = false): (sim: Sim) => void {
  return (sim) => {
    let ticks = opening;
    const at: At = (t, c) => {
      if (sim.state.tick < t) sim.run(t - sim.state.tick);
      sim.enqueue(c);
      sim.flush();
    };
    // As a player would: wait (from tick t) until the treasury can pay for what goes in next, and still pay a month's wages.
    const afford = (t: number, cost: number): void => {
      waitFor(sim, t, cost, t + 2 * AFFORD_WAIT);
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
    // Fleece for the fine houses the theatre will bring: the pasture and the core agora's fleece stall.
    afford(sim.state.tick, PASTURE_COST + STALL_COST + (JOBS.pasture + 1) * WAGE);
    at(sim.state.tick, { type: 'build', kind: 'pasture', at: [T(TOWN_PASTURE.x, TOWN_PASTURE.z)] });
    at(sim.state.tick, { type: 'stall', at: T(65, 42), good: FLEECE });
    // The theatre, once the treasury has recovered: in the core's north-west block (since slice 11; it stood west of
    // the core by the granary, where the north street's far east end was at the edge of the actor's reach and,
    // once fine houses needed fleece and the history changed, went five or six weeks at a time without plays).
    afford(3900, THEATRE_COST + JOBS.theatre * WAGE);
    at(3900, { type: 'build', kind: 'theatre', at: [T(63, 36)] });
    // The street east of the core, with its own fountain, agora and tax office.
    afford(3900, 820);
    at(sim.state.tick, { type: 'road', tiles: row(96, 112, 41) });
    at(sim.state.tick, { type: 'build', kind: 'taxoffice', at: [T(EAST_OFFICE.x, EAST_OFFICE.z)] });
    at(sim.state.tick, {
      type: 'plots',
      at: [...along([88, 90, 92, 94, 96, 98, 102, 104, 106, 108, 110], 39), ...along([88, 90, 92, 94, 102, 104, 106, 108, 110], 42)],
    });
    at(sim.state.tick, { type: 'build', kind: 'agora', at: [T(97, 42)] });
    at(sim.state.tick, { type: 'fountain', at: [T(100, 39)] });
    // Its agora's oil stall, once there is money for it.
    afford(sim.state.tick, STALL_COST);
    at(sim.state.tick, { type: 'stall', at: T(97, 42), good: OIL });
    // The hamlet by the lane on the west bank, then the newest plots at its end.
    afford(4500, 410 + JOBS.fountain * WAGE);
    at(4500, {
      type: 'plots',
      // (#richtown's builder leaves out its back row: its people are to go into villas.)
      at: [...along([8, 10, 12, 14, 16, 18, 20, 22], 48), ...(rich ? [] : along([10, 12, 14, 16, 18, 20, 22], 51)), ...col(24, 42, 42), T(24, 44), T(24, 46), T(27, 42), T(27, 44), T(27, 48)],
    });
    at(4500, { type: 'fountain', at: [T(27, 46)] });
    if (rich) ticks = bayQuarter(sim, at, afford);
    // (#richtown has no room for them: its people go into its villas.)
    if (!rich) at(ticks - NEWEST, { type: 'plots', at: [...along([2, 4, 6], 48), ...along([2, 4, 6, 8], 51)] });
    at(ticks - FAIR_AGAIN, { type: 'tax', rate: FAIR });
    const lead = rich ? RICH_LEAD : OFFICE_LEAD;
    const watch = [...safety.watch, ...(rich ? [RICH_WATCH] : [])];
    const architects = [...safety.architects, ...(rich ? [RICH_ARCHITECT] : [])];
    if (watch.length) at(ticks - lead, { type: 'build', kind: 'watchpost', at: watch.map((p) => T(p.x, p.z)) });
    if (architects.length) at(ticks - lead, { type: 'build', kind: 'architect', at: architects.map((p) => T(p.x, p.z)) });
    if (sim.state.tick < ticks) sim.run(ticks - sim.state.tick);
    if (rich) {
      // In case her schedule moved: on to the moment she is RICH_IN into her way in.
      const ship = sim.state.trade.ship;
      const end = sim.state.tick + 2 * SHIP_EVERY;
      while (sim.state.tick < end && !(ship.phase === SHIP_COMING && sim.state.tick - ship.since >= RICH_IN)) sim.step();
    }
  };
}

/** #richtown's bay quarter and trading post (see RICH_WINE_AT); returns when the town opens. */
function bayQuarter(sim: Sim, at: At, afford: (t: number, cost: number) => void): number {
  const s = sim.state;
  afford(RICH_WINE_AT, RICH_WINE_COST);
  const wine = s.tick;
  at(s.tick, { type: 'road', tiles: [...QUAY_ROAD, ...RICH_LANE] });
  at(s.tick, { type: 'build', kind: 'vineyard', at: RICH_VINEYARDS.map((v) => T(v.x, v.z)) });
  at(s.tick, { type: 'build', kind: 'winery', at: [T(RICH_WINERY.x, RICH_WINERY.z)] });
  at(s.tick, { type: 'build', kind: 'storehouse', at: [T(RICH_STORE.x, RICH_STORE.z)] });
  at(s.tick, { type: 'stall', at: T(65, 42), good: WINE });
  at(s.tick, { type: 'stall', at: T(97, 42), good: WINE });
  // The post, timed so the ship's first visit comes as the villas rise (later if the money is late).
  afford(wine + RICH_VILLAS - (FIRST_SHIP - SAIL_IN + RICH_IN), TRADING_COST + JOBS.trading * WAGE);
  at(s.tick, { type: 'build', kind: 'trading', at: [T(QUAY_POST.x, QUAY_POST.z)] });
  // (The goods of phase 3: copper and armour, added in slice 23, are kept for the town's own army.)
  for (const good of TRADE_GOODS.slice(0, OLD_GOODS)) at(s.tick, { type: 'trade', good, sell: true });
  // Her first visit is due FIRST_SHIP from now (the post is built on the next tick): the town opens RICH_IN into her way in.
  return s.tick + 1 + FIRST_SHIP - SAIL_IN + RICH_IN;
}

/**
 * The fire demos: #town as its builder would have had it with only two watch
 * posts, one by the lane on the west bank and one at the west end of the
 * core, so the east of the core, the slope up to the oil and the street east
 * of the core are left without a watchman; fire risk and wear switched on as
 * it opens (as in every demo) and played on. #fire opens on the first thread
 * of smoke; #blaze once a fire has spread to a second building; #rubble once
 * the fires there have burnt out, leaving rubble. #creak: #town with its
 * watch posts but only the architect's office by the lane, played on until
 * the first building creaks.
 */
const FIRE_SAFETY: Safety = { watch: [TOWN_WATCH[1], { x: 60, z: 35 }], architects: TOWN_ARCHITECTS };
const CREAK_SAFETY: Safety = { watch: TOWN_WATCH, architects: [TOWN_ARCHITECTS[1]] };
/** The longest a fire demo waits for what it opens on (two years). */
const HAZARD_WAIT = 2 * 12 * TICKS_PER_MONTH;
type FireStage = 'smoke' | 'blaze' | 'rubble';
const fireStage = (s: SimState, stage: FireStage): boolean => {
  if (stage === 'smoke') return s.buildings.some((b) => b.fire === FIRE_SMOULDER);
  const burning = s.buildings.filter((b) => b.fire === FIRE_BURNING).length;
  if (stage === 'blaze') return burning >= 2;
  return burning === 0 && s.buildings.filter((b) => b.kind === 'rubble' && b.level === BURNT).length >= 2;
};
function fireTown(stage: FireStage): (sim: Sim) => void {
  return (sim) => {
    town(TOWN_TICKS, FIRE_SAFETY)(sim);
    hazards(sim, true);
    const s = sim.state;
    const end = s.tick + HAZARD_WAIT;
    while (s.tick < end && !fireStage(s, stage)) sim.step();
  };
}
function creakTown(sim: Sim): void {
  town(TOWN_TICKS, CREAK_SAFETY)(sim);
  hazards(sim, true);
  const s = sim.state;
  const end = s.tick + HAZARD_WAIT;
  while (s.tick < end && !s.buildings.some((b) => b.creakAt > 0)) sim.step();
}

/**
 * The money demos all start from #town as it opens. #harsh: taxes turned up
 * to harsh, three months on (a month and a half before slice 11: its fine
 * houses are better off now, so it takes longer), so moods have soured and a
 * few households have sent someone away (the panel opens on the first that did). #dry: taxes
 * set to none until the treasury runs out, then a few days more, so wages go
 * unpaid at some workplaces (which work at half pace) and the money line says
 * so. #taxes: the east street's tax office cleared as the town opens, so the
 * tax overlay shows the street (and the hamlet on the west bank) that no
 * collector reaches, two months on so the street's last visits have lapsed
 * (the overlay posts homes no collector has called on in two months).
 */
const HARSH_FOR = 950;
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
 * first). The panel opens on the house closest to going down. Since slice 11
 * the storehouse also keeps the fleece fine houses need, so an empty one goes
 * up where it stood the next day: fleece keeps coming, the oil doesn't.
 */
const NOOIL_LEFT = TICKS_PER_MONTH;
const NOOIL_WAIT = 18 * TICKS_PER_MONTH;
function noOilTown(sim: Sim): void {
  cultureTown(FINE_TICKS)(sim);
  for (const p of [LANE_PRESS, LANE_STORE]) sim.enqueue({ type: 'clear', x0: p.x, z0: p.z, x1: p.x, z1: p.z });
  sim.flush();
  sim.run(TICKS_PER_DAY);
  sim.enqueue({ type: 'build', kind: 'storehouse', at: [T(LANE_STORE.x, LANE_STORE.z)] });
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

/** The first villa (the one that went up first), else the fine house nearest the agora. */
function firstVilla(s: SimState): number {
  let best = 0;
  let at = Infinity;
  for (const b of homes(s)) if (b.level === VILLA && b.since < at) [best, at] = [b.id, b.since];
  return best || nearest(s, 28, 69);
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

/**
 * The trade demos (slice 13): #town as it opens, with a road laid from its
 * main street down to the bay's north-east shore, where the deep water comes
 * within five tiles; played on four months, so the treasury can pay for a
 * trading post at the road's end. #trade opens there, the tool in hand. The
 * others build the post and put wheat, meat, cheese and oil up for sale (the
 * town keeps the usual amounts), then play on: #quay until the dockers have
 * stacked a few loads on the quay, #sail until the ship's sail shows on the
 * horizon, #ship until she has tied up and begun loading. #black builds the
 * post as soon as the treasury can pay for it (about a month and a half),
 * puts all six goods up for sale keeping less for the town, and a month and
 * a half before the ship is due turns taxes off, as #dry does, so the
 * treasury runs dry and wages go unpaid; it opens as her sail shows, the
 * quay stacked.
 */
const TRADE_AFTER = 4 * TICKS_PER_MONTH;
const TRADE_SELL = [WHEAT, MEAT, CHEESE, OIL];
/** #black sells everything, keeping less: wheat 800, meat, cheese and oil 200 (fleece and wine as usual). */
const BLACK_KEEP: Array<[number, number]> = [[WHEAT, 800], [MEAT, 200], [CHEESE, 200], [OIL, 200], [FLEECE, 600], [WINE, 600]];
/** How long before the ship is due #black turns its taxes off. */
const BLACK_DRY = 450;
type TradeStage = 'trade' | 'quay' | 'sail' | 'ship' | 'black';
/** What is on the quay, in all. */
const onQuay = (s: SimState): number => {
  const p = tradingPost(s);
  return p ? TRADE_GOODS.reduce((n, w) => n + held(p, w), 0) : 0;
};
function tradeTown(stage: TradeStage): (sim: Sim) => void {
  return (sim) => {
    town(TOWN_TICKS)(sim);
    const s = sim.state;
    const send = (c: Parameters<Sim['enqueue']>[0]): void => {
      sim.enqueue(c);
      sim.flush();
    };
    send({ type: 'road', tiles: QUAY_ROAD });
    if (stage === 'black') waitFor(sim, s.tick, TRADING_COST);
    else sim.run(TRADE_AFTER);
    if (stage === 'trade') return;
    send({ type: 'build', kind: 'trading', at: [T(QUAY_POST.x, QUAY_POST.z)] });
    if (stage === 'black') for (const [good, keep] of BLACK_KEEP) send({ type: 'trade', good, sell: true, keep });
    else for (const good of TRADE_SELL) send({ type: 'trade', good, sell: true });
    const ship = s.trade.ship;
    if (stage === 'black') {
      sim.run(Math.max(0, ship.due - BLACK_DRY - s.tick));
      send({ type: 'tax', rate: 0 });
    }
    const ready = (): boolean => {
      if (stage === 'quay') return onQuay(s) >= 1800 && dockersOut(s, tradingPost(s)!) > 0;
      if (stage === 'ship') return ship.phase === SHIP_MOORED && s.tick - ship.since >= 15;
      return ship.phase === SHIP_COMING && s.tick - ship.since >= 8;
    };
    const end = s.tick + 2 * SHIP_EVERY;
    while (s.tick < end && !ready()) sim.step();
  };
}

/**
 * The route demos (slice 16). #routes: #town with a road laid north from the
 * top of its main street to the map's edge, the main street run on a tile at
 * its east end, and a caravan yard built there once the treasury can pay for
 * it; played on until the yard is staffed and the treasury can pay for the road
 * to Corinth (it opens on the map, on Corinth's page). #caravan: the road to
 * Corinth opened, oil and meat ticked for sale to it; played on until its first
 * caravan has come in at the north edge and walked a little way down the road.
 * #buywine: the same town buying wine from Corinth (it has no vineyards), up to
 * 1,200 in its storehouses, with a wine stall added to the main agora; it opens
 * with the caravan a few days short of the yard, to be seen coming in, unloading
 * the wine and the yard's porters carrying it up to the storehouse.
 */
/** The road north to the map's edge, from the top of the street above #town's core. */
export const NORTH_ROAD = col(86, 0, 22).reverse();
/** The caravan yard at the main street's east end, below it, facing up the street (the street run on a tile to reach its gate). */
export const YARD_AT = { x: 113, z: 42 };
export const YARD_ROAD = [T(113, 41)];
/** A watch post and an architect's office by the yard (since slice 17: it was outside the watchmen's rounds, and burned down after a year and a half). */
const YARD_WATCH = { x: 112, z: 39 };
const YARD_ARCHITECT = { x: 114, z: 40 };
/** The main agora (its wine stall for #buywine). */
const MAIN_AGORA = T(97, 42);
/** The longest a route demo waits for its trader (a year). */
const ROUTE_WAIT = 12 * TICKS_PER_MONTH;
type RouteStage = 'routes' | 'caravan' | 'buywine' | 'prices';
/**
 * #prices (slice 17): more oil for Corinth. Two more olive groves by the road
 * north, above the first, and a second press below, at the head of the core; the city keeps 400
 * oil and sells the rest to Corinth's caravans, which pay less visit by visit
 * as the oil piles up there.
 */
const PRICES_GROVES = [T(83, 19), T(87, 20)];
const PRICES_PRESS = T(87, 36);
const PRICES_KEEP = 300;
/** How many caravans have paid for oil when #prices opens (the next a few days short of the yard). */
const PRICES_VISITS = 2;
/** How far short of the yard's gate #buywine's caravan is when it opens (tiles: about a week's walk). */
const BUYWINE_LEFT = 6;

function routesTown(stage: RouteStage): (sim: Sim) => void {
  return (sim) => {
    town(TOWN_TICKS)(sim);
    const s = sim.state;
    const send = (c: Parameters<Sim['enqueue']>[0]): void => {
      sim.enqueue(c);
      sim.flush();
    };
    const roads = (NORTH_ROAD.length + YARD_ROAD.length) * ROAD_COST;
    waitFor(sim, s.tick, roads + YARD_COST + WATCHPOST_COST + ARCHITECT_COST + (JOBS.yard + JOBS.watchpost + JOBS.architect) * WAGE);
    send({ type: 'road', tiles: [...NORTH_ROAD, ...YARD_ROAD] });
    send({ type: 'build', kind: 'yard', at: [T(YARD_AT.x, YARD_AT.z)] });
    send({ type: 'build', kind: 'watchpost', at: [T(YARD_WATCH.x, YARD_WATCH.z)] });
    send({ type: 'build', kind: 'architect', at: [T(YARD_ARCHITECT.x, YARD_ARCHITECT.z)] });
    if (stage === 'prices') {
      waitFor(sim, s.tick, 2 * GROVE_COST + PRESS_COST + (2 * JOBS.grove + JOBS.press) * WAGE);
      send({ type: 'build', kind: 'grove', at: PRICES_GROVES });
      send({ type: 'build', kind: 'press', at: [PRICES_PRESS] });
    }
    const fee = routeWay('corinth', 'land')!.fee;
    // Staffed, and the fee in hand (with a little over: to pay the wages until the caravan comes, or while #routes waits for a click; and for the stall and the wine, about 850 dr).
    const extra = stage === 'buywine' ? STALL_COST + 1000 : 300;
    const end = s.tick + ROUTE_WAIT;
    while (s.tick < end && !(rateOf(caravanYard(s)!) > 0 && s.money >= fee + extra + wageBill(s))) sim.run(10);
    if (stage === 'routes') return;
    send({ type: 'route', city: 'corinth', kind: 'land' });
    if (stage === 'caravan') for (const good of [OIL, MEAT]) send({ type: 'deal', city: 'corinth', kind: 'land', good, sell: true });
    else if (stage === 'prices') {
      send({ type: 'deal', city: 'corinth', kind: 'land', good: OIL, sell: true });
      send({ type: 'trade', good: OIL, keep: PRICES_KEEP });
    } else {
      send({ type: 'deal', city: 'corinth', kind: 'land', good: WINE, buy: true, upto: 1200 });
      send({ type: 'stall', at: MAIN_AGORA, good: WINE });
    }
    const r = routeOf(s, 'corinth', 'land')!;
    let paid = 0;
    let visits = 0;
    const ready = (): boolean => {
      const w = caravanOf(s, 'corinth');
      if (stage === 'caravan') return !!w && !w.back && w.walked > 10;
      // #prices: two caravans have paid for oil, and the third is as close as #buywine's.
      if (r.visits !== visits) {
        visits = r.visits;
        if (r.lastSold[TRADE_GOODS.indexOf(OIL)] > 0) paid++;
      }
      if (stage === 'prices' && paid < PRICES_VISITS) return false;
      // #buywine: a few days short of the yard's gate, to be seen coming in, unloading the wine and its porters carrying it off.
      if (!w || w.back) return false;
      let left = -w.along;
      for (let i = w.seg * 2; i + 3 < w.path.length; i += 2) left += dhypot(w.path[i + 2] - w.path[i], w.path[i + 3] - w.path[i + 1]);
      return left < BUYWINE_LEFT;
    };
    const stop = s.tick + (stage === 'prices' ? 2 : 1) * ROUTE_WAIT;
    while (s.tick < stop && !ready()) sim.step();
  };
}

/**
 * The rulers who remember (slice 18), all on #routes' town and Corinth.
 * #gift: #routes' town as it stands (no route yet), the map open on Corinth's
 * ruler, to send a gift and watch it go. #hostile: #buywine's town, its wine
 * caravan come and gone, with Corinth's lord set up furious with your city
 * (a memory this slice has nothing to make on its own: the demo says so in
 * its reason), the road closed the day after (the caravan already on its
 * way in still comes, and is the last). #thanks: three gifts of
 * 500 dr sent to Corinth one after another (warming its lord),
 * and his own gift of goods on the road to your city, a few days from the edge.
 */
type RulerStage = 'hostile' | 'thanks';
/** #hostile's set-up anger: past hostile (−60) with Corinth's first impression, mended by a gift of 250 dr or more (100 is not enough); it fades over four years, so the road opens again by itself in about five months. */
const HOSTILE_ANGER = -72;
/** How many days from your map's edge Corinth's gift is when #thanks opens. */
const THANKS_DAYS = 4;

function rulerTown(stage: RulerStage): (sim: Sim) => void {
  return (sim) => {
    const s = sim.state;
    const send = (c: Parameters<Sim['enqueue']>[0]): void => {
      sim.enqueue(c);
      sim.flush();
    };
    const corinth = cityOf(s.world, 'corinth');
    if (stage === 'hostile') {
      routesTown('buywine')(sim);
      // (The wine caravan a few days short of the yard is already on its way: it still comes, unloads and goes home, and is the last.)
      corinth.memories.push({ kind: 'staged', why: 'furious with your city (set up for this demo)', amount: HOSTILE_ANGER, tick: s.tick, fade: 4 * TICKS_PER_YEAR });
      // The next day the road closes, and the line under the top bar says so.
      sim.run(TICKS_PER_DAY - (s.tick % TICKS_PER_DAY) + 1);
      return;
    }
    routesTown('routes')(sim);
    // Saved up for three gifts, sent one after another (each counting for less, so soon after the last).
    waitFor(sim, s.tick, 3 * 500, s.tick + 2 * ROUTE_WAIT);
    for (let i = 0; i < 3; i++) {
      send({ type: 'gift', city: 'corinth', good: -1, amount: 500 });
      const end = s.tick + ROUTE_WAIT;
      while (s.tick < end && giftTo(s.world, 'corinth')) sim.run(10);
    }
    // His gift back: goods his city makes plenty of (the dice would send one in a month or two; the demo sends it now).
    const { sells } = sellsAndBuys(corinth);
    rulerGift(s, corinth, sells[0] ?? -1, sells.length ? 400 : 300, 'in return for your gifts');
    corinth.gave = s.tick;
    const g = giftFrom(s.world, 'corinth')!;
    while (g.start + g.dur - s.tick > THANKS_DAYS * TICKS_PER_DAY) sim.step();
  };
}

/**
 * Favours, offers and tribute (slice 19). Each deal is made by the demo (the
 * dice would bring one in its own time, six months after a first route at
 * the soonest). #request: #caravan's town, Sparta's king asking for wheat,
 * the map open on his page to answer it. #promise: #athensship's town, the
 * archon of Athens asked for wheat and was promised it, and nothing sent;
 * it opens five days before the day. #offer: #prices' town, Corinth's lord
 * (pleased with your city: a memory the demo sets up and names) offering to
 * buy your oil for a year. #tribute: #caravan's town, Sparta's king (warlike,
 * wary, and his city far bigger) demanding tribute in coin.
 */
type FavourStage = 'request' | 'promise' | 'offer' | 'tribute';
/** How many days before its deadline #promise opens. */
const PROMISE_DAYS = 5;
/** #offer's set-up goodwill: enough to lift Corinth's lord past pleased (+15); it fades over two years. */
const OFFER_GOODWILL = 12;
/** What #tribute's treasury holds beyond the tribute and a month's wages when it opens, at the least. */
const TRIBUTE_SPARE = 200;
const WHEAT_K = 0;
const OIL_K = 3;

function favourTown(stage: FavourStage): (sim: Sim) => void {
  return (sim) => {
    const s = sim.state;
    const send = (c: Parameters<Sim['enqueue']>[0]): void => {
      sim.enqueue(c);
      sim.flush();
    };
    if (stage === 'request' || stage === 'tribute') {
      routesTown('caravan')(sim);
      const sparta = cityOf(s.world, 'sparta');
      if (stage === 'request') {
        makeRequest(s, sim.map, sparta, WHEAT_K, requestSize(s, sparta, WHEAT_K), askWhy(sparta, WHEAT_K, s.tick));
        return;
      }
      // (Saved up first, so the treasury could pay it: refusing or paying is the choice.)
      waitFor(sim, s.tick, tributeSize(s, sparta, -1, false) + TRIBUTE_SPARE, s.tick + 6 * TICKS_PER_MONTH);
      makeTribute(s, sim.map, sparta, -1, tributeSize(s, sparta, -1, false), false);
      return;
    }
    if (stage === 'offer') {
      routesTown('prices')(sim);
      const corinth = cityOf(s.world, 'corinth');
      corinth.memories.push({ kind: 'staged', why: 'pleased with how your city trades (set up for this demo)', amount: OFFER_GOODWILL, tick: s.tick, fade: 2 * TICKS_PER_YEAR });
      makeOffer(s, corinth, OIL_K, 'buy');
      return;
    }
    seaTown('athensship')(sim);
    const athens = cityOf(s.world, 'athens');
    const d = makeRequest(s, sim.map, athens, WHEAT_K, requestSize(s, athens, WHEAT_K), askWhy(athens, WHEAT_K, s.tick));
    send({ type: 'answer', deal: d.id, act: 'promise' });
    sim.run(d.due - PROMISE_DAYS * TICKS_PER_DAY - s.tick);
  };
}

/**
 * Raiders at the edge (slice 20). #threat: #caravan's town, run on until
 * its first route is nearly a year old; Sparta's king, who was refused a
 * first tribute (and turned cold), demanded tribute again and was refused:
 * he threatens the city, and the map opens on his page. #raid: that threat
 * let run out, the band on the road from Sparta a few days from your west
 * edge, the map open on his page. #raiders: the band in your city, at the
 * farm nearest the west edge, torches lit (fire switched on for the raid,
 * as #blaze does). #aftermath: a few days after they left (a month after the raid), the burnt
 * farm's rubble, the ledger open.
 */
type RaidStage = 'threat' | 'raid' | 'raiders' | 'aftermath';
/** How many days from your edge #raid's band is when it opens. */
const RAID_DAYS = 4;
/** How long #raiders' band has been at the farm when it opens (ticks). */
const RAIDERS_IN = 4;
/** How long after the band left #aftermath opens (days). */
const AFTER_DAYS = 5;

function raidTown(stage: RaidStage): (sim: Sim) => void {
  return (sim) => {
    const s = sim.state;
    const send = (c: Parameters<Sim['enqueue']>[0]): void => {
      sim.enqueue(c);
      sim.flush();
    };
    routesTown('caravan')(sim);
    const sparta = cityOf(s.world, 'sparta');
    // A first tribute, refused: the king (wary) turns cold.
    const first = makeTribute(s, sim.map, sparta, -1, tributeSize(s, sparta, -1, false), false);
    send({ type: 'answer', deal: first.id, act: 'refuse' });
    // On until his raiders could come at the end of the usual two months (no raid in a city's first year of trade), the treasury able to pay them off.
    const ready = firstRoute(s.world) + TICKS_PER_YEAR - GATHER - marchTicks('sparta') - THREAT_DAYS;
    waitFor(sim, ready, 1000, ready + 3 * TICKS_PER_MONTH);
    // The second demand, refused while he is cold: the threat.
    const again = makeTribute(s, sim.map, sparta, -1, tributeSize(s, sparta, -1, false), false);
    send({ type: 'answer', deal: again.id, act: 'refuse' });
    const r = s.world.raids.find((x) => x.city === 'sparta' && x.ended === 0);
    if (!r || stage === 'threat') return;
    // Let run out (as if nothing came): the band gathers and marches.
    send({ type: 'answer', deal: r.deal, act: 'refuse' });
    if (stage === 'raid') {
      while (!(r.phase === 'marching' && r.start + r.dur - s.tick <= RAID_DAYS * TICKS_PER_DAY) && r.phase !== 'raiding' && s.tick < r.start + 2 * TICKS_PER_YEAR) sim.step();
      waitFor(sim, s.tick, r.coin, s.tick);
      return;
    }
    // In your city: fire on for the raid (a demo's history is built with it off), at the farm with torches lit.
    hazards(sim, true);
    while (r.phase !== 'raiding' && s.tick < r.start + 2 * TICKS_PER_YEAR) sim.step();
    if (stage === 'raiders') {
      // (At the farm, a few hours after setting it alight.)
      for (let band = raidersOf(s, r); band && !band.back && !(band.wait > 0 && band.wait <= AT_TARGET - RAIDERS_IN); band = raidersOf(s, r)) sim.step();
      return;
    }
    while (raidersOf(s, r) && s.tick < r.start + TICKS_PER_YEAR) sim.step();
    sim.run(AFTER_DAYS * TICKS_PER_DAY);
  };
}

/**
 * Greece goes on (slice 21). #war: #caravan's town; once any war Greece has
 * going ends, Sparta's king declares war on Athens (the quarrel staged, and
 * named so); some weeks on, both armies stand facing each other at Megara,
 * food and fleece dear in both cities, and both rulers ask your city for
 * wheat for their armies; the map opens on Sparta's page. #peace: the same
 * war played to its end, Athens the winner (set for both demos): the armies on
 * their way home, Sparta's food dearer still; the map opens on Sparta's
 * prices. #festival: #athensship's town played on into July, the Panathenaia
 * on in Athens; the map opens on Athens' page.
 */
type GreeceStage = 'war' | 'peace' | 'festival';
/** How long #war's war has run when it opens (days): both armies at Megara, the prices moved. */
const WAR_DAYS = 25;
/** How long after #peace's war ended it opens (days): the armies on their way home. */
const PEACE_DAYS = 6;
/** How far into the Panathenaia #festival opens (days). */
const FESTIVAL_DAYS = 6;

function greeceTown(stage: GreeceStage): (sim: Sim) => void {
  return (sim) => {
    const s = sim.state;
    if (stage === 'festival') {
      seaTown('athensship')(sim);
      const n = nextFestival('athens', s.tick);
      if (n) sim.run(n.start + FESTIVAL_DAYS * TICKS_PER_DAY - s.tick);
      return;
    }
    routesTown('caravan')(sim);
    // (One war at a time in Greece: any war Greece has going is let run to its end first; one still on after a year is ended.)
    const stop = s.tick + TICKS_PER_YEAR;
    while (warOn(s.world) && s.tick < stop) sim.run(TICKS_PER_DAY);
    const on = warOn(s.world);
    if (on) endWar(s, on);
    const x = declareWar(s, 'sparta', 'athens', 'an old rivalry, and Athens weakened by its last war (set up for this demo)');
    // (Athens wins it, set for the demos, so #war played on ends as #peace shows.)
    x.fate = 'athens';
    if (stage === 'peace') {
      sim.run(x.until + PEACE_DAYS * TICKS_PER_DAY - s.tick);
      return;
    }
    sim.run(WAR_DAYS * TICKS_PER_DAY);
    // Both sides ask your city for wheat for their armies.
    for (const [id, foe] of [
      ['sparta', 'Athens'],
      ['athens', 'Sparta'],
    ] as const) {
      const c = cityOf(s.world, id);
      makeRequest(s, sim.map, c, 0, requestSize(s, c, 0), warWhy(0, foe));
    }
  };
}

/**
 * A world of rivals (slice 22). #rivals: #richtown's town (every chain, its
 * villas, the quay and the Tyre ship) given the north road and the caravan
 * yard as #caravan's town has them, and then, as the treasury allows, a route
 * to every city of Greece: Corinth by land, Athens by sea, Sparta by land,
 * Troy by sea, Corinth by sea and Athens by land. Each sells that city what it
 * buys of the town's goods, and Troy's ship brings fleece for the villas.
 * Played on a year with its routes, answering nothing, as Greece's own dice
 * have it; then what the year hasn't brought is set up and named so: a
 * request open, a threat running towards its deadline, and two rivals at war
 * with their armies on the map. #rivalsmap opens it on the map of Greece,
 * #rivalstreet at street level where the caravans come down to the yard.
 */
const RIVAL_ROUTES: Array<[CityId, 'land' | 'sea']> = [
  ['corinth', 'land'],
  ['athens', 'sea'],
  ['sparta', 'land'],
  ['troy', 'sea'],
  ['corinth', 'sea'],
  ['athens', 'land'],
];
/** How long #rivals trades with Greece before what it opens on is set up (from its first route). */
const RIVALS_TRADE = 12 * TICKS_PER_MONTH;
const FLEECE_K = 4;

function rivalsTown(): (sim: Sim) => void {
  return (sim) => {
    town(TOWN_TICKS, SAFE, true)(sim);
    const s = sim.state;
    const send = (c: Parameters<Sim['enqueue']>[0]): void => {
      sim.enqueue(c);
      sim.flush();
    };
    // The road north to the edge and the caravan yard at the east street's end, with a watch post and an architect beside it.
    const roads = (NORTH_ROAD.length + YARD_ROAD.length) * ROAD_COST;
    waitFor(sim, s.tick, roads + YARD_COST + WATCHPOST_COST + ARCHITECT_COST + (JOBS.yard + JOBS.watchpost + JOBS.architect) * WAGE);
    send({ type: 'road', tiles: [...NORTH_ROAD, ...YARD_ROAD] });
    send({ type: 'build', kind: 'yard', at: [T(YARD_AT.x, YARD_AT.z)] });
    send({ type: 'build', kind: 'watchpost', at: [T(YARD_WATCH.x, YARD_WATCH.z)] });
    send({ type: 'build', kind: 'architect', at: [T(YARD_ARCHITECT.x, YARD_ARCHITECT.z)] });
    // More oil, for Corinth (as #prices has it): two more olive groves up the road north, and a second press below them.
    waitFor(sim, s.tick, 2 * GROVE_COST + PRESS_COST + (2 * JOBS.grove + JOBS.press) * WAGE);
    send({ type: 'build', kind: 'grove', at: PRICES_GROVES });
    send({ type: 'build', kind: 'press', at: [PRICES_PRESS] });
    // Once the yard is staffed: a route to every city, one after another as the treasury can pay for them.
    const staffed = s.tick + ROUTE_WAIT;
    while (s.tick < staffed && !(rateOf(caravanYard(s)!) > 0)) sim.run(10);
    let first = 0;
    for (const [city, kind] of RIVAL_ROUTES) {
      const fee = routeWay(city, kind)!.fee;
      waitFor(sim, s.tick, fee + 300, s.tick + 6 * TICKS_PER_MONTH);
      if (routeRefusal(s, city, kind)) continue;
      send({ type: 'route', city, kind });
      first ||= s.tick;
      const { theyBuy, theySell } = tradesOf(s, city);
      for (const k of theyBuy) send({ type: 'deal', city, kind, good: TRADE_GOODS[k], sell: true });
      if (city === 'troy' && theySell.includes(FLEECE_K)) send({ type: 'deal', city, kind, good: FLEECE, buy: true, upto: 600 });
    }
    sim.run(Math.max(0, first + RIVALS_TRADE - s.tick));
    const map = sim.map;
    // Sparta's king, warlike: whatever he has asked of the city by now is refused (as a player keeping his coin would), and he threatens it (set up for the demo, and named so).
    const sparta = cityOf(s.world, 'sparta');
    for (const d of s.world.deals.filter((x) => x.city === 'sparta' && x.state === 'open')) send({ type: 'answer', deal: d.id, act: 'refuse' });
    if (!liveRaid(s.world) && moodOf(sparta, s.tick) <= COLD) threaten(s, map, sparta, 'you paid him no tribute, and the king is warlike (set up for this demo)');
    // A war at sea between Troy and Athens, the two cities your ships trade with on either side of the Aegean (any war Greece has going is let run to its end first).
    const stop = s.tick + TICKS_PER_YEAR;
    while (warOn(s.world) && s.tick < stop) sim.run(TICKS_PER_DAY);
    const on = warOn(s.world);
    if (on) endWar(s, on);
    const x = declareWar(s, 'troy', 'athens', 'an old grudge over the grain ships in the straits (set up for this demo)');
    // On until both fleets stand off Andros.
    while (armiesOnMap(x, s.tick).some((a) => a.phase === 'out') && s.tick < x.until) sim.run(TICKS_PER_DAY);
    // The archon of Athens asks the city for wheat for the war, by its end (set up for the demo: the dice would bring it within a month or two).
    const athens = cityOf(s.world, 'athens');
    const left = Math.floor((x.until - s.tick) / TICKS_PER_MONTH) * TICKS_PER_MONTH;
    // As a war's own requests do, it asks for wheat only if wheat sent at once could reach Athens by then, else for coin to pay
    // their men. (From this town, goods take about 95 days to reach Athens, so a request for wheat due in 90 could only be met
    // late: phase 3's review.)
    const size = requestSize(s, athens, WHEAT_K);
    if (deadlineFor(s, map, 'athens', WHEAT_K, size, TICKS_PER_MONTH) <= left) makeRequest(s, map, athens, WHEAT_K, size, warWhy(WHEAT_K, 'Troy', 'sea'), left);
    else makeRequest(s, map, athens, -1, requestCoin(s), 'to pay their soldiers: they are at war with Troy', left);
    // It opens with caravans in the streets and a ship at the quay or coming in up the bay.
    const ships = (): boolean => s.world.routes.some((r) => r.ship && (r.ship.phase === SHIP_MOORED || r.ship.phase === SHIP_COMING)) || s.trade.ship.phase === SHIP_MOORED;
    const caravans = (): number => s.walkers.filter((w) => w.kind === 'caravan').length;
    const end = s.tick + 2 * TICKS_PER_MONTH;
    while (s.tick < end && !(caravans() >= 2 && ships())) sim.step();
  };
}

/**
 * The sea route demos: #quay's town (the post built, wheat, meat, cheese and
 * oil for sale to the Tyre ship) with the sea route to Athens opened, wheat
 * and meat ticked for sale to it and wine bought, up to 600. #athensship
 * opens the route so that her first call comes half-way between the Tyre
 * ship's (the surplus waiting on the quay) and plays on until the Athenian
 * ship is most of the way in up the bay. #anchor opens it so that her first call
 * comes two days after the Tyre ship has tied up, and opens as she rides at
 * anchor, waiting her turn. Each opens it on a visit the treasury can pay for.
 */
type SeaStage = 'athensship' | 'anchor' | 'famine';
/** How many days before the harvests come in #famine opens. */
const FAMINE_DAYS = 5;
/** How far in from the horizon #athensship's ship is when it opens (0..1 of her way in). */
const ATHENS_INWARD = 0.7;

function seaTown(stage: SeaStage): (sim: Sim) => void {
  return (sim) => {
    tradeTown('trade')(sim);
    const s = sim.state;
    const send = (c: Parameters<Sim['enqueue']>[0]): void => {
      sim.enqueue(c);
      sim.flush();
    };
    send({ type: 'build', kind: 'trading', at: [T(QUAY_POST.x, QUAY_POST.z)] });
    for (const good of TRADE_SELL) send({ type: 'trade', good, sell: true });
    const fee = routeWay('athens', 'sea')!.fee;
    const ship = s.trade.ship;
    const end = s.tick + 4 * SHIP_EVERY;
    // #anchor: her first call two days after the Tyre ship ties up; #athensship: half-way between the Tyre ship's calls, with the surplus on the quay.
    // Opened that long before, on a visit the treasury can pay for.
    const lead = firstShipAfter('athens') - (stage === 'anchor' ? 2 * TICKS_PER_DAY : -Math.round(SHIP_EVERY / 2));
    while (s.tick < end && !(ship.due - lead <= s.tick + 1 && s.money >= fee + wageBill(s))) {
      if (ship.due - lead <= s.tick) sim.run(Math.max(1, ship.due + SHIP_EVERY - lead - s.tick - 30));
      else sim.run(1);
    }
    send({ type: 'route', city: 'athens', kind: 'sea' });
    for (const good of [WHEAT, MEAT]) send({ type: 'deal', city: 'athens', kind: 'sea', good, sell: true });
    // (Up to 600, about 430 dr: what this town can spare as she comes.)
    send({ type: 'deal', city: 'athens', kind: 'sea', good: WINE, buy: true, upto: 600 });
    const r = routeOf(s, 'athens', 'sea');
    if (stage === 'famine') {
      // #famine: Athens' fields look parched this summer (Greece's dice, set so for the demo: its harvest is drawn a year
      // ahead, and this one is set to fail), played on to a few days before the harvests come in.
      cityOf(s.world, 'athens').outlook = 0;
      const harvest = lastHarvest(s.tick) + TICKS_PER_YEAR;
      sim.run(Math.max(0, harvest - FAMINE_DAYS * TICKS_PER_DAY - s.tick));
      return;
    }
    const ready = (): boolean => {
      const v = r?.ship;
      if (!v) return true;
      // #athensship: coming in up the bay, a few seconds from the jetty (she is only there a few days); #anchor: just anchored.
      if (stage === 'athensship') return v.phase === SHIP_MOORED || (v.phase === SHIP_COMING && (visitorAt(v, s.tick)?.inward ?? 0) >= ATHENS_INWARD);
      return v.phase === SHIP_ANCHORED && s.tick - v.since >= 2;
    };
    const stop = s.tick + 2 * SHIP_EVERY;
    while (s.tick < stop && !ready()) sim.step();
  };
}

/**
 * Bronze and the barracks (slice 23). #bronze: #richtown's town carried on,
 * as its builder would: a road up from the top of the oil road into the east
 * hills, a copper mine on the richest rock there and an armoury on the oil
 * road beside the storehouse, played on until the first armour is in the
 * stores (the rest of the outcrop is free for another mine, the mine tool in
 * hand). #barracks: the same town once there is armour for a company, a
 * barracks beside the armoury and a company of hoplites just raised, the men
 * walking in from their homes. #companies: a company of archers raised there
 * too, both filled and drilling, the hoplites' banner in hand.
 */
const ARMS_MINE = { x: 107, z: 9 };
/** The road's end beside the mine (its west side). */
const ARMS_ROAD_END = { x: 106, z: 9 };
/** The armoury on the oil road below the storehouse the mine's carts bring their ore to (higher up, the slope is too steep for it); the barracks on the open ground east of it, a short lane off the oil road between the storehouse and the watch post. */
const ARMS_ARMOURY = { x: 87, z: 36 };
const ARMS_BARRACKS = { x: 89, z: 31 };
const ARMS_LANE = row(87, 88, 31);
/** How long #bronze looks for its first sets of armour in the stores (four months at most). */
const BRONZE_WAIT = 4 * TICKS_PER_MONTH;
/** The sets #bronze waits for, and #barracks for a company. */
const BRONZE_SETS = 4;
/** #barracks plays on after the company is raised until this many of its men are in (the rest on their way), a month at most. */
const BARRACKS_IN = COMPANY_SIZE / 2;
/** The longest #companies waits for its two companies to fill (three months). */
const COMPANIES_WAIT = 3 * TICKS_PER_MONTH;
type ArmsStage = 'bronze' | 'barracks' | 'companies';
const storedOf = (s: SimState, w: number): number => s.buildings.reduce((a, b) => a + (b.kind === 'storehouse' ? held(b, w) : 0), 0);
function armsTown(stage: ArmsStage): (sim: Sim) => void {
  return (sim) => {
    town(TOWN_TICKS, SAFE, true)(sim);
    const s = sim.state;
    const send = (c: Parameters<Sim['enqueue']>[0]): void => {
      sim.enqueue(c);
      sim.flush();
    };
    const road = roadRoute(sim.map, s, T(TOWN_OIL_X, TOWN_OIL_ROAD), T(ARMS_ROAD_END.x, ARMS_ROAD_END.z)) ?? [];
    waitFor(sim, s.tick, road.length * ROAD_COST + MINE_COST + ARMOURY_COST + (JOBS.mine + JOBS.armoury) * WAGE);
    send({ type: 'road', tiles: road });
    send({ type: 'build', kind: 'mine', at: [T(ARMS_MINE.x, ARMS_MINE.z)] });
    send({ type: 'build', kind: 'armoury', at: [T(ARMS_ARMOURY.x, ARMS_ARMOURY.z)] });
    const sets = stage === 'bronze' ? BRONZE_SETS : COMPANY_SIZE;
    const end = s.tick + (stage === 'bronze' ? BRONZE_WAIT : 2 * BRONZE_WAIT);
    while (s.tick < end && storedOf(s, ARMOUR) < sets) sim.run(10);
    if (stage === 'bronze') return;
    waitFor(sim, s.tick, ARMS_LANE.length * ROAD_COST + BARRACKS_COST + JOBS.barracks * WAGE);
    send({ type: 'road', tiles: ARMS_LANE });
    send({ type: 'build', kind: 'barracks', at: [T(ARMS_BARRACKS.x, ARMS_BARRACKS.z)] });
    const barracks = s.buildings.find((b) => b.kind === 'barracks');
    if (!barracks) return;
    // Raised once it has its staff (they are shared out once a day), as a player would.
    const staffed = s.tick + 2 * TICKS_PER_DAY;
    while (s.tick < staffed && barracks.workers === 0) sim.step();
    send({ type: 'raise', barracks: barracks.id, kind: 'hoplite' });
    if (stage === 'barracks') {
      // Until half the men are in, waiting for their armour, and the porter is on his way back with it (or someone is ready).
      const until = s.tick + TICKS_PER_MONTH;
      const inside = (): number => s.army.soldiers.filter((x) => x.state === 'arming' || x.state === 'ready').length;
      const bringing = (): boolean => s.walkers.some((w) => w.kind === 'porter' && w.origin === barracks.id && w.load > 0);
      while (s.tick < until && !(inside() >= BARRACKS_IN && bringing()) && !s.army.soldiers.some((x) => x.state === 'ready')) sim.step();
      return;
    }
    send({ type: 'raise', barracks: barracks.id, kind: 'archer' });
    const full = (): boolean => s.army.companies.length >= 2 && s.army.companies.every((c) => readyOf(s, c).length >= COMPANY_SIZE);
    const stop = s.tick + COMPANIES_WAIT;
    while (s.tick < stop && !full()) sim.run(10);
    // A few days' drill after the last man came in.
    sim.run(2 * TICKS_PER_DAY);
  };
}
/** The prepared towns of the arms demos (one setup each, shared). */
const BRONZE = armsTown('bronze');
const BARRACKS = armsTown('barracks');
const COMPANIES = armsTown('companies');
/** #companies: the hoplites' banner in hand. */
const hoplitesBanner = (s: SimState): number => s.army.companies.find((c) => c.kind === 'hoplite')?.id ?? 0;

/**
 * Every demo's history is built with fire risk and wear switched off (so a
 * town from before slice 12 grows exactly as it did, and every demo opens
 * with no risk or wear anywhere), and switched on as it opens. A demo about
 * fire switches them on itself, part-way through its history.
 */
function calm(setup: (sim: Sim) => void): (sim: Sim) => void {
  return (sim) => {
    hazards(sim, false);
    setup(sim);
    hazards(sim, true);
  };
}

/** Switch fire risk and wear on or off now (a command, so a replay of the log does the same). */
function hazards(sim: Sim, on: boolean): void {
  if (sim.state.hazards === on) return;
  sim.enqueue({ type: 'hazards', on });
  sim.flush();
}

/** The prepared town of #rivals (one setup for its three demos). */
const RIVALS = rivalsTown();

const SCENES: Record<string, Demo> = {
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
  pasture: { view: 'pasture', setup: cultureTown(FINE_TICKS), overlay: 'fleece' },
  fleecevendor: { view: 'fleecevendor', setup: cultureTown(FINE_TICKS), follow: 'fleece', overlay: 'fleece', overlayOn: true },
  vineyard: { view: 'vineyard', tool: 'vineyard', setup: cultureTown(FINE_TICKS), overlay: 'wine' },
  villas: { view: 'villas', setup: villaTown(VILLAS_AFTER), overlay: 'missing', open: firstVilla },
  winery: { view: 'winery', setup: villaTown(WINERY_AFTER), follow: 'cart', followFrom: 'vineyard', overlay: 'wine' },
  winevendor: { view: 'winevendor', setup: villaTown(VILLAS_AFTER), follow: 'wine', overlay: 'wine', overlayOn: true },
  fire: { view: 'east', speed: 'paused', tool: 'watchpost', setup: fireTown('smoke'), overlay: 'fire', overlayOn: true },
  blaze: { view: 'east', setup: fireTown('blaze'), overlay: 'fire' },
  rubble: { view: 'east', tool: 'clear', setup: fireTown('rubble'), overlay: 'fire' },
  creak: { view: 'east', speed: 'paused', tool: 'architect', setup: creakTown, overlay: 'wear', overlayOn: true },
  watchman: { view: 'town', setup: town(TOWN_TICKS), follow: 'watchman', overlay: 'fire', overlayOn: true },
  inspector: { view: 'town', setup: town(TOWN_TICKS), follow: 'inspector', overlay: 'wear', overlayOn: true },
  trade: { view: 'quay', tool: 'trading', setup: tradeTown('trade'), overlay: 'food' },
  quay: { view: 'quay', setup: tradeTown('quay'), overlay: 'food', trade: true },
  sail: { view: 'sail', setup: tradeTown('sail'), overlay: 'food' },
  ship: { view: 'ship', setup: tradeTown('ship'), overlay: 'food' },
  black: { view: 'quay', speed: 'paused', setup: tradeTown('black'), overlay: 'food', ledger: true },
  richtown: { view: 'richtown', setup: town(TOWN_TICKS, SAFE, true), overlay: 'missing' },
  richstreet: { view: 'richstreet', setup: town(TOWN_TICKS, SAFE, true), overlay: 'missing' },
  // Slice 15: the map of Greece over #town; over #sail's town, with the Tyre ship sailing up the gulf; and Sparta's ruler met.
  greece: { view: 'town', setup: town(TOWN_TICKS), overlay: 'missing', greece: true },
  greecesail: { view: 'sail', setup: tradeTown('sail'), overlay: 'food', greece: true },
  ruler: { view: 'town', setup: town(TOWN_TICKS), overlay: 'missing', greece: 'sparta' },
  // The side panel: #richtown with the panel open on wine's page (every chain is at work there, and the ship buys).
  goods: { view: 'richtown', setup: town(TOWN_TICKS, SAFE, true), overlay: 'missing', side: { ware: WINE } },
  // Slice 16: routes and traders.
  routes: { view: 'town', setup: routesTown('routes'), overlay: 'missing', greece: 'corinth', greeceTab: 'trade' },
  caravan: { view: 'caravan', setup: routesTown('caravan'), overlay: 'missing', follow: 'caravan' },
  buywine: { view: 'yard', setup: routesTown('buywine'), overlay: 'wine' },
  athensship: { view: 'ship', setup: seaTown('athensship'), overlay: 'food', trade: 'athens-sea' },
  anchor: { view: 'anchor', setup: seaTown('anchor'), overlay: 'food' },
  // Slice 17: prices that move. Oil sold to Corinth caravan after caravan, its price sliding; and a failed harvest in Athens, days away.
  prices: { view: 'town', setup: routesTown('prices'), overlay: 'oil', greece: 'corinth', greeceTab: 'prices' },
  famine: { view: 'ship', setup: seaTown('famine'), overlay: 'food', greece: 'athens', greeceTab: 'prices' },
  // Slice 18: rulers who remember. A gift to send; a ruler turned hostile, the road closed; a ruler's gift back on the road.
  gift: { view: 'town', setup: routesTown('routes'), overlay: 'missing', greece: 'corinth', greeceTab: 'ruler' },
  hostile: { view: 'yard', setup: rulerTown('hostile'), overlay: 'wine', greece: 'corinth', greeceTab: 'ruler' },
  thanks: { view: 'town', setup: rulerTown('thanks'), overlay: 'missing', greece: 'corinth', greeceTab: 'ruler' },
  // Slice 19: favours, offers and tribute. Sparta asks for wheat; a promise to Athens about to be broken; Corinth's offer for oil; Sparta's demand for tribute.
  request: { view: 'yard', setup: favourTown('request'), overlay: 'food', greece: 'sparta', greeceTab: 'ruler' },
  promise: { view: 'quay', setup: favourTown('promise'), overlay: 'food', greece: 'athens', greeceTab: 'ruler' },
  offer: { view: 'yard', setup: favourTown('offer'), overlay: 'oil', greece: 'corinth', greeceTab: 'ruler' },
  tribute: { view: 'town', setup: favourTown('tribute'), overlay: 'missing', greece: 'sparta', greeceTab: 'ruler' },
  // Slice 20: raiders at the edge. Sparta's threat; his band on the road; in your city at a farm; some weeks after.
  threat: { view: 'raidwest', setup: raidTown('threat'), overlay: 'food', greece: 'sparta', greeceTab: 'ruler' },
  raid: { view: 'raidwest', setup: raidTown('raid'), overlay: 'food', greece: 'sparta', greeceTab: 'ruler' },
  raiders: { view: 'raidfarm', setup: raidTown('raiders'), overlay: 'food' },
  aftermath: { view: 'raidwest', setup: raidTown('aftermath'), overlay: 'food', ledger: true },
  // Slice 21: Greece goes on. Sparta and Athens at war, both asking for wheat; the war over, Athens the winner; the Panathenaia on in Athens.
  war: { view: 'town', setup: greeceTown('war'), overlay: 'food', greece: 'sparta', greeceTab: 'ruler' },
  peace: { view: 'town', setup: greeceTown('peace'), overlay: 'food', greece: 'sparta', greeceTab: 'prices' },
  festival: { view: 'ship', setup: greeceTown('festival'), overlay: 'food', greece: 'athens', greeceTab: 'ruler' },
  // Slice 22: a world of rivals. The prepared town trading with every city, over the town; on the map of Greece; at street level by the yard.
  rivals: { view: 'rivals', setup: RIVALS, overlay: 'missing' },
  rivalsmap: { view: 'rivals', setup: RIVALS, overlay: 'missing', greece: true },
  rivalstreet: { view: 'rivalstreet', setup: RIVALS, overlay: 'missing' },
  // Slice 23: bronze and the barracks. The copper on the east hills with the mine tool in hand; a company raised, its men walking in; two companies ready, a banner in hand.
  bronze: { view: 'bronze', tool: 'mine', setup: BRONZE, overlay: 'missing' },
  barracks: { view: 'barracks', setup: BARRACKS, overlay: 'missing', side: { tab: 'army' } },
  companies: { view: 'companies', setup: COMPANIES, overlay: 'missing', side: { tab: 'army' }, select: hoplitesBanner },
};

export const DEMOS: Record<string, Demo> = Object.fromEntries(Object.entries(SCENES).map(([k, d]) => [k, d.setup ? { ...d, setup: calm(d.setup) } : d]));
