/**
 * The wild: herds of deer on the hills and boar in the woods, roaming their
 * home ranges off the roads, and the way people walk across country (the
 * hunters: see hunt.ts).
 *
 * A herd is a light thing in the state: where it stands, where it is heading
 * and how many head it has. It grazes a while, then ambles to another spot in
 * its range, on open ground only: never onto water or the river's wet banks,
 * ground too steep to walk (cliffs), roads or buildings, nor across them on
 * the way. A herd whose ground is built over moves off. Hunted, it loses a
 * head and bolts a little way; it grows back a head at a time up to its
 * full size, slower the thinner it is (`regrowIn`), so a valley hunted hard
 * goes short for a season or more. Its wandering draws on its own generator (`s.wild`), so the
 * wild never shifts anything else that happens.
 *
 * Paths across country are an A* search over the map's tiles, eight ways
 * with no corner cutting, through ground a person can walk (dry ground a road
 * could take, roads and bridges, never buildings), pruned to straight runs.
 * Pure functions of the map and the state; the scratch arrays live outside it.
 */
import type { CoastMap } from '../map/bake';
import { HERDS } from '../map/coast';
import { Ground, mapIndex } from './build';
import { TICKS_PER_DAY } from './clock';
import { nextFloat, nextInt, seedRng, type RngState } from './rng';
import { TILE_EMPTY, TILE_ROAD, type Herd, type SimState } from './state';

/** A herd one short of full grows back a head in about this long (ten days); a thinner herd takes longer. */
export const REGROW = 10 * TICKS_PER_DAY;
/** How long a herd of its size takes to grow back a head: the fewer left, the slower (a herd of 2 out of 7 takes 35 days). */
export const regrowIn = (h: Herd): number => Math.round((REGROW * h.full) / Math.max(1, h.head));
/** Hunters never take a herd's last two head, so no herd dies out. */
export const MIN_HEAD = 2;
/** How fast a herd ambles, and how fast it bolts, in tiles a tick. */
export const AMBLE = 0.03;
export const BOLT = 0.2;
/** How long a herd runs after a kill. */
export const BOLT_TIME = 40;
/** Ticks a herd grazes before moving on: at least GRAZE, up to GRAZE + GRAZE_SPAN. */
export const GRAZE = 60;
export const GRAZE_SPAN = 140;
/** The longest single amble, in tiles. */
const LEG = 7;

/** The generator for a city's herds (apart from the main one and the people's). */
export const wildRng = (seed: number): RngState => seedRng((seed ^ 0x3d1e_a5e7) >>> 0);

/** How people name a herd: "the deer below the crags". */
export function herdName(h: Herd): string {
  return `the ${h.kind} ${h.place}`;
}

/** Ground a road could take (not water, the river's banks, or cliffs). */
const firm = (g: number): boolean => g === Ground.Ok || g === Ground.SteepForHome;

/** Can a herd stand on this tile: open ground with nothing built on it, and firm ground all round (so its animals stay out of the water). */
export function herdGround(map: CoastMap, s: SimState, t: number): boolean {
  const n = map.size;
  if (t < 0 || t >= n * n) return false;
  const g = mapIndex(map).ground;
  if (!firm(g[t]) || s.tiles[t] !== TILE_EMPTY) return false;
  const tx = t % n;
  if (tx === 0 || tx === n - 1 || t < n || t >= n * (n - 1)) return false;
  return firm(g[t - 1]) && firm(g[t + 1]) && firm(g[t - n]) && firm(g[t + n]);
}

/** Can a person walk across this tile: firm open ground, a road, or a bridge; never a building. */
export function walkable(map: CoastMap, s: SimState, t: number): boolean {
  const on = s.tiles[t];
  if (on === TILE_ROAD) return true;
  if (on !== TILE_EMPTY) return false;
  return firm(mapIndex(map).ground[t]);
}

/**
 * Is the straight line between two points (world units) over tiles that all
 * pass `ok`? Every tile the line touches counts, a corner it grazes too (both
 * tiles beside the corner), so a walker on it never clips a building.
 */
export function lineClear(map: CoastMap, s: SimState, x0: number, z0: number, x1: number, z1: number, ok: (map: CoastMap, s: SimState, t: number) => boolean): boolean {
  const n = map.size;
  const test = (x: number, z: number): boolean => x >= 0 && z >= 0 && x < n && z < n && ok(map, s, z * n + x);
  let x = Math.floor(x0);
  let z = Math.floor(z0);
  const xe = Math.floor(x1);
  const ze = Math.floor(z1);
  if (!test(x, z)) return false;
  const dx = x1 - x0;
  const dz = z1 - z0;
  const sx = dx > 0 ? 1 : -1;
  const sz = dz > 0 ? 1 : -1;
  // How far along the line (0 to 1) the next tile edge across x, and across z, comes; and the step between edges.
  const ax = dx !== 0 ? Math.abs(1 / dx) : Infinity;
  const az = dz !== 0 ? Math.abs(1 / dz) : Infinity;
  let tx = dx !== 0 ? (dx > 0 ? x + 1 - x0 : x0 - x) * ax : Infinity;
  let tz = dz !== 0 ? (dz > 0 ? z + 1 - z0 : z0 - z) * az : Infinity;
  const EPS = 1e-9;
  for (let guard = 0; guard < 4 * n && (x !== xe || z !== ze); guard++) {
    if (Math.min(tx, tz) > 1) break;
    if (Math.abs(tx - tz) < EPS) {
      // Through a corner: both tiles beside it, then the one across.
      if (!test(x + sx, z) || !test(x, z + sz)) return false;
      x += sx;
      z += sz;
      tx += ax;
      tz += az;
    } else if (tx < tz) {
      x += sx;
      tx += ax;
    } else {
      z += sz;
      tz += az;
    }
    if (!test(x, z)) return false;
  }
  return true;
}

/** The nearest tile to (x, z), within `reach` tiles, where a herd can stand (-1: none). */
function nearestGround(map: CoastMap, s: SimState, x: number, z: number, reach: number): number {
  const n = map.size;
  const cx = Math.floor(x);
  const cz = Math.floor(z);
  for (let r = 0; r <= reach; r++) {
    let best = -1;
    let bd = Infinity;
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const tx = cx + dx;
        const tz = cz + dz;
        if (tx < 0 || tz < 0 || tx >= n || tz >= n) continue;
        const t = tz * n + tx;
        if (!herdGround(map, s, t)) continue;
        const d = (tx + 0.5 - x) ** 2 + (tz + 0.5 - z) ** 2;
        if (d < bd) {
          bd = d;
          best = t;
        }
      }
    }
    if (best >= 0) return best;
  }
  return -1;
}

/** The herds, whole, each on open ground nearest the middle of its range. A pure function of the map (and what is built). */
export function freshHerds(map: CoastMap, s: SimState): Herd[] {
  const n = map.size;
  return HERDS.map((h) => {
    const t = nearestGround(map, s, h.x, h.z, h.r);
    const x = t >= 0 ? (t % n) + 0.5 : h.x;
    const z = t >= 0 ? Math.floor(t / n) + 0.5 : h.z;
    return { kind: h.kind, place: h.place, hx: h.x, hz: h.z, r: h.r, x, z, tx: x, tz: z, head: h.head, full: h.head, clock: GRAZE, grow: REGROW, fled: -BOLT_TIME };
  });
}

/** Is the herd on its way somewhere? */
export const moving = (h: Herd): boolean => h.x !== h.tx || h.z !== h.tz;

/** Is the herd running from a hunter? */
export const fleeing = (s: SimState, h: Herd): boolean => s.tick - h.fled < BOLT_TIME && moving(h);

/** Pick another spot in its range to amble to, with a clear way there (or stay put). */
function wander(s: SimState, map: CoastMap, h: Herd): void {
  const r = s.wild;
  for (let k = 0; k < 6; k++) {
    const a = nextFloat(r) * Math.PI * 2;
    const d = Math.sqrt(nextFloat(r)) * h.r;
    let x = h.hx + Math.cos(a) * d;
    let z = h.hz + Math.sin(a) * d;
    // Not too far in one go.
    const far = Math.hypot(x - h.x, z - h.z);
    if (far > LEG) {
      x = h.x + ((x - h.x) * LEG) / far;
      z = h.z + ((z - h.z) * LEG) / far;
    }
    const t = Math.floor(z) * map.size + Math.floor(x);
    if (!herdGround(map, s, t) || !lineClear(map, s, h.x, h.z, x, z, herdGround)) continue;
    h.tx = x;
    h.tz = z;
    return;
  }
}

/** A hunter has taken one of the herd: it bolts a little way from him. */
export function bolt(s: SimState, map: CoastMap, h: Herd, fromX: number, fromZ: number): void {
  h.fled = s.tick;
  const away = Math.atan2(h.z - fromZ, h.x - fromX);
  const d = 5 + nextFloat(s.wild) * 3;
  for (const turn of [0, 0.6, -0.6, 1.2, -1.2, 2]) {
    const x = h.x + Math.cos(away + turn) * d;
    const z = h.z + Math.sin(away + turn) * d;
    if (Math.hypot(x - h.hx, z - h.hz) > h.r + 4) continue;
    const t = Math.floor(z) * map.size + Math.floor(x);
    if (!herdGround(map, s, t) || !lineClear(map, s, h.x, h.z, x, z, herdGround)) continue;
    h.tx = x;
    h.tz = z;
    break;
  }
  h.clock = GRAZE + nextInt(s.wild, GRAZE_SPAN);
}

/** The herds graze, wander, flee and grow back, a tick at a time. */
export function stepWild(s: SimState, map: CoastMap): void {
  const n = map.size;
  for (let i = 0; i < s.herds.length; i++) {
    const h = s.herds[i];
    if (h.head < h.full) {
      if (--h.grow <= 0) {
        h.head++;
        h.grow = regrowIn(h);
      }
    } else h.grow = REGROW;
    if (moving(h)) {
      const speed = s.tick - h.fled < BOLT_TIME ? BOLT : AMBLE;
      const dx = h.tx - h.x;
      const dz = h.tz - h.z;
      const d = Math.hypot(dx, dz);
      if (d <= speed) {
        h.x = h.tx;
        h.z = h.tz;
      } else {
        const x = h.x + (dx / d) * speed;
        const z = h.z + (dz / d) * speed;
        // Something was built in its way: it stops and thinks again.
        if (!herdGround(map, s, Math.floor(z) * n + Math.floor(x)) && herdGround(map, s, Math.floor(h.z) * n + Math.floor(h.x))) {
          h.tx = h.x;
          h.tz = h.z;
          h.clock = 1;
        } else {
          h.x = x;
          h.z = z;
        }
      }
      continue;
    }
    // Its ground built over: it moves off to the nearest open ground.
    if ((s.tick + i) % 10 === 0 && !herdGround(map, s, Math.floor(h.z) * n + Math.floor(h.x))) {
      const t = nearestGround(map, s, h.x, h.z, 12);
      if (t >= 0) {
        h.tx = (t % n) + 0.5;
        h.tz = Math.floor(t / n) + 0.5;
        continue;
      }
    }
    if (--h.clock > 0) continue;
    h.clock = GRAZE + nextInt(s.wild, GRAZE_SPAN);
    wander(s, map, h);
  }
}

// ---------------------------------------------------------------------------
// Across country.

let gScore = new Float64Array(0);
let parent = new Int32Array(0);
let seen = new Int32Array(0);
let shut = new Int32Array(0);
let heapNode = new Int32Array(0);
let heapKey = new Float64Array(0);
let gen = 0;

const SQRT2 = Math.SQRT2;

/**
 * The shortest way on foot from any of `starts` to `goal` (tiles), across
 * country, as the tiles walked in order (start first), or null if there is
 * none within `limit` tiles looked at. Eight ways, never cutting the corner
 * of something that can't be walked.
 */
export function offRoadPath(map: CoastMap, s: SimState, starts: readonly number[], goal: number, limit = 20000): number[] | null {
  const n = map.size;
  const total = n * n;
  if (goal < 0 || goal >= total || !walkable(map, s, goal)) return null;
  if (seen.length !== total) {
    gScore = new Float64Array(total);
    parent = new Int32Array(total);
    seen = new Int32Array(total);
    shut = new Int32Array(total);
    heapNode = new Int32Array(total * 8);
    heapKey = new Float64Array(total * 8);
    gen = 0;
  }
  gen++;
  const gx = goal % n;
  const gz = (goal - gx) / n;
  const h = (t: number): number => {
    const dx = Math.abs((t % n) - gx);
    const dz = Math.abs(Math.floor(t / n) - gz);
    return Math.max(dx, dz) + (SQRT2 - 1) * Math.min(dx, dz);
  };
  let size = 0;
  const push = (t: number, key: number): void => {
    let i = size++;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heapKey[p] <= key) break;
      heapNode[i] = heapNode[p];
      heapKey[i] = heapKey[p];
      i = p;
    }
    heapNode[i] = t;
    heapKey[i] = key;
  };
  const pop = (): number => {
    const top = heapNode[0];
    const lastNode = heapNode[--size];
    const lastKey = heapKey[size];
    let i = 0;
    while (true) {
      let c = 2 * i + 1;
      if (c >= size) break;
      if (c + 1 < size && heapKey[c + 1] < heapKey[c]) c++;
      if (heapKey[c] >= lastKey) break;
      heapNode[i] = heapNode[c];
      heapKey[i] = heapKey[c];
      i = c;
    }
    heapNode[i] = lastNode;
    heapKey[i] = lastKey;
    return top;
  };
  for (const t of starts) {
    if (t < 0 || t >= total || !walkable(map, s, t) || seen[t] === gen) continue;
    seen[t] = gen;
    gScore[t] = 0;
    parent[t] = -1;
    push(t, h(t));
  }
  let looked = 0;
  while (size > 0) {
    const t = pop();
    if (shut[t] === gen) continue;
    shut[t] = gen;
    if (t === goal) {
      const out: number[] = [];
      for (let u = goal; u >= 0; u = parent[u]) out.push(u);
      return out.reverse();
    }
    if (++looked > limit || size + 8 >= heapNode.length) return null;
    const tx = t % n;
    const tz = (t - tx) / n;
    const base = gScore[t];
    // Orthogonal ways first (N, W, E, S), then the diagonals between two open ones.
    const open = [tz > 0 && walkable(map, s, t - n), tx > 0 && walkable(map, s, t - 1), tx < n - 1 && walkable(map, s, t + 1), tz < n - 1 && walkable(map, s, t + n)];
    const ways: Array<[number, number, boolean]> = [
      [t - n, 1, open[0]],
      [t - 1, 1, open[1]],
      [t + 1, 1, open[2]],
      [t + n, 1, open[3]],
      [t - n - 1, SQRT2, open[0] && open[1]],
      [t - n + 1, SQRT2, open[0] && open[2]],
      [t + n - 1, SQRT2, open[3] && open[1]],
      [t + n + 1, SQRT2, open[3] && open[2]],
    ];
    for (const [u, cost, ok] of ways) {
      if (!ok || shut[u] === gen) continue;
      if (cost !== 1 && !walkable(map, s, u)) continue;
      const g = base + cost;
      if (seen[u] === gen && gScore[u] <= g) continue;
      seen[u] = gen;
      gScore[u] = g;
      parent[u] = t;
      push(u, g + h(u));
    }
  }
  return null;
}

/** A walked path of tiles as waypoints (tile centres, world units), pruned to straight runs where the line between is clear. */
export function prunePath(map: CoastMap, s: SimState, tiles: readonly number[]): Array<[number, number]> {
  const n = map.size;
  const c = (t: number): [number, number] => [(t % n) + 0.5, Math.floor(t / n) + 0.5];
  const out: Array<[number, number]> = [];
  if (tiles.length === 0) return out;
  let i = 0;
  out.push(c(tiles[0]));
  while (i < tiles.length - 1) {
    const [x0, z0] = c(tiles[i]);
    let j = Math.min(tiles.length - 1, i + 24);
    for (; j > i + 1; j--) {
      const [x1, z1] = c(tiles[j]);
      if (lineClear(map, s, x0, z0, x1, z1, walkable)) break;
    }
    out.push(c(tiles[j]));
    i = j;
  }
  return out;
}
