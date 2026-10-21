import * as THREE from 'three';
import { hash2 } from '../map/noise';
import { cyl, prism } from './homes';
import { PAL } from './palette';
import { lumpy, merge, type Part } from './trees';

/**
 * Slice 32's models: the marble quarry and the loggers' camp (drawn with the
 * other workplaces by Works), and their stock pieces (blocks of marble and
 * piles of logs, at the quarry, the camp and the storehouse). Local frame as
 * Works': the footprint's centre at the origin, the front facing +x. The
 * quarry's face is at its back (-x), turned to the uphill side (see
 * quarryYaw in materials.ts), and it stands on a terrace of its own spoil.
 */

/** A box from (x0, z0) to (x1, z1), standing from y0 to y1. */
const slab = (x0: number, z0: number, x1: number, z1: number, y0: number, y1: number): THREE.BufferGeometry =>
  new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);

/** The marble's tones: fresh-cut faces, the weathered crown, veins, the stone dust and spoil. */
export const MARBLE = {
  fresh: '#efebe2',
  cut: '#e6e0d3',
  shade: '#d8d1c2',
  weathered: '#b8b1a2',
  vein: '#a7a39a',
  dust: '#ddd6c6',
  spoil: '#cbc3b2',
  hole: '#4a463f',
};

/** The camp's tones: a fresh-cut log end, chips and sawdust, the dark of the sawpit. */
const WOOD = { end: '#d6b27a', chips: '#d9bf8e', pit: '#3e3326', bark: '#5a4630' };

// ---------------------------------------------------------------------------
// The marble quarry (3×3: -1.5..1.5).

/**
 * The marble quarry: a stepped face of pale rock cut into the hill at the
 * back, two benches with the drill holes along their edges and the channels
 * of the picks on them, a block half cut out of the face; the side walls
 * stepping down to the front; shear-legs over the floor with a block slung
 * on its rope and a windlass at its foot; a timber shed for the tools in the
 * front corner, and a stone trough. The cut blocks wait on the floor by the
 * track (drawn with its store), where the sledges load.
 */
export function quarryModel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  // A terrace of its own spoil, down into the slope (levelled to the top of its ground: HIGH_FOOT).
  parts.push({ geo: slab(-1.49, -1.49, 1.49, 1.49, -1.4, 0.0), color: MARBLE.spoil });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const r = 1.46;
    const x = Math.max(-1.46, Math.min(1.46, Math.cos(a) * r * 1.3));
    const z = Math.max(-1.46, Math.min(1.46, Math.sin(a) * r * 1.3));
    parts.push({ geo: lumpy(new THREE.DodecahedronGeometry(0.08 + 0.04 * hash2(i, 1, 3201), 0), 0.35, 3202 + i).scale(1.2, 0.7, 1.2).translate(x, -0.05, z), color: i % 3 ? MARBLE.spoil : MARBLE.shade });
  }
  // The floor: stone dust, a worn track down the middle to the front.
  parts.push({ geo: slab(-1.48, -1.48, 1.48, 1.48, 0.0, 0.03), color: MARBLE.dust });
  parts.push({ geo: slab(-0.4, -0.26, 1.49, 0.26, 0.03, 0.036), color: MARBLE.spoil });
  // The face: two benches of fresh-cut marble, the weathered crown of the hill above them.
  parts.push({ geo: slab(-1.49, -1.49, -0.95, 1.49, 0.0, 0.56), color: MARBLE.fresh });
  parts.push({ geo: slab(-1.49, -1.49, -1.22, 1.49, 0.56, 0.98), color: MARBLE.cut });
  for (let i = 0; i < 9; i++) {
    const z = -1.35 + i * 0.34;
    const h = 0.12 + 0.1 * hash2(i, 2, 3201);
    parts.push({ geo: lumpy(new THREE.DodecahedronGeometry(0.2, 0), 0.3, 3220 + i).scale(1.1, h / 0.2, 1.0).translate(-1.36, 0.98 + h * 0.4, z), color: i % 2 ? MARBLE.weathered : PAL.rockGrey });
  }
  // The side walls, stepping down towards the front.
  for (const side of [-1, 1]) {
    const z0 = side < 0 ? -1.49 : 1.25;
    const z1 = side < 0 ? -1.25 : 1.49;
    parts.push({ geo: slab(-0.95, z0, -0.25, z1, 0.0, 0.44), color: MARBLE.cut });
    parts.push({ geo: slab(-0.25, side < 0 ? -1.49 : 1.32, 0.45, side < 0 ? -1.32 : 1.49, 0.0, 0.22), color: MARBLE.shade });
    parts.push({ geo: lumpy(new THREE.DodecahedronGeometry(0.14, 0), 0.3, 3240 + side).scale(1.4, 0.6, 1).translate(-0.6, 0.48, side * 1.38), color: MARBLE.weathered });
  }
  // Grey veins running across the faces.
  for (let i = 0; i < 7; i++) {
    const z = -1.2 + i * 0.4 + 0.12 * hash2(i, 3, 3201);
    const y = 0.12 + 0.75 * hash2(i, 4, 3201);
    const x = y > 0.56 ? -1.219 : -0.949;
    parts.push({ geo: new THREE.BoxGeometry(0.004, 0.012, 0.36).rotateX((hash2(i, 5, 3201) - 0.5) * 1.1).translate(x + 0.003, y, z), color: MARBLE.vein });
  }
  // The pick channels on the lower bench, in courses, and the drill holes along both benches' edges.
  for (let row = 0; row < 2; row++) {
    for (let k = 0; k < 6; k++) {
      const z = -1.25 + k * 0.5 + (row % 2) * 0.22;
      parts.push({ geo: new THREE.BoxGeometry(0.004, 0.008, 0.22).translate(-0.947, 0.18 + row * 0.18, z), color: MARBLE.shade });
    }
  }
  for (let k = 0; k < 12; k++) {
    const z = -1.38 + k * 0.25;
    parts.push({ geo: cyl(0.011, 0.011, 0.012, 5).translate(-0.99, 0.562, z), color: MARBLE.hole });
    if (k % 2 === 0) parts.push({ geo: cyl(0.011, 0.011, 0.012, 5).translate(-1.26, 0.982, z + 0.1), color: MARBLE.hole });
  }
  // A block half cut out of the face: its channel dark round it, wedges in its top.
  parts.push({ geo: slab(-1.02, -0.36, -0.86, 0.06, 0.03, 0.3), color: MARBLE.fresh });
  parts.push({ geo: slab(-0.94, -0.4, -0.93, 0.1, 0.03, 0.34), color: MARBLE.hole });
  for (const z of [-0.3, -0.15, 0.0]) parts.push({ geo: slab(-0.97, z - 0.012, -0.93, z + 0.012, 0.3, 0.34), color: PAL.woodDark });
  // Shear-legs over the floor: two poles to an apex, a back stay to the bench, a pulley, the rope and a block slung on it.
  const ax = -0.55;
  const ay = 1.25;
  for (const z of [-0.5, 0.5]) {
    const bx = -0.15;
    const len = Math.hypot(ax - bx, ay, z);
    const g = cyl(0.022, 0.028, len, 5).translate(0, len / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(ax - bx, ay, -z).normalize()));
    parts.push({ geo: g.translate(bx, 0.03, z), color: PAL.timber });
  }
  {
    const bx = -1.32;
    const by = 0.98;
    const len = Math.hypot(ax - bx, ay - by);
    const g = cyl(0.018, 0.022, len, 5).translate(0, len / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(ax - bx, ay - by, 0).normalize()));
    parts.push({ geo: g.translate(bx, by, 0), color: PAL.timberDark });
  }
  parts.push({ geo: cyl(0.04, 0.04, 0.05, 8).rotateX(Math.PI / 2).translate(ax, ay - 0.05, 0), color: PAL.woodDark });
  parts.push({ geo: cyl(0.005, 0.005, ay - 0.42, 3).translate(ax, (ay + 0.42) / 2, 0), color: PAL.rope });
  parts.push({ geo: slab(ax - 0.12, -0.08, ax + 0.12, 0.08, 0.26, 0.4), color: MARBLE.fresh });
  parts.push({ geo: new THREE.BoxGeometry(0.008, 0.008, 0.18).translate(ax, 0.405, 0), color: PAL.rope });
  // The windlass at their foot, the rope running to it.
  parts.push({ geo: cyl(0.035, 0.035, 0.34, 6).rotateX(Math.PI / 2).translate(0.05, 0.22, 0), color: PAL.timber });
  for (const z of [-0.19, 0.19]) parts.push({ geo: slab(0.02, z - 0.02, 0.08, z + 0.02, 0.03, 0.26), color: PAL.timberDark });
  parts.push({ geo: slab(0.04, 0.2, 0.06, 0.23, 0.22, 0.38), color: PAL.woodDark });
  // The tool shed in the front corner: four posts, a plank roof sloping back, wedges and mallets on its bench.
  const sx0 = 0.78;
  const sx1 = 1.42;
  const sz0 = 0.78;
  const sz1 = 1.42;
  for (const [x, z, h] of [[sx0, sz0, 0.5], [sx1, sz0, 0.6], [sx0, sz1, 0.5], [sx1, sz1, 0.6]]) parts.push({ geo: cyl(0.025, 0.03, h, 5).translate(x, 0.03 + h / 2, z), color: PAL.timber });
  parts.push({ geo: new THREE.BoxGeometry(sx1 - sx0 + 0.18, 0.04, sz1 - sz0 + 0.18).rotateZ(0.16).translate((sx0 + sx1) / 2, 0.6, (sz0 + sz1) / 2), color: PAL.woodDark });
  parts.push({ geo: slab(sx0 + 0.05, sz1 - 0.2, sx1 - 0.05, sz1 - 0.04, 0.24, 0.27), color: PAL.wood });
  for (let k = 0; k < 4; k++) parts.push({ geo: slab(sx0 + 0.12 + k * 0.12, sz1 - 0.16, sx0 + 0.16 + k * 0.12, sz1 - 0.1, 0.27, 0.31), color: k % 2 ? PAL.charDark : PAL.woodDark });
  parts.push({ geo: cyl(0.012, 0.012, 0.36, 4).rotateZ(0.35).translate(sx1 - 0.02, 0.2, sz0 + 0.2), color: PAL.wood });
  // The stone trough, with water for the picks and the oxen.
  parts.push({ geo: slab(0.88, -1.38, 1.4, -1.1, 0.03, 0.19), color: MARBLE.shade });
  parts.push({ geo: slab(0.9, -1.36, 1.38, -1.12, 0.19, 0.192), color: PAL.shallow });
  // Chips of marble about the floor.
  for (let i = 0; i < 12; i++) {
    const x = -0.8 + 1.5 * hash2(i, 6, 3201);
    const z = -1.1 + 2.2 * hash2(i, 7, 3201);
    if (Math.abs(z) < 0.3) continue;
    parts.push({ geo: lumpy(new THREE.DodecahedronGeometry(0.025, 0), 0.4, 3260 + i).translate(x, 0.04, z), color: i % 2 ? MARBLE.fresh : MARBLE.shade });
  }
  return merge(parts);
}

/** A squared block of marble, about a quarter of a tile long, fresh from the face. */
export function marbleBlock(): THREE.BufferGeometry {
  return merge([
    { geo: lumpy(new THREE.BoxGeometry(0.24, 0.14, 0.16, 1, 1, 1), 0.04, 3270).translate(0, 0.07, 0), color: MARBLE.fresh },
    { geo: new THREE.BoxGeometry(0.004, 0.06, 0.12).rotateX(0.3).translate(0.121, 0.07, 0), color: MARBLE.vein },
  ]);
}

// ---------------------------------------------------------------------------
// The loggers' camp (2×2: -1..1).

/** A wall of round logs from (x0, z0) to (x1, z1), h high. */
function logRun(x0: number, z0: number, x1: number, z1: number, h: number, seed: number): Part[] {
  const parts: Part[] = [];
  const len = Math.hypot(x1 - x0, z1 - z0) + 0.1;
  const yaw = -Math.atan2(z1 - z0, x1 - x0);
  const r = 0.045;
  const n = Math.round(h / (r * 1.8));
  for (let i = 0; i < n; i++) {
    parts.push({ geo: cyl(r, r, len, 6).rotateZ(Math.PI / 2).rotateY(yaw).translate((x0 + x1) / 2, r + i * r * 1.8, (z0 + z1) / 2), color: (i + seed) % 3 === 0 ? PAL.logDark : PAL.log });
  }
  return parts;
}

/**
 * The loggers' camp: a log cabin under a plank roof at the back, a sawpit with
 * a log across it on trestles and the long saw standing in its cut, a
 * chopping block with an axe bitten into it and the chips about it, and a
 * rack of axes by the cabin. The logs wait in piles along its side (drawn
 * with its store), where the carts load.
 */
export function campModel(): THREE.BufferGeometry {
  const parts: Part[] = [];
  // Its ground, trodden, with a little footing down into the slope.
  parts.push({ geo: slab(-0.99, -0.99, 0.99, 0.99, -0.5, 0.0), color: PAL.stone });
  parts.push({ geo: slab(-0.98, -0.98, 0.98, 0.98, 0.0, 0.025), color: PAL.earthWorn });
  // The cabin.
  const x0 = -0.94;
  const x1 = -0.22;
  const z0 = -0.94;
  const z1 = -0.12;
  parts.push(...logRun(x0, z0, x1, z0, 0.36, 0), ...logRun(x0, z1, x1, z1, 0.36, 1), ...logRun(x0, z0, x0, z1, 0.36, 2), ...logRun(x1, z0, x1, -0.62, 0.36, 1), ...logRun(x1, -0.38, x1, z1, 0.36, 2));
  parts.push({ geo: slab(x1 - 0.02, -0.6, x1 + 0.01, -0.4, 0.0, 0.3), color: PAL.door });
  parts.push({ geo: prism(z1 - z0 + 0.22, (x1 - x0) / 2 + 0.14, 0.3).rotateY(Math.PI / 2).translate((x0 + x1) / 2, 0.36, (z0 + z1) / 2), color: PAL.timberDark });
  parts.push({ geo: cyl(0.025, 0.025, z1 - z0 + 0.24, 5).rotateX(Math.PI / 2).translate((x0 + x1) / 2, 0.66, (z0 + z1) / 2), color: PAL.logDark });
  // A rack of axes against the cabin's front.
  for (const z of [-0.08, 0.32]) parts.push({ geo: cyl(0.014, 0.016, 0.32, 4).translate(-0.12, 0.16, z), color: PAL.woodDark });
  parts.push({ geo: cyl(0.012, 0.012, 0.42, 4).rotateX(Math.PI / 2).translate(-0.12, 0.27, 0.12), color: PAL.wood });
  for (let k = 0; k < 3; k++) {
    const z = 0.0 + k * 0.11;
    parts.push({ geo: cyl(0.008, 0.008, 0.3, 3).rotateZ(-0.2).translate(-0.09, 0.15, z), color: PAL.wood });
    parts.push({ geo: slab(-0.1, z - 0.005, -0.03, z + 0.005, 0.02, 0.07), color: PAL.charDark });
  }
  // The sawpit: dark below, a log across it on trestles, the long saw standing in its cut.
  const px0 = 0.08;
  const px1 = 0.82;
  const pz0 = 0.3;
  const pz1 = 0.6;
  parts.push({ geo: slab(px0, pz0, px1, pz1, -0.2, 0.026), color: WOOD.pit });
  for (const x of [px0 + 0.08, px1 - 0.08]) {
    parts.push({ geo: slab(x - 0.025, pz0 - 0.06, x + 0.025, pz1 + 0.06, 0.13, 0.16), color: PAL.woodDark });
    for (const z of [pz0 - 0.05, pz1 + 0.05]) parts.push({ geo: cyl(0.014, 0.014, 0.14, 4).translate(x, 0.07, z), color: PAL.woodDark });
  }
  parts.push({ geo: cyl(0.07, 0.075, 0.86, 7).rotateZ(Math.PI / 2).translate((px0 + px1) / 2, 0.23, (pz0 + pz1) / 2), color: PAL.log });
  for (const x of [px0 - 0.02, px1 + 0.02]) parts.push({ geo: cyl(0.07, 0.07, 0.006, 7).rotateZ(Math.PI / 2).translate(x, 0.23, (pz0 + pz1) / 2), color: WOOD.end });
  parts.push({ geo: slab(0.5, 0.445, 0.505, 0.455, 0.0, 0.5), color: PAL.charDark });
  for (const y of [0.04, 0.5]) parts.push({ geo: cyl(0.01, 0.01, 0.14, 4).rotateX(Math.PI / 2).translate(0.502, y, 0.45), color: PAL.wood });
  // The chopping block, an axe bitten into it, chips and sawdust about.
  const [bx, bz] = [0.5, -0.5];
  parts.push({ geo: cyl(0.1, 0.11, 0.16, 7).translate(bx, 0.08, bz), color: PAL.log });
  parts.push({ geo: cyl(0.1, 0.1, 0.006, 7).translate(bx, 0.163, bz), color: WOOD.end });
  parts.push({ geo: cyl(0.009, 0.009, 0.28, 3).rotateZ(0.9).translate(bx + 0.08, 0.24, bz + 0.02), color: PAL.wood });
  parts.push({ geo: slab(bx - 0.04, bz - 0.005, bx + 0.03, bz + 0.035, 0.15, 0.19), color: PAL.charDark });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + hash2(i, 1, 3301);
    const r = 0.16 + 0.18 * hash2(i, 2, 3301);
    parts.push({ geo: new THREE.BoxGeometry(0.04, 0.008, 0.02).rotateY(a * 2).translate(bx + Math.cos(a) * r, 0.03, bz + Math.sin(a) * r), color: WOOD.chips });
  }
  return merge(parts);
}

/** A pile of six logs, three, two and one, about half a tile long, their cut ends pale. */
export function logPile(): THREE.BufferGeometry {
  const parts: Part[] = [];
  const r = 0.045;
  for (let row = 0; row < 3; row++) {
    for (let k = 0; k < 3 - row; k++) {
      const z = (k - (2 - row) / 2) * r * 2.05;
      const y = r + row * r * 1.75;
      const len = 0.5 + 0.04 * hash2(row, k, 3310);
      parts.push({ geo: cyl(r, r * 1.05, len, 6).rotateZ(Math.PI / 2).translate(0, y, z), color: (row + k) % 2 ? PAL.log : PAL.logDark });
      for (const x of [-len / 2 - 0.002, len / 2 + 0.002]) parts.push({ geo: cyl(r * 0.9, r * 0.9, 0.004, 6).rotateZ(Math.PI / 2).translate(x, y, z), color: WOOD.end });
    }
  }
  return merge(parts);
}
