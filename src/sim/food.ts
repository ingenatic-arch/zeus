/**
 * The food chain: wheat farms, hunting lodges and dairies, their ox carts,
 * the granary, the agora's food stall with its porter, and the food vendor.
 * Three foods (wheat, meat and cheese: see foods.ts), counted in measures; a
 * measure feeds one person for a month.
 *
 * A farm's crop grows (faster with more of its workers) and at harvest fills
 * its barn; a lodge's hunters bring meat (hunt.ts); a dairy's goats give
 * cheese as fast as its grass and workers allow. Their carts take each food
 * by the shortest road to a granary with room for it. When any food on the
 * agora's stall runs low its porter fetches from the nearest granary that has
 * some, and while the stall has food its vendor walks her round
 * (src/sim/rounds.ts) like the water carrier, topping up every food she has
 * at every hut or better beside her way.
 */
import { fertilityOf, grassOf } from './build';
import type { CoastMap } from '../map/bake';
import { dhypot } from '../map/dmath';
import { findBuilding, HUT } from './buildings';
import { TICKS_PER_MONTH } from './clock';
import { DECLINE_AFTER, needsOf } from './folk';
import { addComing, CHEESE, FIRST_GOOD, FOODS, foodUntil, held, kindsNeeded, MEAT, nth, setFoodUntil, setHeld, type Food, type Ware } from './foods';
import { ARMOURY_COPPER, BARN, BARRACKS_RACK, DAIRY_STORE, GRANARY_CAP, GRANARY_ROOM, isStore, LODGE_STORE, roomFor, roomOf, storeOf } from './stores';
import { rateOf } from './labour';
import { nearestReached, roadSearch, tracePath } from './roads';
import { door, moveRounds, roadsBeside, sendOut, type ServiceSpec } from './rounds';
import type { NeedDue, NeedScore } from './walk';
import { TILE_ROAD, type Building, type SimState, type Walker } from './state';
import { besideRoad, CARRIER_SPEED, CART_SPEED, centre, newWalker, position, setPath, WALK_SPEED } from './walk';
import { noteHomeUse } from './stockbook';
import { restFor } from './water';

/** Ticks a crop takes to grow at full strength (two months). */
export const GROW = 2 * TICKS_PER_MONTH;
/** Measures a harvest brings on the most fertile ground. */
export const HARVEST = 480;
export { BARN, DAIRY_STORE, GRANARY_CAP, GRANARY_ROOM, LODGE_STORE, roomFor, storeOf };
/** What an ox cart carries of wheat… */
export const CART_LOAD = 160;
/**
 * …and of each ware (meat and cheese pack tighter than sheaves: one lodge's
 * or dairy's carts keep up with what it makes; then olives, oil, fleece,
 * grapes and wine).
 */
export const CART_TAKE = [CART_LOAD, 240, 240, 200, 200, 200, 200, 200, 200, 16];
/** Most carts a farm has on the road at once. */
export const MAX_CARTS = 3;
/** Ticks between carts setting off from the same farm. */
export const CART_GAP = 30;
/**
 * What the porter's handcart carries: enough that one agora's porter, some
 * fifteen road tiles from the granary, brings in well over the 800 measures
 * a month that 38 fine houses eat. (With 800 a load he brought about 650 a
 * month, and a town of fine houses went short with full granaries.)
 */
export const PORTER_LOAD = 1200;
/**
 * What the agora's food stall holds, and how low it gets before the porter
 * goes for more: as soon as there is room for a full handcart, so the stall
 * still has a load's worth while he is on the road. (With a smaller stall he
 * set off only once it was nearly empty, and a town of 40 cottages ate the
 * rest before he was back, so houses went back and forth with a full granary.)
 */
export const STALL_CAP = 2400;
export const STALL_LOW = STALL_CAP - PORTER_LOAD;
/** What the porter brings of each food at most (wheat, meat, cheese), what the stall holds of each, and how low each gets before he goes. */
export const PORTER_TAKE = [PORTER_LOAD, 600, 600];
export const STALL_ROOM = [STALL_CAP, 1200, 1200];
export const STALL_LOW_AT = STALL_ROOM.map((r, f) => r - PORTER_TAKE[f]);
/** A dairy makes CHEESE_BATCH measures every CHEESE_EVERY ticks fully worked on the best grass (500 a month). */
export const CHEESE_EVERY = 30;
export const CHEESE_BATCH = 50;
/** Ticks a fully staffed granary takes to unload a cart or load a porter. */
export const HANDLE = 40;
/** Ticks the porter waits after coming back with nothing before trying again. */
export const PORTER_RETRY = 60;
/**
 * What an agora's oil stall holds, and what its porter brings at most: he
 * goes when it is down to half (GOOD_STALL_ROOM - GOOD_PORTER_TAKE).
 */
export const GOOD_STALL_ROOM = 800;
export const GOOD_PORTER_TAKE = 400;
/**
 * The same for every good's stall, by its place in `goods` (olives, oil,
 * fleece, grapes, wine, copper, armour; only oil, fleece and wine have
 * stalls): the fleece and wine stalls hold less, as homes use less of them.
 * Armour's is the barracks' rack, which its porter fills from the stores,
 * and copper's the armoury's heap, which its porter tops up from the stores
 * when the mines' carts (or Greece's traders) left it there (army.ts).
 */
export const GOOD_STALL_ROOMS: readonly number[] = [0, GOOD_STALL_ROOM, 600, 0, 600, ARMOURY_COPPER, BARRACKS_RACK];
export const GOOD_PORTER_TAKES: readonly number[] = [0, GOOD_PORTER_TAKE, 300, 0, 300, 100, 16];
/** What a stall holds of its good, and what its porter brings at most. */
export const stallRoom = (w: Ware): number => GOOD_STALL_ROOMS[w - FIRST_GOOD] ?? 0;
export const porterTake = (w: Ware): number => GOOD_PORTER_TAKES[w - FIRST_GOOD] ?? 0;
/**
 * How far by road from the agora the food vendor ever goes, and how much
 * fresh road a round is (as for the priestess and the actor: with 48, one
 * vendor left the ends of a town of fine houses short now and then).
 */
export const VENDOR_RANGE = 32;
export const VENDOR_WALK = 64;
/** How long a home's food lasts once the vendor has topped it up (four months). */
export const FOOD_LASTS = 4 * TICKS_PER_MONTH;
/** Ticks the vendor rests between rounds at a fully staffed agora; before the first. */
export const VENDOR_REST = 30;
export const FIRST_VENDOR = 20;

/** The harvest a farm brings in on its ground. */
export function harvestOf(map: CoastMap, f: Building): number {
  return Math.round(HARVEST * fertilityOf(map, f.x, f.z, 3));
}

/** The cheese a dairy makes a month, fully worked, on its grass. */
export function cheeseOf(map: CoastMap, d: Building): number {
  return Math.round(((CHEESE_BATCH * TICKS_PER_MONTH) / CHEESE_EVERY) * grassOf(map, d.x, d.z, 3));
}

/** Does this home buy food from the vendor? Huts and better with people in them (tents live off the land). */
export const eatsBread = (b: Building): boolean => b.kind === 'home' && b.level >= HUT && b.people > 0;

const near: Building[] = [];

/** Which foods a building has, a bit each (1 wheat, 2 meat, 4 cheese). */
export const foodsIn = (b: Building): number => (b.stock > 0 ? 1 : 0) | (b.meat > 0 ? 2 : 0) | (b.cheese > 0 ? 4 : 0);

/**
 * The tick a home's food lasts until as the vendor reckons it, carrying the
 * foods in `mask`: by the kinds its level needs, but never more kinds than
 * she has or it has on its table, so a townhouse short of meat when the
 * stall has none doesn't call her on its account. With only wheat about this
 * is just its bread.
 */
export function vendorUntil(b: Building, mask: number, tick: number): number {
  let can = 0;
  for (const f of FOODS) if (mask & (1 << f) || foodUntil(b, f) > tick) can++;
  const k = Math.min(Math.max(1, kindsNeeded(b.level)), Math.max(1, can));
  return nth(b.foodUntil, b.meatUntil, b.cheeseUntil, k);
}

/** The vendor's scores and dues for each mix of foods her stall can have (see vendorUntil and serviceScore). */
const VENDOR: Array<{ score: NeedScore; due: NeedDue }> = Array.from({ length: 8 }, (_, mask) => ({
  score: (b: Building, s: SimState) => {
    if (!eatsBread(b)) return Infinity;
    const u = vendorUntil(b, mask, s.tick);
    return (needsOf(b).includes('food') ? Math.max(u, b.since, b.grace) : u) + DECLINE_AFTER;
  },
  due: (b: Building, s: SimState) => (needsOf(b).includes('food') ? Math.max(vendorUntil(b, mask, s.tick), b.since, b.grace) + DECLINE_AFTER : Infinity),
}));

/** The food vendor's round. */
export const FOOD: ServiceSpec = {
  record: (s) => s.rounds.food,
  range: VENDOR_RANGE,
  walk: VENDOR_WALK,
  speed: CARRIER_SPEED,
  score: VENDOR[1].score,
  due: VENDOR[1].due,
  scoreFor: (a) => VENDOR[foodsIn(a)],
  serve(s: SimState, size: number, t: number, w: Walker) {
    const stall = findBuilding(s, w.origin);
    if (!stall) return;
    const mask = foodsIn(stall);
    if (mask === 0) return;
    const full = s.tick + FOOD_LASTS;
    let changed = false;
    for (const b of besideRoad(s, size, t, near)) {
      if (!eatsBread(b)) continue;
      // A measure a person a month in all, shared across the kinds on the table after her visit.
      let kinds = 0;
      for (const f of FOODS) if (held(stall, f) > 0 || foodUntil(b, f) > s.tick) kinds++;
      for (const f of FOODS) {
        const have = held(stall, f);
        const until = foodUntil(b, f);
        if (have <= 0 || until >= full) continue;
        const from = Math.max(until, s.tick);
        const cost = Math.ceil((b.people * (full - from)) / (TICKS_PER_MONTH * kinds));
        if (cost <= have) {
          setFoodUntil(b, f, full);
          setHeld(stall, f, have - cost);
          noteHomeUse(s, f, b, cost);
        } else {
          setFoodUntil(b, f, from + Math.floor((have * TICKS_PER_MONTH * kinds) / b.people));
          setHeld(stall, f, 0);
          noteHomeUse(s, f, b, have);
        }
        changed = true;
      }
      if (foodsIn(stall) === 0) break;
    }
    if (changed) s.looks++;
  },
  rest: (b) => restFor(b, VENDOR_REST),
};

/** Carts out from a farm (or any maker), or porters from the agora. */
export function errandsOut(s: SimState, b: Building): number {
  let n = 0;
  for (const w of s.walkers) if (w.origin === b.id && (w.kind === 'cart' || w.kind === 'porter')) n++;
  return n;
}

/** The agora's food porter (who carries foods) or a stall's porter (who carries its good, `w.food`) is out. */
export const isGoodsPorter = (w: Walker): boolean => w.kind === 'porter' && w.food >= FIRST_GOOD;
export function portersOut(s: SimState, a: Building, goods: boolean): number {
  let n = 0;
  for (const w of s.walkers) if (w.origin === a.id && w.kind === 'porter' && (w.food >= FIRST_GOOD) === goods) n++;
  return n;
}
/** Is the porter of an agora's stall for this good out? */
export const stallPorterOut = (s: SimState, a: Building, good: Ware): boolean => s.walkers.some((w) => w.origin === a.id && w.kind === 'porter' && w.food === good);

/** Room left in a granary for wheat (its stock and what carts are bringing). */
export const roomIn = (g: Building): number => GRANARY_CAP - g.stock - g.incoming;
/** Does any granary in the city hold some of this food? */
const anyGranaryHas = (s: SimState, f: Food): boolean => s.buildings.some((g) => g.kind === 'granary' && held(g, f) > 0);
/** Does a granary hold any food at all? */
const hasFood = (g: Building): boolean => g.stock > 0 || g.meat > 0 || g.cheese > 0;

/**
 * The nearest building (by road from road tile `from`, or from building `b`'s
 * roadside) that passes `ok`: the building and the shortest way there, from
 * `from`'s side to the building's.
 */
export function nearestBy(s: SimState, size: number, fromTiles: number[], ok: (g: Building) => boolean): { g: Building; way: number[] } | null {
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
export function wayPoints(size: number, here: [number, number], way: number[], to: Building): Array<[number, number, number]> {
  const pts: Array<[number, number, number]> = [[here[0], here[1], -1]];
  for (const t of way) {
    const [x, z] = centre(size, t);
    pts.push([x, z, t]);
  }
  const [dx, dz] = door(size, to, way[way.length - 1]);
  pts.push([dx, dz, -1]);
  return pts;
}

/**
 * Send an ox cart with a load of a ware from a maker (a farm, lodge, dairy,
 * grove or press) to the nearest building with room for it (foods to a
 * granary, olives to a press, oil to a storehouse), if it is time.
 */
export function sendCart(s: SimState, size: number, f: Building, food: Ware, most = Infinity): void {
  const stock = Math.min(held(f, food), most);
  if (stock <= 0 || f.clock > 0 || errandsOut(s, f) >= MAX_CARTS) return;
  const roads = roadsBeside(s, size, f);
  const found = nearestBy(s, size, roads, (g) => roomFor(g, food) > 0);
  if (!found) {
    f.clock = CART_GAP;
    return;
  }
  const { g, way } = found;
  const load = Math.min(CART_TAKE[food], stock, roomFor(g, food));
  const w = newWalker(s, 'cart', 1);
  w.origin = f.id;
  w.target = g.id;
  w.load = load;
  w.food = food;
  w.since = s.tick;
  setHeld(f, food, held(f, food) - load);
  s.looks++;
  addComing(g, food, load);
  setPath(w, wayPoints(size, door(size, f, way[0]), way, g));
  s.walkers.push(w);
  f.clock = CART_GAP;
}

/**
 * The agora: its porter fetches food when the stall runs low, and its vendor
 * walks while there is food; then its stalls for goods (goods.ts), each with
 * its vendor, and their porter.
 */
export function stepAgoras(s: SimState, map: CoastMap, stalls: (s: SimState, size: number, a: Building, rate: number) => void): void {
  const size = map.size;
  for (const a of s.buildings) {
    if (a.kind !== 'agora') continue;
    const rate = rateOf(a);
    // The food vendor.
    if (a.walker === 0 && --a.clock <= 0) {
      if (rate === 0 || foodsIn(a) === 0 || !sendOut(s, size, a, 'food')) a.clock = VENDOR_REST;
    }
    foodPorter(s, size, a, rate);
    if (a.stalls) stalls(s, size, a, rate);
  }
}

/** The food porter (a.growth counts down to his next try) goes when wheat runs low, or meat or cheese that some granary has. */
function foodPorter(s: SimState, size: number, a: Building, rate: number): void {
  if (a.growth > 0) a.growth--;
  if (rate === 0 || a.growth > 0 || portersOut(s, a, false) > 0) return;
  let low = a.stock <= STALL_LOW ? 1 : 0;
  if (a.meat <= STALL_LOW_AT[MEAT] && anyGranaryHas(s, MEAT)) low |= 2;
  if (a.cheese <= STALL_LOW_AT[CHEESE] && anyGranaryHas(s, CHEESE)) low |= 4;
  if (low === 0) return;
  const found = nearestBy(s, size, roadsBeside(s, size, a), (g) => g.kind === 'granary' && (foodsIn(g) & low) !== 0);
  if (!found) {
    a.growth = PORTER_RETRY;
    return;
  }
  const w = newWalker(s, 'porter', 1);
  w.origin = a.id;
  w.target = found.g.id;
  w.since = s.tick;
  setPath(w, wayPoints(size, door(size, a, found.way[0]), found.way, found.g));
  s.walkers.push(w);
  a.growth = restFor(a, VENDOR_REST);
}

/** Move the food vendor one tick along. */
export function moveVendor(s: SimState, map: CoastMap, w: Walker): boolean {
  return moveRounds(s, map, w, FOOD, 'agora');
}

/** The last road tile a walker stood on (or -1). */
export function lastRoad(s: SimState, w: Walker): number {
  for (let k = Math.min(w.seg, w.tiles.length - 1); k >= 0; k--) {
    const t = w.tiles[k];
    if (t >= 0) return s.tiles[t] === TILE_ROAD ? t : -1;
  }
  return -1;
}

/** Send an errand walker along the road from where it stands to a building. False if no road joins them. */
export function goTo(s: SimState, size: number, w: Walker, to: Building, from: number): boolean {
  if (from < 0) return false;
  const search = roadSearch(s, size, roadsBeside(s, size, to));
  if (search.dist[from] < 0) return false;
  setPath(w, wayPoints(size, position(w), tracePath(search, from).reverse(), to));
  return true;
}

/** Is this where a cart or porter is going: a building with room for the cart's ware, the granary for the food porter, a store of his good for a goods porter? */
export function fits(g: Building, w: Walker): boolean {
  if (w.kind === 'cart') return roomOf(g.kind, w.food) > 0;
  return w.food >= FIRST_GOOD ? isStore(g.kind) && roomOf(g.kind, w.food) > 0 : g.kind === 'granary';
}

/**
 * A cart or porter whose store has gone (or whose way there was cut) looks
 * for another from where it stands; failing that, it turns for home. False if
 * it can get nowhere at all.
 */
function rethink(s: SimState, size: number, w: Walker, origin: Building): boolean {
  const old = findBuilding(s, w.target);
  if (old && w.kind === 'cart' && !w.back) addComing(old, w.food, -w.load);
  w.wait = 0;
  const from = lastRoad(s, w);
  if (!w.back && from >= 0) {
    const ok =
      w.kind === 'cart'
        ? (g: Building) => roomFor(g, w.food) >= w.load
        : w.food >= FIRST_GOOD
          ? (g: Building) => fits(g, w) && held(g, w.food) > 0
          : (g: Building) => g.kind === 'granary' && hasFood(g);
    const found = nearestBy(s, size, [from], ok);
    if (found) {
      w.target = found.g.id;
      if (w.kind === 'cart') addComing(found.g, w.food, w.load);
      setPath(w, wayPoints(size, position(w), found.way, found.g));
      return true;
    }
  }
  w.back = true;
  w.target = 0;
  return goTo(s, size, w, origin, from);
}

/** A cart or porter is gone for good: its load goes back where it came from. */
function lost(s: SimState, w: Walker, origin: Building): false {
  s.looks++;
  bringBack(w, origin);
  return false;
}

/** What a cart or porter carries goes into its own building (the barn, store or stall), as much as there is room for. */
function bringBack(w: Walker, origin: Building): void {
  if (w.kind === 'cart') {
    const f = w.food;
    setHeld(origin, f, Math.min(storeOf(origin.kind), held(origin, f) + w.load));
    return;
  }
  if (w.food >= FIRST_GOOD) {
    setHeld(origin, w.food, Math.min(stallRoom(w.food), held(origin, w.food) + w.load));
    return;
  }
  origin.stock = Math.min(STALL_CAP, origin.stock + w.load);
  origin.meat = Math.min(STALL_ROOM[MEAT], origin.meat + w.meat);
  origin.cheese = Math.min(STALL_ROOM[CHEESE], origin.cheese + w.cheese);
}

/** Move a cart or porter one tick along. Returns false when it is done (home, or gone). */
export function moveErrand(s: SimState, map: CoastMap, w: Walker): boolean {
  const size = map.size;
  const origin = findBuilding(s, w.origin);
  if (!origin) return false;
  // Loading or unloading at the granary's gate.
  if (w.wait > 0) {
    const g = findBuilding(s, w.target);
    if (!g || !fits(g, w)) return rethink(s, size, w, origin) || lost(s, w, origin);
    w.wait -= rateOf(g);
    if (w.wait > 0) return true;
    w.wait = 0;
    if (w.kind === 'cart') {
      const f = w.food;
      addComing(g, f, -w.load);
      setHeld(g, f, Math.min(roomOf(g.kind, f), held(g, f) + w.load));
      w.load = 0;
    } else if (w.food >= FIRST_GOOD) {
      // A goods porter: up to a handcart of his good, as much as the stall has room for.
      const f = w.food;
      const take = Math.min(porterTake(f), held(g, f), Math.max(0, stallRoom(f) - held(origin, f)));
      setHeld(g, f, held(g, f) - take);
      w.load = take;
      if (take === 0) origin.fetch[f - FIRST_GOOD] = PORTER_RETRY;
    } else {
      const take = Math.min(PORTER_LOAD, g.stock, Math.max(0, STALL_CAP - origin.stock));
      g.stock -= take;
      w.load = take;
      const meat = Math.min(PORTER_TAKE[MEAT], g.meat, Math.max(0, STALL_ROOM[MEAT] - origin.meat));
      const cheese = Math.min(PORTER_TAKE[CHEESE], g.cheese, Math.max(0, STALL_ROOM[CHEESE] - origin.cheese));
      g.meat -= meat;
      g.cheese -= cheese;
      w.meat = meat;
      w.cheese = cheese;
      if (take + meat + cheese === 0) origin.growth = PORTER_RETRY;
    }
    s.looks++;
    w.back = true;
    w.target = 0;
    if (!goTo(s, size, w, origin, lastRoad(s, w))) return lost(s, w, origin);
    return true;
  }
  const next = w.tiles[w.seg + 1];
  if (next !== undefined && next >= 0 && s.tiles[next] !== TILE_ROAD) {
    if (!(w.back ? goTo(s, size, w, origin, lastRoad(s, w)) : rethink(s, size, w, origin))) return lost(s, w, origin);
  }
  if (!w.back && !findBuilding(s, w.target) && !rethink(s, size, w, origin)) return lost(s, w, origin);
  let move = w.kind === 'cart' ? CART_SPEED : WALK_SPEED;
  for (let guard = 0; guard < 8 && move > 0; guard++) {
    const last = w.path.length / 2 - 1;
    if (w.seg >= last) break;
    const i = w.seg * 2;
    const len = dhypot(w.path[i + 2] - w.path[i], w.path[i + 3] - w.path[i + 1]);
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
      if (t >= 0 && s.tiles[t] !== TILE_ROAD && !(w.back ? goTo(s, size, w, origin, lastRoad(s, w)) : rethink(s, size, w, origin))) return lost(s, w, origin);
      continue;
    }
    // The end of the way.
    if (w.back) {
      // Home: the porter fills the stall; a cart that couldn't deliver puts its load back in the barn (or store).
      if (w.load + w.meat + w.cheese > 0) {
        bringBack(w, origin);
        s.looks++;
      }
      return false;
    }
    const g = findBuilding(s, w.target);
    if (!g || !fits(g, w)) return rethink(s, size, w, origin) || lost(s, w, origin);
    w.wait = HANDLE;
    break;
  }
  return true;
}
