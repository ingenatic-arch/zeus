import * as THREE from 'three';
import type { CoastMap } from '../map/bake';
import { hash2 } from '../map/noise';
import { PLOT_SIZE } from '../sim/build';
import { sideOf } from '../sim/buildings';
import { TILE_ROAD, type Building, type SimState } from '../sim/state';
import { ChunkedInstances } from './chunks';
import { fineA, fineB, SHRINE_FIRE, shrineModel, taxOfficeModel, townhouseA, townhouseB } from './grand';
import { PAL } from './palette';
import { lumpy, merge, type Part } from './trees';

/** Homes are drawn in chunks of this many units. */
export const HOME_CHUNK = 32;

// ---------------------------------------------------------------------------
// Models, built from simple shapes. Local frame: the plot's centre at the
// origin, the footprint spans -1..1, and the doorway faces +x.

/** A ridge tent: a triangular prism along x, open at neither end. */
export function prism(len: number, halfW: number, h: number): THREE.BufferGeometry {
  const a = -len / 2;
  const b = len / 2;
  const p = [
    // Ends.
    [a, 0, -halfW], [a, 0, halfW], [a, h, 0],
    [b, 0, halfW], [b, 0, -halfW], [b, h, 0],
    // Sides.
    [a, 0, halfW], [b, 0, halfW], [b, h, 0],
    [a, 0, halfW], [b, h, 0], [a, h, 0],
    [b, 0, -halfW], [a, 0, -halfW], [a, h, 0],
    [b, 0, -halfW], [a, h, 0], [b, h, 0],
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p.flat(), 3));
  return g;
}

/** A flat triangle facing +x (a doorway on a tent's end). */
function doorway(w: number, h: number, x: number): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([x, 0, w / 2, x, 0, -w / 2, x, h, 0], 3));
  return g;
}

export const cyl = (r0: number, r1: number, h: number, seg: number): THREE.CylinderGeometry => new THREE.CylinderGeometry(r0, r1, h, seg);

function campfire(x: number, z: number, seed: number): Part[] {
  const parts: Part[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + seed;
    parts.push({ geo: lumpy(new THREE.DodecahedronGeometry(0.045, 0), 0.4, seed + i).translate(x + Math.cos(a) * 0.13, 0.02, z + Math.sin(a) * 0.13), color: PAL.stone });
  }
  parts.push({ geo: cyl(0.018, 0.018, 0.2, 4).rotateZ(Math.PI / 2).rotateY(0.6).translate(x, 0.03, z), color: PAL.trunk });
  parts.push({ geo: cyl(0.018, 0.018, 0.2, 4).rotateZ(Math.PI / 2).rotateY(-0.7).translate(x, 0.04, z), color: PAL.trunk });
  parts.push({ geo: new THREE.ConeGeometry(0.06, 0.16, 5).translate(x, 0.1, z), color: PAL.ember });
  parts.push({ geo: new THREE.ConeGeometry(0.035, 0.11, 4).translate(x + 0.01, 0.1, z - 0.01), color: PAL.flame });
  return parts;
}

export function amphora(x: number, z: number, h: number): Part {
  const pts = [
    new THREE.Vector2(0.0, 0),
    new THREE.Vector2(0.03, 0.01),
    new THREE.Vector2(0.075, h * 0.4),
    new THREE.Vector2(0.06, h * 0.75),
    new THREE.Vector2(0.03, h * 0.88),
    new THREE.Vector2(0.04, h),
  ];
  return { geo: new THREE.LatheGeometry(pts, 6).translate(x, 0, z), color: PAL.pot };
}

const bundle = (x: number, z: number, s: number, color: string, seed: number): Part => ({
  geo: lumpy(new THREE.IcosahedronGeometry(0.1 * s, 0), 0.3, seed).scale(1.2, 0.75, 1).translate(x, 0.07 * s, z),
  color,
});

/** A canvas ridge tent with a stripe, a small bell tent, a fire, a pot and bundles. */
function tentA(): THREE.BufferGeometry {
  const parts: Part[] = [];
  parts.push({ geo: prism(1.05, 0.46, 0.74).translate(-0.12, 0, -0.18), color: PAL.canvas });
  // A stripe round the canvas, a hair proud of it.
  parts.push({ geo: prism(0.13, 0.47, 0.75).translate(0.16, 0, -0.18), color: PAL.canvasStripe });
  parts.push({ geo: prism(0.13, 0.47, 0.75).translate(-0.4, 0, -0.18), color: PAL.canvasStripe });
  parts.push({ geo: doorway(0.42, 0.5, 0.41).translate(0, 0, -0.18), color: PAL.door });
  parts.push({ geo: cyl(0.02, 0.02, 0.88, 4).translate(0.42, 0.44, -0.18), color: PAL.pole });
  parts.push({ geo: cyl(0.02, 0.02, 0.88, 4).translate(-0.66, 0.44, -0.18), color: PAL.pole });
  // The small bell tent behind.
  parts.push({ geo: lumpy(new THREE.ConeGeometry(0.34, 0.58, 7), 0.06, 21).translate(-0.48, 0.29, 0.52), color: PAL.canvasOchre });
  parts.push({ geo: cyl(0.015, 0.015, 0.16, 4).translate(-0.48, 0.64, 0.52), color: PAL.pole });
  parts.push(...campfire(0.55, 0.42, 1));
  parts.push(amphora(0.72, -0.62, 0.24));
  parts.push(amphora(0.6, -0.72, 0.18));
  parts.push(bundle(0.15, 0.62, 1, PAL.bundleBlue, 22));
  parts.push(bundle(0.3, 0.72, 0.8, PAL.bundleCream, 23));
  // A rug by the fire.
  parts.push({ geo: new THREE.BoxGeometry(0.34, 0.015, 0.24).translate(0.62, 0.008, 0.02), color: PAL.rug });
  parts.push({ geo: new THREE.BoxGeometry(0.06, 0.017, 0.24).translate(0.62, 0.009, 0.02), color: PAL.rugStripe });
  return merge(parts);
}

/** A round bell tent with a blue band, a lean-to awning over the bundles, a fire and a pot. */
function tentB(): THREE.BufferGeometry {
  const parts: Part[] = [];
  parts.push({ geo: lumpy(new THREE.ConeGeometry(0.56, 0.86, 8), 0.05, 31).translate(-0.18, 0.43, -0.12), color: PAL.canvas });
  parts.push({ geo: cyl(0.42, 0.47, 0.1, 8).translate(-0.18, 0.2, -0.12), color: PAL.canvasBlue });
  parts.push({ geo: cyl(0.02, 0.02, 0.2, 4).translate(-0.18, 0.92, -0.12), color: PAL.pole });
  // The doorway lies on the cone's slope, facing +x.
  const door = new THREE.BufferGeometry();
  door.setAttribute('position', new THREE.Float32BufferAttribute([0.395, 0.0, 0.13, 0.395, 0.0, -0.13, 0.16, 0.4, 0], 3));
  parts.push({ geo: door.translate(0, 0, -0.12), color: PAL.door });
  // A small ochre lean-to tent beside it.
  parts.push({ geo: prism(0.56, 0.27, 0.4).rotateY(Math.PI / 2).translate(0.32, 0, 0.62), color: PAL.canvasOchre });
  parts.push({ geo: doorway(0.3, 0.27, 0.0).rotateY(-Math.PI / 2).translate(0.32, 0, 0.903), color: PAL.door });
  parts.push(bundle(-0.1, 0.62, 1, PAL.bundleRed, 32));
  parts.push(bundle(0.72, 0.42, 0.85, PAL.bundleBlue, 33));
  parts.push(...campfire(0.62, -0.5, 2));
  parts.push(amphora(-0.72, 0.7, 0.22));
  parts.push({ geo: new THREE.BoxGeometry(0.22, 0.12, 0.16).translate(0.75, 0.06, 0.15), color: PAL.trunk });
  return merge(parts);
}

/** A thin cylinder from one point to another. */
function segment(a: THREE.Vector3, b: THREE.Vector3, r: number): THREE.BufferGeometry {
  const d = b.clone().sub(a);
  const g = cyl(r, r, d.length(), 5);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  const mid = a.clone().add(b).multiplyScalar(0.5);
  return g.translate(mid.x, mid.y, mid.z);
}

/** A low wall of rough stones, from (x0, z0) to (x1, z1). */
export function stoneWall(x0: number, z0: number, x1: number, z1: number, seed: number): Part[] {
  const parts: Part[] = [];
  const len = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(2, Math.round(len / 0.12));
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n;
    const r = 0.055 + 0.02 * hash2(i, seed, 71);
    parts.push({
      geo: lumpy(new THREE.DodecahedronGeometry(r, 0), 0.35, seed + i).scale(1.2, 0.8, 1).translate(x0 + (x1 - x0) * f, r * 0.7, z0 + (z1 - z0) * f),
      color: i % 3 === 0 ? PAL.rockDark : PAL.stone,
    });
  }
  return parts;
}

/** A stack of split logs along z. */
export function woodpile(x: number, z: number): Part[] {
  const parts: Part[] = [];
  for (let row = 0; row < 3; row++) {
    for (let k = 0; k < 3 - row; k++) {
      const y = 0.035 + row * 0.06;
      const zz = z + (k - (2 - row) / 2) * 0.07;
      parts.push({ geo: cyl(0.032, 0.032, 0.3, 5).rotateX(Math.PI / 2).rotateY(Math.PI / 2).translate(x, y, zz), color: k % 2 ? PAL.wood : PAL.trunk });
    }
  }
  return parts;
}

/**
 * A hut: whitewashed mud-brick walls on a stone plinth under a thick hipped
 * thatch, a dark doorway facing +x, a low stone yard wall, a woodpile, a
 * big storage jar and the cooking fire.
 */
function hutA(): THREE.BufferGeometry {
  const parts: Part[] = [];
  const cx = -0.12;
  const cz = -0.1;
  parts.push({ geo: new THREE.BoxGeometry(1.06, 0.09, 0.84).translate(cx, 0.045, cz), color: PAL.plinth });
  parts.push({ geo: new THREE.BoxGeometry(0.98, 0.5, 0.76).translate(cx, 0.09 + 0.25, cz), color: PAL.mudWall });
  // The thatch: a squat four-sided pyramid stretched along the hut, lumpy like straw, with a darker eave.
  const roof = lumpy(new THREE.ConeGeometry(0.8, 0.5, 4, 1).rotateY(Math.PI / 4), 0.08, 81).scale(1.0, 1, 0.76).translate(cx, 0.59 + 0.25, cz);
  parts.push({ geo: roof, color: PAL.thatch });
  parts.push({ geo: new THREE.BoxGeometry(1.14, 0.05, 0.9).translate(cx, 0.6, cz), color: PAL.thatchDark });
  // A ridge of darker straw along the top.
  parts.push({ geo: cyl(0.04, 0.05, 0.42, 5).rotateZ(Math.PI / 2).translate(cx, 1.02, cz), color: PAL.thatchDark });
  // The doorway on the +x end, a lintel, and a small window on the side.
  parts.push({ geo: new THREE.BoxGeometry(0.03, 0.34, 0.22).translate(cx + 0.49, 0.09 + 0.17, cz), color: PAL.door });
  parts.push({ geo: new THREE.BoxGeometry(0.05, 0.04, 0.3).translate(cx + 0.5, 0.45, cz), color: PAL.wood });
  parts.push({ geo: new THREE.BoxGeometry(0.16, 0.12, 0.03).translate(cx + 0.18, 0.42, cz + 0.385), color: PAL.door });
  parts.push({ geo: new THREE.BoxGeometry(0.16, 0.12, 0.03).translate(cx - 0.3, 0.42, cz - 0.385), color: PAL.door });
  // The yard: a low stone wall along the back and one side.
  parts.push(...stoneWall(-0.9, 0.86, 0.5, 0.86, 90));
  parts.push(...stoneWall(-0.9, 0.86, -0.9, 0.42, 91));
  parts.push(...woodpile(-0.55, 0.62));
  parts.push(...campfire(0.62, 0.5, 3));
  // A storage jar half as tall as the door, and a small amphora.
  parts.push({ geo: new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(0.06, 0.01), new THREE.Vector2(0.12, 0.12), new THREE.Vector2(0.1, 0.24), new THREE.Vector2(0.05, 0.28), new THREE.Vector2(0.06, 0.3)], 7).translate(0.66, 0, -0.66), color: PAL.pithos });
  parts.push(amphora(0.45, -0.75, 0.2));
  parts.push(bundle(0.15, 0.62, 0.8, PAL.bundleCream, 92));
  return merge(parts);
}

/** A round hut: a drum of mud wall under a tall cone of thatch, a lean-to woodshed, a fence of stakes, the fire. */
function hutB(): THREE.BufferGeometry {
  const parts: Part[] = [];
  const cx = -0.2;
  const cz = -0.08;
  parts.push({ geo: cyl(0.52, 0.55, 0.08, 10).translate(cx, 0.04, cz), color: PAL.plinth });
  parts.push({ geo: cyl(0.46, 0.48, 0.5, 10).translate(cx, 0.08 + 0.25, cz), color: PAL.mudWall });
  parts.push({ geo: lumpy(new THREE.ConeGeometry(0.66, 0.62, 10, 1), 0.07, 83).translate(cx, 0.58 + 0.31, cz), color: PAL.thatch });
  parts.push({ geo: cyl(0.62, 0.66, 0.05, 10).translate(cx, 0.58, cz), color: PAL.thatchDark });
  parts.push({ geo: cyl(0.03, 0.05, 0.12, 5).translate(cx, 1.24, cz), color: PAL.thatchDark });
  // The doorway facing +x.
  parts.push({ geo: new THREE.BoxGeometry(0.05, 0.34, 0.22).translate(cx + 0.465, 0.08 + 0.17, cz), color: PAL.door });
  // A lean-to woodshed on the side: two posts and a sloping thatch.
  parts.push({ geo: cyl(0.018, 0.018, 0.34, 4).translate(0.42, 0.17, 0.56), color: PAL.wood });
  parts.push({ geo: cyl(0.018, 0.018, 0.34, 4).translate(0.42, 0.17, 0.86), color: PAL.wood });
  parts.push({ geo: new THREE.BoxGeometry(0.42, 0.04, 0.42).rotateZ(-0.35).translate(0.28, 0.37, 0.71), color: PAL.thatch });
  parts.push(...woodpile(0.24, 0.71));
  // A fence of stakes round the front of the yard.
  for (let i = 0; i < 9; i++) {
    const a = -1.2 + i * 0.3;
    const x = 0.86 * Math.cos(a) * 0.95 + 0.0;
    const z = 0.86 * Math.sin(a) * 0.95 - 0.1;
    if (x < 0.25) continue;
    parts.push({ geo: cyl(0.016, 0.02, 0.22 + 0.04 * hash2(i, 1, 84), 4).translate(x, 0.11, z), color: PAL.woodDark });
  }
  parts.push(...campfire(0.5, -0.62, 4));
  parts.push(amphora(-0.75, 0.66, 0.22));
  parts.push(amphora(-0.62, 0.76, 0.17));
  parts.push(bundle(-0.25, 0.62, 0.85, PAL.bundleRed, 93));
  return merge(parts);
}

/** A shuttered window on a wall facing +x (or, turned, any way): a dark pane between two blue shutters. */
export function windowX(x: number, y: number, z: number): Part[] {
  return [
    { geo: new THREE.BoxGeometry(0.025, 0.13, 0.11).translate(x, y, z), color: PAL.door },
    { geo: new THREE.BoxGeometry(0.02, 0.14, 0.055).translate(x + 0.012, y, z - 0.085), color: PAL.shutter },
    { geo: new THREE.BoxGeometry(0.02, 0.14, 0.055).translate(x + 0.012, y, z + 0.085), color: PAL.shutter },
  ];
}

/** The same window on a wall facing -x (a house's back, towards the next street). */
export function windowBack(x: number, y: number, z: number): Part[] {
  return [
    { geo: new THREE.BoxGeometry(0.025, 0.13, 0.11).translate(x, y, z), color: PAL.door },
    { geo: new THREE.BoxGeometry(0.02, 0.14, 0.055).translate(x - 0.012, y, z - 0.085), color: PAL.shutter },
    { geo: new THREE.BoxGeometry(0.02, 0.14, 0.055).translate(x - 0.012, y, z + 0.085), color: PAL.shutter },
  ];
}

/**
 * A cottage: whitewashed walls on a stone footing under a terracotta tiled
 * roof whose long side faces the road, a door between blue-shuttered windows,
 * and a small walled yard with an olive tree, a bench and a storage jar.
 * Kept lean (about the triangles of a hut).
 */
function cottageA(): THREE.BufferGeometry {
  const parts: Part[] = [];
  const cx = -0.28;
  const cz = -0.2;
  const dx = 0.8;
  const dz = 1.16;
  const h = 0.56;
  parts.push({ geo: new THREE.BoxGeometry(dx + 0.08, 0.08, dz + 0.08).translate(cx, 0.04, cz), color: PAL.plinth });
  parts.push({ geo: new THREE.BoxGeometry(dx, h, dz).translate(cx, 0.08 + h / 2, cz), color: PAL.whitewash });
  // The roof: a gable along z, a little overhang, a darker ridge.
  const top = 0.08 + h;
  parts.push({ geo: prism(dz + 0.16, dx / 2 + 0.1, 0.34).rotateY(Math.PI / 2).translate(cx, top, cz), color: PAL.roofTile });
  parts.push({ geo: cyl(0.03, 0.03, dz + 0.18, 5).rotateX(Math.PI / 2).translate(cx, top + 0.34, cz), color: PAL.roofTileDark });
  // Courses of tiles: two darker lines along each slope.
  for (const side of [-1, 1]) {
    for (const k of [0.33, 0.66]) {
      const y = top + 0.34 * (1 - k);
      const x = cx + side * (dx / 2 + 0.1) * k;
      parts.push({ geo: new THREE.BoxGeometry(0.03, 0.02, dz + 0.16).rotateZ(side * 0.69).translate(x, y + 0.012, cz), color: PAL.roofTileDark });
    }
  }
  // The gable ends, whitewashed.
  const gable = new THREE.BufferGeometry();
  const gx = dx / 2;
  gable.setAttribute('position', new THREE.Float32BufferAttribute([-gx, 0, 0, gx, 0, 0, 0, 0.32, 0, gx, 0, 0, -gx, 0, 0, 0, 0.32, 0], 3));
  parts.push({ geo: gable.clone().translate(cx, top, cz + dz / 2 + 0.001), color: PAL.whitewashShade });
  parts.push({ geo: gable.translate(cx, top, cz - dz / 2 - 0.001), color: PAL.whitewashShade });
  // The door facing +x, a step, and windows either side.
  const fx = cx + dx / 2;
  parts.push({ geo: new THREE.BoxGeometry(0.03, 0.34, 0.2).translate(fx + 0.004, 0.08 + 0.17, cz), color: PAL.door });
  parts.push({ geo: new THREE.BoxGeometry(0.1, 0.04, 0.28).translate(fx + 0.05, 0.02, cz), color: PAL.plinth });
  parts.push(...windowX(fx + 0.004, 0.42, cz - 0.36), ...windowX(fx + 0.004, 0.42, cz + 0.36));
  // The yard beside it: a low whitewashed wall, an olive tree, a bench and a jar.
  parts.push({ geo: new THREE.BoxGeometry(1.5, 0.16, 0.07).translate(-0.18, 0.08, 0.9), color: PAL.whitewash });
  parts.push({ geo: new THREE.BoxGeometry(0.07, 0.16, 0.5).translate(0.55, 0.08, 0.67), color: PAL.whitewash });
  parts.push({ geo: cyl(0.03, 0.045, 0.34, 5).translate(-0.5, 0.17, 0.62), color: PAL.trunk });
  parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.2, 0), 0.3, 141).scale(1.2, 0.8, 1.1).translate(-0.5, 0.42, 0.62), color: PAL.oliveLeaf });
  parts.push({ geo: new THREE.BoxGeometry(0.3, 0.035, 0.1).translate(0.12, 0.13, 0.78), color: PAL.wood });
  parts.push({ geo: new THREE.BoxGeometry(0.03, 0.12, 0.08).translate(0.0, 0.06, 0.78), color: PAL.woodDark });
  parts.push({ geo: new THREE.BoxGeometry(0.03, 0.12, 0.08).translate(0.24, 0.06, 0.78), color: PAL.woodDark });
  parts.push(amphora(0.3, -0.72, 0.22));
  parts.push({ geo: new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(0.06, 0.01), new THREE.Vector2(0.11, 0.12), new THREE.Vector2(0.09, 0.23), new THREE.Vector2(0.05, 0.27)], 6).translate(0.62, 0, -0.5), color: PAL.pithos });
  return merge(parts);
}

/**
 * A squarer cottage under a hipped tile roof, with a vine-covered pergola on
 * posts by the door, a bench beneath it, pots of herbs and a jar.
 */
function cottageB(): THREE.BufferGeometry {
  const parts: Part[] = [];
  const cx = -0.3;
  const cz = -0.1;
  const w = 0.92;
  const h = 0.54;
  parts.push({ geo: new THREE.BoxGeometry(w + 0.08, 0.08, w + 0.08).translate(cx, 0.04, cz), color: PAL.plinth });
  parts.push({ geo: new THREE.BoxGeometry(w, h, w).translate(cx, 0.08 + h / 2, cz), color: PAL.whitewash });
  const top = 0.08 + h;
  parts.push({ geo: new THREE.ConeGeometry((w / 2 + 0.11) * Math.SQRT2, 0.38, 4, 1).rotateY(Math.PI / 4).translate(cx, top + 0.19, cz), color: PAL.roofTile });
  parts.push({ geo: new THREE.BoxGeometry(w + 0.2, 0.035, w + 0.2).translate(cx, top + 0.01, cz), color: PAL.roofTileDark });
  const fx = cx + w / 2;
  parts.push({ geo: new THREE.BoxGeometry(0.03, 0.34, 0.2).translate(fx + 0.004, 0.08 + 0.17, cz + 0.15), color: PAL.door });
  parts.push(...windowX(fx + 0.004, 0.42, cz - 0.22));
  // A window on the side.
  parts.push({ geo: new THREE.BoxGeometry(0.12, 0.13, 0.025).translate(cx - 0.1, 0.42, cz - w / 2 - 0.004), color: PAL.door });
  // The pergola: four posts, two beams, a roof of vine leaves.
  const px0 = fx + 0.05;
  const px1 = fx + 0.55;
  const pz0 = cz + 0.0;
  const pz1 = cz + 0.75;
  for (const [x, z] of [[px0, pz0], [px1, pz0], [px0, pz1], [px1, pz1]]) parts.push({ geo: cyl(0.018, 0.018, 0.5, 4).translate(x, 0.25, z), color: PAL.wood });
  parts.push({ geo: new THREE.BoxGeometry(0.04, 0.03, 0.82).translate(px0, 0.5, (pz0 + pz1) / 2), color: PAL.woodDark });
  parts.push({ geo: new THREE.BoxGeometry(0.04, 0.03, 0.82).translate(px1, 0.5, (pz0 + pz1) / 2), color: PAL.woodDark });
  parts.push({ geo: lumpy(new THREE.BoxGeometry(0.62, 0.07, 0.86, 2, 1, 2), 0.25, 151).translate((px0 + px1) / 2, 0.55, (pz0 + pz1) / 2), color: PAL.scrub });
  parts.push({ geo: new THREE.BoxGeometry(0.1, 0.035, 0.36).translate(px0 + 0.12, 0.13, (pz0 + pz1) / 2 + 0.05), color: PAL.wood });
  // Pots of herbs and a jar.
  for (const [x, z, k] of [[-0.85, 0.62, 0], [-0.62, 0.72, 1]]) {
    parts.push({ geo: cyl(0.05, 0.04, 0.08, 6).translate(x, 0.04, z), color: PAL.pot });
    parts.push({ geo: lumpy(new THREE.IcosahedronGeometry(0.06, 0), 0.3, 160 + k).translate(x, 0.12, z), color: PAL.scrubDark });
  }
  parts.push(amphora(0.62, -0.72, 0.22));
  parts.push(amphora(0.48, -0.8, 0.17));
  return merge(parts);
}

/**
 * The fountain: a paved square with a round stone basin of water, a column in
 * the middle with a bowl that spills water back down in four streams, and a
 * couple of jars waiting by the rim.
 */
function fountainModel(): { stone: THREE.BufferGeometry; water: THREE.BufferGeometry } {
  const parts: Part[] = [];
  // Paving, with a slightly raised step round the basin.
  // (The paving runs well down into the ground, so on a slope it shows as a low stone platform rather than floating.)
  parts.push({ geo: new THREE.BoxGeometry(1.76, 0.66, 1.76).translate(0, 0.06 - 0.33, 0), color: PAL.paving });
  parts.push({ geo: cyl(0.8, 0.84, 0.06, 12).translate(0, 0.09, 0), color: PAL.pavingDark });
  // The basin: an outer rim and an inner lining just below it.
  parts.push({ geo: cyl(0.66, 0.7, 0.24, 12).translate(0, 0.12 + 0.12, 0), color: PAL.fountainStone });
  parts.push({ geo: cyl(0.69, 0.69, 0.035, 12).translate(0, 0.36, 0), color: PAL.fountainStoneShade });
  // The column, the bowl and its little finial.
  parts.push({ geo: cyl(0.075, 0.1, 0.62, 8).translate(0, 0.3 + 0.31, 0), color: PAL.fountainStone });
  parts.push({ geo: cyl(0.13, 0.13, 0.05, 8).translate(0, 0.33, 0), color: PAL.fountainStoneShade });
  parts.push({ geo: cyl(0.24, 0.09, 0.1, 10).translate(0, 0.94, 0), color: PAL.fountainStone });
  parts.push({ geo: new THREE.SphereGeometry(0.05, 6, 4).translate(0, 1.04, 0), color: PAL.fountainStoneShade });
  // Jars on the paving.
  parts.push(amphora(0.74, 0.74, 0.24));
  parts.push(amphora(0.62, 0.82, 0.18));
  parts.push(amphora(-0.76, -0.72, 0.22));
  const stone = merge(parts);
  const water: Part[] = [];
  water.push({ geo: cyl(0.6, 0.6, 0.02, 12).translate(0, 0.33, 0), color: PAL.basinWater });
  water.push({ geo: cyl(0.2, 0.2, 0.015, 10).translate(0, 0.985, 0), color: PAL.basinWaterLight });
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const at = (r: number, y: number): THREE.Vector3 => new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    // Each stream spills over the bowl's lip, curves out and falls into the basin.
    water.push({ geo: segment(at(0.2, 0.975), at(0.27, 0.9), 0.022), color: PAL.spout });
    water.push({ geo: segment(at(0.27, 0.9), at(0.31, 0.78), 0.024), color: PAL.spout });
    water.push({ geo: segment(at(0.31, 0.78), at(0.34, 0.345), 0.027), color: PAL.spout });
    water.push({ geo: cyl(0.07, 0.07, 0.012, 6).translate(Math.cos(a) * 0.34, 0.345, Math.sin(a) * 0.34), color: PAL.basinWaterLight });
  }
  return { stone, water: merge(water) };
}

/** A stake with a little pennant, marking a plot's corner. */
function stake(): THREE.BufferGeometry {
  const flag = new THREE.BufferGeometry();
  flag.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.34, 0, 0, 0.25, 0, 0.13, 0.3, 0.0], 3));
  const back = new THREE.BufferGeometry();
  back.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.25, 0, 0, 0.34, 0, 0.13, 0.3, 0.0], 3));
  return merge([
    { geo: new THREE.BoxGeometry(0.03, 0.36, 0.03).translate(0, 0.16, 0), color: PAL.stake },
    { geo: flag, color: PAL.flag },
    { geo: back, color: PAL.flag },
  ]);
}

// ---------------------------------------------------------------------------

/**
 * Which way a building's front (its doorway) faces: towards a road beside it
 * if there is one, trying the east side, then south, north and west. The
 * model's front is +x; the yaw turns +x to (cos, -sin).
 */
export function facingOf(s: SimState, size: number, b: Building): number {
  const n = sideOf(b.kind);
  const road = (tx: number, tz: number): boolean => tx >= 0 && tz >= 0 && tx < size && tz < size && s.tiles[tz * size + tx] === TILE_ROAD;
  const any = (f: (d: number) => boolean): boolean => {
    for (let d = 0; d < n; d++) if (f(d)) return true;
    return false;
  };
  if (any((d) => road(b.x + n, b.z + d))) return 0;
  if (any((d) => road(b.x + d, b.z + n))) return -Math.PI / 2;
  if (any((d) => road(b.x + d, b.z - 1))) return Math.PI / 2;
  if (any((d) => road(b.x - 1, b.z + d))) return Math.PI;
  return Math.floor(hash2(b.id, 3, 41) * 4) * (Math.PI / 2);
}
const facing = facingOf;

const RISE_SECONDS = 0.9;
const UP = new THREE.Vector3(0, 1, 0);

/** Where each model's cooking fire is, in the model's frame (for the smoke). */
const TENT_FIRES = [new THREE.Vector3(0.55, 0, 0.42), new THREE.Vector3(0.62, 0, -0.5)];
const HUT_FIRES = [new THREE.Vector3(0.62, 0, 0.5), new THREE.Vector3(0.5, 0, -0.62)];

type Look = 'stakes' | 'tent' | 'hut' | 'cottage' | 'townhouse' | 'fine' | 'fountain' | 'shrine' | 'taxoffice';
const LEVEL_LOOKS: Look[] = ['stakes', 'tent', 'hut', 'cottage', 'townhouse', 'fine'];
const lookOf = (b: Building): Look =>
  b.kind === 'fountain' ? 'fountain' : b.kind === 'shrine' ? 'shrine' : b.kind === 'taxoffice' ? 'taxoffice' : LEVEL_LOOKS[Math.min(b.level, LEVEL_LOOKS.length - 1)];
/** Where a house's smoke comes out: near the top of its roof, a little back from the middle (cached per model). */
const roofTops = new WeakMap<THREE.BufferGeometry, THREE.Vector3>();
function roofTop(g: THREE.BufferGeometry): THREE.Vector3 {
  let v = roofTops.get(g);
  if (!v) {
    const p = g.attributes.position;
    let best = -Infinity;
    v = new THREE.Vector3();
    // The highest point in the back half of the plot.
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      if (p.getX(i) < 0.1 && y > best) {
        best = y;
        v.set(p.getX(i), y, p.getZ(i));
      }
    }
    roofTops.set(g, v);
  }
  return v;
}

/** Homes, fountains, shrines and tax offices (the two-by-two buildings) are drawn here; the farm, granary, agora and theatre by Works. */
const drawnHere = (b: Building): boolean => b.kind === 'home' || b.kind === 'fountain' || b.kind === 'shrine' || b.kind === 'taxoffice';

/** One settled thing's vertices, already placed in the world, and its bounds. */
interface MergedPart {
  pos: Float32Array;
  nor: Float32Array;
  col: Float32Array;
  min: THREE.Vector3;
  max: THREE.Vector3;
}

/** What goes into a chunk's merged mesh: a model, where it stands, and a key that changes whenever either would. */
interface MergedItem {
  key: string;
  geo: THREE.BufferGeometry;
  m: THREE.Matrix4;
}

/**
 * Every settled home, shrine, fountain and plot stake in a chunk merged into
 * one mesh: one draw (and one shadow draw) per chunk, whatever mix of houses
 * it holds. Rebuilt only when something in the chunk changes look. Each
 * thing's placed vertices are kept, so a rebuild only places what is new and
 * copies the rest (placing every vertex of a chunk of fine houses again took
 * close to 20 ms, a visible hitch, each time one home changed look).
 */
class MergedChunks {
  private readonly meshes = new Map<number, THREE.Mesh>();
  private readonly parts = new Map<number, Map<string, MergedPart>>();
  private readonly nm = new THREE.Matrix3();
  /** Vertices written by the last rebuild, and how many of them had to be placed afresh (for measuring). */
  lastVertices = 0;
  lastPlaced = 0;

  constructor(
    private readonly group: THREE.Group,
    private readonly material: THREE.Material,
  ) {}

  /** A model's vertices placed by a matrix. */
  private place(geo: THREE.BufferGeometry, m: THREE.Matrix4): MergedPart {
    const count = geo.attributes.position.count;
    const sp = geo.attributes.position.array as Float32Array;
    const sn = geo.attributes.normal.array as Float32Array;
    const pos = new Float32Array(count * 3);
    const nor = new Float32Array(count * 3);
    const col = (geo.attributes.color.array as Float32Array).slice(0, count * 3);
    const e = m.elements;
    const ne = this.nm.getNormalMatrix(m).elements;
    const min = new THREE.Vector3(Infinity, Infinity, Infinity);
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    for (let j = 0; j < count * 3; j += 3) {
      const x = sp[j];
      const y = sp[j + 1];
      const z = sp[j + 2];
      const px = e[0] * x + e[4] * y + e[8] * z + e[12];
      const py = e[1] * x + e[5] * y + e[9] * z + e[13];
      const pz = e[2] * x + e[6] * y + e[10] * z + e[14];
      pos[j] = px;
      pos[j + 1] = py;
      pos[j + 2] = pz;
      if (px < min.x) min.x = px;
      if (py < min.y) min.y = py;
      if (pz < min.z) min.z = pz;
      if (px > max.x) max.x = px;
      if (py > max.y) max.y = py;
      if (pz > max.z) max.z = pz;
      const a = sn[j];
      const b = sn[j + 1];
      const c = sn[j + 2];
      const nx = ne[0] * a + ne[3] * b + ne[6] * c;
      const ny = ne[1] * a + ne[4] * b + ne[7] * c;
      const nz = ne[2] * a + ne[5] * b + ne[8] * c;
      const l = Math.hypot(nx, ny, nz) || 1;
      nor[j] = nx / l;
      nor[j + 1] = ny / l;
      nor[j + 2] = nz / l;
    }
    return { pos, nor, col, min, max };
  }

  set(key: number, items: ReadonlyArray<MergedItem>): void {
    const was = this.parts.get(key);
    const now = new Map<string, MergedPart>();
    const order: MergedPart[] = [];
    let n = 0;
    let placed = 0;
    for (const it of items) {
      let part = was?.get(it.key);
      if (!part) {
        part = this.place(it.geo, it.m);
        placed += part.pos.length / 3;
      }
      now.set(it.key, part);
      order.push(part);
      n += part.pos.length / 3;
    }
    let mesh = this.meshes.get(key);
    if (n === 0) {
      this.parts.delete(key);
      if (mesh) {
        this.group.remove(mesh);
        mesh.geometry.dispose();
        this.meshes.delete(key);
      }
      return;
    }
    this.parts.set(key, now);
    const pos = new Float32Array(n * 3);
    const nor = new Float32Array(n * 3);
    const colr = new Float32Array(n * 3);
    const box = new THREE.Box3();
    let o = 0;
    for (const part of order) {
      pos.set(part.pos, o);
      nor.set(part.nor, o);
      colr.set(part.col, o);
      o += part.pos.length;
      box.expandByPoint(part.min).expandByPoint(part.max);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colr, 3));
    g.boundingBox = box;
    g.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
    if (mesh) {
      mesh.geometry.dispose();
      mesh.geometry = g;
    } else {
      mesh = new THREE.Mesh(g, this.material);
      mesh.name = `homes-merged-${key}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.meshes.set(key, mesh);
      this.group.add(mesh);
    }
    this.lastVertices = n;
    this.lastPlaced = placed;
  }
}

/**
 * Stakes on empty plots, tents and huts on lived-in ones, and fountains.
 * Settled ones are merged into one mesh per chunk (MergedChunks); a home
 * rising into place (when it is pitched or built) is drawn instanced until
 * it has risen. Only the chunks whose buildings changed (added, removed, or
 * a new look or facing) are rebuilt.
 */
export class Homes {
  readonly group = new THREE.Group();
  private readonly tents: ChunkedInstances[];
  private readonly huts: ChunkedInstances[];
  private readonly cottages: ChunkedInstances[];
  private readonly townhouses: ChunkedInstances[];
  private readonly fines: ChunkedInstances[];
  private readonly shrines: ChunkedInstances;
  private readonly offices: ChunkedInstances;
  private readonly fountains: ChunkedInstances[];
  private readonly stakes: ChunkedInstances;
  private readonly merged: MergedChunks;
  /** The models, by look and variant, for merging. */
  private readonly models: Record<'tent' | 'hut' | 'cottage' | 'townhouse' | 'fine', THREE.BufferGeometry[]>;
  private readonly shrineGeo: THREE.BufferGeometry;
  private readonly officeGeo: THREE.BufferGeometry;
  private readonly fountainGeo: THREE.BufferGeometry;
  private readonly stakeGeo: THREE.BufferGeometry;
  /** Buildings by chunk, as last seen. */
  private byChunk = new Map<number, Building[]>();
  /** What each building looked like last time (look, variant and facing), and its chunk. */
  private seen = new Map<number, { sig: string; key: number }>();
  private rising = new Map<number, number>();
  private time = 0;
  private state: SimState | null = null;
  /** Where each home's fire is (world), by chunk, for the smoke. */
  private fires = new Map<number, Array<[number, number, number, number]>>();
  private readonly smoke: ChunkedInstances;
  private readonly sm = new THREE.Matrix4();
  private readonly sq = new THREE.Quaternion();
  private readonly sp = new THREE.Vector3();
  private readonly ss = new THREE.Vector3();
  /** Chunks refilled by the last sync (for the measuring script). */
  lastRefilled = 0;

  constructor(private readonly map: CoastMap) {
    this.group.name = 'homes';
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
    const opts = { castShadow: true, receiveShadow: true, colors: false };
    this.models = {
      tent: [tentA(), tentB()],
      hut: [hutA(), hutB()],
      cottage: [cottageA(), cottageB()],
      townhouse: [townhouseA(), townhouseB()],
      fine: [fineA(), fineB()],
    };
    const md = this.models;
    this.tents = [new ChunkedInstances('tent-a', md.tent[0], mat, HOME_CHUNK, opts), new ChunkedInstances('tent-b', md.tent[1], mat, HOME_CHUNK, opts)];
    this.huts = [new ChunkedInstances('hut-a', md.hut[0], mat, HOME_CHUNK, opts), new ChunkedInstances('hut-b', md.hut[1], mat, HOME_CHUNK, opts)];
    this.cottages = [new ChunkedInstances('cottage-a', md.cottage[0], mat, HOME_CHUNK, opts), new ChunkedInstances('cottage-b', md.cottage[1], mat, HOME_CHUNK, opts)];
    this.townhouses = [new ChunkedInstances('townhouse-a', md.townhouse[0], mat, HOME_CHUNK, opts), new ChunkedInstances('townhouse-b', md.townhouse[1], mat, HOME_CHUNK, opts)];
    this.fines = [new ChunkedInstances('fine-a', md.fine[0], mat, HOME_CHUNK, opts), new ChunkedInstances('fine-b', md.fine[1], mat, HOME_CHUNK, opts)];
    this.shrineGeo = shrineModel();
    this.shrines = new ChunkedInstances('shrine', this.shrineGeo, mat, HOME_CHUNK, opts);
    this.officeGeo = taxOfficeModel();
    this.offices = new ChunkedInstances('taxoffice', this.officeGeo, mat, HOME_CHUNK, opts);
    const f = fountainModel();
    this.fountainGeo = f.stone;
    const waterMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.2, metalness: 0, emissive: new THREE.Color('#1d6f86'), emissiveIntensity: 0.35 });
    this.fountains = [
      new ChunkedInstances('fountain', f.stone, mat, HOME_CHUNK, opts),
      new ChunkedInstances('fountain-water', f.water, waterMat, HOME_CHUNK, { castShadow: false, receiveShadow: true, colors: false }),
    ];
    this.stakeGeo = stake();
    this.stakes = new ChunkedInstances('stakes', this.stakeGeo, mat, HOME_CHUNK, opts);
    this.merged = new MergedChunks(this.group, mat);
    for (const t of [...this.tents, ...this.huts, ...this.cottages, ...this.townhouses, ...this.fines, this.shrines, this.offices, ...this.fountains]) this.group.add(t.group);
    this.group.add(this.stakes.group);
    const puff = new THREE.IcosahedronGeometry(1, 0);
    const smokeMat = new THREE.MeshBasicMaterial({ color: 0xeee8de, transparent: true, opacity: 0.3, depthWrite: false });
    this.smoke = new ChunkedInstances('smoke', puff, smokeMat, HOME_CHUNK, { castShadow: false, receiveShadow: false, colors: false });
    this.group.add(this.smoke.group);
  }

  /** A wisp of smoke from every fire, drifting with the breeze. */
  private updateSmoke(time: number, windAngle: number): void {
    const wx = Math.cos(windAngle);
    const wz = Math.sin(windAngle);
    this.smoke.begin();
    for (const list of this.fires.values()) {
      for (const [x, y, z, seed] of list) {
        for (let k = 0; k < 4; k++) {
          const f = (time / 3.6 + k / 4 + seed) % 1;
          // Small near the fire, swelling as it rises, then gone.
          const r = (0.025 + 0.075 * f) * Math.min(1, (1 - f) * 4);
          const drift = f * f * 0.3;
          this.sp.set(x + wx * drift, y + 0.14 + f * 0.6, z + wz * drift);
          this.sq.setFromAxisAngle(UP, seed * 10 + f * 2);
          this.ss.set(r, r * 0.85, r);
          this.sm.compose(this.sp, this.sq, this.ss);
          this.smoke.push(this.sm);
        }
      }
    }
    this.smoke.end();
  }

  private key(b: Building): number {
    return this.stakes.key(b.x + 1, b.z + 1);
  }

  /**
   * Bring the drawing up to date after the state's buildings or roads changed.
   * `animate` is false on the first sync (nothing rises at load).
   */
  sync(s: SimState, animate: boolean): void {
    this.state = s;
    const size = this.map.size;
    const next = new Map<number, Building[]>();
    const dirty = new Set<number>();
    const now = new Map<number, { sig: string; key: number }>();
    for (const b of s.buildings) {
      if (!drawnHere(b)) continue;
      const k = this.key(b);
      const list = next.get(k);
      if (list) list.push(b);
      else next.set(k, [b]);
      const look = lookOf(b);
      const sig = `${look}:${facing(s, size, b).toFixed(2)}`;
      now.set(b.id, { sig, key: k });
      const was = this.seen.get(b.id);
      if (!was || was.sig !== sig) {
        dirty.add(k);
        // Rises into place when it first takes this look (not when it merely turns to face a new road).
        if (animate && look !== 'stakes' && (!was || was.sig.split(':')[0] !== look)) this.rising.set(b.id, this.time);
      }
    }
    for (const [id, was] of this.seen) if (!now.has(id)) dirty.add(was.key);
    this.seen = now;
    this.byChunk = next;
    for (const k of dirty) this.fill(k);
    this.lastRefilled = dirty.size;
  }

  update(time: number, windAngle = 0): void {
    this.time = time;
    this.updateSmoke(time, windAngle);
    if (this.rising.size === 0 || !this.state) return;
    // Chunks with a home still rising refill only their instanced homes; one whose home has just risen merges it back in.
    const dirty = new Map<number, boolean>();
    for (const [id, t0] of this.rising) {
      const done = time - t0 > RISE_SECONDS;
      if (done) this.rising.delete(id);
      const at = this.seen.get(id);
      if (at) dirty.set(at.key, (dirty.get(at.key) ?? false) || done);
    }
    for (const [k, all] of dirty) this.fill(k, all);
  }

  /** Redraw a chunk: its rising homes, and (with `all`) its merged mesh of everything settled. */
  private fill(key: number, all = true): void {
    const s = this.state;
    if (!s) return;
    const list = this.byChunk.get(key) ?? [];
    const map = this.map;
    const size = map.size;
    // Any point in the chunk tells ChunkedInstances which chunk it is.
    const kx = ((key % 1024) - 512 + 0.5) * HOME_CHUNK;
    const kz = (Math.floor(key / 1024) - 512 + 0.5) * HOME_CHUNK;
    const tentsBy: Building[][] = [[], []];
    const hutsBy: Building[][] = [[], []];
    const cottagesBy: Building[][] = [[], []];
    const townhousesBy: Building[][] = [[], []];
    const finesBy: Building[][] = [[], []];
    const fountains: Building[] = [];
    const shrines: Building[] = [];
    const offices: Building[] = [];
    const plots: Building[] = [];
    for (const b of list) {
      const look = lookOf(b);
      if (look === 'tent') tentsBy[Math.floor(hash2(b.id, 1, 40) * 2)].push(b);
      else if (look === 'hut') hutsBy[Math.floor(hash2(b.id, 6, 40) * 2)].push(b);
      else if (look === 'cottage') cottagesBy[Math.floor(hash2(b.id, 7, 40) * 2)].push(b);
      else if (look === 'townhouse') townhousesBy[Math.floor(hash2(b.id, 8, 40) * 2)].push(b);
      else if (look === 'fine') finesBy[Math.floor(hash2(b.id, 9, 40) * 2)].push(b);
      else if (look === 'fountain') fountains.push(b);
      else if (look === 'shrine') shrines.push(b);
      else if (look === 'taxoffice') offices.push(b);
      else plots.push(b);
    }
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const sc = new THREE.Vector3();
    const fires: Array<[number, number, number, number]> = [];
    const fp = new THREE.Vector3();
    // Stand on the lowest of the footprint's middle so nothing floats.
    const ground = (cx: number, cz: number): number =>
      Math.min(map.heightAt(cx, cz), map.heightAt(cx - 0.5, cz - 0.5), map.heightAt(cx + 0.5, cz - 0.5), map.heightAt(cx - 0.5, cz + 0.5), map.heightAt(cx + 0.5, cz + 0.5));
    const place = (b: Building, m: THREE.Matrix4, mirror: boolean): number => {
      const cx = b.x + PLOT_SIZE / 2;
      const cz = b.z + PLOT_SIZE / 2;
      const t0 = this.rising.get(b.id);
      let k = 1;
      if (t0 !== undefined) {
        const f = Math.min(1, (this.time - t0) / RISE_SECONDS);
        // Up with a little overshoot, like a tent pulled taut.
        k = f < 1 ? Math.max(0.02, 1 - Math.pow(1 - f, 3) + Math.sin(f * Math.PI) * 0.12) : 1;
      }
      // A fountain's platform reaches down into the ground, so it stands at the middle of its footprint.
      p.set(cx, (b.kind === 'fountain' || b.kind === 'shrine' || b.kind === 'taxoffice' ? map.heightAt(cx, cz) : ground(cx, cz)) + 0.01, cz);
      q.setFromAxisAngle(UP, facing(s, size, b));
      sc.set(1, k, mirror && hash2(b.id, 2, 40) < 0.5 ? -1 : 1);
      m.compose(p, q, sc);
      return k;
    };
    // Settled buildings go into the chunk's merged mesh; rising ones are drawn instanced until they have risen.
    const settled: MergedItem[] = [];
    const homes = (sets: Building[][], meshes: ChunkedInstances[], models: THREE.BufferGeometry[], fireAt: THREE.Vector3[] | null): void => {
      sets.forEach((bs, v) => {
        const up = bs.filter((b) => this.rising.has(b.id));
        meshes[v].set(kx, kz, up.length, (i, m) => void place(up[i], m, true));
        for (const b of bs) {
          if (this.rising.has(b.id)) continue;
          const m = new THREE.Matrix4();
          place(b, m, true);
          if (all) settled.push({ key: `${b.id}:${this.seen.get(b.id)?.sig}`, geo: models[v], m });
          if (fireAt) {
            fp.copy(fireAt[v]).applyMatrix4(m);
            fires.push([fp.x, map.heightAt(fp.x, fp.z), fp.z, hash2(b.id, 5, 42)]);
          }
        }
      });
    };
    const md = this.models;
    homes(tentsBy, this.tents, md.tent, TENT_FIRES);
    homes(hutsBy, this.huts, md.hut, HUT_FIRES);
    homes(cottagesBy, this.cottages, md.cottage, null);
    homes(townhousesBy, this.townhouses, md.townhouse, null);
    homes(finesBy, this.fines, md.fine, null);
    // Some of the bigger houses have their hearth lit: a wisp from the roof.
    const hearths = (sets: Building[][], models: THREE.BufferGeometry[]): void => {
      sets.forEach((bs, v) => {
        const top = roofTop(models[v]);
        for (const b of bs) {
          if (this.rising.has(b.id) || hash2(b.id, 11, 43) > 0.45) continue;
          const m = new THREE.Matrix4();
          place(b, m, true);
          fp.copy(top).applyMatrix4(m);
          fires.push([fp.x, fp.y - 0.14, fp.z, hash2(b.id, 5, 42)]);
        }
      });
    };
    hearths(cottagesBy, md.cottage);
    hearths(townhousesBy, md.townhouse);
    hearths(finesBy, md.fine);
    // The shrine's altar fire smokes like a hearth.
    homes([shrines], [this.shrines], [this.shrineGeo], null);
    for (const b of shrines) {
      if (this.rising.has(b.id)) continue;
      const m = new THREE.Matrix4();
      place(b, m, false);
      fp.copy(SHRINE_FIRE).applyMatrix4(m);
      fires.push([fp.x, fp.y - 0.12, fp.z, hash2(b.id, 5, 42)]);
    }
    // Tax offices, mirrored at random like the houses so a row of them doesn't repeat.
    homes([offices], [this.offices], [this.officeGeo], null);
    // The fountain's stone merges with the rest; its water keeps its own shiny material.
    const fountainUp = fountains.filter((b) => this.rising.has(b.id));
    this.fountains[0].set(kx, kz, fountainUp.length, (i, m) => void place(fountainUp[i], m, false));
    this.fountains[1].set(kx, kz, fountains.length, (i, m) => void place(fountains[i], m, false));
    if (all) {
      for (const b of fountains) {
        if (this.rising.has(b.id)) continue;
        const m = new THREE.Matrix4();
        place(b, m, false);
        settled.push({ key: `${b.id}:${this.seen.get(b.id)?.sig}`, geo: this.fountainGeo, m });
      }
    }
    this.fires.set(key, fires);
    if (!all) return;
    for (const b of plots) {
      const a = 0.14;
      const e = PLOT_SIZE - 0.14;
      const corners: Array<[number, number]> = [[b.x + a, b.z + a], [b.x + e, b.z + a], [b.x + a, b.z + e], [b.x + e, b.z + e]];
      corners.forEach(([x, z], i) => {
        const m = new THREE.Matrix4();
        p.set(x, map.heightAt(x, z) - 0.02, z);
        q.setFromAxisAngle(UP, i * 0.9 + 0.4);
        sc.set(0.72, 0.72, 0.72);
        m.compose(p, q, sc);
        settled.push({ key: `${b.id}:stake${i}`, geo: this.stakeGeo, m });
      });
    }
    this.merged.set(key, settled);
  }
}
