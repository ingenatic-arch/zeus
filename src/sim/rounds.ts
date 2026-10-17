/**
 * Service walkers' rounds, shared by the water carrier, the food vendor, the
 * priestess and the actor. A service walker steps out of her
 * building onto a road beside it and walks the roads a tile at a time, never
 * further than her range by road from her building. At a junction she heads
 * for the home in her reach that needs her soonest (counting the walk there):
 * a home whose level needs her, by when it would go down without her; one
 * that only wants her to grow, by when its supply runs out; a home she would
 * reach too late to save only when nobody else needs her (see NeedScore), taking the next way round from the last walker's when it makes no
 * difference; she turns round at dead ends, at the edge of her reach, and
 * where no homes that want her lie ahead but some lie behind. After `walk`
 * tiles of road she hadn't walked yet this round (or twice that in all) she
 * heads home by the shortest road. Every road tile she stands on, she serves
 * the homes beside it.
 */
import type { CoastMap } from '../map/bake';
import { around, centreOf, findBuilding } from './buildings';
import { roadSearch, tracePath } from './roads';
import { TILE_ROAD, type Building, type ServiceRecord, type SimState, type Walker } from './state';
import { centre, newWalker, position, roadNeighbours, setPath, wayNeeds, type NeedDue, type NeedScore } from './walk';

export interface ServiceSpec {
  /** Her own record of the streets. */
  record(s: SimState): ServiceRecord;
  /** How far by road from her building she ever goes. */
  range: number;
  /** Road tiles she hadn't walked yet this round that she walks before turning for home. */
  walk: number;
  /** Tiles a tick. */
  speed: number;
  /** How urgently each home wants her (Infinity: it doesn't want her); see NeedScore. */
  score: NeedScore;
  /** When each home would go down for want of her (Infinity: its level doesn't need her). */
  due: NeedDue;
  /** Scores and dues that depend on what her building has to give (the food vendor's stall); `score` and `due` if absent. */
  scoreFor?(b: Building): { score: NeedScore; due: NeedDue };
  /** Serve the homes beside road tile `t` (of `map`). */
  serve(s: SimState, size: number, t: number, w: Walker, map: CoastMap): void;
  /** Ticks her building waits after she is back (or lost) before sending the next. */
  rest(b: Building): number;
  /** Whatever she does when her round is over (back, or lost): the tax collector hands in his satchel. */
  finish?(s: SimState, w: Walker): void;
  /**
   * A walker with her own clock on her building (a stall's vendor at the
   * agora, beside the food vendor): sets it when her round is over, in place
   * of the building's own `walker` and `clock`.
   */
  rested?(b: Building): void;
}

/** However much of it was road already walked, she turns for home after this many times `walk` tiles. */
const WALK_LIMIT = 2;

/** Road tiles beside a building, in tile order. */
export function roadsBeside(s: SimState, size: number, b: Building): number[] {
  return around(size, b).filter((t) => s.tiles[t] === TILE_ROAD);
}

/** The spot on a building's edge facing a road tile beside it, where its walkers step out and back in. */
export function door(size: number, b: Building, road: number): [number, number] {
  const [rx, rz] = centre(size, road);
  const [fx, fz] = centreOf(b);
  return [rx + (fx - rx) * 0.55, rz + (fz - rz) * 0.55];
}

/**
 * How far by road each tile is from one building's roadside, worked out once
 * per building and road layout (a pure function of the state, cached outside it).
 */
const reachCache = new WeakMap<SimState, Map<number, { rev: number; dist: Int32Array }>>();
export function distFrom(s: SimState, size: number, b: Building): Int32Array {
  let m = reachCache.get(s);
  if (!m) {
    m = new Map();
    reachCache.set(s, m);
  }
  const hit = m.get(b.id);
  if (hit && hit.rev === s.tilesRev) return hit.dist;
  const dist = roadSearch(s, size, roadsBeside(s, size, b)).dist;
  m.set(b.id, { rev: s.tilesRev, dist });
  return dist;
}

/**
 * Send a service walker out from building `b` onto the next of its roadside
 * tiles in turn. False if no road leads out. `own`: she keeps her own clock
 * (see ServiceSpec.rested), so the building's `walker` is left alone.
 */
export function sendOut(s: SimState, size: number, b: Building, kind: Walker['kind'], own = false): boolean {
  const roads = roadsBeside(s, size, b);
  if (roads.length === 0) return false;
  const start = roads[b.turn % roads.length];
  b.turn++;
  const w = newWalker(s, kind, 1);
  w.origin = b.id;
  w.since = s.tick;
  const [dx, dz] = door(size, b, start);
  const [sx, sz] = centre(size, start);
  setPath(w, [
    [dx, dz, -1],
    [sx, sz, start],
  ]);
  if (!own) b.walker = w.id;
  s.walkers.push(w);
  return true;
}

/** Which way a step goes: 1 north, 2 west, 3 east, 4 south. */
const dirOf = (size: number, from: number, to: number): number => (to === from - size ? 1 : to === from - 1 ? 2 : to === from + 1 ? 3 : 4);

/**
 * Where she goes from road tile `cur`, having come from `prev` (-1 if from her
 * building or a turn), never beyond her reach: on along the road; round at a
 * dead end, or where no homes that want her lie ahead but some lie behind; and
 * at a junction the way to the home that needs her soonest (counting the walk
 * there; see NeedScore), anywhere in her reach; if that is the same every way, the
 * next way round from the one her service last took there. -1 if there is no road at all.
 */
function chooseNext(s: SimState, size: number, spec: ServiceSpec, b: Building, cur: number, prev: number): number {
  const dist = distFrom(s, size, b);
  const range = spec.range;
  const tat = 1 / spec.speed;
  const all = roadNeighbours(s, size, cur).filter((t) => dist[t] >= 0 && dist[t] <= range);
  const on = all.filter((t) => t !== prev);
  if (on.length === 0) return all.length ? all[0] : -1;
  const behind = all.length > on.length;
  const sc = spec.scoreFor ? spec.scoreFor(b) : spec;
  const needs = (ways: number[], firstOnly = false): number[] => wayNeeds(s, size, dist, range, sc.score, tat, cur, ways, firstOnly, sc.due);
  if (on.length === 1) {
    // A plain stretch of road: on, unless it leads only to empty road and there are homes behind.
    if (!behind || needs(on, true)[0] < Infinity) return on[0];
    return needs([prev], true)[0] < Infinity ? prev : on[0];
  }
  // A junction: every way at once, the way back too, so that homes behind her
  // count for the way back rather than for a long way round.
  const got = needs(behind ? [...on, prev] : on);
  const ahead = got.slice(0, on.length);
  const most = Math.min(...ahead);
  if (most === Infinity && behind && got[on.length] < Infinity) return prev;
  const pool = on.filter((_, i) => ahead[i] === most);
  const exits = spec.record(s).exits;
  const last = exits[cur];
  // The first way (in N, W, E, S order) after the last one taken, wrapping round.
  let pick = pool[0];
  for (const t of pool) {
    if (dirOf(size, cur, t) > last) {
      pick = t;
      break;
    }
  }
  exits[cur] = dirOf(size, cur, pick);
  return pick;
}

/** Turn for home from road tile `cur` (standing at `here`): the shortest road back to her building. False if there is none. */
export function headHome(s: SimState, size: number, w: Walker, b: Building, cur: number, here: [number, number]): boolean {
  const roads = roadsBeside(s, size, b);
  if (roads.length === 0 || s.tiles[cur] !== TILE_ROAD) return false;
  const search = roadSearch(s, size, roads);
  if (search.dist[cur] < 0) return false;
  // From the building's side to here; walk it the other way.
  const way = tracePath(search, cur).reverse();
  const pts: Array<[number, number, number]> = [[here[0], here[1], -1]];
  for (const t of way) {
    const [x, z] = centre(size, t);
    pts.push([x, z, t]);
  }
  const [dx, dz] = door(size, b, way[way.length - 1]);
  pts.push([dx, dz, -1]);
  w.back = true;
  setPath(w, pts);
  return true;
}

/** She is gone (home, or lost): her building rests, then sends another. */
export function endRound(spec: ServiceSpec, b: Building | undefined): false {
  return done(spec, b);
}

function done(spec: ServiceSpec, b: Building | undefined): false {
  if (b && spec.rested) spec.rested(b);
  else if (b) {
    b.walker = 0;
    b.clock = spec.rest(b);
  }
  return false;
}

/** Is the next waypoint still a road? */
function aheadOk(s: SimState, w: Walker): boolean {
  const next = w.tiles[w.seg + 1];
  return next === undefined || next < 0 || s.tiles[next] === TILE_ROAD;
}

/** The road ahead was cut: turn round to the tile behind, or head home another way. */
function detour(s: SimState, size: number, w: Walker, b: Building): boolean {
  const here = position(w);
  let cur = w.tiles[w.seg];
  for (let k = w.seg; cur < 0 && k > 0; k--) cur = w.tiles[k - 1];
  if (cur < 0 || s.tiles[cur] !== TILE_ROAD) return false;
  if (w.back) return headHome(s, size, w, b, cur, here);
  const [x, z] = centre(size, cur);
  setPath(w, [
    [here[0], here[1], -1],
    [x, z, cur],
  ]);
  return true;
}

/** Move a service walker one tick along. Returns false when she is done for this round. */
export function moveRounds(s: SimState, map: CoastMap, w: Walker, spec: ServiceSpec, kind: Building['kind']): boolean {
  const size = map.size;
  const b = findBuilding(s, w.origin);
  if (!b || b.kind !== kind) return false;
  const end = (): false => {
    spec.finish?.(s, w);
    return done(spec, b);
  };
  if (!aheadOk(s, w) && !detour(s, size, w, b)) return end();
  const walked = spec.record(s).walked;
  let move = spec.speed;
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
    // Road she hasn't walked yet this round counts towards her round; going back over it hardly does.
    const fresh = t >= 0 && !w.trail.includes(t);
    if (t >= 0) {
      spec.serve(s, size, t, w, map);
      walked[t] = s.tick;
      if (fresh) w.trail.push(t);
    }
    if (w.seg < last) {
      if (!aheadOk(s, w) && !detour(s, size, w, b)) return end();
      continue;
    }
    // The end of this leg.
    if (w.back) return end();
    if (t < 0) return end();
    const prev = w.seg > 0 ? w.tiles[w.seg - 1] : -1;
    if (prev >= 0 && fresh) w.steps++;
    const [x, z] = centre(size, t);
    if (w.steps >= spec.walk || w.walked >= WALK_LIMIT * spec.walk) {
      if (!headHome(s, size, w, b, t, [x, z])) return end();
      continue;
    }
    const next = chooseNext(s, size, spec, b, t, prev);
    if (next < 0) {
      if (!headHome(s, size, w, b, t, [x, z])) return end();
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
