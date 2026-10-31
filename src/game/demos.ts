/**
 * Prepared scenes for demo links. Each one builds through the sim's command
 * queue (so it is an ordinary, replayable game) and runs the clock on a
 * little so there is something to see.
 */
// Slice 42: every demo before it is on the Bay.
import { BAY, type Land } from '../map/lands';
// Slice 46: the other kinds of land, founded as from the new-game screen.
import { seedOf, type LandKind } from '../map/lands';
import { roadsIn } from '../map/landcheck';
import type { OverlayMode } from '../render/overlay';
import { ARCHITECT_COST, ARMOURY_COST, BARRACKS_COST, FARM_COST, MINE_COST, GROVE_COST, PASTURE_COST, PRESS_COST, ROAD_COST, SHIPYARD_COST, STALL_COST, STOREHOUSE_COST, THEATRE_COST, TOWER_COST, TRADING_COST, VINEYARD_COST, WATCHPOST_COST, WINERY_COST, YARD_COST } from '../sim/build';
import { COTTAGE, FINE, JOBS, VILLA } from '../sim/buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from '../sim/clock';
import { untilOf, warningOf, warningsOf } from '../sim/folk';
import { ARMOUR, CHEESE, FLEECE, gi, held, MEAT, OIL, WHEAT, WINE } from '../sim/foods';
import { COMPANY_SIZE, HIRELINGS, readyOf } from '../sim/army';
import { roadRoute } from '../sim/roads';
import { FIRE_BURNING, FIRE_SMOULDER, BURNT } from '../sim/hazards';
import type { Sim } from '../sim/sim';
import { FAIR, HARSH, HEAVY, purseTotal } from '../sim/taxes';
import { owedWages, spendable, WAGE, wageBill } from '../sim/treasury';
import type { Building, SimState } from '../sim/state';
import { GATE_COST, GATE_HP, WALL_COST } from '../sim/walls';
import { dockersOut, FIRST_SHIP, OLD_GOODS, SAIL_IN, SHIP_ANCHORED, SHIP_AWAY, SHIP_COMING, SHIP_EVERY, SHIP_MOORED, TRADE_GOODS, tradingPost } from '../sim/trade';
import { caravanOf, caravanYard, firstShipAfter, routeOf, routeRefusal, routeWay, tradesOf, visitorAt } from '../sim/routes';
import { cityOf, COLD, lastHarvest, moodOf, sellsAndBuys } from '../sim/world';
import { giftFrom, giftTo, rulerGift } from '../sim/diplomacy';
import { rateOf } from '../sim/labour';
import { FOOD_LASTS } from '../sim/food';
import { WATER_LASTS } from '../sim/water';
import { ASK_GAP, askWhy, deadlineFor, firstRoute, MOST_OPEN, openDeals, makeOffer, makeRequest, makeTribute, requestCoin, requestSize, tributeSize, warWhy } from '../sim/favours';
import { armiesOnMap, declareWar, endWar, warOn } from '../sim/rivals';
import { ASK_SUMS, loanOfDeal, loanSize, makeLoanAsk, repaysOnTheDay, spareOf, stageDefault, stageRepay, STEP_GAP, troubles } from '../sim/loans';
import { nextFestival } from '../sim/festivals';
// Slice 30.
import { daysToThief, temptationOf } from '../sim/crime';
import { townLines } from '../sim/status';
import { FAIR as WX_FAIR, lateDays, weatherNow } from '../sim/seasons';
import { AT_TARGET, bandOut, GATHER, liveRaid, marchTicks, raidersOf, reachesEdge, threaten, THREAT_DAYS, threatLive } from '../sim/raids';
// Slice 36.
import { onSchedule, seasonAt, WINTER } from '../sim/seasons';
import { ESTATE_PLOT_COST, FOUNTAIN_COST, HORSEFARM_COST, SHRINE_COST } from '../sim/build';
import { bridgeSpan, Ground, mapIndex, roadRefusal } from '../sim/build';
import { capacity, ESTATE, GREAT_ESTATE } from '../sim/buildings';
import { companySize } from '../sim/army';
import { estateWarnings } from '../sim/estates';
import { CREW, daysToBeach, pirateBand, shipsOf, TRIREME_COST } from '../sim/fleet';
// Slice 38: a blockade staged, a trireme under repair.
import { stageBlockade } from '../sim/blockades';
import { dhypot, sq } from '../map/dmath';
import type { CityId } from '../map/greece';
import { bow, COLONY_SAIL, coloniesOf, nearestFree, sendSettlers, vassalsOf } from '../sim/growth';
import type { Speed } from './clockDriver';
// Slice 34
import { take, tributeGoods, tributeYear, vassalOf } from '../sim/vassals';
import { end as endLoan } from '../sim/loans';
import type { ToolName } from './tools';
// Slice 32.
import { LOGGERS_COST, QUARRY_COST } from '../sim/build';
import { MARBLE, TIMBER } from '../sim/foods';
// Slice 35.
import { gamesOn, LIGHTHOUSE_COST, MASONS_COST, monumentOf, progressOf, STADIUM_COST } from '../sim/monuments';
import { cartsTo } from '../sim/monumentworks';
// Slice 39.
import { achieved } from '../sim/ambitions';
import { COLOSSUS_COST, totalOf } from '../sim/monuments';
import { COPPER, setHeld } from '../sim/foods';
import { note } from '../sim/stockbook';
// Slice 43
import { askColony, spareOf as storesSpare, STAGE_FROM, stageOf, WORKS } from '../sim/colonyworks';
import { storeKind } from '../sim/trade';
// Slice 37
import { colonyOf, foundingOf, foundRefusal, FOUND_COST } from '../sim/colonies';
// Slice 47.
import { fightOdds, fightRoll, plantColony, siteRecord, threatenColony, type Colony, type ColonyThreat } from '../sim/colonies';
import { ownDefence, stageFor } from '../sim/colonyworks';
import { news } from '../sim/diplomacy';
import { allyOf } from '../sim/vassals';
// Slice 40
import { sendBlockade } from '../sim/blockades';
// Slice 41.
import { setOutAs, type CrimeKind } from '../sim/crime';
import { crimeTargetsFrom, type Target } from '../sim/misdeeds';
// Slice 48
import { ACCEPT, EMPTY, GET } from '../sim/stores';
import type { Walker } from '../sim/state';
// Slice 45.
import { COURT_COST, PRISON_COST } from '../sim/build';
import { isCriminal, setOut, startChase, targetFor } from '../sim/crime';
import { position } from '../sim/walk';
import { skim } from '../sim/misdeeds';
import { isAway } from '../sim/justice';
import { ageOf } from '../sim/folk';
import { livedIn } from '../sim/buildings';
// Slice 51
import type { OverviewPage } from '../ui/overview';
// Slice 49
import { buildingRefusal, INFIRMARY_COST } from '../sim/build';
import { fallIll, PHYSICIAN_RANGE, startGreekPlague } from '../sim/health';
import { roadsBeside } from '../sim/rounds';
// Slice 52
import { clearFee, COST } from '../sim/build';
import { FIRE_NONE } from '../sim/hazards';
import { footSide } from '../sim/buildings';
import type { BuildKind } from '../sim/commands';
import { AGORA_COST, DAIRY_COST, LODGE_COST, PLOT_COST, TAX_OFFICE_COST } from '../sim/build';
import { FOUND_WHEAT } from '../sim/colonies';
import { REFUSE } from '../sim/stores';
// Slice 55
import { lairSpot, sendMonster, STIR, type Beast } from '../sim/monsters';
import { MONSTER_IDS, type MonsterId } from '../sim/pantheon';
import { centreOf } from '../sim/buildings';
import { walkable } from '../sim/wild';
// Slice 56
import { GOD_IDS, honour } from '../sim/pantheon';
// Slice 54: sanctuaries.
import { SANCTUARY_COST } from '../sim/build';
import { needOf, siteMaterials, stagesOf, workOf, type Site } from '../sim/monuments';
import { type GodId } from '../sim/pantheon';
import { sanctuaryOf } from '../sim/sanctuaries';
import { income } from '../sim/treasury';
import { TILE_ROAD } from '../sim/state';
// Slice 53 (honour and GodId come in above)
import { GODS } from '../sim/pantheon';
import { HORSES } from '../sim/foods';
import { festivalGoods, festivalUnderWay } from '../sim/worship';
// Slice 57
import { sideOf } from '../sim/buildings';
import { moodOfGod } from '../sim/pantheon';
import { beginOmen } from '../sim/wrath';

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
/**
 * #closed played on from CLOSED_TICKS until a dozen fine houses warn of plays
 * alone, or the most urgent home is 27 days from going down, whichever comes
 * first (four months at most). With the crews of actors (rounds.ts, CREW)
 * every fine house had plays lately when the theatre went, so they run out
 * nearer together, and later, than one actor's left them.
 */
function closedTown(sim: Sim): void {
  cultureTown(CLOSED_TICKS, true, true)(sim);
  const s = sim.state;
  const ready = (): boolean => {
    let plays = 0;
    let least = Infinity;
    for (const b of homes(s)) {
      const w = warningsOf(s, b);
      if (b.level === FINE && w.length === 1 && w[0].need === 'culture') plays++;
      for (const x of w) least = Math.min(least, x.left);
    }
    return plays >= 12 || least <= 27 * TICKS_PER_DAY;
  };
  const end = s.tick + 4 * TICKS_PER_MONTH;
  while (s.tick < end && !ready()) sim.run(10);
}

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
  greeceTab?: 'ruler' | 'prices' | 'trade' | 'loans' | 'rivals' | 'empire';
  /** Open the side panel from the start, on a tab or a ware's page (whatever the window's width or the last visit chose). */
  side?: { tab?: 'population' | 'husbandry' | 'industry' | 'distribution' | 'safety' | 'administration' | 'culture' | 'mythology' | 'military' | 'goods' | 'people' | 'services' | 'money' | 'army' | 'monuments'; ware?: number; fleet?: boolean };
  /** The company whose banner is in hand from the start (a company id, 0 for none). */
  select?: (s: SimState) => number;
  /** Slice 38: open the shipyard's panel from the start. */
  shipyard?: boolean;
  // Slice 39
  /** Open the Ambition panel from the start. */
  ambition?: boolean;
  // Slice 44
  /** Open the Messages panel from the start. */
  messages?: boolean;
  /** A demo opens with its town's messages read, but for those of the last so many ticks (none if not given). */
  unread?: number;
  // Slice 48
  /** The building whose panel is open from the start (a building id, 0 for none). */
  building?: (s: SimState) => number;
  // Slice 51
  /** Open the overview from the start, on this page (as if O had been pressed). */
  overview?: OverviewPage;
  // Slice 53
  /** Open Olympus from the start, on a god's page or on the twelve ('all'). */
  olympus?: GodId | 'all';
}

const T = (x: number, z: number): number => z * BAY.size + x;
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
function cutTown(after: number, both = false): (sim: Sim) => void {
  const clear = { type: 'clear', x0: CUT.x, z0: CUT.z, x1: CUT.x, z1: CUT.z } as const;
  // (#warning: the road is cut once the water carriers and the food vendors have both been down the west
  // street lately, so its homes run dry of both within a month of each other, as they did with one of each.)
  const fresh = (s: SimState): boolean =>
    homes(s)
      .filter((b) => b.x <= 22 && (b.z === 72 || b.z === 75))
      .every((b) => b.waterUntil - s.tick >= WATER_LASTS - TICKS_PER_MONTH && untilOf(b, 'food') - s.tick >= FOOD_LASTS - TICKS_PER_MONTH);
  const cut = foodTown(FOOD_TICKS + after, 400, 200, {
    then: (at) => {
      const sim = at.sim!;
      if (both) {
        if (sim.state.tick < FOOD_TICKS) sim.run(FOOD_TICKS - sim.state.tick);
        const end = FOOD_TICKS + 2 * TICKS_PER_MONTH;
        while (sim.state.tick < end && !fresh(sim.state)) sim.run(10);
      }
      at(Math.max(FOOD_TICKS, sim.state.tick), clear);
    },
  });
  if (!both) return cut;
  // (#warning: and on, forty days at most, until a home warns of both water and bread: with the crews of
  // walkers, the vendors' last visit and the carriers' fall a little apart.)
  return (sim) => {
    cut(sim);
    const end = sim.state.tick + 40 * TICKS_PER_DAY;
    // (Its story too: a home notes a warning on its day, so on until every home warned of both has noted them.)
    const both = (b: Building): boolean => warningsOf(sim.state, b).length >= 2;
    const noted = (): boolean => homes(sim.state).some(both) && homes(sim.state).every((b) => !both(b) || (b.family?.warned.length ?? 0) >= 2);
    while (sim.state.tick < end && !noted()) sim.run(10);
  };
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
      if (!at.sim || waitFor(at.sim, SHRINE_AT, 2 * (FARM_COST + JOBS.farm * WAGE) + 3 * ROAD_COST, ticks)) {
        at(SHRINE_AT, { type: 'road', tiles: row(51, 53, 63) });
        at(SHRINE_AT, { type: 'build', kind: 'farm', at: [T(41, 60), T(51, 64)] });
      }
      let late = 0;
      if (theatre) {
        // Fleece for the fine houses to come, a month before the theatre (see FLEECE_AT).
        if (at.sim) waitFor(at.sim, FLEECE_AT, FLEECE_COST);
        laneFleece(at, FLEECE_AT);
        // (The fleece set the treasury back: the theatre can wait longer for its money than other things. And,
        // since the crews of walkers' histories, a hundred drachmas to spare: with none, #fine owed 10 dr of wages a month on.)
        if (at.sim) waitFor(at.sim, THEATRE_AT, THEATRE_COST + JOBS.theatre * WAGE + 100, THEATRE_AT + 2 * AFFORD_WAIT);
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
 * #villas and #winevendor: and on (a fortnight at most) until every villa has its wine. (Slice 33: with the
 * seasons' history the vendor had not yet been round to the newest villa as it opened.)
 */
const villasTown = (sim: Sim): void => {
  villaTown(VILLAS_AFTER)(sim);
  const s = sim.state;
  const dry = (): boolean => s.buildings.some((b) => b.kind === 'home' && b.level === VILLA && b.people > 0 && b.goodsUntil[gi(WINE)] <= s.tick);
  // (Since the crews of walkers the town can pay for its vines sooner, and their first vintages reach fewer
  // villas by VILLAS_AFTER: on, two months at most, until a dozen have filled.)
  const villas = (): number => s.buildings.filter((b) => b.kind === 'home' && b.level === VILLA && b.people > 0).length;
  const most = s.tick + 2 * TICKS_PER_MONTH;
  while (s.tick < most && villas() < 12) sim.run(10);
  const end = s.tick + 14 * TICKS_PER_DAY;
  while (s.tick < end && dry()) sim.run(10);
};

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
 * #overhunt, and on (half a year at most) until the deer are down to their last few head. (Slice 33: the lodges go in
 * at the end of February, and with the seasons the herds grow back twice as fast through the spring, so three months
 * on they were not yet thinned.)
 */
function overhuntThin(sim: Sim): void {
  overhuntTown(OVERHUNT_TICKS)(sim);
  const s = sim.state;
  const end = s.tick + 6 * TICKS_PER_MONTH;
  while (s.tick < end && !s.herds.some((h) => h.kind === 'deer' && h.head <= 3)) sim.run(TICKS_PER_DAY);
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

/**
 * What #town's builder keeps back besides the east street's 820 dr before it lays the street out: nothing, but in
 * #ambition's town (the merge of slice 39 with the trunk). There Thebes' 300 dr for a thriving town comes in June of
 * year 2, so the street went in two months sooner than in #vassal's history, the treasury ran dry under the new
 * buildings' wages and the heavy taxes, and the wages went unpaid for a month (tests/treasury.test.ts). Set only while
 * that setup runs, so every other town's history is as before.
 */
let eastSpare = 0;
function town(opening: number, safety: Safety = SAFE, rich = false, richWatch = true): (sim: Sim) => void {
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
    // The street east of the core, with its own fountain, agora and tax office (and, for #ambition's town, a month's spare: see EAST_SPARE).
    afford(3900, 820 + eastSpare);
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
    const watch = [...safety.watch, ...(rich && richWatch ? [RICH_WATCH] : [])];
    const architects = [...safety.architects, ...(rich ? [RICH_ARCHITECT] : [])];
    if (watch.length) at(ticks - lead, { type: 'build', kind: 'watchpost', at: watch.map((p) => T(p.x, p.z)) });
    if (architects.length) at(ticks - lead, { type: 'build', kind: 'architect', at: architects.map((p) => T(p.x, p.z)) });
    if (sim.state.tick < ticks) sim.run(ticks - sim.state.tick);
    // (Slice 33: and on, a fortnight at most, until the agoras' vendors have been round every home with its bread,
    // meat and cheese: with the seasons' history a few homes in the core were a week past their food as it opened.)
    {
      const s = sim.state;
      const unfed = (): boolean => townLines(s, sim.map).some((l) => l.need === 'food' && /going without/.test(l.text));
      // (And, but for #richtown's builder, who leaves no room for them, the first settlers in tents on the newest plots, as it had.)
      const tents = (): boolean => rich || s.buildings.some((b) => b.kind === 'home' && b.level === 1 && b.people > 0);
      const end = s.tick + 15 * TICKS_PER_DAY;
      while (s.tick < end && (unfed() || !tents())) sim.run(10);
    }
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
  // (And a hundred drachmas to spare: since the crews of walkers' histories, with none the town owed 16 dr of wages a month on.)
  afford(RICH_WINE_AT, RICH_WINE_COST + 100);
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
 * post as soon as the treasury can pay for it (about a month and a half)
 * and turns taxes off, as #dry does, so the treasury runs dry and wages go
 * unpaid; it puts all six goods up for sale, keeping less for the town, for
 * the first ship that comes after that, and opens as her sail shows, the
 * quay stacked.
 */
const TRADE_AFTER = 4 * TICKS_PER_MONTH;
const TRADE_SELL = [WHEAT, MEAT, CHEESE, OIL];
/** #black sells everything, keeping less: wheat 800, meat, cheese and oil 200 (fleece and wine as usual). */
const BLACK_KEEP: Array<[number, number]> = [[WHEAT, 800], [MEAT, 200], [CHEESE, 200], [OIL, 200], [FLEECE, 600], [WINE, 600]];
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
    const ship = s.trade.ship;
    if (stage === 'black') {
      // Taxes go off at once, and the goods go up for sale for the first ship due after the first of the month that
      // finds the treasury dry (what the collectors are carrying home counts: it reaches the treasury after taxes go
      // off). Until then nothing is sold, so a ship that comes sooner doesn't fill it again. (The crews' histories
      // left the treasury richer, so a fixed month and a half before she was due no longer ran it dry in time.)
      send({ type: 'tax', rate: 0 });
      sim.step();
      let have = Math.max(0, s.money);
      for (const w of s.walkers) if (w.kind === 'tax') have += purseTotal(w);
      const bill = wageBill(s);
      const dry = (Math.floor(s.tick / TICKS_PER_MONTH) + 1 + Math.floor(have / Math.max(1, bill))) * TICKS_PER_MONTH;
      const by = s.tick + 2 * SHIP_EVERY;
      while (s.tick < by && ship.due <= dry) sim.step();
      for (const [good, keep] of BLACK_KEEP) send({ type: 'trade', good, sell: true, keep });
    } else for (const good of TRADE_SELL) send({ type: 'trade', good, sell: true });
    const ready = (): boolean => {
      if (stage === 'quay') return onQuay(s) >= 1800 && dockersOut(s, tradingPost(s)!) > 0;
      if (stage === 'ship') return ship.phase === SHIP_MOORED && s.tick - ship.since >= 15;
      // (#black, and once wages have gone unpaid.)
      if (stage === 'black') return ship.phase === SHIP_COMING && s.tick - ship.since >= 8 && owedWages(s).owed > 0;
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
    // (Review of slice 33: #aftermath, and on to the 3rd of a month, its threat then left to run out rather than
    // refused at once (a refusal sends the band at once, but no earlier than a year after the first route, so the day the
    // band comes stays pinned). Left to run out, the band reaches the granary four months and a few days after this
    // demand and the tax office a week after that, so the wheat and the coin it takes fall in one month's ledger, which
    // #aftermath opens on (and, as it falls in this history, with what its fires burnt down). With the seasons' history the demand fell on 27 December, the wheat went in April and the coin
    // in May, and the wheat was off the ledger by the time it opened.)
    const lapse = stage === 'aftermath';
    if (lapse) while (Math.floor((s.tick % TICKS_PER_MONTH) / TICKS_PER_DAY) !== 2) sim.run(TICKS_PER_DAY);
    // The second demand, refused while he is cold: the threat.
    const again = makeTribute(s, sim.map, sparta, -1, tributeSize(s, sparta, -1, false), false);
    send({ type: 'answer', deal: again.id, act: 'refuse' });
    const r = s.world.raids.find((x) => x.city === 'sparta' && x.ended === 0);
    if (!r || stage === 'threat') return;
    // Let run out (as if nothing came): the band gathers and marches. (Refused at once, but for #aftermath: see above.)
    if (!lapse) send({ type: 'answer', deal: r.deal, act: 'refuse' });
    if (stage === 'raid') {
      while (!(r.phase === 'marching' && r.start + r.dur - s.tick <= RAID_DAYS * TICKS_PER_DAY) && r.phase !== 'raiding' && s.tick < r.start + 2 * TICKS_PER_YEAR) sim.step();
      waitFor(sim, s.tick, r.coin, s.tick);
      return;
    }
    // In your city: fire on for the raid (a demo's history is built with it off), at the farm with torches lit.
    // (Slice 33: switched on as the band nears the edge, as #raid opens, not weeks before while it gathers: with the
    // seasons' history, a month of risk on the unwatched farm row had an ordinary fire take the farms and the granary.)
    while (!(r.phase === 'marching' && r.start + r.dur - s.tick <= RAID_DAYS * TICKS_PER_DAY) && r.phase !== 'raiding' && s.tick < r.start + 2 * TICKS_PER_YEAR) sim.step();
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

function rivalsTown(opening = false): (sim: Sim) => void {
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
    // (Slice 33: and until every route's traders have come once, as they had: with the seasons the treasury pays for the last routes later.)
    const met = s.tick + 3 * TICKS_PER_MONTH;
    while (s.tick < met && s.world.routes.some((r) => r.visits === 0)) sim.run(TICKS_PER_DAY);
    const map = sim.map;
    // (Integrating slice 34 with 31 and 33: for #rivals itself, any war Greece has going is let run to its end and any band the dice
    // sent is let come and go before Sparta's threat: with both lines' Greece the war ran on into July, and a band Sparta's own dice
    // had sent was a month in the streets as the demo opened. So it opens on a threat to answer, as its notes have it. The demos
    // built on its town (#lend, #repaid, #forgive, #greecegrows) play on from it as before.)
    const stop = s.tick + TICKS_PER_YEAR;
    if (opening) while ((warOn(s.world) || s.world.raids.some((r) => r.ended === 0 && bandOut(r))) && s.tick < stop) sim.run(TICKS_PER_DAY);
    // Sparta's king, warlike: whatever he has asked of the city by now is refused (as a player keeping his coin would), and he threatens it (set up for the demo, and named so).
    const sparta = cityOf(s.world, 'sparta');
    for (const d of s.world.deals.filter((x) => x.city === 'sparta' && x.state === 'open')) send({ type: 'answer', deal: d.id, act: 'refuse' });
    // (For #rivals, a band of his own having come and gone, his temper is set back to cold for the demo, and named so.)
    if (opening && !liveRaid(s.world) && moodOf(sparta, s.tick) > COLD) sparta.memories.push({ kind: 'staged', why: 'tired of a city that pays him nothing (set up for this demo)', amount: Math.round(COLD - 10 - moodOf(sparta, s.tick)), tick: s.tick, fade: 2 * TICKS_PER_YEAR });
    if (!liveRaid(s.world) && moodOf(sparta, s.tick) <= COLD) threaten(s, map, sparta, 'you paid him no tribute, and the king is warlike (set up for this demo)');
    // A war at sea between Troy and Athens, the two cities your ships trade with on either side of the Aegean (any war Greece has going is let run to its end first).
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

/** Slice 33: about what the 600 measures of wine from Athens cost (the treasury must hold it as well as her fee as she is asked in). */
const SEA_WINE_COST = 450;
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
    // (Slice 33: and the wine she brings, about 430 dr, as the comment below has it: with the seasons the town's money comes at another pace, and a window it could only just pay her fee in came first.)
    // (Slice 36: each ship now has her own winter storms, and keeps to her schedule after; #anchor and #athensship open on a window out of winter, so the two calls fall as they say; the next window is three months after her call was due.)
    const calm = (): boolean => stage === 'famine' || !s.season.on || (seasonAt(ship.due) !== WINTER && seasonAt(s.tick + firstShipAfter('athens')) !== WINTER);
    while (s.tick < end && !(ship.due - lead <= s.tick + 1 && s.money >= fee + wageBill(s) + SEA_WINE_COST && calm())) {
      if (ship.due - lead <= s.tick) sim.run(Math.max(1, onSchedule(s, 'tyre', ship.due) + SHIP_EVERY - lead - s.tick - 30));
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
      if (stage === 'athensship') return v.phase === SHIP_MOORED || (v.phase === SHIP_COMING && (visitorAt(v, s.tick, sim.map.size)?.inward ?? 0) >= ATHENS_INWARD);
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
type ArmsStage = 'bronze' | 'barracks' | 'companies' | 'built';
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
    // (#hirelings: built and staffed, nobody raised.)
    if (stage === 'built') return;
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
const BARRACKS_ONLY = armsTown('built');
/** #companies: the hoplites' banner in hand. */
const hoplitesBanner = (s: SimState): number => s.army.companies.find((c) => c.kind === 'hoplite')?.id ?? 0;

/**
 * Raiders fought in the streets (slice 24). #battle: #companies' town (two
 * companies drilling at the barracks) with Sparta's king turned against it
 * (set up for the demo, and named so): his threat refused, his band on the
 * road, about ten days from the west edge, and the hoplites' banner in hand,
 * paused, so both companies can be placed in its way. #hirelings: #barracks'
 * town with its barracks built and staffed but no company raised, as
 * Corinth's king (set up the same way) sends a band from the north: the Army
 * tab open on the hirelings. #looted: #raiders' town, the band let through:
 * it has emptied part of the granary and the tax office's treasury, and is
 * leaving with its sacks past the houses it set alight, the ledger open.
 */
/** How many days from the edge #battle's band is when it opens, and #hirelings' gathering. */
const BATTLE_DAYS = 14;
/** A ruler set against the city for a demo: cold enough to threaten and stay cold. */
const DEMO_ANGER = -80;
function stagedRaid(sim: Sim, city: CityId, why: string, men?: number): void {
  const s = sim.state;
  const c = cityOf(s.world, city);
  c.memories.push({ kind: 'staged', why: `${why} (set up for this demo)`, amount: DEMO_ANGER, tick: s.tick, fade: 4 * TICKS_PER_YEAR });
  const r = threaten(s, sim.map, c, `${why} (set up for this demo)`);
  // (A band of a size set for the demo, and its threat's line saying so.)
  if (men !== undefined) {
    const was = `about ${r.men} men`;
    r.men = men;
    for (const n of s.world.news) if (n.tick === s.tick && n.line.includes(was)) n.line = n.line.replace(was, `about ${men} men`);
  }
  sim.enqueue({ type: 'answer', deal: r.deal, act: 'refuse' });
  sim.flush();
}
function battleTown(): (sim: Sim) => void {
  return (sim) => {
    COMPANIES(sim);
    const s = sim.state;
    stagedRaid(sim, 'sparta', 'the king fears a city that arms itself so near his lands');
    const r = s.world.raids.find((x) => x.city === 'sparta' && x.ended === 0);
    if (!r) return;
    while (!(r.phase === 'marching' && r.start + r.dur - s.tick <= BATTLE_DAYS * TICKS_PER_DAY) && r.phase !== 'raiding' && s.tick < r.start + TICKS_PER_YEAR) sim.step();
  };
}
function hirelingsTown(): (sim: Sim) => void {
  return (sim) => {
    BARRACKS_ONLY(sim);
    stagedRaid(sim, 'corinth', 'the king will not have a rival raising soldiers on his road north');
  };
}
/** #looted: plays #raiders' history on until the band leaves the tax office with the treasury's drachmas, and some days on its way out. */
const LOOTED_DAYS = 6;
function lootedTown(): (sim: Sim) => void {
  return (sim) => {
    raidTown('raiders')(sim);
    const s = sim.state;
    const r = s.world.raids.find((x) => x.city === 'sparta' && x.phase === 'raiding');
    if (!r) return;
    const until = s.tick + 3 * TICKS_PER_MONTH;
    for (let band = raidersOf(s, r); band && !(band.back && r.stole > 0) && s.tick < until; band = raidersOf(s, r)) sim.step();
    sim.run(LOOTED_DAYS * TICKS_PER_DAY);
  };
}
/**
 * Walls, gates and towers (slice 25). #walls: #battle's town about three weeks
 * before Sparta's band reaches the west edge, paused, the wall tool in hand.
 * #siege: the same town walled up the east bank of the river (x = 40), a gate
 * where the west road crosses just past the bridge, two towers beside it on its north side
 * staffed, played on until the band stands at the gate hammering at it; the
 * companies still at the barracks.
 */
const WALLS_DAYS = 30;
/** #siege's wall, gate and towers. */
const SIEGE_WALL = col(40, 12, 45);
const SIEGE_TOWERS = [T(41, 39), T(38, 39)];
function wallsTown(): (sim: Sim) => void {
  return (sim) => {
    COMPANIES(sim);
    const s = sim.state;
    stagedRaid(sim, 'sparta', 'the king fears a city that arms itself so near his lands');
    const r = s.world.raids.find((x) => x.city === 'sparta' && x.ended === 0);
    if (!r) return;
    // (As early as the staged threat allows: the band still gathering at Sparta, about three weeks from the west edge.)
    while (reachesEdge(s, r) - s.tick > WALLS_DAYS * TICKS_PER_DAY && r.phase !== 'raiding' && s.tick < r.start + TICKS_PER_YEAR) sim.step();
  };
}
function siegeTown(): (sim: Sim) => void {
  return (sim) => {
    WALLS(sim);
    const s = sim.state;
    sim.enqueue({ type: 'wall', tiles: SIEGE_WALL });
    for (const t of SIEGE_TOWERS) sim.enqueue({ type: 'build', kind: 'tower', at: [t] });
    sim.flush();
    const r = s.world.raids.find((x) => x.city === 'sparta' && x.ended === 0);
    if (!r) return;
    // Until the band has hammered at the gate for a day or so: a crack in it, a man or two down to the towers.
    const until = s.tick + 3 * TICKS_PER_MONTH;
    while (s.tick < until && !(r.siege >= 0 && (s.walls.find((p) => p.t === r.siege)?.hp ?? 0) < GATE_HP * 0.8)) sim.step();
  };
}
/**
 * From the sea (slice 26). #landing: #companies' town with Troy's king
 * turned against it (set up for the demo, and named so): his threat refused,
 * his ships in the bay about twelve days from the beach below the storehouse
 * they came for, both companies marched down to wait above the harbour,
 * paused, the hoplites' banner in hand so both can be placed on the shore.
 * #triremes: the same town with a shipyard on the shore west of the trading
 * post (a road down to it) and two triremes built and crewed at its jetty, as
 * Troy's ships come into sight; the Army tab open on the fleet. #pirates:
 * #athensship's town, trading with Athens by sea, with the shipyard and a crewed trireme, as pirates are seen off Cape Skyllaion on
 * the lane to Athens (set up for the demo): the map open on Athens, where she
 * can be sent to guard the lane.
 */
/** The shipyard by the river mouth, west of the trading post, and the road from the quay road down to it. */
const SHIPYARD_AT = { x: 68, z: 67 };
const SHIPYARD_ROAD = [68, 69, 70, 71, 72, 73].map((x) => T(x, 66));
/**
 * How many days from the beach #landing's ships are when it opens, and where
 * its two companies wait (marched there for the demo): on open ground above
 * the harbour, clear of the band's way inland, about ten days' march from the
 * beach (from the barracks it is three weeks, more than the ships take from
 * the horizon). Review of slice 26: the ships were six days off with both
 * companies at the barracks, so none could meet the landing.
 */
const LANDING_DAYS = 12;
const LANDING_HOLD = { hoplite: { x: 81, z: 54 }, archer: { x: 84, z: 54 } };
/** The longest a demo waits for a trireme to be built and crewed (three months). */
const TRIREME_WAIT = 3 * TICKS_PER_MONTH;
/** A shipyard and `n` triremes, each built and crewed in turn. */
function fleetOf(sim: Sim, n: number, before?: (cost: number) => void): void {
  const s = sim.state;
  const send = (c: Parameters<Sim['enqueue']>[0]): void => {
    sim.enqueue(c);
    sim.flush();
  };
  send({ type: 'road', tiles: SHIPYARD_ROAD });
  send({ type: 'build', kind: 'shipyard', at: [T(SHIPYARD_AT.x, SHIPYARD_AT.z)] });
  const yard = s.buildings.find((b) => b.kind === 'shipyard');
  if (!yard) return;
  for (let k = 0; k < n; k++) {
    before?.(TRIREME_COST);
    send({ type: 'trireme', yard: yard.id });
    const t = s.fleet.triremes[s.fleet.triremes.length - 1];
    if (!t) return;
    const stop = s.tick + TRIREME_WAIT;
    while (s.tick < stop && !(t.state === 'moored' && t.crew.length >= CREW)) sim.run(10);
  }
}
function landingTown(stage: 'landing' | 'triremes'): (sim: Sim) => void {
  return (sim) => {
    COMPANIES(sim);
    const s = sim.state;
    if (stage === 'triremes') fleetOf(sim, 2);
    else {
      for (const c of s.army.companies) {
        const at = LANDING_HOLD[c.kind === 'archer' ? 'archer' : 'hoplite'];
        sim.enqueue({ type: 'banner', company: c.id, tile: T(at.x, at.z) });
      }
      sim.flush();
    }
    stagedRaid(sim, 'troy', 'the king covets the wine of a city with no ships to guard its shore');
    const r = s.world.raids.find((x) => x.city === 'troy' && x.ended === 0);
    if (!r) return;
    const stop = s.tick + TICKS_PER_YEAR;
    // #landing: about twelve days from the beach; #triremes: the first sail just in sight from the shore.
    const ready = (): boolean => {
      if (r.phase !== 'raiding' || r.landed > 0) return r.phase !== 'gathering' && r.phase !== 'marching' && r.phase !== 'threat';
      const ships = shipsOf(s, r);
      // (Slice 38: the ships cross the bay at a fortnight's pace now, so twelve days off they are still beyond the edge:
      // #landing waits too for the first to be inside the bay, about ten days off.)
      return stage === 'landing' ? daysToBeach(s, sim.map, r) <= LANDING_DAYS && ships.some((e) => e.z < sim.map.size - 2) : ships.some((e) => e.z < sim.map.size + 8);
    };
    while (s.tick < stop && !ready()) sim.step();
  };
}
function piratesTown(): (sim: Sim) => void {
  return (sim) => {
    seaTown('athensship')(sim);
    // (Slice 33: as a player would, the yard and her hull once the treasury can pay for them and a month's wages: with the seasons, the town's money comes at another pace.)
    waitFor(sim, sim.state.tick, SHIPYARD_COST + SHIPYARD_ROAD.length * ROAD_COST + TRIREME_COST + (JOBS.shipyard + CREW) * WAGE, sim.state.tick + 6 * TICKS_PER_MONTH);
    fleetOf(sim, 1);
    pirateBand(sim.state, 'athens-sea', 1, 'set up for this demo');
  };
}
const LANDING = landingTown('landing');
const TRIREMES = landingTown('triremes');
const PIRATES = piratesTown();
const WALLS = wallsTown();
const SIEGE = siegeTown();
const BATTLE = battleTown();
const HIRELINGS_TOWN = hirelingsTown();
const LOOTED = lootedTown();

/**
 * Every demo's history is built with fire risk and wear switched off (so a
 * town from before slice 12 grows exactly as it did, and every demo opens
 * with no risk or wear anywhere), and switched on as it opens. A demo about
 * fire switches them on itself, part-way through its history.
 */
function calm(setup: (sim: Sim) => void): (sim: Sim) => void {
  return (sim) => {
    // Slice 33: the seasons turn from the first tick of every history (they change histories on purpose: seasons move every harvest).
    seasons(sim, true);
    hazards(sim, false);
    setup(sim);
    hazards(sim, true);
    // Slice 30: crime too (off while the history plays, as it is in a bare state), on as it opens.
    crime(sim, true);
    // Slice 41: and the new kinds of crime and gangs (off while every history plays, slice 30's own too).
    crimes(sim, true);
    // Slice 39: and the ambitions (off while the history plays, so no history changes): what the town already meets is recorded quietly as it opens.
    ambition(sim, true);
    // Slice 49: and health (off while the history plays): every home at its fair level as it opens, nobody ill for four months, no plague for a year.
    health(sim, true);
    // Phase 7 groundwork: and the gods (off while the history plays, so no history changes): watchful as it opens, a town of 300 people noticed.
    gods(sim, true);
    // Slice 57: and their wrath and unasked blessings (off while every history plays, even one with the gods watching).
    wrath(sim, true);
  };
}

// Slice 57
/** Switch the gods' wrath (and their unasked blessings) on or off now (a command). */
function wrath(sim: Sim, on: boolean): void {
  if (sim.state.gods.wrath.on === on) return;
  sim.enqueue({ type: 'wrath', on });
  sim.flush();
}

// Phase 7 groundwork
/** Switch the gods on or off now (a command, so a replay of the log does the same). */
function gods(sim: Sim, on: boolean): void {
  if (sim.state.gods.on === on) return;
  sim.enqueue({ type: 'gods', on });
  sim.flush();
}

// Slice 49
/** Switch health on or off now (a command, so a replay of the log does the same). */
function health(sim: Sim, on: boolean): void {
  if (sim.state.health.on === on) return;
  sim.enqueue({ type: 'health', on });
  sim.flush();
}

/** Slice 39: switch the ambitions on or off now (a command, so a replay of the log does the same). */
function ambition(sim: Sim, on: boolean): void {
  if (sim.state.ambition.on === on) return;
  sim.enqueue({ type: 'ambition', on });
  sim.flush();
}

/** Slice 33: switch the seasons on or off now (a command, so a replay of the log does the same). */
function seasons(sim: Sim, on: boolean): void {
  if (sim.state.season.on === on) return;
  sim.enqueue({ type: 'seasons', on });
  sim.flush();
}

/** Slice 30: switch crime on or off now (a command, so a replay of the log does the same). */
function crime(sim: Sim, on: boolean): void {
  if (sim.state.crime.on === on) return;
  sim.enqueue({ type: 'crime', on });
  sim.flush();
}

/** Slice 41: switch the new kinds of crime and gangs on or off now (a command, so a replay of the log does the same). */
function crimes(sim: Sim, on: boolean): void {
  if (sim.state.crime.kinds === on) return;
  sim.enqueue({ type: 'crimes', on });
  sim.flush();
}

/** Switch fire risk and wear on or off now (a command, so a replay of the log does the same). */
function hazards(sim: Sim, on: boolean): void {
  if (sim.state.hazards === on) return;
  sim.enqueue({ type: 'hazards', on });
  sim.flush();
}

// Slice 30
/**
 * Thieves in the night (slice 30). #thieves: #richtown's town as its builder
 * would have had it with no watch post over the slope (one in the core, whose
 * round doesn't reach the slope: slice 33), and a new street of huts
 * marked out on the slope behind the core's villas (a road along the slope
 * from the oil road, eight plots and their own fountain), out of either
 * agora's reach, so they have water but no bread, and villas across the way.
 * Crime is switched on once most of them are huts, and the town played on
 * until the first of them is a few days from sending a thief out. #nowatch:
 * the same town carried on four months with still no watch post on the slope, thieves
 * having struck a few times; it opens paused on the most tempted hut's panel.
 */
const THIEF_ROAD = row(63, 85, 26);
const THIEF_XS = [63, 65, 67, 69, 71, 73, 75, 77];
const THIEF_FOUNTAIN = { x: 79, z: 27 };
/**
 * (The watch post by the lane on the west bank stays: its hamlet is not what the demo is about.) Slice 33 (review of
 * slice 30): and one for the core, at the west end of its north street, whose watchman's round covers every street
 * of the core but stops short of the hut street (38 road tiles away, his round 32), so the core is watched and the
 * huts are not.
 */
const THIEF_CORE_WATCH: Spot = { x: 60, z: 39 };
const THIEF_SAFETY: Safety = { watch: [TOWN_WATCH[1], THIEF_CORE_WATCH], architects: TOWN_ARCHITECTS };
/** How many of the street's plots must be huts before crime goes on, and the longest wait for it. */
const THIEF_HUTS = 6;
const THIEF_WAIT = 4 * TICKS_PER_MONTH;
/** The days before the first thief goes out that #thieves opens at. */
const THIEF_DAYS = 6;
/** How long #nowatch carries the town on. */
const NOWATCH_FOR = 4 * TICKS_PER_MONTH;
/** The street's homes (for the demos and the tests). */
export const thiefStreet = (s: SimState): Building[] => s.buildings.filter((b) => b.kind === 'home' && b.z === 27 && THIEF_XS.includes(b.x));
function thievesTown(stage: 'thieves' | 'nowatch'): (sim: Sim) => void {
  return (sim) => {
    town(TOWN_TICKS, THIEF_SAFETY, true, false)(sim);
    const s = sim.state;
    const send = (c: Parameters<Sim['enqueue']>[0]): void => {
      sim.enqueue(c);
      sim.flush();
    };
    waitFor(sim, s.tick, THIEF_ROAD.length * ROAD_COST + THIEF_XS.length * 10 + 150 + JOBS.fountain * WAGE);
    send({ type: 'road', tiles: [...THIEF_ROAD].reverse() });
    send({ type: 'plots', at: along(THIEF_XS, 27) });
    send({ type: 'fountain', at: [T(THIEF_FOUNTAIN.x, THIEF_FOUNTAIN.z)] });
    const huts = (): number => thiefStreet(s).filter((b) => b.level >= 2 && b.people > 0).length;
    const end = s.tick + THIEF_WAIT;
    while (s.tick < end && huts() < THIEF_HUTS) sim.run(10);
    crime(sim, true);
    const size = BAY.size;
    const soon = (): boolean =>
      thiefStreet(s).some((b) => {
        const d = daysToThief(b, temptationOf(s, size, b));
        return b.people > 0 && d <= THIEF_DAYS;
      }) || s.walkers.some((w) => w.kind === 'thief');
    const end2 = s.tick + THIEF_WAIT;
    while (s.tick < end2 && !soon()) sim.run(TICKS_PER_DAY);
    if (stage === 'nowatch') sim.run(NOWATCH_FOR);
  };
}
/** #nowatch's panel: the street's most tempted home that has had a thief out already (its story says so), else its most tempted (else the town's). */
const mostTempted = (s: SimState): number => {
  const homes = s.buildings.filter((b) => b.kind === 'home' && b.people > 0 && b.family);
  const pool = thiefStreet(s).filter((b) => b.people > 0 && b.family);
  const stole = (b: Building): number => (b.family?.story.some((e) => e.what === 'stole') ? 1 : 0);
  return ([...(pool.length ? pool : homes)].sort((a, b) => stole(b) - stole(a) || b.tempt - a.tempt || a.id - b.id)[0]?.id ?? 0);
};

// Slice 33
/**
 * The turning year (slice 33). #seasons: #town's town played on to the last
 * days of February, so a year at the fastest speed runs from green spring
 * through gold summer to the autumn harvest (the granaries filling) and back
 * to a grey-green winter. #winter: #richtown's town played on into the winter
 * until the Tyrian ship has been held back by the storms, on a wet day if one
 * comes before spring. (#richtown opens in the last days of February: the winter after.)
 */
const SEASONS_AT = Math.ceil(TOWN_TICKS / TICKS_PER_YEAR) * TICKS_PER_YEAR - 9 * TICKS_PER_DAY;
/** The first day of the next winter (1 December) that has most of it still to come. */
const winterAfter = (tick: number): number => {
  const from = Math.floor(tick / TICKS_PER_YEAR) * TICKS_PER_YEAR + 9 * TICKS_PER_MONTH;
  return from + 3 * TICKS_PER_MONTH <= tick + TICKS_PER_MONTH ? from + TICKS_PER_YEAR : from;
};
function seasonsTown(sim: Sim): void {
  town(TOWN_TICKS)(sim);
  if (sim.state.tick < SEASONS_AT) sim.run(SEASONS_AT - sim.state.tick);
}
function winterTown(sim: Sim): void {
  town(TOWN_TICKS, SAFE, true)(sim);
  const s = sim.state;
  const late = (): boolean => lateDays(s, 'tyre') > 0 && s.trade.ship.phase === SHIP_AWAY;
  // (Slice 40: on the trunk's history no call of hers was held back that first winter, so the demo opened at the end
  // of February with no late ship. If so, the next winter, at most two more.)
  let from = winterAfter(s.tick);
  if (s.tick < from) sim.run(from - s.tick);
  let end = from + 3 * TICKS_PER_MONTH - 5 * TICKS_PER_DAY;
  while (s.tick < end && !late()) sim.run(TICKS_PER_DAY);
  for (let tries = 0; tries < 2 && !late(); tries++) {
    from = winterAfter(s.tick);
    if (s.tick < from) sim.run(from - s.tick);
    end = from + 3 * TICKS_PER_MONTH - 5 * TICKS_PER_DAY;
    while (s.tick < end && !late()) sim.run(TICKS_PER_DAY);
  }
  // On a wet day, if one comes while she is still out.
  const wet = s.tick + 20 * TICKS_PER_DAY;
  while (s.tick < Math.min(end, wet) && late() && weatherNow(s) === WX_FAIR) sim.run(TICKS_PER_DAY);
}

/** The prepared town of #rivals (one setup for its three demos). */
const RIVALS = rivalsTown();
/** #rivals, #rivalsmap and #rivalstreet: the same town, opening on Sparta's threat (integrating slice 34 with 31 and 33). */
const RIVALS_OPEN = rivalsTown(true);

/**
 * Loans both ways (slice 27). #borrow: #caravan's young town, its treasury
 * nearly empty, where you asked Corinth and Sparta for 2,000 dr each (or as
 * much as the city could spare, if less) and both answers have come back;
 * the map opens on Corinth's Loans tab, its terms waiting on you. #lend:
 * #rivals' town (rich, trading with every city), played on until a ruler
 * wary or better is in trouble (a war, a poor harvest): they ask to borrow
 * (the demo makes the ask; the dice would bring one in their own time) and
 * the map opens on their page. #repaid: that loan lent, played on to the
 * day it falls due and is paid: their herald on the road with the whole sum,
 * a few days from your land; the map opens on their Loans tab.
 */
type LoanStage = 'borrow' | 'lend' | 'repaid';
/** What #borrow asks each city for. */
const BORROW_ASK = 2000;
/** How long #lend plays #rivals' town on, at most, for a ruler in trouble. */
const LEND_LOOK = 24 * TICKS_PER_MONTH;
/** How many days from your land #repaid's herald is when it opens. */
const REPAID_DAYS = 4;
/** The ruler who asks in #lend and repays in #repaid (beaten by Troy some months on in #rivals' town, once Sparta's raiders have gone). */
const LEND_CITY: CityId = 'athens';

function loanTown(stage: LoanStage): (sim: Sim) => void {
  return (sim) => {
    const s = sim.state;
    const send = (c: Parameters<Sim['enqueue']>[0]): void => {
      sim.enqueue(c);
      sim.flush();
    };
    if (stage === 'borrow') {
      routesTown('caravan')(sim);
      for (const city of ['corinth', 'athens'] as const) {
        const spare = spareOf(s, cityOf(s.world, city)).spare;
        const amount = [...ASK_SUMS].reverse().find((n) => n <= Math.min(BORROW_ASK, spare)) ?? BORROW_ASK;
        send({ type: 'loan', act: 'ask', city, amount });
      }
      const end = s.tick + 3 * TICKS_PER_MONTH;
      while (s.tick < end && s.world.loans.some((l) => l.state === 'asking')) sim.run(10);
      return;
    }
    RIVALS(sim);
    const end = s.tick + LEND_LOOK;
    // (As the dice would have it: the ruler wary or better and in trouble, free to ask (no deal of theirs open or lately settled), and Greece calm enough for another deal.)
    const c = cityOf(s.world, LEND_CITY);
    const free = (): boolean => !s.world.deals.some((d) => d.city === c.id && (d.state === 'open' || (d.ended > 0 && s.tick - d.ended < ASK_GAP)));
    const ready = (): boolean => moodOf(c, s.tick) > COLD && troubles(s, c).words.length > 0 && free() && openDeals(s.world).length < MOST_OPEN && !threatLive(s.world);
    while (s.tick < end && !ready()) sim.run(TICKS_PER_DAY);
    if (!ready()) return;
    const d = makeLoanAsk(s, c, loanSize(s, 4000));
    if (stage === 'lend') return;
    send({ type: 'answer', deal: d.id, act: 'send' });
    stockUp(sim);
    const l = loanOfDeal(s.world, d.id);
    if (!l) return;
    const stop = s.tick + 3 * TICKS_PER_YEAR;
    while (s.tick < stop && l.state !== 'running' && l.ended === 0) sim.run(10);
    while (s.tick < stop && l.state === 'running' && s.tick < l.due - 1) sim.run(Math.min(TICKS_PER_DAY, l.due - 1 - s.tick));
    // (Slice 31: with Greece growing, Athens' dice fell the other way; where they would, the repayment is set up for the demo, and named so.)
    if (l.state === 'running' && !repaysOnTheDay(s, l)) stageRepay(s, l, 'set up for this demo');
    while (s.tick < stop && l.state !== 'repaying' && l.state !== 'overdue' && l.ended === 0) sim.run(TICKS_PER_DAY);
    const g = s.world.gifts.find((x) => x.id === l.gift);
    if (g) while (g.start + g.dur - s.tick > REPAID_DAYS * TICKS_PER_DAY) sim.step();
  };
}
/** The prepared towns of the loans demos. */
const LEND = loanTown('lend');

/**
 * Review of slice 36: #repaid's and #forgive's year of waiting for the loan's
 * day, the town kept as a player would keep a street of villas through the
 * autumn: a fleece stall at the east agora too, and meat bought from Sparta
 * and cheese and fleece from Corinth by their roads. (With the ships back on
 * schedule after the winters, their history fell otherwise: the fleece
 * vendor's round missed villas in the autumn and the meat ran short in
 * December, and about twenty villas went down a month before they opened.)
 */
function stockUp(sim: Sim): void {
  const send = (c: Parameters<Sim['enqueue']>[0]): void => {
    sim.enqueue(c);
    sim.flush();
  };
  send({ type: 'stall', at: T(97, 42), good: FLEECE });
  send({ type: 'deal', city: 'sparta', kind: 'land', good: MEAT, buy: true, upto: 600 });
  send({ type: 'deal', city: 'corinth', kind: 'land', good: CHEESE, buy: true, upto: 600 });
  send({ type: 'deal', city: 'corinth', kind: 'land', good: FLEECE, buy: true, upto: 400 });
}

// Slice 31
/**
 * Greece grows (slice 31). #greecegrows: #rivals' town played on to the
 * tenth year after its founding by a middling player (every other request
 * and tribute met and the rest refused, every other offer to buy its goods
 * taken (those to sell it goods declined: it buys by its routes), a threat
 * paid when the treasury can). If Rhodes has founded no colony by then, it
 * sends settlers to the nearest free site and they land; if no city is
 * another's vassal, Argos bows to Sparta (both set up for the demo, and the
 * news says so). Opens paused on the map of Greece. #knossos and #memphis:
 * the same town, the map open on the newcomer's page.
 */
const GROWS_YEARS = 10;

function growsTown(): (sim: Sim) => void {
  return (sim) => {
    RIVALS(sim);
    const s = sim.state;
    const send = (c: Parameters<Sim['enqueue']>[0]): void => {
      sim.enqueue(c);
      sim.flush();
    };
    const seen = new Set<number>();
    const end = GROWS_YEARS * TICKS_PER_YEAR;
    while (s.tick < end) {
      for (const d of s.world.deals) {
        if (d.state !== 'open' || seen.has(d.id)) continue;
        seen.add(d.id);
        const act = d.kind === 'request' || d.kind === 'tribute' ? (d.id % 2 ? 'send' : 'refuse') : d.kind === 'offer' ? (d.id % 2 && d.side === 'buy' ? 'take' : 'decline') : d.kind === 'threat' && s.money > d.amount + wageBill(s) ? 'send' : '';
        if (act) send({ type: 'answer', deal: d.id, act });
      }
      sim.run(Math.min(TICKS_PER_MONTH, end - s.tick));
    }
    const w = s.world;
    const rhodes = cityOf(w, 'rhodes');
    const site = coloniesOf(w, 'rhodes').length ? undefined : nearestFree(w, 'rhodes');
    if (site) {
      sendSettlers(s, rhodes, site, 'set up for this demo');
      sim.run(COLONY_SAIL + TICKS_PER_DAY);
    }
    if (!w.cities.some((c) => c.lord) && !vassalsOf(w, 'sparta').length) {
      const sparta = cityOf(w, 'sparta');
      const argos = cityOf(w, 'argos');
      bow(s, sparta, argos, `its army of ${Math.round(argos.army).toLocaleString('en-GB')} men against Sparta’s ${Math.round(sparta.army).toLocaleString('en-GB')} men (set up for this demo)`);
      sim.run(TICKS_PER_DAY);
    }
  };
}
const GROWS = growsTown();

/**
 * Debts unpaid (slice 28). #overdue: #borrow's town, Corinth's terms
 * accepted (Athens' declined) and the payment held back, played on to a few
 * days after the day: the warning given, the next two steps dated on
 * Corinth's Loans tab. #seized: on to the second step, Corinth's road closed
 * and a gift of coin sent to Corinth seized on the road (the ledger open).
 * #creditors: on to the third, the threat refused, Corinth's men in the city
 * (the camera on them). #collect: #companies' town, Corinth's ask to borrow
 * (set up for the demo) lent, played on to its day, which Corinth lets pass
 * (set up for the demo): the Loans tab with the four answers. #report: the
 * full force sent, played on until it has fought, two days at Corinth under
 * the crossed swords before it marches home (opened paused): the report.
 * #forgive: #lend's loan to Athens lent and played on to its day, which she
 * lets pass (set up for the demo): her Loans tab, Forgive at hand.
 */
type DebtStage = 'overdue' | 'seized' | 'creditors' | 'collect' | 'report' | 'forgive';
/** The gift of coin #seized sends Corinth to soften the lord, which he seizes on the road. */
const SEIZED_GIFT = 250;
/** How many days after the day #overdue opens. */
const OVERDUE_DAYS = 3;
/** How many days into the seizing #seized opens, at most (once something has been seized). */
const SEIZED_DAYS = 30;
/** How many days #creditors' men have been in the city. */
const CREDITORS_DAYS = 4;
/** What #collect lends Corinth, at most. */
const COLLECT_LEND = 2000;
/** How many days #report's force has been at Corinth after the fight (it marches home a day after; slice 28's review: on the road home it reached your edge a moment after the demo opened, a game day being a second). */
const REPORT_DAYS = 2;

function debtTown(stage: DebtStage): (sim: Sim) => void {
  return (sim) => {
    const s = sim.state;
    const send = (c: Parameters<Sim['enqueue']>[0]): void => {
      sim.enqueue(c);
      sim.flush();
    };
    if (stage === 'overdue' || stage === 'seized' || stage === 'creditors') {
      loanTown('borrow')(sim);
      const l = s.world.loans.find((x) => x.city === 'corinth' && x.state === 'terms');
      if (!l) return;
      for (const o of s.world.loans.filter((x) => x.state === 'terms' && x !== l)) send({ type: 'loan', act: 'decline', loan: o.id });
      send({ type: 'loan', act: 'accept', loan: l.id });
      const end = s.tick + 3 * TICKS_PER_MONTH;
      while (s.tick < end && l.state === 'coming') sim.run(10);
      // (Held back, as a player who would rather keep the coin might: the treasury could pay it by then.)
      send({ type: 'loan', act: 'withhold', loan: l.id });
      while (l.state === 'running' && s.tick < l.due + TICKS_PER_DAY) sim.run(10);
      if (l.state !== 'overdue') return;
      if (stage === 'overdue') {
        sim.run(OVERDUE_DAYS * TICKS_PER_DAY);
        return;
      }
      const two = l.stepAt + STEP_GAP + TICKS_PER_DAY;
      while (s.tick < two && l.step < 2) sim.run(10);
      if (stage === 'seized') {
        // (A gift of coin sent to soften him, as a player might: he seizes it on the road against the debt. The yard's meat went with the last caravan.)
        // (Slice 29: the lord's agents took from your stores on the step's first day; the demo waits for the gift to be taken too.)
        const gifts = new Set(s.world.gifts.map((g) => g.id));
        send({ type: 'gift', city: 'corinth', good: -1, amount: SEIZED_GIFT });
        const gift = s.world.gifts.find((g) => !gifts.has(g.id));
        const most = s.tick + SEIZED_DAYS * TICKS_PER_DAY;
        while (s.tick < most && (gift ? s.world.gifts.includes(gift) : l.seized === 0)) sim.run(TICKS_PER_DAY);
        return;
      }
      const three = l.stepAt + STEP_GAP + 2 * TICKS_PER_DAY;
      while (s.tick < three && l.step < 3 && l.state === 'overdue') sim.run(10);
      const r = s.world.raids.find((x) => x.id === l.raid);
      if (!r) return;
      send({ type: 'answer', deal: r.deal, act: 'refuse' });
      const until = s.tick + 6 * TICKS_PER_MONTH;
      while (s.tick < until && r.phase !== 'raiding') sim.run(10);
      sim.run(CREDITORS_DAYS * TICKS_PER_DAY);
      return;
    }
    if (stage === 'forgive') {
      LEND(sim);
      const d = s.world.deals.find((x) => x.city === LEND_CITY && x.kind === 'loanask' && x.state === 'open');
      if (!d) return;
      send({ type: 'answer', deal: d.id, act: 'send' });
      stockUp(sim);
      const l = loanOfDeal(s.world, d.id);
      if (!l) return;
      dueAndDefault(sim, l.id);
      return;
    }
    COMPANIES(sim);
    const c = cityOf(s.world, 'corinth');
    const d = makeLoanAsk(s, c, loanSize(s, COLLECT_LEND));
    d.why = `${d.why} (set up for this demo)`;
    send({ type: 'answer', deal: d.id, act: 'send' });
    const l = loanOfDeal(s.world, d.id);
    if (!l) return;
    dueAndDefault(sim, l.id);
    if (stage === 'collect') return;
    send({ type: 'expedition', city: 'corinth', kind: 'force' });
    const e = s.world.expeditions.find((x) => x.city === 'corinth');
    if (!e) return;
    const stop = s.tick + 4 * TICKS_PER_MONTH;
    while (s.tick < stop && e.phase !== 'fighting' && e.phase !== 'homeward' && e.phase !== 'done') sim.run(1);
    sim.run(REPORT_DAYS * TICKS_PER_DAY);
  };
}

// Slice 34
/**
 * Vassals and allies (slice 34). #vassal: #collect's town (Corinth owing
 * you, overdue), its debt offered for its loyalty; if Corinth's ruler says
 * no, it bows anyway (set up for this demo, and named so). Its tribute set
 * in oil or wine if it sells them (else the good it holds most of), fair if it can spare a season's worth and else light, as a player wanting goods would, played
 * on until the tribute's donkeys have come in at your edge and are about ten
 * days' walk from the store (the camera on them). #submit: #companies' town with a second
 * barracks inside the west gate and a band of Arcadians hired there, as a
 * player wanting a bigger army would: Argos' Empire tab, the demand to submit
 * with its odds and reasons, not yet sent. #conquer: #companies' town, a full
 * force sent to conquer Argos, played on until it has fought and two days
 * more (opened paused): the report on Argos' Empire tab. #rebellion:
 * #companies' town, Corinth bowed to you by awe (set up for this demo) and
 * its tribute set heavy, played on until it arms and ten days more: its
 * Empire tab with the warning and the three answers.
 */
type EmpireStage = 'vassal' | 'submit' | 'conquer' | 'rebellion';
/** How many days #rebellion opens after Corinth begins arming. */
const ARMING_DAYS = 10;
/** How far (tiles) #vassal's donkeys are from the store as it opens: about ten days' walk. */
const TRIBUTE_LEFT = 24;

function empireTown(stage: EmpireStage): (sim: Sim) => void {
  return (sim) => {
    const s = sim.state;
    const send = (c: Parameters<Sim['enqueue']>[0]): void => {
      sim.enqueue(c);
      sim.flush();
    };
    if (stage === 'vassal') {
      debtTown('collect')(sim);
      const corinth = cityOf(s.world, 'corinth');
      send({ type: 'empire', act: 'debt', city: 'corinth' });
      const h = s.empire.heralds.find((x) => x.city === 'corinth' && x.kind === 'debt');
      if (h) while (h.answer === '' && s.tick < h.due + TICKS_PER_DAY) sim.run(10);
      if (!vassalOf(s, 'corinth')) {
        const l = s.world.loans.find((x) => x.city === 'corinth' && x.side === 'out' && x.ended === 0);
        if (l) endLoan(s, l, 'forgiven');
        take(s, corinth, 'debt', 'its debt let go for its loyalty (set up for this demo)');
      }
      const v = vassalOf(s, 'corinth');
      if (!v) return;
      // (Jars, as a player wanting goods he can see would: oil or wine if it sells them and can spare a season's worth; else the good it holds most of, by worth.)
      const sells = tributeGoods(corinth);
      const v0 = vassalOf(s, 'corinth');
      const season = (g: number, weight: number): number => (v0 ? tributeYear(s, v0, weight, g).amount / 4 : 0);
      const jars = [3, 5].find((g) => sells.includes(g));
      const good = jars ?? sells.sort((a, b) => corinth.stock[b] * corinth.price[b] - corinth.stock[a] * corinth.price[a])[0] ?? -1;
      // (Fair if it can spare a season's worth, else light.)
      const weight = good < 0 || corinth.stock[good] * 0.5 >= season(good, 1) ? 1 : 0;
      send({ type: 'empire', act: 'tribute', city: 'corinth', good, weight });
      const stop = s.tick + 4 * TICKS_PER_MONTH;
      while (s.tick < stop && !s.empire.tribute.some((x) => x.city === 'corinth' && x.phase === 'city')) sim.run(10);
      // (On until its donkeys are some days from the store: in from your edge, the walk through the fields is weeks long.)
      const t = s.empire.tribute.find((x) => x.city === 'corinth' && x.phase === 'city');
      const w = t && s.walkers.find((x) => x.kind === 'caravan' && x.cheese === -t.id);
      const left = (): number => {
        if (!w) return 0;
        let d = -w.along;
        for (let i = w.seg * 2; i + 3 < w.path.length; i += 2) d += dhypot(w.path[i + 2] - w.path[i], w.path[i + 3] - w.path[i + 1]);
        return d;
      };
      while (w && t?.phase === 'city' && s.tick < stop && left() > TRIBUTE_LEFT) sim.run(10);
      return;
    }
    COMPANIES(sim);
    if (stage === 'submit') {
      const seen = new Set(s.world.deals.map((d) => d.id));
      const end = s.tick + TICKS_PER_YEAR;
      while (s.tick < end && spendable(s) < FORTRESS_LANE.length * ROAD_COST + BARRACKS_COST + JOBS.barracks * WAGE + HIRELINGS.arcadian.fee + wageBill(s)) {
        sim.run(TICKS_PER_DAY);
        answerAsMiddling(sim, seen);
      }
      send({ type: 'road', tiles: FORTRESS_LANE });
      send({ type: 'build', kind: 'barracks', at: [FORTRESS_BARRACKS] });
      const second = s.buildings.find((b) => b.kind === 'barracks' && b.x === FORTRESS_BARRACKS % BAY.size && b.z === Math.floor(FORTRESS_BARRACKS / BAY.size));
      if (!second) return;
      const staffed = s.tick + TICKS_PER_MONTH;
      while (s.tick < staffed && second.workers === 0) sim.run(10);
      send({ type: 'hire', barracks: second.id, kind: 'arcadian' });
      const hired = s.army.companies.find((c) => c.hired === 'arcadian');
      const most = s.tick + TICKS_PER_MONTH;
      while (hired && s.tick < most && readyOf(s, hired).length < COMPANY_SIZE) sim.run(10);
      return;
    }
    if (stage === 'conquer') {
      send({ type: 'empire', act: 'conquer', city: 'argos' });
      const e = s.world.expeditions.find((x) => x.city === 'argos' && x.aim === 'conquer');
      if (!e) return;
      const stop = s.tick + 4 * TICKS_PER_MONTH;
      while (s.tick < stop && e.phase !== 'fighting' && e.phase !== 'homeward' && e.phase !== 'done') sim.run(1);
      sim.run(REPORT_DAYS * TICKS_PER_DAY);
      return;
    }
    const corinth = cityOf(s.world, 'corinth');
    take(s, corinth, 'awe', 'it bowed to your herald (set up for this demo)');
    send({ type: 'empire', act: 'tribute', city: 'corinth', good: -1, weight: 2 });
    const v = vassalOf(s, 'corinth');
    if (!v) return;
    const stop = s.tick + TICKS_PER_YEAR;
    while (s.tick < stop && v.arming === 0 && vassalOf(s, 'corinth')) sim.run(TICKS_PER_DAY);
    sim.run(ARMING_DAYS * TICKS_PER_DAY);
  };
}

/** A loan to a ruler, lent: played on to the day before it falls due, then let pass unpaid (set up for the demo: the dice would decide). */
function dueAndDefault(sim: Sim, id: number): void {
  const s = sim.state;
  const l = s.world.loans.find((x) => x.id === id);
  if (!l) return;
  const stop = s.tick + 3 * TICKS_PER_YEAR;
  while (s.tick < stop && l.state !== 'running' && l.ended === 0) sim.run(10);
  while (s.tick < stop && l.state === 'running' && s.tick < l.due - 1) sim.step();
  stageDefault(s, l, 'set up for this demo');
  sim.run(TICKS_PER_DAY);
}

/**
 * A city worth defending (slice 29). #fortress: #companies' town (built
 * street by street, its mine, armoury, barracks and two companies) carried
 * on as its builder would carry it on, each step when the treasury can pay
 * for it and a month's wages, answering Greece as a middling player would
 * (requests sent when the stores or the treasury can, offers and loans
 * offered taken, tribute paid when it can be, asks to borrow lent when the
 * treasury can spare it):
 * - the road north and the caravan yard, and routes to Corinth and Sparta by
 *   road and Athens and Troy by sea, with what each buys ticked for sale;
 * - a shipyard by the river mouth and two triremes, built and crewed in turn;
 * - a second barracks inside the west gate, and a company of hoplites raised
 *   there (filling as far as the fine houses and villas can spare men);
 * - a loan to a ruler (Greece's own ask, lent, if one comes within a year;
 *   else asked for the demo and named so, once the treasury can spare it);
 * - the walls, on a loan asked of Corinth as a player in want of their cost
 *   would (unless a ruler's offer taken is still running): the west wall up
 *   the river's east bank from the hills (#siege's line), its gate where the
 *   road crosses and two towers beside it, and a wall across the valley
 *   north of the town with a gate on the north road and a tower inside it.
 * Then, played on until Greece is calm (no threat or band live), Sparta's
 * king is turned against the city (set up for the demo, and named so, as
 * #battle's): his threat refused, his band gathering. It opens with the band
 * at most FORTRESS_DAYS from the west edge (about three weeks: it gathers
 * for ten days, then marches), the Army tab open.
 */
const FORTRESS_ROUTES: Array<[CityId, 'land' | 'sea']> = [
  ['corinth', 'land'],
  ['sparta', 'land'],
  ['athens', 'sea'],
  ['troy', 'sea'],
];
/** The north wall: across the valley north of the town (row 22), from the west wall's head to the east edge, cliffs skipped, a gate on the north road. */
const FORTRESS_NORTH = row(41, 127, 22);
const FORTRESS_NORTH_TOWER = T(87, 23);
/** The second barracks, inside the west gate, and its lane up from the main street. */
const FORTRESS_BARRACKS = T(44, 34);
const FORTRESS_LANE = col(48, 34, 40);
/** How many days from the west edge Sparta's band is when #fortress opens. */
const FORTRESS_DAYS = 24;
/** The longest #fortress plays on for a ruler's own loan offer or ask (a year each), and for Greece to be calm. */
const FORTRESS_WAIT = TICKS_PER_YEAR;
/** What #fortress lends a ruler, if none has asked by the time its second barracks is up (set up for the demo, and named so). */
const FORTRESS_LEND = 1000;

/** Answer whatever Greece has asked, as a middling player would (nothing a threat: the demo deals with those). */
function answerAsMiddling(sim: Sim, seen: Set<number>): void {
  const s = sim.state;
  for (const d of s.world.deals) {
    if (seen.has(d.id) || d.state !== 'open') continue;
    seen.add(d.id);
    const act = d.kind === 'offer' || d.kind === 'loanoffer' ? 'take' : d.kind === 'request' || d.kind === 'tribute' || d.kind === 'loanask' ? 'send' : '';
    if (!act) continue;
    sim.enqueue({ type: 'answer', deal: d.id, act });
    sim.flush();
  }
}

function fortressTown(): (sim: Sim) => void {
  return (sim) => {
    COMPANIES(sim);
    const s = sim.state;
    const seen = new Set(s.world.deals.map((d) => d.id));
    const send = (c: Parameters<Sim['enqueue']>[0]): void => {
      sim.enqueue(c);
      sim.flush();
    };
    // Played on a day at a time, answering Greece; until `done` or `most` ticks.
    const playOn = (most: number, done: () => boolean = () => false): void => {
      const end = s.tick + most;
      while (s.tick < end && !done()) {
        sim.run(TICKS_PER_DAY);
        answerAsMiddling(sim, seen);
      }
    };
    const afford = (cost: number, most = 6 * TICKS_PER_MONTH): void => playOn(most, () => spendable(s) >= cost + wageBill(s));
    // The road north and the caravan yard (as #rivals), with a watch post and an architect beside it.
    afford((NORTH_ROAD.length + YARD_ROAD.length) * ROAD_COST + YARD_COST + WATCHPOST_COST + ARCHITECT_COST + (JOBS.yard + JOBS.watchpost + JOBS.architect) * WAGE);
    send({ type: 'road', tiles: [...NORTH_ROAD, ...YARD_ROAD] });
    send({ type: 'build', kind: 'yard', at: [T(YARD_AT.x, YARD_AT.z)] });
    send({ type: 'build', kind: 'watchpost', at: [T(YARD_WATCH.x, YARD_WATCH.z)] });
    send({ type: 'build', kind: 'architect', at: [T(YARD_ARCHITECT.x, YARD_ARCHITECT.z)] });
    playOn(ROUTE_WAIT, () => (rateOf(caravanYard(s)!) ?? 0) > 0);
    for (const [city, kind] of FORTRESS_ROUTES) {
      afford(routeWay(city, kind)!.fee + 300);
      if (routeRefusal(s, city, kind)) continue;
      send({ type: 'route', city, kind });
      for (const k of tradesOf(s, city).theyBuy) send({ type: 'deal', city, kind, good: TRADE_GOODS[k], sell: true });
    }
    // The shipyard and two triremes.
    afford(SHIPYARD_COST + SHIPYARD_ROAD.length * ROAD_COST + 2 * TRIREME_COST);
    // (Integrating slice 34 with 32 and 33: each trireme ordered once the treasury can pay for it and the month's wages. With both
    // lines' Greece the treasury had not reached the whole cost in six months, and the second trireme left the wages unpaid for a month.)
    fleetOf(sim, 2, (cost) => {
      const end = s.tick + FORTRESS_WAIT;
      while (s.tick < end && spendable(s) < cost + wageBill(s)) sim.run(TICKS_PER_DAY);
    });
    answerAsMiddling(sim, seen);
    // The second barracks inside the west gate, and a company of hoplites raised there once it is staffed.
    afford(FORTRESS_LANE.length * ROAD_COST + BARRACKS_COST + JOBS.barracks * WAGE, FORTRESS_WAIT);
    send({ type: 'road', tiles: FORTRESS_LANE });
    send({ type: 'build', kind: 'barracks', at: [FORTRESS_BARRACKS] });
    const second = s.buildings.find((b) => b.kind === 'barracks' && b.x === FORTRESS_BARRACKS % BAY.size && b.z === Math.floor(FORTRESS_BARRACKS / BAY.size));
    if (second) {
      playOn(3 * TICKS_PER_DAY, () => second.workers > 0);
      send({ type: 'raise', barracks: second.id, kind: 'hoplite' });
    }
    // A loan to a ruler who asks: Greece's own, while the treasury fills (a year at most); else one asked for the demo, and named so, once the treasury can spare it.
    const loanOut = (): boolean => s.world.loans.some((l) => l.side === 'out' && l.ended === 0 && l.state !== 'proposed');
    playOn(FORTRESS_WAIT, loanOut);
    if (!loanOut()) {
      afford(FORTRESS_LEND + wageBill(s), FORTRESS_WAIT);
      const c = s.world.cities.find((x) => x.ruler && moodOf(x, s.tick) > COLD && !s.world.loans.some((l) => l.city === x.id && l.ended === 0) && !s.world.deals.some((d) => d.city === x.id && d.state === 'open'));
      if (c) {
        const d = makeLoanAsk(s, c, FORTRESS_LEND);
        d.why = `${d.why} (set up for this demo)`;
        const l = loanOfDeal(s.world, d.id);
        if (l) l.why = d.why;
        seen.add(d.id);
        playOn(TICKS_PER_DAY);
        send({ type: 'answer', deal: d.id, act: 'send' });
      }
    }
    // The walls and towers, on a loan from Corinth (as a player in want of their cost would ask), unless a ruler's offer taken is still running: the west wall first (Sparta's side), then the north.
    const loanIn = (): boolean => s.world.loans.some((l) => l.side === 'in' && (l.state === 'coming' || l.state === 'running'));
    const west = SIEGE_WALL.length * WALL_COST + GATE_COST + SIEGE_TOWERS.length * TOWER_COST;
    const north = FORTRESS_NORTH.length * WALL_COST + GATE_COST + TOWER_COST;
    if (!loanIn()) {
      const want = west + north + 3 * wageBill(s) - spendable(s);
      const spare = spareOf(s, cityOf(s.world, 'corinth')).spare;
      const amount = ASK_SUMS.find((n) => n >= want && n <= spare) ?? [...ASK_SUMS].reverse().find((n) => n <= spare) ?? ASK_SUMS[0];
      send({ type: 'loan', act: 'ask', city: 'corinth', amount });
      playOn(3 * TICKS_PER_MONTH, () => !s.world.loans.some((l) => l.state === 'asking'));
      const terms = s.world.loans.find((l) => l.city === 'corinth' && l.state === 'terms');
      if (terms) send({ type: 'loan', act: 'accept', loan: terms.id });
      playOn(3 * TICKS_PER_MONTH, () => !s.world.loans.some((l) => l.side === 'in' && l.state === 'coming'));
    }
    afford(west, FORTRESS_WAIT);
    send({ type: 'wall', tiles: SIEGE_WALL });
    for (const t of SIEGE_TOWERS) send({ type: 'build', kind: 'tower', at: [t] });
    afford(north, FORTRESS_WAIT);
    send({ type: 'wall', tiles: FORTRESS_NORTH });
    send({ type: 'build', kind: 'tower', at: [FORTRESS_NORTH_TOWER] });
    // (Integrating slice 33 with 31 and 32: with the seasons' history the north wall went up only days before the band was
    // staged, so the town opened with the north tower unmanned and the treasury spent on the wall. Played on until every
    // tower is manned and the treasury holds two and a half months' wages, three months at most.)
    playOn(3 * TICKS_PER_MONTH, () => s.buildings.every((b) => b.kind !== 'tower' || b.workers > 0) && s.money >= 2.5 * wageBill(s));
    // Calm in Greece, and the herald home; then Sparta's king turned against the city.
    playOn(FORTRESS_WAIT, () => !threatLive(s.world) && !s.world.gifts.some((g) => g.loan > 0));
    stagedRaid(sim, 'sparta', 'the king will not have a walled city arming itself across his road north');
    const r = s.world.raids.find((x) => x.city === 'sparta' && x.ended === 0);
    if (!r) return;
    playOn(TICKS_PER_YEAR, () => reachesEdge(s, r) - s.tick <= FORTRESS_DAYS * TICKS_PER_DAY || r.phase === 'raiding');
  };
}
const FORTRESS = fortressTown();

// Slice 32
/**
 * Marble and timber (slice 32). #quarry: #richtown's town carried on, as its
 * builder would: a road out along the bay to the headland, a marble quarry
 * on the richest of its pale rock and a storehouse where the road starts up
 * the headland, played on a couple of months so its quarrymen are at the face
 * and its sledges on the road (the quarry tool in hand: the other outcrop,
 * above the bay, is free). #loggers: the same town with a road south from the
 * west road to the edge of the west wood, a loggers' camp there, a storehouse
 * on the way and a watch post beside it, played on four months: stumps where
 * the nearest trees stood, the first of them growing back, loggers out at the
 * edge of what is left.
 */
const WORKS_QUARRY = T(110, 101);
/** The road to the quarry: from the oil road's end along the bay, ending beside the quarry (its north side). */
const WORKS_QUARRY_FROM = T(89, 68);
const WORKS_QUARRY_TO = T(108, 99);
const WORKS_QUARRY_STORE = T(105, 86);
/** The camp's road: south from the west road's end to the wood. */
const WORKS_CAMP_FROM = T(14, 50);
const WORKS_CAMP_TO = T(18, 74);
const WORKS_CAMP = T(16, 74);
const WORKS_CAMP_STORE = T(19, 66);
const WORKS_CAMP_WATCH = T(19, 71);
/** How long each plays on once built. */
const WORKS_QUARRY_DAYS = 70;
const WORKS_CAMP_DAYS = 120;
function worksTown(stage: 'quarry' | 'loggers'): (sim: Sim) => void {
  return (sim) => {
    town(TOWN_TICKS, SAFE, true)(sim);
    const s = sim.state;
    const send = (c: Parameters<Sim['enqueue']>[0]): void => {
      sim.enqueue(c);
      sim.flush();
    };
    if (stage === 'quarry') {
      const road = roadRoute(sim.map, s, WORKS_QUARRY_FROM, WORKS_QUARRY_TO) ?? [];
      waitFor(sim, s.tick, road.length * ROAD_COST + QUARRY_COST + STOREHOUSE_COST + (JOBS.quarry + JOBS.storehouse) * WAGE);
      send({ type: 'road', tiles: road });
      send({ type: 'build', kind: 'quarry', at: [WORKS_QUARRY] });
      send({ type: 'build', kind: 'storehouse', at: [WORKS_QUARRY_STORE] });
      sim.run(WORKS_QUARRY_DAYS * TICKS_PER_DAY);
      return;
    }
    const road = roadRoute(sim.map, s, WORKS_CAMP_FROM, WORKS_CAMP_TO) ?? [];
    waitFor(sim, s.tick, road.length * ROAD_COST + LOGGERS_COST + STOREHOUSE_COST + WATCHPOST_COST + (JOBS.loggers + JOBS.storehouse + JOBS.watchpost) * WAGE);
    send({ type: 'road', tiles: road });
    send({ type: 'build', kind: 'loggers', at: [WORKS_CAMP] });
    send({ type: 'build', kind: 'storehouse', at: [WORKS_CAMP_STORE] });
    send({ type: 'build', kind: 'watchpost', at: [WORKS_CAMP_WATCH] });
    sim.run(WORKS_CAMP_DAYS * TICKS_PER_DAY);
  };
}
const WORKS_QUARRY_TOWN = worksTown('quarry');
const WORKS_CAMP_TOWN = worksTown('loggers');

// Slice 35
/**
 * Monuments (slice 35). #monument: #quarry's town carried on, as its builder
 * would: a spur road out to the headland's top above the bay, the Lighthouse
 * marked out there, two masons' yards by the quarry road, and a sea route
 * opened to Troy to buy the timber the headland's few pines can't give;
 * played on until the tower is about half up inside its scaffold (the
 * Lighthouse a little under half built), with ox carts on the road. #lit:
 * the same town played on until the Lighthouse is finished and the Tyrian
 * ship is sailing in at her quicker pace, its fire burning.
 */
const MONUMENT_LIGHTHOUSE = T(97, 93);
const MONUMENT_SPUR_FROM = T(100, 94);
const MONUMENT_SPUR_TO = T(107, 94);
const MONUMENT_YARDS = [T(111, 95), T(111, 98)];
/** How much timber Troy's ship brings at most (the Lighthouse needs 360 in all). */
const MONUMENT_TIMBER = 400;
/** How long each may play on, at most, to its moment. */
const MONUMENT_MOST = 3 * TICKS_PER_YEAR;
/** #monument opens with the tower about this far up (its stage's work). */
const MONUMENT_TOWER = 0.5;
function monumentTown(stage: 'monument' | 'lit'): (sim: Sim) => void {
  return (sim) => {
    WORKS_QUARRY_TOWN(sim);
    const s = sim.state;
    const seen = new Set(s.world.deals.map((d) => d.id));
    const send = (c: Parameters<Sim['enqueue']>[0]): void => {
      sim.enqueue(c);
      sim.flush();
    };
    const playOn = (most: number, done: () => boolean): void => {
      const end = s.tick + most;
      while (s.tick < end && !done()) {
        sim.run(TICKS_PER_DAY);
        answerAsMiddling(sim, seen);
      }
    };
    const spur = roadRoute(sim.map, s, MONUMENT_SPUR_FROM, MONUMENT_SPUR_TO) ?? [];
    const cost = spur.length * ROAD_COST + LIGHTHOUSE_COST + MONUMENT_YARDS.length * MASONS_COST + MONUMENT_YARDS.length * JOBS.masons * WAGE;
    playOn(MONUMENT_MOST, () => spendable(s) >= cost + wageBill(s));
    send({ type: 'road', tiles: spur });
    send({ type: 'build', kind: 'lighthouse', at: [MONUMENT_LIGHTHOUSE] });
    for (const at of MONUMENT_YARDS) send({ type: 'build', kind: 'masons', at: [at] });
    // Troy's timber, by sea, once the treasury can spare the route's fee (at the merge of slices 33 and 35: and three months' wages
    // besides, for the timber the first ships bring; with the seasons' history the fee alone left the wages unpaid that autumn).
    playOn(MONUMENT_MOST, () => routeRefusal(s, 'troy', 'sea') === '' && spendable(s) >= routeWay('troy', 'sea')!.fee + 3 * wageBill(s));
    send({ type: 'route', city: 'troy', kind: 'sea' });
    send({ type: 'deal', city: 'troy', kind: 'sea', good: TIMBER, buy: true, upto: MONUMENT_TIMBER });
    const site = (): ReturnType<typeof monumentOf> => monumentOf(s, 'lighthouse');
    const rolling = (): boolean => {
      const x = site();
      return !!x && cartsTo(s, x.id).some((k) => k.wait <= 0 && k.load > 0);
    };
    if (stage === 'monument') {
      playOn(MONUMENT_MOST, () => {
        const x = site();
        return !!x && progressOf(x) >= (1 + MONUMENT_TOWER) / 3;
      });
      playOn(TICKS_PER_MONTH, rolling);
      return;
    }
    playOn(MONUMENT_MOST, () => !!site()?.finished);
    const ship = s.trade.ship;
    playOn(MONUMENT_MOST, () => ship.phase === SHIP_COMING && ship.pace !== undefined && s.tick - ship.since >= 4 * TICKS_PER_DAY);
  };
}
const MONUMENT_TOWN = monumentTown('monument');
const LIT_TOWN = monumentTown('lit');

// ---------------------------------------------------------------------------
// Slice 54: sanctuaries.

/**
 * #sanctuaries: #quarry's town (the headland's quarry, the storehouse by the
 * bay road) with four sanctuaries east of its vineyards, beside the roads
 * there: Athena's finished and staffed, her priests out; Poseidon's with its
 * statue going up in its scaffold; Apollo's with its temple's columns rising;
 * Demeter's just marked out, the ox carts bringing its marble. Three masons'
 * yards and an armoury (for the bronze) are built for them, and the
 * materials for the stages each is to reach are put on its site (set up for
 * this demo, noted in the stock book as bought), so it opens in months, not
 * years; the builders, the carts and the stages are played as they come.
 * #sanctuary: the same town with only Demeter's marked out, one masons'
 * yard, and the first ox carts on the road to it with marble.
 */
const SANCT_SPOTS: Record<'athena' | 'poseidon' | 'apollo' | 'demeter', number> = { athena: T(109, 66), poseidon: T(97, 69), apollo: T(103, 75), demeter: T(101, 63) };
/** How long each may play on, at most, to its moment. */
const SANCT_MOST = 2 * TICKS_PER_YEAR;
/** #sanctuaries opens with Poseidon's statue about this far through its stage's work. */
const SANCT_STATUE = 0.5;

/** The nearest spot by a road for a building of this side and kind to a point (the nearest first, ties by row then column), or -1. */
function spotNear(sim: Sim, kind: BuildKind, side: number, cx: number, cz: number, reach = 16): number {
  const s = sim.state;
  const n = sim.map.size;
  let best = -1;
  let bd = Infinity;
  for (let tz = cz - reach; tz <= cz + reach; tz++) {
    for (let tx = cx - reach; tx <= cx + reach; tx++) {
      if (tx < 1 || tz < 1 || tx + side >= n || tz + side >= n) continue;
      const d = Math.abs(tx - cx) + Math.abs(tz - cz);
      if (d >= bd || buildingRefusal(sim.map, s, kind, tx, tz) !== '') continue;
      let road = false;
      for (let k = 0; k < side && !road; k++) road = [(tz - 1) * n + tx + k, (tz + side) * n + tx + k, (tz + k) * n + tx - 1, (tz + k) * n + tx + side].some((t) => s.tiles[t] === TILE_ROAD);
      if (!road) continue;
      best = tz * n + tx;
      bd = d;
    }
  }
  return best;
}

/** Put on a sanctuary's site what its stages from `from` to `to` (not including) need, noted as bought for the demo. */
function stockSanctuary(sim: Sim, x: Site, from: number, to: number): void {
  const s = sim.state;
  const b = s.buildings.find((g) => g.id === x.id);
  if (!b) return;
  for (let k = from; k < to; k++) {
    const st = stagesOf(x)[k];
    if (!st) continue;
    for (const w of siteMaterials(x)) {
      const n = needOf(st, w);
      if (n <= 0) continue;
      setHeld(b, w, held(b, w) + n);
      note(s, w, 'bought', 'for a sanctuary (set up for this demo)', n);
    }
  }
}

/**
 * Review of slice 54: #quarry's town cuts marble but has no loggers' camp and
 * no copper mine, so a site's timber and copper would never come. What the
 * sites still to rise will want of them is put in the storehouse (set up for
 * this demo, noted in the stock book as bought), for the ox carts to haul.
 * The copper is more than the statues need: the armoury's smiths fetch theirs
 * from the same storehouse.
 */
function supplyStorehouse(sim: Sim, timber: number, copper: number): void {
  const s = sim.state;
  const g = s.buildings.find((b) => b.kind === 'storehouse');
  if (!g) return;
  for (const [w, n] of [[TIMBER, timber], [COPPER, copper]] as const) {
    if (n <= 0) continue;
    setHeld(g, w, held(g, w) + n);
    note(s, w, 'bought', 'for the sanctuaries (set up for this demo)', n);
  }
}

function sanctuariesTown(which: 'sanctuaries' | 'sanctuary'): (sim: Sim) => void {
  return (sim) => {
    WORKS_QUARRY_TOWN(sim);
    const s = sim.state;
    const seen = new Set(s.world.deals.map((d) => d.id));
    const send = (c: Parameters<Sim['enqueue']>[0]): void => {
      sim.enqueue(c);
      sim.flush();
    };
    const playOn = (most: number, done: () => boolean): void => {
      const end = s.tick + most;
      while (s.tick < end && !done()) {
        sim.run(TICKS_PER_DAY);
        answerAsMiddling(sim, seen);
      }
    };
    const rolling = (god: GodId): boolean => {
      const x = sanctuaryOf(s, god);
      return !!x && cartsTo(s, x.id).some((k) => k.wait <= 0 && k.load > 0 && k.food === MARBLE);
    };
    const yards = which === 'sanctuary' ? 1 : 3;
    // (The sanctuaries' coin and their yards': a gift for the demo, so it opens without years of saving.)
    const gods = which === 'sanctuary' ? (['demeter'] as const) : (['athena', 'poseidon', 'apollo', 'demeter'] as const);
    income(s, gods.length * SANCTUARY_COST + yards * (MASONS_COST + JOBS.masons * WAGE) + COST.armoury + JOBS.armoury * WAGE, 'gifts', 'set up for this demo: the sanctuaries’ coin');
    if (which === 'sanctuary') {
      send({ type: 'sanctuary', god: 'demeter', at: [SANCT_SPOTS.demeter] });
      const at = spotNear(sim, 'masons', 2, 104, 70);
      if (at >= 0) send({ type: 'build', kind: 'masons', at: [at] });
      // (Review of slice 54: an armoury for the statue's bronze, and the timber and copper the town can't make, so it rises when played on.)
      const smithy = spotNear(sim, 'armoury', 3, 98, 64);
      if (smithy >= 0) send({ type: 'build', kind: 'armoury', at: [smithy] });
      playOn(2 * TICKS_PER_MONTH, () => rolling('demeter'));
      supplyStorehouse(sim, 240, 400);
      return;
    }
    for (const god of ['athena', 'poseidon', 'apollo'] as const) send({ type: 'sanctuary', god, at: [SANCT_SPOTS[god]] });
    for (const [cx, cz] of [[104, 70], [100, 74], [108, 72]]) {
      const at = spotNear(sim, 'masons', 2, cx, cz);
      if (at >= 0) send({ type: 'build', kind: 'masons', at: [at] });
    }
    const forge = spotNear(sim, 'armoury', 3, 98, 64);
    if (forge >= 0) send({ type: 'build', kind: 'armoury', at: [forge] });
    const athena = sanctuaryOf(s, 'athena');
    const poseidon = sanctuaryOf(s, 'poseidon');
    const apollo = sanctuaryOf(s, 'apollo');
    if (!athena || !poseidon || !apollo) return;
    // Athena's all three stages, Poseidon's two, Apollo's one: each goes as far as its materials let it.
    stockSanctuary(sim, athena, 0, 3);
    stockSanctuary(sim, poseidon, 0, 2);
    stockSanctuary(sim, apollo, 0, 1);
    playOn(SANCT_MOST, () => !!athena.finished && poseidon.stage >= 2 && apollo.stage >= 1);
    // Then Poseidon's statue and Apollo's temple, played until the statue is about half up.
    stockSanctuary(sim, poseidon, 2, 3);
    stockSanctuary(sim, apollo, 1, 2);
    playOn(SANCT_MOST, () => poseidon.stage >= 2 && poseidon.building && poseidon.work >= SANCT_STATUE * workOf(stagesOf(poseidon)[2]));
    // Demeter's marked out last, and played until its first marble is on the road.
    send({ type: 'sanctuary', god: 'demeter', at: [SANCT_SPOTS.demeter] });
    playOn(TICKS_PER_MONTH, () => rolling('demeter') && s.walkers.some((w) => w.kind === 'priest' && w.origin === athena.id));
    // (Review of slice 54: Demeter's timber and copper, and Apollo's copper for his statue, so they rise when played on.)
    supplyStorehouse(sim, 240, 480);
  };
}
const SANCTUARIES_TOWN = sanctuariesTown('sanctuaries');
const SANCTUARY_TOWN = sanctuariesTown('sanctuary');

/**
 * #twelve: all twelve sanctuaries finished in two rows of six facing each
 * other across a new road south of #quarry's town (the gods in their order,
 * Zeus to Ares on the north side, Aphrodite to Dionysus on the south), to
 * compare them. They are raised at once for the comparison, stage by stage
 * as if their builders had just finished each (set up for this demo: no
 * materials are hauled or used), so each god notices each stage as it would.
 */
const TWELVE_ROW = { x: 69, z: 50 };
function twelveTown(sim: Sim): void {
  WORKS_QUARRY_TOWN(sim);
  const s = sim.state;
  const n = sim.map.size;
  const send = (c: Parameters<Sim['enqueue']>[0]): void => {
    sim.enqueue(c);
    sim.flush();
  };
  income(s, GOD_IDS.length * SANCTUARY_COST + 40 * ROAD_COST, 'gifts', 'set up for this demo: the sanctuaries’ coin');
  const { x, z } = TWELVE_ROW;
  const row: number[] = [];
  for (let k = 0; k < 36; k++) row.push(z * n + x + k);
  send({ type: 'road', tiles: row });
  // Joined to the town's streets at its west end.
  let near = -1;
  let bd = Infinity;
  for (let t = 0; t < n * n; t++) {
    if (s.tiles[t] !== TILE_ROAD || row.includes(t)) continue;
    const d = Math.abs((t % n) - x) + Math.abs(Math.floor(t / n) - z);
    if (d < bd) {
      bd = d;
      near = t;
    }
  }
  if (near >= 0) send({ type: 'road', tiles: roadRoute(sim.map, s, z * n + x, near) ?? [] });
  GOD_IDS.forEach((god, i) => send({ type: 'sanctuary', god, at: [T(x + (i % 6) * 6, i < 6 ? z - 5 : z + 1)] }));
  // (No ox carts called for materials they won't need.)
  for (const b of s.buildings) if (b.kind === 'sanctuary') b.clock = TICKS_PER_MONTH;
  for (let stage = 0; stage < 3; stage++) {
    for (const god of GOD_IDS) {
      const site = sanctuaryOf(s, god);
      if (!site || site.finished) continue;
      site.building = true;
      site.work = workOf(stagesOf(site)[site.stage]);
    }
    sim.step();
  }
  sim.run(3 * TICKS_PER_DAY);
}

// ---------------------------------------------------------------------------
// Slice 38: contested seas.

/**
 * #blockade: #triremes' town (the shipyard by the river mouth, west of the
 * trading post) with two triremes built and crewed at its jetty, the
 * Tyrian ship tied up at the quay, as Troy's king (turned against the city,
 * set up for the demo and named so) has his fleet of three take station
 * across the harbour's mouth: the ship is held at the quay, and the triremes
 * row out to break it. #shipyard: the same played on until the blockade is
 * broken and the triremes are home, the most hurt laid up under repair, her
 * hull holed and her oars broken (if none came home hurt badly enough to be
 * laid up, she is called in for repair, as a player would), the shipyard's
 * panel open.
 */
const BLOCKADE_WHY = 'the king will not have a rival’s trade at sea so near his own lanes, as set up for this demo';
/** How long the staged war lasts, and the longest #blockade waits for the ship to tie up and #shipyard for the fight to end. */
const BLOCKADE_WAR = 6 * TICKS_PER_MONTH;
const BLOCKADE_WAIT = 4 * TICKS_PER_MONTH;
/** #blockade opens this many ticks after the ships take station: the triremes have just cast off. */
const BLOCKADE_LEAD = 6;
function blockadeTown(stage: 'blockade' | 'shipyard'): (sim: Sim) => void {
  return (sim) => {
    COMPANIES(sim);
    const s = sim.state;
    // (Two triremes, as #triremes has: a third would lie unmanned, the huts and cottages spared all the rowers they can.)
    fleetOf(sim, 2);
    // The Tyrian ship tied up at the quay, loading.
    const ship = s.trade.ship;
    const stop = s.tick + BLOCKADE_WAIT;
    while (s.tick < stop && ship.phase !== SHIP_MOORED) sim.run(10);
    const c = cityOf(s.world, 'troy');
    c.memories.push({ kind: 'staged', why: BLOCKADE_WHY, amount: -30, tick: s.tick, fade: 2 * TICKS_PER_YEAR });
    if (!stageBlockade(s, sim.map, 'troy', 3, BLOCKADE_WHY, s.tick + BLOCKADE_WAR)) return;
    sim.run(BLOCKADE_LEAD);
    if (stage === 'blockade') return;
    // #shipyard: on until it is over and every trireme is in; the most hurt laid up under repair.
    const end = s.tick + BLOCKADE_WAIT;
    const done = (): boolean => !s.fleet.blockades.some((b) => b.phase !== 'over') && s.fleet.triremes.every((t) => t.state === 'moored' || t.state === 'sinking');
    while (s.tick < end && !done()) sim.run(5);
    const hurt = s.fleet.triremes.filter((t) => t.state === 'moored' && (t.hp < 100 || t.oars < 100)).sort((a, b) => a.hp + a.oars - (b.hp + b.oars) || a.id - b.id)[0];
    if (hurt && !s.fleet.triremes.some((t) => t.mend)) {
      sim.enqueue({ type: 'fleet', trireme: hurt.id, act: 'repair' });
      sim.flush();
    }
  };
}
const BLOCKADE_TOWN = blockadeTown('blockade');
const SHIPYARD_TOWN = blockadeTown('shipyard');

/**
 * #games: #lit's town carried on: the Stadium laid out on the level ground
 * between the quay road and the quarry road, built by the same masons'
 * yards from the same quarry and Troy's timber, and played on until its
 * first games are on, the visitors in their seats.
 */
const GAMES_STADIUM = T(102, 69);
/** The games open with at least this many groups of visitors in their seats. */
const GAMES_SEATED = 20;
function gamesTown(sim: Sim): void {
  LIT_TOWN(sim);
  const s = sim.state;
  const seen = new Set(s.world.deals.map((d) => d.id));
  // (Review of slice 35: a town this rich turns down the loans it is offered, so no debt or loan news crowds a demo about the games.)
  const declineLoans = (): void => {
    for (const d of s.world.deals) {
      if (seen.has(d.id) || d.state !== 'open' || d.kind !== 'loanoffer') continue;
      seen.add(d.id);
      sim.enqueue({ type: 'answer', deal: d.id, act: 'decline' });
      sim.flush();
    }
  };
  const playOn = (most: number, done: () => boolean): void => {
    const end = s.tick + most;
    while (s.tick < end && !done()) {
      sim.run(TICKS_PER_DAY);
      declineLoans();
      answerAsMiddling(sim, seen);
    }
  };
  playOn(MONUMENT_MOST, () => spendable(s) >= STADIUM_COST + wageBill(s));
  sim.enqueue({ type: 'build', kind: 'stadium', at: [GAMES_STADIUM] });
  sim.flush();
  playOn(2 * MONUMENT_MOST, () => gamesOn(s) && s.walkers.filter((w) => w.kind === 'visitor' && w.steps === 1).length >= GAMES_SEATED);
}

// Slice 39
/**
 * Ambitions (slice 39). #ambition: #vassal's town with the ambitions on from
 * its founding, so its laurels came in play, each in its year and with its
 * reward (an army, Corinth bowed, a busy market, a thriving town, streets of
 * villas): a few milestones in across the three, the Ambition panel open.
 * #achieved: that town carried on, as a player chasing Master of Greece
 * would: the Colossus marked out at the harbour mouth, west of the trading
 * post, on a spur off the quay road, with three masons' yards by the quay;
 * its marble, timber and bronze put on site (set up for this demo, and named
 * so: the town has no quarry, and its mine would take years to give 700 of
 * copper); played on until he stands. Then two companies of hirelings at the
 * barracks, and Argos and Thebes bowed by awe (set up for this demo: the
 * dice would decide), until the last of Master of Greece's five is won.
 */
const ACHIEVED_COLOSSUS = T(70, 68);
const ACHIEVED_SPUR = [T(73, 68)];
const ACHIEVED_YARDS = [T(76, 69), T(78, 69), T(75, 62)];
/** How long #achieved may play on, at most, to each of its moments. */
const ACHIEVED_MOST = 2 * TICKS_PER_YEAR;
/** What #ambition's builder keeps back besides the east street's cost (about a month's wages then; see eastSpare). */
const AMBITION_EAST_SPARE = 200;
function ambitionTown(stage: 'ambition' | 'achieved'): (sim: Sim) => void {
  return (sim) => {
    ambition(sim, true);
    // (The merge of slice 39 with the trunk: a month's wages kept back before the east street goes in; see eastSpare.)
    eastSpare = AMBITION_EAST_SPARE;
    try {
      empireTown('vassal')(sim);
    } finally {
      eastSpare = 0;
    }
    if (stage === 'ambition') return;
    const s = sim.state;
    const seen = new Set(s.world.deals.map((d) => d.id));
    const send = (c: Parameters<Sim['enqueue']>[0]): void => {
      sim.enqueue(c);
      sim.flush();
    };
    const playOn = (most: number, done: () => boolean): void => {
      const end = s.tick + most;
      while (s.tick < end && !done()) {
        sim.run(TICKS_PER_DAY);
        answerAsMiddling(sim, seen);
      }
    };
    const cost = ACHIEVED_SPUR.length * ROAD_COST + COLOSSUS_COST + ACHIEVED_YARDS.length * (MASONS_COST + JOBS.masons * WAGE);
    playOn(ACHIEVED_MOST, () => spendable(s) >= cost + wageBill(s));
    send({ type: 'road', tiles: ACHIEVED_SPUR });
    send({ type: 'build', kind: 'colossus', at: [ACHIEVED_COLOSSUS] });
    for (const at of ACHIEVED_YARDS) send({ type: 'build', kind: 'masons', at: [at] });
    const site = monumentOf(s, 'colossus');
    const b = site && s.buildings.find((x) => x.id === site.id);
    if (!site || !b) return;
    for (const w of [MARBLE, TIMBER, COPPER]) {
      const n = totalOf('colossus', w);
      setHeld(b, w, held(b, w) + n);
      note(s, w, 'bought', 'for the Colossus (set up for this demo)', n);
    }
    playOn(ACHIEVED_MOST, () => !!site.finished);
    // The hirelings, as soon as the treasury can spare their fees and some months' pay.
    const barracks = s.buildings.find((x) => x.kind === 'barracks');
    if (!barracks) return;
    for (const kind of ['arcadian', 'cretan'] as const) {
      playOn(ACHIEVED_MOST, () => spendable(s) >= HIRELINGS[kind].fee + 3 * wageBill(s));
      send({ type: 'hire', barracks: barracks.id, kind });
    }
    const hired = s.army.companies.filter((c) => c.hired);
    playOn(2 * TICKS_PER_MONTH, () => hired.every((c) => readyOf(s, c).length >= COMPANY_SIZE));
    for (const id of ['argos', 'thebes'] as const) {
      if (vassalOf(s, id)) continue;
      take(s, cityOf(s.world, id), 'awe', 'it bowed to your herald (set up for this demo)');
      sim.run(TICKS_PER_DAY);
    }
    playOn(TICKS_PER_MONTH, () => achieved(s, 'greece').tick > 0);
    sim.run(2 * TICKS_PER_DAY);
  };
}

// Slice 36
/**
 * The great houses (slice 36). #estates: #richtown's town carried on, as its
 * builder would once its villas stand: first a marble quarry on the headland
 * (as #quarry's, its sledges bringing the blocks round the bay to the
 * storehouse by the quay) and two estates' plots facing each other across the
 * road down to the quay, just below the villas of the main street (their
 * noble houses take a while to come in from the edge of the map); then a
 * copper mine and an armoury on the oil road (as #bronze's), a horse farm and
 * a second sheep pasture on the river meadow and a fleece stall at the east
 * agora (each great estate wears as much fleece as a street of villas).
 * Played on until both are great estates, full, with nothing to warn about,
 * and a few days more, so their porters and grooms are on the road. It opens
 * over the two, the first one's panel open. #horsemen: the same town with four
 * more estates' plots down the road and a barracks (as #barracks'), a company
 * of horsemen raised once their noble houses are in, and Sparta's band sent
 * at the city when the riders are ready (set up for the demo, and named so):
 * it opens paused about ESTATE_RAID_DAYS days before the band reaches the
 * west edge, the horsemen's banner in hand and the Army tab open.
 */
const ESTATE_PLOTS = [T(70, 44), T(75, 44)];
const MORE_ESTATE_PLOTS = [T(70, 48), T(75, 48), T(70, 52), T(75, 52)];
const ESTATE_FOUNTAIN = T(75, 56);
const ESTATE_SHRINE = T(75, 58);
/** (Slice 36's review: #horsemen's shrine for the villas west of the core, whose priestess went other ways once the estates were on her round, and a storehouse on the meadow by the two pastures, whose carts were all on the long road to the storehouse in the east.) */
const WEST_SHRINE = T(60, 36);
const MEADOW_STOREHOUSE = T(44, 38);
const ESTATE_HORSEFARM = T(56, 38);
const ESTATE_PASTURE = T(39, 38);
/** The longest #estates plays on for its two great estates, full (two years), and how long after. */
const ESTATES_WAIT = 2 * TICKS_PER_YEAR;
const ESTATES_AFTER = 4 * TICKS_PER_DAY;
/** The longest #horsemen waits for its riders (four months), and how many days from the edge Sparta's band is when it opens. */
const HORSEMEN_WAIT = 4 * TICKS_PER_MONTH;
const ESTATE_RAID_DAYS = 10;
/** (Slice 36's review: and how many men Sparta sends. A city this size draws a band of 38, which six riders on their own can't break: riders ride down a band that runs, they don't stand against one five times their number. So the demo's band is a small one, of a size six riders can break.) */
const HORSEMEN_BAND = 8;
function estatesTown(stage: 'estates' | 'horsemen'): (sim: Sim) => void {
  return (sim) => {
    town(TOWN_TICKS, SAFE, true)(sim);
    const s = sim.state;
    const send = (c: Parameters<Sim['enqueue']>[0]): void => {
      sim.enqueue(c);
      sim.flush();
    };
    // Marble first (its sledges take months to come round the bay to the storehouse by the quay: a storehouse out at
    // the quarry, as #quarry's, was over sixty days' walk from the estates for their porters), and the two estates'
    // plots (their noble houses take a while to come in from the edge of the map).
    const quarryRoad = roadRoute(sim.map, s, WORKS_QUARRY_FROM, WORKS_QUARRY_TO) ?? [];
    waitFor(sim, s.tick, quarryRoad.length * ROAD_COST + QUARRY_COST + ESTATE_PLOTS.length * ESTATE_PLOT_COST + JOBS.quarry * WAGE);
    send({ type: 'road', tiles: quarryRoad });
    send({ type: 'build', kind: 'quarry', at: [WORKS_QUARRY] });
    send({ type: 'estate', at: ESTATE_PLOTS });
    const estates = s.buildings.filter((b) => b.estate);
    // Bronze: the mine on the east hills and the armoury on the oil road.
    const mineRoad = roadRoute(sim.map, s, T(TOWN_OIL_X, TOWN_OIL_ROAD), T(ARMS_ROAD_END.x, ARMS_ROAD_END.z)) ?? [];
    waitFor(sim, s.tick, mineRoad.length * ROAD_COST + MINE_COST + ARMOURY_COST + (JOBS.mine + JOBS.armoury) * WAGE);
    send({ type: 'road', tiles: mineRoad });
    send({ type: 'build', kind: 'mine', at: [T(ARMS_MINE.x, ARMS_MINE.z)] });
    send({ type: 'build', kind: 'armoury', at: [T(ARMS_ARMOURY.x, ARMS_ARMOURY.z)] });
    // Horses and more fleece, on the river meadow, and a fleece stall at the east agora.
    waitFor(sim, s.tick, HORSEFARM_COST + PASTURE_COST + STALL_COST + (JOBS.horsefarm + JOBS.pasture + 1) * WAGE);
    send({ type: 'build', kind: 'horsefarm', at: [ESTATE_HORSEFARM] });
    send({ type: 'build', kind: 'pasture', at: [ESTATE_PASTURE] });
    send({ type: 'stall', at: T(97, 42), good: FLEECE });
    // (And with nothing to warn about: a great estate wears its fleece faster than the vendor's round comes by at first.)
    const great = (): boolean => estates.every((e) => e.level === GREAT_ESTATE && e.people >= capacity(e) && estateWarnings(s, e).length === 0);
    const end = s.tick + ESTATES_WAIT;
    while (s.tick < end && !great()) sim.run(10);
    sim.run(ESTATES_AFTER);
    if (stage === 'estates') return;
    // Four more estates down the road, and a barracks for their sons.
    waitFor(sim, s.tick, MORE_ESTATE_PLOTS.length * ESTATE_PLOT_COST + FOUNTAIN_COST + 2 * SHRINE_COST + 2 * JOBS.shrine * WAGE + STOREHOUSE_COST + JOBS.storehouse * WAGE + ARMS_LANE.length * ROAD_COST + BARRACKS_COST + JOBS.barracks * WAGE);
    send({ type: 'estate', at: MORE_ESTATE_PLOTS });
    send({ type: 'build', kind: 'shrine', at: [WEST_SHRINE] });
    send({ type: 'build', kind: 'storehouse', at: [MEADOW_STOREHOUSE] });
    // (A fountain for the lower two, beyond the main street's fountains' reach, and a shrine: one priestess's round
    // didn't reach the core's north streets as well once the estates were on it.)
    send({ type: 'fountain', at: [ESTATE_FOUNTAIN] });
    send({ type: 'build', kind: 'shrine', at: [ESTATE_SHRINE] });
    send({ type: 'road', tiles: ARMS_LANE });
    send({ type: 'build', kind: 'barracks', at: [T(ARMS_BARRACKS.x, ARMS_BARRACKS.z)] });
    const barracks = s.buildings.find((b) => b.kind === 'barracks');
    if (!barracks) return;
    const all = s.buildings.filter((b) => b.estate);
    const stop = s.tick + HORSEMEN_WAIT;
    // Raised once the noble houses are in (an estate's son rides from the day it is one).
    while (s.tick < stop && !(barracks.workers > 0 && all.every((e) => e.level >= ESTATE))) sim.run(10);
    send({ type: 'raise', barracks: barracks.id, kind: 'horseman' });
    const c = s.army.companies.find((x) => x.kind === 'horseman');
    if (!c) return;
    while (s.tick < stop && readyOf(s, c).length < Math.min(all.length, companySize('horseman'))) sim.run(10);
    // A few days' drill, then Sparta's band. (At the merge with the trunk: and, within a month, a day the town has nothing
    // to warn about: with the walkers' crews, the actor's round reached the two newest estates a few days later.)
    sim.run(2 * TICKS_PER_DAY);
    const calm = (): boolean => s.buildings.every((b) => b.kind !== 'home' || b.people === 0 || estateWarnings(s, b).length === 0);
    const settle = s.tick + TICKS_PER_MONTH;
    while (s.tick < settle && !calm()) sim.run(10);
    stagedRaid(sim, 'sparta', 'the king will not have a city of horsemen so near his lands', HORSEMEN_BAND);
    const r = s.world.raids.find((x) => x.city === 'sparta' && x.ended === 0);
    if (!r) return;
    while (!(r.phase === 'marching' && r.start + r.dur - s.tick <= ESTATE_RAID_DAYS * TICKS_PER_DAY) && r.phase !== 'raiding' && s.tick < r.start + TICKS_PER_YEAR) sim.step();
  };
}
const ESTATES = estatesTown('estates');
const HORSEMEN = estatesTown('horsemen');
/** #estates: the first estate's panel; #horsemen: the horsemen's banner. */
const firstEstate = (s: SimState): number => s.buildings.find((b) => b.estate && b.level >= GREAT_ESTATE)?.id ?? 0;
const horsemenBanner = (s: SimState): number => s.army.companies.find((c) => c.kind === 'horseman')?.id ?? 0;

// Slice 37
/**
 * Colonies (slice 37). #colony: #richtown's town played on, as a player
 * saving for it would, until the treasury can fit out settlers and still pay
 * a month's wages (a year at most); then settlers sent to Thasos (if a rival
 * is bound there or holds it, the first free site instead, named so), played
 * on until your ship rides at anchor off the jetty, the families still
 * walking down to the quay (review of slice 37: it opens paused).
 * #colonies: the same town, answering Greece as a middling player would,
 * its first settlers sent to Naxos instead (sent to Thasos first, the town
 * could not pay for a second before Rhodes' settlers were on Naxos), and to
 * Thasos once they have landed and it can pay again (the first free site if
 * a rival is there first); each colony's share left fair, any threat let be (the town has no
 * triremes); played on until the second colony is two years old: the map of
 * Greece open on Nea Thasos' page. #ally: #collect's town; an alliance
 * offered to Corinth, as a player wanting friends against Sparta would (if
 * its ruler says no, it is made anyway, set up for this demo and named so);
 * then Sparta's king turned against the city (set up the same way), played
 * on until Corinth's company has come in at your edge by its caravans' road
 * and walked a few days: the camera on the road where they came in.
 */
type ColonyStage = 'colony' | 'colonies' | 'ally';
/** How long a colony demo waits, at most, for the treasury (or for a founding to land). */
const COLONY_WAIT = TICKS_PER_YEAR;
/** How long #colonies plays on after its second colony lands. */
const COLONIES_YEARS = 2;
/** How many days #ally's allies have walked in from your edge. */
const ALLY_DAYS = 3;

function colonyTown(stage: ColonyStage): (sim: Sim) => void {
  return (sim) => {
    const s = sim.state;
    const send = (c: Parameters<Sim['enqueue']>[0]): void => {
      sim.enqueue(c);
      sim.flush();
    };
    const seen = new Set<number>();
    const playOn = (most: number, done: () => boolean): void => {
      const end = s.tick + most;
      while (s.tick < end && !done()) {
        sim.run(TICKS_PER_DAY);
        if (stage === 'colonies') answerAsMiddling(sim, seen);
      }
    };
    // (Settlers sent to a site once the treasury can pay for them and a month's wages: the site named, or the first free one.)
    const found = (want: string): string => {
      playOn(COLONY_WAIT, () => spendable(s) >= FOUND_COST + wageBill(s));
      const free = (id: string): boolean => foundRefusal(s, sim.map, id) === '';
      const site = free(want) ? want : (s.world.sites.find((x) => free(x.id))?.id ?? want);
      send({ type: 'colony', act: 'found', site });
      return site;
    };
    if (stage === 'colony' || stage === 'colonies') {
      town(TOWN_TICKS, SAFE, true)(sim);
      for (const d of s.world.deals) seen.add(d.id);
      // (#colonies to Naxos first: by the time the town could pay for a second, Rhodes' settlers were there.)
      const first = found(stage === 'colony' ? 'thasos' : 'naxos');
      const f = foundingOf(s, first);
      if (!f) return;
      if (stage === 'colony') {
        // (Review of slice 37: until your ship has anchored, the families still on the road a few days from the quay; it opens
        // paused. Played on to the first household aboard, it opened two days before she sailed: too quick to watch or hover.)
        playOn(3 * TICKS_PER_MONTH, () => f.phase !== 'gathering' || !f.ship || f.ship.phase === SHIP_ANCHORED);
        return;
      }
      playOn(COLONY_WAIT, () => !!colonyOf(s, first) || !foundingOf(s, first));
      const second = found('thasos');
      playOn(COLONY_WAIT, () => !!colonyOf(s, second) || !foundingOf(s, second));
      const landed = colonyOf(s, second)?.since ?? s.tick;
      playOn(COLONIES_YEARS * TICKS_PER_YEAR, () => s.tick >= landed + COLONIES_YEARS * TICKS_PER_YEAR);
      return;
    }
    debtTown('collect')(sim);
    send({ type: 'empire', act: 'ally', city: 'corinth' });
    const h = s.empire.heralds.find((x) => x.city === 'corinth' && x.kind === 'alliance');
    if (h) while (h.answer === '' && s.tick < h.due + TICKS_PER_DAY) sim.run(10);
    if (!allyOf(s, 'corinth')) {
      s.empire.allies.push({ city: 'corinth', since: s.tick, refused: [], declined: 0 });
      news(s.world, s.tick, 'corinth', 'Corinth is your ally (set up for this demo): it sends men when you are raided');
    }
    stagedRaid(sim, 'sparta', 'the king will not have Corinth’s friend grow strong beside him');
    const until = s.tick + 4 * TICKS_PER_MONTH;
    while (s.tick < until && !s.empire.aid.some((a) => a.city === 'corinth' && a.phase === 'city')) sim.run(10);
    sim.run(ALLY_DAYS * TICKS_PER_DAY);
  };
}
const COLONY_TOWN = colonyTown('colony');
const COLONIES_TOWN = colonyTown('colonies');
const ALLY_TOWN = colonyTown('ally');

// Slice 43
/**
 * Colonies that grow up (slice 43). #colonywants: #colonies' town, Nea
 * Thasos asking you for wheat after a hard winter (the ask set up for this
 * demo and named so; if your granaries could not spare it, the rest put in
 * them for the demo and named so in the stock book), its page open on the
 * map of Greece. #colonyworks: the same town, Nea Thasos a settlement (grown
 * to one for the demo, and named so, if it is still an outpost), the timber
 * for its harbour in your storehouses (topped up for the demo the same way),
 * its page open on the map.
 */
function grownColonyTown(stage: 'wants' | 'works'): (sim: Sim) => void {
  return (sim) => {
    COLONIES_TOWN(sim);
    const s = sim.state;
    const c = s.empire.colonies.find((x) => x.site === 'thasos') ?? s.empire.colonies[0];
    if (!c) return;
    // (Enough of a good in your stores, the rest put there for the demo.)
    const topUp = (w: number, n: number): void => {
      const k = TRADE_GOODS.indexOf(w as never);
      const short = n - storesSpare(s, k);
      const b = s.buildings.find((x) => x.kind === storeKind(w as never));
      if (short <= 0 || !b) return;
      setHeld(b, w as never, held(b, w as never) + short);
      note(s, w as never, 'bought', 'for a colony (set up for this demo)', short);
    };
    if (stage === 'wants') {
      const w = askColony(s, c, 'wheat', 'set up for this demo');
      topUp(WHEAT, w.amount + 100);
      return;
    }
    if (stageOf(c) < 1) {
      const x = s.world.sites.find((y) => y.id === c.site);
      if (x) x.pop = Math.max(x.pop, STAGE_FROM[1] + 40);
      c.stage = 1;
      news(s.world, s.tick, c.site, `${c.name} has grown into a settlement (set up for this demo)`);
    }
    topUp(TIMBER, WORKS.harbour.amount + 50);
  };
}
const COLONYWANTS_TOWN = grownColonyTown('wants');
const COLONYWORKS_TOWN = grownColonyTown('works');

// Slice 47
/**
 * A colonial empire (slice 47). #colonybase: #colonies' town carried on as a
 * player building a colonial empire would, each step once the treasury can
 * pay for it and a month's wages: a barracks (with the road to it) and a
 * company of Arcadian hoplites hired there, then a shipyard and two
 * triremes; Nea Thasos grown to a town (for the demo, and named so, if it is
 * not one yet), Nea Naxos a settlement, and a third colony on Kythnos (or the
 * first free site), planted for the demo and named so, an outpost; then
 * Rhodes' ships sent against Nea Naxos (set up for the demo and named so) on
 * a day whose roll your two triremes off its shore would win and Nea Naxos
 * alone would lose. Nea Naxos' page open on the map of Greece.
 * #freeally: #colonies' town, Nea Thasos grown to about 620 people and its
 * people turned against being ruled from across the sea (both set up for
 * the demo and named so), played on until it talks of freedom: its page
 * open, with the treaty that would make it a free ally.
 */
/** #colonybase: how long it waits for the hirelings to walk in (two months), and the threat's roll it looks for (no higher). */
const BASE_HIRE_WAIT = 2 * TICKS_PER_MONTH;
const BASE_ROLL = 0.4;
/** #freeally: Nea Thasos' people, and how long it plays on for its talk of freedom (a few months at most). */
const FREE_PEOPLE = 620;
const FREE_WAIT = 4 * TICKS_PER_MONTH;
function colonyBaseTown(stage: 'base' | 'freeally'): (sim: Sim) => void {
  return (sim) => {
    COLONIES_TOWN(sim);
    const s = sim.state;
    const send = (c: Parameters<Sim['enqueue']>[0]): void => {
      sim.enqueue(c);
      sim.flush();
    };
    const thasos = s.empire.colonies.find((x) => x.site === 'thasos') ?? s.empire.colonies[s.empire.colonies.length - 1];
    if (!thasos) return;
    const grow = (c: Colony, people: number, why: string): void => {
      const x = siteRecord(s, c.site);
      if (!x || x.pop >= people) return;
      x.pop = people;
      c.stage = stageFor(people, c.stage);
      news(s.world, s.tick, `site:${c.site}`, `${c.name} has grown to ${people} people (${why}, set up for this demo)`);
    };
    if (stage === 'freeally') {
      grow(thasos, FREE_PEOPLE, 'newcomers from all over Greece');
      thasos.memories.push({ kind: 'staged', why: 'its people resent being ruled from across the sea (set up for this demo)', amount: -55, tick: s.tick, fade: 3 * TICKS_PER_YEAR });
      const stop = s.tick + FREE_WAIT;
      while (s.tick < stop && !thasos.talk) sim.run(TICKS_PER_DAY);
      return;
    }
    // A barracks and its road, and a company of Arcadian hoplites hired there.
    const road = roadRoute(sim.map, s, T(TOWN_OIL_X, TOWN_OIL_ROAD), T(ARMS_ROAD_END.x, ARMS_ROAD_END.z)) ?? [];
    waitFor(sim, s.tick, (road.length + ARMS_LANE.length) * ROAD_COST + BARRACKS_COST + JOBS.barracks * WAGE + HIRELINGS.arcadian.fee);
    send({ type: 'road', tiles: road });
    send({ type: 'road', tiles: ARMS_LANE });
    send({ type: 'build', kind: 'barracks', at: [T(ARMS_BARRACKS.x, ARMS_BARRACKS.z)] });
    const barracks = s.buildings.find((b) => b.kind === 'barracks');
    if (barracks) {
      const staffed = s.tick + 4 * TICKS_PER_DAY;
      while (s.tick < staffed && barracks.workers === 0) sim.step();
      send({ type: 'hire', barracks: barracks.id, kind: 'arcadian' });
      const hired = s.army.companies.find((c) => c.hired === 'arcadian');
      const stop = s.tick + BASE_HIRE_WAIT;
      while (hired && s.tick < stop && readyOf(s, hired).length < COMPANY_SIZE) sim.run(10);
    }
    // A shipyard and two triremes.
    fleetOf(sim, 2, (cost) => waitFor(sim, s.tick, cost + wageBill(s)));
    // Three colonies at three stages.
    grow(thasos, STAGE_FROM[2] + 30, 'newcomers from the north');
    const free = (id: string): boolean => {
      const x = siteRecord(s, id);
      return !!x && !x.owner && !x.bound && !x.free;
    };
    const third = ['kythnos', 'melos', 'kythera', 'cyrene'].find(free);
    if (third) {
      const c = plantColony(s, third, 70, s.tick - 4 * TICKS_PER_MONTH, 'Lykon', 'steady');
      news(s.world, s.tick, `site:${third}`, `${c.name} was founded on ${c.name.replace(/^Nea /, '')} four months ago (planted for this demo): an outpost of 70 people`);
    }
    // Rhodes' ships against Nea Naxos, on a day whose roll your two triremes would win.
    const naxos = colonyOf(s, 'naxos');
    if (!naxos) return;
    const rhodes = cityOf(s.world, 'rhodes');
    const ships = Math.max(2, Math.min(5, Math.round(rhodes.fleet / 4)));
    const odds = fightOdds(2, ships);
    for (let k = 0; k < 2 * TICKS_PER_MONTH; k++) {
      const roll = fightRoll(s, naxos, { at: s.tick + k } as ColonyThreat);
      if (roll < Math.min(BASE_ROLL, odds - 0.05) && roll >= ownDefence(naxos)) {
        sim.run(k);
        break;
      }
    }
    threatenColony(s, naxos, 'rhodes', 'raid');
    const last = s.world.news[s.world.news.length - 1];
    if (last && last.line.startsWith(`${naxos.threat?.ships} ships of Rhodes`)) last.line = last.line.replace(' to raid it:', ' to raid it (set up for this demo):');
  };
}
const COLONYBASE_TOWN = colonyBaseTown('base');
const FREEALLY_TOWN = colonyBaseTown('freeally');

// Slice 40
/**
 * An empire's city (slice 40). #empire: #ambition's town (the ambitions on
 * from its founding and its laurels won in play, Corinth its vassal for its
 * debt, two companies at the barracks, the mine and the armoury) carried on
 * as a player chasing all three ambitions would, each step once the treasury
 * can pay for it and a month's wages, answering Greece as a middling player
 * would but turning down loans (a town this rich has no need of them):
 * - marble and a noble house, as #estates': the quarry on the headland's
 *   crown (its sledges bring the blocks round the bay to the quay's
 *   storehouse) and an estate's plot below the villas; a horse farm and a
 *   second sheep pasture on the river meadow and a fleece stall at the east
 *   agora;
 * - a colony: settlers sent to Thasos (the first free site if a rival is
 *   bound there or holds it), its share left fair;
 * - the Lighthouse on the headland, as #monument's: the spur road out to its
 *   top, two masons' yards by the quarry road, and sea routes to Troy for its
 *   timber and to Athens for marble;
 * - a second estate's plot once the first is a great estate.
 * Played on until the colony's share has come in by ship, the Lighthouse is
 * part built with its ox carts on the road and the second estate's noble
 * house is in; then on into the autumn, crime switched on as it is when a
 * town opens (EMPIRE_CRIME before), until a few weeks before winter. Then
 * Rhodes' queen is turned against the city (set up for this demo, and named
 * so), her fleet put to sea to blockade the harbour: it opens a few days
 * later with her ships on their lane, not yet on your horizon, and a thief
 * out if one is (EMPIRE_THIEF days at most).
 */
/** The second estate's plot, across the road down to the quay from the first. */
const EMPIRE_PLOTS = ESTATE_PLOTS;
/** The newcomers' street: #thieves' street of plots on the slope behind the core's villas, off the oil road, with its own fountain. */
const EMPIRE_STREET = [...THIEF_ROAD].reverse();
const EMPIRE_STREET_PLOTS = along(THIEF_XS, 27);
const EMPIRE_STREET_FOUNTAIN = T(THIEF_FOUNTAIN.x, THIEF_FOUNTAIN.z);
/** How long #empire may play on, at most, to each of its moments. */
const EMPIRE_MOST = 2 * TICKS_PER_YEAR;
/** How much Athens' ships bring of marble at most (the Lighthouse needs 1,000 or so; the quarry cuts about 100 a month). */
const EMPIRE_MARBLE = 400;
/** Crime is switched on this long before the blockade's fleet puts to sea (temptation builds from nothing, as in a town just opened). */
const EMPIRE_CRIME = 2 * TICKS_PER_MONTH;
/** The fleet puts to sea this many days before winter, and the town opens this many days after it does (a thief out within EMPIRE_THIEF more, if one goes). */
const EMPIRE_WINTER_DAYS = 32;
const EMPIRE_SAILED_DAYS = 2;
const EMPIRE_THIEF = 4;
/** The city whose fleet comes, why, its ships, and how long its staged war lasts. */
const EMPIRE_FOE: CityId = 'rhodes';
const EMPIRE_WHY = 'the queen will not have a rival’s Lighthouse and colonies across her sea lanes, as set up for this demo';
const EMPIRE_SHIPS = 3;
const EMPIRE_WAR = 6 * TICKS_PER_MONTH;
function empireCityTown(sim: Sim): void {
  ambitionTown('ambition')(sim);
  const s = sim.state;
  const seen = new Set(s.world.deals.map((d) => d.id));
  const send = (c: Parameters<Sim['enqueue']>[0]): void => {
    sim.enqueue(c);
    sim.flush();
  };
  // (As #games' town: loans offered are turned down, so no debt's line crowds the demo.)
  const answer = (): void => {
    for (const d of s.world.deals) {
      if (seen.has(d.id) || d.state !== 'open' || d.kind !== 'loanoffer') continue;
      seen.add(d.id);
      send({ type: 'answer', deal: d.id, act: 'decline' });
    }
    answerAsMiddling(sim, seen);
  };
  const playOn = (most: number, done: () => boolean): void => {
    const end = s.tick + most;
    while (s.tick < end && !done()) {
      sim.run(TICKS_PER_DAY);
      answer();
    }
  };
  const afford = (cost: number): void => playOn(EMPIRE_MOST, () => spendable(s) >= cost + wageBill(s));
  // Marble and the first estate's plot.
  const quarryRoad = roadRoute(sim.map, s, WORKS_QUARRY_FROM, WORKS_QUARRY_TO) ?? [];
  afford(quarryRoad.length * ROAD_COST + QUARRY_COST + ESTATE_PLOT_COST + JOBS.quarry * WAGE);
  send({ type: 'road', tiles: quarryRoad });
  send({ type: 'build', kind: 'quarry', at: [WORKS_QUARRY] });
  send({ type: 'estate', at: [EMPIRE_PLOTS[0]] });
  // A new street for a great city's newcomers, as a player chasing 2,000 people would lay out: off the quay road on the meadow below the estates, with its own fountain.
  afford(EMPIRE_STREET.length * ROAD_COST + EMPIRE_STREET_PLOTS.length * 10 + FOUNTAIN_COST + JOBS.fountain * WAGE);
  send({ type: 'road', tiles: EMPIRE_STREET });
  send({ type: 'plots', at: EMPIRE_STREET_PLOTS });
  send({ type: 'fountain', at: [EMPIRE_STREET_FOUNTAIN] });
  // Horses and more fleece, on the river meadow, and a fleece stall at the east agora.
  afford(HORSEFARM_COST + PASTURE_COST + STALL_COST + (JOBS.horsefarm + JOBS.pasture + 1) * WAGE);
  send({ type: 'build', kind: 'horsefarm', at: [ESTATE_HORSEFARM] });
  send({ type: 'build', kind: 'pasture', at: [ESTATE_PASTURE] });
  send({ type: 'stall', at: T(97, 42), good: FLEECE });
  // A colony.
  afford(FOUND_COST);
  const free = (id: string): boolean => foundRefusal(s, sim.map, id) === '';
  const site = free('thasos') ? 'thasos' : (s.world.sites.find((x) => free(x.id))?.id ?? 'thasos');
  send({ type: 'colony', act: 'found', site });
  // The Lighthouse, and its timber and marble by sea.
  const spur = roadRoute(sim.map, s, MONUMENT_SPUR_FROM, MONUMENT_SPUR_TO) ?? [];
  afford(spur.length * ROAD_COST + LIGHTHOUSE_COST + MONUMENT_YARDS.length * (MASONS_COST + JOBS.masons * WAGE));
  send({ type: 'road', tiles: spur });
  send({ type: 'build', kind: 'lighthouse', at: [MONUMENT_LIGHTHOUSE] });
  for (const at of MONUMENT_YARDS) send({ type: 'build', kind: 'masons', at: [at] });
  for (const [city, good, upto] of [['troy', TIMBER, MONUMENT_TIMBER], ['athens', MARBLE, EMPIRE_MARBLE]] as const) {
    playOn(EMPIRE_MOST, () => routeRefusal(s, city, 'sea') === '' && spendable(s) >= routeWay(city, 'sea')!.fee + 3 * wageBill(s));
    if (routeRefusal(s, city, 'sea')) continue;
    send({ type: 'route', city, kind: 'sea' });
    send({ type: 'deal', city, kind: 'sea', good, buy: true, upto });
  }
  // On until the first estate is great; then the second's plot.
  const estates = (): Building[] => s.buildings.filter((b) => b.estate);
  playOn(EMPIRE_MOST, () => estates().some((e) => e.level === GREAT_ESTATE && e.people >= capacity(e)));
  afford(ESTATE_PLOT_COST);
  send({ type: 'estate', at: [EMPIRE_PLOTS[1]] });
  // On until the colony's share has come in, the Lighthouse's second stage is going up and the second noble house is in.
  const lighthouse = (): ReturnType<typeof monumentOf> => monumentOf(s, 'lighthouse');
  const shared = (): boolean => s.empire.colonies.some((c) => c.sent > 0);
  const rising = (): boolean => {
    const x = lighthouse();
    return !!x && (x.stage >= 1 || x.finished > 0);
  };
  // On to EMPIRE_WINTER_DAYS before the next winter (one with most of its autumn still to come), crime on EMPIRE_CRIME before.
  const sailFrom = (t: number): number => winterAfter(t + EMPIRE_CRIME + EMPIRE_WINTER_DAYS * TICKS_PER_DAY) - EMPIRE_WINTER_DAYS * TICKS_PER_DAY;
  // (Merge of slice 41: since the dockers' fix moved this history, this step ran on past the day crime was due to go on, so
  // crime had ten days instead of two months and no thief was out as the town opened. Crime now goes on on its day, even
  // while this step is still playing.)
  playOn(EMPIRE_MOST, () => {
    if (!s.crime.on && s.tick >= sailFrom(s.tick) - EMPIRE_CRIME) crime(sim, true);
    return shared() && rising() && estates().every((e) => e.level >= ESTATE);
  });
  const sail = sailFrom(s.tick);
  playOn(EMPIRE_MOST, () => s.tick >= sail - EMPIRE_CRIME);
  crime(sim, true);
  playOn(EMPIRE_MOST, () => s.tick >= sail);
  // Rhodes' fleet puts to sea against the harbour.
  const c = cityOf(s.world, EMPIRE_FOE);
  c.memories.push({ kind: 'staged', why: EMPIRE_WHY, amount: -30, tick: s.tick, fade: 2 * TICKS_PER_YEAR });
  sendBlockade(s, { city: EMPIRE_FOE, cause: 'staged', of: 0, why: EMPIRE_WHY }, EMPIRE_SHIPS, s.tick + EMPIRE_WAR);
  playOn(EMPIRE_SAILED_DAYS * TICKS_PER_DAY, () => false);
  playOn(EMPIRE_THIEF * TICKS_PER_DAY, () => s.walkers.some((w) => w.kind === 'thief'));
}

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
  warning: { view: 'warning', speed: 'paused', tool: 'road', setup: cutTown(CUT_WARNING, true), overlay: 'missing', open: (s) => warned(s, true), mark: CUT },
  decline: { view: 'decline', setup: cutTown(CUT_DECLINE), overlay: 'missing', open: (s) => warned(s, false), mark: CUT },
  missing: { view: 'missing', setup: foodTown(MISSING_TICKS, 400, 200, { farms: 1 }), overlay: 'missing', overlayOn: true },
  grow: { view: 'grow', tool: 'shrine', setup: growTown(FOOD_TICKS), overlay: 'religion' },
  shrine: { view: 'shrine', setup: cultureTown(SHRINE_TICKS, false), overlay: 'religion' },
  priestess: { view: 'priestess', setup: cultureTown(SHRINE_TICKS, false), follow: 'priestess', overlay: 'religion' },
  theatre: { view: 'theatre', setup: cultureTown(THEATRE_TICKS), overlay: 'culture' },
  actor: { view: 'actor', setup: cultureTown(THEATRE_TICKS), follow: 'actor', overlay: 'culture' },
  fine: { view: 'fine', setup: cultureTown(FINE_TICKS), overlay: 'missing' },
  compare: { view: 'compare', setup: cultureTown(FINE_TICKS), overlay: 'missing' },
  closed: { view: 'closed', speed: 'paused', setup: closedTown, overlay: 'missing', open: (s) => warned(s, false), mark: CUT },
  harsh: { view: 'town', setup: harshTown, overlay: 'missing', open: drivenOut },
  dry: { view: 'town', speed: 'paused', setup: dryTown, overlay: 'missing', open: (s) => homes(s).find((b) => b.unpaid > 0)?.id ?? 0 },
  taxes: { view: 'taxes', tool: 'taxoffice', setup: taxesTown, overlay: 'tax' },
  ledger: { view: 'town', setup: town(TOWN_TICKS), overlay: 'missing', ledger: true },
  collector: { view: 'collector', setup: town(TOWN_TICKS), follow: 'tax', overlay: 'tax', overlayOn: true },
  hunter: { view: 'hunter', setup: hunterTown, follow: 'hunter', overlay: 'food' },
  dairy: { view: 'dairy', setup: town(TOWN_TICKS), overlay: 'food' },
  table: { view: 'table', setup: tableTown(TABLE_TICKS), overlay: 'variety', overlayOn: true, open: aboutToClimb },
  overhunt: { view: 'overhunt', tool: 'lodge', setup: overhuntThin, overlay: 'food' },
  grove: { view: 'grove', tool: 'grove', setup: cultureTown(SHRINE_TICKS, false, false, false), overlay: 'oil' },
  oil: { view: 'oil', setup: town(TOWN_TICKS), overlay: 'oil' },
  storehouse: { view: 'storehouse', setup: town(TOWN_TICKS), overlay: 'oil' },
  oilvendor: { view: 'oilvendor', setup: town(TOWN_TICKS), follow: 'oil', overlay: 'oil', overlayOn: true },
  nooil: { view: 'nooil', speed: 'paused', setup: noOilTown, overlay: 'oil', overlayOn: true, open: nearestOilDrop },
  pasture: { view: 'pasture', setup: cultureTown(FINE_TICKS), overlay: 'fleece' },
  fleecevendor: { view: 'fleecevendor', setup: cultureTown(FINE_TICKS), follow: 'fleece', overlay: 'fleece', overlayOn: true },
  vineyard: { view: 'vineyard', tool: 'vineyard', setup: cultureTown(FINE_TICKS), overlay: 'wine' },
  villas: { view: 'villas', setup: villasTown, overlay: 'missing', open: firstVilla },
  winery: { view: 'winery', setup: villaTown(WINERY_AFTER), follow: 'cart', followFrom: 'vineyard', overlay: 'wine' },
  winevendor: { view: 'winevendor', setup: villasTown, follow: 'wine', overlay: 'wine', overlayOn: true },
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
  // The control panel (a side slice): #richtown with the panel on its Husbandry tab, the farms' pictures and what the land gave.
  panel: { view: 'richtown', setup: town(TOWN_TICKS, SAFE, true), overlay: 'missing', side: { tab: 'husbandry' } },
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
  rivals: { view: 'rivals', setup: RIVALS_OPEN, overlay: 'missing' },
  rivalsmap: { view: 'rivals', setup: RIVALS_OPEN, overlay: 'missing', greece: true },
  rivalstreet: { view: 'rivalstreet', setup: RIVALS_OPEN, overlay: 'missing' },
  // Slice 23: bronze and the barracks. The copper on the east hills with the mine tool in hand; a company raised, its men walking in; two companies ready, a banner in hand.
  bronze: { view: 'bronze', tool: 'mine', setup: BRONZE, overlay: 'missing', side: { tab: 'goods' } },
  barracks: { view: 'barracks', setup: BARRACKS, overlay: 'missing', side: { tab: 'army' } },
  companies: { view: 'companies', setup: COMPANIES, overlay: 'missing', side: { tab: 'army' }, select: hoplitesBanner },
  // Slice 24: raiders fought in the streets. Sparta's band on its way, the companies to place, paused; a band let through, leaving with its loot; a threat come with no company raised, hirelings to hire.
  battle: { view: 'battle', speed: 'paused', setup: BATTLE, overlay: 'missing', side: { tab: 'army' }, select: hoplitesBanner },
  looted: { view: 'looted', setup: LOOTED, overlay: 'missing', ledger: true },
  hirelings: { view: 'barracks', speed: 'paused', setup: HIRELINGS_TOWN, overlay: 'missing', side: { tab: 'army' } },
  // Slice 25: walls, gates and towers. The town three weeks before Sparta's band, the wall tool in hand; the band at the west gate, hammering, under two towers.
  walls: { view: 'walls', speed: 'paused', tool: 'wall', setup: WALLS, overlay: 'missing' },
  // (Paused, as #battle and #walls are: at normal speed the gate fell about ten seconds after it opened. Slice 25's review.)
  siege: { view: 'siege', speed: 'paused', setup: SIEGE, overlay: 'missing', side: { tab: 'army' } },
  // Slice 26: from the sea. Troy's ships about twelve days from the beach, both companies waiting above the harbour, paused, the hoplites' banner in hand; two triremes at the shipyard as the ships come in; pirates on the lane to Athens.
  landing: { view: 'landing', speed: 'paused', setup: LANDING, overlay: 'missing', side: { tab: 'army' }, select: hoplitesBanner },
  triremes: { view: 'triremes', setup: TRIREMES, overlay: 'missing', side: { tab: 'army', fleet: true } },
  pirates: { view: 'triremes', setup: PIRATES, overlay: 'missing', greece: 'athens', greeceTab: 'ruler' },
  // Slice 27: loans both ways. Corinth's and Athens' answers to your asks, Corinth's terms waiting on you; a ruler in trouble asking to borrow; that loan repaid, their herald on the road.
  borrow: { view: 'town', setup: loanTown('borrow'), overlay: 'missing', greece: 'corinth', greeceTab: 'loans' },
  lend: { view: 'rivals', setup: LEND, overlay: 'missing', greece: LEND_CITY, greeceTab: 'ruler' },
  repaid: { view: 'rivals', setup: loanTown('repaid'), overlay: 'missing', greece: LEND_CITY, greeceTab: 'loans' },
  // Slice 28: debts unpaid. Your loan from Corinth held back past its day, the warning given and the next steps dated; Corinth seizing your goods; Corinth's men in your city, collecting. Corinth owing you, overdue, with the four answers; a full force sent, its report; Athens unable to repay, Forgive at hand.
  overdue: { view: 'town', setup: debtTown('overdue'), overlay: 'missing', greece: 'corinth', greeceTab: 'loans' },
  seized: { view: 'town', setup: debtTown('seized'), overlay: 'missing', ledger: true },
  creditors: { view: 'town', setup: debtTown('creditors'), overlay: 'missing', follow: 'raider' },
  collect: { view: 'companies', setup: debtTown('collect'), overlay: 'missing', greece: 'corinth', greeceTab: 'loans' },
  report: { view: 'companies', speed: 'paused', setup: debtTown('report'), overlay: 'missing', greece: 'corinth', greeceTab: 'loans' },
  forgive: { view: 'rivals', setup: debtTown('forgive'), overlay: 'missing', greece: LEND_CITY, greeceTab: 'loans' },
  // A city worth defending (slice 29).
  // (Opens paused, as #battle does: the band is about three weeks out, and the lines, the walls and the pages are to be read first. Review of slice 29.)
  fortress: { view: 'fortress', speed: 'paused', setup: FORTRESS, overlay: 'missing', side: { tab: 'army' } },
  // Slice 30
  // Thieves in the night: the hut street behind the villas, its first thief a few days off, the crime overlay on; four months on with still no watch post, paused on the most tempted hut.
  thieves: { view: 'thieves', setup: thievesTown('thieves'), overlay: 'crime', overlayOn: true },
  nowatch: { view: 'thieves', speed: 'paused', setup: thievesTown('nowatch'), overlay: 'crime', open: mostTempted, side: { tab: 'safety' } },
  // Slice 31: Greece grows. The town ten years on, paused on the map; the newcomers Knossos and Memphis on their pages.
  greecegrows: { view: 'rivals', speed: 'paused', setup: GROWS, overlay: 'missing', greece: true },
  knossos: { view: 'rivals', setup: GROWS, overlay: 'missing', greece: 'knossos', greeceTab: 'ruler' },
  memphis: { view: 'rivals', setup: GROWS, overlay: 'missing', greece: 'memphis', greeceTab: 'ruler' },
  // Slice 32: marble and timber. The quarry on the headland, its sledges on the road, the quarry tool in hand and marble's page open; the loggers' camp at the west wood's edge, stumps and young trees where it has felled, timber's page open.
  quarry: { view: 'quarry', tool: 'quarry', setup: WORKS_QUARRY_TOWN, overlay: 'missing', side: { ware: MARBLE } },
  loggers: { view: 'loggers', setup: WORKS_CAMP_TOWN, overlay: 'missing', side: { ware: TIMBER } },
  // Slice 33
  // The turning year: #town's town in the last days of February at the fastest speed, over the farms and the granary (a year to watch); #richtown's in winter, the bay grey and the Tyrian ship late.
  seasons: { view: 'seasons', speed: 'fastest', setup: seasonsTown, overlay: 'food', side: { tab: 'husbandry' } },
  winter: { view: 'winter', setup: winterTown, overlay: 'missing' },
  // Slice 34: vassals and allies. Corinth's tribute coming in to your stores; Argos told to submit, the odds to read; Argos conquered, the report; Corinth arming against your heavy tribute.
  vassal: { view: 'companies', setup: empireTown('vassal'), overlay: 'missing', follow: 'caravan' },
  submit: { view: 'companies', setup: empireTown('submit'), overlay: 'missing', greece: 'argos', greeceTab: 'empire' },
  conquer: { view: 'companies', speed: 'paused', setup: empireTown('conquer'), overlay: 'missing', greece: 'argos', greeceTab: 'empire' },
  rebellion: { view: 'companies', setup: empireTown('rebellion'), overlay: 'missing', greece: 'corinth', greeceTab: 'empire' },
  // Slice 35: monuments. The Lighthouse half built on the headland, its tower in its scaffold and the ox carts on the road, the Monuments tab open; finished, its fire lit, the Tyrian ship sailing in at her quicker pace.
  monument: { view: 'monument', setup: MONUMENT_TOWN, overlay: 'missing', side: { tab: 'monuments' } },
  lit: { view: 'lit', setup: LIT_TOWN, overlay: 'missing', side: { tab: 'monuments' } },
  // The Stadium's first games on, its seats filling with visitors from all over, the Monuments tab open.
  games: { view: 'games', setup: gamesTown, overlay: 'missing', side: { tab: 'monuments' } },
  // Slice 38: contested seas. Troy's fleet across the harbour's mouth, the Tyrian ship held at the quay, the triremes rowing out; after the fight, a trireme under repair and the shipyard's panel open.
  blockade: { view: 'blockade', setup: BLOCKADE_TOWN, overlay: 'missing', side: { tab: 'army', fleet: true } },
  shipyard: { view: 'shipyard', setup: SHIPYARD_TOWN, overlay: 'missing', shipyard: true },
  // Slice 39: ambitions. A town a few milestones in across the three, the Ambition panel open; Master of Greece achieved, the Colossus standing at the harbour mouth.
  ambition: { view: 'richtown', setup: ambitionTown('ambition'), overlay: 'missing', ambition: true },
  achieved: { view: 'achieved', setup: ambitionTown('achieved'), overlay: 'missing', ambition: true },
  // Slice 36: the great houses. Two great estates below the villas, the first one's panel open; a company of horsemen from six estates, Sparta's band ten days out, paused, the riders' banner in hand.
  estates: { view: 'estates', setup: ESTATES, overlay: 'missing', open: firstEstate },
  horsemen: { view: 'horsemen', speed: 'paused', setup: HORSEMEN, overlay: 'missing', side: { tab: 'army' }, select: horsemenBanner },
  // Slice 37: colonies. Your settlers coming down to the quay and your ship at anchor for Thasos; two colonies grown, Nea Thasos' page open on the map; Corinth's company come to your aid by its road.
  colony: { view: 'colony', speed: 'paused', setup: COLONY_TOWN, overlay: 'missing' },
  colonies: { view: 'bay', setup: COLONIES_TOWN, overlay: 'missing', greece: 'site:thasos' },
  ally: { view: 'ally', setup: ALLY_TOWN, overlay: 'missing' },
  // Slice 43: colonies that grow up. Nea Thasos asking you for wheat, its page open on the map of Greece; Nea Thasos a settlement, the timber for its harbour in your stores, its page open.
  colonywants: { view: 'bay', setup: COLONYWANTS_TOWN, overlay: 'missing', greece: 'site:thasos' },
  colonyworks: { view: 'bay', setup: COLONYWORKS_TOWN, overlay: 'missing', greece: 'site:thasos' },
  // Slice 40: an empire's city. #ambition's town carried on: a vassal, a colony sending its share, the Lighthouse rising, an estate and a great estate, winter coming, a thief out and Rhodes' fleet at sea against the harbour.
  empire: { view: 'empire', setup: empireCityTown, overlay: 'missing' },
  // Slice 41: crimes of every kind. A pickpocket in the agora's crowd, a vandal nearing a fountain and a smuggler nearing the quay, paused, the crime overlay on.
  crimes: { view: 'crimes', speed: 'paused', setup: crimesTown, overlay: 'crime', overlayOn: true },
  // A gang's den in the hut street behind the core (its rag on a pole by the door), its men having beaten off the lone watchman of the one watch post there; the den's panel open, the crime overlay a key away.
  gang: { view: 'gang', setup: gangTown, overlay: 'crime', open: gangDen },
  // Slice 44: the town's messages. #aftermath's town (a year of trade with Greece, Sparta's tribute refused twice, its
  // raiders in and gone), the Messages panel open on its scroll and the last season's messages still unread.
  messages: { view: 'raidwest', setup: raidTown('aftermath'), overlay: 'food', messages: true, unread: 3 * TICKS_PER_MONTH },
  // Slice 42: lands of any size. A generated sheltered bay at 128, 192 and 256 tiles, a road in from the west edge, the treasury a new game's.
  // (Slice 46: on the first edition of the generator, slice 42's, so they open as they did.)
  landsmall: { view: 'land', setup: landTown({ kind: 'sheltered', size: 128, seed: 1, gen: 1 }) },
  landmedium: { view: 'land', setup: landTown({ kind: 'sheltered', size: 192, seed: 4, gen: 1 }) },
  landlarge: { view: 'land', setup: landTown({ kind: 'sheltered', size: 256, seed: 2, gen: 1 }) },
  // Slice 48: building panels and the storehouse. #richtown's town, the storehouse by the quay holding oil as well as
  // wine, every store accepting everything; the same a few days after that storehouse was set to accept only wine and to
  // empty its oil, its panel open; #richtown with the olive press's panel open.
  storerules: { view: 'storerules', setup: storeRulesTown, overlay: 'missing' },
  storeset: { view: 'storerules', setup: storeSetTown, overlay: 'missing', building: quayStoreId },
  workpanel: { view: 'workpanel', setup: town(TOWN_TICKS, SAFE, true), overlay: 'missing', building: (s) => s.buildings.find((b) => b.kind === 'press')?.id ?? 0 },
  // Slice 45: a thief walked to the court by a watchman (the pair in the street), the court's panel open (merge of slice 45: slice 48's building panel); an arsonist and a crooked collector tried in its history.
  court: { view: 'court', speed: 'paused', setup: courtTown, building: courtOf, overlay: 'crime' },
  // The same town's prison crowded, the town warned of its unrest, the prison's panel open: played on, the prisoners break out.
  jailbreak: { view: 'jailbreak', speed: 'paused', setup: jailbreakTown, building: prisonOf, overlay: 'crime' },
  // Slice 47: a colonial empire. Three colonies at three stages, a company and two triremes at home, Rhodes' ships sailing for Nea Naxos, its page open; Nea Thasos grown and talking of freedom, its page open with the treaty.
  colonybase: { view: 'bay', setup: COLONYBASE_TOWN, overlay: 'missing', greece: 'site:naxos' },
  freeally: { view: 'bay', setup: FREEALLY_TOWN, overlay: 'missing', greece: 'site:thasos' },
  // Slice 46: many lands. A fresh city on each kind of land (a medium one), its road in laid from the nearest edge, as the new-game screen founds it.
  delta: { view: 'land', setup: kindTown('delta', 192, 'heron') },
  dryplain: { view: 'land', setup: kindTown('dryplain', 192, 'olive') },
  islands: { view: 'land', setup: kindTown('islands', 192, 'dolphin') },
  mountains: { view: 'land', setup: kindTown('mountains', 192, 'kestrel') },
  woods: { view: 'land', setup: kindTown('woods', 192, 'acorn') },
  sheltered: { view: 'land', setup: kindTown('sheltered', 192, 'myrtle') },
  // Slice 51: the overview, as if O had been pressed. #town (28 months in) on its City page and on Distribution, where
  // its gaps are; #gang's town (a den behind the core) on the Crime page; #empire's city (over five years in) on Empire.
  overview: { view: 'town', setup: town(TOWN_TICKS), overlay: 'missing', overview: 'city' },
  overviewgaps: { view: 'town', setup: town(TOWN_TICKS), overlay: 'missing', overview: 'distribution' },
  overviewcrime: { view: 'gang', setup: gangTown, overlay: 'crime', overview: 'crime' },
  overviewempire: { view: 'empire', setup: empireCityTown, overlay: 'missing', overview: 'empire' },
  // Merge of slice 51 with slice 45: #jailbreak's town (a court and a crowded, restless prison) on the Crime page, with the court's figures.
  overviewcourt: { view: 'jailbreak', setup: jailbreakTown, overlay: 'crime', overview: 'crime' },
  // Slice 49: #town with health on and an infirmary in its hut streets, a physician out on her round, three homes sick (one
  // coughing at its door), the health overlay on and the sickliest home's panel open; #athensship's town two weeks before
  // her next call, with no infirmary or asklepieion, the town just warned of plague in Athens, the trade panel
  // open on the Athens route with the quarantine order at its head.
  physicians: { view: 'physicians', speed: 'paused', setup: physiciansTown, overlay: 'health', overlayOn: true, open: sickliestHome },
  plague: { view: 'plague', speed: 'paused', setup: plagueTown, overlay: 'health', trade: 'athens-sea' },
  // Merge of slice 51 with slice 49: #plague's town (warned of plague in Athens, no infirmary) on the overview's Health page.
  overviewhealth: { view: 'plague', speed: 'paused', setup: plagueTown, overlay: 'health', overview: 'health' },
  // Slice 52: a city in order. A town on a generated medium delta some years in, with every system of the phase at work
  // (see orderTown); a founded large wooded land, the heaviest kind, for the budgets.
  order: { view: 'order', setup: orderTown, overlay: 'missing' },
  bigwoods: { view: 'land', setup: kindTown('woods', 256, 'acorn') },
  // Slice 55: monsters at the gates. #richtown's town with the Cyclops walking the last of the way to his den on the shore
  // below the trading post, Poseidon's warning in the scroll; #companies' town with the Boar out wrecking the sheep pasture
  // and the hoplites marching to it, their banner in hand; all seven before their lairs on #town's open ground, still.
  monster: { view: 'monster', setup: monsterTown, overlay: 'missing', unread: 2 * TICKS_PER_MONTH },
  monsterraid: { view: 'monsterraid', setup: monsterRaidTown, overlay: 'missing', side: { tab: 'army' }, select: hoplitesBanner, unread: 3 * TICKS_PER_DAY },
  bestiary: { view: 'bestiary', speed: 'paused', setup: bestiaryTown, overlay: 'missing' },
  // Slice 56: the gods walk your streets. #town's farming town (28 months in) with Demeter loving it (staged through the
  // mood API), the moment she arrives over its fields: she rises, walks to her farms and the granary and blesses each.
  // All twelve gods posed in a row on the open flood plain of the Bay, to compare (they never walk or leave).
  epiphany: { view: 'epiphany', setup: epiphanyTown, overlay: 'missing' },
  pantheon: { view: 'pantheon', setup: pantheonField },
  // Slice 54: sanctuaries rise. #quarry's town with four sanctuaries at four stages (Athena's finished and staffed, Poseidon's
  // statue going up, Apollo's temple rising, Demeter's just marked out); Demeter's alone, its first marble on the road; and
  // all twelve finished in two rows, to compare.
  sanctuaries: { view: 'sanctuaries', setup: SANCTUARIES_TOWN, overlay: 'religion', building: (s) => sanctuaryOf(s, 'athena')?.id ?? 0 },
  sanctuary: { view: 'sanctuary', setup: SANCTUARY_TOWN, overlay: 'religion', building: (s) => s.buildings.find((b) => b.kind === 'sanctuary')?.id ?? 0 },
  twelve: { view: 'twelve', setup: twelveTown, overlay: 'religion' },
  // Slice 53: the twelve and their tempers. #gods: #richtown with shrines to four gods, Poseidon honoured and Athena
  // jealous, an offering on its way to Demeter, Olympus open; #procession: Demeter's festival under way, her procession
  // round the core's agora, her shrine's panel open.
  gods: { view: 'richtown', setup: godsTown, overlay: 'missing', olympus: 'all' },
  // (#festival is already Athens' Panathenaia, from slice 21: Demeter's is #procession.)
  procession: { view: 'procession', setup: processionTown, overlay: 'missing', building: demeterShrine },
  // Slice 57: blessings and wrath. #omen: #richtown with its core shrine Athena's and Athena angry (staged), her omens five
  // days in, Medusa due in a little under a month, Olympus open on her page (an offering lifts her past angry and turns it);
  // #blessing: #town's fields with Demeter's sanctuary finished beside them and Demeter warm, its panel open on the blessing
  // to ask; #wrath: #richtown with Poseidon angry (staged), standing over the harbour in wrath, his earthquake four days off.
  omen: { view: 'omen', setup: omenTown, overlay: 'missing', olympus: 'athena', unread: 6 * TICKS_PER_DAY },
  blessing: { view: 'blessing', setup: blessingTown, overlay: 'missing', building: (s) => sanctuaryOf(s, 'demeter')?.id ?? 0 },
  wrath: { view: 'wrath', setup: wrathTown, overlay: 'missing', unread: TICKS_PER_MONTH },
};

export const DEMOS: Record<string, Demo> = Object.fromEntries(Object.entries(SCENES).map(([k, d]) => [k, d.setup ? { ...d, setup: calm(d.setup) } : d]));
// Slice 50: #goods opens the trading post's panel too, beside the Goods tab on wine (to set beside Oliver's screenshot of it).
DEMOS.goods = { ...DEMOS.goods, trade: true };

// Slice 41
/**
 * Crimes of every kind (slice 41). #crimes: #richtown's town with no watch
 * post over its core or the road down to the quay, and two new streets of huts
 * off that road, each with its own fountain: an upper one below the core's
 * villas, within reach of the core's agora and out of the quay's, and a lower
 * one near the quay, out of the agoras' reach (so its huts go hungry). Crime
 * and its new kinds are switched on once the huts are in. #richtown's people
 * are content, so left to themselves its streets would take a year or more to
 * turn to crime: the opening is staged (set up for this demo). One of the
 * upper street goes to pick pockets at the agora, and two of the lower to
 * smash a fountain and to smuggle from the quay once he is working the crowd;
 * it opens as the vandal is a few steps from the fountain, the pickpocket
 * still sidling round the agora and the smuggler nearly at the quay.
 */
const CRIMES_UPPER_ROAD = row(75, 89, 47);
const CRIMES_UPPER_XS = [78, 80, 82, 84, 86];
const CRIMES_UPPER_FOUNTAIN = { x: 88, z: 45 };
const CRIMES_LOWER_ROAD = row(75, 89, 60);
const CRIMES_LOWER_XS = [76, 78, 80, 82, 84, 86];
const CRIMES_LOWER_FOUNTAIN = { x: 88, z: 58 };
const CRIMES_SAFETY: Safety = { watch: [TOWN_WATCH[1]], architects: TOWN_ARCHITECTS };
/** The two streets' homes (upper, then lower). */
export const crimesStreets = (s: SimState): Building[] => [...crimesUpper(s), ...crimesLower(s)];
const crimesUpper = (s: SimState): Building[] => s.buildings.filter((b) => b.kind === 'home' && (b.z === 45 || b.z === 48) && CRIMES_UPPER_XS.includes(b.x));
const crimesLower = (s: SimState): Building[] => s.buildings.filter((b) => b.kind === 'home' && (b.z === 58 || b.z === 61) && CRIMES_LOWER_XS.includes(b.x));
/** How many of the streets' plots must be huts before crime goes on, and the longest wait for it. */
const CRIMES_HUTS = 14;
const CRIMES_WAIT = 5 * TICKS_PER_MONTH;
/** How far (tiles) the vandal still has to go when #crimes opens (about four seconds at normal speed), and the longest any of the staging waits. */
const CRIMES_VANDAL_LEFT = 7;
/** How far (tiles, at a walk) the pickpocket has been among the crowd by then. */
const CRIMES_MINGLED = 3;
const CRIMES_GUARD = 20 * TICKS_PER_DAY;
/** How far a walker has still to go along its path (tiles). */
const pathLeft = (w: Walker): number => {
  let n = -w.along;
  for (let i = w.seg * 2; i + 3 < w.path.length; i += 2) n += dhypot(w.path[i + 2] - w.path[i], w.path[i + 3] - w.path[i + 1]);
  return Math.max(0, n);
};
function crimesTown(sim: Sim): void {
  town(TOWN_TICKS, CRIMES_SAFETY, true, false)(sim);
  const s = sim.state;
  const send = (c: Parameters<Sim['enqueue']>[0]): void => {
    sim.enqueue(c);
    sim.flush();
  };
  const plots = 2 * CRIMES_UPPER_XS.length + 2 * CRIMES_LOWER_XS.length;
  waitFor(sim, s.tick, (CRIMES_UPPER_ROAD.length + CRIMES_LOWER_ROAD.length) * ROAD_COST + plots * 10 + 2 * (FOUNTAIN_COST + JOBS.fountain * WAGE));
  send({ type: 'road', tiles: CRIMES_UPPER_ROAD });
  send({ type: 'road', tiles: CRIMES_LOWER_ROAD });
  send({ type: 'plots', at: [...along(CRIMES_UPPER_XS, 45), ...along(CRIMES_UPPER_XS, 48), ...along(CRIMES_LOWER_XS, 58), ...along(CRIMES_LOWER_XS, 61)] });
  send({ type: 'fountain', at: [T(CRIMES_UPPER_FOUNTAIN.x, CRIMES_UPPER_FOUNTAIN.z), T(CRIMES_LOWER_FOUNTAIN.x, CRIMES_LOWER_FOUNTAIN.z)] });
  const huts = (): number => crimesStreets(s).filter((b) => b.level >= 2 && b.people > 0).length;
  const end = s.tick + CRIMES_WAIT;
  while (s.tick < end && huts() < CRIMES_HUTS) sim.run(10);
  crime(sim, true);
  crimes(sim, true);
  // The staged opening: who goes where (a home of each street that has it within reach).
  const size = sim.map.size;
  const pick = (homes: Building[], kind: 'pickpocket' | 'vandal' | 'smuggling', not = 0): { b: Building; t: Target } | null => {
    for (const b of homes) {
      if (b.id === not || b.people <= 0 || !b.family) continue;
      const t = crimeTargetsFrom(s, size, b)[kind];
      if (t) return { b, t };
    }
    return null;
  };
  const pp = pick(crimesUpper(s), 'pickpocket');
  const vd = pick(crimesLower(s), 'vandal');
  const sm = pick(crimesLower(s), 'smuggling', vd?.b.id);
  const day = (): number => Math.floor(s.tick / TICKS_PER_DAY);
  const go = (c: { b: Building; t: Target } | null, kind: CrimeKind): Walker | null => (c ? setOutAs(s, size, c.b, { kind, target: c.t.target, part: c.t.part }, day(), true) : null);
  // The pickpocket first (the furthest to go); the other two once he is near enough the agora that he will be
  // working its crowd as the vandal nears the fountain. (Their ways are as long as his by road, plus his ways to and
  // from the doors.)
  const thief = go(pp, 'pickpocket');
  const doors = thief && pp ? pathLeft(thief) - pp.t.steps : 0;
  const vandalWay = (vd?.t.steps ?? 0) + doors;
  for (let guard = 0; thief && thief.people > 0 && thief.steps === 0 && pathLeft(thief) > vandalWay - CRIMES_VANDAL_LEFT - CRIMES_MINGLED && guard < CRIMES_GUARD; guard++) sim.run(1);
  const vandal = go(vd, 'vandal');
  go(sm, 'smuggling');
  for (let guard = 0; vandal && vandal.people > 0 && vandal.wait === 0 && pathLeft(vandal) > CRIMES_VANDAL_LEFT && guard < CRIMES_GUARD; guard++) sim.run(1);
}

/**
 * A gang (slice 41). #gang: #thieves' town (its hut street on the slope behind
 * the core's villas, no watch post over it), with crime and its new kinds on
 * as soon as the huts are in, played on with still no watch on the slope until
 * a gang has taken one of the huts as its den (about five months: the town
 * hears of it gathering a season before). Then one watch post goes in by the
 * west end of the street, and the town plays on until the gang's men have
 * beaten off its lone watchman (or a season, at most). It opens on the den's
 * panel: a second watch post whose round reaches the den breaks the gang up.
 */
const GANG_WATCH: Spot = { x: 64, z: 24 };
/** The longest #gang waits for the gang to form, and then for its men to beat off the lone watchman. */
const GANG_LOOK = 12 * TICKS_PER_MONTH;
const GANG_BEATEN_LOOK = 3 * TICKS_PER_MONTH;
function gangTown(sim: Sim): void {
  town(TOWN_TICKS, THIEF_SAFETY, true, false)(sim);
  const s = sim.state;
  const send = (c: Parameters<Sim['enqueue']>[0]): void => {
    sim.enqueue(c);
    sim.flush();
  };
  waitFor(sim, s.tick, THIEF_ROAD.length * ROAD_COST + THIEF_XS.length * 10 + 150 + JOBS.fountain * WAGE);
  send({ type: 'road', tiles: [...THIEF_ROAD].reverse() });
  send({ type: 'plots', at: along(THIEF_XS, 27) });
  send({ type: 'fountain', at: [T(THIEF_FOUNTAIN.x, THIEF_FOUNTAIN.z)] });
  const huts = (): number => thiefStreet(s).filter((b) => b.level >= 2 && b.people > 0).length;
  const end = s.tick + THIEF_WAIT;
  while (s.tick < end && huts() < THIEF_HUTS) sim.run(10);
  crime(sim, true);
  crimes(sim, true);
  const formed = s.tick + GANG_LOOK;
  while (s.tick < formed && s.crime.gangs.length === 0) sim.run(TICKS_PER_DAY);
  waitFor(sim, s.tick, WATCHPOST_COST + JOBS.watchpost * WAGE);
  send({ type: 'build', kind: 'watchpost', at: [T(GANG_WATCH.x, GANG_WATCH.z)] });
  const beaten = s.tick + GANG_BEATEN_LOOK;
  const built = s.tick;
  const beatenOff = (): boolean => s.crime.news.some((n) => n.kind === 'beaten' && n.tick >= built);
  while (s.tick < beaten && s.crime.gangs.length > 0 && !beatenOff()) sim.run(TICKS_PER_DAY);
}
/** #gang's panel: the den (else the street's most tempted home). */
function gangDen(s: SimState): number {
  return s.crime.gangs[0]?.den ?? mostTempted(s);
}

// Slice 42
/** A new city founded on a generated land, the seasons turning, with a road in from the west edge towards the bay. */
function landTown(land: Land): (sim: Sim) => void {
  return (sim) => {
    sim.found(land);
    // (Founding starts afresh, so what calm() set before the setup is set again.)
    seasons(sim, true);
    hazards(sim, false);
    const road = landRoad(sim);
    if (road.length > 0) {
      sim.enqueue({ type: 'road', tiles: road });
      sim.flush();
    }
  };
}

/**
 * A road in from the west edge towards the land's site above the bay: along
 * the first row near the site where every tile takes a road, bridging the
 * river on the way (up or down its bank a little, to where a bridge fits).
 */
export function landRoad(sim: Sim): number[] {
  const map = sim.map;
  const s = sim.state;
  const n = map.size;
  const site = map.data.site;
  if (!site) return [];
  const ground = mapIndex(map).ground;
  const free = (x: number, z: number): boolean => roadRefusal(map, s, x, z) === '';
  const x1 = Math.round(site.x);
  for (let k = 0; k <= 30; k++) {
    let z: number = Math.round(site.z) + (k % 2 === 1 ? -(k + 1) / 2 : k / 2);
    if (z < 1 || z >= n - 1) continue;
    const tiles: number[] = [];
    let x = 0;
    while (x <= x1) {
      const t = z * n + x;
      if (free(x, z)) {
        tiles.push(t);
        x++;
        continue;
      }
      if (ground[t] !== Ground.Water || x === 0) break;
      // A bridge here, or up or down the bank where one fits.
      let crossed = false;
      for (let d = 0; d <= 40 && !crossed; d++) {
        const z2 = z + (d % 2 === 1 ? -(d + 1) / 2 : d / 2);
        if (z2 < 1 || z2 >= n - 1) continue;
        const along: number[] = [];
        for (let zz = z; zz !== z2; ) {
          zz += z2 > z ? 1 : -1;
          if (!free(x - 1, zz)) break;
          along.push(zz * n + x - 1);
        }
        if (along.length !== Math.abs(z2 - z)) continue;
        const b = bridgeSpan(map, s, z2 * n + x - 1, 3);
        if (b.reason !== '' || b.end < 0) continue;
        tiles.push(...along, ...b.tiles);
        z = z2;
        x = b.end % n;
        crossed = true;
      }
      if (!crossed) break;
    }
    if (x > x1) return tiles;
  }
  return [];
}

// Slice 48
/**
 * The stores' rules (slice 48). #storerules: #richtown's town, as its builder
 * would carry it on: oil kept back from the Tyrian ship for the town, and the
 * storehouse by the quay set to get oil from the one up the hill until it holds
 * a few hundred jars beside the winery's wine, then put back to accepting
 * everything. It opens with every store accepting everything, as before rules,
 * and the quay's storehouse holding both. #storeset: the same, then that
 * storehouse set to accept nothing but wine and to empty its oil, a few days
 * on: its first carts of oil on the road up to the storehouse on the hill.
 */
function storeRulesTown(sim: Sim): void {
  town(TOWN_TICKS, SAFE, true)(sim);
  const s = sim.state;
  const send = (c: Parameters<Sim['enqueue']>[0]): void => {
    sim.enqueue(c);
    sim.flush();
  };
  const quay = quayStore(s);
  if (!quay) return;
  send({ type: 'trade', good: OIL, sell: false });
  // (Up to half its room; at most six months: the carts take a while up and down the hill.)
  send({ type: 'store', id: quay.id, ware: OIL, mode: GET, limit: 2 });
  const end = s.tick + 6 * TICKS_PER_MONTH;
  while (s.tick < end && held(quay, OIL) < 700) sim.run(TICKS_PER_DAY);
  send({ type: 'store', id: quay.id, all: 'all' });
}
function storeSetTown(sim: Sim): void {
  storeRulesTown(sim);
  const s = sim.state;
  const quay = quayStore(s);
  if (!quay) return;
  for (const c of [
    { type: 'store', id: quay.id, all: 'none' },
    { type: 'store', id: quay.id, ware: WINE, mode: ACCEPT },
    { type: 'store', id: quay.id, ware: OIL, mode: EMPTY },
  ] as const) {
    sim.enqueue(c);
    sim.flush();
  }
  sim.run(2 * TICKS_PER_DAY);
}
/** The storehouse nearest the trading post (#richtown's by the quay, beside the winery). */
function quayStore(s: SimState): Building | undefined {
  const post = tradingPost(s);
  if (!post) return undefined;
  return s.buildings.filter((b) => b.kind === 'storehouse').sort((a, b) => Math.abs(a.x - post.x) + Math.abs(a.z - post.z) - (Math.abs(b.x - post.x) + Math.abs(b.z - post.z)))[0];
}
/** #storeset's panel: the storehouse by the quay. */
export function quayStoreId(s: SimState): number {
  return quayStore(s)?.id ?? 0;
}

// Slice 45
/**
 * The court and the prison (slice 45). #court: #crimes' town (its staged
 * pickpocket, vandal and smuggler out), with a road joining its two hut
 * streets' east ends, a court and a prison beside it, and two watch posts
 * there within reach of each other, one at each street. Once they are
 * staffed, an arsonist sets out from the lower street and the watchman there
 * catches him and walks him to the court; the tax office by the core's east
 * agora is found keeping back takings (a crooked collector summoned); both are
 * tried. Then a thief sets out from the upper street, the watchman there runs
 * him down, and it opens as the watchman walks him to the court, the pair in
 * the street, the court's panel open. The law is the default (the stocks for
 * theft, so played on, the thief stands five days pinned at the agora).
 * #jailbreak: the same town, its prison holding eleven in its eight cells
 * (men of the two streets, sentenced earlier): played on until the town is
 * warned of the unrest, it opens on the prison's panel, a few days before the
 * breakout.
 */
const COURT_ROAD = col(90, 45, 62);
const COURT_AT: Spot = { x: 91, z: 49 };
const PRISON_AT: Spot = { x: 91, z: 53 };
const COURT_WATCH: Spot[] = [
  { x: 91, z: 45 },
  { x: 91, z: 59 },
];
/** The longest any of #court's staging waits. */
const COURT_GUARD = 12 * TICKS_PER_DAY;
/** The shortest way (road tiles) to a staged criminal's target. */
const COURT_WAY = 14;
/** How far (tiles) the convict still has to go to the court when #court opens. */
const COURT_LEFT = 9;
/** What the crooked collector keeps back. */
const COURT_SKIM = 40;
/** How many #jailbreak's prison holds. */
const JAIL_HELD = 11;
function courtTown(sim: Sim): void {
  crimesTown(sim);
  const s = sim.state;
  const size = sim.map.size;
  const send = (c: Parameters<Sim['enqueue']>[0]): void => {
    sim.enqueue(c);
    sim.flush();
  };
  waitFor(sim, s.tick, COURT_ROAD.length * ROAD_COST + COURT_COST + PRISON_COST + 2 * WATCHPOST_COST + (JOBS.court + JOBS.prison + 2 * JOBS.watchpost) * WAGE);
  send({ type: 'road', tiles: COURT_ROAD });
  send({ type: 'build', kind: 'court', at: [T(COURT_AT.x, COURT_AT.z)] });
  send({ type: 'build', kind: 'prison', at: [T(PRISON_AT.x, PRISON_AT.z)] });
  send({ type: 'build', kind: 'watchpost', at: COURT_WATCH.map((p) => T(p.x, p.z)) });
  const at = (p: Spot): Building | undefined => s.buildings.find((b) => b.x === p.x && b.z === p.z);
  const court = at(COURT_AT);
  // Staffed, and the two watchmen out on their rounds.
  const watchman = (post: Building | undefined): Walker | undefined => (post ? s.walkers.find((w) => w.id === post.walker && w.kind === 'watchman' && w.people > 0 && w.meat === 0 && w.target === 0) : undefined);
  for (let guard = 0; guard < COURT_GUARD && !(court && court.workers > 0 && COURT_WATCH.every((p) => watchman(at(p)))); guard++) sim.run(10);
  const day = (): number => Math.floor(s.tick / TICKS_PER_DAY);
  // A chase staged: once the post's watchman is free, a criminal sets out from the home of the street nearest him, and the nearest free watchman runs after him; until he is walked off to the court.
  const free = (): Walker[] => s.walkers.filter((w) => w.kind === 'watchman' && w.people > 0 && w.meat === 0 && w.target === 0);
  const near = (w: Walker, x: number, z: number): number => {
    const [wx, wz] = position(w);
    return dhypot(wx - x, wz - z);
  };
  const chase = (homes: Building[], kind: CrimeKind, post: Spot): Walker | null => {
    for (let guard = 0; guard < COURT_GUARD && !watchman(at(post)); guard++) sim.run(1);
    const man = watchman(at(post));
    if (!man) return null;
    const order = [...homes].sort((a, b) => near(man, a.x, a.z) - near(man, b.x, b.z) || a.id - b.id);
    // (A target far enough by road that the watchman, running, catches him on the way.)
    for (const b of order) {
      if (!b.family || b.people <= 0 || s.walkers.some((w) => w.home === b.id && w.people > 0 && (isCriminal(w.kind) || w.kind === 'convict'))) continue;
      // (An arsonist whose own target is too near goes for a rich house, as a thief would.)
      const own = kind === 'theft' ? null : crimeTargetsFrom(s, size, b)[kind as 'arson'];
      const t = own && own.steps >= COURT_WAY ? own : targetFor(s, size, b);
      if (!t || t.steps < COURT_WAY) continue;
      const w = kind === 'theft' ? setOut(s, size, b, t.target, day()) : setOutAs(s, size, b, { kind, target: t.target, part: -1 }, day(), true);
      if (!w) continue;
      for (let guard = 0; guard < COURT_GUARD && w.people > 0 && w.meat === 0; guard++) {
        const [x, z] = position(w);
        for (const o of free().sort((a, c) => near(a, x, z) - near(c, x, z) || a.id - c.id)) if (w.meat === 0 && startChase(s, sim.map, o, w)) break;
        if (w.meat === 0) sim.run(1);
      }
      for (let guard = 0; guard < COURT_GUARD && w.people > 0 && w.kind !== 'convict'; guard++) sim.run(1);
      return w.kind === 'convict' ? w : null;
    }
    return null;
  };
  // The arsonist from the lower street, walked to the court and handed in.
  const arsonist = chase(crimesLower(s), 'arson', COURT_WATCH[1]);
  for (let guard = 0; arsonist && arsonist.people > 0 && guard < COURT_GUARD; guard++) sim.run(5);
  // The crooked collector: the tax office nearest the streets keeps back takings, and the court's clerks find him out.
  const offices = s.buildings.filter((b) => b.kind === 'taxoffice').sort((a, b) => dhypot(a.x - COURT_AT.x, a.z - COURT_AT.z) - dhypot(b.x - COURT_AT.x, b.z - COURT_AT.z) || a.id - b.id);
  if (offices[0]) skim(s, { origin: offices[0].id } as Walker, COURT_SKIM);
  // Both tried.
  for (let guard = 0; guard < COURT_GUARD && s.crime.cases.length > 0; guard++) sim.run(10);
  // The thief from the upper street, and the opening: walked to the court, a few steps from it.
  const thief = chase(crimesUpper(s), 'theft', COURT_WATCH[0]);
  for (let guard = 0; thief && thief.people > 0 && pathLeft(thief) > COURT_LEFT && guard < COURT_GUARD; guard++) sim.run(1);
}
/** #court's panel: the court. */
function courtOf(s: SimState): number {
  return s.buildings.find((b) => b.kind === 'court')?.id ?? 0;
}
/** #jailbreak's panel: the prison. */
function prisonOf(s: SimState): number {
  return s.buildings.find((b) => b.kind === 'prison')?.id ?? 0;
}
function jailbreakTown(sim: Sim): void {
  courtTown(sim);
  const s = sim.state;
  const prison = s.buildings.find((b) => b.kind === 'prison');
  if (!prison) return;
  // Let the convict be handed in first (he is tried in a few days, after the opening).
  for (let guard = 0; guard < COURT_GUARD && s.walkers.some((w) => w.kind === 'convict' && w.people > 0); guard++) sim.run(5);
  // Eleven of the two streets' grown men and women, sentenced earlier to prison.
  const kinds: CrimeKind[] = ['theft', 'pickpocket', 'smuggling', 'vandal'];
  let n = s.crime.held.filter((x) => x.as === 'prison').length;
  for (const b of crimesStreets(s)) {
    if (n >= JAIL_HELD) break;
    const f = b.family;
    if (!f || !livedIn(b)) continue;
    for (const m of f.members) {
      if (n >= JAIL_HELD) break;
      const age = ageOf(s, m);
      if (age < 16 || age > 60 || isAway(s, b, m.name)) continue;
      s.crime.held.push({ home: b.id, name: m.name, female: m.female, kind: kinds[n % kinds.length], gang: false, level: b.level, as: 'prison', at: prison.id, since: s.tick - TICKS_PER_MONTH, until: s.tick + 3 * TICKS_PER_MONTH });
      n++;
      break;
    }
  }
  // Played on until the town is warned of the unrest.
  for (let guard = 0; guard < COURT_GUARD && !s.crime.jails.some((j) => j.warned > 0); guard++) sim.run(10);
}

// Slice 46
/** A new city on a kind of land (its seed a word, as the new-game screen's), the seasons turning, its road in laid from the nearest edge. */
function kindTown(kind: LandKind, size: number, word: string): (sim: Sim) => void {
  return (sim) => {
    sim.found({ kind, size, seed: seedOf(word) });
    seasons(sim, true);
    hazards(sim, false);
    const road = roadsIn(sim.map, sim.state).road;
    if (road.length > 0) {
      sim.enqueue({ type: 'road', tiles: road });
      sim.flush();
    }
  };
}

// Slice 49
/**
 * Physicians and plague (slice 49). #physicians: #town with health on (every
 * home at its fair level), an infirmary built beside the road nearest its
 * sickliest home and staffed, played on until its first physician is out;
 * then three of the sickliest homes within her reach fall ill (staged: health's
 * four months' grace would keep everyone well for a while yet), and three days
 * on it opens, paused, the physician out on her round. #plague: #athensship's town played
 * on through her call, with no infirmary or asklepieion, and on to about two
 * weeks before her next call; then plague breaks out in Athens (staged:
 * Greece's dice would give it once in a dozen years) and the town is warned;
 * it opens paused, so the choice is yours before a day passes. Played on
 * without a quarantine, her ship brings it ashore at the homes by the quay
 * and it spreads street to street; an infirmary or an asklepieion built by
 * the quay in the two weeks stops it at the first house.
 */
/** How many homes #physicians stages sick. */
const PHYSICIANS_SICK = 3;
/** How long before her next call #plague's town is warned (days). */
const PLAGUE_WARNING_DAYS = 14;
/** How long the plague in Athens lasts (#plague). */
const PLAGUE_ATHENS = 3 * TICKS_PER_MONTH;
/** The longest any of slice 49's staging waits. */
const HEALTH_GUARD = 4 * TICKS_PER_MONTH;

/** Build an infirmary or an asklepieion as near a point as it fits beside a road (the nearest spot first, ties by row then column). */
function buildNear(sim: Sim, kind: 'infirmary' | 'asklepieion', cx: number, cz: number, reach = 14): Building | null {
  const s = sim.state;
  const size = sim.map.size;
  const side = kind === 'infirmary' ? 2 : 4;
  const spots: Array<[number, number, number]> = [];
  for (let z = Math.max(0, Math.floor(cz - reach)); z < Math.min(size - side, cz + reach); z++) {
    for (let x = Math.max(0, Math.floor(cx - reach)); x < Math.min(size - side, cx + reach); x++) {
      if (buildingRefusal(sim.map, s, kind, x, z) !== '') continue;
      if (!roadsBeside(s, size, { x, z, kind, estate: false } as Building).length) continue;
      spots.push([dhypot(x + side / 2 - cx, z + side / 2 - cz), x, z]);
    }
  }
  spots.sort((a, b) => a[0] - b[0] || a[2] - b[2] || a[1] - b[1]);
  for (const [, x, z] of spots) {
    const before = s.buildings.length;
    sim.enqueue({ type: 'build', kind, at: [z * size + x] });
    sim.flush();
    if (s.buildings.length > before) return s.buildings.find((b) => b.kind === kind && b.x === x && b.z === z) ?? null;
  }
  return null;
}

/** Lived-in homes, the sickliest first. */
const sickliest = (s: SimState): Building[] => s.buildings.filter((b) => livedIn(b) && b.family && b.health > 0).sort((a, b) => a.health - b.health || a.id - b.id);

function physiciansTown(sim: Sim): void {
  town(TOWN_TICKS)(sim);
  const s = sim.state;
  health(sim, true);
  const worst = sickliest(s)[0];
  if (!worst) return;
  waitFor(sim, s.tick, INFIRMARY_COST + JOBS.infirmary * WAGE);
  const inf = buildNear(sim, 'infirmary', worst.x + 1, worst.z + 1, 22);
  if (!inf) return;
  const out = (): boolean => s.walkers.some((w) => w.kind === 'physician' && w.origin === inf.id);
  for (let guard = 0; guard < HEALTH_GUARD && !(inf.workers > 0 && out()); guard += 5) sim.run(5);
  // Three of the sickliest homes within her reach fall ill.
  const near = sickliest(s).filter((b) => dhypot(b.x - inf.x, b.z - inf.z) <= PHYSICIAN_RANGE / 2);
  near.slice(0, PHYSICIANS_SICK).forEach((b, i) => fallIll(s, sim.map, b, false, 4990 + i));
  // (A few days on, so a physician is out in the streets on her round.)
  sim.run(3 * TICKS_PER_DAY);
}

/** #physicians' panel: the sickliest home with someone sick at home (or the sickliest). */
function sickliestHome(s: SimState): number {
  const homes = sickliest(s);
  return (homes.find((b) => s.health.sick.some((x) => x.home === b.id && x.bed === 0)) ?? homes[0])?.id ?? 0;
}

function plagueTown(sim: Sim): void {
  seaTown('athensship')(sim);
  const s = sim.state;
  health(sim, true);
  const r = routeOf(s, 'athens', 'sea');
  const post = tradingPost(s);
  if (!r || !post) return;
  // Her call over.
  for (let guard = 0; guard < HEALTH_GUARD && r.ship && r.ship.phase !== SHIP_AWAY; guard += 5) sim.run(5);
  // (No infirmary or asklepieion: building one by the quay in the two weeks is one of the answers.)
  // On to two weeks before her next call.
  const at = r.next - PLAGUE_WARNING_DAYS * TICKS_PER_DAY;
  if (at > s.tick) sim.run(at - s.tick);
  startGreekPlague(s, 'athens', PLAGUE_ATHENS);
  sim.run(1);
}

// Slice 52
/**
 * A city in order (slice 52). #order: a town founded on a generated medium
 * river delta (the word "order"), built up over some years as a player
 * would, each step once the treasury can pay for it and a month's wages.
 */
const ORDER_WORD = 'order';
const ORDER_SIZE = 192;
const O = (x: number, z: number): number => z * ORDER_SIZE + x;
const orow = (x0: number, x1: number, z: number): number[] => Array.from({ length: x1 - x0 + 1 }, (_, i) => O(x0 + i, z));
const ocol = (x: number, z0: number, z1: number): number[] => Array.from({ length: z1 - z0 + 1 }, (_, i) => O(x, z0 + i));
const oalong = (xs: number[], z: number): number[] => xs.map((x) => O(x, z));
const steps = (a: number, b: number, by = 2): number[] => Array.from({ length: Math.floor((b - a) / by) + 1 }, (_, i) => a + i * by);

export function orderTown(sim: Sim): void {
  sim.found({ kind: 'delta', size: ORDER_SIZE, seed: seedOf(ORDER_WORD) });
  seasons(sim, true);
  hazards(sim, false);
  const s = sim.state;
  const seen = new Set<number>();
  const send = (c: Parameters<Sim['enqueue']>[0]): void => {
    sim.enqueue(c);
    sim.flush();
  };
  // A storehouse's rules (to set them again if it burns).
  const rules = new Map<number, Array<Extract<Parameters<Sim['enqueue']>[0], { type: 'store' }>>>();
  const rule = (b: Building, c: { ware?: number; mode?: number; limit?: number; all?: 'none' | 'all' }): void => {
    const at = O(b.x, b.z);
    rules.set(at, [...(rules.get(at) ?? []), { type: 'store', id: b.id, ...c }]);
    send({ type: 'store', id: b.id, ...c });
  };
  // What each agora sells (to put its stalls back if it burns).
  const sells = new Map<number, number[]>();
  const stall = (at: number, good: number): void => {
    sells.set(at, [...(sells.get(at) ?? []), good]);
    send({ type: 'stall', at, good });
  };
  // As a careful player: whatever burns or falls is cleared and built again, once the treasury can pay for it.
  const rebuild = (): void => {
    for (const b of s.buildings) {
      if (b.kind !== 'rubble' || b.fire !== FIRE_NONE) continue;
      const was = b.was || 'home';
      const side = footSide(b);
      const cost = clearFee(side) + (was === 'home' ? PLOT_COST : COST[was]) + JOBS[was] * WAGE;
      if (spendable(s) < cost + wageBill(s)) return;
      const at = O(b.x, b.z);
      send({ type: 'clear', x0: b.x, z0: b.z, x1: b.x + side - 1, z1: b.z + side - 1 });
      if (was === 'home') send({ type: 'plots', at: [at] });
      else if (was === 'fountain') send({ type: 'fountain', at: [at] });
      else send({ type: 'build', kind: was as BuildKind, at: [at] });
      for (const g of sells.get(at) ?? []) send({ type: 'stall', at, good: g });
      const fresh = s.buildings.find((y) => y.kind === was && y.x === b.x && y.z === b.z);
      if (fresh) for (const c of rules.get(at) ?? []) send({ ...c, id: fresh.id });
      return;
    }
  };
  const playOn = (most: number, done: () => boolean = () => false): void => {
    const end = s.tick + most;
    while (s.tick < end && !done()) {
      sim.run(TICKS_PER_DAY);
      answerCarefully(sim, seen);
      if (s.hazards) rebuild();
    }
  };
  const afford = (cost: number, most = 2 * TICKS_PER_YEAR): void => playOn(most, () => spendable(s) >= cost + wageBill(s));
  const W = steps(27, 41);
  const E = steps(45, 59);
  const but = (xs: number[], ...out: number[]): number[] => xs.filter((x) => !out.includes(x));
  // The road in from the west edge, as the new-game screen lays it.
  send({ type: 'road', tiles: roadsIn(sim.map, s).road });
  // The main street on east from where the road in turns down to the shore, the avenue north from it, two cross streets and the second street.
  send({ type: 'road', tiles: [...orow(45, 62, 127), ...ocol(44, 111, 126).reverse(), ...ocol(26, 111, 126).reverse(), ...ocol(62, 111, 126).reverse(), ...orow(27, 43, 119), ...orow(45, 61, 119)] });
  send({ type: 'plots', at: [...oalong(W, 125), ...oalong(E, 125), ...oalong(steps(29, 39), 128), ...oalong(but(W, 33), 120), ...oalong(but(E, 53), 120)] });
  send({ type: 'fountain', at: [O(33, 120), O(53, 120)] });
  send({ type: 'tax', rate: HEAVY });
  // Bread: farms on the green land below the main street's east end, a granary and an agora, and a tax office.
  send({ type: 'road', tiles: orow(45, 70, 134) });
  send({ type: 'build', kind: 'farm', at: [O(57, 135), O(60, 135), O(63, 135)] });
  send({ type: 'build', kind: 'granary', at: [O(52, 131)] });
  send({ type: 'build', kind: 'agora', at: [O(45, 128)] });
  send({ type: 'build', kind: 'taxoffice', at: [O(41, 128)] });
  // A shrine, then cheese and meat: a dairy by the farms and a hunting lodge up by the lake's deer.
  afford(SHRINE_COST + 450, 6 * TICKS_PER_MONTH);
  send({ type: 'build', kind: 'shrine', at: [O(27, 122)] });
  send({ type: 'build', kind: 'dairy', at: [O(48, 131)] });
  send({ type: 'road', tiles: [...ocol(44, 103, 110).reverse(), ...orow(27, 43, 111), ...orow(45, 61, 111), ...ocol(26, 103, 110).reverse(), ...ocol(62, 103, 110).reverse(), ...orow(27, 43, 103)] });
  send({ type: 'build', kind: 'lodge', at: [O(41, 100)] });
  // The third street, with its fountains, and a tax office for it.
  afford(2 * FOUNTAIN_COST + 32 * PLOT_COST + TAX_OFFICE_COST);
  send({ type: 'build', kind: 'taxoffice', at: [O(45, 114)] });
  send({ type: 'plots', at: [...oalong(W, 109), ...oalong(E, 109), ...oalong(but(W, 33), 112), ...oalong(but(E, 53), 112)] });
  send({ type: 'fountain', at: [O(33, 112), O(53, 112)] });
  // Oil: groves on the dry ground west of the town, a press and a storehouse, and an oil stall at the agora.
  afford(3 * GROVE_COST + PRESS_COST + STOREHOUSE_COST + STALL_COST + (3 * JOBS.grove + JOBS.press + JOBS.storehouse + 1) * WAGE);
  send({ type: 'build', kind: 'grove', at: [O(23, 104), O(23, 108), O(23, 112)] });
  send({ type: 'build', kind: 'press', at: [O(23, 116)] });
  send({ type: 'build', kind: 'storehouse', at: [O(23, 120)] });
  stall(O(45, 128), OIL);
  // Fleece: a pasture east of the town and a fleece stall.
  afford(PASTURE_COST + STALL_COST + (JOBS.pasture + 1) * WAGE);
  send({ type: 'build', kind: 'pasture', at: [O(63, 112)] });
  stall(O(45, 128), FLEECE);
  // The theatre and a second agora in the town's middle, and a second tax office.
  afford(THEATRE_COST + AGORA_COST + (JOBS.theatre + JOBS.agora) * WAGE);
  send({ type: 'build', kind: 'theatre', at: [O(45, 122)] });
  send({ type: 'build', kind: 'agora', at: [O(41, 114)] });
  playOn(4 * TICKS_PER_MONTH);
  // The watch and the architects, and fire and wear from now on.
  afford(4 * (WATCHPOST_COST + ARCHITECT_COST) + 4 * (JOBS.watchpost + JOBS.architect) * WAGE);
  send({ type: 'build', kind: 'watchpost', at: [O(27, 114), O(60, 122), O(42, 106), O(48, 128)] });
  send({ type: 'build', kind: 'architect', at: [O(60, 114), O(42, 122), O(27, 107), O(50, 128)] });
  hazards(sim, true);
  // Wine for villas: the street north of the town, vineyards along it, a winery and a wine stall at each agora.
  afford(17 * ROAD_COST + 3 * VINEYARD_COST + WINERY_COST + 2 * STALL_COST + (3 * JOBS.vineyard + JOBS.winery + 2) * WAGE);
  send({ type: 'road', tiles: orow(45, 61, 103) });
  send({ type: 'build', kind: 'vineyard', at: [O(27, 104), O(30, 104), O(33, 104)] });
  send({ type: 'build', kind: 'winery', at: [O(36, 104)] });
  stall(O(45, 128), WINE);
  stall(O(41, 114), OIL);
  stall(O(41, 114), WINE);
  // A second shrine on the north street, for the town's east half.
  afford(SHRINE_COST + JOBS.shrine * WAGE);
  send({ type: 'build', kind: 'shrine', at: [O(53, 104)] });
  // The quay: the road down from the avenue's end to the shore, the trading post and a storehouse by it.
  afford(12 * ROAD_COST + TRADING_COST + STOREHOUSE_COST + (JOBS.trading + JOBS.storehouse) * WAGE);
  send({ type: 'road', tiles: [...ocol(44, 135, 140), O(43, 140)] });
  send({ type: 'build', kind: 'trading', at: [O(40, 140)] });
  send({ type: 'build', kind: 'storehouse', at: [O(45, 136)] });
  // Oil and wine for the Tyrian ship, the town keeping its own.
  send({ type: 'trade', good: OIL, sell: true, keep: ORDER_KEEP });
  send({ type: 'trade', good: WINE, sell: true, keep: ORDER_KEEP });
  // The east quarter: the streets carried on east to a fourth avenue, two more streets of houses with their fountains, a tax
  // office, a watch post, an architect and a shrine.
  const E2 = steps(63, 75);
  afford(70 * ROAD_COST + 26 * PLOT_COST + 2 * FOUNTAIN_COST + TAX_OFFICE_COST + WATCHPOST_COST + ARCHITECT_COST + SHRINE_COST + (JOBS.taxoffice + JOBS.watchpost + JOBS.architect + JOBS.shrine + 2 * JOBS.fountain) * WAGE + ORDER_MARGIN);
  send({ type: 'road', tiles: [...orow(62, 77, 103), ...ocol(77, 104, 127), ...orow(63, 76, 111), ...orow(63, 76, 119), ...orow(63, 76, 127)] });
  send({ type: 'plots', at: [...oalong(E2, 109), ...oalong(but(E2, 63, 65, 69), 112), ...oalong(but(E2, 69), 120), ...oalong(E2, 125)] });
  send({ type: 'fountain', at: [O(69, 112), O(69, 120)] });
  send({ type: 'build', kind: 'taxoffice', at: [O(63, 104)] });
  send({ type: 'build', kind: 'watchpost', at: [O(65, 104)] });
  send({ type: 'build', kind: 'architect', at: [O(67, 104)] });
  send({ type: 'build', kind: 'shrine', at: [O(69, 104)] });
  // Its agora below the main street, with oil, fleece and wine.
  afford(AGORA_COST + 3 * STALL_COST + (JOBS.agora + 3) * WAGE);
  send({ type: 'build', kind: 'agora', at: [O(73, 128)] });
  for (const g of [OIL, FLEECE, WINE]) stall(O(73, 128), g);
  // A second dairy by the farms and a second hunting lodge, after the boar on the knoll.
  afford(DAIRY_COST + LODGE_COST + (JOBS.dairy + JOBS.lodge) * WAGE);
  send({ type: 'build', kind: 'dairy', at: [O(70, 131)] });
  send({ type: 'build', kind: 'lodge', at: [O(23, 123)] });
  // A watch post by the farms, whose fields burn as well as anything.
  afford(WATCHPOST_COST + JOBS.watchpost * WAGE);
  send({ type: 'build', kind: 'watchpost', at: [O(55, 132)] });
  // Crime goes on (a town at play: the watch is out).
  crime(sim, true);
  crimes(sim, true);
  // A street of huts by the road in, for the newcomers, with its fountain: the town's poor.
  afford(14 * PLOT_COST + FOUNTAIN_COST + JOBS.fountain * WAGE);
  send({ type: 'plots', at: [...oalong([4, 6, 8, 12, 14, 16], 125), ...oalong(steps(4, 16), 128)] });
  send({ type: 'fountain', at: [O(10, 125)] });
  // A sea route to Athens, selling it oil and wine (if it buys them).
  afford(routeWay('athens', 'sea')!.fee + 300, 2 * TICKS_PER_YEAR);
  if (!routeRefusal(s, 'athens', 'sea')) {
    send({ type: 'route', city: 'athens', kind: 'sea' });
    send({ type: 'deal', city: 'athens', kind: 'sea', good: WINE, sell: true });
    send({ type: 'deal', city: 'athens', kind: 'sea', good: OIL, sell: true });
  }
  // More farms above and below the farm road, so the granary can spare the settlers' wheat.
  afford(3 * FARM_COST + 3 * JOBS.farm * WAGE);
  send({ type: 'build', kind: 'farm', at: [O(64, 131), O(67, 131), O(66, 135)] });
  // Colonies: settlers to Thasos, then to the first free site, each once the treasury and the granary can spare them.
  const open = (id: string): boolean => {
    const x = siteRecord(s, id);
    return !!x && !x.owner && !x.free && !x.bound;
  };
  const found = (want: string): string => {
    playOn(2 * TICKS_PER_YEAR, () => spendable(s) >= FOUND_COST + wageBill(s) && granaryWheat(s) >= FOUND_WHEAT);
    const site = open(want) ? want : (s.world.sites.find((x) => open(x.id))?.id ?? want);
    send({ type: 'colony', act: 'found', site });
    return site;
  };
  const first = found('thasos');
  // A barracks beyond the east quarter and a company of Arcadian hoplites hired there, while the settlers sail.
  afford(BARRACKS_COST + JOBS.barracks * WAGE + HIRELINGS.arcadian.fee);
  send({ type: 'build', kind: 'barracks', at: [O(78, 112)] });
  const barracks = s.buildings.find((b) => b.kind === 'barracks');
  if (barracks) {
    playOn(TICKS_PER_MONTH, () => barracks.workers > 0);
    send({ type: 'hire', barracks: barracks.id, kind: 'arcadian' });
  }
  playOn(TICKS_PER_YEAR, () => !!colonyOf(s, first) || !foundingOf(s, first));
  // The company sails to hold the new colony.
  const hired = s.army.companies.find((c) => c.hired === 'arcadian');
  if (hired && colonyOf(s, first)) {
    playOn(3 * TICKS_PER_MONTH, () => readyOf(s, hired).length >= COMPANY_SIZE);
    send({ type: 'colonyempire', act: 'station', site: first, company: hired.id });
  }
  // The court and the prison on the north street, and the law.
  afford(COURT_COST + PRISON_COST + (JOBS.court + JOBS.prison) * WAGE);
  send({ type: 'build', kind: 'court', at: [O(45, 104)] });
  send({ type: 'build', kind: 'prison', at: [O(48, 104)] });
  for (const [c, p] of ORDER_LAW) send({ type: 'law', crime: c, punishment: p });
  // Physicians: an infirmary on the north street, health from now on.
  afford(INFIRMARY_COST + JOBS.infirmary * WAGE);
  send({ type: 'build', kind: 'infirmary', at: [O(51, 104)] });
  health(sim, true);
  // The storehouses' rules: the one by the quay keeps the ship's oil and wine, fetching them from the others, and takes nothing else.
  const quayStore = s.buildings.find((b) => b.kind === 'storehouse' && b.x === 45 && b.z === 136);
  if (quayStore) {
    rule(quayStore, { all: 'none' });
    rule(quayStore, { ware: OIL, mode: GET });
    rule(quayStore, { ware: WINE, mode: GET });
  }
  // The press's storehouse takes no wine (it goes down to the quay). (Review of slice 52: it was also given an oil limit of
  // 200, which the store's rules don't take, a limit being a share of the room; the command did nothing, so it is gone.)
  const pressStore = s.buildings.find((b) => b.kind === 'storehouse' && b.x === 23 && b.z === 120);
  if (pressStore) rule(pressStore, { ware: WINE, mode: REFUSE });
  const second = found('naxos');
  playOn(TICKS_PER_YEAR, () => !!colonyOf(s, second) || !foundingOf(s, second));
  // (Slice 52's look pass: Athens buys wheat, meat and cheese, not the oil and wine switched on with the route, so its route
  // showed "nothing switched on". With the colonies founded, the granary's wheat beyond what the city keeps goes to Athens.)
  send({ type: 'deal', city: 'athens', kind: 'sea', good: WHEAT, sell: true });
  // Two years on, so every page of the overview has two years of charts.
  playOn(2 * TICKS_PER_YEAR);
  // Then on to a fortnight before Athens' ship is due with a gang in its den and someone in the prison (trying again a
  // call later, a few times at most, if either is missing then).
  const r = routeOf(s, 'athens', 'sea');
  if (!r) return;
  const ready = (): boolean => s.crime.gangs.length > 0 && s.crime.held.some((x) => x.as === 'prison' && s.tick < x.until);
  for (let tries = 0; tries < ORDER_TRIES; tries++) {
    playOn(TICKS_PER_YEAR, ready);
    playOn(TICKS_PER_YEAR, () => !r.ship || r.ship.phase === SHIP_AWAY);
    const at = r.next - PLAGUE_WARNING_DAYS * TICKS_PER_DAY;
    if (at > s.tick) playOn(at - s.tick);
    if (ready()) break;
  }
  // Plague in Athens (as #plague): warned, not landed.
  startGreekPlague(s, 'athens', PLAGUE_ATHENS);
  sim.run(1);
}
/**
 * #order's answers to Greece: a careful player, who never borrows, takes an
 * offer or meets a request or a demand for tribute only with coin to spare,
 * and otherwise lets it run out.
 */
function answerCarefully(sim: Sim, seen: Set<number>): void {
  const s = sim.state;
  for (const d of s.world.deals) {
    if (seen.has(d.id) || d.state !== 'open') continue;
    seen.add(d.id);
    const spare = spendable(s) - wageBill(s) * ORDER_SPARE_MONTHS;
    const act = d.kind === 'loanoffer' ? 'decline' : d.kind === 'offer' && spare > 0 ? 'take' : (d.kind === 'request' || d.kind === 'tribute') && spare > 0 ? 'send' : '';
    if (!act) continue;
    sim.enqueue({ type: 'answer', deal: d.id, act });
    sim.flush();
  }
}
/** How many months' wages #order's careful player keeps before it gives anything away. */
const ORDER_SPARE_MONTHS = 3;
/** The wheat in the town's granaries (what settlers take). */
const granaryWheat = (s: SimState): number => s.buildings.reduce((a, b) => a + (b.kind === 'granary' ? held(b, WHEAT) : 0), 0);
/** What #order's player keeps in hand beyond a month's wages before the east quarter's big outlay (the new streets' homes fill before they pay). */
const ORDER_MARGIN = 400;
/** How many of Athens' calls #order waits through, at most, for a gang and a prisoner together. */
const ORDER_TRIES = 4;
/** What #order's town keeps back of the oil and wine it sells. */
const ORDER_KEEP = 300;
/** #order's law (on the court's panel). */
const ORDER_LAW: ReadonlyArray<[string, string]> = [['theft', 'prison'], ['vandal', 'prison'], ['arson', 'execution'], ['smuggling', 'fine']];

// Slice 55
/**
 * Monsters at the gates (slice 55). Each demo's monster is sent as its god
 * would send it (sendMonster), with its god's reason; the rest is staged.
 *
 * #monster: #richtown's town, the Cyclops sent by Poseidon, seen on the shore
 * and walking in from the west edge; it opens as he has the last few tiles
 * to his den below the trading post, so he settles in within seconds.
 *
 * #monsterraid: #companies' town, the Boar sent by Artemis and settled in its
 * marsh; the hoplites are sent (their banner, as a player would) to the field
 * the Boar goes for first, the one nearest its lair, and when they are part
 * of the way its raid is due (announced the day before, as always); it opens
 * as the Boar is at the field, wrecking, and the hoplites a few tiles off.
 *
 * #bestiary: #town, all seven sent and set down before lairs of their kind
 * side by side on the open ground below the town (staged: real lairs are
 * miles apart), facing the camera, paused. They would raid in a month.
 */
const MONSTER_WHY: Record<MonsterId, string> = {
  hydra: 'no marriage in your city is made before her altar',
  medusa: 'your city gives no thought to wisdom',
  cyclops: 'your ships sail his sea and give him nothing',
  minotaur: 'your city has forgotten the king of the gods',
  chimera: 'your city keeps no soldiers in his honour',
  talos: 'your forges burn without a gift to him',
  boar: 'your hunters take her deer and give her no share',
};
/** How far (tiles) the Cyclops still has to walk when #monster opens. */
const MONSTER_LEFT = 7;
/** How far (tiles) #monsterraid's hoplites hold from the field, out of the Boar's way, and how far off they are when it opens. */
const MONSTERRAID_HOLD = 14;
const MONSTERRAID_OPEN = 9;
/** The longest any staging waits. */
const MONSTER_GUARD = 3 * TICKS_PER_MONTH;
/** #bestiary's row: its first lair's tile, and the step to the next (a diagonal, across the classic view), the lairs' mouths to the camera (south-west), the seven turned a little to their left (+z) to show their shapes. */
const BESTIARY = { x: 66, z: 49, step: 3, mouth: (3 * Math.PI) / 4, face: Math.PI / 2 };

function monsterTown(sim: Sim): void {
  town(TOWN_TICKS, SAFE, true)(sim);
  const s = sim.state;
  const m = sendMonster(s, 'cyclops', MONSTER_WHY.cyclops);
  if (!m) return;
  const spot = lairSpot(s, m);
  const end = s.tick + MONSTER_GUARD;
  while (s.tick < end && (m.state === 'coming' || (m.state === 'settling' && dhypot(m.x - spot.x, m.z - spot.z) > MONSTER_LEFT))) sim.step();
}

/** What the Boar goes for first: the field nearest its lair (its own rule, sim/monsters.ts). */
function boarField(s: SimState, m: Beast): Building | undefined {
  const n = BAY.size;
  const lx = (m.lair % n) + 0.5;
  const lz = Math.floor(m.lair / n) + 0.5;
  const d = (b: Building): number => dhypot(centreOf(b)[0] - lx, centreOf(b)[1] - lz);
  return s.buildings.filter((b) => ['farm', 'grove', 'vineyard', 'pasture', 'horsefarm', 'dairy'].includes(b.kind)).sort((a, b) => d(a) - d(b) || a.id - b.id)[0];
}

function monsterRaidTown(sim: Sim): void {
  COMPANIES(sim);
  const s = sim.state;
  const n = BAY.size;
  const m = sendMonster(s, 'boar', MONSTER_WHY.boar);
  if (!m) return;
  let end = s.tick + MONSTER_GUARD;
  while (s.tick < end && m.state !== 'lair') sim.step();
  const field = boarField(s, m);
  const hop = s.army.companies.find((c) => c.kind === 'hoplite');
  const barracks = s.buildings.find((b) => b.kind === 'barracks');
  if (!field || !hop || !barracks) return;
  const [fx, fz] = centreOf(field);
  const [bx, bz] = centreOf(barracks);
  const send = (tile: number): void => {
    sim.enqueue({ type: 'banner', company: hop.id, tile });
    sim.flush();
  };
  /** The walkable tile nearest a point (within a few tiles), or -1. */
  const near = (x: number, z: number): number => {
    let best = -1;
    let bd = Infinity;
    for (let dz = -4; dz <= 4; dz++)
      for (let dx = -4; dx <= 4; dx++) {
        const t = (Math.floor(z) + dz) * n + Math.floor(x) + dx;
        const d = dhypot((t % n) + 0.5 - x, Math.floor(t / n) + 0.5 - z);
        if (walkable(sim.map, s, t) && d < bd) [best, bd] = [t, d];
      }
    return best;
  };
  // The hoplites first to a place on the way from the barracks, out of the Boar's way, and held there.
  const k = MONSTERRAID_HOLD / Math.max(1, dhypot(bx - fx, bz - fz));
  const hold = near(fx + (bx - fx) * k, fz + (bz - fz) * k);
  if (hold < 0) return;
  send(hold);
  end = s.tick + MONSTER_GUARD;
  while (s.tick < end && hop.order !== 'hold') sim.step();
  // Its raid due (announced the day before, as every raid is); at the field, the hoplites sent to it from their side.
  m.next = s.tick + STIR + 1;
  end = s.tick + MONSTER_GUARD;
  while (s.tick < end && !(m.state === 'raiding' && m.wait > 0)) sim.step();
  // (Beside the Boar where it stands at the field, on the hoplites' side: open ground the men can get at it from.)
  let cx = 0;
  let cz = 0;
  let k2 = 0;
  for (const x of s.army.soldiers) if (x.company === hop.id) [cx, cz, k2] = [cx + x.x, cz + x.z, k2 + 1];
  const away = Math.max(1e-6, dhypot(cx / k2 - m.x, cz / k2 - m.z));
  const beside = near(m.x + ((cx / k2 - m.x) / away) * 2, m.z + ((cz / k2 - m.z) / away) * 2);
  if (beside < 0) return;
  send(beside);
  const men = (): number => {
    let best = Infinity;
    for (const x of s.army.soldiers) if (x.company === hop.id) best = Math.min(best, dhypot(x.x - fx, x.z - fz));
    return best;
  };
  end = s.tick + TICKS_PER_DAY * 3;
  while (s.tick < end && men() > MONSTERRAID_OPEN) sim.step();
}

function bestiaryTown(sim: Sim): void {
  town(TOWN_TICKS)(sim);
  const s = sim.state;
  const n = BAY.size;
  const mouth = BESTIARY.mouth;
  MONSTER_IDS.forEach((kind, i) => {
    const m = sendMonster(s, kind, MONSTER_WHY[kind]);
    if (!m) return;
    const x = BESTIARY.x + i * BESTIARY.step;
    const z = BESTIARY.z + i * BESTIARY.step;
    m.lair = z * n + x;
    m.mouth = mouth;
    m.state = 'lair';
    m.settled = s.tick;
    m.x = x + 0.5;
    m.z = z + 0.5;
    m.face = BESTIARY.face;
    m.path = [];
    m.next = s.tick + TICKS_PER_MONTH;
  });
  // (Their sightings, staged, are not news.)
  s.messages.log = s.messages.log.filter((g) => g.kind !== 'monster');
  s.rev++;
}

// Slice 56
/** Why Demeter loves #epiphany's town (staged: slice 53 makes her moods real). */
export const EPIPHANY_WHY = 'your full granaries and the bread on every table';
/** #epiphany: #town, Demeter staged loving, and her visit begun (a command, so the opening is the moment she arrives). */
function epiphanyTown(sim: Sim): void {
  town(TOWN_TICKS)(sim);
  honour(sim.state, 'demeter', 72, 'staged', EPIPHANY_WHY, 0);
  sim.enqueue({ type: 'visit', god: 'demeter', why: 'loving' });
  sim.flush();
}
/** #pantheon: where the row of the twelve begins on the Bay's flood plain, and how far apart they stand, along the classic view's level (towards +x and +z). */
// (Merge of slice 56: 2.8 apart, not 2.2, since the review made them 2.5 tiles tall; the row's start moved so its middle
// stays at #pantheon's view, 64.6, 54.6.)
export const PANTHEON_AT = { x: 53.7, z: 43.7 };
export const PANTHEON_GAP = 2.8;
function pantheonField(sim: Sim): void {
  const step = PANTHEON_GAP / Math.SQRT2;
  // (Zeus first on the left as you look: the row runs from the far end along the screen.)
  const last = GOD_IDS.length - 1;
  GOD_IDS.forEach((god, i) => sim.enqueue({ type: 'visit', god, why: 'pose', at: { x: PANTHEON_AT.x + (last - i) * step, z: PANTHEON_AT.z + (last - i) * step } }));
  sim.flush();
}

// Slice 53
/**
 * The twelve and their tempers (slice 53). #gods: #richtown, the gods
 * watching from the start (its 900 people noticed at once), its shrine by the
 * core given to Poseidon, and four more shrines built as the treasury can pay
 * for them: Poseidon's second by the quay, Demeter's by the farms, Apollo's
 * by the theatre and Dionysus's by the vineyards. A few months on, a festival
 * to Poseidon at the quay (the four horses it takes brought into the quay's
 * storehouse for this demo: the town keeps none), so Athena, his rival,
 * minds both his shrines and his festival; and her jealousy is staged a
 * little deeper, so the rivalry bites as the demo opens. Two months later an
 * offering sets out for Demeter from the granary, and the demo opens with
 * Olympus open on the twelve.
 */
const GODS_SHRINES: ReadonlyArray<[number, number, GodId]> = [
  [72, 66, 'poseidon'],
  [44, 39, 'demeter'],
  [60, 36, 'apollo'],
  [85, 66, 'dionysus'],
];
/** The core's shrine (#richtown's own, by the agora). */
const CORE_SHRINE = { x: 68, z: 39 };
/** How long #gods plays with its shrines before the festival, and after it before the offering (each month a bar on Olympus's record). */
const GODS_BEFORE = 3 * TICKS_PER_MONTH;
const GODS_AFTER = 2 * TICKS_PER_MONTH;
/** Athena's staged jealousy (set up for this demo). */
const ATHENA_JEALOUS = -12;

function godsTown(sim: Sim): void {
  town(TOWN_TICKS, SAFE, true)(sim);
  const s = sim.state;
  const n = sim.map.size;
  const send = (c: Parameters<Sim['enqueue']>[0]): void => {
    sim.enqueue(c);
    sim.flush();
  };
  gods(sim, true);
  const at = (x: number, z: number): Building | undefined => s.buildings.find((b) => b.kind === 'shrine' && b.x === x && b.z === z);
  const core = at(CORE_SHRINE.x, CORE_SHRINE.z);
  if (core) send({ type: 'dedicate', id: core.id, god: 'poseidon' });
  for (const [x, z, god] of GODS_SHRINES) {
    waitFor(sim, s.tick, SHRINE_COST + JOBS.shrine * WAGE);
    send({ type: 'build', kind: 'shrine', at: [z * n + x] });
    const b = at(x, z);
    if (b) send({ type: 'dedicate', id: b.id, god });
  }
  sim.run(GODS_BEFORE);
  // Poseidon's festival at the quay: its horses brought in for this demo, and the coin when the treasury has it.
  const quay = at(GODS_SHRINES[0][0], GODS_SHRINES[0][1]);
  const store = s.buildings.find((b) => b.kind === 'storehouse' && b.x === 76 && b.z === 65) ?? s.buildings.find((b) => b.kind === 'storehouse');
  if (quay && store) {
    setHeld(store, HORSES, held(store, HORSES) + festivalGoods(HORSES));
    waitFor(sim, s.tick, 250 + wageBill(s));
    send({ type: 'festival', id: quay.id });
    const end = s.tick + 4 * TICKS_PER_MONTH;
    while (s.tick < end && s.gods.festivals.length > 0) sim.run(TICKS_PER_DAY);
  }
  honour(s, 'athena', ATHENA_JEALOUS, 'staged', `jealous of the honours paid to ${GODS.poseidon.name} in a city she might have had (set up for this demo)`, 2 * TICKS_PER_YEAR);
  sim.run(GODS_AFTER);
  // An offering on its way to Demeter, from the granary.
  const demeter = at(GODS_SHRINES[1][0], GODS_SHRINES[1][1]);
  if (demeter) send({ type: 'offer', id: demeter.id });
  sim.run(TICKS_PER_DAY);
}

/**
 * #procession: #richtown, the gods watching, its shrine by the core's agora
 * given to Demeter, a festival to her held there (the wheat from the
 * granary, the coin from the treasury), and the demo opens a few days after
 * the procession sets out, as it rounds the agora.
 */
function processionTown(sim: Sim): void {
  town(TOWN_TICKS, SAFE, true)(sim);
  const s = sim.state;
  const send = (c: Parameters<Sim['enqueue']>[0]): void => {
    sim.enqueue(c);
    sim.flush();
  };
  gods(sim, true);
  const core = s.buildings.find((b) => b.kind === 'shrine' && b.x === CORE_SHRINE.x && b.z === CORE_SHRINE.z);
  if (!core) return;
  send({ type: 'dedicate', id: core.id, god: 'demeter' });
  waitFor(sim, s.tick, 250);
  send({ type: 'festival', id: core.id });
  const end = s.tick + 2 * TICKS_PER_MONTH;
  while (s.tick < end && !festivalUnderWay(s, 'demeter')) sim.run(1);
  sim.run(PROCESSION_OPENS);
}
/** How long #procession's procession has walked as it opens (ticks). */
const PROCESSION_OPENS = 30;
/** #procession's panel: Demeter's shrine. */
function demeterShrine(s: SimState): number {
  return s.buildings.find((b) => b.kind === 'shrine' && b.god === 'demeter')?.id ?? 0;
}

// Slice 57
/**
 * Blessings and wrath (slice 57). A god's anger is staged through the mood API
 * (`honour`, named as set up for the demo) and the omen begun through the
 * hook (`beginOmen`); everything after plays as the sim has it.
 */
/** #omen: Athena's staged anger: a little past angry, so one offering (+4) lifts her back to displeased. */
export const OMEN_MOOD = -33;
export const OMEN_WHY = 'the sacred olive cut down to widen the agora (set up for this demo)';
/** How far into the omen's month #omen opens. */
const OMEN_OPENS = 5 * TICKS_PER_DAY;
function omenTown(sim: Sim): void {
  town(TOWN_TICKS, SAFE, true)(sim);
  const s = sim.state;
  gods(sim, true);
  const core = s.buildings.find((b) => b.kind === 'shrine' && b.x === CORE_SHRINE.x && b.z === CORE_SHRINE.z);
  if (core) {
    sim.enqueue({ type: 'dedicate', id: core.id, god: 'athena' });
    sim.flush();
  }
  // (Played into the next month, so what she counts in the city each month is counted, then her anger set, never fading,
  // so the mood is OMEN_MOOD and stays there unless the player lifts her.)
  sim.run(TICKS_PER_MONTH - (s.tick % TICKS_PER_MONTH) + TICKS_PER_DAY);
  honour(s, 'athena', OMEN_MOOD - moodOfGod(s, 'athena'), 'staged', OMEN_WHY, 0);
  beginOmen(s, sim.map, 'athena', 'medusa');
  sim.run(OMEN_OPENS);
  // (Kept at OMEN_MOOD as it opens, whatever the days counted.)
  honour(s, 'athena', OMEN_MOOD - moodOfGod(s, 'athena'), 'staged', OMEN_WHY, 0);
}

/** #blessing: where Demeter's sanctuary goes (beside #town's fields), and her staged warmth. */
const BLESSING_AT = { x: 50, z: 40 };
export const BLESSING_MOOD = 42;
export const BLESSING_WHY = 'the first fruits of your fields laid on her altar (set up for this demo)';
function blessingTown(sim: Sim): void {
  town(TOWN_TICKS)(sim);
  const s = sim.state;
  const send = (c: Parameters<Sim['enqueue']>[0]): void => {
    sim.enqueue(c);
    sim.flush();
  };
  gods(sim, true);
  income(s, SANCTUARY_COST, 'gifts', 'set up for this demo: the sanctuary’s coin');
  const at = spotNear(sim, 'sanctuary' as BuildKind, sideOf('sanctuary'), BLESSING_AT.x, BLESSING_AT.z, 20);
  if (at < 0) return;
  send({ type: 'sanctuary', god: 'demeter', at: [at] });
  const site = sanctuaryOf(s, 'demeter');
  if (!site) return;
  // Raised at once, stage by stage, as if its builders had just finished each (as #twelve's: no materials hauled).
  const b = s.buildings.find((x) => x.id === site.id);
  if (b) b.clock = TICKS_PER_MONTH;
  for (let stage = 0; stage < 3 && !site.finished; stage++) {
    site.building = true;
    site.work = workOf(stagesOf(site)[site.stage]);
    sim.step();
  }
  // (Played on until Demeter has come to see her new sanctuary and gone, so she can come again to give her blessing.)
  const end = s.tick + 2 * TICKS_PER_MONTH;
  sim.run(10 * TICKS_PER_DAY);
  while (s.tick < end && s.gods.walks.figures.some((f) => f.god === 'demeter')) sim.run(TICKS_PER_DAY);
  sim.run(2 * TICKS_PER_DAY);
  honour(s, 'demeter', BLESSING_MOOD - moodOfGod(s, 'demeter'), 'staged', BLESSING_WHY, 0);
}

/** #wrath: Poseidon's staged anger, and how many days before the earthquake it opens. */
export const WRATH_WHY = 'the quay built over his sacred rocks (set up for this demo)';
const WRATH_OPENS = 4 * TICKS_PER_DAY;
function wrathTown(sim: Sim): void {
  town(TOWN_TICKS, SAFE, true)(sim);
  const s = sim.state;
  gods(sim, true);
  sim.run(TICKS_PER_DAY);
  honour(s, 'poseidon', -50 - moodOfGod(s, 'poseidon'), 'staged', WRATH_WHY, 2 * TICKS_PER_YEAR);
  const o = beginOmen(s, sim.map, 'poseidon', 'earthquake');
  if (!o) return;
  sim.run(Math.max(0, o.day - WRATH_OPENS - s.tick));
}
