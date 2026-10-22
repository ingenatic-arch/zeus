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

/**
 * A footing battered out as it goes down, under a footprint of half-sizes
 * (hx, hz), from y = 0 to y = -depth, stepping out `out` at its foot: in
 * courses of alternating tones, with lumps of rubble along its faces, so a
 * building on a slope stands on worked stone (or a bank of spoil) rather
 * than a blank wall. (Slice 32: the quarry's terrace and the caravan yard.)
 */
export function batteredFooting(hx: number, hz: number, depth: number, out: number, tones: readonly string[], course: number, seed: number, lumps: readonly string[] = []): Part[] {
  const parts: Part[] = [];
  const n = Math.max(1, Math.round(depth / course));
  for (let i = 0; i < n; i++) {
    const f1 = i / n;
    const f0 = (i + 1) / n;
    parts.push({ geo: frustum(hx + out * f1, hz + out * f1, hx + out * f0, hz + out * f0, -depth * f0, -depth * f1), color: tones[i % tones.length] });
  }
  if (lumps.length) {
    const per = Math.max(2, Math.round((hx + hz) * 2));
    for (let side = 0; side < 4; side++) {
      for (let k = 0; k < per; k++) {
        const along = -1 + (2 * (k + 0.5 + (hash2(k, side, seed) - 0.5) * 0.6)) / per;
        const f = 0.2 + 0.7 * hash2(k, side, seed + 1);
        const ex = hx + out * f;
        const ez = hz + out * f;
        const [x, z] = side === 0 ? [along * ex, -ez] : side === 1 ? [ex, along * ez] : side === 2 ? [along * ex, ez] : [-ex, along * ez];
        const r = 0.05 + 0.05 * hash2(k, side, seed + 2);
        parts.push({ geo: lumpy(new THREE.DodecahedronGeometry(r, 0), 0.35, seed + side * 40 + k).scale(1.3, 0.7, 1.3).translate(x, -depth * f, z), color: lumps[(k + side) % lumps.length] });
      }
    }
  }
  return parts;
}

/** A box whose top (y1) is (thx, thz) half-sized and its bottom (y0) (bhx, bhz). */
function frustum(thx: number, thz: number, bhx: number, bhz: number, y0: number, y1: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(2, 1, 2);
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const top = pos.getY(i) > 0;
    pos.setXYZ(i, (pos.getX(i) / 2) * 2 * (top ? thx : bhx), top ? y1 : y0, (pos.getZ(i) / 2) * 2 * (top ? thz : bhz));
  }
  g.computeVertexNormals();
  return g;
}

/** The marble's tones: fresh-cut faces, the weathered crown, veins, the stone dust and spoil. */
export const MARBLE = {
  fresh: '#efebe2',
  cut: '#e6e0d3',
  shade: '#d8d1c2',
  weathered: '#b8b1a2',
  vein: '#a7a39a',
  dust: '#d3c9b4',
  spoil: '#b9ae98',
  spoilLight: '#c9bfab',
  hole: '#4a463f',
};

/** The camp's tones: a fresh-cut log end, chips and sawdust, the dark of the sawpit. */
const WOOD = { end: '#d6b27a', chips: '#d9bf8e', pit: '#3e3326', bark: '#5a4630' };

// ---------------------------------------------------------------------------
// The marble quarry (3×3: -1.5..1.5).

/** Where the quarry's front floor gives way to the bench at its face (local x): the riser between them. */
export const QUARRY_STEP = -0.2;

/**
 * The quarry's two levels on its ground (world heights): its front floor and
 * the bench at its face, each at the top of the ground under it (so the
 * ground never shows through either), the bench never below the floor. The
 * pit steps up the hillside: a riser of fresh-cut marble between them, the
 * skirt heaped from each down to the ground round it. `yaw` turns it (see
 * quarryYaw).
 */
export function quarryLevels(heightAt: (x: number, z: number) => number, b: { x: number; z: number }, yaw: number): { front: number; back: number } {
  const cx = b.x + 1.5;
  const cz = b.z + 1.5;
  const c = Math.cos(yaw);
  const sn = Math.sin(yaw);
  const top = (x0: number, x1: number): number => {
    let h = -Infinity;
    for (const lx of [x0, (x0 + x1) / 2, x1]) for (const lz of [-1.45, -0.7, 0, 0.7, 1.45]) h = Math.max(h, heightAt(cx + lx * c + lz * sn, cz - lx * sn + lz * c));
    return h;
  };
  const front = top(QUARRY_STEP, 1.45) + 0.01;
  return { front, back: Math.max(front, top(-1.45, QUARRY_STEP) + 0.01) };
}

/**
 * How high the quarry's top stands above its front floor at a point of its
 * edge (local), with its bench `rise` above the floor: the face's benches
 * and the side walls at the back, the low steps and the floor at the front.
 * Where its skirt starts.
 */
export function quarryEdge(lx: number, rise: number): number {
  if (lx >= 0.45) return 0;
  if (lx >= QUARRY_STEP) return 0.22;
  if (lx >= -0.95) return rise + 0.44;
  if (lx >= -1.22) return rise + 0.56;
  return rise + 0.98;
}

/**
 * The marble quarry's front, on its floor: stone dust and a worn track to
 * the front, the low side steps, the windlass, a timber shed for the tools in
 * the front corner, and a stone trough. The cut blocks wait on the floor by
 * the track (drawn with its store), where the sledges load.
 */
export function quarryFront(): THREE.BufferGeometry {
  const parts: Part[] = [];
  const x0 = QUARRY_STEP;
  parts.push(...batteredFooting(0.835, 1.49, 0.3, 0.05, [MARBLE.spoil], 0.3, 3203).map((q) => ({ ...q, geo: q.geo.translate((x0 + 1.49) / 2, 0, 0) })));
  parts.push({ geo: slab(x0, -1.48, 1.48, 1.48, 0.0, 0.03), color: MARBLE.dust });
  parts.push({ geo: slab(x0, -0.26, 1.49, 0.26, 0.03, 0.036), color: MARBLE.spoil });
  for (const side of [-1, 1]) parts.push({ geo: slab(x0, side < 0 ? -1.49 : 1.32, 0.45, side < 0 ? -1.32 : 1.49, 0.0, 0.22), color: MARBLE.shade });
  // The windlass, its rope run to the shear-legs on the bench above.
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
  for (let i = 0; i < 8; i++) {
    const x = x0 + 0.1 + 0.8 * hash2(i, 6, 3201);
    const z = -1.1 + 2.2 * hash2(i, 7, 3201);
    if (Math.abs(z) < 0.3) continue;
    parts.push({ geo: lumpy(new THREE.DodecahedronGeometry(0.025, 0), 0.4, 3260 + i).translate(x, 0.04, z), color: i % 2 ? MARBLE.fresh : MARBLE.shade });
  }
  return merge(parts);
}

/**
 * The marble quarry's back, on the bench at its face (drawn as high above the
 * front as the ground makes it): the stepped face of pale rock cut into the
 * hill, two benches with the drill holes along their edges and the channels
 * of the picks on them, a block half cut out of the face; the weathered crown
 * of the hill above; the side walls; shear-legs over the bench with a block
 * slung on its rope.
 */
export function quarryBack(): THREE.BufferGeometry {
  const parts: Part[] = [];
  const x1 = QUARRY_STEP;
  parts.push(...batteredFooting(0.645, 1.49, 0.3, 0.05, [MARBLE.spoil], 0.3, 3204).map((q) => ({ ...q, geo: q.geo.translate((-1.49 + x1) / 2, 0, 0) })));
  parts.push({ geo: slab(-1.48, -1.48, x1, 1.48, 0.0, 0.03), color: MARBLE.dust });
  // The face: two benches of fresh-cut marble, the weathered crown of the hill above them.
  parts.push({ geo: slab(-1.49, -1.49, -0.95, 1.49, 0.0, 0.56), color: MARBLE.fresh });
  parts.push({ geo: slab(-1.49, -1.49, -1.22, 1.49, 0.56, 0.98), color: MARBLE.cut });
  for (let i = 0; i < 9; i++) {
    const z = -1.35 + i * 0.34;
    const h = 0.12 + 0.1 * hash2(i, 2, 3201);
    parts.push({ geo: lumpy(new THREE.DodecahedronGeometry(0.2, 0), 0.3, 3220 + i).scale(1.1, h / 0.2, 1.0).translate(-1.36, 0.98 + h * 0.4, z), color: i % 2 ? MARBLE.weathered : PAL.rockGrey });
  }
  // The side walls.
  for (const side of [-1, 1]) {
    const z0 = side < 0 ? -1.49 : 1.25;
    const z1 = side < 0 ? -1.25 : 1.49;
    parts.push({ geo: slab(-0.95, z0, x1, z1, 0.0, 0.44), color: MARBLE.cut });
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
  // Shear-legs over the bench: two poles to an apex, a back stay to the face's top, a pulley, the rope and a block slung on it.
  const ax = -0.6;
  const ay = 1.2;
  for (const z of [-0.5, 0.5]) {
    const bx = -0.3;
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
  // Chips of marble about the bench.
  for (let i = 0; i < 6; i++) {
    const x = -0.9 + 0.6 * hash2(i, 8, 3201);
    const z = -1.1 + 2.2 * hash2(i, 9, 3201);
    parts.push({ geo: lumpy(new THREE.DodecahedronGeometry(0.025, 0), 0.4, 3280 + i).translate(x, 0.04, z), color: i % 2 ? MARBLE.fresh : MARBLE.shade });
  }
  return merge(parts);
}

/** The riser between the quarry's floor and its bench, `rise` high: fresh-cut marble, its edge chipped. */
export function quarryRiser(rise: number): THREE.BufferGeometry {
  if (rise < 0.02) return new THREE.BufferGeometry();
  const x = QUARRY_STEP;
  return merge([
    { geo: slab(x - 0.02, -1.49, x + 0.01, 1.49, 0.0, rise + 0.03), color: MARBLE.cut },
    ...[-1.0, -0.35, 0.4, 1.05].map((z, i) => ({ geo: new THREE.BoxGeometry(0.004, 0.008, 0.3).translate(x + 0.012, Math.min(rise, 0.1 + i * 0.13), z), color: MARBLE.shade })),
  ]);
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

// ---------------------------------------------------------------------------
// A skirt down to the ground (slice 32).

/**
 * A heap down the slope round a footprint (half-size `half`), fitted to the
 * ground under one building: from its edge, at its floor (y = 0), out and
 * down to where the ground is, bulging a little, in two bands of tone with
 * lumps of rubble on it. `ground(lx, lz)` is the ground's height under a
 * point of the building's frame, from its floor (negative below it); where
 * the ground is up at the floor the skirt is nothing. Along a side with a
 * road beside it (`road(side)`: 0 the -z side, 1 +x, 2 +z, 3 -x) it stays
 * steep, so the road isn't buried. `level(lx, lz)` is how high the
 * building's top edge stands there, where the skirt starts (its floor, 0,
 * unless given).
 */
export function skirt(ground: (lx: number, lz: number) => number, half: number, road: (side: number) => boolean, tones: readonly [string, string], lumps: readonly string[], seed: number, level: (lx: number, lz: number) => number = () => 0): THREE.BufferGeometry {
  const S = 6;
  const normals: Array<[number, number]> = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const ring: Array<{ ix: number; iz: number; iy: number; nx: number; nz: number; steep: boolean }> = [];
  for (let k = 0; k < 4; k++) {
    const [nx, nz] = normals[k];
    const [tx, tz] = [-nz, nx];
    for (let j = 0; j < S; j++) {
      const u = -half + (2 * half * j) / S;
      const ix = nx * half + tx * u;
      const iz = nz * half + tz * u;
      let [mx, mz] = [nx, nz];
      if (j === 0) {
        const [px, pz] = normals[(k + 3) % 4];
        const l = Math.hypot(nx + px, nz + pz);
        mx = (nx + px) / l;
        mz = (nz + pz) / l;
      }
      ring.push({ ix, iz, iy: level(ix, iz), nx: mx, nz: mz, steep: road(k) || (j === 0 && road((k + 3) % 4)) });
    }
  }
  const outer = ring.map((r, i) => {
    let out = 0.25;
    let y = ground(r.ix + r.nx * out, r.iz + r.nz * out);
    for (let it = 0; it < 2; it++) {
      const d = Math.max(0, r.iy - y);
      out = r.steep ? 0.08 : Math.min(1.4, 0.2 + 0.8 * d);
      y = ground(r.ix + r.nx * out, r.iz + r.nz * out);
    }
    if (y > r.iy - 0.04) return null;
    const j = (hash2(i, 1, seed) - 0.5) * 0.12;
    return { x: r.ix + r.nx * (out + j), y: y - 0.06, z: r.iz + r.nz * (out + j), d: r.iy - y };
  });
  const upper: number[] = [];
  const lower: number[] = [];
  const parts: Part[] = [];
  const mid = (i: number): [number, number, number] | null => {
    const o = outer[i];
    if (!o) return null;
    const r = ring[i];
    const f = 0.42;
    const bulge = r.steep ? 0 : 0.08 * Math.min(1, o.d) + (hash2(i, 2, seed) - 0.5) * 0.05;
    return [r.ix + (o.x - r.ix) * f, r.iy + (o.y - r.iy) * f + bulge, r.iz + (o.z - r.iz) * f];
  };
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const a = i;
    const b = (i + 1) % n;
    const oa = outer[a];
    const ob = outer[b];
    if (!oa && !ob) continue;
    const ra = ring[a];
    const rb = ring[b];
    // A side's end where the ground meets the floor: run its outer edge in to the edge (a wedge).
    const pa: [number, number, number] = [ra.ix, ra.iy - 0.01, ra.iz];
    const pb: [number, number, number] = [rb.ix, rb.iy - 0.01, rb.iz];
    const ma = mid(a) ?? pa;
    const mb = mid(b) ?? pb;
    const qa: [number, number, number] = oa ? [oa.x, oa.y, oa.z] : pa;
    const qb: [number, number, number] = ob ? [ob.x, ob.y, ob.z] : pb;
    upper.push(...pa, ...mb, ...ma, ...pa, ...pb, ...mb);
    lower.push(...ma, ...qb, ...qa, ...ma, ...mb, ...qb);
    if (oa && oa.d > 0.18 && i % 2 === 0) {
      const r = 0.05 + 0.07 * hash2(i, 3, seed) * Math.min(1, oa.d);
      parts.push({ geo: lumpy(new THREE.DodecahedronGeometry(r, 0), 0.35, seed + 10 + i).scale(1.3, 0.75, 1.3).translate(ma[0], ma[1] + r * 0.3, ma[2]), color: lumps[i % lumps.length] });
    }
  }
  const tri = (pos: number[]): THREE.BufferGeometry => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  };
  if (upper.length) parts.push({ geo: tri(upper), color: tones[0] }, { geo: tri(lower), color: tones[1] });
  if (!parts.length) return new THREE.BufferGeometry();
  return merge(parts);
}
