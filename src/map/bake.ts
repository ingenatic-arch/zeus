/**
 * Bakes the authored coast (coast.ts) into grids: heights, fertility, rock,
 * distance from the shore, water masks and a tree scatter. Deterministic:
 * the same data always gives the same arrays.
 *
 * Two grids:
 * - the "field" covers the playable map plus a margin of scenery, with a
 *   height at every whole-unit corner (n x n corners, origin at FIELD_MIN);
 * - the "tiles" are the 128 x 128 playable squares the sim will build on.
 * The scenery outside the map is drawn coarser (OUTER_STEP units); the map's
 * edge heights are made linear between OUTER_STEP corners so the two meshes
 * meet without cracks.
 */
import { Rng } from '../sim/rng';
import { coast as defaultCoast, COAST_SEED, MAP_MARGIN, MAP_SIZE, type CoastData } from './coast';
import { clamp, fbm, lerp, ridged, smoothstep, valueNoise } from './noise';

export const FIELD_MIN = -MAP_MARGIN;
export const FIELD_N = MAP_SIZE + 2 * MAP_MARGIN + 1;
export const OUTER_STEP = 2;

export const WATER_NONE = 0;
export const WATER_SEA = 1;
export const WATER_RIVER = 2;

export enum TreeKind {
  Olive = 0,
  Pine = 1,
  Cypress = 2,
  Scrub = 3,
  Broom = 4,
  Rock = 5,
  Reed = 6,
  Flowers = 7,
}

export interface TreeInstance {
  kind: TreeKind;
  x: number;
  z: number;
  scale: number;
  rot: number;
  /** -1..1, a small colour shift. */
  tint: number;
}

export interface RiverPath {
  xs: Float32Array;
  zs: Float32Array;
  /** Water surface height at each point; never rises downstream. */
  surface: Float32Array;
  /** Half-width of the stream at each point. */
  width: Float32Array;
  /** Half-width of the flood plain at each point. */
  valley: Float32Array;
  /** Arc length from the spring. */
  dist: Float32Array;
  length: number;
}

export interface RiverQuery {
  /** Distance from the centreline. */
  d: number;
  /** 0 at the spring, 1 at the mouth. */
  t: number;
  surface: number;
  width: number;
  valley: number;
  /** Downstream direction. */
  dirX: number;
  dirZ: number;
}

export class CoastMap {
  readonly size = MAP_SIZE;
  readonly fieldMin = FIELD_MIN;
  readonly fieldN = FIELD_N;
  /** Heights at field corners. */
  readonly heights: Float32Array;
  /** 0..1 fertility at field corners. */
  readonly fertility: Float32Array;
  /** 0..1 how rocky the ground is at field corners. */
  readonly rock: Float32Array;
  /** Signed distance to the shore at field corners (positive inland). */
  readonly shore: Float32Array;
  /** Per playable tile: WATER_NONE, WATER_SEA or WATER_RIVER. */
  readonly tileWater: Uint8Array;
  /** Per playable tile: mean fertility of its corners. */
  readonly tileFertility: Float32Array;
  readonly river: RiverPath;
  readonly trees: TreeInstance[];

  constructor(
    heights: Float32Array,
    fertility: Float32Array,
    rock: Float32Array,
    shore: Float32Array,
    tileWater: Uint8Array,
    tileFertility: Float32Array,
    river: RiverPath,
    trees: TreeInstance[],
  ) {
    this.heights = heights;
    this.fertility = fertility;
    this.rock = rock;
    this.shore = shore;
    this.tileWater = tileWater;
    this.tileFertility = tileFertility;
    this.river = river;
    this.trees = trees;
  }

  /** Field index of the corner at whole-unit world position (x, z). */
  idx(x: number, z: number): number {
    return (z - FIELD_MIN) * FIELD_N + (x - FIELD_MIN);
  }

  inField(x: number, z: number): boolean {
    return x >= FIELD_MIN && z >= FIELD_MIN && x <= FIELD_MIN + FIELD_N - 1 && z <= FIELD_MIN + FIELD_N - 1;
  }

  inMap(x: number, z: number): boolean {
    return x >= 0 && z >= 0 && x <= MAP_SIZE && z <= MAP_SIZE;
  }

  /** Height at a whole-unit corner, clamped to the field. */
  corner(x: number, z: number): number {
    const cx = clamp(x, FIELD_MIN, FIELD_MIN + FIELD_N - 1);
    const cz = clamp(z, FIELD_MIN, FIELD_MIN + FIELD_N - 1);
    return this.heights[this.idx(cx, cz)];
  }

  /**
   * Height of the drawn ground at any point: exact on the triangles the
   * terrain mesh uses (1-unit cells on the map, coarser outside).
   */
  heightAt(x: number, z: number): number {
    const step = this.inMap(x, z) ? 1 : OUTER_STEP;
    const gx = Math.floor((x - FIELD_MIN) / step) * step + FIELD_MIN;
    const gz = Math.floor((z - FIELD_MIN) / step) * step + FIELD_MIN;
    const fx = (x - gx) / step;
    const fz = (z - gz) / step;
    const h00 = this.corner(gx, gz);
    const h10 = this.corner(gx + step, gz);
    const h01 = this.corner(gx, gz + step);
    const h11 = this.corner(gx + step, gz + step);
    return triHeight(h00, h10, h01, h11, fx, fz);
  }

  /** Smooth field sample (bilinear) of any corner array. */
  sample(arr: Float32Array, x: number, z: number): number {
    const fx0 = clamp(x - FIELD_MIN, 0, FIELD_N - 1.001);
    const fz0 = clamp(z - FIELD_MIN, 0, FIELD_N - 1.001);
    const ix = Math.floor(fx0);
    const iz = Math.floor(fz0);
    const fx = fx0 - ix;
    const fz = fz0 - iz;
    const i = iz * FIELD_N + ix;
    const a = arr[i];
    const b = arr[i + 1];
    const c = arr[i + FIELD_N];
    const d = arr[i + FIELD_N + 1];
    return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
  }

  /** Steepness (rise per unit) at a point. */
  slopeAt(x: number, z: number): number {
    const e = 0.75;
    const dx = (this.sample(this.heights, x + e, z) - this.sample(this.heights, x - e, z)) / (2 * e);
    const dz = (this.sample(this.heights, x, z + e) - this.sample(this.heights, x, z - e)) / (2 * e);
    return Math.hypot(dx, dz);
  }

  riverAt(x: number, z: number): RiverQuery {
    return queryRiver(this.river, x, z);
  }

  tileIndex(tx: number, tz: number): number {
    return tz * MAP_SIZE + tx;
  }
}

/**
 * Height inside one grid cell split into two triangles. The split follows
 * the diagonal with the smaller height difference (the same rule the terrain
 * mesh uses), which keeps ridges and valleys crisp.
 */
export function splitsMainDiagonal(h00: number, h10: number, h01: number, h11: number): boolean {
  return Math.abs(h00 - h11) <= Math.abs(h10 - h01);
}

export function triHeight(h00: number, h10: number, h01: number, h11: number, fx: number, fz: number): number {
  if (splitsMainDiagonal(h00, h10, h01, h11)) {
    // Diagonal (0,0)-(1,1).
    return fx >= fz ? h00 + (h10 - h00) * fx + (h11 - h10) * fz : h00 + (h01 - h00) * fz + (h11 - h01) * fx;
  }
  // Diagonal (1,0)-(0,1).
  return fx + fz <= 1 ? h00 + (h10 - h00) * fx + (h01 - h00) * fz : h11 + (h01 - h11) * (1 - fx) + (h10 - h11) * (1 - fz);
}

// ---------------------------------------------------------------------------

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

/** z of the shoreline at x (smooth through the authored points). */
function shoreZ(pts: [number, number][], x: number): number {
  if (x <= pts[0][0]) return pts[0][1];
  const last = pts.length - 1;
  if (x >= pts[last][0]) return pts[last][1];
  let k = 0;
  while (k < last - 1 && x > pts[k + 1][0]) k++;
  const p0 = pts[Math.max(0, k - 1)];
  const p1 = pts[k];
  const p2 = pts[k + 1];
  const p3 = pts[Math.min(last, k + 2)];
  const t = (x - p1[0]) / (p2[0] - p1[0]);
  return catmull(p0[1], p1[1], p2[1], p3[1], t);
}

/** Chamfer distance transform: distance from each cell to the nearest cell where src is true. */
function distanceTo(src: Uint8Array, n: number): Float32Array {
  const INF = 1e9;
  const d = new Float32Array(n * n);
  for (let i = 0; i < d.length; i++) d[i] = src[i] ? 0 : INF;
  const D = Math.SQRT2;
  for (let z = 0; z < n; z++) {
    for (let x = 0; x < n; x++) {
      const i = z * n + x;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 1);
      if (z > 0) {
        v = Math.min(v, d[i - n] + 1);
        if (x > 0) v = Math.min(v, d[i - n - 1] + D);
        if (x < n - 1) v = Math.min(v, d[i - n + 1] + D);
      }
      d[i] = v;
    }
  }
  for (let z = n - 1; z >= 0; z--) {
    for (let x = n - 1; x >= 0; x--) {
      const i = z * n + x;
      let v = d[i];
      if (x < n - 1) v = Math.min(v, d[i + 1] + 1);
      if (z < n - 1) {
        v = Math.min(v, d[i + n] + 1);
        if (x < n - 1) v = Math.min(v, d[i + n + 1] + D);
        if (x > 0) v = Math.min(v, d[i + n - 1] + D);
      }
      d[i] = v;
    }
  }
  return d;
}

function buildRiverPath(data: CoastData): Omit<RiverPath, 'surface'> {
  const ctrl = data.river;
  const xs: number[] = [];
  const zs: number[] = [];
  for (let k = 0; k < ctrl.length - 1; k++) {
    const p0 = ctrl[Math.max(0, k - 1)];
    const p1 = ctrl[k];
    const p2 = ctrl[k + 1];
    const p3 = ctrl[Math.min(ctrl.length - 1, k + 2)];
    const segLen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const steps = Math.max(2, Math.ceil(segLen / 0.5));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      xs.push(catmull(p0[0], p1[0], p2[0], p3[0], t));
      zs.push(catmull(p0[1], p1[1], p2[1], p3[1], t));
    }
  }
  const lastP = ctrl[ctrl.length - 1];
  xs.push(lastP[0]);
  zs.push(lastP[1]);
  const n = xs.length;
  const dist = new Float32Array(n);
  for (let i = 1; i < n; i++) dist[i] = dist[i - 1] + Math.hypot(xs[i] - xs[i - 1], zs[i] - zs[i - 1]);
  const length = dist[n - 1];
  const width = new Float32Array(n);
  const valley = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = dist[i] / length;
    // Slight swells and narrows so it doesn't look ruled.
    const wob = 1 + 0.18 * (valueNoise(dist[i] * 0.12, 3.7, COAST_SEED + 31) * 2 - 1);
    width[i] = lerp(data.riverWidth[0], data.riverWidth[1], Math.pow(t, 0.85)) * wob;
    valley[i] = lerp(data.valleyWidth[0], data.valleyWidth[1], t) * (1 + 0.25 * (valueNoise(dist[i] * 0.05, 9.1, COAST_SEED + 41) * 2 - 1));
  }
  return { xs: Float32Array.from(xs), zs: Float32Array.from(zs), width, valley, dist, length };
}

export function queryRiver(r: Omit<RiverPath, 'surface'> & { surface?: Float32Array }, x: number, z: number): RiverQuery {
  let best = Infinity;
  let bi = 0;
  let bu = 0;
  const n = r.xs.length;
  for (let i = 0; i < n - 1; i++) {
    const ax = r.xs[i];
    const az = r.zs[i];
    const bx = r.xs[i + 1];
    const bz = r.zs[i + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const l2 = dx * dx + dz * dz;
    let u = ((x - ax) * dx + (z - az) * dz) / l2;
    u = u < 0 ? 0 : u > 1 ? 1 : u;
    const px = ax + dx * u - x;
    const pz = az + dz * u - z;
    const d2 = px * px + pz * pz;
    if (d2 < best) {
      best = d2;
      bi = i;
      bu = u;
    }
  }
  const dx = r.xs[bi + 1] - r.xs[bi];
  const dz = r.zs[bi + 1] - r.zs[bi];
  const l = Math.hypot(dx, dz) || 1;
  const at = (arr: Float32Array): number => arr[bi] + (arr[bi + 1] - arr[bi]) * bu;
  return {
    d: Math.sqrt(best),
    t: at(r.dist) / r.length,
    surface: r.surface ? at(r.surface) : 0,
    width: at(r.width),
    valley: at(r.valley),
    dirX: dx / l,
    dirZ: dz / l,
  };
}

/** Bake the coast. Takes a few hundred milliseconds. */
export function bakeCoast(data: CoastData = defaultCoast): CoastMap {
  const N = FIELD_N;
  const seed = COAST_SEED;
  const total = N * N;

  // 1. Land and sea, and the signed distance to the shore.
  const land = new Uint8Array(total);
  const sea = new Uint8Array(total);
  const near = new Float32Array(total); // analytic distance, accurate close to the shore
  for (let j = 0; j < N; j++) {
    const z = FIELD_MIN + j;
    for (let i = 0; i < N; i++) {
      const x = FIELD_MIN + i;
      const sz = shoreZ(data.shore, x) + 1.1 * fbm(x * 0.09, 0.5, seed + 5, 3);
      const slope = (shoreZ(data.shore, x + 0.5) - shoreZ(data.shore, x - 0.5)) / 1;
      let d = (sz - z) / Math.sqrt(1 + slope * slope);
      for (const is of data.islets) {
        const e = Math.hypot((x - is.x) / is.rx, (z - is.z) / is.rz);
        d = Math.max(d, (1 - e) * Math.min(is.rx, is.rz));
      }
      const k = j * N + i;
      near[k] = d;
      land[k] = d >= 0 ? 1 : 0;
      sea[k] = d >= 0 ? 0 : 1;
    }
  }
  const toSea = distanceTo(sea, N);
  const toLand = distanceTo(land, N);
  const shore = new Float32Array(total);
  for (let k = 0; k < total; k++) {
    const far = land[k] ? toSea[k] - 0.5 : -(toLand[k] - 0.5);
    const w = smoothstep(1.5, 3.5, Math.abs(far));
    shore[k] = lerp(near[k], far, w);
  }

  // 2. Heights before the river: coastal plain, sea floor, hills, crags.
  const heights = new Float32Array(total);
  const rock = new Float32Array(total);
  for (let j = 0; j < N; j++) {
    const z = FIELD_MIN + j;
    for (let i = 0; i < N; i++) {
      const x = FIELD_MIN + i;
      const k = j * N + i;
      const d = shore[k];
      let h: number;
      if (d >= 0) {
        h = 1.9 * (1 - Math.exp(-d / 14)) + 0.012 * d;
        h += fbm(x * 0.045, z * 0.045, seed + 11, 4) * 0.9 * smoothstep(2, 14, d);
      } else {
        const dd = -d;
        h = -(1.7 * (1 - Math.exp(-dd / 6)) + 0.035 * dd);
        h += fbm(x * 0.06, z * 0.06, seed + 13, 3) * 0.35 * smoothstep(1, 6, dd);
        h = Math.max(h, -9);
      }
      let rocky = 0;
      for (const hill of data.hills) {
        const r2 = ((x - hill.x) ** 2 + (z - hill.z) ** 2) / (hill.r * hill.r);
        if (r2 > 9) continue;
        const g = Math.exp(-r2);
        const w = hill.cliffy ? smoothstep(-2.5, 1.2, d) : smoothstep(0, 9, d);
        h += hill.h * g * w;
        if (hill.rocky) rocky = Math.max(rocky, smoothstep(0.15, 0.6, g) * w);
      }
      if (rocky > 0) h += ridged(x * 0.085, z * 0.085, seed + 17, 4) * 2.6 * rocky;
      heights[k] = h;
      rock[k] = rocky;
    }
  }

  // 3. The river: a surface that never flows uphill, carved into its valley.
  const path = buildRiverPath(data);
  const rn = path.xs.length;
  const sampleH = (x: number, z: number): number => {
    const fx = x - FIELD_MIN;
    const fz = z - FIELD_MIN;
    const ix = Math.floor(fx);
    const iz = Math.floor(fz);
    const tx = fx - ix;
    const tz = fz - iz;
    const k = iz * N + ix;
    const a = heights[k];
    const b = heights[k + 1];
    const c = heights[k + N];
    const e = heights[k + N + 1];
    return a + (b - a) * tx + (c - a) * tz + (a - b - c + e) * tx * tz;
  };
  const raw = new Float32Array(rn);
  for (let i = 0; i < rn; i++) {
    // Lowest ground across the stream's width, so the surface sits below both banks.
    const dx = i < rn - 1 ? path.xs[i + 1] - path.xs[i] : path.xs[i] - path.xs[i - 1];
    const dz = i < rn - 1 ? path.zs[i + 1] - path.zs[i] : path.zs[i] - path.zs[i - 1];
    const l = Math.hypot(dx, dz) || 1;
    const nx = -dz / l;
    const nz = dx / l;
    let lo = Infinity;
    for (const o of [-1.5, -0.75, 0, 0.75, 1.5]) {
      const ww = path.width[i] * o;
      lo = Math.min(lo, sampleH(path.xs[i] + nx * ww, path.zs[i] + nz * ww));
    }
    raw[i] = lo - 0.45;
  }
  const surface = new Float32Array(rn);
  surface[0] = raw[0];
  for (let i = 1; i < rn; i++) surface[i] = Math.min(surface[i - 1] - 0.003, raw[i]);
  for (let i = 0; i < rn; i++) surface[i] = Math.max(surface[i], 0);
  // Smooth the steps out, then make sure it still only ever goes down.
  for (let pass = 0; pass < 4; pass++) {
    const copy = surface.slice();
    for (let i = 0; i < rn; i++) {
      let sum = 0;
      let cnt = 0;
      for (let o = -6; o <= 6; o++) {
        const q = i + o;
        if (q < 0 || q >= rn) continue;
        sum += copy[q];
        cnt++;
      }
      surface[i] = Math.min(sum / cnt, raw[i] + 0.25);
    }
  }
  for (let i = 1; i < rn; i++) surface[i] = Math.min(surface[i], surface[i - 1]);
  for (let i = 0; i < rn; i++) surface[i] = Math.max(surface[i], 0);
  const river: RiverPath = { ...path, surface };

  const fertility = new Float32Array(total);
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let maxValley = 0;
  for (let i = 0; i < rn; i++) {
    minX = Math.min(minX, river.xs[i]);
    maxX = Math.max(maxX, river.xs[i]);
    minZ = Math.min(minZ, river.zs[i]);
    maxZ = Math.max(maxZ, river.zs[i]);
    maxValley = Math.max(maxValley, river.valley[i] + river.width[i]);
  }
  const pad = Math.ceil(maxValley * 1.6 + 3);
  for (let z = Math.floor(minZ) - pad; z <= Math.ceil(maxZ) + pad; z++) {
    for (let x = Math.floor(minX) - pad; x <= Math.ceil(maxX) + pad; x++) {
      const k = (z - FIELD_MIN) * N + (x - FIELD_MIN);
      const q = queryRiver(river, x, z);
      const h0 = heights[k];
      const s = q.surface;
      const w = q.width;
      const V = q.valley;
      if (q.d < w) {
        const depth = lerp(0.35, 0.95, q.t);
        heights[k] = Math.min(h0, s - 0.1 - depth * (1 - (q.d / w) ** 4));
      } else if (h0 > s) {
        const bank = s + 0.3 * smoothstep(w - 0.2, w + 1.0, q.d);
        const blend = smoothstep(w + 0.8, w + V, q.d);
        heights[k] = Math.min(h0, lerp(bank, h0, blend));
      } else if (s > 0.3 && q.d < w + 2) {
        // Never let the bank dip below the water beside it (no floating water).
        heights[k] = s + 0.3 * smoothstep(w - 0.2, w + 1.0, q.d);
      }
      // The flood plain is fertile; it fades away from the water.
      if (shore[k] > 1) {
        const f = Math.exp(-((Math.max(0, q.d - w) / (V * 1.1)) ** 2));
        fertility[k] = Math.max(fertility[k], f * (1 - rock[k]));
      }
      // Rocks soften to meadow near the water.
      rock[k] *= smoothstep(w + 1, w + V * 0.8, q.d);
    }
  }

  // 4. Gentle general fertility on low, flat, inland ground.
  for (let j = 1; j < N - 1; j++) {
    for (let i = 1; i < N - 1; i++) {
      const k = j * N + i;
      const sl = Math.hypot(heights[k + 1] - heights[k - 1], heights[k + N] - heights[k - N]) * 0.5;
      const flat = 1 - smoothstep(0.12, 0.45, sl);
      const low = 1 - smoothstep(2.5, 6, heights[k]);
      const g = flat * low * smoothstep(2, 7, shore[k]) * (1 - rock[k]) * 0.3;
      fertility[k] = clamp(Math.max(fertility[k], g), 0, 1);
    }
  }

  // 5. Make the map's edge rows linear between coarse corners (crack-free seam).
  const lo = MAP_MARGIN;
  const hi = MAP_MARGIN + MAP_SIZE;
  const fixLine = (get: (t: number) => number): void => {
    for (let t = lo; t < hi; t += OUTER_STEP) {
      const a = heights[get(t)];
      const b = heights[get(t + OUTER_STEP)];
      for (let u = 1; u < OUTER_STEP; u++) heights[get(t + u)] = lerp(a, b, u / OUTER_STEP);
    }
  };
  fixLine((t) => lo * N + t);
  fixLine((t) => hi * N + t);
  fixLine((t) => t * N + lo);
  fixLine((t) => t * N + hi);

  // 6. Tiles: water and fertility.
  const tileWater = new Uint8Array(MAP_SIZE * MAP_SIZE);
  const tileFertility = new Float32Array(MAP_SIZE * MAP_SIZE);
  for (let tz = 0; tz < MAP_SIZE; tz++) {
    for (let tx = 0; tx < MAP_SIZE; tx++) {
      const k = (tz + lo) * N + (tx + lo);
      const cs = [k, k + 1, k + N, k + N + 1];
      const t = tz * MAP_SIZE + tx;
      tileFertility[t] = (fertility[cs[0]] + fertility[cs[1]] + fertility[cs[2]] + fertility[cs[3]]) / 4;
      const q = queryRiver(river, tx + 0.5, tz + 0.5);
      const minH = Math.min(heights[cs[0]], heights[cs[1]], heights[cs[2]], heights[cs[3]]);
      if (q.d < q.width + 0.35 && q.surface > 0.03) tileWater[t] = WATER_RIVER;
      else if (minH < 0) tileWater[t] = WATER_SEA;
    }
  }

  const map = new CoastMap(heights, fertility, rock, shore, tileWater, tileFertility, river, []);
  map.trees.push(...scatterTrees(map, data));
  return map;
}

// ---------------------------------------------------------------------------
// Trees, bushes, rocks and reeds.

function scatterTrees(map: CoastMap, data: CoastData): TreeInstance[] {
  const rng = new Rng(COAST_SEED + 7);
  const out: TreeInstance[] = [];
  const seed = COAST_SEED;
  const taken = new Set<number>();
  const cellKey = (x: number, z: number): number => (Math.floor(z * 1.25) + 400) * 2000 + (Math.floor(x * 1.25) + 400);

  const groundOk = (x: number, z: number, maxSlope: number): boolean => {
    if (!map.inField(x, z)) return false;
    if (map.sample(map.shore, x, z) < 1.2) return false;
    if (map.heightAt(x, z) < 0.25) return false;
    const q = map.riverAt(x, z);
    if (q.d < q.width + 1.3) return false;
    return map.slopeAt(x, z) <= maxSlope;
  };
  const put = (kind: TreeKind, x: number, z: number, scale: number, solid = true): boolean => {
    const key = cellKey(x, z);
    if (solid && taken.has(key)) return false;
    if (solid) taken.add(key);
    out.push({ kind, x, z, scale, rot: rng.range(0, Math.PI * 2), tint: rng.range(-1, 1) });
    return true;
  };

  // Olive groves in loose rows.
  for (const g of data.groves) {
    const c = Math.cos(g.rows);
    const s = Math.sin(g.rows);
    const n = Math.ceil(g.r / g.spacing) + 1;
    for (let a = -n; a <= n; a++) {
      for (let b = -n; b <= n; b++) {
        const lx = a * g.spacing + (b % 2 ? g.spacing * 0.5 : 0);
        const lz = b * g.spacing * 0.92;
        const edge = g.r * (0.75 + 0.4 * valueNoise(a * 0.7 + g.x, b * 0.7 + g.z, seed + 51));
        if (Math.hypot(lx, lz) > edge) continue;
        if (rng.float() < 0.1) continue; // a missing tree here and there
        const x = g.x + lx * c - lz * s + rng.range(-0.3, 0.3);
        const z = g.z + lx * s + lz * c + rng.range(-0.3, 0.3);
        if (!groundOk(x, z, 0.55)) continue;
        put(TreeKind.Olive, x, z, rng.range(0.85, 1.15));
      }
    }
  }

  // Cypress stands, and a few cypresses along the river.
  for (const st of data.cypressStands) {
    const count = Math.round(st.r * 1.6);
    for (let i = 0; i < count; i++) {
      const a = rng.range(0, Math.PI * 2);
      const r = Math.sqrt(rng.float()) * st.r;
      const x = st.x + Math.cos(a) * r;
      const z = st.z + Math.sin(a) * r;
      if (groundOk(x, z, 0.7)) put(TreeKind.Cypress, x, z, rng.range(0.8, 1.25));
    }
  }
  for (let i = 0; i < map.river.xs.length; i += 9) {
    if (rng.float() > 0.3) continue;
    const side = rng.float() < 0.5 ? -1 : 1;
    const dx = map.river.xs[Math.min(i + 1, map.river.xs.length - 1)] - map.river.xs[Math.max(0, i - 1)];
    const dz = map.river.zs[Math.min(i + 1, map.river.xs.length - 1)] - map.river.zs[Math.max(0, i - 1)];
    const l = Math.hypot(dx, dz) || 1;
    const off = map.river.width[i] + rng.range(2.2, 4.5);
    const x = map.river.xs[i] - (dz / l) * off * side;
    const z = map.river.zs[i] + (dx / l) * off * side;
    if (groundOk(x, z, 0.6)) put(TreeKind.Cypress, x, z, rng.range(0.8, 1.2));
  }

  // Umbrella pines near the shore.
  for (const w of data.pineWoods) {
    const count = Math.round(w.r * w.r * 0.12);
    for (let i = 0; i < count; i++) {
      const a = rng.range(0, Math.PI * 2);
      const r = Math.sqrt(rng.float()) * w.r;
      const x = w.x + Math.cos(a) * r;
      const z = w.z + Math.sin(a) * r;
      if (groundOk(x, z, 0.8)) put(TreeKind.Pine, x, z, rng.range(0.8, 1.2));
    }
  }

  // Scrub, broom, scattered pines and rocks over the whole field (sparser outside the map).
  const lim0 = -60;
  const lim1 = MAP_SIZE + 60;
  for (let z = lim0; z < lim1; z += 1.7) {
    for (let x = lim0; x < lim1; x += 1.7) {
      const px = x + rng.range(-0.7, 0.7);
      const pz = z + rng.range(-0.7, 0.7);
      const inside = map.inMap(px, pz);
      const outsideFade = inside ? 1 : 0.55;
      const d = map.sample(map.shore, px, pz);
      const fert = map.sample(map.fertility, px, pz);
      const rk = map.sample(map.rock, px, pz);
      const slope = map.slopeAt(px, pz);
      const roll = rng.float();
      const roll2 = rng.float();
      const patch = valueNoise(px * 0.08, pz * 0.08, seed + 61);
      // Rocks: on rocky ground, steep slopes and cliffs at the sea.
      const rockChance = (0.03 + 0.16 * rk) * smoothstep(0.25, 0.9, slope + rk * 0.5) + (d < 3 && d > -1 && slope > 0.5 ? 0.2 : 0);
      if (roll2 < rockChance * outsideFade) {
        const rq = map.riverAt(px, pz);
        if (map.inField(px, pz) && map.heightAt(px, pz) > -0.4 && rq.d > rq.width + 0.6) put(TreeKind.Rock, px, pz, rng.range(0.6, 1.5) * (1 + rk * 1.1), true);
        continue;
      }
      if (!groundOk(px, pz, 0.85)) continue;
      // Scrub likes dry slopes, in patches.
      const dry = (1 - fert) * (1 - 0.3 * rk);
      const scrubChance = (dry * smoothstep(0.3, 0.75, patch) * 0.75 + dry * 0.05) * outsideFade;
      if (roll < scrubChance) {
        const broom = valueNoise(px * 0.21, pz * 0.21, seed + 71) > 0.72;
        put(broom ? TreeKind.Broom : TreeKind.Scrub, px, pz, rng.range(0.7, 1.3));
        continue;
      }
      // A lone pine on the coastal slopes now and then.
      if (roll < scrubChance + 0.012 * smoothstep(3, 10, d) * (1 - fert) * outsideFade) {
        put(TreeKind.Pine, px, pz, rng.range(0.85, 1.2));
      }
    }
  }

  // Wild flowers in drifts on the meadows and the river plain.
  for (let z = -10; z < MAP_SIZE + 10; z += 1.15) {
    for (let x = -10; x < MAP_SIZE + 10; x += 1.15) {
      const px = x + rng.range(-0.5, 0.5);
      const pz = z + rng.range(-0.5, 0.5);
      const drift = valueNoise(px * 0.13, pz * 0.13, seed + 81);
      const fert = map.sample(map.fertility, px, pz);
      const chance = smoothstep(0.62, 0.85, drift) * (0.25 + 0.6 * fert) * (1 - map.sample(map.rock, px, pz));
      if (rng.float() >= chance) continue;
      if (!groundOk(px, pz, 0.5)) continue;
      put(TreeKind.Flowers, px, pz, rng.range(0.8, 1.2), false);
    }
  }

  // Reeds along the lower river banks.
  const r = map.river;
  for (let i = 0; i < r.xs.length - 1; i++) {
    const t = r.dist[i] / r.length;
    if (t < 0.25 || r.surface[i] < 0.04) continue;
    for (let k = 0; k < 2; k++) {
      if (rng.float() > 0.55) continue;
      const side = rng.float() < 0.5 ? -1 : 1;
      const dx = r.xs[i + 1] - r.xs[i];
      const dz = r.zs[i + 1] - r.zs[i];
      const l = Math.hypot(dx, dz) || 1;
      const off = r.width[i] + rng.range(-0.15, 0.9);
      const x = r.xs[i] - (dz / l) * off * side + rng.range(-0.2, 0.2);
      const z = r.zs[i] + (dx / l) * off * side + rng.range(-0.2, 0.2);
      put(TreeKind.Reed, x, z, rng.range(0.55, 0.9), false);
    }
  }
  return out;
}
