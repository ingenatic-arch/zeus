import * as THREE from 'three';
import { hash2 } from '../map/noise';
import { footSide } from '../sim/buildings';
import { COPPER, held, MARBLE, TIMBER, WHEAT, MEAT, CHEESE, OIL, WINE, FLEECE, ARMOUR, HORSES } from '../sim/foods';
import { siteOf, stagesOf, workOf, type Site } from '../sim/monuments';
import { dimmed } from '../sim/sanctuaries';
import { GODS, type GodId } from '../sim/pantheon';
import type { Building, SimState } from '../sim/state';
import { crane, ingotPile, logPile, marblePile, mergeParts, pad, piecesFor, rodGeo, scaffold, slab, TONE } from './monumentmodels';
import { PAL } from './palette';
import { lumpy, type Part } from './trees';
import type { PicturePart } from './works';

/**
 * Slice 54: the sanctuaries, drawn from the sim's state (a pure read), in
 * the original look's colours. One builder for all twelve (`sanctuaryModel`):
 * a walled court on a levelled pad with its gate on the road side (+x), a
 * stepped temple at the back with a ring of columns, a tiled roof and a band
 * and pediment in the god's colour, an altar before it, trees, banners in the
 * god's colour, and on top of that the god's own parts: their statue on a
 * plinth in the court, in their own pose, colour and emblem, and beside it
 * what they love (Poseidon's horse, Athena's olive tree, Ares' trophy...).
 *
 * Each stage looks different: stakes and cords on a levelled pad; the
 * temple's platform laid course by course; its columns rising inside a
 * scaffold with a crane, then the roof; the court's walls, the altar and the
 * statue going up in its own scaffold; finished, with trees and banners. A
 * sanctuary dimmed for want of workers is drawn dimmer, its banners down.
 *
 * Each is one mesh, rebuilt only when it moves on a step (as MonumentsView's
 * are): a city has at most twelve, so this costs little.
 */

type V3 = [number, number, number];

/** How many steps of a stage's work are drawn (the mesh is rebuilt at each). */
const WORK_STEPS = 12;
/** How deep the pad goes at most (below, the ground). */
const PAD_MOST = 0.6;

/** The precinct (5 x 5: -2.5..2.5), its court wall's inner edge and height. */
const WALL_OUT = 2.42;
const WALL_T = 0.12;
const WALL_H = 0.32;
const GATE = 0.42;
/** The temple: its platform from x0 to x1 (back to front) and z ±hz, three steps; its columns' height; its roof. */
const TX0 = -2.12;
const TX1 = 0.42;
const THZ = 0.98;
const STEP = 0.08;
const STEPS = 3;
const FLOOR = STEP * STEPS;
/** How high the temple's floor stands (for its priests, jobfolk.ts). */
export const SANCTUARY_FLOOR = FLOOR;
const COL_H = 0.92;
const COL_R = 0.07;
const ENT = FLOOR + COL_H;
const ARCH = 0.1;
const FRIEZE = 0.09;
const CORNICE = 0.05;
const EAVES = ENT + ARCH + FRIEZE + CORNICE;
const RIDGE = EAVES + 0.42;
/** Where the altar, the statue and the god's own thing stand in the court. */
const ALTAR: [number, number] = [1.55, 0];
const STATUE: [number, number] = [0.95, -1.62];
const EXTRA: [number, number] = [0.95, 1.6];
const PLINTH_H = 0.3;

const box = (x: number, z: number, hx: number, hz: number, y0: number, y1: number): THREE.BufferGeometry => slab(x - hx, z - hz, x + hx, z + hz, y0, y1);
const cyl = (x: number, z: number, r0: number, r1: number, y0: number, y1: number, seg = 8): THREE.BufferGeometry => new THREE.CylinderGeometry(r1, r0, y1 - y0, seg).translate(x, (y0 + y1) / 2, z);
const ball = (x: number, y: number, z: number, r: number, detail = 0): THREE.BufferGeometry => new THREE.IcosahedronGeometry(r, detail).translate(x, y, z);
const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;

/** A colour a little lighter or darker (k > 1 lighter). */
function shade(c: string, k: number): string {
  const x = new THREE.Color(c);
  if (k >= 1) x.lerp(new THREE.Color('#ffffff'), Math.min(1, k - 1));
  else x.multiplyScalar(k);
  return `#${x.getHexString()}`;
}

/** The god's own colour, and a deeper one for its shade. */
const godColour = (god: GodId): string => hex(GODS[god].colour);

/**
 * Each temple's roof, glazed in a tone of its god's (the twelve told apart
 * from afar: the roof is most of what shows at the classic zoom). Zeus's is
 * of marble tiles, as the greatest temples' were.
 */
const ROOFS: Record<GodId, string> = {
  zeus: '#e9e1cc',
  hera: '#2f6f9a',
  poseidon: '#2a8a78',
  demeter: '#c09040',
  athena: '#8c8f74',
  apollo: '#e8b42a',
  artemis: '#9fb0c8',
  ares: '#8a2420',
  aphrodite: '#dc8aa0',
  hephaestus: '#4e4642',
  hermes: '#5fb2d0',
  dionysus: '#6e2e68',
};
/** The gods whose temple is a tholos: round, a ring of columns about a round hall under a cone of tiles. */
const THOLOS: ReadonlySet<GodId> = new Set<GodId>(['aphrodite', 'hermes']);
/** The tholos: its middle (where the long temple's is) and its outer columns' ring. */
const TH_X = (-2.12 + 0.42) / 2;
const TH_R = 1.18;

// ---------------------------------------------------------------------------
// The precinct.

/** The court's paving, its walls (up to `wall` of their height) with the gate on the +x side, and the gate's posts. */
function court(wall: number, paved: boolean, seed: number): Part[] {
  const parts: Part[] = [];
  if (paved) {
    parts.push({ geo: slab(-WALL_OUT, -WALL_OUT, WALL_OUT, WALL_OUT, 0, 0.012), color: PAL.paving });
    // A paved way from the gate to the altar and the temple's steps.
    parts.push({ geo: slab(TX1, -0.3, WALL_OUT, 0.3, 0.012, 0.02), color: PAL.pavingDark });
  }
  if (wall <= 0) return parts;
  const h = Math.max(0.05, WALL_H * wall);
  const o = WALL_OUT;
  const i = WALL_OUT - WALL_T;
  const stone = (k: number): string => (hash2(k, 1, seed) > 0.5 ? TONE.marbleShade : PAL.granaryStone);
  parts.push({ geo: slab(-o, -o, o, -i, 0, h), color: stone(1) });
  parts.push({ geo: slab(-o, i, o, o, 0, h), color: stone(2) });
  parts.push({ geo: slab(-o, -i, -i, i, 0, h), color: stone(3) });
  parts.push({ geo: slab(i, -i, o, -GATE, 0, h), color: stone(4) });
  parts.push({ geo: slab(i, GATE, o, i, 0, h), color: stone(5) });
  if (wall >= 1) {
    // A coping along the top, and the gate's two posts and lintel.
    for (const [x0, z0, x1, z1] of [[-o, -o, o, -i], [-o, i, o, o], [-o, -i, -i, i], [i, -i, o, -GATE], [i, GATE, o, i]]) parts.push({ geo: slab(x0 - 0.01, z0 - 0.01, x1 + 0.01, z1 + 0.01, h, h + 0.03), color: TONE.marble });
    for (const z of [-GATE - 0.06, GATE + 0.06]) parts.push({ geo: box((o + i) / 2, z, 0.08, 0.08, 0, 0.62), color: TONE.marble });
    parts.push({ geo: box((o + i) / 2, 0, 0.1, GATE + 0.16, 0.62, 0.7), color: TONE.marbleShade });
  }
  return parts;
}

/** The temple's platform: its three steps, laid course by course (f of them, 0 to 1). */
function platform(f: number): Part[] {
  const parts: Part[] = [];
  const n = Math.round(f * STEPS * 3);
  for (let k = 0; k < n; k++) {
    const step = Math.floor(k / 3);
    const part = k % 3;
    const out = (STEPS - 1 - step) * 0.1;
    const x0 = TX0 - out;
    const x1 = TX1 + out;
    const len = (x1 - x0) / 3;
    // Each step laid in three runs, back to front.
    parts.push({ geo: slab(x0 + len * part, -THZ - out, x0 + len * (part + 1), THZ + out, step * STEP, (step + 1) * STEP), color: step % 2 ? TONE.marbleShade : TONE.marble });
  }
  return parts;
}

/** Where the temple's columns stand: six down each side, four across each end. */
function columnSpots(): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const xs = 6;
  const zs = 4;
  const ix0 = TX0 + 0.13;
  const ix1 = TX1 - 0.13;
  const iz = THZ - 0.13;
  for (let k = 0; k < xs; k++) {
    const x = ix0 + ((ix1 - ix0) * k) / (xs - 1);
    out.push([x, -iz], [x, iz]);
  }
  for (let k = 1; k < zs - 1; k++) {
    const z = -iz + ((2 * iz) * k) / (zs - 1);
    out.push([ix0, z], [ix1, z]);
  }
  return out;
}
const COLUMNS = columnSpots();

/** The temple, its columns up to `h` of their height (0 to 1), its walls and its roof once `roof` (0 to 1: the beams, then the tiles). */
function temple(h: number, roof: number, god: GodId, seed: number): Part[] {
  if (THOLOS.has(god)) return tholos(h, roof, god);
  const parts: Part[] = [];
  const top = FLOOR + COL_H * h;
  // The cella's walls inside the ring (they rise with the columns), its door at the front.
  if (h > 0) {
    const cx0 = TX0 + 0.38;
    const cx1 = TX1 - 0.42;
    const cz = THZ - 0.38;
    const wt = 0.07;
    const c = TONE.marbleWarm;
    parts.push({ geo: slab(cx0, -cz, cx1, -cz + wt, FLOOR, top), color: c });
    parts.push({ geo: slab(cx0, cz - wt, cx1, cz, FLOOR, top), color: c });
    parts.push({ geo: slab(cx0, -cz, cx0 + wt, cz, FLOOR, top), color: c });
    parts.push({ geo: slab(cx1 - wt, -cz, cx1, -0.16, FLOOR, top), color: c });
    parts.push({ geo: slab(cx1 - wt, 0.16, cx1, cz, FLOOR, top), color: c });
    if (h >= 1) parts.push({ geo: slab(cx1 - wt, -0.16, cx1, 0.16, FLOOR + 0.5, top), color: c });
    // The dark doorway, and the god's colour glimpsed within.
    parts.push({ geo: slab(cx1 - wt - 0.01, -0.16, cx1 - wt, 0.16, FLOOR, Math.min(top, FLOOR + 0.5)), color: TONE.window });
  }
  // The columns, drum by drum, fluted.
  for (const [x, z] of COLUMNS) {
    if (h <= 0) break;
    const drums = Math.max(1, Math.round(h * 5));
    for (let d = 0; d < drums; d++) {
      const y0 = FLOOR + (COL_H * d) / 5;
      const y1 = FLOOR + (COL_H * Math.min(d + 1, h * 5)) / 5;
      parts.push({ geo: cyl(x, z, COL_R * (1 - d * 0.03), COL_R * (1 - (d + 1) * 0.03), y0, y1, 8), color: d % 2 ? TONE.marble : TONE.marbleWarm });
    }
    if (h >= 1) parts.push({ geo: box(x, z, COL_R + 0.025, COL_R + 0.025, ENT - 0.04, ENT), color: TONE.marbleShade });
  }
  if (roof <= 0) return parts;
  // The architrave, the frieze in the god's colour, the cornice.
  const g = godColour(god);
  parts.push({ geo: slab(TX0 + 0.05, -THZ + 0.05, TX1 - 0.05, THZ - 0.05, ENT, ENT + ARCH), color: TONE.marble });
  if (roof >= 0.5) {
    parts.push({ geo: slab(TX0 + 0.04, -THZ + 0.04, TX1 - 0.04, THZ - 0.04, ENT + ARCH, ENT + ARCH + FRIEZE), color: g });
    // Triglyphs: dark marks along the frieze.
    for (let k = 0; k < 9; k++) {
      const x = TX0 + 0.12 + ((TX1 - TX0 - 0.24) * k) / 8;
      for (const z of [-THZ + 0.035, THZ - 0.035]) parts.push({ geo: box(x, z, 0.02, 0.008, ENT + ARCH + 0.01, ENT + ARCH + FRIEZE - 0.01), color: shade(g, 0.55) });
    }
    parts.push({ geo: slab(TX0 - 0.02, -THZ - 0.02, TX1 + 0.02, THZ + 0.02, EAVES - CORNICE, EAVES), color: TONE.marbleShade });
  }
  if (roof >= 0.75) {
    // The pitched roof of tiles, its ridge along x, and the pediments at either end, the god's colour in them.
    const half = THZ + 0.06;
    const rise = RIDGE - EAVES;
    const slope = Math.hypot(half, rise);
    const a = Math.atan2(rise, half);
    const len = TX1 - TX0 + 0.12;
    const mx = (TX0 + TX1) / 2;
    for (const side of [-1, 1]) {
      const g2 = new THREE.BoxGeometry(len, 0.035, slope).rotateX(side * a).translate(mx, EAVES + rise / 2, (side * half) / 2);
      parts.push({ geo: g2, color: side < 0 ? ROOFS[god] : shade(ROOFS[god], 0.8) });
      // Rows of tiles: ridges down the slope.
      for (let k = 0; k <= 10; k++) {
        const x = TX0 - 0.04 + ((len - 0.04) * k) / 10;
        parts.push({ geo: new THREE.BoxGeometry(0.025, 0.02, slope).rotateX(side * a).translate(x, EAVES + rise / 2 + 0.02, (side * half) / 2), color: shade(ROOFS[god], 0.7) });
      }
    }
    parts.push({ geo: box(mx, 0, len / 2, 0.03, RIDGE - 0.02, RIDGE + 0.03), color: shade(ROOFS[god], 0.7) });
    for (const x of [TX0 - 0.03, TX1 + 0.03]) {
      const tri = new THREE.BufferGeometry();
      const sx = x > 0 ? 1 : -1;
      const pts = [x, EAVES, -half, x, EAVES, half, x, RIDGE, 0];
      tri.setAttribute('position', new THREE.Float32BufferAttribute(sx > 0 ? pts : [pts[0], pts[1], pts[2], pts[6], pts[7], pts[8], pts[3], pts[4], pts[5]], 3));
      parts.push({ geo: tri, color: TONE.marble });
      // The tympanum painted in the god's colour, and a gilded disc in it.
      const inner = new THREE.BufferGeometry();
      const ip = [x + sx * 0.006, EAVES + 0.03, -half + 0.12, x + sx * 0.006, EAVES + 0.03, half - 0.12, x + sx * 0.006, RIDGE - 0.07, 0];
      inner.setAttribute('position', new THREE.Float32BufferAttribute(sx > 0 ? ip : [ip[0], ip[1], ip[2], ip[6], ip[7], ip[8], ip[3], ip[4], ip[5]], 3));
      parts.push({ geo: inner, color: g });
      parts.push({ geo: new THREE.CylinderGeometry(0.07, 0.07, 0.02, 10).rotateZ(Math.PI / 2).translate(x + sx * 0.015, EAVES + 0.14, 0), color: TONE.bronzeLight });
      // Acroteria at the ridge and the corners.
      parts.push({ geo: new THREE.ConeGeometry(0.05, 0.12, 5).translate(x, RIDGE + 0.06, 0), color: TONE.bronzeLight });
      for (const z of [-half, half]) parts.push({ geo: new THREE.ConeGeometry(0.035, 0.08, 4).translate(x, EAVES + 0.04, z), color: TONE.bronze });
    }
  } else {
    // The roof's timbers going on: rafters across the cornice.
    for (let k = 0; k <= 8; k++) {
      const x = TX0 + 0.05 + ((TX1 - TX0 - 0.1) * k) / 8;
      for (const side of [-1, 1]) parts.push({ geo: rodGeo([x, EAVES, side * (THZ + 0.04)], [x, RIDGE, 0], 0.014), color: TONE.pole });
    }
    parts.push({ geo: rodGeo([TX0, RIDGE, 0], [TX1, RIDGE, 0], 0.018), color: TONE.poleDark });
  }
  void seed;
  return parts;
}

/** A ring (or, f < 1, the part of one laid so far) from y0 to y1. */
const ringGeo = (x: number, z: number, r: number, y0: number, y1: number, f = 1, seg = 24): THREE.BufferGeometry => new THREE.CylinderGeometry(r, r, y1 - y0, seg, 1, false, 0, Math.PI * 2 * f).translate(x, (y0 + y1) / 2, z);

/** The tholos's round platform: three steps, each laid in a sweep (f of them, 0 to 1). */
function roundPlatform(f: number): Part[] {
  const parts: Part[] = [];
  const n = f * STEPS;
  for (let step = 0; step < STEPS && step < n; step++) {
    const r = TH_R + 0.1 + (STEPS - 1 - step) * 0.1;
    parts.push({ geo: ringGeo(TH_X, 0, r, step * STEP, (step + 1) * STEP, Math.min(1, n - step), 28), color: step % 2 ? TONE.marbleShade : TONE.marble });
  }
  return parts;
}

/** The tholos: its ring of columns up to `h` of their height, its round hall, and its roof once `roof` (the rafters, then the cone of tiles). */
function tholos(h: number, roof: number, god: GodId): Part[] {
  const parts: Part[] = [];
  const top = FLOOR + COL_H * h;
  const rc = TH_R - 0.1;
  if (h > 0) {
    parts.push({ geo: ringGeo(TH_X, 0, 0.66, FLOOR, top, 1, 18), color: TONE.marbleWarm });
    // Its door, facing the gate.
    parts.push({ geo: slab(TH_X + 0.6, -0.15, TH_X + 0.675, 0.15, FLOOR, Math.min(top, FLOOR + 0.5)), color: TONE.window });
    const n = 12;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + Math.PI / n;
      const x = TH_X + Math.cos(a) * rc;
      const z = Math.sin(a) * rc;
      const drums = Math.max(1, Math.round(h * 5));
      for (let d = 0; d < drums; d++) {
        const y0 = FLOOR + (COL_H * d) / 5;
        const y1 = FLOOR + (COL_H * Math.min(d + 1, h * 5)) / 5;
        parts.push({ geo: cyl(x, z, COL_R * (1 - d * 0.03), COL_R * (1 - (d + 1) * 0.03), y0, y1, 8), color: d % 2 ? TONE.marble : TONE.marbleWarm });
      }
      if (h >= 1) parts.push({ geo: box(x, z, COL_R + 0.025, COL_R + 0.025, ENT - 0.04, ENT), color: TONE.marbleShade });
    }
  }
  if (roof <= 0) return parts;
  const g = godColour(god);
  parts.push({ geo: ringGeo(TH_X, 0, TH_R, ENT, ENT + ARCH, 1, 28), color: TONE.marble });
  if (roof >= 0.5) {
    parts.push({ geo: ringGeo(TH_X, 0, TH_R - 0.01, ENT + ARCH, ENT + ARCH + FRIEZE, 1, 28), color: g });
    parts.push({ geo: ringGeo(TH_X, 0, TH_R + 0.04, EAVES - CORNICE, EAVES, 1, 28), color: TONE.marbleShade });
  }
  if (roof >= 0.75) {
    const R = TH_R + 0.08;
    const rise = 0.62;
    parts.push({ geo: new THREE.ConeGeometry(R, rise, 24, 1, true).translate(TH_X, EAVES + rise / 2, 0), color: ROOFS[god] });
    // Rows of tiles down the cone, and a bronze flower at its top.
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      parts.push({ geo: rodGeo([TH_X + Math.cos(a) * R, EAVES + 0.01, Math.sin(a) * R], [TH_X, EAVES + rise, 0], 0.014, 0.008, 3), color: shade(ROOFS[god], 0.7) });
    }
    parts.push({ geo: cyl(TH_X, 0, 0.05, 0.03, EAVES + rise - 0.04, EAVES + rise + 0.08, 6), color: TONE.bronzeLight });
    parts.push({ geo: ball(TH_X, EAVES + rise + 0.14, 0, 0.06, 0), color: TONE.bronzeLight });
  } else {
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      parts.push({ geo: rodGeo([TH_X + Math.cos(a) * TH_R, EAVES, Math.sin(a) * TH_R], [TH_X, EAVES + 0.62, 0], 0.014), color: TONE.pole });
    }
  }
  return parts;
}

/** The precinct's side court beside the temple (+z side): each god's garden, pool, field or yard, wide enough to read from afar. */
const GARDEN = { x0: -1.38, x1: 0.28, z0: 1.24, z1: 2.16 };
function garden(god: GodId, seed: number): Part[] {
  const { x0, x1, z1 } = GARDEN;
  // (Clear of a tholos's wider round platform.)
  const z0 = THOLOS.has(god) ? 1.52 : GARDEN.z0;
  const mx = (x0 + x1) / 2;
  const mz = (z0 + z1) / 2;
  const G = godColour(god);
  const parts: Part[] = [];
  const bed = (color: string, y = 0.03): void => {
    parts.push({ geo: slab(x0 - 0.04, z0 - 0.04, x1 + 0.04, z1 + 0.04, 0, y - 0.01), color: TONE.marbleShade });
    parts.push({ geo: slab(x0, z0, x1, z1, 0, y), color });
  };
  const r = (k: number, j: number): number => hash2(k, j, seed);
  switch (god) {
    case 'zeus':
      // His oak, as at Dodona, on a gravel terrace.
      bed(PAL.pavingDark);
      parts.push({ geo: cyl(mx, mz, 0.07, 0.05, 0, 0.5, 6), color: PAL.trunk });
      parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.46, 1), 0.12, seed).scale(1.3, 0.8, 0.9).translate(mx, 0.78, mz), color: '#3f6a32' });
      parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.3, 0), 0.12, seed + 1).translate(mx + 0.35, 0.9, mz - 0.1), color: '#4f7c3a' });
      break;
    case 'hera':
      // A bed of her irises and lilies.
      bed('#6a5236');
      for (let k = 0; k < 30; k++) parts.push({ geo: ball(x0 + 0.08 + r(k, 1) * (x1 - x0 - 0.16), 0.08 + r(k, 3) * 0.04, z0 + 0.08 + r(k, 2) * (z1 - z0 - 0.16), 0.045), color: k % 3 ? G : '#f6f1e2' });
      break;
    case 'poseidon':
      // A pool of sea water, a bronze dolphin leaping in it.
      parts.push({ geo: slab(x0 - 0.06, z0 - 0.06, x1 + 0.06, z1 + 0.06, 0, 0.09), color: TONE.marble });
      parts.push({ geo: slab(x0, z0, x1, z1, 0.02, 0.08), color: '#2c86a8' });
      parts.push({ geo: new THREE.TorusGeometry(0.16, 0.04, 5, 10, Math.PI).translate(mx, 0.08, mz), color: TONE.bronze });
      break;
    case 'demeter':
      // Her own field of wheat, ripe, in rows.
      bed('#7a5a34');
      for (let k = 0; k < 6; k++) parts.push({ geo: lumpy(new THREE.BoxGeometry(x1 - x0 - 0.1, 0.16, 0.1, 4, 1, 1), 0.08, seed + k).translate(mx, 0.11, z0 + 0.1 + (k * (z1 - z0 - 0.2)) / 5), color: k % 2 ? PAL.sheaf : '#d4a838' });
      break;
    case 'athena':
      // Her olives on pale gravel.
      bed(PAL.pavingDark);
      parts.push(...tree(x0 + 0.38, mz - 0.05, 'olive', seed + 11), ...tree(x1 - 0.38, mz + 0.08, 'olive', seed + 12));
      break;
    case 'apollo':
      // His laurel grove.
      bed('#6a5236');
      for (const [fx, fz] of [[0.2, 0.3], [0.55, 0.7], [0.85, 0.3]]) parts.push(...tree(x0 + fx * (x1 - x0), z0 + fz * (z1 - z0), 'laurel', seed + fx * 10));
      break;
    case 'artemis':
      // A piece of the wild left in her court: cypresses and undergrowth.
      bed('#4f6a34');
      for (const [fx, fz] of [[0.15, 0.4], [0.5, 0.75], [0.85, 0.35]]) parts.push(...tree(x0 + fx * (x1 - x0), z0 + fz * (z1 - z0), 'cypress', seed + fx * 10));
      for (let k = 0; k < 5; k++) parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.13, 0), 0.15, seed + k).translate(x0 + r(k, 1) * (x1 - x0), 0.08, z0 + r(k, 2) * (z1 - z0)), color: PAL.pine });
      break;
    case 'ares':
      // A yard of arms: shields in his red on racks, spears stood up.
      bed('#8a6a4a');
      for (let k = 0; k < 4; k++) {
        const x = x0 + 0.22 + k * ((x1 - x0 - 0.44) / 3);
        parts.push({ geo: rodGeo([x - 0.15, 0.3, mz], [x + 0.15, 0.3, mz], 0.015, 0.015, 4), color: TONE.poleDark });
        parts.push({ geo: new THREE.CylinderGeometry(0.15, 0.15, 0.03, 12).rotateX(Math.PI / 2).translate(x, 0.24, mz + 0.03), color: k % 2 ? G : TONE.bronze });
        parts.push({ geo: rodGeo([x, 0, mz - 0.3], [x + 0.05, 0.85, mz - 0.32], 0.01, 0.008, 4), color: TONE.poleDark });
      }
      break;
    case 'aphrodite':
      // Her garden of roses and myrtle.
      bed('#6a5236');
      for (let k = 0; k < 6; k++) {
        const x = x0 + 0.15 + r(k, 1) * (x1 - x0 - 0.3);
        const z = z0 + 0.15 + r(k, 2) * (z1 - z0 - 0.3);
        parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.15, 0), 0.12, seed + k).scale(1, 0.8, 1).translate(x, 0.12, z), color: PAL.pine });
        for (let j = 0; j < 4; j++) parts.push({ geo: ball(x + (r(k, j + 3) - 0.5) * 0.24, 0.2, z + (r(k, j + 7) - 0.5) * 0.24, 0.035), color: j % 2 ? G : '#c8405e' });
      }
      break;
    case 'hephaestus': {
      // His forge: a sooty floor, a great brick hearth glowing, its chimney smoking.
      bed('#3a3430');
      const fx = x0 + 0.42;
      parts.push({ geo: box(fx, mz, 0.3, 0.3, 0, 0.36), color: '#8b5a3c' });
      parts.push({ geo: box(fx + 0.18, mz, 0.13, 0.18, 0.08, 0.3), color: PAL.ember });
      parts.push({ geo: box(fx - 0.08, mz, 0.12, 0.12, 0.36, 1.25), color: '#7a4e34' });
      for (let k = 0; k < 4; k++) parts.push({ geo: ball(fx - 0.08 + k * 0.06, 1.35 + k * 0.17, mz - k * 0.04, 0.09 + k * 0.03), color: k ? '#a9a39a' : '#7d7871' });
      parts.push({ geo: box(x1 - 0.35, mz, 0.1, 0.1, 0, 0.18), color: TONE.poleDark }, { geo: box(x1 - 0.35, mz, 0.16, 0.06, 0.18, 0.26), color: '#55504b' });
      break;
    }
    case 'hermes':
      // A row of herms along a running track.
      bed(PAL.pavingDark);
      for (let k = 0; k < 4; k++) {
        const x = x0 + 0.18 + k * ((x1 - x0 - 0.36) / 3);
        parts.push({ geo: box(x, mz, 0.06, 0.06, 0, 0.5), color: TONE.marble }, { geo: ball(x, 0.57, mz, 0.06), color: TONE.marble }, { geo: slab(x - 0.01, mz - 0.1, x + 0.01, mz + 0.1, 0.52, 0.56), color: G });
      }
      break;
    case 'dionysus':
      // His vines in rows on their stakes, heavy with grapes.
      bed('#7a5a34');
      for (let k = 0; k < 3; k++) {
        const z = z0 + 0.18 + k * ((z1 - z0 - 0.36) / 2);
        parts.push({ geo: lumpy(new THREE.BoxGeometry(x1 - x0 - 0.12, 0.26, 0.14, 5, 1, 1), 0.1, seed + k).translate(mx, 0.3, z), color: k % 2 ? PAL.vineLeaf : PAL.vineLeafDark });
        for (let j = 0; j < 6; j++) parts.push({ geo: ball(x0 + 0.12 + j * ((x1 - x0 - 0.24) / 5), 0.18, z + 0.08, 0.04), color: j % 2 ? PAL.grapeRipe : G });
      }
      break;
  }
  return parts;
}

/** The altar before the temple: a block on a step, its fire lit once the sanctuary is in use. */
function altar(lit: boolean): Part[] {
  const [x, z] = ALTAR;
  const parts: Part[] = [];
  parts.push({ geo: box(x, z, 0.26, 0.36, 0, 0.05), color: TONE.marbleShade });
  parts.push({ geo: box(x, z, 0.19, 0.29, 0.05, 0.25), color: TONE.marble });
  parts.push({ geo: box(x, z, 0.21, 0.31, 0.25, 0.29), color: TONE.marbleShade });
  // Horns at its corners.
  for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) parts.push({ geo: box(x + dx * 0.17, z + dz * 0.27, 0.025, 0.025, 0.29, 0.34), color: TONE.marble });
  if (lit) {
    parts.push({ geo: box(x, z, 0.12, 0.18, 0.29, 0.31), color: PAL.charDark });
    parts.push({ geo: new THREE.ConeGeometry(0.1, 0.24, 6).translate(x, 0.42, z), color: PAL.ember });
    parts.push({ geo: new THREE.ConeGeometry(0.06, 0.18, 5).translate(x + 0.02, 0.4, z - 0.02), color: PAL.flame });
  }
  return parts;
}

/** A tree in the court: a cypress (dark and tall) or a round olive or laurel. */
function tree(x: number, z: number, kind: 'cypress' | 'olive' | 'laurel', seed: number): Part[] {
  const parts: Part[] = [];
  parts.push({ geo: cyl(x, z, 0.035, 0.03, 0, kind === 'cypress' ? 0.3 : 0.38, 5), color: PAL.trunk });
  if (kind === 'cypress') parts.push({ geo: lumpy(new THREE.ConeGeometry(0.17, 1.15, 7), 0.05, seed).translate(x, 0.82, z), color: PAL.cypress });
  else {
    const leaf = kind === 'olive' ? PAL.oliveLeaf : PAL.pineDark;
    parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.3, 0), 0.12, seed).scale(1.1, 0.8, 1.1).translate(x, 0.55, z), color: leaf });
    parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.2, 0), 0.12, seed + 1).translate(x + 0.12, 0.68, z - 0.08), color: kind === 'olive' ? PAL.oliveLeafDark : PAL.pine });
  }
  return parts;
}

/** A banner on a pole at (x, z), in the god's colour (furled when the sanctuary is dimmed). */
function banner(x: number, z: number, colour: string, furled: boolean): Part[] {
  const parts: Part[] = [{ geo: cyl(x, z, 0.018, 0.014, 0, 1.15, 5), color: TONE.poleDark }];
  if (furled) parts.push({ geo: cyl(x, z, 0.035, 0.035, 0.75, 1.1, 5), color: shade(colour, 0.6) });
  else {
    const side = z < 0 ? -1 : 1;
    const [za, zb] = side > 0 ? [z, z + 0.38] : [z - 0.38, z];
    parts.push({ geo: slab(x - 0.006, za, x + 0.006, zb, 0.62, 1.12), color: colour });
    parts.push({ geo: slab(x - 0.008, za + 0.02, x + 0.008, zb - 0.02, 0.66, 0.7), color: TONE.bronzeLight });
  }
  parts.push({ geo: ball(x, 1.17, z, 0.03), color: TONE.bronzeLight });
  return parts;
}

// ---------------------------------------------------------------------------
// The statues: one figure, each god in their own pose, colour and emblem.

/** One piece of a statue: its geometry (local to the plinth's top, facing +x), its colour, and how high it reaches (it goes up from the feet as the stage's work goes on). */
type Piece = { geo: THREE.BufferGeometry; color: string; y: number };

interface Pose {
  /** The right arm (+z, the side away from the temple) raised high (1), out (0.5) or down (0). */
  right: number;
  left: number;
  /** A long robe to the feet (a goddess, or Zeus's and Poseidon's himation), or a short tunic. */
  robe: 'long' | 'short';
  /** On the head. */
  head: 'bare' | 'helmet' | 'veil' | 'crown' | 'petasos' | 'wreath';
  beard: boolean;
}

const POSES: Record<GodId, Pose> = {
  zeus: { right: 1, left: 0.5, robe: 'long', head: 'wreath', beard: true },
  hera: { right: 0.5, left: 0.2, robe: 'long', head: 'crown', beard: false },
  poseidon: { right: 1, left: 0.2, robe: 'long', head: 'crown', beard: true },
  demeter: { right: 0.5, left: 0.5, robe: 'long', head: 'veil', beard: false },
  athena: { right: 1, left: 0.4, robe: 'long', head: 'helmet', beard: false },
  apollo: { right: 0.5, left: 0.5, robe: 'short', head: 'wreath', beard: false },
  artemis: { right: 0.3, left: 0.7, robe: 'short', head: 'bare', beard: false },
  ares: { right: 1, left: 0.4, robe: 'short', head: 'helmet', beard: true },
  aphrodite: { right: 0.8, left: 0.1, robe: 'long', head: 'bare', beard: false },
  hephaestus: { right: 1, left: 0.2, robe: 'short', head: 'bare', beard: true },
  hermes: { right: 0.5, left: 0.3, robe: 'short', head: 'petasos', beard: false },
  dionysus: { right: 0.8, left: 0.3, robe: 'long', head: 'wreath', beard: false },
};

/** The god's statue, about a metre tall above its plinth, facing +x: body in bronze, robe in the god's colour, the emblem in hand. */
function statue(god: GodId): Piece[] {
  const out: Piece[] = [];
  const add = (geo: THREE.BufferGeometry, color: string): void => {
    geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    out.push({ geo, color, y: (bb.min.y + bb.max.y) / 2 });
  };
  const p = POSES[god];
  const B = TONE.bronze;
  const S = TONE.bronzeShade;
  const L = TONE.bronzeLight;
  const G = godColour(god);
  const GD = shade(G, 0.72);
  // Legs and the robe or tunic.
  if (p.robe === 'long') {
    add(new THREE.CylinderGeometry(0.11, 0.17, 0.5, 8).translate(0, 0.25, 0), G);
    for (let k = 0; k < 4; k++) add(box(0.12, -0.09 + k * 0.06, 0.012, 0.012, 0.02, 0.46), GD);
  } else {
    for (const z of [-0.06, 0.06]) add(cyl(0, z, 0.04, 0.045, 0, 0.3, 6), B);
    add(new THREE.CylinderGeometry(0.11, 0.14, 0.2, 8).translate(0, 0.38, 0), G);
  }
  // The body, the shoulders, the neck and head.
  add(new THREE.CylinderGeometry(0.12, 0.11, 0.3, 8).scale(0.85, 1, 1.1).translate(0, 0.63, 0), p.robe === 'long' && (god === 'zeus' || god === 'poseidon' || god === 'dionysus') ? B : G);
  // (A gods' himation over the left shoulder: a band of their colour across the bronze chest.)
  if (p.robe === 'long' && (god === 'zeus' || god === 'poseidon' || god === 'dionysus')) add(new THREE.BoxGeometry(0.26, 0.06, 0.06).rotateX(0.7).translate(0, 0.66, -0.02), G);
  add(cyl(0, 0, 0.035, 0.03, 0.78, 0.83, 6), B);
  add(ball(0.01, 0.89, 0, 0.068, 1).scale(1, 1.1, 1).translate(0, -0.09, 0), B);
  add(box(0.075, 0, 0.012, 0.012, 0.88, 0.9), S);
  if (p.beard) add(new THREE.ConeGeometry(0.05, 0.08, 6).rotateZ(Math.PI).translate(0.045, 0.84, 0), S);
  // On the head.
  if (p.head === 'helmet') {
    add(ball(0, 0.93, 0, 0.078, 0).scale(1, 0.9, 1), L);
    add(slab(-0.1, -0.012, 0.06, 0.012, 0.97, 1.1), G);
  } else if (p.head === 'veil') add(new THREE.ConeGeometry(0.1, 0.24, 8).translate(-0.02, 0.86, 0), G);
  else if (p.head === 'crown') add(cyl(0, 0, 0.07, 0.08, 0.93, 0.98, 8), L);
  else if (p.head === 'petasos') {
    add(cyl(0, 0, 0.11, 0.11, 0.93, 0.95, 10), G);
    add(ball(0, 0.96, 0, 0.055, 0), G);
    for (const z of [-0.08, 0.08]) add(new THREE.BoxGeometry(0.08, 0.05, 0.01).rotateX(z > 0 ? 0.5 : -0.5).translate(-0.02, 0.98, z), L);
  } else if (p.head === 'wreath') add(new THREE.TorusGeometry(0.07, 0.015, 4, 10).rotateX(Math.PI / 2).translate(0, 0.93, 0), god === 'dionysus' ? '#5d7a34' : L);
  // The arms: from the shoulder at z ±0.13, raised by `up` (0 down at the side, 0.5 out before, 1 high).
  const hand = (side: number, up: number): V3 => {
    const a = up * Math.PI * 0.85;
    return [0.24 * Math.sin(a), 0.74 - 0.24 * Math.cos(a), side * (0.17 + 0.03 * up)];
  };
  const shoulder = (side: number): V3 => [0, 0.74, side * 0.13];
  const R = hand(1, p.right);
  const Lh = hand(-1, p.left);
  add(rodGeo(shoulder(1), R, 0.032, 0.026, 5), B);
  add(rodGeo(shoulder(-1), Lh, 0.032, 0.026, 5), B);
  // The emblem and what they carry.
  const gold = TONE.bronzeLight;
  switch (god) {
    case 'zeus': {
      // A thunderbolt raised high, zigzag, and a sceptre in the left hand.
      const [x, y, z] = R;
      add(rodGeo([x, y, z], [x + 0.05, y + 0.12, z - 0.02], 0.022, 0.012, 4), gold);
      add(rodGeo([x + 0.05, y + 0.12, z - 0.02], [x - 0.01, y + 0.16, z + 0.02], 0.018, 0.012, 4), gold);
      add(rodGeo([x - 0.01, y + 0.16, z + 0.02], [x + 0.06, y + 0.3, z], 0.016, 0.004, 4), gold);
      add(rodGeo([x, y, z], [x - 0.04, y - 0.12, z + 0.02], 0.02, 0.006, 4), gold);
      add(rodGeo([Lh[0], 0.05, Lh[2]], [Lh[0], 1.05, Lh[2]], 0.012, 0.012, 4), S);
      add(ball(Lh[0], 1.07, Lh[2], 0.025), gold);
      break;
    }
    case 'hera': {
      // A sceptre topped with a cuckoo, and a pomegranate in the other hand.
      add(rodGeo([R[0], 0.05, R[2]], [R[0], 1.08, R[2]], 0.012, 0.012, 4), S);
      add(ball(R[0], 1.1, R[2], 0.03), G);
      add(ball(Lh[0] + 0.02, Lh[1], Lh[2], 0.035), '#b8433a');
      break;
    }
    case 'poseidon': {
      // The trident, raised high.
      const [x, , z] = R;
      add(rodGeo([x, 0.1, z], [x, 1.25, z], 0.014, 0.012, 4), S);
      for (const dz of [-0.06, 0, 0.06]) add(rodGeo([x, 1.18, z + dz], [x, 1.33, z + dz * 1.2], 0.01, 0.003, 4), gold);
      add(slab(x - 0.01, z - 0.065, x + 0.01, z + 0.065, 1.17, 1.19), gold);
      break;
    }
    case 'demeter': {
      // A sheaf of wheat held in both arms, and a torch.
      add(new THREE.CylinderGeometry(0.05, 0.03, 0.3, 6).rotateZ(0.5).translate(0.2, 0.68, 0.08), PAL.sheaf);
      add(new THREE.ConeGeometry(0.07, 0.12, 6).rotateZ(0.5).translate(0.27, 0.82, 0.08), PAL.wheatGold);
      add(rodGeo([Lh[0], Lh[1] - 0.1, Lh[2]], [Lh[0] + 0.02, Lh[1] + 0.22, Lh[2]], 0.012, 0.014, 4), S);
      add(new THREE.ConeGeometry(0.03, 0.08, 5).translate(Lh[0] + 0.02, Lh[1] + 0.27, Lh[2]), PAL.ember);
      break;
    }
    case 'athena': {
      // The spear raised, the round shield at her side, an owl on its rim.
      const [x, , z] = R;
      add(rodGeo([x, 0.05, z], [x, 1.3, z], 0.012, 0.01, 4), S);
      add(new THREE.ConeGeometry(0.025, 0.1, 4).translate(x, 1.35, z), gold);
      add(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 12).rotateX(Math.PI / 2).translate(0.05, 0.36, -0.24), G);
      add(new THREE.CylinderGeometry(0.06, 0.06, 0.035, 10).rotateX(Math.PI / 2).translate(0.05, 0.36, -0.26), gold);
      add(ball(0.05, 0.57, -0.24, 0.04), '#8a7a62');
      add(ball(0.07, 0.62, -0.24, 0.028), '#8a7a62');
      break;
    }
    case 'apollo': {
      // The lyre at his breast.
      const x = 0.17;
      add(rodGeo([x, 0.55, 0.0], [x + 0.02, 0.78, -0.08], 0.012, 0.01, 4), gold);
      add(rodGeo([x, 0.55, 0.06], [x + 0.02, 0.78, 0.14], 0.012, 0.01, 4), gold);
      add(rodGeo([x + 0.02, 0.76, -0.08], [x + 0.02, 0.76, 0.14], 0.01, 0.01, 4), gold);
      add(ball(x, 0.56, 0.03, 0.05).scale(1, 0.6, 1).translate(0, 0.22, 0), gold);
      for (const dz of [-0.03, 0.01, 0.05, 0.09]) add(rodGeo([x + 0.005, 0.58, dz * 0.8], [x + 0.015, 0.75, dz], 0.003, 0.003, 3), '#f3ead6');
      break;
    }
    case 'artemis': {
      // The bow held out before her, a quiver on her back.
      const [x, y, z] = Lh;
      add(new THREE.TorusGeometry(0.2, 0.012, 4, 10, Math.PI * 0.9).rotateY(-Math.PI / 2).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).translate(x + 0.03, y, z), gold);
      add(rodGeo([x + 0.03, y - 0.2, z], [x + 0.03, y + 0.2, z], 0.003, 0.003, 3), '#f3ead6');
      add(cyl(-0.1, 0.05, 0.035, 0.04, 0.55, 0.85, 6).rotateX(-0.25), G);
      add(new THREE.ConeGeometry(0.035, 0.06, 5).translate(-0.1, 0.9, 0.07), '#f3ead6');
      break;
    }
    case 'ares': {
      // The spear raised and a big round shield.
      const [x, , z] = R;
      add(rodGeo([x, 0.05, z], [x + 0.05, 1.35, z], 0.014, 0.01, 4), S);
      add(new THREE.ConeGeometry(0.03, 0.12, 4).translate(x + 0.05, 1.41, z), L);
      add(new THREE.CylinderGeometry(0.2, 0.2, 0.035, 12).rotateX(Math.PI / 2).translate(0.07, 0.48, -0.25), G);
      add(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 10).rotateX(Math.PI / 2).translate(0.07, 0.48, -0.27), gold);
      break;
    }
    case 'aphrodite': {
      // A white dove on her raised hand, and a mirror in the other.
      const [x, y, z] = R;
      add(ball(x, y + 0.04, z, 0.035).scale(1.4, 1, 1).translate(0, 0, 0), '#fbf6ea');
      add(new THREE.BoxGeometry(0.02, 0.07, 0.12).translate(x - 0.01, y + 0.08, z), '#fbf6ea');
      add(new THREE.CylinderGeometry(0.045, 0.045, 0.01, 10).rotateZ(Math.PI / 2).translate(Lh[0] + 0.03, Lh[1] + 0.05, Lh[2]), gold);
      break;
    }
    case 'hephaestus': {
      // The hammer raised, tongs in the other hand.
      const [x, y, z] = R;
      add(rodGeo([x, y - 0.05, z], [x, y + 0.22, z], 0.012, 0.012, 4), TONE.pole);
      add(box(x, z, 0.04, 0.07, y + 0.2, y + 0.27), '#5f5a55');
      add(rodGeo([Lh[0], Lh[1], Lh[2]], [Lh[0] + 0.12, Lh[1] - 0.15, Lh[2]], 0.008, 0.008, 3), '#5f5a55');
      break;
    }
    case 'hermes': {
      // The caduceus: a staff, two snakes, wings at its top.
      const [x, y, z] = R;
      add(rodGeo([x, y - 0.2, z], [x, y + 0.35, z], 0.01, 0.01, 4), gold);
      for (let k = 0; k < 3; k++) add(new THREE.TorusGeometry(0.035, 0.008, 3, 8).rotateX(Math.PI / 2).translate(x, y + k * 0.08, z), G);
      for (const dz of [-1, 1]) add(new THREE.BoxGeometry(0.02, 0.05, 0.08).rotateX(dz * 0.6).translate(x, y + 0.33, z + dz * 0.05), gold);
      // A purse in the other hand.
      add(ball(Lh[0] + 0.02, Lh[1] - 0.04, Lh[2], 0.04), '#8a6a45');
      break;
    }
    case 'dionysus': {
      // A wine cup raised, and the thyrsus (a staff with a pine cone) with ivy.
      const [x, y, z] = R;
      add(cyl(x, z, 0.02, 0.05, y, y + 0.06, 8), gold);
      add(rodGeo([Lh[0], 0.08, Lh[2]], [Lh[0], 1.1, Lh[2]], 0.012, 0.012, 4), '#7a5c3c');
      add(new THREE.ConeGeometry(0.035, 0.09, 6).rotateZ(Math.PI).translate(Lh[0], 1.14, Lh[2]), '#5d7a34');
      for (let k = 0; k < 3; k++) add(ball(Lh[0] + 0.02, 0.5 + k * 0.17, Lh[2] + 0.02, 0.025), '#5d7a34');
      break;
    }
  }
  return out;
}
const STATUES = new Map<GodId, Piece[]>();
const statueOf = (god: GodId): Piece[] => {
  let p = STATUES.get(god);
  if (!p) STATUES.set(god, (p = statue(god)));
  return p;
};

/** The statue's plinth. */
function plinth(): Part[] {
  const [x, z] = STATUE;
  return [
    { geo: box(x, z, 0.24, 0.24, 0, 0.06), color: TONE.marbleShade },
    { geo: box(x, z, 0.19, 0.19, 0.06, PLINTH_H - 0.04), color: TONE.marble },
    { geo: box(x, z, 0.22, 0.22, PLINTH_H - 0.04, PLINTH_H), color: TONE.marbleShade },
  ];
}

// ---------------------------------------------------------------------------
// What each god loves, beside the statue.

/** A horse standing (Poseidon's), white, facing +x, at (x, z). */
function horse(x: number, z: number): Part[] {
  const c = '#ece6da';
  const d = '#cfc7b8';
  return [
    { geo: box(x, z, 0.2, 0.07, 0.28, 0.42), color: c },
    ...[[-0.15, -0.045], [-0.15, 0.045], [0.15, -0.045], [0.15, 0.045]].map(([dx, dz]) => ({ geo: cyl(x + dx, z + dz, 0.02, 0.02, 0, 0.3, 4), color: d })),
    { geo: rodGeo([x + 0.17, 0.4, z], [x + 0.27, 0.58, z], 0.05, 0.04, 5), color: c },
    { geo: box(x + 0.32, z, 0.07, 0.035, 0.53, 0.6), color: c },
    { geo: rodGeo([x - 0.2, 0.4, z], [x - 0.3, 0.2, z], 0.02, 0.01, 4), color: d },
    { geo: box(x + 0.2, z, 0.06, 0.012, 0.46, 0.62), color: '#8a6a45' },
    { geo: box(x, z, 0.24, 0.1, 0, 0.02), color: TONE.marbleShade },
  ];
}

/** A deer (Artemis's). */
function deer(x: number, z: number): Part[] {
  const c = '#b07a48';
  return [
    { geo: box(x, z, 0.15, 0.05, 0.24, 0.34), color: c },
    ...[[-0.11, -0.03], [-0.11, 0.03], [0.11, -0.03], [0.11, 0.03]].map(([dx, dz]) => ({ geo: cyl(x + dx, z + dz, 0.012, 0.012, 0, 0.26, 4), color: c })),
    { geo: rodGeo([x + 0.13, 0.32, z], [x + 0.2, 0.46, z], 0.03, 0.025, 5), color: c },
    { geo: box(x + 0.24, z, 0.05, 0.025, 0.44, 0.49), color: c },
    { geo: rodGeo([x + 0.2, 0.49, z - 0.02], [x + 0.17, 0.62, z - 0.08], 0.006, 0.004, 3), color: '#e8dcc0' },
    { geo: rodGeo([x + 0.2, 0.49, z + 0.02], [x + 0.17, 0.62, z + 0.08], 0.006, 0.004, 3), color: '#e8dcc0' },
  ];
}

/** Each god's own thing in the court, beside the statue (+z side). */
function extra(god: GodId, seed: number): Part[] {
  const [x, z] = EXTRA;
  const G = godColour(god);
  switch (god) {
    case 'zeus':
      // His eagle on a column.
      return [{ geo: cyl(x, z, 0.08, 0.07, 0, 0.75, 8), color: TONE.marble }, { geo: box(x, z, 0.1, 0.1, 0.75, 0.8), color: TONE.marbleShade }, { geo: ball(x, 0.88, z, 0.07).scale(1, 1.2, 1), color: TONE.bronzeShade }, { geo: new THREE.BoxGeometry(0.06, 0.04, 0.42).rotateX(0.25).translate(x - 0.02, 0.9, z), color: TONE.bronze }, { geo: ball(x + 0.06, 0.97, z, 0.035), color: '#f3ead6' }];
    case 'hera': {
      // Her peacock, its tail fanned in her blue and green.
      const parts: Part[] = [{ geo: ball(x, 0.2, z, 0.08).scale(1.4, 1, 1), color: '#1f78a8' }, { geo: rodGeo([x + 0.08, 0.22, z], [x + 0.12, 0.38, z], 0.02, 0.015, 4), color: '#1f78a8' }, { geo: ball(x + 0.13, 0.4, z, 0.03), color: '#1f78a8' }];
      for (let k = 0; k < 9; k++) {
        const a = -1.1 + (k / 8) * 2.2;
        parts.push({ geo: new THREE.BoxGeometry(0.012, 0.42, 0.08).translate(0, 0.21, 0).rotateX(a).translate(x - 0.08, 0.18, z), color: k % 2 ? '#2a9d84' : G });
        parts.push({ geo: ball(x - 0.08, 0.18 + Math.cos(a) * 0.38, z - Math.sin(a) * 0.38, 0.03), color: '#e2bc4e' });
      }
      parts.push({ geo: box(x, z, 0.16, 0.16, 0, 0.03), color: TONE.marbleShade });
      return parts;
    }
    case 'poseidon':
      return horse(x - 0.05, z);
    case 'demeter': {
      // The kore, her daughter, small beside her, and sheaves stooked.
      const parts: Part[] = [{ geo: box(x, z, 0.14, 0.14, 0, 0.18), color: TONE.marble }, { geo: new THREE.CylinderGeometry(0.06, 0.09, 0.32, 7).translate(x, 0.34, z), color: '#e8799b' }, { geo: ball(x, 0.55, z, 0.045), color: TONE.bronze }];
      for (const [dx, dz] of [[-0.25, 0.25], [0.25, 0.3], [-0.3, -0.25]]) parts.push({ geo: new THREE.ConeGeometry(0.08, 0.3, 6).translate(x + dx, 0.15, z + dz), color: PAL.sheaf });
      return parts;
    }
    case 'athena':
      // Her sacred olive tree, and an owl on a post.
      return [...tree(x - 0.1, z, 'olive', seed), { geo: cyl(x + 0.3, z - 0.3, 0.025, 0.025, 0, 0.42, 5), color: TONE.poleDark }, { geo: ball(x + 0.3, 0.48, z - 0.3, 0.05).scale(1, 1.3, 1), color: '#8a7a62' }, { geo: ball(x + 0.34, 0.53, z - 0.3, 0.015), color: '#f3d24a' }];
    case 'apollo':
      // His laurel, and a tripod.
      return [...tree(x - 0.1, z + 0.05, 'laurel', seed), ...[0, 2.1, 4.2].map((a) => ({ geo: rodGeo([x + 0.3 + Math.cos(a) * 0.1, 0, z - 0.3 + Math.sin(a) * 0.1], [x + 0.3, 0.4, z - 0.3], 0.012, 0.01, 4), color: TONE.bronzeLight })), { geo: cyl(x + 0.3, z - 0.3, 0.06, 0.1, 0.38, 0.46, 8), color: TONE.bronzeLight }];
    case 'artemis':
      return [...deer(x, z), ...tree(x - 0.35, z + 0.15, 'cypress', seed)];
    case 'ares': {
      // A trophy: a post hung with a helmet, a breastplate and a shield, spears crossed.
      const parts: Part[] = [{ geo: cyl(x, z, 0.03, 0.03, 0, 0.9, 5), color: TONE.poleDark }, { geo: rodGeo([x, 0.62, z - 0.22], [x, 0.62, z + 0.22], 0.02, 0.02, 4), color: TONE.poleDark }];
      parts.push({ geo: new THREE.CylinderGeometry(0.11, 0.09, 0.24, 8).scale(1, 1, 1.2).translate(x + 0.02, 0.56, z), color: TONE.bronze });
      parts.push({ geo: ball(x + 0.02, 0.85, z, 0.07), color: TONE.bronzeLight });
      parts.push({ geo: slab(x - 0.05, z - 0.01, x + 0.1, z + 0.01, 0.9, 1.0), color: G });
      parts.push({ geo: new THREE.CylinderGeometry(0.14, 0.14, 0.03, 12).rotateX(Math.PI / 2).translate(x + 0.08, 0.5, z + 0.2), color: G });
      for (const s of [-1, 1]) parts.push({ geo: rodGeo([x - 0.15, 0, z + s * 0.25], [x + 0.15, 1.0, z - s * 0.2], 0.01, 0.01, 4), color: TONE.poleDark });
      return parts;
    }
    case 'aphrodite': {
      // A basin on a stand with doves at its rim, and a bush of roses.
      const parts: Part[] = [{ geo: cyl(x, z, 0.06, 0.05, 0, 0.32, 8), color: TONE.marble }, { geo: cyl(x, z, 0.08, 0.2, 0.32, 0.4, 10), color: TONE.marble }, { geo: cyl(x, z, 0.17, 0.17, 0.4, 0.41, 10), color: PAL.basinWater }];
      for (const a of [0.4, 2.3, 4.4]) parts.push({ geo: ball(x + Math.cos(a) * 0.18, 0.45, z + Math.sin(a) * 0.18, 0.03).scale(1.3, 1, 1), color: '#fbf6ea' });
      parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.2, 0), 0.1, seed).scale(1, 0.8, 1).translate(x - 0.35, 0.16, z + 0.15), color: PAL.pine });
      for (let k = 0; k < 6; k++) parts.push({ geo: ball(x - 0.35 + (hash2(k, 1, seed) - 0.5) * 0.3, 0.2 + hash2(k, 2, seed) * 0.12, z + 0.15 + (hash2(k, 3, seed) - 0.5) * 0.3, 0.03), color: '#d8607c' });
      return parts;
    }
    case 'hephaestus':
      // An anvil on its block and a little forge glowing.
      return [
        { geo: box(x, z, 0.1, 0.1, 0, 0.18), color: TONE.poleDark },
        { geo: box(x, z, 0.16, 0.06, 0.18, 0.26), color: '#55504b' },
        { geo: new THREE.ConeGeometry(0.06, 0.12, 4).rotateZ(-Math.PI / 2).translate(x + 0.2, 0.22, z), color: '#55504b' },
        { geo: cyl(x - 0.25, z - 0.3, 0.14, 0.11, 0, 0.3, 8), color: '#8b5a3c' },
        { geo: cyl(x - 0.25, z - 0.3, 0.07, 0.07, 0.3, 0.32, 8), color: PAL.ember },
        { geo: cyl(x - 0.25, z - 0.3, 0.04, 0.03, 0.32, 0.72, 6), color: '#8b5a3c' },
      ];
    case 'hermes':
      // A herm: a square pillar with his head on it, and a traveller's stone.
      return [{ geo: box(x, z, 0.07, 0.07, 0, 0.6), color: TONE.marble }, { geo: ball(x, 0.68, z, 0.07), color: TONE.marble }, { geo: box(x + 0.05, z, 0.04, 0.09, 0.42, 0.46), color: TONE.marbleShade }, { geo: lumpy(new THREE.DodecahedronGeometry(0.12, 0), 0.2, seed).translate(x + 0.3, 0.08, z - 0.3), color: PAL.rockGrey }, { geo: slab(x - 0.01, z - 0.12, x + 0.01, z + 0.12, 0.62, 0.66), color: G }];
    case 'dionysus': {
      // A vine on a pergola of poles, heavy with grapes, and a great mixing bowl.
      const parts: Part[] = [];
      for (const [dx, dz] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) parts.push({ geo: cyl(x + dx, z + dz, 0.02, 0.02, 0, 0.6, 4), color: TONE.poleDark });
      parts.push({ geo: lumpy(new THREE.BoxGeometry(0.62, 0.08, 0.62, 3, 1, 3), 0.06, seed).translate(x, 0.64, z), color: '#5d7a34' });
      for (let k = 0; k < 7; k++) parts.push({ geo: ball(x + (hash2(k, 1, seed) - 0.5) * 0.5, 0.56, z + (hash2(k, 2, seed) - 0.5) * 0.5, 0.035), color: G });
      parts.push({ geo: cyl(x + 0.05, z - 0.05, 0.06, 0.15, 0, 0.22, 10), color: TONE.bronzeLight });
      return parts;
    }
  }
}

// ---------------------------------------------------------------------------
// The piles of materials waiting on site.

/** The sacred good waiting on site: sacks of grain, hams, cheeses, jars of oil or wine, bales, ingots, armour or horses' halters (n pieces). */
function sacredPile(x: number, z: number, ware: number, n: number): Part[] {
  const parts: Part[] = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / 3);
    const k = i % 3;
    const px = x + (k - 1) * 0.11;
    const py = row * 0.08;
    if (ware === OIL || ware === WINE) {
      parts.push({ geo: cyl(px, z + (row % 2) * 0.05, 0.035, 0.045, py, py + 0.12, 7), color: ware === OIL ? PAL.pithos : '#8a3a4a' });
    } else if (ware === WHEAT) parts.push({ geo: ball(px, py + 0.05, z, 0.05).scale(1, 0.8, 1.2), color: PAL.sack });
    else if (ware === MEAT) parts.push({ geo: ball(px, py + 0.05, z, 0.045).scale(1.3, 0.8, 1), color: '#9b4a35' });
    else if (ware === CHEESE) parts.push({ geo: cyl(px, z, 0.05, 0.05, py, py + 0.05, 8), color: '#ecd27a' });
    else if (ware === FLEECE) parts.push({ geo: lumpy(new THREE.BoxGeometry(0.1, 0.07, 0.12), 0.1, i).translate(px, py + 0.035, z), color: '#f0ead8' });
    else if (ware === ARMOUR) parts.push({ geo: cyl(px, z, 0.045, 0.035, py, py + 0.08, 6), color: TONE.bronze });
    else if (ware === HORSES) parts.push({ geo: box(px, z, 0.04, 0.04, py, py + 0.06), color: '#8a6a45' });
    else parts.push(...ingotPile(px, z, 1));
  }
  return parts;
}

// ---------------------------------------------------------------------------
// The whole, at a point in its building.

/** What a sanctuary looks like now: its stage (0 to 3, 3 finished), how far through it (0 to 1), its piles, whether dimmed. */
export interface Look {
  god: GodId;
  stage: number;
  f: number;
  depth: number;
  /** Pieces of marble, timber, copper and the sacred good on site. */
  piles: readonly number[];
  sacred: number;
  dim: boolean;
}

/** The god's sanctuary at a point in its building (see the notes at the top). */
export function sanctuaryModel(k: Look, seed: number): THREE.BufferGeometry {
  const parts: Part[] = [];
  const { god, stage, f } = k;
  const done = stage >= 3;
  parts.push(...pad(2.48, 2.48, Math.min(PAD_MOST, k.depth), stage >= 1, seed));
  // Marked out: stakes and cords round the temple and the court.
  if (stage === 0 && f === 0) {
    if (THOLOS.has(god)) parts.push(...stakesRound(TH_X, TH_R + 0.3));
    else parts.push(...stakesAt(TX0, -THZ, TX1, THZ));
    parts.push(...stakesAt(-WALL_OUT + 0.05, -WALL_OUT + 0.05, WALL_OUT - 0.05, WALL_OUT - 0.05));
  }
  // The foundations: the platform, and the court's footings.
  parts.push(...(THOLOS.has(god) ? roundPlatform(stage >= 1 ? 1 : f) : platform(stage >= 1 ? 1 : f)));
  const wall = stage >= 2 ? (done ? 1 : Math.min(1, 0.3 + f * 1.4)) : stage === 1 ? 0.25 : f > 0.4 ? 0.25 * Math.min(1, (f - 0.4) / 0.5) : 0;
  parts.push(...court(wall, stage >= 2, seed));
  // The temple: columns rising, then the roof.
  if (stage >= 1) {
    const h = stage >= 2 ? 1 : Math.min(1, Math.round((f / 0.6) * 5) / 5);
    const roof = stage >= 2 ? 1 : f <= 0.6 ? 0 : Math.min(1, (f - 0.6) / 0.4);
    parts.push(...temple(h, roof, god, seed).map((p) => p));
    if (!done && stage === 1 && f > 0) {
      const [shx, shz] = THOLOS.has(god) ? [TH_R + 0.08, TH_R + 0.08] : [(TX1 - TX0) / 2 + 0.04, THZ + 0.04];
      parts.push(...scaffold(shx, shz, FLOOR, roof > 0 ? EAVES : FLOOR + COL_H * h, seed + 1).map((p) => ({ ...p, geo: p.geo.translate((TX0 + TX1) / 2, 0, 0) })));
      parts.push(...crane(0.95, 1.45, Math.PI * 0.75, Math.min(RIDGE + 0.5, FLOOR + COL_H * h + 0.6), TONE.marble));
    }
  }
  // The altar, the statue's plinth and the statue going up from its feet in its own scaffold.
  if (stage >= 2) {
    parts.push(...altar(done && !k.dim));
    parts.push(...plinth());
    const up = done ? 99 : Math.round(f * 10) * 0.12;
    const [sx, sz] = STATUE;
    for (const p of statueOf(god)) if (p.y <= up) parts.push({ geo: p.geo.clone().translate(sx, PLINTH_H, sz), color: p.color });
    if (!done && f > 0) {
      parts.push(...scaffold(0.22, 0.22, 0, PLINTH_H + 1.05, seed + 2).map((p) => ({ ...p, geo: p.geo.translate(sx, 0, sz) })));
      // A casting pit by the gate: the bronze poured on site.
      parts.push({ geo: cyl(1.95, -1.45, 0.15, 0.11, 0, 0.2, 8), color: '#8b5a3c' });
      parts.push({ geo: cyl(1.95, -1.45, 0.07, 0.07, 0.2, 0.22, 8), color: PAL.ember });
    }
  }
  if (done) {
    parts.push(...extra(god, seed));
    parts.push(...garden(god, seed + 9));
    parts.push(...tree(-1.75, -1.85, 'cypress', seed + 5));
    parts.push(...tree(-1.85, 1.95, 'cypress', seed + 6));
    parts.push(...tree(-0.75, -1.95, k.god === 'athena' ? 'olive' : 'cypress', seed + 7));
    const G = godColour(god);
    for (const z of [-GATE - 0.22, GATE + 0.22]) parts.push(...banner(2.18, z, G, k.dim));
  } else {
    // The materials waiting, by the gate and along the sides.
    const [m, t, c, sc] = k.piles;
    parts.push(...marblePile(1.9, 1.95, Math.min(9, m), seed + 3));
    parts.push(...marblePile(1.1, 1.95, Math.max(0, Math.min(9, m - 9)), seed + 4));
    parts.push(...logPile(1.9, -2.0, Math.min(9, t)));
    parts.push(...logPile(1.25, -2.0, Math.max(0, Math.min(9, t - 9))));
    if (c) parts.push(...ingotPile(2.05, 1.3, Math.min(9, c)));
    if (sc) parts.push(...sacredPile(2.0, -1.0, k.sacred, Math.min(9, sc)));
  }
  return mergeParts(parts);
}

/** Stakes and an ochre cord round a rectangle (x0, z0)-(x1, z1). */
function stakesAt(x0: number, z0: number, x1: number, z1: number): Part[] {
  const parts: Part[] = [];
  const corners: Array<[number, number]> = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  const pts: Array<[number, number]> = [];
  for (let k = 0; k < 4; k++) {
    const [ax, az] = corners[k];
    const [bx, bz] = corners[(k + 1) % 4];
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 0.7));
    for (let i = 0; i < n; i++) pts.push([ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n]);
  }
  for (const [x, z] of pts) parts.push({ geo: box(x, z, 0.02, 0.02, 0, 0.22), color: TONE.stake });
  for (let i = 0; i < pts.length; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[(i + 1) % pts.length];
    parts.push({ geo: rodGeo([ax, 0.17, az], [bx, 0.17, bz], 0.007, 0.007, 3), color: TONE.cord });
  }
  return parts;
}

/** Stakes and an ochre cord round a circle (the tholos's) about (x, 0). */
function stakesRound(x: number, r: number): Part[] {
  const parts: Part[] = [];
  const n = 12;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const b = ((k + 1) / n) * Math.PI * 2;
    parts.push({ geo: box(x + Math.cos(a) * r, Math.sin(a) * r, 0.02, 0.02, 0, 0.22), color: TONE.stake });
    parts.push({ geo: rodGeo([x + Math.cos(a) * r, 0.17, Math.sin(a) * r], [x + Math.cos(b) * r, 0.17, Math.sin(b) * r], 0.007, 0.007, 3), color: TONE.cord });
  }
  return parts;
}

// ---------------------------------------------------------------------------
// The view.

type Frame = { x: number; y: number; z: number; yaw: number; depth: number };

interface View {
  sig: string;
  mesh: THREE.Mesh;
  frame: Frame;
}

export class SanctuaryView {
  readonly group = new THREE.Group();
  private readonly mat: THREE.MeshStandardMaterial;
  /** A dimmed sanctuary's: the same, darker and greyer. */
  private readonly dimMat: THREE.MeshStandardMaterial;
  private views = new Map<number, View>();
  private seenTick = -1;
  private seenRev = -1;
  private seenLooks = -1;
  private last: SimState | null = null;
  /** Meshes rebuilt by the last update (for the measuring script). */
  lastRebuilt = 0;

  /** `frameOf`: where a building stands (the monuments' frame: its middle, its floor, its turn, its pad's depth). */
  constructor(private readonly frameOf: (s: SimState, b: Building) => Frame) {
    this.group.name = 'sanctuaries';
    this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.82, metalness: 0, side: THREE.DoubleSide });
    this.dimMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0, side: THREE.DoubleSide, color: new THREE.Color('#8a857c') });
  }

  /** The building whose sanctuary a ray meets first, and how far along it. */
  pick(ray: THREE.Raycaster): { id: number; distance: number } | null {
    let best: { id: number; distance: number } | null = null;
    for (const [id, v] of this.views) {
      const hit = ray.intersectObject(v.mesh, false)[0];
      if (hit && (!best || hit.distance < best.distance)) best = { id, distance: hit.distance };
    }
    return best;
  }

  private static stepOf(x: Site): number {
    if (x.finished || !x.building) return 0;
    const st = stagesOf(x)[x.stage];
    return st ? Math.min(WORK_STEPS, Math.floor((x.work / workOf(st)) * WORK_STEPS)) : 0;
  }

  private look(s: SimState, b: Building): Look | null {
    const x = siteOf(s, b.id);
    const god = (x?.god ?? b.god) as GodId | undefined;
    if (!god) return null;
    const f = this.frameOf(s, b);
    const sacred = GODS[god].sacred;
    const per = sacred === HORSES ? 1 : sacred === ARMOUR ? 2 : 20;
    return {
      god,
      stage: x ? (x.finished ? 3 : x.stage) : 0,
      f: x ? SanctuaryView.stepOf(x) / WORK_STEPS : 0,
      depth: f.depth,
      piles: [piecesFor(held(b, MARBLE), 25, 18), piecesFor(held(b, TIMBER), 20, 18), piecesFor(sacred === COPPER ? Math.min(held(b, COPPER), 120) : held(b, COPPER), 15, 9), sacred === COPPER ? piecesFor(held(b, COPPER) - 120, 15, 9) : piecesFor(held(b, sacred), per, 9)],
      sacred,
      dim: !!x && dimmed(s, x),
    };
  }

  update(s: SimState): void {
    this.lastRebuilt = 0;
    if (s === this.last && s.tick === this.seenTick && s.rev === this.seenRev && s.looks === this.seenLooks) return;
    this.last = s;
    this.seenTick = s.tick;
    this.seenRev = s.rev;
    this.seenLooks = s.looks;
    const seen = new Set<number>();
    for (const b of s.buildings) {
      if (b.kind !== 'sanctuary') continue;
      const k = this.look(s, b);
      if (!k) continue;
      seen.add(b.id);
      const f = this.frameOf(s, b);
      const sig = `${k.god}:${f.yaw.toFixed(2)}:${f.y.toFixed(3)}:${k.stage}:${k.f}:${k.piles.join(',')}:${k.dim ? 1 : 0}`;
      const was = this.views.get(b.id);
      if (was && was.sig === sig) continue;
      const geo = sanctuaryModel(k, 5400 + (b.id % 97) * 7);
      let v = was;
      if (!v) {
        const mesh = new THREE.Mesh(geo, k.dim ? this.dimMat : this.mat);
        mesh.name = `sanctuary-${k.god}`;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.group.add(mesh);
        v = { sig, mesh, frame: f };
        this.views.set(b.id, v);
      } else {
        v.mesh.geometry.dispose();
        v.mesh.geometry = geo;
        v.mesh.material = k.dim ? this.dimMat : this.mat;
        v.sig = sig;
      }
      v.frame = f;
      v.mesh.position.set(f.x, f.y, f.z);
      v.mesh.rotation.set(0, f.yaw, 0);
      this.lastRebuilt++;
    }
    for (const [id, v] of this.views) {
      if (seen.has(id)) continue;
      this.group.remove(v.mesh);
      v.mesh.geometry.dispose();
      this.views.delete(id);
    }
  }

  /** How high someone stands at a world point on a sanctuary (its builders, its priestesses at the altar), or null if it isn't on one drawn. */
  standAt(s: SimState, b: Building, wx: number, wz: number): number | null {
    if (b.kind !== 'sanctuary') return null;
    const v = this.views.get(b.id);
    if (!v) return null;
    const f = v.frame;
    const dx = wx - f.x;
    const dz = wz - f.z;
    const c = Math.cos(f.yaw);
    const sn = Math.sin(f.yaw);
    const lx = dx * c - dz * sn;
    const lz = dx * sn + dz * c;
    const half = footSide(b) / 2;
    if (Math.abs(lx) > half || Math.abs(lz) > half) return null;
    const x = siteOf(s, b.id);
    const onTemple = lx >= TX0 - 0.2 && lx <= TX1 + 0.2 && Math.abs(lz) <= THZ + 0.2;
    const laid = x && (x.finished || x.stage >= 1);
    return f.y + (onTemple && laid ? FLOOR : 0);
  }
}

/** The build panel's picture: a finished sanctuary (to Zeus, the first of the twelve). */
export function sanctuaryPicture(tool: string): PicturePart[] | null {
  if (tool !== 'sanctuary') return null;
  return [{ geo: sanctuaryModel({ god: 'zeus', stage: 3, f: 0, depth: 0, piles: [0, 0, 0, 0], sacred: 0, dim: false }, 5401), x: 0, z: 0, yaw: 0, s: [1, 1, 1] }];
}
