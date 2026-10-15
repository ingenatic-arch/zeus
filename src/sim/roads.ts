/**
 * The road network as a graph of road tiles joined on four sides:
 * breadth-first search for walkers, and A* for laying a new road.
 * Pure and deterministic (neighbours are always visited in the same order).
 */
import type { CoastMap } from '../map/bake';
import { Ground, isEdgeTile, mapIndex } from './build';
import { TILE_EMPTY, TILE_ROAD, type SimState } from './state';

export interface Search {
  /** Parent tile on the way back to a source; the source is its own parent; -1 unreached. */
  parent: Int32Array;
  dist: Int32Array;
}

/** Visit the four neighbours of a tile in a fixed order. */
function neighbours(size: number, t: number, out: number[]): number[] {
  out.length = 0;
  const tx = t % size;
  if (t >= size) out.push(t - size);
  if (tx > 0) out.push(t - 1);
  if (tx < size - 1) out.push(t + 1);
  if (t < size * (size - 1)) out.push(t + size);
  return out;
}

/** Breadth-first over road tiles from the given sources (which need not be roads themselves). */
export function roadSearch(s: SimState, size: number, sources: readonly number[]): Search {
  const total = size * size;
  const parent = new Int32Array(total).fill(-1);
  const dist = new Int32Array(total).fill(-1);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;
  for (const src of sources) {
    if (parent[src] !== -1) continue;
    parent[src] = src;
    dist[src] = 0;
    queue[tail++] = src;
  }
  const nb: number[] = [];
  while (head < tail) {
    const t = queue[head++];
    for (const u of neighbours(size, t, nb)) {
      if (parent[u] !== -1 || s.tiles[u] !== TILE_ROAD) continue;
      parent[u] = t;
      dist[u] = dist[t] + 1;
      queue[tail++] = u;
    }
  }
  return { parent, dist };
}

/** Road tiles on the map's edge, where settlers come in, in tile order. */
export function edgeRoads(s: SimState, size: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < size; i++) {
    for (const t of [i, (size - 1) * size + i, i * size, i * size + size - 1]) {
      if (s.tiles[t] === TILE_ROAD && !out.includes(t)) out.push(t);
    }
  }
  return out.sort((a, b) => a - b);
}

/** The tiles from a search's source to `to`, in walking order (source first). */
export function tracePath(search: Search, to: number): number[] {
  const out: number[] = [];
  let t = to;
  while (true) {
    out.push(t);
    const p = search.parent[t];
    if (p === t || p < 0) break;
    t = p;
  }
  return out.reverse();
}

/** Of the given tiles, the one the search reached first (shortest), or -1. */
export function nearestReached(search: Search, tiles: readonly number[]): number {
  let best = -1;
  let bd = Infinity;
  for (const t of tiles) {
    const d = search.dist[t];
    if (d >= 0 && d < bd) {
      bd = d;
      best = t;
    }
  }
  return best;
}

/** The first edge road tile a search reached (closest), or -1. */
export function nearestEdge(search: Search, s: SimState, size: number): number {
  let best = -1;
  let bd = Infinity;
  for (const t of edgeRoads(s, size)) {
    const d = search.dist[t];
    if (d >= 0 && d < bd) {
      bd = d;
      best = t;
    }
  }
  return best;
}

/**
 * A way on foot across open land (not water or steep rock) from a tile to the
 * nearest tile on the map's edge, for people leaving with no road out. Returns
 * waypoints (x, z pairs at tile centres, straightened where the ground between
 * allows) ending on the edge tile, or null if there is no way.
 */
export function overland(map: CoastMap, from: number): { points: number[]; edge: number } | null {
  const size = map.size;
  const ground = mapIndex(map).ground;
  const open = (t: number): boolean => ground[t] !== Ground.Water && ground[t] !== Ground.Steep && ground[t] !== Ground.OffMap;
  const parent = new Int32Array(size * size).fill(-1);
  const queue = new Int32Array(size * size);
  let head = 0;
  let tail = 0;
  parent[from] = from;
  queue[tail++] = from;
  const nb: number[] = [];
  let edge = -1;
  while (head < tail) {
    const t = queue[head++];
    if (isEdgeTile(size, t)) {
      edge = t;
      break;
    }
    for (const u of neighbours(size, t, nb)) {
      if (parent[u] !== -1 || !open(u)) continue;
      parent[u] = t;
      queue[tail++] = u;
    }
  }
  if (edge < 0) return null;
  const tiles = tracePath({ parent, dist: parent }, edge);
  // Straighten: from each point, go straight to the furthest later one the
  // ground between allows.
  const cx = (t: number): number => (t % size) + 0.5;
  const cz = (t: number): number => Math.floor(t / size) + 0.5;
  const clear = (a: number, b: number): boolean => {
    const ax = cx(a);
    const az = cz(a);
    const len = Math.hypot(cx(b) - ax, cz(b) - az);
    const steps = Math.ceil(len * 4);
    for (let k = 1; k < steps; k++) {
      const f = k / steps;
      const x = Math.floor(ax + (cx(b) - ax) * f);
      const z = Math.floor(az + (cz(b) - az) * f);
      if (!open(z * size + x)) return false;
    }
    return true;
  };
  const points: number[] = [cx(tiles[0]), cz(tiles[0])];
  let i = 0;
  while (i < tiles.length - 1) {
    let j = tiles.length - 1;
    while (j > i + 1 && !clear(tiles[i], tiles[j])) j--;
    points.push(cx(tiles[j]), cz(tiles[j]));
    i = j;
  }
  return { points, edge };
}

// ---------------------------------------------------------------------------
// Laying a road: A* over buildable tiles from one tile to another, with a
// penalty for turning so roads run straight where they can. Existing roads
// are cheap to follow; buildings, water and steep ground are walls.

class Heap {
  private keys: number[] = [];
  private vals: number[] = [];
  get size(): number {
    return this.keys.length;
  }
  push(key: number, val: number): void {
    const k = this.keys;
    const v = this.vals;
    let i = k.length;
    k.push(key);
    v.push(val);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] < key || (k[p] === key && v[p] <= val)) break;
      k[i] = k[p];
      v[i] = v[p];
      i = p;
    }
    k[i] = key;
    v[i] = val;
  }
  pop(): number {
    const k = this.keys;
    const v = this.vals;
    const top = v[0];
    const lk = k.pop() as number;
    const lv = v.pop() as number;
    if (k.length > 0) {
      let i = 0;
      const n = k.length;
      while (true) {
        let c = 2 * i + 1;
        if (c >= n) break;
        if (c + 1 < n && (k[c + 1] < k[c] || (k[c + 1] === k[c] && v[c + 1] < v[c]))) c++;
        if (k[c] > lk || (k[c] === lk && v[c] >= lv)) break;
        k[i] = k[c];
        v[i] = v[c];
        i = c;
      }
      k[i] = lk;
      v[i] = lv;
    }
    return top;
  }
}

const TURN_COST = 0.6;
const ROAD_STEP_COST = 0.35;

/** Can a new road run over this tile (or does one already)? */
export function roadPassable(map: CoastMap, s: SimState, t: number): boolean {
  const g = mapIndex(map).ground[t];
  if (g !== Ground.Ok && g !== Ground.SteepForHome) return false;
  const on = s.tiles[t];
  return on === TILE_EMPTY || on === TILE_ROAD;
}

/**
 * The route a dragged road takes from `from` to `to` (tile indices), as a
 * list of tiles including both ends, or null if there is no way through.
 * Each step costs 1 (less along an existing road) and each turn a little more.
 */
export function roadRoute(map: CoastMap, s: SimState, from: number, to: number, maxVisits = 60000): number[] | null {
  const n = map.size;
  if (!roadPassable(map, s, from) || !roadPassable(map, s, to)) return null;
  if (from === to) return [from];
  const tx = to % n;
  const tz = (to - tx) / n;
  const h = (t: number): number => Math.abs((t % n) - tx) + Math.abs(Math.floor(t / n) - tz);
  // State = tile * 5 + direction (0 = none yet, 1..4 = N W E S).
  const states = n * n * 5;
  const g = new Float32Array(states).fill(Infinity);
  const from5 = new Int32Array(states).fill(-1);
  const open = new Heap();
  const start = from * 5;
  g[start] = 0;
  open.push(h(from), start);
  const nb: number[] = [];
  let visits = 0;
  // Prefer to go first along whichever axis is longer, so an L-shaped drag bends once.
  const fx = from % n;
  const fz = (from - fx) / n;
  const longX = Math.abs(tx - fx) >= Math.abs(tz - fz);
  while (open.size > 0 && visits++ < maxVisits) {
    const st = open.pop();
    const t = (st / 5) | 0;
    const dir = st % 5;
    if (t === to) {
      const out: number[] = [];
      let c = st;
      while (c >= 0) {
        out.push((c / 5) | 0);
        c = from5[c];
      }
      return out.reverse();
    }
    const gc = g[st];
    neighbours(n, t, nb);
    for (const u of nb) {
      if (!roadPassable(map, s, u)) continue;
      const d = u === t - n ? 1 : u === t - 1 ? 2 : u === t + 1 ? 3 : 4;
      const horizontal = d === 2 || d === 3;
      let cost = s.tiles[u] === TILE_ROAD ? ROAD_STEP_COST : 1;
      if (dir !== 0 && dir !== d) cost += TURN_COST;
      // A whisker of preference for the long axis first, to break ties the same way every time.
      if (dir === 0 && horizontal !== longX) cost += 0.01;
      const us = u * 5 + d;
      const ng = gc + cost;
      if (ng < g[us]) {
        g[us] = ng;
        from5[us] = st;
        open.push(ng + h(u) * ROAD_STEP_COST, us);
      }
    }
  }
  return null;
}

export { isEdgeTile };
