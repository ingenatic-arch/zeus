/**
 * Generated lands (slice 42): `generateCoast(kind, size, seed)` lays out a
 * land as the same shapes the Bay is authored in (coast.ts's CoastData), so
 * bake.ts turns it into grids exactly as it does the Bay. Pure and seeded:
 * the same kind, size and seed always give the same land.
 *
 * The first kind is a sheltered bay, laid out like the Bay but from the
 * seed: the sea to the south, a bay part-way along the shore with a headland
 * to its east, a rocky massif in the north-west where the river rises, the
 * river winding down to the bay through its flood plain, rolling hills along
 * the north and the east hills, olive groves, pine woods, woods for the
 * loggers, copper in the crags and on the headland, marble on the headland's
 * crown, deer on the hills and boar in the woods. Features keep the Bay's
 * sizes; a larger land has more of them and more ground between.
 */
import { Rng } from '../sim/rng';
import { MAP_MARGIN, type Area, type CoastData, type Grove, type HerdHome, type Hill, type Outcrop } from './coast';
import { dcos, dpow, dsin } from './dmath';
import { clamp, lerp, smoothstep, valueNoise } from './noise';

// Slice 46: the other kinds, and the sheltered bay's second edition.
import { generateKind } from './kinds';

/** The generated kinds (lands.ts adds the Bay). */
export type GeneratedKind = 'sheltered' | 'islands' | 'delta' | 'mountains' | 'dryplain' | 'woods';

/**
 * Slice 46: the generator's edition. A land is made by the edition it was
 * founded with, so a town saved on it always finds the same ground: edition 1
 * is slice 42's sheltered bay (below, unchanged), edition 2 every kind of
 * slice 46 (kinds.ts).
 */
export const LAND_GEN = 2;

/** A seed for the land's noise and plants, from its generator seed (kept well inside 32 bits, so `seed + k` never wraps). */
const noiseSeed = (seed: number): number => 0x10000 + ((Math.imul(seed >>> 0, 0x9e3779b1) >>> 0) % 0x3fff0000);

/** Generate a land's shapes (slice 46: by the edition it was founded with). */
export function generateCoast(kind: string, size: number, seed: number, gen: number = LAND_GEN): CoastData {
  if (gen === 1) {
    if (kind !== 'sheltered') throw new Error(`No land of kind "${kind}" in the first edition`);
    return shelteredBay(size, seed >>> 0);
  }
  return generateKind(kind, size, seed >>> 0);
}

/** A rounded bump: 1 at u = 0, falling smoothly to 0 at |u| = 1. */
const bump = (u: number): number => (Math.abs(u) >= 1 ? 0 : (dcos(Math.PI * u) + 1) / 2);

function shelteredBay(n: number, seed: number): CoastData {
  const rng = new Rng((seed ^ 0x5eba7) >>> 0);
  const ns = noiseSeed(seed);
  /** How much larger than the Bay's this land is. */
  const s = n / 128;
  const r = (lo: number, hi: number): number => rng.range(lo, hi);

  // --- The shore: a baseline a sea's width from the south edge, the bay dipping into it, the headland bulging out.
  const zb = n - r(24, 29);
  const W = r(30, 36) * dpow(s, 0.7);
  const D = r(21, 27) * dpow(s, 0.45);
  const bx = clamp(n * r(0.4, 0.54), W + 24, n - W - 46);
  const zi = zb - D;
  const hw = r(15, 19) * dpow(s, 0.3);
  const hx = Math.min(bx + W + hw * r(0.55, 0.85), n - hw * 0.7);
  const tipZ = Math.min(n - 6, zb + r(15, 20));
  const H = tipZ - zb;
  // (A broad, flat-bottomed bay; its west side slopes in gently, its east side steeper, as on the Bay.)
  const bayDip = (x: number): number => {
    const u = x < bx ? (bx - x) / (W * 1.4) : (x - bx) / W;
    return D * (1 - smoothstep(0.25, 1, u));
  };
  const headBump = (x: number): number => H * dpow(bump((x - hx) / hw), 0.6);
  const wobble = (x: number): number => 3.2 * (valueNoise(x * 0.035, 1.7, ns + 3) - 0.5) + 1.4 * (valueNoise(x * 0.11, 4.1, ns + 4) - 0.5);
  const shoreAt = (x: number): number => zb + wobble(x) - bayDip(x) + headBump(x);
  const shore: [number, number][] = [];
  const far = MAP_MARGIN + 140;
  for (let x = -far; x < -24; x += 30) shore.push([x, shoreAt(x)]);
  for (let x = -24; x <= n + 24; x += 6) shore.push([x, shoreAt(x)]);
  for (let x = n + 54; x <= n + far; x += 30) shore.push([x, shoreAt(x)]);

  const hills: Hill[] = [];
  const groves: Grove[] = [];
  const pineWoods: Area[] = [];
  const woods: Area[] = [];
  const cypressStands: Area[] = [];
  const copper: Outcrop[] = [];
  const marble: Outcrop[] = [];
  const herds: HerdHome[] = [];
  const islets: CoastData['islets'] = [];

  // --- The rocky massif in the north-west, where the river rises.
  const sx = n * r(0.17, 0.25);
  const sz = r(17, 24) * dpow(s, 0.5);
  hills.push(
    { x: sx - 17, z: sz - 9, r: 20, h: r(11, 14), rocky: true },
    { x: sx + 3, z: sz - 17, r: 15, h: r(9, 11), rocky: true },
    { x: sx - 37, z: sz + 11, r: 18, h: r(9, 11), rocky: true },
    { x: sx - 29, z: sz - 37, r: 28, h: 16, rocky: true },
  );
  copper.push({ x: sx - 17, z: sz - 11, r: 5.5, place: 'in the crags above the spring' });
  herds.push({ kind: 'deer', x: sx - 16, z: sz + 21, r: 8, head: 7, place: 'below the crags' });

  // --- The river: from the spring, south and then east, to its mouth in the bay.
  const mx = bx + W * r(-0.2, 0.1);
  const mz = shoreAt(mx) + 5.5;
  const len = Math.sqrt((mx - sx) * (mx - sx) + (mz - sz) * (mz - sz));
  const p1: [number, number] = [sx + r(-3, 6), sz + len * r(0.32, 0.42)];
  const p2: [number, number] = [mx - r(2, 9), mz - len * r(0.28, 0.38)];
  const river: [number, number][] = [];
  const k = Math.max(8, Math.round(len / 8));
  const wig = ns + 9;
  for (let i = 0; i <= k; i++) {
    const t = i / k;
    const a = (1 - t) * (1 - t) * (1 - t);
    const b = 3 * (1 - t) * (1 - t) * t;
    const c = 3 * (1 - t) * t * t;
    const d = t * t * t;
    let x = a * sx + b * p1[0] + c * p2[0] + d * mx;
    let z = a * sz + b * p1[1] + c * p2[1] + d * mz;
    // It meanders, more on a long river, and not at its ends.
    const m = (3 + len * 0.06) * (valueNoise(t * (1 + len / 45), 0.5, wig) - 0.5) * 2 * dsin(Math.PI * t);
    x += m;
    z -= m * 0.25;
    river.push([x, z]);
  }
  /** The river's x at a z (roughly: the nearest control point's). */
  const riverX = (z: number): number => {
    let best = river[0];
    for (const p of river) if (Math.abs(p[1] - z) < Math.abs(best[1] - z)) best = p;
    return best[0];
  };

  // --- Rolling hills along the north, east of the massif, and the east hills.
  const north: Array<{ x: number; z: number }> = [];
  for (let x = sx + r(30, 40); x < n - 26; x += r(26, 36)) {
    const h = { x, z: r(-2, 10) * dpow(s, 0.5), r: r(17, 23), h: r(5, 8.5) };
    hills.push(h);
    north.push(h);
  }
  // (On a larger land, a second row of hills further in, either side of the river.)
  for (let x = r(10, 30); s > 1.2 && x < n - 20; x += r(34, 48)) {
    const z = n * r(0.24, 0.34);
    if (Math.abs(x - riverX(z)) < 26) continue;
    hills.push({ x, z, r: r(15, 21), h: r(4.5, 8), rocky: rng.float() < 0.35 });
  }
  const ex = n - r(4, 9);
  const ez = r(14, 22) * dpow(s, 0.5);
  hills.push({ x: ex, z: ez, r: 17, h: r(8, 10), rocky: true });
  copper.push({ x: ex - 12, z: ez - 8, r: 5.5, place: 'in the east hills' });
  const firstNorth = north[0] ?? { x: sx + 35, z: 6 };
  herds.push({ kind: 'deer', x: firstNorth.x - 6, z: firstNorth.z + 9, r: 10, head: 8, place: 'in the north hills' });
  herds.push({ kind: 'deer', x: ex - 24, z: ez + 7, r: 9, head: 7, place: 'on the east hills' });
  herds.push({ kind: 'deer', x: n - 10, z: ez + 28 * dpow(s, 0.6), r: 7, head: 6, place: 'on the far east slopes' });

  // --- Mountains beyond the map, framing the view.
  for (let x = -60; x < n + 90; x += r(60, 80)) hills.push({ x, z: r(-66, -52), r: r(42, 52), h: r(22, 30), rocky: true });
  hills.push({ x: -62, z: -20, r: 42, h: 24, rocky: true }, { x: n + 54, z: -8, r: 42, h: 22, rocky: true });
  hills.push({ x: n + 62, z: zb * 0.45, r: 30, h: 10 }, { x: -70, z: zb * 0.47, r: 30, h: 9 });

  // --- The headland east of the bay: a rocky crown with cliffs to the sea, a gentler hill behind.
  hills.push(
    { x: hx - 4, z: tipZ - 23, r: 11, h: r(5.5, 6.5), rocky: true, cliffy: true },
    { x: hx - 12, z: tipZ - 49, r: 16, h: r(4, 5.5) },
    { x: hx + 1, z: tipZ - 9, r: 7, h: 4, cliffy: true },
  );
  marble.push({ x: hx - 5, z: tipZ - 17, r: 5.5, place: 'on the headland’s crown' }, { x: hx - 11, z: tipZ - 29, r: 4.5, place: 'above the bay on the headland' });
  copper.push({ x: hx - 2, z: tipZ - 25, r: 4.5, place: 'on the headland' });
  pineWoods.push({ x: hx - 4, z: tipZ - 17, r: 12 });
  groves.push({ x: hx - 12, z: tipZ - 45, r: 7, rows: r(0.3, 0.7), spacing: 2.5 });
  herds.push({ kind: 'boar', x: hx - 10, z: tipZ - 39, r: 6, head: 5, place: 'on the headland' });

  // --- West of the bay: a low rise for olives, the west shore's pines and the loggers' wood above them.
  const wx = bx - W * 1.5;
  hills.push({ x: wx, z: zi - 1.5, r: 14, h: r(3, 4) });
  groves.push({ x: wx + 1, z: zi - 5.5, r: 10, rows: r(0.1, 0.4), spacing: 2.6 });
  pineWoods.push({ x: Math.max(8, wx - 10), z: zb - 9, r: 12 });
  woods.push({ x: Math.max(10, wx - 6), z: zb - 20, r: 11 });
  herds.push({ kind: 'boar', x: Math.max(8, wx - 8), z: zb - 15, r: 9, head: 6, place: 'in the west woods' });

  // --- By the bay: a pine wood on its east shore, an olive grove above it.
  pineWoods.push({ x: bx + W * 0.75, z: zi - 5, r: 8 });
  herds.push({ kind: 'boar', x: bx + W * 0.75, z: zi - 8, r: 7, head: 6, place: 'in the pine wood by the bay' });
  groves.push({ x: bx + W * 0.55, z: zi - 31 * dpow(s, 0.5), r: 11, rows: r(-0.3, 0), spacing: 2.6 });
  groves.push({ x: riverX(sz + len * 0.2) + r(16, 24), z: sz + len * 0.2, r: 7, rows: r(0, 0.2), spacing: 2.7 });

  // --- The loggers' wood in the north hills, and cypresses.
  woods.push({ x: firstNorth.x, z: firstNorth.z + 1, r: 10 });
  cypressStands.push({ x: firstNorth.x + 6, z: firstNorth.z + 22, r: 4 }, { x: sx - 3, z: sz + 27, r: 3 }, { x: ex - 26, z: ez + 6, r: 4 });

  // --- An islet in the bay's mouth, on some lands.
  if (rng.float() < 0.5) {
    const ix = bx + W * r(-0.25, 0.25);
    const iz = zi + D * r(0.75, 0.9);
    islets.push({ x: ix, z: iz, rx: r(2.8, 3.8), rz: r(2.2, 2.9) });
    hills.push({ x: ix, z: iz, r: 3, h: 1.5, rocky: true, cliffy: true });
    pineWoods.push({ x: ix, z: iz, r: 2.2 });
  }

  // --- Larger lands: low rises inland with groves, woods and herds on them, away from the river and the bay.
  const extra = Math.round((s - 1) * 8);
  for (let i = 0, made = 0; i < extra * 4 && made < extra; i++) {
    const x = r(16, n - 16);
    const z = r(30, zi - 18);
    if (Math.abs(x - riverX(z)) < 22) continue;
    if (Math.abs(x - bx) < W && z > zi - 30) continue;
    if (Math.abs(x - hx) < 24 && z > tipZ - 60) continue;
    const kind = made % 3;
    made++;
    hills.push({ x, z, r: r(11, 16), h: r(2.5, 5) });
    if (kind === 0) {
      woods.push({ x, z, r: r(9, 12) });
      herds.push({ kind: 'boar', x, z, r: 7, head: 5, place: 'in the woods inland' });
    } else if (kind === 1) {
      groves.push({ x, z: z + 3, r: r(7, 10), rows: r(-0.4, 0.4), spacing: 2.6 });
    } else {
      cypressStands.push({ x, z, r: 3.5 });
      herds.push({ kind: 'deer', x, z, r: 8, head: 6, place: 'on the hills inland' });
    }
  }

  // --- The districts, each on the feature it is named for (districts.ts' DISTRICTS, in order).
  const midZ = (sz + mz) / 2;
  const districts = [
    { x: riverX(midZ), z: midZ },
    { x: sx - 13, z: sz + 3 },
    { x: riverX(midZ) - 24 * dpow(s, 0.6), z: midZ - 4 },
    { x: wx, z: zi - 3 },
    { x: Math.max(10, wx - 6), z: zb - 9 },
    { x: mx - 14, z: mz - 3 },
    { x: firstNorth.x - 2, z: firstNorth.z + 6 },
    { x: firstNorth.x + 4, z: firstNorth.z + 22 },
    { x: bx + W * 0.55, z: zi - 31 * dpow(s, 0.5) + 2 },
    { x: ex - 10, z: ez + 2 },
    { x: n - 16, z: lerp(ez, zi, 0.6) },
    { x: bx + 7, z: zi - 9 },
    { x: bx + W * 0.8, z: zi - 3 },
    { x: hx - 4, z: tipZ - 27 },
  ];

  return {
    shore,
    islets,
    hills,
    river,
    riverWidth: [0.8, 2.6],
    valleyWidth: [4, 13],
    groves,
    pineWoods,
    copper,
    marble,
    woods,
    cypressStands,
    size: n,
    seed: ns,
    herds,
    districts,
    site: { x: bx + W * 0.25, z: zi - 10 },
  };
}
