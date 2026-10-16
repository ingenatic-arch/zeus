/**
 * The food chain: wheat farms, their ox carts, the granary, the agora's food
 * stall with its porter, and the food vendor. One food, wheat, counted in
 * measures; a measure feeds one person for a month.
 *
 * A farm's crop grows (faster with more of its workers) and at harvest fills
 * its barn. Its carts take the grain by the shortest road to a granary with
 * room. When the agora's stall runs low its porter fetches grain from the
 * nearest granary that has some, and while the stall has food its vendor
 * walks her round (src/sim/rounds.ts) like the water carrier, topping up the
 * food of every hut or better beside her way.
 */
import { fertilityOf } from './build';
import type { CoastMap } from '../map/bake';
import { findBuilding, HUT } from './buildings';
import { TICKS_PER_MONTH } from './clock';
import { rateOf } from './labour';
import { nearestReached, roadSearch, tracePath } from './roads';
import { door, moveRounds, roadsBeside, sendOut, type ServiceSpec } from './rounds';
import { TILE_ROAD, type Building, type SimState, type Walker } from './state';
import { besideRoad, CARRIER_SPEED, CART_SPEED, centre, newWalker, position, setPath, WALK_SPEED } from './walk';
import { restFor } from './water';

/** Ticks a crop takes to grow at full strength (two months). */
export const GROW = 2 * TICKS_PER_MONTH;
/** Measures a harvest brings on the most fertile ground. */
export const HARVEST = 480;
/** What a farm's barn holds; when full, nothing more grows. */
export const BARN = 960;
/** What an ox cart carries. */
export const CART_LOAD = 160;
/** Most carts a farm has on the road at once. */
export const MAX_CARTS = 3;
/** Ticks between carts setting off from the same farm. */
export const CART_GAP = 30;
/** What a granary holds. */
export const GRANARY_CAP = 3200;
/** What the agora's food stall holds, and how low it gets before the porter goes for more. */
export const STALL_CAP = 400;
export const STALL_LOW = 200;
/** What the porter's handcart carries. */
export const PORTER_LOAD = 200;
/** Ticks a fully staffed granary takes to unload a cart or load a porter. */
export const HANDLE = 40;
/** Ticks the porter waits after coming back with nothing before trying again. */
export const PORTER_RETRY = 60;
/** How far by road from the agora the food vendor ever goes, and how much fresh road a round is. */
export const VENDOR_RANGE = 32;
export const VENDOR_WALK = 48;
/** How long a home's food lasts once the vendor has topped it up (four months). */
export const FOOD_LASTS = 4 * TICKS_PER_MONTH;
/** Ticks the vendor rests between rounds at a fully staffed agora; before the first. */
export const VENDOR_REST = 30;
export const FIRST_VENDOR = 20;

/** The harvest a farm brings in on its ground. */
export function harvestOf(map: CoastMap, f: Building): number {
  return Math.round(HARVEST * fertilityOf(map, f.x, f.z, 3));
}

/** Does this home buy food from the vendor? Huts and better with people in them (tents live off the land). */
export const eatsBread = (b: Building): boolean => b.kind === 'home' && b.level >= HUT && b.people > 0;

const near: Building[] = [];

/** The food vendor's round. */
export const FOOD: ServiceSpec = {
  record: (s) => s.rounds.food,
  range: VENDOR_RANGE,
  walk: VENDOR_WALK,
  speed: CARRIER_SPEED,
  score: (b) => (eatsBread(b) ? b.foodUntil : Infinity),
  serve(s: SimState, size: number, t: number, w: Walker) {
    const stall = findBuilding(s, w.origin);
    if (!stall || stall.stock <= 0) return;
    const full = s.tick + FOOD_LASTS;
    for (const b of besideRoad(s, size, t, near)) {
      if (!eatsBread(b) || b.foodUntil >= full) continue;
      // One measure per person per month added.
      const from = Math.max(b.foodUntil, s.tick);
      const cost = Math.ceil((b.people * (full - from)) / TICKS_PER_MONTH);
      if (cost <= stall.stock) {
        b.foodUntil = full;
        stall.stock -= cost;
      } else {
        b.foodUntil = from + Math.floor((stall.stock * TICKS_PER_MONTH) / b.people);
        stall.stock = 0;
      }
      if (stall.stock <= 0) return;
    }
  },
  rest: (b) => restFor(b, VENDOR_REST),
};

/** Carts out from a farm, or porters from the agora. */
export function errandsOut(s: SimState, b: Building): number {
  let n = 0;
  for (const w of s.walkers) if (w.origin === b.id && (w.kind === 'cart' || w.kind === 'porter')) n++;
  return n;
}

/** Room left in a granary (stock and what carts are bringing). */
export const roomIn = (g: Building): number => GRANARY_CAP - g.stock - g.incoming;

/**
 * The nearest building (by road from road tile `from`, or from building `b`'s
 * roadside) that passes `ok`: the building and the shortest way there, from
 * `from`'s side to the building's.
 */
function nearestBy(s: SimState, size: number, fromTiles: number[], ok: (g: Building) => boolean): { g: Building; way: number[] } | null {
  if (fromTiles.length === 0) return null;
  const search = roadSearch(s, size, fromTiles);
  let best: { g: Building; way: number[] } | null = null;
  let bd = Infinity;
  for (const g of s.buildings) {
    if (!ok(g)) continue;
    const at = nearestReached(search, roadsBeside(s, size, g));
    if (at < 0 || search.dist[at] >= bd) continue;
    bd = search.dist[at];
    best = { g, way: tracePath(search, at) };
  }
  return best;
}

/** Waypoints from `here` along road tiles `way`, ending at the door of `to`. */
function wayPoints(size: number, here: [number, number], way: number[], to: Building): Array<[number, number, number]> {
  const pts: Array<[number, number, number]> = [[here[0], here[1], -1]];
  for (const t of way) {
    const [x, z] = centre(size, t);
    pts.push([x, z, t]);
  }
  const [dx, dz] = door(size, to, way[way.length - 1]);
  pts.push([dx, dz, -1]);
  return pts;
}

/** Farms: the crop grows with the workers, the harvest fills the barn, and carts take it to a granary. */
export function stepFarms(s: SimState, map: CoastMap): void {
  const size = map.size;
  for (const f of s.buildings) {
    if (f.kind !== 'farm') continue;
    if (f.clock > 0) f.clock--;
    const rate = rateOf(f);
    if (f.stock < BARN && rate > 0) {
      const before = Math.floor((f.growth / GROW) * 8);
      f.growth += rate;
      if (f.growth >= GROW) {
        f.growth = 0;
        f.stock = Math.min(BARN, f.stock + harvestOf(map, f));
      }
      if (Math.floor((f.growth / GROW) * 8) !== before) s.rev++;
    }
    if (f.stock <= 0 || f.clock > 0 || errandsOut(s, f) >= MAX_CARTS) continue;
    const roads = roadsBeside(s, size, f);
    const found = nearestBy(s, size, roads, (g) => g.kind === 'granary' && roomIn(g) > 0);
    if (!found) {
      f.clock = CART_GAP;
      continue;
    }
    const { g, way } = found;
    const load = Math.min(CART_LOAD, f.stock, roomIn(g));
    const w = newWalker(s, 'cart', 1);
    w.origin = f.id;
    w.target = g.id;
    w.load = load;
    w.since = s.tick;
    f.stock -= load;
    g.incoming += load;
    setPath(w, wayPoints(size, door(size, f, way[0]), way, g));
    s.walkers.push(w);
    f.clock = CART_GAP;
  }
}

/** The agora: its porter fetches grain when the stall runs low, and its vendor walks while there is food. */
export function stepAgoras(s: SimState, map: CoastMap): void {
  const size = map.size;
  for (const a of s.buildings) {
    if (a.kind !== 'agora') continue;
    const rate = rateOf(a);
    // The food vendor.
    if (a.walker === 0 && --a.clock <= 0) {
      if (rate === 0 || a.stock <= 0 || !sendOut(s, size, a, 'food')) a.clock = VENDOR_REST;
    }
    // The porter (a.growth counts down to his next try).
    if (a.growth > 0) a.growth--;
    if (rate === 0 || a.growth > 0 || a.stock > STALL_LOW || errandsOut(s, a) > 0) continue;
    const found = nearestBy(s, size, roadsBeside(s, size, a), (g) => g.kind === 'granary' && g.stock > 0);
    if (!found) {
      a.growth = PORTER_RETRY;
      continue;
    }
    const w = newWalker(s, 'porter', 1);
    w.origin = a.id;
    w.target = found.g.id;
    w.since = s.tick;
    setPath(w, wayPoints(size, door(size, a, found.way[0]), found.way, found.g));
    s.walkers.push(w);
    a.growth = restFor(a, VENDOR_REST);
  }
}

/** Move the food vendor one tick along. */
export function moveVendor(s: SimState, map: CoastMap, w: Walker): boolean {
  return moveRounds(s, map, w, FOOD, 'agora');
}

/** The last road tile a walker stood on (or -1). */
function lastRoad(s: SimState, w: Walker): number {
  for (let k = Math.min(w.seg, w.tiles.length - 1); k >= 0; k--) {
    const t = w.tiles[k];
    if (t >= 0) return s.tiles[t] === TILE_ROAD ? t : -1;
  }
  return -1;
}

/** Send an errand walker along the road from where it stands to a building. False if no road joins them. */
function goTo(s: SimState, size: number, w: Walker, to: Building, from: number): boolean {
  if (from < 0) return false;
  const search = roadSearch(s, size, roadsBeside(s, size, to));
  if (search.dist[from] < 0) return false;
  setPath(w, wayPoints(size, position(w), tracePath(search, from).reverse(), to));
  return true;
}

/**
 * A cart or porter whose granary has gone (or whose way there was cut) looks
 * for another from where it stands; failing that, it turns for home. False if
 * it can get nowhere at all.
 */
function rethink(s: SimState, size: number, w: Walker, origin: Building): boolean {
  const old = findBuilding(s, w.target);
  if (old && w.kind === 'cart' && !w.back) old.incoming -= w.load;
  w.wait = 0;
  const from = lastRoad(s, w);
  if (!w.back && from >= 0) {
    const ok = w.kind === 'cart' ? (g: Building) => g.kind === 'granary' && roomIn(g) >= w.load : (g: Building) => g.kind === 'granary' && g.stock > 0;
    const found = nearestBy(s, size, [from], ok);
    if (found) {
      w.target = found.g.id;
      if (w.kind === 'cart') found.g.incoming += w.load;
      setPath(w, wayPoints(size, position(w), found.way, found.g));
      return true;
    }
  }
  w.back = true;
  w.target = 0;
  return goTo(s, size, w, origin, from);
}

/** A cart or porter is gone for good: its load goes back where it came from. */
function lost(w: Walker, origin: Building): false {
  if (w.kind === 'cart') origin.stock = Math.min(BARN, origin.stock + w.load);
  else origin.stock = Math.min(STALL_CAP, origin.stock + w.load);
  return false;
}

/** Move a cart or porter one tick along. Returns false when it is done (home, or gone). */
export function moveErrand(s: SimState, map: CoastMap, w: Walker): boolean {
  const size = map.size;
  const origin = findBuilding(s, w.origin);
  if (!origin) return false;
  // Loading or unloading at the granary's gate.
  if (w.wait > 0) {
    const g = findBuilding(s, w.target);
    if (!g || g.kind !== 'granary') return rethink(s, size, w, origin) || lost(w, origin);
    w.wait -= rateOf(g);
    if (w.wait > 0) return true;
    w.wait = 0;
    if (w.kind === 'cart') {
      g.incoming -= w.load;
      g.stock = Math.min(GRANARY_CAP, g.stock + w.load);
      w.load = 0;
    } else {
      const take = Math.min(PORTER_LOAD, g.stock, Math.max(0, STALL_CAP - origin.stock));
      g.stock -= take;
      w.load = take;
      if (take === 0) origin.growth = PORTER_RETRY;
    }
    s.rev++;
    w.back = true;
    w.target = 0;
    if (!goTo(s, size, w, origin, lastRoad(s, w))) return lost(w, origin);
    return true;
  }
  const next = w.tiles[w.seg + 1];
  if (next !== undefined && next >= 0 && s.tiles[next] !== TILE_ROAD) {
    if (!(w.back ? goTo(s, size, w, origin, lastRoad(s, w)) : rethink(s, size, w, origin))) return lost(w, origin);
  }
  if (!w.back && !findBuilding(s, w.target) && !rethink(s, size, w, origin)) return lost(w, origin);
  let move = w.kind === 'cart' ? CART_SPEED : WALK_SPEED;
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
      if (t >= 0 && s.tiles[t] !== TILE_ROAD && !(w.back ? goTo(s, size, w, origin, lastRoad(s, w)) : rethink(s, size, w, origin))) return lost(w, origin);
      continue;
    }
    // The end of the way.
    if (w.back) {
      // Home: the porter fills the stall; a cart that couldn't deliver puts its grain back in the barn.
      if (w.load > 0) {
        origin.stock = Math.min(w.kind === 'porter' ? STALL_CAP : BARN, origin.stock + w.load);
        s.rev++;
      }
      return false;
    }
    const g = findBuilding(s, w.target);
    if (!g || g.kind !== 'granary') return rethink(s, size, w, origin) || lost(w, origin);
    w.wait = HANDLE;
    break;
  }
  return true;
}
