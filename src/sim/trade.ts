/**
 * The trading post and the merchant ship.
 *
 * The post (3 x 3) stands on the bay shore, on land touching deep water: a
 * straight jetty runs from the middle of one of its sides out to a *berth*,
 * deep water the ship can come alongside. Only one is allowed. Deep water is
 * sea at least DEEP deep joined to the open sea at the map's edge through
 * deep water; the ship sails only on it (and beyond the edge, out to the
 * horizon).
 *
 * The ship buys eight goods (TRADE_GOODS) at steady prices. For each the
 * player chooses whether to sell it and how much the city keeps in its
 * stores (`s.trade`). The post's dockers carry the surplus (what the city's
 * granaries or storehouses hold beyond what is kept) from the nearest store
 * to the quay, where it stacks up, and carry back what is no longer for sale.
 *
 * The first ship is due FIRST_SHIP after the post is built, then one every
 * SHIP_EVERY. SAIL_IN before she is due she shows on the horizon and sails in;
 * tied up, she loads what is on the quay of the goods for sale over LOADING
 * ticks, pays (on the ledger as sales, by good) and sails off the way she
 * came. Where she is is a pure function of her route, her phase, when it
 * began and the tick (shipAt), so she is drawn smoothly and saves carry her.
 *
 * Pure: the map facts are worked out once per baked map and cached; nothing
 * here draws a random number, so a town without a post runs exactly as before.
 */
import { WATER_SEA, type CoastMap } from '../map/bake';
import { MAP_SIZE } from '../map/coast';
import { dcos, dhypot, dsin } from '../map/dmath';
import { Ground, mapIndex } from './build';
import { findBuilding } from './buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from './clock';
import { goTo, HANDLE, lastRoad, nearestBy, wayPoints } from './food';
import { addComing, ARMOUR, CHEESE, coming, COPPER, FLEECE, held, MEAT, OIL, setHeld, WARE_NAMES, WHEAT, WINE, type Ware } from './foods';
import { rateOf } from './labour';
import { door, roadsBeside } from './rounds';
import { roomFor, roomOf } from './stores';
import { TILE_ROAD, type Building, type BuildingKind, type Ship, type SimState, type Trade, type Walker } from './state';

/** What placing a ship needs of her record: the Tyre ship's, or a foreign ship's (a Visitor, see routes.ts). */
export type Sailing = Pick<Ship, 'phase' | 'path' | 'since' | 'turned'>;
import { note } from './stockbook';
import { income } from './treasury';
import { giftOf, newWalker, position, setGiftOf, setPath, speedOf } from './walk';
// Slice 33: winter storms hold the ship back.
import { lateWords, stormDelay } from './seasons';

/** The goods traded, in the order the trade record keeps them: the six of phase 3, then copper and armour (slice 23). */
export const TRADE_GOODS: readonly Ware[] = [WHEAT, MEAT, CHEESE, OIL, FLEECE, WINE, COPPER, ARMOUR];
/** How many trade goods there were before copper and armour (the requests, offers and rulers' gifts keep to these). */
export const OLD_GOODS = 6;
/** A good's place in the trade record (-1: the ship doesn't buy it). */
export const tradeIndex = (w: Ware): number => TRADE_GOODS.indexOf(w);
/** What the ship pays for a hundred measures of each (by trade good): fine goods most, wheat least; armour by the hundred sets. Steady. */
export const PRICES: readonly number[] = [20, 35, 35, 70, 55, 100, 40, 1200];
/** What she pays for so many measures of a trade good. */
export const priceFor = (k: number, n: number): number => Math.round((n * PRICES[k]) / 100);
/** What the city keeps of each to begin with: half a granary's or storehouse's room. */
export const DEFAULT_KEEP: readonly number[] = [1600, 600, 600, 800, 600, 600, 400, 100];
/** The panel's step for what is kept, and the most that can be kept. */
export const KEEP_STEP = 200;
export const KEEP_MAX = 20000;
/** Where each good is kept: foods in the granaries, goods in the storehouses. */
export const storeKind = (w: Ware): BuildingKind => (w === WHEAT || w === MEAT || w === CHEESE ? 'granary' : 'storehouse');

/** What the quay holds of each good. */
export const QUAY_ROOM = 2400;
/** What a docker's handcart takes of each trade good. */
export const DOCKER_TAKE: readonly number[] = [1200, 800, 800, 800, 600, 600, 600, 60];
/** Most dockers out at once; ticks between one setting off and the next; the smallest load worth a trip. */
export const MAX_DOCKERS = 4;
/** Two more hands, only for fetching gifts and sendings when the others are all out. */
export const GIFT_HANDS = 2;
export const DOCKER_GAP = 2 * TICKS_PER_DAY;
export const MIN_LOT = 100;
/** Ticks before the post's first docker can go (once it has workers). */
export const FIRST_DOCKER = 20;

/** The ship's phases. */
export const SHIP_AWAY = 0;
export const SHIP_COMING = 1;
export const SHIP_MOORED = 2;
export const SHIP_LEAVING = 3;
/** A foreign ship's two more (routes.ts): anchored in the bay, waiting for the jetty; and coming alongside from her anchorage. */
export const SHIP_ANCHORED = 4;
export const SHIP_BERTHING = 5;
/** The first ship is due three months after the post is built (time for the dockers' first loads), then one every three months. */
export const FIRST_SHIP = 3 * TICKS_PER_MONTH;
export const SHIP_EVERY = 3 * TICKS_PER_MONTH;
/**
 * She shows on the horizon this long before she ties up (time enough to see
 * her coming and get the last goods on the quay); loads this long; takes this
 * long to sail off from the quay.
 */
export const SAIL_IN = 20 * TICKS_PER_DAY;
export const LOADING = 4 * TICKS_PER_DAY;
export const SAIL_OUT = 16 * TICKS_PER_DAY;
/**
 * Her pace sailing in, in tiles a tick before her way is fitted to SAIL_IN:
 * beyond the map's edge (far out, where she is a sail on the horizon), across
 * the bay, and slowing to a stop over the last stretch to the jetty.
 */
const FAR_PACE = 1.0;
const BAY_PACE = 0.5;
const SLOW_LAST = 12;
/** Sea at least this deep is deep water. */
export const DEEP = 0.5;
/** The longest jetty: the berth is at most this far from the post's footprint. */
export const JETTY_MAX = 7;
/** How far she sits off the jetty's end (half her beam and a fender). */
export const BERTH_OFF = 0.85;
/** How far she comes in alongside: the last stretch of her way in runs this long, square to the jetty. */
export const APPROACH = 6;
/** How far beyond the map's edge the horizon is, where she first shows. */
export const HORIZON = 60;

export function freshShip(): Ship {
  return { phase: SHIP_AWAY, due: 0, since: 0, turned: 1, path: [], post: 0, hold: TRADE_GOODS.map(() => 0), visits: 0, lastAt: 0, lastBought: TRADE_GOODS.map(() => 0), lastPaid: 0 };
}

export function freshTrade(): Trade {
  return { sell: TRADE_GOODS.map(() => false), keep: DEFAULT_KEEP.slice(), ship: freshShip(), lost: TRADE_GOODS.map(() => 0), lostAt: 0 };
}

// ---------------------------------------------------------------------------
// The map: deep water, berths, where a post can go.

interface SeaFacts {
  /** Depth of each sea tile (0 for land). */
  depth: Float32Array;
  /** Steps over deep water to the map's edge (-1: not deep, or cut off from the open sea). */
  toEdge: Int32Array;
}
const seas = new WeakMap<CoastMap, SeaFacts>();

/** Deep water and how far each deep tile is from the open sea (worked out once per map). */
export function seaFacts(map: CoastMap): SeaFacts {
  let f = seas.get(map);
  if (f) return f;
  const n = map.size;
  const depth = new Float32Array(n * n);
  for (let z = 0; z < n; z++) {
    for (let x = 0; x < n; x++) {
      const t = z * n + x;
      if (map.tileWater[t] !== WATER_SEA) continue;
      depth[t] = -Math.max(map.corner(x, z), map.corner(x + 1, z), map.corner(x, z + 1), map.corner(x + 1, z + 1));
    }
  }
  const toEdge = new Int32Array(n * n).fill(-1);
  const queue: number[] = [];
  for (let t = 0; t < n * n; t++) {
    const x = t % n;
    const z = (t - x) / n;
    if ((x === 0 || z === 0 || x === n - 1 || z === n - 1) && depth[t] >= DEEP) {
      toEdge[t] = 0;
      queue.push(t);
    }
  }
  for (let i = 0; i < queue.length; i++) {
    const t = queue[i];
    for (const u of steps(n, depth, t)) {
      if (toEdge[u] >= 0 || depth[u] < DEEP) continue;
      toEdge[u] = toEdge[t] + 1;
      queue.push(u);
    }
  }
  f = { depth, toEdge };
  seas.set(map, f);
  return f;
}

/** The tiles a ship can move to from t: the four sides, and the corners when both tiles beside the corner are deep too. */
function steps(n: number, depth: Float32Array, t: number): number[] {
  const x = t % n;
  const z = (t - x) / n;
  const out: number[] = [];
  const on = (a: number, b: number): boolean => a >= 0 && b >= 0 && a < n && b < n;
  for (const [dx, dz] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) if (on(x + dx, z + dz)) out.push((z + dz) * n + x + dx);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    if (on(x + dx, z + dz) && depth[z * n + x + dx] >= DEEP && depth[(z + dz) * n + x] >= DEEP) out.push((z + dz) * n + x + dx);
  }
  return out;
}

/** Is a point (world units) on deep water joined to the open sea, or beyond the map's edge? */
export function sailable(map: CoastMap, x: number, z: number): boolean {
  const n = map.size;
  if (x < 0 || z < 0 || x >= n || z >= n) return true;
  return seaFacts(map).toEdge[Math.floor(z) * n + Math.floor(x)] >= 0;
}

/** Where the ship ties up at a post with its footprint's top-left tile at (x, z). */
export interface Berth {
  /** Where she lies (world units), and which way she lies (a unit vector along her keel, bow first as she comes in). */
  x: number;
  z: number;
  hx: number;
  hz: number;
  /** The jetty: from (jx, jz) on the footprint's side, out (ox, oz: a unit vector along it; one of the four sides) for `len` to its end. */
  jx: number;
  jz: number;
  ox: number;
  oz: number;
  len: number;
  /** The deep tile she lies on. */
  tile: number;
}

const berths = new WeakMap<CoastMap, Map<number, Berth | null>>();

/** Is a tile water a jetty can stand over (sea, or the wet margin of the beach)? */
const wet = (map: CoastMap, t: number): boolean => mapIndex(map).ground[t] === Ground.Water;

/**
 * The berth for a 3 x 3 trading post with its top-left tile at (x, z), or
 * null if the ship can't come alongside one there: no sea beside it, or no
 * deep water within JETTY_MAX reached by a straight jetty over water. Only
 * the ground is looked at (not what is built), so it is worked out once.
 */
export function berthAt(map: CoastMap, x: number, z: number): Berth | null {
  const n = map.size;
  // (Off the map there is no berth; checked before the cache, whose key is only good for tiles on it.)
  if (x < 0 || z < 0 || x + 3 > n || z + 3 > n) return null;
  let cache = berths.get(map);
  if (!cache) berths.set(map, (cache = new Map()));
  const key = z * n + x;
  const got = cache.get(key);
  if (got !== undefined) return got;
  const b = findBerth(map, x, z);
  cache.set(key, b);
  return b;
}

/** Why a trading post can't go on the shore here ('' if the ship could come alongside it). */
export function shoreRefusal(map: CoastMap, x: number, z: number): string {
  if (!nearSea(map, x, z)) return 'A trading post goes on the bay shore: no sea beside it here';
  if (!berthAt(map, x, z)) return 'The water off this shore is too shallow for the ship: try where the deep water comes closer (the tint shows where)';
  return '';
}

/** Is there sea within two tiles of a 3 x 3 footprint? */
function nearSea(map: CoastMap, x: number, z: number): boolean {
  const n = map.size;
  for (let dz = -2; dz <= 4; dz++) {
    for (let dx = -2; dx <= 4; dx++) {
      const tx = x + dx;
      const tz = z + dz;
      if (tx < 0 || tz < 0 || tx >= n || tz >= n) continue;
      if (map.tileWater[tz * n + tx] === WATER_SEA) return true;
    }
  }
  return false;
}

function findBerth(map: CoastMap, x: number, z: number): Berth | null {
  const n = map.size;
  if (x < 0 || z < 0 || x + 3 > n || z + 3 > n || !nearSea(map, x, z)) return null;
  const sea = seaFacts(map);
  const cx = x + 1.5;
  const cz = z + 1.5;
  // Deep tiles near enough, nearest the footprint first.
  const reach = JETTY_MAX + 2;
  const near: Array<{ t: number; d: number }> = [];
  for (let tz = Math.max(0, z - reach); tz < Math.min(n, z + 3 + reach); tz++) {
    for (let tx = Math.max(0, x - reach); tx < Math.min(n, x + 3 + reach); tx++) {
      const t = tz * n + tx;
      if (sea.toEdge[t] < 0) continue;
      const px = tx + 0.5;
      const pz = tz + 0.5;
      const ex = Math.max(x - px, 0, px - (x + 3));
      const ez = Math.max(z - pz, 0, pz - (z + 3));
      const d = dhypot(ex, ez);
      if (d <= JETTY_MAX) near.push({ t, d });
    }
  }
  near.sort((a, b) => a.d - b.d || a.t - b.t);
  for (const { t } of near.slice(0, 40)) {
    const px = (t % n) + 0.5;
    const pz = Math.floor(t / n) + 0.5;
    // The jetty leaves from the middle of the side facing the berth.
    const vx = px - cx;
    const vz = pz - cz;
    const [ox, oz] = Math.abs(vx) >= Math.abs(vz) ? [Math.sign(vx), 0] : [0, Math.sign(vz)];
    const jx = cx + ox * 1.5;
    const jz = cz + oz * 1.5;
    // She lies square to the jetty, her side against its end.
    const along = (px - jx) * ox + (pz - jz) * oz;
    const len = along - BERTH_OFF;
    if (len < 1 || len > JETTY_MAX) continue;
    const ex = jx + ox * len;
    const ez = jz + oz * len;
    // The jetty runs over water only (past the first half tile, where it leaves the quay).
    let ok = true;
    for (let d = 0.5; d <= len + 0.01 && ok; d += 0.25) {
      const sx = jx + ox * d;
      const sz = jz + oz * d;
      ok = wet(map, Math.floor(sz) * n + Math.floor(sx));
    }
    if (!ok) continue;
    // Where she lies: off the jetty's end, along it. Her keel runs square to it, one way or the other, with room to come in.
    const bx = ex + ox * BERTH_OFF;
    const bz = ez + oz * BERTH_OFF;
    for (const s of [1, -1]) {
      const hx = -oz * s;
      const hz = ox * s;
      let room = true;
      for (let d = -1.5; d <= APPROACH && room; d += 0.5) room = sailable(map, bx - hx * d, bz - hz * d);
      if (!room) continue;
      return { x: bx, z: bz, hx, hz, jx, jz, ox, oz, len, tile: Math.floor(bz) * n + Math.floor(bx) };
    }
  }
  return null;
}

const quays = new WeakMap<CoastMap, Uint8Array>();

/** Every tile that is part of some footprint where a trading post could go, the ground and the berth allowing (for the placing tool's tint). */
export function quayTiles(map: CoastMap): Uint8Array {
  let q = quays.get(map);
  if (q) return q;
  const n = map.size;
  const ground = mapIndex(map).ground;
  q = new Uint8Array(n * n);
  for (let z = 0; z + 3 <= n; z++) {
    for (let x = 0; x + 3 <= n; x++) {
      let dry = true;
      for (let dz = 0; dz < 3 && dry; dz++) for (let dx = 0; dx < 3 && dry; dx++) dry = ground[(z + dz) * n + x + dx] === Ground.Ok;
      if (!dry || !berthAt(map, x, z)) continue;
      for (let dz = 0; dz < 3; dz++) for (let dx = 0; dx < 3; dx++) q[(z + dz) * n + x + dx] = 1;
    }
  }
  quays.set(map, q);
  return q;
}

/** The trading post's berth (null if it has none, as can't happen for one that was allowed). */
export const berthOf = (map: CoastMap, b: Building): Berth | null => berthAt(map, b.x, b.z);

/** The city's trading post (there is only ever one), or undefined. */
export const tradingPost = (s: SimState): Building | undefined => s.buildings.find((b) => b.kind === 'trading');

// ---------------------------------------------------------------------------
// The ship's way in.

/**
 * Her way in to a berth, as x, z pairs: from the horizon beyond the nearest
 * edge of the map, over deep water by the fewest steps (pulled straight
 * where she can sail straight), the last stretch square to the jetty.
 */
export function shipRoute(map: CoastMap, berth: Berth): number[] {
  const n = map.size;
  const sea = seaFacts(map);
  const ax = berth.x - berth.hx * APPROACH;
  const az = berth.z - berth.hz * APPROACH;
  // From the approach, down the steps to the edge.
  const pts: Array<[number, number]> = [
    [berth.x, berth.z],
    [ax, az],
  ];
  let t = Math.floor(az) * n + Math.floor(ax);
  if (sea.toEdge[t] < 0) t = berth.tile;
  for (let guard = 0; guard < n * 4 && sea.toEdge[t] > 0; guard++) {
    let best = -1;
    for (const u of steps(n, sea.depth, t)) if (sea.toEdge[u] >= 0 && sea.toEdge[u] < sea.toEdge[t] && (best < 0 || sea.toEdge[u] < sea.toEdge[best])) best = u;
    if (best < 0) break;
    t = best;
    pts.push([(t % n) + 0.5, Math.floor(t / n) + 0.5]);
  }
  // Out over the edge, straight on to the horizon.
  const ex = t % n;
  const ez = Math.floor(t / n);
  const [nx, nz] = ex === 0 ? [-1, 0] : ex === n - 1 ? [1, 0] : ez === 0 ? [0, -1] : [0, 1];
  const [lx, lz] = pts[pts.length - 1];
  pts.push([lx + nx * 12, lz + nz * 12]);
  // A little to one side, so she doesn't come in along a ruled line.
  pts.push([lx + nx * HORIZON - nz * HORIZON * 0.25, lz + nz * HORIZON + nx * HORIZON * 0.25]);
  // Pulled straight: from the approach outwards, on to the farthest point she can see over deep water.
  const out: Array<[number, number]> = [pts[0], pts[1]];
  let i = 1;
  while (i < pts.length - 1) {
    let j = pts.length - 1;
    while (j > i + 1 && !clearWay(map, pts[i], pts[j])) j--;
    out.push(pts[j]);
    i = j;
  }
  out.reverse();
  return out.flat();
}

/** Can she sail straight from a to b (over deep water or beyond the edge all the way)? */
function clearWay(map: CoastMap, a: [number, number], b: [number, number]): boolean {
  const d = dhypot(b[0] - a[0], b[1] - a[1]);
  const k = Math.max(1, Math.ceil(d / 0.4));
  for (let i = 1; i < k; i++) {
    const f = i / k;
    if (!sailable(map, a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f)) return false;
  }
  return true;
}

/** A path's length, and the point and heading a distance along it. */
export function pathLength(p: readonly number[]): number {
  let l = 0;
  for (let i = 0; i + 3 < p.length; i += 2) l += dhypot(p[i + 2] - p[i], p[i + 3] - p[i + 1]);
  return l;
}
export function pointAlong(p: readonly number[], d: number): { x: number; z: number; dx: number; dz: number } {
  let left = Math.max(0, d);
  for (let i = 0; i + 3 < p.length; i += 2) {
    const sx = p[i + 2] - p[i];
    const sz = p[i + 3] - p[i + 1];
    const l = dhypot(sx, sz);
    if (left <= l || i + 4 >= p.length - 1) {
      const f = l > 0 ? Math.min(1, left / l) : 0;
      return { x: p[i] + sx * f, z: p[i + 1] + sz * f, dx: l > 0 ? sx / l : 1, dz: l > 0 ? sz / l : 0 };
    }
    left -= l;
  }
  return { x: p[0] ?? 0, z: p[1] ?? 0, dx: 1, dz: 0 };
}

/** Over how many tiles before the map's edge she eases from FAR_PACE to BAY_PACE. */
const EASE_EDGE = 12;

/**
 * How far in she has come (0 at the horizon, 1 at the quay) a share u of the
 * way through sailing in: far out at FAR_PACE, easing down to BAY_PACE over
 * the last EASE_EDGE tiles before she crosses the map's edge, across the bay
 * at BAY_PACE, slowing evenly to the jetty over the last
 * SLOW_LAST tiles, the whole fitted to SAIL_IN. A pure function of her route.
 */
export function inwardAt(path: readonly number[], u: number): number {
  const L = pathLength(path);
  if (L <= 0) return 1;
  const outer = Math.min(L, outerLength(path));
  const slow = Math.max(0, Math.min(SLOW_LAST, L - outer));
  // Easing from her pace at sea to her pace in the bay over the last EASE_EDGE tiles before the edge.
  const ease = Math.min(EASE_EDGE, outer);
  const t0 = (outer - ease) / FAR_PACE;
  const te = (2 * ease) / (FAR_PACE + BAY_PACE);
  const t1 = t0 + te;
  const t2 = t1 + (L - slow - outer) / BAY_PACE;
  const td = (2 * slow) / BAY_PACE;
  const tau = Math.max(0, Math.min(1, u)) * (t2 + td);
  let d: number;
  if (tau < t0) d = FAR_PACE * tau;
  else if (tau < t1) {
    const e = tau - t0;
    d = outer - ease + FAR_PACE * e - (te > 0 ? (0.5 * (FAR_PACE - BAY_PACE) * e * e) / te : 0);
  } else if (tau < t2) d = outer + BAY_PACE * (tau - t1);
  else {
    const e = Math.min(td, tau - t2);
    d = L - slow + BAY_PACE * e - (td > 0 ? (0.5 * BAY_PACE * e * e) / td : 0);
  }
  return Math.max(0, Math.min(1, d / L));
}

/** How far along her way in she is still beyond the map's edge (cached per route). */
const outers = new WeakMap<readonly number[], number>();
function outerLength(p: readonly number[]): number {
  const hit = outers.get(p);
  if (hit !== undefined) return hit;
  const n = MAP_SIZE;
  const inside = (x: number, z: number): boolean => x >= 0 && z >= 0 && x <= n && z <= n;
  let d = 0;
  let found = 0;
  outer: for (let i = 0; i + 3 < p.length; i += 2) {
    const sx = p[i + 2] - p[i];
    const sz = p[i + 3] - p[i + 1];
    const l = dhypot(sx, sz);
    const k = Math.max(1, Math.ceil(l / 0.25));
    for (let j = 0; j < k; j++) {
      const f = j / k;
      if (inside(p[i] + sx * f, p[i + 1] + sz * f)) {
        found = d + l * f;
        break outer;
      }
    }
    d += l;
    found = d;
  }
  outers.set(p, found);
  return found;
}


/** How long she takes to sail off from where she turned. */
export const leaveTicks = (ship: Sailing): number => Math.max(TICKS_PER_DAY, Math.round(SAIL_OUT * ship.turned));

/**
 * Leaving the jetty: she backs off astern, bow still to the quay, this far
 * (tiles) over BACK_TICKS, swings round where she lies over TURN_TICKS (clear
 * of the jetty: half her length is less than this), then sails out bow first.
 */
export const BACK_OFF = 3;
export const BACK_TICKS = 8;
export const TURN_TICKS = 8;
/** Does she leave the quay that way (she sailed off from the jetty, not turned back at sea)? */
const backsOff = (ship: Sailing, L: number): boolean => ship.turned >= 1 && L > 2 * BACK_OFF && leaveTicks(ship) > BACK_TICKS + TURN_TICKS + 10;
/** Has she finished backing off and swinging round (for the renderer: her sail stays furled till then)? */
export const underWay = (ship: Sailing, tick: number): boolean => ship.phase === SHIP_LEAVING && (!backsOff(ship, pathLength(ship.path)) || tick - ship.since >= BACK_TICKS + TURN_TICKS);
export const smooth = (u: number): number => {
  const v = Math.max(0, Math.min(1, u));
  return v * v * (3 - 2 * v);
};

/**
 * Where the ship is at a tick (fractional ticks too: the renderer draws her
 * between them), which way her bow points (a unit vector), and how far in she
 * has come (0 at the horizon, 1 at the quay); null while she is away.
 */
export function shipAt(ship: Sailing, tick: number): { x: number; z: number; dx: number; dz: number; inward: number } | null {
  if (ship.phase === SHIP_AWAY || ship.path.length < 4) return null;
  const L = pathLength(ship.path);
  let f: number;
  let back = false;
  // While she swings round: how far through it (0 bow in, 1 bow out).
  let swing = -1;
  if (ship.phase === SHIP_COMING) f = inwardAt(ship.path, (tick - ship.since) / SAIL_IN);
  else if (ship.phase === SHIP_MOORED) f = 1;
  else if (backsOff(ship, L)) {
    const e = tick - ship.since;
    const off = 1 - BACK_OFF / L;
    if (e < BACK_TICKS) f = 1 - (BACK_OFF / L) * smooth(e / BACK_TICKS);
    else if (e < BACK_TICKS + TURN_TICKS) {
      f = off;
      swing = smooth((e - BACK_TICKS) / TURN_TICKS);
    } else {
      f = off * inwardAt(ship.path, 1 - (e - BACK_TICKS - TURN_TICKS) / (leaveTicks(ship) - BACK_TICKS - TURN_TICKS));
      back = true;
    }
  } else {
    f = ship.turned * inwardAt(ship.path, 1 - (tick - ship.since) / leaveTicks(ship));
    back = true;
  }
  const p = pointAlong(ship.path, L * f);
  if (swing >= 0) {
    // Round from bow in to bow out, the same way every time.
    const a = Math.PI * swing;
    const c = dcos(a);
    const sn = dsin(a);
    return { x: p.x, z: p.z, dx: p.dx * c - p.dz * sn, dz: p.dx * sn + p.dz * c, inward: f };
  }
  return { x: p.x, z: p.z, dx: back ? -p.dx : p.dx, dz: back ? -p.dz : p.dz, inward: f };
}

// ---------------------------------------------------------------------------
// The city's stores and the quay.

/** What the city's stores (granaries or storehouses) hold of a good. */
export function cityHolds(s: SimState, w: Ware): number {
  const kind = storeKind(w);
  let n = 0;
  for (const b of s.buildings) if (b.kind === kind) n += held(b, w);
  return n;
}

/** What dockers on their way to fetch a good have reserved, and what dockers taking it back are carrying. */
export function inHand(s: SimState, post: Building, w: Ware): { fetching: number; returning: number } {
  let fetching = 0;
  let returning = 0;
  for (const d of s.walkers) {
    // (A docker fetching a gift carries nothing for trade.)
    if (d.kind !== 'docker' || d.origin !== post.id || d.food !== w || d.back || giftOf(d) > 0) continue;
    if (d.load > 0) returning += d.load;
    else fetching += d.meat;
  }
  return { fetching, returning };
}

/**
 * Is a trade good for sale at a depot (the trading post's quay, or the
 * caravan yard): ticked for the Tyre ship or for some open sea route, at the
 * quay; for some open land route, at the yard. With no routes open it is
 * exactly the ship's tick, as it always was.
 */
export function forSale(s: SimState, depot: Building, k: number): boolean {
  if (depot.kind === 'trading' && s.trade.sell[k]) return true;
  const kind = depot.kind === 'trading' ? 'sea' : 'land';
  for (const r of s.world.routes) if (r.kind === kind && r.sell[k]) return true;
  return false;
}

/** Is a trader loading at a depot now: the Tyre ship or a foreign ship tied up at the quay, or a caravan trading at the yard? */
export function loadingAt(s: SimState, depot: Building): boolean {
  if (depot.kind === 'trading') {
    if (s.trade.ship.phase === SHIP_MOORED) return true;
    for (const r of s.world.routes) if (r.ship && r.ship.phase === SHIP_MOORED && r.ship.post === depot.id) return true;
    return false;
  }
  for (const w of s.walkers) if (w.kind === 'caravan' && w.origin === depot.id && w.wait > 0) return true;
  return false;
}

/** The surplus of a trade good: what the stores hold beyond what the city keeps, less what dockers are already on their way to fetch. */
export function surplusOf(s: SimState, post: Building | undefined, k: number): number {
  const w = TRADE_GOODS[k];
  const fetching = post ? inHand(s, post, w).fetching : 0;
  return Math.max(0, cityHolds(s, w) - s.trade.keep[k] - fetching);
}

/** Room left on the quay for a good (less what dockers on their way have reserved). */
export const quayRoom = (post: Building, w: Ware): number => QUAY_ROOM - held(post, w) - coming(post, w);
/** What the caravan yard holds of each good. */
export const YARD_ROOM = 1600;
/** Room left at a depot (the quay or the caravan yard) for a good. */
export const depotRoom = (depot: Building, w: Ware): number => (depot.kind === 'yard' ? YARD_ROOM - held(depot, w) - coming(depot, w) : quayRoom(depot, w));

/** Dockers out from the post. */
export const dockersOut = (s: SimState, post: Building): number => {
  let n = 0;
  for (const w of s.walkers) if (w.kind === 'docker' && w.origin === post.id) n++;
  return n;
};

/** What is on the quay of each trade good, and what it would fetch at the ship's prices (the goods for sale only). */
export function quayWorth(s: SimState, post: Building): number {
  let dr = 0;
  TRADE_GOODS.forEach((w, k) => {
    if (s.trade.sell[k]) dr += priceFor(k, held(post, w));
  });
  return dr;
}

// ---------------------------------------------------------------------------
// Each tick.

/** The trading post's dockers and the ship's schedule and visit, once a tick. Nothing happens in a city that has never had a post. */
export function stepTrade(s: SimState, map: CoastMap): void {
  const ship = s.trade.ship;
  const post = tradingPost(s);
  if (!post) {
    if (ship.due !== 0) ship.due = 0;
    if (ship.phase === SHIP_COMING || ship.phase === SHIP_MOORED) turnBack(s, ship);
    if (ship.phase === SHIP_LEAVING) stepLeaving(s, ship);
    return;
  }
  // The schedule starts when a post stands.
  if (ship.due === 0) {
    ship.due = s.tick + FIRST_SHIP;
    // (Slice 33: a first visit due in winter is held back by the storms.)
    ship.due += stormDelay(s, 'tyre', ship.due);
  }
  stepDockers(s, map, post);
  if (ship.phase === SHIP_AWAY) {
    if (s.tick >= ship.due - SAIL_IN) setSail(s, map, post, ship);
  } else if (ship.phase === SHIP_COMING) {
    if (ship.post !== post.id) turnBack(s, ship);
    else if (s.tick >= ship.since + SAIL_IN) {
      ship.phase = SHIP_MOORED;
      ship.since = s.tick;
      ship.hold = TRADE_GOODS.map(() => 0);
    }
  } else if (ship.phase === SHIP_MOORED) {
    if (ship.post !== post.id) turnBack(s, ship);
    else stepLoading(s, post, ship);
  } else stepLeaving(s, ship);
}

/** She sets sail for the post from over the horizon (or, if it has no berth, the visit is missed). */
function setSail(s: SimState, map: CoastMap, post: Building, ship: Ship): void {
  const berth = berthOf(map, post);
  if (!berth) {
    ship.due += SHIP_EVERY;
    ship.due += stormDelay(s, 'tyre', ship.due);
    return;
  }
  ship.path = shipRoute(map, berth);
  ship.phase = SHIP_COMING;
  ship.post = post.id;
  ship.turned = 1;
  // She ties up when due (or SAIL_IN from now, if the town was loaded late in her schedule).
  ship.since = Math.min(s.tick, ship.due - SAIL_IN);
  if (ship.since < s.tick - SAIL_IN) ship.since = s.tick;
  ship.due = ship.since + SAIL_IN;
}

/** The post is gone: she turns back from where she is. */
function turnBack(s: SimState, ship: Ship): void {
  const at = shipAt(ship, s.tick);
  ship.turned = at ? at.inward : 1;
  ship.phase = SHIP_LEAVING;
  ship.since = s.tick;
  ship.hold = TRADE_GOODS.map(() => 0);
}

function stepLeaving(s: SimState, ship: Ship): void {
  if (s.tick < ship.since + leaveTicks(ship)) return;
  ship.phase = SHIP_AWAY;
  ship.since = s.tick;
  ship.path = [];
  ship.post = 0;
  ship.turned = 1;
}

/** Tied up: each day she takes a share of what is on the quay of the goods for sale; at the end she takes the rest, pays and sails off. */
function stepLoading(s: SimState, post: Building, ship: Ship): void {
  const t = s.tick - ship.since;
  if (t <= 0 || t % TICKS_PER_DAY !== 0) return;
  const days = LOADING / TICKS_PER_DAY;
  const day = t / TICKS_PER_DAY;
  let changed = false;
  TRADE_GOODS.forEach((w, k) => {
    if (!s.trade.sell[k]) return;
    const q = held(post, w);
    if (q <= 0) return;
    const take = day >= days ? q : Math.ceil(q / (days - day + 1));
    setHeld(post, w, q - take);
    ship.hold[k] += take;
    note(s, w, 'sold', 'tyre', take);
    changed = true;
  });
  if (changed) s.looks++;
  if (day < days) return;
  // She pays for what she has loaded, a line of the ledger for each good, and sails off.
  let paid = 0;
  TRADE_GOODS.forEach((w, k) => {
    const n = ship.hold[k];
    if (n <= 0) return;
    const dr = priceFor(k, n);
    paid += dr;
    income(s, dr, 'sales', WARE_NAMES[w], n);
  });
  ship.lastAt = s.tick;
  ship.lastBought = ship.hold.slice();
  ship.lastPaid = paid;
  ship.visits++;
  ship.hold = TRADE_GOODS.map(() => 0);
  ship.phase = SHIP_LEAVING;
  ship.since = s.tick;
  ship.turned = 1;
  // The next is due three months after this one was.
  ship.due += SHIP_EVERY;
  while (ship.due - SAIL_IN <= s.tick) ship.due += SHIP_EVERY;
  // (Slice 33: due in winter, the storms hold her back a week or two.)
  ship.due += stormDelay(s, 'tyre', ship.due);
}

// ---------------------------------------------------------------------------
// Dockers.

interface DockerJob {
  w: Ware;
  k: number;
  lot: number;
  back: boolean;
  /** Fetching for a gift (its number), not for trade. */
  gift?: number;
}

/** What dockers or porters have in hand for a gift, by its number (on their way to fetch it, or carrying it back). */
export function giftInHand(s: SimState, id: number): number {
  let n = 0;
  for (const d of s.walkers) if (d.kind === 'docker' && giftOf(d) === id) n += d.back ? d.load : d.meat;
  return n;
}

/**
 * The work the post's dockers could do now, in the order they take it on:
 * first anything on the quay the city wants back (no longer for sale, or the
 * stores below what is kept; not what she is loading), then the surplus of
 * the goods for sale, the most valuable load first.
 */
function dockerJobs(s: SimState, post: Building): DockerJob[] {
  const loading = loadingAt(s, post);
  const jobs: DockerJob[] = [];
  // First, a gift to fetch from the stores (diplomacy.ts), whatever is kept back.
  for (const g of s.world.gifts) {
    if (g.phase !== 0 || g.depot !== post.id || g.good < 0) continue;
    const w = TRADE_GOODS[g.good];
    const lot = Math.min(DOCKER_TAKE[g.good], g.amount - g.got - giftInHand(s, g.id), cityHolds(s, w));
    if (lot > 0) jobs.push({ w, k: g.good, lot, back: false, gift: g.id });
  }
  for (let k = 0; k < TRADE_GOODS.length; k++) {
    const w = TRADE_GOODS[k];
    const q = held(post, w);
    if (q <= 0) continue;
    const sale = forSale(s, post, k);
    if (sale && loading) continue;
    const { returning } = inHand(s, post, w);
    const want = sale ? s.trade.keep[k] - cityHolds(s, w) - returning : q;
    const lot = Math.min(DOCKER_TAKE[k], q, want);
    if (lot >= Math.min(MIN_LOT, q)) jobs.push({ w, k, lot, back: true });
  }
  const fetch: Array<DockerJob & { v: number }> = [];
  for (let k = 0; k < TRADE_GOODS.length; k++) {
    if (!forSale(s, post, k)) continue;
    const w = TRADE_GOODS[k];
    const lot = Math.min(DOCKER_TAKE[k], surplusOf(s, post, k), depotRoom(post, w));
    if (lot < MIN_LOT) continue;
    fetch.push({ w, k, lot, back: false, v: priceFor(k, lot) });
  }
  // (Stable: of two loads worth the same, the good earlier in the list.)
  fetch.sort((a, b) => b.v - a.v);
  for (const { w, k, lot, back } of fetch) jobs.push({ w, k, lot, back });
  return jobs;
}

/** What porters already on their way to fetch for gifts and sendings will take of a good from each store (by its id). */
function giftReserved(s: SimState, w: Ware): Map<number, number> {
  const m = new Map<number, number>();
  for (const d of s.walkers) if (d.kind === 'docker' && giftOf(d) > 0 && !d.back && d.food === w) m.set(d.target, (m.get(d.target) ?? 0) + d.meat);
  return m;
}

/**
 * The store a docker would go to for a job, by road from the post: carrying
 * back, the nearest with room for some of it; fetching, the nearest holding
 * the good. Fetching for a gift or a sending, the nearest holding some that
 * no other porter is already on his way to fetch, and no more than it has
 * left (so the loads come in from several stores together, not one after
 * another from the nearest).
 */
function storeFor(s: SimState, size: number, roads: number[], job: DockerJob): { g: Building; way: number[] } | null {
  const kind = storeKind(job.w);
  if (job.back) return nearestBy(s, size, roads, (g) => g.kind === kind && roomFor(g, job.w) >= Math.min(job.lot, MIN_LOT));
  if (!job.gift) return nearestBy(s, size, roads, (g) => g.kind === kind && held(g, job.w) > 0);
  const res = giftReserved(s, job.w);
  const free = (g: Building): number => held(g, job.w) - (res.get(g.id) ?? 0);
  const found = nearestBy(s, size, roads, (g) => g.kind === kind && free(g) > 0);
  if (found) job.lot = Math.min(job.lot, free(found.g));
  return found;
}

/**
 * The post sends a docker when there is work and a docker free (one every
 * DOCKER_GAP): the first job a store can be reached for (so a good with
 * nowhere to go doesn't hold up the others).
 */
export function stepDockers(s: SimState, map: CoastMap, post: Building): void {
  if (post.clock > 0) post.clock--;
  if (post.clock > 0 || rateOf(post) === 0) return;
  const out = dockersOut(s, post);
  // (With every docker out, a gift or a sending still goes: there are two more hands for those.)
  const extra = out >= MAX_DOCKERS;
  if (extra && (out >= MAX_DOCKERS + GIFT_HANDS || !s.world.gifts.some((g) => g.phase === 0 && g.depot === post.id))) return;
  post.clock = DOCKER_GAP;
  const jobs = extra ? dockerJobs(s, post).filter((j) => j.gift) : dockerJobs(s, post);
  if (jobs.length === 0) return;
  const size = map.size;
  const roads = roadsBeside(s, size, post);
  let job: DockerJob | null = null;
  let found: { g: Building; way: number[] } | null = null;
  for (const j of jobs) {
    found = storeFor(s, size, roads, j);
    if (found) {
      job = j;
      break;
    }
  }
  if (!job || !found) return;
  if (job.back) job.lot = Math.min(job.lot, roomFor(found.g, job.w));
  const d = newWalker(s, 'docker', 1);
  d.origin = post.id;
  d.target = found.g.id;
  d.food = job.w;
  d.since = s.tick;
  if (job.gift) {
    // Fetching a gift: it goes with the gift, not onto the quay.
    d.meat = job.lot;
    setGiftOf(d, job.gift);
  } else if (job.back) {
    // Carrying it back to a store: off the quay, room reserved there.
    setHeld(post, job.w, held(post, job.w) - job.lot);
    d.load = job.lot;
    addComing(found.g, job.w, job.lot);
    s.looks++;
  } else {
    // Fetching: room on the quay reserved for what he brings.
    d.meat = job.lot;
    addComing(post, job.w, job.lot);
  }
  setPath(d, wayPoints(size, door(size, post, found.way[0]), found.way, found.g));
  s.walkers.push(d);
}

/** Does a store suit what a docker is doing: holds his good to fetch, or has room for what he carries back? */
function suits(g: Building, d: Walker): boolean {
  if (g.kind !== storeKind(d.food)) return false;
  return d.load > 0 ? roomOf(g.kind, d.food) > 0 : true;
}

/** A docker's store has gone, or his way was cut: another store from where he stands, else home. False if he can get nowhere at all. */
function redirect(s: SimState, size: number, d: Walker, post: Building): boolean {
  const old = findBuilding(s, d.target);
  if (old && d.load > 0 && !d.back) addComing(old, d.food, -d.load);
  d.wait = 0;
  const from = lastRoad(s, d);
  if (!d.back && from >= 0) {
    const ok = d.load > 0 ? (g: Building) => g.kind === storeKind(d.food) && roomFor(g, d.food) >= d.load : (g: Building) => g.kind === storeKind(d.food) && held(g, d.food) > 0;
    const found = nearestBy(s, size, [from], ok);
    if (found) {
      d.target = found.g.id;
      if (d.load > 0) addComing(found.g, d.food, d.load);
      setPath(d, wayPoints(size, position(d), found.way, found.g));
      return true;
    }
  }
  d.back = true;
  d.target = 0;
  return goTo(s, size, d, post, from);
}

/** A docker is home (or can get nowhere): what he carries goes on the quay, and his reserved room is given back. */
function home(s: SimState, d: Walker, post: Building): false {
  if (giftOf(d) > 0) {
    // A gift's docker: what he fetched goes with the gift, and so out of the city's stock (or onto the quay, if it has gone without it).
    const g = s.world.gifts.find((x) => x.id === giftOf(d) && x.phase === 0);
    if (g && d.load > 0) {
      g.got += d.load;
      // (Sent for a request or tribute: on its own line of the stock book.)
      const deal = g.deal ? s.world.deals.find((x) => x.id === g.deal) : undefined;
      note(s, d.food, 'sold', `${deal ? (deal.kind === 'tribute' ? 'tribute' : deal.kind === 'threat' ? 'peace' : 'sent') : 'gift'}:${g.to}`, d.load);
    } else if (d.load > 0) setHeld(post, d.food, held(post, d.food) + d.load);
    if (d.load > 0) s.looks++;
    d.meat = 0;
    d.load = 0;
    return false;
  }
  if (d.meat > 0) addComing(post, d.food, -d.meat);
  if (d.load > 0) {
    setHeld(post, d.food, held(post, d.food) + d.load);
    s.looks++;
  }
  d.meat = 0;
  d.load = 0;
  return false;
}

/** Move a docker one tick along. False when he is done (home, or gone). */
export function moveDocker(s: SimState, map: CoastMap, d: Walker): boolean {
  const size = map.size;
  const post = findBuilding(s, d.origin);
  if (!post) return false;
  if (d.wait > 0) {
    const g = findBuilding(s, d.target);
    if (!g || !suits(g, d)) return redirect(s, size, d, post) || home(s, d, post);
    d.wait -= rateOf(g);
    if (d.wait > 0) return true;
    d.wait = 0;
    if (d.load > 0) {
      // Carried back: into the store.
      addComing(g, d.food, -d.load);
      setHeld(g, d.food, Math.min(roomOf(g.kind, d.food), held(g, d.food) + d.load));
      d.load = 0;
    } else if (giftOf(d) > 0) {
      // Fetching a gift: as much as he came for, whatever the city keeps.
      const take = Math.min(d.meat, held(g, d.food));
      setHeld(g, d.food, held(g, d.food) - take);
      d.meat = take;
      d.load = take;
    } else {
      // Fetching: what the city has beyond what it keeps, as much as he reserved room for.
      const k = tradeIndex(d.food);
      const spare = k >= 0 && forSale(s, post, k) ? Math.max(0, cityHolds(s, d.food) - s.trade.keep[k]) : 0;
      const take = Math.min(d.meat, held(g, d.food), spare);
      setHeld(g, d.food, held(g, d.food) - take);
      addComing(post, d.food, take - d.meat);
      d.meat = take;
      d.load = take;
    }
    s.looks++;
    d.back = true;
    d.target = 0;
    if (!goTo(s, size, d, post, lastRoad(s, d))) return home(s, d, post);
    return true;
  }
  const next = d.tiles[d.seg + 1];
  if (next !== undefined && next >= 0 && s.tiles[next] !== TILE_ROAD) {
    if (!(d.back ? goTo(s, size, d, post, lastRoad(s, d)) : redirect(s, size, d, post))) return home(s, d, post);
  }
  if (!d.back && !findBuilding(s, d.target) && !redirect(s, size, d, post)) return home(s, d, post);
  // (Fetching a gift or a sending, he hurries: speedOf.)
  let move = speedOf(d);
  for (let guard = 0; guard < 8 && move > 0; guard++) {
    const last = d.path.length / 2 - 1;
    if (d.seg >= last) break;
    const i = d.seg * 2;
    const len = dhypot(d.path[i + 2] - d.path[i], d.path[i + 3] - d.path[i + 1]);
    if (d.along + move < len) {
      d.along += move;
      d.walked += move;
      break;
    }
    move -= len - d.along;
    d.walked += len - d.along;
    d.seg++;
    d.along = 0;
    if (d.seg < last) {
      const t = d.tiles[d.seg + 1];
      if (t >= 0 && s.tiles[t] !== TILE_ROAD && !(d.back ? goTo(s, size, d, post, lastRoad(s, d)) : redirect(s, size, d, post))) return home(s, d, post);
      continue;
    }
    if (d.back) return home(s, d, post);
    const g = findBuilding(s, d.target);
    if (!g || !suits(g, d)) return redirect(s, size, d, post) || home(s, d, post);
    d.wait = HANDLE;
    break;
  }
  return true;
}

/** What the docker is doing, for his hover tip. */
export function dockerDoing(s: SimState, d: Walker): string {
  const name = WARE_NAMES[d.food];
  const g = findBuilding(s, d.target);
  const yard = findBuilding(s, d.origin)?.kind === 'yard';
  const depot = yard ? 'the caravan yard' : 'the quay';
  const where = g ? (g.kind === 'granary' ? 'the granary' : 'the storehouse') : depot;
  if (giftOf(d) > 0) {
    const gift = s.world.gifts.find((x) => x.id === giftOf(d));
    const city = gift ? gift.to.replace(/^./, (c) => c.toUpperCase()) : '';
    const deal = gift?.deal ? s.world.deals.find((x) => x.id === gift.deal) : undefined;
    const to = !gift ? ' for your gift' : deal ? (deal.kind === 'tribute' ? ` for the tribute ${city} demands` : deal.kind === 'threat' ? ` for ${city}, the price of peace` : ` for ${city}, as they asked`) : ` for your gift to ${city}`;
    if (d.back) return d.load > 0 ? `bringing ${d.load.toLocaleString('en-GB')} ${name} to ${depot}${to}` : `going back to ${depot}`;
    return d.wait > 0 ? `loading ${name} at ${where}${to}` : `going to ${where} for ${name}${to}`;
  }
  if (d.back) return d.load > 0 ? `bringing ${d.load.toLocaleString('en-GB')} ${name} to ${depot} ${yard ? 'for the caravans' : 'for the ships'}` : `going back to ${depot}`;
  if (d.load > 0) {
    const k = tradeIndex(d.food);
    const post = findBuilding(s, d.origin);
    const sale = post && k >= 0 ? forSale(s, post, k) : false;
    return `taking ${d.load.toLocaleString('en-GB')} ${name} to ${where}${sale ? '' : yard ? ': it came with a caravan, or isn’t for sale now' : ': it came in by ship, or isn’t for sale now'}`;
  }
  return d.wait > 0 ? `loading ${name} at ${where}` : `going to ${where} for ${name} to sell`;
}


// ---------------------------------------------------------------------------
// What the panel, the top bar and the tips say.

const dayWords = (n: number): string => (n === 1 ? '1 day' : `${n} days`);
const daysTo = (s: SimState, t: number): number => Math.max(1, Math.ceil((t - s.tick) / TICKS_PER_DAY));
const amountWords = (k: number, n: number): string => `${n.toLocaleString('en-GB')} ${WARE_NAMES[TRADE_GOODS[k]]}`;

/** "1,200 wheat, 600 cheese and 400 oil". */
export function goodsList(ns: readonly number[]): string {
  const xs = ns.map((n, k) => (n > 0 ? amountWords(k, n) : '')).filter((x) => x);
  if (xs.length <= 1) return xs[0] ?? 'nothing';
  return `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}

/**
 * Where the ship is in her schedule, for the top bar's chip (`short`), the
 * post's panel and tips (`line`): due in so many days, her sail sighted,
 * tied up and loading, or sailed. Null in a city that has never had a post.
 */
export function shipNews(s: SimState): { phase: number; days: number; chip: string; short: string; line: string } | null {
  const ship = s.trade.ship;
  const post = tradingPost(s);
  // The post cleared while she is on her way or in port (the sim turns her back on its next step, which may wait while paused).
  if (!post && (ship.phase === SHIP_COMING || ship.phase === SHIP_MOORED)) return { phase: SHIP_LEAVING, days: 0, chip: 'Gone', short: 'Ship turned back', line: 'The ship turned back: the trading post is gone' };
  if (ship.phase === SHIP_COMING) {
    const days = daysTo(s, ship.since + SAIL_IN);
    const near = (shipAt(ship, s.tick)?.inward ?? 0) >= 0.6;
    // (Slice 33: late for the winter's storms, the line says so.)
    const late = lateWords(s, 'tyre');
    return { phase: ship.phase, days, chip: `${days} d`, short: near ? `Sailing in · ${days} d` : `Sail sighted · ${days} d`, line: near ? `The ship is sailing into the bay: she ties up at the jetty in ${dayWords(days)}${late}` : `Her sail is on the horizon: the ship ties up at the jetty in ${dayWords(days)}${late}` };
  }
  if (ship.phase === SHIP_MOORED) {
    const days = daysTo(s, ship.since + LOADING);
    const so = ship.hold.some((n) => n > 0) ? ` · loaded so far: ${goodsList(ship.hold)}` : '';
    return { phase: ship.phase, days, chip: 'In port', short: 'Ship loading', line: `The ship is tied up at the jetty, loading what is on the quay for sale: she pays and sails in ${dayWords(days)}${so}` };
  }
  if (ship.phase === SHIP_LEAVING) {
    const sold = ship.lastAt === ship.since && ship.lastPaid > 0;
    const next = post && ship.due > 0 ? ` · the next is due in ${dayWords(daysTo(s, ship.due))}` : '';
    if (sold) return { phase: ship.phase, days: 0, chip: `+${ship.lastPaid.toLocaleString('en-GB')}`, short: `Sold · ${ship.lastPaid.toLocaleString('en-GB')} dr`, line: `The ship has sailed with ${goodsList(ship.lastBought)}: she paid ${ship.lastPaid.toLocaleString('en-GB')} dr${next}` };
    if (ship.lastAt === ship.since) return { phase: ship.phase, days: 0, chip: 'Sailed', short: 'Ship sailed', line: `The ship has sailed with nothing: there was nothing on the quay for sale${next}` };
    return { phase: ship.phase, days: 0, chip: 'Gone', short: 'Ship turned back', line: post ? `The ship turned back${next}` : 'The ship turned back: the trading post is gone' };
  }
  if (!post) return null;
  // (A post built while the game is paused: her schedule starts with the next tick.)
  const days = daysTo(s, ship.due > 0 ? ship.due : s.tick + FIRST_SHIP);
  // (Slice 33: held back by winter's storms, she is late, and the chip and line say so.)
  const late = lateWords(s, 'tyre');
  return { phase: ship.phase, days, chip: late ? `${days} d · late` : `${days} d`, short: late ? `Ship late · ${days} d` : `Ship in ${days} d`, line: `The next ship is due in ${dayWords(days)}${late}: she buys what is on the quay of the goods ticked for sale` };
}

/** What the post's dockers are doing, or why none is going ('' while there is nothing to say). */
export function dockerNews(s: SimState, map: CoastMap, post: Building): string {
  const out = dockersOut(s, post);
  if (rateOf(post) === 0) return '';
  if (post.kind === 'yard' && out > 0) return `${out} of ${MAX_DOCKERS} porters out, carrying goods between the stores and the yard`;
  if (out > 0) return `${out} of ${MAX_DOCKERS} dockers out, carrying goods between the stores and the quay`;
  if (!TRADE_GOODS.some((_, k) => forSale(s, post, k)) && !TRADE_GOODS.some((w) => held(post, w) > 0)) return 'No dockers out: nothing is ticked for sale';
  const jobs = dockerJobs(s, post);
  if (jobs.length > 0) {
    const roads = roadsBeside(s, map.size, post);
    if (jobs.some((j) => storeFor(s, map.size, roads, j))) return 'A docker sets off soon';
    const job = jobs[0];
    const kind = storeKind(job.w);
    const who = post.kind === 'yard' ? 'porters' : 'dockers';
    const from = post.kind === 'yard' ? 'the yard' : 'the post';
    if (job.back) return `No ${who} out: no ${kind} reached by road from ${from} has room for the ${WARE_NAMES[job.w]} ${forSale(s, post, job.k) ? 'going back' : 'brought in'}`;
    return `No ${who} out: no ${kind} holding ${WARE_NAMES[job.w]} is reached by road from ${from}`;
  }
  // Why not: nothing spare in the stores, or the quay full of what is spare.
  let spare = false;
  let room = false;
  TRADE_GOODS.forEach((w, k) => {
    if (!forSale(s, post, k)) return;
    if (surplusOf(s, post, k) >= MIN_LOT) {
      spare = true;
      if (depotRoom(post, w) >= MIN_LOT) room = true;
    }
  });
  if (!spare) return 'No dockers out: the stores hold no more of the goods for sale than the city keeps';
  return room ? 'No dockers out' : post.kind === 'yard' ? 'No porters out: the yard is full until the next caravan' : 'No dockers out: the quay is full until the ship comes';
}
