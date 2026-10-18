/**
 * Trade routes and their traders.
 *
 * You open a route to a city of Greece for a fee, by land (to Corinth, Sparta
 * or Athens, which needs the caravan yard) or by sea (to Athens, Corinth or
 * Troy, which needs the trading post). A ruler who is cold or worse won't
 * open one. Each city buys what it is short of and sells what it has plenty
 * of (sellsAndBuys in world.ts), each up to a yearly limit, at its own price
 * per hundred, which moves (world.ts: what you sell them makes it cheaper next
 * time, what you buy dearer), with its ruler's terms on top (yourPrice); for each you choose whether to trade it, and buying, how much
 * to stock the stores up to. How much the city keeps of a good it sells is the
 * one figure the trading post has always had (`trade.keep`), shared by every
 * route: there is only one surplus in the stores.
 *
 * Caravans: one every LAND_EVERY, counted from when the last stepped onto
 * your map. It travels the road on the map of Greece (a `trader` traveller,
 * at a pure function of the tick), steps onto your map at the edge road
 * nearest its city, walks the roads to the yard, trades for TRADE_TICKS
 * (unloading what you ordered on arrival, taking what is at the yard of what
 * it buys over the days, paying as it leaves) and walks out the way it came,
 * then home along the road on the map. The next sets off from home while the
 * last is still in the city, so with a yard far from the edge one can be
 * walking in as another walks out; only one trades at a time (one that
 * reaches the gate while another trades waits its turn there).
 *
 * Ships: one every SEA_EVERY, sailing her lane between her city and your
 * gulf as the Tyre ship does (visitorOnMap), then into the bay along the Tyre
 * ship's way in. The Tyre ship keeps her schedule and always ties up; a
 * foreign ship that would find the jetty taken anchors off her way in, a
 * little to one side, and comes alongside when it is free and no ship is due
 * before she would be done. Ships wait their turn in the order they came.
 *
 * The yard's porters are the docker's work (trade.ts) from the yard. Money
 * goes through the treasury (the fee, imports, sales, each on its own line)
 * and goods through the stock book. Pure, and nothing here runs in a town
 * that has never opened a route or built a yard.
 */
import type { CoastMap } from '../map/bake';
import { CITY_IDS, EDGE_ALONG, HORIZON_ALONG, lineLength, PLACES, wayOf, wayPoints as tableWay, type CityId } from '../map/greece';
import { findBuilding } from './buildings';
import { START_MONTH, TICKS_PER_DAY, TICKS_PER_MONTH, TICKS_PER_YEAR } from './clock';
import { lastRoad, wayPoints } from './food';
import { held, setHeld, WARE_NAMES } from './foods';
import { edgeRoads, nearestEdge, overland, roadSearch, tracePath } from './roads';
import { roadsBeside } from './rounds';
import type { Building, SimState, TradeRoute, Traveller, Visitor, Walker } from './state';
import { TILE_ROAD } from './state';
import { note } from './stockbook';
import {
  BACK_TICKS,
  berthOf,
  cityHolds,
  depotRoom,
  inHand,
  inwardAt,
  KEEP_MAX,
  leaveTicks,
  LOADING,
  pathLength,
  pointAlong,
  sailable,
  SAIL_IN,
  shipAt,
  shipRoute,
  SHIP_ANCHORED,
  SHIP_AWAY,
  SHIP_BERTHING,
  SHIP_COMING,
  SHIP_LEAVING,
  SHIP_MOORED,
  smooth,
  storeKind,
  TRADE_GOODS,
  tradeIndex,
  tradingPost,
  TURN_TICKS,
  underWay,
  DEFAULT_KEEP,
} from './trade';
import { income, pay, spendable, wageBill } from './treasury';
import { CARAVAN_SPEED, giftOf, newWalker, offMapPoint, position, roadPoints, setPath } from './walk';
import { cityOf, COLD, moodOf, moodWord, rulerName, sellsAndBuys, snubbed, traded, VOYAGE, yourPrice } from './world';

export type RouteKind = 'land' | 'sea';

/** A way a route can take: to which city, by land or sea, along which way on the map, for what fee; a caravan comes in at the map's edge on its side. */
export interface RouteWay {
  city: CityId;
  kind: RouteKind;
  way: string;
  fee: number;
  /** Land: the edge of your map nearest the city, where its caravans come in. */
  side: 'north' | 'west' | 'east' | 'south';
}

/** Every route that can be opened, in the order the panels list them. */
export const ROUTE_WAYS: readonly RouteWay[] = [
  { city: 'corinth', kind: 'land', way: 'corinth-land', fee: 500, side: 'north' },
  { city: 'sparta', kind: 'land', way: 'sparta-land', fee: 600, side: 'west' },
  { city: 'athens', kind: 'land', way: 'athens-land', fee: 750, side: 'north' },
  { city: 'athens', kind: 'sea', way: 'athens-sea', fee: 800, side: 'south' },
  { city: 'corinth', kind: 'sea', way: 'corinth-sea', fee: 800, side: 'south' },
  { city: 'troy', kind: 'sea', way: 'troy-sea', fee: 1000, side: 'south' },
];

/** The way a route takes (undefined: there is none to that city that way). */
export const routeWay = (city: CityId | string, kind: RouteKind): RouteWay | undefined => ROUTE_WAYS.find((r) => r.city === city && r.kind === kind);

/** A caravan every two months, a ship every three; the first caravan a month after the route opens. */
export const LAND_EVERY = 2 * TICKS_PER_MONTH;
export const SEA_EVERY = 3 * TICKS_PER_MONTH;
export const FIRST_TRADER = TICKS_PER_MONTH;
/** A caravan's pace on the map of Greece (table units a tick): the road to Corinth takes about five days. */
export const LAND_PACE = 0.14;
/** How long a caravan trades at the yard. */
export const TRADE_TICKS = 3 * TICKS_PER_DAY;
/** The least worth unloading. */
export const MIN_IMPORT = 50;
/** A foreign ship anchors this far back along her way in from the jetty, and this far to one side of it. */
export const ANCHOR_BACK = 10;
export const ANCHOR_SIDE = 3;
/** She moves aside over the last stretch of her way to the anchorage (tiles), and comes alongside from it over BERTH_TICKS. */
const SIDE_RUN = 6;
export const BERTH_TICKS = 3 * TICKS_PER_DAY;
/** How long a ship tied up keeps the jetty after she is done loading: backing off and swinging round, and a margin. */
const CLEAR = BACK_TICKS + TURN_TICKS + 2 * TICKS_PER_DAY;

const zeros = (): number[] => TRADE_GOODS.map(() => 0);
const cityName = (id: CityId): string => PLACES[id].name;

/** The route to a city that way, if it is open. */
export const routeOf = (s: SimState, city: CityId | string, kind: RouteKind): TradeRoute | undefined => s.world.routes.find((r) => r.city === city && r.kind === kind);

/** The caravan yard (there is only ever one), or undefined. */
export const caravanYard = (s: SimState): Building | undefined => s.buildings.find((b) => b.kind === 'yard');

/** How many a city buys or sells of a trade good in a year: about the gap between what it makes and uses, in hundreds, 400 to 6,000. */
export function yearlyLimit(s: SimState, city: CityId, k: number): number {
  const c = cityOf(s.world, city);
  return Math.max(400, Math.min(6000, Math.round(Math.abs(c.make[k] - c.need[k]) / 100) * 100));
}

/** What a city pays you or asks of you for so many measures of a trade good, at your price with it now (its market price and its ruler's terms). */
export const priceAt = (s: SimState, city: CityId, k: number, n: number): number => Math.round((n * yourPrice(s.world, city, k, s.tick)) / 100);

/** What you can sell a city (the goods it buys) and buy from it (the goods it sells), by trade good index. */
export function tradesOf(s: SimState, city: CityId): { theyBuy: number[]; theySell: number[] } {
  const { sells, buys } = sellsAndBuys(cityOf(s.world, city));
  return { theyBuy: buys, theySell: sells };
}

/** How long a caravan takes between its city and your map's edge on the map of Greece. */
export function landTicks(city: CityId): number {
  const w = routeWay(city, 'land');
  if (!w) return TICKS_PER_DAY;
  return Math.max(TICKS_PER_DAY, Math.round((lineLength(tableWay(wayOf(w.way))) - EDGE_ALONG) / LAND_PACE));
}

/** How long a ship takes between her city and the gulf's mouth: at the Tyre ship's pace. */
export function voyageTicks(city: CityId): number {
  const w = routeWay(city, 'sea');
  if (!w) return VOYAGE;
  const tyre = lineLength(tableWay(wayOf('tyre-sea'))) - HORIZON_ALONG;
  return Math.max(TICKS_PER_DAY, Math.round((VOYAGE * (lineLength(tableWay(wayOf(w.way))) - HORIZON_ALONG)) / tyre));
}

/** How long after a sea route opens its first ship is due at the jetty: a month, or as long as she takes to sail from home and in. */
export const firstShipAfter = (city: CityId): number => Math.max(FIRST_TRADER, SAIL_IN + voyageTicks(city) + 2 * TICKS_PER_DAY);

// ---------------------------------------------------------------------------
// Opening a route, and its trade.

/** Why a route can't be opened now, or '' if it can. */
export function routeRefusal(s: SimState, city: CityId | string, kind: RouteKind): string {
  const way = routeWay(city, kind);
  if (!way) return kind === 'land' ? `No road runs from your city to ${PLACES[city as CityId]?.name ?? 'there'}` : `No sea lane runs from your city to ${PLACES[city as CityId]?.name ?? 'there'}`;
  if (routeOf(s, city, kind)) return 'This route is open already';
  const c = cityOf(s.world, way.city);
  const mood = c.ruler ? moodWord(moodOf(c, s.tick)) : 'cordial';
  if (c.ruler && (mood === 'hostile' || mood === 'cold')) return `${c.ruler.title.replace(/ of .*/, '')} ${c.ruler.name} won’t deal with you: ${mood}`;
  if (kind === 'land' && !caravanYard(s)) return 'A land route needs a caravan yard, where the caravans trade';
  if (kind === 'sea' && !tradingPost(s)) return 'A sea route needs the trading post, where the ships tie up';
  if (spendable(s) < way.fee) return `Opening it costs ${way.fee.toLocaleString('en-GB')} dr: the treasury can’t spare that now`;
  return '';
}

function freshVisitor(): Visitor {
  return { phase: SHIP_AWAY, since: 0, turned: 1, path: [], post: 0, stop: 1, aside: 0 };
}

/** Open a route for its fee (a command; nothing if routeRefusal says no). */
export function openRoute(s: SimState, city: CityId | string, kind: RouteKind): void {
  if (routeRefusal(s, city, kind) !== '') return;
  const way = routeWay(city, kind) as RouteWay;
  pay(s, -way.fee, 'routes', `${cityName(way.city)} ${kind === 'land' ? 'by road' : 'by sea'}`);
  s.world.routes.push({
    city: way.city,
    kind,
    opened: s.tick,
    next: s.tick + (kind === 'land' ? FIRST_TRADER : firstShipAfter(way.city)),
    sold: zeros(),
    bought: zeros(),
    sell: TRADE_GOODS.map(() => false),
    buy: TRADE_GOODS.map(() => false),
    upto: DEFAULT_KEEP.slice(),
    ship: kind === 'sea' ? freshVisitor() : null,
    hold: zeros(),
    unloaded: zeros(),
    cost: 0,
    visits: 0,
    lastAt: 0,
    lastSold: zeros(),
    lastPaid: 0,
    lastBought: zeros(),
    lastCost: 0,
    missedAt: 0,
    missed: '',
    closed: 0,
  });
  if (!s.world.contact) s.world.contact = Math.max(1, s.tick);
  s.rev++;
}

/**
 * How much longer than usual between a route's traders: half as long again
 * when its ruler is cold (or worse), as usual otherwise.
 */
export function paceOf(s: SimState, city: CityId): number {
  const c = cityOf(s.world, city);
  return c.ruler && moodOf(c, s.tick) <= COLD ? 1.5 : 1;
}
/** The time between a route's traders now. */
export const everyOf = (s: SimState, r: TradeRoute): number => Math.round((r.kind === 'land' ? LAND_EVERY : SEA_EVERY) * paceOf(s, r.city));

/** A route's trade in a good (a command): sell it to them (if they buy it), buy it from them (if they sell it), how much to stock up to. */
export function setDeal(s: SimState, city: string, kind: RouteKind, good: number, sell?: boolean, buy?: boolean, upto?: number): void {
  const r = routeOf(s, city, kind);
  const k = Number.isInteger(good) ? tradeIndex(good) : -1;
  if (!r || k < 0) return;
  const { theyBuy, theySell } = tradesOf(s, r.city);
  if (typeof sell === 'boolean' && theyBuy.includes(k) && r.sell[k] !== sell) {
    r.sell[k] = sell;
    s.rev++;
  }
  if (typeof buy === 'boolean' && theySell.includes(k) && r.buy[k] !== buy) {
    r.buy[k] = buy;
    s.rev++;
  }
  if (typeof upto === 'number' && Number.isInteger(upto) && upto >= 0 && upto <= KEEP_MAX && r.upto[k] !== upto) {
    r.upto[k] = upto;
    s.rev++;
  }
}

// ---------------------------------------------------------------------------
// Each tick.

/** The routes' traders and the yard's porters, once a tick. Nothing happens in a town with no route and no yard. */
export function stepRoutes(s: SimState, map: CoastMap, dockers: (s: SimState, map: CoastMap, depot: Building) => void): void {
  const yard = caravanYard(s);
  if (yard) dockers(s, map, yard);
  const w = s.world;
  if (w.routes.length === 0 && w.travellers.length === 0) return;
  // A new year (the first of January): the yearly limits start afresh.
  if ((s.tick + START_MONTH * TICKS_PER_MONTH) % TICKS_PER_YEAR === 0) {
    for (const r of w.routes) {
      r.sold = zeros();
      r.bought = zeros();
    }
  }
  for (const r of w.routes) {
    if (r.kind === 'land') stepCaravanRoute(s, map, r);
    else stepShipRoute(s, map, r);
  }
  // Travellers that have arrived are let go.
  if (w.travellers.some((t) => s.tick >= t.start + t.dur)) w.travellers = w.travellers.filter((t) => s.tick < t.start + t.dur);
}

/** Take a share of what waits at the depot of the goods the route's trader buys (up to the year's limit): `last`, all that is left. */
function takeShare(s: SimState, r: TradeRoute, depot: Building, share: number, last: boolean): void {
  let changed = false;
  TRADE_GOODS.forEach((w, k) => {
    if (!r.sell[k]) return;
    const q = held(depot, w);
    const room = yearlyLimit(s, r.city, k) - r.sold[k] - r.hold[k];
    if (q <= 0 || room <= 0) return;
    const take = Math.min(room, last ? q : Math.ceil(q * share));
    if (take <= 0) return;
    setHeld(depot, w, q - take);
    r.hold[k] += take;
    note(s, w, 'sold', r.city, take);
    changed = true;
  });
  if (changed) s.looks++;
}

/**
 * What the treasury can spend on imports now: what building could spend
 * (spendable), less a month's wages, so a big order never leaves the
 * workplaces unpaid on the first of the month.
 */
export const importPurse = (s: SimState): number => Math.max(0, spendable(s) - wageBill(s));

/**
 * What the trader unloads for you on arrival: for each good you buy from it,
 * enough to bring the stores up to what you stock up to (counting what is
 * already at the depot or on its way back to the stores), up to the year's
 * limit, what fits at the depot, and what the treasury can spare for it now
 * (importPurse). Paid at once.
 */
function unload(s: SimState, r: TradeRoute, depot: Building): void {
  let changed = false;
  for (let k = 0; k < TRADE_GOODS.length; k++) {
    if (!r.buy[k]) continue;
    const w = TRADE_GOODS[k];
    const want = r.upto[k] - cityHolds(s, w) - held(depot, w) - inHand(s, depot, w).returning;
    const left = yearlyLimit(s, r.city, k) - r.bought[k];
    const price = Math.max(1, yourPrice(s.world, r.city, k, s.tick));
    const purse = importPurse(s);
    let n = Math.min(want, left, depotRoom(depot, w), Math.floor((purse * 100) / price));
    n = Math.floor(n / 10) * 10;
    while (n > 0 && priceAt(s, r.city, k, n) > purse) n -= 10;
    if (n < MIN_IMPORT) continue;
    const dr = priceAt(s, r.city, k, n);
    pay(s, -dr, 'imports', `${WARE_NAMES[w]} from ${cityName(r.city)}`, n);
    setHeld(depot, w, held(depot, w) + n);
    note(s, w, 'bought', r.city, n);
    r.bought[k] += n;
    r.unloaded[k] += n;
    r.cost += dr;
    // What you bought is gone from their stores: dearer next time.
    traded(s.world, r.city, k, -n);
    changed = true;
  }
  if (changed) s.looks++;
}

/** The trader is done: it pays for what it took (a line of the ledger for each good), and the visit is remembered. */
function settle(s: SimState, r: TradeRoute): void {
  let paid = 0;
  TRADE_GOODS.forEach((w, k) => {
    const n = r.hold[k];
    if (n <= 0) return;
    const dr = priceAt(s, r.city, k, n);
    paid += dr;
    r.sold[k] += n;
    income(s, dr, 'sales', `${WARE_NAMES[w]} to ${cityName(r.city)}`, n);
    // What you sold piles up in their stores: cheaper next time.
    traded(s.world, r.city, k, n);
  });
  r.visits++;
  r.lastAt = s.tick;
  r.lastSold = r.hold;
  r.lastPaid = paid;
  r.lastBought = r.unloaded;
  r.lastCost = r.cost;
  r.hold = zeros();
  r.unloaded = zeros();
  r.cost = 0;
}

// ---------------------------------------------------------------------------
// Caravans.

/** How many donkeys a city's caravans bring. */
export const donkeysOf = (city: CityId): number => (city === 'corinth' ? 5 : 4);

/** The caravan of a land route in the city now, if there is one. */
export const caravanOf = (s: SimState, city: CityId): Walker | undefined => {
  const ci = CITY_IDS.indexOf(city);
  const mine = (w: Walker): boolean => w.kind === 'caravan' && w.food === ci;
  return s.walkers.find((w) => mine(w) && w.wait > 0) ?? s.walkers.find((w) => mine(w) && !w.back) ?? s.walkers.find(mine);
};

/** The caravan's route (by its city). */
export const caravanRoute = (s: SimState, w: Walker): TradeRoute | undefined => routeOf(s, CITY_IDS[w.food] ?? '', 'land');

/** A land route's caravan on the map, coming to you or going home. */
export const caravanTraveller = (s: SimState, city: CityId, homeward: boolean): Traveller | undefined =>
  s.world.travellers.find((t) => t.kind === 'trader' && t.city === city && t.homeward === homeward && t.way === routeWay(city, 'land')?.way);

/** Which side of the map an edge tile is on. */
function sideOfEdge(size: number, t: number): RouteWay['side'] {
  const x = t % size;
  const z = Math.floor(t / size);
  if (z === 0) return 'north';
  if (x === 0) return 'west';
  if (x === size - 1) return 'east';
  return 'south';
}

/**
 * Where a caravan from a city comes in: the edge road with a way to the
 * yard, on the side nearest the city if there is one (the shortest way in);
 * otherwise any (the shortest). -1 if no road from any edge reaches the yard.
 */
export function caravanEntry(s: SimState, size: number, yard: Building, city: CityId): { edge: number; tiles: number[] } | null {
  const roads = roadsBeside(s, size, yard);
  if (roads.length === 0) return null;
  const search = roadSearch(s, size, roads);
  const side = routeWay(city, 'land')?.side ?? 'north';
  let best = -1;
  let bd = Infinity;
  let bestAny = -1;
  let ba = Infinity;
  for (const t of edgeRoads(s, size)) {
    const d = search.dist[t];
    if (d < 0) continue;
    if (sideOfEdge(size, t) === side && d < bd) {
      bd = d;
      best = t;
    }
    if (d < ba) {
      ba = d;
      bestAny = t;
    }
  }
  const edge = best >= 0 ? best : bestAny;
  if (edge < 0) return null;
  return { edge, tiles: tracePath(search, edge).reverse() };
}

/** A land route's schedule and its caravan on the map; the caravan in the city moves itself (moveCaravan). */
function stepCaravanRoute(s: SimState, map: CoastMap, r: TradeRoute): void {
  const way = (routeWay(r.city, 'land') as RouteWay).way;
  const coming = caravanTraveller(s, r.city, false);
  if (!coming && r.closed > 0) {
    // Closed by a hostile ruler: none sets off; the next comes a month after it opens again.
    r.next = Math.max(r.next, s.tick + FIRST_TRADER);
    return;
  }
  if (!coming) {
    // It sets off from home to arrive when due.
    if (s.tick >= r.next - landTicks(r.city)) s.world.travellers.push({ kind: 'trader', city: r.city, way, start: s.tick, dur: Math.max(1, r.next - s.tick), homeward: false });
    return;
  }
  if (s.tick < coming.start + coming.dur) return;
  // At your map's edge: in by the road to the yard, or back home if there is none. Either way the next is due LAND_EVERY after this one was.
  s.world.travellers = s.world.travellers.filter((t) => t !== coming);
  nextCaravan(s, r);
  const yard = caravanYard(s);
  const entry = yard ? caravanEntry(s, map.size, yard, r.city) : null;
  if (!yard || !entry) {
    turnedBack(s, r, yard ? 'road' : 'yard');
    return;
  }
  const w = newWalker(s, 'caravan', donkeysOf(r.city));
  w.origin = yard.id;
  w.target = yard.id;
  w.food = CITY_IDS.indexOf(r.city);
  w.home = entry.edge;
  w.since = s.tick;
  setPath(w, wayPoints(map.size, offMapPoint(map.size, entry.edge), entry.tiles, yard));
  s.walkers.push(w);
}

/** A caravan has come to your map's edge: the next is due LAND_EVERY after this one was, and not before tomorrow. */
function nextCaravan(s: SimState, r: TradeRoute): void {
  if (r.next <= s.tick) r.next = Math.max(r.next + everyOf(s, r), s.tick + TICKS_PER_DAY);
}

/** A caravan heads home along the road on the map. */
function homeward(s: SimState, r: TradeRoute): void {
  s.world.travellers.push({ kind: 'trader', city: r.city, way: (routeWay(r.city, 'land') as RouteWay).way, start: s.tick, dur: landTicks(r.city), homeward: true });
}

/** A trader turned back without trading: why, for the panels and the town line. */
function turnedBack(s: SimState, r: TradeRoute, why: string): void {
  r.missedAt = s.tick;
  r.missed = why;
  snub(s, r, why);
  if (r.kind === 'land') homeward(s, r);
}

/** The ruler takes a trader turned back as a snub. */
function snub(s: SimState, r: TradeRoute, why: string): void {
  snubbed(s, r.city, r.kind === 'land' ? (why === 'yard' ? 'their caravan found no caravan yard in your city' : 'their caravan found no road to your caravan yard') : 'their ship found no trading post in your city');
}

/** Point a caravan out of the city: along the road to where it came in (or the nearest edge road), or across country. False if it can get nowhere. */
function headOut(s: SimState, map: CoastMap, w: Walker): boolean {
  const size = map.size;
  const here = position(w);
  const from = lastRoad(s, w);
  if (from >= 0) {
    const search = roadSearch(s, size, [from]);
    const edge = w.home >= 0 && w.home < size * size && search.dist[w.home] >= 0 && s.tiles[w.home] === TILE_ROAD ? w.home : nearestEdge(search, s, size);
    if (edge >= 0) {
      const [ox, oz] = offMapPoint(size, edge);
      setPath(w, [[here[0], here[1], -1], ...roadPoints(s, size, tracePath(search, edge)), [ox, oz, -1]]);
      w.back = true;
      return true;
    }
  }
  const tx = Math.min(size - 1, Math.max(0, Math.floor(here[0])));
  const tz = Math.min(size - 1, Math.max(0, Math.floor(here[1])));
  const way = overland(map, s, tz * size + tx);
  if (!way) return false;
  const pts: Array<[number, number, number]> = [[here[0], here[1], -1]];
  for (let i = 0; i < way.points.length; i += 2) pts.push([way.points[i], way.points[i + 1], -1]);
  const [ox, oz] = offMapPoint(size, way.edge);
  pts.push([ox, oz, -1]);
  setPath(w, pts);
  w.back = true;
  return true;
}

/** The caravan's way to the yard was cut, or the yard went: a new way there from where it stands, or out again. */
function rerouteCaravan(s: SimState, map: CoastMap, w: Walker, r: TradeRoute | undefined): boolean {
  const size = map.size;
  const yard = findBuilding(s, w.origin);
  const from = lastRoad(s, w);
  if (!w.back && yard && r && from >= 0) {
    const search = roadSearch(s, size, roadsBeside(s, size, yard));
    if (search.dist[from] >= 0) {
      setPath(w, wayPoints(size, position(w), tracePath(search, from).reverse(), yard));
      return true;
    }
  }
  if (!w.back && r) {
    r.missedAt = s.tick;
    r.missed = yard ? 'road' : 'yard';
    snub(s, r, r.missed);
  }
  return headOut(s, map, w);
}

/** It has left your map: home along the road on the map. */
function caravanGone(s: SimState, w: Walker): false {
  // (Your own gift caravan, walking out: off on the road on the map from here, diplomacy.ts.)
  if (giftOf(w) > 0) return false;
  const r = caravanRoute(s, w);
  if (r) homeward(s, r);
  return false;
}

/** Another caravan of the same city trading at the yard now (one that reaches the gate meanwhile waits its turn). */
const tradingNow = (s: SimState, w: Walker): boolean => s.walkers.some((o) => o !== w && o.kind === 'caravan' && o.food === w.food && o.wait > 0 && !o.back);

/** The trader is done: it pays (settle), and the caravan remembers what it paid, for its tip on the way out. */
function settleCaravan(s: SimState, r: TradeRoute, w: Walker): void {
  settle(s, r);
  w.load = r.lastPaid;
}

/** At the yard's gate: it unloads what you ordered, then trades for TRADE_TICKS. */
function arrive(s: SimState, r: TradeRoute, yard: Building, w: Walker): void {
  r.hold = zeros();
  r.unloaded = zeros();
  r.cost = 0;
  unload(s, r, yard);
  w.wait = TRADE_TICKS;
  w.since = s.tick;
}

/** Move a caravan one tick along: in to the yard, trading there, and out again. False when it has left the map. */
export function moveCaravan(s: SimState, map: CoastMap, w: Walker): boolean {
  const r = caravanRoute(s, w);
  const yard = findBuilding(s, w.origin);
  if (w.wait > 0) {
    // Trading at the yard: a share of what is there each day, all of it on the last; then it pays and heads out.
    if (!yard || !r) {
      w.wait = 0;
      if (r) settleCaravan(s, r, w);
      return headOut(s, map, w) || caravanGone(s, w);
    }
    w.wait--;
    const done = TRADE_TICKS - w.wait;
    if (done % TICKS_PER_DAY === 0) {
      const days = TRADE_TICKS / TICKS_PER_DAY;
      const day = done / TICKS_PER_DAY;
      takeShare(s, r, yard, 1 / (days - day + 1), day >= days);
    }
    if (w.wait > 0) return true;
    settleCaravan(s, r, w);
    return headOut(s, map, w) || caravanGone(s, w);
  }
  // Waiting its turn at the gate while another caravan of its city trades.
  if (!w.back && yard && r && w.seg >= w.path.length / 2 - 1) {
    if (!tradingNow(s, w)) arrive(s, r, yard, w);
    return true;
  }
  // The way ahead cut, or the yard gone, on the way in: find another, or head out.
  const next = w.tiles[w.seg + 1];
  if ((next !== undefined && next >= 0 && s.tiles[next] !== TILE_ROAD) || (!w.back && (!yard || !r))) {
    if (!(w.back ? headOut(s, map, w) : rerouteCaravan(s, map, w, r))) return caravanGone(s, w);
  }
  let move = CARAVAN_SPEED;
  for (let guard = 0; guard < 8 && move > 0; guard++) {
    const last = w.path.length / 2 - 1;
    if (w.seg >= last) break;
    const i = w.seg * 2;
    const len = Math.hypot(w.path[i + 2] - w.path[i], w.path[i + 3] - w.path[i + 1]);
    if (w.along + move < len) {
      w.along += move;
      w.walked += move;
      break;
    }
    move -= len - w.along;
    w.walked += len - w.along;
    w.seg++;
    w.along = 0;
    if (w.seg < last) {
      const t = w.tiles[w.seg + 1];
      if (t >= 0 && s.tiles[t] !== TILE_ROAD && !(w.back ? headOut(s, map, w) : rerouteCaravan(s, map, w, r))) return caravanGone(s, w);
      continue;
    }
    if (w.back) return caravanGone(s, w);
    // At the yard's gate: it unloads what you ordered, then trades (or waits its turn, if another caravan of its city is trading).
    if (!yard || !r) {
      if (!headOut(s, map, w)) return caravanGone(s, w);
      break;
    }
    if (!tradingNow(s, w)) arrive(s, r, yard, w);
    break;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Foreign ships.

/** When the jetty is taken by the other ships (the Tyre ship, and other routes' ships at the post): [from, to, since] ticks, `since` when a ship waiting her turn began to wait (Infinity for the rest). */
function jettyTaken(s: SimState, post: Building, self: Visitor): Array<[number, number, number]> {
  const out: Array<[number, number, number]> = [];
  const busy = (from: number, to: number, since = Infinity): void => {
    out.push([from, to, since]);
  };
  const t = s.trade.ship;
  if (t.phase === SHIP_MOORED) busy(t.since, t.since + LOADING + CLEAR);
  else if (t.phase === SHIP_COMING) busy(t.since + SAIL_IN, t.since + SAIL_IN + LOADING + CLEAR);
  else if (t.phase === SHIP_LEAVING && !underWay(t, s.tick)) busy(t.since, t.since + BACK_TICKS + TURN_TICKS);
  if (t.due > 0 && t.phase === SHIP_AWAY) busy(t.due, t.due + LOADING + CLEAR);
  for (const r of s.world.routes) {
    const v = r.ship;
    if (!v || v === self || v.post !== post.id) continue;
    if (v.phase === SHIP_MOORED) busy(v.since, v.since + LOADING + CLEAR);
    else if (v.phase === SHIP_BERTHING) busy(v.since, v.since + BERTH_TICKS + LOADING + CLEAR);
    else if (v.phase === SHIP_COMING && v.stop >= 1) busy(v.since + SAIL_IN, v.since + SAIL_IN + LOADING + CLEAR);
    else if (v.phase === SHIP_COMING || v.phase === SHIP_ANCHORED) busy(-Infinity, Infinity, v.phase === SHIP_ANCHORED ? v.since : v.since + SAIL_IN);
    else if (v.phase === SHIP_LEAVING && !underWay(v, s.tick)) busy(v.since, v.since + BACK_TICKS + TURN_TICKS);
  }
  return out;
}

/** Is the jetty free for a ship from `from` to `to` (one waiting since `since` goes after those waiting longer)? */
function jettyFree(s: SimState, post: Building, self: Visitor, from: number, to: number, since = Infinity): boolean {
  for (const [a, b, q] of jettyTaken(s, post, self)) {
    // Another ship waiting her turn: she goes first if she has waited longer (or this one has only just come).
    if (q < Infinity) {
      if (since === Infinity || q < since) return false;
      continue;
    }
    if (a < to && from < b) return false;
  }
  return true;
}

/** She sets sail into the bay from the horizon, for the jetty, or for an anchorage if it will be taken when she arrives. */
function setSailVisitor(s: SimState, map: CoastMap, r: TradeRoute, v: Visitor, post: Building): boolean {
  const berth = berthOf(map, post);
  if (!berth) return false;
  v.path = shipRoute(map, berth);
  v.phase = SHIP_COMING;
  v.post = post.id;
  v.turned = 1;
  v.since = Math.min(s.tick, r.next - SAIL_IN);
  if (v.since < s.tick - SAIL_IN) v.since = s.tick;
  r.next = v.since + SAIL_IN;
  v.stop = 1;
  v.aside = 0;
  if (!jettyFree(s, post, v, r.next, r.next + LOADING + CLEAR)) {
    const L = pathLength(v.path);
    v.stop = Math.max(0.3, 1 - ANCHOR_BACK / Math.max(1, L));
    const p = pointAlong(v.path, v.stop * L);
    // A little to one side of her way, where the water is deep.
    for (const side of [ANCHOR_SIDE, -ANCHOR_SIDE, ANCHOR_SIDE / 2, -ANCHOR_SIDE / 2]) {
      const ok = [0.5, 1].every((f) => sailable(map, p.x - p.dz * side * f, p.z + p.dx * side * f)) && sailable(map, p.x - p.dz * side + p.dx * 1.8, p.z + p.dx * side + p.dz * 1.8) && sailable(map, p.x - p.dz * side - p.dx * 1.8, p.z + p.dx * side - p.dz * 1.8);
      if (ok) {
        v.aside = side;
        break;
      }
    }
  }
  return true;
}

/** The post went (or she can't reach it): she turns back from where she is, paying for anything she took. */
function turnBackVisitor(s: SimState, r: TradeRoute, v: Visitor): void {
  const at = visitorAt(v, s.tick);
  if (r.hold.some((n) => n > 0) || r.unloaded.some((n) => n > 0)) settle(s, r);
  v.turned = at ? at.inward : 1;
  v.phase = SHIP_LEAVING;
  v.since = s.tick;
  v.aside = 0;
  r.missedAt = s.tick;
  r.missed = 'post';
  snub(s, r, 'post');
}

/** Tied up: she unloads what you ordered, then loads a share of what waits on the quay of what she buys each day; at the end she pays and sails off. */
function stepLoadingVisitor(s: SimState, r: TradeRoute, v: Visitor, post: Building): void {
  const t = s.tick - v.since;
  if (t <= 0 || t % TICKS_PER_DAY !== 0) return;
  const days = LOADING / TICKS_PER_DAY;
  const day = t / TICKS_PER_DAY;
  takeShare(s, r, post, 1 / (days - day + 1), day >= days);
  if (day < days) return;
  settle(s, r);
  v.phase = SHIP_LEAVING;
  v.since = s.tick;
  v.turned = 1;
  // The next is due SEA_EVERY after this one was (half as long again from a cold ruler), and not before she can sail home and back.
  const every = everyOf(s, r);
  r.next += every;
  while (r.next - SAIL_IN - voyageTicks(r.city) < s.tick + leaveTicks(v) + voyageTicks(r.city)) r.next += every;
}

/** She ties up: the hold empty, what you ordered unloaded onto the quay. */
function moor(s: SimState, r: TradeRoute, v: Visitor, post: Building): void {
  v.phase = SHIP_MOORED;
  v.since = s.tick;
  v.stop = 1;
  v.aside = 0;
  r.hold = zeros();
  unload(s, r, post);
}

/** A sea route's ship, once a tick. */
function stepShipRoute(s: SimState, map: CoastMap, r: TradeRoute): void {
  const v = r.ship;
  if (!v) return;
  const post = tradingPost(s);
  if (v.phase === SHIP_LEAVING) {
    if (s.tick >= v.since + leaveTicks(v)) {
      v.phase = SHIP_AWAY;
      v.since = s.tick;
      v.path = [];
      v.post = 0;
      v.turned = 1;
      v.stop = 1;
      v.aside = 0;
    }
    return;
  }
  if (v.phase === SHIP_AWAY) {
    // Closed by a hostile ruler: she stays at home; the next sails as soon as she can once it opens again.
    if (r.closed > 0) {
      r.next = Math.max(r.next, s.tick + firstShipAfter(r.city));
      return;
    }
    if (s.tick < r.next - SAIL_IN) return;
    if (post && setSailVisitor(s, map, r, v, post)) return;
    // No post to call at: she turns back at your horizon, and comes again next time.
    r.missedAt = s.tick;
    r.missed = 'post';
    snub(s, r, 'post');
    v.since = s.tick;
    const every = everyOf(s, r);
    while (r.next - SAIL_IN - voyageTicks(r.city) < s.tick + voyageTicks(r.city)) r.next += every;
    return;
  }
  if (!post || v.post !== post.id) {
    turnBackVisitor(s, r, v);
    return;
  }
  if (v.phase === SHIP_COMING) {
    if (s.tick < v.since + SAIL_IN) return;
    if (v.stop < 1) {
      v.phase = SHIP_ANCHORED;
      v.since = s.tick;
    } else moor(s, r, v, post);
  } else if (v.phase === SHIP_ANCHORED) {
    if (jettyFree(s, post, v, s.tick, s.tick + BERTH_TICKS + LOADING + CLEAR, v.since)) {
      v.phase = SHIP_BERTHING;
      v.since = s.tick;
    }
  } else if (v.phase === SHIP_BERTHING) {
    if (s.tick >= v.since + BERTH_TICKS) moor(s, r, v, post);
  } else if (v.phase === SHIP_MOORED) stepLoadingVisitor(s, r, v, post);
}

/**
 * Where a foreign ship is in the bay at a tick (fractions too), which way her
 * bow points, and how far in along her way she is (0 at the horizon, 1 at the
 * jetty); null while she is away. Sailing to an anchorage she moves aside
 * over the last stretch; anchored she rides there; coming alongside she
 * eases back onto her way and in to the jetty; tied up and leaving she is
 * where the Tyre ship would be (shipAt).
 */
export function visitorAt(v: Visitor, tick: number): { x: number; z: number; dx: number; dz: number; inward: number } | null {
  if (v.phase === SHIP_AWAY || v.path.length < 4) return null;
  if (v.phase === SHIP_MOORED || v.phase === SHIP_LEAVING) return shipAt(v, tick);
  const L = pathLength(v.path);
  let f: number;
  let side: number;
  if (v.phase === SHIP_COMING) {
    f = v.stop * inwardAt(v.path, (tick - v.since) / SAIL_IN);
    side = v.stop < 1 ? smooth((f * L - (v.stop * L - SIDE_RUN)) / SIDE_RUN) : 0;
  } else if (v.phase === SHIP_ANCHORED) {
    f = v.stop;
    side = 1;
  } else {
    const e = smooth((tick - v.since) / BERTH_TICKS);
    f = v.stop + (1 - v.stop) * e;
    side = 1 - e;
  }
  const p = pointAlong(v.path, f * L);
  // Aside of her way as it runs at the anchorage (so she doesn't jump where the way turns a corner).
  const q = v.aside !== 0 ? pointAlong(v.path, v.stop * L) : p;
  const a = v.aside * side;
  return { x: p.x - q.dz * a, z: p.z + q.dx * a, dx: p.dx, dz: p.dz, inward: f };
}

/**
 * Where a foreign ship is on the map of Greece at a tick: a distance along
 * her lane from your city (0 at your quay), which way she heads, and where she
 * is ('quay', 'bay', 'anchored', 'sea' or 'home'). As the Tyre ship: in your
 * bay where visitorAt has her (the city's horizon is the gulf's mouth), at
 * sea between the gulf and her city over her voyage, arriving at the horizon
 * as her sail first shows from your quay.
 */
export function visitorOnMap(r: TradeRoute, tick: number): { along: number; homeward: boolean; where: 'quay' | 'bay' | 'anchored' | 'sea' | 'home' } {
  const v = r.ship as Visitor;
  const way = routeWay(r.city, 'sea') as RouteWay;
  const L = lineLength(tableWay(wayOf(way.way)));
  const H = HORIZON_ALONG;
  const voyage = voyageTicks(r.city);
  if (v.phase === SHIP_MOORED) return { along: 0, homeward: false, where: 'quay' };
  if (v.phase !== SHIP_AWAY) {
    const at = visitorAt(v, tick);
    const inward = at ? at.inward : v.phase === SHIP_COMING ? 0 : 1;
    return { along: H * (1 - inward), homeward: v.phase === SHIP_LEAVING, where: v.phase === SHIP_ANCHORED ? 'anchored' : 'bay' };
  }
  const out = v.since > 0 ? (tick - v.since) / voyage : Infinity;
  const inb = (tick - (r.next - SAIL_IN - voyage)) / voyage;
  const outbound = out >= 0 && out < 1;
  const inbound = inb >= 0 && inb < 1 + 1 / voyage;
  if (outbound && (!inbound || out < 1 - inb)) return { along: H + (L - H) * out, homeward: true, where: 'sea' };
  if (inbound) return { along: L - (L - H) * Math.min(1, inb), homeward: false, where: 'sea' };
  return { along: L, homeward: false, where: 'home' };
}

/** A land route's caravans on the road on the map of Greece at a tick: each a distance along its road from your city (EDGE_ALONG at your map's edge), coming or going home. */
export function caravansOnMap(s: SimState, r: TradeRoute, tick: number): Array<{ along: number; homeward: boolean }> {
  const way = (routeWay(r.city, 'land') as RouteWay).way;
  const L = lineLength(tableWay(wayOf(way)));
  const out: Array<{ along: number; homeward: boolean }> = [];
  for (const t of s.world.travellers) {
    if (t.kind !== 'trader' || t.city !== r.city || t.way !== way || tick < t.start || tick > t.start + t.dur) continue;
    const u = Math.max(0, Math.min(1, (tick - t.start) / t.dur));
    out.push({ along: t.homeward ? EDGE_ALONG + (L - EDGE_ALONG) * u : L - (L - EDGE_ALONG) * u, homeward: t.homeward });
  }
  return out;
}

// ---------------------------------------------------------------------------
// What the panels, the chips and the tips say.

const dayWords = (n: number): string => (n === 1 ? '1 day' : `${n} days`);
const daysTo = (s: SimState, t: number): number => Math.max(1, Math.ceil((t - s.tick) / TICKS_PER_DAY));
const fmt = (n: number): string => Math.round(n).toLocaleString('en-GB');

/** "1,200 wheat, 600 cheese and 400 oil". */
export function wareList(ns: readonly number[]): string {
  const xs = ns.map((n, k) => (n > 0 ? `${fmt(n)} ${WARE_NAMES[TRADE_GOODS[k]]}` : '')).filter((x) => x);
  if (xs.length <= 1) return xs[0] ?? 'nothing';
  return `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}

/** Why a trader turned back last time, in words. */
const MISSED: Record<string, string> = {
  road: 'no road leads from the edge of the map to the caravan yard',
  yard: 'the city has no caravan yard',
  post: 'the city has no trading post',
};

/** Where a route's trader is, as the top bar's chip (`chip`, `short`) and the panels (`line`) say: `phase` 0 due, 1 coming, 2 here, 3 gone, `days` until the next thing. */
export interface TraderNews {
  phase: number;
  days: number;
  chip: string;
  short: string;
  line: string;
  /** Which trader (for the chip's tip and the panel's tab): a route's city and kind, or 'tyre'. */
  who: string;
  /** Land: a caravan; sea: a ship. */
  kind: RouteKind;
}

/** A route's trader's news. */
export function routeNews(s: SimState, r: TradeRoute): TraderNews {
  const name = cityName(r.city);
  // "Corinth’s", "Athens’".
  const whose = name.endsWith('s') ? `${name}’` : `${name}’s`;
  const who = `${r.city}-${r.kind}`;
  const missed = r.missedAt > 0 && s.tick - r.missedAt < TICKS_PER_MONTH ? MISSED[r.missed] : '';
  const shut = r.closed > 0 ? closedLine(s, r) : '';
  if (r.kind === 'land') {
    const w = caravanOf(s, r.city);
    if (w && w.wait > 0) {
      const days = daysTo(s, s.tick + w.wait);
      const so = r.hold.some((n) => n > 0) ? ` · bought so far: ${wareList(r.hold)}` : '';
      const brought = r.unloaded.some((n) => n > 0) ? ` · it brought ${wareList(r.unloaded)}` : '';
      return { phase: 2, days, chip: 'At yard', short: `${whose} caravan trading`, line: `The caravan from ${name} is trading at the yard: it pays and heads home in ${dayWords(days)}${brought}${so}`, who, kind: 'land' };
    }
    if (w && !w.back) return { phase: 1, days: 0, chip: 'In town', short: `${whose} caravan coming in`, line: `The caravan from ${name} is in the city, on its way to the caravan yard`, who, kind: 'land' };
    if (w) return { phase: 3, days: 0, chip: 'Leaving', short: `${whose} caravan leaving`, line: `The caravan from ${name} is heading home${r.lastPaid > 0 ? `: it paid ${fmt(r.lastPaid)} dr` : ''}`, who, kind: 'land' };
    const coming = caravanTraveller(s, r.city, false);
    const days = daysTo(s, r.next);
    if (coming) return { phase: 1, days, chip: `${days} d`, short: `Caravan on the road · ${days} d`, line: `A caravan from ${name} is on the road: it reaches the edge of your map in ${dayWords(days)}`, who, kind: 'land' };
    if (shut) return { phase: 0, days, chip: 'Closed', short: `Road to ${name} closed`, line: shut, who, kind: 'land' };
    const back = missed ? `The last caravan turned back: ${missed}. ` : '';
    return { phase: 0, days, chip: `${days} d`, short: `Caravan in ${days} d`, line: `${back}The next caravan from ${name} is due in ${dayWords(days)}`, who, kind: 'land' };
  }
  const v = r.ship as Visitor;
  if (v.phase === SHIP_COMING) {
    const days = daysTo(s, v.since + SAIL_IN);
    return v.stop < 1
      ? { phase: 1, days, chip: `${days} d`, short: `${whose} ship sighted`, line: `The ship from ${name} is sailing in: the jetty will be taken, so she anchors in the bay in ${dayWords(days)} and waits her turn`, who, kind: 'sea' }
      : { phase: 1, days, chip: `${days} d`, short: `${whose} ship sighted · ${days} d`, line: `The ship from ${name} is sailing in: she ties up at the jetty in ${dayWords(days)}`, who, kind: 'sea' };
  }
  if (v.phase === SHIP_ANCHORED || v.phase === SHIP_BERTHING) return { phase: 1, days: 0, chip: 'Anchored', short: `${whose} ship at anchor`, line: v.phase === SHIP_ANCHORED ? `The ship from ${name} is at anchor in the bay, waiting for the jetty` : `The ship from ${name} is coming alongside the jetty`, who, kind: 'sea' };
  if (v.phase === SHIP_MOORED) {
    const days = daysTo(s, v.since + LOADING);
    const brought = r.unloaded.some((n) => n > 0) ? ` · she brought ${wareList(r.unloaded)}` : '';
    const so = r.hold.some((n) => n > 0) ? ` · loaded so far: ${wareList(r.hold)}` : '';
    return { phase: 2, days, chip: 'In port', short: `${whose} ship loading`, line: `The ship from ${name} is tied up at the jetty: she pays and sails in ${dayWords(days)}${brought}${so}`, who, kind: 'sea' };
  }
  if (v.phase === SHIP_LEAVING) return { phase: 3, days: 0, chip: 'Sailed', short: `${whose} ship sailed`, line: missed ? `The ship from ${name} turned back: ${missed}` : `The ship from ${name} has sailed${r.lastPaid > 0 ? `: she paid ${fmt(r.lastPaid)} dr` : ''}`, who, kind: 'sea' };
  const days = daysTo(s, r.next);
  if (shut) return { phase: 0, days, chip: 'Closed', short: `${whose} sea route closed`, line: shut, who, kind: 'sea' };
  const back = missed ? `The last ship turned back: ${missed}. ` : '';
  return { phase: 0, days, chip: `${days} d`, short: `${whose} ship in ${days} d`, line: `${back}The next ship from ${name} is due in ${dayWords(days)}`, who, kind: 'sea' };
}

/** A closed route, in words: who closed it, since when, and what opens it. */
function closedLine(s: SimState, r: TradeRoute): string {
  const c = cityOf(s.world, r.city);
  const way = r.kind === 'land' ? 'road' : 'sea route';
  const days = Math.max(1, Math.floor((s.tick - r.closed) / TICKS_PER_DAY));
  return `${rulerName(c)} is hostile and has closed the ${way} (${days === 1 ? 'a day' : `${days} days`} ago): no ${r.kind === 'land' ? 'caravan' : 'ship'} comes until the mood mends past hostile. A gift can mend it`;
}

/** How the chip ranks news, by phase (due, coming, here, gone): here now first, then coming, then gone, then due soonest. */
const RANK = [3, 1, 0, 2];

/** Every trader's news, the most pressing first (the routes' and, given, the Tyre ship's). */
export function tradersNews(s: SimState, tyre: Omit<TraderNews, 'who' | 'kind'> | null): TraderNews[] {
  const all: TraderNews[] = s.world.routes.map((r) => routeNews(s, r));
  if (tyre) all.push({ ...tyre, who: 'tyre', kind: 'sea' });
  return all.sort((a, b) => RANK[a.phase] - RANK[b.phase] || a.days - b.days);
}

/** What a caravan is doing, for its hover tip. */
export function caravanDoing(s: SimState, w: Walker): { title: string; detail: string } {
  if (giftOf(w) > 0) {
    const g = s.world.gifts.find((x) => x.id === giftOf(w));
    const to = g ? cityName(g.to) : 'Greece';
    return { title: `Your gift to ${to}`, detail: `${w.people} donkeys in your city’s colours${g && g.good >= 0 ? ` with ${fmt(g.amount)} ${WARE_NAMES[TRADE_GOODS[g.good]]}` : ''}, on their way out of the city to the road to ${to}` };
  }
  const city = CITY_IDS[w.food] ?? 'corinth';
  const name = cityName(city);
  const r = caravanRoute(s, w);
  const title = `A caravan from ${name}`;
  const n = `${w.people} donkeys`;
  if (w.wait > 0 && r) {
    const brought = r.unloaded.some((x) => x > 0) ? `It brought ${wareList(r.unloaded)}` : 'It brought nothing you ordered';
    const took = r.hold.some((x) => x > 0) ? `bought so far ${wareList(r.hold)}` : 'nothing bought yet';
    return { title, detail: `${n}, trading at the caravan yard for ${dayWords(daysTo(s, s.tick + w.wait))} more · ${brought}; ${took}` };
  }
  if (w.back) return { title, detail: `${n}, heading home along the road${w.load > 0 ? ` · it paid ${fmt(w.load)} dr${r && r.lastPaid === w.load && r.lastAt >= w.since ? ` for ${wareList(r.lastSold)}` : ''}` : ''}` };
  const wants = r && r.buy.some((x) => x) ? ` · bringing what you buy from ${name}` : '';
  return { title, detail: `${n} and their drover, on their way to the caravan yard${wants}` };
}

/** What a depot's goods are worth to the routes that buy them (at each city's price, the best one), for the tips. */
export function bestBuyer(s: SimState, k: number, kind: RouteKind): { city: CityId; price: number } | null {
  let best: { city: CityId; price: number } | null = null;
  for (const r of s.world.routes) {
    if (r.kind !== kind || !r.sell[k]) continue;
    const p = yourPrice(s.world, r.city, k, s.tick);
    if (!best || p > best.price) best = { city: r.city, price: p };
  }
  return best;
}

/** Where a good is kept, in words (granaries, storehouses). */
export const keptIn = (k: number): string => (storeKind(TRADE_GOODS[k]) === 'granary' ? 'granaries' : 'storehouses');
