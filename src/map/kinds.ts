/**
 * The kinds of land (slice 46), generated from a seed as the same shapes the
 * Bay is authored in (coast.ts's CoastData), so bake.ts turns them into grids
 * as it does the Bay. Pure and seeded: the same kind, size and seed always
 * give the same land.
 *
 * Every kind keeps what a game needs (generate.ts' slice 42 notes): the sea
 * to the south, a river, farmland, groves, grassland, copper and marble in
 * the rock, woods for the loggers, deep water near a shore for the quay, a
 * headland high over the sea for the Lighthouse, the fourteen districts
 * (districts.ts, in order) placed on the features they are named for, and a
 * site where the city would start, near enough to one edge that the road in
 * is not too long. Each kind lays them out its own way:
 * - a sheltered bay: slice 42's layout, more varied (the bay's place and
 *   shape, the river's course, where the hills and woods sit), and on larger
 *   lands features in the middle (a lake, uplands, a tributary river);
 * - islands offshore: a wider sea with islands off the coast, a cove;
 * - a river delta: low green land, the river splitting into channels that
 *   fan out to a coast pushed out into the sea, marsh and pools between;
 * - a mountain shore: rocky ranges and cliffs, a narrow valley, a small bay
 *   with flat land behind it, copper and marble in many places;
 * - a dry plain: open ground, low hills with olives, a narrow green valley,
 *   one wood, water under the ground only near the river and the springs;
 * - a wooded coast: deep woods of pine and oak over the hills.
 * Features keep the Bay's sizes; a larger land has more of them.
 */
import { Rng } from '../sim/rng';
import { MAP_MARGIN, type Area, type Channel, type CoastData, type Grove, type HerdHome, type Hill, type Lake, type Outcrop } from './coast';
import { dcos, dhypot, dpow, dsin } from './dmath';
import { clamp, lerp, smoothstep, valueNoise } from './noise';

/** The kinds made here (lands.ts adds the Bay; generate.ts keeps slice 42's sheltered bay as its first edition). */
export const KIND_SALT: Record<string, number> = { sheltered: 0x5e2, islands: 0x15a, delta: 0xde1, mountains: 0x30a, dryplain: 0xd27, woods: 0x30d };

/** A rounded bump: 1 at u = 0, falling smoothly to 0 at |u| = 1. */
const bump = (u: number): number => (Math.abs(u) >= 1 ? 0 : (dcos(Math.PI * u) + 1) / 2);

type P = { x: number; z: number };

/** A land being drawn: its shore, made of a baseline and the bays, capes and lobes along it, and everything on it. */
class Sketch {
  readonly n: number;
  /** How much larger than the Bay's this land is. */
  readonly s: number;
  readonly rng: Rng;
  /** The noise seed (the bake's). */
  readonly ns: number;
  zb = 0;
  /** How much the shore wanders on its own. */
  wob = 1;
  private bends: Array<(x: number) => number> = [];
  readonly hills: Hill[] = [];
  readonly groves: Grove[] = [];
  readonly pineWoods: Area[] = [];
  readonly woods: Area[] = [];
  readonly cypress: Area[] = [];
  readonly copper: Outcrop[] = [];
  readonly marble: Outcrop[] = [];
  readonly herds: HerdHome[] = [];
  readonly islets: CoastData['islets'] = [];
  readonly lakes: Lake[] = [];
  readonly marsh: Area[] = [];
  readonly channels: Channel[] = [];
  readonly springs: Area[] = [];
  river: [number, number][] = [];

  constructor(n: number, seed: number, salt: number) {
    this.n = n;
    this.s = n / 128;
    this.rng = new Rng((seed ^ (salt * 0x10001)) >>> 0);
    this.ns = 0x10000 + ((Math.imul((seed + salt * 7919) >>> 0, 0x9e3779b1) >>> 0) % 0x3fff0000);
  }

  r(lo: number, hi: number): number {
    return this.rng.range(lo, hi);
  }
  chance(p: number): boolean {
    return this.rng.float() < p;
  }
  pick<T>(xs: readonly T[]): T {
    return xs[Math.min(xs.length - 1, Math.floor(this.rng.float() * xs.length))];
  }

  /** The shore's z at x. */
  shoreAt(x: number): number {
    let z = this.zb + this.wob * (3.2 * (valueNoise(x * 0.035, 1.7, this.ns + 3) - 0.5) + 1.4 * (valueNoise(x * 0.11, 4.1, this.ns + 4) - 0.5));
    for (const f of this.bends) z += f(x);
    return z;
  }
  /** A bay dipping into the shore at cx: `w` its half-width east of the middle (`west` times that to the west), `d` its depth. */
  bay(cx: number, w: number, d: number, west = 1.4): void {
    this.bends.push((x) => {
      const u = x < cx ? (cx - x) / (w * west) : (x - cx) / w;
      return -d * (1 - smoothstep(0.25, 1, u));
    });
  }
  /** A cape pushing out into the sea at cx, `hw` its half-width, `h` how far out. */
  cape(cx: number, hw: number, h: number, shape = 0.6): void {
    this.bends.push((x) => h * dpow(bump((x - cx) / hw), shape));
  }
  /** The shore as points, for the bake (fine on the map, coarse beyond). */
  shoreLine(): [number, number][] {
    const n = this.n;
    const far = MAP_MARGIN + 140;
    const out: [number, number][] = [];
    for (let x = -far; x < -24; x += 30) out.push([x, this.shoreAt(x)]);
    for (let x = -24; x <= n + 24; x += 6) out.push([x, this.shoreAt(x)]);
    for (let x = n + 54; x <= n + far; x += 30) out.push([x, this.shoreAt(x)]);
    return out;
  }

  /** A winding course from a to b, bowed through two control points, meandering more the longer it is. */
  course(a: P, b: P, p1: P, p2: P, wig: number, meander = 1): [number, number][] {
    const len = dhypot(b.x - a.x, b.z - a.z);
    const k = Math.max(8, Math.round(len / 8));
    const out: [number, number][] = [];
    for (let i = 0; i <= k; i++) {
      const t = i / k;
      const ca = (1 - t) * (1 - t) * (1 - t);
      const cb = 3 * (1 - t) * (1 - t) * t;
      const cc = 3 * (1 - t) * t * t;
      const cd = t * t * t;
      let x = ca * a.x + cb * p1.x + cc * p2.x + cd * b.x;
      let z = ca * a.z + cb * p1.z + cc * p2.z + cd * b.z;
      // Across the way it runs, more in the middle than at its ends.
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const l = len || 1;
      const m = meander * (3 + len * 0.06) * (valueNoise(t * (1 + len / 45), 0.5, this.ns + wig) - 0.5) * 2 * dsin(Math.PI * t);
      x += (-dz / l) * m;
      z += (dx / l) * m;
      out.push([x, z]);
    }
    return out;
  }

  /** The point of a course nearest z (its x there, roughly). */
  static xAt(pts: ReadonlyArray<[number, number]>, z: number): number {
    let best = pts[0];
    for (const p of pts) if (Math.abs(p[1] - z) < Math.abs(best[1] - z)) best = p;
    return best[0];
  }
  /** How near a point comes to a course. */
  /** How far (x, z) is from the river or any of its channels. */
  nearWater(x: number, z: number): number {
    return Math.min(Sketch.near(this.river, x, z), ...this.channels.map((c) => Sketch.near(c.pts, x, z)));
  }

  static near(pts: ReadonlyArray<[number, number]>, x: number, z: number): number {
    let d = Infinity;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i];
      const [bx, bz] = pts[i + 1];
      const dx = bx - ax;
      const dz = bz - az;
      const l2 = dx * dx + dz * dz || 1;
      const u = clamp(((x - ax) * dx + (z - az) * dz) / l2, 0, 1);
      d = Math.min(d, dhypot(ax + dx * u - x, az + dz * u - z));
    }
    return d;
  }

  /** Mountains beyond the map, framing the view (as on the Bay), and the far hills at its sides. */
  frame(high = 1): void {
    const n = this.n;
    for (let x = -60; x < n + 90; x += this.r(60, 80)) this.hills.push({ x, z: this.r(-66, -52), r: this.r(42, 52), h: this.r(22, 30) * high, rocky: true });
    this.hills.push({ x: -62, z: -20, r: 42, h: 24 * high, rocky: true }, { x: n + 54, z: -8, r: 42, h: 22 * high, rocky: true });
    this.hills.push({ x: n + 62, z: this.zb * 0.45, r: 30, h: 10 * high }, { x: -70, z: this.zb * 0.47, r: 30, h: 9 * high });
  }

  /** A headland: a rocky crown with cliffs to the sea at (x, tipZ), a gentler hill behind, marble on its crown and copper beside it. */
  headland(x: number, tipZ: number, size = 1, withCopper = true): void {
    this.hills.push(
      { x: x - 4, z: tipZ - 23 * size, r: 11 * size, h: this.r(5.5, 6.5), rocky: true, cliffy: true },
      { x: x - 12, z: tipZ - 49 * size, r: 16, h: this.r(4, 5.5) },
      { x: x + 1, z: tipZ - 9 * size, r: 7 * size, h: 4, cliffy: true },
    );
    this.marble.push({ x: x - 5, z: tipZ - 17 * size, r: 5.5, place: 'on the headland’s crown' }, { x: x - 11, z: tipZ - 29 * size, r: 4.5, place: 'above the bay on the headland' });
    if (withCopper) this.copper.push({ x: x - 2, z: tipZ - 25 * size, r: 4.5, place: 'on the headland' });
    this.pineWoods.push({ x: x - 4, z: tipZ - 17 * size, r: 12 * size });
    this.groves.push({ x: x - 12, z: tipZ - 45 * size, r: 7, rows: this.r(0.3, 0.7), spacing: 2.5 });
    this.herds.push({ kind: 'boar', x: x - 10, z: tipZ - 39 * size, r: 6, head: 5, place: 'on the headland' });
  }

  /** A rocky massif where a river rises, with copper in its crags and deer below it. */
  massif(x: number, z: number, high = 1): void {
    this.hills.push(
      { x: x - 17, z: z - 9, r: 20, h: this.r(11, 14) * high, rocky: true },
      { x: x + 3, z: z - 17, r: 15, h: this.r(9, 11) * high, rocky: true },
      { x: x - 37 * (x > this.n / 2 ? -1 : 1), z: z + 11, r: 18, h: this.r(9, 11) * high, rocky: true },
      { x: x - 9, z: z - 37, r: 28, h: 16 * high, rocky: true },
    );
    this.copper.push({ x: x - 17, z: z - 11, r: 5.5, place: 'in the crags above the spring' });
    this.herds.push({ kind: 'deer', x: x - 6, z: z + 21, r: 8, head: 7, place: 'below the crags' });
  }

  /** An islet (an island too small to build on): its ellipse, a rocky hill to raise it, pines on it. */
  islet(x: number, z: number, rx: number, rz: number, wob = 0, h = 1.5, pines = true): void {
    this.islets.push(wob ? { x, z, rx, rz, wob } : { x, z, rx, rz });
    this.hills.push({ x, z, r: Math.max(3, Math.min(rx, rz) * 0.9), h, rocky: true, cliffy: true });
    if (pines) this.pineWoods.push({ x, z, r: Math.max(2.2, Math.min(rx, rz) * 0.75) });
  }

  /** Is a point clear of every hill's crest and of the river by this much? */
  clear(x: number, z: number, d: number): boolean {
    for (const h of this.hills) if (h.h > 3 && dhypot(x - h.x, z - h.z) < h.r * 0.6 + d * 0.5) return false;
    return Sketch.near(this.river, x, z) > d;
  }

  /** Low rises inland, each with a wood, a grove or cypresses and a herd: `count` of them, kept off the river, the bay and anything listed. */
  rises(count: number, z0: number, z1: number, avoid: Array<{ x: number; z: number; r: number }>, mix: readonly ('wood' | 'grove' | 'cypress')[] = ['wood', 'grove', 'cypress'], height: [number, number] = [2.5, 5]): void {
    const n = this.n;
    for (let i = 0, made = 0; i < count * 6 && made < count; i++) {
      const x = this.r(16, n - 16);
      const z = this.r(z0, z1);
      if (Sketch.near(this.river, x, z) < 20) continue;
      if (avoid.some((a) => dhypot(x - a.x, z - a.z) < a.r)) continue;
      const kind = mix[made % mix.length];
      made++;
      avoid.push({ x, z, r: 22 });
      this.hills.push({ x, z, r: this.r(11, 16), h: this.r(height[0], height[1]) });
      if (kind === 'wood') {
        this.woods.push({ x, z, r: this.r(9, 12) });
        this.herds.push({ kind: 'boar', x, z, r: 7, head: 5, place: 'in the woods inland' });
      } else if (kind === 'grove') {
        this.groves.push({ x, z: z + 3, r: this.r(7, 10), rows: this.r(-0.4, 0.4), spacing: 2.6 });
      } else {
        this.cypress.push({ x, z, r: 3.5 });
        this.herds.push({ kind: 'deer', x, z, r: 8, head: 6, place: 'on the hills inland' });
      }
    }
  }

  /** A lake inland: its water, reeds round it (the bake's), a grove above it and deer. */
  lake(x: number, z: number, rx: number, rz: number): void {
    this.lakes.push({ x, z, rx, rz, wob: this.r(0.3, 0.5) });
    this.cypress.push({ x: x + rx + 4, z: z - rz - 2, r: 3 });
    this.herds.push({ kind: 'deer', x: x - rx - 6, z, r: 8, head: 6, place: 'by the lake' });
  }

  /** Finish: the land's data for the bake. `districts` are the fourteen named places, in districts.ts' order. */
  data(n: number, districts: P[], site: P, riverWidth: [number, number], valleyWidth: [number, number], extra: Partial<CoastData> = {}): CoastData {
    const inside = (p: P): P => ({ x: clamp(p.x, 4, n - 4), z: clamp(p.z, 4, n - 4) });
    return {
      shore: this.shoreLine(),
      islets: this.islets,
      hills: this.hills,
      river: this.river,
      riverWidth,
      valleyWidth,
      groves: this.groves,
      pineWoods: this.pineWoods,
      copper: this.copper,
      marble: this.marble,
      woods: this.woods,
      cypressStands: this.cypress,
      size: n,
      seed: this.ns,
      herds: this.herds,
      districts: districts.map(inside),
      site: inside(site),
      ...(this.channels.length ? { channels: this.channels } : {}),
      ...(this.lakes.length ? { lakes: this.lakes } : {}),
      ...(this.marsh.length ? { marsh: this.marsh } : {}),
      ...(this.springs.length ? { springs: this.springs } : {}),
      ...extra,
    };
  }
}

/** Generate a land of one of the kinds made here. */
export function generateKind(kind: string, size: number, seed: number): CoastData {
  const salt = KIND_SALT[kind];
  if (salt === undefined) throw new Error(`No land of kind "${kind}"`);
  const k = new Sketch(size, seed >>> 0, salt);
  switch (kind) {
    case 'sheltered':
      return sheltered(k);
    case 'islands':
      return islands(k);
    case 'delta':
      return delta(k);
    case 'mountains':
      return mountains(k);
    case 'dryplain':
      return dryplain(k);
    default:
      return wooded(k);
  }
}

/**
 * Where a bay's middle goes along a shore of n (`w` its half-width east of
 * the middle, `west` times that to the west): anywhere on a small land; on a
 * larger one near its west or east side, so that the city by it is not far
 * from an edge where a road comes in.
 */
function bayPlace(k: Sketch, w: number, west = 1.4): number {
  const lo = w * west + 16;
  const hi = k.n - w - 16;
  const u = k.s < 1.2 ? k.r(0.05, 0.95) : k.chance(0.5) ? k.r(0, 0.2) : k.r(0.8, 1);
  return lerp(lo, hi, u);
}

/** Which side of a bay its cape stands: the side with more room (1: east, -1: west). */
const capeSide = (k: Sketch, bx: number): number => (bx < k.n / 2 ? 1 : -1);

/** Where a cape of half-width hw beside a bay at bx (half-width w, `west` times that to the west) stands, on side `sg`. */
function capeAt(k: Sketch, bx: number, w: number, west: number, hw: number, sg: number): number {
  const n = k.n;
  return sg > 0 ? Math.min(bx + w + hw * k.r(0.55, 0.85), n - hw * 0.7) : Math.max(bx - w * west - hw * k.r(0.55, 0.85), hw * 0.7);
}

// ---------------------------------------------------------------------------
// A sheltered bay (edition 2).

function sheltered(k: Sketch): CoastData {
  const n = k.n;
  const s = k.s;
  k.zb = n - k.r(24, 30);
  const shape = k.pick(['broad', 'broad', 'deep', 'twin', 'open'] as const);
  const W = (shape === 'deep' ? k.r(20, 25) : shape === 'open' ? k.r(38, 46) : k.r(28, 36)) * dpow(s, 0.3);
  const D = (shape === 'deep' ? k.r(30, 36) : shape === 'open' ? k.r(13, 17) : k.r(20, 27)) * dpow(s, 0.25);
  const westK = shape === 'deep' ? 1.15 : 1.4;
  const bx = bayPlace(k, W, westK);
  const zi = k.zb - D;
  k.bay(bx, W, D, westK);
  if (shape === 'twin') k.cape(bx + k.r(-0.15, 0.2) * W, k.r(6, 9), D * k.r(0.45, 0.6), 0.9);
  const sg = capeSide(k, bx);
  const hw = k.r(14, 19) * dpow(s, 0.25);
  const hx = capeAt(k, bx, W, westK, hw, sg);
  const tipZ = Math.min(n - 6, k.zb + k.r(14, 20));
  k.cape(hx, hw, tipZ - k.zb);
  // (Sometimes a second, lower cape on the far side.)
  if (k.chance(0.4)) {
    const cx = sg > 0 ? bx - W * westK - k.r(14, 26) : bx + W + k.r(14, 26);
    if (cx > 10 && cx < n - 10) k.cape(cx, k.r(9, 13), k.r(6, 10));
  }

  // The massif where the river rises: anywhere along the north, not over the bay's headland.
  const sx = clamp(k.chance(0.5) ? bx + k.r(-0.55, -0.25) * n : bx + k.r(0.1, 0.4) * n, 24, n - 30);
  const sz = k.r(17, 24) * dpow(s, 0.5);
  k.massif(sx, sz);
  // The river: down to the bay, reaching it at its west side, its head or its east side.
  const mx = bx + W * k.r(-0.45, 0.35);
  const mz = k.shoreAt(mx) + 5.5;
  const len = dhypot(mx - sx, mz - sz);
  k.river = k.course({ x: sx, z: sz }, { x: mx, z: mz }, { x: sx + k.r(-4, 8) * Math.sign(mx - sx || 1), z: sz + len * k.r(0.3, 0.45) }, { x: mx - k.r(-6, 9), z: mz - len * k.r(0.25, 0.38) }, 9);

  // Rolling hills along the north, the east hills.
  const north: P[] = [];
  for (let x = k.r(14, 34); x < n - 26; x += k.r(26, 38)) {
    if (Math.abs(x - sx) < 30) continue;
    const h = { x, z: k.r(-2, 10) * dpow(s, 0.5), r: k.r(16, 23), h: k.r(5, 8.5), rocky: k.chance(0.2) };
    k.hills.push(h);
    north.push(h);
  }
  const ex = n - k.r(4, 9);
  const ez = k.r(14, 22) * dpow(s, 0.5);
  if (Math.abs(ex - sx) > 26) k.hills.push({ x: ex, z: ez, r: 17, h: k.r(8, 10), rocky: true });
  k.copper.push({ x: ex - 12, z: ez - 8 + (Math.abs(ex - sx) > 26 ? 0 : 12), r: 5.5, place: 'in the east hills' });
  const firstNorth = north[0] ?? { x: n / 2, z: 6 };
  k.herds.push({ kind: 'deer', x: firstNorth.x - 6, z: firstNorth.z + 9, r: 10, head: 8, place: 'in the north hills' });
  k.herds.push({ kind: 'deer', x: ex - 24, z: ez + 7, r: 9, head: 7, place: 'on the east hills' });
  k.herds.push({ kind: 'deer', x: n - 10, z: ez + 28 * dpow(s, 0.6), r: 7, head: 6, place: 'on the far east slopes' });
  k.frame();

  k.headland(hx, tipZ);
  // Beyond the bay from the headland: a low rise for olives, the shore's pines and the loggers' wood above them.
  const wx = clamp(sg > 0 ? bx - W * 1.5 : bx + W * 1.3, 14, n - 14);
  const wo = clamp(wx - 6 * sg, 10, n - 10);
  k.hills.push({ x: wx, z: zi - 1.5, r: 14, h: k.r(3, 4) });
  k.groves.push({ x: wx + sg, z: zi - 5.5, r: 10, rows: k.r(0.1, 0.4), spacing: 2.6 });
  k.pineWoods.push({ x: clamp(wx - 10 * sg, 8, n - 8), z: k.zb - 9, r: 12 });
  k.woods.push({ x: wo, z: k.zb - 20, r: k.r(9, 12) });
  k.herds.push({ kind: 'boar', x: clamp(wx - 8 * sg, 8, n - 8), z: k.zb - 15, r: 9, head: 6, place: 'in the west woods' });
  // By the bay: a pine wood on its shore towards the headland, an olive grove above it.
  k.pineWoods.push({ x: bx + W * 0.75 * sg, z: zi - 5, r: 8 });
  k.herds.push({ kind: 'boar', x: bx + W * 0.75 * sg, z: zi - 8, r: 7, head: 6, place: 'in the pine wood by the bay' });
  k.groves.push({ x: bx + W * 0.55 * sg, z: zi - 31 * dpow(s, 0.5), r: 11, rows: k.r(-0.3, 0), spacing: 2.6 });
  k.groves.push({ x: Sketch.xAt(k.river, sz + len * 0.2) + k.r(16, 24), z: sz + len * 0.2, r: 7, rows: k.r(0, 0.2), spacing: 2.7 });
  k.woods.push({ x: firstNorth.x, z: firstNorth.z + 1, r: 10 });
  k.cypress.push({ x: firstNorth.x + 6, z: firstNorth.z + 22, r: 4 }, { x: sx - 3, z: sz + 27, r: 3 }, { x: ex - 26, z: ez + 6, r: 4 });
  if (k.chance(shape === 'deep' ? 0.25 : 0.5)) k.islet(bx + W * k.r(-0.25, 0.25), zi + D * k.r(0.75, 0.9), k.r(2.8, 3.8), k.r(2.2, 2.9));

  // The middle of a larger land: one or two of a lake, uplands and a tributary river.
  const avoid = [
    { x: bx, z: zi, r: W + 20 },
    { x: hx, z: tipZ - 30, r: 34 },
    { x: sx, z: sz, r: 34 },
  ];
  const feats = s > 1.7 ? 2 : s > 1.2 ? 1 : 0;
  const pool = ['lake', 'uplands', 'tributary'] as const;
  const first = Math.floor(k.r(0, 3));
  for (let f = 0; f < feats; f++) {
    const what = pool[(first + f) % 3];
    if (what === 'tributary') tributary(k, avoid, len);
    else {
      for (let i = 0; i < 20; i++) {
        const x = k.r(30, n - 30);
        const z = k.r(n * 0.25, zi - 34);
        if (k.nearWater(x, z) < 28 || avoid.some((a) => dhypot(x - a.x, z - a.z) < a.r)) continue;
        if (what === 'lake') k.lake(x, z, k.r(7, 12), k.r(5, 8));
        else uplands(k, x, z);
        avoid.push({ x, z, r: 36 });
        break;
      }
    }
  }
  k.rises(Math.round((s - 1) * 6), 30, zi - 18, avoid);

  const midZ = (sz + mz) / 2;
  const rx = Sketch.xAt(k.river, midZ);
  const west = sx < bx ? -1 : 1;
  const districts: P[] = [
    { x: rx, z: midZ },
    { x: sx - 13, z: sz + 3 },
    { x: rx - 24 * dpow(s, 0.6), z: midZ - 4 },
    { x: wx, z: zi - 3 },
    { x: wo, z: k.zb - 9 },
    { x: mx - 14 * west, z: mz - 3 },
    { x: firstNorth.x - 2, z: firstNorth.z + 6 },
    { x: firstNorth.x + 4, z: firstNorth.z + 22 },
    { x: bx + W * 0.55 * sg, z: zi - 31 * dpow(s, 0.5) + 2 },
    { x: ex - 10, z: ez + 2 },
    { x: n - 16, z: lerp(ez, zi, 0.6) },
    { x: bx + 7 * sg, z: zi - 9 },
    { x: bx + W * 0.8 * sg, z: zi - 3 },
    { x: hx - 4, z: tipZ - 27 },
  ];
  return k.data(n, districts, siteBy(k, bx, W, westK, sg), [0.8, 2.6], [4, 13]);
}

/** Where the city starts by a bay: on its shore away from the headland, towards the nearer edge, a little inland. */
function siteBy(k: Sketch, bx: number, w: number, west: number, sg: number): P {
  const x = sg > 0 ? bx - w * west * (k.s > 1.2 ? 0.45 : 0.15) : bx + w * (k.s > 1.2 ? 0.45 : 0.15);
  return { x, z: k.shoreAt(x) - 10 };
}

/** A tributary: a stream from a spring of its own in the hills, joining the river halfway down. */
function tributary(k: Sketch, avoid: Array<{ x: number; z: number; r: number }>, riverLen: number): void {
  const n = k.n;
  const at = k.river[Math.round(k.river.length * k.r(0.45, 0.6))];
  // Its spring: away to the side of the river with more room.
  const side = at[0] < n / 2 ? 1 : -1;
  const fx = clamp(at[0] + side * k.r(50, 80), 20, n - 20);
  const fz = k.r(14, 30);
  k.hills.push({ x: fx, z: fz - 10, r: 16, h: k.r(6, 9), rocky: k.chance(0.5) });
  k.cypress.push({ x: fx + 6, z: fz + 8, r: 3 });
  const pts = k.course({ x: fx, z: fz }, { x: at[0], z: at[1] }, { x: fx, z: lerp(fz, at[1], 0.45) }, { x: lerp(fx, at[0], 0.6), z: at[1] - 6 }, 21);
  k.channels.push({ pts, width: [0.6, 1.5], valley: [3, 8], t: [0, 0.55 * clamp(riverLen / 160, 0.7, 1)], join: 'end' });
  avoid.push({ x: (fx + at[0]) / 2, z: (fz + at[1]) / 2, r: 30 });
}

/** Uplands: a cluster of rocky hills with woods and copper. */
function uplands(k: Sketch, x: number, z: number): void {
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + k.r(0, 1);
    k.hills.push({ x: x + dcos(a) * k.r(6, 14), z: z + dsin(a) * k.r(6, 12), r: k.r(10, 15), h: k.r(5, 8), rocky: i % 2 === 0 });
  }
  k.woods.push({ x: x + k.r(-8, 8), z: z + k.r(4, 10), r: k.r(9, 12) });
  k.copper.push({ x: x + k.r(-5, 5), z: z + k.r(-5, 5), r: 4.5, place: 'in the uplands' });
  k.herds.push({ kind: 'deer', x, z: z + 14, r: 9, head: 7, place: 'in the uplands' });
}

// ---------------------------------------------------------------------------
// Islands offshore.

function islands(k: Sketch): CoastData {
  const n = k.n;
  const s = k.s;
  k.zb = n - k.r(50, 58) * dpow(s, 0.4);
  k.wob = 1.6;
  // A gentle shore: a cove for the quay, a cape beside it.
  const W = k.r(22, 30) * dpow(s, 0.3);
  const D = k.r(12, 17);
  const bx = bayPlace(k, W, 1.3);
  const zi = k.zb - D;
  k.bay(bx, W, D, 1.3);
  const sg = capeSide(k, bx);
  const hw = k.r(13, 17);
  const hx = capeAt(k, bx, W, 1.3, hw, sg);
  const tipZ = k.zb + k.r(12, 16);
  k.cape(hx, hw, tipZ - k.zb);
  // A long low shore elsewhere, with a gentle second cove.
  if (k.chance(0.6)) k.bay(sg > 0 ? bx + W + hw * 2 + k.r(16, 30) : bx - W * 1.3 - hw * 2 - k.r(16, 30), k.r(14, 20), k.r(5, 8));

  // The islands: in the sea off the coast and on out past the map's edge, kept off the way in to the cove.
  const placed: Array<{ x: number; z: number; rx: number; rz: number }> = [];
  const free = (x: number, z: number, rx: number, rz: number): boolean => {
    // (Clear of the cove's mouth and the shore, and of each other.)
    if (Math.abs(x - bx) < W * 0.8 + rx + 6 && z < n + 30) return false;
    if (z - rz < k.shoreAt(x) + 8 || z - rz < k.shoreAt(x - rx) + 8 || z - rz < k.shoreAt(x + rx) + 8) return false;
    return placed.every((p) => dhypot((x - p.x) / (p.rx + rx + 7), (z - p.z) / (p.rz + rz + 7)) > 1);
  };
  const big = Math.round(3 + s * 1.5);
  // (The first few within the map, where they can be seen from the city.)
  const within = Math.round(1 + s);
  for (let i = 0, made = 0; i < big * 16 && made < big; i++) {
    const inside = made < within;
    const rx = k.r(7, inside ? 14 : 20) * (made === 0 ? 1.15 : 1);
    const rz = rx * k.r(0.45, 0.75);
    const x = inside ? k.r(rx + 6, n - rx - 6) : k.r(-40, n + 40);
    const z = inside ? k.r(k.zb + 10 + rz, n - rz - 3) : k.r(k.zb + 14, n + 70);
    if (!free(x, z, rx, rz)) continue;
    placed.push({ x, z, rx, rz });
    made++;
    k.islets.push({ x, z, rx, rz, wob: k.r(0.35, 0.55) });
    // Its hills: one rocky crown, cliffs to the sea, and a lower shoulder.
    k.hills.push({ x: x + k.r(-0.3, 0.3) * rx, z, r: Math.min(rx, rz) * 1.1, h: k.r(4, 9), rocky: true, cliffy: true });
    if (rx > 11) k.hills.push({ x: x + rx * 0.45 * (k.chance(0.5) ? 1 : -1), z: z + k.r(-2, 2), r: rz * 0.9, h: k.r(2, 4), cliffy: true });
    k.pineWoods.push({ x: x + k.r(-0.3, 0.3) * rx, z: z + k.r(-0.2, 0.2) * rz, r: Math.min(rx, rz) * 0.8 });
  }
  for (let i = 0, made = 0; i < 60 && made < 4 + Math.round(s * 2); i++) {
    const rx = k.r(2.4, 4.5);
    const rz = rx * k.r(0.6, 0.9);
    const x = k.r(-30, n + 30);
    const z = k.r(k.zb + 10, made < 3 ? n - 4 : n + 40);
    if (!free(x, z, rx, rz)) continue;
    placed.push({ x, z, rx, rz });
    made++;
    k.islet(x, z, rx, rz, 0.3, k.r(1.2, 2.2), k.chance(0.6));
  }

  // The land: a massif and its river down to the cove, hills, woods and groves.
  const sx = clamp(bx + k.r(-0.4, 0.4) * n, 26, n - 30);
  const sz = k.r(15, 22) * dpow(s, 0.5);
  k.massif(sx, sz, 0.9);
  const mx = bx + W * k.r(-0.4, 0.3);
  const mz = k.shoreAt(mx) + 5.5;
  const len = dhypot(mx - sx, mz - sz);
  k.river = k.course({ x: sx, z: sz }, { x: mx, z: mz }, { x: sx + k.r(-6, 6), z: sz + len * 0.38 }, { x: mx + k.r(-8, 8), z: mz - len * 0.32 }, 9);
  const north: P[] = [];
  for (let x = k.r(14, 30); x < n - 20; x += k.r(28, 40)) {
    if (Math.abs(x - sx) < 30) continue;
    const h = { x, z: k.r(0, 10) * dpow(s, 0.5), r: k.r(16, 22), h: k.r(5, 8) };
    k.hills.push(h);
    north.push(h);
  }
  const firstNorth = north[0] ?? { x: n / 2, z: 6 };
  const ex = n - k.r(6, 12);
  const ez = k.r(16, 24) * dpow(s, 0.5);
  k.hills.push({ x: ex, z: ez, r: 16, h: k.r(7, 9), rocky: true });
  k.copper.push({ x: ex - 10, z: ez - 6, r: 5.5, place: 'in the east hills' });
  k.headland(hx, tipZ, 0.8);
  k.frame(0.9);
  const wx = clamp(sg > 0 ? bx - W * 1.5 : bx + W * 1.3, 14, n - 14);
  const wo = clamp(wx - 6 * sg, 10, n - 10);
  k.hills.push({ x: wx, z: zi - 2, r: 13, h: k.r(3, 4.5) });
  k.groves.push({ x: wx + sg, z: zi - 6, r: 9, rows: k.r(0.1, 0.4), spacing: 2.6 });
  k.pineWoods.push({ x: clamp(wx - 10 * sg, 8, n - 8), z: k.zb - 8, r: 11 });
  k.woods.push({ x: clamp(wx - 4 * sg, 10, n - 10), z: k.zb - 22, r: k.r(9, 12) });
  k.woods.push({ x: firstNorth.x, z: firstNorth.z + 2, r: 10 });
  k.groves.push({ x: bx + W * 0.5 * sg, z: zi - 26 * dpow(s, 0.5), r: 10, rows: k.r(-0.3, 0), spacing: 2.6 });
  k.cypress.push({ x: firstNorth.x + 6, z: firstNorth.z + 20, r: 4 }, { x: ex - 24, z: ez + 8, r: 4 });
  k.herds.push({ kind: 'deer', x: firstNorth.x - 4, z: firstNorth.z + 10, r: 10, head: 8, place: 'in the north hills' });
  k.herds.push({ kind: 'deer', x: ex - 22, z: ez + 8, r: 9, head: 7, place: 'on the east hills' });
  k.herds.push({ kind: 'boar', x: wo, z: k.zb - 16, r: 9, head: 6, place: 'in the west woods' });
  k.pineWoods.push({ x: bx + W * 0.7 * sg, z: zi - 5, r: 7 });
  const avoid = [
    { x: bx, z: zi, r: W + 18 },
    { x: hx, z: tipZ - 30, r: 32 },
    { x: sx, z: sz, r: 32 },
  ];
  k.rises(Math.round(1 + (s - 1) * 6), 30, zi - 18, avoid);

  const midZ = (sz + mz) / 2;
  const rx = Sketch.xAt(k.river, midZ);
  const districts: P[] = [
    { x: rx, z: midZ },
    { x: sx - 13, z: sz + 3 },
    { x: rx - 22, z: midZ - 4 },
    { x: wx, z: zi - 3 },
    { x: wo, z: k.zb - 8 },
    { x: mx - 12, z: mz - 3 },
    { x: firstNorth.x - 2, z: firstNorth.z + 6 },
    { x: firstNorth.x + 4, z: firstNorth.z + 20 },
    { x: bx + W * 0.5 * sg, z: zi - 24 },
    { x: ex - 10, z: ez + 2 },
    { x: n - 14, z: lerp(ez, zi, 0.6) },
    { x: bx + 6 * sg, z: zi - 8 },
    { x: bx + W * 0.7 * sg, z: zi - 3 },
    { x: hx - 4, z: tipZ - 22 },
  ];
  return k.data(n, districts, siteBy(k, bx, W, 1.3, sg), [0.8, 2.4], [4, 12]);
}

// ---------------------------------------------------------------------------
// A river delta.

function delta(k: Sketch): CoastData {
  const n = k.n;
  const s = k.s;
  k.zb = n - k.r(36, 42);
  k.wob = 0.7;
  // The delta's lobe pushes out into the sea; the coast either side is low and sandy.
  // (On a larger land the delta lies off the middle, its quay's bay towards the nearer edge, so the road in is short.)
  const dx = s > 1.2 ? n * (k.chance(0.5) ? k.r(0.52, 0.57) : k.r(0.43, 0.48)) : n * k.r(0.36, 0.62);
  const lw = k.r(30, 38) * dpow(s, 0.45);
  const lh = k.r(20, 27);
  k.cape(dx, lw, lh, 1.1);
  // A shallow bay on one side of it, for the quay out of the river's silt.
  const side = s > 1.2 ? (dx > n / 2 ? 1 : -1) : k.chance(0.5) ? 1 : -1;
  const bw = k.r(14, 20);
  const bx = clamp(dx + side * (lw + bw * 1.2 + k.r(4, 12)), bw * 1.4 + 10, n - bw - 12);
  const bd = k.r(10, 15);
  k.bay(bx, bw, bd, 1.2);
  const zi = k.zb - bd;

  // The river from the north, gentle, to the head of the delta.
  const sx = clamp(dx + k.r(-0.25, 0.25) * n, 20, n - 20);
  const sz = k.r(8, 14);
  const headZ = k.zb - k.r(30, 38) * dpow(s, 0.45);
  const headX = dx + k.r(-6, 6);
  const len = dhypot(headX - sx, headZ - sz);
  k.river = k.course({ x: sx, z: sz }, { x: headX, z: headZ }, { x: sx + k.r(-10, 10), z: sz + len * 0.35 }, { x: headX + k.r(-12, 12), z: headZ - len * 0.3 }, 9, 1.4);
  // Low hills at the spring, beyond the north edge.
  k.hills.push({ x: sx - 10, z: sz - 16, r: 22, h: k.r(6, 9), rocky: true }, { x: sx + 18, z: sz - 22, r: 20, h: k.r(5, 8) });
  k.copper.push({ x: sx - 12, z: sz - 6, r: 5, place: 'in the crags above the spring' });
  k.herds.push({ kind: 'deer', x: sx - 20, z: sz + 18, r: 8, head: 7, place: 'below the crags' });

  // The channels: three or four, fanning out from the head to the lobe's shore.
  const count = s > 1.2 ? 4 : k.chance(0.5) ? 4 : 3;
  const ends: number[] = [];
  for (let i = 0; i < count; i++) ends.push(dx + lw * lerp(-0.75, 0.75, i / (count - 1)) + k.r(-4, 4));
  const tHead = 0.72;
  ends.forEach((ex, i) => {
    const ez = k.shoreAt(ex) + 5;
    const pts = k.course({ x: headX, z: headZ }, { x: ex, z: ez }, { x: lerp(headX, ex, 0.15), z: lerp(headZ, ez, 0.3) }, { x: lerp(headX, ex, 0.85), z: lerp(headZ, ez, 0.7) }, 31 + i * 7, 0.7);
    k.channels.push({ pts, width: [1.5, 2.1], valley: [10, 14], t: [tHead, 1], join: 'start' });
  });
  // Marsh between the channels' mouths, and reeds.
  for (let i = 0; i < ends.length - 1; i++) {
    const mx = (ends[i] + ends[i + 1]) / 2;
    const mz = k.shoreAt(mx) - k.r(6, 10);
    k.marsh.push({ x: mx, z: mz, r: Math.max(7, Math.abs(ends[i + 1] - ends[i]) * 0.45) * k.r(0.9, 1.15) });
  }
  // (And a lagoon of marsh on the far side of the lobe.)
  const lagX = dx - side * (lw + k.r(8, 16));
  if (lagX > 14 && lagX < n - 14) k.marsh.push({ x: lagX, z: k.shoreAt(lagX) - 6, r: k.r(8, 12) });

  // Hills at the edges: rocky east or west hills with copper; a rocky knoll by the quay's bay with marble: the headland.
  const hillSide = -side;
  const hx = hillSide > 0 ? n - k.r(14, 22) : k.r(14, 22);
  const hz = n * k.r(0.32, 0.45);
  k.hills.push({ x: hx, z: hz, r: 18, h: k.r(7, 10), rocky: true }, { x: hx - hillSide * 14, z: hz - 22, r: 15, h: k.r(5, 7) }, { x: hx + hillSide * 4, z: hz + 26, r: 14, h: k.r(4, 6) });
  k.copper.push({ x: hx - hillSide * 4, z: hz - 4, r: 5.5, place: side > 0 ? 'in the west hills' : 'in the east hills' });
  k.woods.push({ x: hx - hillSide * 10, z: hz + 18, r: k.r(10, 13) });
  k.groves.push({ x: hx - hillSide * 16, z: hz - 16, r: 8, rows: k.r(-0.3, 0.3), spacing: 2.6 });
  k.herds.push({ kind: 'boar', x: hx - hillSide * 10, z: hz + 18, r: 8, head: 6, place: 'in the woods on the hills' });
  // The knoll on the bay's far side.
  const kx = clamp(bx + side * (bw + 8), 20, n - 20);
  const kz = k.shoreAt(kx) - 12;
  k.hills.push({ x: kx, z: kz, r: 9.5, h: k.r(5, 6.5), rocky: true, cliffy: true }, { x: kx + side * 6, z: kz - 12, r: 12, h: 3.5 });
  // (Its smooth shoulder to the sea, out of the crags, where the Lighthouse can stand.)
  k.hills.push({ x: kx, z: k.shoreAt(kx) - 1, r: 10, h: 3, cliffy: true });
  k.marble.push({ x: kx, z: kz - 3, r: 5, place: 'on the knoll by the sea' }, { x: kx + side * 5, z: kz - 12, r: 4.5, place: 'behind the knoll' });
  k.pineWoods.push({ x: kx, z: kz + 2, r: 9 });
  k.herds.push({ kind: 'boar', x: kx + side * 4, z: kz - 14, r: 6, head: 5, place: 'on the knoll' });
  // Riverside woods and groves on the higher ground, poplar-like cypresses along the river.
  k.woods.push({ x: Sketch.xAt(k.river, sz + len * 0.45) + k.r(14, 20) * (k.chance(0.5) ? 1 : -1), z: sz + len * 0.45, r: k.r(9, 11) });
  k.cypress.push({ x: headX + 18, z: headZ - 12, r: 4 }, { x: headX - 20, z: headZ - 20, r: 4 });
  k.groves.push({ x: sx + 30, z: sz + 26, r: 8, rows: 0.2, spacing: 2.6 }, { x: sx - 28, z: sz + 34, r: 8, rows: -0.1, spacing: 2.6 });
  k.hills.push({ x: sx + 30, z: sz + 24, r: 13, h: 3.2 }, { x: sx - 28, z: sz + 32, r: 13, h: 3 });
  k.herds.push({ kind: 'deer', x: sx + 34, z: sz + 12, r: 10, head: 8, place: 'in the north hills' });
  k.frame(0.8);
  const avoid = [
    { x: dx, z: k.zb - 10, r: lw + 26 },
    { x: hx, z: hz, r: 32 },
    { x: kx, z: kz, r: 24 },
    { x: sx, z: sz, r: 30 },
  ];
  // The middle of a larger land: a tributary from the far hills, and lakes left by the river's old courses.
  if (s > 1.2) {
    tributary(k, avoid, len);
    for (let made = 0, i = 0; i < 30 && made < (s > 1.7 ? 2 : 1); i++) {
      const z = k.r(n * 0.3, headZ - 16);
      const away = k.chance(0.5) ? 1 : -1;
      const x = Sketch.xAt(k.river, z) + away * k.r(22, 30);
      if (x < 24 || x > n - 24 || avoid.some((a) => dhypot(x - a.x, z - a.z) < a.r)) continue;
      // (Its marsh on the side away from the river, which must keep its fall to the sea.)
      const m = { x: x + away * 6, z: z + 3, r: k.r(7, 9) };
      // (And the lake itself off every stream: the low ground round a lake would stop a river's fall.)
      if (k.nearWater(m.x, m.z) < m.r * 1.3 + 8 || k.nearWater(x, z) < 24) continue;
      k.lake(x, z, k.r(6, 9), k.r(4, 6));
      k.marsh.push(m);
      avoid.push({ x, z, r: 26 });
      made++;
    }
  }
  k.rises(Math.round(1 + (s - 1) * 5), 26, k.zb - 30, avoid, ['grove', 'wood', 'cypress'], [2, 3.5]);

  const midZ = (sz + headZ) / 2;
  const rx = Sketch.xAt(k.river, midZ);
  const mouth = ends[Math.floor(ends.length / 2)];
  const districts: P[] = [
    { x: rx, z: midZ },
    { x: sx - 12, z: sz + 4 },
    { x: rx - 22, z: midZ },
    { x: sx - 28, z: sz + 34 },
    { x: dx - side * lw * 0.9, z: k.zb - 4 },
    { x: mouth, z: k.shoreAt(mouth) - 6 },
    { x: sx + 30, z: sz + 18 },
    { x: headX + 18, z: headZ - 10 },
    { x: sx + 30, z: sz + 30 },
    { x: hx, z: hz },
    { x: hillSide > 0 ? n - 12 : 12, z: hz + 30 },
    { x: bx, z: zi - 8 },
    { x: (bx + dx) / 2, z: k.zb - 14 },
    { x: kx, z: kz },
  ];
  return k.data(n, districts, { x: bx - side * bw * 0.35, z: zi - 9 }, [0.8, 2.7], [6, 18]);
}

// ---------------------------------------------------------------------------
// A mountain shore.

function mountains(k: Sketch): CoastData {
  const n = k.n;
  const s = k.s;
  k.zb = n - k.r(22, 27);
  k.wob = 1.5;
  // One small bay with flat land behind it; cliffs along the rest of the shore.
  const W = k.r(17, 22) * dpow(s, 0.2);
  const D = k.r(15, 20);
  const bx = bayPlace(k, W, 1.2);
  const zi = k.zb - D;
  k.bay(bx, W, D, 1.2);
  const sg = capeSide(k, bx);
  const hw = k.r(11, 15);
  const hx = capeAt(k, bx, W, 1.2, hw, sg);
  const tipZ = k.zb + k.r(12, 17);
  k.cape(hx, hw, tipZ - k.zb);
  // The plain behind the bay, kept clear of the ranges.
  const plain = { x: bx - W * 0.2 * sg, z: zi - 26 * dpow(s, 0.3), r: 30 * dpow(s, 0.3) };

  // The river: from high in the ranges to the bay.
  const sx = clamp(bx + k.r(-0.35, 0.35) * n, 24, n - 24);
  const sz = k.r(12, 18);
  const mx = bx + W * k.r(-0.4, 0.2);
  const mz = k.shoreAt(mx) + 5;
  const len = dhypot(mx - sx, mz - sz);
  k.river = k.course({ x: sx, z: sz }, { x: mx, z: mz }, { x: sx + k.r(-8, 8), z: sz + len * 0.35 }, { x: mx + k.r(-8, 8), z: mz - len * 0.3 }, 9, 1.2);
  k.massif(sx, sz, 1.25);

  // The ranges: rocky massifs over the land, off the river's valley and the plain, with passes between.
  const step = 34;
  const ranges: P[] = [];
  for (let z = k.r(8, 20); z < k.zb - 14; z += step * k.r(0.85, 1.15)) {
    for (let x = k.r(-6, 14); x < n + 6; x += step * k.r(0.9, 1.3)) {
      const px = x + k.r(-8, 8);
      const pz = z + k.r(-6, 6);
      if (Sketch.near(k.river, px, pz) < 17) continue;
      if (dhypot(px - plain.x, pz - plain.z) < plain.r + 12) continue;
      if (dhypot(px - sx, pz - sz) < 26) continue;
      // (Kept off the way from the plain to the headland, so the Lighthouse and its marble can be reached.)
      if (Sketch.near([[plain.x, plain.z], [hx, tipZ - 26]], px, pz) < 24) continue;
      ranges.push({ x: px, z: pz });
      k.hills.push({ x: px, z: pz, r: k.r(13, 19), h: k.r(9, 15), rocky: true });
      if (k.chance(0.5)) k.hills.push({ x: px + k.r(-12, 12), z: pz + k.r(-10, 10), r: k.r(9, 13), h: k.r(5, 9), rocky: true });
    }
  }
  // Cliffs along the shore, off the bay.
  for (let x = k.r(-4, 10); x < n + 4; x += k.r(16, 24)) {
    if (Math.abs(x - bx) < W * 1.3 + 8 || Math.abs(x - hx) < hw) continue;
    k.hills.push({ x, z: k.shoreAt(x) - k.r(5, 9), r: k.r(8, 12), h: k.r(5, 9), rocky: true, cliffy: true });
  }
  k.headland(hx, tipZ, 0.8);
  // (A gentle shoulder on the headland by the water, where the Lighthouse can stand: the rest of the shore is cliffs.)
  k.hills.push({ x: hx - sg * hw * 0.3, z: tipZ - 7, r: 9, h: 2.4, cliffy: true });
  // (And a low rise on the bay's shore below it, the plain's own lookout.)
  const lx = bx + sg * W * 0.8;
  k.hills.push({ x: lx, z: k.shoreAt(lx) - 3, r: 8, h: 2.4, cliffy: true });
  k.frame(1.25);
  // Copper and marble in many places: on the ranges.
  const order = ranges.map((p, i) => ({ p, i, d: dhypot(p.x - plain.x, p.z - plain.z) })).sort((a, b) => a.d - b.d);
  const places = ['in the crags', 'on the high ridge', 'in the far crags', 'on the grey mountain', 'above the pass', 'in the north ridge'];
  order.slice(0, Math.min(order.length, 3 + Math.round(s * 1.5))).forEach((o, j) => {
    // (On the flank towards the plain, where the ground is less broken.)
    const d = dhypot(plain.x - o.p.x, plain.z - o.p.z) || 1;
    const at = { x: o.p.x + ((plain.x - o.p.x) / d) * 9 + k.r(-2, 2), z: o.p.z + ((plain.z - o.p.z) / d) * 9 + k.r(-2, 2) };
    if (j % 2 === 0) k.copper.push({ ...at, r: 5.5, place: places[j % places.length] });
    else k.marble.push({ ...at, r: 5, place: places[j % places.length] });
  });
  // (And a low rocky foothill at the plain's edge with copper in it, gentle enough for a mine whatever the ranges are like.)
  const fside = Sketch.xAt(k.river, plain.z) > plain.x ? -1 : 1;
  const foot = { x: clamp(plain.x + fside * plain.r * 0.85, 14, n - 14), z: plain.z - plain.r * 0.35 };
  k.hills.push({ x: foot.x, z: foot.z, r: 9, h: 2.6, rocky: true });
  k.copper.push({ x: foot.x, z: foot.z, r: 5, place: 'in the foothill by the plain' });
  // Pines on the slopes, a wood for the loggers, groves and vines on the lower slopes by the plain.
  for (const o of order.slice(0, 6)) k.pineWoods.push({ x: o.p.x + k.r(-10, 10), z: o.p.z + k.r(6, 14), r: k.r(7, 11) });
  const woodAt = order[1]?.p ?? { x: plain.x + 30, z: plain.z - 20 };
  k.woods.push({ x: woodAt.x + k.r(-6, 6), z: woodAt.z + k.r(10, 16), r: k.r(10, 13) });
  if (order[3]) k.woods.push({ x: order[3].p.x, z: order[3].p.z + 12, r: k.r(8, 11) });
  k.groves.push({ x: plain.x - plain.r * 0.8, z: plain.z - 6, r: 8, rows: 0.2, spacing: 2.6 }, { x: plain.x + plain.r * 0.7, z: plain.z - 14, r: 8, rows: -0.2, spacing: 2.6 });
  k.hills.push({ x: plain.x - plain.r * 0.8, z: plain.z - 8, r: 12, h: 3.5 }, { x: plain.x + plain.r * 0.7, z: plain.z - 16, r: 12, h: 3.5 });
  k.cypress.push({ x: plain.x, z: plain.z - plain.r * 0.7, r: 4 });
  for (const o of order.slice(0, 4)) k.herds.push({ kind: o.i % 2 ? 'boar' : 'deer', x: o.p.x, z: o.p.z + 16, r: 8, head: 6, place: o.i % 2 ? 'in the mountain woods' : 'on the mountain' });

  const nearest = (x: number, z: number): P => order.reduce((b, o) => (dhypot(o.p.x - x, o.p.z - z) < dhypot(b.x - x, b.z - z) ? o.p : b), { x, z });
  const midZ = (sz + mz) / 2;
  const rx = Sketch.xAt(k.river, midZ);
  const districts: P[] = [
    { x: rx, z: midZ },
    { x: sx - 12, z: sz + 4 },
    { x: rx - 18, z: midZ },
    { x: plain.x - plain.r * 0.8, z: plain.z - 6 },
    { x: clamp(bx - W * 1.6 * sg, 10, n - 10), z: k.zb - 8 },
    { x: mx - 10, z: mz - 3 },
    nearest(n / 2, 10),
    { x: plain.x, z: plain.z - plain.r * 0.7 },
    { x: plain.x + plain.r * 0.7, z: plain.z - 12 },
    nearest(n - 20, 20),
    { x: n - 14, z: n * 0.5 },
    { x: bx + 5 * sg, z: zi - 8 },
    { x: bx + W * 0.7 * sg, z: zi - 3 },
    { x: hx - 4, z: tipZ - 22 },
  ];
  return k.data(n, districts, siteBy(k, bx, W, 1.2, sg), [0.7, 2.2], [3, 9]);
}

// ---------------------------------------------------------------------------
// A dry plain.

function dryplain(k: Sketch): CoastData {
  const n = k.n;
  const s = k.s;
  k.zb = n - k.r(24, 30);
  k.wob = 0.8;
  const W = k.r(30, 40) * dpow(s, 0.3);
  const D = k.r(12, 18);
  const bx = bayPlace(k, W, 1.5);
  const zi = k.zb - D;
  k.bay(bx, W, D, 1.5);
  const sg = capeSide(k, bx);
  const hw = k.r(14, 18);
  const hx = capeAt(k, bx, W, 1.5, hw, sg);
  const tipZ = k.zb + k.r(12, 18);
  k.cape(hx, hw, tipZ - k.zb);
  // The river: narrow, down the plain to the bay.
  const sx = clamp(bx + k.r(-0.35, 0.35) * n, 24, n - 24);
  const sz = k.r(8, 14);
  const mx = bx + W * k.r(-0.35, 0.25);
  const mz = k.shoreAt(mx) + 5;
  const len = dhypot(mx - sx, mz - sz);
  // (Winding across the plain in long bends, a different way on every land.)
  const swing = k.r(0.12, 0.24) * n * (k.chance(0.5) ? 1 : -1);
  k.river = k.course({ x: sx, z: sz }, { x: mx, z: mz }, { x: clamp(sx + swing, 20, n - 20), z: sz + len * 0.35 }, { x: clamp(mx - swing * 0.8, 20, n - 20), z: mz - len * 0.35 }, 12, 1.4);
  // A rocky ridge in the north with the copper; low hills over the plain with olives and vines.
  const rx0 = clamp(sx + (k.chance(0.5) ? 1 : -1) * k.r(28, 44), 18, n - 18);
  const ridgeZ = k.r(4, 12);
  const ridgeE = rx0 > n / 2 ? -1 : 1;
  k.hills.push({ x: rx0, z: ridgeZ, r: 18, h: k.r(7, 9), rocky: true }, { x: rx0 + 18 * ridgeE, z: k.r(0, 8), r: 15, h: k.r(5, 7), rocky: true }, { x: sx, z: sz - 18, r: 20, h: 6, rocky: true });
  // (The copper on the ridge's lower south flank, where a mine's road can climb to it.)
  k.copper.push({ x: rx0 - 2 * ridgeE, z: ridgeZ + 9, r: 5.5, place: 'in the north ridge' });
  k.herds.push({ kind: 'deer', x: rx0, z: 26, r: 9, head: 6, place: 'below the ridge' });
  k.headland(hx, tipZ, 0.85, false);
  k.frame(0.75);
  const avoid = [
    { x: bx, z: zi, r: W + 14 },
    { x: hx, z: tipZ - 30, r: 30 },
    { x: rx0, z: 8, r: 26 },
  ];
  const hills: P[] = [];
  const count = Math.round(5 * s * s);
  for (let i = 0; i < count * 8 && hills.length < count; i++) {
    const x = k.r(12, n - 12);
    const z = k.r(18, zi - 10);
    if (Sketch.near(k.river, x, z) < 14 || avoid.some((a) => dhypot(x - a.x, z - a.z) < a.r)) continue;
    hills.push({ x, z });
    avoid.push({ x, z, r: 20 });
    k.hills.push({ x, z, r: k.r(10, 15), h: k.r(2.2, 4) });
    k.groves.push({ x: x + k.r(-3, 3), z: z + k.r(-2, 4), r: k.r(7, 10), rows: k.r(-0.5, 0.5), spacing: k.r(2.5, 2.8) });
  }
  // One small wood, by the river; springs with cypresses round them out on the plain.
  const wz = sz + len * k.r(0.3, 0.5);
  k.woods.push({ x: Sketch.xAt(k.river, wz) + k.r(9, 12) * (k.chance(0.5) ? 1 : -1), z: wz, r: k.r(8, 10) });
  k.herds.push({ kind: 'boar', x: Sketch.xAt(k.river, wz), z: wz + 6, r: 7, head: 5, place: 'in the wood by the river' });
  const springs = 2 + Math.round(s * 1.5);
  for (let i = 0, made = 0; i < 60 && made < springs; i++) {
    const x = k.r(16, n - 16);
    const z = k.r(20, zi - 8);
    if (Sketch.near(k.river, x, z) < 30 || k.springs.some((p) => dhypot(p.x - x, p.z - z) < 36)) continue;
    k.springs.push({ x, z, r: k.r(9, 13) });
    k.cypress.push({ x: x + 2, z: z - 2, r: 3.5 });
    made++;
  }
  k.pineWoods.push({ x: bx + W * 0.6 * sg, z: zi - 4, r: 6 });
  k.herds.push({ kind: 'deer', x: n * 0.5, z: n * 0.3, r: 12, head: 7, place: 'on the open plain' });
  const h0 = hills[0] ?? { x: n * 0.3, z: n * 0.5 };
  const h1 = hills[1] ?? { x: n * 0.7, z: n * 0.5 };
  const midZ = (sz + mz) / 2;
  const rxm = Sketch.xAt(k.river, midZ);
  const districts: P[] = [
    { x: rxm, z: midZ },
    { x: rx0, z: 22 },
    { x: rxm - 20, z: midZ },
    h0,
    { x: clamp(bx - W * 1.4 * sg, 10, n - 10), z: k.zb - 8 },
    { x: mx - 10, z: mz - 3 },
    { x: rx0 + 20, z: 12 },
    k.springs[0] ?? { x: n * 0.5, z: n * 0.4 },
    h1,
    { x: n - 18, z: n * 0.25 },
    { x: n - 14, z: n * 0.55 },
    { x: bx + 5 * sg, z: zi - 8 },
    { x: bx + W * 0.6 * sg, z: zi - 4 },
    { x: hx - 4, z: tipZ - 20 },
  ];
  return k.data(n, districts, siteBy(k, bx, W, 1.5, sg), [0.6, 2.1], [3, 8], { dry: 1 });
}

// ---------------------------------------------------------------------------
// A wooded coast.

function wooded(k: Sketch): CoastData {
  const n = k.n;
  const s = k.s;
  k.zb = n - k.r(24, 30);
  const W = k.r(24, 32) * dpow(s, 0.3);
  const D = k.r(18, 25) * dpow(s, 0.25);
  const bx = bayPlace(k, W, 1.3);
  const zi = k.zb - D;
  k.bay(bx, W, D, 1.3);
  const sg = capeSide(k, bx);
  const hw = k.r(14, 18);
  const hx = capeAt(k, bx, W, 1.3, hw, sg);
  const tipZ = k.zb + k.r(14, 19);
  k.cape(hx, hw, tipZ - k.zb);
  const sx = clamp(bx + k.r(-0.4, 0.4) * n, 24, n - 26);
  const sz = k.r(16, 22) * dpow(s, 0.5);
  k.massif(sx, sz, 0.9);
  const mx = bx + W * k.r(-0.4, 0.3);
  const mz = k.shoreAt(mx) + 5.5;
  const len = dhypot(mx - sx, mz - sz);
  k.river = k.course({ x: sx, z: sz }, { x: mx, z: mz }, { x: sx + k.r(-6, 6), z: sz + len * 0.38 }, { x: mx + k.r(-8, 8), z: mz - len * 0.32 }, 9);
  k.headland(hx, tipZ);
  k.frame();
  // Rolling hills everywhere, most of them deep in wood; clearings by the bay and along the river.
  const clearing = { x: bx, z: zi - 20, r: W + 22 };
  const hills: P[] = [];
  for (let z = k.r(4, 14); z < k.zb - 10; z += k.r(24, 30)) {
    for (let x = k.r(-4, 16); x < n + 4; x += k.r(24, 32)) {
      const px = x + k.r(-6, 6);
      const pz = z + k.r(-6, 6);
      if (Sketch.near(k.river, px, pz) < 13 || dhypot(px - clearing.x, pz - clearing.z) < clearing.r || dhypot(px - sx, pz - sz) < 22) continue;
      if (dhypot(px - hx, pz - tipZ + 30) < 26) continue;
      hills.push({ x: px, z: pz });
      k.hills.push({ x: px, z: pz, r: k.r(13, 19), h: k.r(3.5, 7.5), rocky: k.chance(0.12) });
    }
  }
  // The woods: on most hills, big and deep; a few left open for groves and grass.
  hills.forEach((h, i) => {
    if (i % 4 === 3) {
      k.groves.push({ x: h.x, z: h.z + 4, r: k.r(7, 9), rows: k.r(-0.4, 0.4), spacing: 2.6 });
      k.cypress.push({ x: h.x + 8, z: h.z - 6, r: 3.5 });
      return;
    }
    // (A third thicker than elsewhere, over many more hills: at twice as thick the opening view drew over 5 million
    // triangles, more than four times the Bay's; at 1.3 it has about 3,200 timber trees, against about 370 on the other kinds.)
    k.woods.push({ x: h.x + k.r(-4, 4), z: h.z + k.r(-3, 5), r: k.r(12, 17), dense: 1.3 });
    if (i % 3 === 0) k.herds.push({ kind: i % 2 ? 'deer' : 'boar', x: h.x, z: h.z + 8, r: 9, head: 6, place: i % 2 ? 'in the deep woods' : 'in the oak woods' });
  });
  // Pines down to the shore.
  for (let x = k.r(0, 12); x < n; x += k.r(22, 34)) {
    if (Math.abs(x - bx) < W * 0.9) continue;
    k.pineWoods.push({ x, z: k.shoreAt(x) - k.r(6, 12), r: k.r(9, 13) });
  }
  const wx = clamp(sg > 0 ? bx - W * 1.5 : bx + W * 1.3, 14, n - 14);
  k.groves.push({ x: wx + sg, z: zi - 6, r: 9, rows: k.r(0.1, 0.4), spacing: 2.6 });
  k.hills.push({ x: wx, z: zi - 2, r: 13, h: k.r(3, 4) });
  const ex = n - k.r(6, 12);
  const ez = k.r(16, 24) * dpow(s, 0.5);
  k.hills.push({ x: ex, z: ez, r: 16, h: k.r(7, 9), rocky: true });
  k.copper.push({ x: ex - 10, z: ez - 6, r: 5.5, place: 'in the east hills' });
  k.herds.push({ kind: 'deer', x: ex - 20, z: ez + 10, r: 9, head: 7, place: 'on the east hills' });
  k.herds.push({ kind: 'boar', x: bx + W * 0.7 * sg, z: zi - 8, r: 7, head: 6, place: 'in the pine wood by the bay' });
  const h0 = hills[0] ?? { x: n * 0.3, z: 10 };
  const h1 = hills[1] ?? { x: n * 0.6, z: 30 };
  const midZ = (sz + mz) / 2;
  const rx = Sketch.xAt(k.river, midZ);
  const districts: P[] = [
    { x: rx, z: midZ },
    { x: sx - 13, z: sz + 3 },
    { x: rx - 22, z: midZ - 4 },
    { x: wx, z: zi - 4 },
    { x: clamp(wx - 6 * sg, 10, n - 10), z: k.zb - 8 },
    { x: mx - 12, z: mz - 3 },
    h0,
    h1,
    { x: bx + W * 0.5 * sg, z: zi - 26 },
    { x: ex - 10, z: ez + 2 },
    { x: n - 14, z: lerp(ez, zi, 0.6) },
    { x: bx + 6 * sg, z: zi - 8 },
    { x: bx + W * 0.75 * sg, z: zi - 3 },
    { x: hx - 4, z: tipZ - 24 },
  ];
  return k.data(n, districts, siteBy(k, bx, W, 1.3, sg), [0.8, 2.5], [4, 12], { oaks: 0.45 });
}
