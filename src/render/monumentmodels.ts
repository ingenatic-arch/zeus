import * as THREE from 'three';
import { hash2 } from '../map/noise';
import { col, PAL } from './palette';
import { lumpy, type Part } from './trees';

/**
 * Slice 35's models: the masons' yard and the three monuments, at every
 * stage of their building, so that you can watch one go up: marked out on a
 * levelled pad with stakes and cords, its first courses laid, the tower (or
 * the bronze frame, or the seats) rising inside its scaffold with a crane
 * beside it, and the finished thing. The marble, timber and bronze waiting
 * on site are piled at its corners. Local frame as Works': the footprint's
 * centre at the origin, the front facing +x, y = 0 the top of the highest
 * ground under it (the pad is battered down to the lowest).
 *
 * Built from plain shapes like the rest; a monument is one mesh, rebuilt
 * only when it moves on a step (see MonumentsView).
 */

type V3 = [number, number, number];

/** A box from (x0, z0) to (x1, z1), standing from y0 to y1. */
export const slab = (x0: number, z0: number, x1: number, z1: number, y0: number, y1: number): THREE.BufferGeometry =>
  new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
/** A box centred at (x, z), half-sizes (hx, hz), from y0 to y1. */
const block = (x: number, z: number, hx: number, hz: number, y0: number, y1: number): THREE.BufferGeometry => slab(x - hx, z - hz, x + hx, z + hz, y0, y1);
/** An upright cylinder at (x, z) from y0 to y1, radius r0 at the foot and r1 at the top. */
const drum = (x: number, z: number, r0: number, r1: number, y0: number, y1: number, seg: number): THREE.BufferGeometry =>
  new THREE.CylinderGeometry(r1, r0, y1 - y0, seg).translate(x, (y0 + y1) / 2, z);

/** A rod from a to b, radius r (r2 at b), `seg` sided. */
export function rodGeo(a: V3, b: V3, r: number, r2 = r, seg = 4): THREE.BufferGeometry {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const len = Math.max(1e-4, va.distanceTo(vb));
  const g = new THREE.CylinderGeometry(r2, r, len, seg).translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize()));
  return g.translate(a[0], a[1], a[2]);
}

/** Parts merged into one geometry with vertex colours (no finish trim: scaffolds and figures don't take cornices). */
export function mergeParts(parts: Part[]): THREE.BufferGeometry {
  let n = 0;
  const flat = parts.map(({ geo, color }) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    n += g.attributes.position.count;
    return { g, c: col(color) };
  });
  const pos = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  let i = 0;
  for (const { g, c } of flat) {
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let k = 0; k < p.count; k++, i++) {
      pos[i * 3] = p.getX(k);
      pos[i * 3 + 1] = p.getY(k);
      pos[i * 3 + 2] = p.getZ(k);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  out.computeVertexNormals();
  out.computeBoundingSphere();
  return out;
}

/** The tones of a building site and its monuments. */
export const TONE = {
  marble: PAL.marble,
  marbleShade: PAL.marbleShade,
  marbleWarm: '#e9e0cc',
  marbleDeep: '#c9bea6',
  dust: '#ddd3bf',
  pad: '#b49c76',
  padDark: '#9c8563',
  earthBank: '#a88f68',
  earthBankDark: '#937a55',
  sand: '#dcc590',
  sandDark: '#cbb27c',
  pole: '#8a6a45',
  poleDark: '#6d5236',
  plank: '#b08a5a',
  rope: PAL.rope,
  cord: '#c0563a',
  stake: '#7a5c3a',
  bronze: PAL.bronze,
  bronzeShade: '#9a7130',
  bronzeDeep: '#7d5a26',
  bronzeLight: '#d2a65a',
  window: '#3b3530',
  tile: PAL.roofTile,
  tileDark: PAL.roofTileDark,
  log: PAL.log,
  logDark: PAL.logDark,
  logEnd: '#d6b27a',
};

// ---------------------------------------------------------------------------
// The site: the levelled pad, its stakes and cords, the scaffold, the crane, the piles.

/**
 * The pad the monument stands on: y = 0 at the top, battered down `depth`
 * to the lowest ground under it in rough courses, so a site on a slope
 * stands on a levelled terrace (earth, faced with stone once it is built).
 */
export function pad(hx: number, hz: number, depth: number, stone: boolean, seed: number): Part[] {
  const parts: Part[] = [];
  const d = Math.max(0.06, depth + 0.06);
  // In courses of rough stone, each stepping out from the one above (terraced, not a sheer wall), the top one
  // levelled earth until the work begins and dressed marble after; boulders heaped along its foot.
  const course = 0.15;
  const n = Math.max(1, Math.ceil(d / course));
  const rock = [PAL.rockWarm, PAL.rockGrey, TONE.padDark, PAL.rockWarm];
  for (let i = 0; i < n; i++) {
    const y1 = -i * course;
    const y0 = Math.max(-d, y1 - course);
    const out = 0.03 + i * 0.06;
    const t = i === 0 ? (stone ? TONE.marbleShade : TONE.pad) : rock[(i + Math.floor(hash2(i, 3, seed) * 2)) % rock.length];
    parts.push({ geo: lumpy(new THREE.BoxGeometry(2 * (hx + out), y1 - y0, 2 * (hz + out), 3, 1, 3), i === 0 ? 0 : 0.035, seed + i * 7).translate(0, (y0 + y1) / 2, 0), color: t });
  }
  // Boulders along the foot and against the lower courses, so it ends in rubble rather than a ruled line.
  const per = Math.max(3, Math.round(hx + hz) * 2);
  for (let side = 0; side < 4; side++) {
    for (let k = 0; k < per; k++) {
      const u = -1 + (2 * (k + 0.5 + (hash2(k, side, seed) - 0.5) * 0.7)) / per;
      const at = 0.4 + 0.6 * hash2(k, side, seed + 3);
      const yy = -d * at;
      const out = 0.03 + (Math.min(n - 1, Math.floor((d * at) / course)) + 1) * 0.06;
      const ex = hx + out;
      const ez = hz + out;
      const [x, z] = side === 0 ? [u * ex, -ez] : side === 1 ? [ex, u * ez] : side === 2 ? [u * ex, ez] : [-ex, u * ez];
      const r = 0.06 + 0.08 * hash2(k, side, seed + 1) * Math.min(1, d);
      parts.push({ geo: lumpy(new THREE.DodecahedronGeometry(r, 0), 0.4, seed + side * 31 + k).scale(1.3, 0.75, 1.3).translate(x, yy, z), color: hash2(k, side, seed + 2) > 0.5 ? TONE.padDark : PAL.rockGrey });
    }
  }
  return parts;
}

/** Stakes at the corners (and along the sides) of a box of half-sizes (hx, hz), with an ochre cord between them: marked out. */
export function stakes(hx: number, hz: number): Part[] {
  const parts: Part[] = [];
  const corners: Array<[number, number]> = [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]];
  const pts: Array<[number, number]> = [];
  for (let k = 0; k < 4; k++) {
    const [ax, az] = corners[k];
    const [bx, bz] = corners[(k + 1) % 4];
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 0.7));
    for (let i = 0; i < n; i++) pts.push([ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n]);
  }
  for (const [x, z] of pts) parts.push({ geo: block(x, z, 0.018, 0.018, 0, 0.2), color: TONE.stake });
  for (let i = 0; i < pts.length; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[(i + 1) % pts.length];
    parts.push({ geo: rodGeo([ax, 0.16, az], [bx, 0.16, bz], 0.006, 0.006, 3), color: TONE.cord });
  }
  // A scratched outline on the pad where the first course will go.
  for (const [x0, z0, x1, z1] of [[-hx, -hz, hx, -hz + 0.05], [-hx, hz - 0.05, hx, hz], [-hx, -hz, -hx + 0.05, hz], [hx - 0.05, -hz, hx, hz]]) parts.push({ geo: slab(x0, z0, x1, z1, 0, 0.006), color: TONE.padDark });
  return parts;
}

/**
 * Timber scaffolding round a box of half-sizes (hx, hz), from y0 up to y1:
 * poles at the corners and along the sides, ledgers every so high, plank
 * decks and a brace on each side.
 */
export function scaffold(hx: number, hz: number, y0: number, y1: number, seed: number): Part[] {
  const parts: Part[] = [];
  if (y1 - y0 < 0.1) return parts;
  const o = 0.12;
  const X = hx + o;
  const Z = hz + o;
  const top = y1 + 0.18;
  const along = (len: number): number[] => {
    const n = Math.max(1, Math.round(len / 0.6));
    return Array.from({ length: n + 1 }, (_, i) => -len / 2 + (len * i) / n);
  };
  const xs = along(2 * X);
  const zs = along(2 * Z);
  const posts: Array<[number, number]> = [];
  for (const x of xs) posts.push([x, -Z], [x, Z]);
  for (const z of zs.slice(1, -1)) posts.push([-X, z], [X, z]);
  posts.forEach(([x, z], i) => {
    const lean = (hash2(i, 1, seed) - 0.5) * 0.02;
    parts.push({ geo: rodGeo([x, y0, z], [x + lean, top + 0.06 * hash2(i, 2, seed), z + lean], 0.016, 0.013), color: i % 3 ? TONE.pole : TONE.poleDark });
  });
  // Ledgers and decks.
  for (let y = y0 + 0.4; y <= y1 + 0.05; y += 0.4) {
    for (const z of [-Z, Z]) parts.push({ geo: rodGeo([-X, y, z], [X, y, z], 0.01), color: TONE.pole });
    for (const x of [-X, X]) parts.push({ geo: rodGeo([x, y, -Z], [x, y, Z], 0.01), color: TONE.pole });
  }
  for (let y = y0 + 0.8; y <= y1 + 0.05; y += 0.8) {
    parts.push({ geo: slab(-X - 0.02, -Z - 0.02, X + 0.02, -Z + 0.11, y, y + 0.02), color: TONE.plank });
    parts.push({ geo: slab(-X - 0.02, Z - 0.11, X + 0.02, Z + 0.02, y, y + 0.02), color: TONE.plank });
    parts.push({ geo: slab(-X - 0.02, -Z + 0.11, -X + 0.11, Z - 0.11, y, y + 0.02), color: TONE.plank });
    parts.push({ geo: slab(X - 0.11, -Z + 0.11, X + 0.02, Z - 0.11, y, y + 0.02), color: TONE.plank });
  }
  // A brace on each side, and a ladder up the front.
  const yb = Math.min(y1, y0 + 1.6);
  parts.push({ geo: rodGeo([-X, y0, -Z], [X, yb, -Z], 0.009), color: TONE.poleDark });
  parts.push({ geo: rodGeo([X, y0, Z], [-X, yb, Z], 0.009), color: TONE.poleDark });
  parts.push({ geo: rodGeo([-X, y0, Z], [-X, yb, -Z], 0.009), color: TONE.poleDark });
  for (const z of [0.08, 0.24]) parts.push({ geo: rodGeo([X + 0.14, y0, z], [X + 0.06, y1, z], 0.008), color: TONE.poleDark });
  for (let y = y0 + 0.12; y < y1; y += 0.14) {
    const f = (y - y0) / Math.max(0.01, y1 - y0);
    parts.push({ geo: rodGeo([X + 0.14 - 0.08 * f, y, 0.08], [X + 0.14 - 0.08 * f, y, 0.24], 0.005), color: TONE.pole });
  }
  return parts;
}

/**
 * A treadwheel crane standing at (x, z), its jib leaning in over the work
 * (towards -x of its own turn `yaw`) to the height `h`, a block hanging from
 * its rope.
 */
export function crane(x: number, z: number, yaw: number, h: number, load: string): Part[] {
  const parts: Part[] = [];
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const at = (lx: number, y: number, lz: number): V3 => [x + lx * c + lz * s, y, z - lx * s + lz * c];
  const lean = Math.min(0.9, h * 0.25);
  for (const lz of [-0.14, 0.14]) parts.push({ geo: rodGeo(at(0.15, 0, lz), at(-lean, h, lz * 0.3), 0.022, 0.016), color: TONE.poleDark });
  // The stay rope back to a stake.
  parts.push({ geo: rodGeo(at(-lean, h, 0), at(0.75, 0.02, 0), 0.005, 0.005, 3), color: TONE.rope });
  parts.push({ geo: block(...([at(0.75, 0, 0)[0], at(0.75, 0, 0)[2]] as [number, number]), 0.02, 0.02, 0, 0.1), color: TONE.stake });
  // The wheel at its foot, a man's height, on its axle between two posts.
  const [wx, , wz] = at(0.22, 0, 0);
  const wheel = new THREE.TorusGeometry(0.2, 0.02, 4, 10).rotateY(yaw).translate(wx, 0.24, wz);
  parts.push({ geo: wheel, color: TONE.pole });
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 4;
    parts.push({ geo: rodGeo(at(0.22 + Math.cos(a) * 0.2, 0.24 + Math.sin(a) * 0.2, 0), at(0.22 - Math.cos(a) * 0.2, 0.24 - Math.sin(a) * 0.2, 0), 0.006), color: TONE.poleDark });
  }
  for (const lz of [-0.1, 0.1]) parts.push({ geo: rodGeo(at(0.22, 0, lz), at(0.22, 0.26, lz), 0.012), color: TONE.poleDark });
  // The rope down from the jib's head, and the block on it.
  const hang = Math.max(0.3, h * 0.55);
  parts.push({ geo: rodGeo(at(-lean, h, 0), at(-lean, hang + 0.08, 0), 0.004, 0.004, 3), color: TONE.rope });
  const [bx, , bz] = at(-lean, 0, 0);
  parts.push({ geo: new THREE.BoxGeometry(0.16, 0.1, 0.12).rotateY(yaw).translate(bx, hang, bz), color: load });
  return parts;
}

/**
 * A pile of n blocks of marble at (x, z), stacked in twos and threes on a
 * pair of dark timber skids (review of slice 35: on the pale pad and steps
 * the blocks alone hardly showed, so they are a little bigger, and the skids
 * set them off).
 */
export function marblePile(x: number, z: number, n: number, seed: number): Part[] {
  const parts: Part[] = [];
  if (n <= 0) return parts;
  const skid = 0.035;
  const wide = Math.min(n, 3);
  const len = 0.19 * (wide - 1) + 0.26 + (n > 3 ? 0.09 : 0);
  const mid = x + (n > 3 ? 0.045 : 0);
  for (const dz of [-0.07, 0.07]) parts.push({ geo: new THREE.BoxGeometry(len, skid, 0.05).translate(mid, skid / 2, z + dz), color: TONE.poleDark });
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / 3);
    const k = i % 3;
    const bx = x + (k - 1) * 0.19 + (row % 2) * 0.09;
    const bz = z + (hash2(i, 1, seed) - 0.5) * 0.04;
    parts.push({ geo: lumpy(new THREE.BoxGeometry(0.17, 0.115, 0.23), 0.05, seed + i).translate(bx, skid + 0.0575 + row * 0.115, bz), color: i % 2 ? TONE.marble : TONE.marbleShade });
  }
  return parts;
}

/** A pile of n logs at (x, z), lying along x, in a pyramid. */
export function logPile(x: number, z: number, n: number): Part[] {
  const parts: Part[] = [];
  const r = 0.04;
  let i = 0;
  for (let row = 0; i < n; row++) {
    const inRow = Math.max(1, 4 - row);
    for (let k = 0; k < inRow && i < n; k++, i++) {
      const lz = z + (k - (inRow - 1) / 2) * r * 2.05;
      const y = r + row * r * 1.75;
      parts.push({ geo: new THREE.CylinderGeometry(r, r * 1.05, 0.5, 6).rotateZ(Math.PI / 2).translate(x, y, lz), color: i % 2 ? TONE.logDark : TONE.log });
      parts.push({ geo: new THREE.CylinderGeometry(r * 0.9, r * 0.9, 0.004, 6).rotateZ(Math.PI / 2).translate(x + 0.252, y, lz), color: TONE.logEnd });
    }
  }
  return parts;
}

/** A stack of n bronze ingots at (x, z) (the copper, cast by the armourers). */
export function ingotPile(x: number, z: number, n: number): Part[] {
  const parts: Part[] = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / 3);
    const k = i % 3;
    const across = row % 2 === 1;
    const g = new THREE.BoxGeometry(0.16, 0.035, 0.06);
    if (across) g.rotateY(Math.PI / 2);
    const off = (k - 1) * 0.065;
    parts.push({ geo: g.translate(x + (across ? off : 0), 0.018 + row * 0.036, z + (across ? 0 : off)), color: i % 2 ? TONE.bronze : TONE.bronzeShade });
  }
  return parts;
}

/** How many pieces to show for so much of a material on site (0 none, up to `most`). */
export const piecesFor = (n: number, per: number, most: number): number => (n <= 0 ? 0 : Math.min(most, Math.ceil(n / per)));

// ---------------------------------------------------------------------------
// The masons' yard (2 x 2: -1..1).

/**
 * The masons' yard: an earth floor white with chippings, a lean-to shed at
 * the back on four posts over the bench, a block on trestles being dressed,
 * a stack of dressed blocks and a column drum, shear legs over a block, and
 * rollers for moving them.
 */
export function masonsModel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  parts.push({ geo: slab(-0.94, -0.94, 0.94, 0.94, 0, 0.012), color: TONE.pad });
  for (let i = 0; i < 14; i++) {
    const x = -0.8 + 1.6 * hash2(i, 1, 3501);
    const z = -0.8 + 1.6 * hash2(i, 2, 3501);
    parts.push({ geo: slab(x - 0.09, z - 0.07, x + 0.09, z + 0.07, 0.012, 0.016), color: TONE.dust });
  }
  // The shed: four posts, a low back wall of rubble, a tiled lean-to roof sloping to the front.
  for (const [x, z] of [[-0.82, -0.78], [-0.82, 0.78], [-0.22, -0.78], [-0.22, 0.78]]) parts.push({ geo: block(x, z, 0.025, 0.025, 0, x < -0.5 ? 0.6 : 0.5), color: TONE.poleDark });
  parts.push({ geo: slab(-0.9, -0.84, -0.8, 0.84, 0, 0.3), color: PAL.rockGrey });
  const roof = new THREE.BoxGeometry(0.78, 0.04, 1.78).rotateZ(-0.16).translate(-0.52, 0.57, 0);
  parts.push({ geo: roof, color: TONE.tile });
  parts.push({ geo: new THREE.BoxGeometry(0.06, 0.05, 1.8).rotateZ(-0.16).translate(-0.15, 0.51, 0), color: TONE.tileDark });
  // Under it, the bench with a block on it and the tools on the wall.
  parts.push({ geo: slab(-0.75, -0.6, -0.45, 0.1, 0.18, 0.22), color: TONE.plank });
  for (const [x, z] of [[-0.72, -0.56], [-0.48, -0.56], [-0.72, 0.06], [-0.48, 0.06]]) parts.push({ geo: block(x, z, 0.015, 0.015, 0, 0.18), color: TONE.poleDark });
  parts.push({ geo: lumpy(new THREE.BoxGeometry(0.2, 0.12, 0.26), 0.04, 3502).translate(-0.6, 0.28, -0.3), color: TONE.marble });
  for (const z of [0.3, 0.42, 0.54]) parts.push({ geo: rodGeo([-0.79, 0.2, z], [-0.79, 0.36, z + 0.02], 0.008), color: PAL.charDark });
  // In the yard: a block on trestles being dressed, half rough, half smooth.
  for (const z of [-0.2, 0.12]) {
    parts.push({ geo: rodGeo([0.12, 0, z - 0.06], [0.24, 0.2, z], 0.01), color: TONE.poleDark });
    parts.push({ geo: rodGeo([0.36, 0, z - 0.06], [0.24, 0.2, z], 0.01), color: TONE.poleDark });
  }
  parts.push({ geo: slab(0.12, -0.24, 0.36, 0.16, 0.2, 0.23), color: TONE.plank });
  parts.push({ geo: lumpy(new THREE.BoxGeometry(0.2, 0.14, 0.3), 0.1, 3503).translate(0.24, 0.3, -0.1), color: TONE.marbleShade });
  parts.push({ geo: new THREE.BoxGeometry(0.2, 0.14, 0.12).translate(0.24, 0.3, 0.1), color: TONE.marble });
  // A stack of dressed blocks by the gate, and a column drum standing.
  parts.push(...marblePile(0.55, -0.65, 5, 3504));
  parts.push({ geo: drum(0.62, 0.55, 0.14, 0.14, 0.012, 0.2, 10), color: TONE.marbleWarm });
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    parts.push({ geo: slab(-0.004, -0.004, 0.004, 0.004, 0.012, 0.2).translate(0.62 + Math.cos(a) * 0.142, 0, 0.55 + Math.sin(a) * 0.142), color: TONE.marbleDeep });
  }
  // Shear legs over a rough block, its rope down to it.
  parts.push({ geo: lumpy(new THREE.BoxGeometry(0.22, 0.16, 0.2), 0.12, 3505).translate(-0.05, 0.09, 0.55), color: TONE.marbleShade });
  for (const [x, z] of [[-0.25, 0.4], [0.15, 0.4], [-0.05, 0.8]]) parts.push({ geo: rodGeo([x, 0, z], [-0.05, 0.62, 0.55], 0.012, 0.01), color: TONE.pole });
  parts.push({ geo: rodGeo([-0.05, 0.62, 0.55], [-0.05, 0.18, 0.55], 0.004, 0.004, 3), color: TONE.rope });
  // Rollers and a lever.
  for (const z of [-0.35, -0.2]) parts.push({ geo: new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6).rotateZ(Math.PI / 2).translate(0.62, 0.03, z), color: TONE.log });
  parts.push({ geo: rodGeo([0.3, 0.01, 0.75], [0.8, 0.02, 0.85], 0.008), color: PAL.charDark });
  // Chippings heaped against the shed.
  parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.16, 0), 0.4, 3506).scale(1.4, 0.4, 1.2).translate(-0.6, 0.02, 0.55), color: TONE.dust });
  return mergeParts(parts);
}

// ---------------------------------------------------------------------------
// The Lighthouse (3 x 3: -1.5..1.5).

/** The Lighthouse's heights: its stepped base, the square tower, the octagon and the lantern. */
export const LH = { base: 0.27, tower: 2.4, oct: 1.05, lantern: 0.5 };
const LH_STEPS = [1.42, 1.3, 1.18];

/** The Lighthouse's base: three steps, laid course by course (f of them, 0 to 1). */
function lighthouseBase(f: number): Part[] {
  const parts: Part[] = [];
  const n = Math.round(f * 9);
  for (let i = 0; i < n; i++) {
    const step = Math.floor(i / 3);
    const h = LH_STEPS[step];
    const part = i % 3;
    // Each step laid in three runs, front to back.
    const x0 = -h + ((2 * h) / 3) * part;
    parts.push({ geo: slab(x0, -h, x0 + (2 * h) / 3, h, step * 0.09, (step + 1) * 0.09), color: step % 2 ? TONE.marbleShade : TONE.marble });
  }
  return parts;
}

/** The square tower's half-size at height y above its foot (it tapers). */
const towerHalf = (y: number): number => 0.86 - (y / LH.tower) * 0.14;

/** The square tower, in courses, up to `h` of its height: windows up its faces, a cornice at its top. */
function lighthouseTower(h: number, done: boolean): Part[] {
  const parts: Part[] = [];
  const y0 = LH.base;
  const course = 0.3;
  for (let y = 0; y < h - 1e-3; y += course) {
    const y1 = Math.min(h, y + course);
    const a = towerHalf(y);
    const b = towerHalf(y1);
    const g = new THREE.CylinderGeometry(b * Math.SQRT2, a * Math.SQRT2, y1 - y, 4, 1).rotateY(Math.PI / 4).translate(0, y0 + (y + y1) / 2, 0);
    parts.push({ geo: g, color: Math.round(y / course) % 2 ? TONE.marbleWarm : TONE.marble });
    // A thin dark joint between courses.
    parts.push({ geo: slab(-a - 0.004, -a - 0.004, a + 0.004, a + 0.004, y0 + y, y0 + y + 0.012), color: TONE.marbleDeep });
  }
  // Windows: slits up each face, and the door at the foot of the front.
  for (let y = 0.45; y < h - 0.2; y += 0.55) {
    const a = towerHalf(y) + 0.003;
    for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const w = nx ? slab(-0.01, -0.035, 0.01, 0.035, 0, 0.13) : slab(-0.035, -0.01, 0.035, 0.01, 0, 0.13);
      parts.push({ geo: w.translate(nx * a, y0 + y, nz * a), color: TONE.window });
    }
  }
  if (h > 0.35) parts.push({ geo: slab(towerHalf(0) - 0.01, -0.1, towerHalf(0) + 0.01, 0.1, y0, y0 + 0.3), color: TONE.window });
  if (done) {
    const a = towerHalf(LH.tower);
    parts.push({ geo: slab(-a - 0.07, -a - 0.07, a + 0.07, a + 0.07, y0 + LH.tower, y0 + LH.tower + 0.08), color: TONE.marbleShade });
    // A parapet round the gallery at its top, with a bronze triton at each corner.
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      parts.push({ geo: drum(x * (a - 0.02), z * (a - 0.02), 0.05, 0.035, y0 + LH.tower + 0.08, y0 + LH.tower + 0.2, 6), color: TONE.bronze });
      parts.push({ geo: new THREE.ConeGeometry(0.03, 0.1, 5).translate(x * (a - 0.02), y0 + LH.tower + 0.25, z * (a - 0.02)), color: TONE.bronzeShade });
    }
    for (const [x0, z0, x1, z1] of [[-a, -a, a, -a + 0.04], [-a, a - 0.04, a, a], [-a, -a, -a + 0.04, a], [a - 0.04, -a, a, a]]) parts.push({ geo: slab(x0, z0, x1, z1, y0 + LH.tower + 0.08, y0 + LH.tower + 0.15), color: TONE.marble });
  }
  return parts;
}

/** The octagon and the lantern on top, up to `f` (0 to 1) of them: the octagon first, then the lantern's columns, its roof and the god on it. */
function lighthouseTop(f: number): Part[] {
  const parts: Part[] = [];
  const y0 = LH.base + LH.tower + 0.08;
  const octH = Math.min(1, f / 0.6) * LH.oct;
  for (let y = 0; y < octH - 1e-3; y += 0.25) {
    const y1 = Math.min(octH, y + 0.25);
    const r0 = 0.56 - (y / LH.oct) * 0.08;
    const r1 = 0.56 - (y1 / LH.oct) * 0.08;
    parts.push({ geo: new THREE.CylinderGeometry(r1, r0, y1 - y, 8).rotateY(Math.PI / 8).translate(0, y0 + (y + y1) / 2, 0), color: Math.round(y / 0.25) % 2 ? TONE.marble : TONE.marbleWarm });
  }
  for (let y = 0.3; y < octH - 0.15; y += 0.45) {
    for (let k = 0; k < 8; k += 2) {
      const a = (k / 8) * Math.PI * 2;
      const r = 0.55 - (y / LH.oct) * 0.08;
      parts.push({ geo: new THREE.BoxGeometry(0.02, 0.11, 0.06).rotateY(-a).translate(Math.cos(a) * r, y0 + y + 0.05, Math.sin(a) * r), color: TONE.window });
    }
  }
  if (f < 0.6) return parts;
  const ly = y0 + LH.oct;
  parts.push({ geo: drum(0, 0, 0.56, 0.58, ly, ly + 0.06, 8), color: TONE.marbleShade });
  const g = Math.min(1, (f - 0.6) / 0.3);
  const cols = Math.round(g * 8);
  for (let k = 0; k < cols; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    parts.push({ geo: drum(Math.cos(a) * 0.36, Math.sin(a) * 0.36, 0.035, 0.03, ly + 0.06, ly + 0.06 + LH.lantern * 0.8, 6), color: TONE.marble });
  }
  // The hearth inside, where the fire burns, and its brazier of bronze.
  parts.push({ geo: drum(0, 0, 0.2, 0.24, ly + 0.06, ly + 0.16, 8), color: TONE.bronzeShade });
  if (f >= 0.9) {
    const ry = ly + 0.06 + LH.lantern * 0.8;
    parts.push({ geo: drum(0, 0, 0.44, 0.44, ry, ry + 0.06, 8), color: TONE.marbleShade });
    parts.push({ geo: new THREE.ConeGeometry(0.42, 0.28, 8).rotateY(Math.PI / 8).translate(0, ry + 0.2, 0), color: TONE.marble });
    // The god on the roof, in bronze: a figure with a trident.
    parts.push({ geo: drum(0, 0, 0.05, 0.04, ry + 0.3, ry + 0.48, 6), color: TONE.bronze });
    parts.push({ geo: new THREE.IcosahedronGeometry(0.045, 0).translate(0, ry + 0.52, 0), color: TONE.bronze });
    parts.push({ geo: rodGeo([0.06, ry + 0.3, 0.04], [0.06, ry + 0.68, 0.04], 0.007), color: TONE.bronzeShade });
  }
  return parts;
}

/** Where the Lighthouse's fire burns (local), and how big. */
export const LIGHTHOUSE_FIRE: V3 = [0, LH.base + LH.tower + 0.08 + LH.oct + 0.18, 0];

/**
 * The Lighthouse at a point in its building: `stage` (0 to 3, 3 finished),
 * `f` how far through it (0 to 1, 0 before its work began), `depth` how far
 * its pad goes down, `piles` [marble, timber, bronze] pieces on site.
 */
export function lighthouseModel(stage: number, f: number, depth: number, piles: readonly number[], seed: number): THREE.BufferGeometry {
  const parts: Part[] = [];
  const done = stage >= 3;
  parts.push(...pad(1.48, 1.48, depth, stage >= 1, seed));
  if (stage === 0 && f === 0) parts.push(...stakes(1.42, 1.42));
  parts.push(...lighthouseBase(stage >= 1 ? 1 : f));
  if (stage >= 1) parts.push(...lighthouseTower(stage >= 2 ? LH.tower : Math.round(f * 8) * 0.3, stage >= 2));
  if (stage >= 2) parts.push(...lighthouseTop(stage >= 3 ? 1 : Math.round(f * 10) / 10));
  if (!done) {
    // The scaffold round what is going up, and the crane beside it.
    const top = stage === 1 ? LH.base + Math.max(0.4, Math.round(f * 8) * 0.3) : stage === 2 ? LH.base + LH.tower + 0.08 + Math.max(0.4, Math.min(1, f / 0.6) * LH.oct + (f > 0.6 ? 0.5 : 0)) : 0;
    if (stage === 1 && f > 0) parts.push(...scaffold(0.86, 0.86, LH.base, top, seed + 1));
    if (stage === 2 && f > 0) parts.push(...scaffold(0.56, 0.56, LH.base + LH.tower + 0.08, top, seed + 2));
    if (stage >= 1 && f > 0) parts.push(...crane(-1.15, 1.15, Math.PI / 4 + Math.PI, Math.min(top + 0.4, 3.2), TONE.marble).map((p) => ({ ...p, geo: p.geo.translate(0, LH.base, 0) })));
    // The materials waiting, at the front corners (and the back for timber).
    // (On the steps laid so far: the piles stand on their front runs.)
    const y = stage >= 1 ? LH.base : Math.floor(Math.round(f * 9) / 3) * 0.09;
    const lift = (ps: Part[]): Part[] => ps.map((p) => ({ ...p, geo: p.geo.translate(0, y, 0) }));
    parts.push(...lift(marblePile(1.08, -1.08, piles[0], seed + 3)));
    parts.push(...lift(marblePile(1.08, 0.55, Math.max(0, piles[0] - 9), seed + 4)));
    parts.push(...lift(logPile(-0.95, -1.15, piles[1])));
    parts.push(...lift(logPile(0.35, -1.18, Math.max(0, piles[1] - 9))));
    if (piles[2]) parts.push(...lift(ingotPile(1.1, 1.1, piles[2])));
  }
  return mergeParts(parts);
}

// ---------------------------------------------------------------------------
// The Colossus (3 x 3: -1.5..1.5), facing the sea (+x).

/** The plinth's heights: two steps, the die and its cap. */
const PLINTH = { step: 0.12, die: 0.95, top: 1.05 };

function plinth(f: number): Part[] {
  const parts: Part[] = [];
  if (f > 0) parts.push({ geo: slab(-1.32, -1.32, 1.32, 1.32, 0, PLINTH.step), color: TONE.marbleShade });
  if (f > 0.15) parts.push({ geo: slab(-1.12, -1.12, 1.12, 1.12, PLINTH.step, PLINTH.step * 2), color: TONE.marble });
  const dieTop = PLINTH.step * 2 + Math.max(0, Math.min(1, (f - 0.3) / 0.6)) * (PLINTH.die - PLINTH.step * 2);
  for (let y = PLINTH.step * 2; y < dieTop - 1e-3; y += 0.14) {
    const y1 = Math.min(dieTop, y + 0.14);
    parts.push({ geo: slab(-0.78, -0.78, 0.78, 0.78, y, y1), color: Math.round(y / 0.14) % 2 ? TONE.marbleWarm : TONE.marble });
  }
  if (f >= 1) {
    parts.push({ geo: slab(-0.84, -0.84, 0.84, 0.84, PLINTH.step * 2, PLINTH.step * 2 + 0.06), color: TONE.marbleShade });
    parts.push({ geo: slab(-0.9, -0.9, 0.9, 0.9, PLINTH.die, PLINTH.top), color: TONE.marbleShade });
    // A bronze plaque on its front.
    parts.push({ geo: slab(0.78, -0.25, 0.79, 0.25, 0.45, 0.7), color: TONE.bronzeShade });
  }
  return parts;
}

/** One piece of the god's figure: its geometry (local to the plinth's top), its colour, and how high it reaches (it goes on once the skin reaches its middle). */
type Piece = { geo: THREE.BufferGeometry; color: string; y: number };

/** The figure of the Colossus (Helios), about 3.6 tall, facing +x: feet apart, his cloak over his left arm to the ground, his right arm raised with the torch, a crown of rays. */
function figure(): Piece[] {
  const B = TONE.bronze;
  const S = TONE.bronzeShade;
  const L = TONE.bronzeLight;
  const out: Piece[] = [];
  const add = (geo: THREE.BufferGeometry, color: string): void => {
    geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    out.push({ geo, color, y: (bb.min.y + bb.max.y) / 2 });
  };
  for (const z of [-0.2, 0.2]) {
    add(slab(-0.08, z - 0.07, 0.2, z + 0.07, 0, 0.08), S);
    add(rodGeo([0, 0.06, z], [0, 0.72, z * 0.95], 0.085, 0.11, 7), B);
    add(rodGeo([0, 0.72, z * 0.95], [0, 1.38, z * 0.7], 0.12, 0.16, 7), B);
    add(new THREE.IcosahedronGeometry(0.1, 0).scale(1, 0.8, 1).translate(0.03, 0.74, z * 0.95), S);
  }
  add(new THREE.CylinderGeometry(0.27, 0.25, 0.3, 7).scale(0.85, 1, 1.25).translate(0, 1.48, 0), S);
  add(new THREE.CylinderGeometry(0.33, 0.26, 0.75, 7).scale(0.8, 1, 1.2).translate(0, 1.98, 0), B);
  // (Slice 39: a nose, so his face shows which way he looks; the pale box that stood on his chest read as a patch.)
  add(new THREE.BoxGeometry(0.06, 0.07, 0.05).translate(0.18, 2.69, 0), S);
  add(new THREE.CylinderGeometry(0.2, 0.3, 0.12, 7).scale(0.85, 1, 1.35).translate(0, 2.4, 0), B);
  add(drum(0, 0, 0.09, 0.08, 2.44, 2.56, 6), B);
  add(new THREE.IcosahedronGeometry(0.16, 1).scale(1, 1.12, 0.95).translate(0.02, 2.7, 0), B);
  // The crown of rays, all round his head. (Slice 39: they stood up from the crown in one row, like a crest.)
  add(drum(0.02, 0, 0.165, 0.165, 2.74, 2.79, 9), L);
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2;
    const ox = Math.cos(a);
    const oz = Math.sin(a);
    add(rodGeo([0.02 + ox * 0.15, 2.78, oz * 0.15], [0.02 + ox * 0.25, 2.95, oz * 0.25], 0.028, 0.004, 4), L);
  }
  // The right arm raised (+z), the torch in his hand.
  add(rodGeo([0, 2.32, 0.38], [0.06, 2.75, 0.47], 0.075, 0.065, 6), B);
  add(rodGeo([0.06, 2.75, 0.47], [0.1, 3.18, 0.46], 0.065, 0.055, 6), B);
  add(new THREE.IcosahedronGeometry(0.07, 0).translate(0.1, 3.2, 0.46), S);
  add(rodGeo([0.1, 3.1, 0.46], [0.11, 3.42, 0.46], 0.03, 0.04, 6), S);
  add(new THREE.CylinderGeometry(0.09, 0.05, 0.08, 8).translate(0.11, 3.46, 0.46), L);
  // The left arm down, the cloak over it falling to the plinth beside his leg.
  add(rodGeo([0, 2.32, -0.38], [0.08, 1.88, -0.45], 0.075, 0.065, 6), B);
  add(rodGeo([0.08, 1.88, -0.45], [0.26, 1.65, -0.38], 0.065, 0.055, 6), B);
  add(new THREE.BoxGeometry(0.14, 1.55, 0.06).translate(0.15, 0.82, -0.48), S);
  add(new THREE.BoxGeometry(0.2, 0.55, 0.08).rotateX(0.2).translate(0.18, 1.62, -0.46), S);
  for (let k = 0; k < 3; k++) add(new THREE.BoxGeometry(0.02, 1.4, 0.07).translate(0.1 + k * 0.05, 0.78, -0.5), TONE.bronzeDeep);
  return out;
}
const FIGURE = figure();
/** How tall the figure is above the plinth. */
export const FIGURE_TOP = 3.5;
/** Where the Colossus's torch burns (local, from the pad). */
export const COLOSSUS_FIRE: V3 = [0.11, PLINTH.top + 3.54, 0.46];

/**
 * The bronze frame inside the figure, up to `h` (above the plinth): struts up
 * each leg and the body, rings of bars round them with a brace across each
 * face, the bars at his hips and shoulders, the arms and the neck. (Slice 39:
 * thicker, in bright bronze and braced, so it reads as a cast frame in the
 * shape of a man rather than more of the scaffold's poles; slice 35's struts
 * were thinner than a pixel from the usual distance.)
 */
const STRUT = 0.034;
const HOOP = 0.026;
function frame(h: number): Part[] {
  const parts: Part[] = [];
  const B = TONE.bronze;
  const S = TONE.bronzeShade;
  /** A rod from a to b, cut off at the frame's height. */
  const rod = (a: V3, b: V3, r: number, color: string): void => {
    const [lo, hi] = a[1] <= b[1] ? [a, b] : [b, a];
    if (lo[1] >= h) return;
    const t = Math.min(1, (h - lo[1]) / (hi[1] - lo[1] || 1));
    const end: V3 = [lo[0] + (hi[0] - lo[0]) * t, lo[1] + (hi[1] - lo[1]) * t, lo[2] + (hi[2] - lo[2]) * t];
    parts.push({ geo: rodGeo(lo, end, r, r, 5), color });
  };
  // Each leg's four struts and the body's four, in order round them, so the rings and braces sit on them.
  const legs = [-0.2, 0.2].map((z) => [[0.08, 0.08], [0.08, -0.08], [-0.08, -0.08], [-0.08, 0.08]].map(([dx, dz]): [V3, V3] => [[dx, 0, z + dz], [dx * 1.4, 1.38, z * 0.7 + dz * 1.4]]));
  const body = [[0.2, 0.28], [0.2, -0.28], [-0.2, -0.28], [-0.2, 0.28]].map(([dx, dz]): [V3, V3] => [[dx * 0.9, 1.35, dz * 0.9], [dx, 2.45, dz * 1.2]]);
  const on = ([a, b]: [V3, V3], y: number): V3 => {
    const t = (y - a[1]) / (b[1] - a[1]);
    return [a[0] + (b[0] - a[0]) * t, y, a[2] + (b[2] - a[2]) * t];
  };
  for (const g of [...legs, body]) {
    for (const [a, b] of g) rod(a, b, STRUT, B);
    const y0 = g[0][0][1];
    const y1 = g[0][1][1];
    const rings: number[] = [];
    for (let y = y0 + 0.3; y < y1 - 0.1; y += 0.36) rings.push(y);
    rings.push(y1 - 0.02);
    for (let k = 0; k < rings.length; k++) {
      const y = rings[k];
      if (y > h) break;
      for (let i = 0; i < 4; i++) rod(on(g[i], y), on(g[(i + 1) % 4], y), HOOP, S);
      const below = k === 0 ? y0 + 0.02 : rings[k - 1];
      for (let i = 0; i < 4; i += 2) rod(on(g[i], below), on(g[(i + 1) % 4], y), HOOP * 0.8, S);
    }
  }
  rod([0, 1.38, -0.2], [0, 1.38, 0.2], STRUT, B);
  rod([0, 2.38, -0.42], [0, 2.38, 0.42], STRUT, B);
  rod([0, 2.38, 0], [0, 2.86, 0], STRUT, B);
  rod([0, 2.38, 0.38], [0.06, 2.75, 0.47], STRUT, B);
  rod([0.06, 2.75, 0.47], [0.1, 3.4, 0.46], STRUT, B);
  rod([0, 2.38, -0.38], [0.08, 1.88, -0.45], STRUT, B);
  rod([0.08, 1.88, -0.45], [0.26, 1.65, -0.38], STRUT * 0.9, B);
  // A ring for his head.
  if (h > 2.72) parts.push({ geo: new THREE.TorusGeometry(0.14, HOOP, 4, 10).rotateX(Math.PI / 2).translate(0, 2.72, 0), color: S });
  return parts;
}

/**
 * The Colossus at a point in its building (as lighthouseModel): the plinth
 * laid; then the bronze frame rising inside a timber scaffold, cast on site;
 * then the bronze skin going on from his feet up, the frame showing above
 * it; then the god himself, his torch lit.
 */
export function colossusModel(stage: number, f: number, depth: number, piles: readonly number[], seed: number): THREE.BufferGeometry {
  const parts: Part[] = [];
  const done = stage >= 3;
  parts.push(...pad(1.48, 1.48, depth, stage >= 1, seed));
  if (stage === 0 && f === 0) parts.push(...stakes(1.32, 1.32));
  parts.push(...plinth(stage >= 1 ? 1 : f));
  const up = (ps: Part[]): Part[] => ps.map((p) => ({ ...p, geo: p.geo.clone().translate(0, PLINTH.top, 0) }));
  if (stage >= 1) {
    const frameH = stage === 1 ? Math.round(f * 10) * 0.35 : FIGURE_TOP;
    if (!done) parts.push(...up(frame(frameH)));
    const skin = stage === 2 ? Math.round(f * 12) * 0.3 : done ? 99 : 0;
    for (const p of FIGURE) if (p.y <= skin) parts.push(...up([{ geo: p.geo, color: p.color }]));
    if (!done && f > 0) {
      const top = stage === 1 ? Math.max(0.4, frameH) : FIGURE_TOP;
      parts.push(...up(scaffold(0.5, 0.62, 0, top, seed + 1)));
      parts.push(...crane(-1.05, -1.05, -Math.PI / 4 + Math.PI, Math.min(PLINTH.top + top + 0.4, 4.6), stage === 1 ? TONE.bronzeDeep : TONE.bronze).map((p) => ({ ...p, geo: p.geo.translate(0, PLINTH.step * 2, 0) })));
      // A casting pit at the back corner: a clay furnace glowing.
      parts.push({ geo: drum(-1.05, 0.95, 0.16, 0.12, PLINTH.step * 2, PLINTH.step * 2 + 0.22, 8), color: '#8b5a3c' });
      parts.push({ geo: drum(-1.05, 0.95, 0.07, 0.07, PLINTH.step * 2 + 0.22, PLINTH.step * 2 + 0.24, 8), color: PAL.ember });
    }
  }
  if (!done) {
    const y = stage >= 1 || f >= 0.15 ? PLINTH.step * 2 : f > 0 ? PLINTH.step : 0;
    const lift = (ps: Part[]): Part[] => ps.map((p) => ({ ...p, geo: p.geo.translate(0, y, 0) }));
    parts.push(...lift(marblePile(0.98, -0.98, piles[0], seed + 3)));
    parts.push(...lift(logPile(-0.98, -0.9, piles[1])));
    parts.push(...lift(logPile(0.1, -0.98, Math.max(0, piles[1] - 9))));
    parts.push(...lift(ingotPile(0.98, 0.98, Math.min(9, piles[2]))));
    if (piles[2] > 9) parts.push(...lift(ingotPile(0.98, 0.35, Math.min(9, piles[2] - 9))));
  }
  return mergeParts(parts);
}

// ---------------------------------------------------------------------------
// The Stadium (6 x 6: -3..3). Its track runs along x (the world's x: it
// isn't turned to its road), the banks of seats either side along z.

/** The banks' cross-section (|z| from the middle): the seats from BANK_IN up to SEATS_OUT, a walk along the top to TOP_OUT, the earth sloping down outside to BANK_FOOT. */
const BANK_IN = 1.38;
const ROWS = 5;
const ROW_D = 0.21;
const ROW_H = 0.1;
const SEATS_OUT = BANK_IN + ROWS * ROW_D;
const TOP_OUT = SEATS_OUT + 0.17;
const BANK_FOOT = 2.98;
const BANK_H = ROWS * ROW_H;
/** The track's ends: its closed end (with a short bank of seats) at -x, the starting line and the gate at +x. */
const END_X = -2.95;
const END_IN = -2.45;

/** A bank along x from x0 to x1 on the side `side` (±1): the profile above, `h` high (lower while it is being thrown up). */
function bank(x0: number, x1: number, h: number, side: number): THREE.BufferGeometry {
  const sec: Array<[number, number]> = [[BANK_IN, 0], [SEATS_OUT, h], [TOP_OUT, h], [BANK_FOOT, 0]];
  const pos: number[] = [];
  for (let i = 0; i < 3; i++) {
    const [za, ya] = sec[i];
    const [zb, yb] = sec[i + 1];
    const p: V3[] = [[x0, ya, side * za], [x1, ya, side * za], [x1, yb, side * zb], [x0, yb, side * zb]];
    if (side > 0) pos.push(...p[0], ...p[3], ...p[2], ...p[0], ...p[2], ...p[1]);
    else pos.push(...p[0], ...p[1], ...p[2], ...p[0], ...p[2], ...p[3]);
  }
  // Its ends, closed.
  for (const x of [x0, x1]) {
    const pts = sec.map(([z, y]): V3 => [x, y, side * z]);
    pos.push(...pts[0], ...pts[1], ...pts[2], ...pts[0], ...pts[2], ...pts[3]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

/** How high the seats (or the bank) stand at |z| = az in the finished Stadium: where a visitor sits. */
export function stadiumLift(az: number): number {
  if (az < BANK_IN) return 0;
  if (az >= SEATS_OUT) return az <= TOP_OUT ? BANK_H : Math.max(0, BANK_H * (1 - (az - TOP_OUT) / (BANK_FOOT - TOP_OUT)));
  return Math.min(ROWS, Math.floor((az - BANK_IN) / ROW_D) + 1) * ROW_H;
}

/**
 * The Stadium at a point in its building: the track levelled and the earth
 * banks thrown up either side (and across its closed end); then the stone
 * seats laid up the banks, row by row; then the colonnade along the top of
 * the north bank, the judges' stand opposite, the starting line, the turning
 * posts and the gate. `games` hangs the pennants out.
 */
export function stadiumModel(stage: number, f: number, depth: number, piles: readonly number[], games: boolean, seed: number): THREE.BufferGeometry {
  const parts: Part[] = [];
  const done = stage >= 3;
  parts.push(...pad(2.98, 2.98, depth, false, seed));
  if (stage === 0 && f === 0) parts.push(...stakes(2.9, 2.9));
  const bankF = stage >= 1 ? 1 : f;
  const h = BANK_H * Math.max(0.12, bankF);
  // The track: levelled sand, raked in lanes.
  if (bankF > 0) {
    parts.push({ geo: slab(END_IN, -BANK_IN, 2.98, BANK_IN, 0, 0.015), color: TONE.sand });
    for (let k = 0; k < 4; k++) parts.push({ geo: slab(END_IN + 0.1, -1.05 + k * 0.7, 2.88, -1.04 + k * 0.7, 0.015, 0.018), color: TONE.sandDark });
  }
  // Rows laid: both banks' and the end's, from the bottom up (stage 1), all of them after.
  const total = ROWS * 2;
  const laid = stage >= 2 ? total : stage === 1 ? Math.round(f * total) : 0;
  for (const side of [-1, 1]) {
    if (bankF > 0) parts.push({ geo: bank(END_X, 2.96, h, side), color: side < 0 ? TONE.earthBank : TONE.earthBankDark });
    const rows = Math.floor(laid / 2) + (side < 0 && laid % 2 ? 1 : 0);
    for (let r = 0; r < rows; r++) {
      const z0 = BANK_IN + r * ROW_D;
      const y1 = (r + 1) * ROW_H;
      const zz = side < 0 ? [-SEATS_OUT, -z0] : [z0, SEATS_OUT];
      parts.push({ geo: slab(END_IN, zz[0], 2.96, zz[1], y1 - ROW_H, y1 + 0.003), color: r % 2 ? TONE.marbleShade : TONE.marble });
      // A darker riser under each seat's lip, and stairs up through them.
      parts.push({ geo: slab(END_IN, side < 0 ? -z0 - 0.012 : z0, 2.96, side < 0 ? -z0 : z0 + 0.012, y1 - ROW_H, y1 - 0.02), color: TONE.marbleDeep });
      for (const x of [-1.4, 0, 1.4]) parts.push({ geo: slab(x - 0.07, side < 0 ? -z0 - ROW_D : z0, x + 0.07, side < 0 ? -z0 : z0 + ROW_D, y1 - 0.045, y1 + 0.006), color: TONE.marbleDeep });
    }
    // The walk along the top, paved once the seats are done.
    if (stage >= 2) parts.push({ geo: slab(END_X, side < 0 ? -TOP_OUT : SEATS_OUT, 2.96, side < 0 ? -SEATS_OUT : TOP_OUT, BANK_H - 0.01, BANK_H + 0.012), color: TONE.marbleShade });
  }
  // The closed end: a bank across it, three rows of seats once the sides have theirs.
  if (bankF > 0) {
    parts.push({ geo: slab(END_X, -SEATS_OUT, END_IN, SEATS_OUT, 0, h * 0.75), color: TONE.earthBank });
    if (stage >= 2) for (let r = 0; r < 3; r++) parts.push({ geo: slab(END_X, -BANK_IN, END_IN - r * 0.15, BANK_IN, 0, (r + 1) * ROW_H * 1.2 + 0.01), color: r % 2 ? TONE.marbleShade : TONE.marble });
  }
  // The colonnade, the judges' stand, the starting line, the turning posts and the gate.
  const cg = stage >= 3 ? 1 : stage === 2 ? Math.round(f * 10) / 10 : 0;
  if (cg > 0) {
    const zc = -(SEATS_OUT + TOP_OUT) / 2;
    const n = Math.round(cg * 13);
    const x0 = END_X + 0.3;
    const step = (2.96 - 0.3 - x0) / 12;
    for (let k = 0; k < n; k++) parts.push({ geo: drum(x0 + k * step, zc, 0.04, 0.034, BANK_H, BANK_H + 0.55, 6), color: TONE.marble });
    if (cg >= 0.6) {
      parts.push({ geo: slab(x0 - 0.08, zc - 0.08, x0 + 12 * step + 0.08, zc + 0.08, BANK_H + 0.55, BANK_H + 0.62), color: TONE.marbleShade });
      parts.push({ geo: new THREE.BoxGeometry(12 * step + 0.3, 0.035, 0.34).rotateX(-0.3).translate(x0 + 6 * step, BANK_H + 0.67, zc - 0.05), color: TONE.tile });
      // Its back wall, down to the walk.
      parts.push({ geo: slab(x0 - 0.08, -TOP_OUT, x0 + 12 * step + 0.08, -TOP_OUT + 0.04, BANK_H, BANK_H + 0.55), color: TONE.marbleShade });
    }
    if (cg >= 0.8) {
      // The judges' stand on the south bank, at the middle, over its top rows.
      const zs = SEATS_OUT - 0.1;
      for (const [x, z] of [[-0.3, zs - 0.16], [0.3, zs - 0.16], [-0.3, zs + 0.16], [0.3, zs + 0.16]]) parts.push({ geo: drum(x, z, 0.035, 0.03, BANK_H - 0.1, BANK_H + 0.45, 6), color: TONE.marble });
      parts.push({ geo: slab(-0.38, zs - 0.24, 0.38, zs + 0.24, BANK_H + 0.45, BANK_H + 0.5), color: TONE.marbleShade });
      parts.push({ geo: new THREE.ConeGeometry(0.52, 0.18, 4).rotateY(Math.PI / 4).scale(1, 1, 0.66).translate(0, BANK_H + 0.59, zs), color: TONE.tile });
    }
    if (cg >= 0.4) {
      // The starting line across the track, and the turning posts at each end.
      parts.push({ geo: slab(2.35, -BANK_IN + 0.05, 2.45, BANK_IN - 0.05, 0.005, 0.03), color: TONE.marble });
      for (let k = -3; k <= 3; k++) parts.push({ geo: block(2.4, k * 0.38, 0.015, 0.015, 0.03, 0.22), color: TONE.marbleShade });
      for (const x of [END_IN + 0.35, 2.0]) parts.push({ geo: drum(x, 0, 0.06, 0.05, 0, 0.38, 8), color: TONE.marbleWarm });
    }
    if (cg >= 1) {
      // The gate: two piers and a lintel at the open end.
      for (const z of [-BANK_IN - 0.1, BANK_IN + 0.1]) parts.push({ geo: block(2.86, z, 0.1, 0.1, 0, 0.8), color: TONE.marble });
      parts.push({ geo: slab(2.74, -BANK_IN - 0.22, 2.98, BANK_IN + 0.22, 0.8, 0.9), color: TONE.marbleShade });
    }
  }
  if (games && done) {
    // Pennants out along the colonnade and over the gate.
    const colours = [PAL.bundleRed, PAL.bandBlue, PAL.canvasOchre, PAL.watchRed];
    const zc = -(SEATS_OUT + TOP_OUT) / 2;
    for (let k = 0; k < 7; k++) {
      const x = END_X + 0.3 + k * 0.86;
      const y = BANK_H + 0.68;
      parts.push({ geo: rodGeo([x, y, zc], [x, y + 0.42, zc], 0.008), color: TONE.poleDark });
      const flag = new THREE.BufferGeometry();
      flag.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, -0.15, 0, 0.28, -0.075, 0], 3));
      parts.push({ geo: flag.translate(x, y + 0.42, zc), color: colours[k % colours.length] });
    }
    for (const z of [-BANK_IN - 0.1, BANK_IN + 0.1]) {
      parts.push({ geo: rodGeo([2.86, 0.9, z], [2.86, 1.36, z], 0.008), color: TONE.poleDark });
      const flag = new THREE.BufferGeometry();
      flag.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, -0.16, 0, 0.3, -0.08, 0], 3));
      parts.push({ geo: flag.translate(2.86, 1.36, z), color: z < 0 ? PAL.bundleRed : PAL.bandBlue });
    }
  }
  if (!done) {
    // The materials waiting on the track, by the open end.
    const lift = (ps: Part[]): Part[] => ps.map((p) => ({ ...p, geo: p.geo.translate(0, 0.015, 0) }));
    parts.push(...lift(marblePile(1.9, -0.75, Math.min(9, piles[0]), seed + 3)));
    if (piles[0] > 9) parts.push(...lift(marblePile(1.2, -0.75, Math.min(9, piles[0] - 9), seed + 4)));
    if (piles[0] > 18) parts.push(...lift(marblePile(0.5, -0.75, piles[0] - 18, seed + 5)));
    parts.push(...lift(logPile(1.9, 0.75, Math.min(9, piles[1]))));
    if (piles[1] > 9) parts.push(...lift(logPile(1.2, 0.75, piles[1] - 9)));
  }
  return mergeParts(parts);
}

// ---------------------------------------------------------------------------
// The fire.

/** A flame of three cones, bright, drawn unlit (it glows through the bloom). */
export function flameGeo(size: number): THREE.BufferGeometry {
  const parts: Part[] = [
    { geo: new THREE.ConeGeometry(0.11 * size, 0.34 * size, 6).translate(0, 0.17 * size, 0), color: '#ff8a2a' },
    { geo: new THREE.ConeGeometry(0.07 * size, 0.26 * size, 5).translate(0.03 * size, 0.15 * size, 0.02 * size), color: '#ffc04a' },
    { geo: new THREE.ConeGeometry(0.05 * size, 0.2 * size, 5).translate(-0.03 * size, 0.12 * size, -0.02 * size), color: '#fff0a0' },
  ];
  return mergeParts(parts);
}
