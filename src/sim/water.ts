/**
 * Fountains and their water carriers, and houses growing with water.
 *
 * A fountain beside a road sends out a water carrier. She walks the roads a
 * tile at a time, never further than CARRIER_RANGE road steps from her
 * fountain. At a junction she heads for the homes whose water is running
 * lowest (looking a little way down each road), taking the next way round
 * from the last carrier's when it makes no difference; she turns round at dead
 * ends, at the edge of her reach, and where no homes lie ahead but some lie
 * behind. After CARRIER_WALK tiles of road not yet walked this round (or twice
 * that in all) she heads home by the shortest road. Every home beside a road tile she stands on has water for
 * WATER_LASTS ticks. Tents with water become huts; huts whose water has run
 * out for a month go back to tents.
 */
import type { CoastMap } from '../map/bake';
import { PLOT_SIZE, plotNeighbours } from './build';
import { capacity, findBuilding, HOME_CAPACITY, recountPopulation } from './buildings';
import { TICKS_PER_DAY, TICKS_PER_MONTH } from './clock';
import { roadSearch, tracePath, type Search } from './roads';
import { sendLeavers } from './settlers';
import { TILE_ROAD, type Building, type SimState, type Walker } from './state';
import { CARRIER_SPEED, centre, newWalker, plotCentre, position, setPath } from './walk';

/** How far by road from her fountain a water carrier ever goes: her reach. */
export const CARRIER_RANGE = 32;
/** Road tiles not yet walked this round that she walks out on (wandering within her reach) before she turns for home. */
export const CARRIER_WALK = 48;
/** However much of it was road already walked, she turns for home after this many times CARRIER_WALK tiles. */
const WALK_LIMIT = 2;
/** How long a home keeps its water after she passes (four months). */
export const WATER_LASTS = 4 * TICKS_PER_MONTH;
/** How long after its water runs out a hut goes back to a tent (a month). */
export const HUT_DECLINE_AFTER = TICKS_PER_MONTH;
/** Ticks before the first carrier sets off from a new fountain. */
export const FIRST_CARRIER = 20;
/** Ticks a carrier rests at home before the next round. */
export const CARRIER_REST = 30;
/** Level of a hut. */
export const HUT = 2;

/** Road tiles beside a building, in tile order. */
export function roadsBeside(s: SimState, size: number, b: Building): number[] {
  return plotNeighbours(size, b.x, b.z).filter((t) => s.tiles[t] === TILE_ROAD);
}

/** The spot on a fountain's rim facing a road tile beside it, where the carrier steps out and back in. */
function door(size: number, f: Building, road: number): [number, number] {
  const [rx, rz] = centre(size, road);
  const [fx, fz] = plotCentre(f);
  return [rx + (fx - rx) * 0.55, rz + (fz - rz) * 0.55];
}

/**
 * How far by road each tile is from one fountain's roadside, worked out once
 * per fountain and road layout (a pure function of the state, cached outside it).
 */
const reachCache = new WeakMap<SimState, Map<number, { rev: number; dist: Int32Array }>>();
function fountainDist(s: SimState, size: number, f: Building): Int32Array {
  let m = reachCache.get(s);
  if (!m) {
    m = new Map();
    reachCache.set(s, m);
  }
  const hit = m.get(f.id);
  if (hit && hit.rev === s.tilesRev) return hit.dist;
  const dist = roadSearch(s, size, roadsBeside(s, size, f)).dist;
  m.set(f.id, { rev: s.tilesRev, dist });
  return dist;
}

/** How far by road each road tile is from the nearest fountain (dist -1: no fountain reaches it). */
export function waterReach(s: SimState, size: number): Search {
  const sources: number[] = [];
  for (const b of s.buildings) if (b.kind === 'fountain') sources.push(...roadsBeside(s, size, b));
  return roadSearch(s, size, sources);
}

/** The fewest road steps from a building's roadside to a fountain, or -1. */
export function stepsToFountain(reach: Search, s: SimState, size: number, b: Building): number {
  let best = -1;
  for (const t of roadsBeside(s, size, b)) {
    const d = reach.dist[t];
    if (d >= 0 && (best < 0 || d < best)) best = d;
  }
  return best;
}

/** Fountains: send out a carrier when one is due. */
export function stepFountains(s: SimState, map: CoastMap): void {
  const size = map.size;
  for (const f of s.buildings) {
    if (f.kind !== 'fountain' || f.walker !== 0) continue;
    if (--f.clock > 0) continue;
    const roads = roadsBeside(s, size, f);
    if (roads.length === 0) {
      // No road to walk: look again in a little while.
      f.clock = CARRIER_REST;
      continue;
    }
    const start = roads[f.turn % roads.length];
    f.turn++;
    const w = newWalker(s, 'water', 1);
    w.origin = f.id;
    w.since = s.tick;
    const [dx, dz] = door(size, f, start);
    const [sx, sz] = centre(size, start);
    setPath(w, [
      [dx, dz, -1],
      [sx, sz, start],
    ]);
    f.walker = w.id;
    s.walkers.push(w);
  }
}

/** Give water to every home beside a road tile. */
function serve(s: SimState, size: number, t: number): void {
  const tx = t % size;
  const until = s.tick + WATER_LASTS;
  for (const u of [t - size, t - 1, t + 1, t + size]) {
    if (u < 0 || u >= size * size) continue;
    if ((u === t - 1 && tx === 0) || (u === t + 1 && tx === size - 1)) continue;
    const id = s.tiles[u];
    if (id <= 0) continue;
    const b = findBuilding(s, id);
    if (b && b.kind === 'home' && b.waterUntil < until) b.waterUntil = until;
  }
}

/** Road tiles joined to a tile, in a fixed order (north, west, east, south). */
function roadNeighbours(s: SimState, size: number, t: number): number[] {
  const tx = t % size;
  const out: number[] = [];
  if (t >= size && s.tiles[t - size] === TILE_ROAD) out.push(t - size);
  if (tx > 0 && s.tiles[t - 1] === TILE_ROAD) out.push(t - 1);
  if (tx < size - 1 && s.tiles[t + 1] === TILE_ROAD) out.push(t + 1);
  if (t < size * (size - 1) && s.tiles[t + size] === TILE_ROAD) out.push(t + size);
  return out;
}


/** How far ahead (road tiles) she looks at a junction for the homes that need her most. */
const LOOK_AHEAD = 16;

/** The lowest water among lived-in homes beside a road tile (Infinity if none). */
function thirstiest(s: SimState, size: number, t: number): number {
  const tx = t % size;
  let low = Infinity;
  for (const u of [t - size, t - 1, t + 1, t + size]) {
    if (u < 0 || u >= size * size) continue;
    if ((u === t - 1 && tx === 0) || (u === t + 1 && tx === size - 1)) continue;
    const id = s.tiles[u];
    if (id <= 0) continue;
    const b = findBuilding(s, id);
    if (b && b.kind === 'home' && b.level > 0 && b.waterUntil < low) low = b.waterUntil;
  }
  return low;
}

/**
 * How badly the homes down one way from a junction need water: the lowest
 * water among lived-in homes beside the road tiles within LOOK_AHEAD steps of
 * `start` (not going back through the junction, and within her reach);
 * Infinity if there are no homes that way.
 */
function need(s: SimState, size: number, dist: Int32Array, junction: number, start: number): number {
  let low = thirstiest(s, size, start);
  const seen = new Set<number>([junction, start]);
  let front = [start];
  for (let d = 1; d < LOOK_AHEAD && front.length; d++) {
    const next: number[] = [];
    for (const t of front) {
      for (const u of roadNeighbours(s, size, t)) {
        if (seen.has(u) || dist[u] < 0 || dist[u] > CARRIER_RANGE) continue;
        seen.add(u);
        next.push(u);
        low = Math.min(low, thirstiest(s, size, u));
      }
    }
    front = next;
  }
  return low;
}

/** Which way a step goes: 1 north, 2 west, 3 east, 4 south. */
const dirOf = (size: number, from: number, to: number): number => (to === from - size ? 1 : to === from - 1 ? 2 : to === from + 1 ? 3 : 4);

/**
 * Where she goes from road tile `cur`, having come from `prev` (-1 if from her
 * fountain or a turn), never beyond her reach: on along the road; round at a
 * dead end, or where no homes lie ahead but some lie behind; and at a junction the way to the homes whose water is running
 * lowest; if that is the same every way, the next way round from the one a
 * carrier last took there. -1 if there is no road at all.
 */
function chooseNext(s: SimState, size: number, f: Building, cur: number, prev: number): number {
  const dist = fountainDist(s, size, f);
  const all = roadNeighbours(s, size, cur).filter((t) => dist[t] >= 0 && dist[t] <= CARRIER_RANGE);
  const on = all.filter((t) => t !== prev);
  if (on.length === 0) return all.length ? all[0] : -1;
  const needs = on.map((t) => need(s, size, dist, cur, t));
  const most = Math.min(...needs);
  // No homes ahead, but some behind: don't walk an empty road, turn back.
  if (most === Infinity && all.length > on.length && need(s, size, dist, cur, prev) < Infinity) return prev;
  if (on.length === 1) return on[0];
  const pool = on.filter((_, i) => needs[i] === most);
  const last = s.exits[cur];
  // The first way (in N, W, E, S order) after the last one taken, wrapping round.
  let pick = pool[0];
  for (const t of pool) {
    if (dirOf(size, cur, t) > last) {
      pick = t;
      break;
    }
  }
  s.exits[cur] = dirOf(size, cur, pick);
  return pick;
}

/** Turn for home from road tile `cur` (standing at `here`): the shortest road back to her fountain. False if there is none. */
function headHome(s: SimState, size: number, w: Walker, f: Building, cur: number, here: [number, number]): boolean {
  const roads = roadsBeside(s, size, f);
  if (roads.length === 0 || s.tiles[cur] !== TILE_ROAD) return false;
  const search = roadSearch(s, size, roads);
  if (search.dist[cur] < 0) return false;
  // From the fountain's side to here; walk it the other way.
  const way = tracePath(search, cur).reverse();
  const pts: Array<[number, number, number]> = [[here[0], here[1], -1]];
  for (const t of way) {
    const [x, z] = centre(size, t);
    pts.push([x, z, t]);
  }
  const [dx, dz] = door(size, f, way[way.length - 1]);
  pts.push([dx, dz, -1]);
  w.back = true;
  setPath(w, pts);
  return true;
}

/** She is gone (home, or lost): the fountain rests, then sends another. */
function done(f: Building | undefined): false {
  if (f) {
    f.walker = 0;
    f.clock = CARRIER_REST;
  }
  return false;
}

/** Is the next waypoint still a road? */
function aheadOk(s: SimState, w: Walker): boolean {
  const next = w.tiles[w.seg + 1];
  return next === undefined || next < 0 || s.tiles[next] === TILE_ROAD;
}

/** The road ahead was cut: turn round to the tile behind, or head home another way. */
function detour(s: SimState, size: number, w: Walker, f: Building): boolean {
  const here = position(w);
  let cur = w.tiles[w.seg];
  for (let k = w.seg; cur < 0 && k > 0; k--) cur = w.tiles[k - 1];
  if (cur < 0 || s.tiles[cur] !== TILE_ROAD) return false;
  if (w.back) return headHome(s, size, w, f, cur, here);
  const [x, z] = centre(size, cur);
  setPath(w, [
    [here[0], here[1], -1],
    [x, z, cur],
  ]);
  return true;
}

/** Move a water carrier one tick along. Returns false when she is done for this round. */
export function moveCarrier(s: SimState, map: CoastMap, w: Walker): boolean {
  const size = map.size;
  const f = findBuilding(s, w.origin);
  if (!f || f.kind !== 'fountain') return false;
  if (!aheadOk(s, w) && !detour(s, size, w, f)) return done(f);
  let move = CARRIER_SPEED;
  for (let guard = 0; guard < 8 && move > 0; guard++) {
    const last = w.path.length / 2 - 1;
    const i = w.seg * 2;
    const len = Math.hypot(w.path[i + 2] - w.path[i], w.path[i + 3] - w.path[i + 1]);
    if (w.along + move < len) {
      w.along += move;
      w.walked += move;
      break;
    }
    const step = len - w.along;
    move -= step;
    w.walked += step;
    w.seg++;
    w.along = 0;
    const t = w.tiles[w.seg];
    // Road nobody has walked yet this round counts towards her round; going back over it hardly does.
    const fresh = t >= 0 && s.carried[t] < w.since;
    if (t >= 0) {
      serve(s, size, t);
      s.carried[t] = s.tick;
    }
    if (w.seg < last) {
      if (!aheadOk(s, w) && !detour(s, size, w, f)) return done(f);
      continue;
    }
    // The end of this leg.
    if (w.back) return done(f);
    if (t < 0) return done(f);
    const prev = w.seg > 0 ? w.tiles[w.seg - 1] : -1;
    if (prev >= 0 && fresh) w.steps++;
    const [x, z] = centre(size, t);
    if (w.steps >= CARRIER_WALK || w.walked >= WALK_LIMIT * CARRIER_WALK) {
      if (!headHome(s, size, w, f, t, [x, z])) return done(f);
      continue;
    }
    const next = chooseNext(s, size, f, t, prev);
    if (next < 0) {
      if (!headHome(s, size, w, f, t, [x, z])) return done(f);
      continue;
    }
    const [nx, nz] = centre(size, next);
    setPath(w, [
      [x, z, t],
      [nx, nz, next],
    ]);
  }
  return true;
}

/**
 * Homes change with what reaches them, each looked at once a day (staggered
 * by id): a tent with people and water becomes a hut; a hut whose water ran
 * out a month ago goes back to a tent, and the people it can't hold leave.
 */
export function stepHouses(s: SimState, map: CoastMap): void {
  let changed = false;
  for (const b of s.buildings) {
    if (b.kind !== 'home' || b.level === 0 || (s.tick + b.id) % TICKS_PER_DAY !== 0) continue;
    const wet = b.waterUntil > s.tick;
    if (b.level < HUT && wet && b.people > 0) {
      b.level = HUT;
      b.since = s.tick;
      changed = true;
    } else if (b.level === HUT && !wet && s.tick - b.waterUntil >= HUT_DECLINE_AFTER) {
      b.level = HUT - 1;
      b.since = s.tick;
      changed = true;
      const extra = b.people - capacity(b);
      if (extra > 0) {
        b.people -= extra;
        s.left += extra;
        sendLeavers(s, map, extra, [b.x + PLOT_SIZE / 2, b.z + PLOT_SIZE / 2], plotNeighbours(map.size, b.x, b.z));
      }
    }
  }
  if (changed) {
    recountPopulation(s);
    s.rev++;
  }
}

export { HOME_CAPACITY };
