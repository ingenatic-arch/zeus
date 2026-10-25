/**
 * Bakes the authored coast (coast.ts) into grids: heights, fertility, rock,
 * distance from the shore, water masks and a tree scatter. Deterministic:
 * the same data always gives the same arrays.
 *
 * Two grids:
 * - the "field" covers the playable map plus a margin of scenery, with a
 *   height at every whole-unit corner (n x n corners, origin at FIELD_MIN);
 * - the "tiles" are the playable squares the sim will build on (128 x 128 on
 *   the Bay; a generated land's own size, slice 42).
 * The scenery outside the map is drawn coarser (OUTER_STEP units); the map's
 * edge heights are made linear between OUTER_STEP corners so the two meshes
 * meet without cracks.
 */
import { Rng } from '../sim/rng';
import { coast as defaultCoast, COAST_SEED, HERDS, MAP_MARGIN, MAP_SIZE, type CoastData, type HerdHome } from './coast';
// Slice 46: more channels, lakes, marsh, dry ground, irregular islands and oaks.
import type { Channel } from './coast';
import { dcos, dexp, dhypot, dpow, dsin, sq } from './dmath';
import { clamp, fbm, lerp, ridged, smoothstep, valueNoise } from './noise';

/** Where the field starts (every land has the same margin of scenery round it). */
export const FIELD_MIN = -MAP_MARGIN;
/** Slice 42: the field's corners a side, for a map of this many tiles a side. */
export const fieldSide = (size: number): number => size + 2 * MAP_MARGIN + 1;
export const OUTER_STEP = 2;
/** Size of the first band of far scenery's cells, beyond the field. */
export const FAR_STEP = 4;

/** The shelf beside the stream: how far it reaches past the water's edge, and how far under the surface. */
export const RIVER_SHELF = 1.0;
export const RIVER_SHELF_DEPTH = 0.12;
/** Where the river's water fades out, measured from the edge of the stream. */
export const RIVER_EDGE_FADE: [number, number] = [0.16, 0.32];

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
  /** Slice 46: oaks in the woods of a wooded land (the loggers fell them as they do pines). */
  Oak = 8,
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
  /**
   * Slice 46: on a land with more than one channel, the path holds them all,
   * one after another; cut[i] is 1 where no water runs from point i to i + 1
   * (from one channel's end to the next one's start). Each channel's `dist`
   * is then how far along the whole river it is (dist / length from 0 at the
   * spring to 1 at the sea), not its own length. None on one river.
   */
  cut?: Uint8Array;
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
  /** The playable map's side, in tiles (slice 42: the land's, 128 on the Bay). */
  readonly size: number;
  readonly fieldMin = FIELD_MIN;
  /** The field's corners a side (the map plus its margin of scenery each side). */
  readonly fieldN: number;
  /** Slice 42: the shapes it was baked from, its noise seed and its wild herds. */
  readonly data: CoastData;
  readonly seed: number;
  readonly herds: readonly HerdHome[];
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
  /** Slice 46: how marshy the ground is at field corners (0..1), on a land with marsh; null elsewhere. */
  marsh: Float32Array | null = null;
  /** Slice 46: on a dry land, the playable tiles with water under the ground (1), where a fountain can go; null elsewhere (a fountain goes anywhere). */
  groundwater: Uint8Array | null = null;

  constructor(
    heights: Float32Array,
    fertility: Float32Array,
    rock: Float32Array,
    shore: Float32Array,
    tileWater: Uint8Array,
    tileFertility: Float32Array,
    river: RiverPath,
    trees: TreeInstance[],
    data: CoastData = defaultCoast,
  ) {
    this.data = data;
    this.size = data.size ?? MAP_SIZE;
    this.fieldN = fieldSide(this.size);
    this.seed = data.seed ?? COAST_SEED;
    this.herds = data.herds ?? HERDS;
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
    return (z - FIELD_MIN) * this.fieldN + (x - FIELD_MIN);
  }

  inField(x: number, z: number): boolean {
    return x >= FIELD_MIN && z >= FIELD_MIN && x <= FIELD_MIN + this.fieldN - 1 && z <= FIELD_MIN + this.fieldN - 1;
  }

  inMap(x: number, z: number): boolean {
    return x >= 0 && z >= 0 && x <= this.size && z <= this.size;
  }

  /** Height at a whole-unit corner, clamped to the field. */
  corner(x: number, z: number): number {
    const cx = clamp(x, FIELD_MIN, FIELD_MIN + this.fieldN - 1);
    const cz = clamp(z, FIELD_MIN, FIELD_MIN + this.fieldN - 1);
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
    const N = this.fieldN;
    const fx0 = clamp(x - FIELD_MIN, 0, N - 1.001);
    const fz0 = clamp(z - FIELD_MIN, 0, N - 1.001);
    const ix = Math.floor(fx0);
    const iz = Math.floor(fz0);
    const fx = fx0 - ix;
    const fz = fz0 - iz;
    const i = iz * N + ix;
    const a = arr[i];
    const b = arr[i + 1];
    const c = arr[i + N];
    const d = arr[i + N + 1];
    return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
  }

  /** Steepness (rise per unit) at a point. */
  slopeAt(x: number, z: number): number {
    const e = 0.75;
    const dx = (this.sample(this.heights, x + e, z) - this.sample(this.heights, x - e, z)) / (2 * e);
    const dz = (this.sample(this.heights, x, z + e) - this.sample(this.heights, x, z - e)) / (2 * e);
    return dhypot(dx, dz);
  }

  riverAt(x: number, z: number): RiverQuery {
    return queryRiver(this.river, x, z);
  }

  tileIndex(tx: number, tz: number): number {
    return tz * this.size + tx;
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
export function shoreZ(pts: [number, number][], x: number): number {
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

function buildRiverPath(data: CoastData, seed: number): Omit<RiverPath, 'surface'> {
  const ctrl = data.river;
  const xs: number[] = [];
  const zs: number[] = [];
  for (let k = 0; k < ctrl.length - 1; k++) {
    const p0 = ctrl[Math.max(0, k - 1)];
    const p1 = ctrl[k];
    const p2 = ctrl[k + 1];
    const p3 = ctrl[Math.min(ctrl.length - 1, k + 2)];
    const segLen = dhypot(p2[0] - p1[0], p2[1] - p1[1]);
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
  for (let i = 1; i < n; i++) dist[i] = dist[i - 1] + dhypot(xs[i] - xs[i - 1], zs[i] - zs[i - 1]);
  const length = dist[n - 1];
  const width = new Float32Array(n);
  const valley = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = dist[i] / length;
    // Slight swells and narrows so it doesn't look ruled.
    const wob = 1 + 0.18 * (valueNoise(dist[i] * 0.12, 3.7, seed + 31) * 2 - 1);
    width[i] = lerp(data.riverWidth[0], data.riverWidth[1], dpow(t, 0.85)) * wob;
    valley[i] = lerp(data.valleyWidth[0], data.valleyWidth[1], t) * (1 + 0.25 * (valueNoise(dist[i] * 0.05, 9.1, seed + 41) * 2 - 1));
  }
  return { xs: Float32Array.from(xs), zs: Float32Array.from(zs), width, valley, dist, length };
}

/** Slice 46: one more channel's points, its own arc length along them, and its widths (as buildRiverPath does for the river). */
function strand(ch: Channel, seed: number, k: number): { xs: number[]; zs: number[]; arc: number[]; width: number[]; valley: number[] } {
  const ctrl = ch.pts;
  const xs: number[] = [];
  const zs: number[] = [];
  for (let j = 0; j < ctrl.length - 1; j++) {
    const p0 = ctrl[Math.max(0, j - 1)];
    const p1 = ctrl[j];
    const p2 = ctrl[j + 1];
    const p3 = ctrl[Math.min(ctrl.length - 1, j + 2)];
    const steps = Math.max(2, Math.ceil(dhypot(p2[0] - p1[0], p2[1] - p1[1]) / 0.5));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      xs.push(catmull(p0[0], p1[0], p2[0], p3[0], t));
      zs.push(catmull(p0[1], p1[1], p2[1], p3[1], t));
    }
  }
  const lastP = ctrl[ctrl.length - 1];
  xs.push(lastP[0]);
  zs.push(lastP[1]);
  const arc: number[] = [0];
  for (let i = 1; i < xs.length; i++) arc.push(arc[i - 1] + dhypot(xs[i] - xs[i - 1], zs[i] - zs[i - 1]));
  const len = arc[arc.length - 1] || 1;
  const width: number[] = [];
  const valley: number[] = [];
  for (let i = 0; i < xs.length; i++) {
    const t = arc[i] / len;
    const wob = 1 + 0.18 * (valueNoise(arc[i] * 0.12, 3.7 + k * 5.3, seed + 31) * 2 - 1);
    width.push(lerp(ch.width[0], ch.width[1], dpow(t, 0.85)) * wob);
    valley.push(lerp(ch.valley[0], ch.valley[1], t) * (1 + 0.25 * (valueNoise(arc[i] * 0.05, 9.1 + k * 5.3, seed + 41) * 2 - 1)));
  }
  return { xs, zs, arc, width, valley };
}

/**
 * Slice 46: the river and its other channels as one path, one after another
 * with a cut between each and the next. Each point's dist is how far along
 * the whole river it is (the river from 0 at its spring to `riverEnd`, each
 * channel over its own `t`), times the river's own length. One river alone is
 * buildRiverPath's, untouched. Also where each channel starts in the arrays.
 */
function riverPaths(data: CoastData, seed: number, riverEnd: number): { path: Omit<RiverPath, 'surface'>; starts: number[] } {
  const main = buildRiverPath(data, seed);
  const chans = data.channels ?? [];
  if (chans.length === 0) return { path: main, starts: [0] };
  const L = main.length;
  const xs = Array.from(main.xs);
  const zs = Array.from(main.zs);
  const width = Array.from(main.width);
  const valley = Array.from(main.valley);
  const dist = Array.from(main.dist, (d) => d * riverEnd);
  const starts = [0];
  chans.forEach((ch, k) => {
    const st = strand(ch, seed, k + 1);
    starts.push(xs.length);
    const len = st.arc[st.arc.length - 1] || 1;
    for (let i = 0; i < st.xs.length; i++) {
      xs.push(st.xs[i]);
      zs.push(st.zs[i]);
      width.push(st.width[i]);
      valley.push(st.valley[i]);
      dist.push(lerp(ch.t[0], ch.t[1], st.arc[i] / len) * L);
    }
  });
  const cut = new Uint8Array(xs.length);
  for (const s of starts) if (s > 0) cut[s - 1] = 1;
  return {
    path: { xs: Float32Array.from(xs), zs: Float32Array.from(zs), width: Float32Array.from(width), valley: Float32Array.from(valley), dist: Float32Array.from(dist), length: L, cut },
    starts,
  };
}

/**
 * Slice 42: the river's segments in runs of RUN, each with the box round its
 * points, so a query can pass over the runs too far off to hold the nearest
 * (a large land's river is long, and the bake, the ground and the terrain's
 * colours ask after it at every corner and facet).
 */
const RUN = 16;
const runBoxes = new WeakMap<Float32Array, Float64Array>();
function runsOf(xs: Float32Array, zs: Float32Array): Float64Array {
  let boxes = runBoxes.get(xs);
  if (boxes) return boxes;
  const segs = xs.length - 1;
  const runs = Math.ceil(segs / RUN);
  boxes = new Float64Array(runs * 4);
  for (let k = 0; k < runs; k++) {
    let x0 = Infinity;
    let x1 = -Infinity;
    let z0 = Infinity;
    let z1 = -Infinity;
    for (let i = k * RUN; i <= Math.min(segs, (k + 1) * RUN); i++) {
      x0 = Math.min(x0, xs[i]);
      x1 = Math.max(x1, xs[i]);
      z0 = Math.min(z0, zs[i]);
      z1 = Math.max(z1, zs[i]);
    }
    boxes.set([x0, x1, z0, z1], k * 4);
  }
  runBoxes.set(xs, boxes);
  return boxes;
}

/** (Scratch for queryRiver: each run's squared distance from the point.) */
let gaps = new Float64Array(64);

export function queryRiver(r: Omit<RiverPath, 'surface'> & { surface?: Float32Array }, x: number, z: number): RiverQuery {
  let best = Infinity;
  let bi = 0;
  let bu = 0;
  const n = r.xs.length;
  const xs = r.xs;
  const zs = r.zs;
  const cut = r.cut;
  // (Exactly what a scan of every segment in order finds, the first of equals: first a bound from the run whose box
  // is nearest, then every run in order but those whose box lies wholly beyond that bound, which hold nothing as near.)
  const boxes = runsOf(xs, zs);
  const runs = boxes.length / 4;
  if (gaps.length < runs) gaps = new Float64Array(runs * 2);
  let near = 0;
  for (let k = 0; k < runs; k++) {
    const ex = Math.max(boxes[k * 4] - x, 0, x - boxes[k * 4 + 1]);
    const ez = Math.max(boxes[k * 4 + 2] - z, 0, z - boxes[k * 4 + 3]);
    gaps[k] = ex * ex + ez * ez;
    if (gaps[k] < gaps[near]) near = k;
  }
  let bound = Infinity;
  for (let pass = 0; pass < 2; pass++) {
    for (let k = pass === 0 ? near : 0; k < (pass === 0 ? near + 1 : runs); k++) {
      if (gaps[k] > bound) continue;
      const i1 = Math.min(n - 1, (k + 1) * RUN);
      for (let i = k * RUN; i < i1; i++) {
        if (cut !== undefined && cut[i] === 1) continue;
        const ax = xs[i];
        const az = zs[i];
        const bx = xs[i + 1];
        const bz = zs[i + 1];
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
    }
    if (pass === 0) {
      bound = best * (1 + 1e-9) + 1e-9;
      best = Infinity;
    }
  }
  const dx = r.xs[bi + 1] - r.xs[bi];
  const dz = r.zs[bi + 1] - r.zs[bi];
  const l = dhypot(dx, dz) || 1;
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

/** Slice 46: how much an irregular shore pushes in or out at a point of an ellipse ((a, b) in its radii, e = |(a, b)|): 1 +- wob / 2, smoothly round it. */
function wobble(a: number, b: number, e: number, wob: number, key: number, seed: number): number {
  const ux = e > 1e-6 ? a / e : 1;
  const uz = e > 1e-6 ? b / e : 0;
  return 1 + wob * (valueNoise(ux * 1.6 + key, uz * 1.6 - key * 0.37, seed + 461) - 0.5);
}

/** Bake the coast (the Bay, or a generated land's data: slice 42). Takes a few hundred milliseconds. */
export function bakeCoast(data: CoastData = defaultCoast): CoastMap {
  const size = data.size ?? MAP_SIZE;
  const N = fieldSide(size);
  const seed = data.seed ?? COAST_SEED;
  const total = N * N;

  // 1. Land and sea, and the signed distance to the shore.
  const lakes = data.lakes && data.lakes.length > 0 ? data.lakes : null;
  const land = new Uint8Array(total);
  const sea = new Uint8Array(total);
  const near = new Float32Array(total); // analytic distance, accurate close to the shore
  // (The shore's line and slope at each x, worked out once a column rather than at every corner: slice 42.)
  const shoreAt = new Float64Array(N);
  const slopeAt = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const x = FIELD_MIN + i;
    shoreAt[i] = shoreZ(data.shore, x) + 1.1 * fbm(x * 0.09, 0.5, seed + 5, 3);
    slopeAt[i] = (shoreZ(data.shore, x + 0.5) - shoreZ(data.shore, x - 0.5)) / 1;
  }
  for (let j = 0; j < N; j++) {
    const z = FIELD_MIN + j;
    for (let i = 0; i < N; i++) {
      const x = FIELD_MIN + i;
      const sz = shoreAt[i];
      const slope = slopeAt[i];
      let d = (sz - z) / Math.sqrt(1 + slope * slope);
      for (const is of data.islets) {
        const a = (x - is.x) / is.rx;
        const b = (z - is.z) / is.rz;
        const m = Math.min(is.rx, is.rz);
        // (Slice 42: e is at least the larger of a and b, so where even that leaves the islet's distance below d it can't change it.)
        // (Slice 46: an irregular island's e can be as little as (1 - wob / 2) of that.)
        const shrink = is.wob ? 1 - is.wob / 2 : 1;
        if ((1 - Math.max(Math.abs(a), Math.abs(b)) * shrink + 1e-9) * m < d) continue;
        let e = dhypot(a, b);
        if (is.wob) e *= wobble(a, b, e, is.wob, is.x + is.z * 7.3, seed);
        d = Math.max(d, (1 - e) * m);
      }
      // Slice 46: lakes, cut into the land as the sea is.
      if (lakes) {
        for (const lk of lakes) {
          const a = (x - lk.x) / lk.rx;
          const b = (z - lk.z) / lk.rz;
          const m = Math.min(lk.rx, lk.rz);
          const shrink = lk.wob ? 1 - lk.wob / 2 : 1;
          if ((Math.max(Math.abs(a), Math.abs(b)) * shrink - 1) * m >= d) continue;
          let e = dhypot(a, b);
          if (lk.wob) e *= wobble(a, b, e, lk.wob, lk.x * 3.1 + lk.z, seed);
          d = Math.min(d, (e - 1) * m);
        }
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
    // (Slice 46: only the hills that reach this row, in their order: the same sums, and a land of many hills bakes no slower.)
    const rowHills = data.hills.filter((hill) => sq(z - hill.z) / (hill.r * hill.r) <= 9);
    for (let i = 0; i < N; i++) {
      const x = FIELD_MIN + i;
      const k = j * N + i;
      const d = shore[k];
      let h: number;
      if (d >= 0) {
        h = 1.9 * (1 - dexp(-d / 14)) + 0.012 * d;
        h += fbm(x * 0.045, z * 0.045, seed + 11, 4) * 0.9 * smoothstep(2, 14, d);
      } else {
        const dd = -d;
        h = -(1.7 * (1 - dexp(-dd / 6)) + 0.035 * dd);
        h += fbm(x * 0.06, z * 0.06, seed + 13, 3) * 0.35 * smoothstep(1, 6, dd);
        h = Math.max(h, -9);
      }
      let rocky = 0;
      for (const hill of rowHills) {
        const r2 = (sq(x - hill.x) + sq(z - hill.z)) / (hill.r * hill.r);
        if (r2 > 9) continue;
        const g = dexp(-r2);
        const w = hill.cliffy ? smoothstep(-2.5, 1.2, d) : smoothstep(0, 9, d);
        h += hill.h * g * w;
        if (hill.rocky) rocky = Math.max(rocky, smoothstep(0.15, 0.6, g) * w);
      }
      if (rocky > 0) h += ridged(x * 0.085, z * 0.085, seed + 17, 4) * 2.6 * rocky;
      heights[k] = h;
      rock[k] = rocky;
    }
  }
  // Slice 46: marsh, low wet ground with pools in it, where a land has any.
  const marsh = data.marsh && data.marsh.length > 0 ? new Float32Array(total) : null;
  if (marsh) {
    for (const m of data.marsh!) {
      const r = m.r * 1.3;
      for (let z = Math.max(FIELD_MIN, Math.floor(m.z - r)); z <= Math.min(FIELD_MIN + N - 1, Math.ceil(m.z + r)); z++) {
        for (let x = Math.max(FIELD_MIN, Math.floor(m.x - r)); x <= Math.min(FIELD_MIN + N - 1, Math.ceil(m.x + r)); x++) {
          const k = (z - FIELD_MIN) * N + (x - FIELD_MIN);
          const dd = dhypot(x - m.x, z - m.z) / m.r + (valueNoise(x * 0.09, z * 0.09, seed + 471) - 0.5) * 0.5;
          const w = 1 - smoothstep(0.55, 1, dd);
          if (w > marsh[k]) marsh[k] = w;
        }
      }
    }
    for (let k = 0; k < total; k++) {
      const w = marsh[k] * smoothstep(0, 2.5, shore[k]);
      marsh[k] = w;
      if (w <= 0) continue;
      const x = FIELD_MIN + (k % N);
      const z = FIELD_MIN + Math.floor(k / N);
      const pool = valueNoise(x * 0.15, z * 0.15, seed + 473) * 0.75 + valueNoise(x * 0.41, z * 0.41, seed + 474) * 0.25;
      const target = pool < 0.36 ? -0.3 : 0.12 + 0.35 * smoothstep(0.36, 0.8, pool);
      heights[k] = lerp(heights[k], target, w);
      rock[k] *= 1 - w;
    }
  }

  // 3. The river: a surface that never flows uphill, carved into its valley.
  // (Slice 46: and any other channels, each worked out on its own, after the river; one river alone is as before.)
  const chans = data.channels ?? [];
  const riverEnd = chans.reduce((a, c) => (c.join === 'start' ? Math.min(a, c.t[0]) : a), 1);
  const { path, starts } = riverPaths(data, seed, riverEnd);
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
  const surface = new Float32Array(rn);
  const ends = [...starts.slice(1), rn];
  /** The river's own surface (strand 0, worked out first) at its point nearest (x, z). */
  const riverSurfaceNear = (x: number, z: number): number => {
    let best = 0;
    let bd = Infinity;
    for (let i = 0; i < ends[0]; i++) {
      const d = sq(path.xs[i] - x) + sq(path.zs[i] - z);
      if (d < bd) [best, bd] = [i, d];
    }
    return surface[best];
  };
  starts.forEach((a, si) => {
    const b = ends[si];
    for (let i = a; i < b; i++) {
      // Lowest ground across the stream's width, so the surface sits below both banks.
      const dx = i < b - 1 ? path.xs[i + 1] - path.xs[i] : path.xs[i] - path.xs[i - 1];
      const dz = i < b - 1 ? path.zs[i + 1] - path.zs[i] : path.zs[i] - path.zs[i - 1];
      const l = dhypot(dx, dz) || 1;
      const nx = -dz / l;
      const nz = dx / l;
      let lo = Infinity;
      for (const o of [-1.5, -0.75, 0, 0.75, 1.5]) {
        const ww = path.width[i] * o;
        lo = Math.min(lo, sampleH(path.xs[i] + nx * ww, path.zs[i] + nz * ww));
      }
      raw[i] = lo - 0.45;
    }
    const ch = si > 0 ? chans[si - 1] : null;
    // (A delta's branch leaves the river at the river's own level, or lower.)
    surface[a] = ch?.join === 'start' ? Math.min(raw[a], riverSurfaceNear(path.xs[a], path.zs[a])) : raw[a];
    for (let i = a + 1; i < b; i++) surface[i] = Math.min(surface[i - 1] - 0.003, raw[i]);
    for (let i = a; i < b; i++) surface[i] = Math.max(surface[i], 0);
    // Smooth the steps out, then make sure it still only ever goes down.
    for (let pass = 0; pass < 4; pass++) {
      const copy = surface.slice(a, b);
      for (let i = a; i < b; i++) {
        let sum = 0;
        let cnt = 0;
        for (let o = -6; o <= 6; o++) {
          const q = i + o;
          if (q < a || q >= b) continue;
          sum += copy[q - a];
          cnt++;
        }
        surface[i] = Math.min(sum / cnt, raw[i] + 0.25);
      }
    }
    for (let i = a + 1; i < b; i++) surface[i] = Math.min(surface[i], surface[i - 1]);
    for (let i = a; i < b; i++) surface[i] = Math.max(surface[i], 0);
    // (A tributary never falls below the river it flows into.)
    if (ch?.join === 'end') {
      const floor = riverSurfaceNear(path.xs[b - 1], path.zs[b - 1]);
      for (let i = a; i < b; i++) surface[i] = Math.max(surface[i], floor);
    }
  });
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
      // Beside the stream a pebbly shelf lies just under the water line, so
      // the ground only breaks the surface a little way out, beyond where the
      // water fades away: the water draws its own smooth edge instead of the
      // one-unit terrain facets cutting a saw-tooth through it.
      const bank = s + 0.05 + 0.3 * smoothstep(w + RIVER_SHELF, w + RIVER_SHELF + 0.8, q.d);
      if (q.d < w) {
        const depth = lerp(0.35, 0.95, q.t);
        heights[k] = Math.min(h0, s - RIVER_SHELF_DEPTH - depth * (1 - dpow(q.d / w, 4)));
      } else if (q.d < w + RIVER_SHELF) {
        heights[k] = Math.min(h0, s - RIVER_SHELF_DEPTH);
      } else if (h0 > s) {
        const blend = smoothstep(w + RIVER_SHELF + 0.5, w + V, q.d);
        heights[k] = Math.min(h0, lerp(bank, h0, blend));
      } else if (s > 0.3 && q.d < w + RIVER_SHELF + 1.5) {
        // Never let the bank dip below the water beside it (no floating water).
        heights[k] = bank;
      }
      // The flood plain is fertile; it fades away from the water.
      if (shore[k] > 1) {
        const f = dexp(-sq(Math.max(0, q.d - w) / (V * 1.1)));
        fertility[k] = Math.max(fertility[k], f * (1 - rock[k]));
      }
      // Rocks soften to meadow near the water.
      rock[k] *= smoothstep(w + 1, w + V * 0.8, q.d);
    }
  }

  // 4. Gentle general fertility on low, flat, inland ground.
  const dryK = data.dry ? 1 - 0.65 * data.dry : 1;
  for (let j = 1; j < N - 1; j++) {
    for (let i = 1; i < N - 1; i++) {
      const k = j * N + i;
      const sl = dhypot(heights[k + 1] - heights[k - 1], heights[k + N] - heights[k - N]) * 0.5;
      const flat = 1 - smoothstep(0.12, 0.45, sl);
      const low = 1 - smoothstep(2.5, 6, heights[k]);
      const g0 = flat * low * smoothstep(2, 7, shore[k]) * (1 - rock[k]) * 0.3;
      // (Slice 46: a dry land is greener only by its water; marsh is too wet to farm.)
      const g = dryK === 1 ? g0 : g0 * dryK;
      fertility[k] = clamp(Math.max(fertility[k], g), 0, 1);
      if (marsh && marsh[k] > 0) fertility[k] *= 1 - 0.75 * marsh[k];
    }
  }

  // 5. Make the map's edge rows linear between coarse corners (crack-free seam).
  const lo = MAP_MARGIN;
  const hi = MAP_MARGIN + size;
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
  // Likewise the field's own outer edge, where the far scenery meets it in
  // cells of FAR_STEP units.
  for (let t = 0; t < N - 1; t += FAR_STEP) {
    for (let u = 1; u < FAR_STEP; u++) {
      const f = u / FAR_STEP;
      for (const [a, b, m] of [
        [t, t + FAR_STEP, t + u],
        [(N - 1) * N + t, (N - 1) * N + t + FAR_STEP, (N - 1) * N + t + u],
        [t * N, (t + FAR_STEP) * N, (t + u) * N],
        [t * N + N - 1, (t + FAR_STEP) * N + N - 1, (t + u) * N + N - 1],
      ]) {
        heights[m] = lerp(heights[a], heights[b], f);
      }
    }
  }

  // 6. Tiles: water and fertility.
  const tileWater = new Uint8Array(size * size);
  const tileFertility = new Float32Array(size * size);
  for (let tz = 0; tz < size; tz++) {
    for (let tx = 0; tx < size; tx++) {
      const k = (tz + lo) * N + (tx + lo);
      const cs = [k, k + 1, k + N, k + N + 1];
      const t = tz * size + tx;
      tileFertility[t] = (fertility[cs[0]] + fertility[cs[1]] + fertility[cs[2]] + fertility[cs[3]]) / 4;
      const q = queryRiver(river, tx + 0.5, tz + 0.5);
      const minH = Math.min(heights[cs[0]], heights[cs[1]], heights[cs[2]], heights[cs[3]]);
      if (q.d < q.width + RIVER_EDGE_FADE[1] && q.surface > 0.03) tileWater[t] = WATER_RIVER;
      else if (minH < 0) tileWater[t] = WATER_SEA;
    }
  }

  const map = new CoastMap(heights, fertility, rock, shore, tileWater, tileFertility, river, [], data);
  // Slice 46: where the marsh lies, and on a dry land where water lies under the ground.
  map.marsh = marsh;
  if (data.dry) map.groundwater = groundwaterOf(map, data);
  map.trees.push(...scatterTrees(map, data));
  return map;
}

/** Slice 46: how far from the river's water, a lake's or the sea's shore water lies under a dry land (tiles). */
export const GROUNDWATER_REACH = 9;

/** Slice 46: the tiles of a dry land with water under the ground: near the river and its channels, the lakes and the sea's shore, and round the springs. */
function groundwaterOf(map: CoastMap, data: CoastData): Uint8Array {
  const n = map.size;
  const out = new Uint8Array(n * n);
  for (let tz = 0; tz < n; tz++) {
    for (let tx = 0; tx < n; tx++) {
      const x = tx + 0.5;
      const z = tz + 0.5;
      let wet = map.sample(map.shore, x, z) < GROUNDWATER_REACH * 0.6;
      if (!wet) {
        const q = map.riverAt(x, z);
        wet = q.d < q.width + GROUNDWATER_REACH;
      }
      if (!wet) for (const sp of data.springs ?? []) if (dhypot(x - sp.x, z - sp.z) < sp.r) wet = true;
      if (wet) out[tz * n + tx] = 1;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Trees, bushes, rocks and reeds.

function scatterTrees(map: CoastMap, data: CoastData): TreeInstance[] {
  const seed = map.seed;
  const rng = new Rng(seed + 7);
  const out: TreeInstance[] = [];
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
    const c = dcos(g.rows);
    const s = dsin(g.rows);
    const n = Math.ceil(g.r / g.spacing) + 1;
    for (let a = -n; a <= n; a++) {
      for (let b = -n; b <= n; b++) {
        const lx = a * g.spacing + (b % 2 ? g.spacing * 0.5 : 0);
        const lz = b * g.spacing * 0.92;
        const edge = g.r * (0.75 + 0.4 * valueNoise(a * 0.7 + g.x, b * 0.7 + g.z, seed + 51));
        if (dhypot(lx, lz) > edge) continue;
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
      const x = st.x + dcos(a) * r;
      const z = st.z + dsin(a) * r;
      if (groundOk(x, z, 0.7)) put(TreeKind.Cypress, x, z, rng.range(0.8, 1.25));
    }
  }
  for (let i = 0; i < map.river.xs.length; i += 9) {
    if (rng.float() > 0.3) continue;
    const side = rng.float() < 0.5 ? -1 : 1;
    const dx = map.river.xs[Math.min(i + 1, map.river.xs.length - 1)] - map.river.xs[Math.max(0, i - 1)];
    const dz = map.river.zs[Math.min(i + 1, map.river.xs.length - 1)] - map.river.zs[Math.max(0, i - 1)];
    const l = dhypot(dx, dz) || 1;
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
      const x = w.x + dcos(a) * r;
      const z = w.z + dsin(a) * r;
      if (groundOk(x, z, 0.8)) put(TreeKind.Pine, x, z, rng.range(0.8, 1.2));
    }
  }

  // Scrub, broom, scattered pines and rocks over the whole field (sparser outside the map).
  const lim0 = -60;
  const lim1 = map.size + 60;
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
  for (let z = -10; z < map.size + 10; z += 1.15) {
    for (let x = -10; x < map.size + 10; x += 1.15) {
      const px = x + rng.range(-0.5, 0.5);
      const pz = z + rng.range(-0.5, 0.5);
      const drift = valueNoise(px * 0.13, pz * 0.13, seed + 81);
      const fert = map.sample(map.fertility, px, pz);
      const chance = smoothstep(0.62, 0.85, drift) * (0.25 + 0.6 * fert) * (1 - map.sample(map.rock, px, pz)) * (data.dry ? 1 - 0.7 * data.dry : 1);
      if (rng.float() >= chance) continue;
      if (!groundOk(px, pz, 0.5)) continue;
      put(TreeKind.Flowers, px, pz, rng.range(0.8, 1.2), false);
    }
  }

  // Reeds along the lower river banks.
  const r = map.river;
  for (let i = 0; i < r.xs.length - 1; i++) {
    // (Slice 46: not between one channel's end and the next one's start.)
    if (r.cut?.[i]) continue;
    const t = r.dist[i] / r.length;
    if (t < 0.25 || r.surface[i] < 0.04) continue;
    for (let k = 0; k < 2; k++) {
      if (rng.float() > 0.55) continue;
      const side = rng.float() < 0.5 ? -1 : 1;
      const dx = r.xs[i + 1] - r.xs[i];
      const dz = r.zs[i + 1] - r.zs[i];
      const l = dhypot(dx, dz) || 1;
      const off = r.width[i] + rng.range(-0.15, 0.9);
      const x = r.xs[i] - (dz / l) * off * side + rng.range(-0.2, 0.2);
      const z = r.zs[i] + (dx / l) * off * side + rng.range(-0.2, 0.2);
      put(TreeKind.Reed, x, z, rng.range(0.55, 0.9), false);
    }
  }

  // Slice 32: the woods the loggers fell, pines with a cypress here and there, on their own random numbers
  // and after every other plant, so every plant that was there before keeps its place and its number.
  const wr = new Rng(seed + 32);
  const oaks = data.oaks ?? 0;
  for (const w of data.woods ?? []) {
    // (Slice 46: a wooded land's woods are deeper.)
    const count = Math.round(w.r * w.r * 0.65 * (w.dense ?? 1));
    for (let i = 0; i < count; i++) {
      const a = wr.range(0, Math.PI * 2);
      const r = Math.sqrt(wr.float()) * w.r;
      const x = w.x + dcos(a) * r;
      const z = w.z + dsin(a) * r;
      const cypress = wr.float() < 0.15;
      // (Slice 46: on a land with oaks, a draw more for each tree that isn't a cypress; none on the Bay.)
      const oak = oaks > 0 && !cypress && wr.float() < oaks;
      const scale = cypress ? wr.range(0.85, 1.2) : wr.range(0.8, 1.2);
      const rot = wr.range(0, Math.PI * 2);
      const tint = wr.range(-1, 1);
      if (!map.inMap(x, z) || !groundOk(x, z, 0.8)) continue;
      const key = cellKey(x, z);
      if (taken.has(key)) continue;
      taken.add(key);
      out.push({ kind: cypress ? TreeKind.Cypress : oak ? TreeKind.Oak : TreeKind.Pine, x, z, scale, rot, tint });
    }
  }

  // Slice 46: thick reeds in the marsh and round the lakes, on their own random numbers and after every other plant.
  const mr = new Rng(seed + 46);
  if (map.marsh) {
    const m = map.marsh;
    for (const a of data.marsh ?? []) {
      const r = a.r * 1.3;
      for (let z = a.z - r; z < a.z + r; z += 0.9) {
        for (let x = a.x - r; x < a.x + r; x += 0.9) {
          const px = x + mr.range(-0.4, 0.4);
          const pz = z + mr.range(-0.4, 0.4);
          const roll = mr.float();
          if (!map.inField(px, pz)) continue;
          const w = map.sample(m, px, pz);
          const h = map.heightAt(px, pz);
          // In the shallows of the pools and on the wet ground between them.
          if (h < -0.22 || h > 0.6 || roll > w * 0.8) continue;
          put(TreeKind.Reed, px, pz, mr.range(0.6, 1.05), false);
        }
      }
    }
  }
  for (const lk of data.lakes ?? []) {
    const ring = Math.round((lk.rx + lk.rz) * 5);
    for (let i = 0; i < ring; i++) {
      const a = mr.range(0, Math.PI * 2);
      const f = mr.range(0.92, 1.12);
      const px = lk.x + dcos(a) * lk.rx * f;
      const pz = lk.z + dsin(a) * lk.rz * f;
      const h = map.inField(px, pz) ? map.heightAt(px, pz) : 0;
      if (h < -0.25 || h > 0.7 || mr.float() > 0.7) continue;
      put(TreeKind.Reed, px, pz, mr.range(0.6, 1.0), false);
    }
  }
  return out;
}

let baked: CoastMap | null = null;

/**
 * The coast, baked once and shared: the sim and the renderer read the same
 * grids. Baking is deterministic, so a memo changes nothing but the cost.
 */
export function coastMap(): CoastMap {
  if (!baked) baked = bakeCoast();
  return baked;
}
