/**
 * Is a land playable (slice 42)? Asked of its baked map with the game's own
 * build rules, on a town with nothing built yet:
 * - somewhere a farm, an olive grove, a pasture, a horse farm, a vineyard,
 *   a copper mine, a marble quarry, a loggers' camp, the Lighthouse and a
 *   trading post (a berth the ship can reach) can go, each on the land the
 *   roads in can reach;
 * - the ground a road can take (bridging the river where a bridge can go)
 *   joins the north, east and west edges, where the roads in come from, to
 *   that land, and there is room on it for a city.
 * Pure; slow enough (a few hundred milliseconds on a large land) to be for
 * the tests and the generator's tuning, not the game's ticks.
 */
import { WATER_SEA, type CoastMap } from './bake';
import { buildingRefusal, bridgeSpan, Ground, mapIndex } from '../sim/build';
// Slice 46: the roads in.
import { roadRefusal } from '../sim/build';
import { quayTiles } from '../sim/trade';
import type { BuildingKind, SimState } from '../sim/state';

/** The kinds a land must have room for, each somewhere the roads in reach. */
export const NEEDED: readonly BuildingKind[] = ['farm', 'grove', 'pasture', 'horsefarm', 'vineyard', 'mine', 'quarry', 'loggers', 'lighthouse', 'trading'];

/** Each needed kind, in words. */
const WORDS: Record<string, string> = {
  farm: 'a farm',
  grove: 'an olive grove',
  pasture: 'a pasture',
  horsefarm: 'a horse farm',
  vineyard: 'a vineyard',
  mine: 'a copper mine',
  quarry: 'a marble quarry',
  loggers: 'a loggers’ camp',
  lighthouse: 'the Lighthouse',
  trading: 'a trading post',
};

/** How many tiles a home can stand on the reachable land must have, at least: room for a city. */
export const CITY_ROOM = 2500;

export interface LandReport {
  ok: boolean;
  /** What is wrong, in words (empty when ok). */
  problems: string[];
  /** Where each needed kind can first go (its top-left tile), -1 if nowhere reachable. */
  spots: Record<string, number>;
  /** Tiles a home can stand on, on the land the roads in reach. */
  room: number;
  /** Whether each edge's road-going ground reaches that land. */
  edges: { north: boolean; east: boolean; west: boolean };
}

/** Check a land on a town with nothing built (`s`, founded on that land). */
export function landCheck(map: CoastMap, s: SimState): LandReport {
  const n = map.size;
  const ground = mapIndex(map).ground;
  const roadable = (t: number): boolean => ground[t] === Ground.Ok || ground[t] === Ground.SteepForHome;
  // The land the roads can join, in pieces: road-going ground four ways, and over the river where a bridge can go.
  const piece = new Int32Array(n * n).fill(-1);
  const sizes: number[] = [];
  const homes: number[] = [];
  for (let start = 0; start < n * n; start++) {
    if (piece[start] >= 0 || !roadable(start)) continue;
    const id = sizes.length;
    let count = 0;
    let room = 0;
    const queue = [start];
    piece[start] = id;
    for (let i = 0; i < queue.length; i++) {
      const t = queue[i];
      count++;
      if (ground[t] === Ground.Ok) room++;
      const x = t % n;
      const next: number[] = [];
      if (t >= n) next.push(t - n);
      if (t < n * n - n) next.push(t + n);
      if (x > 0) next.push(t - 1);
      if (x < n - 1) next.push(t + 1);
      for (const u of next) {
        if (piece[u] < 0 && roadable(u)) {
          piece[u] = id;
          queue.push(u);
        } else if (ground[u] === Ground.Water && map.tileWater[u] !== WATER_SEA) {
          // A bridge from here, straight over the river.
          const dir = u === t - n ? 1 : u === t - 1 ? 2 : u === t + 1 ? 3 : 4;
          const b = bridgeSpan(map, s, t, dir);
          if (b.end >= 0 && piece[b.end] < 0 && roadable(b.end)) {
            piece[b.end] = id;
            queue.push(b.end);
          }
        }
      }
    }
    sizes.push(count);
    homes.push(room);
  }
  // The main land: the piece with the most room for homes.
  let main = -1;
  for (let i = 0; i < homes.length; i++) if (main < 0 || homes[i] > homes[main]) main = i;
  const onMain = (t: number): boolean => main >= 0 && piece[t] === main;
  const edgeOn = (ts: number[]): boolean => ts.some(onMain);
  const range = (k: number): number[] => Array.from({ length: n }, (_, i) => i * k);
  const edges = {
    north: edgeOn(range(1)),
    west: edgeOn(range(n)),
    east: edgeOn(range(n).map((t) => t + n - 1)),
  };
  const problems: string[] = [];
  for (const [side, ok] of Object.entries(edges)) if (!ok) problems.push(`no road in from the ${side} edge reaches the land`);
  const room = main >= 0 ? homes[main] : 0;
  if (room < CITY_ROOM) problems.push(`room for ${room} tiles of homes, fewer than ${CITY_ROOM}`);
  // Each kind somewhere on the main land (its top-left tile on it).
  const quays = quayTiles(map);
  const spots: Record<string, number> = {};
  for (const kind of NEEDED) {
    spots[kind] = -1;
    for (let t = 0; t < n * n && spots[kind] < 0; t++) {
      if (!onMain(t)) continue;
      if (kind === 'trading' && !quays[t]) continue;
      if (buildingRefusal(map, s, kind, t % n, Math.floor(t / n)) === '') spots[kind] = t;
    }
    if (spots[kind] < 0) problems.push(`nowhere for ${WORDS[kind]} the roads in reach`);
  }
  return { ok: problems.length === 0, problems, spots, room, edges };
}

// Slice 46: the roads in.

/** The edges a road comes in from (the sea is to the south). */
export type Side = 'north' | 'east' | 'west';

export interface RoadsIn {
  /** On each edge, the tile where a road from there to the city's site is shortest (-1: none reaches it). */
  ins: Record<Side, number>;
  /** How long each of those roads is, in tiles (bridges counted as tiles). */
  lengths: Record<Side, number>;
  /** The nearest edge, and its road: from the edge tile to the site, in order, a bridge's tiles among them where it crosses the river. */
  from: Side | '';
  road: number[];
}

/** Each step's cost for a turn: roads run straight where they can, as a player lays them. */
const TURN = 2.5;
/** A bridge's tile costs this many of a road's (they cost ten times as much). */
const BRIDGE_STEP = 4;

/**
 * Where the roads in come from, on a town with nothing built (`s`, founded
 * on that land): from the land's site (its `site`, where the city starts),
 * the cheapest road to each of the north, east and west edges, bridging the
 * river where a bridge can go, turning as little as it can. Pure; a few tens
 * of milliseconds.
 */
export function roadsIn(map: CoastMap, s: SimState): RoadsIn {
  const n = map.size;
  const ground = mapIndex(map).ground;
  const free = (t: number): boolean => roadRefusal(map, s, t % n, Math.floor(t / n)) === '';
  const none: RoadsIn = { ins: { north: -1, east: -1, west: -1 }, lengths: { north: 0, east: 0, west: 0 }, from: '', road: [] };
  const site = map.data.site;
  if (!site) return none;
  // The free tile nearest the site.
  let start = -1;
  let bd = Infinity;
  const sx = Math.round(site.x);
  const sz = Math.round(site.z);
  for (let r = 0; r < 24 && start < 0; r++) {
    for (let z = sz - r; z <= sz + r; z++) {
      for (let x = sx - r; x <= sx + r; x++) {
        if (x < 0 || z < 0 || x >= n || z >= n) continue;
        const t = z * n + x;
        const d = (x - site.x) * (x - site.x) + (z - site.z) * (z - site.z);
        if (d < bd && ground[t] === Ground.Ok && free(t)) [start, bd] = [t, d];
      }
    }
  }
  if (start < 0) return none;
  // Dijkstra over (tile, the way it was entered), from the site outwards.
  const STATES = n * n * 4;
  const cost = new Float64Array(STATES).fill(Infinity);
  const prev = new Int32Array(STATES).fill(-1);
  /** A jump over a bridge: the state it came from, and its tiles. */
  const spans = new Map<number, number[]>();
  const heap: number[] = [];
  const keyCost = (st: number): number => cost[st];
  const push = (st: number): void => {
    heap.push(st);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (keyCost(heap[p]) <= keyCost(heap[i])) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = (): number => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && keyCost(heap[l]) < keyCost(heap[m])) m = l;
        if (r < heap.length && keyCost(heap[r]) < keyCost(heap[m])) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  // Directions: 0 north, 1 west, 2 east, 3 south (bridgeSpan's 1..4).
  const DX = [0, -1, 1, 0];
  const DZ = [-1, 0, 0, 1];
  for (let d = 0; d < 4; d++) {
    cost[start * 4 + d] = 0;
    push(start * 4 + d);
  }
  const done = new Uint8Array(STATES);
  const best: Record<Side, number> = { north: -1, east: -1, west: -1 };
  while (heap.length > 0) {
    const st = pop();
    if (done[st]) continue;
    done[st] = 1;
    const t = st >> 2;
    const dir = st & 3;
    const x = t % n;
    const z = (t - x) / n;
    const c = cost[st];
    // An edge reached: the first time is that edge's cheapest.
    for (const [side, on] of [['north', z === 0], ['west', x === 0], ['east', x === n - 1]] as Array<[Side, boolean]>) {
      if (on && best[side] < 0) best[side] = st;
    }
    for (let d = 0; d < 4; d++) {
      if (d === 3 - dir && t !== start) continue;
      const ux = x + DX[d];
      const uz = z + DZ[d];
      if (ux < 0 || uz < 0 || ux >= n || uz >= n) continue;
      const u = uz * n + ux;
      const turn = d === dir || t === start ? 0 : TURN;
      if (free(u)) {
        const step = 1 + turn + (ground[u] === Ground.SteepForHome ? 0.6 : 0);
        const v = u * 4 + d;
        if (c + step < cost[v]) {
          cost[v] = c + step;
          prev[v] = st;
          push(v);
        }
      } else if (ground[u] === Ground.Water && map.tileWater[u] !== WATER_SEA) {
        const b = bridgeSpan(map, s, t, d + 1);
        if (b.end < 0 || !free(b.end)) continue;
        const v = b.end * 4 + d;
        const step = 1 + turn + b.tiles.length * BRIDGE_STEP;
        if (c + step < cost[v]) {
          cost[v] = c + step;
          prev[v] = st;
          spans.set(v, b.tiles);
          push(v);
        }
      }
    }
  }
  const out: RoadsIn = { ins: { north: -1, east: -1, west: -1 }, lengths: { north: 0, east: 0, west: 0 }, from: '', road: [] };
  const trace = (st: number): number[] => {
    // From the edge back to the site: the tiles in order from the edge.
    const tiles: number[] = [];
    for (let v = st; v >= 0; v = prev[v]) {
      tiles.push(v >> 2);
      const span = spans.get(v);
      if (span) tiles.push(...span.slice().reverse());
    }
    return tiles;
  };
  let bestCost = Infinity;
  for (const side of ['west', 'north', 'east'] as Side[]) {
    const st = best[side];
    if (st < 0) continue;
    const tiles = trace(st);
    out.ins[side] = st >> 2;
    out.lengths[side] = tiles.length;
    if (cost[st] < bestCost) {
      bestCost = cost[st];
      out.from = side;
      out.road = tiles;
    }
  }
  return out;
}
